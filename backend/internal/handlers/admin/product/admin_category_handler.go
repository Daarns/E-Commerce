package product

import (
	"ecommerce-backend/internal/services/product"
	"ecommerce-backend/pkg/response"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// AdminCategoryHandler handles admin category HTTP requests
type AdminCategoryHandler struct {
	useCase *product.ProductService
}

// NewAdminCategoryHandler creates a new admin category handler
func NewAdminCategoryHandler(useCase *product.ProductService) *AdminCategoryHandler {
	return &AdminCategoryHandler{useCase: useCase}
}

// CreateCategory handles category creation
// POST /api/v1/admin/categories
func (h *AdminCategoryHandler) CreateCategory(c *gin.Context) {
	var input product.CreateCategoryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	result, err := h.useCase.CreateCategory(input)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "CREATE_FAILED", err.Error())
		return
	}

	response.Created(c, result)
}

// UpdateCategory updates a category
// PUT /api/v1/admin/categories/:id
func (h *AdminCategoryHandler) UpdateCategory(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid category ID")
		return
	}

	var input product.UpdateCategoryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	result, err := h.useCase.UpdateCategory(id, input)
	if err != nil {
		if err.Error() == "category not found" {
			response.Error(c, http.StatusNotFound, "NOT_FOUND", err.Error())
			return
		}
		response.Error(c, http.StatusBadRequest, "UPDATE_FAILED", err.Error())
		return
	}

	response.Success(c, result)
}

// DeleteCategory soft deletes a category
// DELETE /api/v1/admin/categories/:id
func (h *AdminCategoryHandler) DeleteCategory(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid category ID")
		return
	}

	if err := h.useCase.DeleteCategory(id); err != nil {
		if err.Error() == "category not found" {
			response.Error(c, http.StatusNotFound, "NOT_FOUND", err.Error())
			return
		}
		response.Error(c, http.StatusBadRequest, "DELETE_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{"message": "Category deleted successfully"})
}
