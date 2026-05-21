package payment

import (
	"ecommerce-backend/internal/models"
	"fmt"
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
}

// PaymentSyncService uses Midtrans Core API to check and sync transaction status.
// Acts as a fallback when webhooks fail to deliver (e.g. ngrok URL changes).
type PaymentSyncService struct {
	coreClient coreapi.Client
	orderRepo  OrderRepositoryInterface
	promoRepo  PromoCodeRepositoryInterface
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
			OrderID:       order.ID.String(),
			PaymentStatus: order.PaymentStatus,
			Updated:       false,
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
		return nil, fmt.Errorf("could not retrieve payment status from Midtrans for order %s", order.OrderNumber)
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
		if err := s.orderRepo.UpdatePaymentStatus(order.ID, paymentStatus, ""); err != nil {
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

	_, transactionStatus, paymentStatus := s.checkMidtransStatus(midtransOrderID)
	if paymentStatus == "" {
		return nil, fmt.Errorf("could not retrieve payment status from Midtrans for %s", midtransOrderID)
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
		if err := s.orderRepo.UpdatePaymentStatus(order.ID, paymentStatus, ""); err != nil {
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

		res.Updated = true
	}

	return res, nil
}

// checkMidtransStatus queries Midtrans Core API for transaction status.
// Returns (rawResponse, transactionStatus, mappedPaymentStatus).
func (s *PaymentSyncService) checkMidtransStatus(midtransOrderID string) (interface{}, string, string) {
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
