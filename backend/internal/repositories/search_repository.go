package repositories

import (
	"ecommerce-backend/internal/models"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SearchRepository handles search-related data operations
type SearchRepository struct {
	db *gorm.DB
}

// NewSearchRepository creates a new search repository
func NewSearchRepository(db *gorm.DB) *SearchRepository {
	return &SearchRepository{db: db}
}

// ===== Search Suggestions =====

// AddSearchSuggestion adds or increments a search suggestion
func (r *SearchRepository) AddSearchSuggestion(query string, categoryID *uuid.UUID) error {
	// Try to find existing suggestion
	var existing models.SearchSuggestion
	q := r.db.Where("query = ?", query)
	
	if categoryID != nil {
		q = q.Where("category_id = ?", categoryID)
	} else {
		q = q.Where("category_id IS NULL")
	}

	result := q.First(&existing)

	if result.Error == gorm.ErrRecordNotFound {
		// Create new suggestion
		newSuggestion := &models.SearchSuggestion{
			ID:             uuid.New(),
			Query:          query,
			SearchCount:    1,
			CategoryID:     categoryID,
			LastSearchedAt: time.Now(),
			CreatedAt:      time.Now(),
		}
		return r.db.Create(newSuggestion).Error
	} else if result.Error != nil {
		return result.Error
	}

	// Update existing suggestion
	return r.db.Model(&existing).
		Updates(map[string]interface{}{
			"search_count":     gorm.Expr("search_count + 1"),
			"last_searched_at": time.Now(),
			"updated_at":       time.Now(),
		}).Error
}

// GetSearchSuggestions retrieves suggestions matching prefix (for autocomplete)
func (r *SearchRepository) GetSearchSuggestions(prefix string, categoryID *uuid.UUID, limit int) ([]models.SearchSuggestion, error) {
	var suggestions []models.SearchSuggestion

	query := r.db.Where("LOWER(query) LIKE ?", prefix+"%")
	if categoryID != nil {
		query = query.Where("category_id = ?", categoryID)
	}

	err := query.
		Order("search_count DESC, last_searched_at DESC").
		Limit(limit).
		Find(&suggestions).Error

	return suggestions, err
}

// GetPopularSearches retrieves most popular searches
func (r *SearchRepository) GetPopularSearches(limit int, since time.Duration) ([]models.SearchSuggestion, error) {
	var suggestions []models.SearchSuggestion

	cutoffTime := time.Now().Add(-since)

	err := r.db.
		Where("last_searched_at >= ?", cutoffTime).
		Order("search_count DESC").
		Limit(limit).
		Find(&suggestions).Error

	return suggestions, err
}

// GetSuggestionByQuery retrieves a specific suggestion
func (r *SearchRepository) GetSuggestionByQuery(query string, categoryID *uuid.UUID) (*models.SearchSuggestion, error) {
	var suggestion models.SearchSuggestion

	q := r.db.Where("query = ?", query)
	if categoryID != nil {
		q = q.Where("category_id = ?", categoryID)
	} else {
		q = q.Where("category_id IS NULL")
	}

	err := q.First(&suggestion).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &suggestion, err
}

// ===== Search Analytics =====

// LogSearchActivity logs a search query for analytics
func (r *SearchRepository) LogSearchActivity(analytics *models.SearchAnalytics) error {
	return r.db.Create(analytics).Error
}

// RecordProductClick records when user clicks a product from search results
func (r *SearchRepository) RecordProductClick(userID *uuid.UUID, productID uuid.UUID, query string) error {
	analytics := &models.SearchAnalytics{
		ID:               uuid.New(),
		UserID:           userID,
		Query:            query,
		ClickedProductID: &productID,
		CreatedAt:        time.Now(),
	}
	return r.db.Create(analytics).Error
}

// GetSearchMetrics retrieves search analytics metrics
func (r *SearchRepository) GetSearchMetrics(since time.Duration) (*models.SearchMetricsResponse, error) {
	var totalSearches int64
	var uniqueQueries int64
	var avgResultCount float64
	var avgSearchTimeMs int
	var mostPopularQuery string
	var topProductID uuid.UUID

	// Total searches
	r.db.Model(&models.SearchAnalytics{}).
		Where("created_at >= ?", time.Now().Add(-since)).
		Count(&totalSearches)

	// Unique queries
	r.db.Model(&models.SearchAnalytics{}).
		Distinct("query").
		Where("created_at >= ?", time.Now().Add(-since)).
		Count(&uniqueQueries)

	// Average result count
	r.db.Model(&models.SearchAnalytics{}).
		Select("AVG(result_count)").
		Where("created_at >= ?", time.Now().Add(-since)).
		Row().
		Scan(&avgResultCount)

	// Average search time
	r.db.Model(&models.SearchAnalytics{}).
		Select("AVG(search_duration_ms)").
		Where("created_at >= ? AND search_duration_ms > 0", time.Now().Add(-since)).
		Row().
		Scan(&avgSearchTimeMs)

	// Most popular query
	r.db.Model(&models.SearchAnalytics{}).
		Select("query").
		Where("created_at >= ?", time.Now().Add(-since)).
		Group("query").
		Order("COUNT(*) DESC").
		Limit(1).
		Row().
		Scan(&mostPopularQuery)

	// Top clicked product
	r.db.Model(&models.SearchAnalytics{}).
		Select("clicked_product_id").
		Where("created_at >= ? AND clicked_product_id IS NOT NULL", time.Now().Add(-since)).
		Group("clicked_product_id").
		Order("COUNT(*) DESC").
		Limit(1).
		Row().
		Scan(&topProductID)

	metrics := &models.SearchMetricsResponse{
		TotalSearches:    totalSearches,
		UniqueQueries:    uniqueQueries,
		AvgResultCount:   avgResultCount,
		AvgSearchTimeMs:  avgSearchTimeMs,
		MostPopularQuery: mostPopularQuery,
	}

	// Get top product details if found
	if topProductID != uuid.Nil {
		var product models.Product
		if err := r.db.First(&product, topProductID).Error; err == nil {
			metrics.TopProductClicked = &product
		}
	}

	return metrics, nil
}

// GetUserSearchHistory retrieves search history for a user
func (r *SearchRepository) GetUserSearchHistory(userID uuid.UUID, limit int) ([]models.SearchAnalytics, error) {
	var analytics []models.SearchAnalytics

	err := r.db.
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Find(&analytics).Error

	return analytics, err
}

// DeleteOldAnalytics deletes old analytics records (for cleanup)
func (r *SearchRepository) DeleteOldAnalytics(before time.Time) error {
	return r.db.
		Where("created_at < ?", before).
		Delete(&models.SearchAnalytics{}).Error
}

// ===== Search Enhancements =====

// SearchProductsWithFTS performs full-text search using PostgreSQL tsvector
func (r *SearchRepository) SearchProductsWithFTS(query string, limit int) ([]models.Product, error) {
	var products []models.Product

	// Use PostgreSQL full-text search
	err := r.db.
		Where("status = ?", "active").
		Where("search_vector @@ plainto_tsquery('english', ?)", query).
		Preload("Category").
		Preload("Images", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC").Limit(1)
		}).
		Order(gorm.Expr("ts_rank(search_vector, plainto_tsquery('english', ?)) DESC", query)).
		Limit(limit).
		Find(&products).Error

	return products, err
}

