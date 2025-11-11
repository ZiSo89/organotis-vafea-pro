-- Reset and Import Script for Server
-- Encoding: UTF-8
-- Usage: mysql -u painter_user -p painter_app < reset_and_import.sql

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- ΔΙΑΓΡΑΦΗ ΔΕΔΟΜΕΝΩΝ
-- ============================================

DELETE FROM timesheets;
DELETE FROM job_workers;
DELETE FROM job_materials;
DELETE FROM invoices;
DELETE FROM offers;
DELETE FROM calendar_events;
DELETE FROM jobs;
DELETE FROM workers;
DELETE FROM materials;
DELETE FROM clients;
DELETE FROM templates;
DELETE FROM settings;

-- Reset Auto Increment
ALTER TABLE timesheets AUTO_INCREMENT = 1;
ALTER TABLE job_workers AUTO_INCREMENT = 1;
ALTER TABLE job_materials AUTO_INCREMENT = 1;
ALTER TABLE invoices AUTO_INCREMENT = 1;
ALTER TABLE offers AUTO_INCREMENT = 1;
ALTER TABLE calendar_events AUTO_INCREMENT = 1;
ALTER TABLE jobs AUTO_INCREMENT = 1;
ALTER TABLE workers AUTO_INCREMENT = 1;
ALTER TABLE materials AUTO_INCREMENT = 1;
ALTER TABLE clients AUTO_INCREMENT = 1;
ALTER TABLE templates AUTO_INCREMENT = 1;
ALTER TABLE settings AUTO_INCREMENT = 1;

-- ============================================
-- ΕΙΣΑΓΩΓΗ ΝΕΩΝ ΔΕΔΟΜΕΝΩΝ
-- ============================================

-- Clients
INSERT INTO clients (name, phone, email, address, city, postal_code, afm, notes) VALUES
('Γιάννης Παπαδόπουλος', '6944123456', 'giannis@example.com', 'Δημοκρατίας 45', 'Αλεξανδρούπολη', '68100', '123456789', 'Τακτικός πελάτης'),
('Μαρία Νικολάου', '6955234567', 'maria@example.com', '14ης Μαΐου 15', 'Αλεξανδρούπολη', '68100', '987654321', 'Προτιμά ανοιχτά χρώματα'),
('Κώστας Γεωργίου', '6976345678', 'kostas@example.com', 'Κύπρου 42', 'Αλεξανδρούπολη', '68100', '456789123', NULL),
('Ελένη Αθανασίου', '6987456789', 'eleni@example.com', 'Βενιζέλου 18', 'Αλεξανδρούπολη', '68100', '321654987', 'VIP πελάτης'),
('Νίκος Δημητρίου', '6912567890', 'nikos@example.com', 'Καραολή και Δημητρίου 33', 'Αλεξανδρούπολη', '68100', '147258369', NULL),
('Σοφία Παναγιώτου', '6923678901', 'sofia@example.com', 'Ελευθερίας 77', 'Αλεξανδρούπολη', '68100', '258369147', NULL),
('Athanasios Zisoglou', '6978799299', 'zisoglou@hotmail.gr', 'Αγίου Δημητρίου 9', 'Αλεξανδρούπολη', '68100', NULL, 'τιμιος');

-- Workers
INSERT INTO workers (name, phone, specialty, hourly_rate, daily_rate, status, hire_date, notes) VALUES
('Δημήτρης Βασιλείου', '6923111222', 'Βαφέας', 15.00, 100.00, 'active', '2024-01-15', 'Έμπειρος βαφέας με 10 χρόνια εμπειρία'),
('Γιώργος Αντωνίου', '6934222333', 'Ελαιοχρωματιστής', 12.00, 0.00, 'inactive', '2024-03-01', ''),
('Σωτήρης Μιχαήλ', '6945333444', 'Ειδικός σε Ξύλο', 18.00, 120.00, 'active', '2023-06-10', 'Ειδικότητα σε ξύλινες επιφάνειες');

-- Materials
INSERT INTO materials (name, unit, unit_price, stock, min_stock, category) VALUES
('Πλαστικό Χρώμα Λευκό 3L', 'τμχ', 12.50, 50.00, 10.00, 'Χρώματα'),
('Πλαστικό Χρώμα Μπεζ 3L', 'τμχ', 13.00, 30.00, 10.00, 'Χρώματα'),
('Ελαιόχρωμα Λευκό 750ml', 'τμχ', 8.50, 25.00, 5.00, 'Χρώματα'),
('Ρολό 25cm', 'τμχ', 3.50, 100.00, 20.00, 'Εργαλεία'),
('Πινέλο 5cm', 'τμχ', 2.80, 80.00, 15.00, 'Εργαλεία'),
('Νάιλον Προστασίας 4x5m', 'τμχ', 1.50, 200.00, 50.00, 'Αναλώσιμα'),
('Ταινία Χαρτοταινία 50mm', 'τμχ', 2.20, 150.00, 30.00, 'Αναλώσιμα'),
('Ακρυλικό Χρώμα Μπλε 1L', 'τμχ', 9.00, 20.00, 5.00, 'Χρώματα'),
('Σύστρα Μεταλλική', 'τμχ', 4.50, 40.00, 10.00, 'Εργαλεία'),
('Αστάρι Ακρυλικό 3L', 'τμχ', 11.00, 35.00, 8.00, 'Χρώματα');

