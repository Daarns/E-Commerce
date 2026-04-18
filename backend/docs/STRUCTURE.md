# Backend Folder Structure

## Overview
The backend follows Clean Architecture principles with clear separation of concerns.

## Directory Structure

```
backend/
├── cmd/
│   └── api/
│       └── main.go                          # Application entry point, server setup
│
├── internal/                                 # Private application code (not importable)
│   ├── handlers/                             # HTTP Request Handlers (Delivery Layer) - Domain-Based
│   │   ├── admin/                            # Admin domain handlers
│   │   │   ├── admin_activity_handler.go     # User activity tracking
│   │   │   ├── admin_user_handler.go         # User management
│   │   │   ├── admin_promo_handler.go        # Promo management
│   │   │   └── dashboard_handler.go          # Analytics & dashboard
│   │   ├── auth/                             # Authentication domain handlers
│   │   │   └── auth_handler.go               # Login, register, token refresh
│   │   ├── product/                          # Product domain handlers
│   │   │   ├── product_handler.go            # Product listing & details
│   │   │   ├── category_handler.go           # Category management
│   │   │   └── wishlist_handler.go           # Wishlist endpoints
│   │   ├── cart/                             # Cart domain handlers
│   │   │   └── cart_handler.go               # Cart operations
│   │   ├── order/                            # Order domain handlers
│   │   │   └── order_handler.go              # Order management
│   │   └── features/                         # Features domain handlers
│   │       ├── search_handler.go             # Search functionality
│   │       └── chat_handler.go               # Chat/messaging
│   │
│   ├── services/                             # Business Logic Layer (Use Cases) - Domain-Based
│   │   ├── admin/                            # Admin domain services
│   │   │   ├── promo_service.go              # Promo code logic
│   │   │   └── dashboard_service.go          # Analytics logic
│   │   ├── auth/                             # Auth domain services
│   │   │   └── auth_service.go               # Authentication logic
│   │   ├── product/                          # Product domain services
│   │   │   └── product_service.go            # Product business logic
│   │   ├── cart/                             # Cart domain services
│   │   │   └── cart_service.go               # Cart business logic
│   │   ├── order/                            # Order domain services
│   │   │   └── order_service.go              # Order business logic
│   │   ├── features/                         # Features domain services
│   │   │   ├── search_service.go             # Search logic
│   │   │   ├── chat_service.go               # Chat logic
│   │   │   ├── discovery_service.go          # Homepage discovery
│   │   │   ├── newsletter_service.go         # Newsletter logic
│   │   │   └── wishlist_service.go           # Wishlist logic
│   │   └── cache/                            # Cache service (shared)
│   │       └── cache_service.go              # Redis caching
│   │
│   ├── middleware/                           # Cross-cutting Concerns (Flat)
│   │   ├── auth.go                           # JWT validation middleware
│   │   ├── ratelimit.go                      # Rate limiting middleware
│   │   ├── cors.go                           # CORS configuration
│   │   └── logging.go                        # Request logging
│   │
│   ├── models/                               # Domain Models (Entities) - Flat
│   │   ├── user.go                           # User entity & related types
│   │   ├── product.go                        # Product entity & related types
│   │   ├── cart.go                           # Cart entity & related types
│   │   ├── order.go                          # Order entity & related types
│   │   ├── category.go                       # Category entity & related types
│   │   ├── promo.go                          # Promo code entity
│   │   └── ...
│   │
│   ├── repositories/                         # Data Access Layer (Database) - Flat
│   │   ├── user_repository.go                # User database operations
│   │   ├── product_repository.go             # Product database operations
│   │   ├── cart_repository.go                # Cart database operations
│   │   ├── order_repository.go               # Order database operations
│   │   ├── category_repository.go            # Category database operations
│   │   ├── promo_code_repository.go          # Promo code database ops
│   │   ├── search_repository.go              # Search database ops
│   │   ├── chat_repository.go                # Chat database ops
│   │   ├── activity_repository.go            # User activity database ops
│   │   └── ...
│   │
│   └── utils/                                # Shared Utilities (Flat)
│       ├── query_helpers.go                  # Cross-domain query helpers
│       ├── activity_service.go               # Activity tracking
│       ├── export_service.go                 # Data export logic
│       └── ...
│
├── tests/                                    # Centralized Test Suite
│   └── unit/                                 # Unit tests organized by layer
│       ├── handlers/
│       │   ├── admin/
│       │   │   └── admin_promo_handler_test.go
│       │   ├── auth/
│       │   ├── product/
│       │   └── ...
│       └── services/
│           ├── admin/
│           ├── auth/
│           ├── product/
│           └── ...
│
├── migrations/                               # SQL migration files
│   ├── 001_create_users_table.sql
│   ├── 002_create_products_table.sql
│   └── ...
│
├── pkg/                                      # Reusable public packages
│   ├── jwt/                                  # JWT token management
│   │   └── manager.go                        # JWT creation & validation
│   ├── logger/                               # Logging utilities
│   ├── validator/                            # Input validation
│   └── utils/                                # Helper utilities
│
├── .env.example                              # Environment variables template
├── .env                                      # Local environment (git-ignored)
├── go.mod                                    # Go module definition
├── go.sum                                    # Go module checksums
├── docker-compose.yml                        # Docker development environment
├── README.md                                 # Backend documentation
└── STRUCTURE.md                              # This file
```

