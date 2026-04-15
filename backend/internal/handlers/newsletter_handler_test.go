package handlers

import (
	"bytes"
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/services"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

// MockNewsletterRepository implements NewsletterRepositoryInterface for testing
type MockNewsletterRepository struct {
	mock.Mock
}

func (m *MockNewsletterRepository) Create(subscription *models.NewsletterSubscription) error {
	args := m.Called(subscription)
	return args.Error(0)
}

func (m *MockNewsletterRepository) GetByEmail(email string) (*models.NewsletterSubscription, error) {
	args := m.Called(email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.NewsletterSubscription), args.Error(1)
}

func (m *MockNewsletterRepository) GetByID(id uuid.UUID) (*models.NewsletterSubscription, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.NewsletterSubscription), args.Error(1)
}

func (m *MockNewsletterRepository) GetByConfirmationToken(token string) (*models.NewsletterSubscription, error) {
	args := m.Called(token)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.NewsletterSubscription), args.Error(1)
}

func (m *MockNewsletterRepository) GetByUnsubscribeToken(token string) (*models.NewsletterSubscription, error) {
	args := m.Called(token)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.NewsletterSubscription), args.Error(1)
}

func (m *MockNewsletterRepository) IsSubscribed(email string) (bool, error) {
	args := m.Called(email)
	return args.Bool(0), args.Error(1)
}

func (m *MockNewsletterRepository) IsPendingConfirmation(email string) (bool, error) {
	args := m.Called(email)
	return args.Bool(0), args.Error(1)
}

func (m *MockNewsletterRepository) ConfirmSubscription(email string) error {
	args := m.Called(email)
	return args.Error(0)
}

func (m *MockNewsletterRepository) Unsubscribe(email string) error {
	args := m.Called(email)
	return args.Error(0)
}

func (m *MockNewsletterRepository) Update(subscription *models.NewsletterSubscription) error {
	args := m.Called(subscription)
	return args.Error(0)
}

func (m *MockNewsletterRepository) Delete(id uuid.UUID) error {
	args := m.Called(id)
	return args.Error(0)
}

func (m *MockNewsletterRepository) GetAllSubscribed(limit, offset int) ([]models.NewsletterSubscription, error) {
	args := m.Called(limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.NewsletterSubscription), args.Error(1)
}

func (m *MockNewsletterRepository) GetSubscribedCount() (int64, error) {
	args := m.Called()
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockNewsletterRepository) CleanupExpiredTokens() error {
	args := m.Called()
	return args.Error(0)
}

// Helper to create test subscription
func createTestSubscription(email, status string) *models.NewsletterSubscription {
	id := uuid.New()
	return &models.NewsletterSubscription{
		ID:        id,
		Email:     email,
		Status:    status,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}

// Email Validation Tests
func TestEmailValidation_ValidFormats(t *testing.T) {
	mockRepo := new(MockNewsletterRepository)
	service := services.NewNewsletterService(mockRepo)

	validEmails := []string{
		"user@example.com",
		"john.doe@example.co.uk",
		"user+tag@example.com",
		"user123@subdomain.example.com",
		"user@mail.local.dev",
	}

	for _, email := range validEmails {
		t.Run(email, func(t *testing.T) {
			err := service.ValidateEmail(email)
			assert.NoError(t, err, "email should be valid: %s", email)
		})
	}
}

func TestEmailValidation_InvalidFormats(t *testing.T) {
	mockRepo := new(MockNewsletterRepository)
	service := services.NewNewsletterService(mockRepo)

	invalidEmails := []string{
		"",
		"invalid",
		"invalid@",
		"@example.com",
		"user @example.com",
		"user@.com",
		"user..name@example.com",
		"user@example",
	}

	for _, email := range invalidEmails {
		t.Run(email, func(t *testing.T) {
			err := service.ValidateEmail(email)
			assert.Error(t, err, "email should be invalid: %s", email)
		})
	}
}

// Subscription Workflow Tests
func TestSubscribe_Success(t *testing.T) {
	mockRepo := new(MockNewsletterRepository)
	service := services.NewNewsletterService(mockRepo)

	email := "user@example.com"
	mockRepo.On("IsSubscribed", email).Return(false, nil)
	mockRepo.On("IsPendingConfirmation", email).Return(false, nil)
	mockRepo.On("Create", mock.MatchedBy(func(s *models.NewsletterSubscription) bool {
		return s.Email == email && s.Status == models.NewsletterStatusPendingConfirmation
	})).Return(nil)

	result, err := service.Subscribe(email)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.True(t, result.Success)
	assert.Equal(t, models.NewsletterStatusPendingConfirmation, result.Status)
	mockRepo.AssertExpectations(t)
}

func TestSubscribe_AlreadySubscribed(t *testing.T) {
	mockRepo := new(MockNewsletterRepository)
	service := services.NewNewsletterService(mockRepo)

	email := "user@example.com"
	mockRepo.On("IsSubscribed", email).Return(true, nil)

	result, err := service.Subscribe(email)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "already subscribed")
}

