# Backend Documentation

Backend app path:

```text
backend/
```

## Read These

| Document | Purpose |
|---|---|
| [Structure](../structure/BACKEND.md) | Go backend layers and responsibilities |
| [Setup](../setup/README.md#2-configure-backend) | Local backend setup |
| [Environment](../setup/ENVIRONMENT.md#backend) | Backend environment variables |
| [API Overview](../api/README.md) | Public/customer/admin endpoints |
| [Database](../database/README.md) | PostgreSQL consolidated schema and demo seeder |
| [Testing](../testing/README.md#backend-checks) | Go test/build checks |
| [Troubleshooting](../troubleshooting/README.md) | Common local backend issues |

## Common Commands

```powershell
cd backend
go mod download
go run ./cmd/api
go test ./...
go build ./...
```

## Docker Image

```powershell
docker build -f backend/Dockerfile -t store-backend:local backend
```

The image runs the API on port `8080` and expects configuration through environment variables.

## Backend Notes

- Routes, handlers, services, repositories, middleware, and webhooks are separated by responsibility.
- Business workflows such as order fulfillment, refunds, payment sync, and chat are implemented in the backend service layer.
- API contracts are summarized in [API Overview](../api/README.md).
