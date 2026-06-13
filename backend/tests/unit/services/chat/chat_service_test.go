package chat_test

import (
	"database/sql"
	"testing"

	"ecommerce-backend/internal/models"
	"ecommerce-backend/internal/repositories"
	chatsvc "ecommerce-backend/internal/services/chat"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupChatServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	require.NoError(t, err)

	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)
	t.Cleanup(func() {
		require.NoError(t, closeChatServiceTestDB(sqlDB))
	})

	require.NoError(t, db.Exec("PRAGMA foreign_keys = OFF").Error)
	require.NoError(t, db.Exec(`
		CREATE TABLE users (
			id text PRIMARY KEY,
			email text NOT NULL,
			name text NOT NULL,
			avatar_url text,
			role text NOT NULL
		)
	`).Error)
	require.NoError(t, db.Exec(`
		CREATE TABLE conversations (
			id text PRIMARY KEY,
			user_id text NOT NULL,
			agent_id text,
			subject text NOT NULL,
			status text NOT NULL DEFAULT 'open',
			priority text NOT NULL DEFAULT 'normal',
			category text NOT NULL DEFAULT 'support',
			assigned_at datetime,
			resolved_at datetime,
			closed_at datetime,
			last_message text,
			last_message_at datetime,
			unread_customer_count integer NOT NULL DEFAULT 0,
			unread_agent_count integer NOT NULL DEFAULT 0,
			created_at datetime,
			updated_at datetime
		)
	`).Error)
	require.NoError(t, db.Exec(`
		CREATE TABLE chat_messages (
			id text PRIMARY KEY,
			conversation_id text NOT NULL,
			sender_id text NOT NULL,
			message text NOT NULL,
			message_type text NOT NULL DEFAULT 'text',
			file_url text,
			file_name text,
			is_read boolean DEFAULT false,
			read_at datetime,
			created_at datetime,
			updated_at datetime
		)
	`).Error)
	require.NoError(t, db.Exec(`
		CREATE TABLE conversation_metadata (
			id text PRIMARY KEY,
			conversation_id text NOT NULL,
			message_count integer DEFAULT 0,
			user_message_count integer DEFAULT 0,
			agent_message_count integer DEFAULT 0,
			avg_response_time_seconds integer,
			satisfaction_score integer,
			feedback_text text,
			resolved_by_agent boolean,
			resolution_category text,
			created_at datetime,
			updated_at datetime
		)
	`).Error)
	require.NoError(t, db.Exec(`CREATE TABLE chat_attachments (id text PRIMARY KEY, message_id text)`).Error)
	require.NoError(t, db.Exec(`CREATE TABLE message_reactions (id text PRIMARY KEY, message_id text, user_id text, reaction text)`).Error)

	return db
}

func closeChatServiceTestDB(db *sql.DB) error {
	return db.Close()
}

func newChatService(db *gorm.DB) *chatsvc.ChatService {
	return chatsvc.NewChatService(repositories.NewChatRepository(db), nil)
}

func seedChatUser(t *testing.T, db *gorm.DB, role string) uuid.UUID {
	t.Helper()

	id := uuid.New()
	require.NoError(t, db.Exec(
		"INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)",
		id.String(),
		role+"-"+id.String()[:8]+"@example.com",
		role+" Test",
		role,
	).Error)
	return id
}

func TestChatService_CreateConversationStoresInitialMessageAndSummary(t *testing.T) {
	db := setupChatServiceTestDB(t)
	service := newChatService(db)
	userID := seedChatUser(t, db, "customer")

	conversation, err := service.CreateConversation(userID, &models.CreateConversationRequest{
		Subject: "Order support",
		Message: "Where is my order?",
	})

	require.NoError(t, err)
	require.Equal(t, "Order support", conversation.Subject)
	require.Equal(t, "open", conversation.Status)
	require.Equal(t, "Where is my order?", *conversation.LastMessage)
	require.Equal(t, 1, conversation.UnreadAgentCount)

	var messages []models.ChatMessage
	require.NoError(t, db.Find(&messages, "conversation_id = ?", conversation.ID).Error)
	require.Len(t, messages, 1)
	require.Equal(t, userID, messages[0].SenderID)
	require.Equal(t, "Where is my order?", messages[0].Message)
}

func TestChatService_CreateConversationRollsBackWhenInitialMessageFails(t *testing.T) {
	db := setupChatServiceTestDB(t)
	service := newChatService(db)
	userID := seedChatUser(t, db, "customer")
	require.NoError(t, db.Exec("ALTER TABLE chat_messages ADD COLUMN legacy_required text NOT NULL").Error)

	_, err := service.CreateConversation(userID, &models.CreateConversationRequest{
		Subject: "Broken support",
		Message: "This message will fail",
	})

	require.Error(t, err)

	var conversationCount int64
	require.NoError(t, db.Model(&models.Conversation{}).Count(&conversationCount).Error)
	require.Zero(t, conversationCount)
}

