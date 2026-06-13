package product_test

import (
	"database/sql"
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	productsvc "ecommerce-backend/internal/services/product"
	"encoding/json"
	"testing"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupCatalogTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)
	t.Cleanup(func() {
		require.NoError(t, closeCatalogTestDB(sqlDB))
	})
	require.NoError(t, db.Exec("PRAGMA foreign_keys = OFF").Error)

	// Use SQLite-friendly table definitions because the production models use
	// PostgreSQL defaults such as uuid_generate_v4().
	require.NoError(t, db.Exec(`
		CREATE TABLE categories (
			id text PRIMARY KEY,
			name text NOT NULL,
			slug text NOT NULL UNIQUE,
			description text,
			parent_id text,
			image_url text,
			is_active boolean DEFAULT true,
			created_at datetime,
			updated_at datetime,
			deleted_at datetime
		)
	`).Error)
	require.NoError(t, db.Exec(`
		CREATE TABLE products (
			id text PRIMARY KEY,
			name text NOT NULL,
			slug text NOT NULL UNIQUE,
			sku text NOT NULL,
			description text,
			short_description text,
			regular_price numeric,
			sale_price numeric,
			sale_start_date datetime,
			sale_end_date datetime,
			stock_quantity integer DEFAULT 0,
			stock_alert_threshold integer DEFAULT 10,
			allow_backorders boolean DEFAULT false,
			weight numeric,
			length numeric,
			width numeric,
			height numeric,
			category_id text,
			brand text,
			status text,
			view_count integer DEFAULT 0,
			sold_count integer DEFAULT 0,
			avg_rating numeric DEFAULT 0,
			review_count integer DEFAULT 0,
			meta_title text,
			meta_description text,
			canonical_url text,
			og_image text,
			version integer DEFAULT 1,
			created_at datetime,
			updated_at datetime,
			deleted_at datetime
		)
	`).Error)
	require.NoError(t, db.Exec(`
		CREATE TABLE product_images (
			id text PRIMARY KEY,
			product_id text,
			image_url text,
			option_id text,
			display_order integer,
			is_primary boolean,
			width integer,
			height integer,
			aspect_ratio numeric,
			deleted_at datetime
		)
	`).Error)
	require.NoError(t, db.Exec(`
		CREATE TABLE product_variant_types (
			id text PRIMARY KEY,
			product_id text,
			name text,
			is_visual boolean,
			display_order integer,
			created_at datetime,
			updated_at datetime,
			UNIQUE(product_id, name)
		)
	`).Error)
	require.NoError(t, db.Exec(`
		CREATE TABLE product_variant_options (
			id text PRIMARY KEY,
			variant_type_id text,
			value text,
			display_order integer,
			created_at datetime,
			updated_at datetime
		)
	`).Error)
	require.NoError(t, db.Exec(`
		CREATE TABLE product_variant_combinations (
			id text PRIMARY KEY,
			product_id text,
			price_adjustment numeric,
			stock_quantity integer,
			sku text,
			is_active boolean,
			created_at datetime,
			updated_at datetime
		)
	`).Error)
	require.NoError(t, db.Exec(`
		CREATE TABLE product_combination_options (
			combination_id text,
			option_id text
		)
	`).Error)
	require.NoError(t, db.Exec(`CREATE TABLE cart_items (id text PRIMARY KEY, combination_id text)`).Error)
	require.NoError(t, db.Exec(`CREATE TABLE order_items (id text PRIMARY KEY, combination_id text)`).Error)
	require.NoError(t, db.Exec(`CREATE TABLE stock_alerts (id text PRIMARY KEY, combination_id text)`).Error)

	return db
}

func closeCatalogTestDB(db *sql.DB) error {
	return db.Close()
}

