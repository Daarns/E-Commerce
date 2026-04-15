# E-Commerce Architecture

This document describes the system architecture and folder structure of the E-Commerce application.

## Table of Contents

- [Backend Architecture](#backend-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Project Structure](#project-structure)
- [Data Flow](#data-flow)
- [Design Patterns](#design-patterns)

---

## Backend Architecture

### Clean Architecture Layers

The backend follows Clean Architecture with clear separation of concerns:

```
┌─────────────────────────────────────┐
│         HTTP Handlers               │ ← Delivery Layer
│   (Request/Response handling)       │
├─────────────────────────────────────┤
│         Services/Usecases           │ ← Business Logic Layer
│   (Core business rules)             │
├─────────────────────────────────────┤
│         Repositories                │ ← Data Access Layer
│   (Database operations)             │
├─────────────────────────────────────┤
│         Models/Entities             │ ← Entity Layer
│   (Domain data structures)          │
├─────────────────────────────────────┤
│         Middleware                  │ ← Cross-cutting Concerns
│   (Auth, rate limit, logging)       │
└─────────────────────────────────────┘
```

### Layer Responsibilities

**Handlers** (HTTP Controllers)
- Parse incoming requests
- Validate input
- Call appropriate service
- Format HTTP responses
- Handle error codes

**Services** (Business Logic)
- Implement core business rules
- Validate business logic
- Orchestrate operations
- Handle transactions
- Manage caching decisions

**Repositories** (Data Access)
- Execute database queries
- Map database records to entities
- Handle database transactions
- Optimize queries
- Manage database connections

**Models** (Entities)
- Define domain entities
- Database table structures
- Type definitions
- Validation rules
- Constants

**Middleware**
- Authentication (JWT validation)
- Authorization (RBAC)
- Rate limiting
- Logging
- Error handling

---

## Frontend Architecture

### App Router Structure

The frontend uses Next.js 14+ App Router with Route Groups:

```
app/
├── (auth)/                    # Authentication routes
│   ├── login/page.tsx
│   └── register/page.tsx
├── (shop)/                    # Main shopping experience
│   ├── products/page.tsx
│   ├── products/[slug]/page.tsx
│   ├── cart/page.tsx
│   ├── checkout/page.tsx
│   ├── orders/page.tsx
│   └── profile/page.tsx
└── page.tsx                   # Homepage
```

### Component Architecture

**UI Components** (`components/ui/`)
- Reusable shadcn/ui components
- Button, Card, Badge, Select, etc
- No business logic
- Pure presentational

**Layout Components** (`components/layout/`)
- Header/Navigation
- Footer
- Hero sections
- Common layouts

**Feature Components** (`components/`)
- ProductCard
- ProductGrid
- VariantSelector
- Domain-specific components

### State Management

**Zustand Stores** (`stores/`)
- Lightweight, simple state management
- Auth store (user, token, session)
- Cart store (items, total, checkout)

**Server State** (React Query/SWR)
- Data fetching and caching
- Automatic refetching
- Optimistic updates

### Custom Hooks

**useAuth** - Authentication state and operations  
**useCart** - Shopping cart management  
**useDebounce** - Debounced values for search  
**useForm** - Form validation and handling  

---

## Project Structure

### Backend

```
backend/
├── cmd/
│   ├── api/main.go              # Server entry point
│   └── migrate/main.go           # Database migrations
├── internal/
│   ├── handlers/                # HTTP handlers
│   │   ├── auth_handler.go
│   │   ├── product_handler.go
│   │   ├── cart_handler.go
│   │   ├── order_handler.go
│   │   └── category_handler.go
│   ├── services/                # Business logic
│   │   ├── auth_service.go
│   │   ├── product_service.go
│   │   ├── cart_service.go
│   │   └── order_service.go
│   ├── repositories/            # Data access
│   │   ├── user_repository.go
│   │   ├── product_repository.go
│   │   ├── cart_repository.go
│   │   ├── order_repository.go
│   │   └── category_repository.go
│   ├── models/                  # Domain entities
│   │   ├── user.go
│   │   ├── product.go
│   │   ├── cart.go
│   │   └── order.go
│   └── middleware/              # Cross-cutting concerns
│       ├── auth.go
│       └── ratelimit.go
├── pkg/                         # Shared utilities
│   ├── jwt/jwt.go
│   ├── password/password.go
│   └── response/response.go
└── migrations/                  # Database schemas
```

### Frontend

```
frontend/
├── app/                         # Next.js App Router
│   ├── (auth)/
│   ├── (shop)/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                      # Reusable UI components
│   ├── layout/                  # Layout components
│   └── product/                 # Feature components
├── hooks/                       # Custom React hooks
├── stores/                      # Zustand state stores
├── services/                    # API integration
├── lib/                         # Utilities
├── types/                       # TypeScript types
└── public/                      # Static assets
```

---

## Data Flow

### User Registration Flow

```
Frontend (Register Form)
    ↓
POST /api/v1/auth/register
    ↓
auth_handler.RegisterHandler
    ↓
auth_service.Register (validation)
    ↓
user_repository.Create (DB)
    ↓
Return JWT token + user data
    ↓
Frontend stores token in Zustand + localStorage
```

### Product Listing Flow

```
Frontend (Products Page)
    ↓
GET /api/v1/products?category=...&sort=...
    ↓
product_handler.GetProducts
    ↓
product_service.GetProducts (validation, caching)
    ↓
product_repository.GetAll (query optimization)
    ↓
PostgreSQL Database
    ↓
Return products JSON
    ↓
Frontend renders ProductGrid
```

### Add to Cart Flow

```
Frontend (ProductCard)
    ↓ (User clicks "Add to Cart")
cart_service.addToCart(product)
    ↓
POST /api/v1/cart/items
    ↓
cart_handler.AddToCart
    ↓
cart_service.AddItem (validation, stock check)
    ↓
cart_repository.AddItem (DB)
    ↓
Zustand cart store updates
    ↓
UI re-renders with updated cart
```

---

## Design Patterns

### Implemented Patterns

**1. Clean Architecture**
- Clear separation of concerns
- Independent layers
- Testable components

**2. Repository Pattern**
- Abstract data access
- Database agnostic
- Easy to mock for testing

**3. Service Locator**
- Dependency injection
- Loose coupling
- Configuration at startup

**4. JWT Authentication**
- Stateless authentication
- Access + Refresh tokens
- RBAC support

**5. Rate Limiting**
- Per IP rate limiting
- Token bucket algorithm
- Redis-based

**6. Optimistic Updates**
- Update UI before confirmation
- Rollback on error
- Better UX

**7. Self-Healing Slugs**
- Auto-generate from product name
- Conflict resolution
- SEO-friendly URLs

**8. Pessimistic Locking**
- Lock resources during critical operations
- Prevent race conditions
- Stock management

---

## Technology Stack

### Backend
- **Language**: Go 1.22+
- **Framework**: Gin 1.x
- **Database**: PostgreSQL 16
- **ORM**: GORM
- **Cache**: Redis 7
- **Auth**: JWT

### Frontend
- **Framework**: Next.js 14+
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Library**: shadcn/ui
- **State**: Zustand
- **HTTP**: Axios
- **Animations**: Framer Motion, Anime.js

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database GUI**: pgAdmin
- **API Testing**: VS Code REST Client

---

## Performance Considerations

### Backend
- Database connection pooling
- Query optimization with indexes
- Caching frequently accessed data
- Rate limiting to prevent abuse
- Lazy loading relationships

### Frontend
- Server-side rendering (SSR)
- Static generation (ISR)
- Image optimization
- Code splitting
- Lazy loading components

---

## Security Measures

### Backend
- Input validation on all endpoints
- SQL injection prevention (parameterized queries)
- XSS protection (output encoding)
- CSRF protection (SameSite cookies)
- Rate limiting
- JWT token expiration
- Password hashing (bcrypt)

### Frontend
- HTTPS enforcement
- Secure cookie flags
- CORS configuration
- Content Security Policy
- Regular dependency updates

---

## See Also

- [API Documentation](./API.md) - Detailed endpoint specifications
- [Deployment Guide](./DEPLOYMENT.md) - Production setup instructions
- [Database Schema](./DATABASE.md) - Database structure and relationships

---

**Last Updated**: April 2026  
For more details, see the main [README.md](../README.md)
