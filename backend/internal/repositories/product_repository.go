package repositories

import (
	"ecommerce-backend/internal/models"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

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

// RunInTransaction executes fn inside a database transaction.
// If fn returns an error the transaction is rolled back.
func (r *ProductRepository) RunInTransaction(fn func(tx *gorm.DB) error) error {
	return r.db.Transaction(fn)
}

func withProductDetailPreloads(query *gorm.DB) *gorm.DB {
	return query.
		Preload("Category").
		Preload("Images", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC")
		}).
		Preload("VariantTypes", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC, name ASC")
		}).
		Preload("VariantTypes.Options", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC, value ASC")
		}).
		Preload("Combinations", func(db *gorm.DB) *gorm.DB {
			return db.Order("sku ASC")
		}).
		Preload("Combinations.Options", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC, value ASC")
		}).
		Preload("Combinations.Options.VariantType", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC, name ASC")
		})
}

func preloadProductImages(db *gorm.DB) *gorm.DB {
	return db.Order("display_order ASC")
}

// ProductFilter contains filter options for product queries
type ProductFilter struct {
	CategoryID  *uuid.UUID
	MinPrice    *float64
	MaxPrice    *float64
	Search      string
	Status      string // active, inactive, draft
	StockStatus string // in_stock, low_stock, out_of_stock
	InStock     *bool
	Brand       string
	SortBy      string // name, regular_price, created_at
	SortOrder   string // asc, desc
	Page        int
	Limit       int
	Cursor      string
}

// ProductListResult contains paginated product results
type ProductListResult struct {
	Products   []models.Product `json:"products"`
	Total      int64            `json:"total"`
	Page       int              `json:"page"`
	Limit      int              `json:"limit"`
	TotalPages int              `json:"total_pages"`
	NextCursor string           `json:"next_cursor,omitempty"`
	HasNext    bool             `json:"has_next"`
}

type productListCursor struct {
	SortBy    string `json:"sort_by"`
	SortOrder string `json:"sort_order"`
	SortValue string `json:"sort_value"`
	ID        string `json:"id"`
}

// Create creates a new product with unique slug generation
func (r *ProductRepository) Create(product *models.Product) error {
	return r.createOn(r.db, product)
}

// CreateTx creates a new product inside an existing transaction.
func (r *ProductRepository) CreateTx(tx *gorm.DB, product *models.Product) error {
	return r.createOn(tx, product)
}

func (r *ProductRepository) createOn(db *gorm.DB, product *models.Product) error {
	// Generate unique slug
	if product.Slug == "" {
		product.Slug = models.GenerateSlug(product.Name)
	}

	// Check for slug conflict and generate unique
	existingSlugs, err := r.getAllSlugsOn(db)
	if err != nil {
		return fmt.Errorf("failed to check existing slugs: %w", err)
	}
	baseSlug := product.Slug
	product.Slug = models.GenerateUniqueSlug(baseSlug, existingSlugs)

	for attempt := 0; attempt < 3; attempt++ {
		err := db.Create(product).Error
		if err == nil {
			return nil
		}
		if !isProductSlugUniqueViolation(err) {
			return err
		}

		existingSlugs, slugErr := r.getAllSlugsOn(db)
		if slugErr != nil {
			return fmt.Errorf("failed to recover from slug conflict: %w", slugErr)
		}
		product.Slug = models.GenerateUniqueSlug(baseSlug, existingSlugs)
	}

	return fmt.Errorf("failed to create product with unique slug after retries")
}

