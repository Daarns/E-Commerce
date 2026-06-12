package notification

import (
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	"encoding/json"

	"github.com/google/uuid"
)

type Service struct {
	repo *repositories.NotificationRepository
}

func NewService(repo *repositories.NotificationRepository) *Service {
	return &Service{repo: repo}
}

func (s *Service) CreateForUser(userID uuid.UUID, notificationType string, title string, message string, metadata map[string]interface{}) error {
	rawMetadata := "{}"
	if metadata != nil {
		encoded, err := json.Marshal(metadata)
		if err != nil {
			return err
		}
		rawMetadata = string(encoded)
	}

	return s.repo.Create(&models.Notification{
		ID:       uuid.New(),
		UserID:   userID,
		Type:     notificationType,
		Title:    title,
		Message:  message,
		Metadata: rawMetadata,
	})
}

func (s *Service) ListForUser(userID uuid.UUID, page, pageSize int, unreadOnly bool) (*models.NotificationListResponse, error) {
	notifications, total, err := s.repo.ListByUser(userID, page, pageSize, unreadOnly)
	if err != nil {
		return nil, err
	}
	totalPages := (int(total) + pageSize - 1) / pageSize

	return &models.NotificationListResponse{
		Notifications: notifications,
		Total:         int(total),
		Page:          page,
		PageSize:      pageSize,
		TotalPages:    totalPages,
	}, nil
}

func (s *Service) GetSummary(userID uuid.UUID) (*models.NotificationSummaryResponse, error) {
	total, err := s.repo.CountUnread(userID)
	if err != nil {
		return nil, err
	}
	return &models.NotificationSummaryResponse{UnreadCount: int(total)}, nil
}

func (s *Service) MarkRead(userID uuid.UUID, notificationID uuid.UUID) error {
	return s.repo.MarkRead(userID, notificationID)
}

func (s *Service) MarkAllRead(userID uuid.UUID) error {
	return s.repo.MarkAllRead(userID)
}
