package services

import (
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	"ecommerce-backend/pkg/jwt"
	"ecommerce-backend/pkg/password"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// RegisterInput represents registration input
type RegisterInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Name     string `json:"name" binding:"required,min=2"`
	Phone    string `json:"phone"`
}

// LoginInput represents login input
type LoginInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// RefreshInput represents refresh token input
type RefreshInput struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// AuthResponse represents authentication response
type AuthResponse struct {
	User         *models.User `json:"user"`
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
	ExpiresIn    int          `json:"expires_in"` // seconds
}

// AuthService handles authentication business logic
type AuthService struct {
	userRepo   *repositories.UserRepository
	jwtManager *jwt.Manager
}

// NewAuthService creates a new auth use case
func NewAuthService(userRepo *repositories.UserRepository, jwtManager *jwt.Manager) *AuthService {
	return &AuthService{
		userRepo:   userRepo,
		jwtManager: jwtManager,
	}
}

// Register registers a new user
func (uc *AuthService) Register(input RegisterInput) (*AuthResponse, error) {
	// Validate input
	input.Email = strings.ToLower(strings.TrimSpace(input.Email))
	input.Name = strings.TrimSpace(input.Name)

	// Check if email already exists
	exists, err := uc.userRepo.EmailExists(input.Email)
	if err != nil {
		return nil, fmt.Errorf("failed to check email: %w", err)
	}
	if exists {
		return nil, fmt.Errorf("email already registered")
	}

	// Hash password
	hashedPassword, err := password.Hash(input.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create user
	user := &models.User{
		Email:        input.Email,
		PasswordHash: hashedPassword,
		Name:         input.Name,
		Role:         "customer",
		IsVerified:   false, // Require email verification in production
		IsActive:     true,
	}

	if input.Phone != "" {
		user.Phone = &input.Phone
	}

	if err := uc.userRepo.Create(user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Generate tokens
	return uc.generateAuthResponse(user)
}

// Login authenticates a user
func (uc *AuthService) Login(input LoginInput) (*AuthResponse, error) {
	// Normalize email
	input.Email = strings.ToLower(strings.TrimSpace(input.Email))

	// Get user by email
	user, err := uc.userRepo.GetByEmail(input.Email)
	if err != nil {
		return nil, fmt.Errorf("invalid email or password")
	}

	// Check if user can login
	if !user.CanLogin() {
		return nil, fmt.Errorf("account is inactive or deleted")
	}

	// Verify password
	if !password.Verify(user.PasswordHash, input.Password) {
		return nil, fmt.Errorf("invalid email or password")
	}

	// Update last login
	if err := uc.userRepo.UpdateLastLogin(user.ID); err != nil {
		// Log error but don't fail login
		fmt.Printf("Failed to update last login: %v\n", err)
	}

	// Generate tokens
	return uc.generateAuthResponse(user)
}

// Refresh generates new access token from refresh token
func (uc *AuthService) Refresh(input RefreshInput) (*AuthResponse, error) {
	// Get refresh token from database
	refreshToken, err := uc.userRepo.GetRefreshToken(input.RefreshToken)
	if err != nil {
		return nil, fmt.Errorf("invalid refresh token")
	}

	// Check if token is expired
	if refreshToken.IsExpired() {
		// Delete expired token
		_ = uc.userRepo.DeleteRefreshToken(input.RefreshToken)
		return nil, fmt.Errorf("refresh token expired")
	}

	// Get user
	user, err := uc.userRepo.GetByID(refreshToken.UserID)
	if err != nil {
		return nil, fmt.Errorf("user not found")
	}

	// Check if user can login
	if !user.CanLogin() {
		return nil, fmt.Errorf("account is inactive or deleted")
	}

	// Generate new tokens (rotate refresh token)
	return uc.generateAuthResponse(user)
}

// Logout invalidates refresh token
func (uc *AuthService) Logout(userID uuid.UUID, refreshToken string) error {
	// Delete specific refresh token
	if refreshToken != "" {
		if err := uc.userRepo.DeleteRefreshToken(refreshToken); err != nil {
			return fmt.Errorf("failed to logout: %w", err)
		}
	} else {
		// Delete all user tokens
		if err := uc.userRepo.DeleteUserRefreshTokens(userID); err != nil {
			return fmt.Errorf("failed to logout: %w", err)
		}
	}

	return nil
}

// GetUserByID retrieves user by ID
func (uc *AuthService) GetUserByID(userID uuid.UUID) (*models.User, error) {
	user, err := uc.userRepo.GetByID(userID)
	if err != nil {
		return nil, fmt.Errorf("user not found")
	}
	return user, nil
}

// generateAuthResponse generates access and refresh tokens
func (uc *AuthService) generateAuthResponse(user *models.User) (*AuthResponse, error) {
	// Generate access token
	accessToken, err := uc.jwtManager.GenerateAccessToken(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	// Generate refresh token
	refreshTokenString := uc.jwtManager.GenerateRefreshToken()

	// Save refresh token to database
	refreshToken := &models.RefreshToken{
		UserID:    user.ID,
		Token:     refreshTokenString,
		ExpiresAt: time.Now().Add(uc.jwtManager.GetRefreshTokenExpiry()),
	}

	if err := uc.userRepo.SaveRefreshToken(refreshToken); err != nil {
		return nil, fmt.Errorf("failed to save refresh token: %w", err)
	}

	return &AuthResponse{
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: refreshTokenString,
		ExpiresIn:    int(uc.jwtManager.GetAccessTokenExpiry().Seconds()),
	}, nil
}
