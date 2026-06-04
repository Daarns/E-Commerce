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
	refundService *paymentSvc.RefundService
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
	refundService *paymentSvc.RefundService,
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
		refundService: refundService,
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

type RefundRequestInput struct {
	Reason       string   `json:"reason" binding:"required"`
	Description  string   `json:"description"`
	EvidenceURLs []string `json:"evidence_urls"`
}

const refundRequestWindow = 7 * 24 * time.Hour

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
	if err := validateCheckoutAddress(address); err != nil {
		return nil, err
	}

	// Calculate totals
	var subtotal decimal.Decimal
	var orderItems []models.OrderItem

	// Process each cart item with stock validation (WITHOUT transaction yet)
	for _, item := range cart.Items {
		if item.CombinationID != nil {
			if item.Combination == nil || !item.Combination.IsActive || item.Combination.StockQuantity < item.Quantity {
				return nil, fmt.Errorf("stok untuk %s sedang berubah, silakan perbarui cart Anda", item.Product.Name)
			}
		}

		itemSubtotal := item.Price.Mul(decimal.NewFromInt(int64(item.Quantity)))
		subtotal = subtotal.Add(itemSubtotal)

		orderItem := models.OrderItem{
			ProductID:     item.ProductID,
			CombinationID: item.CombinationID,
			ProductName:   item.Product.Name,
			ProductSKU:    item.Product.SKU,
			Quantity:      item.Quantity,
			UnitPrice:     item.Price,
			Subtotal:      itemSubtotal,
		}

		// Build variant label from combination options
		if item.Combination != nil && len(item.Combination.Options) > 0 {
			var typeLabels, valueLabels []string
			for _, opt := range item.Combination.Options {
				if opt.VariantType != nil {
					typeLabels = append(typeLabels, opt.VariantType.Name)
				}
				valueLabels = append(valueLabels, opt.Value)
			}
			orderItem.VariantType = strings.Join(typeLabels, " / ")
			orderItem.VariantValue = strings.Join(valueLabels, " / ")
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
		PaymentMethod:  input.PaymentMethod,
		ShippingMethod: input.ShippingMethod,
		CustomerNotes:  input.CustomerNotes,
		IdempotencyKey: input.IdempotencyKey,
		CustomerEmail:  input.CustomerEmail, // Stored so retry payment always has the email

		// Items
		Items: orderItems,
	}

	// Execute atomic transaction: stock deduction + order creation + cart clearing
	var createdOrder *models.Order
	err = uc.db.Transaction(func(tx *gorm.DB) error {
		// 1. Deduct stock for all cart items (with pessimistic locking)
		for _, item := range cart.Items {
			if item.CombinationID != nil {
				if err := uc.productRepo.DeductCombinationStockWithLockTx(tx, *item.CombinationID, item.Quantity); err != nil {
					return fmt.Errorf("stok untuk %s sedang berubah, silakan perbarui cart Anda", item.Product.Name)
				}
			}
			if err := uc.productRepo.DeductStockWithLockTx(tx, item.ProductID, item.Quantity); err != nil {
				return fmt.Errorf("failed to reserve stock for %s: %w", item.Product.Name, err)
			}
		}

		// 2. Create order with idempotency
		var createErr error
		createdOrder, createErr = uc.orderRepo.CreateWithIdempotencyTx(tx, order, input.IdempotencyKey)
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
			createdAt := time.Now()
			expiresAt := createdAt.Add(24 * time.Hour)
			if saveErr := uc.orderRepo.UpdateSnapToken(createdOrder.ID, snapResult.Token, createdAt, expiresAt); saveErr != nil {
				fmt.Printf("Warning: failed to save snap_token for order %s: %v\n", createdOrder.OrderNumber, saveErr)
			}
		}
	}

	return result, nil
}