## Architectural Approach: Domain-Based Organization

This backend follows **Clean Architecture** with a **Domain-Driven Design (DDD)** organization pattern:

### Key Principles:

1. **Domain-Based Handlers & Services**
   - Handlers and Services are organized by business domain (admin, auth, product, cart, order, features)
   - Each domain has its own subdirectory with self-contained logic
   - Example: `handlers/admin/`, `services/auth/`, `handlers/product/`
   - Improves code organization, scalability, and team parallel development

2. **Flat Repositories, Models, Middleware, Utils**
   - **Repositories**: Shared data access layer (no subdirectories)
   - **Models**: Shared domain entities (no subdirectories)
   - **Middleware**: Shared cross-cutting concerns
   - **Utils**: Shared utilities and services

3. **Centralized Tests**
   - Tests organized in `tests/unit/` mirroring the source structure
   - Located separately from source code for cleaner organization
   - Test files use same package names as their source (e.g., test for `handlers/admin/` uses `package admin`)

## Layer Responsibilities

### 1. **Handlers** (Delivery Layer)
- **Responsibility**: Handle HTTP requests/responses
- **Scope**: Input validation, error handling, response formatting
- **NOT**: Business logic, database queries, caching decisions
- **Example**: `handlers/product_handler.go` - parses request, calls service, returns JSON

### 2. **Services** (Business Logic Layer / Use Cases)
- **Responsibility**: Core business logic implementation
- **Scope**: Validation, orchestration, transactions, caching
- **NOT**: Direct database calls, HTTP details, external API calls
- **Example**: `services/cart_service.go` - implements cart manipulation logic

### 3. **Repositories** (Data Access Layer)
- **Responsibility**: Database operations
- **Scope**: CRUD operations, query optimization, data mapping
- **NOT**: Business logic, HTTP handling, caching logic
- **Example**: `repositories/product_repository.go` - product table operations

### 4. **Models** (Entity Layer)
- **Responsibility**: Domain entities and types
- **Scope**: Struct definitions, type constants, validation tags
- **NOT**: Business logic, database operations, HTTP concerns
- **Example**: `models/product.go` - Product struct with fields

### 5. **Middleware**
- **Responsibility**: Cross-cutting concerns
- **Scope**: Authentication, authorization, rate limiting, logging
- **Example**: `middleware/auth.go` - JWT token validation

## Data Flow Example: Get Products (Domain-Based)

