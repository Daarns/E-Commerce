package repositories

import (
	"ecommerce-backend/internal/models"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ProductReviewRepository handles product review data access
type ProductReviewRepository struct {
	db *gorm.DB
}

// NewProductReviewRepository creates a new product review repository
func NewProductReviewRepository(db *gorm.DB) *ProductReviewRepository {
	return &ProductReviewRepository{db: db}
}

// Create creates a new product review
func (r *ProductReviewRepository) Create(review *models.ProductReview) error {
	review.ID = uuid.New()
	return r.db.Create(review).Error
}

// GetByID gets a review by ID
func (r *ProductReviewRepository) GetByID(id uuid.UUID) (*models.ProductReview, error) {
	var review models.ProductReview
	err := r.db.Preload("User").Preload("Product").Preload("Images").First(&review, "id = ?", id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("review not found")
		}
		return nil, err
	}
	return &review, nil
}

// GetByProductIDUserIDOrderID gets a review for one purchase.
func (r *ProductReviewRepository) GetByProductIDUserIDOrderID(productID, userID, orderID uuid.UUID) (*models.ProductReview, error) {
	var review models.ProductReview
	err := r.db.First(&review, "product_id = ? AND user_id = ? AND order_id = ?", productID, userID, orderID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &review, nil
}

// GetByProductID gets all reviews for a product with pagination and sorting
func (r *ProductReviewRepository) GetByProductID(productID uuid.UUID, page, pageSize int, sortBy models.ReviewSortBy) ([]models.ProductReview, int64, error) {
	var reviews []models.ProductReview
	var total int64

	query := r.db.Where("product_id = ? AND status = ?", productID, models.ReviewStatusApproved).Preload("User").Preload("Images")

	// Apply sorting
	switch sortBy {
	case models.SortByRecent:
		query = query.Order("created_at DESC")
	case models.SortByHelpful:
		query = query.Order("helpful_count DESC, created_at DESC")
	case models.SortByHighestRating:
		query = query.Order("rating DESC, created_at DESC")
	case models.SortByLowestRating:
		query = query.Order("rating ASC, created_at DESC")
	default:
		query = query.Order("created_at DESC")
	}

	// Count total
	if err := query.Model(&models.ProductReview{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	if err := query.Offset((page - 1) * pageSize).Limit(pageSize).Find(&reviews).Error; err != nil {
		return nil, 0, err
	}

	return reviews, total, nil
}

func (r *ProductReviewRepository) ListAdmin(status string, page, pageSize int) ([]models.ProductReview, int64, error) {
	var reviews []models.ProductReview
	var total int64

	query := r.db.Model(&models.ProductReview{}).Preload("User").Preload("Product").Preload("Images")
	if status != "" && status != "all" {
		query = query.Where("status = ?", status)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := query.
		Order("created_at DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&reviews).Error
	if err != nil {
		return nil, 0, err
	}

	return reviews, total, nil
}

// Update updates a product review
func (r *ProductReviewRepository) Update(review *models.ProductReview) error {
	return r.db.Model(review).Updates(review).Error
}

func (r *ProductReviewRepository) UpdateStatus(id uuid.UUID, status string) error {
	return r.db.Model(&models.ProductReview{}).
		Where("id = ?", id).
		Update("status", status).Error
}

func (r *ProductReviewRepository) CreateImages(reviewID uuid.UUID, imageURLs []string) error {
	if len(imageURLs) == 0 {
		return nil
	}

	images := make([]models.ReviewImage, 0, len(imageURLs))
	for _, imageURL := range imageURLs {
		if imageURL == "" {
			continue
		}
		images = append(images, models.ReviewImage{
			ID:       uuid.New(),
			ReviewID: reviewID,
			ImageURL: imageURL,
		})
	}
	if len(images) == 0 {
		return nil
	}

	return r.db.Create(&images).Error
}

// Delete deletes a product review
func (r *ProductReviewRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.ProductReview{}, "id = ?", id).Error
}

// GetUserOrderForProduct returns the newest paid purchase that can still be reviewed.
func (r *ProductReviewRepository) GetUserOrderForProduct(userID, productID uuid.UUID) (*models.Order, error) {
	var order models.Order
	eligibleStatuses := []string{
		models.OrderStatusCompleted,
		models.OrderStatusRefundRejected,
	}

	err := r.db.
		Joins("JOIN order_items ON orders.id = order_items.order_id").
		Joins("LEFT JOIN product_reviews ON product_reviews.order_id = orders.id AND product_reviews.product_id = order_items.product_id AND product_reviews.user_id = orders.user_id").
		Where(
			"orders.user_id = ? AND order_items.product_id = ? AND orders.order_status IN ? AND orders.payment_status = ? AND product_reviews.id IS NULL",
			userID,
			productID,
			eligibleStatuses,
			models.PaymentStatusPaid,
		).
		Order("orders.created_at DESC").
		First(&order).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &order, nil
}

// CalculateProductStats calculates average rating and review count for a product
func (r *ProductReviewRepository) CalculateProductStats(productID uuid.UUID) (float64, int64, error) {
	var avgRating float64
	var count int64

	// Get average rating
	err := r.db.Model(&models.ProductReview{}).
		Where("product_id = ? AND status = ?", productID, models.ReviewStatusApproved).
		Select("COALESCE(AVG(CAST(rating AS DECIMAL)), 0)").
		Row().
		Scan(&avgRating)
	if err != nil {
		return 0, 0, err
	}

	// Get review count
	err = r.db.Model(&models.ProductReview{}).
		Where("product_id = ? AND status = ?", productID, models.ReviewStatusApproved).
		Count(&count).Error
	if err != nil {
		return 0, 0, err
	}

	return avgRating, count, nil
}

// GetRatingBreakdown gets breakdown of reviews by rating
func (r *ProductReviewRepository) GetRatingBreakdown(productID uuid.UUID) (map[int]int64, error) {
	var results []struct {
		Rating int
		Count  int64
	}

	err := r.db.Model(&models.ProductReview{}).
		Where("product_id = ? AND status = ?", productID, models.ReviewStatusApproved).
		Select("rating, COUNT(*) as count").
		Group("rating").
		Order("rating DESC").
		Scan(&results).Error
	if err != nil {
		return nil, err
	}

	breakdown := make(map[int]int64)
	for _, r := range results {
		breakdown[r.Rating] = r.Count
	}
	return breakdown, nil
}

// ===== HELPFUL VOTE OPERATIONS =====

// CreateHelpfulVote records a helpful/not helpful vote
func (r *ProductReviewRepository) CreateHelpfulVote(vote *models.ReviewHelpfulVote) error {
	vote.ID = uuid.New()
	return r.db.Create(vote).Error
}

// GetHelpfulVote gets user's vote on a review
func (r *ProductReviewRepository) GetHelpfulVote(reviewID, userID uuid.UUID) (*models.ReviewHelpfulVote, error) {
	var vote models.ReviewHelpfulVote
	err := r.db.First(&vote, "review_id = ? AND user_id = ?", reviewID, userID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // User hasn't voted
		}
		return nil, err
	}
	return &vote, nil
}

// UpdateHelpfulVote updates a helpful vote
func (r *ProductReviewRepository) UpdateHelpfulVote(vote *models.ReviewHelpfulVote) error {
	return r.db.Model(vote).Update("is_helpful", vote.IsHelpful).Error
}

// DeleteHelpfulVote deletes a helpful vote
func (r *ProductReviewRepository) DeleteHelpfulVote(reviewID, userID uuid.UUID) error {
	return r.db.Delete(&models.ReviewHelpfulVote{}, "review_id = ? AND user_id = ?", reviewID, userID).Error
}

// IncrementHelpfulCount increments helpful count for a review
func (r *ProductReviewRepository) IncrementHelpfulCount(reviewID uuid.UUID) error {
	return r.db.Model(&models.ProductReview{}).
		Where("id = ?", reviewID).
		Update("helpful_count", gorm.Expr("helpful_count + 1")).Error
}

// DecrementHelpfulCount decrements helpful count for a review
func (r *ProductReviewRepository) DecrementHelpfulCount(reviewID uuid.UUID) error {
	return r.db.Model(&models.ProductReview{}).
		Where("id = ?", reviewID).
		Update("helpful_count", gorm.Expr("helpful_count - 1")).Error
}

// IncrementUnhelpfulCount increments unhelpful count for a review
func (r *ProductReviewRepository) IncrementUnhelpfulCount(reviewID uuid.UUID) error {
	return r.db.Model(&models.ProductReview{}).
		Where("id = ?", reviewID).
		Update("unhelpful_count", gorm.Expr("unhelpful_count + 1")).Error
}

// DecrementUnhelpfulCount decrements unhelpful count for a review
func (r *ProductReviewRepository) DecrementUnhelpfulCount(reviewID uuid.UUID) error {
	return r.db.Model(&models.ProductReview{}).
		Where("id = ?", reviewID).
		Update("unhelpful_count", gorm.Expr("unhelpful_count - 1")).Error
}
