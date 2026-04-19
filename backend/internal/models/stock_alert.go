package models

import (
	"time"

	"github.com/google/uuid"
)

// StockAlert represents a notification when product stock falls below threshold
type StockAlert struct {
	ID               uuid.UUID `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	ProductID        uuid.UUID `gorm:"type:uuid;not null;index" json:"product_id"`
	Product          *Product  `gorm:"foreignKey:ProductID;constraint:OnDelete:CASCADE" json:"product,omitempty"`
	UserID           uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	User             *User     `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
	AlertThreshold   int       `gorm:"not null" json:"alert_threshold"`
	CurrentQuantity  int       `gorm:"not null" json:"current_quantity"`
	IsTriggered      bool      `gorm:"default:false;index" json:"is_triggered"`
	LastNotifiedAt   *time.Time `json:"last_notified_at,omitempty"`
	CreatedAt        time.Time `gorm:"type:timestamp;default:now()" json:"created_at"`
	UpdatedAt        time.Time `gorm:"type:timestamp" json:"updated_at"`
}

// TableName specifies the table name for StockAlert
func (StockAlert) TableName() string {
	return "stock_alerts"
}

// HasTriggeredThreshold checks if stock has fallen below threshold
func (sa *StockAlert) HasTriggeredThreshold() bool {
	return sa.CurrentQuantity <= sa.AlertThreshold
}

// UpdateQuantity updates current stock quantity
func (sa *StockAlert) UpdateQuantity(newQuantity int) {
	sa.CurrentQuantity = newQuantity
	sa.IsTriggered = sa.HasTriggeredThreshold()
}

// MarkNotified marks when alert was last notified
func (sa *StockAlert) MarkNotified() {
	now := time.Now()
	sa.LastNotifiedAt = &now
}
