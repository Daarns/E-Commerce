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
- [x] JWT authentication with refresh tokens (environment-based config, 10+ tests)
- [x] Role-based access control (RBAC)
- [x] Product catalog with search
- [x] Shopping cart (guest & authenticated)
- [x] Order management & checkout
- [x] Admin dashboard with CRUD operations
- [ ] Payment integration (Midtrans Sandbox - webhook working, need order→payment flow)
- [ ] Frontend development

### Advanced Patterns
- [x] Pessimistic & optimistic locking
- [x] Idempotency for critical operations
- [x] Self-healing slug generation
- [x] Database connection pooling
- [x] Full-text search (PostgreSQL)
- [ ] Message queue for async processing
- [ ] Real-time notifications
- [x] Caching strategy (Redis-compatible, currently in-memory implementation)

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
- `JWT_SECRET` - Secret key for JWT tokens (min 32 chars)

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

### 🚧 In Progress / Pending

**Backend Tasks:**
- [ ] Email notification service (send confirmation, order, payment, status emails)
- [ ] Email queue system (async processing, retry logic)
- [ ] Order status workflow automation (auto-send emails on status change)
- [ ] Admin dashboard endpoints (analytics, reports, user management)
- [ ] Product reviews & ratings system
- [ ] Wishlist/favorites feature
- [ ] Live chat integration
- [ ] Full-text search improvements (Elasticsearch optional)

**Frontend Tasks:**
- [ ] Wishlist/favorites feature
- [ ] Product reviews and ratings
- [ ] Live chat integration
- [ ] Admin dashboard build
- [ ] Payment page integration
- [ ] Email verification flow
- [ ] Notification system

**Testing & Deployment:**
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

