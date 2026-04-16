package models

import (
	"time"

	"github.com/google/uuid"
)

// Conversation represents a chat session between user and agent
type Conversation struct {
	ID             uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	UserID         uuid.UUID  `gorm:"type:uuid;not null;index" json:"user_id"`
	User           *User      `gorm:"constraint:OnDelete:CASCADE" json:"user,omitempty"`
	AgentID        *uuid.UUID `gorm:"type:uuid;index" json:"agent_id,omitempty"`
	Agent          *User      `gorm:"constraint:OnDelete:SET NULL" json:"agent,omitempty"`
	Subject        string     `gorm:"type:text;not null" json:"subject"`
	Status         string     `gorm:"type:varchar(20);default:'open'" json:"status"` // open, in_progress, resolved, closed
	Priority       string     `gorm:"type:varchar(20);default:'normal'" json:"priority"` // low, normal, high, urgent
	Category       string     `gorm:"type:varchar(50);default:'general'" json:"category"` // general, billing, support, product, complaint
	AssignedAt     *time.Time `json:"assigned_at,omitempty"`
	ResolvedAt     *time.Time `json:"resolved_at,omitempty"`
	ClosedAt       *time.Time `json:"closed_at,omitempty"`
	LastMessageAt  *time.Time `json:"last_message_at,omitempty"`
	CreatedAt      time.Time  `gorm:"type:timestamp;default:now()" json:"created_at"`
	UpdatedAt      time.Time  `gorm:"type:timestamp" json:"updated_at"`
	Messages       []ChatMessage `gorm:"constraint:OnDelete:CASCADE" json:"messages,omitempty"`
	Metadata       *ConversationMetadata `gorm:"constraint:OnDelete:CASCADE" json:"metadata,omitempty"`
}

// TableName specifies the table name
func (Conversation) TableName() string {
	return "conversations"
}

// ChatMessage represents a single message in a conversation
type ChatMessage struct {
	ID               uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	ConversationID   uuid.UUID      `gorm:"type:uuid;not null;index" json:"conversation_id"`
	Conversation     *Conversation  `gorm:"constraint:OnDelete:CASCADE" json:"conversation,omitempty"`
	SenderID         uuid.UUID      `gorm:"type:uuid;not null;index" json:"sender_id"`
	Sender           *User          `gorm:"constraint:OnDelete:SET NULL" json:"sender,omitempty"`
	Message          string         `gorm:"type:text;not null" json:"message"`
	MessageType      string         `gorm:"type:varchar(20);default:'text'" json:"message_type"` // text, image, file, system
	FileURL          *string        `gorm:"type:text" json:"file_url,omitempty"`
	FileName         *string        `gorm:"type:text" json:"file_name,omitempty"`
	IsRead           bool           `gorm:"default:false" json:"is_read"`
	ReadAt           *time.Time     `json:"read_at,omitempty"`
	CreatedAt        time.Time      `gorm:"type:timestamp;default:now()" json:"created_at"`
	UpdatedAt        time.Time      `gorm:"type:timestamp" json:"updated_at"`
	Attachments      []ChatAttachment `gorm:"constraint:OnDelete:CASCADE" json:"attachments,omitempty"`
	Reactions        []MessageReaction `gorm:"constraint:OnDelete:CASCADE" json:"reactions,omitempty"`
}

// TableName specifies the table name
func (ChatMessage) TableName() string {
	return "chat_messages"
}

// ChatAttachment represents a file attachment to a message
type ChatAttachment struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	MessageID uuid.UUID  `gorm:"type:uuid;not null;index" json:"message_id"`
	FileURL   string     `gorm:"type:text;not null" json:"file_url"`
	FileName  string     `gorm:"type:text;not null" json:"file_name"`
	FileSize  *int       `json:"file_size,omitempty"`
	FileType  *string    `gorm:"type:varchar(50)" json:"file_type,omitempty"`
	UploadedAt time.Time `gorm:"type:timestamp;default:now()" json:"uploaded_at"`
}

// TableName specifies the table name
func (ChatAttachment) TableName() string {
	return "chat_attachments"
}

// ConversationTag represents a tag for categorizing conversations
type ConversationTag struct {
	ID             uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	ConversationID uuid.UUID `gorm:"type:uuid;not null;index" json:"conversation_id"`
	TagName        string    `gorm:"type:text;not null" json:"tag_name"`
	CreatedAt      time.Time `gorm:"type:timestamp;default:now()" json:"created_at"`
}

