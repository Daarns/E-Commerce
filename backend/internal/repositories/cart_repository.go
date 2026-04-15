package repositories

import (
	"ecommerce-backend/internal/models"
	"fmt"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// CartRepository handles cart data operations
type CartRepository struct {
	db *gorm.DB
}

// NewCartRepository creates a new cart repository
func NewCartRepository(db *gorm.DB) *CartRepository {
	return &CartRepository{db: db}
}

// GetCartByUserID retrieves cart items for a logged-in user
func (r *CartRepository) GetCartByUserID(userID uuid.UUID) (*models.Cart, error) {
	var items []models.CartItem
	err := r.db.Preload("Product").
		Preload("Variant").
		Where("user_id = ?", userID).
		Order("created_at ASC").
		Find(&items).Error
	
	if err != nil {
		return nil, err
	}

	cart := &models.Cart{
		UserID: &userID,
		Items:  items,
	}
	cart.CalculateTotals()
	return cart, nil
}

// GetCartBySessionID retrieves cart items for a guest user
func (r *CartRepository) GetCartBySessionID(sessionID string) (*models.Cart, error) {
	var items []models.CartItem
	err := r.db.Preload("Product").
		Preload("Variant").
		Where("session_id = ?", sessionID).
		Order("created_at ASC").
		Find(&items).Error
	
	if err != nil {
		return nil, err
	}

	cart := &models.Cart{
		SessionID: sessionID,
		Items:     items,
	}
	cart.CalculateTotals()
	return cart, nil
}

// GetCartItem retrieves a specific cart item
func (r *CartRepository) GetCartItem(id uuid.UUID) (*models.CartItem, error) {
	var item models.CartItem
	err := r.db.Preload("Product").
		Preload("Variant").
		First(&item, "id = ?", id).Error
	
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("cart item not found")
		}
		return nil, err
	}
	return &item, nil
}

// FindCartItem finds existing cart item by user/session, product, and variant
func (r *CartRepository) FindCartItem(userID *uuid.UUID, sessionID string, productID uuid.UUID, variantID *uuid.UUID) (*models.CartItem, error) {
	query := r.db.Model(&models.CartItem{}).
		Where("product_id = ?", productID)
	
	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	} else {
		query = query.Where("session_id = ?", sessionID)
	}
	
	if variantID != nil {
		query = query.Where("variant_id = ?", *variantID)
	} else {
		query = query.Where("variant_id IS NULL")
	}
	
	var item models.CartItem
	err := query.First(&item).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil // Not found is not an error
		}
		return nil, err
	}
	return &item, nil
}

// AddItem adds an item to the cart
func (r *CartRepository) AddItem(item *models.CartItem) error {
	return r.db.Create(item).Error
}

// UpdateItemQuantity updates cart item quantity
func (r *CartRepository) UpdateItemQuantity(id uuid.UUID, quantity int) error {
	return r.db.Model(&models.CartItem{}).
		Where("id = ?", id).
		Update("quantity", quantity).Error
}

// UpdateItemPrice updates cart item price (for price refresh)
func (r *CartRepository) UpdateItemPrice(id uuid.UUID, price decimal.Decimal) error {
	return r.db.Model(&models.CartItem{}).
		Where("id = ?", id).
		Update("price", price).Error
}

// RemoveItem removes an item from the cart
func (r *CartRepository) RemoveItem(id uuid.UUID) error {
	return r.db.Delete(&models.CartItem{}, "id = ?", id).Error
}

// ClearCart removes all items from a user's cart
func (r *CartRepository) ClearCartByUserID(userID uuid.UUID) error {
	return r.db.Delete(&models.CartItem{}, "user_id = ?", userID).Error
}

// ClearCartBySessionID removes all items from a session cart
func (r *CartRepository) ClearCartBySessionID(sessionID string) error {
	return r.db.Delete(&models.CartItem{}, "session_id = ?", sessionID).Error
}

// MergeGuestCart merges guest cart into user cart (after login)
func (r *CartRepository) MergeGuestCart(userID uuid.UUID, sessionID string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Get guest cart items
		var guestItems []models.CartItem
		if err := tx.Where("session_id = ?", sessionID).Find(&guestItems).Error; err != nil {
			return err
		}
		
		for _, guestItem := range guestItems {
			// Check if user already has this product+variant
			var existingItem models.CartItem
			query := tx.Where("user_id = ? AND product_id = ?", userID, guestItem.ProductID)
			if guestItem.VariantID != nil {
				query = query.Where("variant_id = ?", *guestItem.VariantID)
			} else {
				query = query.Where("variant_id IS NULL")
			}
			
			err := query.First(&existingItem).Error
			if err == nil {
				// Item exists, update quantity
				newQty := existingItem.Quantity + guestItem.Quantity
				if err := tx.Model(&existingItem).Update("quantity", newQty).Error; err != nil {
					return err
				}
				// Delete guest item
				if err := tx.Delete(&guestItem).Error; err != nil {
					return err
				}
			} else if err == gorm.ErrRecordNotFound {
				// Item doesn't exist, transfer to user
				if err := tx.Model(&guestItem).Updates(map[string]interface{}{
					"user_id":    userID,
					"session_id": "",
				}).Error; err != nil {
					return err
				}
			} else {
				return err
			}
		}
		return nil
	})
}

// CountCartItems counts items in a cart
func (r *CartRepository) CountCartItems(userID *uuid.UUID, sessionID string) (int64, error) {
	var count int64
	query := r.db.Model(&models.CartItem{})
	
	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	} else {
		query = query.Where("session_id = ?", sessionID)
	}
	
	err := query.Count(&count).Error
	return count, err
}

// ===== ADDRESS OPERATIONS =====

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
