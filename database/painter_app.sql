-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Nov 10, 2025 at 09:36 PM
-- Server version: 10.6.23-MariaDB-cll-lve
-- PHP Version: 8.4.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `painter_app`
--

-- --------------------------------------------------------

--
-- Διαγραφή υπαρχόντων πινάκων (με σωστή σειρά λόγω foreign keys)
-- Πρώτα διαγράφονται τα child tables, μετά τα parent tables
--

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `timesheets`;
DROP TABLE IF EXISTS `job_workers`;
DROP TABLE IF EXISTS `job_materials`;
DROP TABLE IF EXISTS `invoices`;
DROP TABLE IF EXISTS `offers`;
DROP TABLE IF EXISTS `calendar_events`;
DROP TABLE IF EXISTS `jobs`;
DROP TABLE IF EXISTS `templates`;
DROP TABLE IF EXISTS `materials`;
DROP TABLE IF EXISTS `workers`;
DROP TABLE IF EXISTS `clients`;
DROP TABLE IF EXISTS `settings`;

SET FOREIGN_KEY_CHECKS = 1;

-- --------------------------------------------------------

--
-- Table structure for table `clients`
--

CREATE TABLE `clients` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `postal_code` varchar(10) DEFAULT NULL,
  `afm` varchar(20) DEFAULT NULL COMMENT 'ΑΦΜ',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `clients`
--

INSERT INTO `clients` (`id`, `name`, `phone`, `email`, `address`, `city`, `postal_code`, `afm`, `notes`, `created_at`, `updated_at`) VALUES
(1, 'Γιάννης Παπαδόπουλος', '6944123456', 'giannis@example.com', 'Δημοκρατίας 45', 'Αλεξανδρούπολη', '68100', NULL, 'Τακτικός πελάτη', '2025-11-10 16:27:32', '2025-11-10 16:35:14'),
(2, 'Μαρία Νικολάου', '6955234567', 'maria@example.com', '14ης Μαΐου 15', 'Αλεξανδρούπολη', '68100', '987654321', 'Προτιμά ανοιχτά χρώματα', '2025-11-10 16:27:32', '2025-11-10 16:27:32'),
(3, 'Κώστας Γεωργίου', '6976345678', 'kostas@example.com', 'Κύπρου 42', 'Αλεξανδρούπολη', '68100', '456789123', NULL, '2025-11-10 16:27:32', '2025-11-10 16:27:32'),
(4, 'Ελένη Αθανασίου', '6987456789', 'eleni@example.com', 'Βενιζέλου 18', 'Αλεξανδρούπολη', '68100', '321654987', 'VIP πελάτης', '2025-11-10 16:27:32', '2025-11-10 16:27:32'),
(5, 'Νίκος Δημητρίου', '6912567890', 'nikos@example.com', 'Καραολή και Δημητρίου 33', 'Αλεξανδρούπολη', '68100', '147258369', NULL, '2025-11-10 16:27:32', '2025-11-10 16:27:32');

-- --------------------------------------------------------

--
-- Table structure for table `invoices`
--

