-- ================================================================================
-- Οργανωτής Βαφέα Pro - Database Schema (Snake Case Convention)
-- ================================================================================
-- Database: painter_app
-- User: painter_user
-- Password: ~cjN4bOZcq77jqy@
-- ================================================================================

CREATE DATABASE IF NOT EXISTS painter_app 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE painter_app;

-- ================================================================================
-- 1. ΠΙΝΑΚΑΣ: clients (Πελάτες)
-- ================================================================================
CREATE TABLE IF NOT EXISTS clients (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  address VARCHAR(500),
  city VARCHAR(100),
  postal_code VARCHAR(10),
  afm VARCHAR(20) COMMENT 'ΑΦΜ',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_phone (phone),
  INDEX idx_afm (afm)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================================
-- 2. ΠΙΝΑΚΑΣ: workers (Εργάτες/Προσωπικό)
-- ================================================================================
CREATE TABLE IF NOT EXISTS workers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  specialty VARCHAR(100) COMMENT 'Ειδικότητα',
  hourly_rate DECIMAL(10,2) DEFAULT 0 COMMENT 'Ωριαία αμοιβή',
  daily_rate DECIMAL(10,2) DEFAULT 0 COMMENT 'Ημερήσια αμοιβή',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================================
-- 3. ΠΙΝΑΚΑΣ: materials (Υλικά/Χρώματα)
-- ================================================================================
CREATE TABLE IF NOT EXISTS materials (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(50) DEFAULT 'τμχ' COMMENT 'Μονάδα μέτρησης (kg, L, τμχ)',
  unit_price DECIMAL(10,2) DEFAULT 0 COMMENT 'Τιμή ανά μονάδα',
  stock DECIMAL(10,2) DEFAULT 0 COMMENT 'Απόθεμα',
  min_stock DECIMAL(10,2) DEFAULT 0 COMMENT 'Ελάχιστο απόθεμα',
  category VARCHAR(100) COMMENT 'Κατηγορία (χρώματα, εργαλεία, κλπ)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================================
-- 4. ΠΙΝΑΚΑΣ: jobs (Εργασίες)
-- ================================================================================
CREATE TABLE IF NOT EXISTS jobs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  client_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  address VARCHAR(500),
  city VARCHAR(100),
  postal_code VARCHAR(10),
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'pending' COMMENT 'pending, in-progress, completed, cancelled',
  total_cost DECIMAL(10,2) DEFAULT 0,
  is_paid BOOLEAN DEFAULT FALSE,
  coordinates JSON COMMENT 'Συντεταγμένες χάρτη {lat, lng}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  INDEX idx_client (client_id),
  INDEX idx_status (status),
  INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================================
-- 5. ΠΙΝΑΚΑΣ: job_workers (Σχέση Εργασιών-Εργατών - Many-to-Many)
-- ================================================================================
CREATE TABLE IF NOT EXISTS job_workers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  job_id INT NOT NULL,
  worker_id INT NOT NULL,
  hours DECIMAL(10,2) DEFAULT 0 COMMENT 'Σύνολο ωρών',
  days DECIMAL(10,2) DEFAULT 0 COMMENT 'Σύνολο ημερών',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
  UNIQUE KEY unique_job_worker (job_id, worker_id),
  INDEX idx_job (job_id),
  INDEX idx_worker (worker_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================================
-- 6. ΠΙΝΑΚΑΣ: job_materials (Σχέση Εργασιών-Υλικών - Many-to-Many)
-- ================================================================================
CREATE TABLE IF NOT EXISTS job_materials (
  id INT PRIMARY KEY AUTO_INCREMENT,
  job_id INT NOT NULL,
  material_id INT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
  UNIQUE KEY unique_job_material (job_id, material_id),
  INDEX idx_job (job_id),
  INDEX idx_material (material_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================================
-- 7. ΠΙΝΑΚΑΣ: timesheets (Ωρομέτρηση Εργατών)
-- ================================================================================
CREATE TABLE IF NOT EXISTS timesheets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  job_id INT NOT NULL,
  worker_id INT NOT NULL,
  date DATE NOT NULL,
  hours DECIMAL(10,2) DEFAULT 0 COMMENT 'Κανονικές ώρες',
  overtime_hours DECIMAL(10,2) DEFAULT 0 COMMENT 'Υπερωριακές ώρες',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
  INDEX idx_job (job_id),
  INDEX idx_worker (worker_id),
  INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================================
-- 8. ΠΙΝΑΚΑΣ: offers (Προσφορές)
-- ================================================================================
CREATE TABLE IF NOT EXISTS offers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  client_id INT NOT NULL,
  offer_number VARCHAR(50) UNIQUE NOT NULL COMMENT 'Αριθμός προσφοράς',
  date DATE NOT NULL,
  valid_until DATE COMMENT 'Ισχύει έως',
  items JSON NOT NULL COMMENT 'Στοιχεία προσφοράς [{description, quantity, unitPrice, total}]',
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0 COMMENT 'ΦΠΑ',
  discount DECIMAL(10,2) DEFAULT 0 COMMENT 'Έκπτωση',
  total DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending' COMMENT 'pending, accepted, rejected',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  INDEX idx_client (client_id),
  INDEX idx_date (date),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================================
-- 9. ΠΙΝΑΚΑΣ: invoices (Τιμολόγια)
-- ================================================================================
CREATE TABLE IF NOT EXISTS invoices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  job_id INT,
  client_id INT NOT NULL,
  invoice_number VARCHAR(50) UNIQUE NOT NULL COMMENT 'Αριθμός τιμολογίου',
  date DATE NOT NULL,
  items JSON NOT NULL COMMENT 'Στοιχεία τιμολογίου [{description, quantity, unitPrice, total}]',
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0 COMMENT 'ΦΠΑ',
  discount DECIMAL(10,2) DEFAULT 0 COMMENT 'Έκπτωση',
  total DECIMAL(10,2) DEFAULT 0,
  is_paid BOOLEAN DEFAULT FALSE,
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  INDEX idx_job (job_id),
  INDEX idx_client (client_id),
  INDEX idx_date (date),
  INDEX idx_paid (is_paid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================================
-- 10. ΠΙΝΑΚΑΣ: templates (Πρότυπα Εργασιών)
-- ================================================================================
CREATE TABLE IF NOT EXISTS templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) COMMENT 'Κατηγορία προτύπου',
  description TEXT,
  estimated_duration INT COMMENT 'Εκτιμώμενη διάρκεια σε ημέρες',
  materials JSON COMMENT 'Προτεινόμενα υλικά [{material_id, quantity}]',
  tasks JSON COMMENT 'Λίστα εργασιών [{title, description, estimatedHours}]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================================
-- 11. ΠΙΝΑΚΑΣ: settings (Ρυθμίσεις Εφαρμογής)
-- ================================================================================
CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================================
-- ΔΗΜΙΟΥΡΓΙΑ ΧΡΗΣΤΗ
-- ================================================================================
-- Σημείωση: Εκτέλεσε αυτά τα commands ως root user

-- DROP USER IF EXISTS 'painter_user'@'localhost';
-- CREATE USER 'painter_user'@'localhost' IDENTIFIED BY '~cjN4bOZcq77jqy@';
-- GRANT ALL PRIVILEGES ON painter_app.* TO 'painter_user'@'localhost';
-- FLUSH PRIVILEGES;

-- ================================================================================
-- ΤΕΛΟΣ SCHEMA
-- ================================================================================
