package handlers

import (
	"ecommerce-backend/internal/middleware"
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

func (h *ChatHandler) SetEventPublisher(publisher chat.ChatEventPublisher) {
	h.chatService.SetEventPublisher(publisher)
}

func (h *ChatHandler) CanAccessConversation(conversationID uuid.UUID, userID uuid.UUID, isAdmin bool) bool {
	return h.chatService.CanAccessConversation(conversationID, userID, isAdmin)
}

// ===== CONVERSATION ENDPOINTS =====

// CreateConversation starts a new conversation
// POST /api/v1/chat/conversations
func (h *ChatHandler) CreateConversation(c *gin.Context) {
	userUUID, err := middleware.GetUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "User must be authenticated")
		return
	}

	var req models.CreateConversationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, err.Error())
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
	userUUID, err := middleware.GetUserID(c)
	if err != nil {
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
	if ps := firstQuery(c, "page_size", "limit"); ps != "" {
		if size, err := strconv.Atoi(ps); err == nil && size > 0 && size <= 100 {
			pageSize = size
		}
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
	userUUID, err := middleware.GetUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "User must be authenticated")
		return
	}

	conversationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid conversation ID")
		return
	}

	result, err := h.chatService.GetConversation(conversationID, userUUID, false)
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
	userUUID, err := middleware.GetUserID(c)
	if err != nil {
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

	result, err := h.chatService.SendMessage(conversationID, userUUID, false, &req)
	if err != nil {
		if err.Error() == "unauthorized access to conversation" {
			response.Error(c, http.StatusForbidden, "FORBIDDEN", "Access forbidden")
			return
		}
		if err.Error() == "conversation not found" {
			response.Error(c, http.StatusNotFound, "NOT_FOUND", "Conversation not found")
			return
		}
		response.Error(c, http.StatusBadRequest, "SEND_FAILED", err.Error())
		return
	}

	response.Created(c, result)
}

// GetMessages retrieves messages from a conversation
// GET /api/v1/chat/conversations/:id/messages
func (h *ChatHandler) GetMessages(c *gin.Context) {
	userUUID, err := middleware.GetUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "User must be authenticated")
		return
	}

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
	if o := firstQuery(c, "offset", "skip"); o != "" {
		if num, err := strconv.Atoi(o); err == nil && num >= 0 {
			offset = num
		}
	}
	if p := c.Query("page"); p != "" {
		if page, err := strconv.Atoi(p); err == nil && page > 0 {
			offset = (page - 1) * limit
		}
	}

	messages, err := h.chatService.GetConversationMessages(conversationID, userUUID, false, limit, offset)
	if err != nil {
		if err.Error() == "unauthorized access to conversation" {
			response.Error(c, http.StatusForbidden, "FORBIDDEN", "Access forbidden")
			return
		}
		if err.Error() == "conversation not found" {
			response.Error(c, http.StatusNotFound, "NOT_FOUND", "Conversation not found")
			return
		}
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
	userUUID, err := middleware.GetUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "User must be authenticated")
		return
	}

	messageID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid message ID")
		return
	}

	if err := h.chatService.MarkAsRead(messageID, userUUID, false); err != nil {
		if err.Error() == "unauthorized access to conversation" {
			response.Error(c, http.StatusForbidden, "FORBIDDEN", "Access forbidden")
			return
		}
		response.Error(c, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{"message": "Message marked as read"})
}

// MarkConversationAsRead marks all unread messages in a conversation as read.
// PUT /api/v1/chat/conversations/:id/read
func (h *ChatHandler) MarkConversationAsRead(c *gin.Context) {
	userUUID, err := middleware.GetUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "User must be authenticated")
		return
	}

	conversationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid conversation ID")
		return
	}

	if err := h.chatService.MarkConversationAsRead(conversationID, userUUID, false); err != nil {
		if err.Error() == "unauthorized access to conversation" {
			response.Error(c, http.StatusForbidden, "FORBIDDEN", "Access forbidden")
			return
		}
		response.Error(c, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{"message": "Conversation marked as read"})
}

// ===== REACTION ENDPOINTS =====

