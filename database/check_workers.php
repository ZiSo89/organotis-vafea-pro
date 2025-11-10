<?php
$db = new PDO('mysql:host=localhost;dbname=painter_app;charset=utf8mb4', 'root', '');
$stmt = $db->query('DESCRIBE workers');

echo "Workers table structure:\n";
echo str_repeat('-', 80) . "\n";
printf("%-20s %-30s %-20s\n", "Field", "Type", "Default");
echo str_repeat('-', 80) . "\n";

while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    printf("%-20s %-30s %-20s\n", 
        $row['Field'], 
        $row['Type'], 
        $row['Default'] ?? 'NULL'
    );
}
echo str_repeat('-', 80) . "\n";
