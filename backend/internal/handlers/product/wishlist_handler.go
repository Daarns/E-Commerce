package product

import (
	"ecommerce-backend/internal/services/features"
	"ecommerce-backend/internal/utils"
	"ecommerce-backend/pkg/response"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// WishlistHandler handles wishlist HTTP requests
type WishlistHandler struct {
	wishlistService *features.WishlistService
}

// NewWishlistHandler creates a new wishlist handler
func NewWishlistHandler(wishlistService *features.WishlistService) *WishlistHandler {
	return &WishlistHandler{
		wishlistService: wishlistService,
	}
}

// extractUserID extracts user_id from context, handling both UUID and string types
func (h *WishlistHandler) extractUserID(c *gin.Context) string {
	userIDVal, exists := c.Get("user_id")
	if !exists {
		return ""
	}
	
	// Try UUID type first (from auth middleware)
	if userUUID, ok := userIDVal.(uuid.UUID); ok {
		return userUUID.String()
	}
	
	// Fall back to string type
	if userStr, ok := userIDVal.(string); ok {
		return userStr
	}
	
	return ""
}

// AddToWishlist adds a product to user's wishlist or guest wishlist
// POST /api/v1/wishlist
// Body: { "product_id": "uuid" }
// Returns 201 if authenticated, 202 if guest (client handles persistence)
func (h *WishlistHandler) AddToWishlist(c *gin.Context) {
	userID := h.extractUserID(c)
	
	// Parse request body
	var req struct {
		ProductID string `json:"product_id" binding:"required,uuid"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_REQUEST", "product_id is required and must be a valid UUID")
		return
	}

	productUUID, err := uuid.Parse(req.ProductID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_PRODUCT", "Invalid product ID format")
		return
	}

	// If guest user (no authentication), return mock wishlist response
	// Frontend will handle persistence via localStorage
	if userID == "" {
		c.JSON(http.StatusAccepted, gin.H{
			"status": "success",
			"data": gin.H{
				"id":         uuid.New().String(),
				"product_id": productUUID.String(),
				"user_id":    nil,
				"created_at": time.Now(),
			},
		})
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_USER", "Invalid user ID")
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

// RemoveFromWishlist removes a product from user's wishlist or guest wishlist
// DELETE /api/v1/wishlist
// Body: { "product_id": "uuid" }
func (h *WishlistHandler) RemoveFromWishlist(c *gin.Context) {
	// Parse request body
	var req struct {
		ProductID string `json:"product_id" binding:"required,uuid"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_REQUEST", "product_id is required and must be a valid UUID")
		return
	}

	productUUID, err := uuid.Parse(req.ProductID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_PRODUCT", "Invalid product ID format")
		return
	}

	userID := h.extractUserID(c)
	
	// If guest user, just return success (frontend handles removal)
	if userID == "" {
		response.Success(c, gin.H{"message": "Product removed from wishlist"})
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_USER", "Invalid user ID")
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

// GetWishlist retrieves user's wishlist (authenticated users only)
// GET /api/v1/wishlist?page=1&page_size=10
func (h *WishlistHandler) GetWishlist(c *gin.Context) {
	userID := h.extractUserID(c)
	
	if userID == "" {
		// Return empty wishlist for guests
		response.Success(c, gin.H{
			"items":       []interface{}{},
			"total":       0,
			"page":        1,
			"page_size":   10,
			"total_pages": 0,
		})
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_USER", "Invalid user ID")
		return
	}

	page := utils.GetIntQueryDefault(c, "page", 1)
	pageSize := utils.GetIntQueryDefault(c, "page_size", 10)

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
// POST /api/v1/wishlist/check
// Body: { "product_id": "uuid" }
func (h *WishlistHandler) CheckProduct(c *gin.Context) {
	// Parse request body
	var req struct {
		ProductID string `json:"product_id" binding:"required,uuid"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_REQUEST", "product_id is required and must be a valid UUID")
		return
	}

	productUUID, err := uuid.Parse(req.ProductID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_PRODUCT", "Invalid product ID format")
		return
	}

	userID := h.extractUserID(c)
	if userID == "" {
		// Guest users always return not in wishlist
		response.Success(c, gin.H{"is_in_wishlist": false})
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_USER", "Invalid user ID")
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
	userID := h.extractUserID(c)
	if userID == "" {
		// Return 0 count for guests
		response.Success(c, gin.H{"count": 0})
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
// POST /api/v1/wishlist/clear
func (h *WishlistHandler) ClearWishlist(c *gin.Context) {
	userID := h.extractUserID(c)
	if userID == "" {
		// Return success for guests (no-op)
		response.Success(c, gin.H{"message": "Wishlist cleared"})
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


// ToggleWishlist toggles a product in user's wishlist (adds if not present, removes if present)
// POST /api/v1/wishlist/toggle
// Body: { "product_id": "uuid" }
// Returns: { "is_wishlisted": boolean, "product": Wishlist | null }
func (h *WishlistHandler) ToggleWishlist(c *gin.Context) {
	// Parse request body
	var req struct {
		ProductID string `json:"product_id" binding:"required,uuid"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
response.Error(c, http.StatusBadRequest, "INVALID_REQUEST", "product_id is required and must be a valid UUID")
return
}

productUUID, err := uuid.Parse(req.ProductID)
if err != nil {
response.Error(c, http.StatusBadRequest, "INVALID_PRODUCT", "Invalid product ID format")
return
}

userID := h.extractUserID(c)

// If guest user, return success (client handles state locally)
if userID == "" {
response.Success(c, gin.H{"is_wishlisted": true, "product": nil})
return
}

userUUID, err := uuid.Parse(userID)
if err != nil {
response.Error(c, http.StatusBadRequest, "INVALID_USER", "Invalid user ID")
return
}

// Check if product exists in wishlist
exists, err := h.wishlistService.CheckProduct(c.Request.Context(), userUUID, productUUID)
if err != nil {
response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to check wishlist")
return
}

var isWishlisted bool
var result interface{}

if exists.IsInWishlist {
	// Product is in wishlist, remove it
err = h.wishlistService.RemoveFromWishlist(c.Request.Context(), userUUID, productUUID)
if err != nil {
response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to remove from wishlist")
return
}
isWishlisted = false
result = nil
} else {
// Product not in wishlist, add it
item, err := h.wishlistService.AddToWishlist(c.Request.Context(), userUUID, productUUID)
if err != nil {
if err.Error() == "product not found" {
response.Error(c, http.StatusNotFound, "PRODUCT_NOT_FOUND", "Product not found")
return
}
response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to add to wishlist")
return
}
isWishlisted = true
result = item
}

response.Success(c, gin.H{
"is_wishlisted": isWishlisted,
"product":       result,
})
}