// GetFacetedSearch performs search with faceted filtering
func (r *SearchRepository) GetFacetedSearch(query string, categoryID *uuid.UUID, minPrice, maxPrice float64, limit int) ([]models.Product, error) {
	var products []models.Product

	q := r.db.
		Where("status = ?", "active").
		Where("search_vector @@ plainto_tsquery('english', ?)", query)

	if categoryID != nil {
		q = q.Where("category_id = ?", categoryID)
	}

	if minPrice > 0 {
		q = q.Where("price >= ?", minPrice)
	}

	if maxPrice > 0 {
		q = q.Where("price <= ?", maxPrice)
	}

	err := q.
		Preload("Category").
		Preload("Images", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC").Limit(1)
		}).
		Limit(limit).
		Find(&products).Error

	return products, err
}

// GetPriceRanges returns available price ranges for faceted search
func (r *SearchRepository) GetPriceRanges(query string) (map[string]interface{}, error) {
	var minPrice, maxPrice float64
	var avgPrice float64

	r.db.Model(&models.Product{}).
		Select("MIN(price), MAX(price), AVG(price)").
		Where("status = ?", "active").
		Where("search_vector @@ plainto_tsquery('english', ?)", query).
		Row().
		Scan(&minPrice, &maxPrice, &avgPrice)

	return map[string]interface{}{
		"min":  minPrice,
		"max":  maxPrice,
		"avg":  avgPrice,
	}, nil
}

// GetCategoryFacets returns available categories for faceted search
func (r *SearchRepository) GetCategoryFacets(query string) ([]models.SearchFacetResponse, error) {
	var facets []models.SearchFacetResponse

	var results []struct {
		CategoryID   uuid.UUID
		CategoryName string
		Count        int
	}

	err := r.db.
		Table("products p").
		Select("p.category_id, c.name as category_name, COUNT(*) as count").
		Joins("LEFT JOIN categories c ON p.category_id = c.id").
		Where("p.status = ?", "active").
		Where("p.search_vector @@ plainto_tsquery('english', ?)", query).
		Group("p.category_id, c.name").
		Scan(&results).Error

	if err != nil {
		return facets, err
	}

	for _, result := range results {
		facet := models.SearchFacetResponse{
			Field: "category",
			Values: []models.FacetValueResponse{
				{
					Value: result.CategoryName,
					Count: result.Count,
					ID:    &result.CategoryID,
				},
			},
		}
		facets = append(facets, facet)
	}

	return facets, nil
}

// UpdateProductSearchVector manually updates search vector for a product
func (r *SearchRepository) UpdateProductSearchVector(productID uuid.UUID) error {
	return r.db.
		Model(&models.Product{}).
		Where("id = ?", productID).
		Update("search_vector", gorm.Expr("to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(sku, ''))")).
		Error
}
