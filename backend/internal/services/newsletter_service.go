package services

import (
	"ecommerce-backend/internal/models"
	"fmt"
	"net/mail"
	"strings"
	"time"

	"github.com/google/uuid"
)

// NewsletterRepositoryInterface defines newsletter repository methods
type NewsletterRepositoryInterface interface {
	Create(subscription *models.NewsletterSubscription) error
	GetByEmail(email string) (*models.NewsletterSubscription, error)
	GetByID(id uuid.UUID) (*models.NewsletterSubscription, error)
	GetByConfirmationToken(token string) (*models.NewsletterSubscription, error)
	GetByUnsubscribeToken(token string) (*models.NewsletterSubscription, error)
	IsSubscribed(email string) (bool, error)
	IsPendingConfirmation(email string) (bool, error)
	ConfirmSubscription(email string) error
	Unsubscribe(email string) error
	Update(subscription *models.NewsletterSubscription) error
	Delete(id uuid.UUID) error
	GetAllSubscribed(limit, offset int) ([]models.NewsletterSubscription, error)
	GetSubscribedCount() (int64, error)
	CleanupExpiredTokens() error
}

// NewsletterService handles newsletter business logic
type NewsletterService struct {
	repo NewsletterRepositoryInterface
}

// NewNewsletterService creates new newsletter service
func NewNewsletterService(repo NewsletterRepositoryInterface) *NewsletterService {
	return &NewsletterService{repo: repo}
}

// SubscribeRequest represents subscription request
type SubscribeRequest struct {
	Email string `json:"email" binding:"required"`
}

// SubscribeResponse represents subscription response
type SubscribeResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Email   string `json:"email"`
	Status  string `json:"status"`
}

// ConfirmResponse represents confirmation response
type ConfirmResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Email   string `json:"email"`
	Status  string `json:"status"`
}

// UnsubscribeRequest represents unsubscribe request
type UnsubscribeRequest struct {
	Email string `json:"email" binding:"required"`
}

// UnsubscribeResponse represents unsubscribe response
type UnsubscribeResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Email   string `json:"email"`
}