// TableName specifies the table name
func (ConversationTag) TableName() string {
	return "conversation_tags"
}

// AgentStatus represents an agent's online/offline status
type AgentStatus struct {
	ID                  uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	UserID              uuid.UUID `gorm:"type:uuid;not null;uniqueIndex" json:"user_id"`
	Status              string    `gorm:"type:varchar(20);default:'offline'" json:"status"` // online, away, busy, offline
	ActiveConversations int       `gorm:"default:0" json:"active_conversations"`
	MaxConversations    int       `gorm:"default:5" json:"max_conversations"`
	LastHeartbeat       time.Time `gorm:"type:timestamp;default:now()" json:"last_heartbeat"`
	UpdatedAt           time.Time `gorm:"type:timestamp" json:"updated_at"`
}

// TableName specifies the table name
func (AgentStatus) TableName() string {
	return "agent_status"
}

// TypingIndicator represents when a user is typing
type TypingIndicator struct {
	ID             uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	ConversationID uuid.UUID `gorm:"type:uuid;not null;index;uniqueIndex:,composite:user_id" json:"conversation_id"`
	UserID         uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:,composite:conversation_id" json:"user_id"`
	StartedAt      time.Time `gorm:"type:timestamp;default:now()" json:"started_at"`
	ExpiresAt      time.Time `gorm:"type:timestamp;index" json:"expires_at"`
}

// TableName specifies the table name
func (TypingIndicator) TableName() string {
	return "typing_indicators"
}

// MessageReaction represents emoji reaction to a message
type MessageReaction struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	MessageID uuid.UUID `gorm:"type:uuid;not null;index;uniqueIndex:,composite:user_id,reaction" json:"message_id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:,composite:message_id,reaction" json:"user_id"`
	Reaction  string    `gorm:"type:text;default:'thumbs_up';uniqueIndex:,composite:message_id,user_id" json:"reaction"`
	CreatedAt time.Time `gorm:"type:timestamp;default:now()" json:"created_at"`
}

// TableName specifies the table name
func (MessageReaction) TableName() string {
	return "message_reactions"
}

// ConversationMetadata represents analytics for a conversation
type ConversationMetadata struct {
	ID                   uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	ConversationID       uuid.UUID `gorm:"type:uuid;not null;uniqueIndex" json:"conversation_id"`
	MessageCount         int       `gorm:"default:0" json:"message_count"`
	UserMessageCount     int       `gorm:"default:0" json:"user_message_count"`
	AgentMessageCount    int       `gorm:"default:0" json:"agent_message_count"`
	AvgResponseTimeSeconds *int    `json:"avg_response_time_seconds,omitempty"`
	SatisfactionScore    *int      `json:"satisfaction_score,omitempty"`
	FeedbackText         *string   `gorm:"type:text" json:"feedback_text,omitempty"`
	ResolvedByAgent      *bool     `json:"resolved_by_agent,omitempty"`
	ResolutionCategory   *string   `gorm:"type:text" json:"resolution_category,omitempty"`
	CreatedAt            time.Time `gorm:"type:timestamp;default:now()" json:"created_at"`
	UpdatedAt            time.Time `gorm:"type:timestamp" json:"updated_at"`
}

// TableName specifies the table name
func (ConversationMetadata) TableName() string {
	return "conversation_metadata"
}

// ===== DTOs =====

// ConversationResponse is the API response for a conversation
type ConversationResponse struct {
	ID            uuid.UUID                `json:"id"`
	UserID        uuid.UUID                `json:"user_id"`
	User          *UserResponse            `json:"user,omitempty"`
	AgentID       *uuid.UUID               `json:"agent_id,omitempty"`
	Agent         *UserResponse            `json:"agent,omitempty"`
	Subject       string                   `json:"subject"`
	Status        string                   `json:"status"`
	Priority      string                   `json:"priority"`
	Category      string                   `json:"category"`
	AssignedAt    *time.Time               `json:"assigned_at,omitempty"`
	ResolvedAt    *time.Time               `json:"resolved_at,omitempty"`
	ClosedAt      *time.Time               `json:"closed_at,omitempty"`
	LastMessageAt *time.Time               `json:"last_message_at,omitempty"`
	CreatedAt     time.Time                `json:"created_at"`
	UpdatedAt     time.Time                `json:"updated_at"`
	Messages      []ChatMessageResponse    `json:"messages,omitempty"`
	Metadata      *ConversationMetadata    `json:"metadata,omitempty"`
	UnreadCount   int                      `json:"unread_count"`
}

