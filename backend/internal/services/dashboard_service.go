package services

import (
	"database/sql"
	"ecommerce-backend/internal/models"
	"fmt"
	"time"

	"github.com/google/uuid"
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

// ===== REVENUE ANALYTICS =====

// GetRevenueMetrics calculates revenue metrics for a period
func (s *DashboardService) GetRevenueMetrics(startDate, endDate time.Time) (*models.RevenueMetrics, error) {
	query := `
		SELECT 
			COALESCE(SUM(o.total), 0) as total_revenue,
			COALESCE(AVG(o.total), 0) as avg_order_value,
			COALESCE(MAX(o.total), 0) as highest_order,
			COALESCE(MIN(o.total), 0) as lowest_order
		FROM orders o
		WHERE o.created_at >= $1 AND o.created_at <= $2
		AND o.order_status IN ('payment_confirmed', 'processing', 'shipped', 'delivered')
	`

	var metrics models.RevenueMetrics
	err := s.db.QueryRow(query, startDate, endDate).Scan(
		&metrics.TotalRevenue,
		&metrics.AverageOrderValue,
		&metrics.HighestOrder,
		&metrics.LowestOrder,
	)
	if err != nil {
		return nil, err
	}

	metrics.Currency = "IDR"
	metrics.Timestamp = time.Now()

	// Determine period
	duration := endDate.Sub(startDate)
	if duration < 48*time.Hour {
		metrics.Period = "daily"
	} else if duration < 30*24*time.Hour {
		metrics.Period = "weekly"
	} else if duration < 90*24*time.Hour {
		metrics.Period = "monthly"
	} else {
		metrics.Period = "yearly"
	}

	return &metrics, nil
}

// ===== ORDER ANALYTICS =====

// GetOrderAnalytics retrieves comprehensive order statistics
func (s *DashboardService) GetOrderAnalytics() (*models.OrderAnalytics, error) {
	analytics := &models.OrderAnalytics{
		StatusBreakdown: make(map[string]int64),
		PaymentMethods:  make(map[string]int64),
		Timestamp:       time.Now(),
	}

	// Get total orders and by status
	query := `
		SELECT o.order_status, COUNT(*) as count
		FROM orders o
		GROUP BY o.order_status
	`

	rows, err := s.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var status string
		var count int64
		if err := rows.Scan(&status, &count); err != nil {
			return nil, err
		}

		analytics.StatusBreakdown[status] = count
		analytics.TotalOrders += count

		// Categorize by status
		switch status {
		case "pending":
			analytics.PendingOrders = count
		case "payment_confirmed":
			analytics.PendingOrders += count
		case "processing":
			analytics.ProcessingOrders = count
		case "shipped":
			analytics.ShippedOrders = count
		case "delivered":
			analytics.DeliveredOrders = count
		case "cancelled":
			analytics.CancelledOrders = count
		}
	}

	// Get average order value and payment methods
	query = `
		SELECT 
			COALESCE(AVG(o.total), 0) as avg_order,
			o.payment_method,
			COUNT(*) as count
		FROM orders o
		WHERE o.order_status IN ('payment_confirmed', 'processing', 'shipped', 'delivered')
		GROUP BY o.payment_method
	`

	rows, err = s.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var avgOrder float64
		var method string
		var count int64

		if err := rows.Scan(&avgOrder, &method, &count); err != nil {
			return nil, err
		}
		analytics.AverageOrderValue = avgOrder
		analytics.PaymentMethods[method] = count
	}

	// Get top products
	topProducts, err := s.getTopProducts(10)
	if err != nil {
		return nil, err
	}
	analytics.TopProducts = topProducts

	return analytics, nil
}

