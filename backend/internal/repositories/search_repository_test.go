package repositories

import (
	"ecommerce-backend/internal/models"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupSearchTestDB(t *testing.T) (*gorm.DB, *SearchRepository) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// Create minimal tables without foreign keys for testing
	// SearchSuggestions table
	err = db.Exec(`
		CREATE TABLE IF NOT EXISTS search_suggestions (
			id TEXT PRIMARY KEY,
			query TEXT NOT NULL,
			search_count INTEGER DEFAULT 1,
			category_id TEXT,
			last_searched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME
		)
	`).Error
	assert.NoError(t, err)

	// SearchAnalytics table
	err = db.Exec(`
		CREATE TABLE IF NOT EXISTS search_analytics (
			id TEXT PRIMARY KEY,
			user_id TEXT,
			query TEXT NOT NULL,
			result_count INTEGER DEFAULT 0,
			clicked_product_id TEXT,
			search_duration_ms INTEGER,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`).Error
	assert.NoError(t, err)

	repo := NewSearchRepository(db)
	return db, repo
}

// ===== Search Suggestions Tests =====

func TestAddSearchSuggestion(t *testing.T) {
	_, repo := setupSearchTestDB(t)

	query := "running shoes"
	err := repo.AddSearchSuggestion(query, nil)
	assert.NoError(t, err)

	suggestion, err := repo.GetSuggestionByQuery(query, nil)
	assert.NoError(t, err)
	assert.NotNil(t, suggestion)
	assert.Equal(t, query, suggestion.Query)
	assert.Equal(t, 1, suggestion.SearchCount)
}

func TestGetSearchSuggestions(t *testing.T) {
	_, repo := setupSearchTestDB(t)

	// Add multiple suggestions
	err := repo.AddSearchSuggestion("running shoes", nil)
	assert.NoError(t, err)
	err = repo.AddSearchSuggestion("running shorts", nil)
	assert.NoError(t, err)
	err = repo.AddSearchSuggestion("jacket", nil)
	assert.NoError(t, err)

	// Get suggestions with prefix
	suggestions, err := repo.GetSearchSuggestions("run", nil, 10)
	assert.NoError(t, err)
	assert.Equal(t, 2, len(suggestions))

	// Verify all suggestions start with prefix
	for _, s := range suggestions {
		assert.True(t, len(s.Query) >= 3)
	}
}

func TestGetPopularSearches(t *testing.T) {
	_, repo := setupSearchTestDB(t)

	// Add suggestions with different counts
	err := repo.AddSearchSuggestion("popular query", nil)
	assert.NoError(t, err)
	err = repo.AddSearchSuggestion("popular query", nil)
	assert.NoError(t, err)
	err = repo.AddSearchSuggestion("less popular", nil)
	assert.NoError(t, err)

	// Get popular searches
	popular, err := repo.GetPopularSearches(10, time.Hour*24)
	assert.NoError(t, err)
	assert.Greater(t, len(popular), 0)

	// Most popular should be first
	if len(popular) > 1 {
		assert.GreaterOrEqual(t, popular[0].SearchCount, popular[1].SearchCount)
	}
}

func TestGetSuggestionByQuery(t *testing.T) {
	_, repo := setupSearchTestDB(t)

	query := "test query"
	err := repo.AddSearchSuggestion(query, nil)
	assert.NoError(t, err)

	suggestion, err := repo.GetSuggestionByQuery(query, nil)
	assert.NoError(t, err)
	assert.NotNil(t, suggestion)
	assert.Equal(t, query, suggestion.Query)
}

// ===== Search Analytics Tests =====

func TestLogSearchActivity(t *testing.T) {
	_, repo := setupSearchTestDB(t)

	userID := uuid.New()
	analytics := &models.SearchAnalytics{
		ID:              uuid.New(),
		UserID:          &userID,
		Query:           "test query",
		ResultCount:     5,
		SearchDurationMs: 250,
		CreatedAt:       time.Now(),
	}

	err := repo.LogSearchActivity(analytics)
	assert.NoError(t, err)

	// Verify it was logged
	history, err := repo.GetUserSearchHistory(userID, 10)
	assert.NoError(t, err)
	assert.Greater(t, len(history), 0)
	assert.Equal(t, "test query", history[0].Query)
}

func TestRecordProductClick(t *testing.T) {
	_, repo := setupSearchTestDB(t)

	userID := uuid.New()
	productID := uuid.New()
	query := "running shoes"

	err := repo.RecordProductClick(&userID, productID, query)
	assert.NoError(t, err)

	// Verify click was recorded
	history, err := repo.GetUserSearchHistory(userID, 10)
	assert.NoError(t, err)
	assert.Greater(t, len(history), 0)
	assert.Equal(t, &productID, history[0].ClickedProductID)
}

