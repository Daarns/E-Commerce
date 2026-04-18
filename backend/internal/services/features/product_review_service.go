package features

import (
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	"errors"
	"fmt"

	"github.com/google/uuid"
)

// ProductReviewService handles product review business logic
type ProductReviewService struct {
	reviewRepo *repositories.ProductReviewRepository
	userRepo   *repositories.UserRepository
	orderRepo  *repositories.OrderRepository
	productRepo *repositories.ProductRepository
}

// NewProductReviewService creates a new product review service
func NewProductReviewService(
	reviewRepo *repositories.ProductReviewRepository,
	userRepo *repositories.UserRepository,
	orderRepo *repositories.OrderRepository,
	productRepo *repositories.ProductRepository,
) *ProductReviewService {
	return &ProductReviewService{
		reviewRepo: reviewRepo,
		userRepo: userRepo,
		orderRepo: orderRepo,
		productRepo: productRepo,
	}
}

// CreateReview creates a new product review with verified purchase check
func (s *ProductReviewService) CreateReview(productID, userID uuid.UUID, req *models.CreateReviewRequest) (*models.ProductReview, error) {
	// Check if product exists
	product, err := s.productRepo.GetByID(productID)
	if err != nil {
		return nil, fmt.Errorf("product not found: %w", err)
	}
	if product == nil {
		return nil, errors.New("product not found")
	}

	// Check if user exists
	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}
	if user == nil {
		return nil, errors.New("user not found")
	}

	// Check if user already reviewed this product
	existingReview, err := s.reviewRepo.GetByProductIDAndUserID(productID, userID)
	if err != nil {
		return nil, fmt.Errorf("error checking existing review: %w", err)
	}
	if existingReview != nil {
		return nil, errors.New("user has already reviewed this product")
	}

	// Verify user has completed order for this product (Verified Purchase)
	order, err := s.reviewRepo.GetUserOrderForProduct(userID, productID)
	if err != nil {
		return nil, fmt.Errorf("error checking purchase verification: %w", err)
	}
	if order == nil {
		return nil, errors.New("you must have a completed order for this product to leave a review")
	}

	// Create review
	review := &models.ProductReview{
		ProductID:  productID,
		UserID:     userID,
		OrderID:    &order.ID,
		Rating:     req.Rating,
		Title:      req.Title,
		ReviewText: req.ReviewText,
	}

	if err := s.reviewRepo.Create(review); err != nil {
		return nil, fmt.Errorf("error creating review: %w", err)
	}

	// Update product rating
	if err := s.updateProductRating(productID); err != nil {
		// Log but don't fail
		fmt.Printf("warning: failed to update product rating: %v\n", err)
	}

	// Reload review with user info
	review, err = s.reviewRepo.GetByID(review.ID)
	if err != nil {
		return nil, err
	}

	return review, nil
}

// GetReview gets a single review by ID
func (s *ProductReviewService) GetReview(reviewID uuid.UUID) (*models.ProductReview, error) {
	review, err := s.reviewRepo.GetByID(reviewID)
	if err != nil {
		return nil, err
	}
	if review == nil {
		return nil, errors.New("review not found")
	}
	return review, nil
}

