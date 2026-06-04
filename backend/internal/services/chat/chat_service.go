package chat

import (
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
)

// ChatService handles chat business logic
type ChatService struct {
	chatRepo      *repositories.ChatRepository
	userRepo      *repositories.UserRepository
	events        ChatEventPublisher
	notifications ChatNotificationWriter
}

type ChatEventPublisher interface {
	PublishConversationEvent(conversationID uuid.UUID, eventType string, payload interface{})
	PublishAdminEvent(eventType string, payload interface{})
}

type ChatNotificationWriter interface {
	CreateForUser(userID uuid.UUID, notificationType string, title string, message string, metadata map[string]interface{}) error
}

// NewChatService creates a new chat service
func NewChatService(chatRepo *repositories.ChatRepository, userRepo *repositories.UserRepository) *ChatService {
	return &ChatService{
		chatRepo: chatRepo,
		userRepo: userRepo,
	}
}

func (s *ChatService) SetEventPublisher(publisher ChatEventPublisher) {
	s.events = publisher
}

func (s *ChatService) SetNotificationWriter(writer ChatNotificationWriter) {
	s.notifications = writer
}

// ===== Conversation Management =====

// CreateConversation starts a new conversation
func (s *ChatService) CreateConversation(userID uuid.UUID, req *models.CreateConversationRequest) (*models.ConversationResponse, error) {
	subject := strings.TrimSpace(req.Subject)
	messageText := strings.TrimSpace(req.Message)
	if messageText == "" {
		messageText = strings.TrimSpace(req.InitialMessage)
	}
	category := strings.TrimSpace(req.Category)
	if category == "" {
		category = "support"
	}
	priority := strings.TrimSpace(req.Priority)
	if priority == "" {
		priority = "normal"
	}

	if len(subject) < 3 || len(subject) > 200 {
		return nil, errors.New("subject must be between 3 and 200 characters")
	}
	if len(messageText) < 1 || len(messageText) > 2000 {
		return nil, errors.New("message must be between 1 and 2000 characters")
	}

	conversation := &models.Conversation{
		ID:       uuid.New(),
		UserID:   userID,
		Subject:  subject,
		Category: category,
		Priority: priority,
		Status:   "open",
	}

	message := &models.ChatMessage{
		ID:             uuid.New(),
		ConversationID: conversation.ID,
		SenderID:       userID,
		Message:        messageText,
		MessageType:    "text",
	}

	if err := s.chatRepo.CreateConversationWithInitialMessage(conversation, message, true); err != nil {
		return nil, err
	}

	// Create metadata
	metadata, _ := s.chatRepo.GetOrCreateConversationMetadata(conversation.ID)
	conversation.LastMessage = &messageText
	conversation.LastMessageAt = &message.CreatedAt
	conversation.UnreadAgentCount = 1

	response := conversationToResponse(conversation, userID)
	response.Metadata = metadata
	s.publishConversationEvent(conversation.ID, "conversation:updated", response)
	s.publishConversationEvent(conversation.ID, "message:new", messageToResponse(message))
	s.notifyAdmins("Chat CS baru", subject, conversation.ID)
	return response, nil
}

// GetConversation retrieves a single conversation with messages
func (s *ChatService) GetConversation(conversationID uuid.UUID, userID uuid.UUID, isAdmin bool) (*models.ConversationResponse, error) {
	conversation, err := s.chatRepo.GetConversationByID(conversationID)
	if err != nil {
		return nil, err
	}
	if conversation == nil {
		return nil, errors.New("conversation not found")
	}

	// Verify user has access
	if !canAccessConversation(conversation, userID, isAdmin) {
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

	response := conversationToResponse(conversation, userID)
	response.Messages = messages
	response.Metadata = conversation.Metadata
	response.UnreadCount = int(unreadCount)
	return response, nil
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
		convResponses[i] = *conversationToResponse(&conv, userID)
		convResponses[i].UnreadCount = int(unreadCount)
	}

	return &models.ConversationListResponse{
		Conversations: convResponses,
		Total:         int(total),
		Page:          page,
		PageSize:      pageSize,
		TotalPages:    totalPages,
	}, nil
}

