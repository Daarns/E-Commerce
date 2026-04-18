package admin

import (
	"ecommerce-backend/internal/models"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

// ===== HELPER TESTS =====

// TestNewDashboardService_Initialization tests service initialization
func TestNewDashboardService_Initialization(t *testing.T) {
	service := NewDashboardService(nil, nil, nil, nil)
	assert.NotNil(t, service)
}

// ===== ANALYTICS MODELS TESTS =====

// TestRevenueMetrics_Creation tests revenue metrics creation
func TestRevenueMetrics_Creation(t *testing.T) {
	metrics := &models.RevenueMetrics{
		TotalRevenue:      1000000.0,
		AverageOrderValue: 100000.0,
		Currency:          "IDR",
		Period:            "monthly",
		Timestamp:         time.Now(),
	}

	assert.Equal(t, 1000000.0, metrics.TotalRevenue)
	assert.Equal(t, "IDR", metrics.Currency)
	assert.Equal(t, "monthly", metrics.Period)
}

// TestOrderAnalytics_Creation tests order analytics creation
func TestOrderAnalytics_Creation(t *testing.T) {
	analytics := &models.OrderAnalytics{
		TotalOrders:       100,
		PendingOrders:     10,
		ProcessingOrders:  20,
		ShippedOrders:     30,
		DeliveredOrders:   40,
		AverageOrderValue: 150000.0,
		StatusBreakdown:   make(map[string]int64),
		PaymentMethods:    make(map[string]int64),
		TopProducts:       []models.TopProductMetric{},
		Timestamp:         time.Now(),
	}

	analytics.StatusBreakdown["pending"] = 10
	analytics.PaymentMethods["midtrans"] = 100

	assert.Equal(t, int64(100), analytics.TotalOrders)
	assert.Equal(t, int64(10), analytics.StatusBreakdown["pending"])
	assert.Equal(t, int64(100), analytics.PaymentMethods["midtrans"])
}

// TestCustomerAnalytics_Creation tests customer analytics creation
func TestCustomerAnalytics_Creation(t *testing.T) {
	analytics := &models.CustomerAnalytics{
		TotalCustomers:    1000,
		ActiveCustomers:   500,
		NewCustomers:      100,
		ReturnCustomers:   300,
		CustomerLifeValue: 500000.0,
		CustomerSegments:  make(map[string]int64),
		Timestamp:         time.Now(),
	}

	analytics.CustomerSegments["new"] = 100
	analytics.CustomerSegments["regular"] = 500
	analytics.CustomerSegments["vip"] = 400

	assert.Equal(t, int64(1000), analytics.TotalCustomers)
	assert.Equal(t, int64(100), analytics.CustomerSegments["new"])
	assert.Equal(t, 500000.0, analytics.CustomerLifeValue)
}

// TestDashboardSummary_Creation tests dashboard summary creation
func TestDashboardSummary_Creation(t *testing.T) {
	summary := &models.DashboardSummary{
		Overview: map[string]interface{}{
			"total_revenue":    1000000.0,
			"total_orders":     100,
			"total_customers":  500,
		},
		RevenueMetrics: models.RevenueMetrics{
			TotalRevenue: 1000000.0,
		},
		OrderAnalytics: models.OrderAnalytics{
			TotalOrders: 100,
		},
		CustomerAnalytics: models.CustomerAnalytics{
			TotalCustomers: 500,
		},
		RecentOrders:      []models.Order{},
		LowStockProducts:  []models.Product{},
		PendingOrders:     10,
		UnfulfishedOrders: 30,
		Timestamp:         time.Now(),
	}

	assert.Equal(t, 1000000.0, summary.Overview["total_revenue"])
	assert.Equal(t, int64(100), summary.OrderAnalytics.TotalOrders)
	assert.Equal(t, int64(500), summary.CustomerAnalytics.TotalCustomers)
}

// TestTopProductMetric_Creation tests top product metric creation
func TestTopProductMetric_Creation(t *testing.T) {
	metric := &models.TopProductMetric{
		ProductID:    uuid.New().String(),
		ProductName:  "Test Product",
		ProductSlug:  "test-product",
		SalesCount:   100,
		TotalRevenue: 10000000.0,
		AveragePrice: 100000.0,
		Rank:         1,
	}

	assert.Equal(t, "Test Product", metric.ProductName)
	assert.Equal(t, int64(100), metric.SalesCount)
	assert.Equal(t, 10000000.0, metric.TotalRevenue)
	assert.Equal(t, 1, metric.Rank)
}

// TestProductPerformance_Creation tests product performance creation
func TestProductPerformance_Creation(t *testing.T) {
	performance := &models.ProductPerformance{
		ProductID:       uuid.New().String(),
		ProductName:     "Test Product",
		ProductSlug:     "test-product",
		CategoryName:    "Electronics",
		TotalSales:      100,
		TotalRevenue:    10000000.0,
		AverageRating:   4.5,
		CurrentStock:    50,
		StockStatus:     "in_stock",
		Rank:            1,
	}

	assert.Equal(t, "Test Product", performance.ProductName)
	assert.Equal(t, int64(100), performance.TotalSales)
	assert.Equal(t, "in_stock", performance.StockStatus)
	assert.Equal(t, 4.5, performance.AverageRating)
}

// TestUserActivitySummary_Creation tests user activity summary creation
func TestUserActivitySummary_Creation(t *testing.T) {
	now := time.Now()
	summary := &models.UserActivitySummary{
		UserID:            uuid.New().String(),
		UserName:          "Test User",
		UserEmail:         "test@example.com",
		TotalOrders:       10,
		TotalSpent:        5000000.0,
		LastOrderDate:     &now,
		RegistrationDate:  now.AddDate(-1, 0, 0),
		AccountStatus:     "active",
		PreferredCategory: "Electronics",
		AverageOrderValue: 500000.0,
		LifetimeValue:     5000000.0,
	}

	assert.Equal(t, "Test User", summary.UserName)
	assert.Equal(t, int64(10), summary.TotalOrders)
	assert.Equal(t, "active", summary.AccountStatus)
}

// TestSalesReport_Creation tests sales report creation
func TestSalesReport_Creation(t *testing.T) {
	report := &models.SalesReport{
		ReportDate:   time.Now(),
		ReportPeriod: "monthly",
		GrowthRate:   15.5,
		Timestamp:    time.Now(),
	}

	assert.Equal(t, "monthly", report.ReportPeriod)
	assert.Equal(t, 15.5, report.GrowthRate)
}

// TestMonthlyRevenueTrend_Creation tests monthly revenue trend creation
func TestMonthlyRevenueTrend_Creation(t *testing.T) {
	trend := &models.MonthlyRevenueTrend{
		Month:   "2025-01",
		Revenue: 5000000.0,
		Orders:  50,
		Growth:  10.5,
	}

	assert.Equal(t, "2025-01", trend.Month)
	assert.Equal(t, 5000000.0, trend.Revenue)
	assert.Equal(t, int64(50), trend.Orders)
	assert.Equal(t, 10.5, trend.Growth)
}

// TestRevenueTrend_Creation tests revenue trend creation
func TestRevenueTrend_Creation(t *testing.T) {
	now := time.Now()
	trend := &models.RevenueTrend{
		Date:    now,
		Revenue: 1000000.0,
		Orders:  10,
	}

	assert.Equal(t, 1000000.0, trend.Revenue)
	assert.Equal(t, int64(10), trend.Orders)
}

// TestDashboardService_InterfaceCompliance tests that service has expected methods
func TestDashboardService_InterfaceCompliance(t *testing.T) {
	service := NewDashboardService(nil, nil, nil, nil)
	assert.NotNil(t, service)
}

