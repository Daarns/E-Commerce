package utils

import (
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	"fmt"
	"net/http"

	"github.com/google/uuid"
)

// ActivityService handles activity logging and retrieval
type ActivityService struct {
	repo *repositories.ActivityRepository
}

// NewActivityService creates a new activity service
func NewActivityService(repo *repositories.ActivityRepository) *ActivityService {
	return &ActivityService{
		repo: repo,
	}
}

// LogActivity logs a user activity
func (s *ActivityService) LogActivity(userID uuid.UUID, actionType, description string, metadata *models.ActivityMetadata) error {
	activity := &models.ActivityLog{
		UserID:      userID,
		ActionType:  actionType,
		Description: description,
		Metadata:    *metadata,
	}

	return s.repo.CreateActivity(activity)
}

// LogActivityWithMetadata logs activity with detailed metadata
func (s *ActivityService) LogActivityWithMetadata(userID uuid.UUID, actionType string, description string, ipAddress, userAgent string, metadata *models.ActivityMetadata) error {
	activity := &models.ActivityLog{
		UserID:      userID,
		ActionType:  actionType,
		Description: description,
		IPAddress:   &ipAddress,
		UserAgent:   &userAgent,
		Metadata:    *metadata,
	}

	return s.repo.CreateActivity(activity)
}

// LogActivityFromRequest logs activity with HTTP request context
func (s *ActivityService) LogActivityFromRequest(userID uuid.UUID, actionType, description string, r *http.Request, metadata *models.ActivityMetadata) error {
	ipAddress := r.Header.Get("X-Forwarded-For")
	if ipAddress == "" {
		ipAddress = r.RemoteAddr
	}

	userAgent := r.Header.Get("User-Agent")

	if metadata == nil {
		metadata = &models.ActivityMetadata{}
	}

	return s.LogActivityWithMetadata(userID, actionType, description, ipAddress, userAgent, metadata)
}

// GetActivities retrieves activities with filtering and pagination
func (s *ActivityService) GetActivities(filter *models.ActivityFilter) ([]models.ActivityLog, int64, error) {
	return s.repo.GetActivities(filter)
}

// GetUserActivities retrieves recent activities for a specific user
func (s *ActivityService) GetUserActivities(userID uuid.UUID, limit int) ([]models.ActivityLog, error) {
	return s.repo.GetUserActivities(userID, limit)
}

// GetActivitySummary retrieves activity statistics for a user
func (s *ActivityService) GetActivitySummary(userID uuid.UUID) (*models.ActivitySummary, error) {
	return s.repo.GetActivitySummary(userID)
}

// GetGlobalActivitySummary retrieves overall activity statistics
func (s *ActivityService) GetGlobalActivitySummary() (*models.ActivitySummary, error) {
	var total int64

	// Get all activities
	filter := &models.ActivityFilter{
		Page:     1,
		PageSize: 100,
	}

	allActivities, count, err := s.repo.GetAllActivities(filter)
	if err != nil {
		return nil, fmt.Errorf("failed to get global activity summary: %w", err)
	}

	total = count

	// Count by action type
	typeBreakdown := make(map[string]int64)
	for _, activity := range allActivities {
		typeBreakdown[activity.ActionType]++
	}

	// Get recent activities
	var recentActivityResponses []models.ActivityResponse
	limit := 20
	if len(allActivities) < limit {
		limit = len(allActivities)
	}

	for i := 0; i < limit; i++ {
		activity := allActivities[i]
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

// GetActivityByID retrieves a single activity
func (s *ActivityService) GetActivityByID(id uuid.UUID) (*models.ActivityLog, error) {
	return s.repo.GetActivity(id)
}

