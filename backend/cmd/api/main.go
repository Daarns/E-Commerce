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

	"ecommerce-backend/internal/handlers"
	"ecommerce-backend/internal/middleware"
	"ecommerce-backend/internal/repositories"
	"ecommerce-backend/internal/services"
	"ecommerce-backend/pkg/jwt"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
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

	// Initialize JWT Manager
	jwtManager := jwt.NewManager(jwt.Config{
		SecretKey:            os.Getenv("JWT_SECRET"),
		AccessTokenDuration:  15 * time.Minute,
		RefreshTokenDuration: 7 * 24 * time.Hour,
	})

	// Initialize Repositories
	userRepo := repositories.NewUserRepository(db)
	productRepo := repositories.NewProductRepository(db)
	categoryRepo := repositories.NewCategoryRepository(db)
	cartRepo := repositories.NewCartRepository(db)
	addressRepo := repositories.NewAddressRepository(db)
	orderRepo := repositories.NewOrderRepository(db)
	promoCodeRepo := repositories.NewPromoCodeRepository(db)

	// Initialize Services
	authService := services.NewAuthService(userRepo, jwtManager)
	productService := services.NewProductService(productRepo, categoryRepo)
	cartService := services.NewCartService(cartRepo, addressRepo, productRepo)
	orderService := services.NewOrderService(db, orderRepo, cartRepo, productRepo, promoCodeRepo, addressRepo)

	// Initialize Handlers
	authHandler := handlers.NewAuthHandler(authService)
	productHandler := handlers.NewProductHandler(productService)
	categoryHandler := handlers.NewCategoryHandler(productService)
	cartHandler := handlers.NewCartHandler(cartService)
	orderHandler := handlers.NewOrderHandler(orderService)

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
			authRoutes.POST("/register", authHandler.Register)
			authRoutes.POST("/login", authHandler.Login)
			authRoutes.POST("/refresh", authHandler.Refresh)
		}

		// Category routes (public - read only)
		categoryRoutes := v1.Group("/categories")
		{
			categoryRoutes.GET("", categoryHandler.ListCategories)
			categoryRoutes.GET("/tree", categoryHandler.GetCategoryTree)
			categoryRoutes.GET("/root", categoryHandler.GetRootCategories)
			categoryRoutes.GET("/:identifier", categoryHandler.GetCategory)
			categoryRoutes.GET("/:identifier/products", categoryHandler.GetCategoryWithProducts)
		}

		// Product routes (public - read only)
		productRoutes := v1.Group("/products")
		{
			productRoutes.GET("", productHandler.ListProducts)
			productRoutes.GET("/search", productHandler.SearchProducts)
			productRoutes.GET("/featured", productHandler.GetFeaturedProducts)
			productRoutes.GET("/:identifier", productHandler.GetProduct)
			productRoutes.GET("/:identifier/related", productHandler.GetRelatedProducts)
		}

		// Cart routes (public with optional session or auth)
		cartRoutes := v1.Group("/cart")
		cartRoutes.Use(middleware.OptionalAuthMiddleware(jwtManager))
		{
			cartRoutes.GET("", cartHandler.GetCart)
			cartRoutes.GET("/summary", cartHandler.GetCartSummary)
			cartRoutes.POST("/items", cartHandler.AddToCart)
			cartRoutes.PUT("/items/:itemId", cartHandler.UpdateCartItem)
			cartRoutes.DELETE("/items/:itemId", cartHandler.RemoveFromCart)
			cartRoutes.DELETE("", cartHandler.ClearCart)
			cartRoutes.POST("/refresh", cartHandler.RefreshCartPrices)
		}

		// Protected routes (require authentication)
		protected := v1.Group("")
		protected.Use(middleware.AuthMiddleware(jwtManager))
		{
			protected.POST("/auth/logout", authHandler.Logout)
			protected.GET("/auth/me", authHandler.GetProfile)

			// Cart merge (after login)
			protected.POST("/cart/merge", cartHandler.MergeGuestCart)

			// Address routes
			addressRoutes := protected.Group("/addresses")
			{
				addressRoutes.GET("", cartHandler.GetAddresses)
				addressRoutes.GET("/:id", cartHandler.GetAddress)
				addressRoutes.POST("", cartHandler.CreateAddress)
				addressRoutes.PUT("/:id", cartHandler.UpdateAddress)
				addressRoutes.DELETE("/:id", cartHandler.DeleteAddress)
				addressRoutes.PUT("/:id/default", cartHandler.SetDefaultAddress)
			}

			// Order routes (customer)
			orderRoutes := protected.Group("/orders")
			{
				orderRoutes.GET("", orderHandler.GetOrders)
				orderRoutes.GET("/:id", orderHandler.GetOrder)
				orderRoutes.POST("/:id/cancel", orderHandler.CancelOrder)
			}

			// Checkout
			protected.POST("/checkout", orderHandler.Checkout)
			protected.POST("/promo-codes/validate", orderHandler.ValidatePromoCode)
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
				adminProducts.POST("", productHandler.CreateProduct)
				adminProducts.PUT("/:id", productHandler.UpdateProduct)
				adminProducts.DELETE("/:id", productHandler.DeleteProduct)
				adminProducts.POST("/:id/images", productHandler.UploadProductImage)
				adminProducts.PUT("/:id/images/reorder", productHandler.ReorderProductImages)
				adminProducts.DELETE("/images/:imageId", productHandler.DeleteProductImage)
				adminProducts.POST("/:id/variants", productHandler.AddVariant)
				adminProducts.PUT("/variants/:variantId", productHandler.UpdateVariant)
				adminProducts.DELETE("/variants/:variantId", productHandler.DeleteVariant)
			}

			// Admin Category routes
			adminCategories := admin.Group("/categories")
			{
				adminCategories.POST("", categoryHandler.CreateCategory)
				adminCategories.PUT("/:id", categoryHandler.UpdateCategory)
				adminCategories.DELETE("/:id", categoryHandler.DeleteCategory)
			}

			// Admin Order routes
			adminOrders := admin.Group("/orders")
			{
				adminOrders.GET("", orderHandler.AdminGetOrders)
				adminOrders.GET("/summary", orderHandler.GetOrderSummary)
				adminOrders.GET("/:id", orderHandler.AdminGetOrder)
				adminOrders.PUT("/:id/status", orderHandler.AdminUpdateOrderStatus)
				adminOrders.PUT("/:id/payment", orderHandler.AdminUpdatePayment)
				adminOrders.PUT("/:id/tracking", orderHandler.AdminUpdateTracking)
				adminOrders.PUT("/:id/notes", orderHandler.AdminAddNotes)
			}
		}
	}

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: router,
	}

	// Graceful shutdown
	go func() {
		log.Printf("🚀 Server starting on http://localhost:%s\n", port)
		log.Printf("📚 API Documentation: http://localhost:%s/api/v1/ping\n", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("🛑 Shutting down server...")

	ctx2, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx2); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("✅ Server exited gracefully")
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
