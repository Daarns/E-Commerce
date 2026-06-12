# Environment Variables

Use `.env.example`, `.env.local.example`, or this document as a reference. Real local environment files are intentionally excluded from version control.

## Backend

Backend env file:

```text
backend/.env
```

Common local variables:

| Variable | Purpose | Local example |
|---|---|---|
| `APP_ENV` | Runtime mode | `development` |
| `APP_URL` | Frontend/base app URL for redirects | `http://localhost:3000` |
| `PORT` | Backend HTTP port | `8080` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | PostgreSQL user | `postgres` |
| `DB_PASSWORD` | PostgreSQL password | `postgres` |
| `DB_NAME` | PostgreSQL database | `ecommerce_db` |
| `REDIS_ADDR` | Redis address | `localhost:6479` |
| `REDIS_PASSWORD` | Redis password | `redis_password` |
| `JWT_ACCESS_SECRET` | Access token signing secret | use a long local secret |
| `JWT_REFRESH_SECRET` | Refresh token signing secret | use a different long local secret |
| `MIDTRANS_SERVER_KEY` | Midtrans server key | sandbox server key |
| `MIDTRANS_CLIENT_KEY` | Midtrans client key | sandbox client key |
| `SEAWEEDFS_ENDPOINT` | Backend S3-compatible endpoint | `localhost:8333` or Docker network endpoint |
| `SEAWEEDFS_PUBLIC_URL` | Stored/public base URL | `http://localhost:8333` |
| `SEAWEEDFS_BUCKET` | Image bucket | `product-images` |
| `SMTP_HOST` | Email SMTP host | provider-specific |
| `SMTP_PORT` | Email SMTP port | `587` |
| `SMTP_USER` | Email username | provider-specific |
| `SMTP_PASSWORD` | Email app password | provider-specific |
| `APP_TIMEZONE` | Application timezone | `Asia/Jakarta` |

## Frontend

Frontend env file:

```text
frontend/.env.local
```

Common variables:

| Variable | Purpose | Local example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | API base URL. Optional because code defaults to local backend. | `http://localhost:8080/api/v1` |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | Midtrans Snap client key | sandbox client key |
| `NEXT_PUBLIC_MIDTRANS_SNAP_URL` | Midtrans Snap script URL | `https://app.sandbox.midtrans.com/snap/snap.js` |

## Secret Handling

- `.env`, `.env.local`, and real API keys should stay local.
- Access and refresh tokens use separate JWT secrets.
- Gmail SMTP uses Google App Passwords when Gmail is the provider.
- Midtrans local testing uses sandbox keys.
- Exposed secrets should be rotated.
