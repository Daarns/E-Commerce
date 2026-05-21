package handlers

import (
	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/services/chat"
	"ecommerce-backend/pkg/response"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ChatHandler handles chat HTTP requests
type ChatHandler struct {
	chatService *chat.ChatService
}

// NewChatHandler creates a new chat handler
func NewChatHandler(chatService *chat.ChatService) *ChatHandler {
	return &ChatHandler{
		chatService: chatService,
	}
}

// ===== CONVERSATION ENDPOINTS =====

// CreateConversation starts a new conversation
// POST /api/v1/chat/conversations
func (h *ChatHandler) CreateConversation(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "User must be authenticated")
		return
	}

	var req models.CreateConversationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_USER_ID", "Invalid user ID")
		return
	}

	result, err := h.chatService.CreateConversation(userUUID, &req)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "CREATE_FAILED", err.Error())
		return
	}

	response.Created(c, result)
}

// GetConversations retrieves user's conversations
// GET /api/v1/chat/conversations
func (h *ChatHandler) GetConversations(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "User must be authenticated")
		return
	}

	page := 1
	if p := c.Query("page"); p != "" {
		if pageNum, err := strconv.Atoi(p); err == nil && pageNum > 0 {
			page = pageNum
		}
	}

	pageSize := 20
	if ps := c.Query("page_size"); ps != "" {
		if size, err := strconv.Atoi(ps); err == nil && size > 0 && size <= 100 {
			pageSize = size
		}
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_USER_ID", "Invalid user ID")
		return
	}

	result, err := h.chatService.GetUserConversations(userUUID, page, pageSize)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.Success(c, result)
}

// GetConversation retrieves a specific conversation
// GET /api/v1/chat/conversations/:id
func (h *ChatHandler) GetConversation(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "User must be authenticated")
		return
	}

	conversationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid conversation ID")
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_USER_ID", "Invalid user ID")
		return
	}

	result, err := h.chatService.GetConversation(conversationID, userUUID)
	if err != nil {
		if err.Error() == "conversation not found" {
			response.Error(c, http.StatusNotFound, "NOT_FOUND", "Conversation not found")
			return
		}
		response.Error(c, http.StatusForbidden, "FORBIDDEN", err.Error())
		return
	}

	response.Success(c, result)
}

// ===== MESSAGE ENDPOINTS =====

// SendMessage sends a message in a conversation
// POST /api/v1/chat/conversations/:id/messages
func (h *ChatHandler) SendMessage(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "User must be authenticated")
		return
	}

	conversationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid conversation ID")
		return
	}

	var req models.SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_USER_ID", "Invalid user ID")
		return
	}

	result, err := h.chatService.SendMessage(conversationID, userUUID, &req)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "SEND_FAILED", err.Error())
		return
	}

	response.Created(c, result)
}

// GetMessages retrieves messages from a conversation
// GET /api/v1/chat/conversations/:id/messages
func (h *ChatHandler) GetMessages(c *gin.Context) {
	conversationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid conversation ID")
		return
	}

	limit := 50
	if l := c.Query("limit"); l != "" {
		if num, err := strconv.Atoi(l); err == nil && num > 0 && num <= 100 {
			limit = num
		}
	}

	offset := 0
	if o := c.Query("offset"); o != "" {
		if num, err := strconv.Atoi(o); err == nil && num >= 0 {
			offset = num
		}
	}

	messages, err := h.chatService.GetConversationMessages(conversationID, limit, offset)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{
		"messages": messages,
		"count":    len(messages),
	})
}

// MarkAsRead marks message as read
// PUT /api/v1/chat/messages/:id/read
func (h *ChatHandler) MarkAsRead(c *gin.Context) {
	messageID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid message ID")
		return
	}

	if err := h.chatService.MarkAsRead(messageID); err != nil {
		response.Error(c, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{"message": "Message marked as read"})
}

// ===== REACTION ENDPOINTS =====

// AddReaction adds emoji reaction to message
// POST /api/v1/chat/messages/:id/reactions
func (h *ChatHandler) AddReaction(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "User must be authenticated")
		return
	}

	messageID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid message ID")
		return
	}

	var req models.AddReactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_USER_ID", "Invalid user ID")
		return
	}

	if err := h.chatService.AddReaction(messageID, userUUID, req.Reaction); err != nil {
		response.Error(c, http.StatusBadRequest, "REACTION_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{"message": "Reaction added"})
}

// RemoveReaction removes emoji reaction
// DELETE /api/v1/chat/messages/:id/reactions/:reaction
func (h *ChatHandler) RemoveReaction(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "User must be authenticated")
		return
	}

	messageID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid message ID")
		return
	}

	reaction := c.Param("reaction")
	if reaction == "" {
		response.Error(c, http.StatusBadRequest, "INVALID_REACTION", "Reaction is required")
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_USER_ID", "Invalid user ID")
		return
	}

	if err := h.chatService.RemoveReaction(messageID, userUUID, reaction); err != nil {
		response.Error(c, http.StatusInternalServerError, "REMOVE_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{"message": "Reaction removed"})
}

// ===== TYPING INDICATOR =====

// SetTypingIndicator sets typing status
// POST /api/v1/chat/conversations/:id/typing
func (h *ChatHandler) SetTypingIndicator(c *gin.Context) {
	userID := c.GetString("user_id")
	if userID == "" {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "User must be authenticated")
		return
	}

	conversationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid conversation ID")
		return
	}

	var req models.TypingIndicatorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_USER_ID", "Invalid user ID")
		return
	}

	if err := h.chatService.SetTypingIndicator(conversationID, userUUID); err != nil {
		response.Error(c, http.StatusInternalServerError, "TYPING_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{"message": "Typing status updated"})
}

// GetTypingUsers gets users currently typing
// GET /api/v1/chat/conversations/:id/typing
func (h *ChatHandler) GetTypingUsers(c *gin.Context) {
	conversationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid conversation ID")
		return
	}

	users, err := h.chatService.GetTypingUsers(conversationID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{
		"typing_users": users,
		"count":        len(users),
	})
}