func TestCreateCategoryUsesSoftDeletedSlugsWhenGeneratingUniqueSlug(t *testing.T) {
	db := setupCatalogTestDB(t)
	categoryRepo := repositories.NewCategoryRepository(db)
	productRepo := repositories.NewProductRepository(db)
	service := productsvc.NewCategoryService(categoryRepo, productRepo)

	deletedCategory := &models.Category{
		ID:       uuid.New(),
		Name:     "HP",
		Slug:     "hp",
		IsActive: true,
	}
	require.NoError(t, db.Create(deletedCategory).Error)
	require.NoError(t, db.Delete(deletedCategory).Error)

	category, err := service.CreateCategory(productsvc.CreateCategoryInput{
		Name:     "HP",
		IsActive: true,
	})

	require.NoError(t, err)
	require.Equal(t, "HP", category.Name)
	require.Equal(t, "hp-2", category.Slug)
}

func TestCreateCategoryPersistsInactiveStatus(t *testing.T) {
	db := setupCatalogTestDB(t)
	categoryRepo := repositories.NewCategoryRepository(db)
	productRepo := repositories.NewProductRepository(db)
	service := productsvc.NewCategoryService(categoryRepo, productRepo)

	category, err := service.CreateCategory(productsvc.CreateCategoryInput{
		Name:     "Inactive Category",
		IsActive: false,
	})

	require.NoError(t, err)
	require.False(t, category.IsActive)

	var persisted models.Category
	require.NoError(t, db.First(&persisted, "id = ?", category.ID).Error)
	require.False(t, persisted.IsActive)
}

func TestUpdateCategoryClearsParentWhenParentIDIsExplicitNull(t *testing.T) {
	db := setupCatalogTestDB(t)
	categoryRepo := repositories.NewCategoryRepository(db)
	productRepo := repositories.NewProductRepository(db)
	service := productsvc.NewCategoryService(categoryRepo, productRepo)

	parent := createCatalogTestCategory(t, db, "Fashion", "fashion")
	child := createCatalogTestCategory(t, db, "Mens Clothing", "mens-clothing")
	require.NoError(t, db.Model(&models.Category{}).
		Where("id = ?", child.ID).
		Update("parent_id", parent.ID.String()).Error)

	var input productsvc.UpdateCategoryInput
	require.NoError(t, json.Unmarshal([]byte(`{"parent_id":null}`), &input))

	updatedCategory, err := service.UpdateCategory(child.ID, input)

	require.NoError(t, err)
	require.Nil(t, updatedCategory.ParentID)

	var persisted models.Category
	require.NoError(t, db.First(&persisted, "id = ?", child.ID).Error)
	require.Nil(t, persisted.ParentID)
}

func TestUpdateCategoryKeepsParentWhenParentIDIsOmitted(t *testing.T) {
	db := setupCatalogTestDB(t)
	categoryRepo := repositories.NewCategoryRepository(db)
	productRepo := repositories.NewProductRepository(db)
	service := productsvc.NewCategoryService(categoryRepo, productRepo)

	parent := createCatalogTestCategory(t, db, "Fashion", "fashion")
	child := createCatalogTestCategory(t, db, "Mens Clothing", "mens-clothing")
	require.NoError(t, db.Model(&models.Category{}).
		Where("id = ?", child.ID).
		Update("parent_id", parent.ID.String()).Error)

	var input productsvc.UpdateCategoryInput
	require.NoError(t, json.Unmarshal([]byte(`{"description":"Updated"}`), &input))

	updatedCategory, err := service.UpdateCategory(child.ID, input)

	require.NoError(t, err)
	require.NotNil(t, updatedCategory.ParentID)
	require.Equal(t, parent.ID, *updatedCategory.ParentID)

	var persisted models.Category
	require.NoError(t, db.First(&persisted, "id = ?", child.ID).Error)
	require.NotNil(t, persisted.ParentID)
	require.Equal(t, parent.ID, *persisted.ParentID)
}

