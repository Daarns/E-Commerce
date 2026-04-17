package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ActivityLog represents a user activity in the system
type ActivityLog struct {
	ID          uuid.UUID          `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID      uuid.UUID          `json:"user_id" gorm:"type:uuid;not null;index"`
	ActionType  string             `json:"action_type" gorm:"type:varchar(50);not null;index"`
	Description string             `json:"description" gorm:"type:text"`
	Metadata    ActivityMetadata   `json:"metadata" gorm:"type:jsonb;default:'{}';serializer:json"`
	IPAddress   *string            `json:"ip_address,omitempty"`
	UserAgent   *string            `json:"user_agent,omitempty"`
	CreatedAt   time.Time          `json:"created_at" gorm:"autoCreateTime;index"`
}

// TableName specifies the table name for ActivityLog
func (ActivityLog) TableName() string {
	return "activity_logs"
}

// ActivityMetadata stores additional activity information as JSON
type ActivityMetadata struct {
	OrderID          *string            `json:"order_id,omitempty"`
	ProductID        *string            `json:"product_id,omitempty"`
	RefundAmount     *float64           `json:"refund_amount,omitempty"`
	PaymentMethod    *string            `json:"payment_method,omitempty"`
	OldStatus        *string            `json:"old_status,omitempty"`
	NewStatus        *string            `json:"new_status,omitempty"`
	FailureReason    *string            `json:"failure_reason,omitempty"`
	SearchQuery      *string            `json:"search_query,omitempty"`
	CartItemCount    *int               `json:"cart_item_count,omitempty"`
	AdditionalFields map[string]interface{} `json:"additional_fields,omitempty"`
}

// Valid activity action types
const (
	ActionLogin           = "login"
	ActionLogout          = "logout"
	ActionAccountCreated  = "account_created"
	ActionPurchase        = "purchase"
	ActionPaymentProcess  = "payment_process"
	ActionProfileUpdate   = "profile_update"
	ActionPasswordChange  = "password_change"
	ActionRefund          = "refund"
	ActionCancelOrder     = "cancel_order"
	ActionProductView     = "product_view"
	ActionSearch          = "search"
	ActionAddToCart       = "add_to_cart"
	ActionRemoveFromCart  = "remove_from_cart"
	ActionCheckout        = "checkout"
	ActionWishlist        = "wishlist_action"
	ActionReview          = "product_review"
)

// Scan implements sql.Scanner interface for JSON decoding
func (m *ActivityMetadata) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, &m)
}

// Value implements driver.Valuer interface for JSON encoding
func (m ActivityMetadata) Value() (driver.Value, error) {
	return json.Marshal(m)
}

// ActivityFilter represents filtering parameters for activity queries
type ActivityFilter struct {
	ActionTypes []string  `json:"action_types,omitempty"`
	StartDate   *time.Time `json:"start_date,omitempty"`
	EndDate     *time.Time `json:"end_date,omitempty"`
	UserID      *uuid.UUID `json:"user_id,omitempty"`
	Page        int        `json:"page"`
	PageSize    int        `json:"page_size"`
}

// ActivityResponse represents activity data for API responses
type ActivityResponse struct {
	ID          uuid.UUID          `json:"id"`
	UserID      uuid.UUID          `json:"user_id"`
	ActionType  string             `json:"action_type"`
	Description string             `json:"description"`
	Metadata    ActivityMetadata   `json:"metadata"`
	IPAddress   *string            `json:"ip_address,omitempty"`
	CreatedAt   time.Time          `json:"created_at"`
}

// ActivitySummary represents activity statistics
type ActivitySummary struct {
	TotalActivities int64                    `json:"total_activities"`
	ActivitiesByType map[string]int64        `json:"activities_by_type"`
	RecentActivities []ActivityResponse      `json:"recent_activities"`
}
