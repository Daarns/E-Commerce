# Backend Architecture

## Overview

The backend implements **Clean Architecture** with **Domain-Driven Design (DDD)** organization, following industry best practices for maintainability, testability, and scalability.

## Architectural Layers

### 1. **Handlers Layer** (Delivery/API)
- HTTP request/response handling
- Input validation & sanitization
- Response formatting
- Route definitions
- **Location**: `internal/handlers/{domain}/`

### 2. **Services Layer** (Business Logic)
- Core business logic implementation
- Domain validation & rules enforcement
- Orchestration between repositories
- Transaction management
- **Location**: `internal/services/{domain}/`

### 3. **Repositories Layer** (Data Access)
- Database operations abstraction
- Query execution & optimization
- Data persistence operations
- Database-specific implementation details
- **Location**: `internal/repositories/`

### 4. **Models Layer** (Domain Entities)
- Domain entity structures
- Database model definitions (GORM)
- Type definitions for requests/responses
- Validation tags
- **Location**: `internal/models/`

### 5. **Middleware Layer** (Cross-Cutting Concerns)
- Authentication & authorization
- Rate limiting & throttling
- CORS handling
- Request logging
- **Location**: `internal/middleware/`

## Key Architectural Patterns

### Concurrency & Data Integrity

#### Optimistic Locking
- **Use case**: Low-contention scenarios (wishlist, reviews)
- **Implementation**: Version field with compare-and-swap
- **Benefits**: Better concurrency, lower database locks

#### Pessimistic Locking
- **Use case**: Critical operations (checkout, payments, stock)
- **Implementation**: Database row-level locks
- **Benefits**: Data consistency, prevents race conditions

### API Reliability

#### Rate Limiting
- **Redis-backed**: Per-user, per-IP rate limiting
- **Sliding window**: Prevents burst attacks
- **Public API**: Strict limits to protect service
- **Configuration**: Environment-based thresholds
- **Implementation**: `internal/middleware/ratelimit.go`

#### Idempotency
- Ensures duplicate requests produce safe results
- **Use case**: Checkout, payments, critical state changes
- **Implementation**: Idempotency keys in request headers
- **Database**: Unique constraints prevent duplicates

#### JWT Authentication
- Dual token strategy (Access + Refresh)
- **Access Token**: Short-lived (15 mins), for API requests
- **Refresh Token**: Long-lived (7 days), for token renewal
- **Storage**: Secure, environment-based secret keys
- **Revocation**: Refresh token blacklist via Redis

### Data & Performance

#### Self-Healing Slugs
- Automatic URL-friendly slug generation from product names
- Handles duplicates with numeric suffixes
- Regenerates on content changes
- SEO-friendly URL patterns

#### Redis Caching
- Product catalog caching
- Session management
- Rate limit tracking
- Extensible for distributed caching

#### Database Connection Pooling
- Connection reuse optimization
- Configurable pool size (default: 25)
- Prevents connection exhaustion
- Connection lifetime management

### Domain Logic

#### Search & Discovery
- PostgreSQL full-text search
- Product filtering (category, price, ratings)
- Search analytics & trending
- Popular searches aggregation

#### Order Management
- Multi-step workflow (pending → processing → shipped → delivered)
- Email notifications on status changes
- Webhook integration for payments (Midtrans)
- Order history with audit trail
- Email triggered flags & tracking

#### Authentication & Authorization
- RBAC (Role-Based Access Control)
- Roles: admin, customer, guest
- Permission-based endpoint protection
- User activity logging

#### Email System
- **Async processing**: Message queue with background workers
- **Templates**: Transactional emails (order, review, auth, notifications)
- **Retry logic**: Exponential backoff for failures
- **Throttling**: Rate-limited email delivery
- **Tracking**: Email delivery status tracking

## Dependency Injection Flow

```
main.go (Application Bootstrap)
    ↓
Database Connection Pool
    ↓
Repositories (depend on DB)
    ↓
Services (depend on Repositories)
    ↓
Handlers (depend on Services)
    ↓
Router Setup (depend on Handlers)
```

**Key principle**: Each layer only knows about layers below it, creating a unidirectional dependency graph.

## Data Flow Example

### Simple Flow: Get Products
```
HTTP Request (GET /api/v1/products)
    ↓
handlers/product/product_handler.go::GetProducts
    ↓
services/product/product_service.go::GetProducts
    ↓
repositories/product_repository.go::GetAll
    ↓
PostgreSQL Database
    ↓
[Data returned through layers]
    ↓
HTTP Response (200 OK, JSON)
```

### Complex Flow: Create Order
```
HTTP Request (POST /api/v1/orders)
    ↓
handlers/order/order_handler.go::CreateOrder
    ├─→ Validates JWT token (middleware)
    ├─→ Checks rate limit (middleware)
    ↓
services/order/order_service.go::CreateOrder
    ├─→ repositories/cart_repository.go (get cart items)
    ├─→ repositories/product_repository.go (check stock)
    ├─→ services/admin/promo_service.go (validate promo code)
    ├─→ repositories/order_repository.go (save order - with pessimistic lock)
    ├─→ repositories/cart_repository.go (clear cart)
    └─→ Queues email notification (async)
    ↓
HTTP Response (201 Created)
```

## Project Structure

```
backend/
├── cmd/api/
│   └── main.go                    # Application entry point
├── internal/
│   ├── handlers/                  # Domain-based organization
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── product/
│   │   ├── cart/
│   │   ├── order/
│   │   └── features/
│   ├── services/                  # Domain-based organization
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── product/
│   │   ├── cart/
│   │   ├── order/
│   │   └── features/
│   ├── repositories/              # Flat - shared data access
│   ├── models/                    # Flat - domain entities
│   ├── middleware/                # Flat - cross-cutting concerns
│   ├── config/                    # Configuration management
│   └── utils/                     # Flat - shared utilities
├── pkg/                           # Public reusable packages
│   ├── jwt/                       # JWT token management
│   ├── logger/                    # Logging utilities
│   ├── validator/                 # Input validation
│   └── utils/                     # Helper functions
├── migrations/                    # SQL migration files
├── tests/                         # Centralized test suite
└── go.mod
```

## Naming Conventions

| Component | Pattern | Example |
|-----------|---------|---------|
| Handlers | `{domain}_handler.go` | `product_handler.go` |
| Services | `{feature}_service.go` | `auth_service.go` |
| Repositories | `{domain}_repository.go` | `product_repository.go` |
| Models | `{domain}.go` | `product.go` |
| Middleware | `{concern}.go` | `auth.go` |
| Packages | Directory name | `handlers/admin/` → `package admin` |

## Error Handling

Structured error responses:
- Clear HTTP status codes
- Descriptive error messages
- Error logging with context
- Request ID tracing
- Validation error details

## Configuration Management

Environment-based configuration (`.env` file):
- Database connection strings
- JWT secrets (access & refresh)
- Rate limiting thresholds
- Email service credentials
- Cache settings
- Server port & host

## Testing Strategy

- **Unit tests**: Business logic in services
- **Integration tests**: Database operations in repositories
- **Handler tests**: API endpoints with mocked services
- **End-to-end tests**: Complete user flows

## Scaling Considerations

| Aspect | Strategy |
|--------|----------|
| **Horizontal Scaling** | Stateless design enables load balancing |
| **Concurrent Requests** | Goroutine efficiency handles thousands |
| **Database** | Connection pooling, query optimization, indexing |
| **Caching** | Redis for distributed cache layer |
| **Async Processing** | Message queue for email delivery |
| **Rate Limiting** | Per-user/IP limits prevent abuse |
