# API Examples

Base URL:

```text
http://localhost:8080/api/v1
```

Authenticated examples use:

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

## Auth

### Register

```http
POST /auth/register
```

```json
{
  "name": "Demo Customer",
  "email": "customer@example.com",
  "password": "Password123!",
  "phone": "+6281234567890"
}
```

```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "customer@example.com",
      "name": "Demo Customer",
      "role": "customer"
    }
  }
}
```

### Login

```http
POST /auth/login
```

```json
{
  "email": "customer@example.com",
  "password": "Password123!"
}
```

```json
{
  "success": true,
  "data": {
    "access_token": "jwt",
    "refresh_token": "jwt",
    "user": {
      "id": "uuid",
      "email": "customer@example.com",
      "role": "customer"
    }
  }
}
```

## Products

### List Products

```http
GET /products?search=dress&category_id=<uuid>&min_price=50000&max_price=200000&sort_by=created_at&sort_order=desc&limit=20
```

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "uuid",
        "name": "Dress",
        "slug": "dress",
        "regular_price": "55000",
        "sale_price": null,
        "stock_quantity": 25,
        "images": [
          {
            "id": "uuid",
            "image_url": "http://localhost:8888/buckets/product-images/products/example.webp",
            "is_primary": true
          }
        ]
      }
    ],
    "meta": {
      "limit": 20,
      "has_next": true,
      "next_cursor": "opaque-cursor"
    }
  }
}
```

### Product Detail

```http
GET /products/dress
```

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Dress",
    "slug": "dress",
    "description": "Product description",
    "category": {
      "id": "uuid",
      "name": "Women's Clothing"
    },
    "variant_types": [],
    "combinations": [],
    "images": []
  }
}
```

## Cart

### Add Item

```http
POST /cart/items
```

```json
{
  "product_id": "uuid",
  "combination_id": "uuid",
  "quantity": 1
}
```

```json
{
  "success": true,
  "message": "Item added to cart",
  "data": {
    "id": "uuid",
    "product_id": "uuid",
    "quantity": 1,
    "unit_price": "87120"
  }
}
```

## Checkout

### Create Order And Payment

```http
POST /checkout
```

```json
{
  "address_id": "uuid",
  "shipping_method": "regular",
  "payment_method": "midtrans_snap",
  "customer_email": "buyer@example.com",
  "idempotency_key": "checkout-unique-key"
}
```

```json
{
  "success": true,
  "data": {
    "order": {
      "id": "uuid",
      "order_number": "ORD-20260612-abcdef12",
      "order_status": "pending",
      "payment_status": "pending_payment",
      "total": "170000"
    },
    "payment": {
      "snap_token": "midtrans-token",
      "redirect_url": "https://app.sandbox.midtrans.com/snap/v2/vtweb/..."
    }
  }
}
```

## Orders And Fulfillment

### Customer Order Detail

```http
GET /orders/{orderIdOrOrderNumber}
```

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "order_number": "ORD-20260612-abcdef12",
    "order_status": "delivered",
    "payment_status": "paid",
    "items": [],
    "status_history": []
  }
}
```

### Confirm Received

```http
POST /orders/{orderIdOrOrderNumber}/confirm-received
```

```json
{
  "success": true,
  "message": "Order marked as completed",
  "data": {
    "order_status": "completed"
  }
}
```

## Refund

### Request Refund

```http
POST /orders/{orderIdOrOrderNumber}/refund-request
```

Use multipart form data:

```text
reason=wrong_item
description=Produk yang diterima berbeda dari pesanan.
images=<file 1>
images=<file 2>
images=<file 3>
```

```json
{
  "success": true,
  "message": "Refund request submitted",
  "data": {
    "order_status": "refund_requested",
    "refund_attempt": 1,
    "evidence_count": 3
  }
}
```

### Admin Approve Refund

```http
POST /admin/orders/{orderId}/refund
```

```json
{
  "amount": 170000,
  "notes": "Refund approved after evidence review"
}
```

### Admin Reject Refund

```http
POST /admin/orders/{orderId}/refund/reject
```

```json
{
  "notes": "Evidence does not match refund policy"
}
```

## Chat

### Create Conversation

```http
POST /chat/conversations
```

```json
{
  "subject": "Barang belum sampai",
  "message": "Pesanan saya belum diterima.",
  "category": "support"
}
```

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "subject": "Barang belum sampai",
    "status": "open",
    "last_message": "Pesanan saya belum diterima."
  }
}
```

### Send Message

```http
POST /chat/conversations/{conversationId}/messages
```

```json
{
  "message": "Mohon dibantu cek resi.",
  "message_type": "text"
}
```

## Notifications

### List Notifications

```http
GET /notifications?limit=20&offset=0
```

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "type": "order_status",
        "title": "Pesanan diproses",
        "message": "Pesanan Anda sedang diproses.",
        "is_read": false,
        "created_at": "2026-06-12T10:00:00+07:00"
      }
    ],
    "unread_count": 1
  }
}
```

## Reviews

### Create Review

```http
POST /products/{identifier}/reviews
```

Use multipart form data:

```text
order_id=uuid
rating=5
title=
review_text=
images=<optional file>
```

```json
{
  "success": true,
  "message": "Review submitted",
  "data": {
    "id": "uuid",
    "rating": 5,
    "is_verified_purchase": true,
    "status": "approved"
  }
}
```

## Admin Users

### Update User Status

```http
PUT /admin/users/{id}/status
```

```json
{
  "status": "suspended",
  "reason": "Repeated policy violation"
}
```

```json
{
  "success": true,
  "message": "User status updated",
  "data": {
    "id": "uuid",
    "status": "suspended",
    "is_active": false
  }
}
```
