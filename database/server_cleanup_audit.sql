-- Server MySQL cleanup audit
-- Run this BEFORE database/server_cleanup_migration.sql.
-- It is read-only and reports data that would be affected by the cleanup.

SELECT 'jobs.description non-empty' AS check_name, COUNT(*) AS rows_found
FROM jobs
WHERE description IS NOT NULL AND description <> '';

SELECT 'jobs.city/postal_code non-empty' AS check_name, COUNT(*) AS rows_found
FROM jobs
WHERE (city IS NOT NULL AND city <> '')
   OR (postal_code IS NOT NULL AND postal_code <> '');

SELECT 'jobs.substrate non-empty' AS check_name, COUNT(*) AS rows_found
FROM jobs
WHERE substrate IS NOT NULL AND substrate <> '';

SELECT 'jobs.start_date differs from date' AS check_name, COUNT(*) AS rows_found
FROM jobs
WHERE start_date IS NOT NULL
  AND (date IS NULL OR start_date <> date);

SELECT 'jobs.end_date not represented by visit_end_date' AS check_name, COUNT(*) AS rows_found
FROM jobs
WHERE end_date IS NOT NULL
  AND (visit_end_date IS NULL OR visit_end_date <> end_date);

SELECT 'job_workers rows' AS check_name, COUNT(*) AS rows_found
FROM job_workers;

SELECT 'job_materials rows' AS check_name, COUNT(*) AS rows_found
FROM job_materials;

SELECT 'timesheets rows' AS check_name, COUNT(*) AS rows_found
FROM timesheets;

SELECT 'calendar_events.reminder_sent flagged' AS check_name, COUNT(*) AS rows_found
FROM calendar_events
WHERE reminder_sent IS NOT NULL AND reminder_sent <> 0;

SELECT 'invoices missing API payment columns' AS check_name,
       SUM(CASE WHEN column_name = 'is_paid' THEN 1 ELSE 0 END) AS has_is_paid,
       SUM(CASE WHEN column_name = 'paid_date' THEN 1 ELSE 0 END) AS has_paid_date,
       SUM(CASE WHEN column_name = 'due_date' THEN 1 ELSE 0 END) AS has_due_date,
       SUM(CASE WHEN column_name = 'status' THEN 1 ELSE 0 END) AS has_status
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'invoices'
  AND column_name IN ('is_paid', 'paid_date', 'due_date', 'status');
