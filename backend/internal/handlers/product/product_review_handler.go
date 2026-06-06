package product

import (
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/services/product"
	"ecommerce-backend/pkg/response"
	"ecommerce-backend/pkg/storage"
	"mime/multipart"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	maxReviewImages      = 3
	maxReviewImageBytes  = 10 << 20
	maxReviewRequestBody = (maxReviewImages * maxReviewImageBytes) + (1 << 20)
)

// ProductReviewHandler handles product review HTTP requests
type ProductReviewHandler struct {
	service  *product.ProductReviewService
	imageSvc *storage.ImageService
}

// NewProductReviewHandler creates a new product review handler
func NewProductReviewHandler(service *product.ProductReviewService, imageSvc *storage.ImageService) *ProductReviewHandler {
	return &ProductReviewHandler{service: service, imageSvc: imageSvc}
}

// CreateReview godoc
// @Summary Create a product review
// @Description Create a new review for a product (verified purchase required)
// @Tags reviews
// @Accept json
// @Produce json
// @Param productID path string true "Product ID"
// @Param req body models.CreateReviewRequest true "Review data"
// @Success 201 {object} models.ProductReview
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/v1/products/{productID}/reviews [post]
func (h *ProductReviewHandler) CreateReview(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	productIDStr := reviewRouteParam(c, "productID")
	productID, err := uuid.Parse(productIDStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "invalid product ID")
		return
	}

	userIDUUID, ok := userID.(uuid.UUID)
	if !ok {
		userIDUUID, _ = uuid.Parse(userID.(string))
	}

	req, uploadedURLs, ok := h.bindCreateReviewRequest(c)
	if !ok {
		return
	}

	review, err := h.service.CreateReview(productID, userIDUUID, &req)
	if err != nil {
		h.cleanupUploadedReviewImages(uploadedURLs)
		response.Error(c, http.StatusBadRequest, "CREATE_FAILED", err.Error())
		return
	}

	response.Created(c, review)
}

func (h *ProductReviewHandler) bindCreateReviewRequest(c *gin.Context) (models.CreateReviewRequest, []string, bool) {
	contentType := c.GetHeader("Content-Type")
	if !strings.HasPrefix(contentType, "multipart/form-data") {
		var req models.CreateReviewRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			response.ValidationError(c, err.Error())
			return req, nil, false
		}
		return req, nil, true
	}

	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxReviewRequestBody)
	if err := c.Request.ParseMultipartForm(maxReviewRequestBody); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_FORM", "Review image upload is invalid or too large")
		return models.CreateReviewRequest{}, nil, false
	}

	form := c.Request.MultipartForm
	if form == nil {
		response.Error(c, http.StatusBadRequest, "INVALID_FORM", "Invalid review form")
		return models.CreateReviewRequest{}, nil, false
	}
	defer func() {
		_ = form.RemoveAll()
	}()

	rating, err := strconv.Atoi(c.PostForm("rating"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", "Rating is required")
		return models.CreateReviewRequest{}, nil, false
	}

	title := optionalFormString(c.PostForm("title"))
	reviewText := optionalFormString(c.PostForm("review_text"))
	files := reviewImageFiles(form)
	if len(files) > maxReviewImages {
		response.Error(c, http.StatusBadRequest, "TOO_MANY_REVIEW_IMAGES", "Maximum 3 review images allowed")
		return models.CreateReviewRequest{}, nil, false
	}

	if len(files) == 0 {
		return models.CreateReviewRequest{
			Rating:     rating,
			Title:      title,
			ReviewText: reviewText,
		}, nil, true
	}

	if h.imageSvc == nil {
		response.Error(c, http.StatusServiceUnavailable, "UPLOAD_UNAVAILABLE", "Image upload service is unavailable")
		return models.CreateReviewRequest{}, nil, false
	}
	if validationErrs := h.imageSvc.ValidateImageFiles(files); len(validationErrs) > 0 {
		parts := make([]string, 0, len(validationErrs))
		for _, validationErr := range validationErrs {
			parts = append(parts, validationErr.Error())
		}
		response.Error(c, http.StatusBadRequest, "VALIDATION_FAILED", strings.Join(parts, "; "))
		return models.CreateReviewRequest{}, nil, false
	}

	imageURLs := make([]string, 0, len(files))
	for _, file := range files {
		uploadResult, err := h.imageSvc.SaveImageToStorageWithMetadataInFolder(file, "reviews")
		if err != nil {
			h.cleanupUploadedReviewImages(imageURLs)
			response.Error(c, http.StatusInternalServerError, "UPLOAD_FAILED", "Failed to upload review image")
			return models.CreateReviewRequest{}, nil, false
		}
		imageURLs = append(imageURLs, uploadResult.URL)
	}

	return models.CreateReviewRequest{
		Rating:     rating,
		Title:      title,
		ReviewText: reviewText,
		ImageURLs:  imageURLs,
	}, imageURLs, true
}

