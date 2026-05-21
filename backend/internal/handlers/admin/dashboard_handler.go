package admin

import (
	"ecommerce-backend/internal/services/admin"
	"ecommerce-backend/internal/utils"
	"ecommerce-backend/pkg/response"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// DashboardHandler handles admin dashboard HTTP requests
type DashboardHandler struct {
	dashboardService *admin.DashboardService
}

// NewDashboardHandler creates a new dashboard handler
func NewDashboardHandler(dashboardService *admin.DashboardService) *DashboardHandler {
	return &DashboardHandler{
		dashboardService: dashboardService,
	}
}

// ===== DASHBOARD SUMMARY =====

// GetDashboardSummary retrieves the complete dashboard overview
// GET /api/v1/admin/dashboard/summary
func (h *DashboardHandler) GetDashboardSummary(c *gin.Context) {
	summary, err := h.dashboardService.GetDashboardSummary()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "DASHBOARD_ERROR", err.Error())
		return
	}

	response.Success(c, summary)
}

// ===== REVENUE ANALYTICS =====

// GetRevenueMetrics retrieves revenue metrics for a period
// GET /api/v1/admin/analytics/revenue
// Query params: start_date (2006-01-02), end_date (2006-01-02)
func (h *DashboardHandler) GetRevenueMetrics(c *gin.Context) {
	startDateStr := c.DefaultQuery("start_date", time.Now().AddDate(0, 0, -30).Format("2006-01-02"))
	endDateStr := c.DefaultQuery("end_date", time.Now().Format("2006-01-02"))

	startDate, err := time.Parse("2006-01-02", startDateStr)
	if err != nil {
		response.ValidationError(c, "Invalid start_date format (use: 2006-01-02)")
		return
	}

	endDate, err := time.Parse("2006-01-02", endDateStr)
	if err != nil {
		response.ValidationError(c, "Invalid end_date format (use: 2006-01-02)")
		return
	}

	// Set end time to end of day
	endDate = endDate.Add(24 * time.Hour)

	metrics, err := h.dashboardService.GetRevenueMetrics(startDate, endDate)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "REVENUE_ERROR", err.Error())
		return
	}

	response.Success(c, metrics)
}

// ===== ORDER ANALYTICS =====

// GetOrderAnalytics retrieves comprehensive order statistics
// GET /api/v1/admin/analytics/orders
func (h *DashboardHandler) GetOrderAnalytics(c *gin.Context) {
	analytics, err := h.dashboardService.GetOrderAnalytics()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "ORDER_ANALYTICS_ERROR", err.Error())
		return
	}

	response.Success(c, analytics)
}

// ===== CUSTOMER ANALYTICS =====

// GetCustomerAnalytics retrieves customer statistics
// GET /api/v1/admin/analytics/customers
func (h *DashboardHandler) GetCustomerAnalytics(c *gin.Context) {
	analytics, err := h.dashboardService.GetCustomerAnalytics()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "CUSTOMER_ANALYTICS_ERROR", err.Error())
		return
	}

	response.Success(c, analytics)
}

// ===== REVENUE TRENDS =====
// GET /api/v1/admin/analytics/revenue-trends
// Query params: months (default: 12)
func (h *DashboardHandler) GetMonthlyRevenueTrend(c *gin.Context) {
	monthsStr := c.DefaultQuery("months", "12")
	months, err := strconv.Atoi(monthsStr)
	if err != nil || months < 1 || months > 60 {
		response.ValidationError(c, "Invalid months parameter (must be 1-60)")
		return
	}

	trends, err := h.dashboardService.GetMonthlyRevenueTrend(months)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "TRENDS_ERROR", err.Error())
		return
	}

	response.Success(c, gin.H{
		"trends": trends,
		"count":  len(trends),
	})
}

// ===== PRODUCT PERFORMANCE =====

// GetProductPerformance retrieves product performance metrics
// GET /api/v1/admin/analytics/products
// Query params: limit (default: 20), offset (default: 0)
func (h *DashboardHandler) GetProductPerformance(c *gin.Context) {
	limit := utils.GetIntQueryDefault(c, "limit", 20)
	offset := utils.GetIntQueryDefault(c, "offset", 0)

	// Validate pagination
	if limit < 1 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	performances, err := h.dashboardService.GetProductPerformance(limit, offset)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "PRODUCT_PERFORMANCE_ERROR", err.Error())
		return
	}

	response.Success(c, gin.H{
		"products": performances,
		"count":    len(performances),
		"limit":    limit,
		"offset":   offset,
	})
}

// ===== USER MANAGEMENT =====

// GetUserActivityList retrieves user activity summaries
// GET /api/v1/admin/users/activity
// Query params: limit (default: 20), offset (default: 0)
func (h *DashboardHandler) GetUserActivityList(c *gin.Context) {
	limit := utils.GetIntQueryDefault(c, "limit", 20)
	offset := utils.GetIntQueryDefault(c, "offset", 0)

	// Validate pagination
	if limit < 1 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	users, err := h.dashboardService.GetUserActivityList(limit, offset)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "USER_ACTIVITY_ERROR", err.Error())
		return
	}

	response.Success(c, gin.H{
		"users":  users,
		"count":  len(users),
		"limit":  limit,
		"offset": offset,
	})
}

// DisableUserAccount disables a user account
// POST /api/v1/admin/users/:id/disable
func (h *DashboardHandler) DisableUserAccount(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid user ID format")
		return
	}

	var input struct {
		Reason string `json:"reason"`
	}
	c.ShouldBindJSON(&input)

	if err := h.dashboardService.DisableUserAccount(userID, input.Reason); err != nil {
		response.Error(c, http.StatusBadRequest, "DISABLE_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{
		"message": "User account disabled successfully",
		"user_id": userID,
	})
}

// EnableUserAccount enables a user account
// POST /api/v1/admin/users/:id/enable
func (h *DashboardHandler) EnableUserAccount(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid user ID format")
		return
	}

	if err := h.dashboardService.EnableUserAccount(userID); err != nil {
		response.Error(c, http.StatusBadRequest, "ENABLE_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{
		"message": "User account enabled successfully",
		"user_id": userID,
	})
}

// getUserID extracts authenticated user ID (for future auth checks)
func (h *DashboardHandler) getUserID(c *gin.Context) (uuid.UUID, error) {
	if userIDVal, exists := c.Get("user_id"); exists {
		if userID, ok := userIDVal.(uuid.UUID); ok {
			return userID, nil
		}
	}
	return uuid.Nil, fmt.Errorf("user not authenticated")
}

