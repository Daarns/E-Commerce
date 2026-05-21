package product

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	"ecommerce-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// ===== MOCKS =====

// MockProductRepository mocks product repository interface
type MockProductRepository struct {
	mock.Mock
}

func (m *MockProductRepository) GetFeaturedProducts(limit int) ([]models.Product, error) {
	args := m.Called(limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.Product), args.Error(1)
}

func (m *MockProductRepository) GetBestSellers(limit int) ([]models.Product, error) {
	args := m.Called(limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.Product), args.Error(1)
}

func (m *MockProductRepository) GetNewArrivals(limit int) ([]models.Product, error) {
	args := m.Called(limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.Product), args.Error(1)
}

// MockCategoryRepository mocks category repository interface
type MockCategoryRepository struct {
	mock.Mock
}

func (m *MockCategoryRepository) GetCategoryTree() ([]repositories.CategoryTreeNode, error) {
	args := m.Called()
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]repositories.CategoryTreeNode), args.Error(1)
}

// ===== TEST HELPERS =====

func createTestProductForDiscovery() models.Product {
	return models.Product{
		ID:            uuid.New(),
		Name:          "Test Product",
		Slug:          "test-product",
		SKU:           "SKU001",
		RegularPrice:  decimal.NewFromFloat(99.99),
		Status:        "active",
		StockQuantity: 10,
		SoldCount:     5,
		Images:        []models.ProductImage{},
	}
}

// ===== TESTS: GetFeaturedProducts =====

func TestDiscoveryGetFeaturedProducts_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockProductRepo := new(MockProductRepository)
	mockCategoryRepo := new(MockCategoryRepository)
	cacheService := services.NewCacheService()
	discoveryService := services.NewDiscoveryService(mockProductRepo, mockCategoryRepo, cacheService)
	handler := NewDiscoveryHandler(discoveryService)

	product := createTestProductForDiscovery()
	mockProductRepo.On("GetFeaturedProducts", 8).Return([]models.Product{product}, nil)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/discovery/featured", nil)

	router := gin.New()
	router.GET("/api/v1/discovery/featured", handler.GetFeaturedProducts)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.NewDecoder(w.Body).Decode(&response)
	assert.Equal(t, true, response["success"])
	assert.NotNil(t, response["data"])

	mockProductRepo.AssertExpectations(t)
}

func TestDiscoveryGetFeaturedProducts_WithLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockProductRepo := new(MockProductRepository)
	mockCategoryRepo := new(MockCategoryRepository)
	cacheService := services.NewCacheService()
	discoveryService := services.NewDiscoveryService(mockProductRepo, mockCategoryRepo, cacheService)
	handler := NewDiscoveryHandler(discoveryService)

	product := createTestProductForDiscovery()
	mockProductRepo.On("GetFeaturedProducts", 16).Return([]models.Product{product}, nil)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/discovery/featured?limit=16", nil)

	router := gin.New()
	router.GET("/api/v1/discovery/featured", handler.GetFeaturedProducts)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.NewDecoder(w.Body).Decode(&response)
	assert.Equal(t, true, response["success"])

	mockProductRepo.AssertExpectations(t)
}

// ===== TESTS: GetBestSellers =====

func TestDiscoveryGetBestSellers_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockProductRepo := new(MockProductRepository)
	mockCategoryRepo := new(MockCategoryRepository)
	cacheService := services.NewCacheService()
	discoveryService := services.NewDiscoveryService(mockProductRepo, mockCategoryRepo, cacheService)
	handler := NewDiscoveryHandler(discoveryService)

	product := createTestProductForDiscovery()
	product.SoldCount = 150
	mockProductRepo.On("GetBestSellers", 8).Return([]models.Product{product}, nil)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/discovery/bestsellers", nil)

	router := gin.New()
	router.GET("/api/v1/discovery/bestsellers", handler.GetBestSellers)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.NewDecoder(w.Body).Decode(&response)
	assert.Equal(t, true, response["success"])
	assert.NotNil(t, response["data"])

	mockProductRepo.AssertExpectations(t)
}

func TestDiscoveryGetBestSellers_WithLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockProductRepo := new(MockProductRepository)
	mockCategoryRepo := new(MockCategoryRepository)
	cacheService := services.NewCacheService()
	discoveryService := services.NewDiscoveryService(mockProductRepo, mockCategoryRepo, cacheService)
	handler := NewDiscoveryHandler(discoveryService)

	product := createTestProductForDiscovery()
	mockProductRepo.On("GetBestSellers", 12).Return([]models.Product{product}, nil)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/discovery/bestsellers?limit=12", nil)

	router := gin.New()
	router.GET("/api/v1/discovery/bestsellers", handler.GetBestSellers)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.NewDecoder(w.Body).Decode(&response)
	assert.Equal(t, true, response["success"])

	mockProductRepo.AssertExpectations(t)
}

// ===== TESTS: GetNewArrivals =====

