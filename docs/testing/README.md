# Testing Guide

This project uses a layered automated suite. Unit tests cover isolated logic, Playwright API tests cover HTTP contracts and security boundaries, and browser tests cover critical storefront behavior on desktop and mobile.

## Complete Automated Suite

Frontend unit tests:

```powershell
cd frontend
npm run test:unit
```

API black-box tests require the backend on port `8080`:

```powershell
cd frontend
npm run test:api
```

Browser tests reuse the frontend on `http://localhost:3000`, or start the current standalone build when the port is free:

```powershell
cd frontend
npm run test:e2e
```

Backend tests:

```powershell
cd backend
go test ./...
```

Test source layout:

- `frontend/tests/unit`: Vitest utility and transformation tests.
- `frontend/tests/api`: public API, auth boundary, customer/admin, IDOR, pagination, and edge/security tests.
- `frontend/tests/e2e`: storefront, auth guard, responsive, SEO, robots, and sitemap tests.
- `backend/tests/unit`: service, repository, handler, chat, refund, review, auth, and product tests.
- Backend test files are centralized under `backend/tests`; production handler, service, and repository folders do not contain test files.

Authenticated API checks use dedicated test credentials. They are skipped when these variables are absent:

```powershell
$env:TEST_CUSTOMER_EMAIL='customer.test@example.com'
$env:TEST_CUSTOMER_PASSWORD='test-password'
$env:TEST_SECOND_CUSTOMER_EMAIL='customer.two.test@example.com'
$env:TEST_SECOND_CUSTOMER_PASSWORD='test-password'
$env:TEST_ADMIN_EMAIL='admin.test@example.com'
$env:TEST_ADMIN_PASSWORD='test-password'
```

Do not use production credentials or production databases for mutation-capable tests.

## Frontend Checks

```powershell
cd frontend
npm run lint
npx tsc --noEmit
npm run build
```

Optional browser checks:

- Product listing renders products.
- Product quick view opens.
- Cart/wishlist badges update after add/remove.
- Checkout page loads without layout shift or console errors.
- Payment Snap opens from checkout.
- Auth pages redirect correctly when already logged in.

## Backend Checks

```powershell
cd backend
go test ./...
go build -buildvcs=false ./...
```

Use targeted tests for domains that changed:

```powershell
go test ./internal/services/order/...
go test ./internal/handlers/...
go test ./internal/repositories/...
```

Adjust package paths to the actual package being changed.

## Infrastructure Smoke

```powershell
docker ps
curl.exe http://localhost:8080/api/v1/ping
curl.exe "http://localhost:8080/api/v1/products?limit=5"
```

Expected:

- Docker containers are healthy.
- API ping returns `200`.
- Product list returns `200`.

## Manual Business Flow Checklist

Checkout/payment:

- User can checkout with address and shipping method.
- Midtrans Snap opens.
- Payment success updates `payment_status` to `paid`.
- Order status moves to `payment_confirmed`.
- Payment method details are stored when available.

Fulfillment:

- Admin can move `payment_confirmed -> processing`.
- Admin can add tracking and move `processing -> shipped`.
- Admin can move `shipped -> delivered`.
- User can confirm received/completed.
- Payment status remains separate from fulfillment status.

Refund:

- Completed order can request refund.
- Evidence image upload is capped.
- Admin can approve refund.
- Admin can reject refund.
- User cannot exceed refund attempt limit.

Chat:

- User can create conversation.
- Admin can see conversation in inbox.
- User/admin can exchange messages.
- Closed conversation cannot receive new messages.
- Error message is user-friendly.

Notifications:

- User receives order/payment/status notifications.
- Admin/customer notification summary loads without 500.
- Mark read/read all works.

Reviews:

- Only eligible completed-order products can be reviewed.
- Rating-only review works.
- Review image limit is enforced.
- Review pagination/load more works.

## Performance Audit

Use Lighthouse/Playwright after infrastructure is healthy:

- Docker containers healthy.
- Backend responds quickly.
- SeaweedFS image URLs are reachable.
- Frontend runs through `npm run start` after `npm run build`.

Tracked routes:

- `/`
- `/products`
- `/products/:slug`
- `/wishlist`
- `/cart`
- `/checkout`

Current important metrics:

- CLS target is below `0.1`.
- LCP/TBT still need production-oriented image and bundle optimization.
