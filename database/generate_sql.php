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
    ['Κάγκελα/Πέργκολα', ['Βαφή Κέγκελων', 'Βαφή Μπαλκονιών', 'Βαφή Πέργκολας', 'Βαφή Μεταλλικής Πόρτας']],
    ['Επαγγελματικός', ['Βαφή Καταστήματος', 'Βαφή Γραφείου', 'Βαφή Αποθήκης', 'Βαφή Εργοστασίου']],
    ['Κατοικία', ['Βαφή Σπιτιού', 'Βαφή Διαμερίσματος', 'Βαφή Μονοκατοικίας']],
    ['Μικροεπισκευή', ['Διόρθωση Τοίχου', 'Βαφή Πόρτας', 'Βαφή Παραθύρων', 'Επιδιόρθωση Σοβά']],
    ['Άλλο', ['Βαφή Ξύλινων Επίπλων', 'Λακάρισμα Ντουλαπών', 'Βαφή Παρκέ', 'Ειδική Εργασία']]
];

$substrates = ['Γυψοσανίδα', 'Σοβάς', 'Τσιμέντο', 'Μέταλλο', 'Ξύλο'];
$paintBrands = ['Vitex', 'Kraft', 'Dulux', 'Levis', 'MaxMeyer'];
$paintColors = [
    ['Λευκό Ματ', 'WH-001'], ['Μπεζ Ανοιχτό', 'BG-002'], ['Γκρι Ανοιχτό', 'GR-003'],
    ['Γκρι Σκούρο', 'GR-005'], ['Εκρού', 'EC-001'], ['Κρεμ', 'CR-002'],
    ['Μπλε Ανοιχτό', 'BL-001'], ['Πράσινο Ανοιχτό', 'GN-001'], ['Κίτρινο Απαλό', 'YL-001']
];

