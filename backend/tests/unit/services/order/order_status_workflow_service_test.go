package order_test

import (
	"testing"

	"ecommerce-backend/internal/models"

	"github.com/stretchr/testify/require"
)

func TestOrderStatusTransitions(t *testing.T) {
	tests := []struct {
		name string
		from string
		to   string
		want bool
	}{
		{"payment confirmed to processing", models.OrderStatusPaymentConfirmed, models.OrderStatusProcessing, true},
		{"processing to shipped", models.OrderStatusProcessing, models.OrderStatusShipped, true},
		{"shipped to delivered", models.OrderStatusShipped, models.OrderStatusDelivered, true},
		{"delivered to completed", models.OrderStatusDelivered, models.OrderStatusCompleted, true},
		{"completed to refund requested", models.OrderStatusCompleted, models.OrderStatusRefundRequested, true},
		{"payment confirmed cannot skip to shipped", models.OrderStatusPaymentConfirmed, models.OrderStatusShipped, false},
		{"processing cannot skip to delivered", models.OrderStatusProcessing, models.OrderStatusDelivered, false},
		{"delivered cannot return to shipped", models.OrderStatusDelivered, models.OrderStatusShipped, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.Equal(t, tt.want, models.IsValidOrderWorkflowTransition(tt.from, tt.to))
		})
	}
}

func TestWorkflowEmailTriggerOnlyForCustomerVisibleStatuses(t *testing.T) {
	shipped := &models.OrderStatusWorkflow{ToStatus: models.OrderStatusShipped}
	pending := &models.OrderStatusWorkflow{ToStatus: models.OrderStatusPending}

	require.True(t, shipped.ShouldTriggerEmail())
	require.Equal(t, models.EmailTypeOrderShipped, shipped.GetEmailType())
	require.False(t, pending.ShouldTriggerEmail())
}
