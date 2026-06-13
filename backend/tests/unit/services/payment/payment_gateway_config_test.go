package payment_test

import (
	"testing"

	"ecommerce-backend/internal/services/payment"

	"github.com/stretchr/testify/require"
)

func setValidPaymentEnvironment(t *testing.T) {
	t.Helper()
	t.Setenv("PAYMENT_GATEWAY_URL", "https://api.sandbox.midtrans.com")
	t.Setenv("PAYMENT_MERCHANT_ID", "TEST-MERCHANT")
	t.Setenv("PAYMENT_CLIENT_KEY", "Mid-client-test-value")
	t.Setenv("PAYMENT_SERVER_KEY", "Mid-server-test-value")
	t.Setenv("APP_URL", "http://localhost:3000")
}

func TestLoadPaymentGatewayConfig(t *testing.T) {
	setValidPaymentEnvironment(t)

	config, err := payment.LoadPaymentGatewayConfig()
	require.NoError(t, err)
	require.True(t, config.IsSandbox())
	require.Equal(t, "http://localhost:3000", config.FrontendURL)
	require.NoError(t, config.Validate())
}

func TestLoadPaymentGatewayConfigRejectsMissingSecret(t *testing.T) {
	setValidPaymentEnvironment(t)
	t.Setenv("PAYMENT_SERVER_KEY", "")

	config, err := payment.LoadPaymentGatewayConfig()
	require.Error(t, err)
	require.Nil(t, config)
}

func TestPaymentGatewayDisplayConfigMasksKeys(t *testing.T) {
	setValidPaymentEnvironment(t)

	config, err := payment.LoadPaymentGatewayConfig()
	require.NoError(t, err)
	display := config.GetDisplayConfig()

	require.NotContains(t, display["PAYMENT_SERVER_KEY"], config.ServerKey)
	require.NotContains(t, display["PAYMENT_CLIENT_KEY"], config.ClientKey)
	require.Contains(t, display["PAYMENT_SERVER_KEY"], "...")
}

func TestPaymentGatewayConfigRejectsInvalidKeyFormat(t *testing.T) {
	config := &payment.PaymentGatewayConfig{
		GatewayURL: "https://api.sandbox.midtrans.com",
		MerchantID: "TEST-MERCHANT",
		ClientKey:  "invalid",
		ServerKey:  "invalid",
	}

	require.Error(t, config.Validate())
}
