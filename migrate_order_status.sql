-- Migration: Move data from order_status_history to order_status_workflows
-- Created: 2026-04-21
-- Purpose: Consolidate order status tracking into a single table

-- Step 1: Insert data from order_status_history to order_status_workflows
INSERT INTO order_status_workflows (
  id,
  order_id,
  from_status,
  to_status,
  email_triggered,
  email_type,
  triggered_at,
  notes,
  created_at,
  updated_at
)
SELECT 
  id,
  order_id,
  from_status,
  to_status,
  false as email_triggered,
  NULL as email_type,
  NULL as triggered_at,
  notes,
  COALESCE(changed_at, CURRENT_TIMESTAMP) as created_at,
  COALESCE(changed_at, CURRENT_TIMESTAMP) as updated_at
FROM order_status_history
WHERE id NOT IN (SELECT id FROM order_status_workflows);

-- Step 2: Verify migration
SELECT COUNT(*) as migrated_rows FROM order_status_workflows;

-- Step 3: Drop the old table (comment out to verify first)
-- DROP TABLE IF EXISTS order_status_history CASCADE;
