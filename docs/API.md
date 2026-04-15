# API Documentation

Base URL: `http://localhost:8080/api/v1`

## Authentication

### Register User

Create a new user account.

```
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response** (201 Created)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "customer"
    },
    "token": {
      "access_token": "eyJhbGc...",
      "refresh_token": "eyJhbGc...",
      "expires_in": 900
    }
  }
}
```

### Login User

Authenticate user and get tokens.

```
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response** (200 OK)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "customer"
    },
    "token": {
      "access_token": "eyJhbGc...",
      "refresh_token": "eyJhbGc...",
      "expires_in": 900
    }
  }
}
```

### Refresh Token

Get a new access token using refresh token.

```
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGc..."
}
```

### Get Current User

Get authenticated user profile.

```
GET /auth/me
Authorization: Bearer {access_token}
```

---

## Products

### List Products

Get paginated list of products with optional filters.

```
GET /products?page=1&limit=20&category=clothing&sort=newest&min_price=10000&max_price=500000
```

**Query Parameters**
- `page` (int) - Page number (default: 1)
- `limit` (int) - Items per page (default: 20)
- `category` (string) - Filter by category slug
- `sort` (string) - Sort by: newest, price_asc, price_desc
- `min_price` (int) - Minimum price filter
- `max_price` (int) - Maximum price filter
- `search` (string) - Search by product name

**Response** (200 OK)
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "uuid",
        "name": "Product Name",
        "slug": "product-name",
        "description": "...",
        "regular_price": 100000,
        "sale_price": 80000,
        "stock_quantity": 50,
        "category_id": "uuid",
        "brand": "Brand Name",
        "images": ["url1", "url2"],
        "rating": 4.5,
        "reviews_count": 12
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "total_pages": 8
    }
  }
}
```

### Get Product Detail

Get detailed information about a single product.

```
GET /products/{id}
```

**Response** (200 OK)
```json
{
  "success": true,
  "data": {
    "product": {
      "id": "uuid",
      "name": "Product Name",
      "slug": "product-name",
      "description": "Detailed description...",
      "regular_price": 100000,
      "sale_price": 80000,
      "stock_quantity": 50,
      "category": {
        "id": "uuid",
        "name": "Clothing",
        "slug": "clothing"
      },
      "brand": "Brand Name",
      "images": ["url1", "url2", "url3"],
      "variants": [
        {
          "id": "uuid",
          "name": "Color",
          "options": ["Red", "Blue", "Green"]
        }
      ],
      "rating": 4.5,
      "reviews": [
        {
          "user_name": "John",
          "rating": 5,
          "comment": "Great product!",
          "created_at": "2024-01-15"
        }
      ]
    },
    "related_products": []
  }
}
```

### Get Featured Products

Get featured products for homepage.

```
GET /products/featured?limit=8
```

### Get Categories

List all product categories.

```
GET /categories
```

---

## Shopping Cart

### Get Cart

Get current user's shopping cart.

```
GET /cart
Authorization: Bearer {access_token}
```

**Response** (200 OK)
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "product_id": "uuid",
        "product_name": "Product Name",
        "product_image": "url",
        "regular_price": 100000,
        "sale_price": 80000,
        "quantity": 2,
        "total": 160000
      }
    ],
    "totals": {
      "subtotal": 160000,
      "tax": 20000,
      "shipping": 50000,
      "total": 230000
    }
  }
}
```

### Add to Cart

Add product to shopping cart.

```
POST /cart/items
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "product_id": "uuid",
  "quantity": 2,
  "variant_selections": {
    "color": "Red",
    "size": "M"
  }
}
```

### Update Cart Item

Update quantity of cart item.

```
PUT /cart/items/{item_id}
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "quantity": 5
}
```

### Remove from Cart

Remove item from cart.

```
DELETE /cart/items/{item_id}
Authorization: Bearer {access_token}
```

---

## Checkout & Orders

### Create Order

Process checkout and create order.