func TestDiscoveryGetNewArrivals_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockProductRepo := new(MockProductRepository)
	mockCategoryRepo := new(MockCategoryRepository)
	cacheService := services.NewCacheService()
	discoveryService := services.NewDiscoveryService(mockProductRepo, mockCategoryRepo, cacheService)
	handler := NewDiscoveryHandler(discoveryService)

	product := createTestProductForDiscovery()
	mockProductRepo.On("GetNewArrivals", 8).Return([]models.Product{product}, nil)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/discovery/new-arrivals", nil)

	router := gin.New()
	router.GET("/api/v1/discovery/new-arrivals", handler.GetNewArrivals)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.NewDecoder(w.Body).Decode(&response)
	assert.Equal(t, true, response["success"])
	assert.NotNil(t, response["data"])

	mockProductRepo.AssertExpectations(t)
}

func TestDiscoveryGetNewArrivals_WithLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockProductRepo := new(MockProductRepository)
	mockCategoryRepo := new(MockCategoryRepository)
	cacheService := services.NewCacheService()
	discoveryService := services.NewDiscoveryService(mockProductRepo, mockCategoryRepo, cacheService)
	handler := NewDiscoveryHandler(discoveryService)

	product := createTestProductForDiscovery()
	mockProductRepo.On("GetNewArrivals", 10).Return([]models.Product{product}, nil)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/discovery/new-arrivals?limit=10", nil)

	router := gin.New()
	router.GET("/api/v1/discovery/new-arrivals", handler.GetNewArrivals)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.NewDecoder(w.Body).Decode(&response)
	assert.Equal(t, true, response["success"])

	mockProductRepo.AssertExpectations(t)
}

// ===== TESTS: GetCategories =====

func TestDiscoveryGetCategories_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockProductRepo := new(MockProductRepository)
	mockCategoryRepo := new(MockCategoryRepository)
	cacheService := services.NewCacheService()
	discoveryService := services.NewDiscoveryService(mockProductRepo, mockCategoryRepo, cacheService)
	handler := NewDiscoveryHandler(discoveryService)

	tree := []repositories.CategoryTreeNode{}
	mockCategoryRepo.On("GetCategoryTree").Return(tree, nil)

	w := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/api/v1/discovery/categories", nil)

	router := gin.New()
	router.GET("/api/v1/discovery/categories", handler.GetCategories)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	json.NewDecoder(w.Body).Decode(&response)
	assert.Equal(t, true, response["success"])
	assert.NotNil(t, response["data"])

	mockCategoryRepo.AssertExpectations(t)
}

// ===== TESTS: Caching =====

func TestDiscoveryCaching_FeaturedProducts(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockProductRepo := new(MockProductRepository)
	mockCategoryRepo := new(MockCategoryRepository)
	cacheService := services.NewCacheService()
	discoveryService := services.NewDiscoveryService(mockProductRepo, mockCategoryRepo, cacheService)
	handler := NewDiscoveryHandler(discoveryService)

	product := createTestProductForDiscovery()
	// Only call DB once due to caching
	mockProductRepo.On("GetFeaturedProducts", 8).Return([]models.Product{product}, nil)

	router := gin.New()
	router.GET("/api/v1/discovery/featured", handler.GetFeaturedProducts)

	// First request - from DB
	w1 := httptest.NewRecorder()
	req1 := httptest.NewRequest("GET", "/api/v1/discovery/featured", nil)
	router.ServeHTTP(w1, req1)
	assert.Equal(t, http.StatusOK, w1.Code)

	// Second request - from cache
	w2 := httptest.NewRecorder()
	req2 := httptest.NewRequest("GET", "/api/v1/discovery/featured", nil)
	router.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusOK, w2.Code)

	// Verify mock was only called once
	mockProductRepo.AssertNumberOfCalls(t, "GetFeaturedProducts", 1)
}

func TestDiscoveryCaching_Bestsellers(t *testing.T) {
	gin.SetMode(gin.TestMode)

	mockProductRepo := new(MockProductRepository)
	mockCategoryRepo := new(MockCategoryRepository)
	cacheService := services.NewCacheService()
	discoveryService := services.NewDiscoveryService(mockProductRepo, mockCategoryRepo, cacheService)
	handler := NewDiscoveryHandler(discoveryService)

	product := createTestProductForDiscovery()
	// Only call DB once due to caching
	mockProductRepo.On("GetBestSellers", 8).Return([]models.Product{product}, nil)

	router := gin.New()
	router.GET("/api/v1/discovery/bestsellers", handler.GetBestSellers)

	// First request
	w1 := httptest.NewRecorder()
	req1 := httptest.NewRequest("GET", "/api/v1/discovery/bestsellers", nil)
	router.ServeHTTP(w1, req1)
	assert.Equal(t, http.StatusOK, w1.Code)

	// Second request - should use cache
	w2 := httptest.NewRecorder()
	req2 := httptest.NewRequest("GET", "/api/v1/discovery/bestsellers", nil)
	router.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusOK, w2.Code)

	// Verify only one DB call
	mockProductRepo.AssertNumberOfCalls(t, "GetBestSellers", 1)
}

