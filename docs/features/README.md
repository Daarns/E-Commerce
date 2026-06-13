# Feature Overview

## Customer

- Register, login, email verification, forgot/reset password.
- Browse products by category, search, price range, stock/category filters, and sort.
- Product detail with variants, gallery, stock, pricing, wishlist, cart, reviews.
- Wishlist with persistent state and badge updates.
- Cart with variant-aware items and quantity/stock validation.
- Checkout with address, shipping method, promo code, terms agreement, and Midtrans Snap payment.
- Customer order list and order detail.
- Continue pending payment.
- Cancel eligible unpaid orders.
- Confirm received/completed orders.
- Request refund with evidence images.
- Customer support chat and chat history.
- Notifications for payment/order/support events.
- Product reviews from eligible completed purchases.

## Admin

- Admin dashboard summary.
- Analytics for revenue, orders, customers, trends, and product performance.
- Product CRUD with image upload, variants, stock, category, status, and filters.
- Category CRUD.
- Order management and fulfillment status transitions.
- Tracking number update.
- Refund approval/rejection.
- User management with role/status controls.
- Review moderation.
- Promo code CRUD.
- Customer support chat inbox.
- Notifications and activity visibility.

## Backend Capabilities

- JWT auth with access and refresh token flow.
- Role-based access control.
- Redis-backed rate limits.
- Order idempotency and stock handling.
- Payment integration with Midtrans.
- Payment webhook processing.
- SeaweedFS-compatible object storage.
- WebSocket/realtime chat support.
- Structured domain layers.

## Roadmap

The current goal is to finish the platform scope through production-readiness cleanup rather than adding large new modules.

Recommended next steps:

1. Production deployment hardening and staging validation.
2. API documentation hardening:
   - request/response examples for critical endpoints,
   - error code table.
3. Final manual business-flow test:
   - checkout/payment,
   - fulfillment,
   - refund,
   - chat,
   - review,
   - notification,
   - admin user status.

## Known Limitations

- Local Lighthouse results are affected by Docker, SeaweedFS, and machine load.
- Product images still need production-grade thumbnail/CDN strategy.
- Public GitHub setup uses `database/schema.sql` and the optional synthetic demo seeder.
- Some advanced marketplace features are intentionally out of current scope, such as seller onboarding, shipping courier API integration, and full warehouse/return logistics.
