package features

import (
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ChatService handles chat business logic
type ChatService struct {
	chatRepo     *repositories.ChatRepository
	userRepo     *repositories.UserRepository
}

// NewChatService creates a new chat service
func NewChatService(chatRepo *repositories.ChatRepository, userRepo *repositories.UserRepository) *ChatService {
	return &ChatService{
		chatRepo:     chatRepo,
		userRepo:     userRepo,
	}
}

// ===== Conversation Management =====

// CreateConversation starts a new conversation
func (s *ChatService) CreateConversation(userID uuid.UUID, req *models.CreateConversationRequest) (*models.ConversationResponse, error) {
	if len(req.Subject) < 3 || len(req.Subject) > 200 {
		return nil, errors.New("subject must be between 3 and 200 characters")
	}

	conversation := &models.Conversation{
		ID:       uuid.New(),
		UserID:   userID,
		Subject:  req.Subject,
		Category: req.Category,
		Priority: req.Priority,
		Status:   "open",
	}

	if err := s.chatRepo.CreateConversation(conversation); err != nil {
		return nil, err
	}

	// Create initial message
	message := &models.ChatMessage{
		ID:             uuid.New(),
		ConversationID: conversation.ID,
		SenderID:       userID,
		Message:        req.Message,
		MessageType:    "text",
	}

	if err := s.chatRepo.CreateMessage(message); err != nil {
		return nil, err
	}

	// Update last message time
	s.chatRepo.UpdateConversationStatus(conversation.ID, "open")

	// Create metadata
	metadata, _ := s.chatRepo.GetOrCreateConversationMetadata(conversation.ID)

	return &models.ConversationResponse{
		ID:       conversation.ID,
		UserID:   conversation.UserID,
		Subject:  conversation.Subject,
		Status:   conversation.Status,
		Priority: conversation.Priority,
		Category: conversation.Category,
		CreatedAt: conversation.CreatedAt,
		Metadata: metadata,
	}, nil
}

// GetConversation retrieves a single conversation with messages
func (s *ChatService) GetConversation(conversationID uuid.UUID, userID uuid.UUID) (*models.ConversationResponse, error) {
	conversation, err := s.chatRepo.GetConversationByID(conversationID)
	if err != nil {
		return nil, err
	}
	if conversation == nil {
		return nil, errors.New("conversation not found")
	}

	// Verify user has access
	if conversation.UserID != userID && (conversation.AgentID == nil || *conversation.AgentID != userID) {
		return nil, errors.New("unauthorized access to conversation")
	}

	// Get unread count
	unreadCount, _ := s.chatRepo.GetUnreadMessageCount(conversationID, userID)

	messages := make([]models.ChatMessageResponse, len(conversation.Messages))
	for i, msg := range conversation.Messages {
		messages[i] = models.ChatMessageResponse{
			ID:             msg.ID,
			ConversationID: msg.ConversationID,
			SenderID:       msg.SenderID,
			Message:        msg.Message,
			MessageType:    msg.MessageType,
			FileURL:        msg.FileURL,
			FileName:       msg.FileName,
			IsRead:         msg.IsRead,
			ReadAt:         msg.ReadAt,
			CreatedAt:      msg.CreatedAt,
		}
	}

	return &models.ConversationResponse{
		ID:            conversation.ID,
		UserID:        conversation.UserID,
		AgentID:       conversation.AgentID,
		Subject:       conversation.Subject,
		Status:        conversation.Status,
		Priority:      conversation.Priority,
		Category:      conversation.Category,
		CreatedAt:     conversation.CreatedAt,
		Messages:      messages,
		Metadata:      conversation.Metadata,
		UnreadCount:   int(unreadCount),
	}, nil
}

// GetUserConversations retrieves all conversations for a user
func (s *ChatService) GetUserConversations(userID uuid.UUID, page, pageSize int) (*models.ConversationListResponse, error) {
	conversations, total, err := s.chatRepo.GetUserConversations(userID, page, pageSize)
	if err != nil {
		return nil, err
	}

	totalPages := (int(total) + pageSize - 1) / pageSize

	convResponses := make([]models.ConversationResponse, len(conversations))
	for i, conv := range conversations {
		unreadCount, _ := s.chatRepo.GetUnreadMessageCount(conv.ID, userID)
		convResponses[i] = models.ConversationResponse{
			ID:          conv.ID,
			UserID:      conv.UserID,
			AgentID:     conv.AgentID,
			Subject:     conv.Subject,
			Status:      conv.Status,
			Priority:    conv.Priority,
			Category:    conv.Category,
			CreatedAt:   conv.CreatedAt,
			Metadata:    conv.Metadata,
			UnreadCount: int(unreadCount),
		}
	}

	return &models.ConversationListResponse{
		Conversations: convResponses,
		Total:         int(total),
		Page:          page,
		PageSize:      pageSize,
		TotalPages:    totalPages,
	}, nil
}

// UpdateConversationStatus updates conversation status
func (s *ChatService) UpdateConversationStatus(conversationID uuid.UUID, status string) error {
	validStatuses := map[string]bool{"open": true, "in_progress": true, "resolved": true, "closed": true}
	if !validStatuses[status] {
		return errors.New("invalid status")
	}
	return s.chatRepo.UpdateConversationStatus(conversationID, status)
}

// AssignConversation assigns conversation to an agent
func (s *ChatService) AssignConversation(conversationID uuid.UUID, agentID uuid.UUID) error {
	return s.chatRepo.AssignConversation(conversationID, agentID)
}

// ===== Message Operations =====

// SendMessage sends a new message in a conversation
func (s *ChatService) SendMessage(conversationID uuid.UUID, senderID uuid.UUID, req *models.SendMessageRequest) (*models.ChatMessageResponse, error) {
	if len(req.Message) < 1 || len(req.Message) > 5000 {
		return nil, errors.New("message must be between 1 and 5000 characters")
	}

	message := &models.ChatMessage{
		ID:             uuid.New(),
		ConversationID: conversationID,
		SenderID:       senderID,
		Message:        req.Message,
		MessageType:    req.MessageType,
		FileURL:        req.FileURL,
		FileName:       req.FileName,
	}

	if err := s.chatRepo.CreateMessage(message); err != nil {
		return nil, err
	}

	// Update conversation metadata
	s.chatRepo.UpdateConversationMetadata(conversationID, map[string]interface{}{
		"message_count": gorm.Expr("message_count + 1"),
	})

	return &models.ChatMessageResponse{
		ID:             message.ID,
		ConversationID: message.ConversationID,
		SenderID:       message.SenderID,
		Message:        message.Message,
		MessageType:    message.MessageType,
		FileURL:        message.FileURL,
		FileName:       message.FileName,
		IsRead:         false,
		CreatedAt:      message.CreatedAt,
	}, nil
}

// GetConversationMessages retrieves paginated messages
func (s *ChatService) GetConversationMessages(conversationID uuid.UUID, limit, offset int) ([]models.ChatMessageResponse, error) {
	messages, err := s.chatRepo.GetConversationMessages(conversationID, limit, offset)
	if err != nil {
		return nil, err
	}

	responses := make([]models.ChatMessageResponse, len(messages))
	for i, msg := range messages {
		responses[i] = models.ChatMessageResponse{
			ID:             msg.ID,
			ConversationID: msg.ConversationID,
			SenderID:       msg.SenderID,
			Message:        msg.Message,
			MessageType:    msg.MessageType,
			FileURL:        msg.FileURL,
			FileName:       msg.FileName,
			IsRead:         msg.IsRead,
			ReadAt:         msg.ReadAt,
			CreatedAt:      msg.CreatedAt,
		}
	}

	return responses, nil
}

// MarkAsRead marks a message as read
func (s *ChatService) MarkAsRead(messageID uuid.UUID) error {
	return s.chatRepo.MarkMessageAsRead(messageID)
}

// ===== Real-time Features =====

// SetTypingIndicator sets user as typing
func (s *ChatService) SetTypingIndicator(conversationID uuid.UUID, userID uuid.UUID) error {
	return s.chatRepo.SetTypingIndicator(conversationID, userID, 5*time.Second)
}

// GetTypingUsers gets users currently typing
func (s *ChatService) GetTypingUsers(conversationID uuid.UUID) ([]uuid.UUID, error) {
	return s.chatRepo.GetActiveTypingUsers(conversationID)
}

// ===== Reactions =====

// AddReaction adds emoji reaction to message
func (s *ChatService) AddReaction(messageID uuid.UUID, userID uuid.UUID, reaction string) error {
	validReactions := map[string]bool{
		"thumbs_up": true, "thumbs_down": true, "laugh": true, "cry": true, "heart": true, "fire": true,
	}
	if !validReactions[reaction] {
		return errors.New("invalid reaction")
	}
	return s.chatRepo.AddReaction(messageID, userID, reaction)
}

// RemoveReaction removes emoji reaction
func (s *ChatService) RemoveReaction(messageID uuid.UUID, userID uuid.UUID, reaction string) error {
	return s.chatRepo.RemoveReaction(messageID, userID, reaction)
}