func TestUpdateProductPersistsCategoryChange(t *testing.T) {
	db := setupCatalogTestDB(t)
	categoryRepo := repositories.NewCategoryRepository(db)
	productRepo := repositories.NewProductRepository(db)
	service := productsvc.NewProductService(productRepo, categoryRepo)

	firstCategory := createCatalogTestCategory(t, db, "Smartphones", "smartphones")
	secondCategory := createCatalogTestCategory(t, db, "Laptops", "laptops")
	product := createCatalogTestProduct(t, db, firstCategory.ID)

	nextCategoryID := secondCategory.ID.String()
	updatedProduct, err := service.UpdateProduct(product.ID, productsvc.UpdateProductInput{
		CategoryID: &nextCategoryID,
		Version:    product.Version,
	})

	require.NoError(t, err)
	require.NotNil(t, updatedProduct.CategoryID)
	require.Equal(t, secondCategory.ID, *updatedProduct.CategoryID)

	var persisted models.Product
	require.NoError(t, db.First(&persisted, "id = ?", product.ID).Error)
	require.NotNil(t, persisted.CategoryID)
	require.Equal(t, secondCategory.ID, *persisted.CategoryID)
}

func TestCreateProductRollsBackWhenVariantSaveFails(t *testing.T) {
	db := setupCatalogTestDB(t)
	categoryRepo := repositories.NewCategoryRepository(db)
	productRepo := repositories.NewProductRepository(db)
	service := productsvc.NewProductService(productRepo, categoryRepo)

	category := createCatalogTestCategory(t, db, "Smartphones", "smartphones")
	categoryID := category.ID.String()

	_, err := service.CreateProduct(productsvc.CreateProductInput{
		Name:          "Rollback Product",
		RegularPrice:  100000,
		StockQuantity: 10,
		CategoryID:    &categoryID,
		SKU:           "ROLLBACK-PRODUCT",
		Status:        "draft",
		VariantTypes: []productsvc.VariantTypeInput{
			{
				Name: "Color",
				Options: []productsvc.VariantOptionInput{
					{Value: "Black"},
				},
			},
			{
				Name: "Color",
				Options: []productsvc.VariantOptionInput{
					{Value: "White"},
				},
			},
		},
		Combinations: []productsvc.VariantCombinationInput{
			{
				OptionValues:  []string{"Black"},
				StockQuantity: 1,
				SKU:           "ROLLBACK-BLK",
			},
		},
	})

	require.Error(t, err)

	var productCount int64
	require.NoError(t, db.Model(&models.Product{}).
		Where("sku = ?", "ROLLBACK-PRODUCT").
		Count(&productCount).Error)
	require.Equal(t, int64(0), productCount)
}

func TestUpdateProductVariantOptionRenameKeepsCombinationDataByOptionID(t *testing.T) {
	db := setupCatalogTestDB(t)
	categoryRepo := repositories.NewCategoryRepository(db)
	productRepo := repositories.NewProductRepository(db)
	service := productsvc.NewProductService(productRepo, categoryRepo)

	category := createCatalogTestCategory(t, db, "Smartphones", "smartphones")
	categoryID := category.ID.String()
	typeID := uuid.New()
	optionID := uuid.New()
	combinationID := uuid.New()
	isActive := true

	product, err := service.CreateProduct(productsvc.CreateProductInput{
		Name:          "Stable Variant Product",
		RegularPrice:  100000,
		StockQuantity: 5,
		CategoryID:    &categoryID,
		SKU:           "STABLE-VARIANT",
		Status:        "active",
		VariantTypes: []productsvc.VariantTypeInput{
			{
				ID:   typeID.String(),
				Name: "Color",
				Options: []productsvc.VariantOptionInput{
					{ID: optionID.String(), Value: "Navyy"},
				},
			},
		},
		Combinations: []productsvc.VariantCombinationInput{
			{
				ID:              combinationID.String(),
				OptionIDs:       []string{optionID.String()},
				PriceAdjustment: 15000,
				StockQuantity:   3,
				SKU:             "STABLE-NAVY",
				IsActive:        &isActive,
			},
		},
	})
	require.NoError(t, err)

	renamedTypes := []productsvc.VariantTypeInput{
		{
			ID:   typeID.String(),
			Name: "Color",
			Options: []productsvc.VariantOptionInput{
				{ID: optionID.String(), Value: "Navy"},
			},
		},
	}
	renamedCombinations := []productsvc.VariantCombinationInput{
		{
			ID:              combinationID.String(),
			OptionIDs:       []string{optionID.String()},
			OptionValues:    []string{"Navy"},
			PriceAdjustment: 15000,
			StockQuantity:   3,
			SKU:             "STABLE-NAVY",
			IsActive:        &isActive,
		},
	}

	updatedProduct, err := service.UpdateProduct(product.ID, productsvc.UpdateProductInput{
		Version:      product.Version,
		VariantTypes: &renamedTypes,
		Combinations: &renamedCombinations,
	})

	require.NoError(t, err)
	require.Len(t, updatedProduct.VariantTypes, 1)
	require.Len(t, updatedProduct.VariantTypes[0].Options, 1)
	require.Equal(t, optionID, updatedProduct.VariantTypes[0].Options[0].ID)
	require.Equal(t, "Navy", updatedProduct.VariantTypes[0].Options[0].Value)
	require.Len(t, updatedProduct.Combinations, 1)
	require.Equal(t, combinationID, updatedProduct.Combinations[0].ID)
	require.True(t, updatedProduct.Combinations[0].IsActive)
	require.Equal(t, 3, updatedProduct.Combinations[0].StockQuantity)
	require.True(t, decimal.NewFromInt(15000).Equal(updatedProduct.Combinations[0].PriceAdjustment))

	var mappingCount int64
	require.NoError(t, db.Table("product_combination_options").
		Where("combination_id = ? AND option_id = ?", combinationID.String(), optionID.String()).
		Count(&mappingCount).Error)
	require.Equal(t, int64(1), mappingCount)
}

