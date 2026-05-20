package product

import (
	"ecommerce-backend/internal/middleware"
	"ecommerce-backend/internal/models"
	"ecommerce-backend/pkg/response"
	"ecommerce-backend/pkg/storage"
	"fmt"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// newImageSvc is a helper that builds an ImageService from environment variables.
// Replaces the old 3-param GCS constructor with the new SeaweedFS one.
func newImageSvc() *storage.ImageService {
	return storage.NewImageService(
		os.Getenv("SEAWEEDFS_ENDPOINT"),   // e.g. "seaweedfs:8333"
		os.Getenv("SEAWEEDFS_ACCESS_KEY"), // e.g. "your-access-key"
		os.Getenv("SEAWEEDFS_SECRET_KEY"), // e.g. "your-secret-key"
	)
}

// UploadProductImage handles single or multiple image uploads attached to a product.
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

	imageSvc := newImageSvc()

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

		// ConvertToWebP + upload to SeaweedFS (or local fallback)
		uploadResult, err := imageSvc.SaveImageToStorageWithMetadata(file)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, "SAVE_FAILED",
				fmt.Sprintf("Failed to save image %d: %v", i+1, err))
			return
		}

		productImage, err := h.useCase.AddProductImageWithMetadata(productID, uploadResult.URL, altText, position, &uploadResult.Metadata)
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
// POST /api/v1/admin/products/upload-image
func (h *AdminProductHandler) UploadImageOnly(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		file, err = c.FormFile("image")
		if err != nil {
			response.Error(c, http.StatusBadRequest, "NO_FILES", "Image file is required")
			return
		}
	}

	imageSvc := newImageSvc()

	files := []*multipart.FileHeader{file}
	if validationErrs := imageSvc.ValidateImageFiles(files); len(validationErrs) > 0 {
		var parts []string
		for _, e := range validationErrs {
			parts = append(parts, e.Error())
		}
		response.Error(c, http.StatusBadRequest, "VALIDATION_FAILED", strings.Join(parts, "; "))
		return
	}

	uploadResult, err := imageSvc.SaveImageToStorageWithMetadata(file)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "SAVE_FAILED", err.Error())
		return
	}
	imageURL := uploadResult.URL

	// Record temp upload for cleanup job (web-security: no silent failures, log warnings)
	userID, _ := middleware.GetUserID(c)
	width := uploadResult.Metadata.Width
	height := uploadResult.Metadata.Height
	aspectRatio := uploadResult.Metadata.AspectRatio
	tempUpload := &models.TempUpload{
		ID:          uuid.New(),
		ImageURL:    imageURL,
		UploadedBy:  &userID,
		Width:       &width,
		Height:      &height,
		AspectRatio: &aspectRatio,
		ExpiresAt:   time.Now().Add(2 * time.Hour),
		Claimed:     false,
		CreatedAt:   time.Now(),
	}
	if err := h.tempUploadRepo.Create(tempUpload); err != nil {
		log.Printf("warning: failed to record temp upload: %v", err)
	}

	response.Created(c, gin.H{
		"image_url":    imageURL,
		"width":        width,
		"height":       height,
		"aspect_ratio": aspectRatio,
	})
}

// DeleteProductImage removes a product image.
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

// DeleteUploadedImage removes an uploaded image by URL from temp uploads or
// committed product images, then removes the object from SeaweedFS.
// DELETE /api/v1/admin/products/images
func (h *AdminProductHandler) DeleteUploadedImage(c *gin.Context) {
	var input struct {
		ImageURL string `json:"image_url" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	if err := h.useCase.RemoveUploadedImage(input.ImageURL); err != nil {
		response.Error(c, http.StatusInternalServerError, "DELETE_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{"message": "Image deleted successfully"})
}

// ReorderProductImages reorders product images.
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
