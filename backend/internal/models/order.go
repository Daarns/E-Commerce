package models

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// Order status constants
const (
	OrderStatusPending          = "pending"
	OrderStatusPaymentConfirmed = "payment_confirmed"
	OrderStatusProcessing       = "processing"
	OrderStatusShipped          = "shipped"
	OrderStatusDelivered        = "delivered"
	OrderStatusCancelled        = "cancelled"
	OrderStatusRefunded         = "refunded"
)

// Payment status constants
const (
	PaymentStatusUnpaid   = "unpaid"
	PaymentStatusPaid     = "paid"
	PaymentStatusRefunded = "refunded"
)

// Order represents a customer order
type Order struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	OrderNumber string    `gorm:"column:order_number;size:50;uniqueIndex;not null" json:"order_number"`
	UserID      uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	User        *User     `gorm:"foreignKey:UserID" json:"user,omitempty"`

	// Shipping address (snapshot)
	ShippingName        string `gorm:"column:shipping_name;size:255;not null" json:"shipping_name"`
	ShippingPhone       string `gorm:"column:shipping_phone;size:20;not null" json:"shipping_phone"`
	ShippingAddressLine1 string `gorm:"column:shipping_address_line1;size:255;not null" json:"shipping_address_line1"`
	ShippingAddressLine2 string `gorm:"column:shipping_address_line2;size:255" json:"shipping_address_line2"`
	ShippingCity        string `gorm:"column:shipping_city;size:100;not null" json:"shipping_city"`
	ShippingProvince    string `gorm:"column:shipping_province;size:100;not null" json:"shipping_province"`
	ShippingPostalCode  string `gorm:"column:shipping_postal_code;size:10;not null" json:"shipping_postal_code"`

	// Pricing
	Subtotal       decimal.Decimal `gorm:"type:numeric(12,2);not null" json:"subtotal"`
	ShippingCost   decimal.Decimal `gorm:"column:shipping_cost;type:numeric(12,2);default:0" json:"shipping_cost"`
	DiscountAmount decimal.Decimal `gorm:"column:discount_amount;type:numeric(12,2);default:0" json:"discount_amount"`
	TaxAmount      decimal.Decimal `gorm:"column:tax_amount;type:numeric(12,2);default:0" json:"tax_amount"`
	Total          decimal.Decimal `gorm:"type:numeric(12,2);not null" json:"total"`

	// Promo
	PromoCodeID *uuid.UUID `gorm:"column:promo_code_id;type:uuid" json:"promo_code_id"`
	PromoCode   *PromoCode `gorm:"foreignKey:PromoCodeID" json:"promo_code,omitempty"`

	// Status
	OrderStatus   string `gorm:"column:order_status;size:50;not null;default:'pending'" json:"order_status"`
	PaymentStatus string `gorm:"column:payment_status;size:50;not null;default:'unpaid'" json:"payment_status"`

	// Payment
	PaymentMethod        string     `gorm:"column:payment_method;size:50" json:"payment_method"`
	PaymentProvider      string     `gorm:"column:payment_provider;size:50" json:"payment_provider"`
	PaymentTransactionID string     `gorm:"column:payment_transaction_id;size:255" json:"payment_transaction_id"`
	PaidAt               *time.Time `gorm:"column:paid_at" json:"paid_at"`

	// Shipping
	ShippingMethod string     `gorm:"column:shipping_method;size:50" json:"shipping_method"`
	TrackingNumber string     `gorm:"column:tracking_number;size:255" json:"tracking_number"`
	ShippedAt      *time.Time `gorm:"column:shipped_at" json:"shipped_at"`
	DeliveredAt    *time.Time `gorm:"column:delivered_at" json:"delivered_at"`

	// Notes
	CustomerNotes string `gorm:"column:customer_notes;type:text" json:"customer_notes"`
	AdminNotes    string `gorm:"column:admin_notes;type:text" json:"admin_notes"`

	// Cancellation
	CancelledAt        *time.Time `gorm:"column:cancelled_at" json:"cancelled_at"`
	CancellationReason string     `gorm:"column:cancellation_reason;type:text" json:"cancellation_reason"`

	// Idempotency
	IdempotencyKey string `gorm:"column:idempotency_key;size:255;uniqueIndex" json:"idempotency_key,omitempty"`

	// Items
	Items []OrderItem `gorm:"foreignKey:OrderID" json:"items,omitempty"`

	// Status History
	StatusHistory []OrderStatusHistory `gorm:"foreignKey:OrderID" json:"status_history,omitempty"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName sets the table name
func (Order) TableName() string {
	return "orders"
}

// BeforeCreate generates UUID and order number
func (o *Order) BeforeCreate(tx *gorm.DB) error {
	if o.ID == uuid.Nil {
		o.ID = uuid.New()
	}
	if o.OrderNumber == "" {
		o.OrderNumber = GenerateOrderNumber()
	}
	return nil
}

// GenerateOrderNumber generates a unique order number
func GenerateOrderNumber() string {
	now := time.Now()
	return fmt.Sprintf("ORD-%s-%s",
		now.Format("20060102"),
		uuid.New().String()[:8])
}

// CanCancel checks if order can be cancelled
func (o *Order) CanCancel() bool {
	return o.OrderStatus == OrderStatusPending ||
		o.OrderStatus == OrderStatusPaymentConfirmed
}

// CanShip checks if order can be shipped
func (o *Order) CanShip() bool {
	return o.OrderStatus == OrderStatusProcessing &&
		o.PaymentStatus == PaymentStatusPaid
}

// IsPaid checks if order is paid
func (o *Order) IsPaid() bool {
	return o.PaymentStatus == PaymentStatusPaid
}

// GetShippingAddress returns formatted shipping address
func (o *Order) GetShippingAddress() string {
	addr := o.ShippingAddressLine1
	if o.ShippingAddressLine2 != "" {
		addr += ", " + o.ShippingAddressLine2
	}
	addr += ", " + o.ShippingCity + ", " + o.ShippingProvince + " " + o.ShippingPostalCode
	return addr
}

// OrderItem represents an item in an order
type OrderItem struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	OrderID   uuid.UUID `gorm:"type:uuid;not null" json:"order_id"`
	ProductID uuid.UUID `gorm:"type:uuid;not null" json:"product_id"`
	VariantID *uuid.UUID `gorm:"type:uuid" json:"variant_id"`

	// Snapshot data
	ProductName  string `gorm:"column:product_name;size:255;not null" json:"product_name"`
	ProductSKU   string `gorm:"column:product_sku;size:100;not null" json:"product_sku"`
	VariantType  string `gorm:"column:variant_type;size:50" json:"variant_type"`
	VariantValue string `gorm:"column:variant_value;size:100" json:"variant_value"`

	Quantity  int             `gorm:"not null" json:"quantity"`
	UnitPrice decimal.Decimal `gorm:"column:unit_price;type:numeric(12,2);not null" json:"unit_price"`
	Subtotal  decimal.Decimal `gorm:"type:numeric(12,2);not null" json:"subtotal"`

	CreatedAt time.Time `json:"created_at"`
}

// TableName sets the table name
func (OrderItem) TableName() string {
	return "order_items"
}

// BeforeCreate generates UUID and calculates subtotal
func (oi *OrderItem) BeforeCreate(tx *gorm.DB) error {
	if oi.ID == uuid.Nil {
		oi.ID = uuid.New()
	}
	oi.Subtotal = oi.UnitPrice.Mul(decimal.NewFromInt(int64(oi.Quantity)))
	return nil
}

// OrderStatusHistory tracks order status changes
type OrderStatusHistory struct {
	ID         uuid.UUID  `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	OrderID    uuid.UUID  `gorm:"type:uuid;not null" json:"order_id"`
	FromStatus string     `gorm:"column:from_status;size:50" json:"from_status"`
	ToStatus   string     `gorm:"column:to_status;size:50;not null" json:"to_status"`
	Notes      string     `gorm:"type:text" json:"notes"`
	ChangedBy  *uuid.UUID `gorm:"column:changed_by;type:uuid" json:"changed_by"`
	ChangedAt  time.Time  `gorm:"column:changed_at;default:CURRENT_TIMESTAMP" json:"changed_at"`
}

