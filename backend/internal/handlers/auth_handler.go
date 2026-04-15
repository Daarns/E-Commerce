package handlers

import (
	"ecommerce-backend/internal/middleware"
	"ecommerce-backend/internal/services"
	"ecommerce-backend/pkg/response"

	"github.com/gin-gonic/gin"
)

// AuthHandler handles authentication endpoints
type AuthHandler struct {
	authUseCase *services.AuthService
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(authUseCase *services.AuthService) *AuthHandler {
	return &AuthHandler{
		authUseCase: authUseCase,
	}
}

// Register handles user registration
// @Summary Register a new user
// @Tags auth
// @Accept json
// @Produce json
// @Param input body services.RegisterInput true "Registration data"
// @Success 201 {object} response.Response
// @Router /auth/register [post]
func (h *AuthHandler) Register(c *gin.Context) {
	var input services.RegisterInput
	
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
// @Param input body services.LoginInput true "Login credentials"
// @Success 200 {object} response.Response
// @Router /auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var input services.LoginInput
	
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	authResponse, err := h.authUseCase.Login(input)
	if err != nil {
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
// @Param input body services.RefreshInput true "Refresh token"
// @Success 200 {object} response.Response
// @Router /auth/refresh [post]
func (h *AuthHandler) Refresh(c *gin.Context) {
	var input services.RefreshInput
	
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
