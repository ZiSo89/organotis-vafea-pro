<?php
// Simple test script
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "Testing PHP and Database Connection...\n\n";

// Test 1: PHP version
echo "PHP Version: " . phpversion() . "\n";

// Test 2: PDO available
echo "PDO Available: " . (extension_loaded('pdo') ? 'YES' : 'NO') . "\n";
echo "PDO MySQL Available: " . (extension_loaded('pdo_mysql') ? 'YES' : 'NO') . "\n";

// Test 3: Database connection
define('DB_HOST', 'localhost');
define('DB_NAME', 'painter_app');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
    $pdo = new PDO($dsn, DB_USER, DB_PASS);
    echo "\nDatabase Connection: SUCCESS\n";
    
    // Test query
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM clients");
    $result = $stmt->fetch();
    echo "Clients in database: " . $result['count'] . "\n";
    
} catch (PDOException $e) {
    echo "\nDatabase Connection: FAILED\n";
    echo "Error: " . $e->getMessage() . "\n";
}
?>
