package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// Email queue status constants
const (
	EmailQueueStatusPending = "pending"
	EmailQueueStatusSent    = "sent"
	EmailQueueStatusFailed  = "failed"
)

// Email queue type constants
const (
	EmailTypeOrderConfirmation    = "order_confirmation"
	EmailTypePaymentConfirmation  = "payment_confirmation"
	EmailTypeOrderStatusUpdate    = "order_status_update"
	EmailTypePasswordReset        = "password_reset"
	EmailTypeEmailVerification    = "email_verification"
	EmailTypeNewsletter           = "newsletter"
)

// EmailQueue represents an email in the queue waiting to be sent
type EmailQueue struct {
	ID           uuid.UUID          `gorm:"primaryKey" json:"id"`
	EmailType    string             `gorm:"column:email_type;size:50;not null;index" json:"email_type"`
	Status       string             `gorm:"column:status;size:20;not null;index;default:'pending'" json:"status"`
	RecipientEmail string            `gorm:"column:recipient_email;size:255;not null;index" json:"recipient_email"`
	RecipientName  string            `gorm:"column:recipient_name;size:255;not null" json:"recipient_name"`
	Subject      string             `gorm:"column:subject;size:255;not null" json:"subject"`
	Body         string             `gorm:"column:body;type:text;not null" json:"body"`
	HtmlBody     string             `gorm:"column:html_body;type:text;not null" json:"html_body"`
	Data         EmailQueueData     `gorm:"column:data;type:jsonb;serializer:json" json:"data"`
	
	// Retry tracking
	AttemptCount int                `gorm:"column:attempt_count;default:0" json:"attempt_count"`
	MaxAttempts  int                `gorm:"column:max_attempts;default:5" json:"max_attempts"`
	LastError    string             `gorm:"column:last_error;type:text" json:"last_error"`
	NextRetry    *time.Time         `gorm:"column:next_retry" json:"next_retry"`
	
	// Reference
	OrderID      *uuid.UUID         `gorm:"column:order_id;type:uuid" json:"order_id"`
	UserID       *uuid.UUID         `gorm:"column:user_id;type:uuid" json:"user_id"`
	
	// Timestamps
	CreatedAt    time.Time          `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time          `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	SentAt       *time.Time         `gorm:"column:sent_at" json:"sent_at"`
	FailedAt     *time.Time         `gorm:"column:failed_at" json:"failed_at"`
}

// EmailQueueData represents custom data for email template
type EmailQueueData map[string]interface{}

// Scan implements sql.Scanner interface
func (e *EmailQueueData) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	
	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("type assertion failed")
	}
	
	return json.Unmarshal(bytes, &e)
}

// Value implements driver.Valuer interface
func (e EmailQueueData) Value() (driver.Value, error) {
	return json.Marshal(e)
}

// TableName specifies the table name for this model
func (EmailQueue) TableName() string {
	return "email_queues"
}

// IsPending checks if email is pending
func (e *EmailQueue) IsPending() bool {
	return e.Status == EmailQueueStatusPending
}

// IsSent checks if email has been sent
func (e *EmailQueue) IsSent() bool {
	return e.Status == EmailQueueStatusSent
}

// IsFailed checks if email has failed
func (e *EmailQueue) IsFailed() bool {
	return e.Status == EmailQueueStatusFailed
}

// CanRetry checks if email can be retried
func (e *EmailQueue) CanRetry() bool {
	if e.Status != EmailQueueStatusFailed {
		return false
	}
	if e.AttemptCount >= e.MaxAttempts {
		return false
	}
	if e.NextRetry == nil {
		return true
	}
	return time.Now().After(*e.NextRetry)
}

// IsReadyToProcess checks if email is ready to be processed
func (e *EmailQueue) IsReadyToProcess() bool {
	if !e.IsPending() {
		return false
	}
	if e.NextRetry != nil && time.Now().Before(*e.NextRetry) {
		return false
	}
	return true
}
