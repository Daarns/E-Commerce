package auth

import (
	"ecommerce-backend/internal/middleware"
	"ecommerce-backend/internal/services/auth"
	"ecommerce-backend/pkg/response"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// AuthHandler handles authentication endpoints
type AuthHandler struct {
	authUseCase *auth.AuthService
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(authUseCase *auth.AuthService) *AuthHandler {
	return &AuthHandler{
		authUseCase: authUseCase,
	}
}

// Register handles user registration
// @Summary Register a new user
// @Tags auth
// @Accept json
// @Produce json
// @Param input body auth.RegisterInput true "Registration data"
// @Success 201 {object} response.Response
// @Router /auth/register [post]
func (h *AuthHandler) Register(c *gin.Context) {
	var input auth.RegisterInput
	
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	authResponse, err := h.authUseCase.Register(input)
	if err != nil {
		// Check for specific errors
		if err.Error() == "email already registered" {
			response.Conflict(c, err.Error())
			return
		}
		response.InternalError(c, "Failed to register user")
		return
	}

	response.Created(c, authResponse)
}

// Login handles user login
// @Summary Login user
// @Tags auth
// @Accept json
// @Produce json
// @Param input body auth.LoginInput true "Login credentials"
// @Success 200 {object} response.Response
// @Router /auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var input auth.LoginInput
	
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	authResponse, err := h.authUseCase.Login(input)
	if err != nil {
		// Check if error is due to unverified email
		if err.Error() == "EMAIL_NOT_VERIFIED" {
			response.ErrorWithDetails(c, http.StatusForbidden, "EMAIL_NOT_VERIFIED", "Please verify your email before logging in", map[string]interface{}{
				"email": input.Email,
			})
			return
		}
		// Don't expose specific error for security
		response.Unauthorized(c, "Invalid email or password")
		return
	}

	response.Success(c, authResponse)
}

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

// Logout handles user logout
// @Summary Logout user
// @Tags auth
// @Security Bearer
// @Accept json
// @Produce json
// @Param body body map[string]string false "Refresh token (optional)"
// @Success 200 {object} response.Response
// @Router /auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, err := middleware.GetUserID(c)
	if err != nil {
		response.Unauthorized(c, "Authentication required")
		return
	}

	// Get refresh token from body (optional)
	var body struct {
		RefreshToken string `json:"refresh_token"`
	}
	_ = c.ShouldBindJSON(&body)

	if err := h.authUseCase.Logout(userID, body.RefreshToken); err != nil {
		response.InternalError(c, "Failed to logout")
		return
	}

	response.Success(c, gin.H{"message": "Logout successful"})
}

// GetProfile returns the current user's profile
// @Summary Get user profile
// @Tags auth
// @Security Bearer
// @Produce json
// @Success 200 {object} response.Response
// @Router /auth/me [get]
func (h *AuthHandler) GetProfile(c *gin.Context) {
	// Get user ID from context
	userID, err := middleware.GetUserID(c)
	if err != nil {
		response.Unauthorized(c, "Authentication required")
		return
	}

	user, err := h.authUseCase.GetUserByID(userID)
	if err != nil {
		response.NotFound(c, "User not found")
		return
	}

	response.Success(c, user)
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