// GetProductReviews godoc
// @Summary Get reviews for a product
// @Description Get all reviews for a product with pagination and sorting
// @Tags reviews
// @Produce json
// @Param productID path string true "Product ID"
// @Param page query int false "Page number (default 1)"
// @Param page_size query int false "Page size (default 10, max 100)"
// @Param sort query string false "Sort by: recent, helpful, highest_rating, lowest_rating (default recent)"
// @Success 200 {object} models.ReviewListResponse
// @Failure 400 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/v1/products/{productID}/reviews [get]
func (h *ProductReviewHandler) GetProductReviews(c *gin.Context) {
	productIDStr := reviewRouteParam(c, "productID")
	productID, err := uuid.Parse(productIDStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "invalid product ID")
		return
	}

	// Get pagination params
	page := 1
	if p := c.Query("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil {
			page = parsed
		}
	}

	pageSize := 10
	if ps := firstQueryValue(c, "page_size", "limit"); ps != "" {
		if parsed, err := strconv.Atoi(ps); err == nil {
			pageSize = parsed
		}
	}

	// Get sort param
	sortBy := models.SortByRecent
	if sort := firstQueryValue(c, "sort", "sort_by"); sort != "" {
		sortBy = models.ReviewSortBy(sort)
	}

	reviews, err := h.service.GetProductReviews(productID, page, pageSize, sortBy)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
		return
	}

	response.Success(c, reviews)
}

// UpdateReview godoc
// @Summary Update a product review
// @Description Update an existing review (only by review owner)
// @Tags reviews
// @Accept json
// @Produce json
// @Param productID path string true "Product ID"
// @Param reviewID path string true "Review ID"
// @Param req body models.UpdateReviewRequest true "Updated review data"
// @Success 200 {object} models.ProductReview
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/v1/products/{productID}/reviews/{reviewID} [put]
func (h *ProductReviewHandler) UpdateReview(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	reviewIDStr := c.Param("reviewID")
	reviewID, err := uuid.Parse(reviewIDStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "invalid review ID")
		return
	}

	userIDUUID, ok := userID.(uuid.UUID)
	if !ok {
		userIDUUID, _ = uuid.Parse(userID.(string))
	}

	var req models.UpdateReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	review, err := h.service.UpdateReview(reviewID, userIDUUID, &req)
	if err != nil {
		if err.Error() == "you can only update your own review" {
			response.Error(c, http.StatusForbidden, "FORBIDDEN", err.Error())
			return
		}
		response.Error(c, http.StatusBadRequest, "UPDATE_FAILED", err.Error())
		return
	}

	response.Success(c, review)
}

// DeleteReview godoc
// @Summary Delete a product review
// @Description Delete a review (only by review owner)
// @Tags reviews
// @Param productID path string true "Product ID"
// @Param reviewID path string true "Review ID"
// @Success 204
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/v1/products/{productID}/reviews/{reviewID} [delete]
func (h *ProductReviewHandler) DeleteReview(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	reviewIDStr := c.Param("reviewID")
	reviewID, err := uuid.Parse(reviewIDStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "invalid review ID")
		return
	}

	userIDUUID, ok := userID.(uuid.UUID)
	if !ok {
		userIDUUID, _ = uuid.Parse(userID.(string))
	}

	if err := h.service.DeleteReview(reviewID, userIDUUID); err != nil {
		if err.Error() == "you can only delete your own review" {
			response.Error(c, http.StatusForbidden, "FORBIDDEN", err.Error())
			return
		}
		response.Error(c, http.StatusBadRequest, "DELETE_FAILED", err.Error())
		return
	}

	c.Status(http.StatusNoContent)
}

