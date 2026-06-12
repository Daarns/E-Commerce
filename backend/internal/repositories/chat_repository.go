package repositories

import (
	"ecommerce-backend/internal/models"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ChatRepository handles chat-related data operations
type ChatRepository struct {
	db *gorm.DB
}

// NewChatRepository creates a new chat repository
func NewChatRepository(db *gorm.DB) *ChatRepository {
	return &ChatRepository{db: db}
}

// ===== Conversation Operations =====

// CreateConversation creates a new conversation
func (r *ChatRepository) CreateConversation(conversation *models.Conversation) error {
	return r.db.Create(conversation).Error
}

// CreateConversationWithInitialMessage stores a new conversation and its first
// message in one transaction so failed message writes do not leave empty inbox rows.
func (r *ChatRepository) CreateConversationWithInitialMessage(conversation *models.Conversation, message *models.ChatMessage, senderIsCustomer bool) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(conversation).Error; err != nil {
			return err
		}

		return createMessageWithSummaryTx(tx, message, senderIsCustomer)
	})
}

// GetConversationByID retrieves a conversation by ID
func (r *ChatRepository) GetConversationByID(id uuid.UUID) (*models.Conversation, error) {
	var conversation models.Conversation
	err := r.db.
		Preload("User").
		Preload("Agent").
		Preload("Messages", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at ASC").Limit(50)
		}).
		Preload("Metadata").
		First(&conversation, id).Error

	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &conversation, err
}

// GetConversationHeaderByID retrieves a conversation without loading messages.
func (r *ChatRepository) GetConversationHeaderByID(id uuid.UUID) (*models.Conversation, error) {
	var conversation models.Conversation
	err := r.db.
		Preload("User").
		Preload("Agent").
		Preload("Metadata").
		First(&conversation, id).Error

	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &conversation, err
}

// GetUserConversations retrieves conversations for a user
func (r *ChatRepository) GetUserConversations(userID uuid.UUID, page, pageSize int) ([]models.Conversation, int64, error) {
	var conversations []models.Conversation
	var total int64

	offset := (page - 1) * pageSize

	// Count total
	r.db.Model(&models.Conversation{}).
		Where("user_id = ?", userID).
		Count(&total)

	// Get paginated results
	err := r.db.
		Where("user_id = ?", userID).
		Preload("Agent").
		Preload("Metadata").
		Order("last_message_at DESC, created_at DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&conversations).Error

	return conversations, total, err
}

// GetAdminConversations retrieves conversations for admin inbox.
func (r *ChatRepository) GetAdminConversations(status, query string, page, pageSize int) ([]models.Conversation, int64, error) {
	var conversations []models.Conversation
	var total int64

	offset := (page - 1) * pageSize
	q := r.db.Model(&models.Conversation{}).
		Joins("LEFT JOIN users ON users.id = conversations.user_id")

	if status != "" && status != "all" {
		q = q.Where("conversations.status = ?", status)
	}
	if query != "" {
		like := "%" + query + "%"
		q = q.Where(
			"conversations.subject ILIKE ? OR users.name ILIKE ? OR users.email ILIKE ?",
			like,
			like,
			like,
		)
	}

	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := q.
		Preload("User").
		Preload("Agent").
		Preload("Metadata").
		Order("COALESCE(conversations.last_message_at, conversations.created_at) DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&conversations).Error

	return conversations, total, err
}

// GetAdminUnreadAgentCount returns total unread customer messages for admin inbox.
func (r *ChatRepository) GetAdminUnreadAgentCount() (int64, error) {
	var total int64
	err := r.db.Model(&models.Conversation{}).
		Select("COALESCE(SUM(unread_agent_count), 0)").
		Scan(&total).Error
	return total, err
}

// GetAgentConversations retrieves conversations assigned to an agent
func (r *ChatRepository) GetAgentConversations(agentID uuid.UUID, page, pageSize int) ([]models.Conversation, int64, error) {
	var conversations []models.Conversation
	var total int64

	offset := (page - 1) * pageSize

	r.db.Model(&models.Conversation{}).
		Where("agent_id = ? AND status != ?", agentID, "closed").
		Count(&total)

	err := r.db.
		Where("agent_id = ? AND status != ?", agentID, "closed").
		Preload("User").
		Preload("Metadata").
		Order("priority DESC, last_message_at DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&conversations).Error

	return conversations, total, err
}

// GetOpenConversations retrieves unassigned open conversations
func (r *ChatRepository) GetOpenConversations(limit int) ([]models.Conversation, error) {
	var conversations []models.Conversation
	err := r.db.
		Where("status = ? AND agent_id IS NULL", "open").
		Preload("User").
		Order("priority DESC, created_at ASC").
		Limit(limit).
		Find(&conversations).Error
	return conversations, err
}

// UpdateConversationStatus updates conversation status
func (r *ChatRepository) UpdateConversationStatus(id uuid.UUID, status string) error {
	updates := map[string]interface{}{"status": status}
	if status == "resolved" {
		updates["resolved_at"] = time.Now()
	} else if status == "closed" {
		updates["closed_at"] = time.Now()
	}
	return r.db.Model(&models.Conversation{}).Where("id = ?", id).Updates(updates).Error
}

// AssignConversation assigns conversation to an agent
func (r *ChatRepository) AssignConversation(conversationID uuid.UUID, agentID uuid.UUID) error {
	return r.db.Model(&models.Conversation{}).
		Where("id = ?", conversationID).
		Updates(map[string]interface{}{
			"agent_id":    agentID,
			"status":      "in_progress",
			"assigned_at": time.Now(),
		}).Error
}

// ===== Message Operations =====

// CreateMessage creates a new chat message
func (r *ChatRepository) CreateMessage(message *models.ChatMessage) error {
	return r.db.Create(message).Error
}

// CreateMessageWithSummary stores a message and updates inbox summary fields atomically.
func (r *ChatRepository) CreateMessageWithSummary(message *models.ChatMessage, senderIsCustomer bool) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		return createMessageWithSummaryTx(tx, message, senderIsCustomer)
	})
}

