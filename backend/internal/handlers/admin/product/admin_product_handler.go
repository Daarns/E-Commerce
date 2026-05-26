package product

import (
	productHandler "ecommerce-backend/internal/handlers/product"
	"ecommerce-backend/internal/repositories"
	"ecommerce-backend/internal/services/product"
	"ecommerce-backend/pkg/response"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// AdminProductHandler handles admin product HTTP requests
type AdminProductHandler struct {
	useCase        *product.ProductService
	tempUploadRepo *repositories.TempUploadRepository
}

// NewAdminProductHandler creates a new admin product handler
func NewAdminProductHandler(useCase *product.ProductService, tempUploadRepo *repositories.TempUploadRepository) *AdminProductHandler {
	return &AdminProductHandler{
		useCase:        useCase,
		tempUploadRepo: tempUploadRepo,
	}
}

// ============================================================
// PRODUCT — ADMIN ENDPOINTS
// ============================================================

// GET /api/v1/admin/products
func (h *AdminProductHandler) AdminListProducts(c *gin.Context) {
	productFilter := productHandler.ParseProductFilter(c)

	if status := c.Query("status"); status != "" {
		if !isAllowedAdminProductStatus(status) {
			response.Error(c, http.StatusBadRequest, "INVALID_STATUS", "Invalid product status filter")
			return
		}
		productFilter.Status = status
	}

	if stockStatus := c.Query("stock_status"); stockStatus != "" {
		if !isAllowedAdminStockStatus(stockStatus) {
			response.Error(c, http.StatusBadRequest, "INVALID_STOCK_STATUS", "Invalid stock status filter")
			return
		}
		productFilter.StockStatus = stockStatus
	}

	if sortBy := c.Query("sort_by"); sortBy != "" && !isAllowedAdminProductSort(sortBy) {
		response.Error(c, http.StatusBadRequest, "INVALID_SORT", "Invalid product sort field")
		return
	}
	if sortOrder := c.Query("sort_order"); sortOrder != "" && !isAllowedSortOrder(sortOrder) {
		response.Error(c, http.StatusBadRequest, "INVALID_SORT_ORDER", "Invalid product sort order")
		return
	}

	filter := repositories.AdminProductFilter{
		ProductFilter: productFilter,
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

func isAllowedAdminProductStatus(status string) bool {
	switch status {
	case "active", "draft", "archived":
		return true
	default:
		return false
	}
}

func isAllowedAdminStockStatus(status string) bool {
	switch status {
	case "in_stock", "low_stock", "out_of_stock":
		return true
	default:
		return false
	}
}

func isAllowedAdminProductSort(sortBy string) bool {
	switch sortBy {
	case "name", "price", "stock", "created_at":
		return true
	default:
		return false
	}
}

func isAllowedSortOrder(sortOrder string) bool {
	switch sortOrder {
	case "asc", "desc":
		return true
	default:
		return false
	}
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