CREATE TABLE `invoices` (
  `id` int(11) NOT NULL,
  `job_id` int(11) DEFAULT NULL,
  `client_id` int(11) NOT NULL,
  `invoice_number` varchar(50) NOT NULL COMMENT 'Αριθμός τιμολογίου',
  `date` date NOT NULL,
  `items` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Στοιχεία τιμολογίου [{description, quantity, unitPrice, total}]' CHECK (json_valid(`items`)),
  `subtotal` decimal(10,2) DEFAULT 0.00,
  `tax` decimal(10,2) DEFAULT 0.00 COMMENT 'ΦΠΑ',
  `discount` decimal(10,2) DEFAULT 0.00 COMMENT 'Έκπτωση',
  `total` decimal(10,2) DEFAULT 0.00,
  `is_paid` tinyint(1) DEFAULT 0,
  `paid_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `calendar_events`
--

CREATE TABLE `calendar_events` (
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

-- --------------------------------------------------------

--
-- Table structure for table `jobs`
--

CREATE TABLE `jobs` (
  `id` int(11) NOT NULL,
  `client_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `type` varchar(100) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `next_visit` date DEFAULT NULL,
  `description` text DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `postal_code` varchar(10) DEFAULT NULL,
  `rooms` int(11) DEFAULT NULL,
  `area` decimal(10,2) DEFAULT NULL,
  `substrate` varchar(100) DEFAULT NULL,
  `materials_cost` decimal(10,2) DEFAULT 0.00,
  `kilometers` int(11) DEFAULT 0,
  `billing_hours` decimal(10,2) DEFAULT 0.00,
  `billing_rate` decimal(10,2) DEFAULT 0.00,
  `vat` decimal(5,2) DEFAULT 24.00,
  `cost_per_km` decimal(10,2) DEFAULT 0.50,
  `notes` text DEFAULT NULL,
  `assigned_workers` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`assigned_workers`)),
  `paints` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`paints`)),
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` varchar(50) DEFAULT 'pending' COMMENT 'pending, in-progress, completed, cancelled',
  `total_cost` decimal(10,2) DEFAULT 0.00,
  `is_paid` tinyint(1) DEFAULT 0,
  `coordinates` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Συντεταγμένες χάρτη {lat, lng}' CHECK (json_valid(`coordinates`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `jobs`
--

INSERT INTO `jobs` (`id`, `client_id`, `title`, `type`, `date`, `next_visit`, `description`, `address`, `city`, `postal_code`, `rooms`, `area`, `substrate`, `materials_cost`, `kilometers`, `billing_hours`, `billing_rate`, `vat`, `cost_per_km`, `notes`, `assigned_workers`, `paints`, `start_date`, `end_date`, `status`, `total_cost`, `is_paid`, `coordinates`, `created_at`, `updated_at`) VALUES
(1, 1, 'Βαφή Διαμερίσματος', 'Εσωτερικοί χώροι', '2025-11-01', '2025-11-15', 'Πλήρης βαφή 2άρι διαμέρισμα με πλαστικό χρώμα', 'Δημοκρατίας 45', 'Αλεξανδρούπολη', '68100', 2, 80.00, 'Γυψοσανίδα', 150.00, 5, 8.00, 50.00, 24.00, 0.50, 'Πελάτης ζήτησε ανοιχτά χρώματα', '[{\"workerId\":1,\"workerName\":\"Δημήτρης Βασιλείου\",\"workerSpecialty\":\"Βαφέας\",\"hoursAllocated\":8,\"hourlyRate\":15,\"laborCost\":120}]', '[{\"name\":\"Λευκό Ματ\",\"code\":\"WH-001\"}]', '2025-11-01', '2025-11-05', 'Ολοκληρώθηκε', 1200.00, 1, '{\"lat\": 40.8476, \"lng\": 25.8759}', '2025-11-10 16:27:32', '2025-11-10 16:27:32'),
(2, 2, 'Βαφή Καταστήματος', 'Κάγκελα/Πέργκολα', '2025-11-10', '2025-12-01', 'Εσωτερική και εξωτερική βαφή καταστήματος', '14ης Μαΐου 15', 'Αλεξανδρούπολη', '68100', 4, 150.00, 'Σοβάς', 350.00, 8, 16.00, 55.00, 24.00, 0.50, 'Εργασία σε εξέλιξη', '[{\"workerId\":1,\"workerName\":\"Δημήτρης Βασιλείου\",\"workerSpecialty\":\"Βαφέας\",\"hoursAllocated\":12,\"hourlyRate\":15,\"laborCost\":180},{\"workerId\":2,\"workerName\":\"Γιώργος Αντωνίου\",\"workerSpecialty\":\"Βοηθός\",\"hoursAllocated\":12,\"hourlyRate\":12,\"laborCost\":144}]', '[{\"name\":\"Μπεζ Ανοιχτό\",\"code\":\"BG-002\"}]', '2025-11-10', '2025-11-15', 'Σε εξέλιξη', 2500.00, 0, '{\"lat\": 40.8476, \"lng\": 25.8759}', '2025-11-10 16:27:32', '2025-11-10 16:27:32'),
(3, 3, 'Βαφή Γραφείου', 'Εσωτερικοί χώροι', '2025-11-20', NULL, 'Βαφή 3 χώρων γραφείου', 'Κύπρου 42', 'Αλεξανδρούπολη', '68100', 3, 60.00, 'Γυψοσανίδα', 120.00, 3, 6.00, 50.00, 24.00, 0.50, NULL, '[]', '[]', '2025-11-20', '2025-11-22', 'Υποψήφιος', 800.00, 0, '{\"lat\": 40.8476, \"lng\": 25.8759}', '2025-11-10 16:27:32', '2025-11-10 16:27:32'),
(4, 4, 'Εξωτερικοί χώροι', 'Εξωτερικοί χώροι', '2025-12-01', '2025-11-10', NULL, NULL, NULL, NULL, 5, 250.00, 'Σοβάς', 600.00, 12, 24.00, 60.00, 24.00, 0.50, 'Μεγάλη εργασία - απαιτείται προσοχή', '[{\"workerId\":3,\"workerName\":\"\\u03a3\\u03c9\\u03c4\\u03ae\\u03c1\\u03b7\\u03c2 \\u039c\\u03b9\\u03c7\\u03b1\\u03ae\\u03bb\",\"workerSpecialty\":\"\\u0395\\u03b9\\u03b4\\u03b9\\u03ba\\u03cc\\u03c2 \\u03c3\\u03b5 \\u039e\\u03cd\\u03bb\\u03bf\",\"hoursAllocated\":20,\"hourlyRate\":18,\"laborCost\":360}]', '[{\"name\":\"\\u0395\\u03bb\\u03b1\\u03b9\\u03cc\\u03c7\\u03c1\\u03c9\\u03bc\\u03b1 \\u039b\\u03b5\\u03c5\\u03ba\\u03cc\",\"code\":\"OL-001\"}]', '2025-12-01', NULL, 'Προγραμματισμένη', 1785.60, 0, NULL, '2025-11-10 16:27:32', '2025-11-10 16:29:10');

-- --------------------------------------------------------

--
-- Table structure for table `job_materials`
--

CREATE TABLE `job_materials` (
  `id` int(11) NOT NULL,
  `job_id` int(11) NOT NULL,
  `material_id` int(11) NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_cost` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `job_workers`
