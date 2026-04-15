package handlers

import (
	"ecommerce-backend/internal/repositories"
	"ecommerce-backend/internal/services"
	"ecommerce-backend/pkg/response"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ProductHandler handles product HTTP requests
type ProductHandler struct {
	useCase *services.ProductService
}

// NewProductHandler creates a new product handler
func NewProductHandler(useCase *services.ProductService) *ProductHandler {
	return &ProductHandler{useCase: useCase}
}

// ===== PRODUCT ENDPOINTS =====

// CreateProduct handles product creation
// POST /api/v1/admin/products
func (h *ProductHandler) CreateProduct(c *gin.Context) {
	var input services.CreateProductInput
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

// GetProduct retrieves a product by ID or slug
// GET /api/v1/products/:identifier
func (h *ProductHandler) GetProduct(c *gin.Context) {
	identifier := c.Param("identifier")

	// Try parsing as UUID first
	if id, err := uuid.Parse(identifier); err == nil {
		result, err := h.useCase.GetProduct(id)
		if err != nil {
			response.Error(c, http.StatusNotFound, "NOT_FOUND", err.Error())
			return
		}
		response.Success(c, result)
		return
	}

	// Otherwise treat as slug
	result, err := h.useCase.GetProductBySlug(identifier)
	if err != nil {
		response.Error(c, http.StatusNotFound, "NOT_FOUND", err.Error())
		return
	}

	response.Success(c, result)
}

// ListProducts retrieves products with filtering
// GET /api/v1/products
func (h *ProductHandler) ListProducts(c *gin.Context) {
	filter := repositories.ProductFilter{
		Page:  1,
		Limit: 20,
	}

	// Parse query parameters
	if page, err := strconv.Atoi(c.Query("page")); err == nil && page > 0 {
		filter.Page = page
	}
	
	if limit, err := strconv.Atoi(c.Query("limit")); err == nil && limit > 0 {
		filter.Limit = limit
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

	result, err := h.useCase.ListProducts(filter)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "LIST_FAILED", err.Error())
		return
	}

	response.Success(c, result)
}

// UpdateProduct updates a product
// PUT /api/v1/admin/products/:id
func (h *ProductHandler) UpdateProduct(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid product ID")
		return
	}

	var input services.UpdateProductInput
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
		response.Error(c, http.StatusBadRequest, "UPDATE_FAILED", err.Error())
		return
	}

	response.Success(c, result)
}

// DeleteProduct soft deletes a product
// DELETE /api/v1/admin/products/:id
func (h *ProductHandler) DeleteProduct(c *gin.Context) {
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

// SearchProducts searches products
// GET /api/v1/products/search
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

	response.Success(c, results)
}

// GetRelatedProducts retrieves related products
// GET /api/v1/products/:identifier/related
func (h *ProductHandler) GetRelatedProducts(c *gin.Context) {
	identifier := c.Param("identifier")
	
	// Try parsing as UUID first
	id, err := uuid.Parse(identifier)
	if err != nil {
		// If not UUID, try to get product by slug first
		product, err := h.useCase.GetProductBySlug(identifier)
		if err != nil {
			response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid product ID or slug")
			return
		}
		id = product.ID
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

// ===== IMAGE ENDPOINTS =====

// UploadProductImage handles image upload
// POST /api/v1/admin/products/:id/images
func (h *ProductHandler) UploadProductImage(c *gin.Context) {
	productID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid product ID")
		return
	}

	// Get file from form
	file, err := c.FormFile("image")
	if err != nil {
		response.Error(c, http.StatusBadRequest, "NO_FILE", "Image file is required")
		return
	}

	// Validate file
	if err := h.useCase.ValidateImageFile(file); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_FILE", err.Error())
		return
	}

	// Create uploads directory if not exists
	uploadDir := "uploads/products"
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		response.Error(c, http.StatusInternalServerError, "UPLOAD_FAILED", "Failed to create upload directory")
		return
	}

	// Generate unique filename
	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("%s_%d%s", productID.String(), time.Now().UnixNano(), ext)
	filepath := filepath.Join(uploadDir, filename)

	// Save file
	if err := c.SaveUploadedFile(file, filepath); err != nil {
		response.Error(c, http.StatusInternalServerError, "UPLOAD_FAILED", "Failed to save image")
		return
	}

	// Create image record
	imageURL := "/" + filepath
	altText := c.PostForm("alt_text")
	position := 0
	if pos, err := strconv.Atoi(c.PostForm("position")); err == nil {
		position = pos
	}

	image, err := h.useCase.AddProductImage(productID, imageURL, altText, position)
	if err != nil {
		// Cleanup uploaded file on error
		os.Remove(filepath)
		response.Error(c, http.StatusBadRequest, "ADD_IMAGE_FAILED", err.Error())
		return
	}

	response.Created(c, image)
}

// DeleteProductImage removes an image
// DELETE /api/v1/admin/products/images/:imageId
func (h *ProductHandler) DeleteProductImage(c *gin.Context) {
	imageID, err := uuid.Parse(c.Param("imageId"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid image ID")
		return
	}

	if err := h.useCase.RemoveProductImage(imageID); err != nil {
		response.Error(c, http.StatusInternalServerError, "DELETE_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{"message": "Image deleted successfully"})
}

// ReorderProductImages reorders images
// PUT /api/v1/admin/products/:id/images/reorder
func (h *ProductHandler) ReorderProductImages(c *gin.Context) {
	productID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid product ID")
		return
	}

	var input struct {
		Positions map[string]int `json:"positions"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	// Convert string UUIDs to uuid.UUID
	positions := make(map[uuid.UUID]int)
	for idStr, pos := range input.Positions {
		id, err := uuid.Parse(idStr)
		if err != nil {
			response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid image ID: "+idStr)
			return
		}
		positions[id] = pos
	}

	if err := h.useCase.ReorderProductImages(productID, positions); err != nil {
		response.Error(c, http.StatusInternalServerError, "REORDER_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{"message": "Images reordered successfully"})
}

// ===== VARIANT ENDPOINTS =====

// AddVariant adds a variant to a product
// POST /api/v1/admin/products/:id/variants
func (h *ProductHandler) AddVariant(c *gin.Context) {
	productID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid product ID")
		return
	}

	var input services.CreateVariantInput
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
func (h *ProductHandler) UpdateVariant(c *gin.Context) {
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

// DeleteVariant removes a variant
// DELETE /api/v1/admin/products/variants/:variantId
func (h *ProductHandler) DeleteVariant(c *gin.Context) {
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
