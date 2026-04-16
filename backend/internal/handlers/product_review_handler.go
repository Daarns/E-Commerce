package handlers

import (
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/services"
	"ecommerce-backend/pkg/response"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ProductReviewHandler handles product review HTTP requests
type ProductReviewHandler struct {
	service *services.ProductReviewService
}

// NewProductReviewHandler creates a new product review handler
func NewProductReviewHandler(service *services.ProductReviewService) *ProductReviewHandler {
	return &ProductReviewHandler{service: service}
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

	productIDStr := c.Param("productID")
	productID, err := uuid.Parse(productIDStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "invalid product ID")
		return
	}

	userIDUUID, ok := userID.(uuid.UUID)
	if !ok {
		userIDUUID, _ = uuid.Parse(userID.(string))
	}

	var req models.CreateReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	review, err := h.service.CreateReview(productID, userIDUUID, &req)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "CREATE_FAILED", err.Error())
		return
	}

	response.Created(c, review)
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
	productIDStr := c.Param("productID")
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
	if ps := c.Query("page_size"); ps != "" {
		if parsed, err := strconv.Atoi(ps); err == nil {
			pageSize = parsed
		}
	}

	// Get sort param
	sortBy := models.SortByRecent
	if sort := c.Query("sort"); sort != "" {
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
		"message":     "vote recorded successfully",
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
	productIDStr := c.Param("productID")
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
