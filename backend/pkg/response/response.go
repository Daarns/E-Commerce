package response

import (
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// Response represents a standard API response
type Response struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   *ErrorData  `json:"error,omitempty"`
	Meta    *Meta       `json:"meta,omitempty"`
}

// ErrorData represents error details
type ErrorData struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

// Meta represents pagination metadata
type Meta struct {
	Page       int `json:"page"`
	PerPage    int `json:"per_page"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

// Success sends a 200 OK response with data
func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Success: true,
		Data:    data,
	})
}

// Created sends a 201 Created response with data
func Created(c *gin.Context, data interface{}) {
	c.JSON(http.StatusCreated, Response{
		Success: true,
		Data:    data,
	})
}

// SuccessWithMessage sends a success response with custom message
func SuccessWithMessage(c *gin.Context, statusCode int, message string, data interface{}) {
	c.JSON(statusCode, Response{
		Success: true,
		Message: message,
		Data:    data,
	})
}

// SuccessWithMeta sends a success response with pagination metadata
func SuccessWithMeta(c *gin.Context, statusCode int, message string, data interface{}, meta *Meta) {
	c.JSON(statusCode, Response{
		Success: true,
		Message: message,
		Data:    data,
		Meta:    meta,
	})
}

// Error sends an error response
func Error(c *gin.Context, statusCode int, code, message string) {
	message = sanitizeClientErrorMessage(statusCode, code, message)
	c.JSON(statusCode, Response{
		Success: false,
		Error: &ErrorData{
			Code:    code,
			Message: message,
		},
	})
}

func sanitizeClientErrorMessage(statusCode int, code, message string) string {
	lower := strings.ToLower(message)
	leaksInternalDetail := strings.Contains(lower, "sqlstate") ||
		strings.Contains(lower, "duplicate key value") ||
		strings.Contains(lower, "violates unique constraint") ||
		strings.Contains(lower, "violates foreign key constraint") ||
		strings.Contains(lower, "pq:") ||
		strings.Contains(lower, "gorm") ||
		strings.Contains(lower, "failed to ")

	if !leaksInternalDetail && statusCode < http.StatusInternalServerError {
		return message
	}

	if leaksInternalDetail {
		log.Printf("internal error detail suppressed: code=%s status=%d message=%s", code, statusCode, message)
	}

	switch statusCode {
	case http.StatusConflict:
		return "Resource conflict"
	case http.StatusBadRequest:
		return "Invalid request"
	case http.StatusNotFound:
		return "Resource not found"
	default:
		if statusCode >= http.StatusInternalServerError {
			return "Internal server error"
		}
		return message
	}
}

// ErrorWithDetails sends an error response with details
func ErrorWithDetails(c *gin.Context, statusCode int, code, message string, details interface{}) {
	c.JSON(statusCode, Response{
		Success: false,
		Error: &ErrorData{
			Code:    code,
			Message: message,
			Details: details,
		},
	})
}

// ValidationError sends a validation error response
func ValidationError(c *gin.Context, details interface{}) {
	ErrorWithDetails(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid input data", details)
}

// Unauthorized sends an unauthorized error response
func Unauthorized(c *gin.Context, message string) {
	if message == "" {
		message = "Unauthorized access"
	}
	Error(c, http.StatusUnauthorized, "UNAUTHORIZED", message)
}

// Forbidden sends a forbidden error response
func Forbidden(c *gin.Context, message string) {
	if message == "" {
		message = "Access forbidden"
	}
	Error(c, http.StatusForbidden, "FORBIDDEN", message)
}

// NotFound sends a not found error response
func NotFound(c *gin.Context, message string) {
	if message == "" {
		message = "Resource not found"
	}
	Error(c, http.StatusNotFound, "NOT_FOUND", message)
}

// InternalError sends an internal server error response
func InternalError(c *gin.Context, message string) {
	if message == "" {
		message = "Internal server error"
	}
	Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", message)
}

// Conflict sends a conflict error response
func Conflict(c *gin.Context, message string) {
	if message == "" {
		message = "Resource conflict"
	}
	Error(c, http.StatusConflict, "CONFLICT", message)
}

// TooManyRequests sends a rate limit error response
func TooManyRequests(c *gin.Context, message string) {
	if message == "" {
		message = "Too many requests"
	}
	Error(c, http.StatusTooManyRequests, "RATE_LIMIT_EXCEEDED", message)
}
