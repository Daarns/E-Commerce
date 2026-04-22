package order

import (
	"ecommerce-backend/internal/repositories"
	"ecommerce-backend/pkg/response"
	"net/http"

	"github.com/gin-gonic/gin"
)

// ShippingHandler handles shipping method HTTP requests.
type ShippingHandler struct {
	repo *repositories.ShippingRepository
}

// NewShippingHandler creates a new ShippingHandler.
func NewShippingHandler(repo *repositories.ShippingRepository) *ShippingHandler {
	return &ShippingHandler{repo: repo}
}

// ListShippingMethods returns all active shipping methods ordered by display_order.
// GET /api/v1/shipping/methods
// Public — no authentication required.
func (h *ShippingHandler) ListShippingMethods(c *gin.Context) {
	methods, err := h.repo.GetActive()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_SHIPPING_FAILED", err.Error())
		return
	}
	response.Success(c, methods)
}
