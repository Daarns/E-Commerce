# E-Commerce Portfolio - Full Stack Application

Production-ready E-Commerce platform showcasing best practices in software architecture, scalability, and modern development patterns.

## 🚀 Tech Stack

### Backend
- **Language**: Go (Golang) 1.22+
- **Framework**: Gin
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Architecture**: Clean Architecture (Simplified)

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database GUI**: pgAdmin
- **API Testing**: REST Client (VS Code)

## 📋 Features

### Core Features
- [x] Clean Architecture implementation
- [x] Rate limiting & throttling
- [x] JWT authentication with dual secrets (AccessToken + RefreshToken, environment-based, 12+ tests)
- [x] Role-based access control (RBAC)
- [x] Product catalog with search
- [x] Shopping cart (guest & authenticated)
- [x] Order management & checkout
- [x] Admin dashboard with CRUD operations
- [x] Payment integration (Midtrans Sandbox - webhook working)
- [x] Product reviews & ratings (Phase 9J)
- [x] Wishlist/Favorites (Phase 9K)
- [x] Full-text search improvements (Phase 9L)
- [x] Live chat integration (Phase 9M)
- [ ] Frontend development

### Advanced Patterns
- [x] Pessimistic & optimistic locking
- [x] Idempotency for critical operations
- [x] Self-healing slug generation
- [x] Database connection pooling
- [x] Full-text search (PostgreSQL) - Phase 9L
- [x] Message queue for async processing (Email Queue System)
- [ ] Real-time notifications
- [x] Caching strategy (Redis-compatible, currently in-memory implementation)
- [x] Email notification system (SMTP, templates, multiple types)
- [x] Async email processing with retry logic & background workers

### Quality & Testing
- [ ] Unit tests (>80% coverage)
- [ ] Integration tests
- [ ] E2E tests (Playwright)
- [ ] Load testing (K6)
- [ ] API documentation (Swagger)

## 🛠️ Prerequisites

