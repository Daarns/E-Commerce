package admin

import (
	"ecommerce-backend/internal/middleware"
	"ecommerce-backend/internal/repositories"
	"ecommerce-backend/internal/services/order"
	"ecommerce-backend/internal/utils"
	"ecommerce-backend/pkg/response"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// AdminOrderHandler handles admin order HTTP requests
type AdminOrderHandler struct {
	useCase *order.OrderService
}

// NewAdminOrderHandler creates a new admin order handler
func NewAdminOrderHandler(useCase *order.OrderService) *AdminOrderHandler {
	return &AdminOrderHandler{useCase: useCase}
}

// AdminGetOrders retrieves all orders (admin only)
// GET /api/v1/admin/orders
func (h *AdminOrderHandler) AdminGetOrders(c *gin.Context) {
	filter := repositories.OrderFilter{
		Page:  utils.GetIntQueryDefault(c, "page", 1),
		Limit: utils.GetIntQueryDefault(c, "limit", 20),
	}

	if status := c.Query("order_status"); status != "" {
		filter.OrderStatus = status
	} else if status := c.Query("status"); status != "" {
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
func (h *AdminOrderHandler) AdminGetOrder(c *gin.Context) {
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
func (h *AdminOrderHandler) AdminUpdateOrderStatus(c *gin.Context) {
	// For admin update, we need to extract the admin user ID doing the update
	var adminID uuid.UUID
	if userIDVal, exists := c.Get("user_id"); exists {
		if id, ok := userIDVal.(uuid.UUID); ok {
			adminID = id
		}
	}

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
func (h *AdminOrderHandler) AdminUpdatePayment(c *gin.Context) {
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

// AdminProcessRefund records a manual refund for an order (admin only)
// POST /api/v1/admin/orders/:id/refund
func (h *AdminOrderHandler) AdminProcessRefund(c *gin.Context) {
	adminID, err := middleware.GetUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid order ID")
		return
	}

	var input struct {
		Amount float64 `json:"amount" binding:"required"`
		Reason string  `json:"reason"`
		Notes  string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	result, err := h.useCase.AdminProcessRefund(orderID, decimal.NewFromFloat(input.Amount), input.Reason, input.Notes, adminID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "PROCESS_REFUND_FAILED", err.Error())
		return
	}

	response.Success(c, result)
}

// AdminRejectRefund rejects a refund request after admin review.
// POST /api/v1/admin/orders/:id/refund/reject
func (h *AdminOrderHandler) AdminRejectRefund(c *gin.Context) {
	adminID, err := middleware.GetUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid order ID")
		return
	}

	var input struct {
		Reason string `json:"reason" binding:"required"`
		Notes  string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	result, err := h.useCase.AdminRejectRefund(orderID, input.Reason, input.Notes, adminID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "REJECT_REFUND_FAILED", err.Error())
		return
	}

	response.Success(c, result)
}

// AdminUpdateTracking updates shipping tracking (admin only)
// PUT /api/v1/admin/orders/:id/tracking
func (h *AdminOrderHandler) AdminUpdateTracking(c *gin.Context) {
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
func (h *AdminOrderHandler) AdminAddNotes(c *gin.Context) {
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
func (h *AdminOrderHandler) GetOrderSummary(c *gin.Context) {
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
