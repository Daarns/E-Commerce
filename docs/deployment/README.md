# Deployment Notes

This document is a deployment checklist, not a provider-specific guide.

## Production Services

Required services:

- PostgreSQL
- Redis
- Object storage compatible with the image upload flow
- Backend API runtime
- Frontend Next.js runtime
- SMTP provider
- Midtrans production account/keys
- Public domain with HTTPS

## Docker Guidance

- Use Docker Compose for local multi-service development.
- Use Dockerfiles or platform buildpacks for deployable backend/frontend application images.
- Backend image definition: `backend/Dockerfile`.
- Frontend image definition: `frontend/Dockerfile`.
- Do not bake ngrok into production app images. Ngrok is a local/sandbox tunnel tool, not an application dependency.
- If a team wants version-aligned local tunnels, add an optional Compose profile for ngrok and keep the auth token/domain in local environment variables, never in Git.

Build local app images:

```powershell
docker build -f backend/Dockerfile -t store-backend:local backend
docker build -f frontend/Dockerfile -t store-frontend:local frontend
```

For production, push versioned images to a registry and deploy the same image tag to staging and production. Do not use `latest` as the release reference.

## Backend Checklist

- Set `APP_ENV=production`.
- Use strong JWT access and refresh secrets.
- Use production PostgreSQL credentials.
- Use production Redis credentials.
- Configure CORS/origin settings for the production frontend domain.
- Configure object storage endpoint and public image URL.
- Configure SMTP with production sender identity.
- Configure Midtrans production server/client keys.
- Configure public webhook URL in Midtrans dashboard.
- Ensure logs do not print secrets, tokens, or payment credentials.

## Frontend Checklist

- Set `NEXT_PUBLIC_API_URL` to the production API URL.
- Set `INTERNAL_API_URL` to an API URL reachable from the frontend server runtime.
- Set `NEXT_PUBLIC_APP_URL` to the final HTTPS storefront domain.
- Set `SITE_INDEXING_ENABLED=true` only in production after the public domain is ready. Local and staging environments should keep it disabled.
- Set `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` to the production client key.
- Set `NEXT_PUBLIC_MIDTRANS_SNAP_URL` to the production Snap script URL if needed.
- Configure allowed remote image hosts in `next.config.ts`.
- Verify `/robots.txt` and `/sitemap.xml`, then submit the sitemap URL through Google Search Console.
- Run:

```powershell
npm run lint
npm run build
```

## Database Release Strategy

Initialize production with `database/schema.sql`. The demo seeder is only for local or isolated test environments and must not run against production.

## Storage/CDN

Local development uses SeaweedFS. Production should prefer a stable object storage and public delivery layer:

- S3-compatible bucket,
- CDN or image proxy,
- generated thumbnails/derivatives for product listing,
- cache headers for immutable product images.

## Security Checklist

- HTTPS only.
- Secure cookies in production.
- CORS limited to known domains.
- Rate limits enabled.
- Admin routes protected by role checks.
- Webhooks verified by signature.
- Upload size/type limits enforced.
- No `.env` files committed.

## Monitoring Checklist

Recommended production observability:

- API request logs with request IDs.
- Error tracking.
- Payment webhook logs.
- Background job/retry logs.
- Database slow query logging.
- Redis health alerts.
- Storage upload/delete error alerts.
