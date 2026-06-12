package webhook

import (
	"ecommerce-backend/internal/services/payment"
	"ecommerce-backend/pkg/response"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// WebhookHandler handles webhook requests
type WebhookHandler struct {
	webhookService *payment.PaymentWebhookService
}

// NewWebhookHandler creates a new webhook handler
func NewWebhookHandler(webhookService *payment.PaymentWebhookService) *WebhookHandler {
	return &WebhookHandler{
		webhookService: webhookService,
	}
}

// HandlePaymentWebhook handles POST /api/v1/webhooks/payment
// @Summary Handle payment webhook from Midtrans
// @Description Receive and process payment notifications from Midtrans
// @Tags Webhooks
// @Accept json
// @Produce json
// @Param payload body payment.PaymentWebhookRequest true "Webhook payload from Midtrans"
// @Success 200 {object} payment.PaymentWebhookResponse
// @Failure 400 {object} response.Response "Invalid request"
// @Failure 403 {object} response.Response "Invalid signature"
// @Failure 404 {object} response.Response "Order not found"
// @Failure 500 {object} response.Response "Internal server error"
// @Router /api/v1/webhooks/payment [post]
func (h *WebhookHandler) HandlePaymentWebhook(c *gin.Context) {
	start := time.Now()
	// Parse request body
	var webhook payment.PaymentWebhookRequest
	if err := c.ShouldBindJSON(&webhook); err != nil {
		log.Printf("[MidtransWebhook] invalid_request remote=%s path=%s error=%v", c.ClientIP(), c.FullPath(), err)
		response.Error(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request format")
		return
	}

	log.Printf(
		"[MidtransWebhook] received order_id=%s tx=%s status=%s status_code=%s payment_type=%s gross_amount=%s remote=%s",
		webhook.OrderID,
		maskWebhookTransactionID(webhook.TransactionID),
		webhook.TransactionStatus,
		webhook.StatusCode,
		webhook.PaymentType,
		webhook.GrossAmount,
		c.ClientIP(),
	)

	// Validate required fields
	if webhook.OrderID == "" || webhook.TransactionID == "" || webhook.TransactionStatus == "" {
		log.Printf("[MidtransWebhook] missing_fields order_id=%s tx=%s status=%s", webhook.OrderID, maskWebhookTransactionID(webhook.TransactionID), webhook.TransactionStatus)
		response.Error(c, http.StatusBadRequest, "MISSING_FIELDS", "Missing required fields")
		return
	}

	if webhook.StatusCode == "" || webhook.GrossAmount == "" || webhook.SignatureKey == "" {
		log.Printf("[MidtransWebhook] missing_signature_fields order_id=%s tx=%s status_code=%s gross_amount_present=%t signature_present=%t", webhook.OrderID, maskWebhookTransactionID(webhook.TransactionID), webhook.StatusCode, webhook.GrossAmount != "", webhook.SignatureKey != "")
		response.Error(c, http.StatusBadRequest, "MISSING_SIGNATURE", "Missing webhook signature fields")
		return
	}

	// Process webhook
	result, err := h.webhookService.ProcessWebhook(&webhook)
	if err != nil {
		errMsg := err.Error()

		// Determine HTTP status based on error type
		statusCode := http.StatusInternalServerError
		code := "INTERNAL_ERROR"

		if errMsg == "invalid webhook signature" {
			statusCode = http.StatusForbidden
			code = "INVALID_SIGNATURE"
		} else if strings.Contains(errMsg, "order not found") {
			statusCode = http.StatusNotFound
			code = "ORDER_NOT_FOUND"
		}

		log.Printf(
			"[MidtransWebhook] failed order_id=%s tx=%s midtrans_status=%s http_status=%d code=%s duration_ms=%d error=%s",
			webhook.OrderID,
			maskWebhookTransactionID(webhook.TransactionID),
			webhook.TransactionStatus,
			statusCode,
			code,
			time.Since(start).Milliseconds(),
			errMsg,
		)
		response.Error(c, statusCode, code, errMsg)
		return
	}

	log.Printf(
		"[MidtransWebhook] processed order_id=%s tx=%s midtrans_status=%s payment_status=%s duration_ms=%d",
		webhook.OrderID,
		maskWebhookTransactionID(webhook.TransactionID),
		webhook.TransactionStatus,
		result.PaymentStatus,
		time.Since(start).Milliseconds(),
	)
	// Return success response
	response.SuccessWithMessage(c, http.StatusOK, "Webhook processed successfully", result)
}

func maskWebhookTransactionID(transactionID string) string {
	if len(transactionID) <= 10 {
		return transactionID
	}
	return transactionID[:6] + "..." + transactionID[len(transactionID)-4:]
}

// RegisterWebhookRoutes registers webhook routes
func RegisterWebhookRoutes(router *gin.Engine, webhookService *payment.PaymentWebhookService) {
	handler := NewWebhookHandler(webhookService)

	webhooks := router.Group("/api/v1/webhooks")
	{
		webhooks.POST("/payment", handler.HandlePaymentWebhook)
	}
}
