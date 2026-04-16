package repositories

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupWishlistDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	db.Exec("PRAGMA foreign_keys = OFF")

	// Manually create tables to avoid UUID issues
	db.Exec(`
	CREATE TABLE wishlists (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL,
		product_id TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(user_id, product_id)
	)
	`)

	db.Exec(`CREATE INDEX idx_wishlists_user ON wishlists(user_id)`)
	db.Exec(`CREATE INDEX idx_wishlists_user_created ON wishlists(user_id, created_at DESC)`)
	db.Exec(`CREATE INDEX idx_wishlists_product ON wishlists(product_id)`)

	return db
}

func TestWishlistRepositoryAdd(t *testing.T) {
	db := setupWishlistDB(t)
	repo := NewWishlistRepository(db)

	userID := uuid.New()
	productID := uuid.New()

	wishlist, err := repo.Add(context.Background(), userID, productID)
	assert.NoError(t, err)
	assert.NotNil(t, wishlist)
	assert.Equal(t, userID, wishlist.UserID)
	assert.Equal(t, productID, wishlist.ProductID)
}

func TestWishlistRepositoryIsProductInWishlist(t *testing.T) {
	db := setupWishlistDB(t)
	repo := NewWishlistRepository(db)

	userID := uuid.New()
	productID := uuid.New()

	// Initially not in wishlist
	exists, err := repo.IsProductInWishlist(context.Background(), userID, productID)
	assert.NoError(t, err)
	assert.False(t, exists)

	// Add to wishlist
	repo.Add(context.Background(), userID, productID)

	// Now should exist
	exists, err = repo.IsProductInWishlist(context.Background(), userID, productID)
	assert.NoError(t, err)
	assert.True(t, exists)
}

func TestWishlistRepositoryCountByUserID(t *testing.T) {
	db := setupWishlistDB(t)
	repo := NewWishlistRepository(db)

	userID := uuid.New()

	// Empty count
	count, err := repo.CountByUserID(context.Background(), userID)
	assert.NoError(t, err)
	assert.Equal(t, int64(0), count)

	// Add items
	repo.Add(context.Background(), userID, uuid.New())
	count, err = repo.CountByUserID(context.Background(), userID)
	assert.NoError(t, err)
	assert.Equal(t, int64(1), count)

	repo.Add(context.Background(), userID, uuid.New())
	count, err = repo.CountByUserID(context.Background(), userID)
	assert.NoError(t, err)
	assert.Equal(t, int64(2), count)
}

func TestWishlistRepositoryRemove(t *testing.T) {
	db := setupWishlistDB(t)
	repo := NewWishlistRepository(db)

	userID := uuid.New()
	productID := uuid.New()

	// Add
	repo.Add(context.Background(), userID, productID)

	// Verify exists
	exists, err := repo.IsProductInWishlist(context.Background(), userID, productID)
	assert.NoError(t, err)
	assert.True(t, exists)

	// Remove
	err = repo.Remove(context.Background(), userID, productID)
	assert.NoError(t, err)

	// Verify removed
	exists, err = repo.IsProductInWishlist(context.Background(), userID, productID)
	assert.NoError(t, err)
	assert.False(t, exists)
}

func TestWishlistRepositoryClearByUserID(t *testing.T) {
	db := setupWishlistDB(t)
	repo := NewWishlistRepository(db)

	userID := uuid.New()
	product1ID := uuid.New()
	product2ID := uuid.New()

	// Add multiple items
	repo.Add(context.Background(), userID, product1ID)
	repo.Add(context.Background(), userID, product2ID)

	count, err := repo.CountByUserID(context.Background(), userID)
	assert.NoError(t, err)
	assert.Equal(t, int64(2), count)

	// Clear
	err = repo.ClearByUserID(context.Background(), userID)
	assert.NoError(t, err)

	count, err = repo.CountByUserID(context.Background(), userID)
	assert.NoError(t, err)
	assert.Equal(t, int64(0), count)
}

func TestWishlistRepositoryGetProductIDsByUserID(t *testing.T) {
	db := setupWishlistDB(t)
	repo := NewWishlistRepository(db)

	userID := uuid.New()
	product1ID := uuid.New()
	product2ID := uuid.New()

	repo.Add(context.Background(), userID, product1ID)
	repo.Add(context.Background(), userID, product2ID)

	productIDs, err := repo.GetProductIDsByUserID(context.Background(), userID)
	assert.NoError(t, err)
	assert.Equal(t, 2, len(productIDs))

	// Verify both products are in list
	found1, found2 := false, false
	for _, id := range productIDs {
		if id == product1ID {
			found1 = true
		}
		if id == product2ID {
			found2 = true
		}
	}
	assert.True(t, found1)
	assert.True(t, found2)
}

func TestWishlistUniqueConstraint(t *testing.T) {
	db := setupWishlistDB(t)
	repo := NewWishlistRepository(db)

	userID := uuid.New()
	productID := uuid.New()

	// First add
	_, err := repo.Add(context.Background(), userID, productID)
	assert.NoError(t, err)

	// Try to add same product again - should fail with unique constraint
	_, err = repo.Add(context.Background(), userID, productID)
	assert.Error(t, err)
}
