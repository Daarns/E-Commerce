package chat_test

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"ecommerce-backend/internal/handlers"
	"ecommerce-backend/internal/middleware"
	"ecommerce-backend/internal/repositories"
	chatsvc "ecommerce-backend/internal/services/chat"
	"ecommerce-backend/pkg/jwt"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type chatHTTPTestApp struct {
	router        *gin.Engine
	db            *gorm.DB
	jwtManager    *jwt.Manager
	customerID    uuid.UUID
	otherUserID   uuid.UUID
	adminID       uuid.UUID
	customerToken string
	otherToken    string
	adminToken    string
}

func setupChatHTTPTestApp(t *testing.T) *chatHTTPTestApp {
	t.Helper()

	gin.SetMode(gin.TestMode)
	db, sqlDB := setupChatHTTPTestDB(t)
	t.Cleanup(func() {
		require.NoError(t, closeChatHTTPTestDB(sqlDB))
	})

	customerID := seedChatHTTPUser(t, db, "customer", "customer@example.com")
	otherUserID := seedChatHTTPUser(t, db, "customer", "other@example.com")
	adminID := seedChatHTTPUser(t, db, "admin", "admin@example.com")
	jwtManager := jwt.NewManager(jwt.Config{
		AccessTokenSecret:    "chat-http-test-access-secret",
		RefreshTokenSecret:   "chat-http-test-refresh-secret",
		AccessTokenDuration:  time.Hour,
		RefreshTokenDuration: 24 * time.Hour,
	})

	customerToken := mustAccessToken(t, jwtManager, customerID, "customer@example.com", "customer")
	otherToken := mustAccessToken(t, jwtManager, otherUserID, "other@example.com", "customer")
	adminToken := mustAccessToken(t, jwtManager, adminID, "admin@example.com", "admin")

	chatRepo := repositories.NewChatRepository(db)
	chatService := chatsvc.NewChatService(chatRepo, nil)
	chatHandler := handlers.NewChatHandler(chatService)

	router := gin.New()
	api := router.Group("/api/v1")
	protected := api.Group("")
	protected.Use(middleware.AuthMiddleware(jwtManager))
	{
		customerChat := protected.Group("/chat")
		{
			customerChat.POST("/conversations", chatHandler.CreateConversation)
			customerChat.GET("/conversations", chatHandler.GetConversations)
			customerChat.GET("/conversations/:id", chatHandler.GetConversation)
			customerChat.GET("/conversations/:id/messages", chatHandler.GetMessages)
			customerChat.POST("/conversations/:id/messages", chatHandler.SendMessage)
			customerChat.PUT("/conversations/:id/read", chatHandler.MarkConversationAsRead)
		}
	}

	admin := api.Group("/admin")
	admin.Use(middleware.AuthMiddleware(jwtManager))
	admin.Use(middleware.AdminOnly())
	{
		adminChat := admin.Group("/chat")
		{
			adminChat.GET("/summary", chatHandler.AdminGetSummary)
			adminChat.GET("/conversations", chatHandler.AdminGetConversations)
			adminChat.GET("/conversations/:id", chatHandler.AdminGetConversation)
			adminChat.GET("/conversations/:id/messages", chatHandler.AdminGetMessages)
			adminChat.POST("/conversations/:id/messages", chatHandler.AdminSendMessage)
			adminChat.PUT("/conversations/:id/read", chatHandler.AdminMarkConversationAsRead)
			adminChat.PUT("/conversations/:id/status", chatHandler.AdminUpdateConversationStatus)
		}
	}

	return &chatHTTPTestApp{
		router:        router,
		db:            db,
		jwtManager:    jwtManager,
		customerID:    customerID,
		otherUserID:   otherUserID,
		adminID:       adminID,
		customerToken: customerToken,
		otherToken:    otherToken,
		adminToken:    adminToken,
	}
}

func setupChatHTTPTestDB(t *testing.T) (*gorm.DB, *sql.DB) {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	require.NoError(t, err)

	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)

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
	require.NoError(t, db.Exec(`CREATE TABLE typing_indicators (id text PRIMARY KEY, conversation_id text, user_id text, expires_at datetime)`).Error)

	return db, sqlDB
}

func closeChatHTTPTestDB(db *sql.DB) error {
	return db.Close()
}