// GetProductReviews gets all reviews for a product with pagination and sorting
func (s *ProductReviewService) GetProductReviews(productID uuid.UUID, page, pageSize int, sortBy models.ReviewSortBy) (*models.ReviewListResponse, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	if pageSize > 100 {
		pageSize = 100
	}

	reviews, total, err := s.reviewRepo.GetByProductID(productID, page, pageSize, sortBy)
	if err != nil {
		return nil, err
	}

	// Convert to response format
	reviewResponses := make([]models.ProductReviewResponse, 0, len(reviews))
	for _, review := range reviews {
		resp := models.ProductReviewResponse{
			ID:             review.ID,
			ProductID:      review.ProductID,
			UserID:         review.UserID,
			UserName:       review.User.Name,
			Rating:         review.Rating,
			Title:          review.Title,
			ReviewText:     review.ReviewText,
			HelpfulCount:   review.HelpfulCount,
			UnhelpfulCount: review.UnhelpfulCount,
			CreatedAt:      review.CreatedAt,
			UpdatedAt:      review.UpdatedAt,
		}
		reviewResponses = append(reviewResponses, resp)
	}

	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}

	return &models.ReviewListResponse{
		Reviews:    reviewResponses,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

// UpdateReview updates a product review (only by review owner)
func (s *ProductReviewService) UpdateReview(reviewID, userID uuid.UUID, req *models.UpdateReviewRequest) (*models.ProductReview, error) {
	review, err := s.reviewRepo.GetByID(reviewID)
	if err != nil {
		return nil, err
	}
	if review == nil {
		return nil, errors.New("review not found")
	}

	// Check ownership
	if review.UserID != userID {
		return nil, errors.New("you can only update your own review")
	}

	// Update fields if provided
	if req.Rating != nil {
		review.Rating = *req.Rating
	}
	if req.Title != nil {
		review.Title = req.Title
	}
	if req.ReviewText != nil {
		review.ReviewText = req.ReviewText
	}

	if err := s.reviewRepo.Update(review); err != nil {
		return nil, fmt.Errorf("error updating review: %w", err)
	}

	// Update product rating
	if err := s.updateProductRating(review.ProductID); err != nil {
		fmt.Printf("warning: failed to update product rating: %v\n", err)
	}

	// Reload with user info
	review, err = s.reviewRepo.GetByID(reviewID)
	if err != nil {
		return nil, err
	}

	return review, nil
}

// DeleteReview deletes a product review (only by review owner)
func (s *ProductReviewService) DeleteReview(reviewID, userID uuid.UUID) error {
	review, err := s.reviewRepo.GetByID(reviewID)
	if err != nil {
		return err
	}
	if review == nil {
		return errors.New("review not found")
	}

	// Check ownership
	if review.UserID != userID {
		return errors.New("you can only delete your own review")
	}

	productID := review.ProductID
	if err := s.reviewRepo.Delete(reviewID); err != nil {
		return fmt.Errorf("error deleting review: %w", err)
	}

	// Update product rating
	if err := s.updateProductRating(productID); err != nil {
		fmt.Printf("warning: failed to update product rating: %v\n", err)
	}

	return nil
}

// VoteHelpful records or updates a helpful/not helpful vote on a review
func (s *ProductReviewService) VoteHelpful(reviewID, userID uuid.UUID, isHelpful bool) error {
	// Check if review exists
	review, err := s.reviewRepo.GetByID(reviewID)
	if err != nil {
		return err
	}
	if review == nil {
		return errors.New("review not found")
	}

	// Check if user already voted
	existingVote, err := s.reviewRepo.GetHelpfulVote(reviewID, userID)
	if err != nil {
		return err
	}

	if existingVote != nil {
		// User already voted - update or delete
		if existingVote.IsHelpful == isHelpful {
			// User changing their mind - delete vote
			if err := s.reviewRepo.DeleteHelpfulVote(reviewID, userID); err != nil {
				return err
			}

			// Decrement appropriate count
			if isHelpful {
				return s.reviewRepo.DecrementHelpfulCount(reviewID)
			}
			return s.reviewRepo.DecrementUnhelpfulCount(reviewID)
		}

		// User changing vote - update
		oldVote := existingVote.IsHelpful
		existingVote.IsHelpful = isHelpful
		if err := s.reviewRepo.UpdateHelpfulVote(existingVote); err != nil {
			return err
		}

		// Update counts
		if oldVote { // Was helpful, now unhelpful
			if err := s.reviewRepo.DecrementHelpfulCount(reviewID); err != nil {
				return err
			}
			return s.reviewRepo.IncrementUnhelpfulCount(reviewID)
		}
		// Was unhelpful, now helpful
		if err := s.reviewRepo.DecrementUnhelpfulCount(reviewID); err != nil {
			return err
		}
		return s.reviewRepo.IncrementHelpfulCount(reviewID)
	}

	// New vote
	vote := &models.ReviewHelpfulVote{
		ReviewID:  reviewID,
		UserID:    userID,
		IsHelpful: isHelpful,
	}

	if err := s.reviewRepo.CreateHelpfulVote(vote); err != nil {
		return err
	}

	// Increment appropriate count
	if isHelpful {
		return s.reviewRepo.IncrementHelpfulCount(reviewID)
	}
	return s.reviewRepo.IncrementUnhelpfulCount(reviewID)
}

// GetProductReviewStats gets aggregate stats for product reviews
func (s *ProductReviewService) GetProductReviewStats(productID uuid.UUID) (*models.ReviewStatistics, error) {
	avgRating, count, err := s.reviewRepo.CalculateProductStats(productID)
	if err != nil {
		return nil, err
	}

	breakdown, err := s.reviewRepo.GetRatingBreakdown(productID)
	if err != nil {
		return nil, err
	}

	return &models.ReviewStatistics{
		ProductID:       productID,
		AverageRating:   avgRating,
		TotalReviews:    count,
		RatingBreakdown: breakdown,
	}, nil
}

// updateProductRating recalculates and updates product average rating
func (s *ProductReviewService) updateProductRating(productID uuid.UUID) error {
	avgRating, count, err := s.reviewRepo.CalculateProductStats(productID)
	if err != nil {
		return err
	}

	// Update product
	product, err := s.productRepo.GetByID(productID)
	if err != nil {
		return err
	}
	if product == nil {
		return errors.New("product not found")
	}

	product.AvgRating = avgRating
	product.ReviewCount = count

	return s.productRepo.Update(product)
}

