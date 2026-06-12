package auth

import (
	"ecommerce-backend/internal/middleware"
	"ecommerce-backend/internal/services/auth"
	"ecommerce-backend/pkg/response"
	"fmt"
	"net/http"

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
			// Automatically check/send verification email when user tries to login unverified
			emailSent, err := h.authUseCase.SendVerificationEmailOnLogin(input.Email)
			if err != nil {
				// Don't fail - just warn but still return proper error response
				fmt.Printf("Warning: failed to check/send verification email on login: %v\n", err)
			}

			// Return 403 with info about email being sent or code being reused
			details := map[string]interface{}{
				"email":      input.Email,
				"email_sent": emailSent, // Frontend can use this to determine if to show "Email sent" toast
			}

			response.ErrorWithDetails(c, http.StatusForbidden, "EMAIL_NOT_VERIFIED", "Please verify your email before logging in.", details)
			return
		}
		if err.Error() == "ACCOUNT_SUSPENDED" {
			response.Error(c, http.StatusForbidden, "ACCOUNT_SUSPENDED", "Akun kamu sedang disuspend. Hubungi CS jika menurutmu ini keliru.")
			return
		}
		if err.Error() == "ACCOUNT_BANNED" {
			response.Error(c, http.StatusForbidden, "ACCOUNT_BANNED", "Akun ini sudah diblokir permanen dan tidak bisa digunakan untuk login.")
			return
		}
		if err.Error() == "ACCOUNT_INACTIVE" {
			response.Error(c, http.StatusForbidden, "ACCOUNT_INACTIVE", "Akun ini belum bisa digunakan. Hubungi CS untuk bantuan.")
			return
		}
		// Don't expose specific error for security
		response.Unauthorized(c, "Invalid email or password")
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

// UpdateProfile updates the current user's profile
// PUT /auth/me
func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	// Get user ID from context
	userID, err := middleware.GetUserID(c)
	if err != nil {
		response.Unauthorized(c, "Authentication required")
		return
	}

	var input auth.UpdateProfileInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	user, err := h.authUseCase.UpdateProfile(userID, input)
	if err != nil {
		response.InternalError(c, "Failed to update profile")
		return
	}

	response.Success(c, user)
}

// DeleteAccount soft-deletes the authenticated user's account
// DELETE /auth/me
func (h *AuthHandler) DeleteAccount(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		response.Unauthorized(c, "Authentication required")
		return
	}

	var body struct {
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	if err := h.authUseCase.DeleteAccount(userID, body.Password); err != nil {
		errMsg := err.Error()
		if errMsg == "password is incorrect" {
			response.Error(c, http.StatusBadRequest, "WRONG_PASSWORD", errMsg)
			return
		}
		response.InternalError(c, "Failed to delete account")
		return
	}

	response.Success(c, gin.H{"message": "Account deleted successfully"})
}
