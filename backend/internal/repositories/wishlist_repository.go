package repositories

import (
	"context"
	"ecommerce-backend/internal/models"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// WishlistRepository handles wishlist data operations
type WishlistRepository struct {
	db *gorm.DB
}

// NewWishlistRepository creates a new wishlist repository
func NewWishlistRepository(db *gorm.DB) *WishlistRepository {
	return &WishlistRepository{db: db}
}

// Add adds a product to user's wishlist
func (r *WishlistRepository) Add(ctx context.Context, userID, productID uuid.UUID) (*models.Wishlist, error) {
	wishlist := &models.Wishlist{
		ID:        uuid.New(),
		UserID:    userID,
		ProductID: productID,
		CreatedAt: time.Now(),
	}

	if err := r.db.WithContext(ctx).Create(wishlist).Error; err != nil {
		return nil, err
	}

	return wishlist, nil
}

// Remove removes a product from user's wishlist
func (r *WishlistRepository) Remove(ctx context.Context, userID, productID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Where("user_id = ? AND product_id = ?", userID, productID).
		Delete(&models.Wishlist{}).
		Error
}

// GetByUserAndProduct checks if product is in user's wishlist
func (r *WishlistRepository) GetByUserAndProduct(ctx context.Context, userID, productID uuid.UUID) (*models.Wishlist, error) {
	var wishlist models.Wishlist

	if err := r.db.WithContext(ctx).
		Where("user_id = ? AND product_id = ?", userID, productID).
		First(&wishlist).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return &wishlist, nil
}

// GetByUserID retrieves all products in user's wishlist with pagination
func (r *WishlistRepository) GetByUserID(ctx context.Context, userID uuid.UUID, page, pageSize int) ([]models.Wishlist, int64, error) {
	var wishlists []models.Wishlist
	var total int64

	if err := r.db.WithContext(ctx).
		Model(&models.Wishlist{}).
		Where("user_id = ?", userID).
		Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	if err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&wishlists).Error; err != nil {
		return nil, 0, err
	}

	return wishlists, total, nil
}

// CountByUserID returns count of items in user's wishlist
func (r *WishlistRepository) CountByUserID(ctx context.Context, userID uuid.UUID) (int64, error) {
	var count int64

	if err := r.db.WithContext(ctx).
		Model(&models.Wishlist{}).
		Where("user_id = ?", userID).
		Count(&count).Error; err != nil {
		return 0, err
	}

	return count, nil
}

// ClearByUserID removes all items from user's wishlist
func (r *WishlistRepository) ClearByUserID(ctx context.Context, userID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Delete(&models.Wishlist{}).
		Error
}

// GetProductIDsByUserID returns slice of product IDs in wishlist
func (r *WishlistRepository) GetProductIDsByUserID(ctx context.Context, userID uuid.UUID) ([]uuid.UUID, error) {
	var productIDs []uuid.UUID

	if err := r.db.WithContext(ctx).
		Model(&models.Wishlist{}).
		Where("user_id = ?", userID).
		Pluck("product_id", &productIDs).Error; err != nil {
		return nil, err
	}

	return productIDs, nil
}

// DeleteByID removes a wishlist item by ID
func (r *WishlistRepository) DeleteByID(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).
		Where("id = ?", id).
		Delete(&models.Wishlist{}).
		Error
}

// GetByID retrieves a wishlist item by ID
func (r *WishlistRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Wishlist, error) {
	var wishlist models.Wishlist

	if err := r.db.WithContext(ctx).
		Where("id = ?", id).
		First(&wishlist).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return &wishlist, nil
}

// IsProductInWishlist checks if a product is in user's wishlist
func (r *WishlistRepository) IsProductInWishlist(ctx context.Context, userID, productID uuid.UUID) (bool, error) {
	var count int64

	if err := r.db.WithContext(ctx).
		Model(&models.Wishlist{}).
		Where("user_id = ? AND product_id = ?", userID, productID).
		Count(&count).Error; err != nil {
		return false, err
	}

	return count > 0, nil
}
