package models

import (
	"time"

	"github.com/google/uuid"
)

// StockAlert represents a notification when product stock falls below threshold
type StockAlert struct {
	ID            uuid.UUID                  `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	UserID        uuid.UUID                  `gorm:"type:uuid;not null;index" json:"user_id"`
	User          *User                      `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user,omitempty"`
	ProductID     uuid.UUID                  `gorm:"type:uuid;not null;index" json:"product_id"`
	Product       *Product                   `gorm:"foreignKey:ProductID;constraint:OnDelete:CASCADE" json:"product,omitempty"`
	CombinationID *uuid.UUID                 `gorm:"type:uuid" json:"combination_id"`
	Combination   *ProductVariantCombination `gorm:"foreignKey:CombinationID" json:"combination,omitempty"`
	Email         string                     `gorm:"size:255;not null" json:"email"`
	IsNotified    bool                       `gorm:"default:false;index" json:"is_notified"`
	CreatedAt     time.Time                  `gorm:"type:timestamp;default:now()" json:"created_at"`
	NotifiedAt    *time.Time                 `gorm:"type:timestamp" json:"notified_at,omitempty"`
}

// TableName specifies the table name for StockAlert
func (StockAlert) TableName() string {
	return "stock_alerts"
}

// MarkNotified marks when alert was last notified
func (sa *StockAlert) MarkNotified() {
	now := time.Now()
	sa.IsNotified = true
	sa.NotifiedAt = &now
}
