package payment

import (
	"ecommerce-backend/internal/models"
	"fmt"
	"net/http"
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

	req := &snap.Request{
		TransactionDetails: midtrans.TransactionDetails{
			OrderID:  order.OrderNumber,
			GrossAmt: int64(grossAmount),
		},
		CustomerDetail: &midtrans.CustomerDetails{
			FName: order.ShippingName,
			Phone: order.ShippingPhone,
			Email: customerEmail,
			BillAddr: &midtrans.CustomerAddress{
				FName:    order.ShippingName,
				Phone:    order.ShippingPhone,
				Address:  order.ShippingAddressLine1,
				City:     order.ShippingCity,
				Postcode: order.ShippingPostalCode,
			},
			ShipAddr: &midtrans.CustomerAddress{
				FName:    order.ShippingName,
				Phone:    order.ShippingPhone,
				Address:  order.ShippingAddressLine1,
				City:     order.ShippingCity,
				Postcode: order.ShippingPostalCode,
			},
		},
		Items: &items,
		// Enable payment methods available in Snap
		EnabledPayments: []snap.SnapPaymentType{
			snap.PaymentTypeBankTransfer,
			snap.PaymentTypeGopay,
			snap.PaymentTypeShopeepay,
			snap.PaymentTypeCreditCard,
		},
		Callbacks: &snap.Callbacks{
			Finish: fmt.Sprintf("%s/orders/%s?payment=finish", s.config.GatewayURL, order.OrderNumber),
		},
	}

	resp, err := s.client.CreateTransaction(req)
	if err != nil {
		return nil, fmt.Errorf("midtrans snap error: %w", err)
	}

	return &SnapResult{
		Token:       resp.Token,
		RedirectURL: resp.RedirectURL,
	}, nil
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

	req := &snap.Request{
		TransactionDetails: midtrans.TransactionDetails{
			OrderID:  midtransOrderID,
			GrossAmt: int64(grossAmount),
		},
		CustomerDetail: &midtrans.CustomerDetails{
			FName: order.ShippingName,
			Phone: order.ShippingPhone,
			Email: customerEmail,
			BillAddr: &midtrans.CustomerAddress{
				FName: order.ShippingName, Phone: order.ShippingPhone,
				Address: order.ShippingAddressLine1, City: order.ShippingCity, Postcode: order.ShippingPostalCode,
			},
			ShipAddr: &midtrans.CustomerAddress{
				FName: order.ShippingName, Phone: order.ShippingPhone,
				Address: order.ShippingAddressLine1, City: order.ShippingCity, Postcode: order.ShippingPostalCode,
			},
		},
		Items: &items,
		EnabledPayments: []snap.SnapPaymentType{
			snap.PaymentTypeBankTransfer,
			snap.PaymentTypeGopay,
			snap.PaymentTypeShopeepay,
			snap.PaymentTypeCreditCard,
		},
		Callbacks: &snap.Callbacks{
			Finish: fmt.Sprintf("%s/orders/%s?payment=finish", s.config.GatewayURL, order.OrderNumber),
		},
	}

	resp, err := s.client.CreateTransaction(req)
	if err != nil {
		return nil, fmt.Errorf("midtrans snap error: %w", err)
	}
	return &SnapResult{Token: resp.Token, RedirectURL: resp.RedirectURL}, nil
}

// ClientKey returns the public client key for use in API responses (safe to expose).
func (s *SnapService) ClientKey() string {
	return s.config.ClientKey
}

// truncate shortens a string to max characters (Midtrans name field limit).
func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max]
}
