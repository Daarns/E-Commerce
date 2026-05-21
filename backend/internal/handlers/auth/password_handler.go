package auth

import (
	"ecommerce-backend/internal/middleware"
	"ecommerce-backend/internal/services/auth"
	"ecommerce-backend/pkg/response"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

// ChangePassword changes the authenticated user's password
// PUT /auth/me/password
func (h *AuthHandler) ChangePassword(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		response.Unauthorized(c, "Authentication required")
		return
	}

	var input auth.ChangePasswordInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	if err := h.authUseCase.ChangePassword(userID, input); err != nil {
		errMsg := err.Error()
		if errMsg == "current password is incorrect" {
			response.Error(c, http.StatusBadRequest, "WRONG_PASSWORD", errMsg)
			return
		}
		response.InternalError(c, "Failed to change password")
		return
	}

	response.Success(c, gin.H{"message": "Password changed successfully"})
}

// ForgotPassword sends a password reset link to the user's email
// POST /auth/forgot-password
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var input auth.ForgotPasswordInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "http://localhost:3000"
	}

	if err := h.authUseCase.ForgotPassword(input, appURL); err != nil {
		errMsg := err.Error()
		// Rate limit: surface to client with remaining seconds
		if strings.HasPrefix(errMsg, "reset_rate_limit:") {
			remaining := strings.TrimPrefix(errMsg, "reset_rate_limit:")
			response.Error(c, http.StatusTooManyRequests, "RATE_LIMITED",
				fmt.Sprintf("reset_rate_limit:%s", remaining))
			return
		}
		// Silently succeed for any other error (anti-enumeration)
	}

	response.Success(c, gin.H{"message": "If an account with that email exists, a reset link has been sent"})
}

// ResetPassword resets the user password using the reset token
// POST /auth/reset-password
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var input auth.ResetPasswordInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	if err := h.authUseCase.ResetPassword(input); err != nil {
		errMsg := err.Error()
		if errMsg == "invalid or expired reset token" || errMsg == "reset token has expired" {
			response.Error(c, http.StatusBadRequest, "INVALID_TOKEN", errMsg)
			return
		}
		response.InternalError(c, "Failed to reset password")
		return
	}

	response.Success(c, gin.H{"message": "Password reset successfully. You can now log in with your new password."})
}
