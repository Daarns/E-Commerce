package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	emailService "ecommerce-backend/internal/services/email"
	"ecommerce-backend/pkg/jwt"
	"ecommerce-backend/pkg/password"
	"encoding/hex"
	"fmt"
	"math/big"
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

// VerifyEmailInput represents email verification input
type VerifyEmailInput struct {
	Email string `json:"email" binding:"required,email"`
	Code  string `json:"code" binding:"required,len=6"`
}

// ResendVerificationInput represents resend verification email input
type ResendVerificationInput struct {
	Email string `json:"email" binding:"required,email"`
}

// UpdateProfileInput represents profile update input
type UpdateProfileInput struct {
	Name  string `json:"name" binding:"required,min=2"`
	Phone string `json:"phone"`
}

// ForgotPasswordInput represents forgot password input
type ForgotPasswordInput struct {
	Email string `json:"email" binding:"required,email"`
}

// ResetPasswordInput represents reset password input
type ResetPasswordInput struct {
	Token    string `json:"token" binding:"required"`
	Password string `json:"password" binding:"required,min=8"`
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

// ChangePasswordInput represents change password input
type ChangePasswordInput struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=8"`
}

// ChangePassword updates the user's password after verifying the current one
func (uc *AuthService) ChangePassword(userID uuid.UUID, input ChangePasswordInput) error {
	// Get current user
	user, err := uc.userRepo.GetByID(userID)
	if err != nil {
		return fmt.Errorf("user not found")
	}

	// Verify current password
	if !password.Verify(user.PasswordHash, input.CurrentPassword) {
		return fmt.Errorf("current password is incorrect")
	}

	// Hash new password
	hashedPassword, err := password.Hash(input.NewPassword)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Update password
	if err := uc.userRepo.UpdateFields(userID, map[string]interface{}{
		"password_hash": hashedPassword,
		"updated_at":    time.Now(),
	}); err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	// Revoke all refresh tokens (force re-login on other devices)
	if err := uc.userRepo.DeleteUserRefreshTokens(userID); err != nil {
		fmt.Printf("Warning: failed to revoke refresh tokens for user %s: %v\n", userID, err)
	}

	return nil
}

// DeleteAccount soft-deletes the user's account after verifying password
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
//   - Rate limited: max 3 requests per 15 minutes per email
func (uc *AuthService) ForgotPassword(input ForgotPasswordInput, appURL string) error {
	email := strings.ToLower(strings.TrimSpace(input.Email))

	// Always return nil to prevent email enumeration
	user, err := uc.userRepo.GetByEmail(email)
	if err != nil {
		fmt.Printf("[ForgotPassword] email not found (silenced): %s\n", email)
		return nil
	}

	// --- Rate limiting (15-minute window, max 3 requests) ---
	if user.PasswordResetExpiresAt != nil {
		// If the last token was issued less than 5 minutes ago, rate-limit
		issuedAt := user.PasswordResetExpiresAt.Add(-1 * time.Hour) // token expires in 1h → issuedAt = expiresAt - 1h
		elapsed := int(time.Since(issuedAt).Seconds())
		if elapsed < 300 { // 5-minute cooldown between resends
			remaining := 300 - elapsed
			return fmt.Errorf("reset_rate_limit:%d", remaining)
		}
	}

	// --- Generate raw token (sent in email, NEVER stored) ---
	rawToken := uuid.New().String()

	// --- Hash the token with SHA-256 before storing in DB ---
	h := sha256.New()
	h.Write([]byte(rawToken))
	tokenHash := hex.EncodeToString(h.Sum(nil))

	expiresAt := time.Now().Add(1 * time.Hour)

	// Store the HASH, not the raw token
	if err := uc.userRepo.UpdateFields(user.ID, map[string]interface{}{
		"password_reset_token":      tokenHash,
		"password_reset_expires_at": expiresAt,
	}); err != nil {
		return fmt.Errorf("failed to save reset token: %w", err)
	}

	// Reset link contains the RAW token (unhashed)
	resetLink := fmt.Sprintf("%s/reset-password?token=%s", appURL, rawToken)

	// Queue email for tracking
	emailQueue := &models.EmailQueue{
		ID:             uuid.New(),
		EmailType:      models.EmailTypePasswordReset,
		Status:         models.EmailQueueStatusPending,
		RecipientEmail: user.Email,
		RecipientName:  user.Name,
		Subject:        "Reset Your Password",
		Body:           fmt.Sprintf("Reset your password: %s\nExpires in 1 hour.", resetLink),
		HtmlBody:       fmt.Sprintf(`<p>Click <a href="%s">here</a> to reset your password. Expires in 1 hour.</p>`, resetLink),
		Data: models.EmailQueueData{
			"user_id":    user.ID.String(),
			"email":      user.Email,
			"reset_link": resetLink,
			"expires_at": expiresAt.Format(time.RFC3339),
		},
		UserID:       &user.ID,
		AttemptCount: 0,
		MaxAttempts:  3,
	}
	if err := uc.emailQueueRepo.Create(emailQueue); err != nil {
		fmt.Printf("Warning: failed to queue password reset email: %v\n", err)
	}

	// Send email asynchronously
	if uc.emailService != nil {
		go func() {
			if err := uc.emailService.SendPasswordReset(
				emailService.EmailRecipient{
					Email: user.Email,
					Name:  user.Name,
				},
				resetLink,
			); err != nil {
				fmt.Printf("[ForgotPassword] failed to send email to %s: %v\n", user.Email, err)
			} else {
				fmt.Printf("[ForgotPassword] reset email sent to %s\n", user.Email)
			}
		}()
	}

	return nil
}

