package repositories

import (
	"ecommerce-backend/internal/models"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type NotificationRepository struct {
	db *gorm.DB
}

func NewNotificationRepository(db *gorm.DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

func (r *NotificationRepository) Create(notification *models.Notification) error {
	return r.db.Create(notification).Error
}

func (r *NotificationRepository) ListByUser(userID uuid.UUID, page, pageSize int) ([]models.Notification, int64, error) {
	var notifications []models.Notification
	var total int64
	offset := (page - 1) * pageSize

	if err := r.db.Model(&models.Notification{}).
		Where("user_id = ?", userID).
		Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := r.db.
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&notifications).Error

	return notifications, total, err
}

func (r *NotificationRepository) CountUnread(userID uuid.UUID) (int64, error) {
	var total int64
	err := r.db.Model(&models.Notification{}).
		Where("user_id = ? AND read_at IS NULL", userID).
		Count(&total).Error
	return total, err
}

func (r *NotificationRepository) MarkRead(userID uuid.UUID, notificationID uuid.UUID) error {
	now := time.Now()
	return r.db.Model(&models.Notification{}).
		Where("id = ? AND user_id = ? AND read_at IS NULL", notificationID, userID).
		Updates(map[string]interface{}{
			"read_at":    now,
			"updated_at": now,
		}).Error
}

func (r *NotificationRepository) MarkAllRead(userID uuid.UUID) error {
	now := time.Now()
	return r.db.Model(&models.Notification{}).
		Where("user_id = ? AND read_at IS NULL", userID).
		Updates(map[string]interface{}{
			"read_at":    now,
			"updated_at": now,
		}).Error
}
