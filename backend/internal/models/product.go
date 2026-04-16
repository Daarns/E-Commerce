package models

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// Product represents a product in the e-commerce system
type Product struct {
	ID                  uuid.UUID       `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	Name                string          `gorm:"size:255;not null" json:"name"`
	Slug                string          `gorm:"size:255;uniqueIndex;not null" json:"slug"`
	SKU                 string          `gorm:"size:100;not null" json:"sku"`
	Description         string          `gorm:"type:text" json:"description"`
	ShortDescription    string          `gorm:"size:500" json:"short_description"`
	RegularPrice        decimal.Decimal `gorm:"type:numeric(12,2);not null" json:"regular_price"`
	SalePrice           *decimal.Decimal `gorm:"type:numeric(12,2)" json:"sale_price"`
	SaleStartDate       *time.Time      `json:"sale_start_date"`
	SaleEndDate         *time.Time      `json:"sale_end_date"`
	StockQuantity       int             `gorm:"default:0" json:"stock_quantity"`
	StockAlertThreshold int             `gorm:"default:10" json:"stock_alert_threshold"`
	AllowBackorders     bool            `gorm:"default:false" json:"allow_backorders"`
	Weight              *decimal.Decimal `gorm:"type:numeric(8,2)" json:"weight"`
	Length              *decimal.Decimal `gorm:"type:numeric(8,2)" json:"length"`
	Width               *decimal.Decimal `gorm:"type:numeric(8,2)" json:"width"`
	Height              *decimal.Decimal `gorm:"type:numeric(8,2)" json:"height"`
	Brand               string          `gorm:"size:100" json:"brand"`
	CategoryID          *uuid.UUID      `gorm:"type:uuid" json:"category_id"`
	Category            *Category       `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	Status              string          `gorm:"size:20;not null;default:'active'" json:"status"`
	ViewCount           int             `gorm:"default:0" json:"view_count"`
	SoldCount           int             `gorm:"default:0" json:"sold_count"`
	AvgRating           float64         `gorm:"type:decimal(3,2);default:0" json:"avg_rating"`
	ReviewCount         int64           `gorm:"default:0" json:"review_count"`
	Version             int             `gorm:"default:1" json:"version"`
	MetaTitle           string          `gorm:"size:255" json:"meta_title"`
	MetaDescription     string          `gorm:"type:text" json:"meta_description"`
	Images              []ProductImage  `gorm:"foreignKey:ProductID" json:"images,omitempty"`
	Variants            []ProductVariant `gorm:"foreignKey:ProductID" json:"variants,omitempty"`
	CreatedAt           time.Time       `json:"created_at"`
	UpdatedAt           time.Time       `json:"updated_at"`
	DeletedAt           gorm.DeletedAt  `gorm:"index" json:"deleted_at,omitempty"`
}

// TableName sets the table name
func (Product) TableName() string {
	return "products"
}

// BeforeCreate generates UUID and slug if not set
func (p *Product) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	if p.Slug == "" {
		p.Slug = GenerateSlug(p.Name)
	}
	if p.SKU == "" {
		p.SKU = fmt.Sprintf("SKU-%s", strings.ToUpper(p.ID.String()[:8]))
	}
	return nil
}

// IsAvailable checks if product is available for purchase
func (p *Product) IsAvailable() bool {
	return p.Status == "active" && (p.StockQuantity > 0 || p.AllowBackorders)
}

// HasSufficientStock checks if product has enough stock
func (p *Product) HasSufficientStock(quantity int) bool {
	return p.StockQuantity >= quantity || p.AllowBackorders
}

// GetCurrentPrice returns the effective price (sale or regular)
func (p *Product) GetCurrentPrice() decimal.Decimal {
	now := time.Now()
	if p.SalePrice != nil && !p.SalePrice.IsZero() {
		// Check if sale is active
		if (p.SaleStartDate == nil || now.After(*p.SaleStartDate)) &&
			(p.SaleEndDate == nil || now.Before(*p.SaleEndDate)) {
			return *p.SalePrice
		}
	}
	return p.RegularPrice
}

// IsOnSale checks if product is currently on sale
func (p *Product) IsOnSale() bool {
	if p.SalePrice == nil || p.SalePrice.IsZero() {
		return false
	}
	now := time.Now()
	return (p.SaleStartDate == nil || now.After(*p.SaleStartDate)) &&
		(p.SaleEndDate == nil || now.Before(*p.SaleEndDate))
}

// DeductStock reduces stock with validation
func (p *Product) DeductStock(quantity int) error {
	if !p.HasSufficientStock(quantity) {
		return fmt.Errorf("insufficient stock: requested %d, available %d", quantity, p.StockQuantity)
	}
	p.StockQuantity -= quantity
	return nil
}

// AddStock increases stock
func (p *Product) AddStock(quantity int) error {
	if quantity <= 0 {
		return fmt.Errorf("quantity must be positive")
	}
	p.StockQuantity += quantity
	return nil
}