// AddReaction adds emoji reaction to message
// POST /api/v1/chat/messages/:id/reactions
func (h *ChatHandler) AddReaction(c *gin.Context) {
	userUUID, err := middleware.GetUserID(c)
	if err != nil {
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

	if err := h.chatService.AddReaction(messageID, userUUID, req.Reaction); err != nil {
		response.Error(c, http.StatusBadRequest, "REACTION_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{"message": "Reaction added"})
}

// RemoveReaction removes emoji reaction
// DELETE /api/v1/chat/messages/:id/reactions/:reaction
func (h *ChatHandler) RemoveReaction(c *gin.Context) {
	userUUID, err := middleware.GetUserID(c)
	if err != nil {
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
	userUUID, err := middleware.GetUserID(c)
	if err != nil {
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

	if err := h.chatService.SetTypingIndicator(conversationID, userUUID, false); err != nil {
		if err.Error() == "unauthorized access to conversation" {
			response.Error(c, http.StatusForbidden, "FORBIDDEN", "Access forbidden")
			return
		}
		response.Error(c, http.StatusInternalServerError, "TYPING_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{"message": "Typing status updated"})
}

// GetTypingUsers gets users currently typing
// GET /api/v1/chat/conversations/:id/typing
func (h *ChatHandler) GetTypingUsers(c *gin.Context) {
	userUUID, err := middleware.GetUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "User must be authenticated")
		return
	}

	conversationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid conversation ID")
		return
	}

	users, err := h.chatService.GetTypingUsers(conversationID, userUUID, false)
	if err != nil {
		if err.Error() == "unauthorized access to conversation" {
			response.Error(c, http.StatusForbidden, "FORBIDDEN", "Access forbidden")
			return
		}
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{
		"typing_users": users,
		"count":        len(users),
	})
}

// AdminGetConversations retrieves all conversations for admin inbox.
// GET /api/v1/admin/chat/conversations
func (h *ChatHandler) AdminGetConversations(c *gin.Context) {
	page, pageSize := getPageParams(c, 20, 100)

	result, err := h.chatService.GetAdminConversations(
		c.Query("status"),
		c.Query("search"),
		page,
		pageSize,
	)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.Success(c, result)
}

// AdminGetSummary retrieves lightweight admin chat counters.
// GET /api/v1/admin/chat/summary
func (h *ChatHandler) AdminGetSummary(c *gin.Context) {
	result, err := h.chatService.GetAdminSummary()
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.Success(c, result)
}

// AdminGetConversation retrieves a conversation for admin.
// GET /api/v1/admin/chat/conversations/:id
func (h *ChatHandler) AdminGetConversation(c *gin.Context) {
	adminUUID, err := middleware.GetUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "User must be authenticated")
		return
	}

	conversationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid conversation ID")
		return
	}

	result, err := h.chatService.GetConversation(conversationID, adminUUID, true)
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

// AdminGetMessages retrieves messages for admin.
// GET /api/v1/admin/chat/conversations/:id/messages
func (h *ChatHandler) AdminGetMessages(c *gin.Context) {
	adminUUID, err := middleware.GetUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "User must be authenticated")
		return
	}

	conversationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid conversation ID")
		return
	}

	limit := getLimitParam(c, 50, 100)
	offset := 0
	if o := firstQuery(c, "offset", "skip"); o != "" {
		if num, err := strconv.Atoi(o); err == nil && num >= 0 {
			offset = num
		}
	}
	if p := c.Query("page"); p != "" {
		if page, err := strconv.Atoi(p); err == nil && page > 0 {
			offset = (page - 1) * limit
		}
	}

	messages, err := h.chatService.GetConversationMessages(conversationID, adminUUID, true, limit, offset)
	if err != nil {
		if err.Error() == "conversation not found" {
			response.Error(c, http.StatusNotFound, "NOT_FOUND", "Conversation not found")
			return
		}
		response.Error(c, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{
		"messages": messages,
		"count":    len(messages),
	})
}

// AdminSendMessage sends a message as admin.
// POST /api/v1/admin/chat/conversations/:id/messages
func (h *ChatHandler) AdminSendMessage(c *gin.Context) {
	adminUUID, err := middleware.GetUserID(c)
	if err != nil {
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

	result, err := h.chatService.SendMessage(conversationID, adminUUID, true, &req)
	if err != nil {
		if err.Error() == "conversation not found" {
			response.Error(c, http.StatusNotFound, "NOT_FOUND", "Conversation not found")
			return
		}
		response.Error(c, http.StatusBadRequest, "SEND_FAILED", err.Error())
		return
	}

	response.Created(c, result)
}

// AdminUpdateConversationStatus updates conversation status.
// PUT /api/v1/admin/chat/conversations/:id/status
func (h *ChatHandler) AdminUpdateConversationStatus(c *gin.Context) {
	conversationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid conversation ID")
		return
	}

	var req models.UpdateConversationStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	if err := h.chatService.UpdateConversationStatus(conversationID, req.Status); err != nil {
		response.Error(c, http.StatusBadRequest, "UPDATE_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{"message": "Conversation status updated"})
}

// AdminMarkConversationAsRead marks all unread messages in a conversation for admin.
// PUT /api/v1/admin/chat/conversations/:id/read
func (h *ChatHandler) AdminMarkConversationAsRead(c *gin.Context) {
	adminUUID, err := middleware.GetUserID(c)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "User must be authenticated")
		return
	}

	conversationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "INVALID_ID", "Invalid conversation ID")
		return
	}

	if err := h.chatService.MarkConversationAsRead(conversationID, adminUUID, true); err != nil {
		if err.Error() == "conversation not found" {
			response.Error(c, http.StatusNotFound, "NOT_FOUND", "Conversation not found")
			return
		}
		response.Error(c, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		return
	}

	response.Success(c, gin.H{"message": "Conversation marked as read"})
}

func getPageParams(c *gin.Context, defaultLimit int, maxLimit int) (int, int) {
	page := 1
	if p := c.Query("page"); p != "" {
		if pageNum, err := strconv.Atoi(p); err == nil && pageNum > 0 {
			page = pageNum
		}
	}
	return page, getLimitParam(c, defaultLimit, maxLimit)
}

func getLimitParam(c *gin.Context, defaultLimit int, maxLimit int) int {
	limit := defaultLimit
	if value := firstQuery(c, "limit", "page_size"); value != "" {
		if parsed, err := strconv.Atoi(value); err == nil && parsed > 0 && parsed <= maxLimit {
			limit = parsed
		}
	}
	return limit
}

func firstQuery(c *gin.Context, keys ...string) string {
	for _, key := range keys {
		if value := c.Query(key); value != "" {
			return value
		}
	}
	return ""
}
