# Dummy Data Documentation

## Overview
File `002_dummy_data.sql` berisi comprehensive test data untuk E-Commerce platform. Data ini dirancang untuk testing, development, dan demonstration purposes.

## Migration Structure

### Schema
```
002_dummy_data.sql
├── Users & Authentication (5 test users)
├── Categories (7 categories)
├── Products (10 products)
├── Product Images (4 images)
├── Product Variants (10 variants)
├── Product Specifications (8 specs)
├── Addresses (4 addresses)
├── Shopping Cart (4 cart items)
├── Promo Codes (4 promo codes)
├── Orders (4 orders)
├── Order Items (5 order items)
├── Order Status History (7 status transitions)
├── Reviews (4 reviews)
├── Review Helpful Votes (4 votes)
├── Wishlists (4 wishlist items)
└── Stock Alerts (2 alerts)
```

## Test Users

### Customer Users (3)
```
1. customer1@example.com (ID: 550e8400-e29b-41d4-a716-446655440001)
   Name: Budi Santoso
   Phone: 08123456789
   Role: customer
   Status: verified, active
   Last Login: NOW()
   
2. customer2@example.com (ID: 550e8400-e29b-41d4-a716-446655440002)
   Name: Siti Nurhaliza
   Phone: 08234567890
   Role: customer
   Status: verified, active
   Last Login: NOW()
   
3. customer3@example.com (ID: 550e8400-e29b-41d4-a716-446655440003)
   Name: Ahmad Wijaya
   Phone: 08345678901
   Role: customer
   Status: verified, active
   Last Login: NULL
```

### Admin User (1)
```
4. admin@example.com (ID: 550e8400-e29b-41d4-a716-446655440004)
   Name: Admin User
   Phone: 08456789012
   Role: admin
   Status: verified, active
```

### Unverified User (1)
```
5. unverified@example.com (ID: 550e8400-e29b-41d4-a716-446655440005)
   Name: Unverified User
   Phone: 08567890123
   Role: customer
   Status: NOT verified, active
```

**Default Password for all users:** `password123` (bcrypt hashed)

## Product Categories

### Main Categories (3)
- **Electronics** (slug: electronics)
  - Smartphones (4 products)
  - Laptops (3 products)
- **Fashion** (slug: fashion)
  - Men's Clothing
  - Women's Clothing
- **Home & Kitchen** (slug: home-kitchen)

## Products (10 Total)

### Smartphones (4)
1. iPhone 15 Pro
   - Price: ₹15,999,000 → ₹14,999,000 (sale)
   - Stock: 50 units
   - Variants: Storage (256GB, 512GB, 1TB), Color (Space Black, Gold, Silver)

2. Samsung Galaxy S24
   - Price: ₹13,999,000 → ₹12,999,000 (sale)
   - Stock: 75 units
   - Variants: Available

3. Google Pixel 8
   - Price: ₹10,999,000
   - Stock: 45 units

4. Xiaomi 14 Ultra
   - Price: ₹9,999,000 → ₹8,999,000 (sale)
   - Stock: 100 units

### Laptops (3)
1. MacBook Pro 16 M3
   - Price: ₹35,999,000 → ₹34,999,000 (sale)
   - Stock: 20 units

2. Dell XPS 15
   - Price: ₹24,999,000
   - Stock: 35 units

3. HP Pavilion 15
   - Price: ₹7,999,000 → ₹7,499,000 (sale)
   - Stock: 60 units

### Fashion (3)
1. Premium Cotton T-Shirt
   - Price: ₹299,000
   - Stock: 150 units
   - Variants: Size (S, M, L, XL)

2. Denim Jeans Blue
   - Price: ₹599,000
   - Stock: 200 units

3. Summer Dress
   - Price: ₹449,000
   - Stock: 80 units

## Promo Codes (4)

### Active Promo Codes
1. **WELCOME10**
   - Type: Percentage (10%)
   - Min Order: ₹500,000
   - Max Discount: ₹500,000
   - Usage Limit: 100 (45 used)
   - Per User: 1
   - Valid: -7 days to +30 days

2. **SAVE50K**
   - Type: Fixed (₹50,000)
   - Min Order: ₹1,000,000
   - Usage Limit: 200 (120 used)
   - Per User: 2
   - Valid: -7 days to +60 days

3. **SUMMER20**
   - Type: Percentage (20%)
   - Min Order: ₹2,000,000
   - Max Discount: ₹1,000,000
   - Usage Limit: 50 (38 used)
   - Per User: 1
   - Valid: -14 days to +7 days

### Expired Promo Code
4. **EXPIRED10** (Inactive)
   - Type: Percentage (15%)
   - Expired: 1 day ago

## Orders (4)

### Order 1: ORD-20260415-0001
- Customer: Budi Santoso (customer1)
- Status: **completed**
- Items: iPhone 15 Pro, T-Shirt
- Subtotal: ₹15,299,000
- Shipping: ₹50,000
- Total: ₹15,349,000

### Order 2: ORD-20260415-0002
- Customer: Budi Santoso (customer1)
- Status: **processing**
- Items: T-Shirt (2x)
- Subtotal: ₹599,000
- Promo: SAVE50K (-₹50,000)
- Shipping: ₹50,000
- Total: ₹599,000

### Order 3: ORD-20260415-0003
- Customer: Siti Nurhaliza (customer2)
- Status: **completed**
- Items: Samsung Galaxy S24
- Subtotal: ₹12,999,000
- Promo: SUMMER20 (-₹1,300,000)
- Shipping: ₹75,000
- Total: ₹11,774,000
- Notes: Gift wrapping requested

