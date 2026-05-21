package features

import (
	"testing"
	"time"

	"ecommerce-backend/internal/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestNewsletterSubscription_CategoryPreferences tests category preference functionality
func TestNewsletterSubscription_CategoryPreferences(t *testing.T) {
	subscription := &models.NewsletterSubscription{
		ID:    uuid.New(),
		Email: "test@example.com",
		Status: models.NewsletterStatusSubscribed,
	}

	// Initially empty
	prefs := subscription.GetCategoryPreferences()
	assert.Equal(t, []string{}, prefs)

	// Set preferences
	categories := []string{"shoes", "apparel", "accessories"}
	subscription.SetCategoryPreferences(categories)

	// Verify set correctly
	assert.Equal(t, categories, subscription.GetCategoryPreferences())
	assert.NotNil(t, subscription.PreferencesUpdatedAt)
}

// TestNewsletterSubscription_HasCategoryPreference tests category preference checking
func TestNewsletterSubscription_HasCategoryPreference(t *testing.T) {
	subscription := &models.NewsletterSubscription{
		ID:    uuid.New(),
		Email: "test@example.com",
		Status: models.NewsletterStatusSubscribed,
	}

	subscription.SetCategoryPreferences([]string{"shoes", "apparel"})

	assert.True(t, subscription.HasCategoryPreference("shoes"))
	assert.True(t, subscription.HasCategoryPreference("apparel"))
	assert.False(t, subscription.HasCategoryPreference("bags"))
}

// TestNewsletterSubscription_IsNotificationsEnabled tests notification enabling
func TestNewsletterSubscription_IsNotificationsEnabled(t *testing.T) {
	tests := []struct {
		name      string
		status    string
		frequency string
		expected  bool
	}{
		{"Subscribed with weekly", models.NewsletterStatusSubscribed, models.NotificationFrequencyWeekly, true},
		{"Subscribed with daily", models.NewsletterStatusSubscribed, models.NotificationFrequencyDaily, true},
		{"Subscribed with never", models.NewsletterStatusSubscribed, models.NotificationFrequencyNever, false},
		{"Pending with weekly", models.NewsletterStatusPendingConfirmation, models.NotificationFrequencyWeekly, false},
		{"Unsubscribed with weekly", models.NewsletterStatusUnsubscribed, models.NotificationFrequencyWeekly, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			subscription := &models.NewsletterSubscription{
				ID:                    uuid.New(),
				Email:                 "test@example.com",
				Status:                tt.status,
				NotificationFrequency: tt.frequency,
			}
			assert.Equal(t, tt.expected, subscription.IsNotificationsEnabled())
		})
	}
}

// TestNewsletterSubscription_CanReceiveNewsletter tests newsletter eligibility
func TestNewsletterSubscription_CanReceiveNewsletter(t *testing.T) {
	tests := []struct {
		name        string
		status      string
		frequency   string
		categories  []string
		canReceive  bool
	}{
		{"Subscribed with preferences", models.NewsletterStatusSubscribed, models.NotificationFrequencyWeekly, []string{"shoes"}, true},
		{"Subscribed no preferences", models.NewsletterStatusSubscribed, models.NotificationFrequencyWeekly, []string{}, false},
		{"Subscribed disabled", models.NewsletterStatusSubscribed, models.NotificationFrequencyNever, []string{"shoes"}, false},
		{"Pending with preferences", models.NewsletterStatusPendingConfirmation, models.NotificationFrequencyWeekly, []string{"shoes"}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			subscription := &models.NewsletterSubscription{
				ID:                    uuid.New(),
				Email:                 "test@example.com",
				Status:                tt.status,
				NotificationFrequency: tt.frequency,
			}
			subscription.SetCategoryPreferences(tt.categories)

			assert.Equal(t, tt.canReceive, subscription.CanReceiveNewsletter())
		})
	}
}

// TestNewsletterSubscription_NotificationFrequencies tests all frequency constants
func TestNewsletterSubscription_NotificationFrequencies(t *testing.T) {
	frequencies := []string{
		models.NotificationFrequencyDaily,
		models.NotificationFrequencyWeekly,
		models.NotificationFrequencyMonthly,
		models.NotificationFrequencyNever,
	}

	assert.Equal(t, "daily", frequencies[0])
	assert.Equal(t, "weekly", frequencies[1])
	assert.Equal(t, "monthly", frequencies[2])
	assert.Equal(t, "never", frequencies[3])
}

// TestCategoryPreferences_Value tests JSONB marshalling
func TestCategoryPreferences_Value(t *testing.T) {
	prefs := models.CategoryPreferences{"shoes", "apparel"}

	val, err := prefs.Value()
	require.NoError(t, err)
	assert.NotNil(t, val)

	// Should be JSON bytes
	bytes, ok := val.([]byte)
	assert.True(t, ok)
	assert.NotEmpty(t, bytes)
}

// TestCategoryPreferences_Scan tests JSONB unmarshalling
func TestCategoryPreferences_Scan(t *testing.T) {
	tests := []struct {
		name      string
		input     interface{}
		expectedLen int
		shouldErr bool
	}{
		{"Valid JSON bytes", []byte(`["shoes","apparel"]`), 2, false},
		{"Empty JSON bytes", []byte(`[]`), 0, false},
		{"Nil value", nil, 0, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var prefs models.CategoryPreferences
			err := prefs.Scan(tt.input)

			if tt.shouldErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectedLen, len(prefs))
			}
		})
	}
}