```
HTTP Request
    ↓
handlers/product/product_handler.go (GetProducts)
    ↓
services/product/product_service.go (GetProducts) ← calls
    ↓
repositories/product_repository.go (GetAll) ← database layer
    ↓
PostgreSQL Database
    ↓
[Reverse flow with data]
    ↓
HTTP Response (JSON)
```

**Cross-Domain Example: Create Order with Promo Code**

```
HTTP Request → order_handler.go
    ↓
order_service.go:
  ├─→ cart_service.go (validate cart items)
  ├─→ promo_service.go (validate promo code)
  ├─→ orderRepository (save order)
  └─→ cartRepository (clear cart)
    ↓
HTTP Response (Order confirmation)
```

## Naming Conventions

### Files
- **Handlers**: `{feature}_handler.go` (e.g., `product_handler.go`, `admin_promo_handler.go`)
- **Services**: `{feature}_service.go` (e.g., `auth_service.go`, `order_service.go`)
- **Repositories**: `{domain}_repository.go` (e.g., `product_repository.go`)
- **Models**: `{domain}.go` (e.g., `product.go`, `order.go`)
- **Middleware**: `{concern}.go` (e.g., `auth.go`, `ratelimit.go`)

### Package Names
- **Handler packages**: Directory name (e.g., `handlers/admin/` → `package admin`)
- **Service packages**: Directory name (e.g., `services/auth/` → `package auth`)
- **Repository packages**: `package repositories` (flat)
- **Model packages**: `package models` (flat)
- **Utils packages**: `package utils` (flat)

### Import Patterns (Domain-Based)
- **Handlers**: `import adminHandler "ecommerce-backend/internal/handlers/admin"`
- **Services**: `import authService "ecommerce-backend/internal/services/auth"`
- **Cross-domain references**: Use qualified names
  - Example: `admin.NewAdminPromoHandler()` for handler in admin package
  - Example: `auth.NewAuthService()` for service in auth package

### Functions
- **Handlers**: `(h *Handler) GetProducts(c *gin.Context)` (lowercase private)
- **Services**: `(s *Service) GetProducts(ctx context.Context) ([]Product, error)`
- **Public constructors**: `NewAdminPromoHandler()` (Capitalized)
- **Repositories**: `(r *Repository) GetAll(ctx context.Context) ([]Product, error)`

## Dependency Injection Flow

```
main.go
  ↓
Database connection
  ↓
Repositories ← receives DB connection
  ↓
Services ← receives Repositories
  ↓
Handlers ← receives Services
  ↓
Router ← receives Handlers
```

## Adding New Feature (e.g., Wishlist Domain)

### Approach 1: New Domain (For Large Features)
If the feature is substantial and self-contained:

1. **Create Model**: `models/wishlist.go`
2. **Create Repository**: `repositories/wishlist_repository.go`
3. **Create Service Package**: `services/wishlist/wishlist_service.go`
4. **Create Handler Package**: `handlers/wishlist/wishlist_handler.go`
5. **Update main.go**: Import and wire the handler
   ```go
   wishlistSvc := wishlistService.NewWishlistService(wishlistRepo, productRepo)
   wishlistH := wishlistHandler.NewWishlistHandler(wishlistSvc)
   ```

### Approach 2: Extend Existing Domain (For Small Features)
If the feature belongs to an existing domain:

1. Add to **existing Model**: `models/product.go` (add wishlist fields)
2. Add to **existing Repository**: `repositories/product_repository.go` (add wishlist methods)
3. Add to **existing Service**: `services/product/product_service.go` (add wishlist logic)
4. Add to **existing Handler**: `handlers/product/product_handler.go` (add wishlist endpoints)

### Approach 3: Cross-Domain Utilities
For shared logic accessed by multiple domains:

1. Create utility in `internal/utils/` (flat)
2. Export as public function (Capitalized)
3. Import across domains: `import "ecommerce-backend/internal/utils"`

This ensures modularity, testability, and team scalability.
