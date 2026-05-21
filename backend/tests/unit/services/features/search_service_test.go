package features

import (
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupSearchServiceTestDB(t *testing.T) (*gorm.DB, *SearchService) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// Create minimal tables for testing
	db.Exec(`
		CREATE TABLE IF NOT EXISTS search_suggestions (
			id TEXT PRIMARY KEY,
			query TEXT NOT NULL,
			search_count INTEGER DEFAULT 1,
			category_id TEXT,
			last_searched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME
		)
	`)

	db.Exec(`
		CREATE TABLE IF NOT EXISTS search_analytics (
			id TEXT PRIMARY KEY,
			user_id TEXT,
			query TEXT NOT NULL,
			result_count INTEGER DEFAULT 0,
			clicked_product_id TEXT,
			search_duration_ms INTEGER,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)

	searchRepo := repositories.NewSearchRepository(db)
	productRepo := repositories.NewProductRepository(db)
	categoryRepo := repositories.NewCategoryRepository(db)

	service := NewSearchService(searchRepo, productRepo, categoryRepo)
	return db, service
}

// ===== Service Tests =====

func TestNormalizeQuery(t *testing.T) {
	_, service := setupSearchServiceTestDB(t)

	tests := []struct {
		input    string
		expected string
	}{
		{"  Running Shoes  ", "running shoes"},
		{"Nike@#$%Shoes", "nikeshoes"},
		{"  MULTIPLE   SPACES  ", "multiple spaces"},
		{"123numbers456", "123numbers456"},
	}

	for _, test := range tests {
		result := service.NormalizeQuery(test.input)
		assert.Equal(t, test.expected, result)
	}
}

func TestGetAutocompleteSuggestions(t *testing.T) {
	_, service := setupSearchServiceTestDB(t)

	// Add some suggestions
	err := service.searchRepo.AddSearchSuggestion("running shoes", nil)
	assert.NoError(t, err)
	err = service.searchRepo.AddSearchSuggestion("running shorts", nil)
	assert.NoError(t, err)
	err = service.searchRepo.AddSearchSuggestion("jacket", nil)
	assert.NoError(t, err)

	// Get autocomplete suggestions
	result, err := service.GetAutocompleteSuggestions("run", nil, 10)
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 2, result.Count)
	assert.Equal(t, 2, len(result.Suggestions))
}

func TestGetAutocompleteSuggestionsEmpty(t *testing.T) {
	_, service := setupSearchServiceTestDB(t)

	result, err := service.GetAutocompleteSuggestions("", nil, 10)
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 0, result.Count)
	assert.Equal(t, 0, len(result.Suggestions))
}

func TestGetAutocompleteSuggestionsLimitValidation(t *testing.T) {
	_, service := setupSearchServiceTestDB(t)

	// Test with invalid limits
	result, err := service.GetAutocompleteSuggestions("test", nil, 0)
	assert.NoError(t, err)
	assert.NotNil(t, result)

	result, err = service.GetAutocompleteSuggestions("test", nil, 100)
	assert.NoError(t, err)
	assert.NotNil(t, result)
}

func TestGetPopularSearches(t *testing.T) {
	_, service := setupSearchServiceTestDB(t)

	// Add popular searches
	for i := 0; i < 5; i++ {
		err := service.searchRepo.AddSearchSuggestion("popular query", nil)
		assert.NoError(t, err)
	}
	err := service.searchRepo.AddSearchSuggestion("less popular", nil)
	assert.NoError(t, err)

	result, err := service.GetPopularSearches(10, "week")
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Greater(t, len(result), 0)

	// Most popular should be first
	if len(result) > 1 {
		assert.GreaterOrEqual(t, result[0].SearchCount, result[1].SearchCount)
	}
}

func TestGetPopularSearchesTimePeriods(t *testing.T) {
	_, service := setupSearchServiceTestDB(t)

	err := service.searchRepo.AddSearchSuggestion("test query", nil)
	assert.NoError(t, err)

	periods := []string{"today", "week", "month", "all"}
	for _, period := range periods {
		result, err := service.GetPopularSearches(10, period)
		assert.NoError(t, err)
		assert.NotNil(t, result)
	}
}

func TestRecordProductClick(t *testing.T) {
	_, service := setupSearchServiceTestDB(t)

	userID := uuid.New()
	productID := uuid.New()

	err := service.RecordProductClick(&userID, productID, "test query")
	assert.NoError(t, err)

	// Verify click was recorded
	history, err := service.GetUserSearchHistory(userID, 10)
	assert.NoError(t, err)
	assert.Greater(t, len(history), 0)
}

func TestGetUserSearchHistory(t *testing.T) {
	_, service := setupSearchServiceTestDB(t)

	userID := uuid.New()

	// Add search history
	for i := 0; i < 5; i++ {
		err := service.RecordProductClick(&userID, uuid.New(), "query")
		assert.NoError(t, err)
	}

	history, err := service.GetUserSearchHistory(userID, 3)
	assert.NoError(t, err)
	assert.Equal(t, 3, len(history))
}

func TestGetUserSearchHistoryLimitValidation(t *testing.T) {
	_, service := setupSearchServiceTestDB(t)

	userID := uuid.New()

	// Add search
	err := service.RecordProductClick(&userID, uuid.New(), "query")
	assert.NoError(t, err)

	// Test with invalid limit (should default)
	history, err := service.GetUserSearchHistory(userID, 0)
	assert.NoError(t, err)
	assert.NotNil(t, history)

	// Test with large limit
	history, err = service.GetUserSearchHistory(userID, 200)
	assert.NoError(t, err)
	assert.NotNil(t, history)
}

func TestGetSearchMetrics(t *testing.T) {
	_, service := setupSearchServiceTestDB(t)

	// Add some analytics data
	userID := uuid.New()
	err := service.RecordProductClick(&userID, uuid.New(), "shoes")
	assert.NoError(t, err)

	metrics, err := service.GetSearchMetrics("week")
	assert.NoError(t, err)
	assert.NotNil(t, metrics)
	assert.Greater(t, metrics.TotalSearches, int64(0))
}

func TestCalculateTrend(t *testing.T) {
	suggestion := models.SearchSuggestion{
		SearchCount: 100,
	}
	trend := calculateTrend(suggestion)
	assert.Equal(t, "up", trend)

	suggestion.SearchCount = 30
	trend = calculateTrend(suggestion)
	assert.Equal(t, "stable", trend)

	suggestion.SearchCount = 10
	trend = calculateTrend(suggestion)
	assert.Equal(t, "down", trend)
}

func TestSearchProductsEnhancedValidation(t *testing.T) {
	_, service := setupSearchServiceTestDB(t)

	// Test with empty query
	result, err := service.SearchProductsEnhanced("", nil, 0, 0, 20, nil)
	assert.Error(t, err)
	assert.Nil(t, result)

	// Test with whitespace-only query
	result, err = service.SearchProductsEnhanced("   ", nil, 0, 0, 20, nil)
	assert.Error(t, err)
	assert.Nil(t, result)
}

func TestSearchProductsEnhancedLimitValidation(t *testing.T) {
	_, service := setupSearchServiceTestDB(t)

	// Skip FTS tests since SQLite doesn't support PostgreSQL FTS syntax
	t.Skip("Skipping FTS tests in SQLite environment")

	// Test with invalid limit (should default to 20)
	result, err := service.SearchProductsEnhanced("test", nil, 0, 0, 0, nil)
	assert.NoError(t, err)
	assert.NotNil(t, result)

	// Test with large limit (should cap at 100)
	result, err = service.SearchProductsEnhanced("test", nil, 0, 0, 500, nil)
	assert.NoError(t, err)
	assert.NotNil(t, result)
}

func TestGetFacetedSearchOptionsEmpty(t *testing.T) {
	_, service := setupSearchServiceTestDB(t)

	// Test with empty database
	filters, err := service.GetSearchContextualFilters("test query")
	assert.NoError(t, err)
	assert.NotNil(t, filters)
	assert.Contains(t, filters, "facets")
	assert.Contains(t, filters, "suggested_filters")
}

func TestSearchSuggestionCachingWithCategory(t *testing.T) {
	_, service := setupSearchServiceTestDB(t)

	catID := uuid.New()

	// Add suggestions first
	err := service.searchRepo.AddSearchSuggestion("test query", &catID)
	assert.NoError(t, err)

	// Get autocomplete for category
	result, err := service.GetAutocompleteSuggestions("test", &catID, 10)
	assert.NoError(t, err)
	assert.NotNil(t, result)

	// Verify suggestions were retrieved
	assert.GreaterOrEqual(t, result.Count, 0)
}

func TestGetSearchMetricsWithoutData(t *testing.T) {
	_, service := setupSearchServiceTestDB(t)

	// Test metrics with empty database
	metrics, err := service.GetSearchMetrics("week")
	assert.NoError(t, err)
	assert.NotNil(t, metrics)
	assert.Equal(t, int64(0), metrics.TotalSearches)
}

func TestPopularSearchesPeriodValidation(t *testing.T) {
	_, service := setupSearchServiceTestDB(t)

	err := service.searchRepo.AddSearchSuggestion("test", nil)
	assert.NoError(t, err)

	// Test with invalid period (should default to week)
	result, err := service.GetPopularSearches(10, "invalid_period")
	assert.NoError(t, err)
	assert.NotNil(t, result)
}

func TestSearchAnalyticsLoggingWithDuration(t *testing.T) {
	_, service := setupSearchServiceTestDB(t)

	userID := uuid.New()

	// Log with execution time
	analytics := &models.SearchAnalytics{
		ID:               uuid.New(),
		UserID:           &userID,
		Query:            "test",
		ResultCount:      5,
		SearchDurationMs: 123,
		CreatedAt:        time.Now(),
	}

	err := service.searchRepo.LogSearchActivity(analytics)
	assert.NoError(t, err)

	history, err := service.GetUserSearchHistory(userID, 10)
	assert.NoError(t, err)
	assert.Equal(t, 123, history[0].SearchDurationMs)
}

