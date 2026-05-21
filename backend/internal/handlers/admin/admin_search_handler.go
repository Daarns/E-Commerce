package admin

import (
	"ecommerce-backend/internal/services/search"
	"ecommerce-backend/pkg/response"
	"net/http"

	"github.com/gin-gonic/gin"
)

// AdminSearchHandler handles admin search metrics
type AdminSearchHandler struct {
	searchService *search.SearchService
}

// NewAdminSearchHandler creates a new admin search handler
func NewAdminSearchHandler(searchService *search.SearchService) *AdminSearchHandler {
	return &AdminSearchHandler{
		searchService: searchService,
	}
}

// GetSearchMetrics returns search analytics metrics (admin only)
// GET /api/v1/admin/search/metrics
func (h *AdminSearchHandler) GetSearchMetrics(c *gin.Context) {
	// Verify admin role
	role := c.GetString("user_role")
	if role != "admin" {
		response.Error(c, http.StatusForbidden, "FORBIDDEN", "Admin access required")
		return
	}

	period := c.DefaultQuery("period", "week")
	switch period {
	case "today", "week", "month":
	default:
		period = "week"
	}

	metrics, err := h.searchService.GetSearchMetrics(period)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "METRICS_FAILED", err.Error())
		return
	}

	response.Success(c, metrics)
}
