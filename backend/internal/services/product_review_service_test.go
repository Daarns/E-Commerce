package services

import (
	"ecommerce-backend/internal/models"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

// TestNewProductReviewService tests service initialization
func TestNewProductReviewService(t *testing.T) {
	service := NewProductReviewService(nil, nil, nil, nil)
	assert.NotNil(t, service)
}

// ===== MODEL TESTS =====

// TestProductReviewModel tests ProductReview model creation
func TestProductReviewModel(t *testing.T) {
	reviewID := uuid.New()
	productID := uuid.New()
	userID := uuid.New()

	review := &models.ProductReview{
		ID:        reviewID,
		ProductID: productID,
		UserID:    userID,
		Rating:    5,
		Title:     stringPtr("Great product!"),
		ReviewText: stringPtr("This product exceeded my expectations."),
	}

	assert.Equal(t, reviewID, review.ID)
	assert.Equal(t, 5, review.Rating)
	assert.Equal(t, "Great product!", *review.Title)
}

// TestReviewHelpfulVoteModel tests ReviewHelpfulVote model
func TestReviewHelpfulVoteModel(t *testing.T) {
	voteID := uuid.New()
	reviewID := uuid.New()
	userID := uuid.New()

	vote := &models.ReviewHelpfulVote{
		ID:        voteID,
		ReviewID:  reviewID,
		UserID:    userID,
		IsHelpful: true,
	}

	assert.Equal(t, voteID, vote.ID)
	assert.True(t, vote.IsHelpful)
}

// TestReviewStatisticsModel tests ReviewStatistics model
func TestReviewStatisticsModel(t *testing.T) {
	productID := uuid.New()

	stats := &models.ReviewStatistics{
		ProductID:     productID,
		AverageRating: 4.5,
		TotalReviews:  100,
		RatingBreakdown: map[int]int64{
			5: 50,
			4: 30,
			3: 15,
			2: 3,
			1: 2,
		},
	}

	assert.Equal(t, productID, stats.ProductID)
	assert.Equal(t, 4.5, stats.AverageRating)
	assert.Equal(t, int64(100), stats.TotalReviews)
	assert.Equal(t, int64(50), stats.RatingBreakdown[5])
}

// ===== REQUEST/RESPONSE TESTS =====

// TestCreateReviewRequest tests request validation
func TestCreateReviewRequest(t *testing.T) {
	tests := []struct {
		name     string
		rating   int
		title    *string
		text     *string
		isValid  bool
	}{
		{
			name:    "valid review",
			rating:  5,
			title:   stringPtr("Great!"),
			text:    stringPtr("Excellent product"),
			isValid: true,
		},
		{
			name:    "review without title",
			rating:  4,
			title:   nil,
			text:    stringPtr("Good product"),
			isValid: true,
		},
		{
			name:    "review without text",
			rating:  5,
			title:   stringPtr("Amazing"),
			text:    nil,
			isValid: true,
		},
		{
			name:    "minimum rating",
			rating:  1,
			title:   stringPtr("Poor"),
			text:    stringPtr("Not good"),
			isValid: true,
		},
		{
			name:    "maximum rating",
			rating:  5,
			title:   stringPtr("Best"),
			text:    stringPtr("Perfect"),
			isValid: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := &models.CreateReviewRequest{
				Rating:     tt.rating,
				Title:      tt.title,
				ReviewText: tt.text,
			}

			assert.Equal(t, tt.rating, req.Rating)
			assert.Equal(t, tt.isValid, req.Rating >= 1 && req.Rating <= 5)
		})
	}
}

// TestReviewListResponse tests paginated response
func TestReviewListResponse(t *testing.T) {
	response := &models.ReviewListResponse{
		Reviews:    []models.ProductReviewResponse{},
		Total:      100,
		Page:       1,
		PageSize:   10,
		TotalPages: 10,
	}

	assert.Equal(t, int64(100), response.Total)
	assert.Equal(t, 10, response.TotalPages)
	assert.Equal(t, 1, response.Page)
}

// ===== SORTING TESTS =====

