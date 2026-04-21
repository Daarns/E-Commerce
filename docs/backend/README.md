# E-Commerce Backend (Go + Gin)

Clean Architecture backend API built with Go and Gin framework.

## 🏗️ Architecture

### Clean Architecture Layers

```
cmd/
  api/              # Application entry point
internal/
  domain/           # Business entities (core domain)
  usecase/          # Business logic (application layer)
  delivery/         # HTTP handlers (interface layer)
  repository/       # Data access (infrastructure layer)
  middleware/       # Cross-cutting concerns
pkg/                # Reusable packages
config/             # Configuration management
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Download all Go modules
go mod download

# Install Air for hot reload (optional but recommended)
go install github.com/cosmtrek/air@latest
```

### 2. Setup Environment

```bash
# Copy example environment file
copy .env.example .env

# Edit .env with your configurations
```

### 3. Run Development Server

```bash
# With hot reload (recommended)
air

# Or without hot reload
go run cmd/api/main.go
```

Server will start on `http://localhost:8080`

## 📡 API Endpoints

### Health Check
```
GET /health
```

### Authentication (Coming Soon)
```
POST /api/v1/auth/register
POST /api/v1/auth/login
```

### Products (Coming Soon)
```
GET    /api/v1/products
GET    /api/v1/products/:id
```

## 🧪 Testing

```bash
# Run all tests
go test ./...

# Run with coverage
go test -cover ./...
```

## 🔧 Configuration

Key environment variables:

- `PORT`: Server port (default: 8080)
- `ENV`: Environment mode (development/production)
- `DB_HOST`, `DB_PORT`, `DB_NAME`: Database connection
- `JWT_SECRET`: JWT signing key
- `REDIS_HOST`, `REDIS_PORT`: Redis connection

See `.env.example` for complete list.
