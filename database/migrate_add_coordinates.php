<?php
/**
 * Migration Script: Add coordinates column to clients table
 * Date: 2025-11-16
 * 
 * This script adds the coordinates column to the clients table
 * to support geocoding functionality.
 * 
 * Run this ONCE on the production database.
 */

require_once __DIR__ . '/../config/database.php';

try {
    $db = getDBConnection();
    
    echo "🔍 Checking if 'coordinates' column exists in 'clients' table...\n";
    
    // Check if column already exists
    $stmt = $db->query("
        SELECT COUNT(*) as count 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'clients' 
          AND COLUMN_NAME = 'coordinates'
    ");
    
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result['count'] > 0) {
        echo "✅ Column 'coordinates' already exists. No migration needed.\n";
        exit(0);
    }
    
    echo "⚙️  Adding 'coordinates' column to 'clients' table...\n";
    
    // Add the column
    $db->exec("
        ALTER TABLE `clients` 
        ADD COLUMN `coordinates` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL 
        AFTER `notes`
    ");
    
    echo "✅ Successfully added 'coordinates' column!\n";
    
    // Verify the change
    $stmt = $db->query("
        SELECT 
            COLUMN_NAME, 
            DATA_TYPE, 
            CHARACTER_SET_NAME, 
            COLLATION_NAME,
            IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'clients' 
          AND COLUMN_NAME = 'coordinates'
    ");
    
    $column = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($column) {
        echo "\n📋 Column details:\n";
        echo "   - Name: {$column['COLUMN_NAME']}\n";
        echo "   - Type: {$column['DATA_TYPE']}\n";
        echo "   - Charset: {$column['CHARACTER_SET_NAME']}\n";
        echo "   - Collation: {$column['COLLATION_NAME']}\n";
        echo "   - Nullable: {$column['IS_NULLABLE']}\n";
        echo "\n✅ Migration completed successfully!\n";
    } else {
        echo "⚠️  Warning: Column was added but verification failed.\n";
    }
    
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>