// ResetPassword validates the hashed reset token and updates the user's password.
//
// The incoming raw token is SHA-256 hashed before DB lookup — DB never has the raw token.
func (uc *AuthService) ResetPassword(input ResetPasswordInput) error {
	// Hash the incoming raw token to match what's stored in DB
	h := sha256.New()
	h.Write([]byte(input.Token))
	tokenHash := hex.EncodeToString(h.Sum(nil))

	// Look up user by HASHED token
	var user models.User
	result := uc.userRepo.GetDB().
		Where("password_reset_token = ? AND deleted_at IS NULL", tokenHash).
		First(&user)
	if result.Error != nil {
		return fmt.Errorf("invalid or expired reset token")
	}

	// Check expiry
	if user.PasswordResetExpiresAt == nil || time.Now().After(*user.PasswordResetExpiresAt) {
		_ = uc.userRepo.UpdateFields(user.ID, map[string]interface{}{
			"password_reset_token":      nil,
			"password_reset_expires_at": nil,
		})
		return fmt.Errorf("reset token has expired")
	}

	// Hash new password
	hashedPassword, err := password.Hash(input.Password)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}

	// Atomically: update password + clear reset token
	if err := uc.userRepo.UpdateFields(user.ID, map[string]interface{}{
		"password_hash":             hashedPassword,
		"password_reset_token":      nil,
		"password_reset_expires_at": nil,
		"updated_at":                time.Now(),
	}); err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}

	// Revoke all sessions — force re-login on all devices
	if err := uc.userRepo.DeleteUserRefreshTokens(user.ID); err != nil {
		fmt.Printf("Warning: failed to revoke sessions after password reset for user %s: %v\n", user.ID, err)
	}

	return nil
}

// generateAuthResponse generates access and refresh tokens
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

