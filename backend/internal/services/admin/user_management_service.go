package admin

import (
	"database/sql"
	"ecommerce-backend/internal/models"
	"fmt"
	"github.com/google/uuid"
)

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

