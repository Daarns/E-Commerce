# Database Setup

This folder contains the public database setup assets for a fresh installation.

## Clean Database

Import the consolidated schema:

```powershell
docker cp database/schema.sql ecommerce-postgres:/tmp/schema.sql
docker exec ecommerce-postgres psql -U postgres -d ecommerce_db -f /tmp/schema.sql
```

## Optional Demo Data

After importing the schema, load synthetic demo data from the backend directory:

```powershell
cd backend
go run ./cmd/seed
```

Reset only demo records:

```powershell
go run ./cmd/seed --reset
```

Demo credentials are documented in [`seeds/README.md`](./seeds/README.md).

The `main` branch uses this consolidated schema instead of historical development migrations.
