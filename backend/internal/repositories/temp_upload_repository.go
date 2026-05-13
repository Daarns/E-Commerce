package repositories

import (
	"fmt"

	"ecommerce-backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// TempUploadRepository handles temp upload data operations
type TempUploadRepository struct {
	db *gorm.DB
}

// NewTempUploadRepository creates a new temp upload repository
func NewTempUploadRepository(db *gorm.DB) *TempUploadRepository {
	return &TempUploadRepository{db: db}
}

// Create creates a new temp upload record
func (r *TempUploadRepository) Create(upload *models.TempUpload) error {
	if err := r.db.Create(upload).Error; err != nil {
		return fmt.Errorf("failed to create temp upload: %w", err)
	}
	return nil
}

// ClaimByURLs marks uploads as claimed by their URLs
func (r *TempUploadRepository) ClaimByURLs(urls []string) error {
	if len(urls) == 0 {
		return nil
	}
	if err := r.db.Model(&models.TempUpload{}).
		Where("image_url IN ?", urls).
		Update("claimed", true).Error; err != nil {
		return fmt.Errorf("failed to claim uploads: %w", err)
	}
	return nil
}

// GetExpiredUnclaimed retrieves expired unclaimed uploads in batches
func (r *TempUploadRepository) GetExpiredUnclaimed(limit int) ([]models.TempUpload, error) {
	var uploads []models.TempUpload
	err := r.db.Where("expires_at < NOW() AND claimed = false").
		Order("expires_at ASC").
		Limit(limit).
		Find(&uploads).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get expired unclaimed uploads: %w", err)
	}
	return uploads, nil
}

// DeleteByID deletes a temp upload by ID
func (r *TempUploadRepository) DeleteByID(id uuid.UUID) error {
	if err := r.db.Delete(&models.TempUpload{}, "id = ?", id).Error; err != nil {
		return fmt.Errorf("failed to delete temp upload: %w", err)
	}
	return nil
}

