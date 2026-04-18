package admin

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	"ecommerce-backend/internal/handlers/admin"
	"ecommerce-backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"
)

// ===== MOCKS =====

// MockPromoRepository mocks the promo repository
type MockPromoRepository struct {
	mock.Mock
}

func (m *MockPromoRepository) Create(promo *models.PromoCode) error {
	args := m.Called(promo)
	return args.Error(0)
}

func (m *MockPromoRepository) GetByID(id uuid.UUID) (*models.PromoCode, error) {
	args := m.Called(id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.PromoCode), args.Error(1)
}

func (m *MockPromoRepository) GetByCode(code string) (*models.PromoCode, error) {
	args := m.Called(code)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.PromoCode), args.Error(1)
}

func (m *MockPromoRepository) List(filter repositories.PromoFilter) (*repositories.PromoListResult, error) {
	args := m.Called(filter)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repositories.PromoListResult), args.Error(1)
}

func (m *MockPromoRepository) Update(promo *models.PromoCode) error {
	args := m.Called(promo)
	return args.Error(0)
}

func (m *MockPromoRepository) Delete(id uuid.UUID) error {
	args := m.Called(id)
	return args.Error(0)
}

func (m *MockPromoRepository) IncrementUsage(id uuid.UUID) error {
	args := m.Called(id)
	return args.Error(0)
}

func (m *MockPromoRepository) RecordUsage(usage *models.PromoCodeUsage) error {
	args := m.Called(usage)
	return args.Error(0)
}

func (m *MockPromoRepository) GetUsageCount(promoID uuid.UUID) (int64, error) {
	args := m.Called(promoID)
	return int64(args.Int(0)), args.Error(1)
}

func (m *MockPromoRepository) GetCustomerUsageCount(promoID, customerID uuid.UUID) (int64, error) {
	args := m.Called(promoID, customerID)
	return int64(args.Int(0)), args.Error(1)
}

// ===== TEST HELPERS =====

func createTestPromo() *models.PromoCode {
	limit := 100
	return &models.PromoCode{
		ID:                   uuid.New(),
		Code:                 "SAVE10",
		DiscountType:         "percentage",
		DiscountValue:        decimal.NewFromInt(10),
		UsageLimit:           &limit,
		UsageLimitPerUser:    1,
		MinOrderAmount:       decimal.NewFromInt(50000),
		ValidFrom:            time.Now(),
		ValidTo:              time.Now().AddDate(0, 1, 0),
		IsActive:             true,
		UsageCount:           0,
		ApplicableProducts:   []uuid.UUID{},
		ApplicableCategories: []uuid.UUID{},
		CreatedAt:            time.Now(),
		UpdatedAt:            time.Now(),
	}
}

func createTestPromoInput() utils.CreatePromoInput {
	limit := 50
	maxDiscount := 100.0
	return utils.CreatePromoInput{
		Code:                 "SAVE20",
		DiscountType:         "percentage",
		DiscountValue:        20,
		UsageLimit:           &limit,
		UsageLimitPerUser:    2,
		MinOrderAmount:       100000,
		MaxDiscountAmount:    &maxDiscount,
		ValidFrom:            time.Now().Format(time.RFC3339),
		ValidTo:              time.Now().AddDate(0, 1, 0).Format(time.RFC3339),
		IsActive:             true,
		ApplicableProducts:   []uuid.UUID{},
		ApplicableCategories: []uuid.UUID{},
	}
}

// ===== TESTS: CreatePromoCode =====

func TestCreatePromoCode_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockRepo := new(MockPromoRepository)
	service := utils.NewPromoService(mockRepo)
	handler := admin.NewAdminPromoHandler(service)

	promo := createTestPromo()
	promo.Code = "SAVE20"
	mockRepo.On("Create", mock.MatchedBy(func(p *models.PromoCode) bool {
		return p.Code == "SAVE20"
	})).Return(nil)

	input := createTestPromoInput()
	body, _ := json.Marshal(input)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/v1/admin/promos", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	router := gin.New()
	router.POST("/api/v1/admin/promos", handler.CreatePromoCode)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var response map[string]interface{}
	json.NewDecoder(w.Body).Decode(&response)
	assert.Equal(t, true, response["success"])
	assert.NotNil(t, response["data"])

	mockRepo.AssertExpectations(t)
}

