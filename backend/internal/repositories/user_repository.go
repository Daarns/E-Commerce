package repositories

import (
	"ecommerce-backend/internal/models"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// UserRepository handles user data operations
type UserRepository struct {
	db *gorm.DB
}

// NewUserRepository creates a new user repository
func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

// Create creates a new user
func (r *UserRepository) Create(user *models.User) error {
	if err := r.db.Create(user).Error; err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}
	return nil
}

// GetByID retrieves a user by ID
func (r *UserRepository) GetByID(id uuid.UUID) (*models.User, error) {
	var user models.User
	err := r.db.Where("id = ? AND deleted_at IS NULL", id).First(&user).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return &user, nil
}

// GetByEmail retrieves a user by email
func (r *UserRepository) GetByEmail(email string) (*models.User, error) {
	var user models.User
	err := r.db.Where("email = ? AND deleted_at IS NULL", email).First(&user).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return &user, nil
}

// Update updates a user
func (r *UserRepository) Update(user *models.User) error {
	if err := r.db.Save(user).Error; err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}
	return nil
}

// Delete soft deletes a user
func (r *UserRepository) Delete(id uuid.UUID) error {
	if err := r.db.Model(&models.User{}).Where("id = ?", id).Update("deleted_at", gorm.Expr("CURRENT_TIMESTAMP")).Error; err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}
	return nil
}

// EmailExists checks if email already exists
func (r *UserRepository) EmailExists(email string) (bool, error) {
	var count int64
	err := r.db.Model(&models.User{}).Where("email = ? AND deleted_at IS NULL", email).Count(&count).Error
	if err != nil {
		return false, fmt.Errorf("failed to check email existence: %w", err)
	}
	return count > 0, nil
}

// SaveRefreshToken saves a refresh token
func (r *UserRepository) SaveRefreshToken(token *models.RefreshToken) error {
	if err := r.db.Create(token).Error; err != nil {
		return fmt.Errorf("failed to save refresh token: %w", err)
	}
	return nil
}

// GetRefreshToken retrieves a refresh token by token string
func (r *UserRepository) GetRefreshToken(tokenString string) (*models.RefreshToken, error) {
	var token models.RefreshToken
	err := r.db.Where("token = ?", tokenString).First(&token).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("refresh token not found")
		}
		return nil, fmt.Errorf("failed to get refresh token: %w", err)
	}
	return &token, nil
}

// DeleteRefreshToken deletes a refresh token
func (r *UserRepository) DeleteRefreshToken(tokenString string) error {
	if err := r.db.Where("token = ?", tokenString).Delete(&models.RefreshToken{}).Error; err != nil {
		return fmt.Errorf("failed to delete refresh token: %w", err)
	}
	return nil
}

// DeleteUserRefreshTokens deletes all refresh tokens for a user
func (r *UserRepository) DeleteUserRefreshTokens(userID uuid.UUID) error {
	if err := r.db.Where("user_id = ?", userID).Delete(&models.RefreshToken{}).Error; err != nil {
		return fmt.Errorf("failed to delete user refresh tokens: %w", err)
	}
	return nil
}

// UpdateLastLogin updates the last login timestamp
func (r *UserRepository) UpdateLastLogin(userID uuid.UUID) error {
	if err := r.db.Model(&models.User{}).Where("id = ?", userID).Update("last_login_at", gorm.Expr("CURRENT_TIMESTAMP")).Error; err != nil {
		return fmt.Errorf("failed to update last login: %w", err)
	}
	return nil
}

// GetAllUsers retrieves all active, non-deleted users with optional filters
func (r *UserRepository) GetAllUsers(page, pageSize int) ([]models.User, int64, error) {
	var users []models.User
	var total int64

	query := r.db.Where("deleted_at IS NULL")

	// Get total count
	if err := query.Model(&models.User{}).Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count users: %w", err)
	}

	// Apply pagination
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}

	offset := (page - 1) * pageSize

	// Get users
	err := query.
		Order("created_at DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&users).Error

	if err != nil {
		return nil, 0, fmt.Errorf("failed to get users: %w", err)
	}

	return users, total, nil
}

// GetUsersForExport retrieves all users for export purposes
func (r *UserRepository) GetUsersForExport() ([]models.User, error) {
	var users []models.User

	err := r.db.
		Where("deleted_at IS NULL").
		Order("created_at DESC").
		Find(&users).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get users for export: %w", err)
	}

	return users, nil
}

// GetUserCount returns total count of active users
func (r *UserRepository) GetUserCount() (int64, error) {
	var count int64
	if err := r.db.Model(&models.User{}).Where("deleted_at IS NULL").Count(&count).Error; err != nil {
		return 0, fmt.Errorf("failed to count users: %w", err)
	}
	return count, nil
}
