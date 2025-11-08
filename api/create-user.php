<?php
/**
 * Create MySQL User Script
 * Run this once to create the painter_user with proper privileges
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>Create MySQL User</h1>";

define('DB_HOST', 'localhost');
define('ROOT_USER', 'root');
define('ROOT_PASS', ''); // Your root password (empty if none)
define('NEW_USER', 'painter_user');
define('NEW_PASS', 'A9PLrn$nhtbmu31#');
define('DB_NAME', 'painter_app');

try {
    // Connect as root
    echo "<p>Connecting to MySQL as root...</p>";
    $pdo = new PDO("mysql:host=" . DB_HOST, ROOT_USER, ROOT_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "<p style='color:green;'>✓ Connected</p>";
    
    // Create user if not exists
    echo "<p>Creating user '" . NEW_USER . "'...</p>";
    try {
        $pdo->exec("CREATE USER '" . NEW_USER . "'@'localhost' IDENTIFIED BY '" . NEW_PASS . "'");
        echo "<p style='color:green;'>✓ User created</p>";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'already exists') !== false) {
            echo "<p style='color:orange;'>⚠ User already exists, updating password...</p>";
            $pdo->exec("ALTER USER '" . NEW_USER . "'@'localhost' IDENTIFIED BY '" . NEW_PASS . "'");
            echo "<p style='color:green;'>✓ Password updated</p>";
        } else {
            throw $e;
        }
    }
    
    // Grant privileges
    echo "<p>Granting privileges on database '" . DB_NAME . "'...</p>";
    $pdo->exec("GRANT ALL PRIVILEGES ON " . DB_NAME . ".* TO '" . NEW_USER . "'@'localhost'");
    echo "<p style='color:green;'>✓ Privileges granted</p>";
    
    // Flush privileges
    $pdo->exec("FLUSH PRIVILEGES");
    echo "<p style='color:green;'>✓ Privileges flushed</p>";
    
    echo "<h2 style='color:green;'>✅ User setup completed successfully!</h2>";
    echo "<p><strong>Database:</strong> " . DB_NAME . "</p>";
    echo "<p><strong>Username:</strong> " . NEW_USER . "</p>";
    echo "<p><strong>Password:</strong> " . NEW_PASS . "</p>";
    echo "<p><a href='test.php'>Test database connection</a></p>";
    echo "<p><a href='../index.html'>Go to application</a></p>";
    
} catch (PDOException $e) {
    echo "<p style='color:red;'>❌ Error: " . $e->getMessage() . "</p>";
}
?>
