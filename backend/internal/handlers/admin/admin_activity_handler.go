package admin

import (
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/utils"
	"ecommerce-backend/pkg/response"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// AdminActivityHandler handles admin activity management HTTP requests
type AdminActivityHandler struct {
	activityService *utils.ActivityService
}

// NewAdminActivityHandler creates a new admin activity handler
func NewAdminActivityHandler(activityService *utils.ActivityService) *AdminActivityHandler {
	return &AdminActivityHandler{
		activityService: activityService,
	}
}

// GetActivities retrieves filtered activities
// GET /api/v1/admin/activities
// Query params:
//   - action_types: comma-separated action types (login,logout,purchase,etc)
//   - start_date: ISO date format (2006-01-02)
//   - end_date: ISO date format (2006-01-02)
//   - user_id: filter by specific user
//   - page: pagination page number (default 1)
//   - page_size: items per page (default 20, max 100)
func (h *AdminActivityHandler) GetActivities(c *gin.Context) {
	// Parse pagination
	page := 1
	if p := c.Query("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}

	pageSize := 20
	if ps := c.Query("page_size"); ps != "" {
		if parsed, err := strconv.Atoi(ps); err == nil && parsed > 0 && parsed <= 100 {
			pageSize = parsed
		}
	}

	// Build filter
	filter := &models.ActivityFilter{
		Page:     page,
		PageSize: pageSize,
	}

	// Parse action types filter
	actionTypesStr := c.Query("action_types")
	if actionTypesStr != "" {
		filter.ActionTypes = parseCommaSeparatedValues(actionTypesStr)
	}

	// Parse date range
	startDateStr := c.Query("start_date")
	if startDateStr != "" {
		if startDate, err := time.Parse("2006-01-02", startDateStr); err == nil {
			filter.StartDate = &startDate
		} else {
			response.ValidationError(c, "Invalid start_date format (use: 2006-01-02)")
			return
		}
	}

	endDateStr := c.Query("end_date")
	if endDateStr != "" {
		if endDate, err := time.Parse("2006-01-02", endDateStr); err == nil {
			filter.EndDate = &endDate
		} else {
			response.ValidationError(c, "Invalid end_date format (use: 2006-01-02)")
			return
		}
	}

	// Parse user ID filter
	userIDStr := c.Query("user_id")
	if userIDStr != "" {
		if userID, err := uuid.Parse(userIDStr); err == nil {
			filter.UserID = &userID
		} else {
			response.ValidationError(c, "Invalid user_id format")
			return
		}
	}

	// Get activities
	activities, total, err := h.activityService.GetActivities(filter)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "ACTIVITY_ERROR", err.Error())
		return
	}

	// Convert to response format
	activityResponses := make([]models.ActivityResponse, len(activities))
	for i, activity := range activities {
		activityResponses[i] = models.ActivityResponse{
			ID:          activity.ID,
			UserID:      activity.UserID,
			ActionType:  activity.ActionType,
			Description: activity.Description,
			Metadata:    activity.Metadata,
			IPAddress:   activity.IPAddress,
			CreatedAt:   activity.CreatedAt,
		}
	}

	// Calculate pagination info
	totalPages := (total + int64(pageSize) - 1) / int64(pageSize)

	response.Success(c, gin.H{
		"activities":  activityResponses,
		"total":       total,
		"page":        page,
		"page_size":   pageSize,
		"total_pages": totalPages,
		"filters": gin.H{
			"action_types": filter.ActionTypes,
			"start_date":   startDateStr,
			"end_date":     endDateStr,
			"user_id":      userIDStr,
		},
	})
}

// GetUserActivities retrieves activities for a specific user
// GET /api/v1/admin/activities/user/:user_id
func (h *AdminActivityHandler) GetUserActivities(c *gin.Context) {
	userIDStr := c.Param("user_id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		response.ValidationError(c, "Invalid user_id format")
		return
	}

	// Parse pagination
	page := 1
	if p := c.Query("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}

	pageSize := 20
	if ps := c.Query("page_size"); ps != "" {
		if parsed, err := strconv.Atoi(ps); err == nil && parsed > 0 && parsed <= 100 {
			pageSize = parsed
		}
	}

	// Get activities for user
	filter := &models.ActivityFilter{
		UserID:   &userID,
		Page:     page,
		PageSize: pageSize,
	}

	activities, total, err := h.activityService.GetActivities(filter)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "ACTIVITY_ERROR", err.Error())
		return
	}

	// Convert to response format
	activityResponses := make([]models.ActivityResponse, len(activities))
	for i, activity := range activities {
		activityResponses[i] = models.ActivityResponse{
			ID:          activity.ID,
			UserID:      activity.UserID,
			ActionType:  activity.ActionType,
			Description: activity.Description,
			Metadata:    activity.Metadata,
			IPAddress:   activity.IPAddress,
			CreatedAt:   activity.CreatedAt,
		}
	}

	totalPages := (total + int64(pageSize) - 1) / int64(pageSize)

	response.Success(c, gin.H{
		"user_id":     userID,
		"activities":  activityResponses,
		"total":       total,
		"page":        page,
		"page_size":   pageSize,
		"total_pages": totalPages,
	})
}

// GetActivitySummary retrieves activity statistics
// GET /api/v1/admin/activities/summary
func (h *AdminActivityHandler) GetActivitySummary(c *gin.Context) {
	userIDStr := c.Query("user_id")

	var summary *models.ActivitySummary
	var err error

	if userIDStr != "" {
		// Get summary for specific user
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			response.ValidationError(c, "Invalid user_id format")
			return
		}

		summary, err = h.activityService.GetActivitySummary(userID)
	} else {
		// Get overall activity summary
		summary, err = h.activityService.GetGlobalActivitySummary()
	}

	if err != nil {
		response.Error(c, http.StatusInternalServerError, "SUMMARY_ERROR", err.Error())
		return
	}

	response.Success(c, summary)
}

// Helper function to parse comma-separated values
func parseCommaSeparatedValues(input string) []string {
	if input == "" {
		return []string{}
	}

	values := make([]string, 0)
	parts := []byte(input)
	var current string

	for _, b := range parts {
		if b == ',' {
			if current != "" {
				values = append(values, current)
				current = ""
			}
		} else {
			current += string(b)
		}
	}

	if current != "" {
		values = append(values, current)
	}

	return values
}