$statuses = [
    ['Ολοκληρώθηκε', 45],  // 45% πιθανότητα
    ['Εξοφλήθηκε', 25],    // 25% πιθανότητα
    ['Σε εξέλιξη', 10],
    ['Προγραμματισμένη', 10],
    ['Υποψήφιος', 5],
    ['Ακυρώθηκε', 5]
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
        $isPaid = ($status == 'Εξοφλήθηκε') ? 1 : (($status == 'Ολοκληρώθηκε' && rand(1, 100) <= 60) ? 1 : 0);
        
        // Ημερομηνίες
        $dateStr = $jobDate->format('Y-m-d');
        $startDateStr = $dateStr;
        $duration = ceil($billingHours / 8); // ημέρες
        $endDateObj = (clone $jobDate)->modify("+{$duration} days");
        $endDateStr = $endDateObj->format('Y-m-d');
        
        // Επόμενη επίσκεψη - μόνο για ολοκληρωμένες/εξοφλημένες εργασίες
        $nextVisit = null;
        if ($status == 'Ολοκληρώθηκε' || $status == 'Εξοφλήθηκε') {
            // Για πρόσφατες εργασίες (2025), 60% πιθανότητα να έχουν επόμενη επίσκεψη
            // Για παλαιότερες, 30% πιθανότητα
            $probability = (strpos($dateStr, '2025-') === 0) ? 60 : 30;
            
            if (rand(1, 100) <= $probability) {
                // Επόμενη επίσκεψη σε 1-4 μήνες από την ολοκλήρωση
                $daysToAdd = rand(30, 120);
                $nextVisitDate = (clone $endDateObj)->modify("+{$daysToAdd} days");
                
                // Αν η επόμενη επίσκεψη είναι πριν το Νοέμβριο 2025, προσθέτουμε περισσότερες μέρες
                while ($nextVisitDate < new DateTime('2025-11-01')) {
                    $daysToAdd += rand(30, 60);
                    $nextVisitDate = (clone $endDateObj)->modify("+{$daysToAdd} days");
                }
                
                // Περιορίζουμε μέχρι τέλος Ιανουαρίου 2026
                if ($nextVisitDate <= new DateTime('2026-01-31')) {
                    $nextVisit = $nextVisitDate->format('Y-m-d');
                }
            }
        }
        
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
        $notes = ($status == 'Ολοκληρώθηκε' || $status == 'Εξοφλήθηκε') ? $notesTemplates[array_rand($notesTemplates)] : 
                 ($status == 'Σε εξέλιξη' ? 'Εργασία σε εξέλιξη - ' . rand(20, 80) . '% ολοκλήρωση' :
                 ($status == 'Ακυρώθηκε' ? 'Ακυρώθηκε από τον πελάτη' : 
                 ($status == 'Προγραμματισμένη' ? 'Προγραμματισμένη εργασία' : 'Υποψήφια εργασία')));
        
        // Συντεταγμένες (τυχαίες γύρω από Αλεξανδρούπολη)
        $lat = 40.8476 + (rand(-100, 100) / 10000);
        $lng = 25.8759 + (rand(-100, 100) / 10000);
        $coordinates = sprintf('{"lat": %.4f, "lng": %.4f}', $lat, $lng);
        
        $jobs[] = [
            $currentClientId,
            $title,
            $type,
            $dateStr,
            $nextVisit, // next_visit
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
            ($status == 'Ολοκληρώθηκε' || $status == 'Εξοφλήθηκε' || $status == 'Σε εξέλιξη') ? $endDateStr : 'NULL',
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
        $job[21], 
        $job[22] !== 'NULL' ? "'" . $job[22] . "'" : 'NULL',
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
        
        $eventStatus = ($job[23] == 'Ολοκληρώθηκε' || $job[23] == 'Εξοφλήθηκε') ? 'Ολοκληρώθηκε' : 
                      (($job[23] == 'Σε εξέλιξη') ? 'Σε Εξέλιξη' : 
                      (($job[23] == 'Προγραμματισμένη') ? 'Επιβεβαιωμένη' : 'Σε Αναμονή'));
        
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

// Προσθήκη επιπλέον events για Νοέμβριο 2025, Δεκέμβριο 2025 και Ιανουάριο 2026 (από next_visit)
echo "  Προσθήκη events για επόμενες επισκέψεις (Νοέμβριος 2025 - Ιανουάριος 2026)...\n";
foreach ($jobs as $index => $job) {
    // Αν η εργασία έχει επόμενη επίσκεψη το Νοέμβριο, Δεκέμβριο 2025 ή Ιανουάριο 2026
    if ($job[4] !== null && (strpos($job[4], '2025-11-') === 0 || strpos($job[4], '2025-12-') === 0 || strpos($job[4], '2026-01-') === 0)) {
        $clientName = $clients[$job[0] - 1][0];
        $title = 'Επόμ. Επίσκεψη: ' . $clientName . ' - ' . $job[1];
        $startDate = $job[4] . ' 00:00:00';
        $endDate = $job[4] . ' 00:00:00';
        
        $startTime = sprintf('%02d:00:00', rand(9, 11));
        $endTime = sprintf('%02d:00:00', rand(12, 15));
        
        $color = '#f59e0b'; // Πορτοκαλί για επόμενες επισκέψεις
        
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
            'Προγραμματισμένη επίσκεψη παρακολούθησης',
            'Σε Αναμονή',
            $color,
            0 // reminder_sent
        ];
    }
}

// Προσθήκη γενικών events για Νοέμβριο-Δεκέμβριο 2025 και Ιανουάριο 2026
$generalEvents = [
    ['Σύσκεψη Ομάδας', '2025-11-20 09:00:00', '2025-11-20 11:00:00', '09:00:00', '11:00:00', 0, null, null, 'Γραφείο', 'Μηνιαία σύσκεψη ομάδας', 'Επιβεβαιωμένη', '#3b82f6', 0],
    ['Παραγγελία Υλικών', '2025-11-25 10:00:00', '2025-11-25 12:00:00', '10:00:00', '12:00:00', 0, null, null, 'Κατάστημα Χρωμάτων', 'Προμήθεια υλικών για Δεκέμβριο', 'Επιβεβαιωμένη', '#8b5cf6', 0],
    ['Έλεγχος Εξοπλισμού', '2025-11-28 14:00:00', '2025-11-28 16:00:00', '14:00:00', '16:00:00', 0, null, null, 'Αποθήκη', 'Συντήρηση εργαλείων', 'Σε Αναμονή', '#06b6d4', 0],
    ['Σύσκεψη Ομάδας', '2025-12-10 09:00:00', '2025-12-10 11:00:00', '09:00:00', '11:00:00', 0, null, null, 'Γραφείο', 'Μηνιαία σύσκεψη ομάδας', 'Σε Αναμονή', '#3b82f6', 0],
    ['Παραγγελία Υλικών', '2025-12-15 10:00:00', '2025-12-15 12:00:00', '10:00:00', '12:00:00', 0, null, null, 'Κατάστημα Χρωμάτων', 'Προμήθεια υλικών για Χριστούγεννα', 'Σε Αναμονή', '#8b5cf6', 0],
    ['Κλείσιμο για Γιορτές', '2025-12-24 00:00:00', '2025-12-26 23:59:59', null, null, 1, null, null, '', 'Χριστουγεννιάτικες διακοπές', 'Επιβεβαιωμένη', '#ec4899', 0],
    ['Κλείσιμο για Πρωτοχρονιά', '2025-12-31 00:00:00', '2026-01-01 23:59:59', null, null, 1, null, null, '', 'Πρωτοχρονιάτικες διακοπές', 'Επιβεβαιωμένη', '#ec4899', 0],
    ['Απογραφή Αποθήκης', '2026-01-08 10:00:00', '2026-01-08 14:00:00', '10:00:00', '14:00:00', 0, null, null, 'Αποθήκη', 'Ετήσια απογραφή υλικών', 'Σε Αναμονή', '#14b8a6', 0],
    ['Σύσκεψη Ομάδας', '2026-01-15 09:00:00', '2026-01-15 11:00:00', '09:00:00', '11:00:00', 0, null, null, 'Γραφείο', 'Μηνιαία σύσκεψη ομάδας - Στόχοι 2026', 'Σε Αναμονή', '#3b82f6', 0]
];

foreach ($generalEvents as $gEvent) {
    $events[] = $gEvent;
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
    $coords = isset($coordinatesMap[$clientId]) ? $coordinatesMap[$clientId] : null;
    
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
        'status' => $worker[5],
        'hire_date' => $worker[6],
        'notes' => $worker[7],
        'total_hours' => number_format($worker[8], 2, '.', ''),
        'total_earnings' => number_format($worker[9], 2, '.', ''),
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
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s')
    ];
}

