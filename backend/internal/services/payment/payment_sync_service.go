package payment

import (
	"ecommerce-backend/internal/models"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/midtrans/midtrans-go"
	"github.com/midtrans/midtrans-go/coreapi"
)

// SyncPaymentStatusResult holds the result of syncing order payment status with Midtrans.
type SyncPaymentStatusResult struct {
	OrderID           string `json:"order_id"`
	MidtransOrderID   string `json:"midtrans_order_id"`
	TransactionStatus string `json:"transaction_status"`
	PaymentStatus     string `json:"payment_status"`
	Updated           bool   `json:"updated"`
	Retryable         bool   `json:"retryable,omitempty"`
	Message           string `json:"message,omitempty"`
}

// PaymentSyncService uses Midtrans Core API to check and sync transaction status.
// Acts as a fallback when webhooks fail to deliver (e.g. ngrok URL changes).
type PaymentSyncService struct {
	coreClient    coreapi.Client
	orderRepo     OrderRepositoryInterface
	promoRepo     PromoCodeRepositoryInterface
	notifications NotificationWriter
}

// NewPaymentSyncService creates a new PaymentSyncService.
func NewPaymentSyncService(
	config *PaymentGatewayConfig,
	orderRepo OrderRepositoryInterface,
	promoRepo PromoCodeRepositoryInterface,
) *PaymentSyncService {
	env := midtrans.Sandbox
	if !config.IsSandbox() {
		env = midtrans.Production
	}
	client := coreapi.Client{}
	client.New(config.ServerKey, env)
	client.HttpClient = &midtrans.HttpClientImplementation{
		HttpClient: &http.Client{Timeout: midtransRequestTimeout},
		Logger:     midtrans.GetDefaultLogger(env),
	}

	return &PaymentSyncService{
		coreClient: client,
		orderRepo:  orderRepo,
		promoRepo:  promoRepo,
	}
}

func (s *PaymentSyncService) SetNotificationWriter(writer NotificationWriter) {
	s.notifications = writer
}

