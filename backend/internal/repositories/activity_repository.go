package repositories

import (
	"ecommerce-backend/internal/models"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ActivityRepository handles activity log data operations
type ActivityRepository struct {
	db *gorm.DB
}

// NewActivityRepository creates a new activity repository
func NewActivityRepository(db *gorm.DB) *ActivityRepository {
	return &ActivityRepository{db: db}
}

// CreateActivity creates a new activity log
func (r *ActivityRepository) CreateActivity(activity *models.ActivityLog) error {
	if err := r.db.Create(activity).Error; err != nil {
		return fmt.Errorf("failed to create activity log: %w", err)
	}
	return nil
}

// GetActivity retrieves a single activity log by ID
func (r *ActivityRepository) GetActivity(id uuid.UUID) (*models.ActivityLog, error) {
	var activity models.ActivityLog
	err := r.db.Where("id = ?", id).First(&activity).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("activity not found")
		}
		return nil, fmt.Errorf("failed to get activity: %w", err)
	}
	return &activity, nil
}

// GetActivities retrieves activities with filtering
func (r *ActivityRepository) GetActivities(filter *models.ActivityFilter) ([]models.ActivityLog, int64, error) {
	var activities []models.ActivityLog
	var total int64

	query := r.db

	// Apply user filter if provided
	if filter.UserID != nil {
		query = query.Where("user_id = ?", *filter.UserID)
	}

	// Apply action type filter
	if len(filter.ActionTypes) > 0 {
		query = query.Where("action_type IN ?", filter.ActionTypes)
	}

	// Apply date range filter
	if filter.StartDate != nil {
		query = query.Where("created_at >= ?", *filter.StartDate)
	}
	if filter.EndDate != nil {
		// Set end date to end of day
		endDate := filter.EndDate.Add(24 * time.Hour)
		query = query.Where("created_at < ?", endDate)
	}

	// Get total count before pagination
	if err := query.Model(&models.ActivityLog{}).Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count activities: %w", err)
	}

	// Apply pagination
	if filter.Page <= 0 {
		filter.Page = 1
	}
	if filter.PageSize <= 0 {
		filter.PageSize = 20
	}

	offset := (filter.Page - 1) * filter.PageSize

	// Get activities ordered by creation date (newest first)
	err := query.
		Order("created_at DESC").
		Offset(offset).
		Limit(filter.PageSize).
		Find(&activities).Error

	if err != nil {
		return nil, 0, fmt.Errorf("failed to get activities: %w", err)
	}

	return activities, total, nil
}

// GetUserActivities retrieves activities for a specific user
func (r *ActivityRepository) GetUserActivities(userID uuid.UUID, limit int) ([]models.ActivityLog, error) {
	var activities []models.ActivityLog

	if limit <= 0 {
		limit = 20
	}

	err := r.db.
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Find(&activities).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get user activities: %w", err)
	}

	return activities, nil
}

// GetActivitySummary gets activity statistics for a user
func (r *ActivityRepository) GetActivitySummary(userID uuid.UUID) (*models.ActivitySummary, error) {
	var total int64
	var activities []models.ActivityLog

	// Get total count
	if err := r.db.Model(&models.ActivityLog{}).Where("user_id = ?", userID).Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to count activities: %w", err)
	}

	// Get activity type breakdown
	type ActivityCount struct {
		ActionType string
		Count      int64
	}

	var counts []ActivityCount
	if err := r.db.
		Model(&models.ActivityLog{}).
		Where("user_id = ?", userID).
		Select("action_type, count(*) as count").
		Group("action_type").
		Scan(&counts).Error; err != nil {
		return nil, fmt.Errorf("failed to get activity counts: %w", err)
	}

	typeBreakdown := make(map[string]int64)
	for _, c := range counts {
		typeBreakdown[c.ActionType] = c.Count
	}

	// Get recent activities (last 10)
	if err := r.db.
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(10).
		Find(&activities).Error; err != nil {
		return nil, fmt.Errorf("failed to get recent activities: %w", err)
	}

	// Convert to response format
	var recentActivityResponses []models.ActivityResponse
	for _, activity := range activities {
		recentActivityResponses = append(recentActivityResponses, models.ActivityResponse{
			ID:          activity.ID,
			UserID:      activity.UserID,
			ActionType:  activity.ActionType,
			Description: activity.Description,
			Metadata:    activity.Metadata,
			IPAddress:   activity.IPAddress,
			CreatedAt:   activity.CreatedAt,
		})
	}

	return &models.ActivitySummary{
		TotalActivities: total,
		ActivitiesByType: typeBreakdown,
		RecentActivities: recentActivityResponses,
	}, nil
}

// GetAllActivities retrieves all activities with filtering (for admin)
func (r *ActivityRepository) GetAllActivities(filter *models.ActivityFilter) ([]models.ActivityLog, int64, error) {
	var activities []models.ActivityLog
	var total int64

	query := r.db

	// Apply action type filter
	if len(filter.ActionTypes) > 0 {
		query = query.Where("action_type IN ?", filter.ActionTypes)
	}

	// Apply date range filter
	if filter.StartDate != nil {
		query = query.Where("created_at >= ?", *filter.StartDate)
	}
	if filter.EndDate != nil {
		endDate := filter.EndDate.Add(24 * time.Hour)
		query = query.Where("created_at < ?", endDate)
	}

	// Get total count
	if err := query.Model(&models.ActivityLog{}).Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count activities: %w", err)
	}

	// Apply pagination
	if filter.Page <= 0 {
		filter.Page = 1
	}
	if filter.PageSize <= 0 {
		filter.PageSize = 20
	}

	offset := (filter.Page - 1) * filter.PageSize

	// Get activities
	err := query.
		Order("created_at DESC").
		Offset(offset).
		Limit(filter.PageSize).
		Find(&activities).Error

	if err != nil {
		return nil, 0, fmt.Errorf("failed to get all activities: %w", err)
	}

	return activities, total, nil
}

// DeleteOldActivities deletes activities older than the specified duration
func (r *ActivityRepository) DeleteOldActivities(olderThan time.Duration) (int64, error) {
	cutoffDate := time.Now().Add(-olderThan)

	result := r.db.Where("created_at < ?", cutoffDate).Delete(&models.ActivityLog{})
	if result.Error != nil {
		return 0, fmt.Errorf("failed to delete old activities: %w", result.Error)
	}

	return result.RowsAffected, nil
}
