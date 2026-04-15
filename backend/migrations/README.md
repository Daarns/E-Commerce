# SQL Dummy Data - Quick Reference

## Files Created ✅

| File | Size | Purpose |
|------|------|---------|
| `backend/migrations/002_dummy_data.sql` | 20.9 KB | Complete test data SQL script |
| `backend/migrations/DUMMY_DATA_GUIDE.md` | 10.2 KB | Detailed documentation & usage guide |

## Data Loaded

### Users (5)
```
✓ 3 Active Customers
✓ 1 Admin Account
✓ 1 Unverified Account
Default Password: password123
```

### Products (10)
```
✓ 4 Smartphones (iPhone, Samsung, Google, Xiaomi)
✓ 3 Laptops (MacBook, Dell, HP)
✓ 3 Fashion Items (T-Shirt, Jeans, Dress)
✓ Full variants (Storage, Color, Size)
✓ Complete specifications
```

### Orders (4)
```
✓ 2 Completed Orders
✓ 1 Processing Order
✓ 1 Pending Order
✓ Full status history for each
✓ Order items with pricing snapshots
```

### Catalog Support
```
✓ 7 Categories (with parent-child relationships)
✓ 10 Products with 110 file records
✓ 4 Product Images
✓ 10 Product Variants
✓ 8 Product Specifications
```

### Shopping Features
```
✓ 4 Cart Items (for different users)
✓ 4 Addresses (default + alternate)
✓ 4 Wishlist Entries
✓ 2 Stock Alerts (low stock tracking)
```

### Promotional Features
```
✓ 4 Promo Codes (3 active, 1 expired)
  - WELCOME10 (10% discount)
  - SAVE50K (50K flat discount)
  - SUMMER20 (20% discount)
  - EXPIRED10 (expired code)
✓ Promo code usage tracking
```

### Reviews & Community
```
✓ 4 Product Reviews (4-5 star ratings)
✓ 4 Helpful Votes
✓ Review images support
```

## UUID Convention Used

All test data uses consistent UUID patterns:
- Users: `550e8400-...` + sequence
- Categories: `660e8400-...` + sequence
- Products: `770e8400-...` + sequence
- Images: `880e8400-...` + sequence
- Variants: `990e8400-...` + sequence
- Other: `aa0e8400-...` through `kk0e8400-...`

Pattern makes it easy to identify record types in queries.

## To Load the Data

### Option 1: Using psql CLI
```bash
psql -h localhost -U postgres -d ecommerce -f backend/migrations/002_dummy_data.sql
```

### Option 2: Using Docker
```bash
docker exec ecommerce-postgres psql -U postgres -d ecommerce -f /docker-entrypoint-initdb.d/002_dummy_data.sql
```

### Option 3: Inside psql
```sql
\i backend/migrations/002_dummy_data.sql
```

## To Verify Data Loaded

```sql
-- Count all tables
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'categories', COUNT(*) FROM categories
UNION ALL SELECT 'reviews', COUNT(*) FROM reviews
ORDER BY table_name;
```

Expected output:
```
categories        7
orders            4
products          10
reviews           4
users             5
```

## Test Users for Login

| Email | Password | Role | Has Orders |
|-------|----------|------|-----------|
| customer1@example.com | password123 | customer | ✓ Yes (2) |
| customer2@example.com | password123 | customer | ✓ Yes (1) |
| customer3@example.com | password123 | customer | ✓ Yes (1) |
| admin@example.com | password123 | admin | ✗ No |
| unverified@example.com | password123 | customer | ✗ No |

## Promo Codes for Testing

| Code | Type | Discount | Min Order | Status |
|------|------|----------|-----------|--------|
| WELCOME10 | Percentage | 10% | 500K | Active ✓ |
| SAVE50K | Fixed | 50K | 1M | Active ✓ |
| SUMMER20 | Percentage | 20% | 2M | Active ✓ |
| EXPIRED10 | Percentage | 15% | 500K | Expired ✗ |

## Usage in Testing

### Test Authentication
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer1@example.com",
    "password": "password123"
  }'
```

### Test Product Listing
```bash
curl http://localhost:8080/api/v1/products
curl http://localhost:8080/api/v1/products?category_id=660e8400-e29b-41d4-a716-446655440004
```

### Test Order History
```bash
curl http://localhost:8080/api/v1/orders \
  -H "Authorization: Bearer {TOKEN}"
```

### Test Promo Code
```bash
curl -X POST http://localhost:8080/api/v1/cart/apply-promo \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "promo_code": "WELCOME10"
  }'
```

## Data Relationships

```
Users (5)
  ├─ Addresses (4) - user has multiple addresses
  ├─ Cart Items (4) - user has cart
  ├─ Orders (4) - user has orders
  │   ├─ Order Items (5) - order contains items
  │   └─ Order Status History (7) - order status changes
  ├─ Wishlists (4) - user has wishlist
  ├─ Reviews (4) - user can review
  ├─ Review Helpful (4) - user can vote on reviews
  └─ Promo Usage - user can use promo codes

Products (10)
  ├─ Categories (7) - product belongs to category
  ├─ Product Images (4) - product has images
  ├─ Product Variants (10) - product has variants
  ├─ Product Specifications (8) - product has specs
  ├─ Cart Items (4) - product can be in cart
  ├─ Order Items (5) - product can be ordered
  ├─ Reviews (4) - product has reviews
  ├─ Wishlists (4) - product can be in wishlist
  └─ Stock Alerts (2) - product stock tracking
```

## Cleanup If Needed

```sql
-- Delete in reverse dependency order
DELETE FROM review_helpful;
DELETE FROM reviews;
DELETE FROM stock_alerts;
DELETE FROM wishlists;
DELETE FROM promo_code_usages;
DELETE FROM order_status_history;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM cart_items;
DELETE FROM addresses;
DELETE FROM product_specifications;
DELETE FROM product_variants;
DELETE FROM product_images;
DELETE FROM products;
DELETE FROM promo_codes;
DELETE FROM categories;
DELETE FROM refresh_tokens;
DELETE FROM users;
```

## What's Next?

After loading dummy data:

1. **Test API Endpoints**
   - Use test users to authenticate
   - Make API calls with dummy data
   - Verify response formats

2. **Test Frontend**
   - Login with test user
   - Browse products
   - Add to cart
   - Apply promo codes
   - Checkout with test address

3. **Test Admin Features**
   - Login as admin
   - View order management
   - Track inventory
   - Monitor reviews

4. **Performance Testing**
   - Test search functionality
   - Test filtering
   - Test pagination
   - Monitor database query performance

## Notes

- All timestamps use NOW() or relative dates
- Passwords are bcrypt hashed
- Product images use placeholder service URLs
- Stock quantities are realistic for testing
- Order statuses show complete lifecycle
- Promo codes include various discount types
- Reviews span different rating levels

## Documentation

For comprehensive documentation, see:
- `backend/migrations/DUMMY_DATA_GUIDE.md` - Detailed guide with all data
- `backend/migrations/001_initial_schema.up.sql` - Schema definition
- `backend/migrations/002_dummy_data.sql` - Actual test data
