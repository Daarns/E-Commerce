package order_refund_test

import (
	"bytes"
	"database/sql"
	"ecommerce-backend/internal/handlers/admin"
	orderhandler "ecommerce-backend/internal/handlers/order"
	"ecommerce-backend/internal/middleware"
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	ordersvc "ecommerce-backend/internal/services/order"
	jwtpkg "ecommerce-backend/pkg/jwt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupRefundHTTPTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	require.NoError(t, err)

	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)
	t.Cleanup(func() {
		require.NoError(t, closeRefundHTTPTestDB(sqlDB))
	})

	require.NoError(t, db.Exec("PRAGMA foreign_keys = OFF").Error)
	require.NoError(t, db.Exec(`
		CREATE TABLE orders (
			id text PRIMARY KEY,
			order_number text NOT NULL UNIQUE,
			user_id text NOT NULL,
			shipping_name text NOT NULL,
			shipping_phone text NOT NULL,
			shipping_address_line1 text NOT NULL,
			shipping_address_line2 text,
			shipping_city text NOT NULL,
			shipping_province text NOT NULL,
			shipping_postal_code text NOT NULL,
			subtotal numeric NOT NULL,
			shipping_cost numeric DEFAULT 0,
			discount_amount numeric DEFAULT 0,
			tax_amount numeric DEFAULT 0,
			total numeric NOT NULL,
			promo_code_id text,
			order_status text NOT NULL,
			payment_status text NOT NULL,
			payment_method text,
			payment_provider text,
			payment_transaction_id text,
			paid_at datetime,
			snap_token text,
			snap_token_created_at datetime,
			payment_expires_at datetime,
			customer_email text,
			shipping_method text,
			tracking_number text,
			shipped_at datetime,
			delivered_at datetime,
			customer_notes text,
			admin_notes text,
			cancelled_at datetime,
			cancellation_reason text,
			idempotency_key text,
			created_at datetime,
			updated_at datetime
		)
	`).Error)
	require.NoError(t, db.Exec(`
		CREATE TABLE order_status_workflows (
			id text PRIMARY KEY,
			order_id text NOT NULL,
			from_status text,
			to_status text NOT NULL,
			email_triggered boolean DEFAULT false,
			email_type text,
			triggered_at datetime,
			notes text,
			created_at datetime,
			updated_at datetime
		)
	`).Error)
	require.NoError(t, db.Exec(`
		CREATE TABLE order_refund_images (
			id text PRIMARY KEY,
			order_id text NOT NULL,
			user_id text NOT NULL,
			image_url text NOT NULL,
			refund_attempt integer NOT NULL DEFAULT 1,
			position integer NOT NULL DEFAULT 0,
			created_at datetime
		)
	`).Error)
	require.NoError(t, db.Exec(`CREATE TABLE order_items (id text PRIMARY KEY, order_id text)`).Error)

	return db
}

func closeRefundHTTPTestDB(db *sql.DB) error {
	return db.Close()
}

func newRefundHTTPService(db *gorm.DB) *ordersvc.OrderService {
	return ordersvc.NewOrderService(
		db,
		repositories.NewOrderRepository(db),
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
	)
}

func seedRefundRequestedOrder(t *testing.T, db *gorm.DB, ownerID uuid.UUID) uuid.UUID {
	t.Helper()

	orderID := uuid.New()
	order := &models.Order{
		ID:                   orderID,
		OrderNumber:          "ORD-HTTP-" + orderID.String()[:8],
		UserID:               ownerID,
		ShippingName:         "Customer Test",
		ShippingPhone:        "+628000000000",
		ShippingAddressLine1: "Test Street",
		ShippingCity:         "Jakarta",
		ShippingProvince:     "DKI Jakarta",
		ShippingPostalCode:   "12345",
		Subtotal:             decimal.NewFromInt(100000),
		ShippingCost:         decimal.Zero,
		DiscountAmount:       decimal.Zero,
		TaxAmount:            decimal.Zero,
		Total:                decimal.NewFromInt(100000),
		OrderStatus:          models.OrderStatusRefundRequested,
		PaymentStatus:        models.PaymentStatusPaid,
		CreatedAt:            time.Now().Add(-2 * time.Hour),
		UpdatedAt:            time.Now().Add(-2 * time.Hour),
	}
	require.NoError(t, db.Create(order).Error)
	require.NoError(t, db.Create(&models.OrderStatusHistory{
		OrderID:    orderID,
		FromStatus: models.OrderStatusCompleted,
		ToStatus:   models.OrderStatusRefundRequested,
		Notes:      "Refund requested by customer. Reason: Produk rusak. Description: Rusak",
		ChangedAt:  time.Now().Add(-time.Hour),
	}).Error)

	return orderID
}

