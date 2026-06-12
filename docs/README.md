# STORE E-Commerce Documentation

This folder contains the public GitHub documentation for STORE E-Commerce.

## Tech Stack

| Area | Technology |
|---|---|
| Frontend | Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Zustand, TanStack Query |
| Backend | Go 1.26, Gin, GORM, PostgreSQL, Redis |
| Payments | Midtrans Snap and Midtrans server-side APIs |
| Storage | SeaweedFS with S3-compatible local image storage |
| Realtime | WebSocket-based customer support chat |
| Infrastructure | Docker Compose, PostgreSQL, Redis, SeaweedFS, and pgAdmin |

## Documentation

| Category | Document |
|---|---|
| Local setup | [Setup guide](./setup/README.md) |
| Environment variables | [Environment guide](./setup/ENVIRONMENT.md) |
| API | [API overview](./api/README.md) |
| API examples | [Request and response examples](./api/EXAMPLES.md) |
| API errors | [Error codes](./api/ERROR_CODES.md) |
| Frontend | [Frontend documentation](./frontend/README.md) |
| Backend | [Backend documentation](./backend/README.md) |
| Project structure | [Structure guide](./structure/README.md) |
| Database | [Database guide](./database/README.md) |
| Testing | [Testing guide](./testing/README.md) |
| Deployment | [Deployment notes](./deployment/README.md) |
| Troubleshooting | [Troubleshooting guide](./troubleshooting/README.md) |
| Features | [Feature overview](./features/README.md) |

## External Setup Links

- Docker Desktop: <https://www.docker.com/products/docker-desktop/>
- Go: <https://go.dev/dl/>
- Node.js: <https://nodejs.org/>
- Midtrans documentation: <https://docs.midtrans.com/>
- Midtrans Snap: <https://docs.midtrans.com/reference/snap>
- Midtrans sandbox dashboard: <https://dashboard.sandbox.midtrans.com/>
- ngrok download: <https://ngrok.com/download>
- ngrok getting started: <https://ngrok.com/docs/getting-started/>

## Docker Options

- Use `docker-compose.yml` to run local dependencies.
- Use `backend/Dockerfile` and `frontend/Dockerfile` to build application images.
- Run ngrok separately for local Midtrans webhook testing. Do not include ngrok in the application images.
