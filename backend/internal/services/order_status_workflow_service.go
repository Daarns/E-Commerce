package services

import (
	"context"
	"errors"
	"fmt"

	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// OrderStatusWorkflowService handles order status transitions and email notifications
type OrderStatusWorkflowService struct {
	workflowRepo *repositories.OrderStatusWorkflowRepository
	orderRepo    *repositories.OrderRepository
	emailQueue   *EmailQueueService
	db           *gorm.DB
}

// NewOrderStatusWorkflowService creates a new service
func NewOrderStatusWorkflowService(
	workflowRepo *repositories.OrderStatusWorkflowRepository,
	orderRepo *repositories.OrderRepository,
	emailQueue *EmailQueueService,
	db *gorm.DB,
) *OrderStatusWorkflowService {
	return &OrderStatusWorkflowService{
		workflowRepo: workflowRepo,
		orderRepo:    orderRepo,
		emailQueue:   emailQueue,
		db:           db,
	}
}

// UpdateOrderStatus transitions an order to a new status and queues email notification
func (s *OrderStatusWorkflowService) UpdateOrderStatus(ctx context.Context, orderID uuid.UUID, newStatus string, reason string) error {
	// Validate order exists
	order, err := s.orderRepo.GetByID(orderID)
	if err != nil {
		return fmt.Errorf("failed to fetch order: %w", err)
	}
	if order == nil {
		return errors.New("order not found")
	}

	// Validate status transition
	if !isValidStatusTransition(order.OrderStatus, newStatus) {
		return fmt.Errorf("invalid status transition from %s to %s", order.OrderStatus, newStatus)
	}

	// Create workflow record
	workflow := &models.OrderStatusWorkflow{
		OrderID:    orderID,
		FromStatus: &order.OrderStatus,
		ToStatus:   newStatus,
		Notes:      reason,
	}

	// Save workflow to database
	if err := s.workflowRepo.Create(ctx, workflow); err != nil {
		return fmt.Errorf("failed to create workflow: %w", err)
	}

	// Update order status
	if err := s.orderRepo.UpdateStatus(orderID, newStatus, reason, nil); err != nil {
		return fmt.Errorf("failed to update order status: %w", err)
	}

	// Queue email notification if applicable
	if workflow.ShouldTriggerEmail() {
		if err := s.queueStatusEmail(ctx, order, workflow); err != nil {
			fmt.Printf("[ORDER WORKFLOW] Failed to queue email: %v\n", err)
		}
	}

	return nil
}

// queueStatusEmail queues an email for order status change
func (s *OrderStatusWorkflowService) queueStatusEmail(ctx context.Context, order *models.Order, workflow *models.OrderStatusWorkflow) error {
	emailType := workflow.GetEmailType()

	// Prepare email data
	emailData := models.EmailQueueData{
		"order_number":      order.OrderNumber,
		"customer_email":    order.User.Email,
		"customer_name":     order.User.Name,
		"order_total":       order.Total.String(),
		"status":            workflow.ToStatus,
		"tracking_number":   order.TrackingNumber,
		"shipping_address":  order.GetShippingAddress(),
		"reason":            workflow.Notes,
	}

	// Create email queue record
	queuedEmail := &models.EmailQueue{
		EmailType:      emailType,
		RecipientEmail: order.User.Email,
		RecipientName:  order.User.Name,
		Subject:        getEmailSubject(emailType, order),
		Data:           emailData,
		OrderID:        &order.ID,
		UserID:         &order.UserID,
		Status:         models.EmailQueueStatusPending,
	}

	if err := s.emailQueue.EnqueueEmail(queuedEmail); err != nil {
		return fmt.Errorf("failed to queue email: %w", err)
	}

	// Mark workflow as email triggered
	workflow.MarkEmailTriggered(emailType)
	if err := s.workflowRepo.Update(ctx, workflow); err != nil {
		return fmt.Errorf("failed to update workflow: %w", err)
	}

	return nil
}

// GetOrderStatusHistory retrieves all status changes for an order
func (s *OrderStatusWorkflowService) GetOrderStatusHistory(ctx context.Context, orderID uuid.UUID) ([]models.OrderStatusWorkflow, error) {
	return s.workflowRepo.GetByOrderID(ctx, orderID)
}

// GetWorkflowStats returns statistics about workflows
func (s *OrderStatusWorkflowService) GetWorkflowStats(ctx context.Context) (map[string]interface{}, error) {
	return s.workflowRepo.GetWorkflowStats(ctx)
}

// Helper functions

// isValidStatusTransition checks if a status transition is allowed
func isValidStatusTransition(fromStatus, toStatus string) bool {
	// Define valid transitions
	validTransitions := map[string][]string{
		models.OrderStatusPending: {
			models.OrderStatusPaymentConfirmed,
			models.OrderStatusCancelled,
		},
		models.OrderStatusPaymentConfirmed: {
			models.OrderStatusProcessing,
			models.OrderStatusCancelled,
		},
		models.OrderStatusProcessing: {
			models.OrderStatusShipped,
			models.OrderStatusCancelled,
		},
		models.OrderStatusShipped: {
			models.OrderStatusDelivered,
			models.OrderStatusCancelled,
		},
		models.OrderStatusDelivered: {
			models.OrderStatusRefunded,
		},
		models.OrderStatusCancelled: {
			models.OrderStatusRefunded,
		},
	}

	allowed := validTransitions[fromStatus]
	for _, status := range allowed {
		if status == toStatus {
			return true
		}
	}
	return false
}

// getEmailSubject returns appropriate email subject based on status
func getEmailSubject(emailType string, order *models.Order) string {
	subjectMap := map[string]string{
		models.EmailTypePaymentConfirmed: fmt.Sprintf("Payment Confirmed - Order %s", order.OrderNumber),
		models.EmailTypeOrderProcessing:  fmt.Sprintf("Order Processing - %s", order.OrderNumber),
		models.EmailTypeOrderShipped:     fmt.Sprintf("Order Shipped - %s (Tracking: %s)", order.OrderNumber, order.TrackingNumber),
		models.EmailTypeOrderDelivered:   fmt.Sprintf("Order Delivered - %s", order.OrderNumber),
		models.EmailTypeOrderCancelled:   fmt.Sprintf("Order Cancelled - %s", order.OrderNumber),
		models.EmailTypeOrderRefunded:    fmt.Sprintf("Refund Processed - %s", order.OrderNumber),
	}

	if subject, ok := subjectMap[emailType]; ok {
		return subject
	}
	return fmt.Sprintf("Order Update - %s", order.OrderNumber)
}
