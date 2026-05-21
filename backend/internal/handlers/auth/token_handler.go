package auth

import (
	"ecommerce-backend/internal/services/auth"
	"ecommerce-backend/pkg/response"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// Refresh handles token refresh
// @Summary Refresh access token
// @Tags auth
// @Accept json
// @Produce json
// @Param input body auth.RefreshInput true "Refresh token"
// @Success 200 {object} response.Response
// @Router /auth/refresh [post]
func (h *AuthHandler) Refresh(c *gin.Context) {
	var input auth.RefreshInput
	
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	authResponse, err := h.authUseCase.Refresh(input)
	if err != nil {
		response.Unauthorized(c, "Invalid or expired refresh token")
		return
	}

	response.Success(c, authResponse)
}

// VerifyEmail verifies user email with verification code
// @Summary Verify email
// @Tags auth
// @Accept json
// @Produce json
// @Param input body auth.VerifyEmailInput true "Verification data"
// @Success 200 {object} response.Response
// @Router /auth/verify-email [post]
func (h *AuthHandler) VerifyEmail(c *gin.Context) {
	var input auth.VerifyEmailInput
	
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	authResponse, err := h.authUseCase.VerifyEmail(input)
	if err != nil {
		errMsg := err.Error()
		
		if errMsg == "email not found" {
			response.NotFound(c, "Email not found")
			return
		}
		if errMsg == "email already verified" {
			response.Error(c, http.StatusBadRequest, "EMAIL_VERIFIED", "Email already verified")
			return
		}
		if errMsg == "verification code expired" {
			response.Error(c, http.StatusBadRequest, "CODE_EXPIRED", "Verification code expired, please request a new code")
			return
		}
		if errMsg == "invalid verification code" {
			response.Error(c, http.StatusBadRequest, "INVALID_CODE", "Invalid verification code")
			return
		}
		if errMsg == "too many failed attempts, please request a new code" {
			response.Error(c, http.StatusBadRequest, "TOO_MANY_ATTEMPTS", "Too many failed attempts, please request a new code")
			return
		}
		if errMsg == "verification code not found" {
			response.Error(c, http.StatusBadRequest, "CODE_NOT_FOUND", "Verification code not found, please request a new code")
			return
		}
		response.InternalError(c, "Failed to verify email")
		return
	}

	response.Success(c, authResponse)
}

// ResendVerificationEmail resends verification email
// @Summary Resend verification email
// @Tags auth
// @Accept json
// @Produce json
// @Param input body auth.ResendVerificationInput true "Email address"
// @Success 200 {object} response.Response
// @Router /auth/resend-verification-email [post]
func (h *AuthHandler) ResendVerificationEmail(c *gin.Context) {
	var input auth.ResendVerificationInput
	
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	if err := h.authUseCase.ResendVerificationEmail(input); err != nil {
		errMsg := err.Error()
		
		// Check for rate limit error
		if strings.HasPrefix(errMsg, "resend_rate_limit:") {
			remainingSeconds := errMsg[len("resend_rate_limit:"):]
			response.ErrorWithDetails(c, http.StatusTooManyRequests, "RESEND_RATE_LIMIT", 
				"Please wait before requesting a new code", 
				map[string]interface{}{
					"remaining_seconds": remainingSeconds,
				})
			return
		}
		
		if errMsg == "email not found" {
			response.NotFound(c, "Email not found")
			return
		}
		if errMsg == "email already verified" {
			response.Error(c, http.StatusBadRequest, "EMAIL_VERIFIED", "Email already verified")
			return
		}
		response.InternalError(c, "Failed to resend verification email")
		return
	}

	response.Success(c, gin.H{"message": "Verification email sent successfully"})
}

