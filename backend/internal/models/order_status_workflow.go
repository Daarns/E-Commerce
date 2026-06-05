package models

import (
	"time"

	"github.com/google/uuid"
)

// OrderStatusWorkflow tracks order status transitions and email triggers
type OrderStatusWorkflow struct {
	ID             uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	OrderID        uuid.UUID  `gorm:"type:uuid;not null;index" json:"order_id"`
	Order          *Order     `gorm:"foreignKey:OrderID" json:"order,omitempty"`
	FromStatus     *string    `gorm:"column:from_status;size:50" json:"from_status"`
	ToStatus       string     `gorm:"column:to_status;size:50;not null;index" json:"to_status"`
	EmailTriggered bool       `gorm:"column:email_triggered;default:false;index" json:"email_triggered"`
	EmailType      *string    `gorm:"column:email_type;size:50" json:"email_type"`
	TriggeredAt    *time.Time `gorm:"column:triggered_at;type:timestamptz" json:"triggered_at,omitempty"`
	Notes          string     `gorm:"type:text" json:"notes,omitempty"`
	CreatedAt      time.Time  `json:"created_at" gorm:"type:timestamptz"`
	UpdatedAt      time.Time  `json:"updated_at" gorm:"type:timestamptz"`
}

// TableName sets the table name
func (OrderStatusWorkflow) TableName() string {
	return "order_status_workflows"
}

// BeforeCreate generates UUID
func (osw *OrderStatusWorkflow) BeforeCreate(tx interface{}) error {
	if osw.ID == uuid.Nil {
		osw.ID = uuid.New()
	}
	return nil
}

// Email type constants for order status notifications
const (
	EmailTypeOrderConfirmed   = "order_confirmed"
	EmailTypePaymentConfirmed = "payment_confirmed"
	EmailTypeOrderProcessing  = "order_processing"
	EmailTypeOrderShipped     = "order_shipped"
	EmailTypeOrderDelivered   = "order_delivered"
	EmailTypeOrderCancelled   = "order_cancelled"
	EmailTypeOrderRefunded    = "order_refunded"
	EmailTypeRefundRejected   = "refund_rejected"
)

// ShouldTriggerEmail determines if this status transition should trigger an email
func (osw *OrderStatusWorkflow) ShouldTriggerEmail() bool {
	// Email for these status transitions
	emailStatuses := map[string]bool{
		OrderStatusPaymentConfirmed: true,
		OrderStatusProcessing:       true,
		OrderStatusShipped:          true,
		OrderStatusDelivered:        true,
		OrderStatusCompleted:        true,
		OrderStatusRefundRequested:  true,
		OrderStatusRefundRejected:   true,
		OrderStatusCancelled:        true,
		OrderStatusRefunded:         true,
	}
	return emailStatuses[osw.ToStatus]
}

// GetEmailType returns the appropriate email type for this status
func (osw *OrderStatusWorkflow) GetEmailType() string {
	emailMap := map[string]string{
		OrderStatusPaymentConfirmed: EmailTypePaymentConfirmed,
		OrderStatusProcessing:       EmailTypeOrderProcessing,
		OrderStatusShipped:          EmailTypeOrderShipped,
		OrderStatusDelivered:        EmailTypeOrderDelivered,
		OrderStatusCompleted:        EmailTypeOrderDelivered,
		OrderStatusRefundRequested:  EmailTypeOrderStatusUpdate,
		OrderStatusRefundRejected:   EmailTypeRefundRejected,
		OrderStatusCancelled:        EmailTypeOrderCancelled,
		OrderStatusRefunded:         EmailTypeOrderRefunded,
	}
	if emailType, ok := emailMap[osw.ToStatus]; ok {
		return emailType
	}
	return EmailTypeOrderConfirmed
}

// MarkEmailTriggered marks this workflow as having triggered an email
func (osw *OrderStatusWorkflow) MarkEmailTriggered(emailType string) {
	now := time.Now()
	osw.EmailTriggered = true
	osw.EmailType = &emailType
	osw.TriggeredAt = &now
}

// IsEmailPending checks if email should be sent but hasn't been yet
func (osw *OrderStatusWorkflow) IsEmailPending() bool {
	return osw.ShouldTriggerEmail() && !osw.EmailTriggered
}