// getTopProducts retrieves top selling products
func (s *DashboardService) getTopProducts(limit int) ([]models.TopProductMetric, error) {
	query := `
		SELECT 
			p.id,
			p.name,
			p.slug,
			COUNT(oi.id) as sales_count,
			COALESCE(SUM(oi.price * oi.quantity), 0) as total_revenue,
			COALESCE(AVG(oi.price), 0) as avg_price
		FROM products p
		INNER JOIN order_items oi ON p.id = oi.product_id
		INNER JOIN orders o ON oi.order_id = o.id
		WHERE o.order_status IN ('payment_confirmed', 'processing', 'shipped', 'delivered')
		GROUP BY p.id, p.name, p.slug
		ORDER BY sales_count DESC
		LIMIT $1
	`

	rows, err := s.db.Query(query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []models.TopProductMetric
	rank := 1

	for rows.Next() {
		var product models.TopProductMetric

		if err := rows.Scan(
			&product.ProductID,
			&product.ProductName,
			&product.ProductSlug,
			&product.SalesCount,
			&product.TotalRevenue,
			&product.AveragePrice,
		); err != nil {
			return nil, err
		}

		product.Rank = rank
		products = append(products, product)
		rank++
	}

	return products, nil
}

// ===== CUSTOMER ANALYTICS =====

// GetCustomerAnalytics retrieves customer statistics
func (s *DashboardService) GetCustomerAnalytics() (*models.CustomerAnalytics, error) {
	analytics := &models.CustomerAnalytics{
		CustomerSegments: make(map[string]int64),
		Timestamp:        time.Now(),
	}

	// Total customers
	query := `SELECT COUNT(DISTINCT id) FROM users WHERE role = 'customer'`
	err := s.db.QueryRow(query).Scan(&analytics.TotalCustomers)
	if err != nil {
		return nil, err
	}

	// Active customers (last 30 days)
	query = `
		SELECT COUNT(DISTINCT o.user_id)
		FROM orders o
		WHERE o.created_at >= NOW() - INTERVAL '30 days'
		AND o.order_status IN ('payment_confirmed', 'processing', 'shipped', 'delivered')
	`
	err = s.db.QueryRow(query).Scan(&analytics.ActiveCustomers)
	if err != nil {
		return nil, err
	}

	// New customers (last 30 days)
	query = `
		SELECT COUNT(DISTINCT id)
		FROM users
		WHERE role = 'customer'
		AND created_at >= NOW() - INTERVAL '30 days'
	`
	err = s.db.QueryRow(query).Scan(&analytics.NewCustomers)
	if err != nil {
		return nil, err
	}

	// Return customers (multiple orders)
	query = `
		SELECT COUNT(DISTINCT user_id)
		FROM orders
		WHERE user_id IN (
			SELECT user_id FROM orders
			GROUP BY user_id
			HAVING COUNT(*) > 1
		)
		AND order_status IN ('payment_confirmed', 'processing', 'shipped', 'delivered')
	`
	err = s.db.QueryRow(query).Scan(&analytics.ReturnCustomers)
	if err != nil {
		return nil, err
	}

	// Average order count and customer lifetime value
	query = `
		SELECT 
			COALESCE(AVG(order_count), 0) as avg_orders,
			COALESCE(AVG(lifetime_value), 0) as lifetime_value
		FROM (
			SELECT 
				u.id,
				COUNT(o.id) as order_count,
				COALESCE(SUM(o.total), 0) as lifetime_value
			FROM users u
			LEFT JOIN orders o ON u.id = o.user_id 
				AND o.order_status IN ('payment_confirmed', 'processing', 'shipped', 'delivered')
			WHERE u.role = 'customer'
			GROUP BY u.id
		) as customer_data
	`
	err = s.db.QueryRow(query).Scan(&analytics.AverageOrderCount, &analytics.CustomerLifeValue)
	if err != nil {
		return nil, err
	}

	// Customer segments
	query = `
		SELECT 
			CASE 
				WHEN order_count = 0 THEN 'new'
				WHEN order_count < 5 THEN 'regular'
				ELSE 'vip'
			END as segment,
			COUNT(*) as count
		FROM (
			SELECT 
				u.id,
				COUNT(o.id) as order_count
			FROM users u
			LEFT JOIN orders o ON u.id = o.user_id 
				AND o.order_status IN ('payment_confirmed', 'processing', 'shipped', 'delivered')
			WHERE u.role = 'customer'
			GROUP BY u.id
		) as segments
		GROUP BY segment
	`

	rows, err := s.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var segment string
		var count int64
		if err := rows.Scan(&segment, &count); err != nil {
			return nil, err
		}
		analytics.CustomerSegments[segment] = count
	}

	return analytics, nil
}