func TestCreatePromoCode_InvalidRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockRepo := new(MockPromoRepository)
	service := utils.NewPromoService(mockRepo)
	handler := admin.NewAdminPromoHandler(service)

	invalidInput := `{"code": "", "discount_type": "invalid"}`

	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/v1/admin/promos", bytes.NewBufferString(invalidInput))
	req.Header.Set("Content-Type", "application/json")

	router := gin.New()
	router.POST("/api/v1/admin/promos", handler.CreatePromoCode)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response map[string]interface{}
	json.NewDecoder(w.Body).Decode(&response)
	assert.Equal(t, false, response["success"])
	assert.NotNil(t, response["error"])
}

// ===== TESTS: GetPromoCode =====

func TestGetPromoCode_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockRepo := new(MockPromoRepository)
	service := utils.NewPromoService(mockRepo)
	handler := admin.NewAdminPromoHandler(service)

	promoID := uuid.New()
	promo := createTestPromo()
	promo.ID = promoID

	mockRepo.On("GetByID", promoID).Return(promo, nil)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/admin/promos/"+promoID.String(), nil)

	router := gin.New()
	router.GET("/api/v1/admin/promos/:id", handler.GetPromoCode)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.NewDecoder(w.Body).Decode(&response)
	assert.Equal(t, true, response["success"])
	assert.NotNil(t, response["data"])

	mockRepo.AssertExpectations(t)
}

func TestGetPromoCode_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockRepo := new(MockPromoRepository)
	service := utils.NewPromoService(mockRepo)
	handler := admin.NewAdminPromoHandler(service)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/admin/promos/invalid-id", nil)

	router := gin.New()
	router.GET("/api/v1/admin/promos/:id", handler.GetPromoCode)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response map[string]interface{}
	json.NewDecoder(w.Body).Decode(&response)
	assert.Equal(t, false, response["success"])
}

func TestGetPromoCode_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockRepo := new(MockPromoRepository)
	service := utils.NewPromoService(mockRepo)
	handler := admin.NewAdminPromoHandler(service)

	promoID := uuid.New()
	mockRepo.On("GetByID", promoID).Return(nil, gorm.ErrRecordNotFound)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/admin/promos/"+promoID.String(), nil)

	router := gin.New()
	router.GET("/api/v1/admin/promos/:id", handler.GetPromoCode)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)

	var response map[string]interface{}
	json.NewDecoder(w.Body).Decode(&response)
	assert.Equal(t, false, response["success"])

	mockRepo.AssertExpectations(t)
}

// ===== TESTS: ListPromoCodes =====

func TestListPromoCodes_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockRepo := new(MockPromoRepository)
	service := utils.NewPromoService(mockRepo)
	handler := admin.NewAdminPromoHandler(service)

	promo1 := *createTestPromo()
	promo2 := *createTestPromo()
	result := &repositories.PromoListResult{
		Promos: []models.PromoCode{promo1, promo2},
		Total:    2,
		Page:     1,
		PageSize: 10,
		TotalPage: 1,
	}

	mockRepo.On("List", mock.AnythingOfType("repositories.PromoFilter")).Return(result, nil)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/admin/promos?page=1&page_size=10", nil)

	router := gin.New()
	router.GET("/api/v1/admin/promos", handler.ListPromoCodes)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.NewDecoder(w.Body).Decode(&response)
	assert.Equal(t, true, response["success"])
	assert.NotNil(t, response["data"])

	mockRepo.AssertExpectations(t)
}

func TestListPromoCodes_WithFilters(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockRepo := new(MockPromoRepository)
	service := utils.NewPromoService(mockRepo)
	handler := admin.NewAdminPromoHandler(service)

	promo := createTestPromo()
	result := &repositories.PromoListResult{
		Promos:    []models.PromoCode{*promo},
		Total:     1,
		Page:      1,
		PageSize:  10,
		TotalPage: 1,
	}

	mockRepo.On("List", mock.MatchedBy(func(f repositories.PromoFilter) bool {
		return f.Code == "SAVE10" && f.IsActive != nil && *f.IsActive == true
	})).Return(result, nil)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/admin/promos?code=SAVE10&is_active=true", nil)

	router := gin.New()
	router.GET("/api/v1/admin/promos", handler.ListPromoCodes)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.NewDecoder(w.Body).Decode(&response)
	assert.Equal(t, true, response["success"])

	mockRepo.AssertExpectations(t)
}

