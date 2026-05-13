package repositories

import (
	"ecommerce-backend/internal/models"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ProductRepository handles product data operations
type ProductRepository struct {
	db *gorm.DB
}

// NewProductRepository creates a new product repository
func NewProductRepository(db *gorm.DB) *ProductRepository {
	return &ProductRepository{db: db}
}

// ProductFilter contains filter options for product queries
type ProductFilter struct {
	CategoryID  *uuid.UUID
	MinPrice    *float64
	MaxPrice    *float64
	Search      string
	Status      string // active, inactive, draft
	InStock     *bool
	Brand       string
	SortBy      string // name, regular_price, created_at
	SortOrder   string // asc, desc
	Page        int
	Limit       int
}

// ProductListResult contains paginated product results
type ProductListResult struct {
	Products   []models.Product `json:"products"`
	Total      int64            `json:"total"`
	Page       int              `json:"page"`
	Limit      int              `json:"limit"`
	TotalPages int              `json:"total_pages"`
}

// Create creates a new product with unique slug generation
func (r *ProductRepository) Create(product *models.Product) error {
	// Generate unique slug
	if product.Slug == "" {
		product.Slug = models.GenerateSlug(product.Name)
	}
	
	// Check for slug conflict and generate unique
	existingSlugs, err := r.GetAllSlugs()
	if err != nil {
		return fmt.Errorf("failed to check existing slugs: %w", err)
	}
	product.Slug = models.GenerateUniqueSlug(product.Slug, existingSlugs)
	
	return r.db.Create(product).Error
}

// GetByID retrieves a product by ID with related data
func (r *ProductRepository) GetByID(id uuid.UUID) (*models.Product, error) {
	var product models.Product
	err := r.db.Preload("Category").
		Preload("Images", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC")
		}).
		Preload("Variants").
		First(&product, "id = ?", id).Error
	
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("product not found")
		}
		return nil, err
	}
	return &product, nil
}

// GetBySlug retrieves a product by slug
func (r *ProductRepository) GetBySlug(slug string) (*models.Product, error) {
	var product models.Product
	err := r.db.Preload("Category").
		Preload("Images", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC")
		}).
		Preload("Variants").
		First(&product, "slug = ?", slug).Error
	
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("product not found")
		}
		return nil, err
	}
	return &product, nil
}

// List retrieves products with filtering, search, and pagination
func (r *ProductRepository) List(filter ProductFilter) (*ProductListResult, error) {
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
	
	query := r.db.Model(&models.Product{})
	
	// Apply filters
	if filter.CategoryID != nil {
		query = query.Where("category_id = ?", *filter.CategoryID)
	}
	
	if filter.MinPrice != nil {
		query = query.Where("regular_price >= ?", *filter.MinPrice)
	}
	
	if filter.MaxPrice != nil {
		query = query.Where("regular_price <= ?", *filter.MaxPrice)
	}
	
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}
	
	if filter.InStock != nil && *filter.InStock {
		query = query.Where("stock_quantity > 0")
	}

	if filter.Brand != "" {
		query = query.Where("brand = ?", filter.Brand)
	}
	
	// Full-text search using PostgreSQL
	if filter.Search != "" {
		searchTerm := "%" + strings.ToLower(filter.Search) + "%"
		query = query.Where(
			"LOWER(name) LIKE ? OR LOWER(description) LIKE ?",
			searchTerm, searchTerm,
		)
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
		case "name":
			sortColumn = "name"
		case "regular_price":
			sortColumn = "regular_price"
		case "created_at":
			sortColumn = "created_at"
		case "stock_quantity":
			sortColumn = "stock_quantity"
		case "sold_count":
			sortColumn = "sold_count"
		}
	}
	
	if filter.SortOrder != "" {
		if strings.ToUpper(filter.SortOrder) == "ASC" {
			sortOrder = "ASC"
		}
	}
	
	query = query.Order(fmt.Sprintf("%s %s", sortColumn, sortOrder))
	
	// Apply pagination
	offset := (filter.Page - 1) * filter.Limit
	query = query.Offset(offset).Limit(filter.Limit)
	
	// Execute query with preloads
	var products []models.Product
	err := query.Preload("Category").
		Preload("Images", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC").Limit(1) // Only first image for list
		}).
		Find(&products).Error
	
	if err != nil {
		return nil, err
	}
	
	totalPages := int(total) / filter.Limit
	if int(total)%filter.Limit > 0 {
		totalPages++
	}
	
	return &ProductListResult{
		Products:   products,
		Total:      total,
		Page:       filter.Page,
		Limit:      filter.Limit,
		TotalPages: totalPages,
	}, nil
}

