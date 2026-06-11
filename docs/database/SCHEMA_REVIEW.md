# Database Schema Review

Date: 2026-06-12

Scope: inventory of remaining database tables/columns after cleanup. No additional relation or column was dropped in this review.

## Summary

The previous cleanup removed the clearly unused objects:

- `stock_alerts`
- `newsletter_subscriptions`
- `product_specifications`
- `dashboard_stats`

After that cleanup, no other table is currently safe to drop without touching active application flows.

## Tables Reviewed

| Relation | Status | Notes |
|---|---|---|
| `conversation_metadata` | Keep | Active in chat repository/service. Some columns are future-facing, but the table is part of the current chat write path. |
| `typing_indicators` | Keep | Active chat typing feature. |
| `temp_uploads` | Keep | Upload staging and SeaweedFS recovery/cleanup bridge. Keep even when empty. |
| `search_analytics` | Keep | Search tracking/admin metrics. |
| `search_suggestions` | Keep | Search suggestions/autocomplete. |
| `activity_logs` | Keep | Admin/user activity endpoints. |
| `email_queues` | Keep | Auth/order/status async email queue. |
| `webhook_events` | Keep | Midtrans webhook idempotency. |

## Column Candidates For Later Simplification

These are not immediate drop targets. They should only be removed after the corresponding UI/API contracts are simplified.

| Table | Columns | Current Touchpoints | Risk | Recommendation |
|---|---|---|---|---|
| `products` | `weight`, `length`, `width`, `height` | Backend product model. Frontend admin product service/types include image `width`/`height`, but product physical dimensions are not a visible current workflow. | Medium. Future shipping/courier integrations may need these fields. | Keep for now. Drop later only if shipping remains flat/manual and admin product schema is simplified. |
| `products` | `canonical_url`, `og_image` | Backend product create/update DTO/service/repository and frontend admin product service/types. | Medium. SEO/social sharing work may use them later. | Keep until final SEO scope is decided. |
| `products` | `meta_title`, `meta_description` | Backend product create/update DTO/service/repository, frontend admin product form/sidebar. | Low-medium. These are visible in admin product form. | Keep unless the SEO fields are removed from admin UI. |
| `conversation_metadata` | `avg_response_time_seconds`, `satisfaction_score`, `feedback_text`, `resolution_category` | Backend chat model/table. No frontend feedback UI yet. | Medium. Dropping requires chat metadata model/migration changes. | Keep for now; simplify later if chat analytics/satisfaction feedback stays out of scope. |
| `products` | `allow_backorders` | Backend product model. | Low-medium. No current customer backorder flow. | Candidate only if inventory rules are finalized as no-backorder. |

## Not Candidates

| Relation/Column | Reason |
|---|---|
| `products.stock_alert_threshold` | Still used by product low-stock logic/discovery scoring. This is separate from the removed `stock_alerts` subscription table. |
| `orders.tax_amount` | Used in order DTO/UI even if current tax value is often zero. |
| `orders.customer_notes` | Exposed through order create/service types. |
| `orders.admin_notes` | Used by payment/refund gateway notes and rejection notes. |
| `conversation_metadata.message_count` and message counters | Active chat metadata. |

## Next Action

No additional drop is recommended right now.

Recommended next cleanup phase:

1. Frontend cleanup audit for duplicated hooks/components/services, dead imports, and small UX issues.
2. Performance follow-up for product LCP/TBT, product image sizes, and bundle/hydration cost.
3. Final API documentation hardening.
4. Final database consolidation for `main` using `schema.sql` and optional `database_with_seed.sql`.
