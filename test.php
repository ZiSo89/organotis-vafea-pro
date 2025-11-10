<?php
/**
 * PHP Test File
 * Ανεβάστε αυτό το αρχείο στο root του server σας
 * και ανοίξτε το στο browser: https://yourdomain.com/test.php
 * 
 * ⚠️ ΔΙΑΓΡΑΨΤΕ το μετά τον έλεγχο για λόγους ασφαλείας!
 */

// Display all info
phpinfo();

// Basic checks
echo "<hr><h2>Basic Checks</h2>";
echo "<p>✅ PHP Version: " . PHP_VERSION . "</p>";
echo "<p>✅ Server Software: " . $_SERVER['SERVER_SOFTWARE'] . "</p>";
echo "<p>✅ Document Root: " . $_SERVER['DOCUMENT_ROOT'] . "</p>";

// Check required extensions
echo "<hr><h2>Required Extensions</h2>";
$required = ['pdo_mysql', 'json', 'mbstring', 'session'];
foreach ($required as $ext) {
    $status = extension_loaded($ext) ? '✅' : '❌';
    echo "<p>$status $ext</p>";
}

// Check database connection
echo "<hr><h2>Database Connection Test</h2>";
try {
    require_once 'config/database.php';
    $db = getDBConnection();
    echo "<p>✅ Database connection successful!</p>";
    echo "<p>Database Name: " . $db->query('SELECT DATABASE()')->fetchColumn() . "</p>";
    echo "<p>MySQL Version: " . $db->query('SELECT VERSION()')->fetchColumn() . "</p>";
    
    // Test a simple query
    $stmt = $db->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "<p>Tables Found: " . count($tables) . "</p>";
    echo "<ul>";
    foreach ($tables as $table) {
        echo "<li>$table</li>";
    }
    echo "</ul>";
} catch (Exception $e) {
    echo "<p>❌ Database connection failed: " . $e->getMessage() . "</p>";
    echo "<p>Check your config/database.php settings!</p>";
}

echo "<hr><p style='color: red;'><strong>⚠️ ΔΙΑΓΡΑΨΤΕ αυτό το αρχείο μετά τον έλεγχο!</strong></p>";
?>
