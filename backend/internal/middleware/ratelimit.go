package middleware

import (
	"context"
	"ecommerce-backend/pkg/response"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// RateLimiter implements token bucket rate limiting using Redis
type RateLimiter struct {
	redis       *redis.Client
	maxRequests int
	window      time.Duration
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(redis *redis.Client, maxRequests int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		redis:       redis,
		maxRequests: maxRequests,
		window:      window,
	}
}

// Middleware returns a gin middleware for rate limiting
func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get client IP
		clientIP := c.ClientIP()
		key := fmt.Sprintf("rate_limit:%s", clientIP)

		// Check rate limit
		allowed, err := rl.isAllowed(c.Request.Context(), key)
		if err != nil {
			// Log error but don't block request
			fmt.Printf("Rate limiter error: %v\n", err)
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

// isAllowed checks if request is allowed based on rate limit
func (rl *RateLimiter) isAllowed(ctx context.Context, key string) (bool, error) {
	// Get current count
	count, err := rl.redis.Get(ctx, key).Int()
	if err != nil && err != redis.Nil {
		return false, err
	}

	// If key doesn't exist or count is below limit
	if err == redis.Nil || count < rl.maxRequests {
		// Increment counter
		pipe := rl.redis.Pipeline()
		pipe.Incr(ctx, key)
		
		// Set expiry on first request
		if err == redis.Nil {
			pipe.Expire(ctx, key, rl.window)
		}
		
		_, err := pipe.Exec(ctx)
		if err != nil {
			return false, err
		}
		
		return true, nil
	}

	// Rate limit exceeded
	return false, nil
}

// PerIPRateLimit creates a rate limiter per IP address
func PerIPRateLimit(redis *redis.Client, maxRequests int, window time.Duration) gin.HandlerFunc {
	limiter := NewRateLimiter(redis, maxRequests, window)
	return limiter.Middleware()
}

// PerUserRateLimit creates a rate limiter per authenticated user
func PerUserRateLimit(redisClient *redis.Client, maxRequests int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user ID from context (set by auth middleware)
		userID, exists := c.Get("user_id")
		if !exists {
			// Skip rate limiting for unauthenticated requests
			c.Next()
			return
		}

		key := fmt.Sprintf("rate_limit:user:%v", userID)

		// Create context
		ctx := c.Request.Context()

		// Check rate limit
		count, err := redisClient.Get(ctx, key).Int()
		if err != nil && err != redis.Nil {
			// Log error but don't block
			fmt.Printf("Rate limiter error: %v\n", err)
			c.Next()
			return
		}

		if err == redis.Nil || count < maxRequests {
			// Increment counter
			pipe := redisClient.Pipeline()
			pipe.Incr(ctx, key)
			
			if err == redis.Nil {
				pipe.Expire(ctx, key, window)
			}
			
			_, err := pipe.Exec(ctx)
			if err != nil {
				fmt.Printf("Rate limiter error: %v\n", err)
			}
			
			c.Next()
			return
		}

		// Rate limit exceeded
		response.TooManyRequests(c, "Too many requests. Please try again later.")
		c.Abort()
	}
}
