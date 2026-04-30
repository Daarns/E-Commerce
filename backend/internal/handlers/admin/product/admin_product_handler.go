package product

import (
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	"ecommerce-backend/pkg/storage"
	"ecommerce-backend/internal/services/product"
	productHandler "ecommerce-backend/internal/handlers/product"
	"ecommerce-backend/pkg/response"
	"fmt"
	"mime/multipart"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// AdminProductHandler handles admin product HTTP requests
type AdminProductHandler struct {
	useCase *product.ProductService
}

// NewAdminProductHandler creates a new admin product handler
func NewAdminProductHandler(useCase *product.ProductService) *AdminProductHandler {
	return &AdminProductHandler{useCase: useCase}
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

// ============================================================
// IMAGE — ADMIN ENDPOINTS
// ============================================================

// UploadProductImage handles single or multiple image uploads
// POST /api/v1/admin/products/:id/images
func (h *AdminProductHandler) UploadProductImage(c *gin.Context) {
	productID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid product ID")
		return
	}

	_, err = h.useCase.GetProduct(productID)
	if err != nil {
		response.Error(c, http.StatusNotFound, "PRODUCT_NOT_FOUND", "Product not found")
		return
	}

	form, err := c.MultipartForm()
	if err != nil {
		response.Error(c, http.StatusBadRequest, "NO_FILES", "No image files provided")
		return
	}

	files := form.File["images"]
	if len(files) == 0 {
		file, err := c.FormFile("image")
		if err != nil {
			response.Error(c, http.StatusBadRequest, "NO_FILES", "At least one image file is required")
			return
		}
		files = []*multipart.FileHeader{file}
	}

	imageService := storage.NewImageService("")
	if validationErrs := imageService.ValidateImageFiles(files); len(validationErrs) > 0 {
		errMsg := ""
		for _, e := range validationErrs {
			errMsg += e.Error() + "; "
		}
		response.Error(c, http.StatusBadRequest, "VALIDATION_FAILED", strings.TrimSuffix(errMsg, "; "))
		return
	}

	var uploadedImages []*models.ProductImage
	var uploadedFilePaths []string

	for i, file := range files {
		altTexts := form.Value["alt_text"]
		altText := ""
		if i < len(altTexts) {
			altText = altTexts[i]
		}

		positions := form.Value["position"]
		position := i
		if i < len(positions) {
			if pos, err := strconv.Atoi(positions[i]); err == nil {
				position = pos
			}
		}

		optimizedData, _, err := imageService.OptimizeImage(file, 2000, 2000)
		if err != nil {
			for _, path := range uploadedFilePaths {
				os.Remove(path)
			}
			response.Error(c, http.StatusInternalServerError, "OPTIMIZATION_FAILED",
				fmt.Sprintf("Failed to optimize image %d: %v", i+1, err))
			return
		}

		imageURL, err := imageService.SaveImageToStorage(optimizedData, file.Filename)
		if err != nil {
			for _, path := range uploadedFilePaths {
				os.Remove(path)
			}
			response.Error(c, http.StatusInternalServerError, "SAVE_FAILED",
				fmt.Sprintf("Failed to save image %d: %v", i+1, err))
			return
		}

		uploadedFilePaths = append(uploadedFilePaths, imageURL)

		image, err := h.useCase.AddProductImage(productID, imageURL, altText, position)
		if err != nil {
			for _, path := range uploadedFilePaths {
				os.Remove(path)
			}
			response.Error(c, http.StatusInternalServerError, "DATABASE_FAILED",
				fmt.Sprintf("Failed to save image record %d: %v", i+1, err))
			return
		}

		uploadedImages = append(uploadedImages, image)
	}

	response.Created(c, gin.H{
		"message": fmt.Sprintf("Successfully uploaded %d image(s)", len(uploadedImages)),
		"images":  uploadedImages,
	})
}

// DeleteProductImage removes a product image
// DELETE /api/v1/admin/products/images/:imageId
func (h *AdminProductHandler) DeleteProductImage(c *gin.Context) {
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

// ReorderProductImages reorders product images
// PUT /api/v1/admin/products/:id/images/reorder
func (h *AdminProductHandler) ReorderProductImages(c *gin.Context) {
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

// ============================================================
// VARIANT — ADMIN ENDPOINTS
// ============================================================

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