// NeedsRestock checks if stock is below alert threshold
func (p *Product) NeedsRestock() bool {
	return p.StockQuantity <= p.StockAlertThreshold
}

// Category represents a product category
type Category struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	Name        string    `gorm:"size:100;not null" json:"name"`
	Slug        string    `gorm:"size:100;uniqueIndex;not null" json:"slug"`
	Description string    `gorm:"type:text" json:"description"`
	ParentID    *uuid.UUID `gorm:"type:uuid" json:"parent_id"`
	Parent      *Category `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	ImageURL    string    `gorm:"size:500" json:"image_url"`
	IsActive    bool      `gorm:"not null;default:true" json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// TableName sets the table name
func (Category) TableName() string {
	return "categories"
}

// BeforeCreate generates UUID and slug
func (c *Category) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	if c.Slug == "" {
		c.Slug = GenerateSlug(c.Name)
	}
	return nil
}

// IsRootCategory checks if category is a root category (no parent)
func (c *Category) IsRootCategory() bool {
	return c.ParentID == nil
}

// ProductImage represents product images
type ProductImage struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	ProductID    uuid.UUID `gorm:"type:uuid;not null" json:"product_id"`
	ImageURL     string    `gorm:"column:image_url;type:text;not null" json:"image_url"`
	AltText      string    `gorm:"size:255" json:"alt_text"`
	DisplayOrder int       `gorm:"column:display_order;default:0" json:"display_order"`
	IsPrimary    bool      `gorm:"column:is_primary;default:false" json:"is_primary"`
	CreatedAt    time.Time `json:"created_at"`
}

// TableName sets the table name
func (ProductImage) TableName() string {
	return "product_images"
}

// BeforeCreate generates UUID
func (pi *ProductImage) BeforeCreate(tx *gorm.DB) error {
	if pi.ID == uuid.Nil {
		pi.ID = uuid.New()
	}
	return nil
}

// ProductVariant represents product variants (size, color, etc.)
type ProductVariant struct {
	ID              uuid.UUID        `gorm:"type:uuid;primaryKey" json:"id"`
	ProductID       uuid.UUID        `gorm:"type:uuid;not null" json:"product_id"`
	VariantType     string           `gorm:"column:variant_type;size:50;not null" json:"variant_type"` // size, color, material
	VariantValue    string           `gorm:"column:variant_value;size:100;not null" json:"variant_value"` // M, Red, Cotton
	PriceAdjustment decimal.Decimal  `gorm:"type:numeric(12,2);default:0" json:"price_adjustment"`
	StockQuantity   int              `gorm:"default:0" json:"stock_quantity"`
	SKUSuffix       string           `gorm:"column:sku_suffix;size:50" json:"sku_suffix"`
	ImageURL        string           `gorm:"type:text" json:"image_url"`
	IsActive        bool             `gorm:"not null;default:true" json:"is_active"`
	CreatedAt       time.Time        `json:"created_at"`
	UpdatedAt       time.Time        `json:"updated_at"`
}

// TableName sets the table name
func (ProductVariant) TableName() string {
	return "product_variants"
}

// BeforeCreate generates UUID
func (pv *ProductVariant) BeforeCreate(tx *gorm.DB) error {
	if pv.ID == uuid.Nil {
		pv.ID = uuid.New()
	}
	return nil
}

// IsAvailable checks if variant is available
func (pv *ProductVariant) IsAvailable() bool {
	return pv.IsActive && pv.StockQuantity > 0
}

// HasSufficientStock checks variant stock
func (pv *ProductVariant) HasSufficientStock(quantity int) bool {
	return pv.StockQuantity >= quantity
}

// GenerateSlug creates a URL-friendly slug from a string
func GenerateSlug(s string) string {
	// Convert to lowercase
	slug := strings.ToLower(s)
	
	// Replace spaces with hyphens
	slug = strings.ReplaceAll(slug, " ", "-")
	
	// Remove special characters, keep only alphanumeric and hyphens
	reg := regexp.MustCompile("[^a-z0-9-]+")
	slug = reg.ReplaceAllString(slug, "")
	
	// Remove consecutive hyphens
	reg = regexp.MustCompile("-+")
	slug = reg.ReplaceAllString(slug, "-")
	
	// Trim hyphens from start and end
	slug = strings.Trim(slug, "-")
	
	return slug
}

// GenerateUniqueSlug creates a unique slug with conflict resolution
func GenerateUniqueSlug(baseSlug string, existingSlugs []string) string {
	slug := baseSlug
	counter := 1
	
	// Check if slug exists
	slugExists := func(s string) bool {
		for _, existing := range existingSlugs {
			if existing == s {
				return true
			}
		}
		return false
	}
	
	// Keep incrementing counter until we find unique slug
	for slugExists(slug) {
		counter++
		slug = fmt.Sprintf("%s-%d", baseSlug, counter)
	}
	
	return slug
}
