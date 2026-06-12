# Testing Guide

This project uses a practical testing approach: run fast automated checks for changed code and keep manual tests for full business flows such as payment sandbox and fulfillment.

## Frontend Checks

```powershell
cd frontend
npm run lint
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
go build ./...
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
