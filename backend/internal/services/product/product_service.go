package product

import (
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	"ecommerce-backend/pkg/storage"
	"encoding/json"
	"fmt"
	"log"
	"mime/multipart"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// ConflictError represents an optimistic lock version mismatch.
type ConflictError struct {
	Message string
}

func (e *ConflictError) Error() string {
	return e.Message
}

// ProductService handles product business logic
type ProductService struct {
	productRepo  *repositories.ProductRepository
	categoryRepo *repositories.CategoryRepository
	db           *gorm.DB
	imageSvc     *storage.ImageService
}

// NewProductService creates a new product service
func NewProductService(productRepo *repositories.ProductRepository, categoryRepo *repositories.CategoryRepository) *ProductService {
	return &ProductService{
		productRepo:  productRepo,
		categoryRepo: categoryRepo,
	}
}

// SetDB sets the database connection for image commit operations
func (uc *ProductService) SetDB(db *gorm.DB) {
	uc.db = db
}

// SetImageService sets the image service for image commit operations
func (uc *ProductService) SetImageService(imageSvc *storage.ImageService) {
	uc.imageSvc = imageSvc
}

// CreateProductInput represents product creation input
type CreateProductInput struct {
	Name             string                    `json:"name" binding:"required,min=2,max=255"`
	Description      string                    `json:"description"`
	ShortDescription string                    `json:"short_description"`
	RegularPrice     float64                   `json:"regular_price" binding:"required,min=0"`
	SalePrice        *float64                  `json:"sale_price"`
	SaleStartDate    *string                   `json:"sale_start_date"`
	SaleEndDate      *string                   `json:"sale_end_date"`
	StockQuantity    int                       `json:"stock_quantity" binding:"min=0"`
	CategoryID       *string                   `json:"category_id"`
	Brand            string                    `json:"brand"`
	SKU              string                    `json:"sku"`
	Status           string                    `json:"status"`
	MetaTitle        string                    `json:"meta_title"`
	MetaDescription  string                    `json:"meta_description"`
	CanonicalURL     string                    `json:"canonical_url"`
	OGImage          string                    `json:"og_image"`
	ImageURLs        []string                  `json:"image_urls"` // temp URLs from upload step
	VariantTypes     []VariantTypeInput        `json:"variant_types"`
	Combinations     []VariantCombinationInput `json:"combinations"`
	VariantImages    []VariantImageInput       `json:"variant_images"`
}

// UpdateProductInput represents product update input
type UpdateProductInput struct {
	Name             *string                    `json:"name,omitempty"`
	Description      *string                    `json:"description,omitempty"`
	ShortDescription *string                    `json:"short_description,omitempty"`
	RegularPrice     *float64                   `json:"regular_price,omitempty"`
	SalePrice        *float64                   `json:"sale_price,omitempty"`
	SaleStartDate    *string                    `json:"sale_start_date,omitempty"`
	SaleEndDate      *string                    `json:"sale_end_date,omitempty"`
	StockQuantity    *int                       `json:"stock_quantity,omitempty"`
	CategoryID       *string                    `json:"category_id,omitempty"`
	Brand            *string                    `json:"brand,omitempty"`
	SKU              *string                    `json:"sku,omitempty"`
	Status           *string                    `json:"status,omitempty"`
	MetaTitle        *string                    `json:"meta_title,omitempty"`
	MetaDescription  *string                    `json:"meta_description,omitempty"`
	CanonicalURL     *string                    `json:"canonical_url,omitempty"`
	OGImage          *string                    `json:"og_image,omitempty"`
	ImageURLs        []string                   `json:"image_urls,omitempty"`
	Version          int                        `json:"version" binding:"required"`
	VariantTypes     *[]VariantTypeInput        `json:"variant_types,omitempty"`
	Combinations     *[]VariantCombinationInput `json:"combinations,omitempty"`
	VariantImages    []VariantImageInput        `json:"variant_images,omitempty"`
}

// VariantTypeInput represents a variant dimension such as Color or Storage.
type VariantTypeInput struct {
	ID           string               `json:"id"`
	Name         string               `json:"name" binding:"required"`
	IsVisual     bool                 `json:"is_visual"`
	DisplayOrder int                  `json:"display_order"`
	Options      []VariantOptionInput `json:"options" binding:"required"`
}

// VariantOptionInput represents one selectable option under a variant type.
type VariantOptionInput struct {
	ID    string `json:"id"`
	Value string `json:"value" binding:"required"`
}

// UnmarshalJSON keeps the new option payload backward-compatible with older
// clients that still submit options as string arrays.
func (input *VariantOptionInput) UnmarshalJSON(data []byte) error {
	var rawValue string
	if err := json.Unmarshal(data, &rawValue); err == nil {
		input.Value = rawValue
		return nil
	}

	var rawObject struct {
		ID    string `json:"id"`
		Value string `json:"value"`
	}
	if err := json.Unmarshal(data, &rawObject); err != nil {
		return err
	}

	input.ID = rawObject.ID
	input.Value = rawObject.Value
	return nil
}

// VariantCombinationInput represents a purchasable variant option set.
type VariantCombinationInput struct {
	ID              string   `json:"id"`
	OptionValues    []string `json:"option_values"`
	PriceAdjustment float64  `json:"price_adjustment"`
	StockQuantity   int      `json:"stock_quantity" binding:"min=0"`
	SKU             string   `json:"sku"`
	IsActive        *bool    `json:"is_active"`
}

// VariantImageInput maps an uploaded image URL to a visual variant option value.
type VariantImageInput struct {
	OptionValue string `json:"option_value"`
	ImageURL    string `json:"image_url"`
}

type variantCombinationBuildResult struct {
	VariantTypes       []models.ProductVariantType
	Combinations       []models.ProductVariantCombination
	CombinationOptions []models.ProductCombinationOption
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
		MetaTitle:        strings.TrimSpace(input.MetaTitle),
		MetaDescription:  strings.TrimSpace(input.MetaDescription),
		CanonicalURL:     strings.TrimSpace(input.CanonicalURL),
		OGImage:          strings.TrimSpace(input.OGImage),
	}

	if input.SalePrice != nil {
		sp := decimal.NewFromFloat(*input.SalePrice)
		product.SalePrice = &sp
	}
	if input.SaleStartDate != nil {
		parsed, err := parseProductDate(*input.SaleStartDate)
		if err != nil {
			return nil, fmt.Errorf("invalid sale_start_date format")
		}
		product.SaleStartDate = parsed
	}
	if input.SaleEndDate != nil {
		parsed, err := parseProductDate(*input.SaleEndDate)
		if err != nil {
			return nil, fmt.Errorf("invalid sale_end_date format")
		}
		product.SaleEndDate = parsed
	}

	if err := uc.productRepo.Create(product); err != nil {
		return nil, fmt.Errorf("failed to create product: %w", err)
	}

	if len(input.VariantTypes) > 0 || len(input.Combinations) > 0 {
		variantData, err := buildVariantCombinationData(product.ID, input.VariantTypes, input.Combinations)
		if err != nil {
			return nil, err
		}
		if err := uc.productRepo.ReplaceVariantCombinationData(
			product.ID,
			variantData.VariantTypes,
			variantData.Combinations,
			variantData.CombinationOptions,
		); err != nil {
			return nil, fmt.Errorf("failed to save variant combinations: %w", err)
		}
	}

	uc.attachVariantImages(product.ID, input.VariantImages)

	uc.attachProductImages(product.ID, input.ImageURLs, 0)

	return uc.GetProduct(product.ID)
}

