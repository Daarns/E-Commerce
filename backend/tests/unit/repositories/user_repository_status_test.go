package repositories_test

import (
	"testing"
	"time"

	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupUserRepositoryStatusTest(t *testing.T) (*gorm.DB, *repositories.UserRepository) {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file:"+uuid.NewString()+"?mode=memory&cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, createUserStatusTestSchema(db))

	return db, repositories.NewUserRepository(db)
}

func createUserStatusTestSchema(db *gorm.DB) error {
	if err := db.Exec(`
		CREATE TABLE users (
			id TEXT PRIMARY KEY,
			email TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			name TEXT NOT NULL,
			phone TEXT,
			avatar_url TEXT,
			role TEXT NOT NULL DEFAULT 'customer',
			status TEXT NOT NULL DEFAULT 'active',
			is_verified BOOLEAN DEFAULT false,
			is_active BOOLEAN DEFAULT true,
			email_verification_token TEXT,
			email_verification_code TEXT,
			email_verification_expires_at DATETIME,
			email_verification_attempts INTEGER DEFAULT 0,
			last_code_sent_at DATETIME,
			password_reset_token TEXT,
			password_reset_expires_at DATETIME,
			last_login_at DATETIME,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		)
	`).Error; err != nil {
		return err
	}
	return db.Exec(`
		CREATE TABLE refresh_tokens (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			token TEXT NOT NULL UNIQUE,
			expires_at DATETIME NOT NULL,
			created_at DATETIME
		)
	`).Error
}

func TestUserRepositoryUpdateUserStatusRevokesRefreshTokens(t *testing.T) {
	db, repo := setupUserRepositoryStatusTest(t)

	user := models.User{
		ID:           uuid.New(),
		Email:        "customer@example.com",
		PasswordHash: "hash",
		Name:         "Customer",
		Role:         "customer",
		Status:       models.UserStatusActive,
		IsActive:     true,
		IsVerified:   true,
	}
	require.NoError(t, db.Create(&user).Error)
	require.NoError(t, db.Create(&models.RefreshToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		Token:     "refresh-token",
		ExpiresAt: time.Now().Add(time.Hour),
	}).Error)

	require.NoError(t, repo.UpdateUserStatus(user.ID, models.UserStatusSuspended))

	updated, err := repo.GetByID(user.ID)
	require.NoError(t, err)
	require.Equal(t, models.UserStatusSuspended, updated.Status)
	require.False(t, updated.IsActive)

	var tokenCount int64
	require.NoError(t, db.Model(&models.RefreshToken{}).Where("user_id = ?", user.ID).Count(&tokenCount).Error)
	require.Zero(t, tokenCount)
}

func TestUserRepositoryUpdateUserStatusActiveKeepsAccountLoginEligible(t *testing.T) {
	db, repo := setupUserRepositoryStatusTest(t)

	user := models.User{
		ID:           uuid.New(),
		Email:        "customer@example.com",
		PasswordHash: "hash",
		Name:         "Customer",
		Role:         "customer",
		Status:       models.UserStatusSuspended,
		IsActive:     false,
		IsVerified:   true,
	}
	require.NoError(t, db.Create(&user).Error)

	require.NoError(t, repo.UpdateUserStatus(user.ID, models.UserStatusActive))

	updated, err := repo.GetByID(user.ID)
	require.NoError(t, err)
	require.Equal(t, models.UserStatusActive, updated.Status)
	require.True(t, updated.IsActive)
	require.True(t, updated.CanLogin())
}

func TestUserRepositoryMetricsSeparatesSuspendedAndBanned(t *testing.T) {
	db, repo := setupUserRepositoryStatusTest(t)

	users := []models.User{
		{ID: uuid.New(), Email: "active@example.com", PasswordHash: "hash", Name: "Active", Role: "customer", Status: models.UserStatusActive, IsActive: true, IsVerified: true},
		{ID: uuid.New(), Email: "suspended@example.com", PasswordHash: "hash", Name: "Suspended", Role: "customer", Status: models.UserStatusSuspended, IsActive: false, IsVerified: true},
		{ID: uuid.New(), Email: "banned@example.com", PasswordHash: "hash", Name: "Banned", Role: "customer", Status: models.UserStatusBanned, IsActive: false, IsVerified: true},
	}
	require.NoError(t, db.Create(&users).Error)

	metrics, err := repo.GetUserMetrics()
	require.NoError(t, err)

	require.Equal(t, int64(3), metrics["total_users"])
	require.Equal(t, int64(1), metrics["active_users"])
	require.Equal(t, int64(1), metrics["suspended_users"])
	require.Equal(t, int64(1), metrics["banned_users"])
}
