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

## Development Migrations

During active development, `backend/migrations/` can contain incremental SQL files. This is useful while features are still changing because it keeps changes traceable and reversible locally.

## Final Main Branch Strategy

For the final `main` branch, the intended setup strategy is:

- A final clean schema dump, for example:

```text
schema.sql
```

- An optional demo/seed dump:

```text
database_with_seed.sql
```

This lets another developer choose:

- clean database for fresh setup,
- database with sample products/orders/users for demo/testing.

Status:

- `schema.sql` has been generated locally as a schema-only dump.
- `database_with_seed.sql` is deferred until final end-to-end testing is complete.
- The seed dump must not contain personal/private email data from local testing.
- Use anonymized demo accounts and sample data when `database_with_seed.sql` is generated.

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

## Why Not Keep Every Development Migration in Main?

The project is still evolving. Some development migrations may add/drop temporary tables or intermediate columns. Keeping all of them in the final public setup can make onboarding noisy.

The final public setup can stay simple:

```text
Import one SQL dump -> run backend -> run frontend.
```

## Notes

Public setup should use the final SQL dump files. Internal audit notes and development cleanup decisions are intentionally kept outside GitHub-facing documentation.
