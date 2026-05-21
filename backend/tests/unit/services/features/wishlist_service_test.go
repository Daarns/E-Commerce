package features

import (
	"context"
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupTestDB creates an in-memory SQLite database for testing
func setupWishlistTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// Disable foreign key constraints for testing
	db.Exec("PRAGMA foreign_keys = OFF")

	// Create tables
	err = db.AutoMigrate(
		&models.Wishlist{},
		&models.Product{},
	)
	assert.NoError(t, err)

	return db
}

// createTestProduct creates a test product in database
func createTestProduct(db *gorm.DB, name string) *models.Product {
	product := &models.Product{
		ID:            uuid.New(),
		Name:          name,
		Slug:          name + "-slug",
		Description:   "Test product",
		RegularPrice:  decimal.NewFromInt(100),
		StockQuantity: 10,
		Status:        "active",
		AvgRating:     0,
		ReviewCount:   0,
		SKU:           "TEST-SKU",
	}
	db.Create(product)
	return product
}

func TestAddToWishlist(t *testing.T) {
	db := setupWishlistTestDB(t)
	userID := uuid.New()
	product := createTestProduct(db, "Test Product")

	wishlistRepo := repositories.NewWishlistRepository(db)
	productRepo := repositories.NewProductRepository(db)
	service := NewWishlistService(wishlistRepo, productRepo)

	t.Run("successfully add product to wishlist", func(t *testing.T) {
		result, err := service.AddToWishlist(context.Background(), userID, product.ID)
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, userID, result.UserID)
		assert.Equal(t, product.ID, result.Product.ID)
		assert.Equal(t, product.Name, result.Product.Name)
	})

	t.Run("error when product not found", func(t *testing.T) {
		invalidProductID := uuid.New()
		result, err := service.AddToWishlist(context.Background(), userID, invalidProductID)
		assert.Error(t, err)
		assert.Nil(t, result)
		assert.Contains(t, err.Error(), "product not found")
	})

	t.Run("error when already in wishlist", func(t *testing.T) {
		product2 := createTestProduct(db, "Product 2")
		userID2 := uuid.New()

		// First add
		_, err := service.AddToWishlist(context.Background(), userID2, product2.ID)
		assert.NoError(t, err)

		// Try to add same product again
		result, err := service.AddToWishlist(context.Background(), userID2, product2.ID)
		assert.Error(t, err)
		assert.Nil(t, result)
		assert.Contains(t, err.Error(), "already in wishlist")
	})
}

func TestRemoveFromWishlist(t *testing.T) {
	db := setupWishlistTestDB(t)
	userID := uuid.New()
	product := createTestProduct(db, "Test Product")

	wishlistRepo := repositories.NewWishlistRepository(db)
	productRepo := repositories.NewProductRepository(db)
	service := NewWishlistService(wishlistRepo, productRepo)

	t.Run("successfully remove product from wishlist", func(t *testing.T) {
		// First add
		_, err := service.AddToWishlist(context.Background(), userID, product.ID)
		assert.NoError(t, err)

		// Remove
		err = service.RemoveFromWishlist(context.Background(), userID, product.ID)
		assert.NoError(t, err)

		// Verify removed
		check, err := service.CheckProduct(context.Background(), userID, product.ID)
		assert.NoError(t, err)
		assert.False(t, check.IsInWishlist)
	})

	t.Run("error when product not in wishlist", func(t *testing.T) {
		userID2 := uuid.New()
		err := service.RemoveFromWishlist(context.Background(), userID2, product.ID)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "not in wishlist")
	})
}

func TestGetWishlist(t *testing.T) {
	db := setupWishlistTestDB(t)
	userID := uuid.New()
	product1 := createTestProduct(db, "Product 1")
	product2 := createTestProduct(db, "Product 2")
	product3 := createTestProduct(db, "Product 3")

	wishlistRepo := repositories.NewWishlistRepository(db)
	productRepo := repositories.NewProductRepository(db)
	service := NewWishlistService(wishlistRepo, productRepo)

	t.Run("retrieve empty wishlist", func(t *testing.T) {
		result, err := service.GetWishlist(context.Background(), userID, 1, 10)
		assert.NoError(t, err)
		assert.Equal(t, int64(0), result.Total)
		assert.Equal(t, 0, len(result.Items))
	})

	t.Run("retrieve wishlist with items", func(t *testing.T) {
		// Add items
		service.AddToWishlist(context.Background(), userID, product1.ID)
		service.AddToWishlist(context.Background(), userID, product2.ID)
		service.AddToWishlist(context.Background(), userID, product3.ID)

		result, err := service.GetWishlist(context.Background(), userID, 1, 10)
		assert.NoError(t, err)
		assert.Equal(t, int64(3), result.Total)
		assert.Equal(t, 3, len(result.Items))
		assert.Equal(t, 1, result.Page)
		assert.Equal(t, 10, result.PageSize)
		assert.Equal(t, int64(1), result.TotalPages)
	})

	t.Run("pagination works correctly", func(t *testing.T) {
		result, err := service.GetWishlist(context.Background(), userID, 1, 2)
		assert.NoError(t, err)
		assert.Equal(t, int64(3), result.Total)
		assert.Equal(t, 2, len(result.Items))
		assert.Equal(t, int64(2), result.TotalPages)
	})

	t.Run("respects page limits", func(t *testing.T) {
		result, err := service.GetWishlist(context.Background(), userID, 2, 2)
		assert.NoError(t, err)
		assert.Equal(t, 1, len(result.Items))
		assert.Equal(t, 2, result.Page)
	})
}

