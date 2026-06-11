<?php
/**
 * Script για δημιουργία reset_and_import.sql (χωρίς σύνδεση στη βάση)
 */

// Set UTF-8 encoding (if mbstring extension is available)
if (function_exists('mb_internal_encoding')) {
    mb_internal_encoding('UTF-8');
    mb_http_output('UTF-8');
}

$currentYear = (int)date('Y');
$defaultStartDate = ($currentYear - 3) . '-01-01';
$defaultEndDate = ($currentYear - 1) . '-12-31';

$options = getopt('', ['seed::', 'start::', 'end::', 'jobs-per-week::', 'paid-jobs-per-week::']);
$config = [
    'seed' => isset($options['seed']) ? (int)$options['seed'] : 1234,
    'start_date' => $options['start'] ?? $defaultStartDate,
    'end_date' => $options['end'] ?? $defaultEndDate,
    'jobs_per_week' => isset($options['jobs-per-week']) ? max(2, (int)$options['jobs-per-week']) : 6,
    'paid_jobs_per_week' => isset($options['paid-jobs-per-week']) ? max(1, (int)$options['paid-jobs-per-week']) : 2,
];
$config['paid_jobs_per_week'] = min($config['paid_jobs_per_week'], $config['jobs_per_week']);

mt_srand($config['seed']);
srand($config['seed']);

function sqlValue($value) {
    if ($value === null) {
        return 'NULL';
    }

    if (is_bool($value)) {
        return $value ? '1' : '0';
    }

    if (is_int($value) || is_float($value)) {
        return (string)$value;
    }

    return "'" . str_replace("'", "''", (string)$value) . "'";
}

function sqlNullableValue($value) {
    return ($value === null || $value === '') ? 'NULL' : sqlValue($value);
}

function sqlNumber($value, $decimals = 2) {
    return $value === null ? 'NULL' : number_format((float)$value, $decimals, '.', '');
}

function sqlInt($value) {
    return $value === null ? 'NULL' : (string)(int)$value;
}