func TestSubscribe_PendingConfirmation(t *testing.T) {
	mockRepo := new(MockNewsletterRepository)
	service := services.NewNewsletterService(mockRepo)

	email := "user@example.com"
	mockRepo.On("IsSubscribed", email).Return(false, nil)
	mockRepo.On("IsPendingConfirmation", email).Return(true, nil)

	result, err := service.Subscribe(email)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "confirmation email already sent")
}

func TestConfirmSubscription_Success(t *testing.T) {
	mockRepo := new(MockNewsletterRepository)
	service := services.NewNewsletterService(mockRepo)

	token := uuid.New().String()
	expiresAt := time.Now().Add(1 * time.Hour)
	subscription := &models.NewsletterSubscription{
		Email:                     "user@example.com",
		Status:                    models.NewsletterStatusPendingConfirmation,
		ConfirmationToken:         &token,
		ConfirmationTokenExpiresAt: &expiresAt,
	}

	mockRepo.On("GetByConfirmationToken", token).Return(subscription, nil)
	mockRepo.On("ConfirmSubscription", "user@example.com").Return(nil)

	result, err := service.ConfirmSubscription(token)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.True(t, result.Success)
	assert.Equal(t, models.NewsletterStatusSubscribed, result.Status)
}

func TestConfirmSubscription_ExpiredToken(t *testing.T) {
	mockRepo := new(MockNewsletterRepository)
	service := services.NewNewsletterService(mockRepo)

	token := uuid.New().String()
	expiresAt := time.Now().Add(-1 * time.Hour) // Expired
	subscription := &models.NewsletterSubscription{
		Email:                     "user@example.com",
		Status:                    models.NewsletterStatusPendingConfirmation,
		ConfirmationToken:         &token,
		ConfirmationTokenExpiresAt: &expiresAt,
	}

	mockRepo.On("GetByConfirmationToken", token).Return(subscription, nil)

	result, err := service.ConfirmSubscription(token)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "expired")
}

func TestUnsubscribe_Success(t *testing.T) {
	mockRepo := new(MockNewsletterRepository)
	service := services.NewNewsletterService(mockRepo)

	email := "user@example.com"
	subscription := createTestSubscription(email, models.NewsletterStatusSubscribed)

	mockRepo.On("GetByEmail", email).Return(subscription, nil)
	mockRepo.On("Unsubscribe", email).Return(nil)

	result, err := service.Unsubscribe(email)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.True(t, result.Success)
}

func TestUnsubscribe_NotFound(t *testing.T) {
	mockRepo := new(MockNewsletterRepository)
	service := services.NewNewsletterService(mockRepo)

	email := "notfound@example.com"
	mockRepo.On("GetByEmail", email).Return(nil, models.ErrOrderNotFound)

	result, err := service.Unsubscribe(email)

	assert.Error(t, err)
	assert.Nil(t, result)
}