// GetAdminConversations retrieves conversations for admin inbox.
func (s *ChatService) GetAdminConversations(status, query string, page, pageSize int) (*models.ConversationListResponse, error) {
	conversations, total, err := s.chatRepo.GetAdminConversations(status, strings.TrimSpace(query), page, pageSize)
	if err != nil {
		return nil, err
	}

	totalPages := (int(total) + pageSize - 1) / pageSize
	convResponses := make([]models.ConversationResponse, len(conversations))
	for i, conv := range conversations {
		convResponses[i] = *conversationToResponse(&conv, uuid.Nil)
		convResponses[i].UnreadCount = conv.UnreadAgentCount
	}

	return &models.ConversationListResponse{
		Conversations: convResponses,
		Total:         int(total),
		Page:          page,
		PageSize:      pageSize,
		TotalPages:    totalPages,
	}, nil
}

// GetAdminSummary returns lightweight counters for admin chat navigation.
func (s *ChatService) GetAdminSummary() (*models.ChatAdminSummaryResponse, error) {
	unreadCount, err := s.chatRepo.GetAdminUnreadAgentCount()
	if err != nil {
		return nil, err
	}

	return &models.ChatAdminSummaryResponse{
		UnreadAgentCount: int(unreadCount),
	}, nil
}

// UpdateConversationStatus updates conversation status
func (s *ChatService) UpdateConversationStatus(conversationID uuid.UUID, status string) error {
	validStatuses := map[string]bool{"open": true, "in_progress": true, "resolved": true, "closed": true}
	if !validStatuses[status] {
		return errors.New("invalid status")
	}
	if err := s.chatRepo.UpdateConversationStatus(conversationID, status); err != nil {
		return err
	}
	conversation, err := s.GetConversation(conversationID, uuid.Nil, true)
	if err == nil {
		s.publishConversationEvent(conversationID, "conversation:updated", conversation)
	}
	return nil
}

// AssignConversation assigns conversation to an agent
func (s *ChatService) AssignConversation(conversationID uuid.UUID, agentID uuid.UUID) error {
	return s.chatRepo.AssignConversation(conversationID, agentID)
}

// ===== Message Operations =====

// SendMessage sends a new message in a conversation
func (s *ChatService) SendMessage(conversationID uuid.UUID, senderID uuid.UUID, isAdmin bool, req *models.SendMessageRequest) (*models.ChatMessageResponse, error) {
	conversation, err := s.chatRepo.GetConversationHeaderByID(conversationID)
	if err != nil {
		return nil, err
	}
	if conversation == nil {
		return nil, errors.New("conversation not found")
	}
	if !canAccessConversation(conversation, senderID, isAdmin) {
		return nil, errors.New("unauthorized access to conversation")
	}
	if conversation.Status == "closed" {
		return nil, errors.New("conversation is closed")
	}

	messageText := strings.TrimSpace(req.Message)
	if messageText == "" {
		messageText = strings.TrimSpace(req.MessageText)
	}
	if len(messageText) < 1 || len(messageText) > 2000 {
		return nil, errors.New("message must be between 1 and 2000 characters")
	}
	if req.MessageType != "" && req.MessageType != "text" {
		return nil, errors.New("only text messages are supported")
	}

	message := &models.ChatMessage{
		ID:             uuid.New(),
		ConversationID: conversationID,
		SenderID:       senderID,
		Message:        messageText,
		MessageType:    "text",
	}

	if err := s.chatRepo.CreateMessageWithSummary(message, conversation.UserID == senderID && !isAdmin); err != nil {
		return nil, err
	}

	response := messageToResponse(message)
	s.publishConversationEvent(conversationID, "message:new", response)
	s.createMessageNotification(conversation, senderID, isAdmin, messageText)
	updatedConversation, err := s.GetConversation(conversationID, senderID, isAdmin)
	if err == nil {
		s.publishConversationEvent(conversationID, "conversation:updated", updatedConversation)
	}
	return response, nil
}

// GetConversationMessages retrieves paginated messages
func (s *ChatService) GetConversationMessages(conversationID uuid.UUID, userID uuid.UUID, isAdmin bool, limit, offset int) ([]models.ChatMessageResponse, error) {
	conversation, err := s.chatRepo.GetConversationHeaderByID(conversationID)
	if err != nil {
		return nil, err
	}
	if conversation == nil {
		return nil, errors.New("conversation not found")
	}
	if !canAccessConversation(conversation, userID, isAdmin) {
		return nil, errors.New("unauthorized access to conversation")
	}

	messages, err := s.chatRepo.GetConversationMessages(conversationID, limit, offset)
	if err != nil {
		return nil, err
	}

	responses := make([]models.ChatMessageResponse, len(messages))
	for i, msg := range messages {
		responses[i] = *messageToResponse(&msg)
	}

	return responses, nil
}