// ChatMessageResponse is the API response for a message
type ChatMessageResponse struct {
	ID             uuid.UUID        `json:"id"`
	ConversationID uuid.UUID        `json:"conversation_id"`
	SenderID       uuid.UUID        `json:"sender_id"`
	Sender         *UserResponse    `json:"sender,omitempty"`
	Message        string           `json:"message"`
	MessageType    string           `json:"message_type"`
	FileURL        *string          `json:"file_url,omitempty"`
	FileName       *string          `json:"file_name,omitempty"`
	IsRead         bool             `json:"is_read"`
	ReadAt         *time.Time       `json:"read_at,omitempty"`
	CreatedAt      time.Time        `json:"created_at"`
	Attachments    []ChatAttachment `json:"attachments,omitempty"`
	ReactionCount  int              `json:"reaction_count"`
}

// SendMessageRequest is the request to send a message
type SendMessageRequest struct {
	ConversationID string `json:"conversation_id" binding:"required"`
	Message        string `json:"message" binding:"required,min=1,max=5000"`
	MessageType    string `json:"message_type" binding:"omitempty,oneof=text image file system"`
	FileURL        *string `json:"file_url,omitempty"`
	FileName       *string `json:"file_name,omitempty"`
}

// CreateConversationRequest is the request to start a new conversation
type CreateConversationRequest struct {
	Subject  string `json:"subject" binding:"required,min=3,max=200"`
	Category string `json:"category" binding:"required,oneof=general billing support product complaint"`
	Priority string `json:"priority" binding:"omitempty,oneof=low normal high urgent"`
	Message  string `json:"message" binding:"required,min=1,max=5000"`
}

// AssignConversationRequest is the request to assign a conversation to an agent
type AssignConversationRequest struct {
	AgentID string `json:"agent_id" binding:"required"`
}

// UpdateConversationStatusRequest is the request to update conversation status
type UpdateConversationStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=open in_progress resolved closed"`
}

// TypingIndicatorRequest is the request for typing indicator
type TypingIndicatorRequest struct {
	ConversationID string `json:"conversation_id" binding:"required"`
	IsTyping       bool   `json:"is_typing" binding:"required"`
}

// MarkMessageReadRequest is the request to mark message as read
type MarkMessageReadRequest struct {
	MessageID string `json:"message_id" binding:"required"`
}

// AddReactionRequest is the request to add emoji reaction
type AddReactionRequest struct {
	MessageID string `json:"message_id" binding:"required"`
	Reaction  string `json:"reaction" binding:"required,oneof=thumbs_up thumbs_down laugh cry heart fire"`
}

// ConversationListResponse wraps list of conversations
type ConversationListResponse struct {
	Conversations []ConversationResponse `json:"conversations"`
	Total         int                    `json:"total"`
	Page          int                    `json:"page"`
	PageSize      int                    `json:"page_size"`
	TotalPages    int                    `json:"total_pages"`
}

// TypingIndicatorEvent is sent via WebSocket when someone types
type TypingIndicatorEvent struct {
	ConversationID string    `json:"conversation_id"`
	UserID         string    `json:"user_id"`
	IsTyping       bool      `json:"is_typing"`
	Timestamp      time.Time `json:"timestamp"`
}

// MessageEvent is sent via WebSocket for new messages
type MessageEvent struct {
	Type      string                `json:"type"` // "message"
	Message   ChatMessageResponse   `json:"message"`
	Timestamp time.Time             `json:"timestamp"`
}

// ConnectionEvent is sent via WebSocket for connection updates
type ConnectionEvent struct {
	Type      string    `json:"type"` // "connected", "disconnected"
	UserID    string    `json:"user_id"`
	Timestamp time.Time `json:"timestamp"`
}

// WebSocketMessage is the generic WebSocket message format
type WebSocketMessage struct {
	Type    string          `json:"type"` // message, typing, read, reaction, connect, disconnect
	Payload interface{}     `json:"payload"`
}

// UserResponse is simplified user info for chat
type UserResponse struct {
	ID       uuid.UUID `json:"id"`
	Email    string    `json:"email"`
	FullName string    `json:"full_name"`
	Avatar   *string   `json:"avatar,omitempty"`
}
