package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	adminHandler "ecommerce-backend/internal/handlers/admin"
	authHandler "ecommerce-backend/internal/handlers/auth"
	cartHandler "ecommerce-backend/internal/handlers/cart"
	featuresHandler "ecommerce-backend/internal/handlers/features"
	orderHandler "ecommerce-backend/internal/handlers/order"
	productHandler "ecommerce-backend/internal/handlers/product"
	"ecommerce-backend/internal/middleware"
	"ecommerce-backend/internal/repositories"
	authService "ecommerce-backend/internal/services/auth"
	cartService "ecommerce-backend/internal/services/cart"
	emailService "ecommerce-backend/internal/services/email"
	featuresService "ecommerce-backend/internal/services/features"
	orderService "ecommerce-backend/internal/services/order"
	productService "ecommerce-backend/internal/services/product"
	"ecommerce-backend/internal/utils"
	"ecommerce-backend/pkg/jwt"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
	"github.com/zishang520/socket.io/servers/socket/v3"
	"github.com/zishang520/socket.io/v3/pkg/types"
	postgresDriver "gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func main() {
	// Load .env file (try multiple paths for flexibility)
	if err := godotenv.Load(".env"); err != nil {
		if err := godotenv.Load("../.env"); err != nil {
			if err := godotenv.Load("../../.env"); err != nil {
				log.Println("Warning: .env file not found, using environment variables")
			}
		}
	}

	// Initialize Database
	db, err := initDB()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	log.Println("✅ Database connected")

	// Initialize Redis
	redisClient := initRedis()
	ctx := context.Background()
	if err := redisClient.Ping(ctx).Err(); err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	log.Println("✅ Redis connected")

	// Initialize JWT Manager with dual secrets
	accessTokenSecret := os.Getenv("JWT_ACCESS_SECRET")
	if accessTokenSecret == "" {
		log.Fatalf("JWT_ACCESS_SECRET environment variable is required")
	}
	if len(accessTokenSecret) < 32 {
		log.Fatalf("JWT_ACCESS_SECRET must be at least 32 characters long (for security)")
	}

	refreshTokenSecret := os.Getenv("JWT_REFRESH_SECRET")
	if refreshTokenSecret == "" {
		log.Fatalf("JWT_REFRESH_SECRET environment variable is required")
	}
	if len(refreshTokenSecret) < 32 {
		log.Fatalf("JWT_REFRESH_SECRET must be at least 32 characters long (for security)")
	}

	accessTokenExpiry := 15 * time.Minute
	if expiry := os.Getenv("JWT_EXPIRY"); expiry != "" {
		if dur, err := time.ParseDuration(expiry); err == nil {
			accessTokenExpiry = dur
		}
	}

	refreshTokenExpiry := 7 * 24 * time.Hour
	if expiry := os.Getenv("REFRESH_TOKEN_EXPIRY"); expiry != "" {
		if dur, err := time.ParseDuration(expiry); err == nil {
			refreshTokenExpiry = dur
		}
	}

	jwtManager := jwt.NewManager(jwt.Config{
		AccessTokenSecret:    accessTokenSecret,
		RefreshTokenSecret:   refreshTokenSecret,
		AccessTokenDuration:  accessTokenExpiry,
		RefreshTokenDuration: refreshTokenExpiry,
	})

	// Initialize Repositories
	userRepo := repositories.NewUserRepository(db)
	productRepo := repositories.NewProductRepository(db)
	categoryRepo := repositories.NewCategoryRepository(db)
	cartRepo := repositories.NewCartRepository(db)
	addressRepo := repositories.NewAddressRepository(db)
	orderRepo := repositories.NewOrderRepository(db)
	promoCodeRepo := repositories.NewPromoCodeRepository(db)
	newsletterRepo := repositories.NewNewsletterRepository(db)
	searchRepo := repositories.NewSearchRepository(db)
	chatRepo := repositories.NewChatRepository(db)
	activityRepo := repositories.NewActivityRepository(db)
	emailQueueRepo := repositories.NewEmailQueueRepository(db)

	// Initialize Email Service
	emailConfig := emailService.EmailConfig{
		Host:     os.Getenv("SMTP_HOST"),
		Port:     587, // Gmail SMTP port
		Username: os.Getenv("SMTP_USER"),
		Password: os.Getenv("SMTP_PASSWORD"),
		FromAddr: os.Getenv("EMAIL_FROM"),
	}
	
	// Use defaults for Gmail if not configured
	if emailConfig.Host == "" {
		emailConfig.Host = "smtp.gmail.com"
	}
	if emailConfig.Username == "" {
		emailConfig.Username = os.Getenv("GMAIL_USER")
	}
	if emailConfig.Password == "" {
		emailConfig.Password = os.Getenv("GMAIL_PASSWORD")
	}
	if emailConfig.FromAddr == "" {
		emailConfig.FromAddr = emailConfig.Username
	}
	
	emailSvc, err := emailService.NewEmailService(emailConfig)
	if err != nil {
		log.Printf("Warning: failed to initialize email service: %v\n", err)
		emailSvc = nil
	}

	// Initialize Services
	authSvc := authService.NewAuthService(userRepo, emailQueueRepo, jwtManager, emailSvc)
	productSvc := productService.NewProductService(productRepo, categoryRepo)
	cartSvc := cartService.NewCartService(cartRepo, addressRepo, productRepo)
	orderSvc := orderService.NewOrderService(db, orderRepo, cartRepo, productRepo, promoCodeRepo, addressRepo)
	newsletterSvc := featuresService.NewNewsletterService(newsletterRepo)
	searchSvc := featuresService.NewSearchService(searchRepo, productRepo, categoryRepo)
	chatSvc := featuresService.NewChatService(chatRepo, userRepo)
	activitySvc := utils.NewActivityService(activityRepo)
	exportSvc := utils.NewExportService(userRepo, orderRepo)

	// Initialize Handlers
	authH := authHandler.NewAuthHandler(authSvc)
	productH := productHandler.NewProductHandler(productSvc)
	categoryH := productHandler.NewCategoryHandler(productSvc)
	cartH := cartHandler.NewCartHandler(cartSvc)
	orderH := orderHandler.NewOrderHandler(orderSvc)
	searchH := featuresHandler.NewSearchHandler(searchSvc)
	chatH := featuresHandler.NewChatHandler(chatSvc)
	adminUserH := adminHandler.NewAdminUserHandler(exportSvc)
	adminActivityH := adminHandler.NewAdminActivityHandler(activitySvc)

	// Initialize Gin router
	if os.Getenv("APP_ENV") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	router := gin.Default()

	// Global Middleware
	router.Use(gin.Recovery())
	router.Use(corsMiddleware())

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "ecommerce-api",
			"time":    time.Now().Format(time.RFC3339),
		})
	})

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Rate limiting middleware (100 req/min)
		rateLimiter := middleware.NewRateLimiter(redisClient, 100, time.Minute)
		v1.Use(rateLimiter.Middleware())

		// Public routes
		v1.GET("/ping", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"message": "pong",
			})
		})

		// Auth routes (public)
		authRoutes := v1.Group("/auth")
		{
			authRoutes.POST("/register", authH.Register)
			authRoutes.POST("/login", authH.Login)
			authRoutes.POST("/refresh", authH.Refresh)
			authRoutes.POST("/verify-email", authH.VerifyEmail)
			authRoutes.POST("/resend-verification-email", authH.ResendVerificationEmail)
		}

		// Category routes (public - read only)
		categoryRoutes := v1.Group("/categories")
		{
			categoryRoutes.GET("", categoryH.ListCategories)
			categoryRoutes.GET("/tree", categoryH.GetCategoryTree)
			categoryRoutes.GET("/root", categoryH.GetRootCategories)
			categoryRoutes.GET("/:identifier", categoryH.GetCategory)
			categoryRoutes.GET("/:identifier/products", categoryH.GetCategoryWithProducts)
		}

		// Newsletter routes (public - no auth required)
		productHandler.RegisterNewsletterRoutes(v1, newsletterSvc)

		// Product routes (public - read only)
		productRoutes := v1.Group("/products")
		{
			productRoutes.GET("", productH.ListProducts)
			productRoutes.GET("/search", productH.SearchProducts)
			productRoutes.GET("/featured", productH.GetFeaturedProducts)
			productRoutes.GET("/:identifier", productH.GetProduct)
			productRoutes.GET("/:identifier/related", productH.GetRelatedProducts)
		}

		// Search routes (public - read only)
		searchRoutes := v1.Group("/search")
		searchRoutes.Use(middleware.OptionalAuthMiddleware(jwtManager))
		{
			searchRoutes.GET("", searchH.SearchProducts)
			searchRoutes.GET("/autocomplete", searchH.GetAutocompleteSuggestions)
			searchRoutes.GET("/popular", searchH.GetPopularSearches)
			searchRoutes.GET("/facets", searchH.GetSearchFacets)
			searchRoutes.GET("/filters", searchH.GetSearchFilters)
			searchRoutes.GET("/trending-products", searchH.GetTrendingProducts)
			searchRoutes.POST("/click", searchH.RecordProductClick)
		}

		// Cart routes (public with optional session or auth)
		cartRoutes := v1.Group("/cart")
		cartRoutes.Use(middleware.OptionalAuthMiddleware(jwtManager))
		{
			cartRoutes.GET("", cartH.GetCart)
			cartRoutes.GET("/summary", cartH.GetCartSummary)
			cartRoutes.POST("/items", cartH.AddToCart)
			cartRoutes.PUT("/items/:itemId", cartH.UpdateCartItem)
			cartRoutes.DELETE("/items/:itemId", cartH.RemoveFromCart)
			cartRoutes.DELETE("", cartH.ClearCart)
			cartRoutes.POST("/refresh", cartH.RefreshCartPrices)
		}

		// Protected routes (require authentication)
		protected := v1.Group("")
		protected.Use(middleware.AuthMiddleware(jwtManager))
		{
			protected.POST("/auth/logout", authH.Logout)
			protected.GET("/auth/me", authH.GetProfile)

			// Cart merge (after login)
			protected.POST("/cart/merge", cartH.MergeGuestCart)

			// Address routes
			addressRoutes := protected.Group("/addresses")
			{
				addressRoutes.GET("", cartH.GetAddresses)
				addressRoutes.GET("/:id", cartH.GetAddress)
				addressRoutes.POST("", cartH.CreateAddress)
				addressRoutes.PUT("/:id", cartH.UpdateAddress)
				addressRoutes.DELETE("/:id", cartH.DeleteAddress)
				addressRoutes.PUT("/:id/default", cartH.SetDefaultAddress)
			}

			// Order routes (customer)
			orderRoutes := protected.Group("/orders")
			{
				orderRoutes.GET("", orderH.GetOrders)
				orderRoutes.GET("/:id", orderH.GetOrder)
				orderRoutes.POST("/:id/cancel", orderH.CancelOrder)
			}

			// Checkout
			protected.POST("/checkout", orderH.Checkout)
			protected.POST("/promo-codes/validate", orderH.ValidatePromoCode)

			// Chat routes (protected - require authentication)
			chatRoutes := protected.Group("/chat")
			{
				chatRoutes.POST("/conversations", chatH.CreateConversation)
				chatRoutes.GET("/conversations", chatH.GetConversations)
				chatRoutes.GET("/conversations/:id", chatH.GetConversation)
				chatRoutes.POST("/conversations/:id/messages", chatH.SendMessage)
				chatRoutes.GET("/conversations/:id/messages", chatH.GetMessages)
				chatRoutes.PUT("/messages/:id/read", chatH.MarkAsRead)
				chatRoutes.POST("/conversations/:id/typing", chatH.SetTypingIndicator)
				chatRoutes.GET("/conversations/:id/typing", chatH.GetTypingUsers)
				chatRoutes.POST("/messages/:id/reactions", chatH.AddReaction)
				chatRoutes.DELETE("/messages/:id/reactions/:reaction", chatH.RemoveReaction)
			}

			// Account search history routes
			accountSearchRoutes := protected.Group("/account/search")
			{
				accountSearchRoutes.GET("/history", searchH.GetUserSearchHistory)
				accountSearchRoutes.DELETE("/history", searchH.ClearSearchHistory)
			}
		}

		// Admin routes (require admin role)
		admin := v1.Group("/admin")
		admin.Use(middleware.AuthMiddleware(jwtManager))
		admin.Use(middleware.AdminOnly())
		{
			admin.GET("/dashboard", func(c *gin.Context) {
				userID, _ := middleware.GetUserID(c)
				c.JSON(http.StatusOK, gin.H{
					"message": "Admin dashboard",
					"user_id": userID,
				})
			})

			// Admin Product routes
			adminProducts := admin.Group("/products")
			{
				adminProducts.POST("", productH.CreateProduct)
				adminProducts.PUT("/:id", productH.UpdateProduct)
				adminProducts.DELETE("/:id", productH.DeleteProduct)
				adminProducts.POST("/:id/images", productH.UploadProductImage)
				adminProducts.PUT("/:id/images/reorder", productH.ReorderProductImages)
				adminProducts.DELETE("/images/:imageId", productH.DeleteProductImage)
				adminProducts.POST("/:id/variants", productH.AddVariant)
				adminProducts.PUT("/variants/:variantId", productH.UpdateVariant)
				adminProducts.DELETE("/variants/:variantId", productH.DeleteVariant)
			}

			// Admin Category routes
			adminCategories := admin.Group("/categories")
			{
				adminCategories.POST("", categoryH.CreateCategory)
				adminCategories.PUT("/:id", categoryH.UpdateCategory)
				adminCategories.DELETE("/:id", categoryH.DeleteCategory)
			}

			// Admin Order routes
			adminOrders := admin.Group("/orders")
			{
				adminOrders.GET("", orderH.AdminGetOrders)
				adminOrders.GET("/summary", orderH.GetOrderSummary)
				adminOrders.GET("/:id", orderH.AdminGetOrder)
				adminOrders.PUT("/:id/status", orderH.AdminUpdateOrderStatus)
				adminOrders.PUT("/:id/payment", orderH.AdminUpdatePayment)
				adminOrders.PUT("/:id/tracking", orderH.AdminUpdateTracking)
				adminOrders.PUT("/:id/notes", orderH.AdminAddNotes)
			}

			// Admin User routes
			adminUsers := admin.Group("/users")
			{
				adminUsers.GET("", adminUserH.ListUsers)
				adminUsers.GET("/export", adminUserH.ExportUsersToCSV)
				adminUsers.GET("/:id", adminUserH.GetUser)
			}

			// Admin Activity routes
			adminActivities := admin.Group("/activities")
			{
				adminActivities.GET("", adminActivityH.GetActivities)
				adminActivities.GET("/summary", adminActivityH.GetActivitySummary)
				adminActivities.GET("/user/:user_id", adminActivityH.GetUserActivities)
			}

			// Admin Search metrics routes
			adminSearchRoutes := admin.Group("/search")
			{
				adminSearchRoutes.GET("/metrics", searchH.GetSearchMetrics)
			}
		}
	}

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Initialize Socket.io server dengan CORS di ServerOptions
	socketOptions := socket.DefaultServerOptions()
	socketOptions.SetCors(&types.Cors{
		Origin:      "*",
		Credentials: true,
	})

	ioServer := socket.NewServer(nil, socketOptions)

	ioServer.On("connection", func(clients ...any) {
		client := clients[0].(*socket.Socket)
		log.Printf("✨ Socket client connected: %s\n", client.Id())

		client.On("disconnect", func(reasons ...any) {
			log.Printf("🔌 Socket client disconnected: %s\n", client.Id())
		})
	})

	// Start Socket.io server on port 8081
	socketPort := "8081"
	go func() {
		mux := http.NewServeMux()
		mux.Handle("/socket.io/", ioServer.ServeHandler(nil))

		socketSrv := &http.Server{
			Addr:    ":" + socketPort,
			Handler: mux,
		}

		log.Printf("🔌 WebSocket server starting on http://localhost:%s/socket.io\n", socketPort)
		if err := socketSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("⚠️ WebSocket server error: %v\n", err)
		}
	}()

	time.Sleep(200 * time.Millisecond)

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: router,
	}

	// Graceful shutdown
	go func() {
		log.Printf("🚀 API Server starting on http://localhost:%s\n", port)
		log.Printf("📚 API Documentation: http://localhost:%s/api/v1/ping\n", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("🛑 Shutting down servers...")

	ctx2, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx2); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("✅ Servers exited gracefully")
}

func initDB() (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_SSLMODE"),
	)

	db, err := gorm.Open(postgresDriver.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	return db, nil
}

func initRedis() *redis.Client {
	return redis.NewClient(&redis.Options{
		Addr:     os.Getenv("REDIS_ADDR"),
		Password: os.Getenv("REDIS_PASSWORD"),
		DB:       0,
	})
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, X-Session-ID")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