func TestReplaceVariantCombinationDataDisablesReferencedStaleCombination(t *testing.T) {
	testStaleCombinationReference(t, "cart_items")
}

func TestReplaceVariantCombinationDataDisablesOrderReferencedStaleCombination(t *testing.T) {
	testStaleCombinationReference(t, "order_items")
}

func TestReplaceVariantCombinationDataPersistsInactiveDesiredCombination(t *testing.T) {
	db := setupCatalogTestDB(t)
	productRepo := repositories.NewProductRepository(db)
	categoryID := createCatalogTestCategory(t, db, "Smartphones", "smartphones").ID
	productID := uuid.New()
	_ = createCatalogTestProductWithID(t, db, productID, categoryID)

	combinationID := uuid.New()
	require.NoError(t, db.Create(&models.ProductVariantCombination{
		ID:              combinationID,
		ProductID:       productID,
		PriceAdjustment: decimal.NewFromInt(0),
		StockQuantity:   5,
		SKU:             "INACTIVE-DESIRED",
		IsActive:        true,
	}).Error)

	err := productRepo.ReplaceVariantCombinationData(
		productID,
		nil,
		[]models.ProductVariantCombination{
			{
				ID:              combinationID,
				ProductID:       productID,
				PriceAdjustment: decimal.NewFromInt(0),
				StockQuantity:   0,
				SKU:             "INACTIVE-DESIRED",
				IsActive:        false,
			},
		},
		nil,
	)

	require.NoError(t, err)

	var combination models.ProductVariantCombination
	require.NoError(t, db.First(&combination, "id = ?", combinationID).Error)
	require.False(t, combination.IsActive)
	require.Equal(t, 0, combination.StockQuantity)
}

func createCatalogTestCategory(t *testing.T, db *gorm.DB, name string, slug string) models.Category {
	t.Helper()

	category := models.Category{
		ID:       uuid.New(),
		Name:     name,
		Slug:     slug,
		IsActive: true,
	}
	require.NoError(t, db.Create(&category).Error)
	return category
}

