<?php
/**
 * Προσθήκη columns στο workers table
 */

$dsn = "mysql:host=localhost;port=3306;dbname=painter_app;charset=utf8mb4";
$pdo = new PDO($dsn, 'root', '', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
]);

echo "Προσθήκη νέων columns στο workers table...\n\n";

try {
    // Προσθήκη status column
    $pdo->exec("ALTER TABLE workers ADD COLUMN status VARCHAR(20) DEFAULT 'active' AFTER daily_rate");
    echo "✅ Προστέθηκε το status column\n";
} catch (PDOException $e) {
    echo "⚠️  status column: " . $e->getMessage() . "\n";
}

try {
    // Προσθήκη hire_date column
    $pdo->exec("ALTER TABLE workers ADD COLUMN hire_date DATE NULL AFTER status");
    echo "✅ Προστέθηκε το hire_date column\n";
} catch (PDOException $e) {
    echo "⚠️  hire_date column: " . $e->getMessage() . "\n";
}

try {
    // Προσθήκη notes column
    $pdo->exec("ALTER TABLE workers ADD COLUMN notes TEXT NULL AFTER hire_date");
    echo "✅ Προστέθηκε το notes column\n";
} catch (PDOException $e) {
    echo "⚠️  notes column: " . $e->getMessage() . "\n";
}

try {
    // Προσθήκη total_hours column
    $pdo->exec("ALTER TABLE workers ADD COLUMN total_hours DECIMAL(10,2) DEFAULT 0.00 AFTER notes");
    echo "✅ Προστέθηκε το total_hours column\n";
} catch (PDOException $e) {
    echo "⚠️  total_hours column: " . $e->getMessage() . "\n";
}

try {
    // Προσθήκη total_earnings column
    $pdo->exec("ALTER TABLE workers ADD COLUMN total_earnings DECIMAL(10,2) DEFAULT 0.00 AFTER total_hours");
    echo "✅ Προστέθηκε το total_earnings column\n";
} catch (PDOException $e) {
    echo "⚠️  total_earnings column: " . $e->getMessage() . "\n";
}

echo "\n📋 Τελική δομή workers table:\n";
echo str_repeat('-', 80) . "\n";

$stmt = $pdo->query('DESCRIBE workers');
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    printf("%-20s %-30s %-20s\n", 
        $row['Field'], 
        $row['Type'], 
        $row['Default'] ?? 'NULL'
    );
}
echo str_repeat('-', 80) . "\n";

echo "\n✅ Ολοκληρώθηκε!\n";
?>
