-- Rollback: Phase 19B - User Activity Logging & CSV Export

DROP INDEX IF EXISTS idx_activity_date_range;
DROP INDEX IF EXISTS idx_activity_user_action_date;
DROP INDEX IF EXISTS idx_activity_user_date;
DROP INDEX IF EXISTS idx_activity_user_action;
DROP INDEX IF EXISTS idx_activity_created;
DROP INDEX IF EXISTS idx_activity_action;
DROP INDEX IF EXISTS idx_activity_user;
DROP TABLE IF EXISTS activity_logs;
