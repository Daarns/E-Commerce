package repositories

import (
	"ecommerce-backend/internal/models"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AddressRepository handles address operations
type AddressRepository struct {
	db *gorm.DB
}

// NewAddressRepository creates a new address repository
func NewAddressRepository(db *gorm.DB) *AddressRepository {
	return &AddressRepository{db: db}
}

// GetUserAddresses retrieves all addresses for a user
func (r *AddressRepository) GetUserAddresses(userID uuid.UUID) ([]models.Address, error) {
	var addresses []models.Address
	err := r.db.Where("user_id = ?", userID).
		Order("is_default DESC, created_at ASC").
		Find(&addresses).Error
	return addresses, err
}

// GetByID retrieves an address by ID
func (r *AddressRepository) GetByID(id uuid.UUID) (*models.Address, error) {
	var address models.Address
	err := r.db.First(&address, "id = ?", id).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("address not found")
		}
		return nil, err
	}
	return &address, nil
}

// GetDefaultAddress retrieves user's default address
func (r *AddressRepository) GetDefaultAddress(userID uuid.UUID) (*models.Address, error) {
	var address models.Address
	err := r.db.Where("user_id = ? AND is_default = true", userID).First(&address).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil // No default address is not an error
		}
		return nil, err
	}
	return &address, nil
}

// Create creates a new address
func (r *AddressRepository) Create(address *models.Address) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// If this is default, unset other defaults
		if address.IsDefault {
			if err := tx.Model(&models.Address{}).
				Where("user_id = ? AND is_default = true", address.UserID).
				Update("is_default", false).Error; err != nil {
				return err
			}
		}
		return tx.Create(address).Error
	})
}

// Update updates an address
func (r *AddressRepository) Update(address *models.Address) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// If setting as default, unset other defaults
		if address.IsDefault {
			if err := tx.Model(&models.Address{}).
				Where("user_id = ? AND id != ? AND is_default = true", address.UserID, address.ID).
				Update("is_default", false).Error; err != nil {
				return err
			}
		}
		return tx.Save(address).Error
	})
}

// Delete soft deletes an address
func (r *AddressRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.Address{}, "id = ?", id).Error
}

// SetDefault sets an address as default
func (r *AddressRepository) SetDefault(userID uuid.UUID, addressID uuid.UUID) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Unset all defaults
		if err := tx.Model(&models.Address{}).
			Where("user_id = ?", userID).
			Update("is_default", false).Error; err != nil {
			return err
		}
		// Set new default
		return tx.Model(&models.Address{}).
			Where("id = ? AND user_id = ?", addressID, userID).
			Update("is_default", true).Error
	})
}
