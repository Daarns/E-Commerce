package models

import (
	"time"

	"github.com/google/uuid"
)

// User represents a user in the system
type User struct {
	ID                        uuid.UUID  `json:"id" gorm:"type:uuid;primary_key;default:uuid_generate_v4()"`
	Email                     string     `json:"email" gorm:"uniqueIndex;not null"`
	PasswordHash              string     `json:"-" gorm:"not null"` // Never expose in JSON
	Name                      string     `json:"name" gorm:"not null"`
	Phone                     *string    `json:"phone,omitempty"`
	AvatarURL                 *string    `json:"avatar_url,omitempty"`
	Role                      string     `json:"role" gorm:"not null;default:'customer'"` // customer, admin
	IsVerified                bool       `json:"is_verified" gorm:"default:false"`
	IsActive                  bool       `json:"is_active" gorm:"default:true"`
	EmailVerificationToken    *string    `json:"-"`
	EmailVerificationExpiresAt *time.Time `json:"-"`
	PasswordResetToken        *string    `json:"-"`
	PasswordResetExpiresAt    *time.Time `json:"-"`
	LastLoginAt               *time.Time `json:"last_login_at,omitempty"`
	CreatedAt                 time.Time  `json:"created_at"`
	UpdatedAt                 time.Time  `json:"updated_at"`
	DeletedAt                 *time.Time `json:"deleted_at,omitempty" gorm:"index"`
}

// TableName specifies the table name for User
func (User) TableName() string {
	return "users"
}

// IsAdmin checks if user has admin role
func (u *User) IsAdmin() bool {
	return u.Role == "admin"
}

// IsCustomer checks if user has customer role
func (u *User) IsCustomer() bool {
	return u.Role == "customer"
}

// CanLogin checks if user is allowed to login
func (u *User) CanLogin() bool {
	return u.IsVerified && u.IsActive && u.DeletedAt == nil
}

// RefreshToken represents a refresh token
type RefreshToken struct {
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:uuid_generate_v4()"`
	UserID    uuid.UUID `json:"user_id" gorm:"type:uuid;not null;index"`
	Token     string    `json:"token" gorm:"uniqueIndex;not null"`
	ExpiresAt time.Time `json:"expires_at" gorm:"not null"`
	CreatedAt time.Time `json:"created_at"`
}

// TableName specifies the table name for RefreshToken
func (RefreshToken) TableName() string {
	return "refresh_tokens"
}

// IsExpired checks if refresh token has expired
func (rt *RefreshToken) IsExpired() bool {
	return time.Now().After(rt.ExpiresAt)
}