// JOBS
$jsonData['tables']['jobs'] = [
    'count' => count($jobs),
    'data' => []
];
foreach ($jobs as $index => $job) {
    $jsonData['tables']['jobs']['data'][] = [
        'id' => $index + 1,
        'client_id' => $job[0],
        'title' => $job[1],
        'type' => $job[2],
        'date' => $job[3],
        'next_visit' => $job[4],
        'description' => $job[5],
        'address' => $job[6],
        'city' => $job[7],
        'postal_code' => $job[8],
        'rooms' => $job[9],
        'area' => number_format($job[10], 2, '.', ''),
        'substrate' => $job[11],
        'materials_cost' => number_format($job[12], 2, '.', ''),
        'kilometers' => number_format($job[13], 2, '.', ''),
        'billing_hours' => number_format($job[14], 2, '.', ''),
        'billing_rate' => number_format($job[15], 2, '.', ''),
        'vat' => number_format($job[16], 2, '.', ''),
        'cost_per_km' => number_format($job[17], 2, '.', ''),
        'notes' => $job[18],
        'assigned_workers' => $job[19],
        'paints' => $job[20],
        'start_date' => $job[21],
        'end_date' => $job[22] !== 'NULL' ? $job[22] : null,
        'status' => $job[23],
        'total_cost' => number_format($job[24], 2, '.', ''),
        'is_paid' => $job[25],
        'coordinates' => $job[26],
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
        'title' => $event[0],
        'start_date' => $event[1],
        'end_date' => $event[2],
        'start_time' => $event[3],
        'end_time' => $event[4],
        'all_day' => $event[5],
        'client_id' => $event[6],
        'job_id' => $event[7],
        'address' => $event[8],
        'description' => $event[9],
        'status' => $event[10],
        'color' => $event[11],
        'reminder_sent' => $event[12],
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

// Empty tables
$jsonData['tables']['job_workers'] = ['count' => 0, 'data' => []];
$jsonData['tables']['job_materials'] = ['count' => 0, 'data' => []];
$jsonData['tables']['timesheets'] = ['count' => 0, 'data' => []];
$jsonData['tables']['invoices'] = ['count' => 0, 'data' => []];

// Save JSON file
$jsonFile = __DIR__ . '/backup_' . date('Y-m-d') . '.json';
$jsonContent = json_encode($jsonData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
file_put_contents($jsonFile, $jsonContent, LOCK_EX);

echo "✅ Δημιουργήθηκε JSON: backup_" . date('Y-m-d') . ".json\n";
echo "  • Clients με συντεταγμένες: " . count($jsonData['tables']['clients']['data']) . "\n";
echo "  • Calendar Events: " . count($jsonData['tables']['calendar_events']['data']) . "\n";
?>

