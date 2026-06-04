package payment

import (
	"crypto/sha512"
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
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
	VANumbers         []struct {
		Bank     string `json:"bank"`
		VANumber string `json:"va_number"`
	} `json:"va_numbers"`
	PermataVANumber string `json:"permata_va_number"`
	Store           string `json:"store"`
	Issuer          string `json:"issuer"`
	Acquirer        string `json:"acquirer"`
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
	UpdatePaymentStatusWithMethod(orderID uuid.UUID, paymentStatus string, transactionID string, paymentMethod string, paymentProvider string) error
	UpdateStatus(orderID uuid.UUID, newStatus string, notes string, changedBy *uuid.UUID) error
	GetByID(id uuid.UUID) (*models.Order, error)
	Update(order *models.Order) error
}

// PromoCodeRepositoryInterface defines promo repo methods needed by webhook service
type PromoCodeRepositoryInterface interface {
	GetByID(id uuid.UUID) (*models.PromoCode, error)
	RecordUsage(usage *models.PromoCodeUsage) error
	IncrementUsage(id uuid.UUID) error
}

type NotificationWriter interface {
	CreateForUser(userID uuid.UUID, notificationType string, title string, message string, metadata map[string]interface{}) error
}

// PaymentWebhookService handles payment webhook processing
type PaymentWebhookService struct {
	orderRepo        OrderRepositoryInterface
	promoRepo        PromoCodeRepositoryInterface
	webhookEventRepo *repositories.WebhookEventRepository
	serverKey        string
	notifications    NotificationWriter
}

// NewPaymentWebhookService creates new payment webhook service
func NewPaymentWebhookService(orderRepo OrderRepositoryInterface, promoRepo PromoCodeRepositoryInterface, serverKey string) *PaymentWebhookService {
	return &PaymentWebhookService{
		orderRepo: orderRepo,
		promoRepo: promoRepo,
		serverKey: serverKey,
	}
}

// SetWebhookEventRepository sets the webhook event repository for idempotency checks
func (s *PaymentWebhookService) SetWebhookEventRepository(repo *repositories.WebhookEventRepository) {
	s.webhookEventRepo = repo
}