-- Jobs
INSERT INTO jobs (client_id, title, type, date, next_visit, rooms, area, substrate, materials_cost, kilometers, billing_hours, billing_rate, vat, cost_per_km, notes, assigned_workers, paints, description, address, city, postal_code, start_date, end_date, status, total_cost, is_paid, coordinates) VALUES
(1, 'Βαφή Διαμερίσματος', 'Εσωτερικοί χώροι', '2025-11-01', '2025-11-15', 2, 80.00, 'Γυψοσανίδα', 150.00, 5.00, 8.00, 50.00, 24.00, 0.50, 'Πελάτης ζήτησε ανοιχτά χρώματα', '[{"workerId":1,"workerName":"Δημήτρης Βασιλείου","workerSpecialty":"Βαφέας","hoursAllocated":8,"hourlyRate":15,"laborCost":120}]', '[{"name":"Λευκό Ματ","code":"WH-001"}]', 'Πλήρης βαφή 2άρι διαμέρισμα με πλαστικό χρώμα', 'Δημοκρατίας 45', 'Αλεξανδρούπολη', '68100', '2025-11-01', '2025-11-05', 'Ολοκληρώθηκε', 1200.00, 1, '{"lat": 40.8476, "lng": 25.8759}'),
(2, 'Βαφή Καταστήματος', 'Κέγκελα/Πέργκολα', '2025-11-10', '2025-12-01', 4, 150.00, 'Σοβάς', 350.00, 8.00, 16.00, 55.00, 24.00, 0.50, 'Εργασία σε εξέλιξη', '[{"workerId":1,"workerName":"Δημήτρης Βασιλείου","workerSpecialty":"Βαφέας","hoursAllocated":12,"hourlyRate":15,"laborCost":180},{"workerId":2,"workerName":"Γιώργος Αντωνίου","workerSpecialty":"Βοηθός","hoursAllocated":12,"hourlyRate":12,"laborCost":144}]', '[{"name":"Μπεζ Ανοιχτό","code":"BG-002"}]', 'Εσωτερική και εξωτερική βαφή καταστήματος', '14ης Μαΐου 15', 'Αλεξανδρούπολη', '68100', '2025-11-10', '2025-11-15', 'Σε εξέλιξη', 2500.00, 0, '{"lat": 40.8476, "lng": 25.8759}'),
(3, 'Βαφή Γραφείου', 'Εσωτερικοί χώροι', '2025-11-20', NULL, 3, 60.00, 'Γυψοσανίδα', 120.00, 3.00, 6.00, 50.00, 24.00, 0.50, NULL, '[]', '[]', 'Βαφή 3 χώρων γραφείου', 'Κύπρου 42', 'Αλεξανδρούπολη', '68100', '2025-11-20', '2025-11-22', 'Υποψήφιος', 800.00, 0, '{"lat": 40.8476, "lng": 25.8759}'),
(4, 'Εξωτερικοί χώροι', 'Εξωτερικοί χώροι', '2025-12-01', '2025-11-10', 5, 250.00, 'Σοβάς', 600.00, 12.00, 24.00, 60.00, 24.00, 0.50, 'Μεγάλη εργασία - απαιτείται προσοχή', '[{"workerId":3,"workerName":"Σωτήρης Μιχαήλ","workerSpecialty":"Ειδικός σε Ξύλο","hoursAllocated":20,"hourlyRate":18,"laborCost":360}]', '[{"name":"Ελαιόχρωμα Λευκό","code":"OL-001"}]', 'Εξωτερική βαφή μονοκατοικίας με ελαιόχρωμα', 'Βενιζέλου 18', 'Αλεξανδρούπολη', '68100', '2025-12-01', '2025-12-10', 'Προγραμματισμένη', 3500.00, 0, '{"lat": 40.8476, "lng": 25.8759}');

-- Calendar Events
INSERT INTO calendar_events (title, start_date, end_date, start_time, end_time, all_day, client_id, job_id, address, description, status, color, reminder_sent) VALUES
('Σακης μερεμετια', '2025-11-14 00:00:00', '2025-11-15 00:00:00', '09:00:00', '12:00:00', 0, 7, NULL, 'Αγίου Δημητρίου 9', '', 'in_progress', NULL, 0),
('Ελένη Αθανασίου - Εξωτερικοί χώροι', '2025-11-10 00:00:00', '2025-11-10 00:00:00', NULL, NULL, 1, 4, 4, 'Βενιζέλου 18', 'Εξωτερική βαφή μονοκατοικίας με ελαιόχρωμα', '', '#6b7280', 0),
('Γιάννης Παπαδόπουλος - Βαφή Διαμερίσματος', '2025-11-15 00:00:00', '2025-11-15 00:00:00', NULL, NULL, 1, 1, 1, 'Δημοκρατίας 45', 'Πλήρης βαφή 2άρι διαμέρισμα με πλαστικό χρώμα', '', '#6b7280', 0),
('Μαρία Νικολάου - Βαφή Καταστήματος', '2025-12-01 00:00:00', '2025-12-01 00:00:00', NULL, NULL, 1, 2, 2, '14ης Μαΐου 15', 'Εσωτερική και εξωτερική βαφή καταστήματος', '', '#6b7280', 0);

SET FOREIGN_KEY_CHECKS = 1;

-- Τέλος
