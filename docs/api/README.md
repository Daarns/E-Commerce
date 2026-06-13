# API Overview

Base URL:

```text
http://localhost:8080/api/v1
```

Health checks:

```text
GET /health
GET /api/v1/ping
```

## Response Shape

Most API responses use a consistent envelope:

```json
{
  "success": true,
  "message": "optional message",
  "data": {}
}
```

Error responses use:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

Detailed references:

- [Request and response examples](./EXAMPLES.md)
- [Error code registry](./ERROR_CODES.md)

## Authentication

JWT bearer tokens are used for authenticated endpoints.

```http
Authorization: Bearer <access_token>
```

Auth endpoints:

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register account |
| `POST` | `/auth/login` | Public | Login and receive tokens |
| `POST` | `/auth/refresh` | Public | Refresh access token |
| `POST` | `/auth/verify-email` | Public | Verify email |
| `POST` | `/auth/resend-verification-email` | Public | Resend verification email |
| `POST` | `/auth/forgot-password` | Public | Request password reset |
| `POST` | `/auth/reset-password` | Public | Reset password |
| `POST` | `/auth/logout` | Customer/Admin | Logout |
| `GET` | `/auth/me` | Customer/Admin | Current profile |
| `PUT` | `/auth/me` | Customer/Admin | Update profile |
| `PUT` | `/auth/me/password` | Customer/Admin | Change password |
| `DELETE` | `/auth/me` | Customer/Admin | Delete account |

## Public Storefront

Categories:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/categories` | List categories |
| `GET` | `/categories/tree` | Category tree |
| `GET` | `/categories/root` | Root categories |
| `GET` | `/categories/:identifier` | Category detail by ID or slug |
| `GET` | `/categories/:identifier/products` | Category with products |

Products:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/products` | Product listing with filters |
| `GET` | `/products/search` | Product search |
| `GET` | `/products/featured` | Featured products |
| `GET` | `/products/:identifier` | Product detail by ID or slug |
| `GET` | `/products/:identifier/related` | Related products |
| `GET` | `/products/:productId/reviews` | Product reviews by UUID |
| `GET` | `/products/:productId/review-stats` | Review summary by UUID |

Search:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/search` | Search products |
| `GET` | `/search/autocomplete` | Autocomplete suggestions |
| `GET` | `/search/popular` | Popular searches |
| `GET` | `/search/facets` | Search facets |
| `GET` | `/search/filters` | Filter metadata |
| `GET` | `/search/trending-products` | Trending products |
| `POST` | `/search/click` | Track product click |

Shipping:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/shipping/methods` | Available shipping methods |

## Customer Endpoints

Wishlist uses optional auth/session behavior:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/wishlist` | Get wishlist |
| `GET` | `/wishlist/count` | Wishlist count |
| `POST` | `/wishlist` | Add product |
| `DELETE` | `/wishlist` | Remove product |
| `POST` | `/wishlist/toggle` | Toggle product |
| `POST` | `/wishlist/check` | Check product |
| `POST` | `/wishlist/clear` | Clear wishlist |

Cart:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/cart` | Current cart |
| `GET` | `/cart/summary` | Cart summary |
| `POST` | `/cart/items` | Add item |
| `PUT` | `/cart/items/:itemId` | Update item quantity |
| `DELETE` | `/cart/items/:itemId` | Remove item |
| `DELETE` | `/cart` | Clear cart |
| `POST` | `/cart/refresh` | Refresh cart prices |

Addresses:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/addresses` | List addresses |
| `GET` | `/addresses/:id` | Address detail |
| `POST` | `/addresses` | Create address |
| `PUT` | `/addresses/:id` | Update address |
| `DELETE` | `/addresses/:id` | Delete address |
| `PUT` | `/addresses/:id/default` | Set default address |

Checkout and orders:

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/checkout` | Create order and payment token |
| `POST` | `/promo-codes/validate` | Validate promo code |
| `GET` | `/orders` | Customer order list |
| `GET` | `/orders/:id` | Customer order detail |
| `POST` | `/orders/:id/cancel` | Cancel eligible order |
| `POST` | `/orders/:id/confirm-delivery` | Confirm delivered state |
| `POST` | `/orders/:id/confirm-received` | Confirm completed/received |
| `POST` | `/orders/:id/refund-request` | Request refund with evidence |
| `POST` | `/orders/:id/pay` | Resume pending payment |
| `POST` | `/orders/:id/sync-payment` | Sync payment status |

Reviews:

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/products/:identifier/reviews` | Create review for eligible completed order |
| `GET` | `/products/:identifier/review-eligibility` | Check review eligibility |
| `PUT` | `/products/:identifier/reviews/:reviewID` | Update own review |
| `DELETE` | `/products/:identifier/reviews/:reviewID` | Delete own review |
| `POST` | `/reviews/:reviewID/helpful` | Helpful/unhelpful vote |

Notifications:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/notifications` | List notifications |
| `GET` | `/notifications/summary` | Unread summary |
| `PUT` | `/notifications/read-all` | Mark all read |
| `PUT` | `/notifications/:id/read` | Mark one read |

