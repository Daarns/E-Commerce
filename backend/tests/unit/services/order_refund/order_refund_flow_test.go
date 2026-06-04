package order_refund_test

import (
	"database/sql"
	"testing"
	"time"

	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	ordersvc "ecommerce-backend/internal/services/order"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupRefundFlowTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	require.NoError(t, err)

	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)
	t.Cleanup(func() {
		require.NoError(t, closeRefundFlowTestDB(sqlDB))
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

func closeRefundFlowTestDB(db *sql.DB) error {
	return db.Close()
}

func newRefundFlowService(db *gorm.DB) *ordersvc.OrderService {
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

func seedRefundableOrder(t *testing.T, db *gorm.DB, status string) (uuid.UUID, uuid.UUID) {
	t.Helper()

	userID := uuid.New()
	orderID := uuid.New()
	order := &models.Order{
		ID:                   orderID,
		OrderNumber:          "ORD-TEST-" + orderID.String()[:8],
		UserID:               userID,
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
		OrderStatus:          status,
		PaymentStatus:        models.PaymentStatusPaid,
		CreatedAt:            time.Now().Add(-2 * time.Hour),
		UpdatedAt:            time.Now().Add(-2 * time.Hour),
	}
	require.NoError(t, db.Create(order).Error)
	require.NoError(t, db.Create(&models.OrderStatusHistory{
		OrderID:    orderID,
		FromStatus: models.OrderStatusDelivered,
		ToStatus:   models.OrderStatusCompleted,
		Notes:      "Order received and confirmed by customer",
		ChangedAt:  time.Now().Add(-time.Hour),
	}).Error)

	return orderID, userID
}

func TestOrderRefundFlow_RequestRefundStoresEvidenceForAttemptOne(t *testing.T) {
	db := setupRefundFlowTestDB(t)
	service := newRefundFlowService(db)
	orderID, userID := seedRefundableOrder(t, db, models.OrderStatusCompleted)

	updatedOrder, err := service.RequestRefund(orderID, userID, ordersvc.RefundRequestInput{
		Reason:       "Produk rusak atau cacat",
		Description:  "Produk rusak saat diterima",
		EvidenceURLs: []string{"http://storage/refunds/a.webp", "http://storage/refunds/b.webp"},
	})

	require.NoError(t, err)
	require.Equal(t, models.OrderStatusRefundRequested, updatedOrder.OrderStatus)
	require.Len(t, updatedOrder.RefundImages, 2)
	require.Equal(t, 1, updatedOrder.RefundImages[0].RefundAttempt)
	require.Equal(t, 0, updatedOrder.RefundImages[0].Position)
	require.Contains(t, updatedOrder.StatusHistory[len(updatedOrder.StatusHistory)-1].Notes, "Produk rusak atau cacat")
}

func TestOrderRefundFlow_RejectRefundKeepsPaymentPaidAndAllowsRetry(t *testing.T) {
	db := setupRefundFlowTestDB(t)
	service := newRefundFlowService(db)
	orderID, userID := seedRefundableOrder(t, db, models.OrderStatusCompleted)

	_, err := service.RequestRefund(orderID, userID, ordersvc.RefundRequestInput{
		Reason:       "Produk rusak atau cacat",
		Description:  "Produk rusak saat diterima",
		EvidenceURLs: []string{"http://storage/refunds/first.webp"},
	})
	require.NoError(t, err)

	adminID := uuid.New()
	rejectedOrder, err := service.AdminRejectRefund(orderID, "Evidence does not match claim", "Photo is not related", adminID)
	require.NoError(t, err)
	require.Equal(t, models.OrderStatusRefundRejected, rejectedOrder.OrderStatus)
	require.Equal(t, models.PaymentStatusPaid, rejectedOrder.PaymentStatus)
	require.Contains(t, rejectedOrder.AdminNotes, "Evidence does not match claim")

	retriedOrder, err := service.RequestRefund(orderID, userID, ordersvc.RefundRequestInput{
		Reason:       "Produk tidak sesuai deskripsi",
		Description:  "Detail pengajuan kedua",
		EvidenceURLs: []string{"http://storage/refunds/second-a.webp", "http://storage/refunds/second-b.webp"},
	})
	require.NoError(t, err)
	require.Equal(t, models.OrderStatusRefundRequested, retriedOrder.OrderStatus)

	var images []models.OrderRefundImage
	require.NoError(t, db.Order("refund_attempt ASC, position ASC").Find(&images, "order_id = ?", orderID).Error)
	require.Len(t, images, 3)
	require.Equal(t, 1, images[0].RefundAttempt)
	require.Equal(t, 2, images[1].RefundAttempt)
	require.Equal(t, 2, images[2].RefundAttempt)
}

func TestOrderRefundFlow_RequestRefundRejectsFourthAttempt(t *testing.T) {
	db := setupRefundFlowTestDB(t)
	service := newRefundFlowService(db)
	orderID, userID := seedRefundableOrder(t, db, models.OrderStatusCompleted)

	for attempt := 1; attempt <= 3; attempt++ {
		require.NoError(t, db.Create(&models.OrderStatusHistory{
			OrderID:    orderID,
			FromStatus: models.OrderStatusRefundRejected,
			ToStatus:   models.OrderStatusRefundRequested,
			Notes:      "Refund requested by customer. Reason: Test. Description: Test",
			ChangedAt:  time.Now().Add(time.Duration(attempt) * time.Minute),
		}).Error)
	}

	_, err := service.RequestRefund(orderID, userID, ordersvc.RefundRequestInput{
		Reason:       "Produk rusak atau cacat",
		Description:  "Pengajuan keempat",
		EvidenceURLs: []string{"http://storage/refunds/fourth.webp"},
	})

	require.Error(t, err)
	require.Contains(t, err.Error(), "maximum refund request attempts reached")
}
