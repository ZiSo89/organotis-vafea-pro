-- Εισαγωγή Test Data για Production
-- Copy-paste αυτό το αρχείο στο Plesk phpMyAdmin

-- Καθαρισμός παλιών δεδομένων
-- Σβήνουμε πρώτα τα child tables και μετά τα parent tables
DELETE FROM timesheets;
DELETE FROM invoices;
DELETE FROM offers;
DELETE FROM job_materials;
DELETE FROM job_workers;
DELETE FROM jobs;
DELETE FROM templates;
DELETE FROM materials;
DELETE FROM workers;
DELETE FROM clients;
DELETE FROM settings;

-- Reset AUTO_INCREMENT
ALTER TABLE clients AUTO_INCREMENT = 1;
ALTER TABLE workers AUTO_INCREMENT = 1;
ALTER TABLE materials AUTO_INCREMENT = 1;
ALTER TABLE jobs AUTO_INCREMENT = 1;
ALTER TABLE offers AUTO_INCREMENT = 1;
ALTER TABLE invoices AUTO_INCREMENT = 1;
ALTER TABLE templates AUTO_INCREMENT = 1;

-- Εισαγωγή Πελατών
INSERT INTO clients (name, phone, email, address, city, postal_code, afm, notes) VALUES
('Γιάννης Παπαδόπουλος', '6944123456', 'giannis@example.com', 'Δημοκρατίας 45', 'Αλεξανδρούπολη', '68100', '123456789', 'Τακτικός πελάτης'),
('Μαρία Νικολάου', '6955234567', 'maria@example.com', '14ης Μαΐου 15', 'Αλεξανδρούπολη', '68100', '987654321', 'Προτιμά ανοιχτά χρώματα'),
('Κώστας Γεωργίου', '6976345678', 'kostas@example.com', 'Κύπρου 42', 'Αλεξανδρούπολη', '68100', '456789123', NULL),
('Ελένη Αθανασίου', '6987456789', 'eleni@example.com', 'Βενιζέλου 18', 'Αλεξανδρούπολη', '68100', '321654987', 'VIP πελάτης'),
('Νίκος Δημητρίου', '6912567890', 'nikos@example.com', 'Καραολή και Δημητρίου 33', 'Αλεξανδρούπολη', '68100', '147258369', NULL);

-- Εισαγωγή Εργατών
INSERT INTO workers (name, phone, specialty, hourly_rate, daily_rate, status, hire_date, notes) VALUES
('Δημήτρης Βασιλείου', '6923111222', 'Βαφέας', 15.00, 100.00, 'active', '2024-01-15', 'Έμπειρος βαφέας με 10 χρόνια εμπειρίας'),
('Γιώργος Αντωνίου', '6934222333', 'Βοηθός', 12.00, 80.00, 'active', '2024-03-01', NULL),
('Σωτήρης Μιχαήλ', '6945333444', 'Ειδικός σε Ξύλο', 18.00, 120.00, 'active', '2023-06-10', 'Ειδικότητα σε ξύλινες επιφάνειες'),
('Παναγιώτης Ιωάννου', '6956444555', 'Βαφέας', 15.00, 100.00, 'inactive', '2023-09-20', 'Προσωρινά ανενεργός');

-- Εισαγωγή Υλικών
INSERT INTO materials (name, unit, unit_price, stock, min_stock, category) VALUES
('Πλαστικό Χρώμα Λευκό 3L', 'τμχ', 12.50, 50, 10, 'Χρώματα'),
('Πλαστικό Χρώμα Μπεζ 3L', 'τμχ', 13.00, 30, 10, 'Χρώματα'),
('Ελαιόχρωμα Λευκό 750ml', 'τμχ', 8.50, 25, 5, 'Χρώματα'),
('Ρολό 25cm', 'τμχ', 3.50, 100, 20, 'Εργαλεία'),
('Πινέλο 5cm', 'τμχ', 2.80, 80, 15, 'Εργαλεία'),
('Νάιλον Προστασίας 4x5m', 'τμχ', 1.50, 200, 50, 'Αναλώσιμα'),
('Ταινία Χαρτοταινία 50mm', 'τμχ', 2.20, 150, 30, 'Αναλώσιμα'),
('Ακρυλικό Χρώμα Μπλε 1L', 'τμχ', 9.00, 20, 5, 'Χρώματα'),
('Ξύστρα Μεταλλική', 'τμχ', 4.50, 40, 10, 'Εργαλεία'),
('Αστάρι Ακρυλικό 3L', 'τμχ', 11.00, 35, 8, 'Χρώματα');

