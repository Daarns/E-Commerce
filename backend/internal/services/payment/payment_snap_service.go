package payment

import (
	"ecommerce-backend/internal/models"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/midtrans/midtrans-go"
	"github.com/midtrans/midtrans-go/snap"
	"github.com/shopspring/decimal"
)

// SnapService handles Midtrans Snap payment token creation.
// Snap is the recommended Midtrans integration: backend creates a token,
// frontend loads the Midtrans popup — no need to build payment UI.
type SnapService struct {
	client snap.Client
	config *PaymentGatewayConfig
}

const midtransRequestTimeout = 10 * time.Second

// NewSnapService creates a new SnapService using existing PaymentGatewayConfig.
func NewSnapService(config *PaymentGatewayConfig) *SnapService {
	env := midtrans.Sandbox
	if !config.IsSandbox() {
		env = midtrans.Production
	}

	client := snap.Client{}
	client.New(config.ServerKey, env)
	client.HttpClient = &midtrans.HttpClientImplementation{
		HttpClient: &http.Client{Timeout: midtransRequestTimeout},
		Logger:     midtrans.GetDefaultLogger(env),
	}

	return &SnapService{
		client: client,
		config: config,
	}
}

// SnapResult holds the Snap token and redirect URL returned to the frontend.
type SnapResult struct {
	Token       string `json:"snap_token"`
	RedirectURL string `json:"redirect_url"`
}

// CreateTransaction creates a Midtrans Snap transaction and returns the token.
// The token is passed to window.snap.pay(token) on the frontend.
func (s *SnapService) CreateTransaction(order *models.Order, customerEmail string) (*SnapResult, error) {
	// Build item details — products first, then shipping as a line item
	items := make([]midtrans.ItemDetails, 0, len(order.Items)+1)

	for _, item := range order.Items {
		unitPrice, _ := item.UnitPrice.Float64()
		items = append(items, midtrans.ItemDetails{
			ID:    item.ProductID.String(),
			Name:  truncate(item.ProductName, 50), // Midtrans max 50 chars
			Price: int64(unitPrice),
			Qty:   int32(item.Quantity),
		})
	}

	// Add shipping as a separate line item so gross_amount matches exactly
	if order.ShippingCost.GreaterThan(decimal.Zero) {
		shippingCost, _ := order.ShippingCost.Float64()
		items = append(items, midtrans.ItemDetails{
			ID:    "SHIPPING",
			Name:  fmt.Sprintf("Shipping (%s)", order.ShippingMethod),
			Price: int64(shippingCost),
			Qty:   1,
		})
	}

	// Discount as negative line item so gross_amount stays consistent
	if order.DiscountAmount.GreaterThan(decimal.Zero) {
		discountAmt, _ := order.DiscountAmount.Float64()
		items = append(items, midtrans.ItemDetails{
			ID:    "DISCOUNT",
			Name:  "Promo Discount",
			Price: -int64(discountAmt),
			Qty:   1,
		})
	}

	grossAmount, _ := order.Total.Float64()

	return s.createSnapTransaction(order, customerEmail, order.OrderNumber, items, int64(grossAmount))
}

// CreateRetryTransaction creates a new Snap transaction with a suffixed order_id.
// Used when the original order_id was already registered in Midtrans (e.g. from
// a previous checkout attempt). Webhook handler must strip this suffix to find the order.
func (s *SnapService) CreateRetryTransaction(order *models.Order, customerEmail string, retrySuffix string) (*SnapResult, error) {
	// Build item details same as CreateTransaction
	items := make([]midtrans.ItemDetails, 0, len(order.Items)+1)
	for _, item := range order.Items {
		unitPrice, _ := item.UnitPrice.Float64()
		items = append(items, midtrans.ItemDetails{
			ID:    item.ProductID.String(),
			Name:  truncate(item.ProductName, 50),
			Price: int64(unitPrice),
			Qty:   int32(item.Quantity),
		})
	}
	if order.ShippingCost.GreaterThan(decimal.Zero) {
		sc, _ := order.ShippingCost.Float64()
		items = append(items, midtrans.ItemDetails{
			ID:    "SHIPPING",
			Name:  fmt.Sprintf("Shipping (%s)", order.ShippingMethod),
			Price: int64(sc),
			Qty:   1,
		})
	}
	if order.DiscountAmount.GreaterThan(decimal.Zero) {
		da, _ := order.DiscountAmount.Float64()
		items = append(items, midtrans.ItemDetails{
			ID:    "DISCOUNT",
			Name:  "Promo Discount",
			Price: -int64(da),
			Qty:   1,
		})
	}
	grossAmount, _ := order.Total.Float64()

	// Suffix the order_id so Midtrans treats it as a new transaction.
	// Webhook handler will strip the suffix (everything after last "-r") to find the real order.
	midtransOrderID := order.OrderNumber + "-r" + retrySuffix

	return s.createSnapTransaction(order, customerEmail, midtransOrderID, items, int64(grossAmount))
}

// ClientKey returns the public client key for use in API responses (safe to expose).
func (s *SnapService) ClientKey() string {
	return s.config.ClientKey
}

func (s *SnapService) createSnapTransaction(
	order *models.Order,
	customerEmail string,
	midtransOrderID string,
	items []midtrans.ItemDetails,
	grossAmount int64,
) (*SnapResult, error) {
	frontendURL := strings.TrimRight(s.config.FrontendURL, "/")
	address := map[string]string{
		"first_name":   order.ShippingName,
		"phone":        order.ShippingPhone,
		"address":      formatMidtransShippingAddress(order),
		"city":         order.ShippingCity,
		"postal_code":  order.ShippingPostalCode,
		"country_code": "IDN",
	}

	req := snap.RequestParamWithMap{
		"transaction_details": map[string]interface{}{
			"order_id":     midtransOrderID,
			"gross_amount": grossAmount,
		},
		"customer_details": map[string]interface{}{
			"first_name":       order.ShippingName,
			"phone":            order.ShippingPhone,
			"email":            customerEmail,
			"billing_address":  address,
			"shipping_address": address,
		},
		"item_details": items,
		"enabled_payments": []snap.SnapPaymentType{
			snap.PaymentTypeBankTransfer,
			snap.PaymentTypeGopay,
			snap.PaymentTypeShopeepay,
			snap.PaymentTypeCreditCard,
		},
		"callbacks": map[string]string{
			"finish": fmt.Sprintf(
				"%s/orders?payment=finish&order_id=%s",
				frontendURL,
				url.QueryEscape(order.OrderNumber),
			),
		},
	}

	resp, err := s.client.CreateTransactionWithMap(&req)
	if err != nil {
		return nil, fmt.Errorf("midtrans snap error: %w", err)
	}

	token, _ := resp["token"].(string)
	redirectURL, _ := resp["redirect_url"].(string)
	if token == "" {
		return nil, fmt.Errorf("midtrans snap error: token is missing")
	}

	return &SnapResult{Token: token, RedirectURL: redirectURL}, nil
}

// truncate shortens a string to max characters (Midtrans name field limit).
func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max]
}

func formatMidtransShippingAddress(order *models.Order) string {
	parts := []string{
		strings.TrimSpace(order.ShippingAddressLine1),
		strings.TrimSpace(order.ShippingAddressLine2),
		strings.TrimSpace(order.ShippingProvince),
	}

	nonEmptyParts := make([]string, 0, len(parts))
	for _, part := range parts {
		if part != "" {
			nonEmptyParts = append(nonEmptyParts, part)
		}
	}

	return truncate(strings.Join(nonEmptyParts, ", "), 200)
}
