package features

import (
	"bytes"
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/services"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

// MockOrderRepository implements OrderRepositoryInterface for testing
type MockOrderRepository struct {
	mock.Mock
}

func (m *MockOrderRepository) GetByOrderNumber(orderNumber string) (*models.Order, error) {
	args := m.Called(orderNumber)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Order), args.Error(1)
}

func (m *MockOrderRepository) UpdatePaymentStatus(orderID uuid.UUID, paymentStatus string, transactionID string) error {
	args := m.Called(orderID, paymentStatus, transactionID)
	return args.Error(0)
}

func (m *MockOrderRepository) UpdateStatus(orderID uuid.UUID, newStatus string, notes string, changedBy *uuid.UUID) error {
	args := m.Called(orderID, newStatus, notes, changedBy)
	return args.Error(0)
}

func (m *MockOrderRepository) GetByID(id uuid.UUID) (*models.Order, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Order), args.Error(1)
}

// Helper function to create test order
func createTestOrder(orderNumber, transactionID string, paymentStatus string) *models.Order {
	userID := uuid.New()
	return &models.Order{
		ID:                   uuid.New(),
		OrderNumber:          orderNumber,
		UserID:               userID,
		OrderStatus:          models.OrderStatusPending,
		PaymentStatus:        paymentStatus,
		PaymentTransactionID: transactionID,
		Total:                decimal.NewFromInt(100000),
		Subtotal:             decimal.NewFromInt(100000),
		CreatedAt:            time.Now(),
		UpdatedAt:            time.Now(),
	}
}

// Helper function to calculate Midtrans signature
func calculateMidtransSignature(orderID, statusCode, grossAmount, serverKey string) string {
	signatureString := orderID + statusCode + grossAmount + serverKey
	return services.SHA512Hash(signatureString)
}

// Mock SHA512Hash for testing (exported from service)
// Note: This uses the actual hash function from the service
func TestWebhookSignatureVerification_Valid(t *testing.T) {
	mockRepo := new(MockOrderRepository)
	serverKey := "test-server-key-12345"
	service := services.NewPaymentWebhookService(mockRepo, serverKey)

	orderID := "ORD-20260415-abc12345"
	statusCode := "200"
	grossAmount := "100000.00"

	// Calculate valid signature
	signatureString := orderID + statusCode + grossAmount + serverKey
	hash := services.SHA512Hash(signatureString)

	// Setup mock
	order := createTestOrder(orderID, "", models.PaymentStatusUnpaid)
	mockRepo.On("GetByOrderNumber", orderID).Return(order, nil)
	mockRepo.On("UpdatePaymentStatus", order.ID, models.PaymentStatusPaid, "12345-1234567890-123456").Return(nil)
	mockRepo.On("UpdateStatus", order.ID, models.OrderStatusPaymentConfirmed, mock.MatchedBy(func(s string) bool {
		return s != ""
	}), mock.Anything).Return(nil)

	webhook := &services.PaymentWebhookRequest{
		OrderID:           orderID,
		TransactionID:     "12345-1234567890-123456",
		TransactionStatus: "settlement",
		StatusCode:        statusCode,
		GrossAmount:       grossAmount,
		SignatureKey:      hash,
		PaymentType:       "credit_card",
	}

	result, err := service.ProcessWebhook(webhook)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.True(t, result.Success)
	assert.Equal(t, models.PaymentStatusPaid, result.PaymentStatus)
	mockRepo.AssertExpectations(t)
}

func TestWebhookSignatureVerification_Invalid(t *testing.T) {
	mockRepo := new(MockOrderRepository)
	serverKey := "test-server-key-12345"
	service := services.NewPaymentWebhookService(mockRepo, serverKey)

	orderID := "ORD-20260415-abc12345"
	statusCode := "200"
	grossAmount := "100000.00"

	webhook := &services.PaymentWebhookRequest{
		OrderID:           orderID,
		TransactionID:     "12345-1234567890-123456",
		TransactionStatus: "settlement",
		StatusCode:        statusCode,
		GrossAmount:       grossAmount,
		SignatureKey:      "invalid-signature-xyz",
		PaymentType:       "credit_card",
	}

	result, err := service.ProcessWebhook(webhook)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Equal(t, "invalid webhook signature", err.Error())
	mockRepo.AssertNotCalled(t, "GetByOrderNumber")
}