func TestCheckProduct(t *testing.T) {
	db := setupWishlistTestDB(t)
	userID := uuid.New()
	product := createTestProduct(db, "Test Product")

	wishlistRepo := repositories.NewWishlistRepository(db)
	productRepo := repositories.NewProductRepository(db)
	service := NewWishlistService(wishlistRepo, productRepo)

	t.Run("product not in wishlist", func(t *testing.T) {
		result, err := service.CheckProduct(context.Background(), userID, product.ID)
		assert.NoError(t, err)
		assert.False(t, result.IsInWishlist)
		assert.Nil(t, result.AddedAt)
	})

	t.Run("product in wishlist", func(t *testing.T) {
		service.AddToWishlist(context.Background(), userID, product.ID)

		result, err := service.CheckProduct(context.Background(), userID, product.ID)
		assert.NoError(t, err)
		assert.True(t, result.IsInWishlist)
		assert.NotNil(t, result.AddedAt)
		assert.WithinDuration(t, time.Now(), *result.AddedAt, time.Second)
	})
}

func TestGetWishlistCount(t *testing.T) {
	db := setupWishlistTestDB(t)
	userID := uuid.New()
	product1 := createTestProduct(db, "Product 1")
	product2 := createTestProduct(db, "Product 2")

	wishlistRepo := repositories.NewWishlistRepository(db)
	productRepo := repositories.NewProductRepository(db)
	service := NewWishlistService(wishlistRepo, productRepo)

	t.Run("empty wishlist count", func(t *testing.T) {
		result, err := service.GetWishlistCount(context.Background(), userID)
		assert.NoError(t, err)
		assert.Equal(t, int64(0), result.Count)
	})

	t.Run("count increases with added items", func(t *testing.T) {
		service.AddToWishlist(context.Background(), userID, product1.ID)
		result, err := service.GetWishlistCount(context.Background(), userID)
		assert.NoError(t, err)
		assert.Equal(t, int64(1), result.Count)

		service.AddToWishlist(context.Background(), userID, product2.ID)
		result, err = service.GetWishlistCount(context.Background(), userID)
		assert.NoError(t, err)
		assert.Equal(t, int64(2), result.Count)
	})
}

func TestClearWishlist(t *testing.T) {
	db := setupWishlistTestDB(t)
	userID := uuid.New()
	product1 := createTestProduct(db, "Product 1")
	product2 := createTestProduct(db, "Product 2")

	wishlistRepo := repositories.NewWishlistRepository(db)
	productRepo := repositories.NewProductRepository(db)
	service := NewWishlistService(wishlistRepo, productRepo)

	t.Run("clear empty wishlist", func(t *testing.T) {
		err := service.ClearWishlist(context.Background(), userID)
		assert.NoError(t, err)
	})

	t.Run("clear wishlist with items", func(t *testing.T) {
		service.AddToWishlist(context.Background(), userID, product1.ID)
		service.AddToWishlist(context.Background(), userID, product2.ID)

		result, err := service.GetWishlistCount(context.Background(), userID)
		assert.NoError(t, err)
		assert.Equal(t, int64(2), result.Count)

		err = service.ClearWishlist(context.Background(), userID)
		assert.NoError(t, err)

		result, err = service.GetWishlistCount(context.Background(), userID)
		assert.NoError(t, err)
		assert.Equal(t, int64(0), result.Count)
	})
}

func TestMultipleUsersWishlist(t *testing.T) {
	db := setupWishlistTestDB(t)
	user1ID := uuid.New()
	user2ID := uuid.New()
	product := createTestProduct(db, "Test Product")

	wishlistRepo := repositories.NewWishlistRepository(db)
	productRepo := repositories.NewProductRepository(db)
	service := NewWishlistService(wishlistRepo, productRepo)

	t.Run("different users have separate wishlists", func(t *testing.T) {
		// User 1 adds product
		service.AddToWishlist(context.Background(), user1ID, product.ID)

		// User 2 adds same product
		service.AddToWishlist(context.Background(), user2ID, product.ID)

		// User 1 has 1 item
		result1, err := service.GetWishlistCount(context.Background(), user1ID)
		assert.NoError(t, err)
		assert.Equal(t, int64(1), result1.Count)

		// User 2 has 1 item
		result2, err := service.GetWishlistCount(context.Background(), user2ID)
		assert.NoError(t, err)
		assert.Equal(t, int64(1), result2.Count)

		// Removing from user 1 doesn't affect user 2
		service.RemoveFromWishlist(context.Background(), user1ID, product.ID)

		check1, err := service.CheckProduct(context.Background(), user1ID, product.ID)
		assert.NoError(t, err)
		assert.False(t, check1.IsInWishlist)

		check2, err := service.CheckProduct(context.Background(), user2ID, product.ID)
		assert.NoError(t, err)
		assert.True(t, check2.IsInWishlist)
	})
}

