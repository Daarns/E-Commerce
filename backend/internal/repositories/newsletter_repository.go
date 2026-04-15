package repositories

import (
	"ecommerce-backend/internal/models"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// NewsletterRepository handles newsletter subscription operations
type NewsletterRepository struct {
	db *gorm.DB
}

// NewNewsletterRepository creates a new newsletter repository
func NewNewsletterRepository(db *gorm.DB) *NewsletterRepository {
	return &NewsletterRepository{db: db}
}

// Create creates a new newsletter subscription
func (r *NewsletterRepository) Create(subscription *models.NewsletterSubscription) error {
	subscription.Email = strings.ToLower(subscription.Email)
	return r.db.Create(subscription).Error
}

// GetByEmail retrieves subscription by email
func (r *NewsletterRepository) GetByEmail(email string) (*models.NewsletterSubscription, error) {
	email = strings.ToLower(email)
	var subscription models.NewsletterSubscription
	err := r.db.Where("email = ?", email).First(&subscription).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("subscription not found for email: %s", email)
		}
		return nil, err
	}

	return &subscription, nil
}

// GetByID retrieves subscription by ID
func (r *NewsletterRepository) GetByID(id uuid.UUID) (*models.NewsletterSubscription, error) {
	var subscription models.NewsletterSubscription
	err := r.db.Where("id = ?", id).First(&subscription).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("subscription not found")
		}
		return nil, err
	}

	return &subscription, nil
}

// GetByConfirmationToken retrieves subscription by confirmation token
func (r *NewsletterRepository) GetByConfirmationToken(token string) (*models.NewsletterSubscription, error) {
	var subscription models.NewsletterSubscription
	err := r.db.Where("confirmation_token = ?", token).First(&subscription).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("invalid confirmation token")
		}
		return nil, err
	}

	return &subscription, nil
}

// GetByUnsubscribeToken retrieves subscription by unsubscribe token
func (r *NewsletterRepository) GetByUnsubscribeToken(token string) (*models.NewsletterSubscription, error) {
	var subscription models.NewsletterSubscription
	err := r.db.Where("unsubscribe_token = ?", token).First(&subscription).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("invalid unsubscribe token")
		}
		return nil, err
	}

	return &subscription, nil
}

// IsSubscribed checks if email is already subscribed
func (r *NewsletterRepository) IsSubscribed(email string) (bool, error) {
	email = strings.ToLower(email)
	var count int64
	err := r.db.Model(&models.NewsletterSubscription{}).
		Where("email = ? AND status = ?", email, models.NewsletterStatusSubscribed).
		Count(&count).Error

	return count > 0, err
}

// IsPendingConfirmation checks if email has pending confirmation
func (r *NewsletterRepository) IsPendingConfirmation(email string) (bool, error) {
	email = strings.ToLower(email)
	var count int64
	err := r.db.Model(&models.NewsletterSubscription{}).
		Where("email = ? AND status = ?", email, models.NewsletterStatusPendingConfirmation).
		Count(&count).Error

	return count > 0, err
}

// ConfirmSubscription marks subscription as confirmed
func (r *NewsletterRepository) ConfirmSubscription(email string) error {
	email = strings.ToLower(email)
	now := time.Now()
	return r.db.Model(&models.NewsletterSubscription{}).
		Where("email = ?", email).
		Updates(map[string]interface{}{
			"status":                   models.NewsletterStatusSubscribed,
			"confirmed_at":             now,
			"confirmation_token":       nil,
			"confirmation_token_expires_at": nil,
			"subscribed_at":            now,
		}).Error
}

// Unsubscribe marks subscription as unsubscribed
func (r *NewsletterRepository) Unsubscribe(email string) error {
	email = strings.ToLower(email)
	now := time.Now()
	return r.db.Model(&models.NewsletterSubscription{}).
		Where("email = ?", email).
		Updates(map[string]interface{}{
			"status":           models.NewsletterStatusUnsubscribed,
			"unsubscribed_at":  now,
			"unsubscribe_token": nil,
		}).Error
}

// Update updates a subscription
func (r *NewsletterRepository) Update(subscription *models.NewsletterSubscription) error {
	return r.db.Save(subscription).Error
}

// UpdatePreferences updates user's category preferences and notification frequency
func (r *NewsletterRepository) UpdatePreferences(email string, categories []string, frequency string) error {
	email = strings.ToLower(email)
	now := time.Now()
	return r.db.Model(&models.NewsletterSubscription{}).
		Where("email = ?", email).
		Updates(map[string]interface{}{
			"category_preferences":   categories,
			"notification_frequency": frequency,
			"preferences_updated_at": now,
		}).Error
}

