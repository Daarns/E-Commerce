# STORE E-Commerce Platform

Full-stack e-commerce platform built with a Go backend and a Next.js frontend. The project covers a realistic online store flow: catalog browsing, product variants, cart, checkout, Midtrans payment, fulfillment, refunds, reviews, wishlist, notifications, customer support chat, and admin operations.

This repository is intended as a portfolio-grade implementation and development sandbox. It prioritizes clear separation of concerns, practical business flows, and verifiable local setup.

## Highlights

- Product catalog with categories, variants, stock, advanced filters, wishlist, and reviews.
- Auth with JWT access/refresh tokens, role-based access, admin/customer route guards, and rate limits.
- Cart and checkout flow with address, shipping method, promo validation, and Midtrans Snap payment.
- Order fulfillment flow from payment confirmation through processing, shipped, delivered, completed, refund requested, rejected, or refunded.
- Admin dashboard for products, categories, orders, refunds, users, reviews, promo codes, chat, analytics, and notifications.
- Customer support chat with admin inbox, unread state, typing indicator, and WebSocket-backed realtime flow.
- PostgreSQL, Redis, SeaweedFS object storage, and pgAdmin through Docker Compose.

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Zustand, TanStack Query, Base UI/shadcn-style components |
| Backend | Go 1.26, Gin, GORM, PostgreSQL, Redis, Midtrans SDK, SeaweedFS via MinIO-compatible client |
| Infrastructure | Docker Compose, PostgreSQL 16, Redis 7, pgAdmin, SeaweedFS |
| Testing/Quality | Go tests, ESLint, Next build, Playwright smoke tests |

## Local Services

| Service | URL/Port | Purpose |
|---|---|---|
| Frontend | `http://localhost:3000` | Storefront and admin UI |
| Backend API | `http://localhost:8080/api/v1` | REST API |
| PostgreSQL | `localhost:5432` | Main database |
| Redis | `localhost:6479` | Rate limits, session-related cache, realtime support |
| SeaweedFS S3 | `http://localhost:8333` | Backend object upload endpoint |
| SeaweedFS Filer | `http://localhost:8888` | Browser-readable local image endpoint |
| SeaweedFS UI | `http://localhost:9333` | Storage UI |
| pgAdmin | `http://localhost:5050` | Database GUI |

## Quick Start

```powershell
git clone <repository-url>
cd E-Commerce

docker compose up -d
```

Initialize PostgreSQL:

```powershell
docker cp database/schema.sql ecommerce-postgres:/tmp/schema.sql
docker exec ecommerce-postgres psql -U postgres -d ecommerce_db -f /tmp/schema.sql
```

Backend:

```powershell
cd backend
cp .env.example .env
go mod download
go run ./cmd/api
```

Optional synthetic demo data:

```powershell
cd backend
go run ./cmd/seed
```

Database import, demo credentials, and reset instructions are documented in [database/README.md](./database/README.md).

Frontend:

```powershell
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Documentation

Start here:

- [Documentation Index](./docs/README.md)
- [Setup Guide](./docs/setup/README.md)
- [API Overview](./docs/api/README.md)

## Common Checks

Frontend:

```powershell
cd frontend
npm run lint
npm run build
```

Backend:

```powershell
cd backend
go test ./...
go build ./...
```

## Database Setup

The public `main` branch uses one consolidated schema instead of historical development migrations. Import [database/schema.sql](./database/schema.sql), then optionally run the synthetic demo seeder.

See [database/README.md](./database/README.md) for setup and reset commands.

## Status

Core platform features and reusable local demo seed data are implemented. Remaining work is release preparation and production deployment hardening.
