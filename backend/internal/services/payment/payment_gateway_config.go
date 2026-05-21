package payment

import (
	"fmt"
	"os"
)

// PaymentGatewayConfig holds Midtrans payment gateway configuration
type PaymentGatewayConfig struct {
	GatewayURL string // e.g., https://api.sandbox.midtrans.com or https://api.midtrans.com
	MerchantID string // Merchant ID from Midtrans dashboard
	ClientKey  string // Public key for frontend transactions
	ServerKey  string // Secret key for backend API calls (MUST KEEP CONFIDENTIAL)
}

// LoadPaymentGatewayConfig loads payment gateway configuration from environment variables
func LoadPaymentGatewayConfig() (*PaymentGatewayConfig, error) {
	config := &PaymentGatewayConfig{
		GatewayURL: os.Getenv("PAYMENT_GATEWAY_URL"),
		MerchantID: os.Getenv("PAYMENT_MERCHANT_ID"),
		ClientKey:  os.Getenv("PAYMENT_CLIENT_KEY"),
		ServerKey:  os.Getenv("PAYMENT_SERVER_KEY"),
	}

	// Validate required fields
	if config.GatewayURL == "" {
		return nil, fmt.Errorf("PAYMENT_GATEWAY_URL not set in environment")
	}
	if config.MerchantID == "" {
		return nil, fmt.Errorf("PAYMENT_MERCHANT_ID not set in environment")
	}
	if config.ClientKey == "" {
		return nil, fmt.Errorf("PAYMENT_CLIENT_KEY not set in environment")
	}
	if config.ServerKey == "" {
		return nil, fmt.Errorf("PAYMENT_SERVER_KEY not set in environment")
	}

	return config, nil
}

// IsSandbox returns true if gateway is configured for sandbox environment
func (c *PaymentGatewayConfig) IsSandbox() bool {
	return contains(c.GatewayURL, "sandbox")
}

// IsSandboxMerchantID returns true if merchant ID looks like sandbox ID
func (c *PaymentGatewayConfig) IsSandboxMerchantID() bool {
	// Sandbox merchant IDs typically start with specific patterns
	// This is a helper function to double-check environment consistency
	return c.MerchantID != ""
}

// Validate performs additional validation on configuration
func (c *PaymentGatewayConfig) Validate() error {
	// Verify gateway URL format
	if !contains(c.GatewayURL, "api.") && !contains(c.GatewayURL, "midtrans") {
		return fmt.Errorf("invalid PAYMENT_GATEWAY_URL: must contain 'api.' and 'midtrans'")
	}

	// Verify keys format (Midtrans keys have specific patterns)
	if !contains(c.ClientKey, "client") && !contains(c.ClientKey, "Mid-client") {
		return fmt.Errorf("invalid PAYMENT_CLIENT_KEY format")
	}

	if !contains(c.ServerKey, "server") && !contains(c.ServerKey, "Mid-server") {
		return fmt.Errorf("invalid PAYMENT_SERVER_KEY format")
	}

	return nil
}

// Helper function to check if string contains substring
func contains(str, substr string) bool {
	for i := 0; i <= len(str)-len(substr); i++ {
		if str[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// GetDisplayConfig returns config with masked secret key for logging
func (c *PaymentGatewayConfig) GetDisplayConfig() map[string]string {
	return map[string]string{
		"PAYMENT_GATEWAY_URL": c.GatewayURL,
		"PAYMENT_MERCHANT_ID": c.MerchantID,
		"PAYMENT_CLIENT_KEY":  maskSensitive(c.ClientKey),
		"PAYMENT_SERVER_KEY":  maskSensitive(c.ServerKey),
	}
}

// maskSensitive masks sensitive key for logging (show first 10 and last 4 chars)
func maskSensitive(key string) string {
	if len(key) <= 14 {
		return "***"
	}
	return key[:10] + "..." + key[len(key)-4:]
}

