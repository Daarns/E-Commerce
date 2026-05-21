package order

import (
	"ecommerce-backend/internal/middleware"
	"ecommerce-backend/internal/services/order"
	paymentSvc "ecommerce-backend/internal/services/payment"
	"ecommerce-backend/internal/utils"
	"ecommerce-backend/pkg/response"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// OrderHandler handles order HTTP requests
type OrderHandler struct {
	useCase     *order.OrderService
	syncService *paymentSvc.PaymentSyncService
}

// NewOrderHandler creates a new order handler
func NewOrderHandler(useCase *order.OrderService, syncSvc ...*paymentSvc.PaymentSyncService) *OrderHandler {
	h := &OrderHandler{useCase: useCase}
	if len(syncSvc) > 0 {
		h.syncService = syncSvc[0]
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