// GetProduct retrieves a product by ID
func (uc *ProductService) GetProduct(id uuid.UUID) (*models.Product, error) {
	product, err := uc.productRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	hydrateVariantCombinationResponse(product)
	return product, nil
}

// GetProductBySlug retrieves a product by slug
func (uc *ProductService) GetProductBySlug(slug string) (*models.Product, error) {
	product, err := uc.productRepo.GetBySlug(slug)
	if err != nil {
		return nil, err
	}
	hydrateVariantCombinationResponse(product)
	return product, nil
}

// ListProducts retrieves products with filters
func (uc *ProductService) ListProducts(filter repositories.ProductFilter) (*repositories.ProductListResult, error) {
	result, err := uc.productRepo.List(filter)
	if err != nil {
		return nil, err
	}
	hydrateProductList(result.Products)
	return result, nil
}

// UpdateProduct updates a product with optimistic locking.
// All mutations (product fields, variant tree, images) are wrapped in a
// single database transaction so that a failure in any step rolls back
// the version bump and leaves the DB in a consistent state.
func (uc *ProductService) UpdateProduct(id uuid.UUID, input UpdateProductInput) (*models.Product, error) {
	product, err := uc.productRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	// Check version for optimistic locking
	if product.Version != input.Version {
		return nil, &ConflictError{Message: "product was modified by another user (version mismatch)"}
	}

	// Apply updates to in-memory product
	if input.Name != nil {
		currentSlug := product.Slug
		product.Name = strings.TrimSpace(*input.Name)
		product.Slug = models.GenerateSlug(product.Name)
		existingSlugs, _ := uc.productRepo.GetAllSlugs()
		var filteredSlugs []string
		for _, s := range existingSlugs {
			if s != currentSlug {
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
	if input.SaleStartDate != nil {
		parsed, err := parseProductDate(*input.SaleStartDate)
		if err != nil {
			return nil, fmt.Errorf("invalid sale_start_date format")
		}
		product.SaleStartDate = parsed
	}
	if input.SaleEndDate != nil {
		parsed, err := parseProductDate(*input.SaleEndDate)
		if err != nil {
			return nil, fmt.Errorf("invalid sale_end_date format")
		}
		product.SaleEndDate = parsed
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

	if input.SKU != nil {
		product.SKU = strings.TrimSpace(*input.SKU)
	}

	if input.Status != nil {
		product.Status = *input.Status
	}

	if input.MetaTitle != nil {
		product.MetaTitle = strings.TrimSpace(*input.MetaTitle)
	}

	if input.MetaDescription != nil {
		product.MetaDescription = strings.TrimSpace(*input.MetaDescription)
	}

	if input.CanonicalURL != nil {
		product.CanonicalURL = strings.TrimSpace(*input.CanonicalURL)
	}

	if input.OGImage != nil {
		product.OGImage = strings.TrimSpace(*input.OGImage)
	}

	// Prepare variant data outside the transaction (no DB access needed)
	var variantData *variantCombinationBuildResult
	if input.VariantTypes != nil || input.Combinations != nil {
		var variantTypes []VariantTypeInput
		var combinations []VariantCombinationInput

		if input.VariantTypes != nil {
			variantTypes = *input.VariantTypes
		}
		if input.Combinations != nil {
			combinations = *input.Combinations
		}

		variantData, err = buildVariantCombinationData(id, variantTypes, combinations)
		if err != nil {
			return nil, err
		}
	}

	// ── Single atomic transaction: version bump + variant tree ──
	if err := uc.productRepo.RunInTransaction(func(tx *gorm.DB) error {
		// Optimistic lock update (bumps version inside tx)
		if err := uc.productRepo.UpdateWithOptimisticLockTx(tx, product); err != nil {
			return err
		}

		// Replace variant combination tree (if any)
		if variantData != nil {
			if err := uc.productRepo.ReplaceVariantCombinationDataTx(
				tx,
				id,
				variantData.VariantTypes,
				variantData.Combinations,
				variantData.CombinationOptions,
			); err != nil {
				return fmt.Errorf("failed to save variant combinations: %w", err)
			}
		}

		return nil
	}); err != nil {
		// If the transaction failed, product.Version was NOT actually bumped
		// in the DB (rolled back). Reset in-memory version to original.
		product.Version = input.Version
		return nil, err
	}

	// Image operations happen outside the transaction (SeaweedFS is not transactional).
	// These are idempotent and safe to retry.
	desiredVariantImageURLs := variantImageURLSet(input.VariantImages)
	oldVariantImageURLs := uc.productImageURLs(id, true)
	uc.attachVariantImages(id, input.VariantImages)
	uc.deleteUnusedImageObjects(oldVariantImageURLs, desiredVariantImageURLs)
	uc.syncProductImages(id, input.ImageURLs)

	return uc.GetProduct(id)
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
	products, err := uc.productRepo.SearchProducts(query, limit)
	if err != nil {
		return nil, err
	}
	hydrateProductList(products)
	return products, nil
}

// GetFeaturedProducts retrieves featured products
func (uc *ProductService) GetFeaturedProducts(limit int) ([]models.Product, error) {
	if limit <= 0 {
		limit = 10
	}
	products, err := uc.productRepo.GetFeaturedProducts(limit)
	if err != nil {
		return nil, err
	}
	hydrateProductList(products)
	return products, nil
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

	products, err := uc.productRepo.GetRelatedProducts(productID, catID, limit)
	if err != nil {
		return nil, err
	}
	hydrateProductList(products)
	return products, nil
}

// ===== IMAGE OPERATIONS =====

// AddProductImage adds an image to a product
func (uc *ProductService) AddProductImage(productID uuid.UUID, imageURL string, altText string, position int) (*models.ProductImage, error) {
	return uc.AddProductImageWithMetadata(productID, imageURL, altText, position, nil)
}

// AddProductImageWithMetadata adds an image to a product with optional server-derived metadata.
func (uc *ProductService) AddProductImageWithMetadata(productID uuid.UUID, imageURL string, altText string, position int, metadata *storage.ImageMetadata) (*models.ProductImage, error) {
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
	applyStorageImageMetadata(image, metadata)

	if err := uc.productRepo.AddImage(image); err != nil {
		return nil, fmt.Errorf("failed to add image: %w", err)
	}

	return image, nil
}

// RemoveProductImage removes an image from a product
func (uc *ProductService) RemoveProductImage(imageID uuid.UUID) error {
	image, err := uc.productRepo.GetImageByID(imageID)
	if err != nil {
		return err
	}
	if err := uc.productRepo.RemoveImage(imageID); err != nil {
		return err
	}
	uc.deleteImageObject(image.ImageURL)
	return nil
}

// RemoveUploadedImage removes either a committed product image or an abandoned
// temp upload by URL, then removes the object from SeaweedFS when applicable.
func (uc *ProductService) RemoveUploadedImage(imageURL string) error {
	imageURL = strings.TrimSpace(imageURL)
	if imageURL == "" {
		return fmt.Errorf("image_url is required")
	}

	if image, err := uc.productRepo.GetImageByURL(imageURL); err == nil {
		if err := uc.productRepo.RemoveImage(image.ID); err != nil {
			return err
		}
		uc.deleteImageObject(image.ImageURL)
		return nil
	} else if err != gorm.ErrRecordNotFound {
		return err
	}

	if uc.db != nil {
		if err := uc.db.Delete(&models.TempUpload{}, "image_url = ?", imageURL).Error; err != nil {
			return err
		}
	}
	uc.deleteImageObject(imageURL)
	return nil
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

// Set filter.IncludeDeleted = true untuk menyertakan produk soft-deleted.
func (s *ProductService) AdminListProducts(filter repositories.AdminProductFilter) (*repositories.ProductListResult, error) {
	result, err := s.productRepo.AdminList(filter)
	if err != nil {
		return nil, err
	}
	hydrateProductList(result.Products)
	return result, nil
}

// serta field audit: Version, CreatedAt, UpdatedAt, DeletedAt.
func (s *ProductService) AdminGetProduct(id uuid.UUID) (*models.Product, error) {
	product, err := s.productRepo.AdminGetByID(id)
	if err != nil {
		return nil, err
	}
	hydrateVariantCombinationResponse(product)
	return product, nil
}

func buildVariantCombinationData(
	productID uuid.UUID,
	variantInputs []VariantTypeInput,
	combinationInputs []VariantCombinationInput,
) (*variantCombinationBuildResult, error) {
	if len(variantInputs) == 0 {
		if len(combinationInputs) > 0 {
			return nil, fmt.Errorf("variant_types are required when combinations are provided")
		}
		return &variantCombinationBuildResult{}, nil
	}

	result := &variantCombinationBuildResult{}
	optionByValue := make(map[string]models.ProductVariantOption)

	for typeIndex, input := range variantInputs {
		name := strings.TrimSpace(input.Name)
		if name == "" {
			return nil, fmt.Errorf("variant type name is required")
		}
		if len(input.Options) == 0 {
			return nil, fmt.Errorf("variant type %s must have at least one option", name)
		}

		displayOrder := input.DisplayOrder
		if displayOrder == 0 {
			displayOrder = typeIndex
		}

		variantTypeID := parseClientUUID(input.ID)
		if variantTypeID == uuid.Nil {
			variantTypeID = uuid.New()
		}

		variantType := models.ProductVariantType{
			ID:           variantTypeID,
			ProductID:    productID,
			Name:         name,
			IsVisual:     input.IsVisual,
			DisplayOrder: displayOrder,
		}

		seenOptionInType := make(map[string]bool)
		for optionIndex, optionValue := range input.Options {
			value := strings.TrimSpace(optionValue.Value)
			if value == "" {
				return nil, fmt.Errorf("variant type %s contains an empty option", name)
			}

			optionKey := strings.ToLower(value)
			if seenOptionInType[optionKey] {
				return nil, fmt.Errorf("duplicate option %s in variant type %s", value, name)
			}
			if _, exists := optionByValue[optionKey]; exists {
				return nil, fmt.Errorf("duplicate option value %s across variant types is ambiguous", value)
			}

			optionID := parseClientUUID(optionValue.ID)
			if optionID == uuid.Nil {
				optionID = uuid.New()
			}

			option := models.ProductVariantOption{
				ID:            optionID,
				VariantTypeID: variantType.ID,
				Value:         value,
				DisplayOrder:  optionIndex,
			}
			variantType.Options = append(variantType.Options, option)
			optionByValue[optionKey] = option
			seenOptionInType[optionKey] = true
		}

		result.VariantTypes = append(result.VariantTypes, variantType)
	}

	for _, input := range combinationInputs {
		if len(input.OptionValues) == 0 {
			return nil, fmt.Errorf("combination option_values are required")
		}

		combinationID := parseClientUUID(input.ID)
		if combinationID == uuid.Nil {
			combinationID = uuid.New()
		}
		isActive := true
		if input.IsActive != nil {
			isActive = *input.IsActive
		}

		combination := models.ProductVariantCombination{
			ID:              combinationID,
			ProductID:       productID,
			PriceAdjustment: decimal.NewFromFloat(input.PriceAdjustment),
			StockQuantity:   input.StockQuantity,
			SKU:             strings.TrimSpace(input.SKU),
			IsActive:        isActive,
		}

		seenOptions := make(map[uuid.UUID]bool)
		for _, optionValue := range input.OptionValues {
			option, exists := optionByValue[strings.ToLower(strings.TrimSpace(optionValue))]
			if !exists {
				return nil, fmt.Errorf("combination references unknown option value %s", optionValue)
			}
			if seenOptions[option.ID] {
				return nil, fmt.Errorf("combination contains duplicate option value %s", optionValue)
			}

			result.CombinationOptions = append(result.CombinationOptions, models.ProductCombinationOption{
				CombinationID: combinationID,
				OptionID:      option.ID,
			})
			combination.OptionIDs = append(combination.OptionIDs, option.ID)
			seenOptions[option.ID] = true
		}

		result.Combinations = append(result.Combinations, combination)
	}

	return result, nil
}

func parseProductDate(value string) (*time.Time, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil, nil
	}

	if parsed, err := time.Parse(time.RFC3339, trimmed); err == nil {
		return &parsed, nil
	}

	layouts := []string{"2006-01-02T15:04", "2006-01-02"}
	var lastErr error
	for _, layout := range layouts {
		parsed, err := time.ParseInLocation(layout, trimmed, time.Local)
		if err == nil {
			return &parsed, nil
		}
		lastErr = err
	}
	return nil, lastErr
}

func parseClientUUID(value string) uuid.UUID {
	id, err := uuid.Parse(strings.TrimSpace(value))
	if err != nil {
		return uuid.Nil
	}
	return id
}

func (uc *ProductService) attachVariantImages(productID uuid.UUID, variantImages []VariantImageInput) {
	if len(variantImages) == 0 {
		return
	}

	product, err := uc.productRepo.GetByID(productID)
	if err != nil {
		log.Printf("warning: failed to load product variant options for image mapping %s: %v", productID, err)
		return
	}

	optionIDByValue := make(map[string]uuid.UUID)
	for _, variantType := range product.VariantTypes {
		for _, option := range variantType.Options {
			optionIDByValue[strings.ToLower(strings.TrimSpace(option.Value))] = option.ID
		}
	}

	for index, variantImage := range variantImages {
		optionValue := strings.TrimSpace(variantImage.OptionValue)
		imageURL := strings.TrimSpace(variantImage.ImageURL)
		if optionValue == "" || imageURL == "" {
			continue
		}

		optionID, exists := optionIDByValue[strings.ToLower(optionValue)]
		if !exists {
			log.Printf("warning: variant image option %q not found for product %s", optionValue, productID)
			continue
		}

		if uc.productImageExists(productID, &optionID, imageURL) {
			uc.commitTempImage(imageURL)
			continue
		}

		productImage := &models.ProductImage{
			ProductID:    productID,
			ImageURL:     imageURL,
			OptionID:     &optionID,
			DisplayOrder: 1000 + index,
		}
		uc.applyTempImageMetadata(productImage)
		if err := uc.productRepo.AddImage(productImage); err != nil {
			log.Printf("warning: failed to add variant image %s: %v", imageURL, err)
			continue
		}
		uc.commitTempImage(imageURL)
	}
}

func (uc *ProductService) attachProductImages(productID uuid.UUID, imageURLs []string, displayOrderOffset int) {
	if len(imageURLs) == 0 {
		return
	}

	seen := make(map[string]bool)
	displayOrder := displayOrderOffset
	for _, rawURL := range imageURLs {
		imageURL := strings.TrimSpace(rawURL)
		if imageURL == "" {
			continue
		}
		if seen[imageURL] {
			continue
		}
		seen[imageURL] = true

		if uc.productImageExists(productID, nil, imageURL) {
			uc.commitTempImage(imageURL)
			continue
		}

		productImage := &models.ProductImage{
			ProductID:    productID,
			ImageURL:     imageURL,
			DisplayOrder: displayOrder,
		}
		uc.applyTempImageMetadata(productImage)
		if err := uc.productRepo.AddImage(productImage); err != nil {
			log.Printf("warning: failed to add product image %s: %v", imageURL, err)
			continue
		}
		uc.commitTempImage(imageURL)
		displayOrder++
	}
}

func (uc *ProductService) syncProductImages(productID uuid.UUID, imageURLs []string) {
	desiredURLs := stringSet(imageURLs)
	oldURLs := uc.productImageURLs(productID, false)

	if uc.db != nil {
		for imageURL := range oldURLs {
			if desiredURLs[imageURL] {
				continue
			}
			if err := uc.db.Delete(&models.ProductImage{}, "product_id = ? AND option_id IS NULL AND image_url = ?", productID, imageURL).Error; err != nil {
				log.Printf("warning: failed to remove product image %s: %v", imageURL, err)
				continue
			}
			uc.deleteImageObject(imageURL)
		}
	}

	uc.attachProductImages(productID, imageURLs, len(desiredURLs))
}

func (uc *ProductService) productImageURLs(productID uuid.UUID, variantOnly bool) map[string]bool {
	urls := make(map[string]bool)
	if uc.db == nil {
		return urls
	}

	query := uc.db.Model(&models.ProductImage{}).
		Where("product_id = ?", productID)
	if variantOnly {
		query = query.Where("option_id IS NOT NULL")
	} else {
		query = query.Where("option_id IS NULL")
	}

	var images []models.ProductImage
	if err := query.Find(&images).Error; err != nil {
		log.Printf("warning: failed to load product image URLs for cleanup %s: %v", productID, err)
		return urls
	}

	for _, image := range images {
		imageURL := strings.TrimSpace(image.ImageURL)
		if imageURL != "" {
			urls[imageURL] = true
		}
	}
	return urls
}

func variantImageURLSet(variantImages []VariantImageInput) map[string]bool {
	urls := make(map[string]bool)
	for _, image := range variantImages {
		imageURL := strings.TrimSpace(image.ImageURL)
		if imageURL != "" {
			urls[imageURL] = true
		}
	}
	return urls
}

func stringSet(values []string) map[string]bool {
	result := make(map[string]bool)
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			result[trimmed] = true
		}
	}
	return result
}

func (uc *ProductService) deleteUnusedImageObjects(existingURLs, desiredURLs map[string]bool) {
	for imageURL := range existingURLs {
		if desiredURLs[imageURL] {
			continue
		}
		uc.deleteImageObject(imageURL)
	}
}

func (uc *ProductService) deleteImageObject(imageURL string) {
	if uc.imageSvc == nil {
		return
	}
	if uc.imageURLStillReferenced(imageURL) {
		return
	}
	if err := uc.imageSvc.DeleteFromSeaweedFS(imageURL); err != nil {
		log.Printf("warning: failed to delete image object %s: %v", imageURL, err)
	}
}

func (uc *ProductService) imageURLStillReferenced(imageURL string) bool {
	if uc.db == nil {
		return false
	}

	var productImageCount int64
	if err := uc.db.Model(&models.ProductImage{}).Where("image_url = ?", imageURL).Count(&productImageCount).Error; err != nil {
		log.Printf("warning: failed to check product image references %s: %v", imageURL, err)
		return true
	}
	if productImageCount > 0 {
		return true
	}

	var tempUploadCount int64
	if err := uc.db.Model(&models.TempUpload{}).Where("image_url = ?", imageURL).Count(&tempUploadCount).Error; err != nil {
		log.Printf("warning: failed to check temp upload references %s: %v", imageURL, err)
		return true
	}
	return tempUploadCount > 0
}

func (uc *ProductService) applyTempImageMetadata(image *models.ProductImage) {
	if uc.db == nil || image == nil || strings.TrimSpace(image.ImageURL) == "" {
		return
	}

	var tempUpload models.TempUpload
	if err := uc.db.Where("image_url = ?", image.ImageURL).First(&tempUpload).Error; err != nil {
		if err != gorm.ErrRecordNotFound {
			log.Printf("warning: failed to load temp image metadata %s: %v", image.ImageURL, err)
		}
		return
	}

	image.Width = tempUpload.Width
	image.Height = tempUpload.Height
	image.AspectRatio = tempUpload.AspectRatio
}

func applyStorageImageMetadata(image *models.ProductImage, metadata *storage.ImageMetadata) {
	if image == nil || metadata == nil {
		return
	}
	if metadata.Width > 0 {
		width := metadata.Width
		image.Width = &width
	}
	if metadata.Height > 0 {
		height := metadata.Height
		image.Height = &height
	}
	if metadata.AspectRatio > 0 {
		aspectRatio := metadata.AspectRatio
		image.AspectRatio = &aspectRatio
	}
}

func (uc *ProductService) commitTempImage(imageURL string) {
	if uc.db == nil || uc.imageSvc == nil {
		return
	}
	if err := uc.imageSvc.CommitImage(uc.db, imageURL); err != nil {
		log.Printf("warning: commit temp image failed %s: %v", imageURL, err)
	}
}

func (uc *ProductService) productImageExists(productID uuid.UUID, optionID *uuid.UUID, imageURL string) bool {
	if uc.db == nil {
		return false
	}

	query := uc.db.Model(&models.ProductImage{}).
		Where("product_id = ? AND image_url = ?", productID, imageURL)
	if optionID == nil {
		query = query.Where("option_id IS NULL")
	} else {
		query = query.Where("option_id = ?", *optionID)
	}

	var existing int64
	if err := query.Count(&existing).Error; err != nil {
		log.Printf("warning: failed to check duplicate product image %s: %v", imageURL, err)
		return false
	}
	return existing > 0
}

func hydrateProductList(products []models.Product) {
	for i := range products {
		hydrateVariantCombinationResponse(&products[i])
	}
}

func hydrateVariantCombinationResponse(product *models.Product) {
	if product == nil {
		return
	}

	product.EffectivePrice = product.GetCurrentPrice()

	for i := range product.Combinations {
		optionIDs := make([]uuid.UUID, 0, len(product.Combinations[i].Options))
		for _, option := range product.Combinations[i].Options {
			optionIDs = append(optionIDs, option.ID)
		}
		product.Combinations[i].OptionIDs = optionIDs
	}

}
