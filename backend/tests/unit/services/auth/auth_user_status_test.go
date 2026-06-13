package auth_test

import (
	"testing"
	"time"

	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	authservice "ecommerce-backend/internal/services/auth"
	emailservice "ecommerce-backend/internal/services/email"
	"ecommerce-backend/pkg/jwt"
	"ecommerce-backend/pkg/password"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type noopEmailService struct{}

func (noopEmailService) SendEmailVerification(emailservice.EmailRecipient, string) error {
	return nil
}

func (noopEmailService) SendPasswordReset(emailservice.EmailRecipient, string) error {
	return nil
}

func setupAuthStatusTest(t *testing.T) (*gorm.DB, *authservice.AuthService) {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file:"+uuid.NewString()+"?mode=memory&cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, createAuthStatusTestSchema(db))

	userRepo := repositories.NewUserRepository(db)
	jwtManager := jwt.NewManager(jwt.Config{
		AccessTokenSecret:    "access-secret",
		RefreshTokenSecret:   "refresh-secret",
		AccessTokenDuration:  15 * time.Minute,
		RefreshTokenDuration: 7 * 24 * time.Hour,
	})

	return db, authservice.NewAuthService(userRepo, nil, jwtManager, noopEmailService{})
}

func createAuthStatusTestSchema(db *gorm.DB) error {
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

func createLoginTestUser(t *testing.T, db *gorm.DB, status string, isActive bool) {
	t.Helper()

	hashedPassword, err := password.Hash("Password123!")
	require.NoError(t, err)

	require.NoError(t, db.Create(&models.User{
		ID:           uuid.New(),
		Email:        status + "@example.com",
		PasswordHash: hashedPassword,
		Name:         status,
		Role:         "customer",
		Status:       status,
		IsActive:     isActive,
		IsVerified:   true,
	}).Error)
}

func TestAuthLoginRejectsSuspendedUser(t *testing.T) {
	db, service := setupAuthStatusTest(t)
	createLoginTestUser(t, db, models.UserStatusSuspended, false)

	result, err := service.Login(authservice.LoginInput{
		Email:    models.UserStatusSuspended + "@example.com",
		Password: "Password123!",
	})

	require.Nil(t, result)
	require.EqualError(t, err, "ACCOUNT_SUSPENDED")
}

func TestAuthLoginRejectsBannedUser(t *testing.T) {
	db, service := setupAuthStatusTest(t)
	createLoginTestUser(t, db, models.UserStatusBanned, false)

	result, err := service.Login(authservice.LoginInput{
		Email:    models.UserStatusBanned + "@example.com",
		Password: "Password123!",
	})

	require.Nil(t, result)
	require.EqualError(t, err, "ACCOUNT_BANNED")
}

func TestAuthLoginAllowsActiveUser(t *testing.T) {
	db, service := setupAuthStatusTest(t)
	createLoginTestUser(t, db, models.UserStatusActive, true)

	result, err := service.Login(authservice.LoginInput{
		Email:    models.UserStatusActive + "@example.com",
		Password: "Password123!",
	})

	require.NoError(t, err)
	require.NotNil(t, result)
	require.Equal(t, models.UserStatusActive, result.User.Status)
	require.NotEmpty(t, result.AccessToken)
	require.NotEmpty(t, result.RefreshToken)
}
