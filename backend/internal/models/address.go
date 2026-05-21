package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Address represents a user's shipping/billing address
type Address struct {
	ID            uuid.UUID      `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	UserID        uuid.UUID      `gorm:"type:uuid;not null" json:"user_id"`
	RecipientName string         `gorm:"column:name;size:255;not null" json:"recipient_name"`
	Phone         string         `gorm:"size:20;not null" json:"phone"`
	AddressLine1  string         `gorm:"column:address_line1;size:255;not null" json:"address_line1"`
	AddressLine2  string         `gorm:"column:address_line2;size:255" json:"address_line2"`
	City          string         `gorm:"size:100;not null" json:"city"`
	Province      string         `gorm:"size:100;not null" json:"province"`
	PostalCode    string         `gorm:"column:postal_code;size:10;not null" json:"postal_code"`
	IsDefault     bool           `gorm:"column:is_default;default:false" json:"is_default"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

// TableName sets the table name
func (Address) TableName() string {
	return "addresses"
}

// BeforeCreate generates UUID
func (a *Address) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

// GetFullAddress returns formatted full address
func (a *Address) GetFullAddress() string {
	addr := a.AddressLine1
	if a.AddressLine2 != "" {
		addr += ", " + a.AddressLine2
	}
	addr += ", " + a.City + ", " + a.Province + " " + a.PostalCode
	return addr
}