<?php
/**
 * Εισαγωγή Test Data με σωστό UTF-8 encoding
 */

// Database connection
$dsn = "mysql:host=localhost;port=3306;dbname=painter_app;charset=utf8mb4";
$pdo = new PDO($dsn, 'root', '', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
]);

// Καθαρισμός δεδομένων
echo "Καθαρισμός παλιών δεδομένων...\n";
$pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
$pdo->exec("TRUNCATE TABLE timesheets");
$pdo->exec("TRUNCATE TABLE job_materials");
$pdo->exec("TRUNCATE TABLE job_workers");
$pdo->exec("TRUNCATE TABLE invoices");
$pdo->exec("TRUNCATE TABLE offers");
$pdo->exec("TRUNCATE TABLE jobs");
$pdo->exec("TRUNCATE TABLE templates");
$pdo->exec("TRUNCATE TABLE materials");
$pdo->exec("TRUNCATE TABLE workers");
$pdo->exec("TRUNCATE TABLE clients");
$pdo->exec("TRUNCATE TABLE settings");
$pdo->exec("SET FOREIGN_KEY_CHECKS = 1");

// Εισαγωγή Πελατών
echo "Εισαγωγή πελατών...\n";
$stmt = $pdo->prepare("
    INSERT INTO clients (name, phone, email, address, city, postal_code, afm, notes) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
");

$clients = [
    ['Γιάννης Παπαδόπουλος', '6944123456', 'giannis@example.com', 'Δημοκρατίας 45', 'Αλεξανδρούπολη', '68100', '123456789', 'Τακτικός πελάτης'],
    ['Μαρία Νικολάου', '6955234567', 'maria@example.com', '14ης Μαΐου 15', 'Αλεξανδρούπολη', '68100', '987654321', 'Προτιμά ανοιχτά χρώματα'],
    ['Κώστας Γεωργίου', '6976345678', 'kostas@example.com', 'Κύπρου 42', 'Αλεξανδρούπολη', '68100', '456789123', null],
    ['Ελένη Αθανασίου', '6987456789', 'eleni@example.com', 'Βενιζέλου 18', 'Αλεξανδρούπολη', '68100', '321654987', 'VIP πελάτης'],
    ['Νίκος Δημητρίου', '6912567890', 'nikos@example.com', 'Καραολή και Δημητρίου 33', 'Αλεξανδρούπολη', '68100', '147258369', null]
];

foreach ($clients as $client) {
    $stmt->execute($client);
}

// Εισαγωγή Εργατών
echo "Εισαγωγή εργατών...\n";
$stmt = $pdo->prepare("
    INSERT INTO workers (name, phone, specialty, hourly_rate, daily_rate, status, hire_date, notes) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
");

$workers = [
    ['Δημήτρης Βασιλείου', '6923111222', 'Βαφέας', 15.00, 100.00, 'active', '2024-01-15', 'Έμπειρος βαφέας με 10 χρόνια εμπειρίας'],
    ['Γιώργος Αντωνίου', '6934222333', 'Βοηθός', 12.00, 80.00, 'active', '2024-03-01', null],
    ['Σωτήρης Μιχαήλ', '6945333444', 'Ειδικός σε Ξύλο', 18.00, 120.00, 'active', '2023-06-10', 'Ειδικότητα σε ξύλινες επιφάνειες'],
    ['Παναγιώτης Ιωάννου', '6956444555', 'Βαφέας', 15.00, 100.00, 'inactive', '2023-09-20', 'Προσωρινά ανενεργός']
];

foreach ($workers as $worker) {
    $stmt->execute($worker);
}

// Εισαγωγή Υλικών
echo "Εισαγωγή υλικών...\n";
$stmt = $pdo->prepare("
    INSERT INTO materials (name, unit, unit_price, stock, min_stock, category) 
    VALUES (?, ?, ?, ?, ?, ?)
");

$materials = [
    ['Πλαστικό Χρώμα Λευκό 3L', 'τμχ', 12.50, 50, 10, 'Χρώματα'],
    ['Πλαστικό Χρώμα Μπεζ 3L', 'τμχ', 13.00, 30, 10, 'Χρώματα'],
    ['Ελαιόχρωμα Λευκό 750ml', 'τμχ', 8.50, 25, 5, 'Χρώματα'],
    ['Ρολό 25cm', 'τμχ', 3.50, 100, 20, 'Εργαλεία'],
    ['Πινέλο 5cm', 'τμχ', 2.80, 80, 15, 'Εργαλεία'],
    ['Νάιλον Προστασίας 4x5m', 'τμχ', 1.50, 200, 50, 'Αναλώσιμα'],
    ['Ταινία Χαρτοταινία 50mm', 'τμχ', 2.20, 150, 30, 'Αναλώσιμα'],
    ['Ακρυλικό Χρώμα Μπλε 1L', 'τμχ', 9.00, 20, 5, 'Χρώματα'],
    ['Ξύστρα Μεταλλική', 'τμχ', 4.50, 40, 10, 'Εργαλεία'],
    ['Αστάρι Ακρυλικό 3L', 'τμχ', 11.00, 35, 8, 'Χρώματα']
];

foreach ($materials as $material) {
    $stmt->execute($material);
}

// Εισαγωγή Εργασιών
echo "Εισαγωγή εργασιών...\n";
$stmt = $pdo->prepare("
    INSERT INTO jobs (
        client_id, title, type, date, next_visit, description, address, city, postal_code, 
        rooms, area, substrate, materials_cost, kilometers, billing_hours, billing_rate,
        vat, cost_per_km, notes, assigned_workers, paints,
        start_date, end_date, status, total_cost, is_paid, coordinates
    ) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
");

$jobs = [
    [
        1, // client_id
        'Βαφή Διαμερίσματος', // title
        'Εσωτερικοί χώροι', // type
        '2025-11-01', // date
        '2025-11-15', // next_visit
        'Πλήρης βαφή 2άρι διαμέρισμα με πλαστικό χρώμα', // description
        'Δημοκρατίας 45', // address
        'Αλεξανδρούπολη', // city
        '68100', // postal_code
        2, // rooms
        80.00, // area
        'Γυψοσανίδα', // substrate
        150.00, // materials_cost
        5, // kilometers
        8, // billing_hours
        50, // billing_rate
        24, // vat
        0.5, // cost_per_km
        'Πελάτης ζήτησε ανοιχτά χρώματα', // notes
        '[{"workerId":1,"workerName":"Δημήτρης Βασιλείου","workerSpecialty":"Βαφέας","hoursAllocated":8,"hourlyRate":15,"laborCost":120}]', // assigned_workers
        '[{"name":"Λευκό Ματ","code":"WH-001"}]', // paints
        '2025-11-01', // start_date
        '2025-11-05', // end_date
        'Ολοκληρώθηκε', // status
        1200.00, // total_cost
        1, // is_paid
        '{"lat": 40.8476, "lng": 25.8759}' // coordinates (Αλεξανδρούπολη)
    ],
    [
        2, // client_id
        'Βαφή Καταστήματος', // title
        'Κάγκελα/Πέργκολα', // type
        '2025-11-10', // date
        '2025-12-01', // next_visit
        'Εσωτερική και εξωτερική βαφή καταστήματος', // description
        '14ης Μαΐου 15', // address
        'Αλεξανδρούπολη', // city
        '68100', // postal_code
        4, // rooms
        150.00, // area
        'Σοβάς', // substrate
        350.00, // materials_cost
        8, // kilometers
        16, // billing_hours
        55, // billing_rate
        24, // vat
        0.5, // cost_per_km
        'Εργασία σε εξέλιξη', // notes
        '[{"workerId":1,"workerName":"Δημήτρης Βασιλείου","workerSpecialty":"Βαφέας","hoursAllocated":12,"hourlyRate":15,"laborCost":180},{"workerId":2,"workerName":"Γιώργος Αντωνίου","workerSpecialty":"Βοηθός","hoursAllocated":12,"hourlyRate":12,"laborCost":144}]', // assigned_workers
        '[{"name":"Μπεζ Ανοιχτό","code":"BG-002"}]', // paints
        '2025-11-10', // start_date
        '2025-11-15', // end_date
        'Σε εξέλιξη', // status
        2500.00, // total_cost
        0, // is_paid
        '{"lat": 40.8476, "lng": 25.8759}' // coordinates (Αλεξανδρούπολη)
    ],
    [
        3, // client_id
        'Βαφή Γραφείου', // title
        'Εσωτερικοί χώροι', // type
        '2025-11-20', // date
        null, // next_visit
        'Βαφή 3 χώρων γραφείου', // description
        'Κύπρου 42', // address
        'Αλεξανδρούπολη', // city
        '68100', // postal_code
        3, // rooms
        60.00, // area
        'Γυψοσανίδα', // substrate
        120.00, // materials_cost
        3, // kilometers
        6, // billing_hours
        50, // billing_rate
        24, // vat
        0.5, // cost_per_km
        null, // notes
        '[]', // assigned_workers
        '[]', // paints
        '2025-11-20', // start_date
        '2025-11-22', // end_date
        'Υποψήφιος', // status
        800.00, // total_cost
        0, // is_paid
        '{"lat": 40.8476, "lng": 25.8759}' // coordinates (Αλεξανδρούπολη)
    ],
    [
        4, // client_id
        'Βαφή Βίλας', // title
        'Εξωτερικοί χώροι', // type
        '2025-12-01', // date
        '2026-01-15', // next_visit
        'Εξωτερική βαφή μονοκατοικίας με ελαιόχρωμα', // description
        'Βενιζέλου 18', // address
        'Αλεξανδρούπολη', // city
        '68100', // postal_code
        5, // rooms
        250.00, // area
        'Σοβάς', // substrate
        600.00, // materials_cost
        12, // kilometers
        24, // billing_hours
        60, // billing_rate
        24, // vat
        0.5, // cost_per_km
        'Μεγάλη εργασία - απαιτείται προσοχή', // notes
        '[{"workerId":3,"workerName":"Σωτήρης Μιχαήλ","workerSpecialty":"Ειδικός σε Ξύλο","hoursAllocated":20,"hourlyRate":18,"laborCost":360}]', // assigned_workers
        '[{"name":"Ελαιόχρωμα Λευκό","code":"OL-001"}]', // paints
        '2025-12-01', // start_date
        '2025-12-10', // end_date
        'Προγραμματισμένη', // status
        3500.00, // total_cost
        0, // is_paid
        '{"lat": 40.8476, "lng": 25.8759}' // coordinates (Αλεξανδρούπολη)
    ]
];

foreach ($jobs as $job) {
    $stmt->execute($job);
}

echo "\n✅ Τα δεδομένα εισήχθησαν επιτυχώς με σωστό UTF-8 encoding!\n";
?>
