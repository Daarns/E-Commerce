package payment

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestPaymentGatewayConfig_LoadValidConfig tests loading valid config from env
func TestPaymentGatewayConfig_LoadValidConfig(t *testing.T) {
	// Setup environment
	t.Setenv("PAYMENT_GATEWAY_URL", "https://api.sandbox.midtrans.com")
	t.Setenv("PAYMENT_MERCHANT_ID", "G375409122")
	t.Setenv("PAYMENT_CLIENT_KEY", "Mid-client-Chx2Pbo6d5XXd8ZE")
	t.Setenv("PAYMENT_SERVER_KEY", "Mid-server-PLsY8hkHBQLn1z0SedA7ZNDl")

	config, err := LoadPaymentGatewayConfig()

	assert.NoError(t, err)
	assert.NotNil(t, config)
	assert.Equal(t, "https://api.sandbox.midtrans.com", config.GatewayURL)
	assert.Equal(t, "G375409122", config.MerchantID)
	assert.Equal(t, "Mid-client-Chx2Pbo6d5XXd8ZE", config.ClientKey)
	assert.Equal(t, "Mid-server-PLsY8hkHBQLn1z0SedA7ZNDl", config.ServerKey)
}

// TestPaymentGatewayConfig_MissingGatewayURL tests missing gateway URL
func TestPaymentGatewayConfig_MissingGatewayURL(t *testing.T) {
	t.Setenv("PAYMENT_GATEWAY_URL", "")
	t.Setenv("PAYMENT_MERCHANT_ID", "G375409122")
	t.Setenv("PAYMENT_CLIENT_KEY", "Mid-client-test")
	t.Setenv("PAYMENT_SERVER_KEY", "Mid-server-test")

	config, err := LoadPaymentGatewayConfig()

	assert.Error(t, err)
	assert.Nil(t, config)
	assert.Equal(t, "PAYMENT_GATEWAY_URL not set in environment", err.Error())
}

// TestPaymentGatewayConfig_MissingMerchantID tests missing merchant ID
func TestPaymentGatewayConfig_MissingMerchantID(t *testing.T) {
	t.Setenv("PAYMENT_GATEWAY_URL", "https://api.sandbox.midtrans.com")
	t.Setenv("PAYMENT_MERCHANT_ID", "")
	t.Setenv("PAYMENT_CLIENT_KEY", "Mid-client-test")
	t.Setenv("PAYMENT_SERVER_KEY", "Mid-server-test")

	config, err := LoadPaymentGatewayConfig()

	assert.Error(t, err)
	assert.Nil(t, config)
	assert.Equal(t, "PAYMENT_MERCHANT_ID not set in environment", err.Error())
}

// TestPaymentGatewayConfig_MissingClientKey tests missing client key
func TestPaymentGatewayConfig_MissingClientKey(t *testing.T) {
	t.Setenv("PAYMENT_GATEWAY_URL", "https://api.sandbox.midtrans.com")
	t.Setenv("PAYMENT_MERCHANT_ID", "G375409122")
	t.Setenv("PAYMENT_CLIENT_KEY", "")
	t.Setenv("PAYMENT_SERVER_KEY", "Mid-server-test")

	config, err := LoadPaymentGatewayConfig()

	assert.Error(t, err)
	assert.Nil(t, config)
	assert.Equal(t, "PAYMENT_CLIENT_KEY not set in environment", err.Error())
}

// TestPaymentGatewayConfig_MissingServerKey tests missing server key
func TestPaymentGatewayConfig_MissingServerKey(t *testing.T) {
	t.Setenv("PAYMENT_GATEWAY_URL", "https://api.sandbox.midtrans.com")
	t.Setenv("PAYMENT_MERCHANT_ID", "G375409122")
	t.Setenv("PAYMENT_CLIENT_KEY", "Mid-client-test")
	t.Setenv("PAYMENT_SERVER_KEY", "")

	config, err := LoadPaymentGatewayConfig()

	assert.Error(t, err)
	assert.Nil(t, config)
	assert.Equal(t, "PAYMENT_SERVER_KEY not set in environment", err.Error())
}

// TestPaymentGatewayConfig_IsSandbox tests sandbox environment detection
func TestPaymentGatewayConfig_IsSandbox(t *testing.T) {
	t.Setenv("PAYMENT_GATEWAY_URL", "https://api.sandbox.midtrans.com")
	t.Setenv("PAYMENT_MERCHANT_ID", "G375409122")
	t.Setenv("PAYMENT_CLIENT_KEY", "Mid-client-test")
	t.Setenv("PAYMENT_SERVER_KEY", "Mid-server-test")

	config, err := LoadPaymentGatewayConfig()
	require.NoError(t, err)

	assert.True(t, config.IsSandbox())
}

