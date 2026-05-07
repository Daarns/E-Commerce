package repositories

import (
	"ecommerce-backend/internal/models"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// PromoRepository handles database operations for promo codes
type PromoRepository struct {
	db *gorm.DB
}

// NewPromoRepository creates a new promo repository
func NewPromoRepository(db *gorm.DB) *PromoRepository {
	return &PromoRepository{db: db}
}

// PromoFilter represents filtering options for promo codes
type PromoFilter struct {
	Code       string
	IsActive   *bool
	SortBy     string // code, created_at, valid_from
	SortOrder  string // asc, desc
	Page       int
	PageSize   int
}

// PromoListResult represents paginated promo code results
type PromoListResult struct {
	Promos      []models.PromoCode `json:"promo_codes"`
	Total       int64              `json:"total"`
	Page        int                `json:"page"`
	PageSize    int                `json:"page_size"`
	TotalPage   int                `json:"total_pages"`
}

// Create creates a new promo code
func (r *PromoRepository) Create(promo *models.PromoCode) error {
	return r.db.Create(promo).Error
}

// GetByID retrieves a promo code by ID
func (r *PromoRepository) GetByID(id uuid.UUID) (*models.PromoCode, error) {
	var promo models.PromoCode
	if err := r.db.First(&promo, "id = ?", id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("promo code not found")
		}
		return nil, err
	}
	return &promo, nil
}

// GetByCode retrieves a promo code by code string
func (r *PromoRepository) GetByCode(code string) (*models.PromoCode, error) {
	var promo models.PromoCode
	if err := r.db.First(&promo, "LOWER(code) = LOWER(?)", code).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("promo code not found")
		}
		return nil, err
	}
	return &promo, nil
}

// List retrieves promo codes with filters
func (r *PromoRepository) List(filter PromoFilter) (*PromoListResult, error) {
	var promos []models.PromoCode
	var total int64

	query := r.db

	// Apply filters
	if filter.Code != "" {
		query = query.Where("LOWER(code) LIKE LOWER(?)", fmt.Sprintf("%%%s%%", filter.Code))
	}

	if filter.IsActive != nil {
		query = query.Where("is_active = ?", *filter.IsActive)
	}

	// Count total
	if err := query.Model(&models.PromoCode{}).Count(&total).Error; err != nil {
		return nil, err
	}

	// Apply sorting
	sortBy := "created_at"
	if filter.SortBy != "" {
		sortBy = filter.SortBy
	}

	sortOrder := "DESC"
	if filter.SortOrder != "" {
		sortOrder = filter.SortOrder
	}

	query = query.Order(fmt.Sprintf("%s %s", sortBy, sortOrder))

	// Apply pagination
	page := filter.Page
	if page < 1 {
		page = 1
	}

	pageSize := filter.PageSize
	if pageSize < 1 {
		pageSize = 10
	}

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Find(&promos).Error; err != nil {
		return nil, err
	}

	totalPage := int((total + int64(pageSize) - 1) / int64(pageSize))

	return &PromoListResult{
		Promos:    promos,
		Total:     total,
		Page:      page,
		PageSize:  pageSize,
		TotalPage: totalPage,
	}, nil
}

// Update updates a promo code
func (r *PromoRepository) Update(promo *models.PromoCode) error {
	return r.db.Save(promo).Error
}

// Delete soft deletes a promo code
func (r *PromoRepository) Delete(id uuid.UUID) error {
	return r.db.Model(&models.PromoCode{}).Where("id = ?", id).Delete(&models.PromoCode{}).Error
}

// IncrementUsage increments the usage_count for a promo code
func (r *PromoRepository) IncrementUsage(id uuid.UUID) error {
	return r.db.Model(&models.PromoCode{}).Where("id = ?", id).Update("usage_count", gorm.Expr("usage_count + 1")).Error
}

// RecordUsage records individual usage of a promo code
func (r *PromoRepository) RecordUsage(usage *models.PromoCodeUsage) error {
	return r.db.Create(usage).Error
}

// GetUsageCount gets total usage count for a promo code
func (r *PromoRepository) GetUsageCount(promoCodeID uuid.UUID) (int, error) {
	var count int64
	if err := r.db.Model(&models.PromoCodeUsage{}).
		Where("promo_code_id = ?", promoCodeID).
		Count(&count).Error; err != nil {
		return 0, err
	}
	return int(count), nil
}

// GetCustomerUsageCount gets usage count for a specific customer
func (r *PromoRepository) GetCustomerUsageCount(promoCodeID, customerID uuid.UUID) (int, error) {
	var count int64
	if err := r.db.Model(&models.PromoCodeUsage{}).
		Where("promo_code_id = ? AND user_id = ?", promoCodeID, customerID).
		Count(&count).Error; err != nil {
		return 0, err
	}
	return int(count), nil
}