-- Εισαγωγή Εργασιών
INSERT INTO jobs (
    client_id, title, type, date, next_visit, description, address, city, postal_code, 
    rooms, area, substrate, materials_cost, kilometers, billing_hours, billing_rate,
    vat, cost_per_km, notes, assigned_workers, paints,
    start_date, end_date, status, total_cost, is_paid, coordinates
) VALUES
(
    1, 
    'Βαφή Διαμερίσματος',
    'Εσωτερικοί χώροι',
    '2025-11-01',
    '2025-11-15',
    'Πλήρης βαφή 2άρι διαμέρισμα με πλαστικό χρώμα',
    'Δημοκρατίας 45',
    'Αλεξανδρούπολη',
    '68100',
    2,
    80.00,
    'Γυψοσανίδα',
    150.00,
    5,
    8,
    50,
    24,
    0.5,
    'Πελάτης ζήτησε ανοιχτά χρώματα',
    '[{"workerId":1,"workerName":"Δημήτρης Βασιλείου","workerSpecialty":"Βαφέας","hoursAllocated":8,"hourlyRate":15,"laborCost":120}]',
    '[{"name":"Λευκό Ματ","code":"WH-001"}]',
    '2025-11-01',
    '2025-11-05',
    'Ολοκληρώθηκε',
    1200.00,
    1,
    '{"lat": 40.8476, "lng": 25.8759}'
),
(
    2,
    'Βαφή Καταστήματος',
    'Κάγκελα/Πέργκολα',
    '2025-11-10',
    '2025-12-01',
    'Εσωτερική και εξωτερική βαφή καταστήματος',
    '14ης Μαΐου 15',
    'Αλεξανδρούπολη',
    '68100',
    4,
    150.00,
    'Σοβάς',
    350.00,
    8,
    16,
    55,
    24,
    0.5,
    'Εργασία σε εξέλιξη',
    '[{"workerId":1,"workerName":"Δημήτρης Βασιλείου","workerSpecialty":"Βαφέας","hoursAllocated":12,"hourlyRate":15,"laborCost":180},{"workerId":2,"workerName":"Γιώργος Αντωνίου","workerSpecialty":"Βοηθός","hoursAllocated":12,"hourlyRate":12,"laborCost":144}]',
    '[{"name":"Μπεζ Ανοιχτό","code":"BG-002"}]',
    '2025-11-10',
    '2025-11-15',
    'Σε εξέλιξη',
    2500.00,
    0,
    '{"lat": 40.8476, "lng": 25.8759}'
),
(
    3,
    'Βαφή Γραφείου',
    'Εσωτερικοί χώροι',
    '2025-11-20',
    NULL,
    'Βαφή 3 χώρων γραφείου',
    'Κύπρου 42',
    'Αλεξανδρούπολη',
    '68100',
    3,
    60.00,
    'Γυψοσανίδα',
    120.00,
    3,
    6,
    50,
    24,
    0.5,
    NULL,
    '[]',
    '[]',
    '2025-11-20',
    '2025-11-22',
    'Υποψήφιος',
    800.00,
    0,
    '{"lat": 40.8476, "lng": 25.8759}'
),
(
    4,
    'Βαφή Βίλας',
    'Εξωτερικοί χώροι',
    '2025-12-01',
    '2026-01-15',
    'Εξωτερική βαφή μονοκατοικίας με ελαιόχρωμα',
    'Βενιζέλου 18',
    'Αλεξανδρούπολη',
    '68100',
    5,
    250.00,
    'Σοβάς',
    600.00,
    12,
    24,
    60,
    24,
    0.5,
    'Μεγάλη εργασία - απαιτείται προσοχή',
    '[{"workerId":3,"workerName":"Σωτήρης Μιχαήλ","workerSpecialty":"Ειδικός σε Ξύλο","hoursAllocated":20,"hourlyRate":18,"laborCost":360}]',
    '[{"name":"Ελαιόχρωμα Λευκό","code":"OL-001"}]',
    '2025-12-01',
    '2025-12-10',
    'Προγραμματισμένη',
    3500.00,
    0,
    '{"lat": 40.8476, "lng": 25.8759}'
);