func TestWebhookPaymentSettlement_Success(t *testing.T) {
	mockRepo := new(MockOrderRepository)
	serverKey := "test-server-key-12345"
	service := services.NewPaymentWebhookService(mockRepo, serverKey)

	orderID := "ORD-20260415-abc12345"
	statusCode := "200"
	grossAmount := "100000.00"
	transactionID := "12345-1234567890-123456"

	signatureString := orderID + statusCode + grossAmount + serverKey
	hash := services.SHA512Hash(signatureString)

	order := createTestOrder(orderID, "", models.PaymentStatusUnpaid)
	mockRepo.On("GetByOrderNumber", orderID).Return(order, nil)
	mockRepo.On("UpdatePaymentStatus", order.ID, models.PaymentStatusPaid, transactionID).Return(nil)
	mockRepo.On("UpdateStatus", order.ID, models.OrderStatusPaymentConfirmed, mock.MatchedBy(func(s string) bool {
		return s != ""
	}), mock.Anything).Return(nil)

	webhook := &services.PaymentWebhookRequest{
		OrderID:           orderID,
		TransactionID:     transactionID,
		TransactionStatus: "settlement",
		StatusCode:        statusCode,
		GrossAmount:       grossAmount,
		SignatureKey:      hash,
		PaymentType:       "credit_card",
	}

	result, err := service.ProcessWebhook(webhook)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, models.PaymentStatusPaid, result.PaymentStatus)
	mockRepo.AssertCalled(t, "UpdatePaymentStatus", order.ID, models.PaymentStatusPaid, transactionID)
	mockRepo.AssertCalled(t, "UpdateStatus", order.ID, models.OrderStatusPaymentConfirmed, mock.MatchedBy(func(s string) bool {
		return s != ""
	}), mock.Anything)
}

func TestWebhookPaymentDeny_Success(t *testing.T) {
	mockRepo := new(MockOrderRepository)
	serverKey := "test-server-key-12345"
	service := services.NewPaymentWebhookService(mockRepo, serverKey)

	orderID := "ORD-20260415-abc12345"
	statusCode := "200"
	grossAmount := "100000.00"
	transactionID := "12345-1234567890-denial"

	signatureString := orderID + statusCode + grossAmount + serverKey
	hash := services.SHA512Hash(signatureString)

	order := createTestOrder(orderID, "", models.PaymentStatusUnpaid)
	mockRepo.On("GetByOrderNumber", orderID).Return(order, nil)
	mockRepo.On("UpdatePaymentStatus", order.ID, models.PaymentStatusRefunded, transactionID).Return(nil)
	mockRepo.On("UpdateStatus", order.ID, models.OrderStatusCancelled, mock.MatchedBy(func(s string) bool {
		return s != ""
	}), mock.Anything).Return(nil)

	webhook := &services.PaymentWebhookRequest{
		OrderID:           orderID,
		TransactionID:     transactionID,
		TransactionStatus: "deny",
		StatusCode:        statusCode,
		GrossAmount:       grossAmount,
		SignatureKey:      hash,
		PaymentType:       "credit_card",
	}

	result, err := service.ProcessWebhook(webhook)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, models.PaymentStatusRefunded, result.PaymentStatus)
	mockRepo.AssertCalled(t, "UpdateStatus", order.ID, models.OrderStatusCancelled, mock.MatchedBy(func(s string) bool {
		return s != ""
	}), mock.Anything)
}