// GetByID retrieves a product by ID with related data
func (r *ProductRepository) GetByID(id uuid.UUID) (*models.Product, error) {
	var product models.Product
	err := withProductDetailPreloads(r.db).First(&product, "id = ?", id).Error

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
	err := withProductDetailPreloads(r.db).First(&product, "slug = ?", slug).Error

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

	query = query.Order(fmt.Sprintf("%s %s, id %s", sortColumn, sortOrder, sortOrder))

	if filter.Cursor != "" {
		var err error
		query, err = applyProductCursor(query, filter.Cursor, sortColumn, sortOrder)
		if err != nil {
			return nil, err
		}
	} else {
		offset := (filter.Page - 1) * filter.Limit
		query = query.Offset(offset)
	}
	query = query.Limit(filter.Limit + 1)

	// Execute query with preloads
	var products []models.Product
	err := query.Preload("Category").
		Preload("Images", preloadProductImages).
		Preload("Combinations", func(db *gorm.DB) *gorm.DB {
			return db.Order("price_adjustment ASC")
		}).
		Find(&products).Error

	if err != nil {
		return nil, err
	}

	hasNext := len(products) > filter.Limit
	if hasNext {
		products = products[:filter.Limit]
	}

	totalPages := int(total) / filter.Limit
	if int(total)%filter.Limit > 0 {
		totalPages++
	}

	nextCursor := ""
	if hasNext && len(products) > 0 {
		nextCursor = encodeProductCursor(products[len(products)-1], sortColumn, sortOrder)
	}

	return &ProductListResult{
		Products:   products,
		Total:      total,
		Page:       filter.Page,
		Limit:      filter.Limit,
		TotalPages: totalPages,
		NextCursor: nextCursor,
		HasNext:    hasNext,
	}, nil
}

func applyProductCursor(query *gorm.DB, rawCursor string, sortColumn string, sortOrder string) (*gorm.DB, error) {
	cursor, err := decodeProductCursor(rawCursor)
	if err != nil {
		return nil, err
	}
	if cursor.SortBy != sortColumn || cursor.SortOrder != sortOrder {
		return nil, fmt.Errorf("cursor does not match current sort")
	}

	cursorID, err := uuid.Parse(cursor.ID)
	if err != nil {
		return nil, fmt.Errorf("invalid cursor id")
	}

	operator := ">"
	if sortOrder == "DESC" {
		operator = "<"
	}

	switch sortColumn {
	case "created_at", "updated_at":
		value, parseErr := time.Parse(time.RFC3339Nano, cursor.SortValue)
		if parseErr != nil {
			return nil, fmt.Errorf("invalid cursor timestamp")
		}
		return query.Where(
			fmt.Sprintf("(%s %s ? OR (%s = ? AND id %s ?))", sortColumn, operator, sortColumn, operator),
			value,
			value,
			cursorID,
		), nil
	case "stock_quantity", "sold_count":
		value, parseErr := strconv.Atoi(cursor.SortValue)
		if parseErr != nil {
			return nil, fmt.Errorf("invalid cursor number")
		}
		return query.Where(
			fmt.Sprintf("(%s %s ? OR (%s = ? AND id %s ?))", sortColumn, operator, sortColumn, operator),
			value,
			value,
			cursorID,
		), nil
	case "name", "regular_price":
		return query.Where(
			fmt.Sprintf("(%s %s ? OR (%s = ? AND id %s ?))", sortColumn, operator, sortColumn, operator),
			cursor.SortValue,
			cursor.SortValue,
			cursorID,
		), nil
	default:
		return nil, fmt.Errorf("unsupported cursor sort")
	}
}

func decodeProductCursor(rawCursor string) (*productListCursor, error) {
	decoded, err := base64.RawURLEncoding.DecodeString(rawCursor)
	if err != nil {
		return nil, fmt.Errorf("invalid cursor")
	}

	var cursor productListCursor
	if err := json.Unmarshal(decoded, &cursor); err != nil {
		return nil, fmt.Errorf("invalid cursor")
	}
	if cursor.SortBy == "" || cursor.SortOrder == "" || cursor.SortValue == "" || cursor.ID == "" {
		return nil, fmt.Errorf("invalid cursor")
	}
	return &cursor, nil
}

func encodeProductCursor(product models.Product, sortColumn string, sortOrder string) string {
	cursor := productListCursor{
		SortBy:    sortColumn,
		SortOrder: sortOrder,
		SortValue: productCursorSortValue(product, sortColumn),
		ID:        product.ID.String(),
	}
	encoded, err := json.Marshal(cursor)
	if err != nil {
		return ""
	}
	return base64.RawURLEncoding.EncodeToString(encoded)
}