func setupRefundHTTPRouter(t *testing.T, service *ordersvc.OrderService) (*gin.Engine, *jwtpkg.Manager) {
	t.Helper()

	gin.SetMode(gin.TestMode)
	router := gin.New()
	jwtManager := jwtpkg.NewManager(jwtpkg.Config{
		AccessTokenSecret:    "test-access-secret-minimum-32-characters",
		RefreshTokenSecret:   "test-refresh-secret-minimum-32-characters",
		AccessTokenDuration:  time.Hour,
		RefreshTokenDuration: 24 * time.Hour,
	})

	adminHandler := admin.NewAdminOrderHandler(service)
	orderHandler := orderhandler.NewOrderHandler(service, nil, nil)

	adminRoutes := router.Group("/api/v1/admin")
	adminRoutes.Use(middleware.AuthMiddleware(jwtManager))
	adminRoutes.Use(middleware.AdminOnly())
	{
		adminRoutes.POST("/orders/:id/refund/reject", adminHandler.AdminRejectRefund)
	}

	customerRoutes := router.Group("/api/v1")
	customerRoutes.Use(middleware.AuthMiddleware(jwtManager))
	{
		customerRoutes.POST("/orders/:id/refund-request", orderHandler.RequestRefund)
	}

	return router, jwtManager
}

func bearerToken(t *testing.T, manager *jwtpkg.Manager, userID uuid.UUID, email string, role string) string {
	t.Helper()

	token, err := manager.GenerateAccessToken(userID, email, role)
	require.NoError(t, err)
	return "Bearer " + token
}

func TestRefundHTTPInvalidCases_AdminRejectRequiresAdmin(t *testing.T) {
	db := setupRefundHTTPTestDB(t)
	service := newRefundHTTPService(db)
	userAID := uuid.New()
	userBID := uuid.New()
	orderBID := seedRefundRequestedOrder(t, db, userBID)
	router, manager := setupRefundHTTPRouter(t, service)

	body := []byte(`{"reason":"Evidence does not match claim"}`)
	noTokenRequest := httptest.NewRequest(http.MethodPost, "/api/v1/admin/orders/"+orderBID.String()+"/refund/reject", bytes.NewReader(body))
	noTokenRequest.Header.Set("Content-Type", "application/json")
	noTokenResponse := httptest.NewRecorder()
	router.ServeHTTP(noTokenResponse, noTokenRequest)
	require.Equal(t, http.StatusUnauthorized, noTokenResponse.Code)

	customerRequest := httptest.NewRequest(http.MethodPost, "/api/v1/admin/orders/"+orderBID.String()+"/refund/reject", bytes.NewReader(body))
	customerRequest.Header.Set("Content-Type", "application/json")
	customerRequest.Header.Set("Authorization", bearerToken(t, manager, userAID, "user-a@example.com", "customer"))
	customerResponse := httptest.NewRecorder()
	router.ServeHTTP(customerResponse, customerRequest)
	require.Equal(t, http.StatusForbidden, customerResponse.Code)
}

func TestRefundHTTPInvalidCases_UserCannotRequestRefundForAnotherUsersOrder(t *testing.T) {
	db := setupRefundHTTPTestDB(t)
	service := newRefundHTTPService(db)
	userAID := uuid.New()
	userBID := uuid.New()
	orderBID := seedRefundRequestedOrder(t, db, userBID)
	router, manager := setupRefundHTTPRouter(t, service)

	body := []byte(`{"reason":"Produk rusak","description":"Mencoba order user lain","evidence_urls":["http://storage/refunds/a.webp"]}`)
	request := httptest.NewRequest(http.MethodPost, "/api/v1/orders/"+orderBID.String()+"/refund-request", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", bearerToken(t, manager, userAID, "user-a@example.com", "customer"))
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	require.Equal(t, http.StatusNotFound, response.Code)
}

func TestRefundHTTPInvalidCases_AdminRejectRequiresReason(t *testing.T) {
	db := setupRefundHTTPTestDB(t)
	service := newRefundHTTPService(db)
	adminID := uuid.New()
	userBID := uuid.New()
	orderBID := seedRefundRequestedOrder(t, db, userBID)
	router, manager := setupRefundHTTPRouter(t, service)

	request := httptest.NewRequest(http.MethodPost, "/api/v1/admin/orders/"+orderBID.String()+"/refund/reject", bytes.NewReader([]byte(`{"notes":"missing reason"}`)))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", bearerToken(t, manager, adminID, "admin@example.com", "admin"))
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	require.Equal(t, http.StatusBadRequest, response.Code)
}