// TestNewsletterSubscription_PreferencesTimestamp tests preferences update timestamp
func TestNewsletterSubscription_PreferencesTimestamp(t *testing.T) {
	subscription := &models.NewsletterSubscription{
		ID:    uuid.New(),
		Email: "test@example.com",
		Status: models.NewsletterStatusSubscribed,
	}

	assert.Nil(t, subscription.PreferencesUpdatedAt)

	subscription.SetCategoryPreferences([]string{"shoes"})

	assert.NotNil(t, subscription.PreferencesUpdatedAt)
}

// TestNewsletterSubscription_MultipleUpdates tests updating preferences multiple times
func TestNewsletterSubscription_MultipleUpdates(t *testing.T) {
	subscription := &models.NewsletterSubscription{
		ID:    uuid.New(),
		Email: "test@example.com",
		Status: models.NewsletterStatusSubscribed,
	}

	// First update
	subscription.SetCategoryPreferences([]string{"shoes"})
	firstUpdate := subscription.PreferencesUpdatedAt
	time.Sleep(10 * time.Millisecond) // Small delay to ensure time difference

	// Second update
	subscription.SetCategoryPreferences([]string{"apparel", "bags"})
	secondUpdate := subscription.PreferencesUpdatedAt

	assert.Equal(t, []string{"apparel", "bags"}, subscription.GetCategoryPreferences())
	assert.NotNil(t, firstUpdate)
	assert.NotNil(t, secondUpdate)
	// Both should be recent timestamps
	assert.True(t, firstUpdate.Before(*secondUpdate) || firstUpdate.Equal(*secondUpdate))
}

// TestNewsletterSubscription_AllStatusTypes tests all newsletter status constants
func TestNewsletterSubscription_AllStatusTypes(t *testing.T) {
	assert.Equal(t, "subscribed", models.NewsletterStatusSubscribed)
	assert.Equal(t, "pending_confirmation", models.NewsletterStatusPendingConfirmation)
	assert.Equal(t, "unsubscribed", models.NewsletterStatusUnsubscribed)
}

// TestNewsletterSubscription_GetStatusDisplay tests status display
func TestNewsletterSubscription_GetStatusDisplay(t *testing.T) {
	tests := []struct {
		status  string
		display string
	}{
		{models.NewsletterStatusSubscribed, "Subscribed"},
		{models.NewsletterStatusPendingConfirmation, "Pending Confirmation"},
		{models.NewsletterStatusUnsubscribed, "Unsubscribed"},
		{"unknown", "Unknown"},
	}

	for _, tt := range tests {
		t.Run(tt.status, func(t *testing.T) {
			subscription := &models.NewsletterSubscription{Status: tt.status}
			assert.Equal(t, tt.display, subscription.GetStatusDisplay())
		})
	}
}

// TestNewsletterSubscription_IsConfirmed tests confirmation status
func TestNewsletterSubscription_IsConfirmed(t *testing.T) {
	tests := []struct {
		status    string
		confirmed bool
	}{
		{models.NewsletterStatusSubscribed, true},
		{models.NewsletterStatusPendingConfirmation, false},
		{models.NewsletterStatusUnsubscribed, false},
	}

	for _, tt := range tests {
		t.Run(tt.status, func(t *testing.T) {
			subscription := &models.NewsletterSubscription{Status: tt.status}
			assert.Equal(t, tt.confirmed, subscription.IsConfirmed())
		})
	}
}

// BenchmarkNewsletterSubscription_GetCategoryPreferences benchmarks preference retrieval
func BenchmarkNewsletterSubscription_GetCategoryPreferences(b *testing.B) {
	subscription := &models.NewsletterSubscription{
		ID:    uuid.New(),
		Email: "test@example.com",
	}
	subscription.SetCategoryPreferences([]string{"shoes", "apparel", "accessories"})

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		subscription.GetCategoryPreferences()
	}
}

// BenchmarkNewsletterSubscription_HasCategoryPreference benchmarks preference checking
func BenchmarkNewsletterSubscription_HasCategoryPreference(b *testing.B) {
	subscription := &models.NewsletterSubscription{
		ID:    uuid.New(),
		Email: "test@example.com",
	}
	subscription.SetCategoryPreferences([]string{"shoes", "apparel", "accessories", "bags"})

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		subscription.HasCategoryPreference("apparel")
	}
}

// BenchmarkNewsletterSubscription_CanReceiveNewsletter benchmarks eligibility check
func BenchmarkNewsletterSubscription_CanReceiveNewsletter(b *testing.B) {
	subscription := &models.NewsletterSubscription{
		ID:                    uuid.New(),
		Email:                 "test@example.com",
		Status:                models.NewsletterStatusSubscribed,
		NotificationFrequency: models.NotificationFrequencyWeekly,
	}
	subscription.SetCategoryPreferences([]string{"shoes"})

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		subscription.CanReceiveNewsletter()
	}
}

