-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: painter_app
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `calendar_events`
--

DROP TABLE IF EXISTS `calendar_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `calendar_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `original_title` varchar(255) DEFAULT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `all_day` tinyint(1) DEFAULT 0,
  `client_id` int(11) DEFAULT NULL,
  `job_id` int(11) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `description` text DEFAULT NULL,
  `status` varchar(50) DEFAULT 'pending',
  `color` varchar(20) DEFAULT '#3b82f6',
  `reminder_sent` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `google_event_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `client_id` (`client_id`),
  KEY `job_id` (`job_id`),
  KEY `idx_calendar_events_start_date` (`start_date`),
  KEY `idx_calendar_events_status` (`status`),
  KEY `idx_calendar_google_event_id` (`google_event_id`),
  CONSTRAINT `calendar_events_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL,
  CONSTRAINT `calendar_events_ibfk_2` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `calendar_events`
--

LOCK TABLES `calendar_events` WRITE;
/*!40000 ALTER TABLE `calendar_events` DISABLE KEYS */;
INSERT INTO `calendar_events` VALUES (4,'╬û╬«╧â╬┐╬│╬╗╬┐╧à ╬æ╬╕╬▒╬╜╬¼╧â╬╣╬┐╧é','╬û╬«╧â╬┐╬│╬╗╬┐╧à ╬æ╬╕╬▒╬╜╬¼╧â╬╣╬┐╧é','2026-06-13 00:00:00','2026-06-14 00:00:00',NULL,NULL,1,1,4,'╬æ╬│╬╣╬┐╧à ╬ö╬╖╬╝╬╖╧ä╧ü╬»╬┐╧à 9, ╬æ╬╗╬╡╬╛╬▒╬╜╬┤╧ü╬┐╧ì╧Ç╬┐╬╗╬╖ 68100','','in_progress','#3b82f6',0,'2026-06-11 00:41:24','2026-06-11 03:07:15',NULL);
/*!40000 ALTER TABLE `calendar_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clients`
--

DROP TABLE IF EXISTS `clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `clients` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `postal_code` varchar(10) DEFAULT NULL,
  `afm` varchar(20) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `coordinates` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clients`
--

LOCK TABLES `clients` WRITE;
/*!40000 ALTER TABLE `clients` DISABLE KEYS */;
INSERT INTO `clients` VALUES (1,'╬û╬«╧â╬┐╬│╬╗╬┐╧à ╬æ╬╕╬▒╬╜╬¼╧â╬╣╬┐╧é','6982344561','zisoglou@hotmail.gr','╬æ╬│╬╣╬┐╧à ╬ö╬╖╬╝╬╖╧ä╧ü╬»╬┐╧à 9','╬æ╬╗╬╡╬╛╬▒╬╜╬┤╧ü╬┐╧ì╧Ç╬┐╬╗╬╖','68100','','','{\"lat\":40.8540538,\"lng\":25.8678527}','2026-05-31 01:55:11','2026-05-31 01:55:11');
/*!40000 ALTER TABLE `clients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `google_meta`
--

DROP TABLE IF EXISTS `google_meta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `google_meta` (
  `meta_key` varchar(100) NOT NULL,
  `meta_value` longtext DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`meta_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `google_meta`
--

LOCK TABLES `google_meta` WRITE;
/*!40000 ALTER TABLE `google_meta` DISABLE KEYS */;
INSERT INTO `google_meta` VALUES ('calendar_id','7caa82a8c3ebe5c5395eabb7b0edcb8d31fce45aeb06af3e261327b1bea6cc39@group.calendar.google.com','2026-05-30 22:17:41'),('remember_token_expires','1783435080','2026-06-07 14:38:00'),('remember_token_hash','27facd2ebbdb2831cd26e46464d19407724bb86078d38edcbb8fc2cb89996fe2','2026-06-07 14:38:00');
/*!40000 ALTER TABLE `google_meta` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoices`
--

DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `invoices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_id` int(11) DEFAULT NULL,
  `client_id` int(11) DEFAULT NULL,
  `invoice_number` varchar(50) NOT NULL,
  `date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `items` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`items`)),
  `subtotal` decimal(10,2) DEFAULT 0.00,
  `tax` decimal(10,2) DEFAULT 0.00,
  `discount` decimal(10,2) DEFAULT 0.00,
  `total` decimal(10,2) DEFAULT 0.00,
  `status` varchar(50) DEFAULT 'unpaid',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_number` (`invoice_number`),
  KEY `job_id` (`job_id`),
  KEY `client_id` (`client_id`),
  KEY `idx_invoices_date` (`date`),
  KEY `idx_invoices_status` (`status`),
  CONSTRAINT `invoices_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE SET NULL,
  CONSTRAINT `invoices_ibfk_2` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoices`
--

LOCK TABLES `invoices` WRITE;
/*!40000 ALTER TABLE `invoices` DISABLE KEYS */;
/*!40000 ALTER TABLE `invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_materials`
--

DROP TABLE IF EXISTS `job_materials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `job_materials` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_id` int(11) NOT NULL,
  `material_id` int(11) NOT NULL,
  `quantity` decimal(10,2) DEFAULT 0.00,
  `unit_price` decimal(10,2) DEFAULT 0.00,
  `total_cost` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `job_id` (`job_id`),
  KEY `material_id` (`material_id`),
  CONSTRAINT `job_materials_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `job_materials_ibfk_2` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_materials`
--

LOCK TABLES `job_materials` WRITE;
/*!40000 ALTER TABLE `job_materials` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_materials` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_payments`
--

DROP TABLE IF EXISTS `job_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `job_payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_id` int(11) NOT NULL,
  `payment_date` date NOT NULL,
  `amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_job_payments_job` (`job_id`),
  KEY `idx_job_payments_date` (`payment_date`),
  CONSTRAINT `job_payments_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_payments`
--

LOCK TABLES `job_payments` WRITE;
/*!40000 ALTER TABLE `job_payments` DISABLE KEYS */;
INSERT INTO `job_payments` VALUES (1,4,'2026-06-11',200.00,'','2026-06-11 00:02:02','2026-06-11 00:02:53');
/*!40000 ALTER TABLE `job_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_visits`
--

DROP TABLE IF EXISTS `job_visits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `job_visits` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_id` int(11) NOT NULL,
  `visit_date` date NOT NULL,
  `workers` longtext DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_job_visits_job` (`job_id`),
  KEY `idx_job_visits_date` (`visit_date`),
  CONSTRAINT `job_visits_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_visits`
--

LOCK TABLES `job_visits` WRITE;
/*!40000 ALTER TABLE `job_visits` DISABLE KEYS */;
INSERT INTO `job_visits` VALUES (1,4,'2026-06-19','[{\"workerId\":3,\"workerName\":\"Xreiszos\",\"workerType\":\"owner\",\"hourlyRate\":20,\"hours\":10,\"laborCost\":0},{\"workerId\":1,\"workerName\":\"╬æ╬╜╧ä╧Ä╬╜╬╣╬┐╧é ╬£╬╣╧ç╬▒╬«╬╗\",\"workerType\":\"employee\",\"hourlyRate\":6,\"hours\":10,\"laborCost\":60},{\"workerId\":2,\"workerName\":\"╬¥╬╣╬║╬┐╬╗╬▒╬╣╬┤╬╖╧é\",\"workerType\":\"owner\",\"hourlyRate\":10,\"hours\":5,\"laborCost\":0}]','','2026-06-11 00:01:03','2026-06-11 01:30:23'),(2,4,'2026-06-18','[{\"workerId\":3,\"workerName\":\"Xreiszos\",\"workerType\":\"owner\",\"hourlyRate\":20,\"hours\":1,\"laborCost\":0},{\"workerId\":2,\"workerName\":\"╬¥╬╣╬║╬┐╬╗╬▒╬╣╬┤╬╖╧é\",\"workerType\":\"owner\",\"hourlyRate\":10,\"hours\":40,\"laborCost\":0}]','','2026-06-11 00:06:40','2026-06-11 01:38:20'),(3,4,'2026-06-20','[{\"workerId\":1,\"workerName\":\"╬æ╬╜╧ä╧Ä╬╜╬╣╬┐╧é ╬£╬╣╧ç╬▒╬«╬╗\",\"workerType\":\"employee\",\"hourlyRate\":6,\"hours\":2,\"laborCost\":12},{\"workerId\":2,\"workerName\":\"╬¥╬╣╬║╬┐╬╗╬▒╬╣╬┤╬╖╧é\",\"workerType\":\"owner\",\"hourlyRate\":10,\"hours\":2,\"laborCost\":0}]','','2026-06-11 01:30:04','2026-06-11 01:30:28');
/*!40000 ALTER TABLE `job_visits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_workers`
--

DROP TABLE IF EXISTS `job_workers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `job_workers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `job_id` int(11) NOT NULL,
  `worker_id` int(11) NOT NULL,
  `hours_allocated` decimal(10,2) DEFAULT 0.00,
  `hourly_rate` decimal(10,2) DEFAULT 0.00,
  `labor_cost` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `job_id` (`job_id`),
  KEY `worker_id` (`worker_id`),
  CONSTRAINT `job_workers_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `job_workers_ibfk_2` FOREIGN KEY (`worker_id`) REFERENCES `workers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_workers`
--

LOCK TABLES `job_workers` WRITE;
/*!40000 ALTER TABLE `job_workers` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_workers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jobs`
--

DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `jobs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `client_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `type` varchar(100) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `next_visit` date DEFAULT NULL,
  `description` text DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `postal_code` varchar(10) DEFAULT NULL,
  `rooms` int(11) DEFAULT NULL,
  `area` decimal(10,2) DEFAULT NULL,
  `substrate` varchar(100) DEFAULT NULL,
  `materials_cost` decimal(10,2) DEFAULT 0.00,
  `kilometers` decimal(10,2) DEFAULT 0.00,
  `billing_hours` decimal(10,2) DEFAULT 0.00,
  `billing_rate` decimal(10,2) DEFAULT 0.00,
  `vat` decimal(5,2) DEFAULT 24.00,
  `cost_per_km` decimal(10,2) DEFAULT 0.50,
  `notes` text DEFAULT NULL,
  `assigned_workers` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`assigned_workers`)),
  `paints` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`paints`)),
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` varchar(50) DEFAULT '╬Ñ╧Ç╬┐╧ê╬«╧å╬╣╬┐╧é',
  `total_cost` decimal(10,2) DEFAULT 0.00,
  `is_paid` tinyint(1) DEFAULT 0,
  `coordinates` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`coordinates`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `visit_start_time` time DEFAULT NULL,
  `visit_end_time` time DEFAULT NULL,
  `visit_all_day` tinyint(1) NOT NULL DEFAULT 1,
  `visit_end_date` date DEFAULT NULL COMMENT '╬¢╬«╬╛╬╖ ╧Ç╬┐╬╗╧à╬«╬╝╬╡╧ü╬╖╧é ╬╡╧Ç╬»╧â╬║╬╡╧ê╬╖╧é (Γëá end_date ╬¡╧ü╬│╬┐╧à)',
  `billing_type` varchar(20) NOT NULL DEFAULT 'hourly' COMMENT 'hourly | fixed',
  `agreed_price` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '╬ú╧à╬╝╧å╧ë╬╜╬╖╬╝╬¡╬╜╬╖ ╧ä╬╣╬╝╬« (╬║╬▒╧ä ╬▒╧Ç╬┐╬║╬┐╧Ç╬«)',
  PRIMARY KEY (`id`),
  KEY `client_id` (`client_id`),
  KEY `idx_jobs_status` (`status`),
  KEY `idx_jobs_date` (`date`),
  KEY `idx_jobs_next_visit` (`next_visit`),
  KEY `idx_jobs_created_at` (`created_at`),
  KEY `idx_jobs_status_date` (`status`,`date`),
  KEY `idx_jobs_client_status` (`client_id`,`status`),
  CONSTRAINT `jobs_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jobs`
--

LOCK TABLES `jobs` WRITE;
/*!40000 ALTER TABLE `jobs` DISABLE KEYS */;
INSERT INTO `jobs` VALUES (4,1,'╬ò╧ü╬│╬▒╧â╬»╬▒',NULL,'2026-06-10','2026-06-13',NULL,'╬æ╬│╬╣╬┐╧à ╬ö╬╖╬╝╬╖╧ä╧ü╬»╬┐╧à 9, ╬æ╬╗╬╡╬╛╬▒╬╜╬┤╧ü╬┐╧ì╧Ç╬┐╬╗╬╖ 68100',NULL,NULL,NULL,NULL,NULL,2.00,3.00,65.00,12.00,24.00,0.50,'','[{\"workerId\":2,\"workerName\":\"╬¥╬╣╬║╬┐╬╗╬▒╬╣╬┤╬╖╧é\",\"workerSpecialty\":\"╬ò╬╗╬▒╬╣╬┐╧ç╧ü╧ë╬╝╬▒╧ä╬╣╧â╧ä╬«╧é\",\"specialty\":\"╬ò╬╗╬▒╬╣╬┐╧ç╧ü╧ë╬╝╬▒╧ä╬╣╧â╧ä╬«╧é\",\"workerType\":\"owner\",\"hourlyRate\":\"10.00\",\"hoursAllocated\":5,\"laborCost\":0},{\"workerId\":3,\"workerName\":\"Xreiszos\",\"workerSpecialty\":\"╬î╬╗╬╡╧é ╬┐╬╣ ╬╡╬╣╬┤╬╣╬║╧î╧ä╬╖╧ä╬╡╧é\",\"specialty\":\"╬î╬╗╬╡╧é ╬┐╬╣ ╬╡╬╣╬┤╬╣╬║╧î╧ä╬╖╧ä╬╡╧é\",\"workerType\":\"owner\",\"hourlyRate\":\"20.00\",\"hoursAllocated\":5,\"laborCost\":0}]','[]','2026-06-10',NULL,'╬ú╬╡ ╬╡╬╛╬¡╬╗╬╣╬╛╬╖',600.00,0,NULL,'2026-06-10 23:46:52','2026-06-11 03:07:15',NULL,NULL,1,'2026-06-14','fixed',600.00);
/*!40000 ALTER TABLE `jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `material_purchase_items`
--

DROP TABLE IF EXISTS `material_purchase_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `material_purchase_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `purchase_id` int(11) NOT NULL,
  `material_id` int(11) DEFAULT NULL,
  `material_name` varchar(255) NOT NULL,
  `quantity` decimal(10,2) DEFAULT 0.00,
  `unit` varchar(50) DEFAULT NULL,
  `unit_price` decimal(10,2) DEFAULT 0.00,
  `total_cost` decimal(10,2) DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_purchase_items_purchase` (`purchase_id`),
  KEY `idx_purchase_items_material` (`material_id`),
  CONSTRAINT `material_purchase_items_ibfk_1` FOREIGN KEY (`purchase_id`) REFERENCES `material_purchases` (`id`) ON DELETE CASCADE,
  CONSTRAINT `material_purchase_items_ibfk_2` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `material_purchase_items`
--

LOCK TABLES `material_purchase_items` WRITE;
/*!40000 ALTER TABLE `material_purchase_items` DISABLE KEYS */;
INSERT INTO `material_purchase_items` VALUES (1,1,1,'╬╜╬╡╬┐ ╬╡╬║╬┐',1.00,'╬╗╬╣╧ä╧ü╬▒',10.00,10.00,NULL,'2026-06-07 16:55:05'),(2,1,2,'╧â╧Ç╬▒╧ä╬┐╧à╬╗╬▒',2.00,'╧ä╬╡╬╝╬▒╧ç╬╣╬┐',5.00,10.00,NULL,'2026-06-07 16:55:05'),(3,2,3,'╧Ç╬╣╬╜╬╡╬╗╬▒',4.00,'╧ä╬╡╬╝',8.00,32.00,NULL,'2026-06-07 17:06:51'),(4,2,4,'╬║╬┐╬╜╧ä╬▒╧ü╬╣',1.00,'',2.00,2.00,NULL,'2026-06-07 17:06:51'),(5,3,3,'╧Ç╬╣╬╜╬╡╬╗╬▒',2.00,'╧ä╬╡╬╝',3.00,6.00,NULL,'2026-06-07 17:11:02'),(6,4,5,'╧ç╧ü╧ë╬╝╬▒',1.00,'10 ╬╗╬╣╧ä╧ü╬▒',50.00,50.00,NULL,'2026-06-07 17:15:02'),(7,5,2,'╧â╧Ç╬▒╧ä╬┐╧à╬╗╬▒',1.00,'╧ä╬╡╬╝╬▒╧ç╬╣╬┐',2.00,2.00,NULL,'2026-06-07 17:35:31'),(8,6,6,'╬á╬╗╬▒╧â╧ä╬╣╬║╬┐ ╬¢╬╡╧à╬║╬┐',1.00,'',3.00,3.00,NULL,'2026-06-08 00:54:03');
/*!40000 ALTER TABLE `material_purchase_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `material_purchases`
--

DROP TABLE IF EXISTS `material_purchases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `material_purchases` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `supplier_id` int(11) NOT NULL,
  `purchase_date` date NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `total_cost` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_material_purchases_supplier` (`supplier_id`),
  KEY `idx_material_purchases_date` (`purchase_date`),
  CONSTRAINT `material_purchases_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `material_purchases`
--

LOCK TABLES `material_purchases` WRITE;
/*!40000 ALTER TABLE `material_purchases` DISABLE KEYS */;
INSERT INTO `material_purchases` VALUES (1,1,'2026-06-07','','',20.00,'2026-06-07 16:55:05','2026-06-07 16:55:05'),(2,2,'2026-06-07','','',34.00,'2026-06-07 17:06:51','2026-06-07 17:06:51'),(3,1,'2026-06-07','','',6.00,'2026-06-07 17:11:02','2026-06-07 17:11:02'),(4,1,'2026-06-07','','',50.00,'2026-06-07 17:15:02','2026-06-07 17:15:02'),(5,1,'2026-06-07','','',2.00,'2026-06-07 17:35:31','2026-06-07 17:35:31'),(6,1,'2026-06-08','','',3.00,'2026-06-08 00:54:03','2026-06-08 00:54:03');
/*!40000 ALTER TABLE `material_purchases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `material_stock_movements`
--

DROP TABLE IF EXISTS `material_stock_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `material_stock_movements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `material_id` int(11) NOT NULL,
  `movement_date` date NOT NULL,
  `movement_type` varchar(50) NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT 0.00,
  `previous_stock` decimal(10,2) NOT NULL DEFAULT 0.00,
  `new_stock` decimal(10,2) NOT NULL DEFAULT 0.00,
  `unit` varchar(50) DEFAULT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_stock_movements_material` (`material_id`),
  KEY `idx_stock_movements_date` (`movement_date`),
  KEY `idx_stock_movements_reference` (`reference_type`,`reference_id`),
  CONSTRAINT `material_stock_movements_ibfk_1` FOREIGN KEY (`material_id`) REFERENCES `materials` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `material_stock_movements`
--

LOCK TABLES `material_stock_movements` WRITE;
/*!40000 ALTER TABLE `material_stock_movements` DISABLE KEYS */;
INSERT INTO `material_stock_movements` VALUES (1,6,'2026-06-08','purchase',1.00,0.00,1.00,'','purchase',6,'╬æ╬│╬┐╧ü╬¼ ╬▒╧Ç╧î ╧Ç╧ü╬┐╬╝╬╖╬╕╬╡╧à╧ä╬«','2026-06-08 00:54:03');
/*!40000 ALTER TABLE `material_stock_movements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `materials`
--

DROP TABLE IF EXISTS `materials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `materials` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `unit` varchar(50) DEFAULT NULL,
  `unit_price` decimal(10,2) DEFAULT 0.00,
  `stock` decimal(10,2) DEFAULT 0.00,
  `min_stock` decimal(10,2) DEFAULT 0.00,
  `category` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_materials_category` (`category`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `materials`
--

LOCK TABLES `materials` WRITE;
/*!40000 ALTER TABLE `materials` DISABLE KEYS */;
INSERT INTO `materials` VALUES (1,'╬╜╬╡╬┐ ╬╡╬║╬┐','╬╗╬╣╧ä╧ü╬▒',10.00,1.00,0.00,'╬æ╬│╬┐╧ü╬¼','2026-06-07 16:55:05','2026-06-07 16:55:05'),(2,'╧â╧Ç╬▒╧ä╬┐╧à╬╗╬▒','╧ä╬╡╬╝╬▒╧ç╬╣╬┐',2.00,3.00,0.00,'╬æ╬│╬┐╧ü╬¼','2026-06-07 16:55:05','2026-06-07 17:35:31'),(3,'╧Ç╬╣╬╜╬╡╬╗╬▒','╧ä╬╡╬╝',3.00,6.00,0.00,'╬æ╬│╬┐╧ü╬¼','2026-06-07 17:06:51','2026-06-07 17:11:02'),(4,'╬║╬┐╬╜╧ä╬▒╧ü╬╣','╧ä╬╝╧ç',2.00,1.00,0.00,'╬æ╬│╬┐╧ü╬¼','2026-06-07 17:06:51','2026-06-07 17:06:51'),(5,'╧ç╧ü╧ë╬╝╬▒','10 ╬╗╬╣╧ä╧ü╬▒',50.00,1.00,0.00,'╬æ╬│╬┐╧ü╬¼','2026-06-07 17:15:02','2026-06-07 17:15:02'),(6,'╬á╬╗╬▒╧â╧ä╬╣╬║╬┐ ╬¢╬╡╧à╬║╬┐','╧ä╬╝╧ç',3.00,1.00,0.00,'╬æ╬│╬┐╧ü╬¼','2026-06-08 00:54:03','2026-06-08 00:54:03');
/*!40000 ALTER TABLE `materials` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `offers`
--

DROP TABLE IF EXISTS `offers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `offers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `client_id` int(11) DEFAULT NULL,
  `offer_number` varchar(50) NOT NULL,
  `date` date NOT NULL,
  `valid_until` date DEFAULT NULL,
  `items` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`items`)),
  `subtotal` decimal(10,2) DEFAULT 0.00,
  `tax` decimal(10,2) DEFAULT 0.00,
  `discount` decimal(10,2) DEFAULT 0.00,
  `total` decimal(10,2) DEFAULT 0.00,
  `status` varchar(50) DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `offer_number` (`offer_number`),
  KEY `client_id` (`client_id`),
  KEY `idx_offers_date` (`date`),
  KEY `idx_offers_status` (`status`),
  CONSTRAINT `offers_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `offers`
--

LOCK TABLES `offers` WRITE;
/*!40000 ALTER TABLE `offers` DISABLE KEYS */;
/*!40000 ALTER TABLE `offers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `settings`
--

DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settings`
--

LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES (1,'company_settings','{\"name\":\"\\u03a4\\u03ad\\u03c7\\u03bd\\u03b7 \\u03ba\\u03b1\\u03b9 \\u03a7\\u03c1\\u03ce\\u03bc\\u03b1 \\u039d\\u03b9\\u03ba\\u03bf\\u03bb\\u03b1\\u0390\\u03b4\\u03b7\",\"taxId\":\"123456789\",\"address\":\"\\u0398\\u03ac\\u03c3\\u03bf\\u03c5 8\",\"phone\":\"+306978093442\"}',NULL,'2026-05-31 01:54:36','2026-06-07 18:47:52'),(2,'pricing_settings','{\"hourlyRate\":10,\"travelCost\":0.5}',NULL,'2026-05-31 02:24:36','2026-06-07 15:31:11');
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplier_payments`
--

DROP TABLE IF EXISTS `supplier_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `supplier_payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `supplier_id` int(11) NOT NULL,
  `purchase_id` int(11) DEFAULT NULL,
  `payment_date` date NOT NULL,
  `amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `payment_method` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_supplier_payments_supplier` (`supplier_id`),
  KEY `idx_supplier_payments_purchase` (`purchase_id`),
  KEY `idx_supplier_payments_date` (`payment_date`),
  CONSTRAINT `supplier_payments_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `supplier_payments_ibfk_2` FOREIGN KEY (`purchase_id`) REFERENCES `material_purchases` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier_payments`
--

LOCK TABLES `supplier_payments` WRITE;
/*!40000 ALTER TABLE `supplier_payments` DISABLE KEYS */;
INSERT INTO `supplier_payments` VALUES (1,1,1,'2026-06-07',5.00,'╬£╬╡╧ä╧ü╬╖╧ä╬¼','','2026-06-07 16:55:32','2026-06-07 16:55:32'),(2,2,2,'2026-06-07',4.00,'╬Ü╬¼╧ü╧ä╬▒','','2026-06-07 17:07:16','2026-06-07 17:07:16'),(3,1,3,'2026-06-07',6.00,'╬£╬╡╧ä╧ü╬╖╧ä╬¼','','2026-06-07 17:12:06','2026-06-07 17:12:47'),(4,1,NULL,'2026-06-07',60.00,'','','2026-06-07 17:15:47','2026-06-07 17:15:47'),(5,1,5,'2026-06-07',1.00,'','','2026-06-07 17:35:31','2026-06-07 17:35:31');
/*!40000 ALTER TABLE `supplier_payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `suppliers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_suppliers_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppliers`
--

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
INSERT INTO `suppliers` VALUES (1,'╬æ╬í╬ô╬Ñ╬í╬Ö╬ƒ╬Ñ ╬¥╬Ö╬Ü. & ╬ú╬Ö╬æ ╬ò.╬ò.','2551 023962',NULL,'╬ò╬╗. ╬Æ╬╡╬╜╬╣╬╢╬¡╬╗╬┐╧à 1, ╬æ╬╗╬╡╬╛╬▒╬╜╬┤╧ü╬┐╧ì╧Ç╬┐╬╗╬╖ 681 32','','2026-06-07 16:52:58','2026-06-07 16:52:58'),(2,'╬║╬┐╧å╧ä╬╡╧ü╬╡╬╗╬┐╧é','',NULL,'','','2026-06-07 17:05:35','2026-06-07 17:05:35');
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `templates`
--

DROP TABLE IF EXISTS `templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `estimated_duration` decimal(10,2) DEFAULT 0.00,
  `materials` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`materials`)),
  `tasks` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tasks`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `templates`
--

LOCK TABLES `templates` WRITE;
/*!40000 ALTER TABLE `templates` DISABLE KEYS */;
/*!40000 ALTER TABLE `templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `timesheets`
--

DROP TABLE IF EXISTS `timesheets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `timesheets` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `worker_id` int(11) NOT NULL,
  `job_id` int(11) DEFAULT NULL,
  `date` date NOT NULL,
  `hours_worked` decimal(10,2) DEFAULT 0.00,
  `hourly_rate` decimal(10,2) DEFAULT 0.00,
  `total_payment` decimal(10,2) DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `worker_id` (`worker_id`),
  KEY `job_id` (`job_id`),
  KEY `idx_timesheets_date` (`date`),
  CONSTRAINT `timesheets_ibfk_1` FOREIGN KEY (`worker_id`) REFERENCES `workers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `timesheets_ibfk_2` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `timesheets`
--

LOCK TABLES `timesheets` WRITE;
/*!40000 ALTER TABLE `timesheets` DISABLE KEYS */;
/*!40000 ALTER TABLE `timesheets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `workers`
--

DROP TABLE IF EXISTS `workers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `workers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `specialty` varchar(100) DEFAULT NULL,
  `hourly_rate` decimal(10,2) DEFAULT 0.00,
  `daily_rate` decimal(10,2) DEFAULT 0.00,
  `worker_type` enum('employee','owner') DEFAULT 'employee',
  `status` enum('active','inactive') DEFAULT 'active',
  `hire_date` date DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `total_hours` decimal(10,2) DEFAULT 0.00,
  `total_earnings` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_workers_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `workers`
--

LOCK TABLES `workers` WRITE;
/*!40000 ALTER TABLE `workers` DISABLE KEYS */;
INSERT INTO `workers` VALUES (1,'╬æ╬╜╧ä╧Ä╬╜╬╣╬┐╧é ╬£╬╣╧ç╬▒╬«╬╗','6923456789','╬ò╬╗╬▒╬╣╬┐╧ç╧ü╧ë╬╝╬▒╧ä╬╣╧â╧ä╬«╧é',6.00,0.00,'employee','active','2026-05-31','',0.00,0.00,'2026-05-31 02:49:53','2026-06-07 15:33:40'),(2,'╬¥╬╣╬║╬┐╬╗╬▒╬╣╬┤╬╖╧é','6967890123','╬ò╬╗╬▒╬╣╬┐╧ç╧ü╧ë╬╝╬▒╧ä╬╣╧â╧ä╬«╧é',10.00,0.00,'owner','active','2026-06-07','',0.00,0.00,'2026-06-07 15:17:43','2026-06-07 15:17:43'),(3,'Xreiszos','6934222333','╬î╬╗╬╡╧é ╬┐╬╣ ╬╡╬╣╬┤╬╣╬║╧î╧ä╬╖╧ä╬╡╧é',20.00,0.00,'owner','active','2026-06-07','',0.00,0.00,'2026-06-07 15:34:16','2026-06-07 15:34:16');
/*!40000 ALTER TABLE `workers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'painter_app'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-11  6:36:04