Chat:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/chat/ws` | WebSocket endpoint |
| `POST` | `/chat/conversations` | Create conversation |
| `GET` | `/chat/conversations` | List own conversations |
| `GET` | `/chat/conversations/:id` | Conversation detail |
| `POST` | `/chat/conversations/:id/messages` | Send message |
| `GET` | `/chat/conversations/:id/messages` | Message pagination |
| `POST` | `/chat/conversations/:id/typing` | Typing indicator |
| `GET` | `/chat/conversations/:id/typing` | Typing users |
| `PUT` | `/chat/conversations/:id/read` | Mark conversation read |
| `PUT` | `/messages/:id/read` | Mark message read |

## Admin Endpoints

Admin routes require authentication and `admin` role.

Dashboard and analytics:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/admin/dashboard/summary` | Dashboard summary |
| `GET` | `/admin/analytics/revenue` | Revenue metrics |
| `GET` | `/admin/analytics/orders` | Order analytics |
| `GET` | `/admin/analytics/customers` | Customer analytics |
| `GET` | `/admin/analytics/revenue-trends` | Monthly revenue trend |
| `GET` | `/admin/analytics/products` | Product performance |

Admin products and categories:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/admin/products` | Admin product listing |
| `POST` | `/admin/products` | Create product |
| `GET` | `/admin/products/:id` | Product detail |
| `PUT` | `/admin/products/:id` | Update product |
| `DELETE` | `/admin/products/:id` | Delete/archive product |
| `POST` | `/admin/products/upload-image` | Upload temp image |
| `POST` | `/admin/products/:id/images` | Attach product image |
| `PUT` | `/admin/products/:id/images/reorder` | Reorder images |
| `DELETE` | `/admin/product-images` | Delete uploaded temp image |
| `DELETE` | `/admin/product-images/:imageId` | Delete product image |
| `GET` | `/admin/categories` | List categories |
| `POST` | `/admin/categories` | Create category |
| `PUT` | `/admin/categories/:id` | Update category |
| `DELETE` | `/admin/categories/:id` | Delete category |

Admin orders and refunds:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/admin/orders` | Admin order list |
| `GET` | `/admin/orders/summary` | Order summary |
| `GET` | `/admin/orders/:id` | Order detail |
| `PUT` | `/admin/orders/:id/status` | Fulfillment status transition |
| `PUT` | `/admin/orders/:id/payment` | Payment status update |
| `PUT` | `/admin/orders/:id/tracking` | Tracking number update |
| `PUT` | `/admin/orders/:id/notes` | Admin notes |
| `POST` | `/admin/orders/:id/refund` | Approve/process refund |
| `POST` | `/admin/orders/:id/refund/reject` | Reject refund |

Admin users:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/admin/users` | User list |
| `GET` | `/admin/users/metrics` | User metrics |
| `GET` | `/admin/users/export` | CSV export |
| `GET` | `/admin/users/:id` | User detail |
| `GET` | `/admin/users/:id/activity` | User activity |
| `PUT` | `/admin/users/:id/status` | Active/suspended/banned status |
| `PUT` | `/admin/users/:id/role` | Update role |

Admin chat:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/admin/chat/summary` | Chat metrics |
| `GET` | `/admin/chat/conversations` | Admin inbox |
| `GET` | `/admin/chat/conversations/:id` | Conversation detail |
| `GET` | `/admin/chat/conversations/:id/messages` | Messages |
| `POST` | `/admin/chat/conversations/:id/messages` | Reply |
| `POST` | `/admin/chat/conversations/:id/typing` | Typing indicator |
| `GET` | `/admin/chat/conversations/:id/typing` | Typing users |
| `PUT` | `/admin/chat/conversations/:id/read` | Mark read |
| `PUT` | `/admin/chat/conversations/:id/status` | Open/close conversation |

Admin reviews and promos:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/admin/reviews` | Review moderation list |
| `PUT` | `/admin/reviews/:id/status` | Update review status |
| `GET` | `/admin/promos` | Promo code list |
| `POST` | `/admin/promos` | Create promo code |
| `GET` | `/admin/promos/:id` | Promo detail |
| `PUT` | `/admin/promos/:id` | Update promo code |
| `DELETE` | `/admin/promos/:id` | Delete promo code |

## Webhooks

Midtrans webhook routes are registered outside `/api/v1` and are public but verified by Midtrans signature in the payment webhook service.

For local testing, expose backend port `8080` through ngrok and configure the Midtrans sandbox webhook URL to point to that public URL.

## Rate Limits

The backend uses Redis-backed rate limits:

- Global public API limit.
- Stricter auth endpoint limits.
- Per-user protected API limit.
- Upload, chat, typing, and refund evidence-specific limits.