// TestPaymentGatewayConfig_IsProduction tests production environment detection
func TestPaymentGatewayConfig_IsProduction(t *testing.T) {
	t.Setenv("PAYMENT_GATEWAY_URL", "https://api.midtrans.com")
	t.Setenv("PAYMENT_MERCHANT_ID", "G375409122")
	t.Setenv("PAYMENT_CLIENT_KEY", "Mid-client-test")
	t.Setenv("PAYMENT_SERVER_KEY", "Mid-server-test")

	config, err := LoadPaymentGatewayConfig()
	require.NoError(t, err)

	assert.False(t, config.IsSandbox())
}

// TestPaymentGatewayConfig_Validate tests configuration validation
func TestPaymentGatewayConfig_Validate(t *testing.T) {
	tests := []struct {
		name          string
		gatewayURL    string
		clientKey     string
		serverKey     string
		expectedError bool
	}{
		{
			name:          "Valid sandbox config",
			gatewayURL:    "https://api.sandbox.midtrans.com",
			clientKey:     "Mid-client-test",
			serverKey:     "Mid-server-test",
			expectedError: false,
		},
		{
			name:          "Valid production config",
			gatewayURL:    "https://api.midtrans.com",
			clientKey:     "Mid-client-prod",
			serverKey:     "Mid-server-prod",
			expectedError: false,
		},
		{
			name:          "Invalid gateway URL",
			gatewayURL:    "https://invalid.example.com",
			clientKey:     "Mid-client-test",
			serverKey:     "Mid-server-test",
			expectedError: true,
		},
		{
			name:          "Invalid client key format",
			gatewayURL:    "https://api.sandbox.midtrans.com",
			clientKey:     "invalid-key",
			serverKey:     "Mid-server-test",
			expectedError: true,
		},
		{
			name:          "Invalid server key format",
			gatewayURL:    "https://api.sandbox.midtrans.com",
			clientKey:     "Mid-client-test",
			serverKey:     "invalid-key",
			expectedError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			config := &PaymentGatewayConfig{
				GatewayURL: tt.gatewayURL,
				MerchantID: "G375409122",
				ClientKey:  tt.clientKey,
				ServerKey:  tt.serverKey,
			}

			err := config.Validate()

			if tt.expectedError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

// TestPaymentGatewayConfig_GetDisplayConfig tests sensitive key masking
func TestPaymentGatewayConfig_GetDisplayConfig(t *testing.T) {
	config := &PaymentGatewayConfig{
		GatewayURL: "https://api.sandbox.midtrans.com",
		MerchantID: "G375409122",
		ClientKey:  "Mid-client-Chx2Pbo6d5XXd8ZE",
		ServerKey:  "Mid-server-PLsY8hkHBQLn1z0SedA7ZNDl",
	}

	display := config.GetDisplayConfig()

	// Keys should be masked
	assert.Contains(t, display["PAYMENT_CLIENT_KEY"], "...")
	assert.Contains(t, display["PAYMENT_SERVER_KEY"], "...")
	// Gateway URL and merchant ID should not be masked
	assert.Equal(t, "https://api.sandbox.midtrans.com", display["PAYMENT_GATEWAY_URL"])
	assert.Equal(t, "G375409122", display["PAYMENT_MERCHANT_ID"])
	// Should still show first and last parts
	assert.True(t, len(display["PAYMENT_CLIENT_KEY"]) > 0)
	assert.True(t, len(display["PAYMENT_SERVER_KEY"]) > 0)
}

// TestPaymentGatewayConfig_RealSandboxCredentials tests with actual format
func TestPaymentGatewayConfig_RealSandboxCredentials(t *testing.T) {
	// Setup with real sandbox credentials format
	t.Setenv("PAYMENT_GATEWAY_URL", "https://api.sandbox.midtrans.com")
	t.Setenv("PAYMENT_MERCHANT_ID", "G375409122")
	t.Setenv("PAYMENT_CLIENT_KEY", "Mid-client-Chx2Pbo6d5XXd8ZE")
	t.Setenv("PAYMENT_SERVER_KEY", "Mid-server-PLsY8hkHBQLn1z0SedA7ZNDl")

	config, err := LoadPaymentGatewayConfig()
	require.NoError(t, err)

	// Validate all fields loaded correctly
	assert.Equal(t, "https://api.sandbox.midtrans.com", config.GatewayURL)
	assert.Equal(t, "G375409122", config.MerchantID)
	assert.Equal(t, "Mid-client-Chx2Pbo6d5XXd8ZE", config.ClientKey)
	assert.Equal(t, "Mid-server-PLsY8hkHBQLn1z0SedA7ZNDl", config.ServerKey)

	// Validate configuration
	err = config.Validate()
	assert.NoError(t, err)

	// Check sandbox detection
	assert.True(t, config.IsSandbox())
}

// TestPaymentWebhookService_WithRealCredentials tests webhook service with loaded credentials
func TestPaymentWebhookService_WithRealCredentials(t *testing.T) {
	// Setup with real sandbox credentials
	t.Setenv("PAYMENT_GATEWAY_URL", "https://api.sandbox.midtrans.com")
	t.Setenv("PAYMENT_MERCHANT_ID", "G375409122")
	t.Setenv("PAYMENT_CLIENT_KEY", "Mid-client-Chx2Pbo6d5XXd8ZE")
	t.Setenv("PAYMENT_SERVER_KEY", "Mid-server-PLsY8hkHBQLn1z0SedA7ZNDl")

	// Load config
	config, err := LoadPaymentGatewayConfig()
	require.NoError(t, err)

	// Create a simple mock for testing
	// The actual webhook service test is in webhook_handler_test.go with full mocking
	service := NewPaymentWebhookService(nil, config.ServerKey)

	// Verify service was created with correct server key
	assert.NotNil(t, service)
	assert.Equal(t, config.ServerKey, service.serverKey)
}

// TestPaymentGatewayConfig_SwitchEnvironments tests switching between sandbox and production
func TestPaymentGatewayConfig_SwitchEnvironments(t *testing.T) {
	// Test 1: Sandbox environment
	t.Setenv("PAYMENT_GATEWAY_URL", "https://api.sandbox.midtrans.com")
	t.Setenv("PAYMENT_MERCHANT_ID", "G375409122")
	t.Setenv("PAYMENT_CLIENT_KEY", "Mid-client-SB-test")
	t.Setenv("PAYMENT_SERVER_KEY", "Mid-server-SB-test")

	sandboxConfig, err := LoadPaymentGatewayConfig()
	require.NoError(t, err)
	assert.True(t, sandboxConfig.IsSandbox())

	// Test 2: Production environment (override env vars)
	t.Setenv("PAYMENT_GATEWAY_URL", "https://api.midtrans.com")
	t.Setenv("PAYMENT_MERCHANT_ID", "G999999999")
	t.Setenv("PAYMENT_CLIENT_KEY", "Mid-client-PROD-test")
	t.Setenv("PAYMENT_SERVER_KEY", "Mid-server-PROD-test")

	prodConfig, err := LoadPaymentGatewayConfig()
	require.NoError(t, err)
	assert.False(t, prodConfig.IsSandbox())

	// Verify configs are different
	assert.NotEqual(t, sandboxConfig.GatewayURL, prodConfig.GatewayURL)
	assert.NotEqual(t, sandboxConfig.MerchantID, prodConfig.MerchantID)
}

// TestPaymentGatewayConfig_MaskSensitiveData tests that sensitive data is properly masked
func TestPaymentGatewayConfig_MaskSensitiveData(t *testing.T) {
	config := &PaymentGatewayConfig{
		GatewayURL: "https://api.sandbox.midtrans.com",
		MerchantID: "G375409122",
		ClientKey:  "Mid-client-VeryLongKeyHere123456",
		ServerKey:  "Mid-server-VeryLongKeyHere123456",
	}

	display := config.GetDisplayConfig()

	// Verify masking - should show first 10 chars + ... + last 4 chars
	clientKeyDisplay := display["PAYMENT_CLIENT_KEY"]
	serverKeyDisplay := display["PAYMENT_SERVER_KEY"]

	// Check that keys are masked
	assert.Contains(t, clientKeyDisplay, "...")
	assert.Contains(t, serverKeyDisplay, "...")

	// Verify full key is NOT exposed
	assert.NotContains(t, clientKeyDisplay, "VeryLongKeyHere")
	assert.NotContains(t, serverKeyDisplay, "VeryLongKeyHere")

	// Verify we still have readable prefix (first 10 chars)
	assert.True(t, len(clientKeyDisplay) > 0)
	assert.True(t, len(serverKeyDisplay) > 0)
	assert.True(t, len(clientKeyDisplay) < len(config.ClientKey)) // Masked should be shorter
	assert.True(t, len(serverKeyDisplay) < len(config.ServerKey)) // Masked should be shorter
}