// Update updates a product
func (r *ProductRepository) Update(product *models.Product) error {
	return r.db.Save(product).Error
}

// UpdateWithOptimisticLock updates a product with optimistic locking
func (r *ProductRepository) UpdateWithOptimisticLock(product *models.Product) error {
	result := r.db.Model(product).
		Where("id = ? AND version = ?", product.ID, product.Version).
		Updates(map[string]interface{}{
			"name":              product.Name,
			"slug":              product.Slug,
			"description":       product.Description,
			"short_description": product.ShortDescription,
			"regular_price":     product.RegularPrice,
			"sale_price":        product.SalePrice,
			"stock_quantity":    product.StockQuantity,
			"category_id":       product.CategoryID,
			"brand":             product.Brand,
			"status":            product.Status,
			"version":           product.Version + 1,
		})
	
	if result.Error != nil {
		return result.Error
	}
	
	if result.RowsAffected == 0 {
		return fmt.Errorf("optimistic lock conflict: product was modified by another transaction")
	}
	
	product.Version++
	return nil
}

// UpdateStock updates product stock with optimistic locking
func (r *ProductRepository) UpdateStock(id uuid.UUID, quantity int, version int) error {
	result := r.db.Model(&models.Product{}).
		Where("id = ? AND version = ?", id, version).
		Updates(map[string]interface{}{
			"stock_quantity": gorm.Expr("stock_quantity + ?", quantity),
			"version":        gorm.Expr("version + 1"),
		})
	
	if result.Error != nil {
		return result.Error
	}
	
	if result.RowsAffected == 0 {
		return fmt.Errorf("stock update conflict: product was modified")
	}
	
	return nil
}

// DeductStockWithLock deducts stock with pessimistic locking (for checkout)
// Use this when you don't have an existing transaction
func (r *ProductRepository) DeductStockWithLock(id uuid.UUID, quantity int) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		return r.DeductStockWithLockTx(tx, id, quantity)
	})
}

// DeductStockWithLockTx deducts stock with pessimistic locking within an existing transaction
// Use this when you already have a transaction context (e.g., during checkout)
func (r *ProductRepository) DeductStockWithLockTx(tx *gorm.DB, id uuid.UUID, quantity int) error {
	var product models.Product

	// Lock the row for update
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		First(&product, "id = ?", id).Error
	if err != nil {
		return err
	}

	// Check stock
	if product.StockQuantity < quantity {
		return fmt.Errorf("insufficient stock: requested %d, available %d", quantity, product.StockQuantity)
	}

	// Deduct stock
	return tx.Model(&product).
		Update("stock_quantity", gorm.Expr("stock_quantity - ?", quantity)).Error
}

// Delete soft deletes a product
func (r *ProductRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.Product{}, "id = ?", id).Error
}

// GetAllSlugs retrieves all product slugs
func (r *ProductRepository) GetAllSlugs() ([]string, error) {
	var slugs []string
	err := r.db.Model(&models.Product{}).Pluck("slug", &slugs).Error
	return slugs, err
}

// SlugExists checks if a slug already exists
func (r *ProductRepository) SlugExists(slug string) (bool, error) {
	var count int64
	err := r.db.Model(&models.Product{}).Where("slug = ?", slug).Count(&count).Error
	return count > 0, err
}

