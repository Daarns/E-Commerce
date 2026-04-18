package order

import (
	"ecommerce-backend/internal/repositories"
	"ecommerce-backend/internal/services"
	"ecommerce-backend/pkg/response"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// OrderHandler handles order HTTP requests
type OrderHandler struct {
	useCase *services.OrderService
}

// NewOrderHandler creates a new order handler
func NewOrderHandler(useCase *services.OrderService) *OrderHandler {
	return &OrderHandler{useCase: useCase}
}

// ===== CUSTOMER ORDER ENDPOINTS =====

// Checkout processes checkout
// POST /api/v1/checkout
func (h *OrderHandler) Checkout(c *gin.Context) {
	userID, err := h.getUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Login required")
		return
	}

	var input services.CheckoutInput
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
	userID, err := h.getUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Login required")
		return
	}

	page := getIntQueryDefault(c, "page", 1)
	limit := getIntQueryDefault(c, "limit", 20)

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
	userID, err := h.getUserID(c)
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
	userID, err := h.getUserID(c)
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
	userID, err := h.getUserID(c)
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

// ===== ADMIN ORDER ENDPOINTS =====

// AdminGetOrders retrieves all orders (admin only)
// GET /api/v1/admin/orders
func (h *OrderHandler) AdminGetOrders(c *gin.Context) {
	filter := repositories.OrderFilter{
		Page:  getIntQueryDefault(c, "page", 1),
		Limit: getIntQueryDefault(c, "limit", 20),
	}

	if status := c.Query("order_status"); status != "" {
		filter.OrderStatus = status
	}

	if paymentStatus := c.Query("payment_status"); paymentStatus != "" {
		filter.PaymentStatus = paymentStatus
	}

	if search := c.Query("search"); search != "" {
		filter.Search = search
	}

	if userID := c.Query("user_id"); userID != "" {
		if uid, err := uuid.Parse(userID); err == nil {
			filter.UserID = &uid
		}
	}

	if dateFrom := c.Query("date_from"); dateFrom != "" {
		if t, err := time.Parse("2006-01-02", dateFrom); err == nil {
			filter.DateFrom = &t
		}
	}

	if dateTo := c.Query("date_to"); dateTo != "" {
		if t, err := time.Parse("2006-01-02", dateTo); err == nil {
			filter.DateTo = &t
		}
	}

	filter.SortBy = c.DefaultQuery("sort_by", "created_at")
	filter.SortOrder = c.DefaultQuery("sort_order", "desc")

	result, err := h.useCase.AdminGetOrders(filter)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "GET_ORDERS_FAILED", err.Error())
		return
	}

	response.Success(c, result)
}

// AdminGetOrder retrieves a specific order (admin only)
// GET /api/v1/admin/orders/:id
func (h *OrderHandler) AdminGetOrder(c *gin.Context) {
	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid order ID")
		return
	}

	result, err := h.useCase.AdminGetOrder(orderID)
	if err != nil {
		response.Error(c, http.StatusNotFound, "NOT_FOUND", err.Error())
		return
	}

	response.Success(c, result)
}

// AdminUpdateOrderStatus updates order status (admin only)
// PUT /api/v1/admin/orders/:id/status
func (h *OrderHandler) AdminUpdateOrderStatus(c *gin.Context) {
	adminID, _ := h.getUserID(c)

	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid order ID")
		return
	}

	var input struct {
		Status string `json:"status" binding:"required"`
		Notes  string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	result, err := h.useCase.AdminUpdateOrderStatus(orderID, input.Status, input.Notes, adminID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "UPDATE_STATUS_FAILED", err.Error())
		return
	}

	response.Success(c, result)
}

// AdminUpdatePayment updates payment status (admin only)
// PUT /api/v1/admin/orders/:id/payment
func (h *OrderHandler) AdminUpdatePayment(c *gin.Context) {
	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid order ID")
		return
	}

	var input struct {
		PaymentStatus string `json:"payment_status" binding:"required"`
		TransactionID string `json:"transaction_id"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	result, err := h.useCase.AdminUpdatePayment(orderID, input.PaymentStatus, input.TransactionID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "UPDATE_PAYMENT_FAILED", err.Error())
		return
	}

	response.Success(c, result)
}

// AdminUpdateTracking updates shipping tracking (admin only)
// PUT /api/v1/admin/orders/:id/tracking
func (h *OrderHandler) AdminUpdateTracking(c *gin.Context) {
	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid order ID")
		return
	}

	var input struct {
		TrackingNumber string `json:"tracking_number" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	result, err := h.useCase.AdminUpdateTracking(orderID, input.TrackingNumber)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "UPDATE_TRACKING_FAILED", err.Error())
		return
	}

	response.Success(c, result)
}

// AdminAddNotes adds admin notes (admin only)
// PUT /api/v1/admin/orders/:id/notes
func (h *OrderHandler) AdminAddNotes(c *gin.Context) {
	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid order ID")
		return
	}

	var input struct {
		Notes string `json:"notes" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	result, err := h.useCase.AdminAddNotes(orderID, input.Notes)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "ADD_NOTES_FAILED", err.Error())
		return
	}

	response.Success(c, result)
}

// GetOrderSummary retrieves order statistics (admin only)
// GET /api/v1/admin/orders/summary
func (h *OrderHandler) GetOrderSummary(c *gin.Context) {
	var userID *uuid.UUID
	if uid := c.Query("user_id"); uid != "" {
		if id, err := uuid.Parse(uid); err == nil {
			userID = &id
		}
	}

	summary, err := h.useCase.GetOrderSummary(userID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "GET_SUMMARY_FAILED", err.Error())
		return
	}

	response.Success(c, summary)
}

// ===== HELPER METHODS =====

// getUserID extracts authenticated user ID
func (h *OrderHandler) getUserID(c *gin.Context) (uuid.UUID, error) {
	if userIDVal, exists := c.Get("user_id"); exists {
		if userID, ok := userIDVal.(uuid.UUID); ok {
			return userID, nil
		}
	}
	return uuid.Nil, fmt.Errorf("user not authenticated")
}

// getIntQueryDefault gets integer query parameter with default
func getIntQueryDefault(c *gin.Context, key string, defaultValue int) int {
	if val := c.Query(key); val != "" {
		if intVal, err := strconv.Atoi(val); err == nil {
			return intVal
		}
	}
	return defaultValue
}

