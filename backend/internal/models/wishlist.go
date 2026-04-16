package models

import (
	"time"

	"github.com/google/uuid"
)

// Wishlist represents a user's wishlist item
type Wishlist struct {
	ID        uuid.UUID `gorm:"column:id;primaryKey" json:"id"`
	UserID    uuid.UUID `gorm:"column:user_id;index" json:"user_id"`
	ProductID uuid.UUID `gorm:"column:product_id;index" json:"product_id"`
	CreatedAt time.Time `gorm:"column:created_at" json:"created_at"`
}

// TableName specifies the table name for GORM
func (Wishlist) TableName() string {
	return "wishlists"
}

// WishlistResponse represents a wishlist item in API response
type WishlistResponse struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Product   *Product  `json:"product"`
	CreatedAt time.Time `json:"created_at"`
}

// WishlistListResponse represents paginated wishlist response
type WishlistListResponse struct {
	Items      []WishlistResponse `json:"items"`
	Total      int64              `json:"total"`
	Page       int                `json:"page"`
	PageSize   int                `json:"page_size"`
	TotalPages int64              `json:"total_pages"`
}

// CheckWishlistResponse represents check wishlist result
type CheckWishlistResponse struct {
	IsInWishlist bool      `json:"is_in_wishlist"`
	AddedAt      *time.Time `json:"added_at,omitempty"`
}

// WishlistCountResponse represents wishlist count
type WishlistCountResponse struct {
	Count int64 `json:"count"`
}
