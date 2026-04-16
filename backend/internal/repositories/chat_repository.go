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
			"agent_id":   agentID,
			"status":     "in_progress",
			"assigned_at": time.Now(),
		}).Error
}

// ===== Message Operations =====

// CreateMessage creates a new chat message
func (r *ChatRepository) CreateMessage(message *models.ChatMessage) error {
	return r.db.Create(message).Error
}

// GetConversationMessages retrieves messages for a conversation
func (r *ChatRepository) GetConversationMessages(conversationID uuid.UUID, limit, offset int) ([]models.ChatMessage, error) {
	var messages []models.ChatMessage
	err := r.db.
		Where("conversation_id = ?", conversationID).
		Preload("Sender").
		Preload("Attachments").
		Preload("Reactions").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&messages).Error
	return messages, err
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

// ===== Typing Indicator Operations =====

// SetTypingIndicator sets or updates typing indicator
func (r *ChatRepository) SetTypingIndicator(conversationID uuid.UUID, userID uuid.UUID, duration time.Duration) error {
	indicator := &models.TypingIndicator{
		ID:             uuid.New(),
		ConversationID: conversationID,
		UserID:         userID,
		StartedAt:      time.Now(),
		ExpiresAt:      time.Now().Add(duration),
	}

	return r.db.Clauses(clause.OnConflict{
		UpdateAll: true,
	}).Create(indicator).Error
}

// GetActiveTypingUsers gets users currently typing in a conversation
func (r *ChatRepository) GetActiveTypingUsers(conversationID uuid.UUID) ([]uuid.UUID, error) {
	var userIDs []uuid.UUID
	err := r.db.Model(&models.TypingIndicator{}).
		Where("conversation_id = ? AND expires_at > ?", conversationID, time.Now()).
		Pluck("user_id", &userIDs).Error
	return userIDs, err
}

// ClearTypingIndicator clears typing indicator for a user
func (r *ChatRepository) ClearTypingIndicator(conversationID uuid.UUID, userID uuid.UUID) error {
	return r.db.Delete(&models.TypingIndicator{}).
		Where("conversation_id = ? AND user_id = ?", conversationID, userID).Error
}

// ===== Agent Status Operations =====

// UpdateAgentStatus updates agent online/offline status
func (r *ChatRepository) UpdateAgentStatus(userID uuid.UUID, status string, activeConversations int) error {
	agentStatus := &models.AgentStatus{
		UserID:              userID,
		Status:              status,
		ActiveConversations: activeConversations,
		LastHeartbeat:       time.Now(),
		UpdatedAt:           time.Now(),
	}

	return r.db.Clauses(clause.OnConflict{
		UpdateAll: true,
	}).Create(agentStatus).Error
}

// GetAgentStatus retrieves agent status
func (r *ChatRepository) GetAgentStatus(userID uuid.UUID) (*models.AgentStatus, error) {
	var status models.AgentStatus
	err := r.db.Where("user_id = ?", userID).First(&status).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &status, err
}

// GetAvailableAgents retrieves agents available to take conversations
func (r *ChatRepository) GetAvailableAgents(limit int) ([]models.AgentStatus, error) {
	var agents []models.AgentStatus
	err := r.db.
		Where("status IN ? AND active_conversations < max_conversations", []string{"online", "away"}).
		Order("active_conversations ASC").
		Limit(limit).
		Find(&agents).Error
	return agents, err
}

// ===== Message Reactions =====

// AddReaction adds emoji reaction to a message
func (r *ChatRepository) AddReaction(messageID uuid.UUID, userID uuid.UUID, reaction string) error {
	msgReaction := &models.MessageReaction{
		ID:        uuid.New(),
		MessageID: messageID,
		UserID:    userID,
		Reaction:  reaction,
	}
	return r.db.Create(msgReaction).Error
}

// RemoveReaction removes emoji reaction
func (r *ChatRepository) RemoveReaction(messageID uuid.UUID, userID uuid.UUID, reaction string) error {
	return r.db.Delete(&models.MessageReaction{}).
		Where("message_id = ? AND user_id = ? AND reaction = ?", messageID, userID, reaction).Error
}

// GetMessageReactions gets reactions for a message
func (r *ChatRepository) GetMessageReactions(messageID uuid.UUID) ([]models.MessageReaction, error) {
	var reactions []models.MessageReaction
	err := r.db.Where("message_id = ?", messageID).Find(&reactions).Error
	return reactions, err
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
