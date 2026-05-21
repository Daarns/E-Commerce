package product

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
	useCase    *product.CategoryService
	productSvc *product.ProductService
}

// NewCategoryHandler creates a new category handler
func NewCategoryHandler(useCase *product.CategoryService, productSvc *product.ProductService) *CategoryHandler {
	return &CategoryHandler{useCase: useCase, productSvc: productSvc}
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

	response.Success(c, gin.H{"categories": results})
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
	
	products, err := h.productSvc.ListProducts(filter)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{
		"category": category,
		"products": products,
	})
}


