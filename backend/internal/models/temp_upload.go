package models

import (
	"time"

	"github.com/google/uuid"
)

// TempUpload represents an uncommitted file upload pending cleanup
type TempUpload struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey;default:uuid_generate_v4()" json:"id"`
	ImageURL    string     `gorm:"type:text;not null" json:"image_url"`
	UploadedBy  *uuid.UUID `gorm:"type:uuid;index" json:"uploaded_by"`
	Width       *int       `gorm:"column:width" json:"width,omitempty"`
	Height      *int       `gorm:"column:height" json:"height,omitempty"`
	AspectRatio *float64   `gorm:"column:aspect_ratio;type:numeric(10,6)" json:"aspect_ratio,omitempty"`
	ExpiresAt   time.Time  `gorm:"type:timestamptz;not null;index:,type:btree" json:"expires_at"`
	Claimed     bool       `gorm:"type:boolean;not null;default:false" json:"claimed"`
	CreatedAt   time.Time  `gorm:"type:timestamptz;not null;default:current_timestamp" json:"created_at"`
}

// TableName sets the table name
func (TempUpload) TableName() string {
	return "temp_uploads"
}