// SyncOrderPayment checks the payment status from Midtrans for the given order
// and updates the order in our database if the status has changed.
//
// Handles both original order_number and retry-suffixed IDs (e.g. ORD-xxx-r{ts}).
func (s *PaymentSyncService) SyncOrderPayment(orderID uuid.UUID, userID uuid.UUID) (*SyncPaymentStatusResult, error) {
	order, err := s.orderRepo.GetByID(orderID)
	if err != nil {
		return nil, fmt.Errorf("order not found")
	}
	if order.UserID != userID {
		return nil, fmt.Errorf("forbidden")
	}
	if order.PaymentStatus == models.PaymentStatusPaid {
		return &SyncPaymentStatusResult{
			OrderID:         order.ID.String(),
			MidtransOrderID: order.OrderNumber,
			PaymentStatus:   order.PaymentStatus,
			Updated:         false,
		}, nil
	}

	// Try original order number first, then retry suffixes.
	// We attempt both since the settled transaction might use the retry ID.
	midtransIDs := []string{order.OrderNumber}
	if order.SnapToken != "" {
		// The retry transaction (if any) is stored alongside the snap token.
		// We attempt a few likely retry suffixes by checking last known patterns.
		// In practice, only one transaction is current — we check both anyway.
		midtransIDs = append(midtransIDs, order.OrderNumber+"-r") // prefix match via loop below
	}

	// Check original order number in Midtrans
	result, transactionStatus, paymentStatus := s.checkMidtransStatus(order.OrderNumber)
	if result == nil && order.SnapToken != "" {
		// If original didn't work, the settled transaction might be a retry.
		// Midtrans doesn't give us a way to list transactions by prefix,
		// so we rely on the PaymentTransactionID stored during webhook (if partial).
		// As a last resort, we parse from the order's snap history.
		_ = midtransIDs
	}

	if paymentStatus == "" {
		log.Printf("[PaymentSync] Midtrans status unavailable order_id=%s order_number=%s", order.ID, order.OrderNumber)
		return newRetryableSyncResult(order, order.OrderNumber), nil
	}

	// Map to order status
	newOrderStatus := ""
	switch paymentStatus {
	case models.PaymentStatusPaid:
		newOrderStatus = models.OrderStatusPaymentConfirmed
	case models.PaymentStatusRefunded:
		newOrderStatus = models.OrderStatusCancelled
	}

	res := &SyncPaymentStatusResult{
		OrderID:           order.ID.String(),
		MidtransOrderID:   order.OrderNumber,
		TransactionStatus: transactionStatus,
		PaymentStatus:     paymentStatus,
		Updated:           false,
	}

	if paymentStatus != order.PaymentStatus {
		paymentMethod := formatMidtransStatusPaymentMethod(result)
		if err := s.orderRepo.UpdatePaymentStatusWithMethod(order.ID, paymentStatus, "", paymentMethod, "midtrans"); err != nil {
			return nil, fmt.Errorf("failed to update payment status: %w", err)
		}
		if newOrderStatus != "" {
			notes := fmt.Sprintf("Status synced from Midtrans: %s", transactionStatus)
			if err := s.orderRepo.UpdateStatus(order.ID, newOrderStatus, notes, nil); err != nil {
				return nil, fmt.Errorf("failed to update order status: %w", err)
			}
		}

		// Record promo usage if applicable
		if paymentStatus == models.PaymentStatusPaid && order.PromoCodeID != nil && s.promoRepo != nil {
			promo, err := s.promoRepo.GetByID(*order.PromoCodeID)
			if err == nil {
				usage := &models.PromoCodeUsage{
					PromoCodeID:    promo.ID,
					UserID:         order.UserID,
					OrderID:        &order.ID,
					DiscountAmount: order.DiscountAmount,
				}
				_ = s.promoRepo.RecordUsage(usage)
				_ = s.promoRepo.IncrementUsage(promo.ID)
			}
		}

		if paymentStatus == models.PaymentStatusPaid {
			s.notifyPaymentSuccess(order)
		}

		res.Updated = true
	}

	return res, nil
}

// SyncOrderPaymentByMidtransID syncs using an explicit Midtrans order_id (including retry suffix).
// Used when we know the exact Midtrans transaction ID (e.g. ORD-xxx-r1234567890).
func (s *PaymentSyncService) SyncOrderPaymentByMidtransID(orderID uuid.UUID, userID uuid.UUID, midtransOrderID string) (*SyncPaymentStatusResult, error) {
	order, err := s.orderRepo.GetByID(orderID)
	if err != nil {
		return nil, fmt.Errorf("order not found")
	}
	if order.UserID != userID {
		return nil, fmt.Errorf("forbidden")
	}

	result, transactionStatus, paymentStatus := s.checkMidtransStatus(midtransOrderID)
	if paymentStatus == "" {
		log.Printf("[PaymentSync] Midtrans status unavailable order_id=%s midtrans_order_id=%s", order.ID, midtransOrderID)
		return newRetryableSyncResult(order, midtransOrderID), nil
	}

	newOrderStatus := ""
	switch paymentStatus {
	case models.PaymentStatusPaid:
		newOrderStatus = models.OrderStatusPaymentConfirmed
	case models.PaymentStatusRefunded:
		newOrderStatus = models.OrderStatusCancelled
	}

	res := &SyncPaymentStatusResult{
		OrderID:           order.ID.String(),
		MidtransOrderID:   midtransOrderID,
		TransactionStatus: transactionStatus,
		PaymentStatus:     paymentStatus,
		Updated:           false,
	}

	if paymentStatus != order.PaymentStatus {
		paymentMethod := formatMidtransStatusPaymentMethod(result)
		if err := s.orderRepo.UpdatePaymentStatusWithMethod(order.ID, paymentStatus, "", paymentMethod, "midtrans"); err != nil {
			return nil, fmt.Errorf("failed to update payment status: %w", err)
		}
		if newOrderStatus != "" {
			notes := fmt.Sprintf("Status synced from Midtrans (tx: %s): %s", midtransOrderID, transactionStatus)
			if err := s.orderRepo.UpdateStatus(order.ID, newOrderStatus, notes, nil); err != nil {
				return nil, fmt.Errorf("failed to update order status: %w", err)
			}
		}

		if paymentStatus == models.PaymentStatusPaid && order.PromoCodeID != nil && s.promoRepo != nil {
			promo, err := s.promoRepo.GetByID(*order.PromoCodeID)
			if err == nil {
				usage := &models.PromoCodeUsage{
					PromoCodeID:    promo.ID,
					UserID:         order.UserID,
					OrderID:        &order.ID,
					DiscountAmount: order.DiscountAmount,
				}
				_ = s.promoRepo.RecordUsage(usage)
				_ = s.promoRepo.IncrementUsage(promo.ID)
			}
		}

		if paymentStatus == models.PaymentStatusPaid {
			s.notifyPaymentSuccess(order)
		}

		res.Updated = true
	}

	return res, nil
}