// StatusResponse represents subscription status response
type StatusResponse struct {
	Success      bool       `json:"success"`
	Email        string     `json:"email"`
	Status       string     `json:"status"`
	SubscribedAt *time.Time `json:"subscribed_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
}

// ValidateEmail validates email format
func (s *NewsletterService) ValidateEmail(email string) error {
	if strings.TrimSpace(email) == "" {
		return fmt.Errorf("email cannot be empty")
	}

	// Use net/mail package for RFC 5322 validation
	_, err := mail.ParseAddress(email)
	if err != nil {
		return fmt.Errorf("invalid email format: %w", err)
	}

	// Additional checks
	email = strings.ToLower(email)
	
	// Check for valid domain format
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return fmt.Errorf("invalid email format")
	}

	localPart := parts[0]
	domain := parts[1]

	// Local part validation
	if len(localPart) == 0 || len(localPart) > 64 {
		return fmt.Errorf("email local part must be between 1 and 64 characters")
	}

	// Domain validation
	if len(domain) == 0 || len(domain) > 255 {
		return fmt.Errorf("email domain must be between 1 and 255 characters")
	}

	// Check if domain has at least one dot
	if !strings.Contains(domain, ".") {
		return fmt.Errorf("invalid email domain")
	}

	return nil
}

// Subscribe subscribes an email to newsletter (sends confirmation email)
func (s *NewsletterService) Subscribe(email string) (*SubscribeResponse, error) {
	// Validate email
	if err := s.ValidateEmail(email); err != nil {
		return nil, err
	}

	email = strings.ToLower(email)

	// Check if already subscribed
	isSubscribed, err := s.repo.IsSubscribed(email)
	if err != nil {
		return nil, err
	}
	if isSubscribed {
		return nil, fmt.Errorf("email is already subscribed to newsletter")
	}

	// Check if pending confirmation
	isPending, err := s.repo.IsPendingConfirmation(email)
	if err != nil {
		return nil, err
	}
	if isPending {
		return nil, fmt.Errorf("confirmation email already sent to this address")
	}

	// Generate confirmation token
	token := uuid.New().String()
	expiresAt := time.Now().Add(24 * time.Hour)

	// Create subscription record
	subscription := &models.NewsletterSubscription{
		Email:                     email,
		Status:                    models.NewsletterStatusPendingConfirmation,
		ConfirmationToken:         &token,
		ConfirmationTokenExpiresAt: &expiresAt,
	}

	if err := s.repo.Create(subscription); err != nil {
		return nil, fmt.Errorf("failed to create subscription: %w", err)
	}

	return &SubscribeResponse{
		Success: true,
		Message: "Please check your email to confirm subscription",
		Email:   email,
		Status:  models.NewsletterStatusPendingConfirmation,
	}, nil
}

// ConfirmSubscription confirms subscription via token
func (s *NewsletterService) ConfirmSubscription(token string) (*ConfirmResponse, error) {
	if strings.TrimSpace(token) == "" {
		return nil, fmt.Errorf("confirmation token is required")
	}

	// Get subscription by token
	subscription, err := s.repo.GetByConfirmationToken(token)
	if err != nil {
		return nil, err
	}

	// Check if token is expired
	if subscription.IsConfirmationTokenExpired() {
		return nil, fmt.Errorf("confirmation link has expired")
	}

	// Check if already confirmed
	if subscription.IsConfirmed() {
		return &ConfirmResponse{
			Success: true,
			Message: "Email already confirmed",
			Email:   subscription.Email,
			Status:  subscription.Status,
		}, nil
	}

	// Confirm subscription
	if err := s.repo.ConfirmSubscription(subscription.Email); err != nil {
		return nil, fmt.Errorf("failed to confirm subscription: %w", err)
	}

	return &ConfirmResponse{
		Success: true,
		Message: "Subscription confirmed successfully",
		Email:   subscription.Email,
		Status:  models.NewsletterStatusSubscribed,
	}, nil
}

// Unsubscribe unsubscribes email from newsletter
func (s *NewsletterService) Unsubscribe(email string) (*UnsubscribeResponse, error) {
	// Validate email
	if err := s.ValidateEmail(email); err != nil {
		return nil, err
	}

	email = strings.ToLower(email)

	// Check if exists
	subscription, err := s.repo.GetByEmail(email)
	if err != nil {
		return nil, fmt.Errorf("email not found in newsletter")
	}

	// Check if already unsubscribed
	if subscription.IsUnsubscribed() {
		return &UnsubscribeResponse{
			Success: true,
			Message: "Already unsubscribed",
			Email:   email,
		}, nil
	}

	// Unsubscribe
	if err := s.repo.Unsubscribe(email); err != nil {
		return nil, fmt.Errorf("failed to unsubscribe: %w", err)
	}

	return &UnsubscribeResponse{
		Success: true,
		Message: "Unsubscribed successfully",
		Email:   email,
	}, nil
}

// GetStatus gets subscription status for an email
func (s *NewsletterService) GetStatus(email string) (*StatusResponse, error) {
	// Validate email
	if err := s.ValidateEmail(email); err != nil {
		return nil, err
	}

	email = strings.ToLower(email)

	// Get subscription
	subscription, err := s.repo.GetByEmail(email)
	if err != nil {
		return nil, fmt.Errorf("email not found")
	}

	return &StatusResponse{
		Success:      true,
		Email:        subscription.Email,
		Status:       subscription.Status,
		SubscribedAt: subscription.SubscribedAt,
		CreatedAt:    subscription.CreatedAt,
	}, nil
}

// GenerateConfirmationToken generates a unique confirmation token
func (s *NewsletterService) GenerateConfirmationToken() string {
	return uuid.New().String()
}

// GenerateUnsubscribeToken generates a unique unsubscribe token
func (s *NewsletterService) GenerateUnsubscribeToken() string {
	return uuid.New().String()
}

// IsTokenExpired checks if token has expired
func (s *NewsletterService) IsTokenExpired(expiresAt *time.Time) bool {
	if expiresAt == nil {
		return true
	}
	return time.Now().After(*expiresAt)
}