func productCursorSortValue(product models.Product, sortColumn string) string {
	switch sortColumn {
	case "name":
		return product.Name
	case "regular_price":
		return product.RegularPrice.String()
	case "stock_quantity":
		return strconv.Itoa(product.StockQuantity)
	case "sold_count":
		return strconv.Itoa(product.SoldCount)
	case "updated_at":
		return product.UpdatedAt.Format(time.RFC3339Nano)
	case "created_at":
		return product.CreatedAt.Format(time.RFC3339Nano)
	default:
		return product.CreatedAt.Format(time.RFC3339Nano)
	}
}

// Update updates a product
func (r *ProductRepository) Update(product *models.Product) error {
	return r.db.Save(product).Error
}

// UpdateWithOptimisticLock updates a product with optimistic locking
func (r *ProductRepository) UpdateWithOptimisticLock(product *models.Product) error {
	return r.updateWithOptimisticLockOn(r.db, product)
}

// UpdateWithOptimisticLockTx updates a product with optimistic locking inside an existing transaction.
func (r *ProductRepository) UpdateWithOptimisticLockTx(tx *gorm.DB, product *models.Product) error {
	return r.updateWithOptimisticLockOn(tx, product)
}

func (r *ProductRepository) updateWithOptimisticLockOn(db *gorm.DB, product *models.Product) error {
	var categoryID interface{}
	if product.CategoryID != nil {
		categoryID = product.CategoryID.String()
	}

	result := db.Model(&models.Product{}).
		Where("id = ? AND version = ?", product.ID, product.Version).
		Updates(map[string]interface{}{
			"name":              product.Name,
			"slug":              product.Slug,
			"description":       product.Description,
			"short_description": product.ShortDescription,
			"regular_price":     product.RegularPrice,
			"sale_price":        product.SalePrice,
			"sale_start_date":   product.SaleStartDate,
			"sale_end_date":     product.SaleEndDate,
			"stock_quantity":    product.StockQuantity,
			"category_id":       categoryID,
			"brand":             product.Brand,
			"sku":               product.SKU,
			"status":            product.Status,
			"meta_title":        product.MetaTitle,
			"meta_description":  product.MetaDescription,
			"canonical_url":     product.CanonicalURL,
			"og_image":          product.OGImage,
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

// DeductCombinationStockWithLockTx deducts stock from a variant combination inside a transaction.
func (r *ProductRepository) DeductCombinationStockWithLockTx(tx *gorm.DB, id uuid.UUID, quantity int) error {
	var combination models.ProductVariantCombination

	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		First(&combination, "id = ?", id).Error
	if err != nil {
		return err
	}

	if !combination.IsActive {
		return fmt.Errorf("combination is not available")
	}

	if combination.StockQuantity < quantity {
		return fmt.Errorf("insufficient combination stock: requested %d, available %d", quantity, combination.StockQuantity)
	}

	return tx.Model(&combination).
		Update("stock_quantity", gorm.Expr("stock_quantity - ?", quantity)).Error
}

// RestoreStockTx returns reserved product stock inside an existing transaction.
func (r *ProductRepository) RestoreStockTx(tx *gorm.DB, id uuid.UUID, quantity int) error {
	return tx.Model(&models.Product{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"stock_quantity": gorm.Expr("stock_quantity + ?", quantity),
		}).Error
}

// RestoreCombinationStockTx returns reserved combination stock inside an existing transaction.
func (r *ProductRepository) RestoreCombinationStockTx(tx *gorm.DB, id uuid.UUID, quantity int) error {
	return tx.Model(&models.ProductVariantCombination{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"stock_quantity": gorm.Expr("stock_quantity + ?", quantity),
		}).Error
}

// Delete soft deletes a product
func (r *ProductRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.Product{}, "id = ?", id).Error
}

// GetAllSlugs retrieves all product slugs
func (r *ProductRepository) GetAllSlugs() ([]string, error) {
	return r.getAllSlugsOn(r.db)
}

func (r *ProductRepository) getAllSlugsOn(db *gorm.DB) ([]string, error) {
	var slugs []string
	err := db.Unscoped().Model(&models.Product{}).Pluck("slug", &slugs).Error
	return slugs, err
}

// SlugExists checks if a slug already exists
func (r *ProductRepository) SlugExists(slug string) (bool, error) {
	var count int64
	err := r.db.Unscoped().Model(&models.Product{}).Where("slug = ?", slug).Count(&count).Error
	return count > 0, err
}

func isProductSlugUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	message := err.Error()
	return strings.Contains(message, "products_slug_key") ||
		strings.Contains(message, "duplicate key value violates unique constraint")
}

// GetByCategory retrieves products by category ID
func (r *ProductRepository) GetByCategory(categoryID uuid.UUID, limit int) ([]models.Product, error) {
	var products []models.Product
	query := r.db.Where("category_id = ? AND status = ?", categoryID, "active").
		Preload("Images", preloadProductImages).
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

// GetImageByID retrieves a product image by ID.
func (r *ProductRepository) GetImageByID(imageID uuid.UUID) (*models.ProductImage, error) {
	var image models.ProductImage
	if err := r.db.First(&image, "id = ?", imageID).Error; err != nil {
		return nil, err
	}
	return &image, nil
}

// GetImageByURL retrieves a product image by its public image URL.
func (r *ProductRepository) GetImageByURL(imageURL string) (*models.ProductImage, error) {
	var image models.ProductImage
	if err := r.db.First(&image, "image_url = ?", imageURL).Error; err != nil {
		return nil, err
	}
	return &image, nil
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

// GetCombination retrieves a purchasable variant combination by ID.
func (r *ProductRepository) GetCombination(combinationID uuid.UUID) (*models.ProductVariantCombination, error) {
	var combination models.ProductVariantCombination
	err := r.db.
		Preload("Options", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC, value ASC")
		}).
		Preload("Options.VariantType", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC, name ASC")
		}).
		First(&combination, "id = ?", combinationID).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("combination not found")
		}
		return nil, err
	}
	return &combination, nil
}

