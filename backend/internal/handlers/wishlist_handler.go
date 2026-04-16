package handlers

import (
	"ecommerce-backend/internal/services"
	"ecommerce-backend/pkg/response"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// WishlistHandler handles wishlist HTTP requests
type WishlistHandler struct {
	wishlistService *services.WishlistService
}

// NewWishlistHandler creates a new wishlist handler
func NewWishlistHandler(wishlistService *services.WishlistService) *WishlistHandler {
	return &WishlistHandler{
		wishlistService: wishlistService,
	}
}

// AddToWishlist adds a product to user's wishlist
// POST /api/v1/wishlist/:productID
func (h *WishlistHandler) AddToWishlist(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_USER", "Invalid user ID")
		return
	}

	productID := c.Param("productID")
	productUUID, err := uuid.Parse(productID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_PRODUCT", "Invalid product ID format")
		return
	}

	result, err := h.wishlistService.AddToWishlist(c.Request.Context(), userUUID, productUUID)
	if err != nil {
		if err.Error() == "product not found" {
			response.Error(c, http.StatusNotFound, "PRODUCT_NOT_FOUND", "Product not found")
			return
		}
		if err.Error() == "product already in wishlist" {
			response.Error(c, http.StatusConflict, "ALREADY_IN_WISHLIST", "Product already in wishlist")
			return
		}
		response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to add to wishlist")
		return
	}

	response.Created(c, result)
}

// RemoveFromWishlist removes a product from user's wishlist
// DELETE /api/v1/wishlist/:productID
func (h *WishlistHandler) RemoveFromWishlist(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_USER", "Invalid user ID")
		return
	}

	productID := c.Param("productID")
	productUUID, err := uuid.Parse(productID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_PRODUCT", "Invalid product ID format")
		return
	}

	err = h.wishlistService.RemoveFromWishlist(c.Request.Context(), userUUID, productUUID)
	if err != nil {
		if err.Error() == "product not in wishlist" {
			response.Error(c, http.StatusNotFound, "NOT_IN_WISHLIST", "Product not in wishlist")
			return
		}
		response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to remove from wishlist")
		return
	}

	response.Success(c, gin.H{"message": "Product removed from wishlist"})
}

// GetWishlist retrieves user's wishlist
// GET /api/v1/wishlist?page=1&page_size=10
func (h *WishlistHandler) GetWishlist(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_USER", "Invalid user ID")
		return
	}

	page := getIntQueryDefault(c, "page", 1)
	pageSize := getIntQueryDefault(c, "page_size", 10)

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	result, err := h.wishlistService.GetWishlist(c.Request.Context(), userUUID, page, pageSize)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to retrieve wishlist")
		return
	}

	response.Success(c, result)
}

// CheckProduct checks if a product is in user's wishlist
// GET /api/v1/wishlist/:productID/check
func (h *WishlistHandler) CheckProduct(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_USER", "Invalid user ID")
		return
	}

	productID := c.Param("productID")
	productUUID, err := uuid.Parse(productID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_PRODUCT", "Invalid product ID format")
		return
	}

	result, err := h.wishlistService.CheckProduct(c.Request.Context(), userUUID, productUUID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to check wishlist")
		return
	}

	response.Success(c, result)
}

// GetWishlistCount returns count of items in user's wishlist
// GET /api/v1/wishlist/count
func (h *WishlistHandler) GetWishlistCount(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_USER", "Invalid user ID")
		return
	}

	result, err := h.wishlistService.GetWishlistCount(c.Request.Context(), userUUID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get wishlist count")
		return
	}

	response.Success(c, result)
}

// ClearWishlist clears all items from user's wishlist
// DELETE /api/v1/wishlist
func (h *WishlistHandler) ClearWishlist(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "User not authenticated")
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_USER", "Invalid user ID")
		return
	}

	err = h.wishlistService.ClearWishlist(c.Request.Context(), userUUID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to clear wishlist")
		return
	}

	response.Success(c, gin.H{"message": "Wishlist cleared"})
}
