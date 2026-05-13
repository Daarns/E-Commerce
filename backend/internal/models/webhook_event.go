package models

import "time"

// WebhookEvent tracks processed webhook events for idempotency
type WebhookEvent struct {
	ExternalID string     `gorm:"primaryKey;column:external_id" json:"external_id"`
	Provider   string     `gorm:"column:provider;default:midtrans" json:"provider"`
	EventType  string     `gorm:"column:event_type" json:"event_type"`
	ProcessedAt *time.Time `gorm:"column:processed_at" json:"processed_at"`
	CreatedAt  time.Time  `gorm:"column:created_at" json:"created_at"`
}

func (WebhookEvent) TableName() string {
	return "webhook_events"
}
