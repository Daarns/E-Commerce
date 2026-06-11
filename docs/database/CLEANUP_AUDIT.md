# Database Cleanup Audit

Date: 2026-06-12

Scope: database cleanup for current platform scope. This document records which relations were removed, which relations remain active, and which areas are still candidates for later simplification.

## Method

Checked:

- PostgreSQL relations in the `public` schema.
- Backend references in `backend/internal`, `backend/pkg`, and `backend/cmd`.
- Frontend references in `frontend/src`.
- Runtime wiring in `backend/cmd/api/main.go`.
- Business scope confirmed during current review.

Row count was not used as the deciding factor. Usage in code and current feature scope are more important than whether a local table happens to be empty.

## Removed

These objects were removed from the local database after related code/UI references were cleaned up:

| Relation | Type | Reason |
|---|---|---|
| `stock_alerts` | Table | No active "notify me when back in stock" customer flow exists. The shop/admin stock display uses product/variant stock data directly. |
| `newsletter_subscriptions` | Table | Newsletter subscription is out of current scope. Backend route/service/repository/model and frontend newsletter UI were removed. |
| `product_specifications` | Table | No active backend/frontend flow uses structured product specifications. Current product detail uses description, category, variants, images, stock, and reviews. |
| `dashboard_stats` | Materialized view | No active code reference was found. Admin dashboard metrics are computed through service/query logic, not this view. |

Notes:

- `products.stock_alert_threshold` was kept. It is a product-level threshold field used by low-stock logic/discovery scoring, and it is not the removed `stock_alerts` subscription table.
- Development migrations may still contain historical definitions for removed objects while this project is still on the develop branch. Final `main` consolidation should use a clean schema dump instead of carrying the full incremental migration history.
- A forward cleanup migration was added as `038_drop_unused_relations` for develop-branch continuity.

## Keep

These are part of active app flows or important infrastructure:

| Relation | Reason |
|---|---|
| `users` | Auth, admin users, ownership across many domains |
| `refresh_tokens` | Refresh token persistence |
| `addresses` | Checkout shipping address |
| `categories` | Product browsing/admin category |
| `products` | Catalog core |
| `product_images` | Product/gallery/variant image display |
| `product_variant_types` | Variant type model |
| `product_variant_options` | Variant option model |
| `product_variant_combinations` | Purchasable variant SKU/stock |
| `product_combination_options` | Join table for combination options |
| `cart_items` | Cart persistence |
| `orders` | Order/payment/fulfillment core |
| `order_items` | Order line items |
| `order_status_workflows` | Fulfillment timeline/history |
| `order_refund_images` | Refund evidence images |
| `shipping_methods` | Checkout shipping options |
| `promo_codes` | Promo admin/checkout validation |
| `promo_code_usages` | Promo redemption tracking |
| `notifications` | User/admin notification feature |
| `product_reviews` | Review core |
| `review_images` | Review image attachments |
| `review_helpful_votes` | Helpful/unhelpful review vote |
| `wishlists` | Wishlist feature |
| `conversations` | Chat conversation list/detail |
| `chat_messages` | Chat message persistence |
| `conversation_metadata` | Active chat metadata write/read flow |
| `typing_indicators` | Active chat typing indicator feature |
| `temp_uploads` | Upload staging/SeaweedFS bridge, including recovery/cleanup when object storage has issues |
| `webhook_events` | Midtrans webhook idempotency |
| `email_queues` | Async auth/order/status email queue |
| `activity_logs` | Admin activity/user activity endpoints |
| `search_analytics` | Search history and admin search metrics |
| `search_suggestions` | Autocomplete/popular search |
| `schema_migrations` | Development migration tracking |

## Deferred Column Review

These columns are not immediate drop targets, but may be simplified later if the corresponding feature remains out of scope in the final release.

| Table | Columns | Note |
|---|---|---|
| `products` | `weight`, `length`, `width`, `height` | Useful for courier/warehouse integrations; not critical for current flat shipping method |
| `products` | `canonical_url`, `og_image`, `meta_title`, `meta_description` | SEO-oriented fields; keep if SEO work remains planned |
| `conversation_metadata` | `satisfaction_score`, `feedback_text`, `resolution_category` | Useful only if chat satisfaction/analytics are implemented |

## Verification

Executed after cleanup:

```powershell
docker exec ecommerce-postgres psql -U postgres -d ecommerce_db -c "DROP MATERIALIZED VIEW IF EXISTS dashboard_stats; DROP TABLE IF EXISTS stock_alerts; DROP TABLE IF EXISTS product_specifications; DROP TABLE IF EXISTS newsletter_subscriptions;"

docker exec ecommerce-postgres psql -U postgres -d ecommerce_db -Atc "SELECT 'table:' || table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('stock_alerts','product_specifications','newsletter_subscriptions') UNION ALL SELECT 'matview:' || matviewname FROM pg_matviews WHERE schemaname='public' AND matviewname='dashboard_stats';"
```

The verification query returned no rows, meaning those four database objects are no longer present.

`038_drop_unused_relations` was also recorded in `schema_migrations` after the manual cleanup SQL was applied. The current migration runner still has historical migration issues in earlier files when re-run on this local database, so the final `main` setup should continue to rely on the planned clean schema dump.

## Next Checks

Completed after cleanup:

```powershell
cd backend
go build ./...

cd ../frontend
npm run lint
npm run build
```

Result:

- `go build ./...`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
