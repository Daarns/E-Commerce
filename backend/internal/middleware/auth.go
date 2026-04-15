package middleware

import (
	"ecommerce-backend/pkg/jwt"
	"ecommerce-backend/pkg/response"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// AuthMiddleware validates JWT token
func AuthMiddleware(jwtManager *jwt.Manager) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Unauthorized(c, "Authorization header required")
			c.Abort()
			return
		}

		// Check Bearer format
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			response.Unauthorized(c, "Invalid authorization header format")
			c.Abort()
			return
		}

		tokenString := parts[1]

		// Validate token
		claims, err := jwtManager.ValidateToken(tokenString)
		if err != nil {
			response.Unauthorized(c, "Invalid or expired token")
			c.Abort()
			return
		}

		// Set user info in context
		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Set("user_role", claims.Role)

		c.Next()
	}
}

// OptionalAuthMiddleware validates JWT if present, but allows requests without auth
func OptionalAuthMiddleware(jwtManager *jwt.Manager) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			// No auth header, continue without setting user context
			c.Next()
			return
		}

		// Parse Bearer token
		parts := strings.Split(authHeader, " ")
		if len(parts) == 2 && parts[0] == "Bearer" {
			tokenString := parts[1]
			
			// Validate token
			claims, err := jwtManager.ValidateToken(tokenString)
			if err == nil {
				// Valid token - set user info in context
				c.Set("user_id", claims.UserID)
				c.Set("user_email", claims.Email)
				c.Set("user_role", claims.Role)
			}
			// If validation fails, just continue without user context (guest mode)
		}

		c.Next()
	}
}

// AdminOnly middleware ensures only admin users can access
func AdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("user_role")
		if !exists {
			response.Unauthorized(c, "Authentication required")
			c.Abort()
			return
		}

		if role != "admin" {
			response.Forbidden(c, "Admin access required")
			c.Abort()
			return
		}

		c.Next()
	}
}

// GetUserID retrieves user ID from context
func GetUserID(c *gin.Context) (uuid.UUID, error) {
	userID, exists := c.Get("user_id")
	if !exists {
		return uuid.Nil, gin.Error{Err: gin.Error{}.Err, Type: gin.ErrorTypePrivate}
	}

	id, ok := userID.(uuid.UUID)
	if !ok {
		return uuid.Nil, gin.Error{Err: gin.Error{}.Err, Type: gin.ErrorTypePrivate}
	}

	return id, nil
}

// GetUserEmail retrieves user email from context
func GetUserEmail(c *gin.Context) (string, error) {
	email, exists := c.Get("user_email")
	if !exists {
		return "", gin.Error{Err: gin.Error{}.Err, Type: gin.ErrorTypePrivate}
	}

	emailStr, ok := email.(string)
	if !ok {
		return "", gin.Error{Err: gin.Error{}.Err, Type: gin.ErrorTypePrivate}
	}

	return emailStr, nil
}

// GetUserRole retrieves user role from context
func GetUserRole(c *gin.Context) (string, error) {
	role, exists := c.Get("user_role")
	if !exists {
		return "", gin.Error{Err: gin.Error{}.Err, Type: gin.ErrorTypePrivate}
	}

	roleStr, ok := role.(string)
	if !ok {
		return "", gin.Error{Err: gin.Error{}.Err, Type: gin.ErrorTypePrivate}
	}

	return roleStr, nil
}
