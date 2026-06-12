package product

import (
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/google/uuid"
)

const maxReviewImages = 3

type ReviewNotificationWriter interface {
	CreateForUser(userID uuid.UUID, notificationType string, title string, message string, metadata map[string]interface{}) error
}

type ReviewAdminUserProvider interface {
	GetAdmins() ([]models.User, error)
}

// ProductReviewService handles product review business logic
type ProductReviewService struct {
	reviewRepo    *repositories.ProductReviewRepository
	userRepo      *repositories.UserRepository
	orderRepo     *repositories.OrderRepository
	productRepo   *repositories.ProductRepository
	notifications ReviewNotificationWriter
	adminUsers    ReviewAdminUserProvider
}

// NewProductReviewService creates a new product review service
func NewProductReviewService(
	reviewRepo *repositories.ProductReviewRepository,
	userRepo *repositories.UserRepository,
	orderRepo *repositories.OrderRepository,
	productRepo *repositories.ProductRepository,
) *ProductReviewService {
	return &ProductReviewService{
		reviewRepo:  reviewRepo,
		userRepo:    userRepo,
		orderRepo:   orderRepo,
		productRepo: productRepo,
	}
}

func (s *ProductReviewService) SetNotificationWriter(writer ReviewNotificationWriter) {
	s.notifications = writer
}

func (s *ProductReviewService) SetAdminUserProvider(provider ReviewAdminUserProvider) {
	s.adminUsers = provider
}

// CreateReview creates a new product review with verified purchase check
func (s *ProductReviewService) CreateReview(productID, userID uuid.UUID, req *models.CreateReviewRequest) (*models.ProductReview, error) {
	imageURLs := compactReviewImageURLs(req.ImageURLs)
	if len(imageURLs) > maxReviewImages {
		return nil, fmt.Errorf("maximum %d review images allowed", maxReviewImages)
	}

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

	// Verify user has a paid completed/rejected-refund purchase that has not been reviewed yet.
	order, err := s.reviewRepo.GetUserOrderForProduct(userID, productID)
	if err != nil {
		return nil, fmt.Errorf("error checking purchase verification: %w", err)
	}
	if order == nil {
		return nil, errors.New("you must have a completed order for this product to leave a review")
	}

	existingReview, err := s.reviewRepo.GetByProductIDUserIDOrderID(productID, userID, order.ID)
	if err != nil {
		return nil, fmt.Errorf("error checking existing review: %w", err)
	}
	if existingReview != nil {
		return nil, errors.New("user has already reviewed this purchase")
	}

	status := models.ReviewStatusApproved
	if containsAbusiveReviewContent(req.Title, req.ReviewText) {
		status = models.ReviewStatusPending
	}

	review := &models.ProductReview{
		ProductID:          productID,
		UserID:             userID,
		OrderID:            &order.ID,
		Rating:             req.Rating,
		Title:              req.Title,
		ReviewText:         req.ReviewText,
		IsVerifiedPurchase: true,
		Status:             status,
	}

	if err := s.reviewRepo.Create(review); err != nil {
		return nil, fmt.Errorf("error creating review: %w", err)
	}
	if err := s.reviewRepo.CreateImages(review.ID, imageURLs); err != nil {
		return nil, fmt.Errorf("error attaching review images: %w", err)
	}
	if status == models.ReviewStatusApproved {
		if err := s.updateProductRating(productID); err != nil {
			fmt.Printf("warning: failed to update product rating: %v\n", err)
		}
	} else {
		s.notifyAdminsReviewNeedsModeration(review, product.Name)
	}

	// Reload review with user info
	review, err = s.reviewRepo.GetByID(review.ID)
	if err != nil {
		return nil, err
	}

	return review, nil
}

