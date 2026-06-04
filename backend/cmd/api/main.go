package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"ecommerce-backend/internal/handlers"
	adminHandler "ecommerce-backend/internal/handlers/admin"
	adminProductHandler "ecommerce-backend/internal/handlers/admin/product"
	adminUserHandler "ecommerce-backend/internal/handlers/admin/user"
	authHandler "ecommerce-backend/internal/handlers/auth"
	cartHandler "ecommerce-backend/internal/handlers/cart"
	orderHandler "ecommerce-backend/internal/handlers/order"
	productHandler "ecommerce-backend/internal/handlers/product"
	"ecommerce-backend/internal/repositories"
	"ecommerce-backend/internal/routes"
	adminService "ecommerce-backend/internal/services/admin"
	authService "ecommerce-backend/internal/services/auth"
	cartService "ecommerce-backend/internal/services/cart"
	chatService "ecommerce-backend/internal/services/chat"
	cleanupService "ecommerce-backend/internal/services/cleanup"
	emailService "ecommerce-backend/internal/services/email"
	newsletterService "ecommerce-backend/internal/services/newsletter"
	notificationService "ecommerce-backend/internal/services/notification"
	orderService "ecommerce-backend/internal/services/order"
	paymentService "ecommerce-backend/internal/services/payment"
	productService "ecommerce-backend/internal/services/product"
	searchService "ecommerce-backend/internal/services/search"
	wishlistService "ecommerce-backend/internal/services/wishlist"
	"ecommerce-backend/internal/utils"
	"ecommerce-backend/pkg/jwt"
	"ecommerce-backend/pkg/storage"

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
	configureAppTimezone()

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
	wishlistRepo := repositories.NewWishlistRepository(db)
	shippingRepo := repositories.NewShippingRepository(db)
	tempUploadRepo := repositories.NewTempUploadRepository(db)
	webhookEventRepo := repositories.NewWebhookEventRepository(db)
	notificationRepo := repositories.NewNotificationRepository(db)

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

	// Initialize Image Service
	imageSvc := storage.NewImageService(
		os.Getenv("SEAWEEDFS_ENDPOINT"),
		os.Getenv("SEAWEEDFS_ACCESS_KEY"),
		os.Getenv("SEAWEEDFS_SECRET_KEY"),
	)

	// Initialize Payment Services (Midtrans)
	paymentConfig, err := paymentService.LoadPaymentGatewayConfig()
	if err != nil {
		log.Printf("Warning: payment gateway not configured: %v", err)
	}

	var snapSvc *paymentService.SnapService
	var webhookSvc *paymentService.PaymentWebhookService
	var syncSvc *paymentService.PaymentSyncService
	var refundSvc *paymentService.RefundService
	if paymentConfig != nil {
		if err := paymentConfig.Validate(); err != nil {
			log.Printf("Warning: payment config invalid: %v", err)
		} else {
			snapSvc = paymentService.NewSnapService(paymentConfig)
			webhookSvc = paymentService.NewPaymentWebhookService(orderRepo, promoCodeRepo, paymentConfig.ServerKey)
			webhookSvc.SetWebhookEventRepository(webhookEventRepo)
			syncSvc = paymentService.NewPaymentSyncService(paymentConfig, orderRepo, promoCodeRepo)
			refundSvc = paymentService.NewRefundService(paymentConfig)
			log.Printf("✅ Midtrans payment gateway initialized (sandbox=%v)", paymentConfig.IsSandbox())
		}
	}

	// Initialize Services
	authSvc := authService.NewAuthService(userRepo, emailQueueRepo, jwtManager, emailSvc)

	// Get underlying SQL DB from GORM DB for DashboardService
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("Failed to get SQL database from GORM: %v", err)
	}

	dashboardSvc := adminService.NewDashboardService(nil, nil, nil, sqlDB)
	productSvc := productService.NewProductService(productRepo, categoryRepo)
	productSvc.SetDB(db)
	productSvc.SetImageService(imageSvc)
	categorySvc := productService.NewCategoryService(categoryRepo, productRepo)
	cartSvc := cartService.NewCartService(cartRepo, addressRepo, productRepo)
	addressSvc := cartService.NewAddressService(addressRepo)
	orderSvc := orderService.NewOrderService(db, orderRepo, cartRepo, productRepo, promoCodeRepo, addressRepo, shippingRepo, snapSvc, refundSvc)
	newsletterSvc := newsletterService.NewNewsletterService(newsletterRepo)
	notificationSvc := notificationService.NewService(notificationRepo)
	orderSvc.SetNotificationWriter(notificationSvc)
	orderSvc.SetAdminUserProvider(userRepo)
	if webhookSvc != nil {
		webhookSvc.SetNotificationWriter(notificationSvc)
	}
	if syncSvc != nil {
		syncSvc.SetNotificationWriter(notificationSvc)
	}
	searchSvc := searchService.NewSearchService(searchRepo, productRepo, categoryRepo)
	chatSvc := chatService.NewChatService(chatRepo, userRepo)
	chatSvc.SetNotificationWriter(notificationSvc)
	wishlistSvc := wishlistService.NewWishlistService(wishlistRepo, productRepo)
	activitySvc := utils.NewActivityService(activityRepo)
	exportSvc := utils.NewExportService(userRepo, orderRepo)
	cleanupSvc := cleanupService.NewCleanupService(db, tempUploadRepo, imageSvc, redisClient)

	// Initialize Handlers
	authH := authHandler.NewAuthHandler(authSvc)
	dashboardH := adminHandler.NewDashboardHandler(dashboardSvc)
	productH := productHandler.NewProductHandler(productSvc)
	categoryH := productHandler.NewCategoryHandler(categorySvc, productSvc)
	cartH := cartHandler.NewCartHandler(cartSvc)
	addressH := cartHandler.NewAddressHandler(addressSvc)
	orderH := orderHandler.NewOrderHandler(orderSvc, syncSvc, imageSvc)
	shippingH := orderHandler.NewShippingHandler(shippingRepo)
	searchH := handlers.NewSearchHandler(searchSvc)
	chatH := handlers.NewChatHandler(chatSvc)
	notificationH := handlers.NewNotificationHandler(notificationSvc)
	wishlistH := handlers.NewWishlistHandler(wishlistSvc)
	adminUserH := adminUserHandler.NewAdminUserHandler(exportSvc, userRepo)
	adminActivityH := adminUserHandler.NewAdminActivityHandler(activitySvc)
	adminProductH := adminProductHandler.NewAdminProductHandler(productSvc, tempUploadRepo)
	adminCategoryH := adminProductHandler.NewAdminCategoryHandler(categorySvc)
	adminOrderH := adminHandler.NewAdminOrderHandler(orderSvc)
	adminSearchH := adminHandler.NewAdminSearchHandler(searchSvc)
	adminPromoRepo := repositories.NewPromoRepository(db)
	promoSvc := utils.NewPromoService(adminPromoRepo)
	adminPromoH := adminHandler.NewAdminPromoHandler(promoSvc)

	// Initialize Gin router
	if os.Getenv("APP_ENV") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}
	router := gin.Default()

	// Global Middleware
	router.Use(gin.Recovery())
	router.Use(corsMiddleware())
	router.Use(SecurityHeadersMiddleware())

	// Setup all routes via routes package (Separation of Concerns)
	routes.Setup(routes.Config{
		Router:         router,
		RedisClient:    redisClient,
		JWTManager:     jwtManager,
		WebhookSvc:     webhookSvc,
		NewsletterSvc:  newsletterSvc,
		NotificationH:  notificationH,
		AuthH:          authH,
		DashboardH:     dashboardH,
		ProductH:       productH,
		AdminProductH:  adminProductH,
		CategoryH:      categoryH,
		AdminCategoryH: adminCategoryH,
		CartH:          cartH,
		OrderH:         orderH,
		AdminOrderH:    adminOrderH,
		ShippingH:      shippingH,
		SearchH:        searchH,
		AdminSearchH:   adminSearchH,
		ChatH:          chatH,
		WishlistH:      wishlistH,
		AdminUserH:     adminUserH,
		AdminActivityH: adminActivityH,
		AddressH:       addressH,
		AdminPromoH:    adminPromoH,
	})

	// Start background cleanup jobs
	cleanupSvc.StartBackgroundJobs()
	log.Println("✅ Background cleanup jobs started")

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
	allowedOrigins := parseAllowedOrigins(os.Getenv("CORS_ALLOWED_ORIGINS"))

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if allowedOrigins[origin] {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
			c.Writer.Header().Set("Vary", "Origin")
		}
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, X-Session-ID")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func configureAppTimezone() {
	timezone := strings.TrimSpace(os.Getenv("APP_TIMEZONE"))
	if timezone == "" {
		timezone = "Asia/Jakarta"
	}

	location, err := time.LoadLocation(timezone)
	if err != nil {
		log.Fatalf("Invalid APP_TIMEZONE %q: %v", timezone, err)
	}

	time.Local = location
	if err := os.Setenv("TZ", timezone); err != nil {
		log.Fatalf("Failed to set TZ: %v", err)
	}
	if err := os.Setenv("PGTZ", timezone); err != nil {
		log.Fatalf("Failed to set PGTZ: %v", err)
	}
	log.Printf("✅ Application timezone set to %s", timezone)
}

func parseAllowedOrigins(raw string) map[string]bool {
	allowed := map[string]bool{
		"http://localhost:3000": true,
		"http://localhost:3001": true,
	}

	for _, origin := range strings.Split(raw, ",") {
		origin = strings.TrimSpace(origin)
		if origin != "" {
			allowed[origin] = true
		}
	}

	return allowed
}

// SecurityHeadersMiddleware adds standard security headers to every response
func SecurityHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		// Prevents browser from sending referrer info to external sites
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Next()
	}
}
