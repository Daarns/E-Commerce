# Backend Structure

Backend path:

```text
backend/
```

The backend is a Go API using Gin, GORM, PostgreSQL, Redis, Midtrans, and SeaweedFS-compatible object storage.

## Layer Flow

```text
cmd/api -> routes -> handlers -> services -> repositories -> database
```

## Folder Map

```text
backend/
├── cmd/              # Application entrypoints
├── config/           # Configuration loading
├── internal/
│   ├── handlers/     # HTTP request/response layer
│   ├── middleware/   # Auth, admin guard, rate limits
│   ├── models/       # GORM models and response structs
│   ├── realtime/     # WebSocket/chat realtime hub
│   ├── repositories/ # Database queries
│   ├── routes/       # Route registration
│   ├── services/     # Business logic
│   └── webhook/      # External webhook registration/handling
├── migrations/       # Development migrations
└── pkg/              # Shared packages such as JWT/storage/response helpers
```

## Layer Responsibilities

| Layer | Responsibility |
|---|---|
| Routes | URL wiring and middleware grouping |
| Handlers | Request parsing, binding validation, and response formatting |
| Services | Business workflows, status transitions, and external SDK orchestration |
| Repositories | Database queries and persistence |
| Models | Data structures, GORM mapping, and response structs |
| Middleware | Auth, admin guard, and rate limiting |

## Important Backend Domains

| Domain | Main areas |
|---|---|
| Auth/users | `handlers/auth`, `services/auth`, `repositories/user_repository.go`, user admin handlers |
| Product/catalog | product handlers/services/repositories and admin product handlers |
| Cart/checkout/orders | cart/order handlers, order service, order repository |
| Payment | Midtrans payment service and webhook service |
| Fulfillment/refund | order service and admin order handlers |
| Reviews | product review handler/service/repository |
| Chat | chat handler/service/repository and realtime hub |
| Notification | notification handler/service/repository |
| Storage | `pkg/storage/image_service.go`, SeaweedFS/MinIO-compatible upload flow |

## Auth and Authorization

- Customer/admin endpoints use JWT access tokens.
- Admin endpoints use `AuthMiddleware` plus `AdminOnly`.
- User status can restrict account access depending on account state.
- Public routes use global rate limit.
- Protected routes use per-user rate limit.
- Sensitive flows have stricter limits such as auth, upload, chat, typing, and refund evidence.

## Fulfillment Status Flow

Typical order flow:

```text
pending_payment -> payment_confirmed -> processing -> shipped -> delivered -> completed
```

Refund flow:

```text
completed -> refund_requested -> refunded
completed -> refund_requested -> refund_rejected
```

Payment status is tracked separately from fulfillment/order status.

## Quality Checks

```powershell
cd backend
go test ./...
go build ./...
```

Use targeted tests for changed domains when possible.
