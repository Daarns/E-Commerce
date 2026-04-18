package payment

import (
	"crypto/sha512"
	"ecommerce-backend/internal/models"
	"encoding/hex"
	"fmt"
	"strings"

	"github.com/google/uuid"
)

// PaymentWebhookRequest represents incoming webhook from Midtrans
type PaymentWebhookRequest struct {
	TransactionTime   string `json:"transaction_time"`
	TransactionStatus string `json:"transaction_status"`
	TransactionID     string `json:"transaction_id"`
	OrderID           string `json:"order_id"`
	StatusCode        string `json:"status_code"`
	SignatureKey      string `json:"signature_key"`
	GrossAmount       string `json:"gross_amount"`
	PaymentType       string `json:"payment_type"`
	FraudStatus       string `json:"fraud_status"`
}

// PaymentWebhookResponse represents webhook response
type PaymentWebhookResponse struct {
	Success       bool   `json:"success"`
	Message       string `json:"message"`
	OrderID       string `json:"order_id"`
	PaymentStatus string `json:"payment_status"`
}

// OrderRepositoryInterface defines order repository methods needed by webhook service
type OrderRepositoryInterface interface {
	GetByOrderNumber(orderNumber string) (*models.Order, error)
	UpdatePaymentStatus(orderID uuid.UUID, paymentStatus string, transactionID string) error
	UpdateStatus(orderID uuid.UUID, newStatus string, notes string, changedBy *uuid.UUID) error
	GetByID(id uuid.UUID) (*models.Order, error)
}

// PaymentWebhookService handles payment webhook processing
type PaymentWebhookService struct {
	orderRepo OrderRepositoryInterface
	serverKey string
}

// NewPaymentWebhookService creates new payment webhook service
func NewPaymentWebhookService(orderRepo OrderRepositoryInterface, serverKey string) *PaymentWebhookService {
	return &PaymentWebhookService{
		orderRepo: orderRepo,
		serverKey: serverKey,
	}
}

// VerifySignature verifies Midtrans webhook signature using SHA512
func (s *PaymentWebhookService) VerifySignature(orderID, statusCode, grossAmount, signatureKey string) bool {
	// Build signature string: OrderID + StatusCode + GrossAmount + ServerKey
	signatureString := orderID + statusCode + grossAmount + s.serverKey

	// Calculate SHA512 hash
	hash := sha512.Sum512([]byte(signatureString))
	calculatedSignature := hex.EncodeToString(hash[:])

	// Constant-time comparison to prevent timing attacks
	return constantTimeCompare(calculatedSignature, signatureKey)
}

// ProcessWebhook processes incoming payment webhook
func (s *PaymentWebhookService) ProcessWebhook(webhook *PaymentWebhookRequest) (*PaymentWebhookResponse, error) {
	// Verify signature
	if !s.VerifySignature(webhook.OrderID, webhook.StatusCode, webhook.GrossAmount, webhook.SignatureKey) {
		return nil, fmt.Errorf("invalid webhook signature")
	}

	// Find order by order number
	order, err := s.orderRepo.GetByOrderNumber(webhook.OrderID)
	if err != nil {
		return nil, fmt.Errorf("order not found: %w", err)
	}

	// Check idempotency: if transaction already processed, return existing status
	if order.PaymentTransactionID != "" && order.PaymentTransactionID == webhook.TransactionID {
		return &PaymentWebhookResponse{
			Success:       true,
			Message:       "Webhook already processed",
			OrderID:       webhook.OrderID,
			PaymentStatus: order.PaymentStatus,
		}, nil
	}

	// Map Midtrans status to our payment status
	paymentStatus := mapMidtransStatus(webhook.TransactionStatus)

	// Determine order status based on payment status
	var newOrderStatus string
	switch paymentStatus {
	case models.PaymentStatusPaid:
		newOrderStatus = models.OrderStatusPaymentConfirmed
	case models.PaymentStatusRefunded:
		newOrderStatus = models.OrderStatusCancelled
	default:
		newOrderStatus = "" // No order status change for pending/unknown
	}

	// Update payment status
	if err := s.orderRepo.UpdatePaymentStatus(order.ID, paymentStatus, webhook.TransactionID); err != nil {
		return nil, fmt.Errorf("failed to update payment status: %w", err)
	}

	// Update order status if there's a status change
	if newOrderStatus != "" {
		notes := fmt.Sprintf("Payment %s via %s (Transaction: %s)", webhook.TransactionStatus, webhook.PaymentType, webhook.TransactionID)
		if err := s.orderRepo.UpdateStatus(order.ID, newOrderStatus, notes, nil); err != nil {
			return nil, fmt.Errorf("failed to update order status: %w", err)
		}
	}

	return &PaymentWebhookResponse{
		Success:       true,
		Message:       "Webhook processed successfully",
		OrderID:       webhook.OrderID,
		PaymentStatus: paymentStatus,
	}, nil
}

