package auth

import (
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	emailService "ecommerce-backend/internal/services/email"
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

// UpdateProfileInput represents profile update input
type UpdateProfileInput struct {
	Name  string `json:"name" binding:"required,min=2"`
	Phone string `json:"phone"`
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
	userRepo       *repositories.UserRepository
	emailQueueRepo *repositories.EmailQueueRepository
	jwtManager     *jwt.Manager
	emailService   EmailService
}

// EmailService interface for dependency injection
type EmailService interface {
	SendEmailVerification(recipient emailService.EmailRecipient, verificationCode string) error
	SendPasswordReset(recipient emailService.EmailRecipient, resetLink string) error
}

// NewAuthService creates a new auth use case
func NewAuthService(
	userRepo *repositories.UserRepository,
	emailQueueRepo *repositories.EmailQueueRepository,
	jwtManager *jwt.Manager,
	emailService EmailService,
) *AuthService {
	return &AuthService{
		userRepo:       userRepo,
		emailQueueRepo: emailQueueRepo,
		jwtManager:     jwtManager,
		emailService:   emailService,
	}
}

// Register registers a new user
func (uc *AuthService) Register(input RegisterInput) (map[string]interface{}, error) {
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

	// Generate email verification token (6-digit code)
	verificationCode := generateVerificationCode()
	verificationToken := uuid.New().String() // Also save UUID for additional security
	expiresAt := time.Now().Add(20 * time.Minute) // Token valid for 20 minutes
	now := time.Now()

	// Create user (NOT verified, NOT active yet)
	user := &models.User{
		Email:                      input.Email,
		PasswordHash:               hashedPassword,
		Name:                       input.Name,
		Role:                       "customer",
		IsVerified:                 false, // Require email verification
		IsActive:                   true,  // Will be fully active after verification
		EmailVerificationToken:     &verificationToken,
		EmailVerificationCode:      &verificationCode,
		EmailVerificationExpiresAt: &expiresAt,
		EmailVerificationAttempts: 0,
		LastCodeSentAt:           &now,
	}

	if input.Phone != "" {
		user.Phone = &input.Phone
	}

	if err := uc.userRepo.Create(user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Create email queue for verification email
	emailQueue := &models.EmailQueue{
		ID:             uuid.New(),
		EmailType:      models.EmailTypeEmailVerification,
		Status:         models.EmailQueueStatusPending,
		RecipientEmail: user.Email,
		RecipientName:  user.Name,
		Subject:        "Verify Your Email - STORE",
		Body:           fmt.Sprintf("Your verification code is: %s\n\nThis code will expire in 24 hours.", verificationCode),
		HtmlBody:       fmt.Sprintf(`<p>Your verification code is: <strong>%s</strong></p><p>This code will expire in 24 hours.</p>`, verificationCode),
		Data: models.EmailQueueData{
			"user_id":             user.ID.String(),
			"email":               user.Email,
			"verification_code":   verificationCode,
			"verification_token":  verificationToken,
			"expires_at":          expiresAt.Format(time.RFC3339),
		},
		UserID:       &user.ID,
		AttemptCount: 0,
		MaxAttempts:  5,
	}

	if err := uc.emailQueueRepo.Create(emailQueue); err != nil {
		// Log error but don't fail registration - queue might fail later
		fmt.Printf("Warning: failed to create email queue for user %s: %v\n", user.ID, err)
	}

	// Send verification email
	if uc.emailService != nil {
		go func() {
			if err := uc.emailService.SendEmailVerification(
				emailService.EmailRecipient{
					Email: user.Email,
					Name:  user.Name,
				},
				verificationCode,
			); err != nil {
				fmt.Printf("Failed to send verification email to %s: %v\n", user.Email, err)
			} else {
				fmt.Printf("Verification email sent to %s\n", user.Email)
			}
		}()
	}

	// Return registration response (user not logged in, needs verification first)
	return map[string]interface{}{
		"message": "Registration successful. Check your email for verification code.",
		"email":   user.Email,
		"user_id": user.ID,
	}, nil
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

	// Verify password first
	if !password.Verify(user.PasswordHash, input.Password) {
		return nil, fmt.Errorf("invalid email or password")
	}

	// Check if user is verified (separate error for better UX)
	if !user.IsVerified {
		return nil, fmt.Errorf("EMAIL_NOT_VERIFIED")
	}

	// Check if user is active
	if !user.IsActive || user.DeletedAt != nil {
		return nil, fmt.Errorf("account is inactive or deleted")
	}

	// Update last login
	if err := uc.userRepo.UpdateLastLogin(user.ID); err != nil {
		// Log error but don't fail login
		fmt.Printf("Failed to update last login: %v\n", err)
	}

	// Generate tokens
	return uc.generateAuthResponse(user)
}

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

// UpdateProfile updates the current user's name and phone
func (uc *AuthService) UpdateProfile(userID uuid.UUID, input UpdateProfileInput) (*models.User, error) {
	// Get current user
	user, err := uc.userRepo.GetByID(userID)
	if err != nil {
		return nil, fmt.Errorf("user not found")
	}

	// Update fields
	user.Name = input.Name
	if input.Phone != "" {
		user.Phone = &input.Phone
	}
	user.UpdatedAt = time.Now()

	// Save to database
	if err := uc.userRepo.Update(user); err != nil {
		return nil, fmt.Errorf("failed to update profile: %w", err)
	}

	return user, nil
}

func (uc *AuthService) DeleteAccount(userID uuid.UUID, currentPassword string) error {
	// Get current user
	user, err := uc.userRepo.GetByID(userID)
	if err != nil {
		return fmt.Errorf("user not found")
	}

	// Verify password before deletion (security confirmation)
	if !password.Verify(user.PasswordHash, currentPassword) {
		return fmt.Errorf("password is incorrect")
	}

	// Revoke all refresh tokens first
	if err := uc.userRepo.DeleteUserRefreshTokens(userID); err != nil {
		fmt.Printf("Warning: failed to revoke refresh tokens before deletion for user %s: %v\n", userID, err)
	}

	// Soft delete the user
	if err := uc.userRepo.Delete(userID); err != nil {
		return fmt.Errorf("failed to delete account: %w", err)
	}

	return nil
}

// ForgotPassword initiates the password reset flow.
//
// Security model (follows Django/Devise best practice):
//   - Raw token is sent in the email link, NEVER stored in DB
//   - SHA-256 hash of the token is stored in DB
//   - If DB is breached, tokens cannot be used (attacker only has hashes)
//   - Token is single-use, expires in 1 hour
func (uc *AuthService) generateAuthResponse(user *models.User) (*AuthResponse, error) {
	// Delete old refresh tokens for this user (cleanup/prevent duplicates)
	if err := uc.userRepo.DeleteUserRefreshTokens(user.ID); err != nil {
		// Log but don't fail - old tokens cleanup is not critical
		fmt.Printf("Warning: failed to delete old refresh tokens for user %s: %v\n", user.ID, err)
	}

	// Generate access token
	accessToken, err := uc.jwtManager.GenerateAccessToken(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	// Generate refresh token (now returns JWT)
	refreshTokenString, err := uc.jwtManager.GenerateRefreshToken(user.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

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

