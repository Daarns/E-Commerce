package utils

import (
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

// ExportService handles data export functionality
type ExportService struct {
	userRepo   *repositories.UserRepository
	orderRepo  *repositories.OrderRepository
}

// NewExportService creates a new export service
func NewExportService(userRepo *repositories.UserRepository, orderRepo *repositories.OrderRepository) *ExportService {
	return &ExportService{
		userRepo:   userRepo,
		orderRepo:  orderRepo,
	}
}

// UserExportData represents user data for export
type UserExportData struct {
	Name        string
	Email       string
	Role        string
	Status      string
	TotalOrders int64
	TotalSpent  float64
	LastLogin   *time.Time
	JoinedDate  time.Time
}

// ExportUsersToCSV generates CSV content for user export
func (s *ExportService) ExportUsersToCSV(users []models.User) (string, error) {
	if len(users) == 0 {
		return buildCSVHeader(), nil
	}

	var sb strings.Builder

	// Write header
	sb.WriteString(buildCSVHeader())

	// Get order stats for all users
	userOrderStats := make(map[uuid.UUID]map[string]interface{})

	// For demo, we'll fetch stats for each user
	// In production, this could be batch queried
	for _, user := range users {
		stats, err := s.getUserOrderStats(user.ID)
		if err != nil {
			// Log error but continue with zeros
			stats = map[string]interface{}{
				"total_orders": int64(0),
				"total_spent":  float64(0),
			}
		}
		userOrderStats[user.ID] = stats
	}

	// Write data rows
	for _, user := range users {
		stats := userOrderStats[user.ID]
		totalOrders := stats["total_orders"].(int64)
		totalSpent := stats["total_spent"].(float64)

		row := buildCSVRow(UserExportData{
			Name:        user.Name,
			Email:       user.Email,
			Role:        user.Role,
			Status:      getStatus(user.IsActive, user.IsVerified),
			TotalOrders: totalOrders,
			TotalSpent:  totalSpent,
			LastLogin:   user.LastLoginAt,
			JoinedDate:  user.CreatedAt,
		})

		sb.WriteString(row)
	}

	return sb.String(), nil
}

// getUserOrderStats gets order count and total spent for a user
func (s *ExportService) getUserOrderStats(userID uuid.UUID) (map[string]interface{}, error) {
	// This would need GetUserOrderStats method in OrderRepository
	// For now, returning zeros - will be implemented with order stats query
	return map[string]interface{}{
		"total_orders": int64(0),
		"total_spent":  float64(0),
	}, nil
}

// getStatus returns a formatted status string
func getStatus(isActive, isVerified bool) string {
	if !isActive {
		return "inactive"
	}
	if !isVerified {
		return "unverified"
	}
	return "active"
}

// buildCSVHeader creates the CSV header row
func buildCSVHeader() string {
	headers := []string{
		"Name",
		"Email",
		"Role",
		"Status",
		"Total Orders",
		"Total Spent",
		"Last Login",
		"Joined Date",
	}
	return escapeCSVRow(headers) + "\n"
}

// buildCSVRow creates a single CSV data row
func buildCSVRow(data UserExportData) string {
	fields := []string{
		data.Name,
		data.Email,
		data.Role,
		data.Status,
		fmt.Sprintf("%d", data.TotalOrders),
		fmt.Sprintf("%.2f", data.TotalSpent),
		formatTimestamp(data.LastLogin),
		data.JoinedDate.Format("2006-01-02"),
	}
	return escapeCSVRow(fields) + "\n"
}

// escapeCSVRow escapes and properly formats CSV fields
func escapeCSVRow(fields []string) string {
	escaped := make([]string, len(fields))
	for i, field := range fields {
		escaped[i] = escapeCSVField(field)
	}
	return strings.Join(escaped, ",")
}

// escapeCSVField properly escapes a single CSV field
func escapeCSVField(field string) string {
	// Check if field needs quoting
	if shouldQuote(field) {
		// Escape quotes by doubling them
		field = strings.ReplaceAll(field, "\"", "\"\"")
		return "\"" + field + "\""
	}
	return field
}

// shouldQuote determines if a CSV field needs to be quoted
func shouldQuote(field string) bool {
	return strings.ContainsAny(field, ",\"\n\r") || strings.Contains(field, "\"")
}

// formatTimestamp formats a timestamp for CSV, returns empty string if nil
func formatTimestamp(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.Format("2006-01-02 15:04:05")
}

// CSVExportParams represents parameters for CSV export
type CSVExportParams struct {
	Role     string
	Status   string
	SortBy   string
	SortOrder string
	Page     int
	PageSize int
}

// ExportAllUsersToCSV exports all users matching filters to CSV
func (s *ExportService) ExportAllUsersToCSV(params CSVExportParams) (string, error) {
	// Fetch all users with pagination
	// This would use a new GetUsersForExport method in UserRepository
	// For now, returning empty CSV with header
	return buildCSVHeader(), nil
}

// FormatCSVValue formats any value for CSV output
func FormatCSVValue(value interface{}) string {
	if value == nil {
		return ""
	}

	switch v := value.(type) {
	case string:
		return v
	case int:
		return strconv.Itoa(v)
	case int64:
		return strconv.FormatInt(v, 10)
	case float64:
		return strconv.FormatFloat(v, 'f', 2, 64)
	case bool:
		if v {
			return "true"
		}
		return "false"
	case time.Time:
		return v.Format("2006-01-02")
	case *time.Time:
		if v == nil {
			return ""
		}
		return v.Format("2006-01-02")
	default:
		return fmt.Sprintf("%v", v)
	}
}

