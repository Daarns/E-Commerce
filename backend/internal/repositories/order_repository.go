package repositories

import (
	"ecommerce-backend/internal/models"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// OrderRepository handles order data operations
type OrderRepository struct {
	db *gorm.DB
}

func preloadOrderItems(query *gorm.DB) *gorm.DB {
	return query.
		Preload("Items").
		Preload("Items.Product.Images", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC")
		}).
		Preload("Items.Combination.Options").
		Preload("Items.Combination.Options.VariantType")
}

// NewOrderRepository creates a new order repository
func NewOrderRepository(db *gorm.DB) *OrderRepository {
	return &OrderRepository{db: db}
}

// OrderFilter contains filter options for order queries
type OrderFilter struct {
	UserID        *uuid.UUID
	OrderStatus   string
	PaymentStatus string
	DateFrom      *time.Time
	DateTo        *time.Time
	Search        string // order number
	SortBy        string
	SortOrder     string
	Page          int
	Limit         int
}

// OrderListResult contains paginated order results
type OrderListResult struct {
	Orders     []models.Order `json:"orders"`
	Total      int64          `json:"total"`
	Page       int            `json:"page"`
	Limit      int            `json:"limit"`
	TotalPages int            `json:"total_pages"`
}

// Create creates a new order with items
func (r *OrderRepository) Create(order *models.Order) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		return r.CreateTx(tx, order)
	})
}

// CreateTx creates a new order using an existing transaction.
func (r *OrderRepository) CreateTx(tx *gorm.DB, order *models.Order) error {
	if err := tx.Create(order).Error; err != nil {
		return err
	}

	history := &models.OrderStatusHistory{
		OrderID:   order.ID,
		ToStatus:  order.OrderStatus,
		Notes:     "Order created",
		ChangedAt: time.Now(),
	}
	return tx.Create(history).Error
}

// CreateWithIdempotency creates order with idempotency check
func (r *OrderRepository) CreateWithIdempotency(order *models.Order, idempotencyKey string) (*models.Order, error) {
	return r.CreateWithIdempotencyTx(r.db, order, idempotencyKey)
}

// CreateWithIdempotencyTx creates order with idempotency check using an existing transaction.
func (r *OrderRepository) CreateWithIdempotencyTx(tx *gorm.DB, order *models.Order, idempotencyKey string) (*models.Order, error) {
	order.IdempotencyKey = idempotencyKey

	// Check if order with this idempotency key exists
	var existing models.Order
	err := tx.Where("idempotency_key = ?", idempotencyKey).First(&existing).Error
	if err == nil {
		// Order already exists, return it
		return r.GetByIDTx(tx, existing.ID)
	}
	if err != gorm.ErrRecordNotFound {
		return nil, err
	}

	// Create new order
	if err := r.CreateTx(tx, order); err != nil {
		return nil, err
	}
	return r.GetByIDTx(tx, order.ID)
}

// GetByIdempotencyKeyTx retrieves an order by idempotency key using an existing transaction.
func (r *OrderRepository) GetByIdempotencyKeyTx(tx *gorm.DB, idempotencyKey string) (*models.Order, error) {
	var order models.Order
	err := preloadOrderItems(tx).
		Preload("StatusHistory", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at ASC")
		}).
		Preload("PromoCode").
		First(&order, "idempotency_key = ?", idempotencyKey).Error
	if err != nil {
		return nil, err
	}
	return &order, nil
}

// GetByID retrieves an order by ID with items and history
func (r *OrderRepository) GetByID(id uuid.UUID) (*models.Order, error) {
	return r.GetByIDTx(r.db, id)
}

// GetByIDTx retrieves an order by ID using an existing transaction.
func (r *OrderRepository) GetByIDTx(tx *gorm.DB, id uuid.UUID) (*models.Order, error) {
	var order models.Order
	err := preloadOrderItems(tx).
		Preload("StatusHistory", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at ASC")
		}).
		Preload("PromoCode").
		First(&order, "id = ?", id).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("order not found")
		}
		return nil, err
	}
	return &order, nil
}

