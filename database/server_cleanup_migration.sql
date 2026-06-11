-- Server MySQL cleanup migration
-- IMPORTANT:
-- 1. Run database/server_cleanup_audit.sql first.
-- 2. Take a full database backup.
-- 3. Run this only on the server MySQL database after the code changes are deployed.

SET FOREIGN_KEY_CHECKS = 0;

-- Preserve legacy visit end values before removing jobs.end_date.
UPDATE jobs
SET visit_end_date = end_date
WHERE visit_end_date IS NULL
  AND end_date IS NOT NULL
  AND next_visit IS NOT NULL
  AND end_date >= next_visit;

-- Invoices API uses is_paid / paid_date. Older schema had due_date / status instead.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS is_paid TINYINT(1) DEFAULT 0 AFTER total,
  ADD COLUMN IF NOT EXISTS paid_date DATE DEFAULT NULL AFTER is_paid;

ALTER TABLE invoices
  DROP COLUMN IF EXISTS due_date,
  DROP COLUMN IF EXISTS status;

-- Server-only legacy/unused tables.
DROP TABLE IF EXISTS timesheets;
DROP TABLE IF EXISTS job_workers;
DROP TABLE IF EXISTS job_materials;

-- Jobs fields no longer written by the current server UI/API contract.
ALTER TABLE jobs
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS postal_code,
  DROP COLUMN IF EXISTS substrate,
  DROP COLUMN IF EXISTS start_date,
  DROP COLUMN IF EXISTS end_date;

-- Reminder workflow is not implemented in the current server UI/API.
ALTER TABLE calendar_events
  DROP COLUMN IF EXISTS reminder_sent;

SET FOREIGN_KEY_CHECKS = 1;