// HTTP Handler Tests
func TestNewsletterHandler_Subscribe_Valid(t *testing.T) {
	gin.SetMode(gin.TestMode)
	mockRepo := new(MockNewsletterRepository)
	service := services.NewNewsletterService(mockRepo)
	handler := NewNewsletterHandler(service)

	email := "user@example.com"
	mockRepo.On("IsSubscribed", email).Return(false, nil)
	mockRepo.On("IsPendingConfirmation", email).Return(false, nil)
	mockRepo.On("Create", mock.MatchedBy(func(s *models.NewsletterSubscription) bool {
		return s.Email == email
	})).Return(nil)

	req := services.SubscribeRequest{Email: email}
	body, err := json.Marshal(req)
	require.NoError(t, err)

	w := httptest.NewRecorder()
	httpReq, err := http.NewRequest("POST", "/api/v1/newsletters/subscribe", bytes.NewBuffer(body))
	require.NoError(t, err)
	httpReq.Header.Set("Content-Type", "application/json")

	router := gin.New()
	router.POST("/api/v1/newsletters/subscribe", handler.HandleSubscribe)
	router.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestNewsletterHandler_Subscribe_InvalidEmail(t *testing.T) {
	gin.SetMode(gin.TestMode)
	mockRepo := new(MockNewsletterRepository)
	service := services.NewNewsletterService(mockRepo)
	handler := NewNewsletterHandler(service)

	req := services.SubscribeRequest{Email: "invalid-email"}
	body, err := json.Marshal(req)
	require.NoError(t, err)

	w := httptest.NewRecorder()
	httpReq, err := http.NewRequest("POST", "/api/v1/newsletters/subscribe", bytes.NewBuffer(body))
	require.NoError(t, err)
	httpReq.Header.Set("Content-Type", "application/json")

	router := gin.New()
	router.POST("/api/v1/newsletters/subscribe", handler.HandleSubscribe)
	router.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestNewsletterHandler_Confirm_Valid(t *testing.T) {
	gin.SetMode(gin.TestMode)
	mockRepo := new(MockNewsletterRepository)
	service := services.NewNewsletterService(mockRepo)
	handler := NewNewsletterHandler(service)

	token := uuid.New().String()
	expiresAt := time.Now().Add(1 * time.Hour)
	subscription := &models.NewsletterSubscription{
		Email:                     "user@example.com",
		Status:                    models.NewsletterStatusPendingConfirmation,
		ConfirmationToken:         &token,
		ConfirmationTokenExpiresAt: &expiresAt,
	}

	mockRepo.On("GetByConfirmationToken", token).Return(subscription, nil)
	mockRepo.On("ConfirmSubscription", "user@example.com").Return(nil)

	w := httptest.NewRecorder()
	httpReq, err := http.NewRequest("POST", "/api/v1/newsletters/confirm/"+token, nil)
	require.NoError(t, err)

	router := gin.New()
	router.POST("/api/v1/newsletters/confirm/:token", handler.HandleConfirm)
	router.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestNewsletterHandler_Unsubscribe_Valid(t *testing.T) {
	gin.SetMode(gin.TestMode)
	mockRepo := new(MockNewsletterRepository)
	service := services.NewNewsletterService(mockRepo)
	handler := NewNewsletterHandler(service)

	email := "user@example.com"
	subscription := createTestSubscription(email, models.NewsletterStatusSubscribed)

	mockRepo.On("GetByEmail", email).Return(subscription, nil)
	mockRepo.On("Unsubscribe", email).Return(nil)

	req := services.UnsubscribeRequest{Email: email}
	body, err := json.Marshal(req)
	require.NoError(t, err)

	w := httptest.NewRecorder()
	httpReq, err := http.NewRequest("POST", "/api/v1/newsletters/unsubscribe", bytes.NewBuffer(body))
	require.NoError(t, err)
	httpReq.Header.Set("Content-Type", "application/json")

	router := gin.New()
	router.POST("/api/v1/newsletters/unsubscribe", handler.HandleUnsubscribe)
	router.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestNewsletterHandler_GetStatus_Valid(t *testing.T) {
	gin.SetMode(gin.TestMode)
	mockRepo := new(MockNewsletterRepository)
	service := services.NewNewsletterService(mockRepo)
	handler := NewNewsletterHandler(service)

	email := "user@example.com"
	subscription := createTestSubscription(email, models.NewsletterStatusSubscribed)

	mockRepo.On("GetByEmail", email).Return(subscription, nil)

	w := httptest.NewRecorder()
	httpReq, err := http.NewRequest("GET", "/api/v1/newsletters/status/"+email, nil)
	require.NoError(t, err)

	router := gin.New()
	router.GET("/api/v1/newsletters/status/:email", handler.HandleGetStatus)
	router.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusOK, w.Code)
	var response map[string]interface{}
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Equal(t, true, response["success"])
}
