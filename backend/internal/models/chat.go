package models

import (
	"time"

	"github.com/google/uuid"
)

// Conversation represents a chat session between user and agent
type Conversation struct {
	ID                  uuid.UUID             `gorm:"type:uuid;primaryKey" json:"id"`
	UserID              uuid.UUID             `gorm:"type:uuid;not null;index" json:"user_id"`
	User                *User                 `gorm:"constraint:OnDelete:CASCADE" json:"user,omitempty"`
	AgentID             *uuid.UUID            `gorm:"type:uuid;index" json:"agent_id,omitempty"`
	Agent               *User                 `gorm:"constraint:OnDelete:SET NULL" json:"agent,omitempty"`
	Subject             string                `gorm:"type:text;not null" json:"subject"`
	Status              string                `gorm:"type:varchar(20);default:'open'" json:"status"`      // open, in_progress, resolved, closed
	Priority            string                `gorm:"type:varchar(20);default:'normal'" json:"priority"`  // low, normal, high, urgent
	Category            string                `gorm:"type:varchar(50);default:'general'" json:"category"` // general, billing, support, product, complaint
	AssignedAt          *time.Time            `json:"assigned_at,omitempty"`
	ResolvedAt          *time.Time            `json:"resolved_at,omitempty"`
	ClosedAt            *time.Time            `json:"closed_at,omitempty"`
	LastMessage         *string               `gorm:"type:text" json:"last_message,omitempty"`
	LastMessageAt       *time.Time            `json:"last_message_at,omitempty"`
	UnreadCustomerCount int                   `gorm:"default:0" json:"unread_customer_count"`
	UnreadAgentCount    int                   `gorm:"default:0" json:"unread_agent_count"`
	CreatedAt           time.Time             `gorm:"type:timestamp;default:now()" json:"created_at"`
	UpdatedAt           time.Time             `gorm:"type:timestamp" json:"updated_at"`
	Messages            []ChatMessage         `gorm:"constraint:OnDelete:CASCADE" json:"messages,omitempty"`
	Metadata            *ConversationMetadata `gorm:"constraint:OnDelete:CASCADE" json:"metadata,omitempty"`
}

// TableName specifies the table name
func (Conversation) TableName() string {
	return "conversations"
}

// ChatMessage represents a single message in a conversation
type ChatMessage struct {
	ID             uuid.UUID     `gorm:"type:uuid;primaryKey" json:"id"`
	ConversationID uuid.UUID     `gorm:"type:uuid;not null;index" json:"conversation_id"`
	Conversation   *Conversation `gorm:"constraint:OnDelete:CASCADE" json:"conversation,omitempty"`
	SenderID       uuid.UUID     `gorm:"type:uuid;not null;index" json:"sender_id"`
	Sender         *User         `gorm:"constraint:OnDelete:SET NULL" json:"sender,omitempty"`
	Message        string        `gorm:"type:text;not null" json:"message"`
	MessageType    string        `gorm:"type:varchar(20);default:'text'" json:"message_type"` // text, image, file, system
	IsRead         bool          `gorm:"default:false" json:"is_read"`
	ReadAt         *time.Time    `json:"read_at,omitempty"`
	CreatedAt      time.Time     `gorm:"type:timestamp;default:now()" json:"created_at"`
	UpdatedAt      time.Time     `gorm:"type:timestamp" json:"updated_at"`
}

// TableName specifies the table name
func (ChatMessage) TableName() string {
	return "chat_messages"
}

// TypingIndicator represents when a user is typing in a conversation.
type TypingIndicator struct {
	ID             uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	ConversationID uuid.UUID `gorm:"type:uuid;not null;index;uniqueIndex:idx_typing_conversation_user" json:"conversation_id"`
	UserID         uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_typing_conversation_user" json:"user_id"`
	StartedAt      time.Time `gorm:"type:timestamp;default:now()" json:"started_at"`
	ExpiresAt      time.Time `gorm:"type:timestamp;index" json:"expires_at"`
}

// TableName specifies the table name.
func (TypingIndicator) TableName() string {
	return "typing_indicators"
}

// ConversationMetadata represents analytics for a conversation
type ConversationMetadata struct {
	ID                     uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	ConversationID         uuid.UUID `gorm:"type:uuid;not null;uniqueIndex" json:"conversation_id"`
	MessageCount           int       `gorm:"default:0" json:"message_count"`
	UserMessageCount       int       `gorm:"default:0" json:"user_message_count"`
	AgentMessageCount      int       `gorm:"default:0" json:"agent_message_count"`
	AvgResponseTimeSeconds *int      `json:"avg_response_time_seconds,omitempty"`
	SatisfactionScore      *int      `json:"satisfaction_score,omitempty"`
	FeedbackText           *string   `gorm:"type:text" json:"feedback_text,omitempty"`
	ResolvedByAgent        *bool     `json:"resolved_by_agent,omitempty"`
	ResolutionCategory     *string   `gorm:"type:text" json:"resolution_category,omitempty"`
	CreatedAt              time.Time `gorm:"type:timestamp;default:now()" json:"created_at"`
	UpdatedAt              time.Time `gorm:"type:timestamp" json:"updated_at"`
}

// TableName specifies the table name
func (ConversationMetadata) TableName() string {
	return "conversation_metadata"
}

