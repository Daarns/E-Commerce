package features

import (
	"ecommerce-backend/internal/services/payment"
	"ecommerce-backend/pkg/response"
	"net/http"
	"strings"

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
	// Parse request body
	var webhook payment.PaymentWebhookRequest
	if err := c.ShouldBindJSON(&webhook); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request format")
		return
	}

	// Validate required fields
	if webhook.OrderID == "" || webhook.TransactionID == "" || webhook.TransactionStatus == "" {
		response.Error(c, http.StatusBadRequest, "MISSING_FIELDS", "Missing required fields")
		return
	}

	if webhook.StatusCode == "" || webhook.GrossAmount == "" || webhook.SignatureKey == "" {
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

		response.Error(c, statusCode, code, errMsg)
		return
	}

	// Return success response
	response.SuccessWithMessage(c, http.StatusOK, "Webhook processed successfully", result)
}

// RegisterWebhookRoutes registers webhook routes
func RegisterWebhookRoutes(router *gin.Engine, webhookService *payment.PaymentWebhookService) {
	handler := NewWebhookHandler(webhookService)

	webhooks := router.Group("/api/v1/webhooks")
	{
		webhooks.POST("/payment", handler.HandlePaymentWebhook)
	}
}

