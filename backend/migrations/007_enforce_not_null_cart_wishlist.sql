-- ============================================================
-- Migration: Enforce NOT NULL and data integrity on cart_items
-- ============================================================
-- Context:
--   - cart_items.user_id was nullable (guest carts used session_id)
--   - Now that cart is auth-protected, all carts belong to a user
--   - session_id is no longer needed for new rows but kept for
--     backward compatibility (existing guest sessions during migration)
--
-- Steps:
--   1. Delete any orphaned guest rows (session_id only, no user_id)
--   2. Set user_id NOT NULL
--   3. Add constraint: at least user_id must be present
-- ============================================================

-- 1. Remove any existing guest-only cart items (no user_id)
DELETE FROM cart_items WHERE user_id IS NULL;

-- 2. Enforce NOT NULL on user_id
ALTER TABLE cart_items
    ALTER COLUMN user_id SET NOT NULL;

-- 3. Also enforce timestamps NOT NULL (best practice, already have defaults)
ALTER TABLE cart_items
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET NOT NULL;

-- ============================================================
-- wishlists table: user_id and product_id already NOT NULL
-- created_at is nullable — enforce it
-- ============================================================
ALTER TABLE wishlists
    ALTER COLUMN created_at SET NOT NULL;
