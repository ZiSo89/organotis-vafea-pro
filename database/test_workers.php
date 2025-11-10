<?php
$db = new PDO('mysql:host=localhost;dbname=painter_app;charset=utf8mb4', 'root', '');
$stmt = $db->query('SELECT * FROM workers');

echo "Εργάτες στη βάση:\n";
echo str_repeat('=', 100) . "\n";

while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "ID: {$row['id']}\n";
    echo "Όνομα: {$row['name']}\n";
    echo "Ειδικότητα: {$row['specialty']}\n";
    echo "Status: {$row['status']}\n";
    echo "Hire Date: {$row['hire_date']}\n";
    echo "Notes: " . ($row['notes'] ?? '(χωρίς σημειώσεις)') . "\n";
    echo str_repeat('-', 100) . "\n";
}
?>
