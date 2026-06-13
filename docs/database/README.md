# Database Notes

The local database is PostgreSQL 16 through Docker Compose.

## Local Connection

| Field | Value |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| Database | `ecommerce_db` |
| User | `postgres` |
| Password | `postgres` |

pgAdmin is available at:

```text
http://localhost:5050
```

## Consolidated Schema

The public `main` branch intentionally excludes historical development migrations. Fresh environments import:

```text
database/schema.sql
```

The schema contains structure only. Incremental migration history remains available on `develop` for development reference.

## Local Demo Seeder

An idempotent synthetic-data seeder is available for contributors who want to test the platform without using private local data:

```powershell
cd backend
go run ./cmd/seed
```

Remove only the generated demo records with:

```powershell
go run ./cmd/seed --reset
```

See [`database/seeds/README.md`](../../database/seeds/README.md) for demo accounts and included scenarios. Never run the demo seeder against production.

## Setup Model

Public setup stays intentionally simple:

```text
Import one SQL dump -> run backend -> run frontend.
```

The optional seeder is synthetic, idempotent, and separate from the schema so users can choose an empty or demo-ready database.