// ReplaceVariantCombinationData replaces a product's new variant-combination tree.
func (r *ProductRepository) ReplaceVariantCombinationData(
	productID uuid.UUID,
	variantTypes []models.ProductVariantType,
	combinations []models.ProductVariantCombination,
	combinationOptions []models.ProductCombinationOption,
) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		return r.replaceVariantCombinationDataOn(tx, productID, variantTypes, combinations, combinationOptions)
	})
}

// ReplaceVariantCombinationDataTx runs inside an existing transaction.
func (r *ProductRepository) ReplaceVariantCombinationDataTx(
	tx *gorm.DB,
	productID uuid.UUID,
	variantTypes []models.ProductVariantType,
	combinations []models.ProductVariantCombination,
	combinationOptions []models.ProductCombinationOption,
) error {
	return r.replaceVariantCombinationDataOn(tx, productID, variantTypes, combinations, combinationOptions)
}

func (r *ProductRepository) replaceVariantCombinationDataOn(
	tx *gorm.DB,
	productID uuid.UUID,
	variantTypes []models.ProductVariantType,
	combinations []models.ProductVariantCombination,
	combinationOptions []models.ProductCombinationOption,
) error {
	desiredTypeIDs := make([]uuid.UUID, 0, len(variantTypes))
	desiredOptionIDs := make([]uuid.UUID, 0)
	desiredCombinationIDs := make([]uuid.UUID, 0, len(combinations))

	for _, variantType := range variantTypes {
		desiredTypeIDs = append(desiredTypeIDs, variantType.ID)
		for _, option := range variantType.Options {
			desiredOptionIDs = append(desiredOptionIDs, option.ID)
		}
	}
	for _, combination := range combinations {
		desiredCombinationIDs = append(desiredCombinationIDs, combination.ID)
	}

	// ── Step 1: Delete variant images ──
	if err := tx.
		Where("product_id = ? AND option_id IS NOT NULL", productID).
		Delete(&models.ProductImage{}).Error; err != nil {
		return err
	}

	// ── Step 2: Upsert variant types and options ──
	for i := range variantTypes {
		variantType := variantTypes[i]
		options := variantType.Options
		variantType.Options = nil

		if err := tx.Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"product_id",
				"name",
				"is_visual",
				"display_order",
				"updated_at",
			}),
		}).Create(&variantType).Error; err != nil {
			return err
		}

		for j := range options {
			options[j].VariantTypeID = variantType.ID
			if err := tx.Clauses(clause.OnConflict{
				Columns: []clause.Column{{Name: "id"}},
				DoUpdates: clause.AssignmentColumns([]string{
					"variant_type_id",
					"value",
					"display_order",
					"updated_at",
				}),
			}).Create(&options[j]).Error; err != nil {
				return err
			}
		}
	}

	// ── Step 3: Deactivate/delete stale combinations BEFORE upserting ──
	// This prevents SKU unique constraint violations when a stale disabled
	// combination has the same SKU as a new/updated combination.
	if err := deactivateOrDeleteStaleCombinations(tx, productID, desiredCombinationIDs); err != nil {
		return err
	}

	// ── Step 4: Upsert desired combinations (now safe, stale SKUs removed) ──
	for i := range combinations {
		combination := combinations[i]
		combination.Options = nil
		combination.OptionIDs = nil

		combinationValues := map[string]interface{}{
			"id":               combination.ID,
			"product_id":       combination.ProductID,
			"price_adjustment": combination.PriceAdjustment,
			"stock_quantity":   combination.StockQuantity,
			"sku":              combination.SKU,
			"is_active":        combination.IsActive,
		}

		if err := tx.Model(&models.ProductVariantCombination{}).Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"product_id",
				"price_adjustment",
				"stock_quantity",
				"sku",
				"is_active",
				"updated_at",
			}),
		}).Create(combinationValues).Error; err != nil {
			return err
		}
	}

	// ── Step 5: Rebuild combination-option mappings ──
	if len(desiredCombinationIDs) > 0 {
		if err := tx.
			Where("combination_id IN ?", desiredCombinationIDs).
			Delete(&models.ProductCombinationOption{}).Error; err != nil {
			return err
		}
	}

	if len(combinationOptions) > 0 {
		if err := tx.Create(&combinationOptions).Error; err != nil {
			return err
		}
	}

	// ── Step 6: Cleanup unused options and types ──
	if err := deleteUnusedVariantOptions(tx, productID, desiredOptionIDs); err != nil {
		return err
	}

	if err := deleteUnusedVariantTypes(tx, productID, desiredTypeIDs); err != nil {
		return err
	}

	return nil
}

