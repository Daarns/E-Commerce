package models

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// ShippingMethod represents an available shipping option stored in the database.
// The orders table stores a snapshot of the chosen code + cost at checkout time,
// so no FK is used between orders and this table (ensures immutable order history).
type ShippingMethod struct {
	ID               uuid.UUID       `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	Code             string          `gorm:"column:code;size:50;uniqueIndex;not null"        json:"code"`
	Name             string          `gorm:"column:name;size:100;not null"                  json:"name"`
	Description      string          `gorm:"column:description;size:255"                    json:"description"`
	Price            decimal.Decimal `gorm:"type:numeric(12,2);not null"                    json:"price"`
	EstimatedDaysMin int             `gorm:"column:estimated_days_min;not null;default:1"   json:"estimated_days_min"`
	EstimatedDaysMax int             `gorm:"column:estimated_days_max;not null;default:7"   json:"estimated_days_max"`
	Icon             string          `gorm:"column:icon;size:50"                            json:"icon"`
	IsActive         bool            `gorm:"column:is_active;not null;default:true"         json:"is_active"`
	DisplayOrder     int             `gorm:"column:display_order;not null;default:0"        json:"display_order"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
}

// TableName sets the table name for GORM.
func (ShippingMethod) TableName() string {
	return "shipping_methods"
}

// BeforeCreate generates a UUID before inserting.
func (sm *ShippingMethod) BeforeCreate(tx *gorm.DB) error {
	if sm.ID == uuid.Nil {
		sm.ID = uuid.New()
	}
	return nil
}
