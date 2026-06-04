package order

import (
	"ecommerce-backend/internal/middleware"
	"ecommerce-backend/internal/services/order"
	paymentSvc "ecommerce-backend/internal/services/payment"
	"ecommerce-backend/internal/utils"
	"ecommerce-backend/pkg/response"
	"ecommerce-backend/pkg/storage"
	"mime/multipart"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

const (
	maxRefundEvidenceImages      = 3
	maxRefundEvidenceImageBytes  = 10 << 20
	maxRefundEvidenceRequestBody = (maxRefundEvidenceImages * maxRefundEvidenceImageBytes) + (2 << 20)
)

// OrderHandler handles order HTTP requests
type OrderHandler struct {
	useCase     *order.OrderService
	syncService *paymentSvc.PaymentSyncService
	imageSvc    *storage.ImageService
}

// NewOrderHandler creates a new order handler
func NewOrderHandler(useCase *order.OrderService, syncSvc *paymentSvc.PaymentSyncService, imageSvc *storage.ImageService) *OrderHandler {
	h := &OrderHandler{
		useCase:     useCase,
		syncService: syncSvc,
		imageSvc:    imageSvc,
	}
	return h
}

// ===== CUSTOMER ORDER ENDPOINTS =====

// Checkout processes checkout
// POST /api/v1/checkout
func (h *OrderHandler) Checkout(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Login required")
		return
	}

	var input order.CheckoutInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	result, err := h.useCase.Checkout(userID, input)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "CHECKOUT_FAILED", err.Error())
		return
	}

	response.Created(c, result)
}

// GetOrders retrieves user's orders
// GET /api/v1/orders
func (h *OrderHandler) GetOrders(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Login required")
		return
	}

	page := utils.GetIntQueryDefault(c, "page", 1)
	limit := utils.GetIntQueryDefault(c, "limit", 20)

	result, err := h.useCase.GetUserOrders(userID, page, limit)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "GET_ORDERS_FAILED", err.Error())
		return
	}

	response.Success(c, result)
}

// GetOrder retrieves a specific order
// GET /api/v1/orders/:id
func (h *OrderHandler) GetOrder(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Login required")
		return
	}

	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		// Try as order number
		result, err := h.useCase.GetOrderByNumber(c.Param("id"), userID)
		if err != nil {
			response.Error(c, http.StatusNotFound, "NOT_FOUND", "Order not found")
			return
		}
		response.Success(c, result)
		return
	}

	result, err := h.useCase.GetOrder(orderID, userID)
	if err != nil {
		response.Error(c, http.StatusNotFound, "NOT_FOUND", err.Error())
		return
	}

	response.Success(c, result)
}

// CancelOrder cancels an order
// POST /api/v1/orders/:id/cancel
func (h *OrderHandler) CancelOrder(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Login required")
		return
	}

	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid order ID")
		return
	}

	var input struct {
		Reason string `json:"reason"`
	}
	c.ShouldBindJSON(&input)

	result, err := h.useCase.CancelOrder(orderID, userID, input.Reason)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "CANCEL_FAILED", err.Error())
		return
	}

	response.Success(c, result)
}

// ConfirmReceived lets a customer confirm a delivered order is accepted/completed.
// POST /api/v1/orders/:id/confirm-received
func (h *OrderHandler) ConfirmReceived(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Login required")
		return
	}

	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid order ID")
		return
	}

	result, err := h.useCase.ConfirmReceived(orderID, userID)
	if err != nil {
		msg := err.Error()
		statusCode := http.StatusConflict
		code := "CONFIRM_RECEIVED_FAILED"
		if msg == "order not found" {
			statusCode = http.StatusNotFound
			code = "NOT_FOUND"
		}
		response.Error(c, statusCode, code, msg)
		return
	}

	response.Success(c, result)
}

// ConfirmDelivery is kept as a backward-compatible alias for older clients.
func (h *OrderHandler) ConfirmDelivery(c *gin.Context) {
	h.ConfirmReceived(c)
}

