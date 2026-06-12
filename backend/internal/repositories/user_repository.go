package repositories

import (
	"ecommerce-backend/internal/models"
	"fmt"
	"strings"

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

// GetDB returns the underlying gorm.DB instance for custom queries
func (r *UserRepository) GetDB() *gorm.DB {
	return r.db
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

// UpdateFields updates specific fields of a user by ID
func (r *UserRepository) UpdateFields(userID uuid.UUID, updates map[string]interface{}) error {
	if err := r.db.Model(&models.User{}).Where("id = ?", userID).Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to update user fields: %w", err)
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

func (r *UserRepository) GetAdmins() ([]models.User, error) {
	var users []models.User
	err := r.db.
		Where("role = ? AND is_active = true AND deleted_at IS NULL", "admin").
		Find(&users).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get admins: %w", err)
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

// GetUsersWithFilters retrieves users with search, role, and status filters
func (r *UserRepository) GetUsersWithFilters(page, pageSize int, search, role, status string, sortBy, sortOrder string) ([]models.User, int64, error) {
	var users []models.User
	var total int64

	query := r.db.Where("deleted_at IS NULL")

	// Apply search filter (name or email)
	if search != "" {
		query = query.Where("name ILIKE ? OR email ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	// Apply role filter
	if role != "" {
		query = query.Where("role = ?", role)
	}

	// Apply status filter
	if status != "" {
		switch status {
		case "active":
			query = query.Where("status = ? AND is_active = true", models.UserStatusActive)
		case "suspended":
			query = query.Where("status = ?", models.UserStatusSuspended)
		case "banned":
			query = query.Where("status = ?", models.UserStatusBanned)
		case "unverified":
			query = query.Where("is_verified = false")
		}
	}

	// Get total count with filters applied
	if err := query.Model(&models.User{}).Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count users: %w", err)
	}

	sortClause := sanitizeUserSort(sortBy, sortOrder)

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
		Order(sortClause).
		Offset(offset).
		Limit(pageSize).
		Find(&users).Error

	if err != nil {
		return nil, 0, fmt.Errorf("failed to get users: %w", err)
	}

	return users, total, nil
}

func (r *UserRepository) UpdateUserStatus(userID uuid.UUID, status string) error {
	isActive := status == models.UserStatusActive
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.User{}).
			Where("id = ? AND deleted_at IS NULL", userID).
			Updates(map[string]interface{}{
				"status":     status,
				"is_active":  isActive,
				"updated_at": gorm.Expr("CURRENT_TIMESTAMP"),
			}).Error; err != nil {
			return fmt.Errorf("failed to update user status: %w", err)
		}

		if !isActive {
			if err := tx.Where("user_id = ?", userID).Delete(&models.RefreshToken{}).Error; err != nil {
				return fmt.Errorf("failed to revoke user refresh tokens: %w", err)
			}
		}
		return nil
	})
}

func (r *UserRepository) UpdateUserRole(userID uuid.UUID, role string) error {
	if err := r.db.Model(&models.User{}).
		Where("id = ? AND deleted_at IS NULL", userID).
		Updates(map[string]interface{}{
			"role":       role,
			"updated_at": gorm.Expr("CURRENT_TIMESTAMP"),
		}).Error; err != nil {
		return fmt.Errorf("failed to update user role: %w", err)
	}
	return nil
}

func sanitizeUserSort(sortBy, sortOrder string) string {
	allowedSortFields := map[string]string{
		"created_at":    "created_at",
		"name":          "name",
		"email":         "email",
		"last_login_at": "last_login_at",
	}

	sortColumn, ok := allowedSortFields[sortBy]
	if !ok {
		sortColumn = "created_at"
	}

	sortDirection := strings.ToLower(sortOrder)
	if sortDirection != "asc" && sortDirection != "desc" {
		sortDirection = "desc"
	}

	return fmt.Sprintf("%s %s", sortColumn, sortDirection)
}

// GetUserMetrics returns user statistics
func (r *UserRepository) GetUserMetrics() (map[string]interface{}, error) {
	metrics := make(map[string]interface{})

	// Total users
	var totalUsers int64
	if err := r.db.Model(&models.User{}).Where("deleted_at IS NULL").Count(&totalUsers).Error; err != nil {
		return nil, fmt.Errorf("failed to count total users: %w", err)
	}
	metrics["total_users"] = totalUsers

	// Active users
	var activeUsers int64
	if err := r.db.Model(&models.User{}).
		Where("status = ? AND is_active = true AND deleted_at IS NULL", models.UserStatusActive).
		Count(&activeUsers).Error; err != nil {
		return nil, fmt.Errorf("failed to count active users: %w", err)
	}
	metrics["active_users"] = activeUsers

	// Suspended users
	var suspendedUsers int64
	if err := r.db.Model(&models.User{}).
		Where("status = ? AND deleted_at IS NULL", models.UserStatusSuspended).
		Count(&suspendedUsers).Error; err != nil {
		return nil, fmt.Errorf("failed to count suspended users: %w", err)
	}
	metrics["suspended_users"] = suspendedUsers

	var bannedUsers int64
	if err := r.db.Model(&models.User{}).
		Where("status = ? AND deleted_at IS NULL", models.UserStatusBanned).
		Count(&bannedUsers).Error; err != nil {
		return nil, fmt.Errorf("failed to count banned users: %w", err)
	}
	metrics["banned_users"] = bannedUsers

	return metrics, nil
}
