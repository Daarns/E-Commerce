package order

import (
	"testing"

	"ecommerce-backend/internal/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// TestOrderStatusWorkflowService_ValidStatusTransitions tests valid order status transitions
func TestOrderStatusWorkflowService_ValidStatusTransitions(t *testing.T) {
	tests := []struct {
		name      string
		from      string
		to        string
		isValid   bool
	}{
		{"Pending to PaymentConfirmed", models.OrderStatusPending, models.OrderStatusPaymentConfirmed, true},
		{"Pending to Processing", models.OrderStatusPending, models.OrderStatusProcessing, false},
		{"Pending to Shipped", models.OrderStatusPending, models.OrderStatusShipped, false},
		{"PaymentConfirmed to Processing", models.OrderStatusPaymentConfirmed, models.OrderStatusProcessing, true},
		{"PaymentConfirmed to Shipped", models.OrderStatusPaymentConfirmed, models.OrderStatusShipped, false},
		{"Processing to Shipped", models.OrderStatusProcessing, models.OrderStatusShipped, true},
		{"Shipped to Delivered", models.OrderStatusShipped, models.OrderStatusDelivered, true},
		{"Delivered to Refunded", models.OrderStatusDelivered, models.OrderStatusRefunded, true},
		{"Cancelled to Refunded", models.OrderStatusCancelled, models.OrderStatusRefunded, true},
		{"Delivered to Shipped", models.OrderStatusDelivered, models.OrderStatusShipped, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isValidStatusTransition(tt.from, tt.to)
			assert.Equal(t, tt.isValid, result, "Status transition validation mismatch")
		})
	}
}

// TestOrderStatusWorkflowModel_ShouldTriggerEmail tests email trigger logic
func TestOrderStatusWorkflowModel_ShouldTriggerEmail(t *testing.T) {
	tests := []struct {
		status     string
		shouldSend bool
	}{
		{models.OrderStatusPaymentConfirmed, true},
		{models.OrderStatusProcessing, true},
		{models.OrderStatusShipped, true},
		{models.OrderStatusDelivered, true},
		{models.OrderStatusCancelled, true},
		{models.OrderStatusRefunded, true},
		{models.OrderStatusPending, false},
	}

	for _, tt := range tests {
		t.Run(tt.status, func(t *testing.T) {
			workflow := &models.OrderStatusWorkflow{
				ToStatus: tt.status,
			}
			assert.Equal(t, tt.shouldSend, workflow.ShouldTriggerEmail())
		})
	}
}

// TestOrderStatusWorkflowModel_GetEmailType tests email type mapping
func TestOrderStatusWorkflowModel_GetEmailType(t *testing.T) {
	tests := []struct {
		status    string
		emailType string
	}{
		{models.OrderStatusPaymentConfirmed, models.EmailTypePaymentConfirmed},
		{models.OrderStatusProcessing, models.EmailTypeOrderProcessing},
		{models.OrderStatusShipped, models.EmailTypeOrderShipped},
		{models.OrderStatusDelivered, models.EmailTypeOrderDelivered},
		{models.OrderStatusCancelled, models.EmailTypeOrderCancelled},
		{models.OrderStatusRefunded, models.EmailTypeOrderRefunded},
	}

	for _, tt := range tests {
		t.Run(tt.status, func(t *testing.T) {
			workflow := &models.OrderStatusWorkflow{
				ToStatus: tt.status,
			}
			assert.Equal(t, tt.emailType, workflow.GetEmailType())
		})
	}
}

// TestOrderStatusWorkflowModel_MarkEmailTriggered tests email trigger marking
func TestOrderStatusWorkflowModel_MarkEmailTriggered(t *testing.T) {
	workflow := &models.OrderStatusWorkflow{
		ID:       uuid.New(),
		ToStatus: models.OrderStatusShipped,
	}

	assert.False(t, workflow.EmailTriggered)
	assert.Nil(t, workflow.TriggeredAt)

	workflow.MarkEmailTriggered(models.EmailTypeOrderShipped)

	assert.True(t, workflow.EmailTriggered)
	assert.NotNil(t, workflow.TriggeredAt)
	assert.Equal(t, models.EmailTypeOrderShipped, *workflow.EmailType)
}

// TestOrderStatusWorkflowModel_IsEmailPending tests email pending status
func TestOrderStatusWorkflowModel_IsEmailPending(t *testing.T) {
	tests := []struct {
		name      string
		status    string
		triggered bool
		expected  bool
	}{
		{"Shipped, not triggered", models.OrderStatusShipped, false, true},
		{"Shipped, triggered", models.OrderStatusShipped, true, false},
		{"Pending, not triggered", models.OrderStatusPending, false, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			workflow := &models.OrderStatusWorkflow{
				ToStatus:       tt.status,
				EmailTriggered: tt.triggered,
			}
			assert.Equal(t, tt.expected, workflow.IsEmailPending())
		})
	}
}

// TestOrderStatusWorkflowRepository_Create tests workflow creation
func TestOrderStatusWorkflowRepository_Create(t *testing.T) {
	t.Skip("Skipping repository tests - requires full database setup")
}

// TestGetEmailSubject tests email subject generation
func TestGetEmailSubject(t *testing.T) {
	orderNumber := "ORD-20240415-12345678"
	order := &models.Order{
		OrderNumber:   orderNumber,
		TrackingNumber: "TRACK-123456",
	}

	tests := []struct {
		emailType string
		contains  string
	}{
		{models.EmailTypePaymentConfirmed, "Payment Confirmed"},
		{models.EmailTypeOrderProcessing, "Order Processing"},
		{models.EmailTypeOrderShipped, "Order Shipped"},
		{models.EmailTypeOrderDelivered, "Order Delivered"},
		{models.EmailTypeOrderCancelled, "Order Cancelled"},
		{models.EmailTypeOrderRefunded, "Refund Processed"},
	}

	for _, tt := range tests {
		t.Run(tt.emailType, func(t *testing.T) {
			subject := getEmailSubject(tt.emailType, order)
			assert.Contains(t, subject, tt.contains)
			assert.Contains(t, subject, orderNumber)
		})
	}
}

// TestOrderStatusWorkflowService_UpdateOrderStatus tests full status update flow
func TestOrderStatusWorkflowService_UpdateOrderStatus(t *testing.T) {
	// Skip this test as it requires full integration with order and email services
	t.Skip("Skipping integration test - requires full service setup")
}

// Helper functions for tests (used by email_queue_service_test.go)
// Note: setupTestDB is defined in email_queue_service_test.go to avoid conflicts

// TestOrderStatusWorkflowModel_BeforeCreate tests UUID generation
func TestOrderStatusWorkflowModel_BeforeCreate(t *testing.T) {
	workflow := &models.OrderStatusWorkflow{
		OrderID:  uuid.New(),
		ToStatus: models.OrderStatusShipped,
	}

	// Mock GORM's BeforeCreate
	mockTx := &gorm.DB{}
	err := workflow.BeforeCreate(mockTx)

	require.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, workflow.ID)
}

// Benchmark tests

// BenchmarkIsValidStatusTransition benchmarks status transition validation
func BenchmarkIsValidStatusTransition(b *testing.B) {
	for i := 0; i < b.N; i++ {
		isValidStatusTransition(models.OrderStatusPending, models.OrderStatusPaymentConfirmed)
	}
}

// BenchmarkGetEmailType benchmarks email type retrieval
func BenchmarkGetEmailType(b *testing.B) {
	workflow := &models.OrderStatusWorkflow{
		ToStatus: models.OrderStatusShipped,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		workflow.GetEmailType()
	}
}

