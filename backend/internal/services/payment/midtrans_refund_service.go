package payment

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/shopspring/decimal"
)

// RefundService sends server-side refund requests to Midtrans.
// The frontend must never call this directly because it requires the server key.
type RefundService struct {
	config *PaymentGatewayConfig
	client *http.Client
}

type RefundRequest struct {
	OrderID   string
	Amount    decimal.Decimal
	Reason    string
	RefundKey string
}

type RefundResult struct {
	StatusCode        string                 `json:"status_code"`
	StatusMessage     string                 `json:"status_message"`
	TransactionID     string                 `json:"transaction_id"`
	OrderID           string                 `json:"order_id"`
	RefundKey         string                 `json:"refund_key"`
	RefundAmount      string                 `json:"refund_amount"`
	Raw               map[string]interface{} `json:"raw"`
}

func NewRefundService(config *PaymentGatewayConfig) *RefundService {
	return &RefundService{
		config: config,
		client: &http.Client{Timeout: 30 * time.Second},
	}
}

func (s *RefundService) Refund(input RefundRequest) (*RefundResult, error) {
	if s == nil || s.config == nil {
		return nil, fmt.Errorf("refund service unavailable")
	}

	orderID := strings.TrimSpace(input.OrderID)
	if orderID == "" {
		return nil, fmt.Errorf("midtrans order id is required")
	}
	if !input.Amount.IsPositive() {
		return nil, fmt.Errorf("refund amount must be greater than zero")
	}

	payload := map[string]interface{}{
		"refund_key": strings.TrimSpace(input.RefundKey),
		"amount":     input.Amount.IntPart(),
		"reason":     strings.TrimSpace(input.Reason),
	}
	if payload["refund_key"] == "" {
		payload["refund_key"] = fmt.Sprintf("refund-%s-%d", orderID, time.Now().Unix())
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to encode refund request: %w", err)
	}

	req, err := http.NewRequest(http.MethodPost, s.refundURL(orderID), bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to create refund request: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Basic "+base64.StdEncoding.EncodeToString([]byte(s.config.ServerKey+":")))

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("midtrans refund request failed: %w", err)
	}
	defer resp.Body.Close()

	var raw map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, fmt.Errorf("failed to decode midtrans refund response: %w", err)
	}

	result := &RefundResult{
		StatusCode:    stringValue(raw["status_code"]),
		StatusMessage: stringValue(raw["status_message"]),
		TransactionID: stringValue(raw["transaction_id"]),
		OrderID:       stringValue(raw["order_id"]),
		RefundKey:     stringValue(raw["refund_key"]),
		RefundAmount:  stringValue(raw["refund_amount"]),
		Raw:           raw,
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return result, fmt.Errorf("midtrans refund failed: %s", result.StatusMessage)
	}
	if result.StatusCode != "" && result.StatusCode != "200" {
		return result, fmt.Errorf("midtrans refund rejected: %s", result.StatusMessage)
	}

	return result, nil
}

func (s *RefundService) refundURL(orderID string) string {
	baseURL := "https://api.midtrans.com"
	if s.config.IsSandbox() {
		baseURL = "https://api.sandbox.midtrans.com"
	}
	return fmt.Sprintf("%s/v2/%s/refund", strings.TrimRight(baseURL, "/"), orderID)
}

func stringValue(value interface{}) string {
	switch typedValue := value.(type) {
	case string:
		return typedValue
	case fmt.Stringer:
		return typedValue.String()
	case nil:
		return ""
	default:
		return fmt.Sprintf("%v", typedValue)
	}
}
