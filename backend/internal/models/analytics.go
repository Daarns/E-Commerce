package models

import "time"

// ===== ANALYTICS MODELS =====

// RevenueMetrics represents revenue analytics
type RevenueMetrics struct {
	TotalRevenue      float64   `json:"total_revenue"`
	AverageOrderValue float64   `json:"average_order_value"`
	HighestOrder      float64   `json:"highest_order"`
	LowestOrder       float64   `json:"lowest_order"`
	Period            string    `json:"period"` // "daily", "weekly", "monthly", "yearly"
	Currency          string    `json:"currency"`
	Timestamp         time.Time `json:"timestamp"`
}

// OrderAnalytics represents order statistics
type OrderAnalytics struct {
	TotalOrders        int64                     `json:"total_orders"`
	PendingOrders      int64                     `json:"pending_orders"`
	ProcessingOrders   int64                     `json:"processing_orders"`
	ShippedOrders      int64                     `json:"shipped_orders"`
	DeliveredOrders    int64                     `json:"delivered_orders"`
	CancelledOrders    int64                     `json:"cancelled_orders"`
	AverageOrderValue  float64                   `json:"average_order_value"`
	StatusBreakdown    map[string]int64          `json:"status_breakdown"`
	PaymentMethods     map[string]int64          `json:"payment_methods"`
	TopProducts        []TopProductMetric        `json:"top_products"`
	Timestamp          time.Time                 `json:"timestamp"`
}

// TopProductMetric represents a product's performance metrics
type TopProductMetric struct {
	ProductID    string  `json:"product_id"`
	ProductName  string  `json:"product_name"`
	ProductSlug  string  `json:"product_slug"`
	SalesCount   int64   `json:"sales_count"`
	TotalRevenue float64 `json:"total_revenue"`
	AveragePrice float64 `json:"average_price"`
	Rank         int     `json:"rank"`
}

// CustomerAnalytics represents customer statistics
type CustomerAnalytics struct {
	TotalCustomers      int64       `json:"total_customers"`
	ActiveCustomers     int64       `json:"active_customers"` // Made purchase last 30 days
	NewCustomers        int64       `json:"new_customers"`    // Registered last 30 days
	ReturnCustomers     int64       `json:"return_customers"` // Made multiple purchases
	AverageOrderCount   float64     `json:"average_order_count"`
	CustomerLifeValue   float64     `json:"customer_lifetime_value"`
	CustomerSegments    map[string]int64 `json:"customer_segments"` // "new", "regular", "vip"
	Timestamp           time.Time   `json:"timestamp"`
}

// SalesReport represents detailed sales information
type SalesReport struct {
	ReportDate        time.Time           `json:"report_date"`
	ReportPeriod      string              `json:"report_period"` // "daily", "weekly", "monthly"
	RevenueMetrics    RevenueMetrics      `json:"revenue_metrics"`
	OrderAnalytics    OrderAnalytics      `json:"order_analytics"`
	CustomerAnalytics CustomerAnalytics   `json:"customer_analytics"`
	GrowthRate        float64             `json:"growth_rate"` // % change from previous period
	Timestamp         time.Time           `json:"timestamp"`
}

// DashboardSummary represents the complete dashboard overview
type DashboardSummary struct {
	Overview              map[string]interface{} `json:"overview"` // Key metrics at a glance
	RevenueMetrics        RevenueMetrics         `json:"revenue_metrics"`
	OrderAnalytics        OrderAnalytics         `json:"order_analytics"`
	CustomerAnalytics     CustomerAnalytics      `json:"customer_analytics"`
	RecentOrders          []Order                `json:"recent_orders"`     // Last 5 orders
	LowStockProducts      []Product              `json:"low_stock_products"` // Products with < 10 stock
	PendingOrders         int64                  `json:"pending_orders"`
	UnfulfishedOrders     int64                  `json:"unfulfished_orders"` // pending + processing
	Timestamp             time.Time              `json:"timestamp"`
}

// RevenueTrend represents revenue over time
type RevenueTrend struct {
	Date    time.Time `json:"date"`
	Revenue float64   `json:"revenue"`
	Orders  int64     `json:"orders"`
}

// MonthlyRevenueTrend represents monthly revenue trends
type MonthlyRevenueTrend struct {
	Month   string    `json:"month"`     // "2025-01"
	Revenue float64   `json:"revenue"`
	Orders  int64     `json:"orders"`
	Growth  float64   `json:"growth"`    // % change from previous month
}

// ProductPerformance represents product sales performance
type ProductPerformance struct {
	ProductID       string  `json:"product_id"`
	ProductName     string  `json:"product_name"`
	ProductSlug     string  `json:"product_slug"`
	CategoryName    string  `json:"category_name"`
	TotalSales      int64   `json:"total_sales"`
	TotalRevenue    float64 `json:"total_revenue"`
	AverageRating   float64 `json:"average_rating"`
	CurrentStock    int64   `json:"current_stock"`
	StockStatus     string  `json:"stock_status"` // "in_stock", "low_stock", "out_of_stock"
	Rank            int     `json:"rank"`
	LastSoldDate    *time.Time `json:"last_sold_date"`
}

// UserActivitySummary represents user activity information
type UserActivitySummary struct {
	UserID              string    `json:"user_id"`
	UserName            string    `json:"user_name"`
	UserEmail           string    `json:"user_email"`
	TotalOrders         int64     `json:"total_orders"`
	TotalSpent          float64   `json:"total_spent"`
	LastOrderDate       *time.Time `json:"last_order_date"`
	RegistrationDate    time.Time `json:"registration_date"`
	AccountStatus       string    `json:"account_status"` // "active", "disabled"
	PreferredCategory   string    `json:"preferred_category"`
	AverageOrderValue   float64   `json:"average_order_value"`
	LifetimeValue       float64   `json:"lifetime_value"`
}
