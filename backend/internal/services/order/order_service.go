package order

import (
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	paymentSvc "ecommerce-backend/internal/services/payment"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// UseCase handles order business logic
type OrderService struct {
	db            *gorm.DB
	orderRepo     *repositories.OrderRepository
	cartRepo      *repositories.CartRepository
	productRepo   *repositories.ProductRepository
	promoCodeRepo *repositories.PromoCodeRepository
	addressRepo   *repositories.AddressRepository
	shippingRepo  *repositories.ShippingRepository
	snapService   *paymentSvc.SnapService
}

// NewOrderService creates a new order service
func NewOrderService(
	db *gorm.DB,
	orderRepo *repositories.OrderRepository,
	cartRepo *repositories.CartRepository,
	productRepo *repositories.ProductRepository,
	promoCodeRepo *repositories.PromoCodeRepository,
	addressRepo *repositories.AddressRepository,
	shippingRepo *repositories.ShippingRepository,
	snapService *paymentSvc.SnapService,
) *OrderService {
	return &OrderService{
		db:            db,
		orderRepo:     orderRepo,
		cartRepo:      cartRepo,
		productRepo:   productRepo,
		promoCodeRepo: promoCodeRepo,
		addressRepo:   addressRepo,
		shippingRepo:  shippingRepo,
		snapService:   snapService,
	}
}

// CheckoutInput represents checkout input
type CheckoutInput struct {
	AddressID      string `json:"address_id" binding:"required"`
	PromoCode      string `json:"promo_code"`
	PaymentMethod  string `json:"payment_method" binding:"required"`
	ShippingMethod string `json:"shipping_method" binding:"required"`
	CustomerNotes  string `json:"customer_notes"`
	IdempotencyKey string `json:"idempotency_key" binding:"required"`
	CustomerEmail  string `json:"customer_email"` // Used for Midtrans customer details
}

// CheckoutResult represents checkout result
type CheckoutResult struct {
	Order       *models.Order `json:"order"`
	SnapToken   string        `json:"snap_token,omitempty"`
	RedirectURL string        `json:"redirect_url,omitempty"`
}

// Checkout processes checkout with pessimistic locking
// Ensures atomicity: stock deduction, order creation, and cart clearing all succeed or all fail
func (uc *OrderService) Checkout(userID uuid.UUID, input CheckoutInput) (*CheckoutResult, error) {
	// Parse address ID from string
	addressID, err := uuid.Parse(input.AddressID)
	if err != nil {
		return nil, fmt.Errorf("invalid address_id format")
	}

	// Get cart
	cart, err := uc.cartRepo.GetCartByUserID(userID)
	if err != nil {
		return nil, err
	}

	if cart.IsEmpty() {
		return nil, fmt.Errorf("cart is empty")
	}

	// Get and validate address
	address, err := uc.addressRepo.GetByID(addressID)
	if err != nil {
		return nil, fmt.Errorf("address not found")
	}
	if address.UserID != userID {
		return nil, fmt.Errorf("invalid address")
	}

	// Calculate totals
	var subtotal decimal.Decimal
	var orderItems []models.OrderItem

	// Process each cart item with stock validation (WITHOUT transaction yet)
	for _, item := range cart.Items {
		itemSubtotal := item.Price.Mul(decimal.NewFromInt(int64(item.Quantity)))
		subtotal = subtotal.Add(itemSubtotal)

		orderItem := models.OrderItem{
			ProductID:   item.ProductID,
			VariantID:   item.VariantID,
			ProductName: item.Product.Name,
			ProductSKU:  item.Product.SKU,
			Quantity:    item.Quantity,
			UnitPrice:   item.Price,
			Subtotal:    itemSubtotal,
		}

		// Add variant info if present
		if item.Variant != nil {
			orderItem.VariantType = item.Variant.VariantType
			orderItem.VariantValue = item.Variant.VariantValue
		}

		orderItems = append(orderItems, orderItem)
	}

	// Apply promo code if provided
	var discount decimal.Decimal
	var promoCodeID *uuid.UUID

	if input.PromoCode != "" {
		promo, err := uc.promoCodeRepo.ValidateAndLock(input.PromoCode, userID)
		if err != nil {
			return nil, fmt.Errorf("invalid promo code: %w", err)
		}

		discount = promo.CalculateDiscount(subtotal)
		promoCodeID = &promo.ID
		// NOTE: RecordUsage + IncrementUsage are intentionally deferred to
		// the payment webhook (ProcessWebhook) once payment is confirmed.
		// This prevents promo quota being consumed on unpaid orders.
	}

	// Calculate shipping cost (mock calculation)
	shippingCost := uc.calculateShippingCost(input.ShippingMethod, subtotal)

	// Calculate total
	total := subtotal.Sub(discount).Add(shippingCost)

	// Create order object
	order := &models.Order{
		UserID: userID,

		// Shipping address snapshot
		ShippingName:         address.RecipientName,
		ShippingPhone:        address.Phone,
		ShippingAddressLine1: address.AddressLine1,
		ShippingAddressLine2: address.AddressLine2,
		ShippingCity:         address.City,
		ShippingProvince:     address.Province,
		ShippingPostalCode:   address.PostalCode,

		// Pricing
		Subtotal:       subtotal,
		ShippingCost:   shippingCost,
		DiscountAmount: discount,
		TaxAmount:      decimal.Zero,
		Total:          total,

		// Promo
		PromoCodeID: promoCodeID,

		// Status
		OrderStatus:   models.OrderStatusPending,
		PaymentStatus: models.PaymentStatusUnpaid,

		// Payment
		PaymentMethod:   input.PaymentMethod,
		ShippingMethod:  input.ShippingMethod,
		CustomerNotes:   input.CustomerNotes,
		IdempotencyKey:  input.IdempotencyKey,
		CustomerEmail:   input.CustomerEmail, // Stored so retry payment always has the email

		// Items
		Items: orderItems,
	}

	// Execute atomic transaction: stock deduction + order creation + cart clearing
	var createdOrder *models.Order
	err = uc.db.Transaction(func(tx *gorm.DB) error {
		// 1. Deduct stock for all cart items (with pessimistic locking)
		for _, item := range cart.Items {
			if err := uc.productRepo.DeductStockWithLockTx(tx, item.ProductID, item.Quantity); err != nil {
				return fmt.Errorf("failed to reserve stock for %s: %w", item.Product.Name, err)
			}
		}

		// 2. Create order with idempotency
		var createErr error
		createdOrder, createErr = uc.orderRepo.CreateWithIdempotency(order, input.IdempotencyKey)
		if createErr != nil {
			return fmt.Errorf("failed to create order: %w", createErr)
		}

		// 3. Clear cart
		if clearErr := uc.cartRepo.ClearCartByUserID(userID); clearErr != nil {
			return fmt.Errorf("failed to clear cart: %w", clearErr)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Create Midtrans Snap transaction (OUTSIDE transaction — external API call)
	result := &CheckoutResult{Order: createdOrder}

	if uc.snapService != nil {
		snapResult, err := uc.snapService.CreateTransaction(createdOrder, input.CustomerEmail)
		if err != nil {
			// Log but don't fail — order is already created; user can retry payment
			fmt.Printf("Warning: Midtrans Snap error for order %s: %v\n", createdOrder.OrderNumber, err)
		} else {
			result.SnapToken = snapResult.Token
			result.RedirectURL = snapResult.RedirectURL
			// Persist snap_token so we can reuse it (valid 24h) without hitting Midtrans again
			if saveErr := uc.orderRepo.Update(&models.Order{
				ID:        createdOrder.ID,
				SnapToken: snapResult.Token,
			}); saveErr != nil {
				fmt.Printf("Warning: failed to save snap_token for order %s: %v\n", createdOrder.OrderNumber, saveErr)
			}
		}
	}

	return result, nil
}

// GetOrCreateSnapToken returns a Midtrans Snap token for an unpaid order.
// Reuses the stored token if the order was created within the last 24 hours
// (Midtrans Snap tokens are valid for 24 hours). Generates a new token otherwise.
func (uc *OrderService) GetOrCreateSnapToken(orderID uuid.UUID, userID uuid.UUID, customerEmail string) (string, string, error) {
	order, err := uc.orderRepo.GetByID(orderID)
	if err != nil {
		return "", "", fmt.Errorf("order not found")
	}
	// Ownership check
	if order.UserID != userID {
		return "", "", fmt.Errorf("forbidden")
	}
	// Only allow for unpaid orders
	if order.PaymentStatus != models.PaymentStatusUnpaid {
		return "", "", fmt.Errorf("order is already paid")
	}
	if uc.snapService == nil {
		return "", "", fmt.Errorf("payment service unavailable")
	}

	// Reuse existing token if still within 24-hour validity window
	if order.SnapToken != "" && time.Since(order.CreatedAt) < 24*time.Hour {
		return order.SnapToken, "", nil
	}

	// Use stored email if frontend didn't provide one (e.g. retry from orders page for old orders)
	if customerEmail == "" && order.CustomerEmail != "" {
		customerEmail = order.CustomerEmail
	}
	// Generate new token — use CreateTransaction first
	snapResult, err := uc.snapService.CreateTransaction(order, customerEmail)
	if err != nil {
		errMsg := err.Error()
		// Midtrans rejects duplicate order_ids. Fall back to retry transaction with a timestamp suffix.
		if strings.Contains(errMsg, "sudah digunakan") || strings.Contains(errMsg, "order_id") {
			suffix := fmt.Sprintf("%d", time.Now().Unix())
			snapResult, err = uc.snapService.CreateRetryTransaction(order, customerEmail, suffix)
			if err != nil {
				return "", "", fmt.Errorf("failed to create payment token: %w", err)
			}
		} else {
			return "", "", fmt.Errorf("failed to create payment token: %w", err)
		}
	}

	// Persist new token to DB
	if saveErr := uc.orderRepo.Update(&models.Order{
		ID:        order.ID,
		SnapToken: snapResult.Token,
	}); saveErr != nil {
		fmt.Printf("Warning: failed to save snap_token for order %s: %v\n", order.OrderNumber, saveErr)
	}

	return snapResult.Token, snapResult.RedirectURL, nil
}

// calculateShippingCost fetches shipping cost from the shipping_methods table.
// Falls back to hardcoded values if DB lookup fails (resilience).
func (uc *OrderService) calculateShippingCost(method string, subtotal decimal.Decimal) decimal.Decimal {
	if uc.shippingRepo != nil {
		shippingMethod, err := uc.shippingRepo.GetByCode(method)
		if err == nil {
			return shippingMethod.Price
		}
		fmt.Printf("Warning: shipping method '%s' not found in DB, using fallback: %v\n", method, err)
	}

	// Fallback values (matches seed data in 018_shipping_methods.up.sql)
	switch method {
	case "regular":
		return decimal.NewFromInt(15000)
	case "express":
		return decimal.NewFromInt(35000)
	case "same_day":
		return decimal.NewFromInt(50000)
	default:
		return decimal.NewFromInt(15000)
	}
}

// ===== ORDER MANAGEMENT =====

// GetUserOrders retrieves orders for a user
func (uc *OrderService) GetUserOrders(userID uuid.UUID, page, limit int) (*repositories.OrderListResult, error) {
	filter := repositories.OrderFilter{
		UserID: &userID,
		Page:   page,
		Limit:  limit,
	}
	return uc.orderRepo.List(filter)
}

// GetOrder retrieves an order by ID
func (uc *OrderService) GetOrder(orderID, userID uuid.UUID) (*models.Order, error) {
	order, err := uc.orderRepo.GetByID(orderID)
	if err != nil {
		return nil, err
	}
	
	// Verify ownership
	if order.UserID != userID {
		return nil, fmt.Errorf("order not found")
	}
	
	return order, nil
}

// GetOrderByNumber retrieves an order by order number
func (uc *OrderService) GetOrderByNumber(orderNumber string, userID uuid.UUID) (*models.Order, error) {
	order, err := uc.orderRepo.GetByOrderNumber(orderNumber)
	if err != nil {
		return nil, err
	}
	
	// Verify ownership
	if order.UserID != userID {
		return nil, fmt.Errorf("order not found")
	}
	
	return order, nil
}

// CancelOrder cancels an order
func (uc *OrderService) CancelOrder(orderID, userID uuid.UUID, reason string) (*models.Order, error) {
	order, err := uc.orderRepo.GetByID(orderID)
	if err != nil {
		return nil, err
	}
	
	// Verify ownership
	if order.UserID != userID {
		return nil, fmt.Errorf("order not found")
	}
	
	// Check if can cancel
	if !order.CanCancel() {
		return nil, fmt.Errorf("order cannot be cancelled in current status")
	}

	// Restore stock
	for _, item := range order.Items {
		// Add back stock
		if err := uc.productRepo.UpdateStock(item.ProductID, item.Quantity, 0); err != nil {
			fmt.Printf("Warning: failed to restore stock for product %s: %v\n", item.ProductID, err)
		}
	}

	// Update status
	if err := uc.orderRepo.UpdateStatus(orderID, models.OrderStatusCancelled, reason, &userID); err != nil {
		return nil, fmt.Errorf("failed to cancel order: %w", err)
	}

	return uc.orderRepo.GetByID(orderID)
}

// ===== ADMIN ORDER MANAGEMENT =====

// AdminGetOrders retrieves all orders (admin only)
func (uc *OrderService) AdminGetOrders(filter repositories.OrderFilter) (*repositories.OrderListResult, error) {
	return uc.orderRepo.List(filter)
}

// AdminGetOrder retrieves any order by ID (admin only)
func (uc *OrderService) AdminGetOrder(orderID uuid.UUID) (*models.Order, error) {
	return uc.orderRepo.GetByID(orderID)
}

// AdminUpdateOrderStatus updates order status (admin only)
func (uc *OrderService) AdminUpdateOrderStatus(orderID uuid.UUID, newStatus, notes string, adminID uuid.UUID) (*models.Order, error) {
	order, err := uc.orderRepo.GetByID(orderID)
	if err != nil {
		return nil, err
	}

	// Validate status transition
	if !uc.isValidStatusTransition(order.OrderStatus, newStatus) {
		return nil, fmt.Errorf("invalid status transition from %s to %s", order.OrderStatus, newStatus)
	}

	if err := uc.orderRepo.UpdateStatus(orderID, newStatus, notes, &adminID); err != nil {
		return nil, fmt.Errorf("failed to update status: %w", err)
	}

	return uc.orderRepo.GetByID(orderID)
}

// isValidStatusTransition checks if status transition is valid
func (uc *OrderService) isValidStatusTransition(from, to string) bool {
	validTransitions := map[string][]string{
		models.OrderStatusPending:          {models.OrderStatusPaymentConfirmed, models.OrderStatusCancelled},
		models.OrderStatusPaymentConfirmed: {models.OrderStatusProcessing, models.OrderStatusCancelled},
		models.OrderStatusProcessing:       {models.OrderStatusShipped, models.OrderStatusCancelled},
		models.OrderStatusShipped:          {models.OrderStatusDelivered},
		models.OrderStatusDelivered:        {models.OrderStatusRefunded},
		models.OrderStatusCancelled:        {},
		models.OrderStatusRefunded:         {},
	}

	allowed, exists := validTransitions[from]
	if !exists {
		return false
	}

	for _, status := range allowed {
		if status == to {
			return true
		}
	}
	return false
}

// AdminUpdatePayment updates payment status (admin only)
func (uc *OrderService) AdminUpdatePayment(orderID uuid.UUID, paymentStatus, transactionID string) (*models.Order, error) {
	if err := uc.orderRepo.UpdatePaymentStatus(orderID, paymentStatus, transactionID); err != nil {
		return nil, fmt.Errorf("failed to update payment: %w", err)
	}
	
	// If paid, update order status to processing
	if paymentStatus == models.PaymentStatusPaid {
		order, _ := uc.orderRepo.GetByID(orderID)
		if order.OrderStatus == models.OrderStatusPending {
			uc.orderRepo.UpdateStatus(orderID, models.OrderStatusPaymentConfirmed, "Payment confirmed", nil)
		}
	}

	return uc.orderRepo.GetByID(orderID)
}

// AdminUpdateTracking updates shipping tracking info (admin only)
func (uc *OrderService) AdminUpdateTracking(orderID uuid.UUID, trackingNumber string) (*models.Order, error) {
	order, err := uc.orderRepo.GetByID(orderID)
	if err != nil {
		return nil, err
	}

	order.TrackingNumber = trackingNumber
	if err := uc.orderRepo.Update(order); err != nil {
		return nil, fmt.Errorf("failed to update tracking: %w", err)
	}

	return uc.orderRepo.GetByID(orderID)
}

// AdminAddNotes adds admin notes to order
func (uc *OrderService) AdminAddNotes(orderID uuid.UUID, notes string) (*models.Order, error) {
	order, err := uc.orderRepo.GetByID(orderID)
	if err != nil {
		return nil, err
	}

	order.AdminNotes = notes
	if err := uc.orderRepo.Update(order); err != nil {
		return nil, fmt.Errorf("failed to add notes: %w", err)
	}

	return uc.orderRepo.GetByID(orderID)
}

// GetOrderSummary retrieves order statistics
func (uc *OrderService) GetOrderSummary(userID *uuid.UUID) (*repositories.OrderSummary, error) {
	return uc.orderRepo.GetOrderSummary(userID)
}

// ===== PROMO CODE MANAGEMENT =====

// ValidatePromoCode validates a promo code for user
func (uc *OrderService) ValidatePromoCode(code string, userID uuid.UUID, subtotal decimal.Decimal) (*models.PromoCode, decimal.Decimal, error) {
	promo, err := uc.promoCodeRepo.GetByCode(code)
	if err != nil {
		return nil, decimal.Zero, err
	}

	if !promo.IsValid() {
		return nil, decimal.Zero, fmt.Errorf("promo code is no longer valid")
	}

	// Check user usage
	usageCount, err := uc.promoCodeRepo.GetUserUsageCount(promo.ID, userID)
	if err != nil {
		return nil, decimal.Zero, err
	}

	if int(usageCount) >= promo.UsageLimitPerUser {
		return nil, decimal.Zero, fmt.Errorf("you have already used this promo code")
	}

	// Check minimum order
	if subtotal.LessThan(promo.MinOrderAmount) {
		return nil, decimal.Zero, fmt.Errorf("minimum order amount is Rp %s", promo.MinOrderAmount.StringFixed(0))
	}

	discount := promo.CalculateDiscount(subtotal)
	return promo, discount, nil
}

