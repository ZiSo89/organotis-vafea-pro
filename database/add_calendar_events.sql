-- ========================================
-- Πίνακας για Επισκέψεις Ημερολογίου
-- ========================================

CREATE TABLE IF NOT EXISTS `calendar_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL COMMENT 'Τίτλος επίσκεψης',
  `start_date` datetime NOT NULL COMMENT 'Ημερομηνία & ώρα έναρξης',
  `end_date` datetime DEFAULT NULL COMMENT 'Ημερομηνία & ώρα λήξης',
  `all_day` tinyint(1) DEFAULT 0 COMMENT 'Ολοήμερη επίσκεψη',
  `client_id` int(11) DEFAULT NULL COMMENT 'ID πελάτη (foreign key)',
  `job_id` int(11) DEFAULT NULL COMMENT 'Σύνδεση με εργασία (προαιρετικό)',
  `address` varchar(500) DEFAULT NULL COMMENT 'Διεύθυνση επίσκεψης',
  `description` text DEFAULT NULL COMMENT 'Περιγραφή/Σημειώσεις',
  `status` enum('pending','confirmed','in_progress','completed','cancelled') DEFAULT 'pending' COMMENT 'Κατάσταση επίσκεψης',
  `color` varchar(20) DEFAULT NULL COMMENT 'Χρώμα στο ημερολόγιο',
  `reminder_sent` tinyint(1) DEFAULT 0 COMMENT 'Αποστολή υπενθύμισης',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_client_id` (`client_id`),
  KEY `idx_job_id` (`job_id`),
  KEY `idx_start_date` (`start_date`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Foreign keys (προαιρετικά - μπορείς να τα ενεργοποιήσεις αν θέλεις)
-- ALTER TABLE `calendar_events` 
--   ADD CONSTRAINT `fk_calendar_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL,
--   ADD CONSTRAINT `fk_calendar_job` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE SET NULL;
