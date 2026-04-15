package jwt

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGenerateAccessToken(t *testing.T) {
	manager := NewManager(Config{
		SecretKey:            "test-secret-key-32-characters-long!",
		AccessTokenDuration:  15 * time.Minute,
		RefreshTokenDuration: 7 * 24 * time.Hour,
	})

	userID := uuid.New()
	email := "test@example.com"
	role := "user"

	token, err := manager.GenerateAccessToken(userID, email, role)
	require.NoError(t, err)
	assert.NotEmpty(t, token)
	assert.NotEqual(t, "", token)
}

func TestGenerateRefreshToken(t *testing.T) {
	manager := NewManager(Config{
		SecretKey:            "test-secret-key-32-characters-long!",
		AccessTokenDuration:  15 * time.Minute,
		RefreshTokenDuration: 7 * 24 * time.Hour,
	})

	token := manager.GenerateRefreshToken()
	assert.NotEmpty(t, token)
	// Refresh token should be a valid UUID
	_, err := uuid.Parse(token)
	assert.NoError(t, err)
}

func TestValidateToken_Valid(t *testing.T) {
	manager := NewManager(Config{
		SecretKey:            "test-secret-key-32-characters-long!",
		AccessTokenDuration:  15 * time.Minute,
		RefreshTokenDuration: 7 * 24 * time.Hour,
	})

	userID := uuid.New()
	email := "test@example.com"
	role := "admin"

	// Generate token
	token, err := manager.GenerateAccessToken(userID, email, role)
	require.NoError(t, err)

	// Validate token
	claims, err := manager.ValidateToken(token)
	require.NoError(t, err)
	assert.Equal(t, userID, claims.UserID)
	assert.Equal(t, email, claims.Email)
	assert.Equal(t, role, claims.Role)
}

func TestValidateToken_InvalidToken(t *testing.T) {
	manager := NewManager(Config{
		SecretKey:            "test-secret-key-32-characters-long!",
		AccessTokenDuration:  15 * time.Minute,
		RefreshTokenDuration: 7 * 24 * time.Hour,
	})

	_, err := manager.ValidateToken("invalid-token")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to parse token")
}

func TestValidateToken_WrongSecret(t *testing.T) {
	manager1 := NewManager(Config{
		SecretKey:            "test-secret-key-32-characters-long!",
		AccessTokenDuration:  15 * time.Minute,
		RefreshTokenDuration: 7 * 24 * time.Hour,
	})

	manager2 := NewManager(Config{
		SecretKey:            "different-secret-key-32-chars-!!!",
		AccessTokenDuration:  15 * time.Minute,
		RefreshTokenDuration: 7 * 24 * time.Hour,
	})

	userID := uuid.New()
	email := "test@example.com"
	role := "user"

	// Generate token with manager1
	token, err := manager1.GenerateAccessToken(userID, email, role)
	require.NoError(t, err)

	// Try to validate with manager2 (different secret)
	_, err = manager2.ValidateToken(token)
	assert.Error(t, err)
}

func TestTokenExpiry(t *testing.T) {
	shortExpiry := 1 * time.Millisecond
	manager := NewManager(Config{
		SecretKey:            "test-secret-key-32-characters-long!",
		AccessTokenDuration:  shortExpiry,
		RefreshTokenDuration: 7 * 24 * time.Hour,
	})

	userID := uuid.New()
	email := "test@example.com"
	role := "user"

	// Generate token
	token, err := manager.GenerateAccessToken(userID, email, role)
	require.NoError(t, err)

	// Wait for token to expire
	time.Sleep(10 * time.Millisecond)

	// Try to validate expired token
	_, err = manager.ValidateToken(token)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "token is expired")
}

func TestGetAccessTokenExpiry(t *testing.T) {
	expiry := 30 * time.Minute
	manager := NewManager(Config{
		SecretKey:            "test-secret-key-32-characters-long!",
		AccessTokenDuration:  expiry,
		RefreshTokenDuration: 7 * 24 * time.Hour,
	})

	assert.Equal(t, expiry, manager.GetAccessTokenExpiry())
}

func TestGetRefreshTokenExpiry(t *testing.T) {
	expiry := 14 * 24 * time.Hour
	manager := NewManager(Config{
		SecretKey:            "test-secret-key-32-characters-long!",
		AccessTokenDuration:  15 * time.Minute,
		RefreshTokenDuration: expiry,
	})

	assert.Equal(t, expiry, manager.GetRefreshTokenExpiry())
}

func TestConfigWithDifferentExpiryValues(t *testing.T) {
	tests := []struct {
		name             string
		accessExpiry     time.Duration
		refreshExpiry    time.Duration
		expectedAccess   time.Duration
		expectedRefresh  time.Duration
	}{
		{
			name:            "default values",
			accessExpiry:    15 * time.Minute,
			refreshExpiry:   7 * 24 * time.Hour,
			expectedAccess:  15 * time.Minute,
			expectedRefresh: 7 * 24 * time.Hour,
		},
		{
			name:            "short access token",
			accessExpiry:    5 * time.Minute,
			refreshExpiry:   24 * time.Hour,
			expectedAccess:  5 * time.Minute,
			expectedRefresh: 24 * time.Hour,
		},
		{
			name:            "long refresh token",
			accessExpiry:    30 * time.Minute,
			refreshExpiry:   30 * 24 * time.Hour,
			expectedAccess:  30 * time.Minute,
			expectedRefresh: 30 * 24 * time.Hour,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			manager := NewManager(Config{
				SecretKey:            "test-secret-key-32-characters-long!",
				AccessTokenDuration:  tt.accessExpiry,
				RefreshTokenDuration: tt.refreshExpiry,
			})

			assert.Equal(t, tt.expectedAccess, manager.GetAccessTokenExpiry())
			assert.Equal(t, tt.expectedRefresh, manager.GetRefreshTokenExpiry())
		})
	}
}