// GetByCategory retrieves products by category ID
func (r *ProductRepository) GetByCategory(categoryID uuid.UUID, limit int) ([]models.Product, error) {
	var products []models.Product
	query := r.db.Where("category_id = ? AND status = ?", categoryID, "active").
		Preload("Images", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC").Limit(1)
		}).
		Order("created_at DESC")
	
	if limit > 0 {
		query = query.Limit(limit)
	}
	
	err := query.Find(&products).Error
	return products, err
}

// AddImage adds an image to a product
func (r *ProductRepository) AddImage(image *models.ProductImage) error {
	return r.db.Create(image).Error
}

// RemoveImage removes an image from a product
func (r *ProductRepository) RemoveImage(imageID uuid.UUID) error {
	return r.db.Delete(&models.ProductImage{}, "id = ?", imageID).Error
}

// UpdateImageDisplayOrder updates image display order
func (r *ProductRepository) UpdateImageDisplayOrder(productID uuid.UUID, positions map[uuid.UUID]int) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		for imageID, displayOrder := range positions {
			if err := tx.Model(&models.ProductImage{}).
				Where("id = ? AND product_id = ?", imageID, productID).
				Update("display_order", displayOrder).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// AddVariant adds a variant to a product
func (r *ProductRepository) AddVariant(variant *models.ProductVariant) error {
	return r.db.Create(variant).Error
}

// UpdateVariant updates a product variant
func (r *ProductRepository) UpdateVariant(variant *models.ProductVariant) error {
	return r.db.Save(variant).Error
}

// RemoveVariant removes a variant from a product
func (r *ProductRepository) RemoveVariant(variantID uuid.UUID) error {
	return r.db.Delete(&models.ProductVariant{}, "id = ?", variantID).Error
}

// GetVariant retrieves a product variant by ID
func (r *ProductRepository) GetVariant(variantID uuid.UUID) (*models.ProductVariant, error) {
	var variant models.ProductVariant
	err := r.db.First(&variant, "id = ?", variantID).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("variant not found")
		}
		return nil, err
	}
	return &variant, nil
}

// SearchProducts performs full-text search on products
func (r *ProductRepository) SearchProducts(query string, limit int) ([]models.Product, error) {
	var products []models.Product
	
	searchTerm := "%" + strings.ToLower(query) + "%"
	
	err := r.db.Where("status = ?", "active").
		Where("LOWER(name) LIKE ? OR LOWER(description) LIKE ?", searchTerm, searchTerm).
		Preload("Category").
		Preload("Images", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC").Limit(1)
		}).
		Limit(limit).
		Find(&products).Error
	
	return products, err
}

// GetFeaturedProducts retrieves featured products (most recent active products)
func (r *ProductRepository) GetFeaturedProducts(limit int) ([]models.Product, error) {
	var products []models.Product
	
	err := r.db.Where("status = ? AND stock_quantity > 0", "active").
		Preload("Category").
		Preload("Images", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC").Limit(1)
		}).
		Order("created_at DESC").
		Limit(limit).
		Find(&products).Error
	
	return products, err
}

// GetRelatedProducts retrieves related products (same category)
func (r *ProductRepository) GetRelatedProducts(productID uuid.UUID, categoryID uuid.UUID, limit int) ([]models.Product, error) {
	var products []models.Product
	
	err := r.db.Where("id != ? AND category_id = ? AND status = ? AND stock_quantity > 0", productID, categoryID, "active").
		Preload("Images", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC").Limit(1)
		}).
		Order("RANDOM()").
		Limit(limit).
		Find(&products).Error
	
	return products, err
}

// GetBestSellers retrieves best selling products based on sold count in last 30 days
func (r *ProductRepository) GetBestSellers(limit int) ([]models.Product, error) {
	var products []models.Product
	
	err := r.db.Where("status = ? AND stock_quantity > 0", "active").
		Preload("Category").
		Preload("Images", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC").Limit(1)
		}).
		Order("sold_count DESC, created_at DESC").
		Limit(limit).
		Find(&products).Error
	
	return products, err
}

