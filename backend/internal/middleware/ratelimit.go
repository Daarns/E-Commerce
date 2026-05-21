package middleware

import (
	"context"
	"ecommerce-backend/pkg/response"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// RateLimiter implements fixed-window rate limiting using Redis with atomic Lua script.
// Each limiter instance is namespaced so different route groups never share counters.
type RateLimiter struct {
	redis       *redis.Client
	maxRequests int
	window      time.Duration
	namespace   string // key prefix, e.g. "rl:global", "rl:auth"
}

// NewRateLimiter creates a new rate limiter with an explicit namespace.
// Using distinct namespaces prevents different route groups from sharing the same Redis key.
func NewRateLimiter(redisClient *redis.Client, maxRequests int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		redis:       redisClient,
		maxRequests: maxRequests,
		window:      window,
		namespace:   "rl:global",
	}
}

// NewNamespacedRateLimiter creates a rate limiter with a custom namespace.
// Always use this when applying multiple limiters to the same request path
// to avoid key collisions.
func NewNamespacedRateLimiter(redisClient *redis.Client, maxRequests int, window time.Duration, namespace string) *RateLimiter {
	return &RateLimiter{
		redis:       redisClient,
		maxRequests: maxRequests,
		window:      window,
		namespace:   namespace,
	}
}

// Lua script for atomic increment + expire.
// Returns the current count AFTER increment.
// This avoids the TOCTOU race between GET → INCR in the old implementation.
var rateLimitScript = redis.NewScript(`
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local current = redis.call("INCR", key)
if current == 1 then
    redis.call("EXPIRE", key, window)
end
return current
`)

// isAllowed checks rate limit atomically and returns (allowed, remaining, error).
func (rl *RateLimiter) isAllowed(ctx context.Context, key string) (bool, error) {
	windowSecs := int(rl.window.Seconds())
	count, err := rateLimitScript.Run(ctx, rl.redis, []string{key}, rl.maxRequests, windowSecs).Int()
	if err != nil {
		return false, err
	}
	return count <= rl.maxRequests, nil
}

// Middleware returns a Gin middleware that rate-limits by client IP.
func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		clientIP := c.ClientIP()
		key := fmt.Sprintf("%s:%s", rl.namespace, clientIP)

		allowed, err := rl.isAllowed(c.Request.Context(), key)
		if err != nil {
			// Fail-open on Redis error: log and allow the request through.
			fmt.Printf("[RateLimit] Redis error (namespace=%s): %v\n", rl.namespace, err)
			c.Next()
			return
		}

		if !allowed {
			response.TooManyRequests(c, "Rate limit exceeded. Please try again later.")
			c.Abort()
			return
		}

		c.Next()
	}
}

// PerIPRateLimit creates a namespaced middleware to rate-limit by IP.
// Provide a unique namespace (e.g. "rl:auth") so it does not collide
// with other limiters applied to the same request chain.
func PerIPRateLimit(redisClient *redis.Client, maxRequests int, window time.Duration, namespace string) gin.HandlerFunc {
	limiter := NewNamespacedRateLimiter(redisClient, maxRequests, window, namespace)
	return limiter.Middleware()
}

// PerUserRateLimit creates a rate limiter per authenticated user ID.
// Skips unauthenticated requests silently.
func PerUserRateLimit(redisClient *redis.Client, maxRequests int, window time.Duration, namespace string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			c.Next()
			return
		}

		key := fmt.Sprintf("%s:user:%v", namespace, userID)
		ctx := c.Request.Context()
		windowSecs := int(window.Seconds())

		count, err := rateLimitScript.Run(ctx, redisClient, []string{key}, maxRequests, windowSecs).Int()
		if err != nil {
			fmt.Printf("[RateLimit] Redis error (namespace=%s): %v\n", namespace, err)
			c.Next()
			return
		}

		if count > maxRequests {
			response.TooManyRequests(c, "Too many requests. Please try again later.")
			c.Abort()
			return
		}

		c.Next()
	}
}

// ImageUploadRateLimit is a convenience wrapper for image upload rate limiting.
// Default: 10 requests per 1 minute per user.
// Uses namespace "rl:image-upload" to avoid collision with other limiters.
func ImageUploadRateLimit(redisClient *redis.Client) gin.HandlerFunc {
	return PerUserRateLimit(redisClient, 10, time.Minute, "rl:image-upload")
}
