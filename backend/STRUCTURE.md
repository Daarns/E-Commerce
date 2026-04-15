# Backend Folder Structure

## Overview
The backend follows Clean Architecture principles with clear separation of concerns.

## Directory Structure

```
backend/
├── cmd/
│   └── api/
│       └── main.go              # Application entry point, server setup
│
├── internal/                     # Private application code (not importable)
│   ├── config/                   # Configuration & environment setup
│   │   └── database.go           # DB connection pooling
│   │
│   ├── handlers/                 # HTTP Request Handlers (Delivery Layer)
│   │   ├── auth_handler.go       # Authentication endpoints
│   │   ├── product_handler.go    # Product endpoints
│   │   ├── cart_handler.go       # Shopping cart endpoints
│   │   ├── order_handler.go      # Order endpoints
│   │   └── category_handler.go   # Category endpoints
│   │
│   ├── middleware/               # Cross-cutting Concerns
│   │   ├── auth.go               # JWT validation middleware
│   │   └── ratelimit.go          # Rate limiting middleware
│   │
│   ├── models/                   # Domain Models (Entities)
│   │   ├── user.go               # User entity & related types
│   │   ├── product.go            # Product entity & related types
│   │   ├── cart.go               # Cart entity & related types
│   │   └── order.go              # Order entity & related types
│   │
│   ├── repositories/             # Data Access Layer (Database)
│   │   ├── user_repository.go    # User database operations
│   │   ├── product_repository.go # Product database operations
│   │   ├── cart_repository.go    # Cart database operations
│   │   ├── order_repository.go   # Order database operations
│   │   └── category_repository.go # Category database operations
│   │
│   └── services/                 # Business Logic Layer (Use Cases)
│       ├── auth_service.go       # Authentication business logic
│       ├── product_service.go    # Product business logic
│       ├── cart_service.go       # Cart business logic
│       └── order_service.go      # Order business logic
│
├── migrations/                   # SQL migration files
│   ├── 001_create_users_table.sql
│   ├── 002_create_products_table.sql
│   └── ...
│
├── pkg/                          # Reusable public packages
│   ├── logger/                   # Logging utilities
│   ├── validator/                # Input validation
│   └── utils/                    # Helper utilities
│
├── .env.example                  # Environment variables template
├── .env                          # Local environment (git-ignored)
├── go.mod                        # Go module definition
├── go.sum                        # Go module checksums
├── README.md                     # Backend documentation
└── STRUCTURE.md                  # This file
```

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

## Data Flow Example: Get Products

```
HTTP Request
    ↓
handlers/product_handler.go (GetProducts)
    ↓
services/product_service.go (GetProducts) ← calls
    ↓
repositories/product_repository.go (GetAll) ← database layer
    ↓
PostgreSQL Database
    ↓
[Reverse flow with data]
    ↓
HTTP Response (JSON)
```

## Naming Conventions

### Files
- **Handlers**: `{domain}_handler.go` (e.g., `product_handler.go`)
- **Services**: `{domain}_service.go` (e.g., `product_service.go`)
- **Repositories**: `{domain}_repository.go` (e.g., `product_repository.go`)
- **Models**: `{domain}.go` (e.g., `product.go`)
- **Middleware**: `{concern}.go` (e.g., `auth.go`, `ratelimit.go`)

### Functions
- **Handlers**: `(h *Handler) GetProducts(c *gin.Context)`
- **Services**: `(s *Service) GetProducts(ctx context.Context) ([]Product, error)`
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

## Adding New Feature (e.g., Wishlist)

1. **Create Model**: `models/wishlist.go`
2. **Create Repository**: `repositories/wishlist_repository.go`
3. **Create Service**: `services/wishlist_service.go`
4. **Create Handler**: `handlers/wishlist_handler.go`
5. **Update main.go**: Register routes in router

This ensures modularity and testability at each layer.
