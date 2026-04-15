# E-Commerce Project Setup - Quick Start Guide

## ✅ Project Status

Backend API is fully functional with all core features implemented.

## 🎯 What's Been Set Up

### ✅ Backend (Go + Gin)
- **Location**: `backend/`
- **Framework**: Gin (lightweight & fast)
- **Structure**: Clean Architecture (simplified)
- **Dependencies**: All installed via `go.mod`
- **Environment**: `.env` file configured

### ✅ Docker Services
- **PostgreSQL** (Database): `localhost:5432`
- **Redis** (Cache): `localhost:6379`
- **pgAdmin** (Database GUI): `http://localhost:5050`
  - Email: `admin@admin.com`
  - Password: `admin`

### ✅ Implemented Features
- User authentication (register, login, JWT refresh)
- Product management (CRUD, search, filtering)
- Category management
- Shopping cart (guest & authenticated users)
- Address management
- Order & checkout system
- Admin dashboard endpoints

---

## 🚀 How to Run

### Start Docker Services (Database & Cache)
```powershell
# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

### Run Backend Server
```powershell
cd backend
go run cmd/api/main.go
```

Server will run on: `http://localhost:8080`

---

## 🗂️ Project Structure

```
E-Commerce/
├── backend/                    # Go backend
│   ├── cmd/
│   │   ├── api/               # Main application entry
│   │   └── migrate/           # Database migrations
│   ├── internal/
│   │   ├── models/            # Domain entities
│   │   ├── services/          # Business logic
│   │   ├── handlers/          # HTTP controllers
│   │   ├── repositories/      # Database access
│   │   └── middleware/        # Auth, rate limit
│   ├── pkg/                   # Shared utilities
│   │   ├── jwt/              # JWT token handling
│   │   ├── password/         # Password hashing
│   │   └── response/         # HTTP responses
│   └── migrations/            # SQL migration files
├── frontend/                  # Next.js (to be created)
├── docker/                    # Docker configs
│   └── postgres/init.sql     # DB initialization
├── docs/                      # Documentation
└── docker-compose.yml         # Services orchestration
```

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/refresh` | Refresh token |
| POST | `/api/v1/auth/logout` | Logout |
| GET | `/api/v1/auth/me` | Get profile |

### Products (Public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/products` | List products |
| GET | `/api/v1/products/search` | Search products |
| GET | `/api/v1/products/:id` | Get product |
| GET | `/api/v1/products/:id/related` | Related products |

### Cart (Auth optional for guest)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/cart` | Get cart |
| POST | `/api/v1/cart/items` | Add to cart |
| PUT | `/api/v1/cart/items/:id` | Update item |
| DELETE | `/api/v1/cart/items/:id` | Remove item |

### Orders (Auth required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/checkout` | Create order |
| GET | `/api/v1/orders` | List orders |
| GET | `/api/v1/orders/:id` | Get order |

### Admin (Admin role required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/admin/products` | Create product |
| PUT | `/api/v1/admin/products/:id` | Update product |
| DELETE | `/api/v1/admin/products/:id` | Delete product |
| GET | `/api/v1/admin/orders` | All orders |
| PUT | `/api/v1/admin/orders/:id/status` | Update status |

---

## 🔧 Development Commands

### Backend
```powershell
cd backend

# Run server
go run cmd/api/main.go

# Run tests
go test ./...

# Run migrations
go run cmd/migrate/main.go up

# Build binary
go build -o ecommerce-api.exe cmd/api/main.go
```

### Docker
```powershell
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Remove volumes (⚠️ deletes data)
docker-compose down -v
```

---

## 📊 Service Access

| Service | URL | Credentials |
|---------|-----|-------------|
| Backend API | http://localhost:8080 | - |
| PostgreSQL | localhost:5432 | postgres / postgres |
| Redis | localhost:6379 | Password: redis_password |
| pgAdmin | http://localhost:5050 | admin@admin.com / admin |

---

## 🛠️ Next Steps

### Frontend Development (Phase 5)
- [ ] Initialize Next.js with TypeScript
- [ ] Setup Tailwind CSS & shadcn/ui
- [ ] Authentication pages (login, register)
- [ ] Product listing & detail pages
- [ ] Shopping cart UI
- [ ] Checkout flow
- [ ] Admin dashboard

### Additional Features
- [ ] Payment integration (Midtrans Sandbox)
- [ ] Image upload functionality
- [ ] Email notifications
- [ ] Unit tests

---

## 🐛 Troubleshooting

### Backend won't start
```powershell
# Check if port 8080 is in use
netstat -ano | findstr :8080

# Verify Go modules
cd backend && go mod download
```

### Docker issues
```powershell
# Ensure Docker Desktop is running
docker ps

# Check logs
docker-compose logs

# Restart services
docker-compose restart
```

---

## 📚 Resources

- **Go Documentation**: https://go.dev/doc/
- **Gin Framework**: https://gin-gonic.com/docs/
- **Next.js**: https://nextjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
