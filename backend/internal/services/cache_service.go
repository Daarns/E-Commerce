package services

import (
	"sync"
	"time"
)

// CacheItem represents a cached item with expiration
type CacheItem struct {
	Value     interface{}
	ExpiresAt time.Time
}

// CacheService provides in-memory caching (can be replaced with Redis)
type CacheService struct {
	mu    sync.RWMutex
	items map[string]*CacheItem
}

// NewCacheService creates a new cache service
func NewCacheService() *CacheService {
	cs := &CacheService{
		items: make(map[string]*CacheItem),
	}

	// Start cleanup goroutine for expired items
	go cs.cleanupExpired()

	return cs
}

// Set stores a value in cache with expiration
func (c *CacheService) Set(key string, value interface{}, ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.items[key] = &CacheItem{
		Value:     value,
		ExpiresAt: time.Now().Add(ttl),
	}
}

// Get retrieves a value from cache
func (c *CacheService) Get(key string) (interface{}, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	item, exists := c.items[key]
	if !exists {
		return nil, ErrCacheNotFound
	}

	if time.Now().After(item.ExpiresAt) {
		return nil, ErrCacheExpired
	}

	return item.Value, nil
}

// Delete removes a key from cache
func (c *CacheService) Delete(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	delete(c.items, key)
}

// Clear removes all items from cache
func (c *CacheService) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.items = make(map[string]*CacheItem)
}

// cleanupExpired periodically removes expired items
func (c *CacheService) cleanupExpired() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		c.mu.Lock()
		now := time.Now()
		for key, item := range c.items {
			if now.After(item.ExpiresAt) {
				delete(c.items, key)
			}
		}
		c.mu.Unlock()
	}
}

// CacheErrors
var (
	ErrCacheNotFound = &CacheError{"key not found in cache"}
	ErrCacheExpired  = &CacheError{"cache entry has expired"}
)

// CacheError represents a cache error
type CacheError struct {
	message string
}

func (e *CacheError) Error() string {
	return e.message
}
