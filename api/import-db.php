<?php
/**
 * Database Import Script
 * Run this once to create the database schema
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>Database Import Script</h1>";

// Database credentials
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');

try {
    // Step 1: Connect to MySQL server (without database)
    echo "<p>Step 1: Connecting to MySQL server...</p>";
    $pdo = new PDO("mysql:host=" . DB_HOST, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "<p style='color:green;'>✓ Connected to MySQL server</p>";
    
    // Step 2: Create database
    echo "<p>Step 2: Creating database 'painter_app'...</p>";
    $pdo->exec("CREATE DATABASE IF NOT EXISTS painter_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    echo "<p style='color:green;'>✓ Database created/exists</p>";
    
    // Step 3: Select the database
    echo "<p>Step 3: Selecting database...</p>";
    $pdo->exec("USE painter_app");
    echo "<p style='color:green;'>✓ Database selected</p>";
    
    // Step 4: Read SQL file
    echo "<p>Step 4: Reading SQL file...</p>";
    $sqlFile = __DIR__ . '/../database.sql';
    
    if (!file_exists($sqlFile)) {
        throw new Exception("SQL file not found: $sqlFile");
    }
    
    $sql = file_get_contents($sqlFile);
    echo "<p style='color:green;'>✓ SQL file loaded (" . strlen($sql) . " bytes)</p>";
    
    // Step 5: Execute SQL
    echo "<p>Step 5: Executing SQL statements...</p>";
    
    // Execute the entire SQL file at once
    try {
        $pdo->exec($sql);
        echo "<p style='color:green;'>✓ SQL executed successfully</p>";
    } catch (PDOException $e) {
        // If that fails, try statement by statement
        echo "<p style='color:orange;'>⚠ Trying statement-by-statement execution...</p>";
        
        // Remove comments and split by semicolon
        $sql = preg_replace('/--[^\n]*\n/', '', $sql);
        $statements = explode(';', $sql);
        
        $count = 0;
        $errors = 0;
        foreach ($statements as $statement) {
            $statement = trim($statement);
            if (!empty($statement)) {
                try {
                    $pdo->exec($statement);
                    $count++;
                } catch (PDOException $stmtError) {
                    $errors++;
                    echo "<p style='color:red;'>Error in statement: " . substr($statement, 0, 50) . "... - " . $stmtError->getMessage() . "</p>";
                }
            }
        }
        
        echo "<p style='color:green;'>✓ Executed $count statements ($errors errors)</p>";
    }
    
    // Step 6: Verify tables
    echo "<p>Step 6: Verifying tables...</p>";
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo "<p style='color:green;'>✓ Found " . count($tables) . " tables:</p>";
    echo "<ul>";
    foreach ($tables as $table) {
        echo "<li>$table</li>";
    }
    echo "</ul>";
    
    echo "<h2 style='color:green;'>✅ Database import completed successfully!</h2>";
    echo "<p><a href='test.php'>Test database connection</a></p>";
    echo "<p><a href='../index.html'>Go to application</a></p>";
    
} catch (PDOException $e) {
    echo "<p style='color:red;'>❌ Database Error: " . $e->getMessage() . "</p>";
} catch (Exception $e) {
    echo "<p style='color:red;'>❌ Error: " . $e->getMessage() . "</p>";
}
?>
