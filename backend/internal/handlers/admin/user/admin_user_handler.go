package user

import (
	"ecommerce-backend/internal/middleware"
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	"ecommerce-backend/internal/utils"
	"ecommerce-backend/pkg/response"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// AdminUserHandler handles admin user management HTTP requests
type AdminUserHandler struct {
	exportService  *utils.ExportService
	userRepository *repositories.UserRepository
}

type updateUserStatusRequest struct {
	NewStatus string `json:"new_status" binding:"required,oneof=active suspended banned"`
	Reason    string `json:"reason"`
}

type updateUserRoleRequest struct {
	NewRole string `json:"new_role" binding:"required,oneof=customer admin"`
}

// NewAdminUserHandler creates a new admin user handler
func NewAdminUserHandler(exportService *utils.ExportService, userRepository *repositories.UserRepository) *AdminUserHandler {
	return &AdminUserHandler{
		exportService:  exportService,
		userRepository: userRepository,
	}
}

// ExportUsersToCSV exports all users to CSV format
// GET /api/v1/admin/users/export
func (h *AdminUserHandler) ExportUsersToCSV(c *gin.Context) {
	// Parse query parameters for filters
	role := c.Query("role")            // "admin", "customer", or empty for all
	status := c.Query("status")        // "active", "inactive", "unverified", or empty for all
	sortBy := c.Query("sort_by")       // "name", "email", "created_at"
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
	search := c.Query("search")        // search by name or email
	role := c.Query("role")            // admin, customer
	status := c.Query("status")        // active, inactive, unverified
	sortBy := c.Query("sort_by")       // created_at, name, email, last_login_at
	sortOrder := c.Query("sort_order") // asc, desc

	switch sortBy {
	case "created_at", "name", "email", "last_login_at":
	default:
		sortBy = "created_at"
	}

	sortOrder = strings.ToLower(sortOrder)
	switch sortOrder {
	case "asc", "desc":
	default:
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
			Where("user_id = ?", user.ID).
			Count(&orderCount)

		totalSpent := h.getUserTotalSpent(user.ID)
		adminUsers[i] = h.buildAdminUserResponse(&user, orderCount, totalSpent)
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
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_USER_ID", "Invalid user ID")
		return
	}

	user, err := h.userRepository.GetByID(userID)
	if err != nil {
		response.Error(c, http.StatusNotFound, "USER_NOT_FOUND", "User not found")
		return
	}

	orderCount := h.getUserOrderCount(user.ID)
	totalSpent := h.getUserTotalSpent(user.ID)
	response.Success(c, h.buildAdminUserResponse(user, orderCount, totalSpent))
}

// UpdateUserStatus updates a user's account status.
// PUT /api/v1/admin/users/:id/status
func (h *AdminUserHandler) UpdateUserStatus(c *gin.Context) {
	adminID, err := middleware.GetUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "User must be authenticated")
		return
	}

	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_USER_ID", "Invalid user ID")
		return
	}
	if userID == adminID {
		response.Error(c, http.StatusBadRequest, "SELF_STATUS_CHANGE_BLOCKED", "Admin tidak bisa mengubah status akun sendiri.")
		return
	}

	var req updateUserStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	if err := h.userRepository.UpdateUserStatus(userID, req.NewStatus); err != nil {
		response.Error(c, http.StatusInternalServerError, "UPDATE_STATUS_FAILED", err.Error())
		return
	}

	user, err := h.userRepository.GetByID(userID)
	if err != nil {
		response.Error(c, http.StatusNotFound, "USER_NOT_FOUND", "User not found")
		return
	}

	response.Success(c, h.buildAdminUserResponse(user, h.getUserOrderCount(user.ID), h.getUserTotalSpent(user.ID)))
}

// UpdateUserRole updates a user's role.
// PUT /api/v1/admin/users/:id/role
func (h *AdminUserHandler) UpdateUserRole(c *gin.Context) {
	adminID, err := middleware.GetUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "User must be authenticated")
		return
	}

	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_USER_ID", "Invalid user ID")
		return
	}
	if userID == adminID {
		response.Error(c, http.StatusBadRequest, "SELF_ROLE_CHANGE_BLOCKED", "Admin tidak bisa mengubah role akun sendiri.")
		return
	}

	var req updateUserRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	if err := h.userRepository.UpdateUserRole(userID, req.NewRole); err != nil {
		response.Error(c, http.StatusInternalServerError, "UPDATE_ROLE_FAILED", err.Error())
		return
	}

	user, err := h.userRepository.GetByID(userID)
	if err != nil {
		response.Error(c, http.StatusNotFound, "USER_NOT_FOUND", "User not found")
		return
	}

	response.Success(c, h.buildAdminUserResponse(user, h.getUserOrderCount(user.ID), h.getUserTotalSpent(user.ID)))
}

// GetUserActivity returns recent account activity for a user.
// GET /api/v1/admin/users/:id/activity
func (h *AdminUserHandler) GetUserActivity(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_USER_ID", "Invalid user ID")
		return
	}

	limit := 20
	if value := c.Query("limit"); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	var activities []map[string]interface{}
	rows, err := h.userRepository.GetDB().
		Table("activity_logs").
		Select("id, action_type AS action, created_at AS timestamp, description AS details").
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Rows()
	if err != nil {
		response.Success(c, []map[string]interface{}{})
		return
	}
	defer rows.Close()

	for rows.Next() {
		var id uuid.UUID
		var action string
		var timestamp time.Time
		var details *string
		if err := rows.Scan(&id, &action, &timestamp, &details); err != nil {
			continue
		}
		activities = append(activities, map[string]interface{}{
			"id":        id,
			"action":    action,
			"timestamp": timestamp,
			"details":   details,
		})
	}

	response.Success(c, activities)
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

func (h *AdminUserHandler) getUserOrderCount(userID uuid.UUID) int64 {
	var orderCount int64
	h.userRepository.GetDB().Model(&struct{}{}).
		Table("orders").
		Where("user_id = ?", userID).
		Count(&orderCount)
	return orderCount
}

func (h *AdminUserHandler) getUserTotalSpent(userID uuid.UUID) float64 {
	var totalSpent float64
	h.userRepository.GetDB().
		Table("orders").
		Select("COALESCE(SUM(total), 0)").
		Where("user_id = ? AND payment_status IN ?", userID, []string{"paid", "refunded"}).
		Scan(&totalSpent)
	return totalSpent
}

func (h *AdminUserHandler) buildAdminUserResponse(user *models.User, orderCount int64, totalSpent float64) map[string]interface{} {
	status := user.Status
	if status == "" {
		if user.IsActive {
			status = models.UserStatusActive
		} else {
			status = models.UserStatusSuspended
		}
	}

	return map[string]interface{}{
		"id":           user.ID,
		"email":        user.Email,
		"name":         user.Name,
		"phone":        user.Phone,
		"avatar_url":   user.AvatarURL,
		"role":         user.Role,
		"is_verified":  user.IsVerified,
		"is_active":    user.IsActive,
		"status":       status,
		"last_login":   user.LastLoginAt,
		"total_orders": orderCount,
		"total_spent":  totalSpent,
		"created_at":   user.CreatedAt,
		"updated_at":   user.UpdatedAt,
	}
}
