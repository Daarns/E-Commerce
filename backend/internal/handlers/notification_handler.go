package handlers

import (
	"net/http"
	"strconv"

	"ecommerce-backend/internal/middleware"
	notificationService "ecommerce-backend/internal/services/notification"
	"ecommerce-backend/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type NotificationHandler struct {
	service *notificationService.Service
}

func NewNotificationHandler(service *notificationService.Service) *NotificationHandler {
	return &NotificationHandler{service: service}
}

func (h *NotificationHandler) GetNotifications(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		response.Unauthorized(c, "Authentication required")
		return
	}

	page := parseNotificationInt(c.Query("page"), 1)
	pageSize := parseNotificationInt(c.Query("limit"), 20)
	unreadOnly := c.Query("unread") == "true"
	if pageSize > 50 {
		pageSize = 50
	}

	result, err := h.service.ListForUser(userID, page, pageSize, unreadOnly)
	if err != nil {
		response.InternalError(c, "Failed to load notifications")
		return
	}
	response.Success(c, result)
}

func (h *NotificationHandler) GetSummary(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		response.Unauthorized(c, "Authentication required")
		return
	}

	result, err := h.service.GetSummary(userID)
	if err != nil {
		response.InternalError(c, "Failed to load notification summary")
		return
	}
	response.Success(c, result)
}

func (h *NotificationHandler) MarkRead(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		response.Unauthorized(c, "Authentication required")
		return
	}

	notificationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_NOTIFICATION_ID", "Invalid notification ID")
		return
	}

	if err := h.service.MarkRead(userID, notificationID); err != nil {
		response.InternalError(c, "Failed to mark notification as read")
		return
	}
	response.SuccessWithMessage(c, http.StatusOK, "Notification marked as read", nil)
}

func (h *NotificationHandler) MarkAllRead(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		response.Unauthorized(c, "Authentication required")
		return
	}

	if err := h.service.MarkAllRead(userID); err != nil {
		response.InternalError(c, "Failed to mark notifications as read")
		return
	}
	response.SuccessWithMessage(c, http.StatusOK, "Notifications marked as read", nil)
}

func parseNotificationInt(value string, fallback int) int {
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < 1 {
		return fallback
	}
	return parsed
}
