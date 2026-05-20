package routes

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"

	"ecommerce-backend/internal/handlers"
	adminHandler "ecommerce-backend/internal/handlers/admin"
	adminProductHandler "ecommerce-backend/internal/handlers/admin/product"
	adminUserHandler "ecommerce-backend/internal/handlers/admin/user"
	authHandler "ecommerce-backend/internal/handlers/auth"
	cartHandler "ecommerce-backend/internal/handlers/cart"
	orderHandler "ecommerce-backend/internal/handlers/order"
	productHandler "ecommerce-backend/internal/handlers/product"
	"ecommerce-backend/internal/middleware"
	newsletterService "ecommerce-backend/internal/services/newsletter"
	paymentService "ecommerce-backend/internal/services/payment"
	"ecommerce-backend/internal/webhook"
	"ecommerce-backend/pkg/jwt"
)

type Config struct {
	Router        *gin.Engine
	RedisClient   *redis.Client
	JWTManager    *jwt.Manager
	WebhookSvc    *paymentService.PaymentWebhookService
	NewsletterSvc *newsletterService.NewsletterService

	AuthH          *authHandler.AuthHandler
	DashboardH     *adminHandler.DashboardHandler
	ProductH       *productHandler.ProductHandler
	AdminProductH  *adminProductHandler.AdminProductHandler
	CategoryH      *productHandler.CategoryHandler
	AdminCategoryH *adminProductHandler.AdminCategoryHandler
	CartH          *cartHandler.CartHandler
	OrderH         *orderHandler.OrderHandler
	AdminOrderH    *adminHandler.AdminOrderHandler
	ShippingH      *orderHandler.ShippingHandler
	SearchH        *handlers.SearchHandler
	AdminSearchH   *adminHandler.AdminSearchHandler
	ChatH          *handlers.ChatHandler
	WishlistH      *handlers.WishlistHandler
	AdminUserH     *adminUserHandler.AdminUserHandler
	AdminActivityH *adminUserHandler.AdminActivityHandler
	AddressH       *cartHandler.AddressHandler
	AdminPromoH    *adminHandler.AdminPromoHandler
}

