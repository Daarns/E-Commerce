package cart

import (
	"ecommerce-backend/internal/middleware"
	"ecommerce-backend/internal/services/cart"
	"ecommerce-backend/pkg/response"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// AddressHandler handles user address HTTP requests
type AddressHandler struct {
	useCase *cart.AddressService
}

// NewAddressHandler creates a new address handler
func NewAddressHandler(useCase *cart.AddressService) *AddressHandler {
	return &AddressHandler{useCase: useCase}
}

// GetAddresses retrieves user's addresses
// GET /api/v1/addresses
func (h *AddressHandler) GetAddresses(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
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
func (h *AddressHandler) GetAddress(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
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
func (h *AddressHandler) CreateAddress(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Login required")
		return
	}

	var input cart.AddressInput
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
func (h *AddressHandler) UpdateAddress(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Login required")
		return
	}

	addressID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid address ID")
		return
	}

	var input cart.AddressInput
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
func (h *AddressHandler) DeleteAddress(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
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
func (h *AddressHandler) SetDefaultAddress(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
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
