<?php
/**
 * Script για δημιουργία reset_and_import.sql (χωρίς σύνδεση στη βάση)
 */

// Set UTF-8 encoding (if mbstring extension is available)
if (function_exists('mb_internal_encoding')) {
    mb_internal_encoding('UTF-8');
    mb_http_output('UTF-8');
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
$tables = [
    'timesheets',
    'job_workers',
    'job_materials',
    'invoices',
    'offers',
    'calendar_events',
    'jobs',
    'workers',
    'materials',
    'clients',
    'templates',
    'settings'
];

foreach ($tables as $table) {
    $sqlOutput .= "DELETE FROM `$table`;\n";
    $sqlOutput .= "ALTER TABLE `$table` AUTO_INCREMENT = 1;\n";
}
$sqlOutput .= "\n";

// CLIENTS - Δημιουργία μεγάλου αριθμού πελατών
echo "Δημιουργία SQL για πελάτες...\n";

$firstNames = ['Γιάννης', 'Μαρία', 'Κώστας', 'Ελένη', 'Νίκος', 'Σοφία', 'Δημήτρης', 'Άννα', 'Παναγιώτης', 'Κατερίνα', 'Αντώνης', 'Βασιλική', 'Γεώργιος', 'Χριστίνα', 'Μιχάλης', 'Ευαγγελία', 'Σταύρος', 'Δέσποινα', 'Θανάσης', 'Μαρίνα', 'Πέτρος', 'Φωτεινή', 'Ανδρέας', 'Ιωάννα', 'Βασίλης', 'Αικατερίνη', 'Χρήστος', 'Ειρήνη', 'Σπύρος', 'Αλεξάνδρα'];
$lastNames = ['Παπαδόπουλος', 'Νικολάου', 'Γεωργίου', 'Αθανασίου', 'Δημητρίου', 'Παναγιώτου', 'Ιωάννου', 'Παύλου', 'Χρήστου', 'Βασιλείου', 'Αντωνίου', 'Μιχαήλ', 'Λάμπρου', 'Κωνσταντίνου', 'Πετρίδης', 'Μαυρίδης', 'Σταματίου', 'Οικονόμου', 'Καραγιάννης', 'Παπακώστας', 'Ζαχαρίου', 'Σαββίδης', 'Κυριακίδης', 'Αλεξίου', 'Θεοδωρίδης'];
$streets = ['Δημοκρατίας', '14ης Μαΐου', 'Κύπρου', 'Βενιζέλου', 'Καραολή και Δημητρίου', 'Ελευθερίας', 'Αγίου Δημητρίου', 'Καποδιστρίου', 'Ορφέως', 'Σωκράτους', 'Πλάτωνος', 'Αριστοτέλους', 'Μ. Αλεξάνδρου', 'Εθνικής Αντιστάσεως', 'Λεωφόρος Δημοκρατίας', 'Βύρωνος', 'Κολοκοτρώνη', 'Μιαούλη', 'Παπαφλέσσα', '25ης Μαρτίου'];
$notes = ['Τακτικός πελάτης', 'Προτιμά πρωινές ώρες', 'Επιχειρηματίας', 'VIP πελάτης', 'Προτιμά ανοιχτά χρώματα', 'Ζητά προσφορά πρώτα', 'Πολύ απαιτητικός', 'Συνεργάσιμος πελάτης', 'Πληρώνει έγκαιρα', 'Ζητά οικολογικά υλικά'];

$clients = [];
// Δημιουργούμε 156 πελάτες (1 για κάθε 2 εργασίες, 312 εργασίες σύνολο)
for ($i = 0; $i < 156; $i++) {
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
    
    $clients[] = [$name, $phone, $email, $address, 'Αλεξανδρούπολη', '68100', $afm, $note];
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
        "INSERT INTO clients (name, phone, email, address, city, postal_code, afm, notes) VALUES ('%s', '%s', '%s', '%s', '%s', '%s', %s, %s);\n",
        addslashes($client[0]), addslashes($client[1]), addslashes($client[2]), 
        addslashes($client[3]), addslashes($client[4]), addslashes($client[5]),
        $client[6] ? "'" . addslashes($client[6]) . "'" : 'NULL',
        $client[7] ? "'" . addslashes($client[7]) . "'" : 'NULL'
    );
}
$sqlOutput .= "\n";