func TestChatService_SendMessageRejectsDifferentCustomer(t *testing.T) {
	db := setupChatServiceTestDB(t)
	service := newChatService(db)
	ownerID := seedChatUser(t, db, "customer")
	otherID := seedChatUser(t, db, "customer")

	conversation, err := service.CreateConversation(ownerID, &models.CreateConversationRequest{
		Subject: "Refund support",
		Message: "Need help",
	})
	require.NoError(t, err)

	_, err = service.SendMessage(conversation.ID, otherID, false, &models.SendMessageRequest{
		Message: "Trying to access another user chat",
	})

	require.Error(t, err)
	require.Contains(t, err.Error(), "unauthorized access")
}

func TestChatService_AdminCanReplyAndUpdatesUnreadCustomerCount(t *testing.T) {
	db := setupChatServiceTestDB(t)
	service := newChatService(db)
	ownerID := seedChatUser(t, db, "customer")
	adminID := seedChatUser(t, db, "admin")

	conversation, err := service.CreateConversation(ownerID, &models.CreateConversationRequest{
		Subject: "Payment support",
		Message: "Payment issue",
	})
	require.NoError(t, err)

	message, err := service.SendMessage(conversation.ID, adminID, true, &models.SendMessageRequest{
		Message: "We are checking your payment.",
	})

	require.NoError(t, err)
	require.Equal(t, adminID, message.SenderID)

	updated, err := service.GetConversation(conversation.ID, adminID, true)
	require.NoError(t, err)
	require.Equal(t, 1, updated.UnreadCustomerCount)
	require.Equal(t, "We are checking your payment.", *updated.LastMessage)
}

func TestChatService_SendMessageValidatesTextOnlyAndLength(t *testing.T) {
	db := setupChatServiceTestDB(t)
	service := newChatService(db)
	ownerID := seedChatUser(t, db, "customer")

	conversation, err := service.CreateConversation(ownerID, &models.CreateConversationRequest{
		Subject: "Product support",
		Message: "Initial message",
	})
	require.NoError(t, err)

	_, err = service.SendMessage(conversation.ID, ownerID, false, &models.SendMessageRequest{
		Message: "   ",
	})
	require.Error(t, err)
	require.Contains(t, err.Error(), "between 1 and 2000")

	_, err = service.SendMessage(conversation.ID, ownerID, false, &models.SendMessageRequest{
		Message:     "image payload",
		MessageType: "image",
	})
	require.Error(t, err)
	require.Contains(t, err.Error(), "only text messages")
}

func TestChatService_UpdateStatusValidatesAllowedStatuses(t *testing.T) {
	db := setupChatServiceTestDB(t)
	service := newChatService(db)
	ownerID := seedChatUser(t, db, "customer")

	conversation, err := service.CreateConversation(ownerID, &models.CreateConversationRequest{
		Subject: "Status support",
		Message: "Please update this ticket",
	})
	require.NoError(t, err)

	require.NoError(t, service.UpdateConversationStatus(conversation.ID, "in_progress"))

	updated, err := service.GetConversation(conversation.ID, ownerID, false)
	require.NoError(t, err)
	require.Equal(t, "in_progress", updated.Status)

	err = service.UpdateConversationStatus(conversation.ID, "deleted")
	require.Error(t, err)
	require.Contains(t, err.Error(), "invalid status")
}

func TestChatService_PaginatesConversationAndMessages(t *testing.T) {
	db := setupChatServiceTestDB(t)
	service := newChatService(db)
	ownerID := seedChatUser(t, db, "customer")

	first, err := service.CreateConversation(ownerID, &models.CreateConversationRequest{
		Subject: "First support",
		Message: "First message",
	})
	require.NoError(t, err)

	second, err := service.CreateConversation(ownerID, &models.CreateConversationRequest{
		Subject: "Second support",
		Message: "Second message",
	})
	require.NoError(t, err)

	pageOne, err := service.GetUserConversations(ownerID, 1, 1)
	require.NoError(t, err)
	require.Len(t, pageOne.Conversations, 1)
	require.Equal(t, 2, pageOne.Total)
	require.Equal(t, 2, pageOne.TotalPages)

	pageTwo, err := service.GetUserConversations(ownerID, 2, 1)
	require.NoError(t, err)
	require.Len(t, pageTwo.Conversations, 1)
	require.NotEqual(t, pageOne.Conversations[0].ID, pageTwo.Conversations[0].ID)

	for i := 0; i < 3; i++ {
		_, err = service.SendMessage(first.ID, ownerID, false, &models.SendMessageRequest{
			Message: "Additional message",
		})
		require.NoError(t, err)
	}

	messages, err := service.GetConversationMessages(first.ID, ownerID, false, 2, 0)
	require.NoError(t, err)
	require.Len(t, messages, 2)
	for _, message := range messages {
		require.Equal(t, first.ID, message.ConversationID)
	}

	secondMessages, err := service.GetConversationMessages(second.ID, ownerID, false, 10, 0)
	require.NoError(t, err)
	require.Len(t, secondMessages, 1)
	require.Equal(t, second.ID, secondMessages[0].ConversationID)
}
