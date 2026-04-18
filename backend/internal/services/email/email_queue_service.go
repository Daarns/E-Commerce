package email

import (
	"context"
	"fmt"
	"time"

	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"

	"github.com/google/uuid"
)

// EmailQueueService manages async email processing with retry logic
type EmailQueueService struct {
	queueRepo       *repositories.EmailQueueRepository
	emailService    *EmailService
	workerConfig    EmailWorkerConfig
	stopChan        chan struct{}
	activateWorkers chan bool
}

// EmailWorkerConfig holds configuration for email worker
type EmailWorkerConfig struct {
	Enabled              bool          // Enable background worker
	WorkerCount          int           // Number of concurrent workers
	PollInterval         time.Duration // How often to check for pending emails
	MaxEmailsPerPoll     int           // Max emails to process in one poll
	MaxRetries           int           // Max retry attempts per email
	CleanupOlderThan     time.Duration // Delete sent emails older than this
	CleanupInterval      time.Duration // How often to run cleanup
}

// NewEmailQueueService creates a new email queue service
func NewEmailQueueService(
	queueRepo *repositories.EmailQueueRepository,
	emailService *EmailService,
	config EmailWorkerConfig,
) *EmailQueueService {
	// Set defaults if not configured
	if config.WorkerCount == 0 {
		config.WorkerCount = 2
	}
	if config.PollInterval == 0 {
		config.PollInterval = 30 * time.Second
	}
	if config.MaxEmailsPerPoll == 0 {
		config.MaxEmailsPerPoll = 10
	}
	if config.MaxRetries == 0 {
		config.MaxRetries = 5
	}
	if config.CleanupOlderThan == 0 {
		config.CleanupOlderThan = 30 * 24 * time.Hour // 30 days
	}
	if config.CleanupInterval == 0 {
		config.CleanupInterval = 24 * time.Hour
	}

	return &EmailQueueService{
		queueRepo:       queueRepo,
		emailService:    emailService,
		workerConfig:    config,
		stopChan:        make(chan struct{}),
		activateWorkers: make(chan bool, 1),
	}
}

// EnqueueEmail adds an email to the queue for async processing
func (s *EmailQueueService) EnqueueEmail(email *models.EmailQueue) error {
	if email.ID == uuid.Nil {
		email.ID = uuid.New()
	}
	if email.Status == "" {
		email.Status = models.EmailQueueStatusPending
	}
	if email.AttemptCount == 0 {
		email.AttemptCount = 0
	}
	if email.MaxAttempts == 0 {
		email.MaxAttempts = s.workerConfig.MaxRetries
	}
	email.CreatedAt = time.Now()
	email.UpdatedAt = time.Now()

	return s.queueRepo.Create(email)
}

// EnqueueOrderConfirmation enqueues an order confirmation email
func (s *EmailQueueService) EnqueueOrderConfirmation(recipient EmailRecipient, order *models.Order) error {
	email := &models.EmailQueue{
		ID:             uuid.New(),
		EmailType:      models.EmailTypeOrderConfirmation,
		Status:         models.EmailQueueStatusPending,
		RecipientEmail: recipient.Email,
		RecipientName:  recipient.Name,
		Subject:        "Order Confirmation - " + order.OrderNumber,
		Data: models.EmailQueueData{
			"OrderID":      order.ID,
			"OrderNumber":  order.OrderNumber,
			"CustomerName": recipient.Name,
			"TotalAmount":  order.Total,
			"Status":       order.OrderStatus,
			"CreatedAt":    order.CreatedAt.Format("2006-01-02 15:04:05"),
		},
		OrderID:    &order.ID,
		MaxAttempts: s.workerConfig.MaxRetries,
	}

	return s.EnqueueEmail(email)
}

// EnqueuePaymentConfirmation enqueues a payment confirmation email
func (s *EmailQueueService) EnqueuePaymentConfirmation(recipient EmailRecipient, order *models.Order) error {
	email := &models.EmailQueue{
		ID:             uuid.New(),
		EmailType:      models.EmailTypePaymentConfirmation,
		Status:         models.EmailQueueStatusPending,
		RecipientEmail: recipient.Email,
		RecipientName:  recipient.Name,
		Subject:        "Payment Confirmed - " + order.OrderNumber,
		Data: models.EmailQueueData{
			"OrderID":      order.ID,
			"OrderNumber":  order.OrderNumber,
			"CustomerName": recipient.Name,
			"TotalAmount":  order.Total,
			"Status":       order.PaymentStatus,
			"PaidAt":       time.Now().Format("2006-01-02 15:04:05"),
		},
		OrderID:     &order.ID,
		MaxAttempts: s.workerConfig.MaxRetries,
	}

	return s.EnqueueEmail(email)
}

