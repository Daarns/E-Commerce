# Deployment Guide

This guide covers local development setup, Docker deployment, and production considerations.

## Table of Contents

- [Local Development Setup](#local-development-setup)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [Environment Configuration](#environment-configuration)
- [Database Migrations](#database-migrations)
- [Monitoring & Troubleshooting](#monitoring--troubleshooting)

---

## Local Development Setup

### Prerequisites

- **Go**: 1.22 or higher ([Download](https://go.dev/dl/))
- **Node.js**: 18 or higher ([Download](https://nodejs.org/))
- **Docker Desktop**: Latest version ([Download](https://www.docker.com/products/docker-desktop/))
- **Git**: Latest version

### Step 1: Clone Repository

```bash
git clone https://github.com/Daarns/E-Commerce.git
cd E-Commerce
```

### Step 2: Start Infrastructure

```bash
# Start PostgreSQL, Redis, pgAdmin
docker-compose up -d

# Verify services are running
docker-compose ps

# View logs
docker-compose logs -f
```

**Service Access Points:**
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- pgAdmin: `http://localhost:5050`
  - Email: `admin@admin.com`
  - Password: `admin`

### Step 3: Setup Backend

```bash
cd backend

# Install Go dependencies
go mod download

# Copy environment file
cp .env.example .env

# Edit .env with your configuration (optional for local)
# nano .env

# Run database migrations
go run cmd/migrate/main.go up

# Start development server
go run cmd/api/main.go
```

Backend runs on: `http://localhost:8080`

**Development with Hot Reload** (using Air):
```bash
# Install Air
go install github.com/cosmtrek/air@latest

# Run with auto-reload
air
```

### Step 4: Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Start development server
npm run dev
```

Frontend runs on: `http://localhost:3000`

### Step 5: Verify Setup

**Test Backend Health:**
```bash
curl http://localhost:8080/health
```

**Test Frontend:**
- Open browser to `http://localhost:3000`
- Navigate to Products page
- Add item to cart

---

## Docker Deployment

### Using Docker Compose (Local/Staging)

```bash
# Build images
docker-compose build

# Start all services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f [service-name]

# Remove volumes (⚠️ deletes data)
docker-compose down -v
```

### Available Services

| Service | Port | Credentials |
|---------|------|-------------|
| PostgreSQL | 5432 | postgres/postgres |
| Redis | 6379 | - |
| pgAdmin | 5050 | admin@admin.com / admin |

### Building Individual Images

```bash
# Build backend image
docker build -f Dockerfile.backend -t ecommerce-backend:latest .

# Build frontend image
docker build -f Dockerfile.frontend -t ecommerce-frontend:latest .

# Run backend container
docker run -p 8080:8080 \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5432 \
  -e DB_USER=postgres \
  -e DB_PASSWORD=postgres \
  -e DB_NAME=ecommerce_db \
  ecommerce-backend:latest

# Run frontend container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1 \
  ecommerce-frontend:latest
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Environment variables configured securely
- [ ] Database backups configured
- [ ] SSL/TLS certificates installed
- [ ] Monitoring tools set up
- [ ] Logging aggregation configured
- [ ] Error tracking service enabled
- [ ] Database migrations tested
- [ ] Secrets stored in secure vault

### Database Preparation

```bash
# Create production database
CREATE DATABASE ecommerce_prod;

# Run migrations
go run cmd/migrate/main.go up

# Create backup
pg_dump ecommerce_prod > backup_$(date +%Y%m%d).sql
```

### Backend Deployment

**With Kubernetes:**
```bash
# Create secret for environment variables
kubectl create secret generic ecommerce-env \
  --from-file=.env.prod

# Apply Kubernetes manifests
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml

# Check deployment status
kubectl get deployments
kubectl logs -f deployment/ecommerce-backend
```

**With Docker (Single Server):**
```bash
# Build production image (multi-stage)
docker build -f Dockerfile.backend.prod -t ecommerce-backend:prod .

# Push to registry
docker tag ecommerce-backend:prod yourregistry/ecommerce-backend:prod
docker push yourregistry/ecommerce-backend:prod

# Run container
docker run -d \
  --name ecommerce-backend \
  -p 8080:8080 \
  --env-file .env.prod \
  yourregistry/ecommerce-backend:prod
```

### Frontend Deployment

**With Vercel (Recommended for Next.js):**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Setup environment variables in Vercel dashboard
# NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
```

**With Docker:**
```bash
# Build production image
docker build -f Dockerfile.frontend.prod -t ecommerce-frontend:prod .

# Deploy to registry and run
```

### Reverse Proxy (Nginx)

```nginx
upstream backend {
    server localhost:8080;
}

upstream frontend {
    server localhost:3000;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    ssl_certificate /etc/ssl/certs/your_cert.crt;
    ssl_certificate_key /etc/ssl/private/your_key.key;
    
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Rate limiting
        limit_req zone=api_limit burst=20 nodelay;
    }
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/ssl/certs/your_cert.crt;
    ssl_certificate_key /etc/ssl/private/your_key.key;
    
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

---

## Environment Configuration

### Backend (.env)

```env
# Server
PORT=8080
APP_ENV=production

# Database
DB_HOST=postgres.yourdomain.com
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_NAME=ecommerce_db
DB_SSL_MODE=require

# Redis
REDIS_HOST=redis.yourdomain.com
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# JWT
JWT_SECRET=your_very_long_secure_secret_key_minimum_32_characters
JWT_EXPIRE=900
JWT_REFRESH_EXPIRE=604800

# Payment (Midtrans)
MIDTRANS_SERVER_KEY=your_server_key
MIDTRANS_CLIENT_KEY=your_client_key
MIDTRANS_ENVIRONMENT=sandbox

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# AWS S3 (for image uploads)
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=ecommerce-images

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
NEXT_PUBLIC_APP_NAME=E-Commerce
```

---

## Database Migrations

### Running Migrations

```bash
cd backend

# Up - Apply pending migrations
go run cmd/migrate/main.go up

# Up (specific version)
go run cmd/migrate/main.go up 1

# Down - Rollback last migration
go run cmd/migrate/main.go down

# Down (count)
go run cmd/migrate/main.go down 3

# Force - Set version without running migrations
go run cmd/migrate/main.go force 2
```

### Creating New Migration

```bash
# Create new migration file
migrate create -ext sql -dir backend/migrations -seq add_column_name

# Edit the .up.sql and .down.sql files
vim backend/migrations/003_add_column_name.up.sql
```

---

## Monitoring & Troubleshooting

### Health Checks

```bash
# Backend health
curl http://localhost:8080/health

# Database connectivity test
curl http://localhost:8080/health/db

# Redis connectivity test
curl http://localhost:8080/health/redis
```

### Logs

**Docker Logs:**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100 backend
```

**Application Logs:**
```bash
# Backend logs (JSON format)
tail -f logs/app.log | jq

# Frontend logs
npm run logs
```

### Database Management

**Access PostgreSQL:**
```bash
# Via psql
psql -h localhost -U postgres -d ecommerce_db

# Via pgAdmin web interface
# http://localhost:5050
```

**Common Commands:**
```sql
-- List tables
\dt

-- Show table structure
\d products

-- List indexes
\di

-- Check table size
SELECT pg_size_pretty(pg_total_relation_size('products'));

-- List running connections
SELECT * FROM pg_stat_activity;
```

### Performance Monitoring

**Query Performance:**
```sql
-- Enable query logging
SET log_statement = 'all';

-- Check slow queries (>1s)
SELECT query, calls, mean_exec_time 
FROM pg_stat_statements 
WHERE mean_exec_time > 1000 
ORDER BY mean_exec_time DESC;
```

**Redis Monitoring:**
```bash
# Redis CLI
redis-cli

# Memory usage
redis-cli INFO memory

# Key statistics
redis-cli INFO keyspace
```

### Common Issues

**Connection Refused**
```bash
# Check if services are running
docker-compose ps

# Start services
docker-compose up -d
```

**Database Migration Failed**
```bash
# Check migration status
go run cmd/migrate/main.go version

# Force reset
go run cmd/migrate/main.go force 0
```

**Port Already in Use**
```bash
# Find process using port
lsof -i :8080

# Kill process
kill -9 <PID>
```

---

## Scaling Considerations

### Horizontal Scaling

1. **Load Balancing**: Use Nginx or cloud load balancer
2. **Stateless APIs**: Ensure no session storage on backend
3. **Database Replication**: Setup read replicas for read-heavy operations
4. **Caching**: Use Redis for frequently accessed data

### Vertical Scaling

1. **Database Optimization**: Indexes, query optimization
2. **Connection Pooling**: Increase pool size
3. **Memory Allocation**: Tune Golang GC settings

---

## Backup & Recovery

**Automated Backups:**
```bash
#!/bin/bash
BACKUP_DIR="/backups"
DB_NAME="ecommerce_db"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup database
pg_dump ecommerce_db > $BACKUP_DIR/ecommerce_$DATE.sql

# Backup S3 files (if using AWS)
aws s3 sync s3://ecommerce-images/ $BACKUP_DIR/s3_backup/

# Keep only last 30 days
find $BACKUP_DIR -mtime +30 -delete
```

**Recovery:**
```bash
# Restore from backup
psql ecommerce_db < backup_20240414.sql
```

---

For more information, see [ARCHITECTURE.md](./ARCHITECTURE.md) or [API.md](./API.md)