// TableName sets the table name
func (OrderStatusHistory) TableName() string {
	return "order_status_history"
}

// BeforeCreate generates UUID
func (osh *OrderStatusHistory) BeforeCreate(tx *gorm.DB) error {
	if osh.ID == uuid.Nil {
		osh.ID = uuid.New()
	}
	return nil
}

// PromoCode represents a promotional discount code
type PromoCode struct {
	ID                  uuid.UUID       `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	Code                string          `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Description         string          `gorm:"type:text" json:"description"`
	DiscountType        string          `gorm:"column:discount_type;size:20;not null" json:"discount_type"` // percentage, fixed
	DiscountValue       decimal.Decimal `gorm:"column:discount_value;type:numeric(12,2);not null" json:"discount_value"`
	MinOrderAmount      decimal.Decimal `gorm:"column:min_order_amount;type:numeric(12,2);default:0" json:"min_order_amount"`
	MaxDiscountAmount   *decimal.Decimal `gorm:"column:max_discount_amount;type:numeric(12,2)" json:"max_discount_amount"`
	UsageLimit          *int            `gorm:"column:usage_limit" json:"usage_limit"`
	UsageCount          int             `gorm:"column:usage_count;default:0" json:"usage_count"`
	UsageLimitPerUser   int             `gorm:"column:usage_limit_per_user;default:1" json:"usage_limit_per_user"`
	ValidFrom           time.Time       `gorm:"column:valid_from;not null" json:"valid_from"`
	ValidTo             time.Time       `gorm:"column:valid_to;not null" json:"valid_to"`
	IsActive            bool            `gorm:"column:is_active;default:true" json:"is_active"`
	ApplicableProducts  []uuid.UUID     `gorm:"column:applicable_products;type:uuid[]" json:"applicable_products"`
	ApplicableCategories []uuid.UUID    `gorm:"column:applicable_categories;type:uuid[]" json:"applicable_categories"`
	CreatedAt           time.Time       `json:"created_at"`
	UpdatedAt           time.Time       `json:"updated_at"`
}

