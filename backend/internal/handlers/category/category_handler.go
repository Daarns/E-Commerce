package category

import (
	"ecommerce-backend/internal/repositories"
	"ecommerce-backend/internal/services/product"
	"ecommerce-backend/pkg/response"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CategoryHandler handles category HTTP requests
type CategoryHandler struct {
	useCase *product.ProductService
}

// NewCategoryHandler creates a new category handler
func NewCategoryHandler(useCase *product.ProductService) *CategoryHandler {
	return &CategoryHandler{useCase: useCase}
}

// CreateCategory handles category creation
// POST /api/v1/admin/categories
func (h *CategoryHandler) CreateCategory(c *gin.Context) {
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

// GetCategory retrieves a category by ID or slug
// GET /api/v1/categories/:identifier
func (h *CategoryHandler) GetCategory(c *gin.Context) {
	identifier := c.Param("identifier")

	// Try parsing as UUID first
	if id, err := uuid.Parse(identifier); err == nil {
		result, err := h.useCase.GetCategory(id)
		if err != nil {
			response.Error(c, http.StatusNotFound, "NOT_FOUND", err.Error())
			return
		}
		response.Success(c, result)
		return
	}

	// Otherwise treat as slug
	result, err := h.useCase.GetCategoryBySlug(identifier)
	if err != nil {
		response.Error(c, http.StatusNotFound, "NOT_FOUND", err.Error())
		return
	}

	response.Success(c, result)
}

// ListCategories retrieves all categories
// GET /api/v1/categories
func (h *CategoryHandler) ListCategories(c *gin.Context) {
	results, err := h.useCase.ListCategories()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "LIST_FAILED", err.Error())
		return
	}

	response.Success(c, results)
}

// GetCategoryTree retrieves hierarchical category tree
// GET /api/v1/categories/tree
func (h *CategoryHandler) GetCategoryTree(c *gin.Context) {
	results, err := h.useCase.GetCategoryTree()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.Success(c, results)
}

// GetRootCategories retrieves root categories
// GET /api/v1/categories/root
func (h *CategoryHandler) GetRootCategories(c *gin.Context) {
	results, err := h.useCase.GetRootCategories()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.Success(c, results)
}

// GetCategoryWithProducts retrieves a category with its products
// GET /api/v1/categories/:identifier/products
func (h *CategoryHandler) GetCategoryWithProducts(c *gin.Context) {
	identifier := c.Param("identifier")

	var category interface{}
	var categoryID uuid.UUID

	// Try parsing as UUID first
	if id, err := uuid.Parse(identifier); err == nil {
		cat, err := h.useCase.GetCategory(id)
		if err != nil {
			response.Error(c, http.StatusNotFound, "NOT_FOUND", err.Error())
			return
		}
		category = cat
		categoryID = id
	} else {
		// Otherwise treat as slug
		cat, err := h.useCase.GetCategoryBySlug(identifier)
		if err != nil {
			response.Error(c, http.StatusNotFound, "NOT_FOUND", err.Error())
			return
		}
		category = cat
		categoryID = cat.ID
	}

	// Get products for this category
	filter := repositories.ProductFilter{
		CategoryID: &categoryID,
		Page:       1,
		Limit:      20,
	}
	
	products, err := h.useCase.ListProducts(filter)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{
		"category": category,
		"products": products,
	})
}

// UpdateCategory updates a category
// PUT /api/v1/admin/categories/:id
func (h *CategoryHandler) UpdateCategory(c *gin.Context) {
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
func (h *CategoryHandler) DeleteCategory(c *gin.Context) {
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