func createMessageWithSummaryTx(tx *gorm.DB, message *models.ChatMessage, senderIsCustomer bool) error {
	if err := tx.Create(message).Error; err != nil {
		return err
	}

	updates := map[string]interface{}{
		"last_message":    message.Message,
		"last_message_at": message.CreatedAt,
		"updated_at":      time.Now(),
	}
	if senderIsCustomer {
		updates["unread_agent_count"] = gorm.Expr("unread_agent_count + 1")
	} else {
		updates["unread_customer_count"] = gorm.Expr("unread_customer_count + 1")
	}

	if err := tx.Model(&models.Conversation{}).
		Where("id = ?", message.ConversationID).
		Updates(updates).Error; err != nil {
		return err
	}

	metadata := &models.ConversationMetadata{
		ID:             uuid.New(),
		ConversationID: message.ConversationID,
	}
	if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(metadata).Error; err != nil {
		return err
	}

	metadataUpdates := map[string]interface{}{
		"message_count": gorm.Expr("message_count + 1"),
		"updated_at":    time.Now(),
	}
	if senderIsCustomer {
		metadataUpdates["user_message_count"] = gorm.Expr("user_message_count + 1")
	} else {
		metadataUpdates["agent_message_count"] = gorm.Expr("agent_message_count + 1")
	}

	return tx.Model(&models.ConversationMetadata{}).
		Where("conversation_id = ?", message.ConversationID).
		Updates(metadataUpdates).Error
}

// GetConversationMessages retrieves messages for a conversation
func (r *ChatRepository) GetConversationMessages(conversationID uuid.UUID, limit, offset int) ([]models.ChatMessage, error) {
	var messages []models.ChatMessage
	err := r.db.
		Where("conversation_id = ?", conversationID).
		Preload("Sender").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&messages).Error
	return messages, err
}

// GetMessageByID retrieves a message by ID.
func (r *ChatRepository) GetMessageByID(messageID uuid.UUID) (*models.ChatMessage, error) {
	var message models.ChatMessage
	err := r.db.First(&message, messageID).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &message, err
}

// MarkConversationMessagesAsRead marks unread messages from the other participant as read.
func (r *ChatRepository) MarkConversationMessagesAsRead(conversationID uuid.UUID, readerID uuid.UUID, readerIsCustomer bool) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		now := time.Now()
		if err := tx.Model(&models.ChatMessage{}).
			Where("conversation_id = ? AND sender_id != ? AND is_read = ?", conversationID, readerID, false).
			Updates(map[string]interface{}{
				"is_read": true,
				"read_at": now,
			}).Error; err != nil {
			return err
		}

		resetField := "unread_agent_count"
		if readerIsCustomer {
			resetField = "unread_customer_count"
		}

		return tx.Model(&models.Conversation{}).
			Where("id = ?", conversationID).
			Update(resetField, 0).Error
	})
}