// WORKERS
echo "Δημιουργία SQL για εργάτες...\n";
$workers = [
    ['Δημήτρης Βασιλείου', '6923111222', 'Βαφέας Senior', 15.00, 100.00, 'active', '2024-01-15', 'Έμπειρος βαφέας με 10 χρόνια εμπειρία', 320.50, 4807.50],
    ['Γιώργος Αντωνίου', '6934222333', 'Ελαιοχρωματιστής', 12.00, 85.00, 'active', '2024-03-01', 'Ειδικός σε ελαιοχρώματα', 180.00, 2160.00],
    ['Σωτήρης Μιχαήλ', '6945333444', 'Ειδικός σε Ξύλο', 18.00, 120.00, 'active', '2023-06-10', 'Ειδικότητα σε ξύλινες επιφάνειες και επίπλα', 256.00, 4608.00],
    ['Κώστας Λάμπρου', '6956444555', 'Βοηθός Βαφέα', 10.00, 70.00, 'active', '2025-05-20', 'Νέος εργάτης σε εκπαίδευση', 45.00, 450.00],
    ['Παναγιώτης Νικολάου', '6967555666', 'Βαφέας', 14.00, 95.00, 'inactive', '2023-12-01', 'Προσωρινά μη διαθέσιμος - προσωπικοί λόγοι', 890.00, 12460.00]
];

$sqlOutput .= "-- WORKERS\n";
foreach ($workers as $worker) {
    $sqlOutput .= sprintf(
        "INSERT INTO workers (name, phone, specialty, hourly_rate, daily_rate, status, hire_date, notes, total_hours, total_earnings) VALUES ('%s', '%s', '%s', %.2f, %.2f, '%s', '%s', %s, %.2f, %.2f);\n",
        addslashes($worker[0]), addslashes($worker[1]), addslashes($worker[2]),
        $worker[3], $worker[4], $worker[5], $worker[6],
        $worker[7] ? "'" . addslashes($worker[7]) . "'" : 'NULL',
        $worker[8], $worker[9]
    );
}
$sqlOutput .= "\n";

// MATERIALS
echo "Δημιουργία SQL για υλικά...\n";
$materials = [
    ['Πλαστικό Χρώμα Λευκό 3L', 'τμχ', 12.50, 50.00, 10.00, 'Χρώματα'],
    ['Πλαστικό Χρώμα Μπεζ 3L', 'τμχ', 13.00, 30.00, 10.00, 'Χρώματα'],
    ['Πλαστικό Χρώμα Γκρι 3L', 'τμχ', 13.00, 25.00, 8.00, 'Χρώματα'],
    ['Ελαιόχρωμα Λευκό 750ml', 'τμχ', 8.50, 25.00, 5.00, 'Χρώματα'],
    ['Ελαιόχρωμα Μπεζ 750ml', 'τμχ', 8.50, 15.00, 5.00, 'Χρώματα'],
    ['Ακρυλικό Χρώμα Μπλε 1L', 'τμχ', 9.00, 20.00, 5.00, 'Χρώματα'],
    ['Ακρυλικό Χρώμα Πράσινο 1L', 'τμχ', 9.00, 18.00, 5.00, 'Χρώματα'],
    ['Αστάρι Ακρυλικό 3L', 'τμχ', 11.00, 35.00, 8.00, 'Χρώματα'],
    ['Αστάρι Νερού 3L', 'τμχ', 10.50, 28.00, 8.00, 'Χρώματα'],
    ['Ρολό 25cm Πολυαμιδίου', 'τμχ', 3.50, 100.00, 20.00, 'Εργαλεία'],
    ['Ρολό 18cm Μικρό', 'τμχ', 2.80, 80.00, 15.00, 'Εργαλεία'],
    ['Πινέλο 5cm Επαγγελματικό', 'τμχ', 2.80, 80.00, 15.00, 'Εργαλεία'],
    ['Πινέλο 8cm Ραδιατέρ', 'τμχ', 3.20, 60.00, 12.00, 'Εργαλεία'],
    ['Σύστρα Μεταλλική 30cm', 'τμχ', 4.50, 40.00, 10.00, 'Εργαλεία'],
    ['Σύστρα Πλαστική 25cm', 'τμχ', 3.20, 50.00, 12.00, 'Εργαλεία'],
    ['Νάιλον Προστασίας 4x5m', 'τμχ', 1.50, 200.00, 50.00, 'Αναλώσιμα'],
    ['Ταινία Χαρτοταινία 50mm', 'τμχ', 2.20, 150.00, 30.00, 'Αναλώσιμα'],
    ['Σπατουλάρισμα 5kg', 'τμχ', 6.80, 45.00, 10.00, 'Χρώματα'],
    ['Διαλυτικό 1L', 'τμχ', 4.50, 30.00, 8.00, 'Αναλώσιμα'],
    ['Λούστρο Ματ 750ml', 'τμχ', 7.20, 22.00, 6.00, 'Χρώματα']
];