func testStaleCombinationReference(t *testing.T, tableName string) {
	t.Helper()

	db := setupCatalogTestDB(t)
	productRepo := repositories.NewProductRepository(db)
	categoryID := createCatalogTestCategory(t, db, "Smartphones", "smartphones").ID
	productID := uuid.New()
	_ = createCatalogTestProductWithID(t, db, productID, categoryID)

	referencedCombinationID := uuid.New()
	deletableCombinationID := uuid.New()
	keptCombinationID := uuid.New()
	referencedTypeID := uuid.New()
	referencedOptionID := uuid.New()
	require.NoError(t, db.Create(&models.ProductVariantType{
		ID:        referencedTypeID,
		ProductID: productID,
		Name:      "Color",
		IsVisual:  true,
	}).Error)
	require.NoError(t, db.Create(&models.ProductVariantOption{
		ID:            referencedOptionID,
		VariantTypeID: referencedTypeID,
		Value:         "Pink",
	}).Error)
	require.NoError(t, db.Create(&models.ProductVariantCombination{
		ID:              referencedCombinationID,
		ProductID:       productID,
		PriceAdjustment: decimal.NewFromInt(0),
		StockQuantity:   5,
		SKU:             "REFERENCED-COMBINATION-" + tableName,
		IsActive:        true,
	}).Error)
	require.NoError(t, db.Create(&models.ProductCombinationOption{
		CombinationID: referencedCombinationID,
		OptionID:      referencedOptionID,
	}).Error)
	require.NoError(t, db.Create(&models.ProductVariantCombination{
		ID:              deletableCombinationID,
		ProductID:       productID,
		PriceAdjustment: decimal.NewFromInt(0),
		StockQuantity:   5,
		SKU:             "DELETABLE-COMBINATION-" + tableName,
		IsActive:        true,
	}).Error)
	require.NoError(t, db.Exec(
		"INSERT INTO "+tableName+" (id, combination_id) VALUES (?, ?)",
		uuid.New().String(),
		referencedCombinationID.String(),
	).Error)

	err := productRepo.ReplaceVariantCombinationData(
		productID,
		nil,
		[]models.ProductVariantCombination{
			{
				ID:              keptCombinationID,
				ProductID:       productID,
				PriceAdjustment: decimal.NewFromInt(1000),
				StockQuantity:   2,
				SKU:             "KEPT-COMBINATION-" + tableName,
				IsActive:        true,
			},
		},
		nil,
	)

	require.NoError(t, err)

	var referenced models.ProductVariantCombination
	require.NoError(t, db.First(&referenced, "id = ?", referencedCombinationID).Error)
	require.False(t, referenced.IsActive)
	require.Equal(t, 0, referenced.StockQuantity)

	var retainedMappingCount int64
	require.NoError(t, db.Model(&models.ProductCombinationOption{}).
		Where("combination_id = ? AND option_id = ?", referencedCombinationID, referencedOptionID).
		Count(&retainedMappingCount).Error)
	require.Equal(t, int64(1), retainedMappingCount)

	var retainedOptionCount int64
	require.NoError(t, db.Model(&models.ProductVariantOption{}).
		Where("id = ?", referencedOptionID).
		Count(&retainedOptionCount).Error)
	require.Equal(t, int64(1), retainedOptionCount)

	var deletableCount int64
	require.NoError(t, db.Model(&models.ProductVariantCombination{}).
		Where("id = ?", deletableCombinationID).
		Count(&deletableCount).Error)
	require.Equal(t, int64(0), deletableCount)

	var kept models.ProductVariantCombination
	require.NoError(t, db.First(&kept, "id = ?", keptCombinationID).Error)
	require.True(t, kept.IsActive)
	require.Equal(t, 2, kept.StockQuantity)
}

func createCatalogTestProduct(t *testing.T, db *gorm.DB, categoryID uuid.UUID) models.Product {
	t.Helper()

	return createCatalogTestProductWithID(t, db, uuid.New(), categoryID)
}

func createCatalogTestProductWithID(t *testing.T, db *gorm.DB, productID uuid.UUID, categoryID uuid.UUID) models.Product {
	t.Helper()

	product := models.Product{
		ID:            productID,
		Name:          "Test Product",
		Slug:          "test-product",
		SKU:           "TEST-PRODUCT",
		Description:   "Test product",
		RegularPrice:  decimal.NewFromInt(100000),
		StockQuantity: 10,
		CategoryID:    &categoryID,
		Status:        "active",
		AvgRating:     0,
		ReviewCount:   0,
		Version:       1,
	}
	require.NoError(t, db.Create(&product).Error)
	return product
}
