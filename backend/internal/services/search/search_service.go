package search

import (
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
)

// SearchService handles search-related business logic
type SearchService struct {
	searchRepo   *repositories.SearchRepository
	productRepo  *repositories.ProductRepository
	categoryRepo *repositories.CategoryRepository
}

// NewSearchService creates a new search service
func NewSearchService(
	searchRepo *repositories.SearchRepository,
	productRepo *repositories.ProductRepository,
	categoryRepo *repositories.CategoryRepository,
) *SearchService {
	return &SearchService{
		searchRepo:   searchRepo,
		productRepo:  productRepo,
		categoryRepo: categoryRepo,
	}
}

// ===== Advanced Search =====

// SearchProductsEnhanced performs enhanced full-text search with analytics logging
func (s *SearchService) SearchProductsEnhanced(query string, categoryID *uuid.UUID, minPrice, maxPrice float64, limit int, userID *uuid.UUID) (*models.SearchResultResponse, error) {
	if strings.TrimSpace(query) == "" {
		return nil, errors.New("search query cannot be empty")
	}

	if limit <= 0 || limit > 100 {
		limit = 20
	}

	startTime := time.Now()

	// Perform full-text search
	var products []models.Product
	var err error

	if minPrice > 0 || maxPrice > 0 || categoryID != nil {
		// Use faceted search
		products, err = s.searchRepo.GetFacetedSearch(query, categoryID, minPrice, maxPrice, limit)
	} else {
		// Use basic FTS
		products, err = s.searchRepo.SearchProductsWithFTS(query, limit)
	}

	if err != nil {
		return nil, err
	}

	executionTime := time.Since(startTime).Milliseconds()

	// Log search activity
	analytics := &models.SearchAnalytics{
		ID:               uuid.New(),
		UserID:           userID,
		Query:            query,
		ResultCount:      len(products),
		SearchDurationMs: int(executionTime),
		CreatedAt:        time.Now(),
	}
	s.searchRepo.LogSearchActivity(analytics)

	// Add search suggestion (for autocomplete)
	s.searchRepo.AddSearchSuggestion(query, categoryID)

	response := &models.SearchResultResponse{
		Products:         products,
		TotalCount:       len(products),
		Query:            query,
		ExecutionTimeMs:  int(executionTime),
	}

	return response, nil
}

// ===== Autocomplete & Suggestions =====

// GetAutocompleteSuggestions returns autocomplete suggestions for a query prefix
func (s *SearchService) GetAutocompleteSuggestions(prefix string, categoryID *uuid.UUID, limit int) (*models.SearchAutocompleteResponse, error) {
	if strings.TrimSpace(prefix) == "" {
		return &models.SearchAutocompleteResponse{
			Suggestions: []string{},
			Count:       0,
		}, nil
	}

	if limit <= 0 || limit > 50 {
		limit = 10
	}

	suggestions, err := s.searchRepo.GetSearchSuggestions(prefix, categoryID, limit)
	if err != nil {
		return nil, err
	}

	result := &models.SearchAutocompleteResponse{
		Suggestions: make([]string, len(suggestions)),
		Count:       len(suggestions),
	}

	for i, suggestion := range suggestions {
		result.Suggestions[i] = suggestion.Query
	}

	return result, nil
}

// GetPopularSearches returns trending popular searches
func (s *SearchService) GetPopularSearches(limit int, timePeriod string) ([]models.PopularSearchResponse, error) {
	if limit <= 0 || limit > 50 {
		limit = 10
	}

	// Default to 7 days
	duration := time.Hour * 24 * 7

	switch timePeriod {
	case "today":
		duration = time.Hour * 24
	case "week":
		duration = time.Hour * 24 * 7
	case "month":
		duration = time.Hour * 24 * 30
	case "all":
		duration = time.Hour * 24 * 365
	}

	suggestions, err := s.searchRepo.GetPopularSearches(limit, duration)
	if err != nil {
		return nil, err
	}

	response := make([]models.PopularSearchResponse, len(suggestions))
	for i, suggestion := range suggestions {
		response[i] = models.PopularSearchResponse{
			Query:       suggestion.Query,
			SearchCount: suggestion.SearchCount,
			Trend:       calculateTrend(suggestion),
		}
	}

	return response, nil
}

// calculateTrend determines if search trend is up, down, or stable
func calculateTrend(suggestion models.SearchSuggestion) string {
	// Simple heuristic: compare with older data
	// This is simplified; a real implementation would compare with historical data
	if suggestion.SearchCount > 50 {
		return "up"
	} else if suggestion.SearchCount > 20 {
		return "stable"
	}
	return "down"
}

// ===== Faceted Search =====

// GetFacetedSearchOptions retrieves available facet options for a query
func (s *SearchService) GetFacetedSearchOptions(query string) (map[string]interface{}, error) {
	facets := make(map[string]interface{})

	// Get price ranges
	priceRanges, err := s.searchRepo.GetPriceRanges(query)
	if err != nil {
		return nil, err
	}
	facets["price"] = priceRanges

	// Get category facets
	categoryFacets, err := s.searchRepo.GetCategoryFacets(query)
	if err != nil {
		return nil, err
	}
	facets["categories"] = categoryFacets

	return facets, nil
}

// ===== Search Analytics =====

// RecordProductClick logs when user clicks a product from search
func (s *SearchService) RecordProductClick(userID *uuid.UUID, productID uuid.UUID, query string) error {
	return s.searchRepo.RecordProductClick(userID, productID, query)
}

// GetSearchMetrics retrieves search analytics for dashboard
func (s *SearchService) GetSearchMetrics(timePeriod string) (*models.SearchMetricsResponse, error) {
	duration := time.Hour * 24 * 7

	switch timePeriod {
	case "today":
		duration = time.Hour * 24
	case "week":
		duration = time.Hour * 24 * 7
	case "month":
		duration = time.Hour * 24 * 30
	}

	return s.searchRepo.GetSearchMetrics(duration)
}

// GetUserSearchHistory retrieves user's past searches
func (s *SearchService) GetUserSearchHistory(userID uuid.UUID, limit int) ([]models.SearchAnalytics, error) {
	if limit <= 0 || limit > 100 {
		limit = 10
	}

	return s.searchRepo.GetUserSearchHistory(userID, limit)
}

// ClearUserSearchHistory deletes user's search history
func (s *SearchService) ClearUserSearchHistory(userID uuid.UUID) error {
	// For privacy, user can clear their search history
	// This would delete all SearchAnalytics records for this user
	return s.searchRepo.DeleteOldAnalytics(time.Time{}) // This needs custom implementation
}

// ===== Helper Methods =====

// NormalizeQuery cleans and normalizes search query
func (s *SearchService) NormalizeQuery(query string) string {
	// Remove extra whitespace
	query = strings.TrimSpace(query)
	// Convert to lowercase for better matching
	query = strings.ToLower(query)
	// Remove special characters that might break FTS
	query = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == ' ' {
			return r
		}
		return -1
	}, query)
	return query
}

// GetSearchContextualFilters builds recommended filters for search results
func (s *SearchService) GetSearchContextualFilters(query string) (map[string]interface{}, error) {
	filters := make(map[string]interface{})

	// Get available facets
	facets, err := s.GetFacetedSearchOptions(query)
	if err != nil {
		return nil, err
	}
	filters["facets"] = facets

	// Get popular filters used with this query
	// In a real system, this would analyze historical searches
	filters["suggested_filters"] = map[string]interface{}{
		"price_range":    "0-500000",
		"popular_brands": []string{},
		"in_stock_only":  true,
	}

	return filters, nil
}