// TableName sets the table name
func (PromoCode) TableName() string {
	return "promo_codes"
}

// BeforeCreate generates UUID
func (pc *PromoCode) BeforeCreate(tx *gorm.DB) error {
	if pc.ID == uuid.Nil {
		pc.ID = uuid.New()
	}
	return nil
}

// IsValid checks if promo code is currently valid
func (pc *PromoCode) IsValid() bool {
	now := time.Now()
	if !pc.IsActive {
		return false
	}
	if now.Before(pc.ValidFrom) || now.After(pc.ValidTo) {
		return false
	}
	if pc.UsageLimit != nil && pc.UsageCount >= *pc.UsageLimit {
		return false
	}
	return true
}

// CalculateDiscount calculates the discount amount for a given order subtotal
func (pc *PromoCode) CalculateDiscount(subtotal decimal.Decimal) decimal.Decimal {
	if subtotal.LessThan(pc.MinOrderAmount) {
		return decimal.Zero
	}

	var discount decimal.Decimal
	if pc.DiscountType == "percentage" {
		discount = subtotal.Mul(pc.DiscountValue.Div(decimal.NewFromInt(100)))
		if pc.MaxDiscountAmount != nil && discount.GreaterThan(*pc.MaxDiscountAmount) {
			discount = *pc.MaxDiscountAmount
		}
	} else {
		discount = pc.DiscountValue
	}

	// Discount cannot exceed subtotal
	if discount.GreaterThan(subtotal) {
		return subtotal
	}
	return discount
}

// PromoCodeUsage tracks promo code usage
type PromoCodeUsage struct {
	ID             uuid.UUID       `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	PromoCodeID    uuid.UUID       `gorm:"column:promo_code_id;type:uuid;not null" json:"promo_code_id"`
	UserID         uuid.UUID       `gorm:"type:uuid;not null" json:"user_id"`
	OrderID        *uuid.UUID      `gorm:"type:uuid" json:"order_id"`
	DiscountAmount decimal.Decimal `gorm:"column:discount_amount;type:numeric(12,2);not null" json:"discount_amount"`
	UsedAt         time.Time       `gorm:"column:used_at;default:CURRENT_TIMESTAMP" json:"used_at"`
}

// TableName sets the table name
func (PromoCodeUsage) TableName() string {
	return "promo_code_usages"
}

// BeforeCreate generates UUID
func (pcu *PromoCodeUsage) BeforeCreate(tx *gorm.DB) error {
	if pcu.ID == uuid.Nil {
		pcu.ID = uuid.New()
	}
	return nil
}
