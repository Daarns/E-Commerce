# Local Setup Guide

This guide assumes Windows PowerShell, but the commands are easy to adapt for Linux/macOS.

## Prerequisites

- Git
- Docker Desktop with WSL integration enabled
- Go matching the backend `go.mod`
- Node.js compatible with Next.js 16
- npm
- Optional for Midtrans webhook testing: [ngrok](https://ngrok.com/download)

## Docker Compose vs Dockerfile

Use `docker-compose.yml` for this local development stack because the platform needs multiple services running together:

- PostgreSQL
- Redis
- SeaweedFS
- pgAdmin

A Dockerfile is useful when packaging one application runtime, such as the backend API or frontend app. It does not replace Compose for local orchestration.

Ngrok should not be baked into the backend or frontend Dockerfile. If ngrok is needed, run it as an external CLI process or as a separate optional Compose service. Keeping it separate avoids coupling the app image to a developer tunnel token/domain and makes production deployment cleaner.

Application Dockerfiles are available for image-based deployment:

```powershell
docker build -f backend/Dockerfile -t store-backend:local backend
docker build -f frontend/Dockerfile -t store-frontend:local frontend
```

These images still require runtime environment variables and external services such as PostgreSQL, Redis, SeaweedFS/object storage, SMTP, and Midtrans credentials.

## 1. Start Infrastructure

From the repository root:

```powershell
docker compose up -d
docker ps
```

Expected containers:

- `ecommerce-postgres`
- `ecommerce-redis`
- `ecommerce-seaweedfs`
- `ecommerce-pgadmin`

Ports:

| Service | Port |
|---|---:|
| PostgreSQL | `5432` |
| Redis | `6479` host -> `6379` container |
| SeaweedFS S3 | `8333` |
| SeaweedFS Filer | `8888` |
| SeaweedFS UI | `9333` |
| pgAdmin | `5050` |

## 2. Configure Backend

```powershell
cd backend
cp .env.example .env
```

Update `.env` for local Docker services. The current local Redis host port is `6479`.

Then run:

```powershell
go mod download
go run ./cmd/api
```

Backend should respond at:

```powershell
curl.exe http://localhost:8080/api/v1/ping
```

## 3. Configure Frontend

```powershell
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Frontend runs on:

```text
http://localhost:3000
```

## 4. Optional Production-like Frontend Check

```powershell
cd frontend
npm run build
npm run start -- -p 3000
```

## 5. Local Image Storage Note

The backend uploads through SeaweedFS S3 on `localhost:8333`.

For browser display, local images are read through the Filer URL:

```text
http://localhost:8888/buckets/<bucket>/<object-path>
```

The frontend normalizes old local `8333` image URLs into the browser-readable `8888/buckets` form.

## 6. Local Payment Testing

Midtrans Snap sandbox can be tested locally from the browser. For webhook testing from Midtrans to your backend, expose the backend through a public tunnel such as ngrok:

Install ngrok:

- Download: <https://ngrok.com/download>
- Getting started: <https://ngrok.com/docs/getting-started/>

Run the backend first, then expose it:

```powershell
ngrok http 8080
```

Expected mapping:

```text
https://<your-ngrok-domain> -> http://localhost:8080
```

Use the ngrok URL for Midtrans webhook settings when Midtrans needs to reach your local backend:

```text
https://<your-ngrok-domain>/api/v1/webhooks/payment
```

For frontend finish/error redirects, use the frontend URL that the browser can open. Local browser testing can use `http://localhost:3000`, while external redirect testing can use a public frontend tunnel if you expose the frontend separately.
