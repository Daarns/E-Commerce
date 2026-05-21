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
	ID                  uuid.UUID                   `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	Name                string                      `gorm:"size:255;not null" json:"name"`
	Slug                string                      `gorm:"size:255;uniqueIndex;not null" json:"slug"`
	SKU                 string                      `gorm:"size:100;not null" json:"sku"`
	Description         string                      `gorm:"type:text" json:"description"`
	ShortDescription    string                      `gorm:"size:500" json:"short_description"`
	RegularPrice        decimal.Decimal             `gorm:"type:numeric(12,2);not null" json:"regular_price"`
	SalePrice           *decimal.Decimal            `gorm:"type:numeric(12,2)" json:"sale_price"`
	SaleStartDate       *time.Time                  `json:"sale_start_date"`
	SaleEndDate         *time.Time                  `json:"sale_end_date"`
	StockQuantity       int                         `gorm:"default:0" json:"stock_quantity"`
	StockAlertThreshold int                         `gorm:"default:10" json:"stock_alert_threshold"`
	AllowBackorders     bool                        `gorm:"default:false" json:"allow_backorders"`
	Weight              *decimal.Decimal            `gorm:"type:numeric(8,2)" json:"weight"`
	Length              *decimal.Decimal            `gorm:"type:numeric(8,2)" json:"length"`
	Width               *decimal.Decimal            `gorm:"type:numeric(8,2)" json:"width"`
	Height              *decimal.Decimal            `gorm:"type:numeric(8,2)" json:"height"`
	Brand               string                      `gorm:"size:100" json:"brand"`
	CategoryID          *uuid.UUID                  `gorm:"type:uuid" json:"category_id"`
	Category            *Category                   `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	Status              string                      `gorm:"size:20;not null;default:'active'" json:"status"`
	ViewCount           int                         `gorm:"default:0" json:"view_count"`
	SoldCount           int                         `gorm:"default:0" json:"sold_count"`
	AvgRating           float64                     `gorm:"type:decimal(3,2);default:0" json:"avg_rating"`
	ReviewCount         int64                       `gorm:"default:0" json:"review_count"`
	Version             int                         `gorm:"default:1" json:"version"`
	MetaTitle           string                      `gorm:"size:60" json:"meta_title"`
	MetaDescription     string                      `gorm:"size:160" json:"meta_description"`
	CanonicalURL        string                      `gorm:"size:500" json:"canonical_url"`
	OGImage             string                      `gorm:"size:500" json:"og_image"`
	Images              []ProductImage              `gorm:"foreignKey:ProductID" json:"images,omitempty"`
	VariantTypes        []ProductVariantType        `gorm:"foreignKey:ProductID" json:"variant_types,omitempty"`
	Combinations        []ProductVariantCombination `gorm:"foreignKey:ProductID" json:"combinations,omitempty"`
	EffectivePrice      decimal.Decimal             `gorm:"-" json:"effective_price"`
	CreatedAt           time.Time                   `json:"created_at"`
	UpdatedAt           time.Time                   `json:"updated_at"`
	DeletedAt           gorm.DeletedAt              `gorm:"index" json:"deleted_at,omitempty"`
}

// TableName sets the table name
func (Product) TableName() string {
	return "products"
}

