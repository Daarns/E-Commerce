package cart

import (
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	"fmt"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// UseCase handles cart business logic
type CartService struct {
	cartRepo    *repositories.CartRepository
	addressRepo *repositories.AddressRepository
	productRepo *repositories.ProductRepository
}

// NewCartService creates a new cart service
func NewCartService(cartRepo *repositories.CartRepository, addressRepo *repositories.AddressRepository, productRepo *repositories.ProductRepository) *CartService {
	return &CartService{
		cartRepo:    cartRepo,
		addressRepo: addressRepo,
		productRepo: productRepo,
	}
}

// AddToCartInput represents add to cart input
type AddToCartInput struct {
	UserID        *uuid.UUID `json:"user_id"`
	SessionID     string     `json:"session_id"`
	ProductID     uuid.UUID  `json:"product_id" binding:"required"`
	CombinationID *uuid.UUID `json:"combination_id"`
	Quantity      int        `json:"quantity" binding:"required,min=1"`
}

// ===== CART OPERATIONS =====

// GetCart retrieves cart for user or session
func (uc *CartService) GetCart(userID *uuid.UUID, sessionID string) (*models.Cart, error) {
	if userID != nil {
		return uc.cartRepo.GetCartByUserID(*userID)
	}
	if sessionID != "" {
		return uc.cartRepo.GetCartBySessionID(sessionID)
	}
	return nil, fmt.Errorf("user ID or session ID required")
}

// AddToCart adds an item to the cart
func (uc *CartService) AddToCart(input AddToCartInput) (*models.Cart, error) {
	// Validate product exists and is available
	product, err := uc.productRepo.GetByID(input.ProductID)
	if err != nil {
		return nil, fmt.Errorf("product not found")
	}

	if product.Status != "active" {
		return nil, fmt.Errorf("product is not available")
	}

	// Get price
	price := product.GetCurrentPrice()

	if input.CombinationID != nil {
		combination, err := uc.productRepo.GetCombination(*input.CombinationID)
		if err != nil {
			return nil, fmt.Errorf("combination not found")
		}
		if combination.ProductID != input.ProductID {
			return nil, fmt.Errorf("combination does not belong to this product")
		}
		if !combination.IsActive {
			return nil, fmt.Errorf("combination is not available")
		}
		price = price.Add(combination.PriceAdjustment)
	}

	// Check if item already in cart
	existingItem, err := uc.cartRepo.FindCartItem(input.UserID, input.SessionID, input.ProductID, input.CombinationID)
	if err != nil {
		return nil, err
	}

	if existingItem != nil {
		// Update quantity
		newQty := existingItem.Quantity + input.Quantity

		// Check stock
		if err := uc.validateStock(product, input.CombinationID, newQty); err != nil {
			return nil, err
		}

		if err := uc.cartRepo.UpdateItemQuantity(existingItem.ID, newQty); err != nil {
			return nil, fmt.Errorf("failed to update cart: %w", err)
		}
	} else {
		// Check stock
		if err := uc.validateStock(product, input.CombinationID, input.Quantity); err != nil {
			return nil, err
		}

		// Add new item
		item := &models.CartItem{
			UserID:        input.UserID,
			SessionID:     input.SessionID,
			ProductID:     input.ProductID,
			CombinationID: input.CombinationID,
			Quantity:      input.Quantity,
			Price:         price,
		}

		if err := uc.cartRepo.AddItem(item); err != nil {
			return nil, fmt.Errorf("failed to add to cart: %w", err)
		}
	}

	return uc.GetCart(input.UserID, input.SessionID)
}

// validateStock checks if requested quantity is available
func (uc *CartService) validateStock(product *models.Product, combinationID *uuid.UUID, quantity int) error {
	if combinationID != nil {
		combination, _ := uc.productRepo.GetCombination(*combinationID)
		if combination != nil && !combination.HasSufficientStock(quantity) {
			return fmt.Errorf("insufficient stock: only %d available", combination.StockQuantity)
		}
	} else {
		if !product.HasSufficientStock(quantity) {
			return fmt.Errorf("insufficient stock: only %d available", product.StockQuantity)
		}
	}
	return nil
}

// UpdateCartItem updates cart item quantity
func (uc *CartService) UpdateCartItem(itemID uuid.UUID, quantity int, userID *uuid.UUID, sessionID string) (*models.Cart, error) {
	item, err := uc.cartRepo.GetCartItem(itemID)
	if err != nil {
		return nil, err
	}

	// Verify ownership
	if !uc.verifyCartOwnership(item, userID, sessionID) {
		return nil, fmt.Errorf("cart item not found")
	}

	if quantity <= 0 {
		// Remove item
		if err := uc.cartRepo.RemoveItem(itemID); err != nil {
			return nil, fmt.Errorf("failed to remove item: %w", err)
		}
	} else {
		// Validate stock
		product, err := uc.productRepo.GetByID(item.ProductID)
		if err != nil {
			return nil, err
		}

		if err := uc.validateStock(product, item.CombinationID, quantity); err != nil {
			return nil, err
		}

		if err := uc.cartRepo.UpdateItemQuantity(itemID, quantity); err != nil {
			return nil, fmt.Errorf("failed to update quantity: %w", err)
		}
	}

	return uc.GetCart(userID, sessionID)
}

// RemoveFromCart removes an item from cart
func (uc *CartService) RemoveFromCart(itemID uuid.UUID, userID *uuid.UUID, sessionID string) (*models.Cart, error) {
	item, err := uc.cartRepo.GetCartItem(itemID)
	if err != nil {
		return nil, err
	}

	// Verify ownership
	if !uc.verifyCartOwnership(item, userID, sessionID) {
		return nil, fmt.Errorf("cart item not found")
	}

	if err := uc.cartRepo.RemoveItem(itemID); err != nil {
		return nil, fmt.Errorf("failed to remove item: %w", err)
	}

	return uc.GetCart(userID, sessionID)
}

// ClearCart clears all items from cart
func (uc *CartService) ClearCart(userID *uuid.UUID, sessionID string) error {
	if userID != nil {
		return uc.cartRepo.ClearCartByUserID(*userID)
	}
	if sessionID != "" {
		return uc.cartRepo.ClearCartBySessionID(sessionID)
	}
	return fmt.Errorf("user ID or session ID required")
}

// MergeGuestCart merges guest cart into user cart after login
func (uc *CartService) MergeGuestCart(userID uuid.UUID, sessionID string) (*models.Cart, error) {
	if sessionID == "" {
		return uc.GetCart(&userID, "")
	}

	if err := uc.cartRepo.MergeGuestCart(userID, sessionID); err != nil {
		return nil, fmt.Errorf("failed to merge cart: %w", err)
	}

	return uc.GetCart(&userID, "")
}

// RefreshCartPrices updates all cart item prices to current prices
func (uc *CartService) RefreshCartPrices(userID *uuid.UUID, sessionID string) (*models.Cart, error) {
	cart, err := uc.GetCart(userID, sessionID)
	if err != nil {
		return nil, err
	}

	for _, item := range cart.Items {
		product, err := uc.productRepo.GetByID(item.ProductID)
		if err != nil {
			continue // Skip unavailable products
		}

		currentPrice := product.GetCurrentPrice()
		if item.CombinationID != nil {
			combination, _ := uc.productRepo.GetCombination(*item.CombinationID)
			if combination != nil {
				currentPrice = currentPrice.Add(combination.PriceAdjustment)
			}
		}

		if !item.Price.Equal(currentPrice) {
			uc.cartRepo.UpdateItemPrice(item.ID, currentPrice)
		}
	}

	return uc.GetCart(userID, sessionID)
}

// GetCartSummary returns cart summary with totals
type CartSummary struct {
	ItemCount int             `json:"item_count"`
	Subtotal  decimal.Decimal `json:"subtotal"`
}

func (uc *CartService) GetCartSummary(userID *uuid.UUID, sessionID string) (*CartSummary, error) {
	cart, err := uc.GetCart(userID, sessionID)
	if err != nil {
		return nil, err
	}

	return &CartSummary{
		ItemCount: cart.ItemCount,
		Subtotal:  cart.Subtotal,
	}, nil
}

// verifyCartOwnership checks if cart item belongs to user/session
func (uc *CartService) verifyCartOwnership(item *models.CartItem, userID *uuid.UUID, sessionID string) bool {
	if userID != nil && item.UserID != nil {
		return *item.UserID == *userID
	}
	if sessionID != "" && item.SessionID != "" {
		return item.SessionID == sessionID
	}
	return false
}
