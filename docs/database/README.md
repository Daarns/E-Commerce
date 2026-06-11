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

## Why Not Keep Every Development Migration in Main?

The project is still evolving. Some development migrations may add/drop temporary tables or intermediate columns. Keeping all of them in the final public setup can make onboarding noisy.

The final public setup can stay simple:

```text
Import one SQL dump -> run backend -> run frontend.
```

## Cleanup Checklist

Before dropping any table/column:

1. Inventory usage in backend models, repositories, services, handlers.
2. Inventory usage in frontend types/services/components.
3. Check seed/demo data dependency.
4. Document risk.
5. Drop only after approval.

Tables explicitly used as operational bridges, such as temporary upload tracking for object storage, are kept even when they are small or transient.

Current inventory:

- [Database Cleanup Audit](./CLEANUP_AUDIT.md)
- [Schema Review](./SCHEMA_REVIEW.md)
