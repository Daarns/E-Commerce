package handlers

import (
	"ecommerce-backend/internal/services"
	"ecommerce-backend/pkg/response"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// DiscoveryHandler handles homepage discovery endpoints
type DiscoveryHandler struct {
	discoveryService *services.DiscoveryService
}

// NewDiscoveryHandler creates a new discovery handler
func NewDiscoveryHandler(discoveryService *services.DiscoveryService) *DiscoveryHandler {
	return &DiscoveryHandler{
		discoveryService: discoveryService,
	}
}

// GetFeaturedProducts handles GET /api/v1/discovery/featured
func (h *DiscoveryHandler) GetFeaturedProducts(c *gin.Context) {
	limit := 8
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	result, err := h.discoveryService.GetFeaturedProducts(limit)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.Success(c, result)
}

// GetBestSellers handles GET /api/v1/discovery/bestsellers
func (h *DiscoveryHandler) GetBestSellers(c *gin.Context) {
	limit := 8
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	result, err := h.discoveryService.GetBestSellers(limit)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.Success(c, result)
}

// GetNewArrivals handles GET /api/v1/discovery/new-arrivals
func (h *DiscoveryHandler) GetNewArrivals(c *gin.Context) {
	limit := 8
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	result, err := h.discoveryService.GetNewArrivals(limit)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.Success(c, result)
}

// GetCategories handles GET /api/v1/discovery/categories
func (h *DiscoveryHandler) GetCategories(c *gin.Context) {
	result, err := h.discoveryService.GetCategoryHierarchy()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{
		"categories": result,
	})
}
