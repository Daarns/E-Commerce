package admin

import (
	"ecommerce-backend/internal/handlers/admin"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// ===== HANDLER INITIALIZATION TESTS =====

// TestNewDashboardHandler_Initialization tests handler creation
func TestNewDashboardHandler_Initialization(t *testing.T) {
	handler := admin.NewDashboardHandler(nil)
	assert.NotNil(t, handler)
}

// ===== PARAMETER VALIDATION TESTS =====

// TestGetRevenueMetrics_Handler_InvalidStartDate tests with invalid start date
func TestGetRevenueMetrics_Handler_InvalidStartDate(t *testing.T) {
	router := gin.New()
	handler := admin.NewDashboardHandler(nil)

	router.GET("/api/v1/admin/analytics/revenue", handler.GetRevenueMetrics)

	req, _ := http.NewRequest("GET", "/api/v1/admin/analytics/revenue?start_date=invalid&end_date=2025-12-31", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// TestGetRevenueMetrics_Handler_InvalidEndDate tests with invalid end date
func TestGetRevenueMetrics_Handler_InvalidEndDate(t *testing.T) {
	router := gin.New()
	handler := admin.NewDashboardHandler(nil)

	router.GET("/api/v1/admin/analytics/revenue", handler.GetRevenueMetrics)

	req, _ := http.NewRequest("GET", "/api/v1/admin/analytics/revenue?start_date=2025-01-01&end_date=invalid", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// TestGetMonthlyRevenueTrend_Handler_InvalidMonths tests with invalid months parameter
func TestGetMonthlyRevenueTrend_Handler_InvalidMonths(t *testing.T) {
	router := gin.New()
	handler := admin.NewDashboardHandler(nil)

	router.GET("/api/v1/admin/analytics/revenue-trends", handler.GetMonthlyRevenueTrend)

	req, _ := http.NewRequest("GET", "/api/v1/admin/analytics/revenue-trends?months=100", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// TestDisableUserAccount_Handler_InvalidUserID tests disable with invalid user ID
func TestDisableUserAccount_Handler_InvalidUserID(t *testing.T) {
	router := gin.New()
	handler := admin.NewDashboardHandler(nil)

	router.POST("/api/v1/admin/users/:id/disable", handler.DisableUserAccount)

	req, _ := http.NewRequest("POST", "/api/v1/admin/users/invalid-id/disable", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

// TestEnableUserAccount_Handler_InvalidUserID tests enable with invalid user ID
func TestEnableUserAccount_Handler_InvalidUserID(t *testing.T) {
	router := gin.New()
	handler := admin.NewDashboardHandler(nil)

	router.POST("/api/v1/admin/users/:id/enable", handler.EnableUserAccount)

	req, _ := http.NewRequest("POST", "/api/v1/admin/users/invalid-id/enable", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