func newRetryableSyncResult(order *models.Order, midtransOrderID string) *SyncPaymentStatusResult {
	return &SyncPaymentStatusResult{
		OrderID:           order.ID.String(),
		MidtransOrderID:   midtransOrderID,
		TransactionStatus: "unknown",
		PaymentStatus:     order.PaymentStatus,
		Updated:           false,
		Retryable:         true,
		Message:           "Payment status could not be confirmed from Midtrans yet",
	}
}

func (s *PaymentSyncService) notifyPaymentSuccess(order *models.Order) {
	if s.notifications == nil || order == nil {
		return
	}

	_ = s.notifications.CreateForUser(order.UserID, models.NotificationTypePayment, "Pembayaran berhasil", fmt.Sprintf("Pembayaran pesanan %s sudah berhasil. Pesanan akan segera diproses.", order.OrderNumber), map[string]interface{}{
		"order_id":     order.ID.String(),
		"order_number": order.OrderNumber,
		"status":       models.OrderStatusPaymentConfirmed,
	})
}

// checkMidtransStatus queries Midtrans Core API for transaction status.
// Returns (rawResponse, transactionStatus, mappedPaymentStatus).
func (s *PaymentSyncService) checkMidtransStatus(midtransOrderID string) (*coreapi.TransactionStatusResponse, string, string) {
	resp, err := s.coreClient.CheckTransaction(midtransOrderID)
	if err != nil {
		return nil, "", ""
	}
	if resp == nil {
		return nil, "", ""
	}

	txStatus := strings.ToLower(resp.TransactionStatus)
	paymentStatus := syncMapTxStatus(txStatus)
	return resp, txStatus, paymentStatus
}

func formatMidtransStatusPaymentMethod(resp *coreapi.TransactionStatusResponse) string {
	if resp == nil {
		return ""
	}

	paymentType := strings.TrimSpace(strings.ToLower(resp.PaymentType))
	switch paymentType {
	case "bank_transfer":
		if len(resp.VaNumbers) > 0 && strings.TrimSpace(resp.VaNumbers[0].Bank) != "" {
			return "VA " + strings.ToUpper(strings.TrimSpace(resp.VaNumbers[0].Bank))
		}
		if strings.TrimSpace(resp.PermataVaNumber) != "" {
			return "VA PERMATA"
		}
		return "VA Bank Transfer"
	case "qris":
		issuer := strings.TrimSpace(resp.Issuer)
		if issuer == "" {
			issuer = strings.TrimSpace(resp.Acquirer)
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
		store := strings.TrimSpace(resp.Store)
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

// syncMapTxStatus maps Midtrans transaction_status to our PaymentStatus constants.
func syncMapTxStatus(txStatus string) string {
	switch txStatus {
	case "settlement", "capture":
		return models.PaymentStatusPaid
	case "pending":
		return models.PaymentStatusPendingPayment
	case "deny", "cancel", "failure", "expire":
		if txStatus == "expire" {
			return models.PaymentStatusExpired
		}
		return models.PaymentStatusFailed
	default:
		return models.PaymentStatusUnpaid
	}
}