func deactivateOrDeleteStaleCombinations(tx *gorm.DB, productID uuid.UUID, desiredIDs []uuid.UUID) error {
	staleQuery := tx.Model(&models.ProductVariantCombination{}).Where("product_id = ?", productID)
	if len(desiredIDs) > 0 {
		staleQuery = staleQuery.Where("id NOT IN ?", desiredIDs)
	}

	var staleIDs []uuid.UUID
	if err := staleQuery.Pluck("id", &staleIDs).Error; err != nil {
		return err
	}
	if len(staleIDs) == 0 {
		return nil
	}

	var referencedIDs []uuid.UUID
	if err := tx.Raw(`
		SELECT DISTINCT combination_id
		FROM (
			SELECT combination_id FROM cart_items WHERE combination_id IN ?
			UNION
			SELECT combination_id FROM order_items WHERE combination_id IN ?
			UNION
			SELECT combination_id FROM stock_alerts WHERE combination_id IN ?
		) refs
		WHERE combination_id IS NOT NULL
	`, staleIDs, staleIDs, staleIDs).Scan(&referencedIDs).Error; err != nil {
		return err
	}

	referenced := make(map[uuid.UUID]bool, len(referencedIDs))
	for _, id := range referencedIDs {
		referenced[id] = true
	}

	var deletableIDs []uuid.UUID
	var deactivatedIDs []uuid.UUID
	for _, id := range staleIDs {
		if referenced[id] {
			deactivatedIDs = append(deactivatedIDs, id)
			continue
		}
		deletableIDs = append(deletableIDs, id)
	}

	if len(deactivatedIDs) > 0 {
		if err := tx.Model(&models.ProductVariantCombination{}).
			Where("id IN ?", deactivatedIDs).
			Updates(map[string]interface{}{
				"is_active":      false,
				"stock_quantity": 0,
			}).Error; err != nil {
			return err
		}
	}

	if len(deletableIDs) > 0 {
		if err := tx.Where("id IN ?", deletableIDs).Delete(&models.ProductVariantCombination{}).Error; err != nil {
			return err
		}
	}

	return nil
}

