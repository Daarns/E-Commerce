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

## 🚀 Quick Start

### Clone & Setup Infrastructure

```bash
git clone <repository-url>
cd E-Commerce

# Start PostgreSQL, Redis, pgAdmin
docker-compose up -d
```

### Backend Setup

```bash
cd backend
cp .env.example .env
go mod download
go run cmd/api/main.go
# Runs on http://localhost:8080
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
# Runs on http://localhost:3000
```

**For detailed setup instructions, see:**
- [Backend Setup Guide](./docs/backend/SETUP.md)
- [Frontend Setup Guide](./docs/frontend/SETUP.md)

## 📚 Documentation

Complete project documentation is available in the `/docs` folder:

| Document | Purpose |
|----------|---------|
| [Backend Architecture](./docs/backend/ARCHITECTURE.md) | System design, layer architecture, design patterns |
| [Backend Setup](./docs/backend/SETUP.md) | Installation, configuration, deployment guide |
| [Frontend Architecture](./docs/frontend/ARCHITECTURE.md) | Component structure, state management, patterns |
| [Frontend Setup](./docs/frontend/SETUP.md) | Installation, development workflow, build guide |
| [API Documentation](./docs/API.md) | Complete API endpoint reference with examples |

## 🧪 Testing

### Backend Tests
```bash
cd backend
go test ./...                    # Run all tests
go test -cover ./...            # Run with coverage
go test ./internal/services/... # Run specific package
```

### Frontend Tests
```bash
cd frontend
npm test                 # Run unit tests
npm run test:e2e        # Run end-to-end tests
```

## 🔐 Environment Variables

Quick reference - detailed setup in [Backend Setup](./docs/backend/SETUP.md) and [Frontend Setup](./docs/frontend/SETUP.md):

### Backend (.env)
```env
DB_HOST=localhost
DB_PORT=5432
JWT_ACCESS_SECRET=your-secret-key    # Generate: openssl rand -base64 32
JWT_REFRESH_SECRET=your-secret-key
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## 🎯 Development Workflow

### Git Branching Strategy

This project follows GitHub Flow:

```
main (production-ready)
├── feature/* (new features)
├── bugfix/* (bug fixes)
└── hotfix/* (critical production fixes)
```

**Workflow:**
1. Create feature branch: `git checkout -b feature/feature-name`
2. Make commits with clear messages
3. Push and create Pull Request
4. Merge after review

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

---

For detailed project progress and implementation milestones, check recent commit history or development documentation.

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