// GetNewArrivals retrieves recently created products
func (r *ProductRepository) GetNewArrivals(limit int) ([]models.Product, error) {
	var products []models.Product
	
	err := r.db.Where("status = ? AND stock_quantity > 0", "active").
		Preload("Category").
		Preload("Images", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC").Limit(1)
		}).
		Order("created_at DESC").
		Limit(limit).
		Find(&products).Error
	
	return products, err
}

// GetCandidatesForFeatured retrieves all active products with stock for featured scoring
func (r *ProductRepository) GetCandidatesForFeatured() ([]models.Product, error) {
	var products []models.Product
	
	err := r.db.Where("status = ? AND stock_quantity > 0", "active").
		Preload("Category").
		Preload("Images", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC").Limit(1)
		}).
		Find(&products).Error
	
	return products, err
}


type AdminProductFilter struct {
	ProductFilter
 
	IncludeDeleted bool
}

func (r *ProductRepository) AdminList(filter AdminProductFilter) (*ProductListResult, error) {
	if filter.Page <= 0 {
		filter.Page = 1
	}
	if filter.Limit <= 0 {
		filter.Limit = 20
	}
	if filter.Limit > 100 {
		filter.Limit = 100
	}
 
	query := r.db.Model(&models.Product{})
 
	if filter.IncludeDeleted {
		query = query.Unscoped()
	}
 
	if filter.CategoryID != nil {
		query = query.Where("category_id = ?", *filter.CategoryID)
	}
	if filter.MinPrice != nil {
		query = query.Where("regular_price >= ?", *filter.MinPrice)
	}
	if filter.MaxPrice != nil {
		query = query.Where("regular_price <= ?", *filter.MaxPrice)
	}
	// Tidak ada default filter status — admin melihat semua.
	// Status hanya difilter jika eksplisit diisi (e.g. ?status=draft)
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}
	if filter.InStock != nil && *filter.InStock {
		query = query.Where("stock_quantity > 0")
	}
	if filter.Brand != "" {
		query = query.Where("brand = ?", filter.Brand)
	}
	if filter.Search != "" {
		searchTerm := "%" + strings.ToLower(filter.Search) + "%"
		query = query.Where(
			"LOWER(name) LIKE ? OR LOWER(description) LIKE ?",
			searchTerm, searchTerm,
		)
	}
 
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}
 
	sortColumn := "created_at"
	sortOrder := "DESC"
	if filter.SortBy != "" {
		switch filter.SortBy {
		case "name":
			sortColumn = "name"
		case "regular_price":
			sortColumn = "regular_price"
		case "stock_quantity":
			sortColumn = "stock_quantity"
		case "sold_count":
			sortColumn = "sold_count"
		case "updated_at":
			sortColumn = "updated_at"
		case "created_at":
			sortColumn = "created_at"
		}
	}
	if strings.ToUpper(filter.SortOrder) == "ASC" {
		sortOrder = "ASC"
	}
	query = query.Order(fmt.Sprintf("%s %s", sortColumn, sortOrder))
 
	offset := (filter.Page - 1) * filter.Limit
	query = query.Offset(offset).Limit(filter.Limit)
 
	var products []models.Product
	err := query.
		Preload("Category").
		Preload("Images", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC").Limit(1)
		}).
		Find(&products).Error
	if err != nil {
		return nil, err
	}
 
	totalPages := int(total) / filter.Limit
	if int(total)%filter.Limit > 0 {
		totalPages++
	}
 
	return &ProductListResult{
		Products:   products,
		Total:      total,
		Page:       filter.Page,
		Limit:      filter.Limit,
		TotalPages: totalPages,
	}, nil
}
 
func (r *ProductRepository) AdminGetByID(id uuid.UUID) (*models.Product, error) {
	var product models.Product
	err := r.db.Unscoped().
		Preload("Category").
		Preload("Images", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped().Order("display_order ASC")
		}).
		Preload("Variants", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped()
		}).
		First(&product, "id = ?", id).Error
 
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("product not found")
		}
		return nil, err
	}
	return &product, nil
}