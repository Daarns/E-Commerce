package repositories

import (
	"ecommerce-backend/internal/models"
	"time"

	"gorm.io/gorm"
)

// WebhookEventRepository handles webhook event persistence
type WebhookEventRepository struct {
	db *gorm.DB
}

// NewWebhookEventRepository creates a new webhook event repository
func NewWebhookEventRepository(db *gorm.DB) *WebhookEventRepository {
	return &WebhookEventRepository{db: db}
}

// IsProcessed checks if a webhook event has already been processed
func (r *WebhookEventRepository) IsProcessed(externalID string) (bool, error) {
	var event models.WebhookEvent
	result := r.db.Where("external_id = ? AND processed_at IS NOT NULL", externalID).First(&event)

	if result.Error == gorm.ErrRecordNotFound {
		return false, nil
	}
	if result.Error != nil {
		return false, result.Error
	}

	return true, nil
}

// Record inserts or updates a webhook event with processed timestamp
func (r *WebhookEventRepository) Record(externalID, eventType string) error {
	now := time.Now()
	return r.db.Exec(`
		INSERT INTO webhook_events (external_id, provider, event_type, processed_at, created_at)
		VALUES (?, 'midtrans', ?, ?, ?)
		ON CONFLICT (external_id) DO UPDATE SET processed_at = EXCLUDED.processed_at
	`, externalID, eventType, now, now).Error
}

// GetByExternalID retrieves a webhook event by external ID
func (r *WebhookEventRepository) GetByExternalID(externalID string) (*models.WebhookEvent, error) {
	var event models.WebhookEvent
	if err := r.db.Where("external_id = ?", externalID).First(&event).Error; err != nil {
		return nil, err
	}
	return &event, nil
}

// DeleteOlderThan deletes webhook events older than the specified duration (for cleanup)
func (r *WebhookEventRepository) DeleteOlderThan(duration time.Duration) error {
	cutoff := time.Now().Add(-duration)
	return r.db.Where("created_at < ?", cutoff).Delete(&models.WebhookEvent{}).Error
}