// mapMidtransStatus maps Midtrans transaction status to our payment status
func mapMidtransStatus(transactionStatus string) string {
	switch strings.ToLower(transactionStatus) {
	case "settlement":
		return models.PaymentStatusPaid
	case "capture":
		return models.PaymentStatusPaid
	case "pending":
		return models.PaymentStatusUnpaid
	case "deny":
		return models.PaymentStatusRefunded
	case "cancel":
		return models.PaymentStatusRefunded
	case "expire":
		return models.PaymentStatusUnpaid
	case "failure":
		return models.PaymentStatusRefunded
	default:
		return models.PaymentStatusUnpaid
	}
}

// constantTimeCompare performs constant-time string comparison to prevent timing attacks
func constantTimeCompare(a, b string) bool {
	if len(a) != len(b) {
		return false
	}

	result := 0
	for i := 0; i < len(a); i++ {
		result |= int(a[i]) ^ int(b[i])
	}
	return result == 0
}

// GetPaymentWebhookStatusInfo returns human-readable payment status info
func GetPaymentWebhookStatusInfo(status string) string {
	infoMap := map[string]string{
		"settlement": "Payment has been successfully settled",
		"capture":    "Payment has been captured",
		"pending":    "Payment is pending, waiting for customer action",
		"deny":       "Payment has been denied",
		"cancel":     "Payment has been cancelled",
		"expire":     "Payment has expired, customer can retry",
		"failure":    "Payment has failed",
	}

	if info, exists := infoMap[strings.ToLower(status)]; exists {
		return info
	}
	return "Unknown payment status"
}

// IsPaymentStatusFinal checks if payment status is final (no further changes expected)
func IsPaymentStatusFinal(status string) bool {
	finalStatuses := map[string]bool{
		models.PaymentStatusPaid:     true,
		models.PaymentStatusRefunded: true,
	}
	return finalStatuses[status]
}

// IsPaymentWebhookRetryable checks if webhook processing can be retried
func IsPaymentWebhookRetryable(err error) bool {
	// Retryable errors: database connection issues, timeouts, etc.
	// Non-retryable: invalid webhook, order not found (with proper error handling)
	errMsg := err.Error()
	
	retryable := []string{
		"connection refused",
		"connection reset",
		"i/o timeout",
		"deadlock detected",
		"unavailable",
	}

	for _, msg := range retryable {
		if strings.Contains(strings.ToLower(errMsg), msg) {
			return true
		}
	}
	return false
}

// SHA512Hash calculates SHA512 hash of a string (exported for testing)
func SHA512Hash(data string) string {
	hash := sha512.Sum512([]byte(data))
	return hex.EncodeToString(hash[:])
}

// MapMidtransStatusForTest is a test-friendly export of status mapping (exported for testing)
func MapMidtransStatusForTest(status string) string {
	return mapMidtransStatus(status)
}

