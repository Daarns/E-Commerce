package product

import (
	"ecommerce-backend/internal/repositories"
	"ecommerce-backend/internal/services/product"
	"ecommerce-backend/pkg/response"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ProductHandler handles product HTTP requests
type ProductHandler struct {
	useCase *product.ProductService
}

// NewProductHandler creates a new product handler
func NewProductHandler(useCase *product.ProductService) *ProductHandler {
	return &ProductHandler{useCase: useCase}
}

// ParseProductFilter extracts shared ProductFilter fields from query params.
// Digunakan bersama oleh ListProducts dan AdminListProducts.
func ParseProductFilter(c *gin.Context) repositories.ProductFilter {
	filter := repositories.ProductFilter{
		Page:  1,
		Limit: 20,
	}

	if page, err := strconv.Atoi(c.Query("page")); err == nil && page > 0 {
		filter.Page = page
	}
	if limit, err := strconv.Atoi(c.Query("limit")); err == nil && limit > 0 {
		if limit > 100 {
			limit = 100 // Hard cap per domain 9 guidance
		}
		filter.Limit = limit
	}
	if cursor := c.Query("cursor"); cursor != "" {
		filter.Cursor = cursor
	}
	if categoryID := c.Query("category_id"); categoryID != "" {
		if id, err := uuid.Parse(categoryID); err == nil {
			filter.CategoryID = &id
		}
	}
	if minPrice := c.Query("min_price"); minPrice != "" {
		if price, err := strconv.ParseFloat(minPrice, 64); err == nil {
			filter.MinPrice = &price
		}
	}
	if maxPrice := c.Query("max_price"); maxPrice != "" {
		if price, err := strconv.ParseFloat(maxPrice, 64); err == nil {
			filter.MaxPrice = &price
		}
	}
	if search := c.Query("search"); search != "" {
		filter.Search = search
	}
	if status := c.Query("status"); status != "" {
		filter.Status = status
	}
	if inStock := c.Query("in_stock"); inStock != "" {
		stock := inStock == "true"
		filter.InStock = &stock
	}
	if brand := c.Query("brand"); brand != "" {
		filter.Brand = brand
	}
	filter.SortBy = c.DefaultQuery("sort_by", "created_at")
	filter.SortOrder = c.DefaultQuery("sort_order", "desc")

	return filter
}

// ============================================================
// PRODUCT — GLOBAL ENDPOINTS
// ============================================================

// GetProduct retrieves a product by ID or slug
// GET /api/v1/products/:identifier
func (h *ProductHandler) GetProduct(c *gin.Context) {
	identifier := c.Param("identifier")

	if id, err := uuid.Parse(identifier); err == nil {
		result, err := h.useCase.GetProduct(id)
		if err != nil {
			response.Error(c, http.StatusNotFound, "NOT_FOUND", err.Error())
			return
		}
		response.Success(c, result)
		return
	}

	result, err := h.useCase.GetProductBySlug(identifier)
	if err != nil {
		response.Error(c, http.StatusNotFound, "NOT_FOUND", err.Error())
		return
	}

	response.Success(c, result)
}

// ListProducts retrieves active products with filtering
// GET /api/v1/products
func (h *ProductHandler) ListProducts(c *gin.Context) {
	filter := ParseProductFilter(c)

	result, err := h.useCase.ListProducts(filter)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "LIST_FAILED", err.Error())
		return
	}

	response.Success(c, result)
}

// SearchProducts searches products by keyword
// GET /api/v1/products/search?q=...
func (h *ProductHandler) SearchProducts(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		response.Error(c, http.StatusBadRequest, "INVALID_QUERY", "Search query is required")
		return
	}

	limit := 20
	if l, err := strconv.Atoi(c.Query("limit")); err == nil && l > 0 {
		limit = l
	}

	results, err := h.useCase.SearchProducts(query, limit)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "SEARCH_FAILED", err.Error())
		return
	}

	response.Success(c, results)
}

// GetFeaturedProducts retrieves featured products
// GET /api/v1/products/featured
func (h *ProductHandler) GetFeaturedProducts(c *gin.Context) {
	limit := 10
	if l, err := strconv.Atoi(c.Query("limit")); err == nil && l > 0 {
		limit = l
	}

	results, err := h.useCase.GetFeaturedProducts(limit)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{"products": results})
}

// GetRelatedProducts retrieves related products by product ID or slug
// GET /api/v1/products/:identifier/related
func (h *ProductHandler) GetRelatedProducts(c *gin.Context) {
	identifier := c.Param("identifier")

	id, err := uuid.Parse(identifier)
	if err != nil {
		p, err := h.useCase.GetProductBySlug(identifier)
		if err != nil {
			response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid product ID or slug")
			return
		}
		id = p.ID
	}

	limit := 4
	if l, err := strconv.Atoi(c.Query("limit")); err == nil && l > 0 {
		limit = l
	}

	results, err := h.useCase.GetRelatedProducts(id, limit)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.Success(c, results)
}