// ===== DASHBOARD SUMMARY =====

// GetDashboardSummary retrieves the complete dashboard overview
func (s *DashboardService) GetDashboardSummary() (*models.DashboardSummary, error) {
	summary := &models.DashboardSummary{
		Overview: make(map[string]interface{}),
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
			o.id, o.order_number, o.user_id, o.total,
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
		var total interface{}

		if err := rows.Scan(
			&order.ID, &order.OrderNumber, &order.UserID, &total,
			&order.OrderStatus, &order.PaymentStatus, &order.CreatedAt, &userName,
		); err != nil {
			return nil, err
		}

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
		"total_revenue":        summary.RevenueMetrics.TotalRevenue,
		"total_orders":         summary.OrderAnalytics.TotalOrders,
		"total_customers":      summary.CustomerAnalytics.TotalCustomers,
		"pending_orders":       summary.PendingOrders,
		"unfulfilled_orders":   summary.UnfulfishedOrders,
		"avg_order_value":      summary.RevenueMetrics.AverageOrderValue,
		"active_customers":     summary.CustomerAnalytics.ActiveCustomers,
		"low_stock_products":   len(summary.LowStockProducts),
	}

	return summary, nil
}

// ===== REVENUE TRENDS =====

// GetMonthlyRevenueTrend retrieves monthly revenue trends
func (s *DashboardService) GetMonthlyRevenueTrend(months int) ([]models.MonthlyRevenueTrend, error) {
	query := `
		SELECT 
			DATE_TRUNC('month', o.created_at) as month,
			COALESCE(SUM(o.total), 0) as revenue,
			COUNT(o.id) as orders
		FROM orders o
		WHERE o.created_at >= NOW() - INTERVAL '1 month' * $1
		AND o.order_status IN ('payment_confirmed', 'processing', 'shipped', 'delivered')
		GROUP BY DATE_TRUNC('month', o.created_at)
		ORDER BY month ASC
	`

	rows, err := s.db.Query(query, months)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var trends []models.MonthlyRevenueTrend
	var prevRevenue float64

	for rows.Next() {
		var trend models.MonthlyRevenueTrend
		var monthTime time.Time

		if err := rows.Scan(&monthTime, &trend.Revenue, &trend.Orders); err != nil {
			return nil, err
		}

		trend.Month = monthTime.Format("2006-01")

		// Calculate growth rate
		if prevRevenue > 0 {
			trend.Growth = ((trend.Revenue - prevRevenue) / prevRevenue) * 100
		} else {
			trend.Growth = 0
		}

		trends = append(trends, trend)
		prevRevenue = trend.Revenue
	}

	return trends, nil
}

// ===== PRODUCT PERFORMANCE =====