```
POST /checkout
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "shipping_address": {
    "recipient_name": "John Doe",
    "phone": "+62812345678",
    "street": "Jl. Merdeka No. 1",
    "city": "Jakarta",
    "province": "DKI Jakarta",
    "postal_code": "12345"
  },
  "payment_method": "credit_card",
  "promo_code": "SUMMER2024"
}
```

**Response** (201 Created)
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "ORD-12345",
      "user_id": "uuid",
      "status": "pending_payment",
      "items": [...],
      "shipping_address": {...},
      "payment_method": "credit_card",
      "total": 230000,
      "created_at": "2024-04-14T10:30:00Z",
      "payment_url": "https://midtrans.com/..."
    }
  }
}
```

### Get Orders

Get user's order history.

```
GET /orders?page=1&limit=10&status=completed
Authorization: Bearer {access_token}
```

**Query Parameters**
- `page` (int) - Page number
- `limit` (int) - Items per page
- `status` (string) - Filter by status (pending, processing, shipped, delivered, cancelled)

### Get Order Detail

Get detailed information about specific order.

```
GET /orders/{order_id}
Authorization: Bearer {access_token}
```

---

## User Profile

### Get Profile

Get authenticated user's profile.

```
GET /users/profile
Authorization: Bearer {access_token}
```

### Update Profile

Update user profile information.

```
PUT /users/profile
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "John Doe Updated",
  "phone": "+62812345678"
}
```

### Get Addresses

Get user's saved shipping addresses.

```
GET /users/addresses
Authorization: Bearer {access_token}
```

### Create Address

Save new shipping address.

```
POST /users/addresses
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "label": "Home",
  "recipient_name": "John Doe",
  "phone": "+62812345678",
  "street": "Jl. Merdeka No. 1",
  "city": "Jakarta",
  "province": "DKI Jakarta",
  "postal_code": "12345",
  "is_default": true
}
```

### Update Address

Update shipping address.

```
PUT /users/addresses/{address_id}
Authorization: Bearer {access_token}
Content-Type: application/json
```

### Delete Address

Remove shipping address.

```
DELETE /users/addresses/{address_id}
Authorization: Bearer {access_token}
```

---

## Admin Endpoints

### Create Product (Admin)

```
POST /admin/products
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "New Product",
  "description": "Description",
  "regular_price": 100000,
  "sale_price": 80000,
  "stock_quantity": 100,
  "category_id": "uuid",
  "brand": "Brand",
  "images": ["url1", "url2"]
}
```

### Update Product (Admin)

```
PUT /admin/products/{product_id}
Authorization: Bearer {admin_token}
Content-Type: application/json
```

### Delete Product (Admin)

```
DELETE /admin/products/{product_id}
Authorization: Bearer {admin_token}
```

### Get All Orders (Admin)

```
GET /admin/orders?page=1&limit=50&status=pending
Authorization: Bearer {admin_token}
```

### Update Order Status (Admin)

```
PUT /admin/orders/{order_id}/status
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "status": "shipped",
  "tracking_number": "JNE123456789"
}
```

---

## Error Responses

### Bad Request (400)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "email": "Invalid email format",
      "password": "Password must be at least 8 characters"
    }
  }
}
```

### Unauthorized (401)

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing authentication token"
  }
}
```

### Forbidden (403)

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```

### Not Found (404)

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

### Server Error (500)

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Internal server error"
  }
}
```

---

## Rate Limiting

API implements rate limiting to prevent abuse:

- **Per IP**: 100 requests/minute for public endpoints
- **Per API Key**: 1000 requests/minute for authenticated endpoints
- **Per Endpoint**: Custom limits for sensitive operations

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1619872800
```

---

## Authentication Headers

All protected endpoints require Bearer token in Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Token types:
- **Access Token**: Valid for 15 minutes
- **Refresh Token**: Valid for 7 days

---

For more information, see [ARCHITECTURE.md](./ARCHITECTURE.md) or main [README.md](../README.md)
