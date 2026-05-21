package cart

import (
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	"fmt"
	"strings"

	"github.com/google/uuid"
)

// AddressService handles user address business logic
type AddressService struct {
	addressRepo *repositories.AddressRepository
}

// NewAddressService creates a new address service
func NewAddressService(addressRepo *repositories.AddressRepository) *AddressService {
	return &AddressService{
		addressRepo: addressRepo,
	}
}

// AddressInput represents address input
type AddressInput struct {
	RecipientName string `json:"recipient_name" binding:"required,min=2,max=255"`
	Phone         string `json:"phone" binding:"required,min=8,max=20"`
	AddressLine1  string `json:"address_line1" binding:"required,min=5,max=255"`
	AddressLine2  string `json:"address_line2"`
	City          string `json:"city" binding:"required,min=2,max=100"`
	Province      string `json:"province" binding:"required,min=2,max=100"`
	PostalCode    string `json:"postal_code" binding:"required,min=5,max=10"`
	IsDefault     bool   `json:"is_default"`
}

// GetUserAddresses retrieves user's addresses
func (uc *AddressService) GetUserAddresses(userID uuid.UUID) ([]models.Address, error) {
	return uc.addressRepo.GetUserAddresses(userID)
}

// GetAddress retrieves an address by ID
func (uc *AddressService) GetAddress(addressID, userID uuid.UUID) (*models.Address, error) {
	address, err := uc.addressRepo.GetByID(addressID)
	if err != nil {
		return nil, err
	}
	
	// Verify ownership
	if address.UserID != userID {
		return nil, fmt.Errorf("address not found")
	}
	
	return address, nil
}

// AddAddress creates a new address
func (uc *AddressService) AddAddress(userID uuid.UUID, input AddressInput) (*models.Address, error) {
	address := &models.Address{
		UserID:        userID,
		RecipientName: strings.TrimSpace(input.RecipientName),
		Phone:         strings.TrimSpace(input.Phone),
		AddressLine1:  strings.TrimSpace(input.AddressLine1),
		AddressLine2:  strings.TrimSpace(input.AddressLine2),
		City:          strings.TrimSpace(input.City),
		Province:      strings.TrimSpace(input.Province),
		PostalCode:    strings.TrimSpace(input.PostalCode),
		IsDefault:     input.IsDefault,
	}

	if err := uc.addressRepo.Create(address); err != nil {
		return nil, fmt.Errorf("failed to create address: %w", err)
	}

	return address, nil
}

// UpdateAddress updates an address
func (uc *AddressService) UpdateAddress(addressID, userID uuid.UUID, input AddressInput) (*models.Address, error) {
	address, err := uc.addressRepo.GetByID(addressID)
	if err != nil {
		return nil, err
	}
	
	// Verify ownership
	if address.UserID != userID {
		return nil, fmt.Errorf("address not found")
	}

	address.RecipientName = strings.TrimSpace(input.RecipientName)
	address.Phone = strings.TrimSpace(input.Phone)
	address.AddressLine1 = strings.TrimSpace(input.AddressLine1)
	address.AddressLine2 = strings.TrimSpace(input.AddressLine2)
	address.City = strings.TrimSpace(input.City)
	address.Province = strings.TrimSpace(input.Province)
	address.PostalCode = strings.TrimSpace(input.PostalCode)
	address.IsDefault = input.IsDefault

	if err := uc.addressRepo.Update(address); err != nil {
		return nil, fmt.Errorf("failed to update address: %w", err)
	}

	return address, nil
}

// DeleteAddress deletes an address
func (uc *AddressService) DeleteAddress(addressID, userID uuid.UUID) error {
	address, err := uc.addressRepo.GetByID(addressID)
	if err != nil {
		return err
	}
	
	// Verify ownership
	if address.UserID != userID {
		return fmt.Errorf("address not found")
	}

	return uc.addressRepo.Delete(addressID)
}

// SetDefaultAddress sets an address as default
func (uc *AddressService) SetDefaultAddress(addressID, userID uuid.UUID) error {
	// Verify address exists and belongs to user
	address, err := uc.addressRepo.GetByID(addressID)
	if err != nil {
		return err
	}
	
	if address.UserID != userID {
		return fmt.Errorf("address not found")
	}

	return uc.addressRepo.SetDefault(userID, addressID)
}
