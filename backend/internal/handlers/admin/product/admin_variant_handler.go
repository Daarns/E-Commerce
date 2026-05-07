package product

import (
	"ecommerce-backend/internal/services/product"
	"ecommerce-backend/pkg/response"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// AddVariant adds a variant to a product
// POST /api/v1/admin/products/:id/variants
func (h *AdminProductHandler) AddVariant(c *gin.Context) {
	productID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid product ID")
		return
	}

	var input product.CreateVariantInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}
	input.ProductID = productID

	result, err := h.useCase.AddVariant(input)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "ADD_VARIANT_FAILED", err.Error())
		return
	}

	response.Created(c, result)
}

// UpdateVariant updates a product variant
// PUT /api/v1/admin/products/variants/:variantId
func (h *AdminProductHandler) UpdateVariant(c *gin.Context) {
	variantID, err := uuid.Parse(c.Param("variantId"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid variant ID")
		return
	}

	var input struct {
		VariantType     string  `json:"variant_type" binding:"required"`
		VariantValue    string  `json:"variant_value" binding:"required"`
		PriceAdjustment float64 `json:"price_adjustment"`
		StockQuantity   int     `json:"stock_quantity"`
		IsActive        bool    `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	result, err := h.useCase.UpdateVariant(variantID, input.VariantType, input.VariantValue, input.PriceAdjustment, input.StockQuantity, input.IsActive)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "UPDATE_VARIANT_FAILED", err.Error())
		return
	}

	response.Success(c, result)
}

// DeleteVariant removes a product variant
// DELETE /api/v1/admin/products/variants/:variantId
func (h *AdminProductHandler) DeleteVariant(c *gin.Context) {
	variantID, err := uuid.Parse(c.Param("variantId"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid variant ID")
		return
	}

	if err := h.useCase.RemoveVariant(variantID); err != nil {
		response.Error(c, http.StatusInternalServerError, "DELETE_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{"message": "Variant deleted successfully"})
}
