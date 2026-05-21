package email

import (
	"context"
	"testing"
	"time"

	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	// Create email_queues table
	err = db.AutoMigrate(&models.EmailQueue{})
	require.NoError(t, err)

	return db
}

func TestNewEmailQueueService(t *testing.T) {
	db := setupTestDB(t)
	queueRepo := repositories.NewEmailQueueRepository(db)

	config := EmailConfig{
		Host: "",
		Port: 587,
	}
	emailService, err := NewEmailService(config)
	require.NoError(t, err)

	workerConfig := EmailWorkerConfig{
		Enabled:          true,
		WorkerCount:      2,
		PollInterval:     30 * time.Second,
		MaxEmailsPerPoll: 10,
		MaxRetries:       5,
	}

	svc := NewEmailQueueService(queueRepo, emailService, workerConfig)
	assert.NotNil(t, svc)
	assert.Equal(t, 2, svc.workerConfig.WorkerCount)
}

func TestNewEmailQueueService_DefaultConfig(t *testing.T) {
	db := setupTestDB(t)
	queueRepo := repositories.NewEmailQueueRepository(db)

	config := EmailConfig{Host: ""}
	emailService, err := NewEmailService(config)
	require.NoError(t, err)

	// Empty config should get defaults
	workerConfig := EmailWorkerConfig{}
	svc := NewEmailQueueService(queueRepo, emailService, workerConfig)

	assert.Equal(t, 2, svc.workerConfig.WorkerCount)
	assert.Equal(t, 30*time.Second, svc.workerConfig.PollInterval)
	assert.Equal(t, 10, svc.workerConfig.MaxEmailsPerPoll)
	assert.Equal(t, 5, svc.workerConfig.MaxRetries)
}

func TestEnqueueEmail(t *testing.T) {
	db := setupTestDB(t)
	queueRepo := repositories.NewEmailQueueRepository(db)

	config := EmailConfig{Host: ""}
	emailService, err := NewEmailService(config)
	require.NoError(t, err)

	workerConfig := EmailWorkerConfig{Enabled: true}
	svc := NewEmailQueueService(queueRepo, emailService, workerConfig)

	email := &models.EmailQueue{
		EmailType:      models.EmailTypeOrderConfirmation,
		RecipientEmail: "test@example.com",
		RecipientName:  "Test User",
		Subject:        "Test Subject",
		HtmlBody:       "<p>Test</p>",
		Body:           "Test",
	}

	err = svc.EnqueueEmail(email)
	assert.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, email.ID)
	assert.Equal(t, models.EmailQueueStatusPending, email.Status)
}

func TestEnqueueOrderConfirmation(t *testing.T) {
	db := setupTestDB(t)
	queueRepo := repositories.NewEmailQueueRepository(db)

	config := EmailConfig{Host: ""}
	emailService, err := NewEmailService(config)
	require.NoError(t, err)

	workerConfig := EmailWorkerConfig{Enabled: true, MaxRetries: 3}
	svc := NewEmailQueueService(queueRepo, emailService, workerConfig)

	recipient := EmailRecipient{
		Email: "customer@example.com",
		Name:  "John Doe",
	}

	order := &models.Order{
		ID:          uuid.New(),
		OrderNumber: "ORD-001",
		Total:       decimal.NewFromInt(100000),
		OrderStatus: "pending",
		CreatedAt:   time.Now(),
	}

	err = svc.EnqueueOrderConfirmation(recipient, order)
	assert.NoError(t, err)

	// Verify email was enqueued
	emails, err := queueRepo.GetPendingEmails(10)
	assert.NoError(t, err)
	assert.Equal(t, 1, len(emails))
	assert.Equal(t, models.EmailTypeOrderConfirmation, emails[0].EmailType)
	assert.Equal(t, "customer@example.com", emails[0].RecipientEmail)
}