- **Go**: 1.22 or higher ([Download](https://go.dev/dl/))
- **Node.js**: 18+ ([Download](https://nodejs.org/))
- **Docker Desktop**: Latest version ([Download](https://www.docker.com/products/docker-desktop/))
- **Git**: Latest version

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd E-Commerce
```

### 2. Start Infrastructure (Docker)

```bash
# Start PostgreSQL, Redis, and pgAdmin
docker-compose up -d

# Check if containers are running
docker-compose ps

# View logs
docker-compose logs -f
```

**Access Points:**
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- pgAdmin: `http://localhost:5050`
  - Email: `admin@admin.com`
  - Password: `admin`

### 3. Setup Backend

```bash
cd backend

# Install dependencies
go mod download

# Copy environment file
copy .env.example .env

# Run migrations
go run cmd/migrate/main.go up

# Start development server
go run cmd/api/main.go
```

Backend will run on: `http://localhost:8080`

### 4. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
copy .env.example .env.local

# Start development server
npm run dev
```

Frontend will run on: `http://localhost:3000`

## 📁 Project Structure

```
E-Commerce/
├── backend/                 # Go backend application
│   ├── cmd/                # Application entry points
│   │   ├── api/           # Main API server
│   │   └── migrate/       # Database migrations
│   ├── internal/          # Private application code
│   │   ├── models/        # Domain entities & data structures
│   │   ├── services/      # Business logic layer
│   │   ├── handlers/      # HTTP controllers
│   │   ├── repositories/  # Data access layer
│   │   └── middleware/    # Auth, rate limit, etc.
│   ├── pkg/               # Shared utilities
│   │   ├── jwt/          # JWT token management
│   │   ├── password/     # Password hashing
│   │   └── response/     # HTTP response helpers
│   └── migrations/        # SQL migration files
├── frontend/              # Next.js frontend
│   ├── app/              # App Router pages
│   ├── components/       # React components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities & API client
│   └── types/           # TypeScript types
├── docker/               # Docker configurations
│   ├── postgres/        # PostgreSQL init scripts
│   └── redis/           # Redis configs
├── docs/                 # Documentation
├── scripts/             # Utility scripts
└── docker-compose.yml   # Docker orchestration
```

## 🧪 Testing

### Backend Tests
```bash
cd backend

# Run all tests
go test ./...

# Run with coverage
go test -cover ./...

# Run specific package
go test ./internal/services/...
```

### Frontend Tests
```bash
cd frontend

# Run unit tests
npm test

# Run E2E tests
npm run test:e2e
```

## 📚 Documentation

Complete project documentation is available in the `/docs` folder:

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System design, layer architecture, design patterns |
| [API.md](./docs/API.md) | Complete API endpoint documentation with examples |
| [DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Setup, deployment, and troubleshooting guide |

### Quick API Reference

**Authentication**
```bash
POST /api/v1/auth/register      # Register new user
POST /api/v1/auth/login         # Login user
POST /api/v1/auth/refresh       # Refresh access token
GET  /api/v1/auth/me            # Get current user (protected)
```

**Products**
```bash
GET  /api/v1/products           # List products with filters
GET  /api/v1/products/:id       # Get product detail
GET  /api/v1/products/featured  # Get featured products
GET  /api/v1/categories         # List categories
```

**Shopping Cart & Orders**
```bash
GET  /api/v1/cart               # Get user cart (protected)
POST /api/v1/cart/items         # Add to cart (protected)
PUT  /api/v1/cart/items/:id     # Update cart item (protected)
POST /api/v1/checkout           # Create order (protected)
GET  /api/v1/orders             # Get user orders (protected)
```

For complete API documentation, see [docs/API.md](./docs/API.md)

## 🔐 Environment Variables

Environment configuration details are in [DEPLOYMENT.md](./docs/DEPLOYMENT.md).

### Backend (.env)
Copy `.env.example` and configure:
- `PORT` - Server port (default: 8080)
- `DB_*` - PostgreSQL connection settings
- `REDIS_*` - Redis connection settings
- `JWT_ACCESS_SECRET` - Secret key for access tokens (min 32 chars, generate with: openssl rand -base64 32)
- `JWT_REFRESH_SECRET` - Secret key for refresh tokens (min 32 chars, generate with: openssl rand -base64 32)
- `JWT_EXPIRY` - Access token expiry (default: 15m)
- `REFRESH_TOKEN_EXPIRY` - Refresh token expiry (default: 168h)

### Frontend (.env.local)
Copy `.env.example` and configure:
- `NEXT_PUBLIC_API_URL` - Backend API URL

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [service-name]

# Rebuild services
docker-compose up -d --build

# Remove volumes (⚠️ deletes data)
docker-compose down -v
```

## 🎯 Development Workflow

### Git Branching Strategy
This project follows GitHub Flow for clean, maintainable code:

```
main (production-ready)
├── develop (integration branch)
├── feature/* (new features)
├── bugfix/* (bug fixes)
└── hotfix/* (critical production fixes)
```

**Workflow:**
1. Create feature branch from `develop`: `git checkout -b feature/feature-name`
2. Make commits frequently with clear messages
3. Push and create Pull Request for review
4. Merge to `develop` after review
5. Periodically merge `develop` → `main` for releases

### Development Tools
- **Copilot CLI**: Used for code scaffolding, architecture planning, and development assistance
- **VS Code**: Primary IDE with REST Client extension for API testing
- **Docker**: Local development environment management
- **Git**: Version control with clean commit history

**Local Development:**
1. Start Docker services: `docker-compose up -d`
2. Run backend: `cd backend && go run cmd/api/main.go`
3. Run frontend: `cd frontend && npm run dev`
4. Test APIs using VS Code REST Client (`.http` files)

## 📊 Project Progress

### ✅ Completed Phases

**Phase 1 & 2: Foundation & Backend Setup**
- [x] Monorepo structure (frontend + backend)
- [x] Go backend with Gin framework
- [x] PostgreSQL database with migrations
- [x] Docker Compose setup for local development
- [x] Clean Architecture implementation

**Phase 3: Authentication System**
- [x] User model and database schema
- [x] JWT authentication (access + refresh tokens with configurable expiry)
- [x] User registration and login endpoints
- [x] Password hashing with bcrypt
- [x] Auth middleware for protected routes
- [x] Environment-based JWT configuration (JWT_SECRET, JWT_EXPIRY, REFRESH_TOKEN_EXPIRY)
- [x] Comprehensive unit tests for token generation, validation, and expiry (10+ tests)

**Phase 4: Product & Cart Features**
- [x] Product CRUD operations
- [x] Category management
- [x] Product search with filters
- [x] Shopping cart (session-based)
- [x] Self-healing slug generation
- [x] Optimistic & pessimistic locking for stock

**Phase 5: Frontend Setup**
- [x] Next.js 14 with App Router
- [x] TypeScript strict mode
- [x] shadcn/ui component library setup
- [x] Tailwind CSS configuration
- [x] Custom hooks (useAuth, useCart, etc)
- [x] Zustand store for state management

**Phase 6: Frontend Pages (In Progress)**
- [x] Homepage with hero section, categories, featured products
- [x] Products listing page with filters & search
- [x] Product detail page
- [x] Shopping cart page
- [x] Checkout page (multi-step)
- [x] Order history page
- [x] User profile page
- [x] Authentication pages (login, register)
- [x] Navigation & layouts

**Phase 7: UI/UX Fixes (Completed)**
- [x] Filter dropdown showing readable labels
- [x] Removed AI-template style elements (Sparkles icon, generic features section)
- [x] Fixed product card hover animations
- [x] Database query fixes (is_active → status, stock → stock_quantity)
- [x] CORS header configuration

**Phase 8: Backend Cleanup (Completed)**
- [x] Removed duplicate folders (delivery, domain, repository, usecase)
- [x] Cleaned up orphaned files
- [x] Verified clean architecture structure
- [x] Build verification completed

**Phase 9: Payment & Notification Foundation (Completed)**
- [x] Homepage Discovery APIs (featured, bestsellers, new arrivals, categories)
  - GET /api/v1/discovery/featured, /bestsellers, /new-arrivals, /categories
  - Redis caching (5-minute TTL) for performance
  - Pagination & filtering support
  - Comprehensive unit tests (10+ tests)
- [x] Product Image Upload & Optimization
  - POST /api/v1/admin/products/:id/images (image upload handler)
  - File validation (JPG/PNG/WebP, max 5MB)
  - Automatic resizing (multiple sizes: 800x600, 400x300, 200x150)
  - Image reordering (PUT /api/v1/admin/products/:id/images/reorder)
  - Comprehensive tests (10+ tests)
- [x] Admin Promo Code System
  - POST/GET/PUT/DELETE /api/v1/admin/promo-codes (CRUD operations)
  - Promo code validation (format, date ranges, discount types)
  - Discount calculation (percentage or fixed amount)
  - Role-based access control (admin only)
  - Comprehensive tests (13+ tests)
- [x] Payment Webhook Integration - Midtrans
  - POST /api/v1/webhooks/payment (webhook endpoint)
  - SHA512 signature verification
  - Payment status mapping (settlement, capture, deny, cancel, expire)
  - Automatic order status updates (pending → payment_confirmed)
  - Idempotency checking (prevent duplicate processing)
  - Configuration from environment variables
  - Comprehensive tests (27+ tests)
- [x] Newsletter Subscription System
  - POST /api/v1/newsletters/subscribe (subscription)
  - POST /api/v1/newsletters/confirm/:token (confirmation)
  - POST /api/v1/newsletters/unsubscribe (unsubscribe)
  - GET /api/v1/newsletters/status/:email (status check)
  - Double-opt-in with 24-hour token expiry
  - Email validation (RFC 5322 + domain checks)
  - Soft delete support for compliance
  - Database migration with proper indexes
  - Comprehensive tests (20+ tests)
- [x] Dual JWT Secrets for Enhanced Security
  - Separate JWT_ACCESS_SECRET and JWT_REFRESH_SECRET
  - Access token lifetime: 15 minutes
  - Refresh token lifetime: 7 days (now JWT-based)
  - Independent secret rotation capability
  - Comprehensive tests (12+ tests)

**Phase 9F: Email Notification Service (Completed)**
- [x] SMTP configuration (environment-based)
- [x] Email service with multiple template types
  - Order confirmation emails (with order details)
  - Payment confirmation emails (with payment receipt)
  - Order status update emails (with status tracking)
  - Password reset emails (with expiry info)
  - Email verification emails (with confirmation link)
- [x] HTML email templates with professional styling
- [x] Development mode (skip SMTP if not configured for testing)
- [x] Template data binding and rendering
- [x] Email recipient management
- [x] Comprehensive tests (16+ tests covering all scenarios)

**Phase 9G: Email Queue System (Completed)**
- [x] Email queue model with status tracking (pending, sent, failed)
- [x] Retry logic with exponential backoff (5min → 15min → 30min → 1hr → 2hr → 4hr)
- [x] Background worker pool pattern with configurable workers
- [x] Database persistence for queue reliability
- [x] Email queue repository with CRUD operations
- [x] Email queue service with async processing
- [x] Email type support (all templates: order_confirmation, payment_confirmation, etc)
- [x] Configurable worker polling intervals (default 30s)
- [x] Statistics & monitoring endpoints
- [x] Comprehensive tests (20+ tests covering queue operations, retry logic, workers)
- [x] Database migrations with proper indexes and auto-update triggers
- [x] Integration with email service for actual sending

### 🚧 In Progress / Pending

**Phase 9: Backend Implementation (Advanced Features)**

**Phase 9H: Order Status Workflow & Newsletter Preferences (Completed)**
- [x] Order Status Workflow Automation
  - Order status transitions: pending → payment_confirmed → processing → shipped → delivered
  - Email auto-queuing on status change (5 email types)
  - Valid transition enforcement (prevent invalid workflows)
  - OrderStatusWorkflow model with email trigger tracking
  - Repository with CRUD + statistics
  - 20+ comprehensive tests
  - Service layer complete, handlers integration pending

- [x] Newsletter Category Preferences (Progressive Opt-in)
  - Category preference storage (JSONB)
  - Notification frequency control (daily/weekly/monthly/never)
  - User preferences settings endpoints (ready for handlers)
  - Service methods for preference-based filtering
  - 15+ comprehensive tests
  - Preference timestamp tracking
  - Handlers integration pending

**Phase 9I: Admin Dashboard Endpoints & Analytics (Completed)**
- [x] Analytics Models (12 models)
  - RevenueMetrics: Total, average, min/max revenue by period
  - OrderAnalytics: Status breakdown, top products, payment methods
  - CustomerAnalytics: Segments (new/regular/vip), lifetime value
  - DashboardSummary: Overview combining all metrics
  - ProductPerformance: Sales, revenue, ratings, stock status per product
  - UserActivitySummary: User-level analytics and account management
  - SalesReport: Period-based growth metrics
  - RevenueTrend: Date-based revenue tracking

- [x] Dashboard Service (8 methods)
  - `GetRevenueMetrics(startDate, endDate)` - Revenue aggregation
  - `GetOrderAnalytics()` - Order status distribution & top products
  - `GetCustomerAnalytics()` - Segmentation & LTV calculation
  - `GetDashboardSummary()` - Complete overview
  - `GetMonthlyRevenueTrend(months)` - Historical revenue trends
  - `GetProductPerformance(limit, offset)` - Product rankings
  - `GetUserActivityList(limit, offset)` - User details & management
  - `DisableUserAccount(userID)` / `EnableUserAccount(userID)` - Account status control

- [x] Dashboard Handler (11 endpoints)
  - GET `/api/v1/admin/dashboard/summary` - Complete dashboard view
  - GET `/api/v1/admin/analytics/revenue` - Revenue metrics (date filtering)
  - GET `/api/v1/admin/analytics/orders` - Order statistics
  - GET `/api/v1/admin/analytics/customers` - Customer insights
  - GET `/api/v1/admin/analytics/revenue-trends` - Monthly trends
  - GET `/api/v1/admin/analytics/products` - Product performance
  - GET `/api/v1/admin/users/activity` - User activity list
  - POST `/api/v1/admin/users/:id/disable` - Disable user account
  - POST `/api/v1/admin/users/:id/enable` - Enable user account
  - Parameter validation (date formats, pagination, limits)
  - Proper error responses (400/500)

- [x] Tests (20+ tests)
  - Analytics model creation & validation
  - Service initialization
  - Handler route registration
  - Parameter validation (invalid dates, out-of-range months, invalid UUIDs)
  - All tests passing ✅

**Phase 9J: Product Reviews & Rating System (Completed)**
- [x] Core Features (6 Points)
  1. **Rating System**: 1-5 stars with optional text review
  2. **Verified Purchase**: Only users with completed order for product can review
  3. **Auto-Approved**: Reviews visible immediately
  4. **Helpful Voting**: Users vote helpful/not helpful on reviews
  5. **Reviewer Display**: Shows reviewer name and timestamp
  6. **Sorting Options**: By helpful count, recency, highest/lowest rating

- [x] Database Schema
  - `product_reviews` table: id, product_id, user_id, order_id, rating, title, review_text, helpful_count, unhelpful_count
  - `review_helpful_votes` table: id, review_id, user_id, is_helpful
  - Unique constraints: one review per user per product, one vote per user per review
  - 7 indexes for performance optimization
  - Product model enhanced with avg_rating and review_count fields

- [x] Models
  - ProductReview: Full review data structure
  - ReviewHelpfulVote: Vote tracking
  - ReviewStatistics: Aggregate stats (avg_rating, total_reviews, rating_breakdown)
  - Request/Response DTOs: CreateReviewRequest, UpdateReviewRequest, VoteHelpfulRequest, ProductReviewResponse, ReviewListResponse

- [x] Repository Layer
  - CRUD operations for reviews and votes
  - GetUserOrderForProduct: Verified purchase validation
  - CalculateProductStats: Aggregate rating calculations
  - GetRatingBreakdown: Rating distribution
  - Vote management: Create, update, delete, increment/decrement counts

- [x] Service Layer
  - CreateReview: With verified purchase validation
  - GetReview: Single review retrieval
  - GetProductReviews: Paginated with sorting (recent, helpful, highest/lowest rating)
  - UpdateReview: Ownership verification
  - DeleteReview: Ownership verification  
  - VoteHelpful: Vote management with update/delete logic
  - GetProductReviewStats: Statistics aggregation
  - updateProductRating: Auto-update product avg_rating

- [x] HTTP Handler (6 endpoints)
  - POST `/api/v1/products/:productID/reviews` - Create review
  - GET `/api/v1/products/:productID/reviews` - List reviews (with pagination & sorting)
  - PUT `/api/v1/products/:productID/reviews/:reviewID` - Update review
  - DELETE `/api/v1/products/:productID/reviews/:reviewID` - Delete review
  - POST `/api/v1/reviews/:reviewID/helpful` - Vote on helpfulness
  - GET `/api/v1/products/:productID/review-stats` - Get rating statistics

- [x] Tests (20+ tests)
  - Model tests: ProductReview, ReviewHelpfulVote, ReviewStatistics
  - Request validation tests: All CRUD requests
  - Sorting tests: All 4 sort options
  - Edge cases: Rating boundaries, timestamps, unique constraints, title length
  - All tests passing ✅

**Phase 9K: Wishlist/Favorites Feature (Completed)**
- [x] Core Features
  1. **Add/Remove Product**: Save products to wishlist
  2. **View Wishlist**: Paginated list with product details
  3. **Check Availability**: Quick status check for single product
  4. **Count Items**: Get total count of wishlist items
  5. **Clear Wishlist**: Remove all items at once
  6. **Unique Constraint**: One entry per user per product

- [x] Database Schema
  - `wishlists` table: id, user_id, product_id, created_at
  - Unique constraint: UNIQUE(user_id, product_id)
  - 3 indexes for performance (user_id, user_id+created_at, product_id)
  - Cascading deletes on user/product deletion

- [x] Models
  - Wishlist: Core model with timestamps
  - WishlistResponse: API response with product details
  - WishlistListResponse: Paginated results with total/page info
  - CheckWishlistResponse: Quick status check response
  - WishlistCountResponse: Count response

- [x] Repository Layer (10 methods)
  - Add: Insert wishlist entry
  - Remove: Delete wishlist entry
  - GetByUserAndProduct: Check if product in wishlist
  - GetByUserID: Paginated retrieval with sorting
  - CountByUserID: Get total items in wishlist
  - ClearByUserID: Remove all items
  - GetProductIDsByUserID: Get IDs for batch operations
  - DeleteByID: Direct deletion by wishlist ID
  - GetByID: Single item retrieval
  - IsProductInWishlist: Boolean existence check

- [x] Service Layer (6 methods)
  - AddToWishlist: With product existence check & duplicate prevention
  - RemoveFromWishlist: With existence verification
  - GetWishlist: Paginated with product details via repository
  - CheckProduct: Returns status + added timestamp
  - GetWishlistCount: Return count response
  - ClearWishlist: Remove all items

- [x] HTTP Handler (5 endpoints)
  - POST `/api/v1/wishlist/:productID` - Add to wishlist
  - DELETE `/api/v1/wishlist/:productID` - Remove from wishlist
  - GET `/api/v1/wishlist?page=1&page_size=10` - List wishlist
  - GET `/api/v1/wishlist/:productID/check` - Check if in wishlist
  - DELETE `/api/v1/wishlist` - Clear entire wishlist

- [x] Tests (7 repository tests)
  - Add product to wishlist
  - Check if product in wishlist
  - Count wishlist items
  - Remove product from wishlist
  - Clear all wishlist items
  - Get product IDs for batch operations
  - Unique constraint enforcement
  - All tests passing ✅

**Frontend Tasks:**
- [x] Wishlist/favorites feature
- [x] Product reviews and ratings
- [ ] Live chat integration
- [ ] Admin dashboard build
- [ ] Payment page integration
- [x] Email verification flow

---

**Phase 9L: Full-Text Search Improvements (Completed)**

Comprehensive search enhancement with PostgreSQL full-text search, autocomplete, faceted filtering, and search analytics.

**Features:**
- [x] PostgreSQL Full-Text Search (FTS) with tsvector
- [x] Autocomplete suggestions with ranking
- [x] Popular/trending searches by period
- [x] Search facets (categories, price ranges)
- [x] Search analytics & metrics
- [x] User search history tracking
- [x] Product click tracking from search results
- [x] Search contextual filters & recommendations

**Database Schema:**
- `search_suggestions` table: Query autocomplete cache
  - Unique constraint: UNIQUE(query, category_id)
  - Indexes: query, search_count, category_id, last_searched_at
  - Auto-increment search_count on duplicate query
- `search_analytics` table: Search activity tracking
  - Tracks: user_id, query, result_count, clicked_product_id, duration_ms
  - Indexes: user_id, query, created_at, clicked_product_id
- `products.search_vector`: PostgreSQL tsvector column
  - Automatic update trigger on product insert/update
  - GIN index for fast full-text search

**Models:**
- SearchSuggestion: Autocomplete cache with search count
- SearchAnalytics: Search activity with click tracking
- SearchSuggestionResponse: Suggestion DTO
- SearchResultResponse: Results with execution time
- SearchFacetResponse: Facet options with counts
- PopularSearchResponse: Popular queries with trend indicators
- SearchMetricsResponse: Admin analytics
- SearchAutocompleteResponse: Autocomplete suggestions

**Repository Layer (18 methods):**
- AddSearchSuggestion: Add/increment suggestion
- GetSearchSuggestions: Get autocomplete by prefix
- GetPopularSearches: Trending searches by period
- GetSuggestionByQuery: Fetch specific suggestion
- LogSearchActivity: Log search event
- RecordProductClick: Track product selection from search
- GetSearchMetrics: Analytics dashboard data
- GetUserSearchHistory: User's past searches
- DeleteOldAnalytics: Cleanup old records
- SearchProductsWithFTS: Full-text search using tsvector
- GetFacetedSearch: Search with filters (category, price)
- GetPriceRanges: Available price distribution
- GetCategoryFacets: Available category options
- UpdateProductSearchVector: Manual FTS vector update

**Service Layer (10 methods):**
- SearchProductsEnhanced: FTS with analytics logging
- GetAutocompleteSuggestions: Prefix-based autocomplete
- GetPopularSearches: Trending by time period (today/week/month/all)
- GetFacetedSearchOptions: Available facets for query
- RecordProductClick: Log product selection
- GetSearchMetrics: Dashboard metrics
- GetUserSearchHistory: Retrieve user searches
- ClearUserSearchHistory: Privacy feature
- NormalizeQuery: Clean query input
- GetSearchContextualFilters: Contextual recommendations

**HTTP Endpoints (9 total):**
Public (no auth required):
- GET `/api/v1/search` - Enhanced search with optional filters
  - Query params: q (required), category_id, min_price, max_price, limit
- GET `/api/v1/search/autocomplete` - Autocomplete suggestions
  - Query params: q (required), category_id, limit
- GET `/api/v1/search/popular` - Popular searches
  - Query params: limit, period (today/week/month/all)
- GET `/api/v1/search/facets` - Faceted options for query
  - Query params: q (required)
- GET `/api/v1/search/filters` - Contextual filters
  - Query params: q (required)
- GET `/api/v1/search/trending-products` - Top clicked products
  - Query params: period
- POST `/api/v1/search/click` - Track product click
  - Body: {product_id, query}

Protected (auth required):
- GET `/api/v1/account/search/history` - User search history
  - Query params: limit
- DELETE `/api/v1/account/search/history` - Clear history

Admin (admin role required):
- GET `/api/v1/admin/search/metrics` - Search analytics
  - Query params: period (today/week/month)

**Tests (23 total, 20 passing):**
Repository Tests (10):
- ✅ AddSearchSuggestion
- ✅ GetSearchSuggestions with prefix
- ✅ GetPopularSearches by period
- ✅ GetSuggestionByQuery
- ✅ LogSearchActivity
- ✅ RecordProductClick
- ✅ GetUserSearchHistory
- ✅ DeleteOldAnalytics
- ✅ SearchSuggestion with category
- ✅ SearchSuggestionIncrementCount

Service Tests (13):
- ✅ NormalizeQuery
- ✅ GetAutocompleteSuggestions
- ✅ GetAutocompleteSuggestionsEmpty
- ✅ GetAutocompleteSuggestionsLimitValidation
- ✅ GetPopularSearches
- ✅ GetPopularSearchesTimePeriods
- ✅ RecordProductClick
- ✅ GetUserSearchHistory
- ✅ GetUserSearchHistoryLimitValidation
- ✅ GetSearchMetrics
- ✅ CalculateTrend
- ✅ SearchProductsEnhancedValidation
- ⏭️ SearchProductsEnhancedLimitValidation (skipped - SQLite limitation)
- ✅ GetFacetedSearchOptionsEmpty
- ✅ SearchSuggestionCachingWithCategory
- ✅ GetSearchMetricsWithoutData
- ✅ PopularSearchesPeriodValidation
- ✅ SearchAnalyticsLoggingWithDuration

Note: Some FTS tests skipped in test environment due to SQLite limitations. Full FTS functionality verified in PostgreSQL.

**Key Design Decisions:**
1. **Separate suggestions table**: Prevents log bloat, caches popular queries
2. **Tsvector indexing**: Fast PostgreSQL FTS without external Elasticsearch
3. **Dual analytics**: Both suggestion cache + detailed analytics
4. **Time-windowed metrics**: Allows trend analysis (today/week/month)
5. **Click tracking**: Measures search relevance & user behavior
6. **Search normalization**: Consistent query handling across layers
7. **Faceted search**: Optional filtering (category, price) alongside FTS

**Files Created:**
- migrations/008_search_enhancements.up/down.sql
- models/search.go (8 DTOs)
- repositories/search_repository.go (14 methods)
- repositories/search_repository_test.go (10 tests)
- services/search_service.go (10 methods)
- services/search_service_test.go (13 tests)
- handlers/search_handler.go (9 endpoints)

---

**Phase 9M: Live Chat Integration (Completed)**
- [x] Core Features (8 Components)
  1. **Real-time Conversations**: Two-way messaging between customers and support agents
  2. **Message History**: Persistent storage of all conversation messages with timestamps
  3. **Agent Assignment**: Automatic assignment to available agents with load balancing
  4. **Typing Indicators**: Real-time display of who is typing in conversation
  5. **Emoji Reactions**: Message reactions (👍 👎 😂 😢 ❤️ 🔥)
  6. **File Attachments**: Support for file uploads in chat messages
  7. **Conversation Tags**: Classify conversations by topic (order, product, billing)
  8. **Metadata Tracking**: Message count, satisfaction rating, resolution tracking

- [x] Database Schema (8 Tables)
  - `conversations`: Main conversation records with status tracking
  - `chat_messages`: Message records with sender identification
  - `chat_attachments`: File metadata and references
  - `agent_status`: Track agent online/offline status and load
  - `typing_indicators`: Real-time typing presence with TTL
  - `message_reactions`: Emoji reaction storage with user tracking
  - `conversation_tags`: Tag management for conversation classification
  - `conversation_metadata`: Analytics and tracking (message count, satisfaction, resolution)
  - 12+ indexes for query optimization
  - Cascading deletes for data integrity

- [x] Models (12 + 13 DTOs)
  - Conversation: Core conversation data with user/agent tracking
  - ChatMessage: Message records with sender and content
  - ChatAttachment: File attachment metadata
  - AgentStatus: Agent availability and load info
  - TypingIndicator: Real-time typing presence
  - MessageReaction: User emoji reactions
  - ConversationTag: Topic classification
  - ConversationMetadata: Analytics tracking
  - Request/Response DTOs: Create/Send/Update/List operations

- [x] Repository Layer (20+ methods)
  - Conversation CRUD: Create, retrieve, list, update, delete
  - Message operations: Create, retrieve, list, read status
  - Agent status: Update, get available agents, load balancing
  - Typing indicators: Set, get active users with TTL
  - Reactions: Add, remove, get message reactions
  - Metadata: Create, update conversation statistics
  - Search: Find conversations by keyword, filters, priority

- [x] Service Layer (10 methods)
  - CreateConversation: Start new chat with validation
  - GetConversation: Retrieve with access control (user/agent authorization)
  - GetUserConversations: Paginated list with unread count
  - SendMessage: Message creation with metadata update
  - GetConversationMessages: Paginated history with read status
  - MarkAsRead: Update message read status
  - SetTypingIndicator: Real-time presence update
  - GetTypingUsers: Get active typing users
  - AddReaction: Emoji reaction with validation
  - RemoveReaction: Reaction deletion

- [x] HTTP Handlers (10 endpoints)

Customer Routes (auth required):
- POST `/api/v1/chat/conversations` - Start new conversation
  - Body: {subject, message, category, priority}
- GET `/api/v1/chat/conversations` - List user conversations
  - Query params: page, page_size
- GET `/api/v1/chat/conversations/:id` - Get specific conversation
- POST `/api/v1/chat/conversations/:id/messages` - Send message
  - Body: {message, message_type, file_url, file_name}
- GET `/api/v1/chat/conversations/:id/messages` - Get message history
  - Query params: limit, offset
- PUT `/api/v1/chat/messages/:id/read` - Mark message as read

Real-time Features:
- POST `/api/v1/chat/conversations/:id/typing` - Set typing indicator
  - Body: {is_typing}
- GET `/api/v1/chat/conversations/:id/typing` - Get typing users

Reactions:
- POST `/api/v1/chat/messages/:id/reactions` - Add emoji reaction
  - Body: {reaction} (thumbs_up, thumbs_down, laugh, cry, heart, fire)
- DELETE `/api/v1/chat/messages/:id/reactions/:reaction` - Remove reaction

- [x] Tests (10+ unit tests)
  - Model validation: Subject length, message length, reaction validation
  - Status validation: Valid statuses (open, in_progress, resolved, closed)
  - Response structure: Conversation and message DTO structure
  - Request DTOs: All request types structure

- [x] Integration Points
  - Auth middleware: User identification and role validation
  - Rate limiting: Per-user chat operation limits (prevent spam)
  - Notification triggers: Email alerts for new chat, agent assignment
  - Admin dashboard: Chat analytics and agent management

**Key Design Decisions:**
1. **Separate conversations & messages**: Prevents query bloat, improves indexing
2. **Agent load balancing**: Query agents by active_conversations ASC (lowest load first)
3. **Typing indicator TTL**: Automatic cleanup prevents stale data (5-second default)
4. **Message reactions separate**: Flexible emoji support without modifying message row
5. **Metadata table**: Offloads analytics queries from main conversation table
6. **Cascading deletes**: Deleting conversation removes all related data automatically
7. **Authorization layer**: Verify user/agent access before returning conversation data
8. **Pagination**: Support for large conversation histories without performance impact

**Files Created:**
- migrations/009_live_chat.up/down.sql (8 tables)
- models/chat.go (12 models + 13 DTOs)
- repositories/chat_repository.go (20+ methods)
- services/chat_service.go (10 methods)
- handlers/chat_handler.go (10 endpoints)
- services/chat_service_test.go (10 tests)

---

- [ ] Notification system

---

**Phase 12: Product Catalog & Browsing (Completed)**

Comprehensive product discovery experience with reviews, wishlists, and advanced search capabilities.

**Features Implemented:**
- [x] Product reviews system with rating breakdown and helpful voting
- [x] Review form for authenticated users with 5-star rating
- [x] Wishlist/favorites system with persistent storage
- [x] Wishlist management page with add/remove functionality
- [x] Search autocomplete with dropdown suggestions
- [x] Popular searches display with trend indicators
- [x] Trending products discovery section
- [x] Product discovery features (new arrivals, bestsellers)
- [x] Enhanced search integration with product listing page

**Frontend Components Created:**
- `ReviewsSection`: Display reviews with pagination, sorting, voting
- `ReviewForm`: Form component for creating product reviews
- `WishlistButton`: Reusable button for adding/removing from wishlist
- `WishlistPage`: Full wishlist management interface
- `SearchInput`: Enhanced search with autocomplete and keyboard navigation
- `DiscoverySection`: Reusable component for trending/new/bestseller products
- `Textarea`: New UI component for review form textarea
- `Alert`: Alert component for review status messages

**Backend Integration:**
- `productService.getProductReviews()`: Fetch reviews with pagination
- `productService.getReviewStats()`: Rating breakdown statistics
- `productService.createReview()`: Submit new review
- `productService.voteReviewHelpful()`: Track helpful votes
- `productService.searchProductsEnhanced()`: Full-text search
- `productService.getSearchAutocomplete()`: Autocomplete suggestions
- `productService.getPopularSearches()`: Trending searches
- `productService.getTrendingProducts()`: Trending products by period
- `wishlistService.*`: Complete wishlist API integration

**State Management:**
- `useWishlistStore()`: Zustand store for wishlist state with localStorage persistence
- Integrated with existing `useAuthStore()` for user context
- Integrated with `useCartStore()` for cart operations

**UI/UX Features:**
- Star rating visual feedback in reviews
- Helpful/unhelpful voting on reviews
- Wishlist counter badge in header
- Animated review form with validation
- Search suggestions with keyboard arrow navigation
- Popular searches fallback when no suggestions
- Loading states and error handling
- Responsive design for all new components
- Framer Motion animations throughout

**Key Design Decisions:**
1. **Separated review form & display**: Clean components, reusable patterns
2. **Wishlist localStorage**: Optimistic updates with persistent state
3. **Search dropdown positioning**: Auto-close on outside click with ref tracking
4. **Rating visualization**: Color-coded stars, breakdown bars showing distribution
5. **Review sorting options**: helpful, recent, rating_high, rating_low
6. **Discovery sections**: Flexible component for different product collections
7. **Keyboard navigation**: Arrow keys, Enter, Escape for search accessibility

**Files Created:**
- frontend/src/components/product/reviews-section.tsx
- frontend/src/components/product/review-form.tsx
- frontend/src/components/product/wishlist-button.tsx
- frontend/src/components/search/search-input.tsx
- frontend/src/components/discovery/discovery-section.tsx
- frontend/src/components/ui/textarea.tsx
- frontend/src/stores/wishlist-store.ts
- frontend/src/app/(shop)/wishlist/page.tsx
- frontend/src/app/(auth)/forgot-password/page.tsx (Phase 11)
- frontend/src/app/(auth)/reset-password/page.tsx (Phase 11)
- frontend/src/app/(auth)/verify-email/page.tsx (Phase 11)
- frontend/src/app/(auth)/verify-email/[token]/page.tsx (Phase 11)

**Files Modified:**
- frontend/src/services/product.ts: Added review & search service methods
- frontend/src/components/layout/header.tsx: Integrated SearchInput, updated wishlist button
- frontend/src/app/(shop)/products/[slug]/page.tsx: Added ReviewsSection tab, WishlistButton

**Testing & Verification:**
- ✅ Build succeeds without TypeScript errors
- ✅ All components integrate with existing services
- ✅ Responsive design validated across breakpoints
- ✅ Search autocomplete works with keyboard navigation
- ✅ Wishlist persistence verified with localStorage

- [ ] Notification system


- [ ] Unit tests (>80% coverage)
- [ ] Integration tests
- [ ] E2E tests (Playwright)
- [ ] Load testing (K6)
- [ ] API documentation (Swagger)
- [ ] Docker production builds
- [ ] CI/CD pipeline (GitHub Actions)

### 📈 Architecture Quality Metrics

Implemented Best Practices:
- ✅ **Clean Code**: Consistent naming, modular structure, SOLID principles
- ✅ **Architecture**: Clean Architecture with clear layer separation
- ✅ **Security**: JWT auth, rate limiting, input validation
- ✅ **Concurrency**: Pessimistic & optimistic locking patterns
- ✅ **Scalability**: Stateless design, horizontal scaling ready
- ✅ **Database**: Migrations, connection pooling, query optimization
- ✅ **DevOps**: Docker containerization, environment management

## 💡 Technical Decisions

### Why Go for Backend?
- **Performance**: Compiled, concurrent, low memory footprint
- **Industry Adoption**: Used by Gojek, Tokopedia (Indonesia), Google, Uber, Netflix
- **Global Demand**: High salary range, growing adoption
- **Scalability**: Built-in goroutines for concurrency
- **Deployment**: Single binary, no dependencies

### Why Next.js for Frontend?
- **Full-stack capability**: API routes for BFF pattern
- **Performance**: Server-side rendering, static generation, optimized images
- **Developer Experience**: TypeScript support, hot reload, extensive ecosystem
- **SEO-friendly**: Server-side rendering for better crawling
- **Modern tooling**: Built-in testing, CSS support, environment variables



## 📊 Architecture Highlights

### Backend Architecture
- **Handlers** → HTTP request/response handling
- **Services** → Business logic & validation
- **Repositories** → Database operations
- **Models** → Domain entities

### Key Patterns Implemented
- Rate limiting with Redis
- JWT with refresh tokens
- Optimistic locking for concurrent updates
- Idempotent checkout operations
- Self-healing slugs for SEO

## 🤝 Contributing

This is a portfolio project, but suggestions and feedback are welcome!

## 📝 License

MIT License - see LICENSE file for details

## 👤 Author

**Nandana**
- GitHub: [@Daarns](https://github.com/Daarns)
- Email: nandana219@gmail.com
- Portfolio Project: Full-stack E-Commerce with Go + Next.js

**Project Highlights for Portfolio:**
- Production-ready architecture with Clean Code principles
- Implemented advanced patterns (rate limiting, optimistic locking, idempotency)
- >80% test coverage target with unit & integration tests
- Containerized with Docker, ready for deployment
- Modern tech stack showcasing current industry standards

