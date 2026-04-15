package handlers

import (
	"ecommerce-backend/internal/repositories"
	"ecommerce-backend/internal/services"
	"ecommerce-backend/pkg/response"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// AdminPromoHandler handles admin promo code HTTP requests
type AdminPromoHandler struct {
	useCase *services.PromoService
}

// NewAdminPromoHandler creates a new admin promo handler
func NewAdminPromoHandler(useCase *services.PromoService) *AdminPromoHandler {
	return &AdminPromoHandler{useCase: useCase}
}

// ===== PROMO CODE OPERATIONS =====

// CreatePromoCode handles promo code creation
// POST /api/v1/admin/promos
func (h *AdminPromoHandler) CreatePromoCode(c *gin.Context) {
	var input services.CreatePromoInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	promo, err := h.useCase.CreatePromoCode(input)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "CREATE_PROMO_FAILED", err.Error())
		return
	}

	response.Created(c, promo)
}

// GetPromoCode retrieves a promo code
// GET /api/v1/admin/promos/:id
func (h *AdminPromoHandler) GetPromoCode(c *gin.Context) {
	promoID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid promo code ID")
		return
	}

	promo, err := h.useCase.GetPromoCode(promoID)
	if err != nil {
		response.Error(c, http.StatusNotFound, "PROMO_NOT_FOUND", "Promo code not found")
		return
	}

	response.Success(c, promo)
}

// ListPromoCodes lists all promo codes with filtering
// GET /api/v1/admin/promos
func (h *AdminPromoHandler) ListPromoCodes(c *gin.Context) {
	// Parse query parameters
	code := c.Query("code")
	isActive := c.Query("is_active")
	sortBy := c.Query("sort_by")
	sortOrder := c.Query("sort_order")

	page := 1
	if p := c.Query("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}

	pageSize := 10
	if ps := c.Query("page_size"); ps != "" {
		if parsed, err := strconv.Atoi(ps); err == nil && parsed > 0 {
			pageSize = parsed
		}
	}

	var isActivePtr *bool
	if isActive == "true" {
		val := true
		isActivePtr = &val
	} else if isActive == "false" {
		val := false
		isActivePtr = &val
	}

	filter := repositories.PromoFilter{
		Code:      code,
		IsActive:  isActivePtr,
		SortBy:    sortBy,
		SortOrder: sortOrder,
		Page:      page,
		PageSize:  pageSize,
	}

	result, err := h.useCase.ListPromoCodes(filter)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "LIST_PROMO_FAILED", err.Error())
		return
	}

	response.Success(c, result)
}

// UpdatePromoCode updates a promo code
// PUT /api/v1/admin/promos/:id
func (h *AdminPromoHandler) UpdatePromoCode(c *gin.Context) {
	promoID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid promo code ID")
		return
	}

	var input services.UpdatePromoInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error())
		return
	}

	promo, err := h.useCase.UpdatePromoCode(promoID, input)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "UPDATE_PROMO_FAILED", err.Error())
		return
	}

	response.Success(c, promo)
}

// DeletePromoCode deletes a promo code
// DELETE /api/v1/admin/promos/:id
func (h *AdminPromoHandler) DeletePromoCode(c *gin.Context) {
	promoID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid promo code ID")
		return
	}

	err = h.useCase.DeletePromoCode(promoID)
	if err != nil {
		response.Error(c, http.StatusNotFound, "PROMO_NOT_FOUND", "Promo code not found")
		return
	}

	response.SuccessWithMessage(c, http.StatusOK, "Promo code deleted successfully", nil)
}

