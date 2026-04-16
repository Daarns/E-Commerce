package services

import (
	"context"
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	"fmt"

	"github.com/google/uuid"
)

// WishlistService handles wishlist business logic
type WishlistService struct {
	wishlistRepo *repositories.WishlistRepository
	productRepo  *repositories.ProductRepository
}

// NewWishlistService creates a new wishlist service
func NewWishlistService(
	wishlistRepo *repositories.WishlistRepository,
	productRepo *repositories.ProductRepository,
) *WishlistService {
	return &WishlistService{
		wishlistRepo: wishlistRepo,
		productRepo:  productRepo,
	}
}

// AddToWishlist adds a product to user's wishlist
// Returns error if product doesn't exist or already in wishlist
func (s *WishlistService) AddToWishlist(ctx context.Context, userID, productID uuid.UUID) (*models.WishlistResponse, error) {
	// Check if product exists
	product, err := s.productRepo.GetByID(productID)
	if err != nil {
		return nil, fmt.Errorf("failed to check product: %w", err)
	}
	if product == nil {
		return nil, fmt.Errorf("product not found")
	}

	// Check if already in wishlist
	exists, err := s.wishlistRepo.IsProductInWishlist(ctx, userID, productID)
	if err != nil {
		return nil, fmt.Errorf("failed to check wishlist: %w", err)
	}
	if exists {
		return nil, fmt.Errorf("product already in wishlist")
	}

	// Add to wishlist
	wishlist, err := s.wishlistRepo.Add(ctx, userID, productID)
	if err != nil {
		return nil, err
	}

	// Convert to response
	return &models.WishlistResponse{
		ID:        wishlist.ID,
		UserID:    wishlist.UserID,
		Product:   convertProductToWishlistDisplay(product),
		CreatedAt: wishlist.CreatedAt,
	}, nil
}

// RemoveFromWishlist removes a product from user's wishlist
func (s *WishlistService) RemoveFromWishlist(ctx context.Context, userID, productID uuid.UUID) error {
	// Check if in wishlist first
	wishlist, err := s.wishlistRepo.GetByUserAndProduct(ctx, userID, productID)
	if err != nil {
		return fmt.Errorf("failed to check wishlist: %w", err)
	}
	if wishlist == nil {
		return fmt.Errorf("product not in wishlist")
	}

	return s.wishlistRepo.Remove(ctx, userID, productID)
}

// GetWishlist retrieves user's wishlist with pagination
func (s *WishlistService) GetWishlist(ctx context.Context, userID uuid.UUID, page, pageSize int) (*models.WishlistListResponse, error) {
	wishlists, total, err := s.wishlistRepo.GetByUserID(ctx, userID, page, pageSize)
	if err != nil {
		return nil, err
	}

	items := make([]models.WishlistResponse, 0, len(wishlists))
	for _, w := range wishlists {
		// Get product details
		product, err := s.productRepo.GetByID(w.ProductID)
		if err != nil {
			continue // Skip if product fetch fails
		}
		if product == nil {
			continue // Skip if product deleted
		}

		items = append(items, models.WishlistResponse{
			ID:        w.ID,
			UserID:    w.UserID,
			Product:   convertProductToWishlistDisplay(product),
			CreatedAt: w.CreatedAt,
		})
	}

	totalPages := (total + int64(pageSize) - 1) / int64(pageSize)
	if totalPages == 0 {
		totalPages = 1
	}

	return &models.WishlistListResponse{
		Items:      items,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

// CheckProduct checks if a product is in user's wishlist
func (s *WishlistService) CheckProduct(ctx context.Context, userID, productID uuid.UUID) (*models.CheckWishlistResponse, error) {
	wishlist, err := s.wishlistRepo.GetByUserAndProduct(ctx, userID, productID)
	if err != nil {
		return nil, err
	}

	response := &models.CheckWishlistResponse{
		IsInWishlist: wishlist != nil,
	}

	if wishlist != nil {
		response.AddedAt = &wishlist.CreatedAt
	}

	return response, nil
}

// GetWishlistCount returns count of items in user's wishlist
func (s *WishlistService) GetWishlistCount(ctx context.Context, userID uuid.UUID) (*models.WishlistCountResponse, error) {
	count, err := s.wishlistRepo.CountByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	return &models.WishlistCountResponse{Count: count}, nil
}

// ClearWishlist removes all items from user's wishlist
func (s *WishlistService) ClearWishlist(ctx context.Context, userID uuid.UUID) error {
	return s.wishlistRepo.ClearByUserID(ctx, userID)
}

// Helper function to convert Product to Product struct (no conversion needed)
func convertProductToWishlistDisplay(product *models.Product) *models.Product {
	if product == nil {
		return nil
	}
	return product
}
