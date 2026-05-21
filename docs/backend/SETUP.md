# Backend Setup & Deployment

## Prerequisites

- **Go**: 1.22 or higher ([Download](https://go.dev/dl/))
- **PostgreSQL**: 16 or higher
- **Redis**: 7 or higher
- **Docker & Docker Compose**: For containerized development

## Local Development Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd E-Commerce
```

### 2. Start Infrastructure

```bash
# Start PostgreSQL, Redis, pgAdmin
docker-compose up -d

# Verify containers
docker-compose ps

# View logs
docker-compose logs -f
```

**Access Points:**
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- pgAdmin: http://localhost:5050
  - Email: `admin@admin.com`
  - Password: `admin`

### 3. Setup Backend

```bash
cd backend

# Copy environment template
cp .env.example .env

# Install Go dependencies
go mod download

# Run database migrations
go run cmd/api/main.go migrate

# Start server
go run cmd/api/main.go
```

Server runs on: `http://localhost:8080`

## Environment Configuration

Create `.env` file in backend directory:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=ecommerce

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Secrets
JWT_ACCESS_SECRET=your-super-secret-access-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# Server
PORT=8080
GIN_MODE=debug  # or release

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Payment (Midtrans)
MIDTRANS_SERVER_KEY=your-midtrans-server-key
MIDTRANS_CLIENT_KEY=your-midtrans-client-key
```

## Running Backend

### Development Mode

```bash
cd backend
go run cmd/api/main.go
```

### Build Production Binary

```bash
cd backend
go build -o app cmd/api/main.go
./app
```

## Database Migrations

### Apply Migrations
```bash
go run cmd/api/main.go migrate
```

### View Migration Status
```bash
go run cmd/api/main.go migrate status
```

### Rollback Migration
```bash
go run cmd/api/main.go migrate rollback
```

## Testing

### Run All Tests
```bash
go test ./...
```

### Run Specific Package Tests
```bash
go test ./internal/services/...
```

### With Coverage
```bash
go test -cover ./...
```

## Docker Build & Deploy

### Build Docker Image

```bash
docker build -f docker/Dockerfile.backend -t ecommerce-backend:latest .
```

### Run Container

```bash
docker run -p 8080:8080 \
  --env-file backend/.env \
  --name ecommerce-backend \
  ecommerce-backend:latest
```

### Using Docker Compose

```bash
docker-compose up backend
```

## Troubleshooting

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql -h localhost -U postgres -d ecommerce

# Check logs
docker-compose logs postgres
```

### Redis Connection Issues

```bash
# Test Redis connection
redis-cli ping

# Should return: PONG
```

### Port Already in Use

```bash
# Find process using port 8080
netstat -an | grep 8080
lsof -i :8080

# Kill process (Linux/Mac)
kill -9 <PID>

# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

### Module Dependencies

```bash
# Download all dependencies
go mod download

# Verify dependencies
go mod verify

# Update specific package
go get -u github.com/package/name
```

## Performance Tips

- Enable Redis caching for frequently accessed data
- Use database indexes on filtered columns
- Set appropriate connection pool size (default: 25)
- Use pagination for large result sets
- Monitor slow queries in logs

## Security Checklist

- [ ] Change default JWT secrets
- [ ] Use strong PostgreSQL password
- [ ] Enable HTTPS in production
- [ ] Set secure CORS headers
- [ ] Validate all user inputs
- [ ] Use environment variables for secrets
- [ ] Enable rate limiting
- [ ] Regularly update dependencies

## Next Steps

- See [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- See [../API.md](../API.md) for API endpoints
- Configure frontend in `frontend/` directory
