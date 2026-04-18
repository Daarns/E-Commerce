package utils

import (
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// PromoRepository interface for dependency injection
type PromoRepository interface {
	Create(promo *models.PromoCode) error
	GetByID(id uuid.UUID) (*models.PromoCode, error)
	GetByCode(code string) (*models.PromoCode, error)
	List(filter repositories.PromoFilter) (*repositories.PromoListResult, error)
	Update(promo *models.PromoCode) error
	Delete(id uuid.UUID) error
	IncrementUsage(id uuid.UUID) error
	RecordUsage(usage *models.PromoCodeUsage) error
	GetUsageCount(promoID uuid.UUID) (int64, error)
	GetCustomerUsageCount(promoID, customerID uuid.UUID) (int64, error)
}

// PromoService handles promo code business logic
type PromoService struct {
	promoRepo PromoRepository
}

// NewPromoService creates a new promo service
func NewPromoService(promoRepo PromoRepository) *PromoService {
	return &PromoService{
		promoRepo: promoRepo,
	}
}

// CreatePromoInput represents promo code creation input
type CreatePromoInput struct {
	Code                 string   `json:"code" binding:"required,min=3,max=50"`
	Description          string   `json:"description"`
	DiscountType         string   `json:"discount_type" binding:"required,oneof=percentage fixed"`
	DiscountValue        float64  `json:"discount_value" binding:"required,min=0"`
	MaxDiscountAmount    *float64 `json:"max_discount_amount"` // For percentage discounts
	MinOrderAmount       float64  `json:"min_order_amount"`
	UsageLimit           *int     `json:"usage_limit"`
	UsageLimitPerUser    int      `json:"usage_limit_per_user" binding:"min=1"`
	ValidFrom            string   `json:"valid_from" binding:"required"` // ISO 8601 date string
	ValidTo              string   `json:"valid_to" binding:"required"`   // ISO 8601 date string
	ApplicableProducts   []uuid.UUID `json:"applicable_products"`
	ApplicableCategories []uuid.UUID `json:"applicable_categories"`
	IsActive             bool     `json:"is_active" binding:""`
}

// UpdatePromoInput represents promo code update input
type UpdatePromoInput struct {
	Description          *string     `json:"description,omitempty"`
	DiscountValue        *float64    `json:"discount_value,omitempty"`
	MaxDiscountAmount    *float64    `json:"max_discount_amount,omitempty"`
	MinOrderAmount       *float64    `json:"min_order_amount,omitempty"`
	UsageLimit           *int        `json:"usage_limit,omitempty"`
	UsageLimitPerUser    *int        `json:"usage_limit_per_user,omitempty"`
	ValidTo              *string     `json:"valid_to,omitempty"`
	ApplicableProducts   *[]uuid.UUID `json:"applicable_products,omitempty"`
	ApplicableCategories *[]uuid.UUID `json:"applicable_categories,omitempty"`
	IsActive             *bool       `json:"is_active,omitempty"`
}

// ===== PROMO CODE OPERATIONS =====

// CreatePromoCode creates a new promo code
func (s *PromoService) CreatePromoCode(input CreatePromoInput) (*models.PromoCode, error) {
	// Validate discount value
	if input.DiscountValue <= 0 {
		return nil, fmt.Errorf("discount value must be positive")
	}

	// Validate percentage discount
	if input.DiscountType == "percentage" {
		if input.DiscountValue > 100 {
			return nil, fmt.Errorf("percentage discount cannot exceed 100%%")
		}
		if input.MaxDiscountAmount != nil && *input.MaxDiscountAmount <= 0 {
			return nil, fmt.Errorf("max discount amount must be positive for percentage discounts")
		}
	}

	// Parse dates
	validFrom, err := time.Parse(time.RFC3339, input.ValidFrom)
	if err != nil {
		return nil, fmt.Errorf("invalid valid_from date format (use ISO 8601)")
	}

	validTo, err := time.Parse(time.RFC3339, input.ValidTo)
	if err != nil {
		return nil, fmt.Errorf("invalid valid_to date format (use ISO 8601)")
	}

	if validTo.Before(validFrom) {
		return nil, fmt.Errorf("valid_to must be after valid_from")
	}

	// Default usage limit per user if not provided
	usageLimitPerUser := input.UsageLimitPerUser
	if usageLimitPerUser == 0 {
		usageLimitPerUser = 1
	}

	promo := &models.PromoCode{
		ID:               uuid.New(),
		Code:             strings.ToUpper(strings.TrimSpace(input.Code)),
		Description:      strings.TrimSpace(input.Description),
		DiscountType:     input.DiscountType,
		DiscountValue:    decimal.NewFromFloat(input.DiscountValue),
		MaxDiscountAmount: func() *decimal.Decimal {
			if input.MaxDiscountAmount != nil {
				md := decimal.NewFromFloat(*input.MaxDiscountAmount)
				return &md
			}
			return nil
		}(),
		MinOrderAmount:       decimal.NewFromFloat(input.MinOrderAmount),
		UsageLimit:           input.UsageLimit,
		UsageLimitPerUser:    usageLimitPerUser,
		ValidFrom:            validFrom,
		ValidTo:              validTo,
		ApplicableProducts:   input.ApplicableProducts,
		ApplicableCategories: input.ApplicableCategories,
		IsActive:             input.IsActive,
	}

	if err := s.promoRepo.Create(promo); err != nil {
		return nil, fmt.Errorf("failed to create promo code: %w", err)
	}

	return promo, nil
}

// GetPromoCode retrieves a promo code by ID
func (s *PromoService) GetPromoCode(id uuid.UUID) (*models.PromoCode, error) {
	return s.promoRepo.GetByID(id)
}

// GetPromoCodeByCode retrieves a promo code by code string
func (s *PromoService) GetPromoCodeByCode(code string) (*models.PromoCode, error) {
	return s.promoRepo.GetByCode(code)
}

// ListPromoCodes retrieves promo codes with filters
func (s *PromoService) ListPromoCodes(filter repositories.PromoFilter) (*repositories.PromoListResult, error) {
	return s.promoRepo.List(filter)
}

// UpdatePromoCode updates a promo code
func (s *PromoService) UpdatePromoCode(id uuid.UUID, input UpdatePromoInput) (*models.PromoCode, error) {
	promo, err := s.promoRepo.GetByID(id)
	if err != nil {
		return nil, err
	}

	// Apply updates
	if input.Description != nil {
		promo.Description = strings.TrimSpace(*input.Description)
	}

	if input.DiscountValue != nil {
		if *input.DiscountValue <= 0 {
			return nil, fmt.Errorf("discount value must be positive")
		}
		if promo.DiscountType == "percentage" && *input.DiscountValue > 100 {
			return nil, fmt.Errorf("percentage discount cannot exceed 100%%")
		}
		promo.DiscountValue = decimal.NewFromFloat(*input.DiscountValue)
	}

	if input.MaxDiscountAmount != nil {
		md := decimal.NewFromFloat(*input.MaxDiscountAmount)
		promo.MaxDiscountAmount = &md
	}

	if input.MinOrderAmount != nil {
		promo.MinOrderAmount = decimal.NewFromFloat(*input.MinOrderAmount)
	}

	if input.UsageLimit != nil {
		promo.UsageLimit = input.UsageLimit
	}

	if input.UsageLimitPerUser != nil {
		if *input.UsageLimitPerUser < 1 {
			return nil, fmt.Errorf("usage per user must be at least 1")
		}
		promo.UsageLimitPerUser = *input.UsageLimitPerUser
	}

	if input.ValidTo != nil {
		vt, err := time.Parse(time.RFC3339, *input.ValidTo)
		if err != nil {
			return nil, fmt.Errorf("invalid valid_to date format (use ISO 8601)")
		}
		if vt.Before(promo.ValidFrom) {
			return nil, fmt.Errorf("valid_to must be after valid_from")
		}
		promo.ValidTo = vt
	}

	if input.ApplicableProducts != nil {
		promo.ApplicableProducts = *input.ApplicableProducts
	}

	if input.ApplicableCategories != nil {
		promo.ApplicableCategories = *input.ApplicableCategories
	}

	if input.IsActive != nil {
		promo.IsActive = *input.IsActive
	}

	if err := s.promoRepo.Update(promo); err != nil {
		return nil, fmt.Errorf("failed to update promo code: %w", err)
	}

	return s.promoRepo.GetByID(id)
}

// DeletePromoCode deletes a promo code
func (s *PromoService) DeletePromoCode(id uuid.UUID) error {
	_, err := s.promoRepo.GetByID(id)
	if err != nil {
		return err
	}

	return s.promoRepo.Delete(id)
}

// ValidatePromoCode checks if a promo code is valid and applicable
func (s *PromoService) ValidatePromoCode(code string, orderAmount decimal.Decimal, customerID uuid.UUID) (*models.PromoCode, error) {
	promo, err := s.promoRepo.GetByCode(code)
	if err != nil {
		return nil, fmt.Errorf("invalid promo code")
	}

	// Check if active
	if !promo.IsActive {
		return nil, fmt.Errorf("promo code is inactive")
	}

	// Check validity period
	if !promo.IsValid() {
		return nil, fmt.Errorf("promo code is not valid or has expired")
	}

	// Check customer usage limit
	customerUsageCount, err := s.promoRepo.GetCustomerUsageCount(promo.ID, customerID)
	if err != nil {
		return nil, fmt.Errorf("error checking customer usage: %w", err)
	}

	if customerUsageCount >= int64(promo.UsageLimitPerUser) {
		return nil, fmt.Errorf("you have already used this promo code the maximum number of times")
	}

	// Check minimum order amount
	if orderAmount.LessThan(promo.MinOrderAmount) {
		return nil, fmt.Errorf("order amount does not meet minimum requirement (minimum: %s)", promo.MinOrderAmount.String())
	}

	return promo, nil
}

// CalculateDiscount calculates the discount amount based on promo code and order amount
func (s *PromoService) CalculateDiscount(promo *models.PromoCode, orderAmount decimal.Decimal) decimal.Decimal {
	return promo.CalculateDiscount(orderAmount)
}

// RecordPromoUsage records that a customer used a promo code
func (s *PromoService) RecordPromoUsage(promoCodeID uuid.UUID, orderID uuid.UUID, customerID uuid.UUID, discountAmount decimal.Decimal) error {
	usage := &models.PromoCodeUsage{
		ID:             uuid.New(),
		PromoCodeID:    promoCodeID,
		OrderID:        &orderID,
		UserID:         customerID,
		DiscountAmount: discountAmount,
		UsedAt:         time.Now(),
	}

	if err := s.promoRepo.RecordUsage(usage); err != nil {
		return fmt.Errorf("failed to record promo usage: %w", err)
	}

	// Increment usage count on promo code
	if err := s.promoRepo.IncrementUsage(promoCodeID); err != nil {
		return fmt.Errorf("failed to increment promo usage count: %w", err)
	}

	return nil
}