func TestEnqueuePaymentConfirmation(t *testing.T) {
	db := setupTestDB(t)
	queueRepo := repositories.NewEmailQueueRepository(db)

	config := EmailConfig{Host: ""}
	emailService, err := NewEmailService(config)
	require.NoError(t, err)

	workerConfig := EmailWorkerConfig{Enabled: true}
	svc := NewEmailQueueService(queueRepo, emailService, workerConfig)

	recipient := EmailRecipient{
		Email: "customer@example.com",
		Name:  "Jane Doe",
	}

	order := &models.Order{
		ID:            uuid.New(),
		OrderNumber:   "ORD-002",
		Total:         decimal.NewFromInt(200000),
		PaymentStatus: "paid",
		CreatedAt:     time.Now(),
	}

	err = svc.EnqueuePaymentConfirmation(recipient, order)
	assert.NoError(t, err)

	emails, err := queueRepo.GetPendingEmails(10)
	assert.NoError(t, err)
	assert.Equal(t, 1, len(emails))
	assert.Equal(t, models.EmailTypePaymentConfirmation, emails[0].EmailType)
}

func TestEnqueueOrderStatusUpdate(t *testing.T) {
	db := setupTestDB(t)
	queueRepo := repositories.NewEmailQueueRepository(db)

	config := EmailConfig{Host: ""}
	emailService, err := NewEmailService(config)
	require.NoError(t, err)

	workerConfig := EmailWorkerConfig{Enabled: true}
	svc := NewEmailQueueService(queueRepo, emailService, workerConfig)

	recipient := EmailRecipient{
		Email: "customer@example.com",
		Name:  "John Doe",
	}

	order := &models.Order{
		ID:          uuid.New(),
		OrderNumber: "ORD-003",
		Total:       decimal.NewFromInt(150000),
		OrderStatus: "shipped",
		CreatedAt:   time.Now(),
	}

	err = svc.EnqueueOrderStatusUpdate(recipient, order, "shipped")
	assert.NoError(t, err)

	emails, err := queueRepo.GetPendingEmails(10)
	assert.NoError(t, err)
	assert.Equal(t, 1, len(emails))
	assert.Equal(t, models.EmailTypeOrderStatusUpdate, emails[0].EmailType)
	assert.Contains(t, emails[0].Subject, "ORD-003")
}

func TestProcessEmail_Success(t *testing.T) {
	db := setupTestDB(t)
	queueRepo := repositories.NewEmailQueueRepository(db)

	config := EmailConfig{Host: ""} // Dev mode
	emailService, err := NewEmailService(config)
	require.NoError(t, err)

	workerConfig := EmailWorkerConfig{Enabled: true}
	svc := NewEmailQueueService(queueRepo, emailService, workerConfig)

	// Enqueue email
	email := &models.EmailQueue{
		ID:             uuid.New(),
		EmailType:      models.EmailTypeOrderConfirmation,
		Status:         models.EmailQueueStatusPending,
		RecipientEmail: "test@example.com",
		RecipientName:  "Test User",
		Subject:        "Test",
		HtmlBody:       "<p>Test</p>",
		Body:           "Test",
		MaxAttempts:    5,
	}
	err = queueRepo.Create(email)
	require.NoError(t, err)

	// Process email
	svc.processEmail(email)

	// Verify marked as sent
	sent, err := queueRepo.GetByID(email.ID)
	require.NoError(t, err)
	assert.Equal(t, models.EmailQueueStatusSent, sent.Status)
	assert.NotNil(t, sent.SentAt)
}

func TestGetPendingEmails(t *testing.T) {
	db := setupTestDB(t)
	queueRepo := repositories.NewEmailQueueRepository(db)

	config := EmailConfig{Host: ""}
	emailService, err := NewEmailService(config)
	require.NoError(t, err)

	workerConfig := EmailWorkerConfig{Enabled: true}
	_ = NewEmailQueueService(queueRepo, emailService, workerConfig)

	// Enqueue 3 emails
	for i := 0; i < 3; i++ {
		email := &models.EmailQueue{
			ID:             uuid.New(),
			EmailType:      models.EmailTypeOrderConfirmation,
			Status:         models.EmailQueueStatusPending,
			RecipientEmail: "test@example.com",
			RecipientName:  "Test User",
			Subject:        "Test",
			HtmlBody:       "<p>Test</p>",
			Body:           "Test",
		}
		err = queueRepo.Create(email)
		require.NoError(t, err)
	}

	// Get pending emails
	emails, err := queueRepo.GetPendingEmails(10)
	assert.NoError(t, err)
	assert.Equal(t, 3, len(emails))
}

