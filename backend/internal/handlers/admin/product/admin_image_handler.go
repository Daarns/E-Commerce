package product

import (
	"ecommerce-backend/internal/models"
	"ecommerce-backend/pkg/response"
	"ecommerce-backend/pkg/storage"
	"fmt"
	"mime/multipart"
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// UploadProductImage handles single or multiple image uploads attached to a product
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

	// Build ImageService — reads GCS config from env, falls back to local storage
	imageSvc := storage.NewImageService(
		os.Getenv("GCS_BUCKET_NAME"),
		os.Getenv("GCS_PROJECT_ID"),
		os.Getenv("GCS_CREDENTIAL_FILE"),
	)

	if validationErrs := imageSvc.ValidateImageFiles(files); len(validationErrs) > 0 {
		var parts []string
		for _, e := range validationErrs {
			parts = append(parts, e.Error())
		}
		response.Error(c, http.StatusBadRequest, "VALIDATION_FAILED", strings.Join(parts, "; "))
		return
	}

	var uploadedImages []*models.ProductImage

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

		// ConvertToWebP + upload (GCS or local)
		imageURL, err := imageSvc.SaveImageToStorage(file)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, "SAVE_FAILED",
				fmt.Sprintf("Failed to save image %d: %v", i+1, err))
			return
		}

		productImage, err := h.useCase.AddProductImage(productID, imageURL, altText, position)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, "DATABASE_FAILED",
				fmt.Sprintf("Failed to save image record %d: %v", i+1, err))
			return
		}

		uploadedImages = append(uploadedImages, productImage)
	}

	response.Created(c, gin.H{
		"message": fmt.Sprintf("Successfully uploaded %d image(s)", len(uploadedImages)),
		"images":  uploadedImages,
	})
}

// UploadImageOnly handles a single image upload without attaching it to a product.
// This is useful for WYSIWYG editors or standalone image uploads (like product creation before saving).
// POST /api/v1/admin/products/upload-image
func (h *AdminProductHandler) UploadImageOnly(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		// Fallback check for "image" field
		file, err = c.FormFile("image")
		if err != nil {
			response.Error(c, http.StatusBadRequest, "NO_FILES", "Image file is required")
			return
		}
	}

	imageSvc := storage.NewImageService(
		os.Getenv("GCS_BUCKET_NAME"),
		os.Getenv("GCS_PROJECT_ID"),
		os.Getenv("GCS_CREDENTIAL_FILE"),
	)

	files := []*multipart.FileHeader{file}
	if validationErrs := imageSvc.ValidateImageFiles(files); len(validationErrs) > 0 {
		var parts []string
		for _, e := range validationErrs {
			parts = append(parts, e.Error())
		}
		response.Error(c, http.StatusBadRequest, "VALIDATION_FAILED", strings.Join(parts, "; "))
		return
	}

	imageURL, err := imageSvc.SaveImageToStorage(file)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "SAVE_FAILED", err.Error())
		return
	}

	response.Created(c, gin.H{
		"image_url": imageURL,
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