// ===== TESTS: UpdatePromoCode =====

func TestUpdatePromoCode_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockRepo := new(MockPromoRepository)
	service := utils.NewPromoService(mockRepo)
	handler := admin.NewAdminPromoHandler(service)

	promoID := uuid.New()
	promo := createTestPromo()
	promo.ID = promoID

	mockRepo.On("GetByID", promoID).Return(promo, nil)
	mockRepo.On("Update", mock.MatchedBy(func(p *models.PromoCode) bool {
		return p.ID == promoID
	})).Return(nil)

	newValue := 25.0
	input := utils.UpdatePromoInput{
		DiscountValue: &newValue,
		IsActive:      func() *bool { b := false; return &b }(),
	}
	body, _ := json.Marshal(input)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("PUT", "/api/v1/admin/promos/"+promoID.String(), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	router := gin.New()
	router.PUT("/api/v1/admin/promos/:id", handler.UpdatePromoCode)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.NewDecoder(w.Body).Decode(&response)
	assert.Equal(t, true, response["success"])

	mockRepo.AssertExpectations(t)
}

func TestUpdatePromoCode_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockRepo := new(MockPromoRepository)
	service := utils.NewPromoService(mockRepo)
	handler := admin.NewAdminPromoHandler(service)

	newValue := 25.0
	input := utils.UpdatePromoInput{DiscountValue: &newValue}
	body, _ := json.Marshal(input)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("PUT", "/api/v1/admin/promos/invalid-id", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	router := gin.New()
	router.PUT("/api/v1/admin/promos/:id", handler.UpdatePromoCode)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestUpdatePromoCode_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockRepo := new(MockPromoRepository)
	service := utils.NewPromoService(mockRepo)
	handler := admin.NewAdminPromoHandler(service)

	promoID := uuid.New()
	mockRepo.On("GetByID", promoID).Return(nil, gorm.ErrRecordNotFound)

	newValue := 25.0
	input := utils.UpdatePromoInput{DiscountValue: &newValue}
	body, _ := json.Marshal(input)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("PUT", "/api/v1/admin/promos/"+promoID.String(), bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	router := gin.New()
	router.PUT("/api/v1/admin/promos/:id", handler.UpdatePromoCode)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	mockRepo.AssertExpectations(t)
}

// ===== TESTS: DeletePromoCode =====

func TestDeletePromoCode_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockRepo := new(MockPromoRepository)
	service := utils.NewPromoService(mockRepo)
	handler := admin.NewAdminPromoHandler(service)

	promoID := uuid.New()
	promo := createTestPromo()
	promo.ID = promoID
	
	mockRepo.On("GetByID", promoID).Return(promo, nil)
	mockRepo.On("Delete", promoID).Return(nil)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("DELETE", "/api/v1/admin/promos/"+promoID.String(), nil)

	router := gin.New()
	router.DELETE("/api/v1/admin/promos/:id", handler.DeletePromoCode)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.NewDecoder(w.Body).Decode(&response)
	assert.Equal(t, true, response["success"])

	mockRepo.AssertExpectations(t)
}

func TestDeletePromoCode_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockRepo := new(MockPromoRepository)
	service := utils.NewPromoService(mockRepo)
	handler := admin.NewAdminPromoHandler(service)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("DELETE", "/api/v1/admin/promos/invalid-id", nil)

	router := gin.New()
	router.DELETE("/api/v1/admin/promos/:id", handler.DeletePromoCode)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestDeletePromoCode_NotFound(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockRepo := new(MockPromoRepository)
	service := utils.NewPromoService(mockRepo)
	handler := admin.NewAdminPromoHandler(service)

	promoID := uuid.New()
	mockRepo.On("GetByID", promoID).Return(nil, gorm.ErrRecordNotFound)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("DELETE", "/api/v1/admin/promos/"+promoID.String(), nil)

	router := gin.New()
	router.DELETE("/api/v1/admin/promos/:id", handler.DeletePromoCode)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)

	mockRepo.AssertExpectations(t)
}




