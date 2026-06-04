package realtime

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"ecommerce-backend/pkg/jwt"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = 50 * time.Second
	maxMessageSize = 4096
)

type ChatAuthorizer interface {
	CanAccessConversation(conversationID uuid.UUID, userID uuid.UUID, isAdmin bool) bool
}

type ChatHub struct {
	jwtManager    *jwt.Manager
	authorizer    ChatAuthorizer
	clients       map[*chatClient]struct{}
	conversations map[uuid.UUID]map[*chatClient]struct{}
	admins        map[*chatClient]struct{}
	mu            sync.RWMutex
	upgrader      websocket.Upgrader
}

type chatClient struct {
	hub    *ChatHub
	conn   *websocket.Conn
	send   chan socketEnvelope
	userID uuid.UUID
	role   string
	rooms  map[uuid.UUID]struct{}
}

type socketEnvelope struct {
	Type           string      `json:"type"`
	ConversationID *uuid.UUID  `json:"conversation_id,omitempty"`
	Payload        interface{} `json:"payload,omitempty"`
	Timestamp      time.Time   `json:"timestamp"`
}

type clientMessage struct {
	Type           string `json:"type"`
	ConversationID string `json:"conversation_id,omitempty"`
	IsTyping       bool   `json:"is_typing,omitempty"`
}

func NewChatHub(jwtManager *jwt.Manager, authorizer ChatAuthorizer) *ChatHub {
	return &ChatHub{
		jwtManager:    jwtManager,
		authorizer:    authorizer,
		clients:       make(map[*chatClient]struct{}),
		conversations: make(map[uuid.UUID]map[*chatClient]struct{}),
		admins:        make(map[*chatClient]struct{}),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				origin := r.Header.Get("Origin")
				if origin == "" {
					return true
				}
				parsed, err := url.Parse(origin)
				if err != nil {
					return false
				}
				originHost := parsed.Hostname()
				requestHost := strings.Split(r.Host, ":")[0]
				if originHost == requestHost {
					return true
				}
				return originHost == "localhost" || originHost == "127.0.0.1"
			},
		},
	}
}

func (h *ChatHub) HandleWebSocket(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
		return
	}

	claims, err := h.jwtManager.ValidateToken(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}

	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	client := &chatClient{
		hub:    h,
		conn:   conn,
		send:   make(chan socketEnvelope, 32),
		userID: claims.UserID,
		role:   claims.Role,
		rooms:  make(map[uuid.UUID]struct{}),
	}

	h.register(client)
	go client.writePump()
	go client.readPump()
}

func (h *ChatHub) PublishConversationEvent(conversationID uuid.UUID, eventType string, payload interface{}) {
	h.mu.RLock()
	targets := make([]*chatClient, 0, len(h.conversations[conversationID])+len(h.admins))
	for client := range h.conversations[conversationID] {
		targets = append(targets, client)
	}
	for client := range h.admins {
		targets = append(targets, client)
	}
	h.mu.RUnlock()

	h.broadcast(targets, socketEnvelope{
		Type:           eventType,
		ConversationID: &conversationID,
		Payload:        payload,
		Timestamp:      time.Now(),
	})
}

func (h *ChatHub) PublishAdminEvent(eventType string, payload interface{}) {
	h.mu.RLock()
	targets := make([]*chatClient, 0, len(h.admins))
	for client := range h.admins {
		targets = append(targets, client)
	}
	h.mu.RUnlock()

	h.broadcast(targets, socketEnvelope{
		Type:      eventType,
		Payload:   payload,
		Timestamp: time.Now(),
	})
}

func (h *ChatHub) register(client *chatClient) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.clients[client] = struct{}{}
	if client.role == "admin" {
		h.admins[client] = struct{}{}
	}
}

func (h *ChatHub) unregister(client *chatClient) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, ok := h.clients[client]; !ok {
		return
	}
	delete(h.clients, client)
	delete(h.admins, client)
	for room := range client.rooms {
		if clients, ok := h.conversations[room]; ok {
			delete(clients, client)
			if len(clients) == 0 {
				delete(h.conversations, room)
			}
		}
	}
	close(client.send)
}

func (h *ChatHub) joinConversation(client *chatClient, conversationID uuid.UUID) bool {
	isAdmin := client.role == "admin"
	if h.authorizer == nil || !h.authorizer.CanAccessConversation(conversationID, client.userID, isAdmin) {
		return false
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	if h.conversations[conversationID] == nil {
		h.conversations[conversationID] = make(map[*chatClient]struct{})
	}
	h.conversations[conversationID][client] = struct{}{}
	client.rooms[conversationID] = struct{}{}
	return true
}

func (h *ChatHub) broadcast(targets []*chatClient, envelope socketEnvelope) {
	for _, client := range targets {
		select {
		case client.send <- envelope:
		default:
			h.unregister(client)
		}
	}
}

func (c *chatClient) readPump() {
	defer func() {
		c.hub.unregister(c)
		_ = c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		return c.conn.SetReadDeadline(time.Now().Add(pongWait))
	})

	for {
		var message clientMessage
		if err := c.conn.ReadJSON(&message); err != nil {
			return
		}

		conversationID, err := uuid.Parse(message.ConversationID)
		if err != nil {
			continue
		}

		switch message.Type {
		case "conversation:join":
			if c.hub.joinConversation(c, conversationID) {
				c.send <- socketEnvelope{
					Type:           "conversation:joined",
					ConversationID: &conversationID,
					Timestamp:      time.Now(),
				}
			}
		case "typing:update":
			if c.hub.joinConversation(c, conversationID) {
				c.hub.PublishConversationEvent(conversationID, "typing:update", gin.H{
					"conversation_id": conversationID,
					"user_id":         c.userID,
					"is_typing":       message.IsTyping,
				})
			}
		}
	}
}

func (c *chatClient) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()

	for {
		select {
		case envelope, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			bytes, err := json.Marshal(envelope)
			if err != nil {
				continue
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, bytes); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
