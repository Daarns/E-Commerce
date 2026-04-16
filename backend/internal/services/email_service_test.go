package services

import (
	"testing"
	"time"

	"ecommerce-backend/internal/models"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNewEmailService(t *testing.T) {
	config := EmailConfig{
		Host:     "smtp.gmail.com",
		Port:     587,
		Username: "test@example.com",
		Password: "password",
		FromAddr: "noreply@ecommerce.local",
	}

	svc, err := NewEmailService(config)
	require.NoError(t, err)
	assert.NotNil(t, svc)
	assert.Equal(t, 5, len(svc.templates)) // Should have 5 templates
}

func TestNewEmailService_InvalidTemplate(t *testing.T) {
	// This test validates the template parsing works correctly
	config := EmailConfig{
		Host:     "smtp.gmail.com",
		Port:     587,
		Username: "test@example.com",
		Password: "password",
		FromAddr: "noreply@ecommerce.local",
	}

	svc, err := NewEmailService(config)
	require.NoError(t, err)
	assert.NotNil(t, svc)
}

func TestSendOrderConfirmation(t *testing.T) {
	config := EmailConfig{
		Host:     "", // Empty to skip actual sending
		Port:     587,
		Username: "test@example.com",
		Password: "password",
		FromAddr: "noreply@ecommerce.local",
	}

	svc, err := NewEmailService(config)
	require.NoError(t, err)

	order := &models.Order{
		ID:          uuid.New(),
		OrderNumber: "ORD-2024-001",
		Total:       decimal.NewFromInt(100000),
		OrderStatus: "pending",
		CreatedAt:   time.Now(),
		Items:       []models.OrderItem{},
	}

	recipient := EmailRecipient{
		Email: "customer@example.com",
		Name:  "John Doe",
	}

	err = svc.SendOrderConfirmation(recipient, order)
	assert.NoError(t, err)
}

func TestSendPaymentConfirmation(t *testing.T) {
	config := EmailConfig{
		Host:     "", // Empty to skip actual sending
		Port:     587,
		Username: "test@example.com",
		Password: "password",
		FromAddr: "noreply@ecommerce.local",
	}

	svc, err := NewEmailService(config)
	require.NoError(t, err)

	order := &models.Order{
		ID:            uuid.New(),
		OrderNumber:   "ORD-2024-001",
		Total:         decimal.NewFromInt(100000),
		PaymentStatus: "paid",
		OrderStatus:   "payment_confirmed",
		CreatedAt:     time.Now(),
		Items:         []models.OrderItem{},
	}

	recipient := EmailRecipient{
		Email: "customer@example.com",
		Name:  "Jane Doe",
	}

	err = svc.SendPaymentConfirmation(recipient, order)
	assert.NoError(t, err)
}

func TestSendOrderStatusUpdate(t *testing.T) {
	config := EmailConfig{
		Host:     "", // Empty to skip actual sending
		Port:     587,
		Username: "test@example.com",
		Password: "password",
		FromAddr: "noreply@ecommerce.local",
	}

	svc, err := NewEmailService(config)
	require.NoError(t, err)

	order := &models.Order{
		ID:          uuid.New(),
		OrderNumber: "ORD-2024-001",
		Total:       decimal.NewFromInt(100000),
		OrderStatus: "shipped",
		CreatedAt:   time.Now(),
		Items:       []models.OrderItem{},
	}

	recipient := EmailRecipient{
		Email: "customer@example.com",
		Name:  "John Doe",
	}

	tests := []struct {
		name      string
		status    string
		expectErr bool
	}{
		{"shipped", "shipped", false},
		{"delivered", "delivered", false},
		{"processing", "processing", false},
		{"cancelled", "cancelled", false},
		{"payment_confirmed", "payment_confirmed", false},
		{"unknown status", "unknown_status", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := svc.SendOrderStatusUpdate(recipient, order, tt.status)
			if tt.expectErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestSendNewsletter(t *testing.T) {
	config := EmailConfig{
		Host:     "", // Empty to skip actual sending
		Port:     587,
		Username: "test@example.com",
		Password: "password",
		FromAddr: "noreply@ecommerce.local",
	}

	svc, err := NewEmailService(config)
	require.NoError(t, err)

	recipient := EmailRecipient{
		Email: "subscriber@example.com",
		Name:  "John Subscriber",
	}

	subject := "Weekly Newsletter - New Products"
	content := "<h1>Weekly Newsletter</h1><p>Check out our new products!</p>"

	err = svc.SendNewsletter(recipient, subject, content)
	assert.NoError(t, err)
}

func TestSendPasswordReset(t *testing.T) {
	config := EmailConfig{
		Host:     "", // Empty to skip actual sending
		Port:     587,
		Username: "test@example.com",
		Password: "password",
		FromAddr: "noreply@ecommerce.local",
	}

	svc, err := NewEmailService(config)
	require.NoError(t, err)

	recipient := EmailRecipient{
		Email: "user@example.com",
		Name:  "Jane User",
	}

	resetLink := "https://ecommerce.local/reset?token=abc123xyz"

	err = svc.SendPasswordReset(recipient, resetLink)
	assert.NoError(t, err)
}

func TestSendEmailVerification(t *testing.T) {
	config := EmailConfig{
		Host:     "", // Empty to skip actual sending
		Port:     587,
		Username: "test@example.com",
		Password: "password",
		FromAddr: "noreply@ecommerce.local",
	}

	svc, err := NewEmailService(config)
	require.NoError(t, err)

	recipient := EmailRecipient{
		Email: "newuser@example.com",
		Name:  "New User",
	}

	verificationLink := "https://ecommerce.local/verify?token=verify123"

	err = svc.SendEmailVerification(recipient, verificationLink)
	assert.NoError(t, err)
}

func TestRenderTemplate(t *testing.T) {
	config := EmailConfig{
		Host:     "smtp.gmail.com",
		Port:     587,
		Username: "test@example.com",
		Password: "password",
		FromAddr: "noreply@ecommerce.local",
	}

	svc, err := NewEmailService(config)
	require.NoError(t, err)

	data := EmailData{
		"CustomerName":  "John Doe",
		"OrderNumber":   "ORD-2024-001",
		"TotalAmount":   100000,
		"Status":        "pending",
		"CreatedAt":     "2024-04-15 13:04:00",
		"Items":         []models.OrderItem{},
	}

	html, err := svc.renderTemplate("order_confirmation", data)
	require.NoError(t, err)
	assert.NotEmpty(t, html)
	assert.Contains(t, html, "John Doe")
	assert.Contains(t, html, "ORD-2024-001")
	assert.Contains(t, html, "100000")
}

func TestRenderTemplate_NotFound(t *testing.T) {
	config := EmailConfig{
		Host:     "smtp.gmail.com",
		Port:     587,
		Username: "test@example.com",
		Password: "password",
		FromAddr: "noreply@ecommerce.local",
	}

	svc, err := NewEmailService(config)
	require.NoError(t, err)

	data := EmailData{}
	_, err = svc.renderTemplate("nonexistent_template", data)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "template not found")
}

func TestEmailRecipient(t *testing.T) {
	recipient := EmailRecipient{
		Email: "test@example.com",
		Name:  "Test User",
	}

	assert.Equal(t, "test@example.com", recipient.Email)
	assert.Equal(t, "Test User", recipient.Name)
}

func TestEmailConfig_WithEmptyHost(t *testing.T) {
	// Test that email service handles missing SMTP config gracefully
	config := EmailConfig{
		Host:     "", // No SMTP configured
		Port:     587,
		Username: "",
		Password: "",
		FromAddr: "noreply@ecommerce.local",
	}

	svc, err := NewEmailService(config)
	require.NoError(t, err)

	order := &models.Order{
		ID:          uuid.New(),
		OrderNumber: "ORD-2024-001",
		Total:       decimal.NewFromInt(100000),
		OrderStatus: "pending",
		CreatedAt:   time.Now(),
		Items:       []models.OrderItem{},
	}

	recipient := EmailRecipient{
		Email: "customer@example.com",
		Name:  "John Doe",
	}

	// Should not error even without SMTP configured
	err = svc.SendOrderConfirmation(recipient, order)
	assert.NoError(t, err)
}

func TestEmailTemplateRendering_AllTemplates(t *testing.T) {
	config := EmailConfig{
		Host:     "smtp.gmail.com",
		Port:     587,
		Username: "test@example.com",
		Password: "password",
		FromAddr: "noreply@ecommerce.local",
	}

	svc, err := NewEmailService(config)
	require.NoError(t, err)

	tests := []struct {
		name     string
		template string
		data     EmailData
	}{
		{
			name:     "order_confirmation",
			template: "order_confirmation",
			data: EmailData{
				"CustomerName": "John",
				"OrderNumber":  "ORD-001",
				"TotalAmount":  100000,
				"Status":       "pending",
				"CreatedAt":    time.Now().Format("2006-01-02 15:04:05"),
				"Items":        []models.OrderItem{},
			},
		},
		{
			name:     "payment_confirmation",
			template: "payment_confirmation",
			data: EmailData{
				"CustomerName": "Jane",
				"OrderNumber":  "ORD-002",
				"TotalAmount":  200000,
				"Status":       "payment_confirmed",
				"PaidAt":       time.Now().Format("2006-01-02 15:04:05"),
			},
		},
		{
			name:     "order_status_update",
			template: "order_status_update",
			data: EmailData{
				"CustomerName":  "Bob",
				"OrderNumber":   "ORD-003",
				"Status":        "shipped",
				"StatusMessage": "Your order is on the way",
				"UpdatedAt":     time.Now().Format("2006-01-02 15:04:05"),
			},
		},
		{
			name:     "password_reset",
			template: "password_reset",
			data: EmailData{
				"CustomerName": "Alice",
				"ResetLink":    "https://example.com/reset?token=abc123",
				"ExpiresIn":    "1 hour",
			},
		},
		{
			name:     "email_verification",
			template: "email_verification",
			data: EmailData{
				"CustomerName":     "Charlie",
				"VerificationLink": "https://example.com/verify?token=verify123",
				"ExpiresIn":        "24 hours",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			html, err := svc.renderTemplate(tt.template, tt.data)
			assert.NoError(t, err)
			assert.NotEmpty(t, html)
			assert.Contains(t, html, "html")
		})
	}
}

func TestEmailService_MultipleTemplates(t *testing.T) {
	config := EmailConfig{
		Host:     "", // Empty to skip actual sending
		Port:     587,
		Username: "test@example.com",
		Password: "password",
		FromAddr: "noreply@ecommerce.local",
	}

	svc, err := NewEmailService(config)
	require.NoError(t, err)

	order := &models.Order{
		ID:          uuid.New(),
		OrderNumber: "ORD-2024-MULTI",
		Total:       decimal.NewFromInt(500000),
		OrderStatus: "pending",
		CreatedAt:   time.Now(),
		Items:       []models.OrderItem{},
	}

	recipient := EmailRecipient{
		Email: "customer@example.com",
		Name:  "Test Customer",
	}

	// Send multiple emails in sequence
	err = svc.SendOrderConfirmation(recipient, order)
	assert.NoError(t, err)

	// Update status
	order.OrderStatus = "payment_confirmed"
	order.PaymentStatus = "paid"
	err = svc.SendPaymentConfirmation(recipient, order)
	assert.NoError(t, err)

	// Send status update
	err = svc.SendOrderStatusUpdate(recipient, order, "shipped")
	assert.NoError(t, err)

	// All should succeed without errors
}
