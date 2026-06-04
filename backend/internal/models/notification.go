package models

import (
	"time"

	"github.com/google/uuid"
)

const (
	NotificationTypeChat    = "chat_message"
	NotificationTypeOrder   = "order_update"
	NotificationTypePayment = "payment_update"
)

type Notification struct {
	ID        uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey;default:uuid_generate_v4()"`
	UserID    uuid.UUID  `json:"user_id" gorm:"type:uuid;not null;index"`
	Type      string     `json:"type" gorm:"size:50;not null;index"`
	Title     string     `json:"title" gorm:"size:160;not null"`
	Message   string     `json:"message" gorm:"type:text;not null"`
	Metadata  string     `json:"metadata,omitempty" gorm:"type:jsonb;default:'{}'"`
	ReadAt    *time.Time `json:"read_at,omitempty" gorm:"index"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

func (Notification) TableName() string {
	return "notifications"
}

type NotificationListResponse struct {
	Notifications []Notification `json:"notifications"`
	Total         int            `json:"total"`
	Page          int            `json:"page"`
	PageSize      int            `json:"page_size"`
	TotalPages    int            `json:"total_pages"`
}

type NotificationSummaryResponse struct {
	UnreadCount int `json:"unread_count"`
}
