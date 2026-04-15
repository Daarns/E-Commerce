package repositories

import (
	"ecommerce-backend/internal/models"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// EmailQueueRepository handles database operations for email queue
type EmailQueueRepository struct {
	db *gorm.DB
}

// NewEmailQueueRepository creates a new email queue repository
func NewEmailQueueRepository(db *gorm.DB) *EmailQueueRepository {
	return &EmailQueueRepository{db: db}
}

// Create adds a new email to the queue
func (r *EmailQueueRepository) Create(email *models.EmailQueue) error {
	if err := r.db.Create(email).Error; err != nil {
		return fmt.Errorf("failed to create email queue: %w", err)
	}
	return nil
}

// GetByID retrieves an email queue by ID
func (r *EmailQueueRepository) GetByID(id uuid.UUID) (*models.EmailQueue, error) {
	var email models.EmailQueue
	if err := r.db.First(&email, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("failed to get email queue: %w", err)
	}
	return &email, nil
}

// GetPendingEmails retrieves pending emails ready to be sent (no next_retry in future)
func (r *EmailQueueRepository) GetPendingEmails(limit int) ([]*models.EmailQueue, error) {
	var emails []*models.EmailQueue
	if err := r.db.
		Where("status = ?", models.EmailQueueStatusPending).
		Where("next_retry IS NULL OR next_retry <= ?", time.Now()).
		Order("created_at ASC").
		Limit(limit).
		Find(&emails).Error; err != nil {
		return nil, fmt.Errorf("failed to get pending emails: %w", err)
	}
	return emails, nil
}

// GetFailedEmails retrieves failed emails that can be retried
func (r *EmailQueueRepository) GetFailedEmails(limit int) ([]*models.EmailQueue, error) {
	var emails []*models.EmailQueue
	if err := r.db.
		Where("status = ? AND attempt_count < max_attempts", models.EmailQueueStatusFailed).
		Where("next_retry IS NULL OR next_retry <= ?", time.Now()).
		Order("next_retry ASC").
		Limit(limit).
		Find(&emails).Error; err != nil {
		return nil, fmt.Errorf("failed to get failed emails: %w", err)
	}
	return emails, nil
}

// MarkAsSent updates email status to sent with current timestamp
func (r *EmailQueueRepository) MarkAsSent(id uuid.UUID) error {
	now := time.Now()
	if err := r.db.Model(&models.EmailQueue{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":  models.EmailQueueStatusSent,
			"sent_at": now,
		}).Error; err != nil {
		return fmt.Errorf("failed to mark email as sent: %w", err)
	}
	return nil
}

// MarkAsFailed updates email status to failed with error message
func (r *EmailQueueRepository) MarkAsFailed(id uuid.UUID, errorMsg string, attemptCount int) error {
	now := time.Now()
	nextRetry := calculateNextRetry(attemptCount)

	if err := r.db.Model(&models.EmailQueue{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":         models.EmailQueueStatusFailed,
			"last_error":     errorMsg,
			"attempt_count":  attemptCount,
			"next_retry":     nextRetry,
			"failed_at":      now,
		}).Error; err != nil {
		return fmt.Errorf("failed to mark email as failed: %w", err)
	}
	return nil
}

// IncrementAttempt increments the attempt count for an email
func (r *EmailQueueRepository) IncrementAttempt(id uuid.UUID) error {
	if err := r.db.Model(&models.EmailQueue{}).
		Where("id = ?", id).
		Update("attempt_count", gorm.Expr("attempt_count + 1")).Error; err != nil {
		return fmt.Errorf("failed to increment attempt: %w", err)
	}
	return nil
}

// GetStatsLast24Hours returns email queue statistics for the last 24 hours
func (r *EmailQueueRepository) GetStatsLast24Hours() (map[string]int, error) {
	type Result struct {
		Status string
		Count  int64
	}

	var results []Result
	stats := make(map[string]int)

	since := time.Now().Add(-24 * time.Hour)
	if err := r.db.
		Model(&models.EmailQueue{}).
		Select("status, COUNT(*) as count").
		Where("created_at >= ?", since).
		Group("status").
		Scan(&results).Error; err != nil {
		return nil, fmt.Errorf("failed to get stats: %w", err)
	}

	for _, result := range results {
		stats[result.Status] = int(result.Count)
	}

	return stats, nil
}

// DeleteOlderThan deletes emails older than the specified duration (for cleanup)
func (r *EmailQueueRepository) DeleteOlderThan(duration time.Duration) error {
	cutoff := time.Now().Add(-duration)
	if err := r.db.
		Where("status = ? AND created_at < ?", models.EmailQueueStatusSent, cutoff).
		Delete(&models.EmailQueue{}).Error; err != nil {
		return fmt.Errorf("failed to delete old emails: %w", err)
	}
	return nil
}

// GetByOrderID retrieves all emails for a specific order
func (r *EmailQueueRepository) GetByOrderID(orderID uuid.UUID) ([]*models.EmailQueue, error) {
	var emails []*models.EmailQueue
	if err := r.db.
		Where("order_id = ?", orderID).
		Order("created_at DESC").
		Find(&emails).Error; err != nil {
		return nil, fmt.Errorf("failed to get emails by order: %w", err)
	}
	return emails, nil
}

// GetByUserID retrieves all emails for a specific user
func (r *EmailQueueRepository) GetByUserID(userID uuid.UUID) ([]*models.EmailQueue, error) {
	var emails []*models.EmailQueue
	if err := r.db.
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&emails).Error; err != nil {
		return nil, fmt.Errorf("failed to get emails by user: %w", err)
	}
	return emails, nil
}

// calculateNextRetry calculates the next retry time using exponential backoff
// Attempt 0: 5 min, 1: 15 min, 2: 30 min, 3: 1 hour, 4: 2 hours, etc.
func calculateNextRetry(attemptCount int) *time.Time {
	var backoffMinutes int
	switch attemptCount {
	case 0:
		backoffMinutes = 5
	case 1:
		backoffMinutes = 15
	case 2:
		backoffMinutes = 30
	case 3:
		backoffMinutes = 60
	case 4:
		backoffMinutes = 120
	default:
		backoffMinutes = 240 // 4 hours for subsequent retries
	}

	nextRetry := time.Now().Add(time.Duration(backoffMinutes) * time.Minute)
	return &nextRetry
}
