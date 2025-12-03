<?php
/**
 * Database Connection Test for InfinityFree
 * Upload this file to htdocs and access it via browser
 */

header('Content-Type: application/json; charset=utf-8');

// InfinityFree Database Settings
$host = 'sql207.infinityfree.com';
$dbname = 'if0_40588079_painter_app';
$username = 'if0_40588079';
$password = 'iK3JzTOZ9Mc';

$result = [
    'test' => 'Database Connection Test',
    'timestamp' => date('Y-m-d H:i:s'),
    'connection' => false,
    'tables' => [],
    'errors' => []
];

try {
    // Test connection
    $dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    $result['connection'] = true;
    $result['message'] = 'Successfully connected to database!';
    
    // Get all tables
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $result['tables'] = $tables;
    $result['table_count'] = count($tables);
    
    // Check each table row count
    $result['table_details'] = [];
    foreach ($tables as $table) {
        $countStmt = $pdo->query("SELECT COUNT(*) as count FROM `$table`");
        $count = $countStmt->fetch()['count'];
        $result['table_details'][$table] = $count . ' rows';
    }
    
} catch (PDOException $e) {
    $result['connection'] = false;
    $result['errors'][] = $e->getMessage();
}

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
?>