func seedChatHTTPUser(t *testing.T, db *gorm.DB, role string, email string) uuid.UUID {
	t.Helper()

	id := uuid.New()
	require.NoError(t, db.Exec(
		"INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)",
		id.String(),
		email,
		role+" Test",
		role,
	).Error)
	return id
}

func mustAccessToken(t *testing.T, manager *jwt.Manager, userID uuid.UUID, email string, role string) string {
	t.Helper()

	token, err := manager.GenerateAccessToken(userID, email, role)
	require.NoError(t, err)
	return token
}

func chatHTTPRequest(t *testing.T, router *gin.Engine, method string, path string, token string, body any) *httptest.ResponseRecorder {
	t.Helper()

	var requestBody bytes.Buffer
	if body != nil {
		require.NoError(t, json.NewEncoder(&requestBody).Encode(body))
	}

	req := httptest.NewRequest(method, path, &requestBody)
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	return w
}

func decodeChatHTTPResponse(t *testing.T, w *httptest.ResponseRecorder) map[string]any {
	t.Helper()

	var payload map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &payload))
	return payload
}

func requireChatHTTPDataMap(t *testing.T, w *httptest.ResponseRecorder) map[string]any {
	t.Helper()

	payload := decodeChatHTTPResponse(t, w)
	data, ok := payload["data"].(map[string]any)
	require.True(t, ok, "response data should be an object: %s", w.Body.String())
	return data
}

