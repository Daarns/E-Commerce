# Demo Seeder

The demo seed is intended only for local development and automated testing. It contains synthetic identities and does not include real customer data.

From `backend/`:

```powershell
go run ./cmd/seed
```

The command is idempotent and can be run more than once. To remove only records created by this seeder:

```powershell
go run ./cmd/seed --reset
```

Demo credentials:

| Role | Email | Password |
|---|---|---|
| Admin | `admin.demo@example.com` | `password123` |
| Customer | `customer.demo@example.com` | `password123` |
| Second customer | `customer.two.demo@example.com` | `password123` |

Included data:

- 3 verified demo accounts.
- 3 categories and 12 active products.
- 12 wishlist entries for pagination testing.
- Orders covering pending through refund requested.
- A verified product review.
- Addresses, shipping methods, and a promo code.
- A customer-support conversation and unread notifications.

Do not run the demo seeder against production databases.
