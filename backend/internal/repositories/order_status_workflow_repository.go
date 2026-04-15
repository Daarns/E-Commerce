package repositories

import (
	"context"
	"errors"

	"ecommerce-backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// OrderStatusWorkflowRepository handles order status workflow database operations
type OrderStatusWorkflowRepository struct {
	db *gorm.DB
}

// NewOrderStatusWorkflowRepository creates a new repository
func NewOrderStatusWorkflowRepository(db *gorm.DB) *OrderStatusWorkflowRepository {
	return &OrderStatusWorkflowRepository{db: db}
}

// Create inserts a new order status workflow
func (r *OrderStatusWorkflowRepository) Create(ctx context.Context, workflow *models.OrderStatusWorkflow) error {
	return r.db.WithContext(ctx).Create(workflow).Error
}

// GetByID retrieves a workflow by ID
func (r *OrderStatusWorkflowRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.OrderStatusWorkflow, error) {
	var workflow models.OrderStatusWorkflow
	err := r.db.WithContext(ctx).First(&workflow, "id = ?", id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &workflow, nil
}

// GetByOrderID retrieves all workflows for an order
func (r *OrderStatusWorkflowRepository) GetByOrderID(ctx context.Context, orderID uuid.UUID) ([]models.OrderStatusWorkflow, error) {
	var workflows []models.OrderStatusWorkflow
	err := r.db.WithContext(ctx).
		Where("order_id = ?", orderID).
		Order("created_at DESC").
		Find(&workflows).Error
	return workflows, err
}

// GetLatestByOrderID retrieves the latest workflow for an order
func (r *OrderStatusWorkflowRepository) GetLatestByOrderID(ctx context.Context, orderID uuid.UUID) (*models.OrderStatusWorkflow, error) {
	var workflow models.OrderStatusWorkflow
	err := r.db.WithContext(ctx).
		Where("order_id = ?", orderID).
		Order("created_at DESC").
		First(&workflow).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &workflow, nil
}

// GetPendingEmailsCount counts workflows where email hasn't been triggered
func (r *OrderStatusWorkflowRepository) GetPendingEmailsCount(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.OrderStatusWorkflow{}).
		Where("email_triggered = false AND should_trigger_email = true").
		Count(&count).Error
	return count, err
}

// GetPendingEmails retrieves workflows that need email to be sent
func (r *OrderStatusWorkflowRepository) GetPendingEmails(ctx context.Context, limit int) ([]models.OrderStatusWorkflow, error) {
	var workflows []models.OrderStatusWorkflow
	err := r.db.WithContext(ctx).
		Where("email_triggered = false").
		Where("to_status IN (?, ?, ?, ?, ?, ?)",
			models.OrderStatusPaymentConfirmed,
			models.OrderStatusProcessing,
			models.OrderStatusShipped,
			models.OrderStatusDelivered,
			models.OrderStatusCancelled,
			models.OrderStatusRefunded,
		).
		Order("created_at ASC").
		Limit(limit).
		Find(&workflows).Error
	return workflows, err
}

// MarkEmailSent marks a workflow's email as sent
func (r *OrderStatusWorkflowRepository) MarkEmailSent(ctx context.Context, workflowID uuid.UUID, emailType string) error {
	return r.db.WithContext(ctx).
		Model(&models.OrderStatusWorkflow{}).
		Where("id = ?", workflowID).
		Updates(map[string]interface{}{
			"email_triggered": true,
			"email_type":      emailType,
			"triggered_at":    gorm.Expr("CURRENT_TIMESTAMP"),
		}).Error
}

// MarkEmailFailed marks a workflow's email as failed
func (r *OrderStatusWorkflowRepository) MarkEmailFailed(ctx context.Context, workflowID uuid.UUID, reason string) error {
	return r.db.WithContext(ctx).
		Model(&models.OrderStatusWorkflow{}).
		Where("id = ?", workflowID).
		Updates(map[string]interface{}{
			"notes": reason,
		}).Error
}

// Update updates a workflow
func (r *OrderStatusWorkflowRepository) Update(ctx context.Context, workflow *models.OrderStatusWorkflow) error {
	return r.db.WithContext(ctx).Save(workflow).Error
}

// DeleteByID deletes a workflow by ID
func (r *OrderStatusWorkflowRepository) DeleteByID(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.OrderStatusWorkflow{}, "id = ?", id).Error
}

// GetWorkflowStats returns statistics about workflows
func (r *OrderStatusWorkflowRepository) GetWorkflowStats(ctx context.Context) (map[string]interface{}, error) {
	var totalCount int64
	var emailTriggeredCount int64
	var emailPendingCount int64

	err := r.db.WithContext(ctx).
		Model(&models.OrderStatusWorkflow{}).
		Count(&totalCount).Error
	if err != nil {
		return nil, err
	}

	err = r.db.WithContext(ctx).
		Model(&models.OrderStatusWorkflow{}).
		Where("email_triggered = true").
		Count(&emailTriggeredCount).Error
	if err != nil {
		return nil, err
	}

	emailPendingCount = totalCount - emailTriggeredCount

	return map[string]interface{}{
		"total":          totalCount,
		"email_sent":     emailTriggeredCount,
		"email_pending":  emailPendingCount,
	}, nil
}
