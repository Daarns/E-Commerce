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

func withCartItemPreloads(query *gorm.DB) *gorm.DB {
	return query.
		Preload("Product").
		Preload("Product.Images", func(db *gorm.DB) *gorm.DB {
			return db.Order("display_order ASC")
		}).
		Preload("Combination").
		Preload("Combination.Options").
		Preload("Combination.Options.VariantType")
}

// GetCartByUserID retrieves cart items for a logged-in user
func (r *CartRepository) GetCartByUserID(userID uuid.UUID) (*models.Cart, error) {
	var items []models.CartItem
	err := withCartItemPreloads(r.db).
		Where("user_id = ?", userID).
		Order("created_at ASC").
		Find(&items).Error

	if err != nil {
		return nil, err
	}
	hydrateCartCombinationOptionIDs(items)

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
	err := withCartItemPreloads(r.db).
		Where("session_id = ?", sessionID).
		Order("created_at ASC").
		Find(&items).Error

	if err != nil {
		return nil, err
	}
	hydrateCartCombinationOptionIDs(items)

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
	err := withCartItemPreloads(r.db).
		First(&item, "id = ?", id).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("cart item not found")
		}
		return nil, err
	}
	hydrateCartCombinationOptionIDs([]models.CartItem{item})
	return &item, nil
}

func hydrateCartCombinationOptionIDs(items []models.CartItem) {
	for itemIndex := range items {
		combination := items[itemIndex].Combination
		if combination == nil {
			continue
		}

		optionIDs := make([]uuid.UUID, 0, len(combination.Options))
		for _, option := range combination.Options {
			optionIDs = append(optionIDs, option.ID)
		}
		combination.OptionIDs = optionIDs
	}
}

// FindCartItem finds existing cart item by user/session, product, and combination
func (r *CartRepository) FindCartItem(userID *uuid.UUID, sessionID string, productID uuid.UUID, combinationID *uuid.UUID) (*models.CartItem, error) {
	query := r.db.Model(&models.CartItem{}).
		Where("product_id = ?", productID)

	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	} else {
		query = query.Where("session_id = ?", sessionID)
	}

	if combinationID != nil {
		query = query.Where("combination_id = ?", *combinationID)
	} else {
		query = query.Where("combination_id IS NULL")
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
			// Check if user already has this product+combination
			var existingItem models.CartItem
			query := tx.Where("user_id = ? AND product_id = ?", userID, guestItem.ProductID)
			if guestItem.CombinationID != nil {
				query = query.Where("combination_id = ?", *guestItem.CombinationID)
			} else {
				query = query.Where("combination_id IS NULL")
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
