package admin

import (
	"database/sql"
	"ecommerce-backend/internal/models"
	"time"

	"github.com/shopspring/decimal"
)

// DashboardService handles analytics and dashboard operations
type DashboardService struct {
	db *sql.DB
}

// NewDashboardService creates a new dashboard service
func NewDashboardService(
	orderRepo interface{}, // Not used - accepting for backwards compatibility
	productRepo interface{}, // Not used
	userRepo interface{}, // Not used
	db *sql.DB,
) *DashboardService {
	return &DashboardService{
		db: db,
	}
}

// ===== DASHBOARD SUMMARY =====

// GetDashboardSummary retrieves the complete dashboard overview
func (s *DashboardService) GetDashboardSummary() (*models.DashboardSummary, error) {
	summary := &models.DashboardSummary{
		Overview:  make(map[string]interface{}),
		Timestamp: time.Now(),
	}

	// Get revenue metrics (last 30 days)
	startDate := time.Now().AddDate(0, 0, -30)
	endDate := time.Now()

	revenue, err := s.GetRevenueMetrics(startDate, endDate)
	if err != nil {
		return nil, err
	}
	summary.RevenueMetrics = *revenue

	// Get order analytics
	orders, err := s.GetOrderAnalytics()
	if err != nil {
		return nil, err
	}
	summary.OrderAnalytics = *orders
	summary.PendingOrders = orders.PendingOrders
	summary.UnfulfishedOrders = orders.PendingOrders + orders.ProcessingOrders

	// Get customer analytics
	customers, err := s.GetCustomerAnalytics()
	if err != nil {
		return nil, err
	}
	summary.CustomerAnalytics = *customers

	// Get recent orders
	query := `
		SELECT 
			o.id, o.order_number, o.user_id, COALESCE(o.total, 0) as total,
			o.order_status, o.payment_status, o.created_at,
			COALESCE(u.name, 'Guest') as user_name
		FROM orders o
		LEFT JOIN users u ON o.user_id = u.id
		ORDER BY o.created_at DESC
		LIMIT 5
	`
	rows, err := s.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var order models.Order
		var userName string
		var total decimal.Decimal

		if err := rows.Scan(
			&order.ID, &order.OrderNumber, &order.UserID, &total,
			&order.OrderStatus, &order.PaymentStatus, &order.CreatedAt, &userName,
		); err != nil {
			return nil, err
		}

		order.Total = total

		summary.RecentOrders = append(summary.RecentOrders, order)
	}

	// Get low stock products
	query = `
		SELECT 
			id, name, slug, description, regular_price,
			stock_quantity, category_id, status, created_at
		FROM products
		WHERE stock_quantity < 10 AND status = 'active'
		ORDER BY stock_quantity ASC
		LIMIT 10
	`
	rows, err = s.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var product models.Product
		if err := rows.Scan(
			&product.ID, &product.Name, &product.Slug, &product.Description,
			&product.RegularPrice, &product.StockQuantity,
			&product.CategoryID, &product.Status, &product.CreatedAt,
		); err != nil {
			return nil, err
		}
		summary.LowStockProducts = append(summary.LowStockProducts, product)
	}

	// Build overview summary
	summary.Overview = map[string]interface{}{
		"total_revenue":      summary.RevenueMetrics.TotalRevenue,
		"total_orders":       summary.OrderAnalytics.TotalOrders,
		"total_customers":    summary.CustomerAnalytics.TotalCustomers,
		"pending_orders":     summary.PendingOrders,
		"unfulfilled_orders": summary.UnfulfishedOrders,
		"avg_order_value":    summary.RevenueMetrics.AverageOrderValue,
		"active_customers":   summary.CustomerAnalytics.ActiveCustomers,
		"low_stock_products": len(summary.LowStockProducts),
	}

	return summary, nil
}