// ===== DTOs =====

// ConversationResponse is the API response for a conversation
type ConversationResponse struct {
	ID                  uuid.UUID             `json:"id"`
	UserID              uuid.UUID             `json:"user_id"`
	User                *UserResponse         `json:"user,omitempty"`
	AgentID             *uuid.UUID            `json:"agent_id,omitempty"`
	Agent               *UserResponse         `json:"agent,omitempty"`
	Subject             string                `json:"subject"`
	Status              string                `json:"status"`
	Priority            string                `json:"priority"`
	Category            string                `json:"category"`
	AssignedAt          *time.Time            `json:"assigned_at,omitempty"`
	ResolvedAt          *time.Time            `json:"resolved_at,omitempty"`
	ClosedAt            *time.Time            `json:"closed_at,omitempty"`
	LastMessageAt       *time.Time            `json:"last_message_at,omitempty"`
	LastMessage         *string               `json:"last_message,omitempty"`
	UnreadCustomerCount int                   `json:"unread_customer_count"`
	UnreadAgentCount    int                   `json:"unread_agent_count"`
	CreatedAt           time.Time             `json:"created_at"`
	UpdatedAt           time.Time             `json:"updated_at"`
	Messages            []ChatMessageResponse `json:"messages,omitempty"`
	Metadata            *ConversationMetadata `json:"metadata,omitempty"`
	UnreadCount         int                   `json:"unread_count"`
}

// ChatMessageResponse is the API response for a message
type ChatMessageResponse struct {
	ID             uuid.UUID     `json:"id"`
	ConversationID uuid.UUID     `json:"conversation_id"`
	SenderID       uuid.UUID     `json:"sender_id"`
	Sender         *UserResponse `json:"sender,omitempty"`
	Message        string        `json:"message"`
	MessageType    string        `json:"message_type"`
	IsRead         bool          `json:"is_read"`
	ReadAt         *time.Time    `json:"read_at,omitempty"`
	CreatedAt      time.Time     `json:"created_at"`
}

// SendMessageRequest is the request to send a message
type SendMessageRequest struct {
	ConversationID string `json:"conversation_id,omitempty"`
	Message        string `json:"message" binding:"omitempty,max=2000"`
	MessageText    string `json:"message_text" binding:"omitempty,max=2000"`
	MessageType    string `json:"message_type" binding:"omitempty,oneof=text"`
}

// CreateConversationRequest is the request to start a new conversation
type CreateConversationRequest struct {
	Subject        string `json:"subject" binding:"required,min=3,max=200"`
	Category       string `json:"category" binding:"omitempty,oneof=general billing support product complaint"`
	Priority       string `json:"priority" binding:"omitempty,oneof=low normal high urgent"`
	Message        string `json:"message" binding:"omitempty,max=2000"`
	InitialMessage string `json:"initial_message" binding:"omitempty,max=2000"`
}

// AssignConversationRequest is the request to assign a conversation to an agent
type AssignConversationRequest struct {
	AgentID string `json:"agent_id" binding:"required"`
}

// UpdateConversationStatusRequest is the request to update conversation status
type UpdateConversationStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=open in_progress resolved closed"`
}

// MarkMessageReadRequest is the request to mark message as read
type MarkMessageReadRequest struct {
	MessageID string `json:"message_id" binding:"required"`
}

// TypingIndicatorRequest is the request to update typing status.
type TypingIndicatorRequest struct {
	ConversationID string `json:"conversation_id" binding:"required"`
	IsTyping       bool   `json:"is_typing"`
}

// ConversationListResponse wraps list of conversations
type ConversationListResponse struct {
	Conversations []ConversationResponse `json:"conversations"`
	Total         int                    `json:"total"`
	Page          int                    `json:"page"`
	PageSize      int                    `json:"page_size"`
	TotalPages    int                    `json:"total_pages"`
}

// ChatAdminSummaryResponse is the lightweight admin sidebar/header summary.
type ChatAdminSummaryResponse struct {
	UnreadAgentCount int `json:"unread_agent_count"`
}

// MessageEvent is sent via WebSocket for new messages
type MessageEvent struct {
	Type      string              `json:"type"` // "message"
	Message   ChatMessageResponse `json:"message"`
	Timestamp time.Time           `json:"timestamp"`
}

// ConnectionEvent is sent via WebSocket for connection updates
type ConnectionEvent struct {
	Type      string    `json:"type"` // "connected", "disconnected"
	UserID    string    `json:"user_id"`
	Timestamp time.Time `json:"timestamp"`
}

// TypingIndicatorEvent is sent via WebSocket when a participant is typing.
type TypingIndicatorEvent struct {
	ConversationID string    `json:"conversation_id"`
	UserID         string    `json:"user_id"`
	IsTyping       bool      `json:"is_typing"`
	Timestamp      time.Time `json:"timestamp"`
}

// WebSocketMessage is the generic WebSocket message format
type WebSocketMessage struct {
	Type    string      `json:"type"` // message, read, typing, connect, disconnect
	Payload interface{} `json:"payload"`
}

// UserResponse is simplified user info for chat
type UserResponse struct {
	ID       uuid.UUID `json:"id"`
	Email    string    `json:"email"`
	FullName string    `json:"full_name"`
	Avatar   *string   `json:"avatar,omitempty"`
}