$sqlOutput .= "-- MATERIALS\n";
foreach ($materials as $material) {
    $sqlOutput .= sprintf(
        "INSERT INTO materials (name, unit, unit_price, stock, min_stock, category) VALUES ('%s', '%s', %.2f, %.2f, %.2f, '%s');\n",
        addslashes($material[0]), addslashes($material[1]), $material[2], 
        $material[3], $material[4], addslashes($material[5])
    );
}
$sqlOutput .= "\n";

// JOBS - Δημιουργία 312 εργασιών (2 την εβδομάδα για 3 χρόνια)
echo "Δημιουργία SQL για εργασίες...\n";

$jobTypes = [
    ['Εσωτερικοί χώροι', ['Βαφή Διαμερίσματος', 'Βαφή Γραφείου', 'Βαφή Καταστήματος', 'Βαφή Σπιτιού', 'Βαφή Παιδικού Δωματίου', 'Βαφή Σαλονιού', 'Βαφή Κουζίνας']],
    ['Εξωτερικοί χώροι', ['Εξωτερική Βαφή Μονοκατοικίας', 'Βαφή Πρόσοψης', 'Βαφή Περιτοιχίσματος', 'Εξωτερική Βαφή Πολυκατοικίας']],
    ['Κέγκελα/Πέργκολα', ['Βαφή Κέγκελων', 'Βαφή Μπαλκονιών', 'Βαφή Πέργκολας', 'Βαφή Μεταλλικής Πόρτας']],
    ['Ξύλινες επιφάνειες', ['Βαφή Ξύλινων Επίπλων', 'Λακάρισμα Ντουλαπών', 'Βαφή Παρκέ', 'Βαφή Ξύλινων Πορτών']]
];

$substrates = ['Γυψοσανίδα', 'Σοβάς', 'Τσιμέντο', 'Μέταλλο', 'Ξύλο'];
$paintBrands = ['Vitex', 'Kraft', 'Dulux', 'Levis', 'MaxMeyer'];
$paintColors = [
    ['Λευκό Ματ', 'WH-001'], ['Μπεζ Ανοιχτό', 'BG-002'], ['Γκρι Ανοιχτό', 'GR-003'],
    ['Γκρι Σκούρο', 'GR-005'], ['Εκρού', 'EC-001'], ['Κρεμ', 'CR-002'],
    ['Μπλε Ανοιχτό', 'BL-001'], ['Πράσινο Ανοιχτό', 'GN-001'], ['Κίτρινο Απαλό', 'YL-001']
];

$statuses = [
    ['Ολοκληρώθηκε', 70],  // 70% πιθανότητα
    ['Σε εξέλιξη', 10],
    ['Προγραμματισμένη', 5],
    ['Υποψήφιος', 5],
    ['Ακυρώθηκε', 5],
    ['Αναβλήθηκε', 5]
];

