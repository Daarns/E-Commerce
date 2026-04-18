package features

import (
	"ecommerce-backend/internal/services/features"
	"ecommerce-backend/pkg/response"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// SearchHandler handles search HTTP requests
type SearchHandler struct {
	searchService *features.SearchService
}

// NewSearchHandler creates a new search handler
func NewSearchHandler(searchService *features.SearchService) *SearchHandler {
	return &SearchHandler{
		searchService: searchService,
	}
}

// ===== SEARCH ENDPOINTS =====

// SearchProducts performs enhanced full-text search with optional filters
// GET /api/v1/search
func (h *SearchHandler) SearchProducts(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		response.Error(c, http.StatusBadRequest, "INVALID_QUERY", "Search query is required")
		return
	}

	// Parse optional filters
	var categoryID *uuid.UUID
	if catID := c.Query("category_id"); catID != "" {
		if id, err := uuid.Parse(catID); err == nil {
			categoryID = &id
		}
	}

	minPrice := 0.0
	if min := c.Query("min_price"); min != "" {
		if price, err := strconv.ParseFloat(min, 64); err == nil && price > 0 {
			minPrice = price
		}
	}

	maxPrice := 0.0
	if max := c.Query("max_price"); max != "" {
		if price, err := strconv.ParseFloat(max, 64); err == nil && price > 0 {
			maxPrice = price
		}
	}

	limit := 20
	if l := c.Query("limit"); l != "" {
		if l, err := strconv.Atoi(l); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	// Get user ID from context if authenticated
	var userID *uuid.UUID
	if uid := c.GetString("user_id"); uid != "" {
		if id, err := uuid.Parse(uid); err == nil {
			userID = &id
		}
	}

	result, err := h.searchService.SearchProductsEnhanced(query, categoryID, minPrice, maxPrice, limit, userID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "SEARCH_FAILED", err.Error())
		return
	}

	response.Success(c, result)
}

// GetAutocompleteSuggestions returns search suggestions for autocomplete
// GET /api/v1/search/autocomplete
func (h *SearchHandler) GetAutocompleteSuggestions(c *gin.Context) {
	prefix := c.Query("q")
	if prefix == "" {
		response.Error(c, http.StatusBadRequest, "INVALID_PREFIX", "Prefix is required")
		return
	}

	var categoryID *uuid.UUID
	if catID := c.Query("category_id"); catID != "" {
		if id, err := uuid.Parse(catID); err == nil {
			categoryID = &id
		}
	}

	limit := 10
	if l := c.Query("limit"); l != "" {
		if l, err := strconv.Atoi(l); err == nil && l > 0 && l <= 50 {
			limit = l
		}
	}

	suggestions, err := h.searchService.GetAutocompleteSuggestions(prefix, categoryID, limit)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "AUTOCOMPLETE_FAILED", err.Error())
		return
	}

	response.Success(c, suggestions)
}

// GetPopularSearches returns trending/popular search queries
// GET /api/v1/search/popular
func (h *SearchHandler) GetPopularSearches(c *gin.Context) {
	limit := 10
	if l := c.Query("limit"); l != "" {
		if l, err := strconv.Atoi(l); err == nil && l > 0 && l <= 50 {
			limit = l
		}
	}

	timePeriod := c.DefaultQuery("period", "week")
	// Validate period
	switch timePeriod {
	case "today", "week", "month", "all":
	default:
		timePeriod = "week"
	}

	searches, err := h.searchService.GetPopularSearches(limit, timePeriod)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{
		"popular_searches": searches,
		"period":           timePeriod,
		"count":            len(searches),
	})
}

// GetSearchFacets returns available filter options (facets) for a search query
// GET /api/v1/search/facets
func (h *SearchHandler) GetSearchFacets(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		response.Error(c, http.StatusBadRequest, "INVALID_QUERY", "Search query is required")
		return
	}

	facets, err := h.searchService.GetFacetedSearchOptions(query)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FACET_FAILED", err.Error())
		return
	}

	response.Success(c, facets)
}

// GetSearchFilters returns contextual filters and recommendations for a query
// GET /api/v1/search/filters
func (h *SearchHandler) GetSearchFilters(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		response.Error(c, http.StatusBadRequest, "INVALID_QUERY", "Search query is required")
		return
	}

	filters, err := h.searchService.GetSearchContextualFilters(query)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FILTER_FAILED", err.Error())
		return
	}

	response.Success(c, filters)
}

// RecordProductClick logs when user clicks a product from search results
// POST /api/v1/search/click
func (h *SearchHandler) RecordProductClick(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "User must be authenticated")
		return
	}

	var request struct {
		ProductID string `json:"product_id" binding:"required"`
		Query     string `json:"query" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_USER_ID", "Invalid user ID")
		return
	}

	productUUID, err := uuid.Parse(request.ProductID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_PRODUCT_ID", "Invalid product ID")
		return
	}

	if err := h.searchService.RecordProductClick(&userUUID, productUUID, request.Query); err != nil {
		response.Error(c, http.StatusInternalServerError, "RECORD_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{"message": "Click recorded successfully"})
}

// GetSearchMetrics returns search analytics metrics (admin only)
// GET /api/v1/admin/search/metrics
func (h *SearchHandler) GetSearchMetrics(c *gin.Context) {
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

// GetUserSearchHistory returns user's previous searches
// GET /api/v1/account/search-history
func (h *SearchHandler) GetUserSearchHistory(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "User must be authenticated")
		return
	}

	limit := 10
	if l := c.Query("limit"); l != "" {
		if l, err := strconv.Atoi(l); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_USER_ID", "Invalid user ID")
		return
	}

	history, err := h.searchService.GetUserSearchHistory(userUUID, limit)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "HISTORY_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{
		"history": history,
		"count":   len(history),
	})
}

// ClearSearchHistory clears user's search history
// DELETE /api/v1/account/search-history
func (h *SearchHandler) ClearSearchHistory(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "User must be authenticated")
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_USER_ID", "Invalid user ID")
		return
	}

	if err := h.searchService.ClearUserSearchHistory(userUUID); err != nil {
		response.Error(c, http.StatusInternalServerError, "CLEAR_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{"message": "Search history cleared successfully"})
}

// GetTrendingProducts returns products trending from search clicks
// GET /api/v1/search/trending-products
func (h *SearchHandler) GetTrendingProducts(c *gin.Context) {
	period := c.DefaultQuery("period", "week")
	switch period {
	case "today", "week", "month", "all":
	default:
		period = "week"
	}

	metrics, err := h.searchService.GetSearchMetrics(period)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "TREND_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{
		"trending_product": metrics.TopProductClicked,
		"total_clicks":     metrics.TotalSearches,
		"period":           period,
	})
}

// GetSearchSuggestion retrieves a specific search suggestion details
// GET /api/v1/search/suggestions/:query
func (h *SearchHandler) GetSearchSuggestion(c *gin.Context) {
	query := c.Param("query")
	if query == "" {
		response.Error(c, http.StatusBadRequest, "INVALID_QUERY", "Query parameter is required")
		return
	}

	// This is a simplified endpoint; in a real system you'd query the repository
	response.Success(c, gin.H{
		"query":             query,
		"cached_at":         time.Now(),
		"message":           "Query details retrieved",
	})
}