func TestWebhookPaymentPending_NoOrderStatusChange(t *testing.T) {
	mockRepo := new(MockOrderRepository)
	serverKey := "test-server-key-12345"
	service := services.NewPaymentWebhookService(mockRepo, serverKey)

	orderID := "ORD-20260415-abc12345"
	statusCode := "200"
	grossAmount := "100000.00"
	transactionID := "12345-1234567890-pending"

	signatureString := orderID + statusCode + grossAmount + serverKey
	hash := services.SHA512Hash(signatureString)

	order := createTestOrder(orderID, "", models.PaymentStatusUnpaid)
	mockRepo.On("GetByOrderNumber", orderID).Return(order, nil)
	mockRepo.On("UpdatePaymentStatus", order.ID, models.PaymentStatusUnpaid, transactionID).Return(nil)

	webhook := &services.PaymentWebhookRequest{
		OrderID:           orderID,
		TransactionID:     transactionID,
		TransactionStatus: "pending",
		StatusCode:        statusCode,
		GrossAmount:       grossAmount,
		SignatureKey:      hash,
		PaymentType:       "transfer",
	}

	result, err := service.ProcessWebhook(webhook)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, models.PaymentStatusUnpaid, result.PaymentStatus)
	mockRepo.AssertNotCalled(t, "UpdateStatus")
}

func TestWebhookIdempotency_DuplicateTransaction(t *testing.T) {
	mockRepo := new(MockOrderRepository)
	serverKey := "test-server-key-12345"
	service := services.NewPaymentWebhookService(mockRepo, serverKey)

	orderID := "ORD-20260415-abc12345"
	statusCode := "200"
	grossAmount := "100000.00"
	transactionID := "12345-1234567890-123456"

	signatureString := orderID + statusCode + grossAmount + serverKey
	hash := services.SHA512Hash(signatureString)

	// Order already has this transaction ID and paid status
	order := createTestOrder(orderID, transactionID, models.PaymentStatusPaid)
	mockRepo.On("GetByOrderNumber", orderID).Return(order, nil)

	webhook := &services.PaymentWebhookRequest{
		OrderID:           orderID,
		TransactionID:     transactionID,
		TransactionStatus: "settlement",
		StatusCode:        statusCode,
		GrossAmount:       grossAmount,
		SignatureKey:      hash,
		PaymentType:       "credit_card",
	}

	result, err := service.ProcessWebhook(webhook)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, models.PaymentStatusPaid, result.PaymentStatus)
	assert.Equal(t, "Webhook already processed", result.Message)
	// Should not call update methods due to idempotency
	mockRepo.AssertNotCalled(t, "UpdatePaymentStatus")
	mockRepo.AssertNotCalled(t, "UpdateStatus")
}

func TestWebhookOrderNotFound(t *testing.T) {
	mockRepo := new(MockOrderRepository)
	serverKey := "test-server-key-12345"
	service := services.NewPaymentWebhookService(mockRepo, serverKey)

	orderID := "ORD-20260415-notfound"
	statusCode := "200"
	grossAmount := "100000.00"

	signatureString := orderID + statusCode + grossAmount + serverKey
	hash := services.SHA512Hash(signatureString)

	mockRepo.On("GetByOrderNumber", orderID).Return(nil, models.ErrOrderNotFound)

	webhook := &services.PaymentWebhookRequest{
		OrderID:           orderID,
		TransactionID:     "12345-1234567890-123456",
		TransactionStatus: "settlement",
		StatusCode:        statusCode,
		GrossAmount:       grossAmount,
		SignatureKey:      hash,
		PaymentType:       "credit_card",
	}

	result, err := service.ProcessWebhook(webhook)

	assert.Error(t, err)
	assert.Nil(t, result)
	mockRepo.AssertCalled(t, "GetByOrderNumber", orderID)
}

