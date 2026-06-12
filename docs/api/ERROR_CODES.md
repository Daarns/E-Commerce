# API Error Codes

The API returns errors with this envelope:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

Clients should branch on `error.code`, not on `message`.

## Common Codes

| Code | HTTP | Meaning |
|---|---:|---|
| `INVALID_REQUEST` | 400 | Request body, query, or path parameter is malformed. |
| `VALIDATION_ERROR` | 400/422 | Request is well-formed but fails validation. |
| `UNAUTHORIZED` | 401 | Missing, expired, or invalid auth token. |
| `FORBIDDEN` | 403 | Authenticated user is not allowed to perform the action. |
| `NOT_FOUND` | 404 | Resource does not exist or is not visible to the current user. |
| `CONFLICT` | 409 | Duplicate request or business conflict. |
| `RATE_LIMITED` | 429 | Too many requests. Retry after the displayed cooldown. |
| `INTERNAL_ERROR` | 500 | Unexpected server error. |

## Auth

| Code | HTTP | Meaning |
|---|---:|---|
| `INVALID_CREDENTIALS` | 401 | Email/password is incorrect. |
| `ACCOUNT_SUSPENDED` | 403 | Account is suspended and cannot login. |
| `ACCOUNT_BANNED` | 403 | Account is banned and cannot login. |
| `EMAIL_NOT_VERIFIED` | 403 | Email verification is required. |
| `TOKEN_EXPIRED` | 401 | Token is expired. |
| `INVALID_TOKEN` | 401/400 | Token is invalid or malformed. |
| `EMAIL_ALREADY_EXISTS` | 409 | Email is already registered. |

## Product, Cart, Checkout

| Code | HTTP | Meaning |
|---|---:|---|
| `PRODUCT_NOT_FOUND` | 404 | Product does not exist or is not active. |
| `CATEGORY_NOT_FOUND` | 404 | Category does not exist. |
| `INSUFFICIENT_STOCK` | 409 | Requested quantity exceeds available stock. |
| `INVALID_QUANTITY` | 400 | Quantity is zero, negative, or above allowed limit. |
| `CART_EMPTY` | 400 | Checkout cannot continue with an empty cart. |
| `ADDRESS_REQUIRED` | 400 | Checkout requires a valid address. |
| `INVALID_SHIPPING_METHOD` | 400 | Shipping method is not available. |
| `PROMO_INVALID` | 400/404 | Promo code is invalid or not found. |
| `PROMO_EXPIRED` | 409 | Promo code has expired. |
| `PROMO_USAGE_LIMIT` | 409 | Promo code usage limit has been reached. |

## Payment And Orders

| Code | HTTP | Meaning |
|---|---:|---|
| `ORDER_NOT_FOUND` | 404 | Order does not exist or is not owned by the user. |
| `ORDER_NOT_CANCELLABLE` | 409 | Order status no longer allows cancellation. |
| `INVALID_STATUS_TRANSITION` | 409 | Requested fulfillment transition is not allowed. |
| `ALREADY_PAID` | 409 | Payment has already been completed. |
| `PAYMENT_GATEWAY_ERROR` | 502 | Midtrans or payment gateway returned an error. |
| `PAYMENT_UNAVAILABLE` | 503 | Payment service is temporarily unavailable. |
| `TRACKING_REQUIRED` | 400 | Shipping transition requires tracking number. |

## Refund

| Code | HTTP | Meaning |
|---|---:|---|
| `REFUND_NOT_ELIGIBLE` | 409 | Order status is not eligible for refund request. |
| `REFUND_WINDOW_EXPIRED` | 409 | Refund request is outside the allowed window. |
| `REFUND_LIMIT_REACHED` | 409 | User has reached the maximum refund request attempts. |
| `REFUND_EVIDENCE_LIMIT` | 400 | Refund evidence image count exceeds the maximum. |
| `REFUND_EVIDENCE_REQUIRED` | 400 | Refund evidence is required. |
| `REFUND_ALREADY_PROCESSED` | 409 | Refund has already been approved or rejected. |
| `MIDTRANS_REFUND_FAILED` | 502 | Refund request to Midtrans failed. |

## Chat And Notifications

| Code | HTTP | Meaning |
|---|---:|---|
| `CONVERSATION_NOT_FOUND` | 404 | Conversation does not exist or is not accessible. |
| `CONVERSATION_CLOSED` | 409 | Conversation is closed and cannot receive new messages. |
| `MESSAGE_EMPTY` | 400 | Chat message is empty. |
| `MESSAGE_TOO_LONG` | 400 | Chat message exceeds allowed length. |
| `CHAT_RATE_LIMITED` | 429 | Message sending is too frequent. |
| `NOTIFICATION_NOT_FOUND` | 404 | Notification does not exist or is not accessible. |

## Reviews

| Code | HTTP | Meaning |
|---|---:|---|
| `REVIEW_NOT_ELIGIBLE` | 409 | User has not completed an eligible order for the product. |
| `REVIEW_ALREADY_EXISTS` | 409 | User already reviewed the product/order. |
| `INVALID_RATING` | 400 | Rating is outside the allowed range. |
| `REVIEW_IMAGE_LIMIT` | 400 | Review images exceed maximum allowed count. |
| `REVIEW_BLOCKED_CONTENT` | 422 | Review contains blocked or abusive content. |