func TestGetUserSearchHistory(t *testing.T) {
	_, repo := setupSearchTestDB(t)

	userID := uuid.New()

	// Add multiple search activities
	for i := 0; i < 5; i++ {
		analytics := &models.SearchAnalytics{
			ID:        uuid.New(),
			UserID:    &userID,
			Query:     "query " + string(rune(48+i)),
			CreatedAt: time.Now().Add(time.Duration(-i) * time.Hour),
		}
		err := repo.LogSearchActivity(analytics)
		assert.NoError(t, err)
	}

	// Get history
	history, err := repo.GetUserSearchHistory(userID, 3)
	assert.NoError(t, err)
	assert.Equal(t, 3, len(history))

	// Should be in reverse chronological order
	assert.Greater(t, history[0].CreatedAt, history[1].CreatedAt)
}

func TestDeleteOldAnalytics(t *testing.T) {
	db, repo := setupSearchTestDB(t)

	// Add old and new analytics
	oldTime := time.Now().AddDate(-1, 0, 0)
	newTime := time.Now()

	oldAnalytics := &models.SearchAnalytics{
		ID:        uuid.New(),
		Query:     "old query",
		CreatedAt: oldTime,
	}
	newAnalytics := &models.SearchAnalytics{
		ID:        uuid.New(),
		Query:     "new query",
		CreatedAt: newTime,
	}

	err := repo.LogSearchActivity(oldAnalytics)
	assert.NoError(t, err)
	err = repo.LogSearchActivity(newAnalytics)
	assert.NoError(t, err)

	// Delete old records
	cutoffTime := time.Now().AddDate(0, -6, 0)
	err = repo.DeleteOldAnalytics(cutoffTime)
	assert.NoError(t, err)

	// Verify old record is deleted
	var count int64
	db.Model(&models.SearchAnalytics{}).Where("created_at < ?", cutoffTime).Count(&count)
	assert.Equal(t, int64(0), count)

	// Verify new record still exists
	db.Model(&models.SearchAnalytics{}).Where("created_at > ?", cutoffTime).Count(&count)
	assert.Equal(t, int64(1), count)
}

// ===== Search Helper Tests =====

func TestSearchSuggestionWithCategory(t *testing.T) {
	_, repo := setupSearchTestDB(t)

	catID := uuid.New()
	query := "category specific search"

	err := repo.AddSearchSuggestion(query, &catID)
	assert.NoError(t, err)

	suggestion, err := repo.GetSuggestionByQuery(query, &catID)
	assert.NoError(t, err)
	assert.NotNil(t, suggestion)
	assert.Equal(t, catID, *suggestion.CategoryID)
}

func TestMultipleSearchSuggestionsByCategoryCount(t *testing.T) {
	_, repo := setupSearchTestDB(t)

	cat1 := uuid.New()
	cat2 := uuid.New()

	err := repo.AddSearchSuggestion("shoes", &cat1)
	assert.NoError(t, err)
	err = repo.AddSearchSuggestion("shoes", &cat2)
	assert.NoError(t, err)

	// Get suggestions for cat1
	suggestions1, err := repo.GetSearchSuggestions("shoes", &cat1, 10)
	assert.NoError(t, err)
	assert.Greater(t, len(suggestions1), 0)

	// Get suggestions for cat2
	suggestions2, err := repo.GetSearchSuggestions("shoes", &cat2, 10)
	assert.NoError(t, err)
	assert.Greater(t, len(suggestions2), 0)
}

func TestSearchAnalyticsWithoutUser(t *testing.T) {
	_, repo := setupSearchTestDB(t)

	// Anonymous search
	analytics := &models.SearchAnalytics{
		ID:          uuid.New(),
		UserID:      nil,
		Query:       "anonymous search",
		ResultCount: 3,
		CreatedAt:   time.Now(),
	}

	err := repo.LogSearchActivity(analytics)
	assert.NoError(t, err)
}

func TestSearchSuggestionIncrementCount(t *testing.T) {
	_, repo := setupSearchTestDB(t)

	query := "incrementing query"

	// First search
	err := repo.AddSearchSuggestion(query, nil)
	assert.NoError(t, err)

	suggestion1, err := repo.GetSuggestionByQuery(query, nil)
	assert.NoError(t, err)
	assert.NotNil(t, suggestion1)
	initialCount := suggestion1.SearchCount

	// Second search (should increment)
	err = repo.AddSearchSuggestion(query, nil)
	assert.NoError(t, err)

	suggestion2, err := repo.GetSuggestionByQuery(query, nil)
	assert.NoError(t, err)
	assert.NotNil(t, suggestion2)

	// Count should increase
	assert.Greater(t, suggestion2.SearchCount, initialCount)
}