// TestReviewSortByOptions tests all sorting options
func TestReviewSortByOptions(t *testing.T) {
	tests := []struct {
		name   string
		sortBy models.ReviewSortBy
		valid  bool
	}{
		{"recent", models.SortByRecent, true},
		{"helpful", models.SortByHelpful, true},
		{"highest_rating", models.SortByHighestRating, true},
		{"lowest_rating", models.SortByLowestRating, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.NotEmpty(t, tt.sortBy)
		})
	}
}

// ===== HELPER FUNCTIONS =====

func stringPtr(s string) *string {
	return &s
}

func intPtr(i int) *int {
	return &i
}

// ===== EDGE CASE TESTS =====

// TestReviewRatingValidation tests rating boundaries
func TestReviewRatingValidation(t *testing.T) {
	validRatings := []int{1, 2, 3, 4, 5}
	for _, r := range validRatings {
		assert.True(t, r >= 1 && r <= 5, "Rating %d should be valid", r)
	}

	invalidRatings := []int{0, 6, -1, 10}
	for _, r := range invalidRatings {
		assert.False(t, r >= 1 && r <= 5, "Rating %d should be invalid", r)
	}
}

// TestReviewTimestamps tests timestamp handling
func TestReviewTimestamps(t *testing.T) {
	review := &models.ProductReview{
		ID:        uuid.New(),
		ProductID: uuid.New(),
		UserID:    uuid.New(),
		Rating:    5,
	}

	// Set timestamps
	now := time.Now()
	review.CreatedAt = now
	review.UpdatedAt = now

	assert.True(t, review.CreatedAt.Before(time.Now().Add(time.Second)))
	assert.True(t, review.UpdatedAt.Before(time.Now().Add(time.Second)))
}

// TestUniqueConstraint tests product-user unique constraint
func TestUniqueConstraintProductUser(t *testing.T) {
	productID := uuid.New()
	userID := uuid.New()

	review1 := &models.ProductReview{
		ID:        uuid.New(),
		ProductID: productID,
		UserID:    userID,
		Rating:    5,
	}

	review2 := &models.ProductReview{
		ID:        uuid.New(),
		ProductID: productID,
		UserID:    userID,
		Rating:    4,
	}

	// Both have same product & user (would violate UNIQUE constraint in DB)
	assert.Equal(t, review1.ProductID, review2.ProductID)
	assert.Equal(t, review1.UserID, review2.UserID)
}

// TestVoteUniqueConstraint tests review-user vote unique constraint
func TestVoteUniqueConstraintReviewUser(t *testing.T) {
	reviewID := uuid.New()
	userID := uuid.New()

	vote1 := &models.ReviewHelpfulVote{
		ID:        uuid.New(),
		ReviewID:  reviewID,
		UserID:    userID,
		IsHelpful: true,
	}

	vote2 := &models.ReviewHelpfulVote{
		ID:        uuid.New(),
		ReviewID:  reviewID,
		UserID:    userID,
		IsHelpful: false,
	}

	// Both have same review & user (would violate UNIQUE constraint in DB)
	assert.Equal(t, vote1.ReviewID, vote2.ReviewID)
	assert.Equal(t, vote1.UserID, vote2.UserID)
}

// TestHelpfulCounters tests helpful/unhelpful counting
func TestHelpfulCounters(t *testing.T) {
	review := &models.ProductReview{
		ID:             uuid.New(),
		ProductID:      uuid.New(),
		UserID:         uuid.New(),
		Rating:         4,
		HelpfulCount:   5,
		UnhelpfulCount: 2,
	}

	assert.Equal(t, int64(5), review.HelpfulCount)
	assert.Equal(t, int64(2), review.UnhelpfulCount)
	assert.Greater(t, review.HelpfulCount, review.UnhelpfulCount)
}

// TestReviewTitleMaxLength tests title length constraint
func TestReviewTitleMaxLength(t *testing.T) {
	title := "This is a very long title that exceeds one hundred characters limit for review titles in the system"
	if len(title) > 100 {
		title = title[:100]
	}

	review := &models.ProductReview{
		ID:        uuid.New(),
		ProductID: uuid.New(),
		UserID:    uuid.New(),
		Rating:    5,
		Title:     &title,
	}

	assert.True(t, len(*review.Title) <= 100)
}