func TestChatHTTPRequiresAuthForCustomerConversationCreate(t *testing.T) {
	app := setupChatHTTPTestApp(t)

	w := chatHTTPRequest(t, app.router, http.MethodPost, "/api/v1/chat/conversations", "", map[string]string{
		"subject": "Order help",
		"message": "Need support",
	})

	require.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestChatHTTPCustomerAdminFlowAndAuthorization(t *testing.T) {
	app := setupChatHTTPTestApp(t)

	create := chatHTTPRequest(t, app.router, http.MethodPost, "/api/v1/chat/conversations", app.customerToken, map[string]string{
		"subject": "Order help",
		"message": "Need help with my order",
	})
	require.Equal(t, http.StatusCreated, create.Code, create.Body.String())
	conversation := requireChatHTTPDataMap(t, create)
	conversationID, ok := conversation["id"].(string)
	require.True(t, ok)
	require.NotEmpty(t, conversationID)
	require.Equal(t, "Need help with my order", conversation["last_message"])
	require.Equal(t, float64(1), conversation["unread_agent_count"])

	otherCreate := chatHTTPRequest(t, app.router, http.MethodPost, "/api/v1/chat/conversations", app.otherToken, map[string]string{
		"subject": "Other order help",
		"message": "This belongs to another user",
	})
	require.Equal(t, http.StatusCreated, otherCreate.Code, otherCreate.Body.String())

	customerList := chatHTTPRequest(t, app.router, http.MethodGet, "/api/v1/chat/conversations", app.customerToken, nil)
	require.Equal(t, http.StatusOK, customerList.Code, customerList.Body.String())
	customerListData := requireChatHTTPDataMap(t, customerList)
	require.Equal(t, float64(1), customerListData["total"])

	otherRead := chatHTTPRequest(t, app.router, http.MethodGet, "/api/v1/chat/conversations/"+conversationID+"/messages", app.otherToken, nil)
	require.Equal(t, http.StatusForbidden, otherRead.Code, otherRead.Body.String())

	otherSend := chatHTTPRequest(t, app.router, http.MethodPost, "/api/v1/chat/conversations/"+conversationID+"/messages", app.otherToken, map[string]string{
		"message": "I should not send this",
	})
	require.Equal(t, http.StatusForbidden, otherSend.Code, otherSend.Body.String())

	customerAdminList := chatHTTPRequest(t, app.router, http.MethodGet, "/api/v1/admin/chat/conversations", app.customerToken, nil)
	require.Equal(t, http.StatusForbidden, customerAdminList.Code, customerAdminList.Body.String())

	customerAdminStatus := chatHTTPRequest(t, app.router, http.MethodPut, "/api/v1/admin/chat/conversations/"+conversationID+"/status", app.customerToken, map[string]string{
		"status": "closed",
	})
	require.Equal(t, http.StatusForbidden, customerAdminStatus.Code, customerAdminStatus.Body.String())

	customerAdminSummary := chatHTTPRequest(t, app.router, http.MethodGet, "/api/v1/admin/chat/summary", app.customerToken, nil)
	require.Equal(t, http.StatusForbidden, customerAdminSummary.Code, customerAdminSummary.Body.String())

	adminSummary := chatHTTPRequest(t, app.router, http.MethodGet, "/api/v1/admin/chat/summary", app.adminToken, nil)
	require.Equal(t, http.StatusOK, adminSummary.Code, adminSummary.Body.String())
	adminSummaryData := requireChatHTTPDataMap(t, adminSummary)
	require.Equal(t, float64(2), adminSummaryData["unread_agent_count"])

	adminList := chatHTTPRequest(t, app.router, http.MethodGet, "/api/v1/admin/chat/conversations", app.adminToken, nil)
	require.Equal(t, http.StatusOK, adminList.Code, adminList.Body.String())
	adminListData := requireChatHTTPDataMap(t, adminList)
	require.Equal(t, float64(2), adminListData["total"])

	adminReply := chatHTTPRequest(t, app.router, http.MethodPost, "/api/v1/admin/chat/conversations/"+conversationID+"/messages", app.adminToken, map[string]string{
		"message": "We are checking it.",
	})
	require.Equal(t, http.StatusCreated, adminReply.Code, adminReply.Body.String())
	adminReplyData := requireChatHTTPDataMap(t, adminReply)
	require.Equal(t, "We are checking it.", adminReplyData["message"])
	require.Equal(t, app.adminID.String(), adminReplyData["sender_id"])

	customerMessages := chatHTTPRequest(t, app.router, http.MethodGet, "/api/v1/chat/conversations/"+conversationID+"/messages?limit=10", app.customerToken, nil)
	require.Equal(t, http.StatusOK, customerMessages.Code, customerMessages.Body.String())
	customerMessagesData := requireChatHTTPDataMap(t, customerMessages)
	require.Equal(t, float64(2), customerMessagesData["count"])
}

func TestChatHTTPRejectsInvalidMessageAndStatus(t *testing.T) {
	app := setupChatHTTPTestApp(t)

	create := chatHTTPRequest(t, app.router, http.MethodPost, "/api/v1/chat/conversations", app.customerToken, map[string]string{
		"subject": "Product help",
		"message": "Need product support",
	})
	require.Equal(t, http.StatusCreated, create.Code, create.Body.String())
	conversationID := requireChatHTTPDataMap(t, create)["id"].(string)

	blankMessage := chatHTTPRequest(t, app.router, http.MethodPost, "/api/v1/chat/conversations/"+conversationID+"/messages", app.customerToken, map[string]string{
		"message": "   ",
	})
	require.Equal(t, http.StatusBadRequest, blankMessage.Code, blankMessage.Body.String())

	imageMessage := chatHTTPRequest(t, app.router, http.MethodPost, "/api/v1/chat/conversations/"+conversationID+"/messages", app.customerToken, map[string]string{
		"message":      "image payload",
		"message_type": "image",
	})
	require.Equal(t, http.StatusBadRequest, imageMessage.Code, imageMessage.Body.String())

	validStatus := chatHTTPRequest(t, app.router, http.MethodPut, "/api/v1/admin/chat/conversations/"+conversationID+"/status", app.adminToken, map[string]string{
		"status": "in_progress",
	})
	require.Equal(t, http.StatusOK, validStatus.Code, validStatus.Body.String())

	invalidStatus := chatHTTPRequest(t, app.router, http.MethodPut, "/api/v1/admin/chat/conversations/"+conversationID+"/status", app.adminToken, map[string]string{
		"status": "deleted",
	})
	require.Equal(t, http.StatusBadRequest, invalidStatus.Code, invalidStatus.Body.String())

	closeStatus := chatHTTPRequest(t, app.router, http.MethodPut, "/api/v1/admin/chat/conversations/"+conversationID+"/status", app.adminToken, map[string]string{
		"status": "closed",
	})
	require.Equal(t, http.StatusOK, closeStatus.Code, closeStatus.Body.String())

	sendToClosed := chatHTTPRequest(t, app.router, http.MethodPost, "/api/v1/chat/conversations/"+conversationID+"/messages", app.customerToken, map[string]string{
		"message": "Can I still send?",
	})
	require.Equal(t, http.StatusBadRequest, sendToClosed.Code, sendToClosed.Body.String())
}