--

CREATE TABLE `job_workers` (
  `id` int(11) NOT NULL,
  `job_id` int(11) NOT NULL,
  `worker_id` int(11) NOT NULL,
  `hours` decimal(10,2) DEFAULT 0.00 COMMENT 'Σύνολο ωρών',
  `days` decimal(10,2) DEFAULT 0.00 COMMENT 'Σύνολο ημερών',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `materials`
--

CREATE TABLE `materials` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `unit` varchar(50) DEFAULT 'τμχ' COMMENT 'Μονάδα μέτρησης (kg, L, τμχ)',
  `unit_price` decimal(10,2) DEFAULT 0.00 COMMENT 'Τιμή ανά μονάδα',
  `stock` decimal(10,2) DEFAULT 0.00 COMMENT 'Απόθεμα',
  `min_stock` decimal(10,2) DEFAULT 0.00 COMMENT 'Ελάχιστο απόθεμα',
  `category` varchar(100) DEFAULT NULL COMMENT 'Κατηγορία (χρώματα, εργαλεία, κλπ)',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `materials`
--

INSERT INTO `materials` (`id`, `name`, `unit`, `unit_price`, `stock`, `min_stock`, `category`, `created_at`, `updated_at`) VALUES
(1, 'Πλαστικό Χρώμα Λευκό 3L', 'τμχ', 12.50, 50.00, 10.00, 'Χρώματα', '2025-11-10 16:27:32', '2025-11-10 16:27:32'),
(2, 'Πλαστικό Χρώμα Μπεζ 3L', 'τμχ', 13.00, 30.00, 10.00, 'Χρώματα', '2025-11-10 16:27:32', '2025-11-10 16:27:32'),
(3, 'Ελαιόχρωμα Λευκό 750ml', 'τμχ', 8.50, 25.00, 5.00, 'Χρώματα', '2025-11-10 16:27:32', '2025-11-10 16:27:32'),
(4, 'Ρολό 25cm', 'τμχ', 3.50, 100.00, 20.00, 'Εργαλεία', '2025-11-10 16:27:32', '2025-11-10 16:27:32'),
(5, 'Πινέλο 5cm', 'τμχ', 2.80, 80.00, 15.00, 'Εργαλεία', '2025-11-10 16:27:32', '2025-11-10 16:27:32'),
(6, 'Νάιλον Προστασίας 4x5m', 'τμχ', 1.50, 200.00, 50.00, 'Αναλώσιμα', '2025-11-10 16:27:32', '2025-11-10 16:27:32'),
(7, 'Ταινία Χαρτοταινία 50mm', 'τμχ', 2.20, 150.00, 30.00, 'Αναλώσιμα', '2025-11-10 16:27:32', '2025-11-10 16:27:32'),
(8, 'Ακρυλικό Χρώμα Μπλε 1L', 'τμχ', 9.00, 20.00, 5.00, 'Χρώματα', '2025-11-10 16:27:32', '2025-11-10 16:27:32'),
(9, 'Ξύστρα Μεταλλική', 'τμχ', 4.50, 40.00, 10.00, 'Εργαλεία', '2025-11-10 16:27:32', '2025-11-10 16:27:32'),
(10, 'Αστάρι Ακρυλικό 3L', 'τμχ', 11.00, 35.00, 8.00, 'Χρώματα', '2025-11-10 16:27:32', '2025-11-10 16:27:32');

-- --------------------------------------------------------

--
-- Table structure for table `offers`
--

CREATE TABLE `offers` (
  `id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `offer_number` varchar(50) NOT NULL COMMENT 'Αριθμός προσφοράς',
  `date` date NOT NULL,
  `valid_until` date DEFAULT NULL COMMENT 'Ισχύει έως',
  `items` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'Στοιχεία προσφοράς [{description, quantity, unitPrice, total}]' CHECK (json_valid(`items`)),
  `subtotal` decimal(10,2) DEFAULT 0.00,
  `tax` decimal(10,2) DEFAULT 0.00 COMMENT 'ΦΠΑ',
  `discount` decimal(10,2) DEFAULT 0.00 COMMENT 'Έκπτωση',
  `total` decimal(10,2) DEFAULT 0.00,
  `status` varchar(50) DEFAULT 'pending' COMMENT 'pending, accepted, rejected',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `id` int(11) NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `templates`
--

CREATE TABLE `templates` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `category` varchar(100) DEFAULT NULL COMMENT 'Κατηγορία προτύπου',
  `description` text DEFAULT NULL,
  `estimated_duration` int(11) DEFAULT NULL COMMENT 'Εκτιμώμενη διάρκεια σε ημέρες',
  `materials` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Προτεινόμενα υλικά [{material_id, quantity}]' CHECK (json_valid(`materials`)),
  `tasks` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'Λίστα εργασιών [{title, description, estimatedHours}]' CHECK (json_valid(`tasks`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `timesheets`
--

CREATE TABLE `timesheets` (
  `id` int(11) NOT NULL,
  `job_id` int(11) NOT NULL,
  `worker_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `hours` decimal(10,2) DEFAULT 0.00 COMMENT 'Κανονικές ώρες',
  `overtime_hours` decimal(10,2) DEFAULT 0.00 COMMENT 'Υπερωριακές ώρες',
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `workers`
--

CREATE TABLE `workers` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `specialty` varchar(100) DEFAULT NULL COMMENT 'Ειδικότητα',
  `hourly_rate` decimal(10,2) DEFAULT 0.00 COMMENT 'Ωριαία αμοιβή',
  `daily_rate` decimal(10,2) DEFAULT 0.00 COMMENT 'Ημερήσια αμοιβή',
  `status` varchar(20) DEFAULT 'active' COMMENT 'active, inactive',
  `hire_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `total_hours` decimal(10,2) DEFAULT 0.00,
  `total_earnings` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `workers`
--

INSERT INTO `workers` (`id`, `name`, `phone`, `specialty`, `hourly_rate`, `daily_rate`, `status`, `hire_date`, `notes`, `total_hours`, `total_earnings`, `created_at`, `updated_at`) VALUES
(1, 'Δημήτρης Βασιλείου', '6923111222', 'Βαφέας', 15.00, 100.00, 'active', '2024-01-15', 'Έμπειρος βαφέας με 10 χρόνια εμπειρίας', 0.00, 0.00, '2025-11-10 16:27:32', '2025-11-10 16:27:32'),
(2, 'Γιώργος Αντωνίου', '6934222333', 'Βοηθός', 12.00, 0.00, 'active', '2024-03-01', 'ωραιος', 0.00, 0.00, '2025-11-10 16:27:32', '2025-11-10 18:13:28'),
(3, 'Σωτήρης Μιχαήλ', '6945333444', 'Ειδικός σε Ξύλο', 18.00, 120.00, 'active', '2023-06-10', 'Ειδικότητα σε ξύλινες επιφάνειες', 0.00, 0.00, '2025-11-10 16:27:32', '2025-11-10 16:27:32'),
(4, 'Παναγιώτης Ιωάννου', '6956444555', 'Βαφέας', 15.00, 100.00, 'inactive', '2023-09-20', 'Προσωρινά ανενεργός', 0.00, 0.00, '2025-11-10 16:27:32', '2025-11-10 16:27:32');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `clients`
--
ALTER TABLE `clients`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `idx_phone` (`phone`),
  ADD KEY `idx_afm` (`afm`);

--
-- Indexes for table `calendar_events`
--
ALTER TABLE `calendar_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_client_id` (`client_id`),
  ADD KEY `idx_job_id` (`job_id`),
  ADD KEY `idx_start_date` (`start_date`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `invoices`
--
ALTER TABLE `invoices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `invoice_number` (`invoice_number`),
  ADD KEY `idx_job` (`job_id`),
  ADD KEY `idx_client` (`client_id`),
  ADD KEY `idx_date` (`date`),
  ADD KEY `idx_paid` (`is_paid`);

--
-- Indexes for table `jobs`
--
ALTER TABLE `jobs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_client` (`client_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_dates` (`start_date`,`end_date`);

--
-- Indexes for table `job_materials`
--
ALTER TABLE `job_materials`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_job_material` (`job_id`,`material_id`),
  ADD KEY `idx_job` (`job_id`),
  ADD KEY `idx_material` (`material_id`);

--
-- Indexes for table `job_workers`
--
ALTER TABLE `job_workers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_job_worker` (`job_id`,`worker_id`),
  ADD KEY `idx_job` (`job_id`),
  ADD KEY `idx_worker` (`worker_id`);

--
-- Indexes for table `materials`
--
ALTER TABLE `materials`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `idx_category` (`category`);

--
-- Indexes for table `offers`
--
ALTER TABLE `offers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `offer_number` (`offer_number`),
  ADD KEY `idx_client` (`client_id`),
  ADD KEY `idx_date` (`date`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `setting_key` (`setting_key`);

--
-- Indexes for table `templates`
--
ALTER TABLE `templates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `idx_category` (`category`);

--
-- Indexes for table `timesheets`
--
ALTER TABLE `timesheets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_job` (`job_id`),
  ADD KEY `idx_worker` (`worker_id`),
  ADD KEY `idx_date` (`date`);

--
-- Indexes for table `workers`
--
ALTER TABLE `workers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_name` (`name`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `clients`
--
ALTER TABLE `clients`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `calendar_events`
--
ALTER TABLE `calendar_events`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `invoices`
--
ALTER TABLE `invoices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `jobs`
--
ALTER TABLE `jobs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `job_materials`
--
ALTER TABLE `job_materials`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `job_workers`
--
ALTER TABLE `job_workers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `materials`
--
ALTER TABLE `materials`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `offers`
--
ALTER TABLE `offers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `settings`
--
ALTER TABLE `settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `templates`
--
ALTER TABLE `templates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `timesheets`
--
ALTER TABLE `timesheets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `workers`
--
ALTER TABLE `workers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `invoices`
--
ALTER TABLE `invoices`
  ADD CONSTRAINT `invoices_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `invoices_ibfk_2` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `jobs`
--
ALTER TABLE `jobs`
  ADD CONSTRAINT `jobs_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `job_materials`
--
ALTER TABLE `job_materials`
  ADD CONSTRAINT `job_materials_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `job_materials_ibfk_2` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `job_workers`
--
ALTER TABLE `job_workers`
  ADD CONSTRAINT `job_workers_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `job_workers_ibfk_2` FOREIGN KEY (`worker_id`) REFERENCES `workers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `offers`
--
ALTER TABLE `offers`
  ADD CONSTRAINT `offers_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `timesheets`
--
ALTER TABLE `timesheets`
  ADD CONSTRAINT `timesheets_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `timesheets_ibfk_2` FOREIGN KEY (`worker_id`) REFERENCES `workers` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