$workersList = [
    [1, 'Δημήτρης Βασιλείου', 'Βαφέας Senior', 15.00],
    [2, 'Γιώργος Αντωνίου', 'Ελαιοχρωματιστής', 12.00],
    [3, 'Σωτήρης Μιχαήλ', 'Ειδικός σε Ξύλο', 18.00],
    [4, 'Κώστας Λάμπρου', 'Βοηθός Βαφέα', 10.00]
];

// Συνάρτηση για επιλογή status με βάση πιθανότητες
function getRandomStatus($statuses) {
    $rand = rand(1, 100);
    $cumulative = 0;
    foreach ($statuses as $status) {
        $cumulative += $status[1];
        if ($rand <= $cumulative) {
            return $status[0];
        }
    }
    return $statuses[0][0];
}

$jobs = [];
$startDate = new DateTime('2022-11-15');
$endDate = new DateTime('2025-11-15');
$currentDate = clone $startDate;

$jobIndex = 0;
$clientIndex = 0;

// Δημιουργούμε 2 εργασίες την εβδομάδα
while ($currentDate <= $endDate) {
    // Δευτέρα και Πέμπτη κάθε εβδομάδας
    $weekJobs = [
        (clone $currentDate)->modify('Monday this week'),
        (clone $currentDate)->modify('Thursday this week')
    ];
    
    foreach ($weekJobs as $jobDate) {
        if ($jobDate > $endDate) break;
        if ($jobDate < $startDate) continue;
        
        // Κάθε 2 εργασίες αλλάζουμε πελάτη
        if ($jobIndex % 2 == 0 && $clientIndex < count($clients)) {
            $currentClientId = $clientIndex + 1;
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
        
        // Χαρακτηριστικά εργασίας
        $rooms = rand(1, 5);
        $area = rand(40, 300);
        $substrate = $substrates[array_rand($substrates)];
        
        // Κόστη με λογική
        $baseMaterialCost = $area * rand(15, 30) / 10; // €1.5-3 ανά τμ
        $materialsCost = round($baseMaterialCost, 2);
        
        $kilometers = round(rand(2, 30) + (rand(0, 99) / 100), 2);
        
        $billingHours = round($area / rand(8, 15), 2); // 8-15 τμ ανά ώρα
        $billingRate = [45, 50, 55, 60][array_rand([45, 50, 55, 60])];
        
        // Υπολογισμός συνολικού κόστους
        $laborCost = $billingHours * $billingRate;
        $kmCost = $kilometers * 0.50;
        $subtotal = $materialsCost + $laborCost + $kmCost;
        $totalCost = round($subtotal * 1.24, 2); // με ΦΠΑ 24%
        
        // Status και πληρωμή
        $status = getRandomStatus($statuses);
        $isPaid = ($status == 'Ολοκληρώθηκε' && rand(1, 100) <= 85) ? 1 : 0; // 85% πληρωμένα
        
        // Ημερομηνίες
        $dateStr = $jobDate->format('Y-m-d');
        $startDateStr = $dateStr;
        $duration = ceil($billingHours / 8); // ημέρες
        $endDateObj = (clone $jobDate)->modify("+{$duration} days");
        $endDateStr = $endDateObj->format('Y-m-d');
        
        // Εργάτες
        $numWorkers = rand(1, 3);
        $assignedWorkers = [];
        $selectedWorkers = array_rand($workersList, min($numWorkers, count($workersList)));
        if (!is_array($selectedWorkers)) $selectedWorkers = [$selectedWorkers];
        
        foreach ($selectedWorkers as $idx) {
            $worker = $workersList[$idx];
            $workerHours = round($billingHours / count($selectedWorkers), 2);
            $assignedWorkers[] = [
                'workerId' => $worker[0],
                'workerName' => $worker[1],
                'workerSpecialty' => $worker[2],
                'hoursAllocated' => $workerHours,
                'hourlyRate' => $worker[3],
                'laborCost' => round($workerHours * $worker[3], 2)
            ];
        }
        
        // Χρώματα
        $numPaints = rand(1, 3);
        $paints = [];
        for ($p = 0; $p < $numPaints; $p++) {
            $color = $paintColors[array_rand($paintColors)];
            $paints[] = [
                'name' => $color[0],
                'code' => $color[1],
                'brand' => $paintBrands[array_rand($paintBrands)]
            ];
        }
        
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
        $notes = ($status == 'Ολοκληρώθηκε') ? $notesTemplates[array_rand($notesTemplates)] : 
                 ($status == 'Σε εξέλιξη' ? 'Εργασία σε εξέλιξη - ' . rand(20, 80) . '% ολοκλήρωση' :
                 ($status == 'Ακυρώθηκε' ? 'Ακυρώθηκε από τον πελάτη' : 'Προγραμματισμένη εργασία'));
        
        // Συντεταγμένες (τυχαίες γύρω από Αλεξανδρούπολη)
        $lat = 40.8476 + (rand(-100, 100) / 10000);
        $lng = 25.8759 + (rand(-100, 100) / 10000);
        $coordinates = sprintf('{"lat": %.4f, "lng": %.4f}', $lat, $lng);
        
        $jobs[] = [
            $currentClientId,
            $title,
            $type,
            $dateStr,
            null, // next_visit
            $description,
            $clients[$currentClientId - 1][3], // address από client
            'Αλεξανδρούπολη',
            '68100',
            $rooms,
            $area,
            $substrate,
            $materialsCost,
            $kilometers,
            $billingHours,
            $billingRate,
            24.00, // VAT
            0.50, // cost_per_km
            $notes,
            json_encode($assignedWorkers, JSON_UNESCAPED_UNICODE),
            json_encode($paints, JSON_UNESCAPED_UNICODE),
            $startDateStr,
            ($status == 'Ολοκληρώθηκε' || $status == 'Σε εξέλιξη') ? $endDateStr : 'NULL',
            $status,
            $totalCost,
            $isPaid,
            $coordinates
        ];
        
        $jobIndex++;
    }
    
    // Επόμενη εβδομάδα
    $currentDate->modify('+1 week');
}

echo "  Δημιουργήθηκαν " . count($jobs) . " εργασίες\n";

$sqlOutput .= "-- JOBS (όλες οι καταστάσεις)\n";
foreach ($jobs as $job) {
    $sqlOutput .= sprintf(
        "INSERT INTO jobs (client_id, title, type, date, next_visit, description, address, city, postal_code, rooms, area, substrate, materials_cost, kilometers, billing_hours, billing_rate, vat, cost_per_km, notes, assigned_workers, paints, start_date, end_date, status, total_cost, is_paid, coordinates) VALUES (%d, '%s', '%s', %s, %s, '%s', '%s', '%s', '%s', %s, %.2f, '%s', %.2f, %.2f, %.2f, %.2f, %.2f, %.2f, %s, %s, %s, '%s', %s, '%s', %.2f, %d, %s);\n",
        $job[0], addslashes($job[1]), addslashes($job[2]),
        $job[3] ? "'" . $job[3] . "'" : 'NULL',
        $job[4] ? "'" . $job[4] . "'" : 'NULL',
        addslashes($job[5]), addslashes($job[6]), addslashes($job[7]), addslashes($job[8]),
        $job[9] !== null ? $job[9] : 'NULL', $job[10], addslashes($job[11]),
        $job[12], $job[13], $job[14], $job[15], $job[16], $job[17],
        $job[18] ? "'" . addslashes($job[18]) . "'" : 'NULL',
        $job[19] ? "'" . addslashes($job[19]) . "'" : 'NULL',
        $job[20] ? "'" . addslashes($job[20]) . "'" : 'NULL',
        $job[21], $job[22] ? "'" . $job[22] . "'" : 'NULL',
        addslashes($job[23]), $job[24], $job[25],
        $job[26] ? "'" . addslashes($job[26]) . "'" : 'NULL'
    );
}
$sqlOutput .= "\n";

// CALENDAR EVENTS - Δημιουργούμε events για τις εργασίες
echo "Δημιουργία SQL για calendar events...\n";
$events = [];
$eventColors = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

foreach ($jobs as $index => $job) {
    // Δημιουργούμε event μόνο για ολοκληρωμένες και σε εξέλιξη εργασίες (70% περίπου)
    if (rand(1, 100) <= 70) {
        $clientName = $clients[$job[0] - 1][0];
        $title = $clientName . ' - ' . $job[1];
        $startDate = $job[21] . ' 00:00:00';
        $endDate = ($job[22] !== 'NULL' ? $job[22] : $job[21]) . ' 00:00:00';
        
        $startTime = sprintf('%02d:00:00', rand(8, 10));
        $endTime = sprintf('%02d:00:00', rand(15, 18));
        
        $eventStatus = ($job[23] == 'Ολοκληρώθηκε') ? 'completed' : 
                      (($job[23] == 'Σε εξέλιξη') ? 'in_progress' : 'confirmed');
        
        $color = $eventColors[array_rand($eventColors)];
        
        $events[] = [
            $title,
            $startDate,
            $endDate,
            $startTime,
            $endTime,
            0, // all_day
            $job[0], // client_id
            $index + 1, // job_id
            $job[6], // address
            $job[5], // description
            $eventStatus,
            $color,
            0 // reminder_sent
        ];
    }
}

$sqlOutput .= "-- CALENDAR EVENTS\n";
foreach ($events as $event) {
    $sqlOutput .= sprintf(
        "INSERT INTO calendar_events (title, start_date, end_date, start_time, end_time, all_day, client_id, job_id, address, description, status, color, reminder_sent) VALUES ('%s', '%s', '%s', %s, %s, %d, %s, %s, '%s', '%s', '%s', '%s', %d);\n",
        addslashes($event[0]), $event[1], $event[2],
        $event[3] ? "'" . $event[3] . "'" : 'NULL',
        $event[4] ? "'" . $event[4] . "'" : 'NULL',
        $event[5], 
        $event[6] !== null ? $event[6] : 'NULL', 
        $event[7] !== null ? $event[7] : 'NULL',
        addslashes($event[8]), addslashes($event[9]), 
        addslashes($event[10]), addslashes($event[11]), $event[12]
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
        "INSERT INTO templates (name, category, description, estimated_duration, materials, tasks) VALUES ('%s', '%s', '%s', %d, '%s', '%s');\n",
        addslashes($template[0]), addslashes($template[1]), 
        addslashes($template[2]), $template[3],
        addslashes($template[4]), addslashes($template[5])
    );
}
$sqlOutput .= "\n";

// OFFERS
echo "Δημιουργία SQL για προσφορές...\n";
$offers = [
    [3, 'OFF-2025-001', '2025-11-10', '2025-12-10', '[{"description":"Βαφή γραφείου - 3 χώροι","quantity":60,"unit":"τμ","unitPrice":10.00,"total":600.00},{"description":"Υλικά (χρώματα, ρολά)","quantity":1,"unit":"σετ","unitPrice":120.00,"total":120.00}]', 720.00, 172.80, 0.00, 892.80, 'pending', 'Προσφορά για βαφή γραφείου. Ισχύει για 1 μήνα.'],
    [5, 'OFF-2025-002', '2025-10-15', '2025-11-15', '[{"description":"Βαφή αποθήκης","quantity":180,"unit":"τμ","unitPrice":8.00,"total":1440.00}]', 1440.00, 345.60, 50.00, 1735.60, 'rejected', 'Πελάτης απέρριψε την προσφορά - πολύ υψηλή τιμή κατά τη γνώμη του.'],
    [8, 'OFF-2025-003', '2025-12-01', '2026-01-01', '[{"description":"Βαφή εμπορικού χώρου","quantity":85,"unit":"τμ","unitPrice":12.00,"total":1020.00},{"description":"Ειδικά χρώματα","quantity":1,"unit":"σετ","unitPrice":280.00,"total":280.00}]', 1300.00, 312.00, 65.00, 1547.00, 'accepted', 'Προσφορά εγκρίθηκε. Ξεκινάμε 5 Δεκεμβρίου.']
];

$sqlOutput .= "-- OFFERS\n";
foreach ($offers as $offer) {
    $sqlOutput .= sprintf(
        "INSERT INTO offers (client_id, offer_number, date, valid_until, items, subtotal, tax, discount, total, status, notes) VALUES (%d, '%s', '%s', '%s', '%s', %.2f, %.2f, %.2f, %.2f, '%s', '%s');\n",
        $offer[0], $offer[1], $offer[2], $offer[3],
        addslashes($offer[4]), $offer[5], $offer[6], 
        $offer[7], $offer[8], $offer[9], addslashes($offer[10])
    );
}
$sqlOutput .= "\n";

// SETTINGS
echo "Δημιουργία SQL για ρυθμίσεις...\n";
$settings = [
    ['company_name', 'Οργανωτής Βαφέα Pro', 'Όνομα επιχείρησης'],
    ['company_address', 'Αλεξανδρούπολη', 'Διεύθυνση επιχείρησης'],
    ['company_phone', '6978799299', 'Τηλέφωνο επιχείρησης'],
    ['company_email', 'info@organotis-vafea.gr', 'Email επιχείρησης'],
    ['default_vat', '24', 'Προεπιλεγμένος ΦΠΑ %'],
    ['default_billing_rate', '50', 'Προεπιλεγμένη τιμή ώρας (€)'],
    ['currency', 'EUR', 'Νόμισμα']
];

$sqlOutput .= "-- SETTINGS\n";
foreach ($settings as $setting) {
    $sqlOutput .= sprintf(
        "INSERT INTO settings (setting_key, setting_value, description) VALUES ('%s', '%s', '%s');\n",
        $setting[0], addslashes($setting[1]), addslashes($setting[2])
    );
}
$sqlOutput .= "\n";

// Finalize SQL
$sqlOutput .= "SET FOREIGN_KEY_CHECKS = 1;\n";
$sqlOutput .= "\n-- Τέλος αρχείου\n";

// Save SQL file
$sqlFile = __DIR__ . '/reset_and_import.sql';
file_put_contents($sqlFile, $sqlOutput);

echo "\n✅ Ολοκληρώθηκε!\n";
echo "💾 Δημιουργήθηκε το αρχείο: reset_and_import.sql\n\n";
echo "Στατιστικά:\n";
echo "  • " . count($clients) . " πελάτες\n";
echo "  • " . count($workers) . " εργάτες\n";
echo "  • " . count($materials) . " υλικά\n";
echo "  • " . count($jobs) . " εργασίες (2 την εβδομάδα για 3 χρόνια)\n";
echo "  • " . count($events) . " calendar events\n";
echo "  • " . count($templates) . " templates\n";
echo "  • " . count($offers) . " προσφορές\n";
echo "  • " . count($settings) . " ρυθμίσεις\n";

// Υπολογισμός συνολικών εσόδων
$totalRevenue = 0;
$paidJobs = 0;
foreach ($jobs as $job) {
    if ($job[25] == 1) { // is_paid
        $totalRevenue += $job[24]; // total_cost
        $paidJobs++;
    }
}

echo "\nΟικονομικά Στοιχεία:\n";
echo "  • Σύνολο πληρωμένων εργασιών: " . $paidJobs . "\n";
echo "  • Συνολικά έσοδα: €" . number_format($totalRevenue, 2) . "\n";
echo "  • Μέσος όρος ανά εργασία: €" . number_format($totalRevenue / max($paidJobs, 1), 2) . "\n";

// Save SQL file with UTF-8 encoding
file_put_contents($sqlFile, $sqlOutput, LOCK_EX);
?>
