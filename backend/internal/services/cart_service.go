package services

import (
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	"fmt"
	"strings"

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
	UserID    *uuid.UUID `json:"user_id"`
	SessionID string     `json:"session_id"`
	ProductID uuid.UUID  `json:"product_id" binding:"required"`
	VariantID *uuid.UUID `json:"variant_id"`
	Quantity  int        `json:"quantity" binding:"required,min=1"`
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
	
	// If variant specified, validate and get variant price
	if input.VariantID != nil {
		variant, err := uc.productRepo.GetVariant(*input.VariantID)
		if err != nil {
			return nil, fmt.Errorf("variant not found")
		}
		if variant.ProductID != input.ProductID {
			return nil, fmt.Errorf("variant does not belong to this product")
		}
		if !variant.IsActive {
			return nil, fmt.Errorf("variant is not available")
		}
		// Add price adjustment
		price = price.Add(variant.PriceAdjustment)
	}

	// Check if item already in cart
	existingItem, err := uc.cartRepo.FindCartItem(input.UserID, input.SessionID, input.ProductID, input.VariantID)
	if err != nil {
		return nil, err
	}

	if existingItem != nil {
		// Update quantity
		newQty := existingItem.Quantity + input.Quantity
		
		// Check stock
		if err := uc.validateStock(product, input.VariantID, newQty); err != nil {
			return nil, err
		}
		
		if err := uc.cartRepo.UpdateItemQuantity(existingItem.ID, newQty); err != nil {
			return nil, fmt.Errorf("failed to update cart: %w", err)
		}
	} else {
		// Check stock
		if err := uc.validateStock(product, input.VariantID, input.Quantity); err != nil {
			return nil, err
		}
		
		// Add new item
		item := &models.CartItem{
			UserID:    input.UserID,
			SessionID: input.SessionID,
			ProductID: input.ProductID,
			VariantID: input.VariantID,
			Quantity:  input.Quantity,
			Price:     price,
		}
		
		if err := uc.cartRepo.AddItem(item); err != nil {
			return nil, fmt.Errorf("failed to add to cart: %w", err)
		}
	}

	return uc.GetCart(input.UserID, input.SessionID)
}

// validateStock checks if requested quantity is available
func (uc *CartService) validateStock(product *models.Product, variantID *uuid.UUID, quantity int) error {
	if variantID != nil {
		variant, _ := uc.productRepo.GetVariant(*variantID)
		if variant != nil && !variant.HasSufficientStock(quantity) {
			return fmt.Errorf("insufficient stock: only %d available", variant.StockQuantity)
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
		
		if err := uc.validateStock(product, item.VariantID, quantity); err != nil {
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
		if item.VariantID != nil {
			variant, _ := uc.productRepo.GetVariant(*item.VariantID)
			if variant != nil {
				currentPrice = currentPrice.Add(variant.PriceAdjustment)
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

// ===== ADDRESS OPERATIONS =====

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
func (uc *CartService) GetUserAddresses(userID uuid.UUID) ([]models.Address, error) {
	return uc.addressRepo.GetUserAddresses(userID)
}

// GetAddress retrieves an address by ID
func (uc *CartService) GetAddress(addressID, userID uuid.UUID) (*models.Address, error) {
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
func (uc *CartService) AddAddress(userID uuid.UUID, input AddressInput) (*models.Address, error) {
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
func (uc *CartService) UpdateAddress(addressID, userID uuid.UUID, input AddressInput) (*models.Address, error) {
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
func (uc *CartService) DeleteAddress(addressID, userID uuid.UUID) error {
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
func (uc *CartService) SetDefaultAddress(addressID, userID uuid.UUID) error {
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