// RequestRefund lets a customer request refund for a completed order.
// POST /api/v1/orders/:id/refund-request
func (h *OrderHandler) RequestRefund(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Login required")
		return
	}

	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid order ID")
		return
	}

	input, uploadedURLs, ok := h.bindRefundRequest(c)
	if !ok {
		return
	}

	result, err := h.useCase.RequestRefund(orderID, userID, input)
	if err != nil {
		h.cleanupUploadedRefundImages(uploadedURLs)
		msg := err.Error()
		statusCode := http.StatusConflict
		code := "REQUEST_REFUND_FAILED"
		if msg == "order not found" {
			statusCode = http.StatusNotFound
			code = "NOT_FOUND"
		}
		response.Error(c, statusCode, code, msg)
		return
	}

	response.Success(c, result)
}

func (h *OrderHandler) bindRefundRequest(c *gin.Context) (order.RefundRequestInput, []string, bool) {
	contentType := c.GetHeader("Content-Type")
	if !strings.HasPrefix(contentType, "multipart/form-data") {
		var input order.RefundRequestInput
		if err := c.ShouldBindJSON(&input); err != nil {
			response.ValidationError(c, err.Error())
			return input, nil, false
		}
		return input, nil, true
	}

	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxRefundEvidenceRequestBody)
	if err := c.Request.ParseMultipartForm(maxRefundEvidenceRequestBody); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_FORM", "Refund evidence upload is invalid or too large")
		return order.RefundRequestInput{}, nil, false
	}

	form := c.Request.MultipartForm
	if form == nil {
		response.Error(c, http.StatusBadRequest, "INVALID_FORM", "Invalid refund request form")
		return order.RefundRequestInput{}, nil, false
	}

	defer func() {
		_ = form.RemoveAll()
	}()

	files := refundImageFiles(form)
	if len(files) > maxRefundEvidenceImages {
		response.Error(c, http.StatusBadRequest, "TOO_MANY_REFUND_IMAGES", "Maximum 3 refund evidence images allowed")
		return order.RefundRequestInput{}, nil, false
	}

	if len(files) == 0 {
		return order.RefundRequestInput{
			Reason:      c.PostForm("reason"),
			Description: c.PostForm("description"),
		}, nil, true
	}

	if h.imageSvc == nil {
		response.Error(c, http.StatusServiceUnavailable, "UPLOAD_UNAVAILABLE", "Image upload service is unavailable")
		return order.RefundRequestInput{}, nil, false
	}

	if validationErrs := h.imageSvc.ValidateImageFiles(files); len(validationErrs) > 0 {
		var parts []string
		for _, validationErr := range validationErrs {
			parts = append(parts, validationErr.Error())
		}
		response.Error(c, http.StatusBadRequest, "VALIDATION_FAILED", strings.Join(parts, "; "))
		return order.RefundRequestInput{}, nil, false
	}

	evidenceURLs := make([]string, 0, len(files))
	for _, file := range files {
		uploadResult, err := h.imageSvc.SaveImageToStorageWithMetadataInFolder(file, "refunds")
		if err != nil {
			h.cleanupUploadedRefundImages(evidenceURLs)
			response.Error(c, http.StatusInternalServerError, "UPLOAD_FAILED", "Failed to upload refund evidence image")
			return order.RefundRequestInput{}, nil, false
		}
		evidenceURLs = append(evidenceURLs, uploadResult.URL)
	}

	return order.RefundRequestInput{
		Reason:       c.PostForm("reason"),
		Description:  c.PostForm("description"),
		EvidenceURLs: evidenceURLs,
	}, evidenceURLs, true
}

func refundImageFiles(form *multipart.Form) []*multipart.FileHeader {
	files := form.File["images"]
	if len(files) == 0 {
		files = form.File["evidence_images"]
	}
	if len(files) == 0 {
		files = form.File["evidence"]
	}
	return files
}

