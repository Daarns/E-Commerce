-- Drop email_queues table and associated objects
DROP TRIGGER IF EXISTS trigger_email_queues_timestamp ON email_queues;
DROP FUNCTION IF EXISTS update_email_queues_timestamp();
DROP TABLE IF EXISTS email_queues;
