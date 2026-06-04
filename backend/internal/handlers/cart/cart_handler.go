package cart

import (
	"ecommerce-backend/internal/middleware"
	"ecommerce-backend/internal/services/cart"
	"ecommerce-backend/pkg/response"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CartHandler handles cart HTTP requests
type CartHandler struct {
	useCase *cart.CartService
}

// NewCartHandler creates a new cart handler
func NewCartHandler(useCase *cart.CartService) *CartHandler {
	return &CartHandler{useCase: useCase}
}

// ===== CART ENDPOINTS =====

// GetCart retrieves the current cart
// GET /api/v1/cart
func (h *CartHandler) GetCart(c *gin.Context) {
	userID, sessionID := h.getCartIdentifiers(c)

	result, err := h.useCase.GetCart(userID, sessionID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "GET_CART_FAILED", err.Error())
		return
	}

	response.Success(c, result)
}

// AddToCart adds an item to the cart
// POST /api/v1/cart/items
func (h *CartHandler) AddToCart(c *gin.Context) {
	userID, sessionID := h.getCartIdentifiers(c)

	var input struct {
		ProductID     uuid.UUID  `json:"product_id" binding:"required"`
		CombinationID *uuid.UUID `json:"combination_id"`
		Quantity      int        `json:"quantity" binding:"required,min=1"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	combinationID := input.CombinationID

	addInput := cart.AddToCartInput{
		UserID:        userID,
		SessionID:     sessionID,
		ProductID:     input.ProductID,
		CombinationID: combinationID,
		Quantity:      input.Quantity,
	}

	result, err := h.useCase.AddToCart(addInput)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "ADD_TO_CART_FAILED", err.Error())
		return
	}

	response.Created(c, result)
}

// UpdateCartItem updates cart item quantity
// PUT /api/v1/cart/items/:itemId
func (h *CartHandler) UpdateCartItem(c *gin.Context) {
	userID, sessionID := h.getCartIdentifiers(c)

	itemID, err := uuid.Parse(c.Param("itemId"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid cart item ID")
		return
	}

	var input struct {
		Quantity int `json:"quantity" binding:"required,min=0"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	result, err := h.useCase.UpdateCartItem(itemID, input.Quantity, userID, sessionID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "UPDATE_CART_FAILED", err.Error())
		return
	}

	response.Success(c, result)
}

// RemoveFromCart removes an item from cart
// DELETE /api/v1/cart/items/:itemId
func (h *CartHandler) RemoveFromCart(c *gin.Context) {
	userID, sessionID := h.getCartIdentifiers(c)

	itemID, err := uuid.Parse(c.Param("itemId"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid cart item ID")
		return
	}

	result, err := h.useCase.RemoveFromCart(itemID, userID, sessionID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "REMOVE_FAILED", err.Error())
		return
	}

	response.Success(c, result)
}

// ClearCart clears all items from cart
// DELETE /api/v1/cart
func (h *CartHandler) ClearCart(c *gin.Context) {
	userID, sessionID := h.getCartIdentifiers(c)

	if err := h.useCase.ClearCart(userID, sessionID); err != nil {
		response.Error(c, http.StatusInternalServerError, "CLEAR_CART_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{"message": "Cart cleared successfully"})
}

// MergeGuestCart merges guest cart into user cart after login
// POST /api/v1/cart/merge
func (h *CartHandler) MergeGuestCart(c *gin.Context) {
	uid, err := middleware.GetUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Login required")
		return
	}

	var input struct {
		SessionID string `json:"session_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	result, err := h.useCase.MergeGuestCart(uid, input.SessionID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "MERGE_FAILED", err.Error())
		return
	}

	response.Success(c, result)
}

// GetCartSummary returns cart summary
// GET /api/v1/cart/summary
func (h *CartHandler) GetCartSummary(c *gin.Context) {
	userID, sessionID := h.getCartIdentifiers(c)

	result, err := h.useCase.GetCartSummary(userID, sessionID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "GET_SUMMARY_FAILED", err.Error())
		return
	}

	response.Success(c, result)
}

// RefreshCartPrices updates cart prices to current prices
// POST /api/v1/cart/refresh
func (h *CartHandler) RefreshCartPrices(c *gin.Context) {
	userID, sessionID := h.getCartIdentifiers(c)

	result, err := h.useCase.RefreshCartPrices(userID, sessionID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "REFRESH_FAILED", err.Error())
		return
	}

	response.Success(c, result)
}

// ===== HELPER METHODS =====

// getCartIdentifiers extracts user ID or session ID from context
func (h *CartHandler) getCartIdentifiers(c *gin.Context) (*uuid.UUID, string) {
	// Try to get user ID from auth context (set by middleware as uuid.UUID)
	if userIDVal, exists := c.Get("user_id"); exists {
		if userID, ok := userIDVal.(uuid.UUID); ok {
			return &userID, ""
		}
	}

	// Fall back to session ID for guest users
	sessionID := c.GetHeader("X-Session-ID")
	if sessionID == "" {
		sessionID = c.Query("session_id")
	}

	return nil, sessionID
}

// getIntQuery gets integer query parameter with default
func getIntQuery(c *gin.Context, key string, defaultValue int) int {
	if val := c.Query(key); val != "" {
		if intVal, err := strconv.Atoi(val); err == nil {
			return intVal
		}
	}
	return defaultValue
}
