package models

import (
	"database/sql/driver"
	"encoding/json"
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

// Notification frequency constants
const (
	NotificationFrequencyDaily   = "daily"
	NotificationFrequencyWeekly  = "weekly"
	NotificationFrequencyMonthly = "monthly"
	NotificationFrequencyNever   = "never"
)

// CategoryPreferences is a custom type for JSON array storage
type CategoryPreferences []string

// Value implements driver.Valuer for database storage
func (cp CategoryPreferences) Value() (driver.Value, error) {
	return json.Marshal(cp)
}

// Scan implements sql.Scanner for database retrieval
func (cp *CategoryPreferences) Scan(value interface{}) error {
	if value == nil {
		*cp = []string{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}

	return json.Unmarshal(bytes, &cp)
}

// NewsletterSubscription represents a newsletter subscription
type NewsletterSubscription struct {
	ID                        uuid.UUID          `gorm:"type:uuid;primaryKey" json:"id"`
	Email                     string             `gorm:"column:email;size:255;uniqueIndex;not null" json:"email"`
	Status                    string             `gorm:"column:status;size:50;not null;default:'pending_confirmation'" json:"status"`
	CategoryPreferences       CategoryPreferences `gorm:"column:category_preferences;type:jsonb;default:'[]';serializer:json" json:"category_preferences"`
	NotificationFrequency     string             `gorm:"column:notification_frequency;size:20;default:'weekly'" json:"notification_frequency"`
	ConfirmationToken         *string            `gorm:"column:confirmation_token;size:255;uniqueIndex:,where:confirmation_token IS NOT NULL" json:"confirmation_token,omitempty"`
	ConfirmationTokenExpiresAt *time.Time `gorm:"column:confirmation_token_expires_at" json:"confirmation_token_expires_at,omitempty"`
	UnsubscribeToken          *string    `gorm:"column:unsubscribe_token;size:255;uniqueIndex:,where:unsubscribe_token IS NOT NULL" json:"unsubscribe_token,omitempty"`
	SubscribedAt              *time.Time `gorm:"column:subscribed_at" json:"subscribed_at,omitempty"`
	ConfirmedAt               *time.Time `gorm:"column:confirmed_at" json:"confirmed_at,omitempty"`
	UnsubscribedAt            *time.Time `gorm:"column:unsubscribed_at" json:"unsubscribed_at,omitempty"`
	PreferencesUpdatedAt      *time.Time `gorm:"column:preferences_updated_at" json:"preferences_updated_at,omitempty"`
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

// IsNotificationsEnabled checks if notifications are enabled based on frequency
func (ns *NewsletterSubscription) IsNotificationsEnabled() bool {
	return ns.IsConfirmed() && ns.NotificationFrequency != NotificationFrequencyNever
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

// GetCategoryPreferences returns category preferences (already typed)
func (ns *NewsletterSubscription) GetCategoryPreferences() []string {
	if ns.CategoryPreferences == nil {
		return []string{}
	}
	return ns.CategoryPreferences
}

// SetCategoryPreferences sets category preferences
func (ns *NewsletterSubscription) SetCategoryPreferences(categories []string) {
	ns.CategoryPreferences = categories
	now := time.Now()
	ns.PreferencesUpdatedAt = &now
}

// HasCategoryPreference checks if user has preference for a category
func (ns *NewsletterSubscription) HasCategoryPreference(category string) bool {
	prefs := ns.GetCategoryPreferences()
	for _, p := range prefs {
		if p == category {
			return true
		}
	}
	return false
}

// CanReceiveNewsletter checks if user should receive newsletter based on preferences
func (ns *NewsletterSubscription) CanReceiveNewsletter() bool {
	if !ns.IsNotificationsEnabled() {
		return false
	}
	// Only send if has category preferences selected
	return len(ns.GetCategoryPreferences()) > 0
}
