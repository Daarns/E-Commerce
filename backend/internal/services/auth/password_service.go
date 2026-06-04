package auth

import (
	"crypto/sha256"
	"ecommerce-backend/internal/models"
	emailService "ecommerce-backend/internal/services/email"
	"ecommerce-backend/pkg/password"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

const passwordResetResendCooldown = time.Minute

// ForgotPasswordInput represents forgot password input
type ForgotPasswordInput struct {
	Email string `json:"email" binding:"required,email"`
}

// ResetPasswordInput represents reset password input
type ResetPasswordInput struct {
	Token    string `json:"token" binding:"required"`
	Password string `json:"password" binding:"required,min=8"`
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
//   - Rate limited: max 3 requests per 15 minutes per email
func (uc *AuthService) ForgotPassword(input ForgotPasswordInput, appURL string) error {
	email := strings.ToLower(strings.TrimSpace(input.Email))

	// Always return nil to prevent email enumeration
	user, err := uc.userRepo.GetByEmail(email)
	if err != nil {
		fmt.Printf("[ForgotPassword] email not found (silenced): %s\n", email)
		return nil
	}

	// --- Rate limiting: allow one reset-link issue per cooldown window. ---
	if user.PasswordResetExpiresAt != nil {
		issuedAt := user.PasswordResetExpiresAt.Add(-1 * time.Hour) // token expires in 1h → issuedAt = expiresAt - 1h
		elapsed := int(time.Since(issuedAt).Seconds())
		cooldownSeconds := int(passwordResetResendCooldown.Seconds())
		if elapsed < cooldownSeconds {
			remaining := cooldownSeconds - elapsed
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