func (s *PaymentWebhookService) SetNotificationWriter(writer NotificationWriter) {
	s.notifications = writer
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

// ProcessWebhook processes incoming payment webhook with idempotency guarantee
func (s *PaymentWebhookService) ProcessWebhook(webhook *PaymentWebhookRequest) (*PaymentWebhookResponse, error) {
	// Verify signature
	if !s.VerifySignature(webhook.OrderID, webhook.StatusCode, webhook.GrossAmount, webhook.SignatureKey) {
		return nil, fmt.Errorf("invalid webhook signature")
	}

	webhookEventID := buildWebhookEventID(webhook)

	// Check idempotency: if this exact webhook status event was already processed, return success.
	// Midtrans can send multiple status changes with the same transaction_id
	// (e.g. pending -> settlement), so transaction_id alone is not a safe idempotency key.
	if s.webhookEventRepo != nil {
		processed, err := s.webhookEventRepo.IsProcessed(webhookEventID)
		if err != nil {
			fmt.Printf("Warning: failed to check webhook idempotency: %v\n", err)
			// Continue anyway — idempotency check is not critical
		} else if processed {
			return &PaymentWebhookResponse{
				Success:       true,
				Message:       "Webhook already processed",
				OrderID:       webhook.OrderID,
				PaymentStatus: "already_processed",
			}, nil
		}
	}

	// Find order by order number.
	// Strip any retry suffix appended for Midtrans deduplication (e.g. ORD-001-r1745123456 → ORD-001).
	orderNumber := webhook.OrderID
	if idx := lastRetryIdx(orderNumber); idx != -1 {
		orderNumber = orderNumber[:idx]
	}
	order, err := s.orderRepo.GetByOrderNumber(orderNumber)
	if err != nil {
		return nil, fmt.Errorf("order not found: %w", err)
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
		newOrderStatus = "" // Cleanup handles expired unpaid orders and restores stock.
	}

	// Update payment status and store selected Midtrans payment method after Snap choice.
	paymentMethod := formatMidtransPaymentMethod(webhook)
	wasAlreadyPaid := order.PaymentStatus == models.PaymentStatusPaid
	if err := s.orderRepo.UpdatePaymentStatusWithMethod(order.ID, paymentStatus, webhook.TransactionID, paymentMethod, "midtrans"); err != nil {
		return nil, fmt.Errorf("failed to update payment status: %w", err)
	}

	// Update order status if there's a status change
	if newOrderStatus != "" {
		notes := fmt.Sprintf("Payment %s via %s (Transaction: %s)", webhook.TransactionStatus, webhook.PaymentType, webhook.TransactionID)
		if err := s.orderRepo.UpdateStatus(order.ID, newOrderStatus, notes, nil); err != nil {
			return nil, fmt.Errorf("failed to update order status: %w", err)
		}
	}

	// Record promo usage now that payment is confirmed (deferred from checkout)
	if paymentStatus == models.PaymentStatusPaid && order.PromoCodeID != nil && s.promoRepo != nil {
		promo, err := s.promoRepo.GetByID(*order.PromoCodeID)
		if err == nil {
			usage := &models.PromoCodeUsage{
				PromoCodeID:    promo.ID,
				UserID:         order.UserID,
				OrderID:        &order.ID,
				DiscountAmount: order.DiscountAmount,
			}
			if err := s.promoRepo.RecordUsage(usage); err != nil {
				fmt.Printf("Warning: failed to record promo usage for order %s: %v\n", order.OrderNumber, err)
			}
			if err := s.promoRepo.IncrementUsage(promo.ID); err != nil {
				fmt.Printf("Warning: failed to increment promo usage for order %s: %v\n", order.OrderNumber, err)
			}
		}
	}

	if paymentStatus == models.PaymentStatusPaid && !wasAlreadyPaid {
		s.notifyPaymentSuccess(order)
	}

	// Record webhook event for idempotency (non-fatal if it fails)
	if s.webhookEventRepo != nil {
		if err := s.webhookEventRepo.Record(webhookEventID, webhook.TransactionStatus); err != nil {
			fmt.Printf("Warning: failed to record webhook event: %v\n", err)
		}
	}

	return &PaymentWebhookResponse{
		Success:       true,
		Message:       "Webhook processed successfully",
		OrderID:       webhook.OrderID,
		PaymentStatus: paymentStatus,
	}, nil
}

func (s *PaymentWebhookService) notifyPaymentSuccess(order *models.Order) {
	if s.notifications == nil || order == nil {
		return
	}

	_ = s.notifications.CreateForUser(order.UserID, models.NotificationTypePayment, "Pembayaran berhasil", fmt.Sprintf("Pembayaran pesanan %s sudah berhasil. Pesanan akan segera diproses.", order.OrderNumber), map[string]interface{}{
		"order_id":     order.ID.String(),
		"order_number": order.OrderNumber,
		"status":       models.OrderStatusPaymentConfirmed,
	})
}

func formatMidtransPaymentMethod(webhook *PaymentWebhookRequest) string {
	paymentType := strings.TrimSpace(strings.ToLower(webhook.PaymentType))

	switch paymentType {
	case "bank_transfer":
		if len(webhook.VANumbers) > 0 && strings.TrimSpace(webhook.VANumbers[0].Bank) != "" {
			return "VA " + strings.ToUpper(strings.TrimSpace(webhook.VANumbers[0].Bank))
		}
		if strings.TrimSpace(webhook.PermataVANumber) != "" {
			return "VA PERMATA"
		}
		return "VA Bank Transfer"
	case "qris":
		issuer := strings.TrimSpace(webhook.Issuer)
		if issuer == "" {
			issuer = strings.TrimSpace(webhook.Acquirer)
		}
		if issuer != "" {
			return "QRIS " + strings.ToUpper(issuer)
		}
		return "QRIS"
	case "shopeepay":
		return "ShopeePay"
	case "gopay":
		return "GoPay"
	case "credit_card":
		return "Credit Card"
	case "cstore":
		store := strings.TrimSpace(webhook.Store)
		if store != "" {
			return strings.ToUpper(store)
		}
		return "Convenience Store"
	}

	if paymentType == "" {
		return ""
	}
	return strings.ToUpper(strings.ReplaceAll(paymentType, "_", " "))
}

func buildWebhookEventID(webhook *PaymentWebhookRequest) string {
	return fmt.Sprintf(
		"%s:%s:%s",
		webhook.TransactionID,
		webhook.StatusCode,
		strings.ToLower(webhook.TransactionStatus),
	)
}

// mapMidtransStatus maps Midtrans transaction status to our payment status
func mapMidtransStatus(transactionStatus string) string {
	switch strings.ToLower(transactionStatus) {
	case "settlement":
		return models.PaymentStatusPaid
	case "capture":
		return models.PaymentStatusPaid
	case "pending":
		return models.PaymentStatusPendingPayment
	case "deny":
		return models.PaymentStatusFailed
	case "cancel":
		return models.PaymentStatusFailed
	case "expire":
		return models.PaymentStatusExpired
	case "failure":
		return models.PaymentStatusFailed
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

// lastRetryIdx returns the index of the "-r" retry suffix in s (e.g. "ORD-001-r1745000000" → 7).
// Returns -1 if no retry suffix is present.
// Pattern: ends with "-r" followed by one or more digits.
func lastRetryIdx(s string) int {
	for i := len(s) - 1; i >= 2; i-- {
		if s[i] >= '0' && s[i] <= '9' {
			continue
		}
		// Must be the 'r' character
		if s[i] == 'r' && i >= 1 && s[i-1] == '-' {
			return i - 1 // index of the '-' before 'r'
		}
		break
	}
	return -1
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
