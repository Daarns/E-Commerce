# Main.go Refactoring Guide - Domain-Based Structure

## Key Concept
Setiap paket yang berada di subdirectory memerlukan **prefix package name** saat memanggil fungsi atau type-nya.

---

## IMPORTS - Pattern Baru

### ✅ DOMAIN-BASED SERVICES (dengan subdirectory)
```go
// ✅ BENAR - Import dari domain-specific package
"ecommerce-backend/internal/services/auth"
"ecommerce-backend/internal/services/cart"
"ecommerce-backend/internal/services/order"
"ecommerce-backend/internal/services/product"
"ecommerce-backend/internal/services/admin"
"ecommerce-backend/internal/services/email"
"ecommerce-backend/internal/services/payment"
"ecommerce-backend/internal/services/cache"
"ecommerce-backend/internal/services/features"
```

### ✅ FLAT SERVICES (root level tanpa subdirectory)
```go
// ✅ BENAR - Utils sudah di root level
"ecommerce-backend/internal/utils"
```

### ✅ DOMAIN-BASED HANDLERS (dengan subdirectory)
```go
// ✅ BENAR - Import dari domain-specific package
"ecommerce-backend/internal/handlers/auth"
"ecommerce-backend/internal/handlers/admin"
"ecommerce-backend/internal/handlers/product"
"ecommerce-backend/internal/handlers/cart"
"ecommerce-backend/internal/handlers/order"
"ecommerce-backend/internal/handlers/category"
"ecommerce-backend/internal/handlers/features"
```

---

## SERVICE INITIALIZATION - Pattern Baru

### Domain-Based Services (dengan prefix)
```go
// ✅ BENAR - Gunakan prefix domain
authService := auth.NewAuthService(userRepo, jwtManager)
cartService := cart.NewCartService(cartRepo, addressRepo, productRepo)
orderService := order.NewOrderService(db, orderRepo, cartRepo, productRepo, promoCodeRepo, addressRepo)
productService := product.NewProductService(productRepo, categoryRepo)
searchService := features.NewSearchService(searchRepo, productRepo, categoryRepo)
chatService := features.NewChatService(chatRepo, userRepo)
newsletterService := features.NewNewsletterService(newsletterRepo)
discoveryService := features.NewDiscoveryService(productRepo, categoryRepo, cacheService)
```

### Shared Utility Services (tanpa subdirectory, tetap plain utils)
```go
// ✅ BENAR - Utils di root internal/
activityService := utils.NewActivityService(activityRepo)
exportService := utils.NewExportService(userRepo, orderRepo)
promoService := utils.NewPromoService(promoCodeRepo)
```

### Cache Service (khusus, di services/cache)
```go
// ✅ BENAR - Cache di dalam services/cache
cacheService := cache.NewCacheService()
```

---

## HANDLER INITIALIZATION - Pattern Baru

### Domain-Based Handlers (dengan prefix)
```go
// ✅ BENAR - Gunakan prefix domain
authHandler := auth.NewAuthHandler(authService)
productHandler := product.NewProductHandler(productService)
categoryHandler := category.NewCategoryHandler(productService)
cartHandler := cart.NewCartHandler(cartService)
orderHandler := order.NewOrderHandler(orderService)
searchHandler := features.NewSearchHandler(searchService)
chatHandler := features.NewChatHandler(chatService)
dashboardHandler := admin.NewDashboardHandler(dashboardService)
adminPromoHandler := admin.NewAdminPromoHandler(promoService)
adminActivityHandler := admin.NewAdminActivityHandler(activityService)
adminUserHandler := admin.NewAdminUserHandler(exportService)
discoveryHandler := product.NewDiscoveryHandler(discoveryService)
newsletterHandler := product.NewNewsletterHandler(newsletterService)
wishlistHandler := product.NewWishlistHandler(wishlistService)
```

---

## COMMON MISTAKES ❌

### ❌ SALAH - Tanpa prefix domain
```go
authHandler := NewAuthHandler(authService)  // Error: undefined NewAuthHandler
orderService := NewOrderService(...)        // Error: undefined NewOrderService
```

### ❌ SALAH - Import path yang tidak ada
```go
"ecommerce-backend/internal/handlers"   // Tidak ada root level lagi!
"ecommerce-backend/internal/services"   // Tidak ada root level lagi!
```

### ❌ SALAH - Salah domain prefix
```go
authService := admin.NewAuthService(...)  // Auth di package auth, bukan admin!
```

---

## STRUCTURE REFERENCE

```
backend/
├── internal/
│   ├── handlers/
│   │   ├── admin/        → package admin
│   │   ├── auth/         → package auth
│   │   ├── product/      → package product
│   │   ├── cart/         → package cart
│   │   ├── order/        → package order
│   │   ├── category/     → package category
│   │   └── features/     → package features
│   │
│   ├── services/
│   │   ├── admin/        → package admin
│   │   ├── auth/         → package auth
│   │   ├── product/      → package product
│   │   ├── cart/         → package cart
│   │   ├── order/        → package order
│   │   ├── email/        → package email
│   │   ├── payment/      → package payment
│   │   ├── cache/        → package cache
│   │   └── features/     → package features
│   │
│   ├── utils/            → package utils (FLAT, no subdirs)
│   ├── repositories/     → package repositories (FLAT)
│   ├── models/           → package models (FLAT)
│   └── middleware/       → package middleware (FLAT)
```

---

## COMPLETE INITIALIZATION ORDER

```go
// 1. Initialize Cache Service FIRST (used by other services)
cacheService := cache.NewCacheService()

// 2. Initialize Domain Services
authService := auth.NewAuthService(userRepo, jwtManager)
productService := product.NewProductService(productRepo, categoryRepo)
cartService := cart.NewCartService(cartRepo, addressRepo, productRepo)
orderService := order.NewOrderService(db, orderRepo, cartRepo, productRepo, promoCodeRepo, addressRepo)

// 3. Initialize Feature Services (may depend on cache or other services)
searchService := features.NewSearchService(searchRepo, productRepo, categoryRepo)
chatService := features.NewChatService(chatRepo, userRepo)
newsletterService := features.NewNewsletterService(newsletterRepo)
discoveryService := features.NewDiscoveryService(productRepo, categoryRepo, cacheService)
wishlistService := features.NewWishlistService(wishlistRepo)

// 4. Initialize Utility Services
activityService := utils.NewActivityService(activityRepo)
exportService := utils.NewExportService(userRepo, orderRepo)
promoService := utils.NewPromoService(promoCodeRepo)

// 5. Initialize Handlers
authHandler := auth.NewAuthHandler(authService)
productHandler := product.NewProductHandler(productService)
// ... rest of handlers
```