### Order 4: ORD-20260415-0004
- Customer: Ahmad Wijaya (customer3)
- Status: **pending**
- Items: MacBook Pro 16 M3
- Subtotal: ₹34,999,000
- Shipping: ₹100,000
- Total: ₹35,099,000

## Reviews (4)

All reviews from completed orders with 4-5 star ratings:
- iPhone 15 Pro: 5 stars
- T-Shirt: 4 stars
- Samsung Galaxy S24: 5 stars
- MacBook Pro 16 M3: 5 stars

Each review has helpful votes from other customers.

## Addresses (4)

- Budi Santoso: 2 addresses (home default, office)
- Siti Nurhaliza: 1 address (default)
- Ahmad Wijaya: 1 address (default)

## Cart Items (4)

### For Testing Cart Features
- customer1: iPhone 15 Pro (1x) + T-Shirt (2x)
- customer2: Samsung Galaxy S24 (1x)
- customer3: MacBook Pro (1x)

## Wishlists (4)

Test wishlist functionality with:
- customer1: 2 items (MacBook Pro, Dell XPS)
- customer2: 1 item (iPhone 15 Pro)
- customer3: 1 item (Samsung Galaxy S24)

## Stock Alerts (2)

Low stock alerts for:
- MacBook Pro 16 M3 (20 units, threshold 10) - NOT sent
- HP Pavilion 15 (8 units, threshold 10) - SENT

## How to Use

### 1. Load Dummy Data

```bash
# Connect to PostgreSQL
psql -h localhost -U postgres -d ecommerce

# Run migration file
\i backend/migrations/002_dummy_data.sql

# Or using docker
docker exec ecommerce-postgres psql -U postgres -d ecommerce -f /docker-entrypoint-initdb.d/002_dummy_data.sql
```

### 2. Verify Data

```sql
-- Check users count
SELECT COUNT(*) as total_users FROM users;

-- Check products
SELECT COUNT(*) as total_products FROM products;

-- Check orders
SELECT COUNT(*) as total_orders FROM orders;

-- View all users
SELECT id, email, name, role FROM users;

-- View product catalog
SELECT id, name, regular_price, sale_price, stock_quantity FROM products;
```

### 3. Test Scenarios

#### Authentication Testing
```bash
# Login as customer
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer1@example.com",
    "password": "password123"
  }'

# Login as admin
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

#### Product Browsing
- Test product listings with various filters
- Test search by brand/name
- Test category navigation
- Test product variants selection

#### Shopping Cart
- Add items from test cart data
- Apply promo codes
- Test variant selection
- Calculate totals with discounts

#### Order Management
- Retrieve existing orders
- Track order status
- View order history
- Test status transitions

#### Reviews & Ratings
- View existing reviews
- Filter by rating
- Test helpful votes
- Create new reviews (requires completed orders)

#### Wishlist
- Add/remove from wishlist
- Share wishlist
- Convert wishlist items to cart

## UUIDs Convention

All test data uses fixed UUIDs with patterns for easy identification:

```
550e8400-e29b-41d4-a716-446655440001  → User 1
660e8400-e29b-41d4-a716-446655440001  → Category 1
770e8400-e29b-41d4-a716-446655440001  → Product 1
880e8400-e29b-41d4-a716-446655440001  → Product Image
990e8400-e29b-41d4-a716-446655440001  → Product Variant
```

Pattern: `XXXXXXXXXXXXXXXXXXX-XXXXXXXX-XXXX-XXXX-XXXXXXXXXXXXXXX`
         First part changes by entity type, last part by sequence number

## Data Cleanup

### Remove All Test Data
```sql
-- Delete in order of foreign key dependencies
DELETE FROM review_helpful;
DELETE FROM review_images;
DELETE FROM reviews;
DELETE FROM stock_alerts;
DELETE FROM notifications;
DELETE FROM chat_messages;
DELETE FROM chat_sessions;
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

### Reset Sequences
```sql
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE products_id_seq RESTART WITH 1;
-- ... repeat for other tables
```

## Notes

- All timestamps use `NOW()` or relative dates (e.g., `NOW() - INTERVAL '7 days'`)
- Passwords are bcrypt hashed: `$2a$10$YIjlrPNoM0dVmN7DiRvHiOCJrMP9c.NtzHD7bQQf0RrGmfK9N5bYi` = `password123`
- Product images use placeholder URLs (via placeholder.com)
- Orders span different statuses for testing state transitions
- Promo codes include active, expired, and various discount types
- Reviews include ratings and helpful votes for testing aggregation

## Troubleshooting

### Data Not Loading
1. Ensure PostgreSQL extensions are installed: `uuid-ossp`, `pg_trgm`, `unaccent`
2. Check if base schema (001_initial_schema) is applied first
3. Verify UUID format is correct

### Duplicate Key Errors
1. Check if dummy data already exists
2. Clean up using SQL cleanup commands above
3. Re-run migration

### Missing Foreign Keys
1. Ensure order of table creation matches dependencies
2. Categories must exist before Products
3. Users must exist before Orders/Addresses
4. Products must exist before Orders/Cart Items

## Future Enhancements

- Add more product variants (colors, sizes combinations)
- Add complex order scenarios (cancelled, returned, refunded)
- Add payment transaction records
- Add customer support chat history
- Add admin activity logs
- Add inventory transaction history
- Add bulk product data for performance testing