// GetByFrequency retrieves subscriptions by notification frequency
func (r *NewsletterRepository) GetByFrequency(frequency string, limit, offset int) ([]models.NewsletterSubscription, error) {
	var subscriptions []models.NewsletterSubscription
	err := r.db.
		Where("status = ? AND notification_frequency = ?", models.NewsletterStatusSubscribed, frequency).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&subscriptions).Error

	return subscriptions, err
}

// GetSubscribedWithCategories retrieves subscriptions that have category preferences
func (r *NewsletterRepository) GetSubscribedWithCategories(limit, offset int) ([]models.NewsletterSubscription, error) {
	var subscriptions []models.NewsletterSubscription
	err := r.db.
		Where("status = ? AND category_preferences != '[]'", models.NewsletterStatusSubscribed).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&subscriptions).Error

	return subscriptions, err
}

// GetWithoutPreferences retrieves subscriptions without set preferences (for onboarding nudge)
func (r *NewsletterRepository) GetWithoutPreferences(limit, offset int) ([]models.NewsletterSubscription, error) {
	var subscriptions []models.NewsletterSubscription
	err := r.db.
		Where("status = ? AND (category_preferences = '[]' OR category_preferences IS NULL)", models.NewsletterStatusSubscribed).
		Order("subscribed_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&subscriptions).Error

	return subscriptions, err
}

// Delete soft-deletes a subscription
func (r *NewsletterRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.NewsletterSubscription{}, "id = ?", id).Error
}

// GetAllSubscribed retrieves all confirmed subscriptions (for email campaigns)
func (r *NewsletterRepository) GetAllSubscribed(limit, offset int) ([]models.NewsletterSubscription, error) {
	var subscriptions []models.NewsletterSubscription
	err := r.db.
		Where("status = ?", models.NewsletterStatusSubscribed).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&subscriptions).Error

	return subscriptions, err
}

// GetSubscribedCount returns total count of confirmed subscriptions
func (r *NewsletterRepository) GetSubscribedCount() (int64, error) {
	var count int64
	err := r.db.Model(&models.NewsletterSubscription{}).
		Where("status = ?", models.NewsletterStatusSubscribed).
		Count(&count).Error

	return count, err
}

// GetPendingConfirmationCount returns count of pending confirmations
func (r *NewsletterRepository) GetPendingConfirmationCount() (int64, error) {
	var count int64
	err := r.db.Model(&models.NewsletterSubscription{}).
		Where("status = ? AND confirmation_token_expires_at > ?", 
			models.NewsletterStatusPendingConfirmation, time.Now()).
		Count(&count).Error

	return count, err
}

// CleanupExpiredTokens deletes subscriptions with expired confirmation tokens
func (r *NewsletterRepository) CleanupExpiredTokens() error {
	return r.db.Delete(&models.NewsletterSubscription{}, 
		"status = ? AND confirmation_token_expires_at < ?", 
		models.NewsletterStatusPendingConfirmation, 
		time.Now()).Error
}

// GetSummary returns newsletter subscription summary statistics
type NewsletterSummary struct {
	TotalSubscribed        int64
	TotalPendingConfirmation int64
	TotalUnsubscribed      int64
	TotalSubscriptions     int64
}

// GetSummary retrieves subscription summary statistics
func (r *NewsletterRepository) GetSummary() (*NewsletterSummary, error) {
	var summary NewsletterSummary
	
	// Get total subscribed
	if err := r.db.Model(&models.NewsletterSubscription{}).
		Where("status = ?", models.NewsletterStatusSubscribed).
		Count(&summary.TotalSubscribed).Error; err != nil {
		return nil, err
	}

	// Get total pending
	if err := r.db.Model(&models.NewsletterSubscription{}).
		Where("status = ?", models.NewsletterStatusPendingConfirmation).
		Count(&summary.TotalPendingConfirmation).Error; err != nil {
		return nil, err
	}

	// Get total unsubscribed
	if err := r.db.Model(&models.NewsletterSubscription{}).
		Where("status = ?", models.NewsletterStatusUnsubscribed).
		Count(&summary.TotalUnsubscribed).Error; err != nil {
		return nil, err
	}

	summary.TotalSubscriptions = summary.TotalSubscribed + summary.TotalPendingConfirmation + summary.TotalUnsubscribed

	return &summary, nil
}