// GetByOrderNumber retrieves an order by order number
func (r *OrderRepository) GetByOrderNumber(orderNumber string) (*models.Order, error) {
	var order models.Order
	err := preloadOrderItems(r.db).
		Preload("StatusHistory", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at ASC")
		}).
		Preload("PromoCode").
		First(&order, "order_number = ?", orderNumber).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("order not found")
		}
		return nil, err
	}
	return &order, nil
}

// List retrieves orders with filtering and pagination
func (r *OrderRepository) List(filter OrderFilter) (*OrderListResult, error) {
	// Set defaults
	if filter.Page <= 0 {
		filter.Page = 1
	}
	if filter.Limit <= 0 {
		filter.Limit = 20
	}
	if filter.Limit > 100 {
		filter.Limit = 100
	}

	query := r.db.Model(&models.Order{})

	// Apply filters
	if filter.UserID != nil {
		query = query.Where("user_id = ?", *filter.UserID)
	}

	if filter.OrderStatus != "" {
		query = query.Where("order_status = ?", filter.OrderStatus)
	}

	if filter.PaymentStatus != "" {
		query = query.Where("payment_status = ?", filter.PaymentStatus)
	}

	if filter.DateFrom != nil {
		query = query.Where("created_at >= ?", *filter.DateFrom)
	}

	if filter.DateTo != nil {
		query = query.Where("created_at <= ?", *filter.DateTo)
	}

	if filter.Search != "" {
		query = query.Where("order_number ILIKE ?", "%"+filter.Search+"%")
	}

	// Count total
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	// Apply sorting
	sortColumn := "created_at"
	sortOrder := "DESC"

	if filter.SortBy != "" {
		switch filter.SortBy {
		case "order_number":
			sortColumn = "order_number"
		case "total":
			sortColumn = "total"
		case "created_at":
			sortColumn = "created_at"
		case "order_status":
			sortColumn = "order_status"
		}
	}

	if filter.SortOrder == "asc" {
		sortOrder = "ASC"
	}

	query = query.Order(fmt.Sprintf("%s %s", sortColumn, sortOrder))

	// Apply pagination
	offset := (filter.Page - 1) * filter.Limit
	query = query.Offset(offset).Limit(filter.Limit)

	// Execute query
	var orders []models.Order
	err := preloadOrderItems(query).Find(&orders).Error
	if err != nil {
		return nil, err
	}

	totalPages := int(total) / filter.Limit
	if int(total)%filter.Limit > 0 {
		totalPages++
	}

	return &OrderListResult{
		Orders:     orders,
		Total:      total,
		Page:       filter.Page,
		Limit:      filter.Limit,
		TotalPages: totalPages,
	}, nil
}

// Update updates an order
func (r *OrderRepository) Update(order *models.Order) error {
	return r.db.Save(order).Error
}

// UpdateSnapToken stores the current Midtrans Snap token lifecycle fields.
func (r *OrderRepository) UpdateSnapToken(orderID uuid.UUID, token string, createdAt time.Time, expiresAt time.Time) error {
	return r.db.Model(&models.Order{}).
		Where("id = ?", orderID).
		Updates(map[string]interface{}{
			"snap_token":             token,
			"snap_token_created_at":  createdAt,
			"payment_expires_at":     expiresAt,
			"payment_status":         models.PaymentStatusPendingPayment,
			"payment_transaction_id": "",
		}).Error
}