// AfterFind adds computed fields to product API responses.
func (p *Product) AfterFind(tx *gorm.DB) error {
	p.EffectivePrice = p.GetCurrentPrice()
	return nil
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

	// --- SEO auto-generate (baru) ---
	if p.MetaTitle == "" {
		p.MetaTitle = GenerateMetaTitle(p)
	}
	if p.MetaDescription == "" {
		p.MetaDescription = GenerateMetaDescription(p)
	}
	if p.CanonicalURL == "" {
		p.CanonicalURL = GenerateCanonicalURL(p.Slug)
	}
	if p.OGImage == "" {
		p.OGImage = GetPrimaryImageURL(p.Images)
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

// ProductImage represents product images
type ProductImage struct {
	ID           uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	ProductID    uuid.UUID  `gorm:"type:uuid;not null" json:"product_id"`
	ImageURL     string     `gorm:"column:image_url;type:text;not null" json:"image_url"`
	AltText      string     `gorm:"size:255" json:"alt_text"`
	DisplayOrder int        `gorm:"column:display_order;default:0" json:"display_order"`
	IsPrimary    bool       `gorm:"column:is_primary;default:false" json:"is_primary"`
	OptionID     *uuid.UUID `gorm:"column:option_id;type:uuid" json:"option_id,omitempty"`
	Width        *int       `gorm:"column:width" json:"width,omitempty"`
	Height       *int       `gorm:"column:height" json:"height,omitempty"`
	AspectRatio  *float64   `gorm:"column:aspect_ratio;type:numeric(10,6)" json:"aspect_ratio,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
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

// ProductVariantType groups option values for a product, for example Color or Storage.
type ProductVariantType struct {
	ID           uuid.UUID              `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	ProductID    uuid.UUID              `gorm:"type:uuid;not null" json:"product_id"`
	Name         string                 `gorm:"size:100;not null" json:"name"`
	IsVisual     bool                   `gorm:"not null;default:false" json:"is_visual"`
	DisplayOrder int                    `gorm:"not null;default:0" json:"display_order"`
	Options      []ProductVariantOption `gorm:"foreignKey:VariantTypeID" json:"options,omitempty"`
	CreatedAt    time.Time              `json:"created_at"`
	UpdatedAt    time.Time              `json:"updated_at"`
}

// TableName sets the table name.
func (ProductVariantType) TableName() string {
	return "product_variant_types"
}

// BeforeCreate generates UUID.
func (pvt *ProductVariantType) BeforeCreate(tx *gorm.DB) error {
	if pvt.ID == uuid.Nil {
		pvt.ID = uuid.New()
	}
	return nil
}

// ProductVariantOption is one selectable value under a variant type.
type ProductVariantOption struct {
	ID            uuid.UUID           `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	VariantTypeID uuid.UUID           `gorm:"type:uuid;not null" json:"variant_type_id"`
	VariantType   *ProductVariantType `gorm:"foreignKey:VariantTypeID" json:"variant_type,omitempty"`
	Value         string              `gorm:"size:100;not null" json:"value"`
	DisplayOrder  int                 `gorm:"not null;default:0" json:"display_order"`
	CreatedAt     time.Time           `json:"created_at"`
	UpdatedAt     time.Time           `json:"updated_at"`
}

// TableName sets the table name.
func (ProductVariantOption) TableName() string {
	return "product_variant_options"
}

// BeforeCreate generates UUID.
func (pvo *ProductVariantOption) BeforeCreate(tx *gorm.DB) error {
	if pvo.ID == uuid.Nil {
		pvo.ID = uuid.New()
	}
	return nil
}

// ProductVariantCombination represents a purchasable set of options.
type ProductVariantCombination struct {
	ID              uuid.UUID              `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	ProductID       uuid.UUID              `gorm:"type:uuid;not null" json:"product_id"`
	PriceAdjustment decimal.Decimal        `gorm:"type:numeric(12,2);not null;default:0" json:"price_adjustment"`
	StockQuantity   int                    `gorm:"not null;default:0" json:"stock_quantity"`
	SKU             string                 `gorm:"size:100;uniqueIndex" json:"sku"`
	IsActive        bool                   `gorm:"not null;default:true" json:"is_active"`
	Options         []ProductVariantOption `gorm:"many2many:product_combination_options;joinForeignKey:CombinationID;joinReferences:OptionID" json:"options,omitempty"`
	OptionIDs       []uuid.UUID            `gorm:"-" json:"option_ids,omitempty"`
	CreatedAt       time.Time              `json:"created_at"`
	UpdatedAt       time.Time              `json:"updated_at"`
}

// TableName sets the table name.
func (ProductVariantCombination) TableName() string {
	return "product_variant_combinations"
}

// BeforeCreate generates UUID.
func (pvc *ProductVariantCombination) BeforeCreate(tx *gorm.DB) error {
	if pvc.ID == uuid.Nil {
		pvc.ID = uuid.New()
	}
	return nil
}

// IsAvailable checks if the combination can be purchased.
func (pvc *ProductVariantCombination) IsAvailable() bool {
	return pvc.IsActive && pvc.StockQuantity > 0
}

// HasSufficientStock checks combination stock.
func (pvc *ProductVariantCombination) HasSufficientStock(quantity int) bool {
	return pvc.StockQuantity >= quantity
}

// ProductCombinationOption is the join table between combinations and options.
type ProductCombinationOption struct {
	CombinationID uuid.UUID `gorm:"type:uuid;primaryKey;column:combination_id" json:"combination_id"`
	OptionID      uuid.UUID `gorm:"type:uuid;primaryKey;column:option_id" json:"option_id"`
}

// TableName sets the table name.
func (ProductCombinationOption) TableName() string {
	return "product_combination_options"
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