// MarkMessageAsRead marks a message as read
func (r *ChatRepository) MarkMessageAsRead(messageID uuid.UUID) error {
	return r.db.Model(&models.ChatMessage{}).
		Where("id = ?", messageID).
		Updates(map[string]interface{}{
			"is_read": true,
			"read_at": time.Now(),
		}).Error
}

// GetUnreadMessageCount retrieves unread message count for a conversation
func (r *ChatRepository) GetUnreadMessageCount(conversationID uuid.UUID, userID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.Model(&models.ChatMessage{}).
		Where("conversation_id = ? AND sender_id != ? AND is_read = ?", conversationID, userID, false).
		Count(&count).Error
	return count, err
}

// SetTypingIndicator stores a short-lived typing marker for a conversation participant.
func (r *ChatRepository) SetTypingIndicator(conversationID uuid.UUID, userID uuid.UUID, duration time.Duration) error {
	indicator := &models.TypingIndicator{
		ID:             uuid.New(),
		ConversationID: conversationID,
		UserID:         userID,
		StartedAt:      time.Now(),
		ExpiresAt:      time.Now().Add(duration),
	}

	return r.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "conversation_id"}, {Name: "user_id"}},
		UpdateAll: true,
	}).Create(indicator).Error
}

// ClearTypingIndicator removes the current typing marker for a participant.
func (r *ChatRepository) ClearTypingIndicator(conversationID uuid.UUID, userID uuid.UUID) error {
	return r.db.
		Where("conversation_id = ? AND user_id = ?", conversationID, userID).
		Delete(&models.TypingIndicator{}).Error
}

// GetActiveTypingUsers returns participants whose typing marker has not expired.
func (r *ChatRepository) GetActiveTypingUsers(conversationID uuid.UUID) ([]uuid.UUID, error) {
	var userIDs []uuid.UUID
	err := r.db.Model(&models.TypingIndicator{}).
		Where("conversation_id = ? AND expires_at > ?", conversationID, time.Now()).
		Pluck("user_id", &userIDs).Error
	return userIDs, err
}

// ===== Metadata Operations =====

// GetOrCreateConversationMetadata gets or creates metadata for conversation
func (r *ChatRepository) GetOrCreateConversationMetadata(conversationID uuid.UUID) (*models.ConversationMetadata, error) {
	var metadata models.ConversationMetadata
	err := r.db.FirstOrCreate(&metadata, models.ConversationMetadata{
		ConversationID: conversationID,
	}).Error
	return &metadata, err
}

// UpdateConversationMetadata updates metadata
func (r *ChatRepository) UpdateConversationMetadata(conversationID uuid.UUID, updates map[string]interface{}) error {
	return r.db.Model(&models.ConversationMetadata{}).
		Where("conversation_id = ?", conversationID).
		Updates(updates).Error
}

// ===== Search & Analytics =====

// SearchConversations searches conversations by subject, status, priority
func (r *ChatRepository) SearchConversations(userID uuid.UUID, query string, filters map[string]interface{}, page, pageSize int) ([]models.Conversation, int64, error) {
	var conversations []models.Conversation
	var total int64

	offset := (page - 1) * pageSize
	q := r.db.Where("user_id = ? AND (subject LIKE ? OR status = ?)", userID, "%"+query+"%", query)

	// Apply filters
	if status, ok := filters["status"]; ok {
		q = q.Where("status = ?", status)
	}
	if priority, ok := filters["priority"]; ok {
		q = q.Where("priority = ?", priority)
	}

	q.Count(&total)

	err := q.
		Preload("Agent").
		Preload("Metadata").
		Order("created_at DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&conversations).Error

	return conversations, total, err
}

// GetConversationStats retrieves statistics about conversations
func (r *ChatRepository) GetConversationStats(userID uuid.UUID) (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	var total, open, resolved, closed int64
	r.db.Model(&models.Conversation{}).Where("user_id = ?", userID).Count(&total)
	r.db.Model(&models.Conversation{}).Where("user_id = ? AND status = ?", userID, "open").Count(&open)
	r.db.Model(&models.Conversation{}).Where("user_id = ? AND status = ?", userID, "resolved").Count(&resolved)
	r.db.Model(&models.Conversation{}).Where("user_id = ? AND status = ?", userID, "closed").Count(&closed)

	stats["total"] = total
	stats["open"] = open
	stats["resolved"] = resolved
	stats["closed"] = closed

	return stats, nil
}