// UpdateStatus updates order status with history
func (r *OrderRepository) UpdateStatus(orderID uuid.UUID, newStatus string, notes string, changedBy *uuid.UUID) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Get current status
		var order models.Order
		if err := tx.Select("order_status").First(&order, "id = ?", orderID).Error; err != nil {
			return err
		}

		// Update order status
		updates := map[string]interface{}{
			"order_status": newStatus,
		}

		// Set timestamps based on status
		now := time.Now()
		switch newStatus {
		case models.OrderStatusShipped:
			updates["shipped_at"] = now
		case models.OrderStatusDelivered:
			updates["delivered_at"] = now
		case models.OrderStatusCancelled:
			updates["cancelled_at"] = now
			if notes != "" {
				updates["cancellation_reason"] = notes
			}
		}

		if err := tx.Model(&models.Order{}).Where("id = ?", orderID).Updates(updates).Error; err != nil {
			return err
		}

		// Add status history
		history := &models.OrderStatusHistory{
			OrderID:    orderID,
			FromStatus: order.OrderStatus,
			ToStatus:   newStatus,
			Notes:      notes,
			ChangedBy:  changedBy,
			ChangedAt:  now,
		}
		return tx.Create(history).Error
	})
}

// UpdatePaymentStatus updates payment status
func (r *OrderRepository) UpdatePaymentStatus(orderID uuid.UUID, paymentStatus string, transactionID string) error {
	updates := map[string]interface{}{
		"payment_status": paymentStatus,
	}

	if transactionID != "" {
		updates["payment_transaction_id"] = transactionID
	}

	if paymentStatus == models.PaymentStatusPaid {
		updates["paid_at"] = time.Now()
		updates["payment_expires_at"] = nil
	}

	if paymentStatus == models.PaymentStatusExpired || paymentStatus == models.PaymentStatusFailed {
		updates["snap_token"] = ""
		updates["snap_token_created_at"] = nil
	}

	return r.db.Model(&models.Order{}).
		Where("id = ?", orderID).
		Updates(updates).Error
}

// GetUserOrderCount gets total order count for a user
func (r *OrderRepository) GetUserOrderCount(userID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.Model(&models.Order{}).Where("user_id = ?", userID).Count(&count).Error
	return count, err
}

// GetOrderSummary gets order statistics
type OrderSummary struct {
	TotalOrders      int64   `json:"total_orders"`
	PendingOrders    int64   `json:"pending_orders"`
	ProcessingOrders int64   `json:"processing_orders"`
	ShippedOrders    int64   `json:"shipped_orders"`
	DeliveredOrders  int64   `json:"delivered_orders"`
	CancelledOrders  int64   `json:"cancelled_orders"`
	TotalRevenue     float64 `json:"total_revenue"`
}

func (r *OrderRepository) GetOrderSummary(userID *uuid.UUID) (*OrderSummary, error) {
	var summary OrderSummary

	query := r.db.Model(&models.Order{})
	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	}

	// Total orders
	if err := query.Count(&summary.TotalOrders).Error; err != nil {
		return nil, err
	}

	// Count by status
	statusCounts := []struct {
		Status string
		Count  int64
	}{}

	statusQuery := r.db.Model(&models.Order{})
	if userID != nil {
		statusQuery = statusQuery.Where("user_id = ?", *userID)
	}

	if err := statusQuery.
		Select("order_status as status, count(*) as count").
		Group("order_status").
		Scan(&statusCounts).Error; err != nil {
		return nil, err
	}

	for _, sc := range statusCounts {
		switch sc.Status {
		case models.OrderStatusPending:
			summary.PendingOrders += sc.Count
		case models.OrderStatusPaymentConfirmed:
			summary.ProcessingOrders += sc.Count
		case models.OrderStatusProcessing:
			summary.ProcessingOrders += sc.Count
		case models.OrderStatusShipped:
			summary.ShippedOrders += sc.Count
		case models.OrderStatusDelivered:
			summary.DeliveredOrders += sc.Count
		case models.OrderStatusCancelled:
			summary.CancelledOrders += sc.Count
		}
	}

	// Total revenue (paid orders only)
	var revenue struct {
		Total float64
	}
	revenueQuery := r.db.Model(&models.Order{}).
		Where("payment_status = ?", models.PaymentStatusPaid)
	if userID != nil {
		revenueQuery = revenueQuery.Where("user_id = ?", *userID)
	}

	if err := revenueQuery.
		Select("COALESCE(SUM(total), 0) as total").
		Scan(&revenue).Error; err != nil {
		return nil, err
	}
	summary.TotalRevenue = revenue.Total

	return &summary, nil
}

