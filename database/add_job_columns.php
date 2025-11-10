<?php
/**
 * Προσθήκη missing columns στο jobs table
 */

$dsn = "mysql:host=localhost;port=3306;dbname=painter_app;charset=utf8mb4";
$pdo = new PDO($dsn, 'root', '', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
]);

echo "Προσθήκη νέων columns στο jobs table...\n\n";

try {
    $pdo->exec("ALTER TABLE jobs ADD COLUMN type VARCHAR(100) NULL AFTER title");
    echo "✅ Προστέθηκε το type column\n";
} catch (PDOException $e) {
    echo "⚠️  type column: " . $e->getMessage() . "\n";
}

try {
    $pdo->exec("ALTER TABLE jobs ADD COLUMN date DATE NULL AFTER type");
    echo "✅ Προστέθηκε το date column\n";
} catch (PDOException $e) {
    echo "⚠️  date column: " . $e->getMessage() . "\n";
}

try {
    $pdo->exec("ALTER TABLE jobs ADD COLUMN next_visit DATE NULL AFTER date");
    echo "✅ Προστέθηκε το next_visit column\n";
} catch (PDOException $e) {
    echo "⚠️  next_visit column: " . $e->getMessage() . "\n";
}

try {
    $pdo->exec("ALTER TABLE jobs ADD COLUMN rooms INT NULL AFTER next_visit");
    echo "✅ Προστέθηκε το rooms column\n";
} catch (PDOException $e) {
    echo "⚠️  rooms column: " . $e->getMessage() . "\n";
}

try {
    $pdo->exec("ALTER TABLE jobs ADD COLUMN area DECIMAL(10,2) NULL AFTER rooms");
    echo "✅ Προστέθηκε το area column\n";
} catch (PDOException $e) {
    echo "⚠️  area column: " . $e->getMessage() . "\n";
}

try {
    $pdo->exec("ALTER TABLE jobs ADD COLUMN substrate VARCHAR(255) NULL AFTER area");
    echo "✅ Προστέθηκε το substrate column\n";
} catch (PDOException $e) {
    echo "⚠️  substrate column: " . $e->getMessage() . "\n";
}

try {
    $pdo->exec("ALTER TABLE jobs ADD COLUMN materials_cost DECIMAL(10,2) DEFAULT 0 AFTER substrate");
    echo "✅ Προστέθηκε το materials_cost column\n";
} catch (PDOException $e) {
    echo "⚠️  materials_cost column: " . $e->getMessage() . "\n";
}

try {
    $pdo->exec("ALTER TABLE jobs ADD COLUMN kilometers DECIMAL(10,2) DEFAULT 0 AFTER materials_cost");
    echo "✅ Προστέθηκε το kilometers column\n";
} catch (PDOException $e) {
    echo "⚠️  kilometers column: " . $e->getMessage() . "\n";
}

try {
    $pdo->exec("ALTER TABLE jobs ADD COLUMN billing_hours DECIMAL(10,2) DEFAULT 0 AFTER kilometers");
    echo "✅ Προστέθηκε το billing_hours column\n";
} catch (PDOException $e) {
    echo "⚠️  billing_hours column: " . $e->getMessage() . "\n";
}

try {
    $pdo->exec("ALTER TABLE jobs ADD COLUMN billing_rate DECIMAL(10,2) DEFAULT 50 AFTER billing_hours");
    echo "✅ Προστέθηκε το billing_rate column\n";
} catch (PDOException $e) {
    echo "⚠️  billing_rate column: " . $e->getMessage() . "\n";
}

try {
    $pdo->exec("ALTER TABLE jobs ADD COLUMN vat DECIMAL(5,2) DEFAULT 24 AFTER billing_rate");
    echo "✅ Προστέθηκε το vat column\n";
} catch (PDOException $e) {
    echo "⚠️  vat column: " . $e->getMessage() . "\n";
}

try {
    $pdo->exec("ALTER TABLE jobs ADD COLUMN cost_per_km DECIMAL(5,2) DEFAULT 0.5 AFTER vat");
    echo "✅ Προστέθηκε το cost_per_km column\n";
} catch (PDOException $e) {
    echo "⚠️  cost_per_km column: " . $e->getMessage() . "\n";
}

try {
    $pdo->exec("ALTER TABLE jobs ADD COLUMN notes TEXT NULL AFTER cost_per_km");
    echo "✅ Προστέθηκε το notes column\n";
} catch (PDOException $e) {
    echo "⚠️  notes column: " . $e->getMessage() . "\n";
}

try {
    $pdo->exec("ALTER TABLE jobs ADD COLUMN assigned_workers JSON NULL AFTER notes");
    echo "✅ Προστέθηκε το assigned_workers column\n";
} catch (PDOException $e) {
    echo "⚠️  assigned_workers column: " . $e->getMessage() . "\n";
}

try {
    $pdo->exec("ALTER TABLE jobs ADD COLUMN paints JSON NULL AFTER assigned_workers");
    echo "✅ Προστέθηκε το paints column\n";
} catch (PDOException $e) {
    echo "⚠️  paints column: " . $e->getMessage() . "\n";
}

echo "\n📋 Τελική δομή jobs table:\n";
echo str_repeat('-', 80) . "\n";

$stmt = $pdo->query('DESCRIBE jobs');
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    printf("%-25s %-30s %-20s\n", 
        $row['Field'], 
        $row['Type'], 
        $row['Default'] ?? 'NULL'
    );
}
echo str_repeat('-', 80) . "\n";

echo "\n✅ Ολοκληρώθηκε!\n";
?>
