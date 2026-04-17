package handlers

import (
	"ecommerce-backend/internal/services"
	"ecommerce-backend/pkg/response"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// AdminUserHandler handles admin user management HTTP requests
type AdminUserHandler struct {
	exportService *services.ExportService
}

// NewAdminUserHandler creates a new admin user handler
func NewAdminUserHandler(exportService *services.ExportService) *AdminUserHandler {
	return &AdminUserHandler{
		exportService: exportService,
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
	params := services.CSVExportParams{
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

	pageSize := 20
	if ps := c.Query("page_size"); ps != "" {
		if parsed, err := strconv.Atoi(ps); err == nil && parsed > 0 && parsed <= 100 {
			pageSize = parsed
		}
	}

	// Parse filters
	role := c.Query("role")    // admin, customer
	status := c.Query("status") // active, inactive, unverified
	search := c.Query("search") // search by name or email
	sortBy := c.Query("sort_by")
	sortOrder := c.Query("sort_order")

	if sortBy == "" {
		sortBy = "created_at"
	}
	if sortOrder == "" {
		sortOrder = "desc"
	}

	// TODO: Implement actual filtering and pagination
	// For now, return empty response structure
	response.Success(c, gin.H{
		"users":      []interface{}{},
		"total":      0,
		"page":       page,
		"page_size":  pageSize,
		"total_pages": 0,
		"filters": gin.H{
			"role":        role,
			"status":      status,
			"search":      search,
			"sort_by":     sortBy,
			"sort_order":  sortOrder,
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