// HTTP Handler Tests
func TestWebhookHandler_ValidPayload(t *testing.T) {
	gin.SetMode(gin.TestMode)
	mockRepo := new(MockOrderRepository)
	serverKey := "test-server-key-12345"
	service := services.NewPaymentWebhookService(mockRepo, serverKey)
	handler := NewWebhookHandler(service)

	orderID := "ORD-20260415-abc12345"
	statusCode := "200"
	grossAmount := "100000.00"
	transactionID := "12345-1234567890-123456"

	signatureString := orderID + statusCode + grossAmount + serverKey
	hash := services.SHA512Hash(signatureString)

	order := createTestOrder(orderID, "", models.PaymentStatusUnpaid)
	mockRepo.On("GetByOrderNumber", orderID).Return(order, nil)
	mockRepo.On("UpdatePaymentStatus", order.ID, models.PaymentStatusPaid, transactionID).Return(nil)
	mockRepo.On("UpdateStatus", order.ID, models.OrderStatusPaymentConfirmed, mock.MatchedBy(func(s string) bool {
		return s != ""
	}), mock.Anything).Return(nil)

	webhook := services.PaymentWebhookRequest{
		OrderID:           orderID,
		TransactionID:     transactionID,
		TransactionStatus: "settlement",
		StatusCode:        statusCode,
		GrossAmount:       grossAmount,
		SignatureKey:      hash,
		PaymentType:       "credit_card",
	}

	body, err := json.Marshal(webhook)
	require.NoError(t, err)

	w := httptest.NewRecorder()
	req, err := http.NewRequest("POST", "/api/v1/webhooks/payment", bytes.NewBuffer(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	router := gin.New()
	router.POST("/api/v1/webhooks/payment", handler.HandlePaymentWebhook)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Equal(t, true, response["success"])
}

func TestWebhookHandler_InvalidSignature(t *testing.T) {
	gin.SetMode(gin.TestMode)
	mockRepo := new(MockOrderRepository)
	serverKey := "test-server-key-12345"
	service := services.NewPaymentWebhookService(mockRepo, serverKey)
	handler := NewWebhookHandler(service)

	webhook := services.PaymentWebhookRequest{
		OrderID:           "ORD-20260415-abc12345",
		TransactionID:     "12345-1234567890-123456",
		TransactionStatus: "settlement",
		StatusCode:        "200",
		GrossAmount:       "100000.00",
		SignatureKey:      "invalid-signature",
		PaymentType:       "credit_card",
	}

	body, err := json.Marshal(webhook)
	require.NoError(t, err)

	w := httptest.NewRecorder()
	req, err := http.NewRequest("POST", "/api/v1/webhooks/payment", bytes.NewBuffer(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	router := gin.New()
	router.POST("/api/v1/webhooks/payment", handler.HandlePaymentWebhook)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestWebhookHandler_MissingRequiredFields(t *testing.T) {
	gin.SetMode(gin.TestMode)
	mockRepo := new(MockOrderRepository)
	serverKey := "test-server-key-12345"
	service := services.NewPaymentWebhookService(mockRepo, serverKey)
	handler := NewWebhookHandler(service)

	webhook := services.PaymentWebhookRequest{
		OrderID:      "ORD-20260415-abc12345",
		StatusCode:   "200",
		GrossAmount:  "100000.00",
		SignatureKey: "some-signature",
		// Missing TransactionID and TransactionStatus
	}

	body, err := json.Marshal(webhook)
	require.NoError(t, err)

	w := httptest.NewRecorder()
	req, err := http.NewRequest("POST", "/api/v1/webhooks/payment", bytes.NewBuffer(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")

	router := gin.New()
	router.POST("/api/v1/webhooks/payment", handler.HandlePaymentWebhook)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestWebhookStatusMapping(t *testing.T) {
	tests := []struct {
		midtransStatus string
		expectedStatus string
	}{
		{"settlement", models.PaymentStatusPaid},
		{"capture", models.PaymentStatusPaid},
		{"deny", models.PaymentStatusRefunded},
		{"cancel", models.PaymentStatusRefunded},
		{"expire", models.PaymentStatusUnpaid},
		{"pending", models.PaymentStatusUnpaid},
		{"failure", models.PaymentStatusRefunded},
		{"unknown", models.PaymentStatusUnpaid},
	}

	for _, tt := range tests {
		t.Run(tt.midtransStatus, func(t *testing.T) {
			status := services.MapMidtransStatusForTest(tt.midtransStatus)
			assert.Equal(t, tt.expectedStatus, status)
		})
	}
}

