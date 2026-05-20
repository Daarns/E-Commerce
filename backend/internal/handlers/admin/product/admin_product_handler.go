package product

import (
	"ecommerce-backend/internal/repositories"
	"ecommerce-backend/internal/services/product"
	productHandler "ecommerce-backend/internal/handlers/product"
	"ecommerce-backend/pkg/response"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// AdminProductHandler handles admin product HTTP requests
type AdminProductHandler struct {
	useCase      *product.ProductService
	tempUploadRepo *repositories.TempUploadRepository
}

// NewAdminProductHandler creates a new admin product handler
func NewAdminProductHandler(useCase *product.ProductService, tempUploadRepo *repositories.TempUploadRepository) *AdminProductHandler {
	return &AdminProductHandler{
		useCase:      useCase,
		tempUploadRepo: tempUploadRepo,
	}
}

// ============================================================
// PRODUCT — ADMIN ENDPOINTS
// ============================================================

// GET /api/v1/admin/products
func (h *AdminProductHandler) AdminListProducts(c *gin.Context) {
	filter := repositories.AdminProductFilter{
		ProductFilter: productHandler.ParseProductFilter(c),
		// Admin: status tidak dibatasi, kosong = tampilkan semua
		// Jika status diisi (e.g. ?status=draft), tetap digunakan
		IncludeDeleted: c.Query("include_deleted") == "true",
	}

	result, err := h.useCase.AdminListProducts(filter)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "LIST_FAILED", err.Error())
		return
	}

	response.Success(c, result)
}

// AdminGetProduct retrieves full product detail for admin.
// GET /api/v1/admin/products/:id/detail
func (h *AdminProductHandler) AdminGetProduct(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid product ID")
		return
	}

	result, err := h.useCase.AdminGetProduct(id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "NOT_FOUND", err.Error())
		return
	}

	audit := gin.H{
		"version":    result.Version,
		"created_at": result.CreatedAt,
		"updated_at": result.UpdatedAt,
		"deleted_at": result.DeletedAt,
	}

	response.Success(c, gin.H{
		"product": result,
		"audit":   audit,
	})
}

// CreateProduct handles product creation
// POST /api/v1/admin/products
func (h *AdminProductHandler) CreateProduct(c *gin.Context) {
	var input product.CreateProductInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	result, err := h.useCase.CreateProduct(input)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "CREATE_FAILED", err.Error())
		return
	}

	response.Created(c, result)
}

// UpdateProduct updates a product
// PUT /api/v1/admin/products/:id
func (h *AdminProductHandler) UpdateProduct(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid product ID")
		return
	}

	var input product.UpdateProductInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	result, err := h.useCase.UpdateProduct(id, input)
	if err != nil {
		if err.Error() == "product not found" {
			response.Error(c, http.StatusNotFound, "NOT_FOUND", err.Error())
			return
		}
		var conflictErr *product.ConflictError
		if errors.As(err, &conflictErr) {
			response.Error(c, http.StatusConflict, "VERSION_CONFLICT", err.Error())
			return
		}
		response.Error(c, http.StatusBadRequest, "UPDATE_FAILED", err.Error())
		return
	}

	response.Success(c, result)
}

// DeleteProduct soft deletes a product
// DELETE /api/v1/admin/products/:id
func (h *AdminProductHandler) DeleteProduct(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid product ID")
		return
	}

	if err := h.useCase.DeleteProduct(id); err != nil {
		if err.Error() == "product not found" {
			response.Error(c, http.StatusNotFound, "NOT_FOUND", err.Error())
			return
		}
		response.Error(c, http.StatusInternalServerError, "DELETE_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{"message": "Product deleted successfully"})
}