// MarkAsRead marks a message as read after checking access.
func (s *ChatService) MarkAsRead(messageID uuid.UUID, userID uuid.UUID, isAdmin bool) error {
	message, err := s.chatRepo.GetMessageByID(messageID)
	if err != nil {
		return err
	}
	if message == nil {
		return errors.New("message not found")
	}
	conversation, err := s.chatRepo.GetConversationHeaderByID(message.ConversationID)
	if err != nil {
		return err
	}
	if conversation == nil {
		return errors.New("conversation not found")
	}
	if !canAccessConversation(conversation, userID, isAdmin) {
		return errors.New("unauthorized access to conversation")
	}
	return s.chatRepo.MarkMessageAsRead(messageID)
}

// MarkConversationAsRead marks all unread messages in a conversation for reader.
func (s *ChatService) MarkConversationAsRead(conversationID uuid.UUID, userID uuid.UUID, isAdmin bool) error {
	conversation, err := s.chatRepo.GetConversationHeaderByID(conversationID)
	if err != nil {
		return err
	}
	if conversation == nil {
		return errors.New("conversation not found")
	}
	if !canAccessConversation(conversation, userID, isAdmin) {
		return errors.New("unauthorized access to conversation")
	}
	if err := s.chatRepo.MarkConversationMessagesAsRead(conversationID, userID, !isAdmin); err != nil {
		return err
	}
	s.publishConversationEvent(conversationID, "read:updated", map[string]interface{}{
		"conversation_id": conversationID,
		"reader_id":       userID,
		"reader_is_admin": isAdmin,
	})
	return nil
}

// ===== Real-time Features =====

// SetTypingIndicator sets user as typing
func (s *ChatService) SetTypingIndicator(conversationID uuid.UUID, userID uuid.UUID, isAdmin bool) error {
	conversation, err := s.chatRepo.GetConversationHeaderByID(conversationID)
	if err != nil {
		return err
	}
	if conversation == nil {
		return errors.New("conversation not found")
	}
	if !canAccessConversation(conversation, userID, isAdmin) {
		return errors.New("unauthorized access to conversation")
	}
	if err := s.chatRepo.SetTypingIndicator(conversationID, userID, 5*time.Second); err != nil {
		return err
	}
	s.publishConversationEvent(conversationID, "typing:update", map[string]interface{}{
		"conversation_id": conversationID,
		"user_id":         userID,
		"is_typing":       true,
	})
	return nil
}

// GetTypingUsers gets users currently typing
func (s *ChatService) GetTypingUsers(conversationID uuid.UUID, userID uuid.UUID, isAdmin bool) ([]uuid.UUID, error) {
	conversation, err := s.chatRepo.GetConversationHeaderByID(conversationID)
	if err != nil {
		return nil, err
	}
	if conversation == nil {
		return nil, errors.New("conversation not found")
	}
	if !canAccessConversation(conversation, userID, isAdmin) {
		return nil, errors.New("unauthorized access to conversation")
	}
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
	if err := s.ensureMessageAccess(messageID, userID, false); err != nil {
		return err
	}
	return s.chatRepo.AddReaction(messageID, userID, reaction)
}

// RemoveReaction removes emoji reaction
func (s *ChatService) RemoveReaction(messageID uuid.UUID, userID uuid.UUID, reaction string) error {
	if err := s.ensureMessageAccess(messageID, userID, false); err != nil {
		return err
	}
	return s.chatRepo.RemoveReaction(messageID, userID, reaction)
}

func (s *ChatService) ensureMessageAccess(messageID uuid.UUID, userID uuid.UUID, isAdmin bool) error {
	message, err := s.chatRepo.GetMessageByID(messageID)
	if err != nil {
		return err
	}
	if message == nil {
		return errors.New("message not found")
	}
	conversation, err := s.chatRepo.GetConversationHeaderByID(message.ConversationID)
	if err != nil {
		return err
	}
	if conversation == nil {
		return errors.New("conversation not found")
	}
	if !canAccessConversation(conversation, userID, isAdmin) {
		return errors.New("unauthorized access to conversation")
	}
	return nil
}

