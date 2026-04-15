package handlers

import (
	"ecommerce-backend/internal/services"
	"ecommerce-backend/pkg/response"
	"net/http"

	"github.com/gin-gonic/gin"
)

// NewsletterHandler handles newsletter requests
type NewsletterHandler struct {
	service *services.NewsletterService
}

// NewNewsletterHandler creates a new newsletter handler
func NewNewsletterHandler(service *services.NewsletterService) *NewsletterHandler {
	return &NewsletterHandler{service: service}
}

// HandleSubscribe handles POST /api/v1/newsletters/subscribe
// @Summary Subscribe to newsletter
// @Description Subscribe email to newsletter with double-opt-in confirmation
// @Tags Newsletters
// @Accept json
// @Produce json
// @Param request body services.SubscribeRequest true "Email to subscribe"
// @Success 200 {object} services.SubscribeResponse
// @Failure 400 {object} response.Response "Invalid email"
// @Failure 409 {object} response.Response "Already subscribed"
// @Router /api/v1/newsletters/subscribe [post]
func (h *NewsletterHandler) HandleSubscribe(c *gin.Context) {
	var req services.SubscribeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request format")
		return
	}

	result, err := h.service.Subscribe(req.Email)
	if err != nil {
		errMsg := err.Error()
		
		// Determine HTTP status based on error
		statusCode := http.StatusBadRequest
		code := "INVALID_EMAIL"

		if errMsg == "email is already subscribed to newsletter" {
			statusCode = http.StatusConflict
			code = "ALREADY_SUBSCRIBED"
		} else if errMsg == "confirmation email already sent to this address" {
			statusCode = http.StatusConflict
			code = "PENDING_CONFIRMATION"
		}

		response.Error(c, statusCode, code, errMsg)
		return
	}

	response.SuccessWithMessage(c, http.StatusOK, result.Message, result)
}

// HandleConfirm handles POST /api/v1/newsletters/confirm/:token
// @Summary Confirm newsletter subscription
// @Description Confirm subscription via confirmation token from email
// @Tags Newsletters
// @Produce json
// @Param token path string true "Confirmation token"
// @Success 200 {object} services.ConfirmResponse
// @Failure 400 {object} response.Response "Invalid or expired token"
// @Router /api/v1/newsletters/confirm/{token} [post]
func (h *NewsletterHandler) HandleConfirm(c *gin.Context) {
	token := c.Param("token")
	
	if token == "" {
		response.Error(c, http.StatusBadRequest, "MISSING_TOKEN", "Confirmation token is required")
		return
	}

	result, err := h.service.ConfirmSubscription(token)
	if err != nil {
		errMsg := err.Error()
		statusCode := http.StatusBadRequest
		code := "INVALID_TOKEN"

		if errMsg == "confirmation link has expired" {
			code = "TOKEN_EXPIRED"
		}

		response.Error(c, statusCode, code, errMsg)
		return
	}

	response.SuccessWithMessage(c, http.StatusOK, result.Message, result)
}

// HandleUnsubscribe handles POST /api/v1/newsletters/unsubscribe
// @Summary Unsubscribe from newsletter
// @Description Unsubscribe email from newsletter
// @Tags Newsletters
// @Accept json
// @Produce json
// @Param request body services.UnsubscribeRequest true "Email to unsubscribe"
// @Success 200 {object} services.UnsubscribeResponse
// @Failure 400 {object} response.Response "Invalid email"
// @Failure 404 {object} response.Response "Email not found"
// @Router /api/v1/newsletters/unsubscribe [post]
func (h *NewsletterHandler) HandleUnsubscribe(c *gin.Context) {
	var req services.UnsubscribeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request format")
		return
	}

	result, err := h.service.Unsubscribe(req.Email)
	if err != nil {
		errMsg := err.Error()
		statusCode := http.StatusBadRequest
		code := "INVALID_EMAIL"

		if errMsg == "email not found in newsletter" {
			statusCode = http.StatusNotFound
			code = "NOT_FOUND"
		}

		response.Error(c, statusCode, code, errMsg)
		return
	}

	response.SuccessWithMessage(c, http.StatusOK, result.Message, result)
}

// HandleGetStatus handles GET /api/v1/newsletters/status/:email
// @Summary Get newsletter subscription status
// @Description Check subscription status for an email
// @Tags Newsletters
// @Produce json
// @Param email path string true "Email address"
// @Success 200 {object} services.StatusResponse
// @Failure 400 {object} response.Response "Invalid email"
// @Failure 404 {object} response.Response "Email not found"
// @Router /api/v1/newsletters/status/{email} [get]
func (h *NewsletterHandler) HandleGetStatus(c *gin.Context) {
	email := c.Param("email")
	
	if email == "" {
		response.Error(c, http.StatusBadRequest, "MISSING_EMAIL", "Email is required")
		return
	}

	result, err := h.service.GetStatus(email)
	if err != nil {
		errMsg := err.Error()
		statusCode := http.StatusBadRequest
		code := "INVALID_EMAIL"

		if errMsg == "email not found" {
			statusCode = http.StatusNotFound
			code = "NOT_FOUND"
		}

		response.Error(c, statusCode, code, errMsg)
		return
	}

	response.Success(c, result)
}

// RegisterNewsletterRoutes registers newsletter routes
func RegisterNewsletterRoutes(routerGroup *gin.RouterGroup, service *services.NewsletterService) {
	handler := NewNewsletterHandler(service)

	newsletters := routerGroup.Group("/newsletters")
	{
		newsletters.POST("/subscribe", handler.HandleSubscribe)
		newsletters.POST("/confirm/:token", handler.HandleConfirm)
		newsletters.POST("/unsubscribe", handler.HandleUnsubscribe)
		newsletters.GET("/status/:email", handler.HandleGetStatus)
	}
}