// EnqueueOrderStatusUpdate enqueues an order status update email
func (s *EmailQueueService) EnqueueOrderStatusUpdate(recipient EmailRecipient, order *models.Order, newStatus string) error {
	statusMessages := map[string]string{
		"processing":        "Your order is being processed",
		"shipped":           "Your order has been shipped",
		"delivered":         "Your order has been delivered",
		"cancelled":         "Your order has been cancelled",
		"payment_confirmed": "Payment confirmed! Your order is confirmed",
	}

	statusMessage := statusMessages[newStatus]
	if statusMessage == "" {
		statusMessage = fmt.Sprintf("Status updated to: %s", newStatus)
	}

	email := &models.EmailQueue{
		ID:             uuid.New(),
		EmailType:      models.EmailTypeOrderStatusUpdate,
		Status:         models.EmailQueueStatusPending,
		RecipientEmail: recipient.Email,
		RecipientName:  recipient.Name,
		Subject:        "Order Status Update - " + order.OrderNumber,
		Data: models.EmailQueueData{
			"OrderID":       order.ID,
			"OrderNumber":   order.OrderNumber,
			"CustomerName":  recipient.Name,
			"Status":        newStatus,
			"StatusMessage": statusMessage,
			"UpdatedAt":     time.Now().Format("2006-01-02 15:04:05"),
		},
		OrderID:     &order.ID,
		MaxAttempts: s.workerConfig.MaxRetries,
	}

	return s.EnqueueEmail(email)
}

// StartWorker starts the background email processing worker
func (s *EmailQueueService) StartWorker(ctx context.Context) {
	if !s.workerConfig.Enabled {
		fmt.Println("[EMAIL QUEUE] Worker disabled in configuration")
		return
	}

	fmt.Printf("[EMAIL QUEUE] Starting %d email workers\n", s.workerConfig.WorkerCount)

	// Start worker goroutines
	for i := 0; i < s.workerConfig.WorkerCount; i++ {
		go s.workerLoop(ctx, i)
	}

	// Start cleanup goroutine
	go s.cleanupLoop(ctx)

	fmt.Println("[EMAIL QUEUE] Email workers started")
}

// StopWorker gracefully stops the background worker
func (s *EmailQueueService) StopWorker() {
	fmt.Println("[EMAIL QUEUE] Stopping email worker...")
	close(s.stopChan)
}

// workerLoop is the main processing loop for email workers
func (s *EmailQueueService) workerLoop(ctx context.Context, workerID int) {
	ticker := time.NewTicker(s.workerConfig.PollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-s.stopChan:
			fmt.Printf("[EMAIL QUEUE] Worker %d stopped\n", workerID)
			return
		case <-ctx.Done():
			fmt.Printf("[EMAIL QUEUE] Worker %d context cancelled\n", workerID)
			return
		case <-ticker.C:
			s.processPendingEmails()
		}
	}
}

// processPendingEmails retrieves and processes pending emails from queue
func (s *EmailQueueService) processPendingEmails() {
	// Get pending emails
	emails, err := s.queueRepo.GetPendingEmails(s.workerConfig.MaxEmailsPerPoll)
	if err != nil {
		fmt.Printf("[EMAIL QUEUE] Error getting pending emails: %v\n", err)
		return
	}

	if len(emails) == 0 {
		return
	}

	fmt.Printf("[EMAIL QUEUE] Processing %d pending emails\n", len(emails))

	for _, emailQueue := range emails {
		s.processEmail(emailQueue)
	}
}

// processEmail sends a single email from the queue
func (s *EmailQueueService) processEmail(emailQueue *models.EmailQueue) {
	recipient := EmailRecipient{
		Email: emailQueue.RecipientEmail,
		Name:  emailQueue.RecipientName,
	}

	// Send email
	err := s.emailService.SendEmail(recipient, emailQueue.Subject, emailQueue.HtmlBody)
	if err != nil {
		// Mark as failed with retry logic
		emailQueue.AttemptCount++
		if err := s.queueRepo.MarkAsFailed(emailQueue.ID, err.Error(), emailQueue.AttemptCount); err != nil {
			fmt.Printf("[EMAIL QUEUE] Error marking email as failed: %v\n", err)
		}
		fmt.Printf("[EMAIL QUEUE] Email %s failed (attempt %d/%d): %v\n",
			emailQueue.ID, emailQueue.AttemptCount, emailQueue.MaxAttempts, err)
		return
	}

	// Mark as sent
	if err := s.queueRepo.MarkAsSent(emailQueue.ID); err != nil {
		fmt.Printf("[EMAIL QUEUE] Error marking email as sent: %v\n", err)
		return
	}

	fmt.Printf("[EMAIL QUEUE] Email %s sent successfully to %s\n", emailQueue.ID, emailQueue.RecipientEmail)
}

// cleanupLoop periodically cleans up old sent emails
func (s *EmailQueueService) cleanupLoop(ctx context.Context) {
	ticker := time.NewTicker(s.workerConfig.CleanupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-s.stopChan:
			return
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := s.queueRepo.DeleteOlderThan(s.workerConfig.CleanupOlderThan); err != nil {
				fmt.Printf("[EMAIL QUEUE] Cleanup error: %v\n", err)
			} else {
				fmt.Println("[EMAIL QUEUE] Cleanup completed")
			}
		}
	}
}

// GetStats returns email queue statistics
func (s *EmailQueueService) GetStats() (map[string]int, error) {
	return s.queueRepo.GetStatsLast24Hours()
}

// GetQueueStatus returns detailed queue status
func (s *EmailQueueService) GetQueueStatus() (map[string]interface{}, error) {
	stats, err := s.GetStats()
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"stats": stats,
		"config": map[string]interface{}{
			"worker_count":       s.workerConfig.WorkerCount,
			"poll_interval":      s.workerConfig.PollInterval.String(),
			"max_retries":        s.workerConfig.MaxRetries,
			"cleanup_interval":   s.workerConfig.CleanupInterval.String(),
			"cleanup_older_than": s.workerConfig.CleanupOlderThan.String(),
		},
	}, nil
}