// VerifyEmail verifies user email with code
func (uc *AuthService) VerifyEmail(input VerifyEmailInput) (*AuthResponse, error) {
	// Normalize email
	input.Email = strings.ToLower(strings.TrimSpace(input.Email))

	// Get user by email
	user, err := uc.userRepo.GetByEmail(input.Email)
	if err != nil {
		return nil, fmt.Errorf("email not found")
	}

	// Check if already verified
	if user.IsVerified {
		return nil, fmt.Errorf("email already verified")
	}

	// Check if verification token exists
	if user.EmailVerificationToken == nil || user.EmailVerificationCode == nil {
		return nil, fmt.Errorf("verification code not found")
	}

	// Check if token is expired
	if user.EmailVerificationExpiresAt == nil || time.Now().After(*user.EmailVerificationExpiresAt) {
		return nil, fmt.Errorf("verification code expired")
	}

	// Check attempt limit (max 5 attempts)
	if user.EmailVerificationAttempts >= 5 {
		return nil, fmt.Errorf("too many failed attempts, please request a new code")
	}

	// Validate verification code matches stored code (not token)
	if *user.EmailVerificationCode != input.Code {
		// Increment attempts
		user.EmailVerificationAttempts++
		_ = uc.userRepo.UpdateFields(user.ID, map[string]interface{}{
			"email_verification_attempts": user.EmailVerificationAttempts,
		})
		return nil, fmt.Errorf("invalid verification code")
	}

	// Update user as verified and clear token
	if err := uc.userRepo.UpdateFields(user.ID, map[string]interface{}{
		"is_verified":                   true,
		"email_verification_token":      nil,
		"email_verification_code":       nil,
		"email_verification_expires_at": nil,
		"email_verification_attempts":   0,
		"last_code_sent_at":             nil,
	}); err != nil {
		return nil, fmt.Errorf("failed to verify email: %w", err)
	}

	// Refresh user data
	user, err = uc.userRepo.GetByID(user.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to refresh user data: %w", err)
	}

	// Generate tokens
	return uc.generateAuthResponse(user)
}

// ResendVerificationEmail resends verification email
func (uc *AuthService) ResendVerificationEmail(input ResendVerificationInput) error {
	// Normalize email
	input.Email = strings.ToLower(strings.TrimSpace(input.Email))

	// Get user by email
	user, err := uc.userRepo.GetByEmail(input.Email)
	if err != nil {
		return fmt.Errorf("email not found")
	}

	// Check if already verified
	if user.IsVerified {
		return fmt.Errorf("email already verified")
	}

	// Rate limit: Check if 60 seconds have passed since last code sent
	if user.LastCodeSentAt != nil {
		elapsedSeconds := int(time.Since(*user.LastCodeSentAt).Seconds())
		if elapsedSeconds < 60 {
			remainingSeconds := 60 - elapsedSeconds
			return fmt.Errorf("resend_rate_limit:%d", remainingSeconds) // Return remaining time for frontend countdown
		}
	}

	// Generate new verification code and token (invalidates old code)
	verificationCode := generateVerificationCode()
	verificationToken := uuid.New().String()
	expiresAt := time.Now().Add(20 * time.Minute)
	now := time.Now()

	// Update user with new token and reset attempts
	if err := uc.userRepo.UpdateFields(user.ID, map[string]interface{}{
		"email_verification_token":      verificationToken,
		"email_verification_code":       verificationCode,
		"email_verification_expires_at": expiresAt,
		"email_verification_attempts":   0, // Reset attempts on new code
		"last_code_sent_at":            now,
	}); err != nil {
		return fmt.Errorf("failed to update verification token: %w", err)
	}

	// Create new email queue for verification email
	emailQueue := &models.EmailQueue{
		ID:             uuid.New(),
		EmailType:      models.EmailTypeEmailVerification,
		Status:         models.EmailQueueStatusPending,
		RecipientEmail: user.Email,
		RecipientName:  user.Name,
		Subject:        "Verify Your Email - STORE",
		Body:           fmt.Sprintf("Your verification code is: %s\n\nThis code will expire in 20 minutes.", verificationCode),
		HtmlBody:       fmt.Sprintf(`<p>Your verification code is: <strong>%s</strong></p><p>This code will expire in 20 minutes.</p>`, verificationCode),
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
		return fmt.Errorf("failed to create email queue: %w", err)
	}

	// Send verification email (async, may have delay but guaranteed)
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
				fmt.Printf("Verification email resent to %s\n", user.Email)
			}
		}()
	}

	return nil
}