func Setup(c Config) {
	// Register Midtrans webhook route (public — no auth, verified by Midtrans signature)
	if c.WebhookSvc != nil {
		webhook.RegisterWebhookRoutes(c.Router, c.WebhookSvc)
	}

	// Health check endpoint
	c.Router.GET("/health", func(ctx *gin.Context) {
		ctx.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "ecommerce-api",
			"time":    time.Now().Format(time.RFC3339),
		})
	})

	// API v1 routes
	v1 := c.Router.Group("/api/v1")
	{
		// Global rate limit: 300 req/min per IP — protects all public endpoints.
		// Uses namespace "rl:global" so it never conflicts with stricter auth limits.
		v1.Use(middleware.PerIPRateLimit(c.RedisClient, 300, time.Minute, "rl:global"))

		// Public routes
		v1.GET("/ping", func(ctx *gin.Context) {
			ctx.JSON(http.StatusOK, gin.H{
				"message": "pong",
			})
		})

		// Auth routes — tighter limit to slow brute-force / credential stuffing.
		// Industry standard: ~10–20 login attempts per minute per IP is acceptable for
		// legitimate users (mobile retries, password managers, etc.) while still blocking bots.
		// Namespace "rl:auth" is SEPARATE from "rl:global" — counters do NOT overlap.
		authRoutes := v1.Group("/auth", middleware.PerIPRateLimit(c.RedisClient, 20, time.Minute, "rl:auth"))
		{
			authRoutes.POST("/register", c.AuthH.Register)
			authRoutes.POST("/login", c.AuthH.Login)
			authRoutes.POST("/refresh", c.AuthH.Refresh)
			authRoutes.POST("/verify-email", c.AuthH.VerifyEmail)
			authRoutes.POST("/resend-verification-email", c.AuthH.ResendVerificationEmail)
			authRoutes.POST("/forgot-password", c.AuthH.ForgotPassword)
			authRoutes.POST("/reset-password", c.AuthH.ResetPassword)
		}

		// Category routes (public - read only)
		categoryRoutes := v1.Group("/categories")
		{
			categoryRoutes.GET("", c.CategoryH.ListCategories)
			categoryRoutes.GET("/tree", c.CategoryH.GetCategoryTree)
			categoryRoutes.GET("/root", c.CategoryH.GetRootCategories)
			categoryRoutes.GET("/:identifier", c.CategoryH.GetCategory)
			categoryRoutes.GET("/:identifier/products", c.CategoryH.GetCategoryWithProducts)
		}

		// Newsletter routes (public - no auth required)
		handlers.RegisterNewsletterRoutes(v1, c.NewsletterSvc)

		// Product routes (public - read only)
		productRoutes := v1.Group("/products")
		{
			productRoutes.GET("", c.ProductH.ListProducts)
			productRoutes.GET("/search", c.ProductH.SearchProducts)
			productRoutes.GET("/featured", c.ProductH.GetFeaturedProducts)
			productRoutes.GET("/:identifier", c.ProductH.GetProduct)
			productRoutes.GET("/:identifier/related", c.ProductH.GetRelatedProducts)
		}

		// Shipping routes (public - read only)
		v1.GET("/shipping/methods", c.ShippingH.ListShippingMethods)

		// Search routes (public - read only)
		searchRoutes := v1.Group("/search")
		searchRoutes.Use(middleware.OptionalAuthMiddleware(c.JWTManager))
		{
			searchRoutes.GET("", c.SearchH.SearchProducts)
			searchRoutes.GET("/autocomplete", c.SearchH.GetAutocompleteSuggestions)
			searchRoutes.GET("/popular", c.SearchH.GetPopularSearches)
			searchRoutes.GET("/facets", c.SearchH.GetSearchFacets)
			searchRoutes.GET("/filters", c.SearchH.GetSearchFilters)
			searchRoutes.GET("/trending-products", c.SearchH.GetTrendingProducts)
			searchRoutes.POST("/click", c.SearchH.RecordProductClick)
		}

		// Cart routes (public with optional session or auth)
		cartRoutes := v1.Group("/cart")
		cartRoutes.Use(middleware.OptionalAuthMiddleware(c.JWTManager))
		{
			cartRoutes.GET("", c.CartH.GetCart)
			cartRoutes.GET("/summary", c.CartH.GetCartSummary)
			cartRoutes.POST("/items", c.CartH.AddToCart)
			cartRoutes.PUT("/items/:itemId", c.CartH.UpdateCartItem)
			cartRoutes.DELETE("/items/:itemId", c.CartH.RemoveFromCart)
			cartRoutes.DELETE("", c.CartH.ClearCart)
			cartRoutes.POST("/refresh", c.CartH.RefreshCartPrices)
		}

		// Wishlist routes (public with optional session or auth)
		wishlistRoutes := v1.Group("/wishlist")
		wishlistRoutes.Use(middleware.OptionalAuthMiddleware(c.JWTManager))
		{
			wishlistRoutes.POST("", c.WishlistH.AddToWishlist)
			wishlistRoutes.DELETE("", c.WishlistH.RemoveFromWishlist)
			wishlistRoutes.POST("/toggle", c.WishlistH.ToggleWishlist)
			wishlistRoutes.GET("", c.WishlistH.GetWishlist)
			wishlistRoutes.GET("/count", c.WishlistH.GetWishlistCount)
			wishlistRoutes.POST("/check", c.WishlistH.CheckProduct)
			wishlistRoutes.POST("/clear", c.WishlistH.ClearWishlist)
		}

		// Protected routes (require authentication)
		// Per-user limit: 600 req/min — generous for legitimate SPA usage while
		// capping compromised tokens from being used for mass scraping.
		protected := v1.Group("")
		protected.Use(middleware.AuthMiddleware(c.JWTManager))
		protected.Use(middleware.PerUserRateLimit(c.RedisClient, 600, time.Minute, "rl:user"))
		{
			protected.POST("/auth/logout", c.AuthH.Logout)
			protected.GET("/auth/me", c.AuthH.GetProfile)
			protected.PUT("/auth/me", c.AuthH.UpdateProfile)
			protected.PUT("/auth/me/password", c.AuthH.ChangePassword)
			protected.DELETE("/auth/me", c.AuthH.DeleteAccount)

			// Cart merge (after login)
			protected.POST("/cart/merge", c.CartH.MergeGuestCart)

			// Address routes
			addressRoutes := protected.Group("/addresses")
			{
				addressRoutes.GET("", c.AddressH.GetAddresses)
				addressRoutes.GET("/:id", c.AddressH.GetAddress)
				addressRoutes.POST("", c.AddressH.CreateAddress)
				addressRoutes.PUT("/:id", c.AddressH.UpdateAddress)
				addressRoutes.DELETE("/:id", c.AddressH.DeleteAddress)
				addressRoutes.PUT("/:id/default", c.AddressH.SetDefaultAddress)
			}

			// Order routes (customer)
			orderRoutes := protected.Group("/orders")
			{
				orderRoutes.GET("", c.OrderH.GetOrders)
				orderRoutes.GET("/:id", c.OrderH.GetOrder)
				orderRoutes.POST("/:id/cancel", c.OrderH.CancelOrder)
				orderRoutes.POST("/:id/pay", c.OrderH.PayOrder)                   // Resume payment for pending orders
				orderRoutes.POST("/:id/sync-payment", c.OrderH.SyncPaymentStatus) // Sync status from Midtrans API
			}

			// Checkout
			protected.POST("/checkout", c.OrderH.Checkout)
			protected.POST("/promo-codes/validate", c.OrderH.ValidatePromoCode)

			// Chat routes (protected - require authentication)
			chatRoutes := protected.Group("/chat")
			{
				chatRoutes.POST("/conversations", c.ChatH.CreateConversation)
				chatRoutes.GET("/conversations", c.ChatH.GetConversations)
				chatRoutes.GET("/conversations/:id", c.ChatH.GetConversation)
				chatRoutes.POST("/conversations/:id/messages", c.ChatH.SendMessage)
				chatRoutes.GET("/conversations/:id/messages", c.ChatH.GetMessages)
				chatRoutes.PUT("/messages/:id/read", c.ChatH.MarkAsRead)
				chatRoutes.POST("/conversations/:id/typing", c.ChatH.SetTypingIndicator)
				chatRoutes.GET("/conversations/:id/typing", c.ChatH.GetTypingUsers)
				chatRoutes.POST("/messages/:id/reactions", c.ChatH.AddReaction)
				chatRoutes.DELETE("/messages/:id/reactions/:reaction", c.ChatH.RemoveReaction)
			}

			// Account search history routes
			accountSearchRoutes := protected.Group("/account/search")
			{
				accountSearchRoutes.GET("/history", c.SearchH.GetUserSearchHistory)
				accountSearchRoutes.DELETE("/history", c.SearchH.ClearSearchHistory)
			}
		}

		// Admin routes (require admin role)
		admin := v1.Group("/admin")
		admin.Use(middleware.AuthMiddleware(c.JWTManager))
		admin.Use(middleware.AdminOnly())
		{
			// Dashboard routes
			dashboard := admin.Group("/dashboard")
			{
				dashboard.GET("/summary", c.DashboardH.GetDashboardSummary)
			}

			// Analytics routes
			analytics := admin.Group("/analytics")
			{
				analytics.GET("/revenue", c.DashboardH.GetRevenueMetrics)
				analytics.GET("/orders", c.DashboardH.GetOrderAnalytics)
				analytics.GET("/customers", c.DashboardH.GetCustomerAnalytics)
				analytics.GET("/revenue-trends", c.DashboardH.GetMonthlyRevenueTrend)
				analytics.GET("/products", c.DashboardH.GetProductPerformance)
			}

			// Admin Product routes
			adminProducts := admin.Group("/products")
			{
				adminProducts.GET("", c.AdminProductH.AdminListProducts)

				// Image upload routes with rate limiting (10 requests per minute per user)
				uploadRoutes := adminProducts.Group("")
				uploadRoutes.Use(middleware.ImageUploadRateLimit(c.RedisClient))
				{
					uploadRoutes.POST("/upload-image", c.AdminProductH.UploadImageOnly)
					uploadRoutes.POST("/:id/images", c.AdminProductH.UploadProductImage)
				}

				adminProducts.POST("", c.AdminProductH.CreateProduct)

				adminProducts.GET("/:id", c.AdminProductH.AdminGetProduct)
				adminProducts.PUT("/:id", c.AdminProductH.UpdateProduct)
				adminProducts.DELETE("/:id", c.AdminProductH.DeleteProduct)
				adminProducts.PUT("/:id/images/reorder", c.AdminProductH.ReorderProductImages)
			}

			// Image management routes — separate group to avoid httprouter
			// conflict between static "/images" and param "/:id" on DELETE.
			adminProductImages := admin.Group("/product-images")
			adminProductImages.Use(middleware.ImageUploadRateLimit(c.RedisClient))
			{
				adminProductImages.DELETE("", c.AdminProductH.DeleteUploadedImage)
				adminProductImages.DELETE("/:imageId", c.AdminProductH.DeleteProductImage)
			}

			// Admin Category routes
			adminCategories := admin.Group("/categories")
			{
				adminCategories.POST("", c.AdminCategoryH.CreateCategory)
				adminCategories.PUT("/:id", c.AdminCategoryH.UpdateCategory)
				adminCategories.DELETE("/:id", c.AdminCategoryH.DeleteCategory)
			}

			// Admin Order routes
			adminOrders := admin.Group("/orders")
			{
				adminOrders.GET("", c.AdminOrderH.AdminGetOrders)
				adminOrders.GET("/summary", c.AdminOrderH.GetOrderSummary)
				adminOrders.GET("/:id", c.AdminOrderH.AdminGetOrder)
				adminOrders.PUT("/:id/status", c.AdminOrderH.AdminUpdateOrderStatus)
				adminOrders.PUT("/:id/payment", c.AdminOrderH.AdminUpdatePayment)
				adminOrders.PUT("/:id/tracking", c.AdminOrderH.AdminUpdateTracking)
				adminOrders.PUT("/:id/notes", c.AdminOrderH.AdminAddNotes)
			}

			// Admin User routes
			adminUsers := admin.Group("/users")
			{
				adminUsers.GET("", c.AdminUserH.ListUsers)
				adminUsers.GET("/metrics", c.AdminUserH.GetUserMetrics)
				adminUsers.GET("/export", c.AdminUserH.ExportUsersToCSV)
				adminUsers.GET("/:id", c.AdminUserH.GetUser)
			}

			// Admin Activity routes
			adminActivities := admin.Group("/activities")
			{
				adminActivities.GET("", c.AdminActivityH.GetActivities)
				adminActivities.GET("/summary", c.AdminActivityH.GetActivitySummary)
				adminActivities.GET("/user/:user_id", c.AdminActivityH.GetUserActivities)
			}

			// Admin Search metrics routes
			adminSearchRoutes := admin.Group("/search")
			{
				adminSearchRoutes.GET("/metrics", c.AdminSearchH.GetSearchMetrics)
			}

			// Admin Promo Code routes
			if c.AdminPromoH != nil {
				adminPromos := admin.Group("/promos")
				{
					adminPromos.GET("", c.AdminPromoH.ListPromoCodes)
					adminPromos.POST("", c.AdminPromoH.CreatePromoCode)
					adminPromos.GET("/:id", c.AdminPromoH.GetPromoCode)
					adminPromos.PUT("/:id", c.AdminPromoH.UpdatePromoCode)
					adminPromos.DELETE("/:id", c.AdminPromoH.DeletePromoCode)
				}
			}
		}
	}
}