function jsonValue(array $value) {
    return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function materialCanonicalKey($name, $category, $colorCode = null) {
    $normalize = function ($value) {
        $value = transliterate((string)$value);
        $value = strtolower(trim($value));
        $value = preg_replace('/[^a-z0-9]+/', ' ', $value);
        return trim(preg_replace('/\s+/', ' ', $value));
    };

    $categoryKey = $normalize($category);
    $codeKey = strtoupper(preg_replace('/[^A-Z0-9]+/', '', transliterate((string)$colorCode)));
    if ($category === 'Χρώμα' && $codeKey !== '') {
        return "category:$categoryKey|color_code:$codeKey";
    }

    $words = array_filter(explode(' ', $normalize($name)));
    sort($words);
    return "category:$categoryKey|name:" . implode(' ', $words);
}

function appendTableReset(&$sqlOutput, $table, $conditional = false) {
    $tableName = str_replace('`', '``', $table);

    if (!$conditional) {
        $sqlOutput .= "DELETE FROM `$tableName`;\n";
        $sqlOutput .= "ALTER TABLE `$tableName` AUTO_INCREMENT = 1;\n";
        return;
    }

    $tableLiteral = str_replace("'", "''", $table);
    $sqlOutput .= "SET @reset_table_exists = (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '$tableLiteral');\n";
    $sqlOutput .= "SET @reset_sql = IF(@reset_table_exists > 0, 'DELETE FROM `$tableName`', 'SELECT 1');\n";
    $sqlOutput .= "PREPARE reset_stmt FROM @reset_sql;\n";
    $sqlOutput .= "EXECUTE reset_stmt;\n";
    $sqlOutput .= "DEALLOCATE PREPARE reset_stmt;\n";
    $sqlOutput .= "SET @reset_sql = IF(@reset_table_exists > 0, 'ALTER TABLE `$tableName` AUTO_INCREMENT = 1', 'SELECT 1');\n";
    $sqlOutput .= "PREPARE reset_stmt FROM @reset_sql;\n";
    $sqlOutput .= "EXECUTE reset_stmt;\n";
    $sqlOutput .= "DEALLOCATE PREPARE reset_stmt;\n";
}

// SQL file output with UTF-8 BOM and charset declaration
$sqlOutput = "\xEF\xBB\xBF"; // UTF-8 BOM
$sqlOutput .= "-- Οργανωτής Βαφέα Pro - Reset & Import Database\n";
$sqlOutput .= "-- Δημιουργήθηκε αυτόματα: " . date('Y-m-d H:i:s') . "\n\n";
$sqlOutput .= "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;\n";
$sqlOutput .= "SET CHARACTER SET utf8mb4;\n";
$sqlOutput .= "SET FOREIGN_KEY_CHECKS = 0;\n";
$sqlOutput .= "SET SQL_MODE = \"NO_AUTO_VALUE_ON_ZERO\";\n";
$sqlOutput .= "SET time_zone = \"+00:00\";\n\n";

// ΔΙΑΓΡΑΦΗ ΔΕΔΟΜΕΝΩΝ
echo "Δημιουργία SQL για διαγραφή δεδομένων...\n";
$sqlOutput .= "-- ΔΙΑΓΡΑΦΗ ΔΕΔΟΜΕΝΩΝ\n";
$optionalTables = [
    'timesheets',
    'job_materials',
    'job_workers',
];
$tables = [
    'job_payments',
    'job_visits',
    'supplier_payments',
    'material_stock_movements',
    'material_purchase_items',
    'material_purchases',
    'invoices',
    'offers',
    'calendar_events',
    'jobs',
    'workers',
    'materials',
    'suppliers',
    'clients',
    'templates',
    'settings'
];

foreach ($optionalTables as $table) {
    appendTableReset($sqlOutput, $table, true);
}

foreach ($tables as $table) {
    appendTableReset($sqlOutput, $table);
}
$sqlOutput .= "\n";

// CLIENTS - Δημιουργία μεγάλου αριθμού πελατών
echo "Δημιουργία SQL για πελάτες...\n";

$firstNames = ['Γιάννης', 'Μαρία', 'Κώστας', 'Ελένη', 'Νίκος', 'Σοφία', 'Δημήτρης', 'Άννα', 'Παναγιώτης', 'Κατερίνα', 'Αντώνης', 'Βασιλική', 'Γεώργιος', 'Χριστίνα', 'Μιχάλης', 'Ευαγγελία', 'Σταύρος', 'Δέσποινα', 'Θανάσης', 'Μαρίνα', 'Πέτρος', 'Φωτεινή', 'Ανδρέας', 'Ιωάννα', 'Βασίλης', 'Αικατερίνη', 'Χρήστος', 'Ειρήνη', 'Σπύρος', 'Αλεξάνδρα'];
$lastNames = ['Παπαδόπουλος', 'Νικολάου', 'Γεωργίου', 'Αθανασίου', 'Δημητρίου', 'Παναγιώτου', 'Ιωάννου', 'Παύλου', 'Χρήστου', 'Βασιλείου', 'Αντωνίου', 'Μιχαήλ', 'Λάμπρου', 'Κωνσταντίνου', 'Πετρίδης', 'Μαυρίδης', 'Σταματίου', 'Οικονόμου', 'Καραγιάννης', 'Παπακώστας', 'Ζαχαρίου', 'Σαββίδης', 'Κυριακίδης', 'Αλεξίου', 'Θεοδωρίδης'];
$streets = ['Δημοκρατίας', '14ης Μαΐου', 'Κύπρου', 'Βενιζέλου', 'Καραολή και Δημητρίου', 'Ελευθερίας', 'Αγίου Δημητρίου', 'Καποδιστρίου', 'Ορφέως', 'Σωκράτους', 'Πλάτωνος', 'Αριστοτέλους', 'Μ. Αλεξάνδρου', 'Εθνικής Αντιστάσεως', 'Λεωφόρος Δημοκρατίας', 'Βύρωνος', 'Κολοκοτρώνη', 'Μιαούλη', 'Παπαφλέσσα', '25ης Μαρτίου'];
$notes = ['Τακτικός πελάτης', 'Προτιμά πρωινές ώρες', 'Επιχειρηματίας', 'VIP πελάτης', 'Προτιμά ανοιχτά χρώματα', 'Ζητά προσφορά πρώτα', 'Πολύ απαιτητικός', 'Συνεργάσιμος πελάτης', 'Πληρώνει έγκαιρα', 'Ζητά οικολογικά υλικά'];

$clients = [];
$clientStart = new DateTime($config['start_date']);
$clientEnd = new DateTime($config['end_date']);
$estimatedWeeks = (int)ceil(max(1, $clientEnd->diff($clientStart)->days + 1) / 7);
$clientTarget = max(520, (int)ceil(($estimatedWeeks * $config['jobs_per_week']) / 2) + 20);
// Δημιουργούμε αρκετούς πελάτες ώστε τα πολλά demo έργα να μην ανακυκλώνουν συνεχώς τα ίδια ονόματα.
for ($i = 0; $i < $clientTarget; $i++) {
    $firstName = $firstNames[array_rand($firstNames)];
    $lastName = $lastNames[array_rand($lastNames)];
    $name = $firstName . ' ' . $lastName;
    $phone = '69' . rand(10000000, 99999999);
    $email = strtolower(str_replace(' ', '', transliterate($firstName))) . '@example.com';
    $street = $streets[array_rand($streets)];
    $number = rand(1, 150);
    $address = $street . ' ' . $number;
    $afm = str_pad(rand(100000000, 999999999), 9, '0', STR_PAD_LEFT);
    $note = $notes[array_rand($notes)];
    $lat = 40.8476 + (rand(-120, 120) / 10000);
    $lng = 25.8759 + (rand(-120, 120) / 10000);
    $coordinates = sprintf('{"lat": %.4f, "lng": %.4f}', $lat, $lng);
    
    $clients[] = [$name, $phone, $email, $address, 'Αλεξανδρούπολη', '68100', $afm, $note, $coordinates];
}

// Transliterate helper
function transliterate($str) {
    $greek = ['Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ', 'Η', 'Θ', 'Ι', 'Κ', 'Λ', 'Μ', 'Ν', 'Ξ', 'Ο', 'Π', 'Ρ', 'Σ', 'Τ', 'Υ', 'Φ', 'Χ', 'Ψ', 'Ω', 'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'ς', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω', 'ά', 'έ', 'ή', 'ί', 'ό', 'ύ', 'ώ', 'ϊ', 'ϋ', 'ΐ', 'ΰ'];
    $latin = ['A', 'V', 'G', 'D', 'E', 'Z', 'I', 'Th', 'I', 'K', 'L', 'M', 'N', 'X', 'O', 'P', 'R', 'S', 'T', 'Y', 'F', 'Ch', 'Ps', 'O', 'a', 'v', 'g', 'd', 'e', 'z', 'i', 'th', 'i', 'k', 'l', 'm', 'n', 'x', 'o', 'p', 'r', 's', 's', 't', 'y', 'f', 'ch', 'ps', 'o', 'a', 'e', 'i', 'i', 'o', 'y', 'o', 'i', 'y', 'i', 'y'];
    return str_replace($greek, $latin, $str);
}

$sqlOutput .= "-- CLIENTS\n";
foreach ($clients as $client) {
    $sqlOutput .= sprintf(
        "INSERT INTO clients (name, phone, email, address, city, postal_code, afm, notes, coordinates) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);\n",
        sqlValue($client[0]), sqlValue($client[1]), sqlValue($client[2]),
        sqlValue($client[3]), sqlValue($client[4]), sqlValue($client[5]),
        sqlNullableValue($client[6]), sqlNullableValue($client[7]), sqlNullableValue($client[8])
    );
}
$sqlOutput .= "\n";

// WORKERS
echo "Δημιουργία SQL για εργάτες...\n";
$workers = [
    ['Νίκος Νικολαΐδης', '6978799299', 'Ιδιοκτήτης / Υπεύθυνος έργων', 10.00, 80.00, 'owner', 'active', '2020-01-10', 'Ιδιοκτήτης - δουλεύει με αξία χρόνου 10€/ώρα', 0.00, 0.00],
    ['Μιχάλης Νικολαΐδης', '6970001122', 'Ιδιοκτήτης / Βαφέας', 10.00, 80.00, 'owner', 'active', '2020-01-10', 'Ιδιοκτήτης - συμμετέχει σε δύσκολα έργα με 10€/ώρα', 0.00, 0.00],
    ['Δημήτρης Βασιλείου', '6923111222', 'Βαφέας', 5.00, 40.00, 'employee', 'active', '2023-01-15', 'Υπάλληλος βαφέας - 5€/ώρα', 0.00, 0.00],
    ['Γιώργος Αντωνίου', '6934222333', 'Ελαιοχρωματιστής', 5.00, 40.00, 'employee', 'active', '2023-03-01', 'Υπάλληλος ελαιοχρωματιστής - 5€/ώρα', 0.00, 0.00],
    ['Σωτήρης Μιχαήλ', '6945333444', 'Ειδικός σε Ξύλο', 5.00, 40.00, 'employee', 'active', '2023-06-10', 'Υπάλληλος ειδικός σε ξύλινες επιφάνειες - 5€/ώρα', 0.00, 0.00],
    ['Κώστας Λάμπρου', '6956444555', 'Βοηθός Βαφέα', 5.00, 40.00, 'employee', 'active', '2024-05-20', 'Υπάλληλος βοηθός βαφέα - 5€/ώρα', 0.00, 0.00]
];

$sqlOutput .= "-- WORKERS\n";
foreach ($workers as $worker) {
    $sqlOutput .= sprintf(
        "INSERT INTO workers (name, phone, specialty, hourly_rate, daily_rate, worker_type, status, hire_date, notes, total_hours, total_earnings) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);\n",
        sqlValue($worker[0]), sqlValue($worker[1]), sqlValue($worker[2]),
        sqlNumber($worker[3]), sqlNumber($worker[4]), sqlValue($worker[5]), sqlValue($worker[6]), sqlValue($worker[7]),
        sqlNullableValue($worker[8]), sqlNumber($worker[9]), sqlNumber($worker[10])
    );
}
$sqlOutput .= "\n";

// MATERIALS
echo "Δημιουργία SQL για υλικά...\n";
$materials = [
    ['Πλαστικό Χρώμα Λευκό 3L', 'τεμ.', 12.50, 50.00, 10.00, 'Χρώμα', 'WH-001'],
    ['Πλαστικό Χρώμα Μπεζ 3L', 'τεμ.', 13.00, 30.00, 10.00, 'Χρώμα', 'BG-002'],
    ['Πλαστικό Χρώμα Γκρι 3L', 'τεμ.', 13.00, 25.00, 8.00, 'Χρώμα', 'GR-003'],
    ['Ελαιόχρωμα Λευκό 750ml', 'τεμ.', 8.50, 25.00, 5.00, 'Χρώμα', 'WH-750'],
    ['Ελαιόχρωμα Μπεζ 750ml', 'τεμ.', 8.50, 15.00, 5.00, 'Χρώμα', 'BG-750'],
    ['Ακρυλικό Χρώμα Μπλε 1L', 'λίτρα', 9.00, 20.00, 5.00, 'Χρώμα', 'BL-001'],
    ['Ακρυλικό Χρώμα Πράσινο 1L', 'λίτρα', 9.00, 18.00, 5.00, 'Χρώμα', 'GN-001'],
    ['Αστάρι Ακρυλικό 3L', 'τεμ.', 11.00, 35.00, 8.00, 'Αστάρι', ''],
    ['Αστάρι Νερού 3L', 'τεμ.', 10.50, 28.00, 8.00, 'Αστάρι', ''],
    ['Ρολό 25cm Πολυαμιδίου', 'ρολά', 3.50, 100.00, 20.00, 'Ρολά / Πινέλα', ''],
    ['Ρολό 18cm Μικρό', 'ρολά', 2.80, 80.00, 15.00, 'Ρολά / Πινέλα', ''],
    ['Πινέλο 5cm Επαγγελματικό', 'τεμ.', 2.80, 80.00, 15.00, 'Ρολά / Πινέλα', ''],
    ['Πινέλο 8cm Ραδιατέρ', 'τεμ.', 3.20, 60.00, 12.00, 'Ρολά / Πινέλα', ''],
    ['Σύστρα Μεταλλική 30cm', 'τεμ.', 4.50, 40.00, 10.00, 'Εργαλεία', ''],
    ['Σύστρα Πλαστική 25cm', 'τεμ.', 3.20, 50.00, 12.00, 'Εργαλεία', ''],
    ['Νάιλον Προστασίας 4x5m', 'τεμ.', 1.50, 200.00, 50.00, 'Ταινίες / Προστασία', ''],
    ['Ταινία Χαρτοταινία 50mm', 'ρολά', 2.20, 150.00, 30.00, 'Ταινίες / Προστασία', ''],
    ['Σπατουλάρισμα 5kg', 'kg', 6.80, 45.00, 10.00, 'Στόκος / Σπατουλάρισμα', ''],
    ['Διαλυτικό 1L', 'λίτρα', 4.50, 30.00, 8.00, 'Διαλυτικό / Καθαριστικό', ''],
    ['Λούστρο Ματ 750ml', 'τεμ.', 7.20, 22.00, 6.00, 'Βερνίκι / Λούστρο', '']
];

$sqlOutput .= "-- MATERIALS\n";
foreach ($materials as $material) {
    $sqlOutput .= sprintf(
        "INSERT INTO materials (name, unit, unit_price, stock, min_stock, category, color_code, canonical_key) VALUES (%s, %s, %s, %s, %s, %s, %s, %s);\n",
        sqlValue($material[0]), sqlValue($material[1]), sqlNumber($material[2]),
        sqlNumber($material[3]), sqlNumber($material[4]), sqlValue($material[5]),
        sqlNullableValue($material[6]), sqlValue(materialCanonicalKey($material[0], $material[5], $material[6]))
    );
}
$sqlOutput .= "\n";

// SUPPLIERS
echo "Δημιουργία SQL για καταστήματα...\n";
$suppliers = [
    ['Χρωματοπωλείο Παπαδόπουλος', '2551012345', 'info@papadopoulos-colors.gr', 'Δημοκρατίας 12, Αλεξανδρούπολη', 'Βασικός προμηθευτής χρωμάτων'],
    ['Οικοδομικά Υλικά Θράκης', '2551056789', 'sales@ylika-thrakis.gr', 'Βενιζέλου 45, Αλεξανδρούπολη', 'Υλικά προετοιμασίας και εργαλεία'],
    ['Leroy Merlin', '2551033333', 'alexandroupoli@leroymerlin.gr', 'Αλεξανδρούπολη', 'Μεγάλες αγορές εργαλείων'],
    ['Χρώματα Express', '2551098765', 'orders@chromata-express.gr', '14ης Μαΐου 20, Αλεξανδρούπολη', 'Γρήγορες μικρές αγορές']
];

$sqlOutput .= "-- SUPPLIERS\n";
foreach ($suppliers as $supplier) {
    $sqlOutput .= sprintf(
        "INSERT INTO suppliers (name, phone, email, address, notes) VALUES (%s, %s, %s, %s, %s);\n",
        sqlValue($supplier[0]),
        sqlNullableValue($supplier[1]),
        sqlNullableValue($supplier[2]),
        sqlNullableValue($supplier[3]),
        sqlNullableValue($supplier[4])
    );
}
$sqlOutput .= "\n";

// MATERIAL PURCHASES / STOCK
echo "Δημιουργία SQL για αγορές υλικών και κινήσεις αποθήκης...\n";
$purchaseYear = (new DateTime($config['end_date']))->format('Y');
$materialPurchases = [
    [
        'supplier_id' => 1,
        'purchase_date' => "$purchaseYear-10-05",
        'reference_number' => "PUR-$purchaseYear-001",
        'notes' => 'Αρχική προμήθεια χρωμάτων για demo αποθήκη',
        'items' => [
            ['material_id' => 1, 'quantity' => 12, 'unit_price' => 12.50],
            ['material_id' => 4, 'quantity' => 8, 'unit_price' => 8.50],
            ['material_id' => 10, 'quantity' => 25, 'unit_price' => 3.50],
        ],
        'paid_amount' => 260.00,
    ],
    [
        'supplier_id' => 2,
        'purchase_date' => "$purchaseYear-10-21",
        'reference_number' => "PUR-$purchaseYear-002",
        'notes' => 'Αναλώσιμα και υλικά προετοιμασίας',
        'items' => [
            ['material_id' => 16, 'quantity' => 40, 'unit_price' => 1.50],
            ['material_id' => 17, 'quantity' => 35, 'unit_price' => 2.20],
            ['material_id' => 18, 'quantity' => 10, 'unit_price' => 6.80],
        ],
        'paid_amount' => 120.00,
    ],
    [
        'supplier_id' => 4,
        'purchase_date' => "$purchaseYear-11-08",
        'reference_number' => "PUR-$purchaseYear-003",
        'notes' => 'Συμπληρωματική αγορά για προγραμματισμένες εργασίες',
        'items' => [
            ['material_id' => 2, 'quantity' => 10, 'unit_price' => 13.00],
            ['material_id' => 3, 'quantity' => 8, 'unit_price' => 13.00],
            ['material_id' => 8, 'quantity' => 6, 'unit_price' => 11.00],
        ],
        'paid_amount' => 0.00,
    ],
];

$materialPurchaseItems = [];
$supplierPayments = [];
$materialStockMovements = [];

foreach ($materialPurchases as $purchaseIndex => &$purchase) {
    $purchaseId = $purchaseIndex + 1;
    $purchase['id'] = $purchaseId;
    $purchase['total_cost'] = 0.00;

    foreach ($purchase['items'] as $item) {
        $material = $materials[$item['material_id'] - 1];
        $totalCost = round($item['quantity'] * $item['unit_price'], 2);
        $purchase['total_cost'] += $totalCost;

        $materialPurchaseItems[] = [
            'purchase_id' => $purchaseId,
            'material_id' => $item['material_id'],
            'material_name' => $material[0],
            'category' => $material[5],
            'color_code' => $material[6],
            'quantity' => $item['quantity'],
            'unit' => $material[1],
            'unit_price' => $item['unit_price'],
            'total_cost' => $totalCost,
            'notes' => 'Demo γραμμή αγοράς',
        ];

        $materialStockMovements[] = [
            'material_id' => $item['material_id'],
            'movement_date' => $purchase['purchase_date'],
            'movement_type' => 'purchase',
            'quantity' => $item['quantity'],
            'previous_stock' => max(0, $material[3] - $item['quantity']),
            'new_stock' => $material[3],
            'unit' => $material[1],
            'reference_type' => 'material_purchase',
            'reference_id' => $purchaseId,
            'notes' => 'Αυτόματη κίνηση από demo αγορά',
        ];
    }

    $purchase['total_cost'] = round($purchase['total_cost'], 2);

    if ($purchase['paid_amount'] > 0) {
        $supplierPayments[] = [
            'supplier_id' => $purchase['supplier_id'],
            'purchase_id' => $purchaseId,
            'payment_date' => $purchase['purchase_date'],
            'amount' => min($purchase['paid_amount'], $purchase['total_cost']),
            'payment_method' => 'Μετρητά',
            'notes' => 'Demo πληρωμή προμηθευτή',
        ];
    }
}
unset($purchase);

$movementDemoYear = (new DateTime($config['end_date']))->format('Y');
$extraStockMovements = [
    ['material_id' => 1, 'movement_date' => "$movementDemoYear-02-10", 'movement_type' => 'add', 'quantity' => 5.00, 'notes' => 'Demo προσθήκη από απογραφή'],
    ['material_id' => 2, 'movement_date' => "$movementDemoYear-03-12", 'movement_type' => 'remove', 'quantity' => -2.00, 'notes' => 'Demo αφαίρεση για φθορά υλικού'],
    ['material_id' => 3, 'movement_date' => "$movementDemoYear-04-15", 'movement_type' => 'adjust', 'quantity' => 1.00, 'notes' => 'Demo διόρθωση απογραφής'],
    ['material_id' => 4, 'movement_date' => "$movementDemoYear-05-20", 'movement_type' => 'job_usage', 'quantity' => -3.00, 'notes' => 'Demo χρήση σε εργασία'],
];

foreach ($extraStockMovements as $movement) {
    $material = $materials[$movement['material_id'] - 1];
    $previousStock = $material[3];
    $newStock = $movement['movement_type'] === 'adjust'
        ? $previousStock + $movement['quantity']
        : $previousStock + $movement['quantity'];
    $materialStockMovements[] = [
        'material_id' => $movement['material_id'],
        'movement_date' => $movement['movement_date'],
        'movement_type' => $movement['movement_type'],
        'quantity' => $movement['quantity'],
        'previous_stock' => $previousStock,
        'new_stock' => max(0, $newStock),
        'unit' => $material[1],
        'reference_type' => $movement['movement_type'] === 'job_usage' ? 'job' : 'manual',
        'reference_id' => null,
        'notes' => $movement['notes'],
    ];
}

$sqlOutput .= "-- MATERIAL PURCHASES\n";
foreach ($materialPurchases as $purchase) {
    $sqlOutput .= sprintf(
        "INSERT INTO material_purchases (supplier_id, purchase_date, reference_number, notes, total_cost) VALUES (%s, %s, %s, %s, %s);\n",
        sqlInt($purchase['supplier_id']),
        sqlValue($purchase['purchase_date']),
        sqlNullableValue($purchase['reference_number']),
        sqlNullableValue($purchase['notes']),
        sqlNumber($purchase['total_cost'])
    );
}
$sqlOutput .= "\n";

$sqlOutput .= "-- MATERIAL PURCHASE ITEMS\n";
foreach ($materialPurchaseItems as $item) {
    $sqlOutput .= sprintf(
        "INSERT INTO material_purchase_items (purchase_id, material_id, material_name, quantity, unit, unit_price, total_cost, notes) VALUES (%s, %s, %s, %s, %s, %s, %s, %s);\n",
        sqlInt($item['purchase_id']),
        sqlInt($item['material_id']),
        sqlValue($item['material_name']),
        sqlNumber($item['quantity']),
        sqlValue($item['unit']),
        sqlNumber($item['unit_price']),
        sqlNumber($item['total_cost']),
        sqlNullableValue($item['notes'])
    );
}
$sqlOutput .= "\n";

$sqlOutput .= "-- SUPPLIER PAYMENTS\n";
foreach ($supplierPayments as $payment) {
    $sqlOutput .= sprintf(
        "INSERT INTO supplier_payments (supplier_id, purchase_id, payment_date, amount, payment_method, notes) VALUES (%s, %s, %s, %s, %s, %s);\n",
        sqlInt($payment['supplier_id']),
        sqlInt($payment['purchase_id']),
        sqlValue($payment['payment_date']),
        sqlNumber($payment['amount']),
        sqlNullableValue($payment['payment_method']),
        sqlNullableValue($payment['notes'])
    );
}
$sqlOutput .= "\n";

$sqlOutput .= "-- MATERIAL STOCK MOVEMENTS\n";
foreach ($materialStockMovements as $movement) {
    $sqlOutput .= sprintf(
        "INSERT INTO material_stock_movements (material_id, movement_date, movement_type, quantity, previous_stock, new_stock, unit, reference_type, reference_id, notes) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s);\n",
        sqlInt($movement['material_id']),
        sqlValue($movement['movement_date']),
        sqlValue($movement['movement_type']),
        sqlNumber($movement['quantity']),
        sqlNumber($movement['previous_stock']),
        sqlNumber($movement['new_stock']),
        sqlNullableValue($movement['unit']),
        sqlNullableValue($movement['reference_type']),
        sqlInt($movement['reference_id']),
        sqlNullableValue($movement['notes'])
    );
}
$sqlOutput .= "\n";

// JOBS - Δημιουργία 312 εργασιών (2 την εβδομάδα για 3 χρόνια)
echo "Δημιουργία SQL για εργασίες...\n";

$jobTypes = [
    ['Εσωτερικοί χώροι', ['Βαφή Διαμερίσματος', 'Βαφή Γραφείου', 'Βαφή Καταστήματος', 'Βαφή Σπιτιού', 'Βαφή Παιδικού Δωματίου', 'Βαφή Σαλονιού', 'Βαφή Κουζίνας']],
    ['Εξωτερικοί χώροι', ['Εξωτερική Βαφή Μονοκατοικίας', 'Βαφή Πρόσοψης', 'Βαφή Περιτοιχίσματος', 'Εξωτερική Βαφή Πολυκατοικίας']],
    ['Κάγκελα/Πέργκολα', ['Βαφή Κέγκελων', 'Βαφή Μπαλκονιών', 'Βαφή Πέργκολας', 'Βαφή Μεταλλικής Πόρτας']],
    ['Επαγγελματικός', ['Βαφή Καταστήματος', 'Βαφή Γραφείου', 'Βαφή Αποθήκης', 'Βαφή Εργοστασίου']],
    ['Κατοικία', ['Βαφή Σπιτιού', 'Βαφή Διαμερίσματος', 'Βαφή Μονοκατοικίας']],
    ['Μικροεπισκευή', ['Διόρθωση Τοίχου', 'Βαφή Πόρτας', 'Βαφή Παραθύρων', 'Επιδιόρθωση Σοβά']],
    ['Άλλο', ['Βαφή Ξύλινων Επίπλων', 'Λακάρισμα Ντουλαπών', 'Βαφή Παρκέ', 'Ειδική Εργασία']]
];

$paintBrands = ['Vitex', 'Kraft', 'Dulux', 'Levis', 'MaxMeyer'];
$paintColors = [
    ['Λευκό Ματ', 'WH-001'], ['Μπεζ Ανοιχτό', 'BG-002'], ['Γκρι Ανοιχτό', 'GR-003'],
    ['Γκρι Σκούρο', 'GR-005'], ['Εκρού', 'EC-001'], ['Κρεμ', 'CR-002'],
    ['Μπλε Ανοιχτό', 'BL-001'], ['Πράσινο Ανοιχτό', 'GN-001'], ['Κίτρινο Απαλό', 'YL-001']
];

$statuses = [
    'Υποψήφιος',
    'Προγραμματισμένη',
    'Σε εξέλιξη',
    'Σε αναμονή',
    'Ολοκληρώθηκε',
    'Εξοφλήθηκε',
    'Ακυρώθηκε'
];
$nonPaidStatusCycle = ['Ολοκληρώθηκε', 'Σε εξέλιξη', 'Προγραμματισμένη', 'Σε αναμονή', 'Υποψήφιος', 'Ακυρώθηκε'];

$workersList = [
    [1, 'Νίκος Νικολαΐδης', 'Ιδιοκτήτης / Υπεύθυνος έργων', 10.00, 'owner'],
    [2, 'Μιχάλης Νικολαΐδης', 'Ιδιοκτήτης / Βαφέας', 10.00, 'owner'],
    [3, 'Δημήτρης Βασιλείου', 'Βαφέας', 5.00, 'employee'],
    [4, 'Γιώργος Αντωνίου', 'Ελαιοχρωματιστής', 5.00, 'employee'],
    [5, 'Σωτήρης Μιχαήλ', 'Ειδικός σε Ξύλο', 5.00, 'employee'],
    [6, 'Κώστας Λάμπρου', 'Βοηθός Βαφέα', 5.00, 'employee']
];
$workerCombinationTemplates = [
    [1],
    [2],
    [3],
    [4],
    [5],
    [6],
    [1, 3],
    [2, 4],
    [3, 4],
    [5, 6],
    [1, 2, 3],
    [1, 3, 4],
    [2, 5, 6],
    [1, 2, 3, 4, 5, 6],
];
$workerTotals = [];
foreach ($workersList as $worker) {
    $workerTotals[$worker[0]] = ['hours' => 0.00, 'earnings' => 0.00];
}

$jobs = [];
$jobVisits = [];
$jobPayments = [];
$startDate = new DateTime($config['start_date']);
$endDate = new DateTime($config['end_date']);
$currentDate = clone $startDate;

$jobIndex = 0;
$clientIndex = 0;
$nonPaidIndex = 0;

// Δημιουργούμε παραμετροποιήσιμο αριθμό εργασιών την εβδομάδα.
$weekDays = [
    'Monday this week',
    'Tuesday this week',
    'Wednesday this week',
    'Thursday this week',
    'Friday this week',
    'Saturday this week',
    'Sunday this week',
];

while ($currentDate <= $endDate) {
    $weekJobs = [];
    for ($dayIndex = 0; $dayIndex < min($config['jobs_per_week'], count($weekDays)); $dayIndex++) {
        $weekJobs[] = [
            'date' => (clone $currentDate)->modify($weekDays[$dayIndex]),
            'slot' => $dayIndex,
        ];
    }
    
    foreach ($weekJobs as $weekJob) {
        $jobDate = $weekJob['date'];
        $weekSlot = $weekJob['slot'];
        if ($jobDate > $endDate) break;
        if ($jobDate < $startDate) continue;
        
        // Κάθε 2 εργασίες αλλάζουμε πελάτη
        if ($jobIndex % 2 == 0) {
            $currentClientId = ($clientIndex % count($clients)) + 1;
            $clientIndex++;
        }
        
        // Τυχαίος τύπος εργασίας
        $jobTypeData = $jobTypes[array_rand($jobTypes)];
        $type = $jobTypeData[0];
        $titleTemplates = $jobTypeData[1];
        $title = $titleTemplates[array_rand($titleTemplates)];
        
        // Προσθήκη μεγέθους στον τίτλο
        $sizes = ['μικρό', 'μεσαίο', 'μεγάλο', '2άρι', '3άρι', '4άρι', '80τμ', '120τμ'];
        if (rand(0, 1)) {
            $title .= ' ' . $sizes[array_rand($sizes)];
        }
        
        // Κατάσταση: 2 εξοφλημένα κάθε εβδομάδα, τα υπόλοιπα καλύπτουν όλες τις άλλες περιπτώσεις.
        if ($weekSlot < $config['paid_jobs_per_week']) {
            $status = 'Εξοφλήθηκε';
        } else {
            $status = $nonPaidStatusCycle[$nonPaidIndex % count($nonPaidStatusCycle)];
            $nonPaidIndex++;
        }
        $isPaid = $status === 'Εξοφλήθηκε' ? 1 : 0;

        // Χαρακτηριστικά εργασίας
        $rooms = rand(1, 5);
        $area = rand(40, 300);
        $kilometers = round(rand(2, 30) + (rand(0, 99) / 100), 2);
        $billingHours = round($area / rand(8, 15), 2); // 8-15 τμ ανά ώρα

        // Ημερομηνίες
        $dateStr = $jobDate->format('Y-m-d');
        $startDateStr = $dateStr;
        $duration = ceil($billingHours / 8); // ημέρες
        $endDateObj = (clone $jobDate)->modify("+{$duration} days");
        if ($endDateObj > $endDate) {
            $endDateObj = clone $endDate;
        }
        $endDateStr = $endDateObj->format('Y-m-d');

        // Επόμενη επίσκεψη: συμπληρώνεται για όλες τις μη ακυρωμένες εργασίες.
        $nextVisitDate = (clone $endDateObj)->modify('+' . (30 + (($jobIndex % 6) * 15)) . ' days');
        if ($nextVisitDate > $endDate) {
            $nextVisitDate = clone $endDate;
        }
        $nextVisit = $status === 'Ακυρώθηκε' ? null : $nextVisitDate->format('Y-m-d');
        $visitAllDay = $jobIndex % 4 === 0 ? 1 : 0;
        $visitStartTime = $visitAllDay ? null : sprintf('%02d:00:00', 8 + ($jobIndex % 3));
        $visitEndTime = $visitAllDay ? null : sprintf('%02d:00:00', 15 + ($jobIndex % 3));

        // Εργάτες / ιδιοκτήτες - καλύπτουμε μονούς, ζευγάρια, ομάδες και μεικτά συνεργεία.
        $workerIds = $workerCombinationTemplates[$jobIndex % count($workerCombinationTemplates)];
        $assignedWorkers = [];
        foreach ($workerIds as $workerId) {
            $worker = $workersList[$workerId - 1];
            $workerHours = round($billingHours / count($workerIds), 2);
            $workerType = $worker[4];
            $employeeLaborCost = $workerType === 'owner' ? 0.00 : round($workerHours * $worker[3], 2);
            $assignedWorkers[] = [
                'workerId' => $worker[0],
                'workerName' => $worker[1],
                'workerSpecialty' => $worker[2],
                'workerType' => $workerType,
                'hoursAllocated' => $workerHours,
                'hourlyRate' => $worker[3],
                'laborCost' => $employeeLaborCost,
                'ownerOpportunityCost' => $workerType === 'owner' ? round($workerHours * $worker[3], 2) : 0.00
            ];
            $workerTotals[$worker[0]]['hours'] += $workerHours;
            $workerTotals[$worker[0]]['earnings'] += $workerHours * $worker[3];
        }

        // Υλικά εργασίας - το UI τα αποθηκεύει στο legacy πεδίο paints.
        $numPaints = 1 + ($jobIndex % 4);
        $paints = [];
        for ($p = 0; $p < $numPaints; $p++) {
            $materialId = (($jobIndex + $p) % count($materials)) + 1;
            $material = $materials[$materialId - 1];
            $quantity = round(1 + (($area / 80) * ($p + 1)) + (($jobIndex + $p) % 3), 2);
            $lineCost = round($quantity * $material[2], 2);
            $paints[] = [
                'materialId' => $materialId,
                'materialName' => $material[0],
                'name' => $material[0],
                'category' => $material[5],
                'colorCode' => $material[6],
                'code' => $material[6] ?: 'N/A',
                'brand' => $paintBrands[($jobIndex + $p) % count($paintBrands)],
                'quantity' => $quantity,
                'unit' => $material[1],
                'unitPrice' => $material[2],
                'cost' => $lineCost,
                'totalCost' => $lineCost,
                'deductFromStock' => $status !== 'Υποψήφιος' && $status !== 'Ακυρώθηκε',
                'stockDeducted' => $status === 'Ολοκληρώθηκε' || $status === 'Εξοφλήθηκε',
                'stockDeductedAt' => ($status === 'Ολοκληρώθηκε' || $status === 'Εξοφλήθηκε') ? $dateStr : null,
                'stockMovementId' => null
            ];
        }

        $materialsCost = round(array_reduce($paints, function ($sum, $material) {
            return $sum + $material['cost'];
        }, 0), 2);
        $employeeLaborCost = round(array_reduce($assignedWorkers, function ($sum, $worker) {
            return $sum + ($worker['workerType'] === 'owner' ? 0 : $worker['laborCost']);
        }, 0), 2);
        $kmCost = round($kilometers * 0.50, 2);

        $billingRate = [25, 30, 35, 40, 45][($jobIndex + $weekSlot) % 5];
        $billingType = $jobIndex % 3 === 0 ? 'fixed' : 'hourly';
        $hourlyCharge = round($billingHours * $billingRate, 2);
        $agreedPrice = $billingType === 'fixed'
            ? round(($employeeLaborCost + $materialsCost + $kmCost) * (1.35 + (($jobIndex % 4) * 0.08)), 2)
            : 0.00;
        $totalCost = $billingType === 'fixed' ? $agreedPrice : $hourlyCharge;
        
        // Περιγραφή και σημειώσεις
        $descriptions = [
            'Πλήρης βαφή με πλαστικό χρώμα',
            'Εσωτερική και εξωτερική βαφή',
            'Βαφή με ελαιόχρωμα premium ποιότητας',
            'Ανακαίνιση με αστάρωμα και 2 χέρια',
            'Επαγγελματική βαφή με εγγύηση',
            'Βαφή σε όλους τους χώρους'
        ];
        $description = $descriptions[array_rand($descriptions)];
        
        $notesTemplates = [
            'Πελάτης πολύ ικανοποιημένος',
            'Ολοκληρώθηκε εγκαίρως',
            'Εργασία χωρίς προβλήματα',
            'Πελάτης ζήτησε κάρτα',
            'Άριστη συνεργασία',
            'Θα μας προτείνει σε φίλους',
            'VIP πελάτης - προσοχή στη λεπτομέρεια',
            'Εργασία ολοκληρώθηκε με επιτυχία'
        ];
        $notes = ($status == 'Ολοκληρώθηκε' || $status == 'Εξοφλήθηκε') ? $notesTemplates[array_rand($notesTemplates)] :
                 ($status == 'Σε εξέλιξη' ? 'Εργασία σε εξέλιξη - ' . rand(20, 80) . '% ολοκλήρωση' :
                 ($status == 'Σε αναμονή' ? 'Σε αναμονή για υλικά / επιβεβαίωση πελάτη' :
                 ($status == 'Ακυρώθηκε' ? 'Ακυρώθηκε από τον πελάτη πριν την έναρξη' :
                 ($status == 'Προγραμματισμένη' ? 'Προγραμματισμένη εργασία με πλήρη στοιχεία επίσκεψης' : 'Υποψήφια εργασία με εκκρεμή επιβεβαίωση'))));
        
        // Συντεταγμένες (τυχαίες γύρω από Αλεξανδρούπολη)
        $lat = 40.8476 + (rand(-100, 100) / 10000);
        $lng = 25.8759 + (rand(-100, 100) / 10000);
        $coordinates = sprintf('{"lat": %.4f, "lng": %.4f}', $lat, $lng);
        $jobId = $jobIndex + 1;
        
        $jobs[] = [
            'id' => $jobId,
            'client_id' => $currentClientId,
            'title' => $title,
            'type' => $type,
            'date' => $dateStr,
            'next_visit' => $nextVisit,
            'visit_end_date' => $endDateStr,
            'visit_start_time' => $visitStartTime,
            'visit_end_time' => $visitEndTime,
            'visit_all_day' => $visitAllDay,
            'address' => $clients[$currentClientId - 1][3],
            'rooms' => $rooms,
            'area' => $area,
            'materials_cost' => $materialsCost,
            'kilometers' => $kilometers,
            'billing_hours' => $billingHours,
            'billing_rate' => $billingRate,
            'billing_type' => $billingType,
            'agreed_price' => $agreedPrice,
            'cost_per_km' => 0.50,
            'notes' => $notes,
            'assigned_workers' => jsonValue($assignedWorkers),
            'paints' => jsonValue($paints),
            'status' => $status,
            'total_cost' => $totalCost,
            'is_paid' => $isPaid,
            'coordinates' => $coordinates,
        ];

        if ($status !== 'Υποψήφιος' && $status !== 'Ακυρώθηκε') {
            $jobVisits[] = [
                'job_id' => $jobId,
                'visit_date' => $dateStr,
                'workers' => jsonValue($assignedWorkers),
                'notes' => 'Demo επίσκεψη εργασίας',
            ];

            if ($duration > 1 || $jobIndex % 5 === 0) {
                $followUpWorkers = array_map(function ($worker) {
                    $hours = round(max(1, $worker['hoursAllocated'] * 0.45), 2);
                    return [
                        'workerId' => $worker['workerId'],
                        'workerName' => $worker['workerName'],
                        'workerSpecialty' => $worker['workerSpecialty'],
                        'workerType' => $worker['workerType'],
                        'hours' => $hours,
                        'hourlyRate' => $worker['hourlyRate'],
                        'laborCost' => $worker['workerType'] === 'owner' ? 0.00 : round($hours * $worker['hourlyRate'], 2),
                        'ownerOpportunityCost' => $worker['workerType'] === 'owner' ? round($hours * $worker['hourlyRate'], 2) : 0.00,
                    ];
                }, $assignedWorkers);
                foreach ($followUpWorkers as $visitWorker) {
                    $workerTotals[$visitWorker['workerId']]['hours'] += $visitWorker['hours'];
                    $workerTotals[$visitWorker['workerId']]['earnings'] += $visitWorker['hours'] * $visitWorker['hourlyRate'];
                }
                $followUpVisitDate = (clone $jobDate)->modify('+1 day')->format('Y-m-d');
                if ($followUpVisitDate > $config['end_date']) {
                    $followUpVisitDate = $config['end_date'];
                }
                $jobVisits[] = [
                    'job_id' => $jobId,
                    'visit_date' => $followUpVisitDate,
                    'workers' => jsonValue($followUpWorkers),
                    'notes' => 'Δεύτερη demo επίσκεψη / τελειώματα',
                ];
            }
        }

        if ($isPaid) {
            $paymentDate = (clone $endDateObj)->modify('+' . rand(0, 14) . ' days')->format('Y-m-d');
            if ($paymentDate > $config['end_date']) {
                $paymentDate = $config['end_date'];
            }
            $jobPayments[] = [
                'job_id' => $jobId,
                'payment_date' => $paymentDate,
                'amount' => $totalCost,
                'notes' => 'Αυτόματη demo πληρωμή εργασίας',
            ];
        } elseif ($status === 'Ολοκληρώθηκε' && $jobIndex % 2 === 0) {
            $partialPaymentDate = (clone $endDateObj)->modify('+' . rand(1, 10) . ' days')->format('Y-m-d');
            if ($partialPaymentDate > $config['end_date']) {
                $partialPaymentDate = $config['end_date'];
            }
            $jobPayments[] = [
                'job_id' => $jobId,
                'payment_date' => $partialPaymentDate,
                'amount' => round($totalCost * 0.45, 2),
                'notes' => 'Μερική demo πληρωμή - υπόλοιπο ανοικτό',
            ];
        }
        
        $jobIndex++;
    }
    
    // Επόμενη εβδομάδα
    $currentDate->modify('+1 week');
}

foreach ($workers as $index => &$worker) {
    $workerId = $index + 1;
    $worker[9] = round($workerTotals[$workerId]['hours'] ?? 0, 2);
    $worker[10] = round($workerTotals[$workerId]['earnings'] ?? 0, 2);
}
unset($worker);

echo "  Δημιουργήθηκαν " . count($jobs) . " εργασίες\n";

$sqlOutput .= "-- JOBS (όλες οι καταστάσεις)\n";
foreach ($jobs as $job) {
    $sqlOutput .= sprintf(
        "INSERT INTO jobs (client_id, title, type, date, next_visit, visit_end_date, visit_start_time, visit_end_time, visit_all_day, address, rooms, area, materials_cost, kilometers, billing_hours, billing_rate, billing_type, agreed_price, cost_per_km, notes, assigned_workers, paints, status, total_cost, is_paid, coordinates) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);\n",
        sqlInt($job['client_id']),
        sqlValue($job['title']),
        sqlValue($job['type']),
        sqlNullableValue($job['date']),
        sqlNullableValue($job['next_visit']),
        sqlNullableValue($job['visit_end_date']),
        sqlNullableValue($job['visit_start_time']),
        sqlNullableValue($job['visit_end_time']),
        sqlInt($job['visit_all_day']),
        sqlNullableValue($job['address']),
        sqlInt($job['rooms']),
        sqlNumber($job['area']),
        sqlNumber($job['materials_cost']),
        sqlNumber($job['kilometers']),
        sqlNumber($job['billing_hours']),
        sqlNumber($job['billing_rate']),
        sqlValue($job['billing_type']),
        sqlNumber($job['agreed_price']),
        sqlNumber($job['cost_per_km']),
        sqlNullableValue($job['notes']),
        sqlNullableValue($job['assigned_workers']),
        sqlNullableValue($job['paints']),
        sqlValue($job['status']),
        sqlNumber($job['total_cost']),
        sqlInt($job['is_paid']),
        sqlNullableValue($job['coordinates'])
    );
}
$sqlOutput .= "\n";

$sqlOutput .= "-- JOB VISITS\n";
foreach ($jobVisits as $visit) {
    $sqlOutput .= sprintf(
        "INSERT INTO job_visits (job_id, visit_date, workers, notes) VALUES (%s, %s, %s, %s);\n",
        sqlInt($visit['job_id']),
        sqlValue($visit['visit_date']),
        sqlNullableValue($visit['workers']),
        sqlNullableValue($visit['notes'])
    );
}
$sqlOutput .= "\n";

$sqlOutput .= "-- JOB PAYMENTS\n";
foreach ($jobPayments as $payment) {
    $sqlOutput .= sprintf(
        "INSERT INTO job_payments (job_id, payment_date, amount, notes) VALUES (%s, %s, %s, %s);\n",
        sqlInt($payment['job_id']),
        sqlValue($payment['payment_date']),
        sqlNumber($payment['amount']),
        sqlNullableValue($payment['notes'])
    );
}
$sqlOutput .= "\n";

$sqlOutput .= "-- WORKER TOTALS\n";
foreach ($workers as $index => $worker) {
    $sqlOutput .= sprintf(
        "UPDATE workers SET total_hours = %s, total_earnings = %s WHERE id = %s;\n",
        sqlNumber($worker[9]),
        sqlNumber($worker[10]),
        sqlInt($index + 1)
    );
}
$sqlOutput .= "\n";

// CALENDAR EVENTS - Δημιουργούμε events για τις εργασίες
echo "Δημιουργία SQL για calendar events...\n";
$events = [];
$eventColors = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

foreach ($jobs as $index => $job) {
    // Δημιουργούμε event για κάθε εργασία ώστε το ημερολόγιο να μην έχει κενά.
    if (true) {
        $clientName = $clients[$job['client_id'] - 1][0];
        $title = $clientName . ' - ' . $job['title'];
        $startDate = $job['date'] . ' 00:00:00';
        $endDate = $job['visit_end_date'] . ' 00:00:00';
        
        $startTime = $job['visit_start_time'];
        $endTime = $job['visit_end_time'];
        
        $eventStatusMap = [
            'Υποψήφιος' => 'pending',
            'Προγραμματισμένη' => 'confirmed',
            'Σε εξέλιξη' => 'in_progress',
            'Σε αναμονή' => 'pending',
            'Ολοκληρώθηκε' => 'completed',
            'Εξοφλήθηκε' => 'completed',
            'Ακυρώθηκε' => 'cancelled',
        ];
        $eventStatus = $eventStatusMap[$job['status']] ?? 'pending';
        
        $color = $eventColors[array_rand($eventColors)];
        
        $events[] = [
            'title' => $title,
            'original_title' => $title,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'start_time' => $startTime,
            'end_time' => $endTime,
            'all_day' => $job['visit_all_day'],
            'client_id' => $job['client_id'],
            'job_id' => $job['id'],
            'address' => $job['address'],
            'description' => $job['notes'],
            'status' => $eventStatus,
            'color' => $color,
        ];
    }
}

// Προσθήκη επιπλέον events για όλες τις επόμενες επισκέψεις
echo "  Προσθήκη events για επόμενες επισκέψεις...\n";
foreach ($jobs as $index => $job) {
    if ($job['next_visit'] !== null) {
        $clientName = $clients[$job['client_id'] - 1][0];
        $title = 'Επόμ. Επίσκεψη: ' . $clientName . ' - ' . $job['title'];
        $startDate = $job['next_visit'] . ' 00:00:00';
        $endDate = $job['next_visit'] . ' 00:00:00';
        
        $startTime = sprintf('%02d:00:00', rand(9, 11));
        $endTime = sprintf('%02d:00:00', rand(12, 15));
        
        $color = '#f59e0b'; // Πορτοκαλί για επόμενες επισκέψεις
        
        $events[] = [
            'title' => $title,
            'original_title' => $title,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'start_time' => $startTime,
            'end_time' => $endTime,
            'all_day' => 0,
            'client_id' => $job['client_id'],
            'job_id' => $job['id'],
            'address' => $job['address'],
            'description' => 'Προγραμματισμένη επίσκεψη παρακολούθησης',
            'status' => 'pending',
            'color' => $color,
        ];
    }
}

// Προσθήκη γενικών events μέσα στο τελευταίο demo έτος.
$generalYear = (new DateTime($config['end_date']))->format('Y');
$generalEvents = [
    ['Σύσκεψη Ομάδας', "$generalYear-11-20 09:00:00", "$generalYear-11-20 11:00:00", '09:00:00', '11:00:00', 0, null, null, 'Γραφείο', 'Μηνιαία σύσκεψη ομάδας', 'Επιβεβαιωμένη', '#3b82f6', 0],
    ['Παραγγελία Υλικών', "$generalYear-11-25 10:00:00", "$generalYear-11-25 12:00:00", '10:00:00', '12:00:00', 0, null, null, 'Κατάστημα Χρωμάτων', 'Προμήθεια υλικών για Δεκέμβριο', 'Επιβεβαιωμένη', '#8b5cf6', 0],
    ['Έλεγχος Εξοπλισμού', "$generalYear-11-28 14:00:00", "$generalYear-11-28 16:00:00", '14:00:00', '16:00:00', 0, null, null, 'Αποθήκη', 'Συντήρηση εργαλείων', 'Σε Αναμονή', '#06b6d4', 0],
    ['Σύσκεψη Ομάδας', "$generalYear-12-10 09:00:00", "$generalYear-12-10 11:00:00", '09:00:00', '11:00:00', 0, null, null, 'Γραφείο', 'Μηνιαία σύσκεψη ομάδας', 'Σε Αναμονή', '#3b82f6', 0],
    ['Παραγγελία Υλικών', "$generalYear-12-15 10:00:00", "$generalYear-12-15 12:00:00", '10:00:00', '12:00:00', 0, null, null, 'Κατάστημα Χρωμάτων', 'Προμήθεια υλικών για Χριστούγεννα', 'Σε Αναμονή', '#8b5cf6', 0],
    ['Κλείσιμο για Γιορτές', "$generalYear-12-24 00:00:00", "$generalYear-12-26 23:59:59", null, null, 1, null, null, '', 'Χριστουγεννιάτικες διακοπές', 'Επιβεβαιωμένη', '#ec4899', 0],
    ['Απογραφή Αποθήκης', "$generalYear-12-28 10:00:00", "$generalYear-12-28 14:00:00", '10:00:00', '14:00:00', 0, null, null, 'Αποθήκη', 'Ετήσια απογραφή υλικών', 'Σε Αναμονή', '#14b8a6', 0]
];

foreach ($generalEvents as $gEvent) {
    $generalStatusMap = [
        'Επιβεβαιωμένη' => 'confirmed',
        'Σε Αναμονή' => 'pending',
        'Ολοκληρώθηκε' => 'completed',
        'Ακυρώθηκε' => 'cancelled',
    ];
    $events[] = [
        'title' => $gEvent[0],
        'original_title' => $gEvent[0],
        'start_date' => $gEvent[1],
        'end_date' => $gEvent[2],
        'start_time' => $gEvent[3],
        'end_time' => $gEvent[4],
        'all_day' => $gEvent[5],
        'client_id' => $gEvent[6],
        'job_id' => $gEvent[7],
        'address' => $gEvent[8],
        'description' => $gEvent[9],
        'status' => $generalStatusMap[$gEvent[10]] ?? 'pending',
        'color' => $gEvent[11],
    ];
}

$sqlOutput .= "-- CALENDAR EVENTS\n";
foreach ($events as $event) {
    $sqlOutput .= sprintf(
        "INSERT INTO calendar_events (title, original_title, start_date, end_date, start_time, end_time, all_day, client_id, job_id, address, description, status, color) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);\n",
        sqlValue($event['title']),
        sqlValue($event['original_title']),
        sqlValue($event['start_date']),
        sqlNullableValue($event['end_date']),
        sqlNullableValue($event['start_time']),
        sqlNullableValue($event['end_time']),
        sqlInt($event['all_day']),
        sqlInt($event['client_id']),
        sqlInt($event['job_id']),
        sqlNullableValue($event['address']),
        sqlNullableValue($event['description']),
        sqlValue($event['status']),
        sqlValue($event['color'])
    );
}
$sqlOutput .= "\n";

// TEMPLATES
echo "Δημιουργία SQL για templates...\n";
$templates = [
    ['Βαφή Διαμερίσματος Στάνταρ', 'Εσωτερικοί χώροι', 'Τυπική βαφή διαμερίσματος με πλαστικό χρώμα', 16, '[{"materialId":1,"materialName":"Πλαστικό Χρώμα Λευκό 3L","quantity":3,"unitPrice":12.50},{"materialId":4,"materialName":"Ρολό 25cm","quantity":2,"unitPrice":3.50}]', '[{"title":"Προετοιμασία χώρου","duration":2},{"title":"Αστάρωμα","duration":4},{"title":"Πρώτο χέρι","duration":6},{"title":"Δεύτερο χέρι","duration":4}]'],
    ['Εξωτερική Βαφή Μονοκατοικίας', 'Εξωτερικοί χώροι', 'Εξωτερική βαφή με ελαιόχρωμα', 32, '[{"materialId":4,"materialName":"Ελαιόχρωμα Λευκό 750ml","quantity":15,"unitPrice":8.50},{"materialId":9,"materialName":"Σύστρα Μεταλλική","quantity":3,"unitPrice":4.50}]', '[{"title":"Καθαρισμός επιφάνειας","duration":4},{"title":"Ξύσιμο παλαιών χρωμάτων","duration":8},{"title":"Αστάρωμα","duration":8},{"title":"Πρώτο χέρι","duration":8},{"title":"Δεύτερο χέρι","duration":4}]'],
    ['Βαφή Κέγκελων', 'Κέγκελα/Πέργκολα', 'Βαφή μεταλλικών κέγκελων με ελαιόχρωμα', 8, '[{"materialId":4,"materialName":"Ελαιόχρωμα Λευκό 750ml","quantity":4,"unitPrice":8.50},{"materialId":5,"materialName":"Πινέλο 5cm","quantity":3,"unitPrice":2.80}]', '[{"title":"Καθαρισμός σκουριάς","duration":2},{"title":"Αντισκωριακή προστασία","duration":2},{"title":"Βαφή","duration":4}]']
];

$sqlOutput .= "-- TEMPLATES\n";
foreach ($templates as $template) {
    $sqlOutput .= sprintf(
        "INSERT INTO templates (name, category, description, estimated_duration, materials, tasks) VALUES (%s, %s, %s, %s, %s, %s);\n",
        sqlValue($template[0]), sqlValue($template[1]),
        sqlNullableValue($template[2]), sqlNumber($template[3]),
        sqlValue($template[4]), sqlValue($template[5])
    );
}
$sqlOutput .= "\n";

// OFFERS
echo "Δημιουργία SQL για προσφορές...\n";
$offerYear = (new DateTime($config['end_date']))->format('Y');
$offers = [
    [3, "OFF-$offerYear-001", "$offerYear-11-10", "$offerYear-12-10", '[{"description":"Βαφή γραφείου - 3 χώροι","quantity":60,"unit":"τμ","unitPrice":10.00,"total":600.00},{"description":"Υλικά (χρώματα, ρολά)","quantity":1,"unit":"σετ","unitPrice":120.00,"total":120.00}]', 720.00, 172.80, 0.00, 892.80, 'pending', 'Προσφορά για βαφή γραφείου. Ισχύει για 1 μήνα.'],
    [5, "OFF-$offerYear-002", "$offerYear-10-15", "$offerYear-11-15", '[{"description":"Βαφή αποθήκης","quantity":180,"unit":"τμ","unitPrice":8.00,"total":1440.00}]', 1440.00, 345.60, 50.00, 1735.60, 'rejected', 'Πελάτης απέρριψε την προσφορά - πολύ υψηλή τιμή κατά τη γνώμη του.'],
    [8, "OFF-$offerYear-003", "$offerYear-12-01", "$offerYear-12-31", '[{"description":"Βαφή εμπορικού χώρου","quantity":85,"unit":"τμ","unitPrice":12.00,"total":1020.00},{"description":"Ειδικά χρώματα","quantity":1,"unit":"σετ","unitPrice":280.00,"total":280.00}]', 1300.00, 312.00, 65.00, 1547.00, 'accepted', 'Προσφορά εγκρίθηκε. Ξεκινάμε μέσα στον Δεκέμβριο.']
];

$sqlOutput .= "-- OFFERS\n";
foreach ($offers as $offer) {
    $sqlOutput .= sprintf(
        "INSERT INTO offers (client_id, offer_number, date, valid_until, items, subtotal, tax, discount, total, status, notes) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);\n",
        sqlInt($offer[0]), sqlValue($offer[1]), sqlValue($offer[2]), sqlNullableValue($offer[3]),
        sqlValue($offer[4]), sqlNumber($offer[5]), sqlNumber($offer[6]),
        sqlNumber($offer[7]), sqlNumber($offer[8]), sqlValue($offer[9]), sqlNullableValue($offer[10])
    );
}
$sqlOutput .= "\n";

// INVOICES
echo "Δημιουργία SQL για τιμολόγια...\n";
$invoices = [];
foreach ($jobs as $job) {
    if ($job['status'] !== 'Εξοφλήθηκε' && $job['status'] !== 'Ολοκληρώθηκε') {
        continue;
    }

    $invoiceIndex = count($invoices) + 1;
    $invoiceDate = $job['status'] === 'Εξοφλήθηκε'
        ? (new DateTime($job['date']))->modify('+3 days')->format('Y-m-d')
        : $job['date'];
    if ($invoiceDate > $config['end_date']) {
        $invoiceDate = $config['end_date'];
    }

    $subtotal = round($job['total_cost'] / 1.24, 2);
    $tax = round($job['total_cost'] - $subtotal, 2);
    $invoices[] = [
        'job_id' => $job['id'],
        'client_id' => $job['client_id'],
        'invoice_number' => 'INV-' . substr($invoiceDate, 0, 4) . '-' . str_pad($invoiceIndex, 4, '0', STR_PAD_LEFT),
        'date' => $invoiceDate,
        'items' => jsonValue([
            [
                'description' => $job['title'],
                'quantity' => 1,
                'unit' => 'έργο',
                'unitPrice' => $subtotal,
                'total' => $subtotal
            ]
        ]),
        'subtotal' => $subtotal,
        'tax' => $tax,
        'discount' => 0.00,
        'total' => $job['total_cost'],
        'is_paid' => $job['status'] === 'Εξοφλήθηκε' ? 1 : 0,
        'paid_date' => $job['status'] === 'Εξοφλήθηκε' ? $invoiceDate : null,
        'notes' => $job['status'] === 'Εξοφλήθηκε' ? 'Demo εξοφλημένο τιμολόγιο' : 'Demo ανοιχτό τιμολόγιο',
    ];
}

$sqlOutput .= "-- INVOICES\n";
foreach ($invoices as $invoice) {
    $sqlOutput .= sprintf(
        "INSERT INTO invoices (job_id, client_id, invoice_number, date, items, subtotal, tax, discount, total, is_paid, paid_date, notes) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);\n",
        sqlInt($invoice['job_id']),
        sqlInt($invoice['client_id']),
        sqlValue($invoice['invoice_number']),
        sqlValue($invoice['date']),
        sqlValue($invoice['items']),
        sqlNumber($invoice['subtotal']),
        sqlNumber($invoice['tax']),
        sqlNumber($invoice['discount']),
        sqlNumber($invoice['total']),
        sqlInt($invoice['is_paid']),
        sqlNullableValue($invoice['paid_date']),
        sqlNullableValue($invoice['notes'])
    );
}
$sqlOutput .= "\n";

// SETTINGS
echo "Δημιουργία SQL για ρυθμίσεις...\n";
$settings = [
    ['company_name', 'Οργανωτής Βαφέα Pro', 'Όνομα επιχείρησης'],
    ['company_settings', jsonValue([
        'name' => 'Νικολαΐδης Painting',
        'taxId' => '123456789',
        'address' => 'Θάσου 8, Αλεξανδρούπολη',
        'phone' => '+306978093442'
    ]), 'Στοιχεία επιχείρησης για τη φόρμα ρυθμίσεων'],
    ['pricing_settings', jsonValue([
        'hourlyRate' => 35,
        'travelCost' => 0.50
    ]), 'Προεπιλογές χρέωσης και μετακίνησης'],
    ['company_address', 'Αλεξανδρούπολη', 'Διεύθυνση επιχείρησης'],
    ['company_phone', '6978799299', 'Τηλέφωνο επιχείρησης'],
    ['company_email', 'info@organotis-vafea.gr', 'Email επιχείρησης'],
    ['default_billing_rate', '35', 'Προεπιλεγμένη τιμή ώρας (€)'],
    ['currency', 'EUR', 'Νόμισμα']
];

$sqlOutput .= "-- SETTINGS\n";
foreach ($settings as $setting) {
    $sqlOutput .= sprintf(
        "INSERT INTO settings (setting_key, setting_value, description) VALUES (%s, %s, %s);\n",
        sqlValue($setting[0]), sqlValue($setting[1]), sqlNullableValue($setting[2])
    );
}
$sqlOutput .= "\n";

// Finalize SQL
$sqlOutput .= "SET FOREIGN_KEY_CHECKS = 1;\n";
$sqlOutput .= "\n-- Τέλος αρχείου\n";

echo "\n✅ Ολοκληρώθηκε!\n";
echo "💾 Δημιουργήθηκε το αρχείο: reset_and_import.sql\n\n";
echo "Στατιστικά:\n";
echo "  • Seed: " . $config['seed'] . "\n";
echo "  • " . count($clients) . " πελάτες\n";
echo "  • " . count($workers) . " εργάτες\n";
echo "  • " . count($materials) . " υλικά\n";
echo "  • " . count($suppliers) . " καταστήματα\n";
echo "  • " . count($materialPurchases) . " αγορές υλικών\n";
echo "  • " . count($materialPurchaseItems) . " γραμμές αγορών\n";
echo "  • " . count($supplierPayments) . " πληρωμές προμηθευτών\n";
echo "  • " . count($materialStockMovements) . " κινήσεις αποθήκης\n";
echo "  • " . count($jobs) . " εργασίες (" . $config['jobs_per_week'] . " την εβδομάδα)\n";
echo "  • " . count($jobVisits) . " επισκέψεις εργασιών\n";
echo "  • " . count($jobPayments) . " πληρωμές εργασιών\n";
echo "  • " . count($events) . " calendar events\n";
echo "  • " . count($templates) . " templates\n";
echo "  • " . count($offers) . " προσφορές\n";
echo "  • " . count($invoices) . " τιμολόγια\n";
echo "  • " . count($settings) . " ρυθμίσεις\n";

// Υπολογισμός συνολικών εσόδων
$totalRevenue = 0;
$paidJobs = 0;
foreach ($jobs as $job) {
    if ((int)$job['is_paid'] === 1) {
        $totalRevenue += (float)$job['total_cost'];
        $paidJobs++;
    }
}

echo "\nΟικονομικά Στοιχεία:\n";
echo "  • Σύνολο πληρωμένων εργασιών: " . $paidJobs . "\n";
echo "  • Συνολικά έσοδα: €" . number_format($totalRevenue, 2) . "\n";
echo "  • Μέσος όρος ανά εργασία: €" . number_format($totalRevenue / max($paidJobs, 1), 2) . "\n";

// Save SQL file with UTF-8 encoding
$sqlFile = __DIR__ . '/reset_and_import.sql';
file_put_contents($sqlFile, $sqlOutput, LOCK_EX);

// ΔΗΜΙΟΥΡΓΙΑ JSON ΑΡΧΕΙΟΥ
echo "\n📦 Δημιουργία JSON backup αρχείου...\n";

// Φόρτωση συντεταγμένων από το παλιό backup
$oldBackupFile = __DIR__ . '/backup_2025-11-16_162357.json';
$coordinatesMap = [];
if (file_exists($oldBackupFile)) {
    $oldBackup = json_decode(file_get_contents($oldBackupFile), true);
    if (isset($oldBackup['tables']['clients']['data'])) {
        foreach ($oldBackup['tables']['clients']['data'] as $client) {
            if (!empty($client['coordinates'])) {
                $coordinatesMap[$client['id']] = $client['coordinates'];
            }
        }
    }
    echo "  ✓ Φορτώθηκαν " . count($coordinatesMap) . " συντεταγμένες πελατών\n";
}

// Δημιουργία JSON structure
$jsonData = [
    'version' => '1.0',
    'exported_at' => date('Y-m-d H:i:s'),
    'database' => 'painter_app',
    'tables' => []
];

// CLIENTS με συντεταγμένες
$jsonData['tables']['clients'] = [
    'count' => count($clients),
    'data' => []
];
foreach ($clients as $index => $client) {
    $clientId = $index + 1;
    $coords = isset($coordinatesMap[$clientId]) ? $coordinatesMap[$clientId] : $client[8];
    
    $jsonData['tables']['clients']['data'][] = [
        'id' => $clientId,
        'name' => $client[0],
        'phone' => $client[1],
        'email' => $client[2],
        'address' => $client[3],
        'city' => $client[4],
        'postal_code' => $client[5],
        'afm' => $client[6],
        'notes' => $client[7],
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s'),
        'coordinates' => $coords
    ];
}

// WORKERS
$jsonData['tables']['workers'] = [
    'count' => count($workers),
    'data' => []
];
foreach ($workers as $index => $worker) {
    $jsonData['tables']['workers']['data'][] = [
        'id' => $index + 1,
        'name' => $worker[0],
        'phone' => $worker[1],
        'specialty' => $worker[2],
        'hourly_rate' => number_format($worker[3], 2, '.', ''),
        'daily_rate' => number_format($worker[4], 2, '.', ''),
        'worker_type' => $worker[5],
        'workerType' => $worker[5],
        'status' => $worker[6],
        'hire_date' => $worker[7],
        'notes' => $worker[8],
        'total_hours' => number_format($worker[9], 2, '.', ''),
        'total_earnings' => number_format($worker[10], 2, '.', ''),
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s')
    ];
}

// MATERIALS
$jsonData['tables']['materials'] = [
    'count' => count($materials),
    'data' => []
];
foreach ($materials as $index => $material) {
    $jsonData['tables']['materials']['data'][] = [
        'id' => $index + 1,
        'name' => $material[0],
        'unit' => $material[1],
        'unit_price' => number_format($material[2], 2, '.', ''),
        'stock' => number_format($material[3], 2, '.', ''),
        'min_stock' => number_format($material[4], 2, '.', ''),
        'category' => $material[5],
        'color_code' => $material[6],
        'colorCode' => $material[6],
        'canonical_key' => materialCanonicalKey($material[0], $material[5], $material[6]),
        'canonicalKey' => materialCanonicalKey($material[0], $material[5], $material[6]),
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s')
    ];
}

// SUPPLIERS
$jsonData['tables']['suppliers'] = [
    'count' => count($suppliers),
    'data' => []
];
foreach ($suppliers as $index => $supplier) {
    $jsonData['tables']['suppliers']['data'][] = [
        'id' => $index + 1,
        'name' => $supplier[0],
        'phone' => $supplier[1],
        'email' => $supplier[2],
        'address' => $supplier[3],
        'notes' => $supplier[4],
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s')
    ];
}

// MATERIAL PURCHASES
$jsonData['tables']['material_purchases'] = [
    'count' => count($materialPurchases),
    'data' => []
];
foreach ($materialPurchases as $purchase) {
    $jsonData['tables']['material_purchases']['data'][] = [
        'id' => $purchase['id'],
        'supplier_id' => $purchase['supplier_id'],
        'purchase_date' => $purchase['purchase_date'],
        'reference_number' => $purchase['reference_number'],
        'notes' => $purchase['notes'],
        'total_cost' => number_format($purchase['total_cost'], 2, '.', ''),
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s')
    ];
}

// MATERIAL PURCHASE ITEMS
$jsonData['tables']['material_purchase_items'] = [
    'count' => count($materialPurchaseItems),
    'data' => []
];
foreach ($materialPurchaseItems as $index => $item) {
    $jsonData['tables']['material_purchase_items']['data'][] = [
        'id' => $index + 1,
        'purchase_id' => $item['purchase_id'],
        'material_id' => $item['material_id'],
        'material_name' => $item['material_name'],
        'category' => $item['category'],
        'color_code' => $item['color_code'],
        'colorCode' => $item['color_code'],
        'quantity' => number_format($item['quantity'], 2, '.', ''),
        'unit' => $item['unit'],
        'unit_price' => number_format($item['unit_price'], 2, '.', ''),
        'total_cost' => number_format($item['total_cost'], 2, '.', ''),
        'notes' => $item['notes'],
        'created_at' => date('Y-m-d H:i:s')
    ];
}

// SUPPLIER PAYMENTS
$jsonData['tables']['supplier_payments'] = [
    'count' => count($supplierPayments),
    'data' => []
];
foreach ($supplierPayments as $index => $payment) {
    $jsonData['tables']['supplier_payments']['data'][] = [
        'id' => $index + 1,
        'supplier_id' => $payment['supplier_id'],
        'purchase_id' => $payment['purchase_id'],
        'payment_date' => $payment['payment_date'],
        'amount' => number_format($payment['amount'], 2, '.', ''),
        'payment_method' => $payment['payment_method'],
        'notes' => $payment['notes'],
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s')
    ];
}

// MATERIAL STOCK MOVEMENTS
$jsonData['tables']['material_stock_movements'] = [
    'count' => count($materialStockMovements),
    'data' => []
];
foreach ($materialStockMovements as $index => $movement) {
    $jsonData['tables']['material_stock_movements']['data'][] = [
        'id' => $index + 1,
        'material_id' => $movement['material_id'],
        'material_name' => $materials[$movement['material_id'] - 1][0] ?? '',
        'materialName' => $materials[$movement['material_id'] - 1][0] ?? '',
        'movement_date' => $movement['movement_date'],
        'movement_type' => $movement['movement_type'],
        'quantity' => number_format($movement['quantity'], 2, '.', ''),
        'previous_stock' => number_format($movement['previous_stock'], 2, '.', ''),
        'new_stock' => number_format($movement['new_stock'], 2, '.', ''),
        'unit' => $movement['unit'],
        'reference_type' => $movement['reference_type'],
        'reference_id' => $movement['reference_id'],
        'notes' => $movement['notes'],
        'created_at' => date('Y-m-d H:i:s')
    ];
}

// JOBS
$jsonData['tables']['jobs'] = [
    'count' => count($jobs),
    'data' => []
];
foreach ($jobs as $index => $job) {
    $jsonData['tables']['jobs']['data'][] = [
        'id' => $job['id'],
        'client_id' => $job['client_id'],
        'title' => $job['title'],
        'type' => $job['type'],
        'date' => $job['date'],
        'next_visit' => $job['next_visit'],
        'visit_end_date' => $job['visit_end_date'],
        'visit_start_time' => $job['visit_start_time'],
        'visit_end_time' => $job['visit_end_time'],
        'visit_all_day' => $job['visit_all_day'],
        'address' => $job['address'],
        'rooms' => $job['rooms'],
        'area' => number_format($job['area'], 2, '.', ''),
        'materials_cost' => number_format($job['materials_cost'], 2, '.', ''),
        'kilometers' => number_format($job['kilometers'], 2, '.', ''),
        'billing_hours' => number_format($job['billing_hours'], 2, '.', ''),
        'billing_rate' => number_format($job['billing_rate'], 2, '.', ''),
        'billing_type' => $job['billing_type'],
        'agreed_price' => number_format($job['agreed_price'], 2, '.', ''),
        'cost_per_km' => number_format($job['cost_per_km'], 2, '.', ''),
        'notes' => $job['notes'],
        'assigned_workers' => $job['assigned_workers'],
        'paints' => $job['paints'],
        'status' => $job['status'],
        'total_cost' => number_format($job['total_cost'], 2, '.', ''),
        'is_paid' => $job['is_paid'],
        'coordinates' => $job['coordinates'],
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s')
    ];
}

// JOB VISITS
$jsonData['tables']['job_visits'] = [
    'count' => count($jobVisits),
    'data' => []
];
foreach ($jobVisits as $index => $visit) {
    $jsonData['tables']['job_visits']['data'][] = [
        'id' => $index + 1,
        'job_id' => $visit['job_id'],
        'visit_date' => $visit['visit_date'],
        'workers' => $visit['workers'],
        'notes' => $visit['notes'],
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s')
    ];
}

// JOB PAYMENTS
$jsonData['tables']['job_payments'] = [
    'count' => count($jobPayments),
    'data' => []
];
foreach ($jobPayments as $index => $payment) {
    $jsonData['tables']['job_payments']['data'][] = [
        'id' => $index + 1,
        'job_id' => $payment['job_id'],
        'payment_date' => $payment['payment_date'],
        'amount' => number_format($payment['amount'], 2, '.', ''),
        'notes' => $payment['notes'],
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s')
    ];
}

// CALENDAR EVENTS
$jsonData['tables']['calendar_events'] = [
    'count' => count($events),
    'data' => []
];
foreach ($events as $index => $event) {
    $jsonData['tables']['calendar_events']['data'][] = [
        'id' => $index + 1,
        'title' => $event['title'],
        'original_title' => $event['original_title'],
        'start_date' => $event['start_date'],
        'end_date' => $event['end_date'],
        'start_time' => $event['start_time'],
        'end_time' => $event['end_time'],
        'all_day' => $event['all_day'],
        'client_id' => $event['client_id'],
        'job_id' => $event['job_id'],
        'address' => $event['address'],
        'description' => $event['description'],
        'status' => $event['status'],
        'color' => $event['color'],
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s')
    ];
}

// TEMPLATES
$jsonData['tables']['templates'] = [
    'count' => count($templates),
    'data' => []
];
foreach ($templates as $index => $template) {
    $jsonData['tables']['templates']['data'][] = [
        'id' => $index + 1,
        'name' => $template[0],
        'category' => $template[1],
        'description' => $template[2],
        'estimated_duration' => number_format($template[3], 2, '.', ''),
        'materials' => $template[4],
        'tasks' => $template[5],
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s')
    ];
}

// OFFERS
$jsonData['tables']['offers'] = [
    'count' => count($offers),
    'data' => []
];
foreach ($offers as $index => $offer) {
    $jsonData['tables']['offers']['data'][] = [
        'id' => $index + 1,
        'client_id' => $offer[0],
        'offer_number' => $offer[1],
        'date' => $offer[2],
        'valid_until' => $offer[3],
        'items' => $offer[4],
        'subtotal' => number_format($offer[5], 2, '.', ''),
        'tax' => number_format($offer[6], 2, '.', ''),
        'discount' => number_format($offer[7], 2, '.', ''),
        'total' => number_format($offer[8], 2, '.', ''),
        'status' => $offer[9],
        'notes' => $offer[10],
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s')
    ];
}

// SETTINGS
$jsonData['tables']['settings'] = [
    'count' => count($settings),
    'data' => []
];
foreach ($settings as $index => $setting) {
    $jsonData['tables']['settings']['data'][] = [
        'id' => $index + 1,
        'setting_key' => $setting[0],
        'setting_value' => $setting[1],
        'description' => $setting[2],
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s')
    ];
}

// INVOICES
$jsonData['tables']['invoices'] = [
    'count' => count($invoices),
    'data' => []
];
foreach ($invoices as $index => $invoice) {
    $jsonData['tables']['invoices']['data'][] = [
        'id' => $index + 1,
        'job_id' => $invoice['job_id'],
        'client_id' => $invoice['client_id'],
        'invoice_number' => $invoice['invoice_number'],
        'date' => $invoice['date'],
        'items' => $invoice['items'],
        'subtotal' => number_format($invoice['subtotal'], 2, '.', ''),
        'tax' => number_format($invoice['tax'], 2, '.', ''),
        'discount' => number_format($invoice['discount'], 2, '.', ''),
        'total' => number_format($invoice['total'], 2, '.', ''),
        'is_paid' => $invoice['is_paid'],
        'paid_date' => $invoice['paid_date'],
        'notes' => $invoice['notes'],
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s')
    ];
}

// Save JSON file
$jsonFile = __DIR__ . '/backup_' . date('Y-m-d') . '.json';
$jsonContent = json_encode($jsonData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
file_put_contents($jsonFile, $jsonContent, LOCK_EX);

echo "✅ Δημιουργήθηκε JSON: backup_" . date('Y-m-d') . ".json\n";
echo "  • Clients με συντεταγμένες: " . count($jsonData['tables']['clients']['data']) . "\n";
echo "  • Calendar Events: " . count($jsonData['tables']['calendar_events']['data']) . "\n";
?>

