package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Newsletter subscription status constants
const (
	NewsletterStatusSubscribed           = "subscribed"
	NewsletterStatusPendingConfirmation  = "pending_confirmation"
	NewsletterStatusUnsubscribed         = "unsubscribed"
)

// NewsletterSubscription represents a newsletter subscription
type NewsletterSubscription struct {
	ID                        uuid.UUID  `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	Email                     string     `gorm:"column:email;size:255;uniqueIndex;not null" json:"email"`
	Status                    string     `gorm:"column:status;size:50;not null;default:'pending_confirmation'" json:"status"`
	ConfirmationToken         *string    `gorm:"column:confirmation_token;size:255;uniqueIndex:,where:confirmation_token IS NOT NULL" json:"confirmation_token,omitempty"`
	ConfirmationTokenExpiresAt *time.Time `gorm:"column:confirmation_token_expires_at" json:"confirmation_token_expires_at,omitempty"`
	UnsubscribeToken          *string    `gorm:"column:unsubscribe_token;size:255;uniqueIndex:,where:unsubscribe_token IS NOT NULL" json:"unsubscribe_token,omitempty"`
	SubscribedAt              *time.Time `gorm:"column:subscribed_at" json:"subscribed_at,omitempty"`
	ConfirmedAt               *time.Time `gorm:"column:confirmed_at" json:"confirmed_at,omitempty"`
	UnsubscribedAt            *time.Time `gorm:"column:unsubscribed_at" json:"unsubscribed_at,omitempty"`
	CreatedAt                 time.Time  `json:"created_at"`
	UpdatedAt                 time.Time  `json:"updated_at"`
	DeletedAt                 gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// TableName sets the table name for NewsletterSubscription
func (NewsletterSubscription) TableName() string {
	return "newsletter_subscriptions"
}

// BeforeCreate generates UUID
func (ns *NewsletterSubscription) BeforeCreate(tx *gorm.DB) error {
	if ns.ID == uuid.Nil {
		ns.ID = uuid.New()
	}
	return nil
}

// IsConfirmed checks if subscription is confirmed
func (ns *NewsletterSubscription) IsConfirmed() bool {
	return ns.Status == NewsletterStatusSubscribed
}

// IsPendingConfirmation checks if subscription is awaiting confirmation
func (ns *NewsletterSubscription) IsPendingConfirmation() bool {
	return ns.Status == NewsletterStatusPendingConfirmation
}

// IsUnsubscribed checks if subscription is unsubscribed
func (ns *NewsletterSubscription) IsUnsubscribed() bool {
	return ns.Status == NewsletterStatusUnsubscribed
}

// IsConfirmationTokenExpired checks if confirmation token has expired
func (ns *NewsletterSubscription) IsConfirmationTokenExpired() bool {
	if ns.ConfirmationTokenExpiresAt == nil {
		return true
	}
	return time.Now().After(*ns.ConfirmationTokenExpiresAt)
}

// GetStatusDisplay returns human-readable status
func (ns *NewsletterSubscription) GetStatusDisplay() string {
	switch ns.Status {
	case NewsletterStatusSubscribed:
		return "Subscribed"
	case NewsletterStatusPendingConfirmation:
		return "Pending Confirmation"
	case NewsletterStatusUnsubscribed:
		return "Unsubscribed"
	default:
		return "Unknown"
	}
}