func canAccessConversation(conversation *models.Conversation, userID uuid.UUID, isAdmin bool) bool {
	if isAdmin {
		return true
	}
	if conversation.UserID == userID {
		return true
	}
	return conversation.AgentID != nil && *conversation.AgentID == userID
}

func (s *ChatService) CanAccessConversation(conversationID uuid.UUID, userID uuid.UUID, isAdmin bool) bool {
	conversation, err := s.chatRepo.GetConversationHeaderByID(conversationID)
	if err != nil || conversation == nil {
		return false
	}
	return canAccessConversation(conversation, userID, isAdmin)
}

func (s *ChatService) publishConversationEvent(conversationID uuid.UUID, eventType string, payload interface{}) {
	if s.events == nil {
		return
	}
	s.events.PublishConversationEvent(conversationID, eventType, payload)
}

func (s *ChatService) createMessageNotification(conversation *models.Conversation, senderID uuid.UUID, isAdmin bool, messageText string) {
	if s.notifications == nil {
		return
	}

	if isAdmin {
		_ = s.notifications.CreateForUser(conversation.UserID, models.NotificationTypeChat, "Balasan dari CS", messageText, map[string]interface{}{
			"conversation_id": conversation.ID.String(),
		})
		return
	}

	if conversation.UserID == senderID {
		s.notifyAdmins("Pesan chat baru", messageText, conversation.ID)
	}
}

func (s *ChatService) notifyAdmins(title string, message string, conversationID uuid.UUID) {
	if s.notifications == nil || s.userRepo == nil {
		return
	}

	admins, err := s.userRepo.GetAdmins()
	if err != nil {
		return
	}
	for _, admin := range admins {
		_ = s.notifications.CreateForUser(admin.ID, models.NotificationTypeChat, title, message, map[string]interface{}{
			"conversation_id": conversationID.String(),
		})
	}
}

func conversationToResponse(conversation *models.Conversation, viewerID uuid.UUID) *models.ConversationResponse {
	unreadCount := conversation.UnreadAgentCount
	if conversation.UserID == viewerID {
		unreadCount = conversation.UnreadCustomerCount
	}

	return &models.ConversationResponse{
		ID:                  conversation.ID,
		UserID:              conversation.UserID,
		User:                userToResponse(conversation.User),
		AgentID:             conversation.AgentID,
		Agent:               userToResponse(conversation.Agent),
		Subject:             conversation.Subject,
		Status:              conversation.Status,
		Priority:            conversation.Priority,
		Category:            conversation.Category,
		AssignedAt:          conversation.AssignedAt,
		ResolvedAt:          conversation.ResolvedAt,
		ClosedAt:            conversation.ClosedAt,
		LastMessage:         conversation.LastMessage,
		LastMessageAt:       conversation.LastMessageAt,
		UnreadCustomerCount: conversation.UnreadCustomerCount,
		UnreadAgentCount:    conversation.UnreadAgentCount,
		CreatedAt:           conversation.CreatedAt,
		UpdatedAt:           conversation.UpdatedAt,
		Metadata:            conversation.Metadata,
		UnreadCount:         unreadCount,
	}
}

func messageToResponse(message *models.ChatMessage) *models.ChatMessageResponse {
	return &models.ChatMessageResponse{
		ID:             message.ID,
		ConversationID: message.ConversationID,
		SenderID:       message.SenderID,
		Sender:         userToResponse(message.Sender),
		Message:        message.Message,
		MessageType:    message.MessageType,
		FileURL:        message.FileURL,
		FileName:       message.FileName,
		IsRead:         message.IsRead,
		ReadAt:         message.ReadAt,
		CreatedAt:      message.CreatedAt,
		Attachments:    message.Attachments,
		ReactionCount:  len(message.Reactions),
	}
}

func userToResponse(user *models.User) *models.UserResponse {
	if user == nil {
		return nil
	}
	return &models.UserResponse{
		ID:       user.ID,
		Email:    user.Email,
		FullName: user.Name,
		Avatar:   user.AvatarURL,
	}
}
