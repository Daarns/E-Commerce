package product

import (
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	"fmt"
	"mime/multipart"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// ProductService handles product business logic
type ProductService struct {
	productRepo  *repositories.ProductRepository
	categoryRepo *repositories.CategoryRepository
}

// NewProductService creates a new product service
func NewProductService(productRepo *repositories.ProductRepository, categoryRepo *repositories.CategoryRepository) *ProductService {
	return &ProductService{
		productRepo:  productRepo,
		categoryRepo: categoryRepo,
	}
}

// CreateProductInput represents product creation input
type CreateProductInput struct {
	Name             string  `json:"name" binding:"required,min=2,max=255"`
	Description      string  `json:"description"`
	ShortDescription string  `json:"short_description"`
	RegularPrice     float64 `json:"regular_price" binding:"required,min=0"`
	SalePrice        *float64 `json:"sale_price"`
	StockQuantity    int     `json:"stock_quantity" binding:"min=0"`
	CategoryID       *string `json:"category_id"`
	Brand            string  `json:"brand"`
	SKU              string  `json:"sku"`
	Status           string  `json:"status"`
}

// UpdateProductInput represents product update input
type UpdateProductInput struct {
	Name             *string  `json:"name,omitempty"`
	Description      *string  `json:"description,omitempty"`
	ShortDescription *string  `json:"short_description,omitempty"`
	RegularPrice     *float64 `json:"regular_price,omitempty"`
	SalePrice        *float64 `json:"sale_price,omitempty"`
	StockQuantity    *int     `json:"stock_quantity,omitempty"`
	CategoryID       *string  `json:"category_id,omitempty"`
	Brand            *string  `json:"brand,omitempty"`
	Status           *string  `json:"status,omitempty"`
	Version          int      `json:"version" binding:"required"`
}

// CreateVariantInput represents variant creation input
type CreateVariantInput struct {
	ProductID       uuid.UUID `json:"product_id"`
	VariantType     string    `json:"variant_type" binding:"required,min=1,max=50"` // size, color, material
	VariantValue    string    `json:"variant_value" binding:"required,min=1,max=100"` // M, Red, Cotton
	PriceAdjustment float64   `json:"price_adjustment"` // can be negative or positive
	StockQuantity   int       `json:"stock_quantity" binding:"min=0"`
	SKUSuffix       string    `json:"sku_suffix"`
	ImageURL        string    `json:"image_url"`
	IsActive        bool      `json:"is_active"`
}

// CreateCategoryInput represents category creation input
type CreateCategoryInput struct {
	Name        string     `json:"name" binding:"required,min=2,max=100"`
	Description string     `json:"description"`
	ParentID    *uuid.UUID `json:"parent_id"`
	ImageURL    string     `json:"image_url"`
	IsActive    bool       `json:"is_active"`
}

// UpdateCategoryInput represents category update input
type UpdateCategoryInput struct {
	Name        *string    `json:"name,omitempty"`
	Description *string    `json:"description,omitempty"`
	ParentID    *uuid.UUID `json:"parent_id,omitempty"`
	ImageURL    *string    `json:"image_url,omitempty"`
	IsActive    *bool      `json:"is_active,omitempty"`
}

// ===== PRODUCT OPERATIONS =====

// CreateProduct creates a new product
func (uc *ProductService) CreateProduct(input CreateProductInput) (*models.Product, error) {
	// Validate category if provided
	var categoryID *uuid.UUID
	if input.CategoryID != nil && *input.CategoryID != "" {
		catID, err := uuid.Parse(*input.CategoryID)
		if err != nil {
			return nil, fmt.Errorf("invalid category ID format")
		}
		_, err = uc.categoryRepo.GetByID(catID)
		if err != nil {
			return nil, fmt.Errorf("invalid category: %w", err)
		}
		categoryID = &catID
	}

	// Set defaults
	status := "active"
	if input.Status != "" {
		status = input.Status
	}

	product := &models.Product{
		Name:             strings.TrimSpace(input.Name),
		Description:      strings.TrimSpace(input.Description),
		ShortDescription: strings.TrimSpace(input.ShortDescription),
		RegularPrice:     decimal.NewFromFloat(input.RegularPrice),
		StockQuantity:    input.StockQuantity,
		CategoryID:       categoryID,
		Brand:            input.Brand,
		SKU:              input.SKU,
		Status:           status,
		Version:          1,
	}

	if input.SalePrice != nil {
		sp := decimal.NewFromFloat(*input.SalePrice)
		product.SalePrice = &sp
	}

	if err := uc.productRepo.Create(product); err != nil {
		return nil, fmt.Errorf("failed to create product: %w", err)
	}

	return uc.productRepo.GetByID(product.ID)
}

// GetProduct retrieves a product by ID
func (uc *ProductService) GetProduct(id uuid.UUID) (*models.Product, error) {
	return uc.productRepo.GetByID(id)
}

// GetProductBySlug retrieves a product by slug
func (uc *ProductService) GetProductBySlug(slug string) (*models.Product, error) {
	return uc.productRepo.GetBySlug(slug)
}

// ListProducts retrieves products with filters
func (uc *ProductService) ListProducts(filter repositories.ProductFilter) (*repositories.ProductListResult, error) {
	return uc.productRepo.List(filter)
}

// UpdateProduct updates a product with optimistic locking
func (uc *ProductService) UpdateProduct(id uuid.UUID, input UpdateProductInput) (*models.Product, error) {
	product, err := uc.productRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	// Check version for optimistic locking
	if product.Version != input.Version {
		return nil, fmt.Errorf("product was modified by another user (version mismatch)")
	}

	// Apply updates
	if input.Name != nil {
		product.Name = strings.TrimSpace(*input.Name)
		// Regenerate slug if name changed
		product.Slug = models.GenerateSlug(product.Name)
		existingSlugs, _ := uc.productRepo.GetAllSlugs()
		var filteredSlugs []string
		for _, s := range existingSlugs {
			if s != product.Slug {
				filteredSlugs = append(filteredSlugs, s)
			}
		}
		product.Slug = models.GenerateUniqueSlug(product.Slug, filteredSlugs)
	}
	
	if input.Description != nil {
		product.Description = strings.TrimSpace(*input.Description)
	}

	if input.ShortDescription != nil {
		product.ShortDescription = strings.TrimSpace(*input.ShortDescription)
	}
	
	if input.RegularPrice != nil {
		product.RegularPrice = decimal.NewFromFloat(*input.RegularPrice)
	}

	if input.SalePrice != nil {
		sp := decimal.NewFromFloat(*input.SalePrice)
		product.SalePrice = &sp
	}
	
	if input.StockQuantity != nil {
		product.StockQuantity = *input.StockQuantity
	}
	
	if input.CategoryID != nil && *input.CategoryID != "" {
		catID, err := uuid.Parse(*input.CategoryID)
		if err != nil {
			return nil, fmt.Errorf("invalid category ID format")
		}
		_, err = uc.categoryRepo.GetByID(catID)
		if err != nil {
			return nil, fmt.Errorf("invalid category: %w", err)
		}
		product.CategoryID = &catID
	}

	if input.Brand != nil {
		product.Brand = *input.Brand
	}
	
	if input.Status != nil {
		product.Status = *input.Status
	}

	// Update with optimistic locking
	if err := uc.productRepo.UpdateWithOptimisticLock(product); err != nil {
		return nil, err
	}

	return uc.productRepo.GetByID(id)
}

// DeleteProduct soft deletes a product
func (uc *ProductService) DeleteProduct(id uuid.UUID) error {
	// Check product exists
	_, err := uc.productRepo.GetByID(id)
	if err != nil {
		return err
	}
	
	return uc.productRepo.Delete(id)
}

// UpdateStock updates product stock with optimistic locking
func (uc *ProductService) UpdateStock(id uuid.UUID, quantityChange int, currentVersion int) error {
	return uc.productRepo.UpdateStock(id, quantityChange, currentVersion)
}

// DeductStock deducts stock for checkout (with pessimistic locking)
func (uc *ProductService) DeductStock(id uuid.UUID, quantity int) error {
	if quantity <= 0 {
		return fmt.Errorf("quantity must be positive")
	}
	return uc.productRepo.DeductStockWithLock(id, quantity)
}

// SearchProducts searches products by query
func (uc *ProductService) SearchProducts(query string, limit int) ([]models.Product, error) {
	if query == "" {
		return nil, fmt.Errorf("search query cannot be empty")
	}
	if limit <= 0 {
		limit = 20
	}
	return uc.productRepo.SearchProducts(query, limit)
}

// GetFeaturedProducts retrieves featured products
func (uc *ProductService) GetFeaturedProducts(limit int) ([]models.Product, error) {
	if limit <= 0 {
		limit = 10
	}
	return uc.productRepo.GetFeaturedProducts(limit)
}

// GetRelatedProducts retrieves related products
func (uc *ProductService) GetRelatedProducts(productID uuid.UUID, limit int) ([]models.Product, error) {
	product, err := uc.productRepo.GetByID(productID)
	if err != nil {
		return nil, err
	}
	
	if limit <= 0 {
		limit = 4
	}

	// Handle nil CategoryID
	var catID uuid.UUID
	if product.CategoryID != nil {
		catID = *product.CategoryID
	}
	
	return uc.productRepo.GetRelatedProducts(productID, catID, limit)
}

// ===== IMAGE OPERATIONS =====

// AddProductImage adds an image to a product
func (uc *ProductService) AddProductImage(productID uuid.UUID, imageURL string, altText string, position int) (*models.ProductImage, error) {
	// Verify product exists
	_, err := uc.productRepo.GetByID(productID)
	if err != nil {
		return nil, err
	}

	image := &models.ProductImage{
		ProductID:    productID,
		ImageURL:     imageURL,
		AltText:      altText,
		DisplayOrder: position,
	}

	if err := uc.productRepo.AddImage(image); err != nil {
		return nil, fmt.Errorf("failed to add image: %w", err)
	}

	return image, nil
}

// RemoveProductImage removes an image from a product
func (uc *ProductService) RemoveProductImage(imageID uuid.UUID) error {
	return uc.productRepo.RemoveImage(imageID)
}

// ReorderProductImages reorders product images
func (uc *ProductService) ReorderProductImages(productID uuid.UUID, positions map[uuid.UUID]int) error {
	return uc.productRepo.UpdateImageDisplayOrder(productID, positions)
}

// ValidateImageFile validates uploaded image file
func (uc *ProductService) ValidateImageFile(file *multipart.FileHeader) error {
	// Check file size (max 5MB)
	maxSize := int64(5 * 1024 * 1024)
	if file.Size > maxSize {
		return fmt.Errorf("file size exceeds maximum allowed (5MB)")
	}

	// Check file extension
	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowedExts := []string{".jpg", ".jpeg", ".png", ".webp", ".gif"}
	
	isAllowed := false
	for _, allowed := range allowedExts {
		if ext == allowed {
			isAllowed = true
			break
		}
	}
	
	if !isAllowed {
		return fmt.Errorf("file type not allowed. Allowed types: %v", allowedExts)
	}

	return nil
}

// ===== VARIANT OPERATIONS =====

// AddVariant adds a variant to a product
func (uc *ProductService) AddVariant(input CreateVariantInput) (*models.ProductVariant, error) {
	// Verify product exists
	_, err := uc.productRepo.GetByID(input.ProductID)
	if err != nil {
		return nil, err
	}

	variant := &models.ProductVariant{
		ProductID:       input.ProductID,
		VariantType:     strings.TrimSpace(input.VariantType),
		VariantValue:    strings.TrimSpace(input.VariantValue),
		PriceAdjustment: decimal.NewFromFloat(input.PriceAdjustment),
		StockQuantity:   input.StockQuantity,
		SKUSuffix:       input.SKUSuffix,
		ImageURL:        input.ImageURL,
		IsActive:        input.IsActive,
	}

	if err := uc.productRepo.AddVariant(variant); err != nil {
		return nil, fmt.Errorf("failed to add variant: %w", err)
	}

	return variant, nil
}

// UpdateVariant updates a product variant
func (uc *ProductService) UpdateVariant(variantID uuid.UUID, variantType, variantValue string, priceAdjustment float64, stockQuantity int, isActive bool) (*models.ProductVariant, error) {
	variant, err := uc.productRepo.GetVariant(variantID)
	if err != nil {
		return nil, err
	}

	variant.VariantType = strings.TrimSpace(variantType)
	variant.VariantValue = strings.TrimSpace(variantValue)
	variant.PriceAdjustment = decimal.NewFromFloat(priceAdjustment)
	variant.StockQuantity = stockQuantity
	variant.IsActive = isActive

	if err := uc.productRepo.UpdateVariant(variant); err != nil {
		return nil, fmt.Errorf("failed to update variant: %w", err)
	}

	return variant, nil
}

// RemoveVariant removes a variant from a product
func (uc *ProductService) RemoveVariant(variantID uuid.UUID) error {
	return uc.productRepo.RemoveVariant(variantID)
}

// ===== CATEGORY OPERATIONS =====

// CreateCategory creates a new category
func (uc *ProductService) CreateCategory(input CreateCategoryInput) (*models.Category, error) {
	// Validate parent exists if provided
	if input.ParentID != nil {
		_, err := uc.categoryRepo.GetByID(*input.ParentID)
		if err != nil {
			return nil, fmt.Errorf("invalid parent category: %w", err)
		}
	}

	category := &models.Category{
		Name:        strings.TrimSpace(input.Name),
		Description: strings.TrimSpace(input.Description),
		ParentID:    input.ParentID,
		ImageURL:    input.ImageURL,
		IsActive:    input.IsActive,
	}

	if err := uc.categoryRepo.Create(category); err != nil {
		return nil, fmt.Errorf("failed to create category: %w", err)
	}

	return category, nil
}

// GetCategory retrieves a category by ID
func (uc *ProductService) GetCategory(id uuid.UUID) (*models.Category, error) {
	return uc.categoryRepo.GetByID(id)
}

// GetCategoryBySlug retrieves a category by slug
func (uc *ProductService) GetCategoryBySlug(slug string) (*models.Category, error) {
	return uc.categoryRepo.GetBySlug(slug)
}

// ListCategories retrieves all categories
func (uc *ProductService) ListCategories() ([]models.Category, error) {
	return uc.categoryRepo.GetAll()
}

// GetRootCategories retrieves root categories
func (uc *ProductService) GetRootCategories() ([]models.Category, error) {
	return uc.categoryRepo.GetRootCategories()
}

// GetCategoryTree retrieves hierarchical category tree
func (uc *ProductService) GetCategoryTree() ([]repositories.CategoryTreeNode, error) {
	return uc.categoryRepo.GetCategoryTree()
}

// GetCategoryWithChildren retrieves a category with its children
func (uc *ProductService) GetCategoryWithChildren(id uuid.UUID) (*models.Category, []models.Category, error) {
	return uc.categoryRepo.GetWithChildren(id)
}

// UpdateCategory updates a category
func (uc *ProductService) UpdateCategory(id uuid.UUID, input UpdateCategoryInput) (*models.Category, error) {
	category, err := uc.categoryRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	if input.Name != nil {
		category.Name = strings.TrimSpace(*input.Name)
		// Regenerate slug
		category.Slug = models.GenerateSlug(category.Name)
		existingSlugs, _ := uc.categoryRepo.GetAllSlugs()
		var filteredSlugs []string
		for _, s := range existingSlugs {
			if s != category.Slug {
				filteredSlugs = append(filteredSlugs, s)
			}
		}
		category.Slug = models.GenerateUniqueSlug(category.Slug, filteredSlugs)
	}
	
	if input.Description != nil {
		category.Description = strings.TrimSpace(*input.Description)
	}
	
	if input.ParentID != nil {
		// Validate parent
		if *input.ParentID != uuid.Nil {
			_, err := uc.categoryRepo.GetByID(*input.ParentID)
			if err != nil {
				return nil, fmt.Errorf("invalid parent category: %w", err)
			}
		}
		category.ParentID = input.ParentID
	}
	
	if input.ImageURL != nil {
		category.ImageURL = *input.ImageURL
	}
	
	if input.IsActive != nil {
		category.IsActive = *input.IsActive
	}

	if err := uc.categoryRepo.Update(category); err != nil {
		return nil, fmt.Errorf("failed to update category: %w", err)
	}

	return category, nil
}

// DeleteCategory soft deletes a category
func (uc *ProductService) DeleteCategory(id uuid.UUID) error {
	// Check if category has products
	filter := repositories.ProductFilter{
		CategoryID: &id,
	}
	result, err := uc.productRepo.List(filter)
	if err != nil {
		return err
	}
	
	if result.Total > 0 {
		return fmt.Errorf("cannot delete category with %d products", result.Total)
	}
	
	return uc.categoryRepo.Delete(id)
}