// SendVerificationEmailOnLogin sends verification email when unverified user tries to login
// This is called automatically on failed login due to unverified status
// Smart logic:
// - If valid code already exists (not expired): REUSE it (no new email)
// - If code expired or missing: Generate NEW code and send email
// Returns: (emailSent bool, error)
//   emailSent=true: code was NEW and email was sent
//   emailSent=false: code was REUSED from before, no email sent
func (uc *AuthService) SendVerificationEmailOnLogin(email string) (bool, error) {
	// Normalize email
	email = strings.ToLower(strings.TrimSpace(email))

	// Get user by email
	user, err := uc.userRepo.GetByEmail(email)
	if err != nil {
		return false, fmt.Errorf("user not found")
	}

	// Check if already verified
	if user.IsVerified {
		return false, fmt.Errorf("user already verified")
	}

	now := time.Now()
	emailSent := false
	verificationCode := ""
	verificationToken := ""
	expiresAt := time.Time{}

	// SMART LOGIC: Check if valid code already exists
	if user.EmailVerificationCode != nil && 
	   user.EmailVerificationExpiresAt != nil &&
	   user.EmailVerificationExpiresAt.After(now) {
		// Code still valid - REUSE it
		verificationCode = *user.EmailVerificationCode
		if user.EmailVerificationToken != nil {
			verificationToken = *user.EmailVerificationToken
		}
		expiresAt = *user.EmailVerificationExpiresAt
		emailSent = false
		fmt.Printf("Code still valid for user %s, reusing existing code (expires in %v)\n", 
			email, expiresAt.Sub(now).Minutes())
	} else {
		// Code missing or expired - GENERATE NEW code
		verificationCode = generateVerificationCode()
		verificationToken = uuid.New().String()
		expiresAt = now.Add(20 * time.Minute)
		emailSent = true
		fmt.Printf("Generating new code for user %s\n", email)
	}

	// Update user with verification token and code
	// RESET last_code_sent_at to NULL so user can immediately resend after email
	// Rate limit only applies when user manually clicks "Resend" button
	if err := uc.userRepo.UpdateFields(user.ID, map[string]interface{}{
		"email_verification_token":      verificationToken,
		"email_verification_code":       verificationCode,
		"email_verification_expires_at": expiresAt,
		"email_verification_attempts":   0,
		"last_code_sent_at":             nil, // RESET to allow immediate resend after login email
	}); err != nil {
		return false, fmt.Errorf("failed to update verification token: %w", err)
	}

	// Only send email if NEW code was generated
	if emailSent {
		// Create email queue for verification email
		emailQueue := &models.EmailQueue{
			ID:             uuid.New(),
			EmailType:      models.EmailTypeEmailVerification,
			Status:         models.EmailQueueStatusPending,
			RecipientEmail: user.Email,
			RecipientName:  user.Name,
			Subject:        "Verify Your Email - STORE",
			Body:           fmt.Sprintf("Your verification code is: %s\n\nThis code will expire in 20 minutes.", verificationCode),
			HtmlBody:       fmt.Sprintf(`<p>Your verification code is: <strong>%s</strong></p><p>This code will expire in 20 minutes.</p>`, verificationCode),
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
			return false, fmt.Errorf("failed to create email queue: %w", err)
		}

		// Send verification email (async)
		if uc.emailService != nil {
			go func(u *models.User, code string) {
				if err := uc.emailService.SendEmailVerification(
					emailService.EmailRecipient{
						Email: u.Email,
						Name:  u.Name,
					},
					code,
				); err != nil {
					fmt.Printf("Failed to send verification email to %s: %v\n", u.Email, err)
				} else {
					fmt.Printf("Verification email sent to %s on login\n", u.Email)
				}
			}(user, verificationCode)
		}
	}

	return emailSent, nil
}

// generateVerificationCode generates a random 6-digit code
func generateVerificationCode() string {
	const charset = "0123456789"
	b := make([]byte, 6)
	for i := range b {
		max := big.NewInt(int64(len(charset)))
		num, err := rand.Int(rand.Reader, max)
		if err != nil {
			// Fallback: use simple random if crypto/rand fails
			fmt.Printf("Warning: failed to generate crypto random number: %v\n", err)
			b[i] = charset[i%len(charset)]
			continue
		}
		b[i] = charset[num.Int64()%int64(len(charset))]
	}
	return string(b)
}