func deleteUnusedVariantOptions(tx *gorm.DB, productID uuid.UUID, desiredIDs []uuid.UUID) error {
	query := tx.Where(
		`variant_type_id IN (SELECT id FROM product_variant_types WHERE product_id = ?)
		AND NOT EXISTS (
			SELECT 1 FROM product_combination_options
			WHERE product_combination_options.option_id = product_variant_options.id
		)
		AND NOT EXISTS (
			SELECT 1 FROM product_images
			WHERE product_images.option_id = product_variant_options.id
		)`,
		productID,
	)
	if len(desiredIDs) > 0 {
		query = query.Where("id NOT IN ?", desiredIDs)
	}
	return query.Delete(&models.ProductVariantOption{}).Error
}

func deleteUnusedVariantTypes(tx *gorm.DB, productID uuid.UUID, desiredIDs []uuid.UUID) error {
	query := tx.Where(
		`product_id = ?
		AND NOT EXISTS (
			SELECT 1 FROM product_variant_options
			WHERE product_variant_options.variant_type_id = product_variant_types.id
		)`,
		productID,
	)
	if len(desiredIDs) > 0 {
		query = query.Where("id NOT IN ?", desiredIDs)
	}
	return query.Delete(&models.ProductVariantType{}).Error
}

// SearchProducts performs full-text search on products
func (r *ProductRepository) SearchProducts(query string, limit int) ([]models.Product, error) {
	var products []models.Product

	searchTerm := "%" + strings.ToLower(query) + "%"

	err := r.db.Where("status = ?", "active").
		Where("LOWER(name) LIKE ? OR LOWER(description) LIKE ?", searchTerm, searchTerm).
		Preload("Category").
		Preload("Images", preloadProductImages).
		Limit(limit).
		Find(&products).Error

	return products, err
}

// GetFeaturedProducts retrieves featured products (most recent active products)
func (r *ProductRepository) GetFeaturedProducts(limit int) ([]models.Product, error) {
	var products []models.Product

	err := r.db.Where("status = ? AND stock_quantity > 0", "active").
		Preload("Category").
		Preload("Images", preloadProductImages).
		Order("created_at DESC").
		Limit(limit).
		Find(&products).Error

	return products, err
}

// GetRelatedProducts retrieves related products (same category)
func (r *ProductRepository) GetRelatedProducts(productID uuid.UUID, categoryID uuid.UUID, limit int) ([]models.Product, error) {
	var products []models.Product

	err := r.db.Where("id != ? AND category_id = ? AND status = ? AND stock_quantity > 0", productID, categoryID, "active").
		Preload("Images", preloadProductImages).
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
		Preload("Images", preloadProductImages).
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
		Preload("Images", preloadProductImages).
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
		Preload("Images", preloadProductImages).
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
	switch filter.StockStatus {
	case "in_stock":
		query = query.Where("stock_quantity > ?", 10)
	case "low_stock":
		query = query.Where("stock_quantity > 0 AND stock_quantity <= ?", 10)
	case "out_of_stock":
		query = query.Where("stock_quantity <= 0")
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
			"LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(sku) LIKE ?",
			searchTerm, searchTerm, searchTerm,
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
		case "price":
			sortColumn = "regular_price"
		case "regular_price":
			sortColumn = "regular_price"
		case "stock":
			sortColumn = "stock_quantity"
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
		Preload("Images", preloadProductImages).
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
	err := withProductDetailPreloads(r.db.Unscoped()).
		Preload("Images", func(db *gorm.DB) *gorm.DB {
			return db.Unscoped().Order("display_order ASC")
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