func TestMarkAsSent(t *testing.T) {
	db := setupTestDB(t)
	queueRepo := repositories.NewEmailQueueRepository(db)

	email := &models.EmailQueue{
		ID:             uuid.New(),
		EmailType:      models.EmailTypeOrderConfirmation,
		Status:         models.EmailQueueStatusPending,
		RecipientEmail: "test@example.com",
		RecipientName:  "Test",
		Subject:        "Test",
		HtmlBody:       "<p>Test</p>",
		Body:           "Test",
	}
	err := queueRepo.Create(email)
	require.NoError(t, err)

	// Mark as sent
	err = queueRepo.MarkAsSent(email.ID)
	assert.NoError(t, err)

	// Verify
	sent, err := queueRepo.GetByID(email.ID)
	require.NoError(t, err)
	assert.Equal(t, models.EmailQueueStatusSent, sent.Status)
	assert.NotNil(t, sent.SentAt)
}

func TestMarkAsFailed(t *testing.T) {
	db := setupTestDB(t)
	queueRepo := repositories.NewEmailQueueRepository(db)

	email := &models.EmailQueue{
		ID:             uuid.New(),
		EmailType:      models.EmailTypeOrderConfirmation,
		Status:         models.EmailQueueStatusPending,
		RecipientEmail: "test@example.com",
		RecipientName:  "Test",
		Subject:        "Test",
		HtmlBody:       "<p>Test</p>",
		Body:           "Test",
		MaxAttempts:    5,
	}
	err := queueRepo.Create(email)
	require.NoError(t, err)

	// Mark as failed
	errorMsg := "SMTP connection timeout"
	err = queueRepo.MarkAsFailed(email.ID, errorMsg, 1)
	assert.NoError(t, err)

	// Verify
	failed, err := queueRepo.GetByID(email.ID)
	require.NoError(t, err)
	assert.Equal(t, models.EmailQueueStatusFailed, failed.Status)
	assert.Equal(t, errorMsg, failed.LastError)
	assert.Equal(t, 1, failed.AttemptCount)
	assert.NotNil(t, failed.NextRetry)
}

func TestRetryLogic_ExponentialBackoff(t *testing.T) {
	db := setupTestDB(t)
	queueRepo := repositories.NewEmailQueueRepository(db)

	email := &models.EmailQueue{
		ID:             uuid.New(),
		EmailType:      models.EmailTypeOrderConfirmation,
		Status:         models.EmailQueueStatusPending,
		RecipientEmail: "test@example.com",
		RecipientName:  "Test",
		Subject:        "Test",
		HtmlBody:       "<p>Test</p>",
		Body:           "Test",
		MaxAttempts:    5,
	}
	err := queueRepo.Create(email)
	require.NoError(t, err)

	// Test exponential backoff delays
	testCases := []struct {
		attempt          int
		expectedMinDelay time.Duration
	}{
		{0, 5 * time.Minute},
		{1, 15 * time.Minute},
		{2, 30 * time.Minute},
		{3, 60 * time.Minute},
		{4, 120 * time.Minute},
	}

	for _, tc := range testCases {
		before := time.Now()
		queueRepo.MarkAsFailed(email.ID, "test error", tc.attempt)
		after := time.Now()

		failed, err := queueRepo.GetByID(email.ID)
		require.NoError(t, err)

		if failed.NextRetry != nil {
			expectedTime := before.Add(tc.expectedMinDelay)
			assert.True(t, failed.NextRetry.After(expectedTime.Add(-time.Second)))
			assert.True(t, failed.NextRetry.Before(after.Add(tc.expectedMinDelay + time.Second)))
		}
	}
}

func TestCanRetry(t *testing.T) {
	email := &models.EmailQueue{
		ID:          uuid.New(),
		Status:      models.EmailQueueStatusFailed,
		AttemptCount: 2,
		MaxAttempts: 5,
		NextRetry:   nil,
	}

	assert.True(t, email.CanRetry())

	// Test max retries exceeded
	email.AttemptCount = 5
	assert.False(t, email.CanRetry())

	// Test pending status cannot retry
	email.Status = models.EmailQueueStatusPending
	email.AttemptCount = 2
	assert.False(t, email.CanRetry())
}