// VoteHelpful godoc
// @Summary Vote on review helpfulness
// @Description Vote whether a review is helpful or not
// @Tags reviews
// @Accept json
// @Produce json
// @Param reviewID path string true "Review ID"
// @Param req body models.VoteHelpfulRequest true "Vote data (is_helpful: true/false)"
// @Success 200 {object} gin.H
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/v1/reviews/{reviewID}/helpful [post]
func (h *ProductReviewHandler) VoteHelpful(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	reviewIDStr := c.Param("reviewID")
	reviewID, err := uuid.Parse(reviewIDStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "invalid review ID")
		return
	}

	userIDUUID, ok := userID.(uuid.UUID)
	if !ok {
		userIDUUID, _ = uuid.Parse(userID.(string))
	}

	var req models.VoteHelpfulRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	if err := h.service.VoteHelpful(reviewID, userIDUUID, req.IsHelpful); err != nil {
		response.Error(c, http.StatusBadRequest, "VOTE_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{
		"message":    "vote recorded successfully",
		"is_helpful": req.IsHelpful,
	})
}

// GetReviewStats godoc
// @Summary Get review statistics for a product
// @Description Get aggregate review stats including average rating and breakdown
// @Tags reviews
// @Produce json
// @Param productID path string true "Product ID"
// @Success 200 {object} models.ReviewStatistics
// @Failure 400 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/v1/products/{productID}/review-stats [get]
func (h *ProductReviewHandler) GetReviewStats(c *gin.Context) {
	productIDStr := reviewRouteParam(c, "productID")
	productID, err := uuid.Parse(productIDStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "invalid product ID")
		return
	}

	stats, err := h.service.GetProductReviewStats(productID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "QUERY_FAILED", err.Error())
		return
	}

	response.Success(c, stats)
}

func (h *ProductReviewHandler) GetReviewEligibility(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "authentication required")
		return
	}

	productID, err := uuid.Parse(reviewRouteParam(c, "productID"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "invalid product ID")
		return
	}

	userIDUUID, ok := userID.(uuid.UUID)
	if !ok {
		userIDUUID, _ = uuid.Parse(userID.(string))
	}

	eligibility, err := h.service.GetReviewEligibility(productID, userIDUUID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "QUERY_FAILED", err.Error())
		return
	}

	response.Success(c, eligibility)
}

func (h *ProductReviewHandler) AdminListReviews(c *gin.Context) {
	page := 1
	if p := c.Query("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil {
			page = parsed
		}
	}

	pageSize := 20
	if ps := firstQueryValue(c, "page_size", "limit"); ps != "" {
		if parsed, err := strconv.Atoi(ps); err == nil {
			pageSize = parsed
		}
	}

	status := c.DefaultQuery("status", "pending")
	result, err := h.service.ListAdminReviews(status, page, pageSize)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "QUERY_FAILED", err.Error())
		return
	}

	response.Success(c, result)
}

func (h *ProductReviewHandler) AdminUpdateReviewStatus(c *gin.Context) {
	reviewID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "invalid review ID")
		return
	}

	var req models.AdminModerateReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	review, err := h.service.ModerateReview(reviewID, req.Status)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "UPDATE_FAILED", err.Error())
		return
	}

	response.Success(c, review)
}

func reviewRouteParam(c *gin.Context, name string) string {
	if value := c.Param(name); value != "" {
		return value
	}
	return c.Param("identifier")
}

func firstQueryValue(c *gin.Context, names ...string) string {
	for _, name := range names {
		if value := c.Query(name); value != "" {
			return value
		}
	}
	return ""
}

func optionalFormString(value string) *string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func reviewImageFiles(form *multipart.Form) []*multipart.FileHeader {
	files := form.File["images"]
	if len(files) == 0 {
		files = form.File["review_images"]
	}
	return files
}

func (h *ProductReviewHandler) cleanupUploadedReviewImages(imageURLs []string) {
	if h.imageSvc == nil {
		return
	}
	for _, imageURL := range imageURLs {
		if imageURL == "" {
			continue
		}
		_ = h.imageSvc.DeleteFromSeaweedFS(imageURL)
	}
}
