package admin

import (
	"ecommerce-backend/internal/repositories"
	"ecommerce-backend/internal/utils"
	"ecommerce-backend/pkg/response"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// AdminUserHandler handles admin user management HTTP requests
type AdminUserHandler struct {
	exportService   *utils.ExportService
	userRepository  *repositories.UserRepository
}

// NewAdminUserHandler creates a new admin user handler
func NewAdminUserHandler(exportService *utils.ExportService, userRepository *repositories.UserRepository) *AdminUserHandler {
	return &AdminUserHandler{
		exportService:   exportService,
		userRepository:  userRepository,
	}
}

// ExportUsersToCSV exports all users to CSV format
// GET /api/v1/admin/users/export
func (h *AdminUserHandler) ExportUsersToCSV(c *gin.Context) {
	// Parse query parameters for filters
	role := c.Query("role")          // "admin", "customer", or empty for all
	status := c.Query("status")      // "active", "inactive", "unverified", or empty for all
	sortBy := c.Query("sort_by")     // "name", "email", "created_at"
	sortOrder := c.Query("sort_order") // "asc", "desc"

	if sortBy == "" {
		sortBy = "created_at"
	}
	if sortOrder == "" {
		sortOrder = "desc"
	}

	// Build export params
	params := utils.CSVExportParams{
		Role:      role,
		Status:    status,
		SortBy:    sortBy,
		SortOrder: sortOrder,
	}

	// Generate CSV
	csvContent, err := h.exportService.ExportAllUsersToCSV(params)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "EXPORT_ERROR", err.Error())
		return
	}

	// Set response headers for file download
	timestamp := time.Now().Format("2006-01-02_150405")
	filename := fmt.Sprintf("users_export_%s.csv", timestamp)

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
	c.Header("Content-Type", "text/csv; charset=utf-8")

	// Return CSV as file
	c.String(http.StatusOK, csvContent)
}

// ListUsers returns paginated list of users
// GET /api/v1/admin/users
func (h *AdminUserHandler) ListUsers(c *gin.Context) {
	// Parse pagination params
	page := 1
	if p := c.Query("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}

	limit := 20
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	// Parse filters
	search := c.Query("search")      // search by name or email
	role := c.Query("role")          // admin, customer
	status := c.Query("status")      // active, inactive, unverified
	sortBy := c.Query("sort_by")     // created_at, name, email, last_login_at
	sortOrder := c.Query("sort_order") // asc, desc

	if sortBy == "" {
		sortBy = "created_at"
	}
	if sortOrder == "" {
		sortOrder = "desc"
	}

	// Get users from repository
	users, total, err := h.userRepository.GetUsersWithFilters(page, limit, search, role, status, sortBy, sortOrder)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_USERS_FAILED", err.Error())
		return
	}

	// Count total pages
	totalPages := (int(total) + limit - 1) / limit
	if totalPages == 0 {
		totalPages = 1
	}

	// Build response with AdminUser format (add extra fields)
	adminUsers := make([]map[string]interface{}, len(users))
	for i, user := range users {
		// Count total orders for this user
		var orderCount int64
		h.userRepository.GetDB().Model(&struct{}{}).
			Table("orders").
			Where("user_id = ? AND deleted_at IS NULL", user.ID).
			Count(&orderCount)

		// Determine user status based on is_active and is_verified
		userStatus := "active"
		if !user.IsActive {
			userStatus = "suspended"
		} else if !user.IsVerified {
			userStatus = "inactive"
		}

		adminUsers[i] = map[string]interface{}{
			"id":              user.ID,
			"email":           user.Email,
			"name":            user.Name,
			"phone":           user.Phone,
			"avatar_url":      user.AvatarURL,
			"role":            user.Role,
			"is_verified":     user.IsVerified,
			"is_active":       user.IsActive,
			"status":          userStatus,
			"last_login":      user.LastLoginAt,
			"total_orders":    orderCount,
			"total_spent":     0, // TODO: Calculate from orders
			"created_at":      user.CreatedAt,
			"updated_at":      user.UpdatedAt,
		}
	}

	response.Success(c, gin.H{
		"data": adminUsers,
		"pagination": gin.H{
			"total":       total,
			"page":        page,
			"limit":       limit,
			"total_pages": totalPages,
		},
		"filters": gin.H{
			"search":     search,
			"role":       role,
			"status":     status,
			"sort_by":    sortBy,
			"sort_order": sortOrder,
		},
	})
}

// GetUser retrieves a single user by ID
// GET /api/v1/admin/users/:id
func (h *AdminUserHandler) GetUser(c *gin.Context) {
	userID := c.Param("id")

	// TODO: Implement actual user retrieval
	response.Success(c, gin.H{
		"id": userID,
		"message": "User details",
	})
}

// GetUserMetrics retrieves user statistics and metrics
// GET /api/v1/admin/users/metrics
func (h *AdminUserHandler) GetUserMetrics(c *gin.Context) {
	metrics, err := h.userRepository.GetUserMetrics()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "METRICS_ERROR", err.Error())
		return
	}

	response.Success(c, metrics)
}