func validateCheckoutAddress(address *models.Address) error {
	requiredFields := map[string]string{
		"recipient name": address.RecipientName,
		"phone":          address.Phone,
		"address":        address.AddressLine1,
		"city":           address.City,
		"province":       address.Province,
		"postal code":    address.PostalCode,
	}

	for field, value := range requiredFields {
		if strings.TrimSpace(value) == "" {
			return fmt.Errorf("shipping address is incomplete: %s is required", field)
		}
	}

	return nil
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
	// Only final payment states should block retrying payment. Closing Snap without
	// paying leaves the order in pending_payment, and that must remain payable.
	if !isPaymentRetryAllowed(order.PaymentStatus) {
		return "", "", fmt.Errorf("order is already paid")
	}
	if uc.snapService == nil {
		return "", "", fmt.Errorf("payment service unavailable")
	}

	// Reuse existing token if still within 24-hour validity window
	if order.SnapToken != "" && order.SnapTokenCreatedAt != nil && time.Since(*order.SnapTokenCreatedAt) < 24*time.Hour {
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
	createdAt := time.Now()
	expiresAt := createdAt.Add(24 * time.Hour)
	if saveErr := uc.orderRepo.UpdateSnapToken(order.ID, snapResult.Token, createdAt, expiresAt); saveErr != nil {
		fmt.Printf("Warning: failed to save snap_token for order %s: %v\n", order.OrderNumber, saveErr)
	}

	return snapResult.Token, snapResult.RedirectURL, nil
}

func isPaymentRetryAllowed(paymentStatus string) bool {
	switch paymentStatus {
	case models.PaymentStatusUnpaid,
		models.PaymentStatusPendingPayment,
		models.PaymentStatusFailed,
		models.PaymentStatusExpired:
		return true
	default:
		return false
	}
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

	if err := uc.db.Transaction(func(tx *gorm.DB) error {
		for _, item := range order.Items {
			if item.CombinationID != nil {
				if err := uc.productRepo.RestoreCombinationStockTx(tx, *item.CombinationID, item.Quantity); err != nil {
					return fmt.Errorf("failed to restore variant stock: %w", err)
				}
				continue
			}

			if err := uc.productRepo.RestoreStockTx(tx, item.ProductID, item.Quantity); err != nil {
				return fmt.Errorf("failed to restore product stock: %w", err)
			}
		}

		return uc.orderRepo.UpdateStatusTx(tx, orderID, models.OrderStatusCancelled, reason, &userID)
	}); err != nil {
		return nil, fmt.Errorf("failed to cancel order: %w", err)
	}

	return uc.orderRepo.GetByID(orderID)
}

func (uc *OrderService) ConfirmReceived(orderID, userID uuid.UUID) (*models.Order, error) {
	order, err := uc.orderRepo.GetByID(orderID)
	if err != nil {
		return nil, err
	}
	if order.UserID != userID {
		return nil, fmt.Errorf("order not found")
	}
	if order.OrderStatus != models.OrderStatusDelivered {
		return nil, fmt.Errorf("only delivered orders can be confirmed as completed")
	}
	if order.PaymentStatus != models.PaymentStatusPaid {
		return nil, fmt.Errorf("payment must be paid before confirming receipt")
	}

	notes := "Order received and confirmed by customer"
	if err := uc.orderRepo.UpdateStatus(orderID, models.OrderStatusCompleted, notes, &userID); err != nil {
		return nil, err
	}

	return uc.orderRepo.GetByID(orderID)
}

func (uc *OrderService) RequestRefund(orderID, userID uuid.UUID, input RefundRequestInput) (*models.Order, error) {
	const maxRefundAttempts = 3

	reason := strings.TrimSpace(input.Reason)
	if reason == "" {
		return nil, fmt.Errorf("refund reason is required")
	}
	description := strings.TrimSpace(input.Description)
	if description == "" {
		return nil, fmt.Errorf("refund description is required")
	}

	order, err := uc.orderRepo.GetByID(orderID)
	if err != nil {
		return nil, err
	}
	if order.UserID != userID {
		return nil, fmt.Errorf("order not found")
	}
	if order.OrderStatus != models.OrderStatusCompleted && order.OrderStatus != models.OrderStatusRefundRejected {
		return nil, fmt.Errorf("only completed or refund rejected orders can request refund")
	}
	if order.PaymentStatus != models.PaymentStatusPaid {
		return nil, fmt.Errorf("only paid orders can request refund")
	}

	completedAt, ok := findStatusChangedAt(order.StatusHistory, models.OrderStatusCompleted)
	if !ok {
		return nil, fmt.Errorf("completed status history not found")
	}
	if time.Since(completedAt) > refundRequestWindow {
		return nil, fmt.Errorf("refund request window has expired")
	}
	refundAttempts := countStatusChanges(order.StatusHistory, models.OrderStatusRefundRequested)
	if refundAttempts >= maxRefundAttempts {
		return nil, fmt.Errorf("maximum refund request attempts reached")
	}
	nextRefundAttempt := refundAttempts + 1

	refundNotes := fmt.Sprintf("Refund requested by customer. Reason: %s", reason)
	refundNotes = fmt.Sprintf("%s. Description: %s", refundNotes, description)
	if len(input.EvidenceURLs) > 3 {
		return nil, fmt.Errorf("maximum 3 refund evidence images allowed")
	}
	if len(input.EvidenceURLs) == 0 {
		return nil, fmt.Errorf("at least one refund evidence image is required")
	}

	if err := uc.db.Transaction(func(tx *gorm.DB) error {
		if err := uc.orderRepo.UpdateStatusTx(tx, orderID, models.OrderStatusRefundRequested, refundNotes, &userID); err != nil {
			return err
		}

		for index, imageURL := range input.EvidenceURLs {
			imageURL = strings.TrimSpace(imageURL)
			if imageURL == "" {
				continue
			}

			refundImage := models.OrderRefundImage{
				OrderID:       orderID,
				UserID:        userID,
				ImageURL:      imageURL,
				RefundAttempt: nextRefundAttempt,
				Position:      index,
			}
			if err := tx.Create(&refundImage).Error; err != nil {
				return fmt.Errorf("failed to save refund evidence: %w", err)
			}
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return uc.orderRepo.GetByID(orderID)
}

func findStatusChangedAt(history []models.OrderStatusHistory, status string) (time.Time, bool) {
	for i := len(history) - 1; i >= 0; i-- {
		if history[i].ToStatus == status {
			return history[i].ChangedAt, true
		}
	}
	return time.Time{}, false
}

func countStatusChanges(history []models.OrderStatusHistory, status string) int {
	count := 0
	for _, event := range history {
		if event.ToStatus == status {
			count++
		}
	}
	return count
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
		models.OrderStatusDelivered:        {},
		models.OrderStatusCompleted:        {},
		models.OrderStatusRefundRequested:  {models.OrderStatusRefunded, models.OrderStatusRefundRejected},
		models.OrderStatusCancelled:        {},
		models.OrderStatusRefundRejected:   {},
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

// AdminProcessRefund records a manual refund after the actual provider refund has been handled.
func (uc *OrderService) AdminProcessRefund(orderID uuid.UUID, amount decimal.Decimal, reason, notes string, adminID uuid.UUID) (*models.Order, error) {
	if !amount.IsPositive() {
		return nil, fmt.Errorf("refund amount must be greater than zero")
	}

	order, err := uc.orderRepo.GetByID(orderID)
	if err != nil {
		return nil, err
	}
	if order.PaymentStatus != models.PaymentStatusPaid {
		return nil, fmt.Errorf("only paid orders can be refunded")
	}
	if amount.GreaterThan(order.Total) {
		return nil, fmt.Errorf("refund amount cannot exceed order total")
	}
	if order.OrderStatus != models.OrderStatusRefundRequested {
		return nil, fmt.Errorf("only refund requested orders can be refunded")
	}

	reason = strings.TrimSpace(reason)
	if reason == "" {
		reason = latestRefundRequestReason(order.StatusHistory)
	}
	if reason == "" {
		reason = "Customer refund request approved"
	}
	refundNotes := fmt.Sprintf("Refund reason: %s", strings.TrimSpace(reason))
	if strings.TrimSpace(notes) != "" {
		refundNotes = fmt.Sprintf("%s. Notes: %s", refundNotes, strings.TrimSpace(notes))
	}

	if uc.refundService == nil {
		return nil, fmt.Errorf("midtrans refund service is not configured")
	}

	midtransOrderID := order.OrderNumber
	refundKey := fmt.Sprintf("refund-%s", order.OrderNumber)
	refundResult, err := uc.refundService.Refund(paymentSvc.RefundRequest{
		OrderID:   midtransOrderID,
		Amount:    amount,
		Reason:    refundNotes,
		RefundKey: refundKey,
	})
	if err != nil {
		return nil, err
	}

	gatewayNotes := fmt.Sprintf("%s. Midtrans refund key: %s", refundNotes, refundKey)
	if refundResult != nil && refundResult.StatusMessage != "" {
		gatewayNotes = fmt.Sprintf("%s. Gateway: %s", gatewayNotes, refundResult.StatusMessage)
	}

	if err := uc.db.Transaction(func(tx *gorm.DB) error {
		lockedOrder, err := uc.orderRepo.GetByIDTx(tx, orderID)
		if err != nil {
			return err
		}
		if lockedOrder.PaymentStatus != models.PaymentStatusPaid {
			return fmt.Errorf("only paid orders can be refunded")
		}
		if lockedOrder.OrderStatus != models.OrderStatusRefundRequested {
			return fmt.Errorf("only refund requested orders can be refunded")
		}

		if err := uc.orderRepo.UpdateStatusTx(tx, orderID, models.OrderStatusRefunded, gatewayNotes, &adminID); err != nil {
			return err
		}

		return tx.Model(&models.Order{}).
			Where("id = ?", orderID).
			Updates(map[string]interface{}{
				"payment_status": models.PaymentStatusRefunded,
				"admin_notes":    gatewayNotes,
			}).Error
	}); err != nil {
		return nil, err
	}

	return uc.orderRepo.GetByID(orderID)
}

func latestRefundRequestReason(history []models.OrderStatusHistory) string {
	const prefix = "Refund requested by customer. Reason: "
	const separator = ". Description: "

	for i := len(history) - 1; i >= 0; i-- {
		event := history[i]
		if event.ToStatus != models.OrderStatusRefundRequested {
			continue
		}
		notes := strings.TrimSpace(event.Notes)
		if !strings.HasPrefix(notes, prefix) {
			return notes
		}
		reason := strings.TrimSpace(strings.TrimPrefix(notes, prefix))
		if index := strings.Index(reason, separator); index >= 0 {
			reason = reason[:index]
		}
		return strings.TrimSpace(reason)
	}
	return ""
}

func (uc *OrderService) AdminRejectRefund(orderID uuid.UUID, reason, notes string, adminID uuid.UUID) (*models.Order, error) {
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return nil, fmt.Errorf("rejection reason is required")
	}

	rejectionNotes := fmt.Sprintf("Refund rejected by admin. Reason: %s", reason)
	if strings.TrimSpace(notes) != "" {
		rejectionNotes = fmt.Sprintf("%s. Notes: %s", rejectionNotes, strings.TrimSpace(notes))
	}

	if err := uc.db.Transaction(func(tx *gorm.DB) error {
		lockedOrder, err := uc.orderRepo.GetByIDTx(tx, orderID)
		if err != nil {
			return err
		}
		if lockedOrder.PaymentStatus != models.PaymentStatusPaid {
			return fmt.Errorf("only paid orders can reject refund requests")
		}
		if lockedOrder.OrderStatus != models.OrderStatusRefundRequested {
			return fmt.Errorf("only refund requested orders can be rejected")
		}

		if err := uc.orderRepo.UpdateStatusTx(tx, orderID, models.OrderStatusRefundRejected, rejectionNotes, &adminID); err != nil {
			return err
		}

		return tx.Model(&models.Order{}).
			Where("id = ?", orderID).
			Update("admin_notes", rejectionNotes).Error
	}); err != nil {
		return nil, err
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