// GetProductPerformance retrieves product performance metrics
func (s *DashboardService) GetProductPerformance(limit int, offset int) ([]models.ProductPerformance, error) {
	query := `
		SELECT 
			p.id,
			p.name,
			p.slug,
			c.name as category_name,
			COUNT(DISTINCT oi.order_id) as sales_count,
			COALESCE(SUM(oi.price * oi.quantity), 0) as total_revenue,
			COALESCE(AVG(pr.rating), 0) as avg_rating,
			p.stock_quantity,
			CASE 
				WHEN p.stock_quantity = 0 THEN 'out_of_stock'
				WHEN p.stock_quantity < 10 THEN 'low_stock'
				ELSE 'in_stock'
			END as stock_status,
			MAX(oi.created_at) as last_sold_date
		FROM products p
		LEFT JOIN categories c ON p.category_id = c.id
		LEFT JOIN order_items oi ON p.id = oi.product_id
		LEFT JOIN orders o ON oi.order_id = o.id AND o.order_status IN ('payment_confirmed', 'processing', 'shipped', 'delivered')
		LEFT JOIN product_reviews pr ON p.id = pr.product_id
		WHERE p.status = 'active'
		GROUP BY p.id, p.name, p.slug, c.name, p.stock_quantity
		ORDER BY sales_count DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := s.db.Query(query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var performances []models.ProductPerformance
	rank := offset + 1

	for rows.Next() {
		var perf models.ProductPerformance
		var lastSold sql.NullTime

		if err := rows.Scan(
			&perf.ProductID, &perf.ProductName, &perf.ProductSlug,
			&perf.CategoryName, &perf.TotalSales, &perf.TotalRevenue,
			&perf.AverageRating, &perf.CurrentStock, &perf.StockStatus,
			&lastSold,
		); err != nil {
			return nil, err
		}

		if lastSold.Valid {
			perf.LastSoldDate = &lastSold.Time
		}
		perf.Rank = rank
		performances = append(performances, perf)
		rank++
	}

	return performances, nil
}

// ===== USER MANAGEMENT =====

// GetUserActivityList retrieves user activity summaries
func (s *DashboardService) GetUserActivityList(limit int, offset int) ([]models.UserActivitySummary, error) {
	query := `
		SELECT 
			u.id,
			u.name,
			u.email,
			COALESCE(COUNT(DISTINCT o.id), 0) as total_orders,
			COALESCE(SUM(o.total), 0) as total_spent,
			MAX(o.created_at) as last_order_date,
			u.created_at,
			u.status,
			COALESCE(oi.category, '-') as preferred_category,
			COALESCE(AVG(o.total), 0) as avg_order_value,
			COALESCE(SUM(o.total), 0) as lifetime_value
		FROM users u
		LEFT JOIN orders o ON u.id = o.user_id AND o.order_status IN ('payment_confirmed', 'processing', 'shipped', 'delivered')
		LEFT JOIN order_items oi ON o.id = oi.order_id
		WHERE u.role = 'customer'
		GROUP BY u.id, u.name, u.email, u.created_at, u.status, oi.category
		ORDER BY total_spent DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := s.db.Query(query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.UserActivitySummary

	for rows.Next() {
		var user models.UserActivitySummary
		var lastOrder sql.NullTime
		var preferredCat string

		if err := rows.Scan(
			&user.UserID, &user.UserName, &user.UserEmail,
			&user.TotalOrders, &user.TotalSpent, &lastOrder,
			&user.RegistrationDate, &user.AccountStatus, &preferredCat,
			&user.AverageOrderValue, &user.LifetimeValue,
		); err != nil {
			return nil, err
		}

		if lastOrder.Valid {
			user.LastOrderDate = &lastOrder.Time
		}
		if preferredCat != "-" {
			user.PreferredCategory = preferredCat
		}

		users = append(users, user)
	}

	return users, nil
}

// DisableUserAccount disables a user account
func (s *DashboardService) DisableUserAccount(userID uuid.UUID, reason string) error {
	query := `
		UPDATE users 
		SET status = 'disabled', updated_at = NOW()
		WHERE id = $1 AND role = 'customer'
	`

	result, err := s.db.Exec(query, userID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user not found or cannot be disabled")
	}

	return nil
}

// EnableUserAccount enables a user account
func (s *DashboardService) EnableUserAccount(userID uuid.UUID) error {
	query := `
		UPDATE users 
		SET status = 'active', updated_at = NOW()
		WHERE id = $1 AND role = 'customer'
	`

	result, err := s.db.Exec(query, userID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("user not found or cannot be enabled")
	}

	return nil
}