func (s *ProductReviewService) GetReviewEligibility(productID, userID uuid.UUID) (*models.ReviewEligibilityResponse, error) {
	order, err := s.reviewRepo.GetUserOrderForProduct(userID, productID)
	if err != nil {
		return nil, err
	}
	if order == nil {
		return &models.ReviewEligibilityResponse{
			CanReview: false,
			Reason:    "no_completed_order",
		}, nil
	}

	return &models.ReviewEligibilityResponse{
		CanReview: true,
		Reason:    "eligible",
		OrderID:   &order.ID,
	}, nil
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
		reviewResponses = append(reviewResponses, productReviewToResponse(review))
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
	review.Status = models.ReviewStatusPending

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
	if review.Status != models.ReviewStatusApproved {
		return errors.New("review is not available for voting")
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

func (s *ProductReviewService) ListAdminReviews(status string, page, pageSize int) (*models.ReviewListResponse, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	if status != "" && status != "all" && status != models.ReviewStatusPending && status != models.ReviewStatusApproved && status != models.ReviewStatusRejected {
		return nil, errors.New("invalid review status")
	}

	reviews, total, err := s.reviewRepo.ListAdmin(status, page, pageSize)
	if err != nil {
		return nil, err
	}

	responses := make([]models.ProductReviewResponse, 0, len(reviews))
	for _, review := range reviews {
		responses = append(responses, productReviewToResponse(review))
	}

	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}

	return &models.ReviewListResponse{
		Reviews:    responses,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

func (s *ProductReviewService) ModerateReview(reviewID uuid.UUID, status string) (*models.ProductReview, error) {
	if status != models.ReviewStatusPending && status != models.ReviewStatusApproved && status != models.ReviewStatusRejected {
		return nil, errors.New("invalid review status")
	}

	review, err := s.reviewRepo.GetByID(reviewID)
	if err != nil {
		return nil, err
	}
	if review == nil {
		return nil, errors.New("review not found")
	}

	if err := s.reviewRepo.UpdateStatus(reviewID, status); err != nil {
		return nil, fmt.Errorf("error updating review status: %w", err)
	}
	if err := s.updateProductRating(review.ProductID); err != nil {
		fmt.Printf("warning: failed to update product rating: %v\n", err)
	}

	return s.reviewRepo.GetByID(reviewID)
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

func productReviewToResponse(review models.ProductReview) models.ProductReviewResponse {
	userName := "Anonymous"
	userEmail := ""
	if review.User != nil {
		if review.User.Name != "" {
			userName = review.User.Name
		}
		userEmail = review.User.Email
	}

	productName := ""
	if review.Product != nil {
		productName = review.Product.Name
	}
	imageURLs := make([]string, 0, len(review.Images))
	for _, image := range review.Images {
		if image.ImageURL != "" {
			imageURLs = append(imageURLs, image.ImageURL)
		}
	}

	return models.ProductReviewResponse{
		ID:                 review.ID,
		ProductID:          review.ProductID,
		ProductName:        productName,
		UserID:             review.UserID,
		OrderID:            review.OrderID,
		UserName:           userName,
		UserEmail:          userEmail,
		Rating:             review.Rating,
		Title:              review.Title,
		ReviewText:         review.ReviewText,
		HelpfulCount:       review.HelpfulCount,
		UnhelpfulCount:     review.UnhelpfulCount,
		IsVerifiedPurchase: review.IsVerifiedPurchase,
		Status:             review.Status,
		ImageURLs:          imageURLs,
		CreatedAt:          review.CreatedAt,
		UpdatedAt:          review.UpdatedAt,
	}
}

func compactReviewImageURLs(imageURLs []string) []string {
	compacted := make([]string, 0, len(imageURLs))
	for _, imageURL := range imageURLs {
		trimmed := strings.TrimSpace(imageURL)
		if trimmed != "" {
			compacted = append(compacted, trimmed)
		}
	}
	return compacted
}

func containsAbusiveReviewContent(title *string, reviewText *string) bool {
	contentParts := make([]string, 0, 2)
	if title != nil {
		contentParts = append(contentParts, *title)
	}
	if reviewText != nil {
		contentParts = append(contentParts, *reviewText)
	}
	content := strings.ToLower(strings.Join(contentParts, " "))
	if strings.TrimSpace(content) == "" {
		return false
	}
	normalizedContent := normalizeReviewModerationText(content)

	patterns := []*regexp.Regexp{
		regexp.MustCompile(`\b(anjing|anjir|anjay|asu|bangsat|babi|goblok|gblk|tolol|idiot|kampret|brengsek|sialan|tai|taik|bacot)\b`),
		regexp.MustCompile(`\b(kontol|kntl|memek|mmk|puki|pukimak|ngentot|ngewe|jancok|jancuk|cok)\b`),
		regexp.MustCompile(`\b(fuck|fucking|shit|bitch|bastard|asshole|dick|pussy|cunt|motherfucker|whore|slut)\b`),
		regexp.MustCompile(`\b(nigga|nigger)\b`),
	}
	for _, pattern := range patterns {
		if pattern.MatchString(content) || pattern.MatchString(normalizedContent) {
			return true
		}
	}
	return false
}

func normalizeReviewModerationText(value string) string {
	replacer := strings.NewReplacer(
		"0", "o",
		"1", "i",
		"3", "e",
		"4", "a",
		"5", "s",
		"@", "a",
		"$", "s",
	)
	normalized := replacer.Replace(value)
	normalized = regexp.MustCompile(`[^a-z]+`).ReplaceAllString(normalized, " ")
	return strings.TrimSpace(collapseRepeatedLetters(normalized, 2))
}

func collapseRepeatedLetters(value string, maxRepeat int) string {
	if maxRepeat < 1 || value == "" {
		return value
	}

	var builder strings.Builder
	builder.Grow(len(value))
	var previous rune
	repeatCount := 0
	for _, current := range value {
		if current == previous {
			repeatCount++
		} else {
			previous = current
			repeatCount = 1
		}
		if repeatCount <= maxRepeat {
			builder.WriteRune(current)
		}
	}
	return builder.String()
}

func (s *ProductReviewService) notifyAdminsReviewNeedsModeration(review *models.ProductReview, productName string) {
	if s.notifications == nil || s.adminUsers == nil || review == nil {
		return
	}
	admins, err := s.adminUsers.GetAdmins()
	if err != nil {
		return
	}
	for _, admin := range admins {
		_ = s.notifications.CreateForUser(admin.ID, models.NotificationTypeReview, "Review perlu ditinjau", fmt.Sprintf("Review untuk %s terdeteksi perlu moderasi.", productName), map[string]interface{}{
			"review_id":    review.ID,
			"product_id":   review.ProductID,
			"product_name": productName,
			"status":       review.Status,
		})
	}
}