func TestIsReadyToProcess(t *testing.T) {
	email := &models.EmailQueue{
		Status:    models.EmailQueueStatusPending,
		NextRetry: nil,
	}

	assert.True(t, email.IsReadyToProcess())

	// Test with future retry time
	futureTime := time.Now().Add(1 * time.Hour)
	email.NextRetry = &futureTime
	assert.False(t, email.IsReadyToProcess())

	// Test sent email not ready
	email.Status = models.EmailQueueStatusSent
	email.NextRetry = nil
	assert.False(t, email.IsReadyToProcess())
}

func TestGetStats(t *testing.T) {
	db := setupTestDB(t)
	queueRepo := repositories.NewEmailQueueRepository(db)

	config := EmailConfig{Host: ""}
	emailService, err := NewEmailService(config)
	require.NoError(t, err)

	workerConfig := EmailWorkerConfig{Enabled: true}
	svc := NewEmailQueueService(queueRepo, emailService, workerConfig)

	// Create various emails
	for i := 0; i < 3; i++ {
		email := &models.EmailQueue{
			ID:             uuid.New(),
			EmailType:      models.EmailTypeOrderConfirmation,
			Status:         models.EmailQueueStatusPending,
			RecipientEmail: "test@example.com",
			RecipientName:  "Test",
			Subject:        "Test",
			HtmlBody:       "<p>Test</p>",
			Body:           "Test",
		}
		queueRepo.Create(email)
	}

	stats, err := svc.GetStats()
	assert.NoError(t, err)
	assert.Equal(t, 3, stats[models.EmailQueueStatusPending])
}

func TestGetQueueStatus(t *testing.T) {
	db := setupTestDB(t)
	queueRepo := repositories.NewEmailQueueRepository(db)

	config := EmailConfig{Host: ""}
	emailService, err := NewEmailService(config)
	require.NoError(t, err)

	workerConfig := EmailWorkerConfig{
		Enabled:         true,
		WorkerCount:     4,
		PollInterval:    60 * time.Second,
		MaxRetries:      3,
	}
	svc := NewEmailQueueService(queueRepo, emailService, workerConfig)

	status, err := svc.GetQueueStatus()
	assert.NoError(t, err)
	assert.NotNil(t, status)
	assert.Contains(t, status, "config")
	assert.Contains(t, status, "stats")
}

func TestStartWorker_Disabled(t *testing.T) {
	db := setupTestDB(t)
	queueRepo := repositories.NewEmailQueueRepository(db)

	config := EmailConfig{Host: ""}
	emailService, err := NewEmailService(config)
	require.NoError(t, err)

	workerConfig := EmailWorkerConfig{Enabled: false}
	svc := NewEmailQueueService(queueRepo, emailService, workerConfig)

	ctx := context.Background()
	svc.StartWorker(ctx) // Should not crash even if disabled

	assert.NotNil(t, svc)
}

func TestMultipleEmailTypes(t *testing.T) {
	db := setupTestDB(t)
	queueRepo := repositories.NewEmailQueueRepository(db)

	config := EmailConfig{Host: ""}
	emailService, err := NewEmailService(config)
	require.NoError(t, err)

	workerConfig := EmailWorkerConfig{Enabled: true}
	svc := NewEmailQueueService(queueRepo, emailService, workerConfig)

	order := &models.Order{
		ID:          uuid.New(),
		OrderNumber: "ORD-MULTI",
		Total:       decimal.NewFromInt(500000),
		OrderStatus: "pending",
		CreatedAt:   time.Now(),
	}

	recipient := EmailRecipient{
		Email: "test@example.com",
		Name:  "Test User",
	}

	// Queue multiple emails
	svc.EnqueueOrderConfirmation(recipient, order)
	svc.EnqueuePaymentConfirmation(recipient, order)
	svc.EnqueueOrderStatusUpdate(recipient, order, "shipped")

	// Verify all queued
	emails, err := queueRepo.GetPendingEmails(100)
	assert.NoError(t, err)
	assert.Equal(t, 3, len(emails))
}

