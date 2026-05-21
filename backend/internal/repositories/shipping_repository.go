package repositories

import (
	"ecommerce-backend/internal/models"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ShippingRepository handles database operations for shipping_methods.
type ShippingRepository struct {
	db *gorm.DB
}

// NewShippingRepository creates a new ShippingRepository.
func NewShippingRepository(db *gorm.DB) *ShippingRepository {
	return &ShippingRepository{db: db}
}

// GetActive returns all active shipping methods ordered by display_order.
func (r *ShippingRepository) GetActive() ([]models.ShippingMethod, error) {
	var methods []models.ShippingMethod
	if err := r.db.
		Where("is_active = ?", true).
		Order("display_order ASC").
		Find(&methods).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch shipping methods: %w", err)
	}
	return methods, nil
}

// GetByCode returns a single active shipping method by its code.
// Used during checkout to validate the chosen shipping method.
func (r *ShippingRepository) GetByCode(code string) (*models.ShippingMethod, error) {
	var method models.ShippingMethod
	if err := r.db.
		Where("code = ? AND is_active = ?", code, true).
		First(&method).Error; err != nil {
		return nil, fmt.Errorf("shipping method not found: %w", err)
	}
	return &method, nil
}

// GetByID returns a shipping method by its UUID.
func (r *ShippingRepository) GetByID(id uuid.UUID) (*models.ShippingMethod, error) {
	var method models.ShippingMethod
	if err := r.db.First(&method, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("shipping method not found: %w", err)
	}
	return &method, nil
}
