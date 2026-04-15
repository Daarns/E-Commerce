package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// CartItem represents an item in a shopping cart
type CartItem struct {
	ID        uuid.UUID       `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	UserID    *uuid.UUID      `gorm:"type:uuid" json:"user_id"`
	SessionID string          `gorm:"size:255" json:"session_id"` // for guest users
	ProductID uuid.UUID       `gorm:"type:uuid;not null" json:"product_id"`
	Product   *Product        `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	VariantID *uuid.UUID      `gorm:"type:uuid" json:"variant_id"`
	Variant   *ProductVariant `gorm:"foreignKey:VariantID" json:"variant,omitempty"`
	Quantity  int             `gorm:"not null;default:1" json:"quantity"`
	Price     decimal.Decimal `gorm:"type:numeric(12,2);not null" json:"price"` // snapshot price
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}

// TableName sets the table name
func (CartItem) TableName() string {
	return "cart_items"
}

// BeforeCreate generates UUID
func (c *CartItem) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

// GetSubtotal returns the subtotal for this cart item
func (c *CartItem) GetSubtotal() decimal.Decimal {
	return c.Price.Mul(decimal.NewFromInt(int64(c.Quantity)))
}

// IsGuestCart checks if this is a guest cart item
func (c *CartItem) IsGuestCart() bool {
	return c.UserID == nil && c.SessionID != ""
}

// Address represents a user's shipping/billing address
type Address struct {
	ID            uuid.UUID      `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	UserID        uuid.UUID      `gorm:"type:uuid;not null" json:"user_id"`
	RecipientName string         `gorm:"column:name;size:255;not null" json:"recipient_name"`
	Phone         string         `gorm:"size:20;not null" json:"phone"`
	AddressLine1  string         `gorm:"column:address_line1;size:255;not null" json:"address_line1"`
	AddressLine2  string         `gorm:"column:address_line2;size:255" json:"address_line2"`
	City          string         `gorm:"size:100;not null" json:"city"`
	Province      string         `gorm:"size:100;not null" json:"province"`
	PostalCode    string         `gorm:"column:postal_code;size:10;not null" json:"postal_code"`
	IsDefault     bool           `gorm:"column:is_default;default:false" json:"is_default"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// TableName sets the table name
func (Address) TableName() string {
	return "addresses"
}

// BeforeCreate generates UUID
func (a *Address) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

// GetFullAddress returns formatted full address
func (a *Address) GetFullAddress() string {
	addr := a.AddressLine1
	if a.AddressLine2 != "" {
		addr += ", " + a.AddressLine2
	}
	addr += ", " + a.City + ", " + a.Province + " " + a.PostalCode
	return addr
}

// Cart represents a shopping cart (virtual, not stored)
type Cart struct {
	UserID    *uuid.UUID      `json:"user_id"`
	SessionID string          `json:"session_id"`
	Items     []CartItem      `json:"items"`
	Subtotal  decimal.Decimal `json:"subtotal"`
	ItemCount int             `json:"item_count"`
}

// CalculateTotals calculates cart subtotal and item count
func (c *Cart) CalculateTotals() {
	c.Subtotal = decimal.Zero
	c.ItemCount = 0
	for _, item := range c.Items {
		c.Subtotal = c.Subtotal.Add(item.GetSubtotal())
		c.ItemCount += item.Quantity
	}
}

// IsEmpty checks if cart is empty
func (c *Cart) IsEmpty() bool {
	return len(c.Items) == 0
}