func (h *OrderHandler) cleanupUploadedRefundImages(imageURLs []string) {
	if h.imageSvc == nil {
		return
	}
	for _, imageURL := range imageURLs {
		if imageURL == "" {
			continue
		}
		_ = h.imageSvc.DeleteFromSeaweedFS(imageURL)
	}
}

// ValidatePromoCode validates a promo code
// POST /api/v1/promo-codes/validate
func (h *OrderHandler) ValidatePromoCode(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Login required")
		return
	}

	var input struct {
		Code     string  `json:"code" binding:"required"`
		Subtotal float64 `json:"subtotal" binding:"required,min=0"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	subtotal := decimal.NewFromFloat(input.Subtotal)
	promo, discount, err := h.useCase.ValidatePromoCode(input.Code, userID, subtotal)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_PROMO", err.Error())
		return
	}

	response.Success(c, gin.H{
		"promo_code":     promo,
		"discount":       discount,
		"final_subtotal": subtotal.Sub(discount),
	})
}

// ===== HELPER METHODS =====

// PayOrder returns a Snap token for an existing unpaid order.
// Reuses the cached token if still within Midtrans' 24-hour validity window.
// POST /api/v1/orders/:id/pay
func (h *OrderHandler) PayOrder(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Login required")
		return
	}

	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid order ID")
		return
	}

	var body struct {
		CustomerEmail string `json:"customer_email"`
	}
	_ = c.ShouldBindJSON(&body)

	snapToken, redirectURL, err := h.useCase.GetOrCreateSnapToken(orderID, userID, body.CustomerEmail)
	if err != nil {
		msg := err.Error()
		statusCode := http.StatusInternalServerError
		code := "PAY_FAILED"
		if msg == "order not found" {
			statusCode = http.StatusNotFound
			code = "NOT_FOUND"
		} else if msg == "forbidden" {
			statusCode = http.StatusForbidden
			code = "FORBIDDEN"
		} else if msg == "order is already paid" {
			statusCode = http.StatusConflict
			code = "ALREADY_PAID"
		} else if msg == "payment window expired" {
			statusCode = http.StatusConflict
			code = "PAYMENT_EXPIRED"
		}
		response.Error(c, statusCode, code, msg)
		return
	}

	response.Success(c, gin.H{
		"snap_token":   snapToken,
		"redirect_url": redirectURL,
	})
}

// SyncPaymentStatus queries Midtrans API to sync order payment status.
// Fallback for when webhooks fail to deliver (e.g. ngrok URL changes in dev).
// POST /api/v1/orders/:id/sync-payment
func (h *OrderHandler) SyncPaymentStatus(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Login required")
		return
	}

	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid order ID")
		return
	}

	if h.syncService == nil {
		response.Error(c, http.StatusServiceUnavailable, "SYNC_UNAVAILABLE", "Payment sync not available")
		return
	}

	// Optional: caller can provide the exact Midtrans order_id (for retry transactions)
	var body struct {
		MidtransOrderID string `json:"midtrans_order_id"`
	}
	_ = c.ShouldBindJSON(&body)

	var result interface{}
	if body.MidtransOrderID != "" {
		result, err = h.syncService.SyncOrderPaymentByMidtransID(orderID, userID, body.MidtransOrderID)
	} else {
		result, err = h.syncService.SyncOrderPayment(orderID, userID)
	}

	if err != nil {
		msg := err.Error()
		statusCode := http.StatusInternalServerError
		code := "SYNC_FAILED"
		if msg == "order not found" {
			statusCode = http.StatusNotFound
			code = "NOT_FOUND"
		} else if msg == "forbidden" {
			statusCode = http.StatusForbidden
			code = "FORBIDDEN"
		}
		response.Error(c, statusCode, code, msg)
		return
	}

	response.SuccessWithMessage(c, http.StatusOK, "Payment status synced", result)
}
