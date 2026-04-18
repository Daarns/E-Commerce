package cart

import (
	"ecommerce-backend/internal/services"
	"ecommerce-backend/pkg/response"
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CartHandler handles cart HTTP requests
type CartHandler struct {
	useCase *services.CartService
}

// NewCartHandler creates a new cart handler
func NewCartHandler(useCase *services.CartService) *CartHandler {
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
		ProductID uuid.UUID  `json:"product_id" binding:"required"`
		VariantID *uuid.UUID `json:"variant_id"`
		Quantity  int        `json:"quantity" binding:"required,min=1"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	addInput := services.AddToCartInput{
		UserID:    userID,
		SessionID: sessionID,
		ProductID: input.ProductID,
		VariantID: input.VariantID,
		Quantity:  input.Quantity,
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
	userID := c.GetString("user_id")
	if userID == "" {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Login required")
		return
	}

	uid, _ := uuid.Parse(userID)

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

// ===== ADDRESS ENDPOINTS =====

// GetAddresses retrieves user's addresses
// GET /api/v1/addresses
func (h *CartHandler) GetAddresses(c *gin.Context) {
	userID, err := h.getUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Login required")
		return
	}

	addresses, err := h.useCase.GetUserAddresses(userID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "GET_ADDRESSES_FAILED", err.Error())
		return
	}

	response.Success(c, addresses)
}

// GetAddress retrieves a specific address
// GET /api/v1/addresses/:id
func (h *CartHandler) GetAddress(c *gin.Context) {
	userID, err := h.getUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Login required")
		return
	}

	addressID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid address ID")
		return
	}

	address, err := h.useCase.GetAddress(addressID, userID)
	if err != nil {
		response.Error(c, http.StatusNotFound, "NOT_FOUND", err.Error())
		return
	}

	response.Success(c, address)
}

// CreateAddress creates a new address
// POST /api/v1/addresses
func (h *CartHandler) CreateAddress(c *gin.Context) {
	userID, err := h.getUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Login required")
		return
	}

	var input services.AddressInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	address, err := h.useCase.AddAddress(userID, input)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "CREATE_ADDRESS_FAILED", err.Error())
		return
	}

	response.Created(c, address)
}

// UpdateAddress updates an address
// PUT /api/v1/addresses/:id
func (h *CartHandler) UpdateAddress(c *gin.Context) {
	userID, err := h.getUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Login required")
		return
	}

	addressID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid address ID")
		return
	}

	var input services.AddressInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	address, err := h.useCase.UpdateAddress(addressID, userID, input)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "UPDATE_ADDRESS_FAILED", err.Error())
		return
	}

	response.Success(c, address)
}

// DeleteAddress deletes an address
// DELETE /api/v1/addresses/:id
func (h *CartHandler) DeleteAddress(c *gin.Context) {
	userID, err := h.getUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Login required")
		return
	}

	addressID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid address ID")
		return
	}

	if err := h.useCase.DeleteAddress(addressID, userID); err != nil {
		response.Error(c, http.StatusBadRequest, "DELETE_ADDRESS_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{"message": "Address deleted successfully"})
}

// SetDefaultAddress sets an address as default
// PUT /api/v1/addresses/:id/default
func (h *CartHandler) SetDefaultAddress(c *gin.Context) {
	userID, err := h.getUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Login required")
		return
	}

	addressID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid address ID")
		return
	}

	if err := h.useCase.SetDefaultAddress(addressID, userID); err != nil {
		response.Error(c, http.StatusBadRequest, "SET_DEFAULT_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{"message": "Default address updated"})
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

// getUserID extracts authenticated user ID
func (h *CartHandler) getUserID(c *gin.Context) (uuid.UUID, error) {
	if userIDVal, exists := c.Get("user_id"); exists {
		if userID, ok := userIDVal.(uuid.UUID); ok {
			return userID, nil
		}
	}
	return uuid.Nil, errors.New("user not authenticated")
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

