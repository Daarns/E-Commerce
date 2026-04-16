package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
)

// SearchSuggestion represents a search query suggestion for autocomplete
type SearchSuggestion struct {
	ID              uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	Query           string     `gorm:"type:text;not null;index" json:"query"`
	SearchCount     int        `gorm:"type:int;default:1;index:idx_search_suggestions_count" json:"search_count"`
	CategoryID      *uuid.UUID `gorm:"type:uuid;index" json:"category_id,omitempty"`
	Category        *Category  `gorm:"constraint:OnDelete:CASCADE" json:"category,omitempty"`
	LastSearchedAt  time.Time  `gorm:"type:timestamp;default:now();index:idx_search_suggestions_last_searched" json:"last_searched_at"`
	CreatedAt       time.Time  `gorm:"type:timestamp;default:now()" json:"created_at"`
	UpdatedAt       time.Time  `gorm:"type:timestamp" json:"updated_at"`
}

// TableName specifies the table name
func (SearchSuggestion) TableName() string {
	return "search_suggestions"
}

// SearchAnalytics represents search activity for analytics and trending
type SearchAnalytics struct {
	ID              uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	UserID          *uuid.UUID `gorm:"type:uuid;index" json:"user_id,omitempty"`
	User            *User      `gorm:"constraint:OnDelete:CASCADE" json:"user,omitempty"`
	Query           string     `gorm:"type:text;not null;index" json:"query"`
	ResultCount     int        `gorm:"type:int;default:0" json:"result_count"`
	ClickedProductID *uuid.UUID `gorm:"type:uuid;index" json:"clicked_product_id,omitempty"`
	ClickedProduct  *Product   `gorm:"constraint:OnDelete:SET NULL" json:"clicked_product,omitempty"`
	SearchDurationMs int       `gorm:"type:int" json:"search_duration_ms,omitempty"`
	CreatedAt       time.Time  `gorm:"type:timestamp;default:now();index:idx_search_analytics_created" json:"created_at"`
}

// TableName specifies the table name
func (SearchAnalytics) TableName() string {
	return "search_analytics"
}

// ===== DTOs =====

// SearchSuggestionResponse is the response DTO for search suggestions
type SearchSuggestionResponse struct {
	ID             uuid.UUID `json:"id"`
	Query          string    `json:"query"`
	SearchCount    int       `json:"search_count"`
	CategoryID     *uuid.UUID `json:"category_id,omitempty"`
	LastSearchedAt time.Time `json:"last_searched_at"`
}

// SearchResultResponse contains product results with metadata
type SearchResultResponse struct {
	Products      []Product `json:"products"`
	TotalCount    int       `json:"total_count"`
	Query         string    `json:"query"`
	ExecutionTimeMs int    `json:"execution_time_ms"`
}

// SearchFacetResponse represents a faceted search option
type SearchFacetResponse struct {
	Field  string            `json:"field"`
	Values []FacetValueResponse `json:"values"`
}

// FacetValueResponse represents a single facet value with count
type FacetValueResponse struct {
	Value string `json:"value"`
	Count int    `json:"count"`
	ID    *uuid.UUID `json:"id,omitempty"`
}

// PopularSearchResponse represents a popular search query
type PopularSearchResponse struct {
	Query       string `json:"query"`
	SearchCount int    `json:"search_count"`
	Trend       string `json:"trend"` // "up", "down", "stable"
}

// SearchMetricsResponse contains search analytics metrics
type SearchMetricsResponse struct {
	TotalSearches      int64  `json:"total_searches"`
	UniqueQueries      int64  `json:"unique_queries"`
	AvgResultCount     float64 `json:"avg_result_count"`
	AvgSearchTimeMs    int    `json:"avg_search_time_ms"`
	MostPopularQuery   string `json:"most_popular_query"`
	TopProductClicked  *Product `json:"top_product_clicked,omitempty"`
}

// SearchAutocompleteResponse wraps autocomplete suggestions
type SearchAutocompleteResponse struct {
	Suggestions []string `json:"suggestions"`
	Count       int      `json:"count"`
}

// JSONB type for storing JSON data in PostgreSQL
type JSONB map[string]interface{}

// Value implements the driver.Valuer interface
func (j JSONB) Value() (driver.Value, error) {
	return json.Marshal(j)
}

// Scan implements the sql.Scanner interface
func (j *JSONB) Scan(value interface{}) error {
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion failed")
	}
	return json.Unmarshal(bytes, &j)
}