// ===== PROMO CODE OPERATIONS =====

// PromoCodeRepository handles promo code operations
type PromoCodeRepository struct {
	db *gorm.DB
}

// NewPromoCodeRepository creates a new promo code repository
func NewPromoCodeRepository(db *gorm.DB) *PromoCodeRepository {
	return &PromoCodeRepository{db: db}
}

// GetByCode retrieves a promo code by code
func (r *PromoCodeRepository) GetByCode(code string) (*models.PromoCode, error) {
	var promo models.PromoCode
	err := r.db.Where("code = ?", code).First(&promo).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("promo code not found")
		}
		return nil, err
	}
	return &promo, nil
}

// GetByID retrieves a promo code by ID
func (r *PromoCodeRepository) GetByID(id uuid.UUID) (*models.PromoCode, error) {
	var promo models.PromoCode
	err := r.db.First(&promo, "id = ?", id).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("promo code not found")
		}
		return nil, err
	}
	return &promo, nil
}

// Create creates a new promo code
func (r *PromoCodeRepository) Create(promo *models.PromoCode) error {
	return r.db.Create(promo).Error
}

// Update updates a promo code
func (r *PromoCodeRepository) Update(promo *models.PromoCode) error {
	return r.db.Save(promo).Error
}

// Delete soft deletes a promo code
func (r *PromoCodeRepository) Delete(id uuid.UUID) error {
	return r.db.Model(&models.PromoCode{}).
		Where("id = ?", id).
		Update("is_active", false).Error
}

// IncrementUsage increments promo code usage count
func (r *PromoCodeRepository) IncrementUsage(id uuid.UUID) error {
	return r.db.Model(&models.PromoCode{}).
		Where("id = ?", id).
		Update("usage_count", gorm.Expr("usage_count + 1")).Error
}

// GetUserUsageCount gets how many times a user has used a promo code
func (r *PromoCodeRepository) GetUserUsageCount(promoCodeID, userID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.Model(&models.PromoCodeUsage{}).
		Where("promo_code_id = ? AND user_id = ?", promoCodeID, userID).
		Count(&count).Error
	return count, err
}

// RecordUsage records promo code usage
func (r *PromoCodeRepository) RecordUsage(usage *models.PromoCodeUsage) error {
	return r.db.Create(usage).Error
}

// List retrieves all promo codes
func (r *PromoCodeRepository) List(activeOnly bool) ([]models.PromoCode, error) {
	query := r.db.Model(&models.PromoCode{})
	if activeOnly {
		query = query.Where("is_active = true")
	}

	var promos []models.PromoCode
	err := query.Order("created_at DESC").Find(&promos).Error
	return promos, err
}

// ValidateAndLock validates promo code and locks for update (prevents race condition)
func (r *PromoCodeRepository) ValidateAndLock(code string, userID uuid.UUID) (*models.PromoCode, error) {
	var promo models.PromoCode

	err := r.db.Transaction(func(tx *gorm.DB) error {
		// Lock the promo code row
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("code = ?", code).
			First(&promo).Error; err != nil {
			return err
		}

		// Check if valid
		if !promo.IsValid() {
			return fmt.Errorf("promo code is no longer valid")
		}

		// Check user usage limit
		var userUsage int64
		if err := tx.Model(&models.PromoCodeUsage{}).
			Where("promo_code_id = ? AND user_id = ?", promo.ID, userID).
			Count(&userUsage).Error; err != nil {
			return err
		}

		if int(userUsage) >= promo.UsageLimitPerUser {
			return fmt.Errorf("you have already used this promo code")
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return &promo, nil
}
