package product_review_test

import (
	"database/sql"
	"testing"
	"time"

	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	productsvc "ecommerce-backend/internal/services/product"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupProductReviewTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	require.NoError(t, err)

	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)
	t.Cleanup(func() {
		require.NoError(t, closeProductReviewTestDB(sqlDB))
	})

	require.NoError(t, db.Exec("PRAGMA foreign_keys = OFF").Error)
	require.NoError(t, db.Exec(`
		CREATE TABLE users (
			id text PRIMARY KEY,
			email text NOT NULL UNIQUE,
			password_hash text NOT NULL,
			name text NOT NULL,
			phone text,
			avatar_url text,
			role text NOT NULL DEFAULT 'customer',
			status text NOT NULL DEFAULT 'active',
			is_verified boolean DEFAULT true,
			is_active boolean DEFAULT true,
			email_verification_token text,
			email_verification_code text,
			email_verification_expires_at datetime,
			email_verification_attempts integer DEFAULT 0,
			last_code_sent_at datetime,
			password_reset_token text,
			password_reset_expires_at datetime,
			last_login_at datetime,
			created_at datetime,
			updated_at datetime,
			deleted_at datetime
		)
	`).Error)
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
			alt_text text,
			option_id text,
			display_order integer,
			is_primary boolean,
			width integer,
			height integer,
			aspect_ratio numeric,
			deleted_at datetime
		)
	`).Error)
	require.NoError(t, db.Exec(`CREATE TABLE product_variant_types (id text PRIMARY KEY, product_id text, name text, is_visual boolean, display_order integer, created_at datetime, updated_at datetime)`).Error)
	require.NoError(t, db.Exec(`CREATE TABLE product_variant_options (id text PRIMARY KEY, variant_type_id text, value text, display_order integer, created_at datetime, updated_at datetime)`).Error)
	require.NoError(t, db.Exec(`CREATE TABLE product_variant_combinations (id text PRIMARY KEY, product_id text, price_adjustment numeric, stock_quantity integer, sku text, is_active boolean, created_at datetime, updated_at datetime)`).Error)
	require.NoError(t, db.Exec(`CREATE TABLE product_combination_options (combination_id text, option_id text)`).Error)
	require.NoError(t, db.Exec(`
		CREATE TABLE orders (
			id text PRIMARY KEY,
			order_number text NOT NULL UNIQUE,
			user_id text NOT NULL,
			shipping_name text NOT NULL,
			shipping_phone text NOT NULL,
			shipping_address_line1 text NOT NULL,
			shipping_address_line2 text,
			shipping_city text NOT NULL,
			shipping_province text NOT NULL,
			shipping_postal_code text NOT NULL,
			subtotal numeric NOT NULL,
			shipping_cost numeric DEFAULT 0,
			discount_amount numeric DEFAULT 0,
			tax_amount numeric DEFAULT 0,
			total numeric NOT NULL,
			promo_code_id text,
			order_status text NOT NULL,
			payment_status text NOT NULL,
			payment_method text,
			payment_provider text,
			payment_transaction_id text,
			paid_at datetime,
			snap_token text,
			snap_token_created_at datetime,
			payment_expires_at datetime,
			customer_email text,
			shipping_method text,
			tracking_number text,
			shipped_at datetime,
			delivered_at datetime,
			customer_notes text,
			admin_notes text,
			cancelled_at datetime,
			cancellation_reason text,
			idempotency_key text,
			created_at datetime,
			updated_at datetime
		)
	`).Error)
	require.NoError(t, db.Exec(`
		CREATE TABLE order_items (
			id text PRIMARY KEY,
			order_id text NOT NULL,
			product_id text NOT NULL,
			combination_id text,
			product_name text NOT NULL,
			product_sku text NOT NULL,
			variant_type text,
			variant_value text,
			quantity integer NOT NULL,
			unit_price numeric NOT NULL,
			subtotal numeric NOT NULL,
			created_at datetime
		)
	`).Error)
	require.NoError(t, db.Exec(`
		CREATE TABLE product_reviews (
			id text PRIMARY KEY,
			product_id text NOT NULL,
			user_id text NOT NULL,
			order_id text,
			rating integer NOT NULL,
			title text,
			review_text text,
			helpful_count integer DEFAULT 0,
			unhelpful_count integer DEFAULT 0,
			is_verified_purchase boolean DEFAULT false,
			status text NOT NULL DEFAULT 'pending',
			created_at datetime,
			updated_at datetime,
			UNIQUE(product_id, user_id, order_id)
		)
	`).Error)
	require.NoError(t, db.Exec(`
		CREATE TABLE review_helpful_votes (
			id text PRIMARY KEY,
			review_id text NOT NULL,
			user_id text NOT NULL,
			is_helpful boolean NOT NULL,
			created_at datetime,
			UNIQUE(review_id, user_id)
		)
	`).Error)
	require.NoError(t, db.Exec(`
		CREATE TABLE review_images (
			id text PRIMARY KEY,
			review_id text NOT NULL,
			image_url text NOT NULL,
			created_at datetime
		)
	`).Error)

	return db
}

func closeProductReviewTestDB(db *sql.DB) error {
	return db.Close()
}

func newProductReviewTestService(db *gorm.DB) *productsvc.ProductReviewService {
	return productsvc.NewProductReviewService(
		repositories.NewProductReviewRepository(db),
		repositories.NewUserRepository(db),
		repositories.NewOrderRepository(db),
		repositories.NewProductRepository(db),
	)
}

func seedProductReviewPurchase(t *testing.T, db *gorm.DB) (uuid.UUID, uuid.UUID) {
	t.Helper()

	userID := uuid.New()
	categoryID := uuid.New()
	productID := uuid.New()
	orderID := uuid.New()
	now := time.Now()

	require.NoError(t, db.Create(&models.User{
		ID:           userID,
		Email:        "reviewer@example.com",
		PasswordHash: "hash",
		Name:         "Reviewer",
		Role:         "customer",
		IsVerified:   true,
		IsActive:     true,
	}).Error)
	require.NoError(t, db.Create(&models.Category{
		ID:       categoryID,
		Name:     "Fashion",
		Slug:     "fashion",
		IsActive: true,
	}).Error)
	require.NoError(t, db.Create(&models.Product{
		ID:            productID,
		Name:          "Reviewed Product",
		Slug:          "reviewed-product",
		SKU:           "REVIEWED-PRODUCT",
		Description:   "Product for review test",
		RegularPrice:  decimal.NewFromInt(100000),
		StockQuantity: 5,
		CategoryID:    &categoryID,
		Status:        "active",
		Version:       1,
	}).Error)
	require.NoError(t, db.Create(&models.Order{
		ID:                   orderID,
		OrderNumber:          "ORD-REVIEW-" + orderID.String()[:8],
		UserID:               userID,
		ShippingName:         "Reviewer",
		ShippingPhone:        "+628000000000",
		ShippingAddressLine1: "Test Street",
		ShippingCity:         "Jakarta",
		ShippingProvince:     "DKI Jakarta",
		ShippingPostalCode:   "12345",
		Subtotal:             decimal.NewFromInt(100000),
		ShippingCost:         decimal.Zero,
		DiscountAmount:       decimal.Zero,
		TaxAmount:            decimal.Zero,
		Total:                decimal.NewFromInt(100000),
		OrderStatus:          models.OrderStatusCompleted,
		PaymentStatus:        models.PaymentStatusPaid,
		CreatedAt:            now,
		UpdatedAt:            now,
	}).Error)
	require.NoError(t, db.Create(&models.OrderItem{
		ID:          uuid.New(),
		OrderID:     orderID,
		ProductID:   productID,
		ProductName: "Reviewed Product",
		ProductSKU:  "REVIEWED-PRODUCT",
		Quantity:    1,
		UnitPrice:   decimal.NewFromInt(100000),
		Subtotal:    decimal.NewFromInt(100000),
		CreatedAt:   now,
	}).Error)

	return productID, userID
}

func seedAdditionalProductReviewOrder(t *testing.T, db *gorm.DB, userID, productID uuid.UUID, status string) uuid.UUID {
	t.Helper()

	orderID := uuid.New()
	now := time.Now()
	require.NoError(t, db.Create(&models.Order{
		ID:                   orderID,
		OrderNumber:          "ORD-REVIEW-" + orderID.String()[:8],
		UserID:               userID,
		ShippingName:         "Reviewer",
		ShippingPhone:        "+628000000000",
		ShippingAddressLine1: "Test Street",
		ShippingCity:         "Jakarta",
		ShippingProvince:     "DKI Jakarta",
		ShippingPostalCode:   "12345",
		Subtotal:             decimal.NewFromInt(100000),
		ShippingCost:         decimal.Zero,
		DiscountAmount:       decimal.Zero,
		TaxAmount:            decimal.Zero,
		Total:                decimal.NewFromInt(100000),
		OrderStatus:          status,
		PaymentStatus:        models.PaymentStatusPaid,
		CreatedAt:            now,
		UpdatedAt:            now,
	}).Error)
	require.NoError(t, db.Create(&models.OrderItem{
		ID:          uuid.New(),
		OrderID:     orderID,
		ProductID:   productID,
		ProductName: "Reviewed Product",
		ProductSKU:  "REVIEWED-PRODUCT",
		Quantity:    1,
		UnitPrice:   decimal.NewFromInt(100000),
		Subtotal:    decimal.NewFromInt(100000),
		CreatedAt:   now,
	}).Error)

	return orderID
}

func TestProductReview_CreateReviewAutoApprovesSafeReviewAndUpdatesPublicStats(t *testing.T) {
	db := setupProductReviewTestDB(t)
	service := newProductReviewTestService(db)
	productID, userID := seedProductReviewPurchase(t, db)

	review, err := service.CreateReview(productID, userID, &models.CreateReviewRequest{
		Rating: 5,
	})

	require.NoError(t, err)
	require.Equal(t, models.ReviewStatusApproved, review.Status)
	require.True(t, review.IsVerifiedPurchase)

	stats, err := service.GetProductReviewStats(productID)
	require.NoError(t, err)
	require.Equal(t, int64(1), stats.TotalReviews)
	require.Equal(t, 5.0, stats.AverageRating)
}

func TestProductReview_CreateReviewFlagsAbusiveContentForModeration(t *testing.T) {
	db := setupProductReviewTestDB(t)
	service := newProductReviewTestService(db)
	productID, userID := seedProductReviewPurchase(t, db)

	review, err := service.CreateReview(productID, userID, &models.CreateReviewRequest{
		Rating:     1,
		Title:      stringPtr("Produk goblok"),
		ReviewText: stringPtr("Komentar ini perlu dimoderasi"),
	})

	require.NoError(t, err)
	require.Equal(t, models.ReviewStatusPending, review.Status)

	stats, err := service.GetProductReviewStats(productID)
	require.NoError(t, err)
	require.Equal(t, int64(0), stats.TotalReviews)
	require.Equal(t, 0.0, stats.AverageRating)
}

func TestProductReview_CreateReviewRejectsUnpaidCompletedOrder(t *testing.T) {
	db := setupProductReviewTestDB(t)
	service := newProductReviewTestService(db)
	productID, userID := seedProductReviewPurchase(t, db)

	require.NoError(t, db.Model(&models.Order{}).
		Where("user_id = ?", userID).
		Update("payment_status", models.PaymentStatusPendingPayment).Error)

	_, err := service.CreateReview(productID, userID, &models.CreateReviewRequest{
		Rating: 5,
	})

	require.Error(t, err)
	require.Contains(t, err.Error(), "you must have a completed order")
}

func TestProductReview_CreateReviewAllowsRefundRejectedPaidOrder(t *testing.T) {
	db := setupProductReviewTestDB(t)
	service := newProductReviewTestService(db)
	productID, userID := seedProductReviewPurchase(t, db)

	require.NoError(t, db.Model(&models.Order{}).
		Where("user_id = ?", userID).
		Update("order_status", models.OrderStatusRefundRejected).Error)

	review, err := service.CreateReview(productID, userID, &models.CreateReviewRequest{
		Rating: 4,
	})

	require.NoError(t, err)
	require.Equal(t, models.ReviewStatusApproved, review.Status)
	require.True(t, review.IsVerifiedPurchase)
}

func TestProductReview_CreateReviewAllowsSameProductAgainAfterNewCompletedOrder(t *testing.T) {
	db := setupProductReviewTestDB(t)
	service := newProductReviewTestService(db)
	productID, userID := seedProductReviewPurchase(t, db)

	firstReview, err := service.CreateReview(productID, userID, &models.CreateReviewRequest{
		Rating: 5,
	})
	require.NoError(t, err)
	require.NotNil(t, firstReview.OrderID)

	_, err = service.CreateReview(productID, userID, &models.CreateReviewRequest{
		Rating: 4,
	})
	require.Error(t, err)
	require.Contains(t, err.Error(), "you must have a completed order")

	secondOrderID := seedAdditionalProductReviewOrder(t, db, userID, productID, models.OrderStatusCompleted)
	secondReview, err := service.CreateReview(productID, userID, &models.CreateReviewRequest{
		Rating: 4,
	})

	require.NoError(t, err)
	require.NotNil(t, secondReview.OrderID)
	require.Equal(t, secondOrderID, *secondReview.OrderID)
	require.NotEqual(t, *firstReview.OrderID, *secondReview.OrderID)
}

func TestProductReview_CreateReviewFlagsNormalizedAbusiveContent(t *testing.T) {
	db := setupProductReviewTestDB(t)
	service := newProductReviewTestService(db)
	productID, userID := seedProductReviewPurchase(t, db)

	review, err := service.CreateReview(productID, userID, &models.CreateReviewRequest{
		Rating:     1,
		ReviewText: stringPtr("Komentar n1gg4 tidak pantas"),
	})

	require.NoError(t, err)
	require.Equal(t, models.ReviewStatusPending, review.Status)
}

func TestProductReview_CreateReviewStoresOptionalImages(t *testing.T) {
	db := setupProductReviewTestDB(t)
	service := newProductReviewTestService(db)
	productID, userID := seedProductReviewPurchase(t, db)

	review, err := service.CreateReview(productID, userID, &models.CreateReviewRequest{
		Rating:     5,
		Title:      stringPtr("Dengan foto"),
		ReviewText: stringPtr("Foto produk sesuai"),
		ImageURLs:  []string{"http://storage/reviews/a.webp", "http://storage/reviews/b.webp"},
	})

	require.NoError(t, err)
	require.Len(t, review.Images, 2)
	require.Equal(t, "http://storage/reviews/a.webp", review.Images[0].ImageURL)
}

func TestProductReview_CreateReviewRejectsMoreThanThreeImages(t *testing.T) {
	db := setupProductReviewTestDB(t)
	service := newProductReviewTestService(db)
	productID, userID := seedProductReviewPurchase(t, db)

	_, err := service.CreateReview(productID, userID, &models.CreateReviewRequest{
		Rating:     5,
		Title:      stringPtr("Terlalu banyak foto"),
		ReviewText: stringPtr("Upload lebih dari batas"),
		ImageURLs: []string{
			"http://storage/reviews/a.webp",
			"http://storage/reviews/b.webp",
			"http://storage/reviews/c.webp",
			"http://storage/reviews/d.webp",
		},
	})

	require.Error(t, err)
	require.Contains(t, err.Error(), "maximum 3 review images allowed")
}

func TestProductReview_ApprovePublishesReviewAndUpdatesProductStats(t *testing.T) {
	db := setupProductReviewTestDB(t)
	service := newProductReviewTestService(db)
	productID, userID := seedProductReviewPurchase(t, db)

	review, err := service.CreateReview(productID, userID, &models.CreateReviewRequest{
		Rating:     4,
		Title:      stringPtr("Nyaman tapi goblok"),
		ReviewText: stringPtr("Kualitas sesuai harga"),
	})
	require.NoError(t, err)
	require.Equal(t, models.ReviewStatusPending, review.Status)

	approved, err := service.ModerateReview(review.ID, models.ReviewStatusApproved)
	require.NoError(t, err)
	require.Equal(t, models.ReviewStatusApproved, approved.Status)

	result, err := service.GetProductReviews(productID, 1, 10, models.SortByRecent)
	require.NoError(t, err)
	require.Len(t, result.Reviews, 1)
	require.Equal(t, int64(1), result.Total)

	var product models.Product
	require.NoError(t, db.First(&product, "id = ?", productID).Error)
	require.Equal(t, int64(1), product.ReviewCount)
	require.Equal(t, 4.0, product.AvgRating)
}

func TestProductReview_RejectKeepsReviewHidden(t *testing.T) {
	db := setupProductReviewTestDB(t)
	service := newProductReviewTestService(db)
	productID, userID := seedProductReviewPurchase(t, db)

	review, err := service.CreateReview(productID, userID, &models.CreateReviewRequest{
		Rating:     2,
		Title:      stringPtr("Kurang goblok"),
		ReviewText: stringPtr("Perlu diperbaiki"),
	})
	require.NoError(t, err)
	require.Equal(t, models.ReviewStatusPending, review.Status)

	_, err = service.ModerateReview(review.ID, models.ReviewStatusRejected)
	require.NoError(t, err)

	result, err := service.GetProductReviews(productID, 1, 10, models.SortByRecent)
	require.NoError(t, err)
	require.Len(t, result.Reviews, 0)
	require.Equal(t, int64(0), result.Total)
}

func TestProductReview_VoteOnlyAllowedForApprovedReview(t *testing.T) {
	db := setupProductReviewTestDB(t)
	service := newProductReviewTestService(db)
	productID, userID := seedProductReviewPurchase(t, db)

	review, err := service.CreateReview(productID, userID, &models.CreateReviewRequest{
		Rating:     5,
		Title:      stringPtr("Recommended goblok"),
		ReviewText: stringPtr("Akan beli lagi"),
	})
	require.NoError(t, err)
	require.Equal(t, models.ReviewStatusPending, review.Status)

	err = service.VoteHelpful(review.ID, uuid.New(), true)
	require.Error(t, err)
	require.Contains(t, err.Error(), "review is not available for voting")

	_, err = service.ModerateReview(review.ID, models.ReviewStatusApproved)
	require.NoError(t, err)

	err = service.VoteHelpful(review.ID, uuid.New(), true)
	require.NoError(t, err)

	reloaded, err := service.GetReview(review.ID)
	require.NoError(t, err)
	require.Equal(t, int64(1), reloaded.HelpfulCount)
}

func stringPtr(value string) *string {
	return &value
}
