<?php
/**
 * Sync API Endpoint
 * Receives and processes sync data from Electron app
 */

require_once __DIR__ . '/common.php';
require_once '../config/database.php';
require_once '../config/logger.php';

// Enable debug mode for sync
if (!defined('DEBUG_MODE')) {
    define('DEBUG_MODE', true);
}

// Log incoming request
logMessage('📥 Sync request received', 'INFO', [
    'method' => $_SERVER['REQUEST_METHOD'],
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'none',
    'content_length' => $_SERVER['CONTENT_LENGTH'] ?? 'none',
    'api_key' => $_SERVER['HTTP_X_SYNC_API_KEY'] ?? 'none'
]);

// Check API key (optional - for security)
$apiKey = $_SERVER['HTTP_X_SYNC_API_KEY'] ?? null;
if ($apiKey) {
    logMessage('🔑 API Key received: ' . $apiKey, 'DEBUG');
    if ($apiKey !== 'electron-sync-key-2025') {
        logMessage('❌ Invalid API key: ' . $apiKey, 'WARNING');
        // Not blocking for now, just logging
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    logMessage('❌ Invalid method: ' . $_SERVER['REQUEST_METHOD'], 'ERROR');
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    // Get JSON input
    $input = file_get_contents('php://input');
    logMessage('📦 Raw input received', 'DEBUG', [
        'length' => strlen($input),
        'first_100_chars' => substr($input, 0, 100)
    ]);
    
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        logMessage('❌ JSON decode error: ' . json_last_error_msg(), 'ERROR');
        throw new Exception('Invalid JSON: ' . json_last_error_msg());
    }
    
    logMessage('✅ JSON decoded successfully', 'INFO', [
        'has_table' => isset($data['table']),
        'has_changes' => isset($data['changes']),
        'table' => $data['table'] ?? 'none',
        'changes_count' => isset($data['changes']) ? count($data['changes']) : 0
    ]);
    
    if (!$data || !isset($data['table']) || !isset($data['changes'])) {
        logMessage('❌ Invalid request data structure', 'ERROR');
        throw new Exception('Invalid request data');
    }
    
    $table = $data['table'];
    $changes = $data['changes'];
    
    logMessage('📊 Processing sync for table: ' . $table, 'INFO', [
        'changes_count' => count($changes),
        'first_change' => isset($changes[0]) ? $changes[0] : null
    ]);
    
    // Validate table name (security)
    $allowedTables = [
        'clients', 'jobs', 'workers', 'materials', 
        'job_materials', 'invoices', 'templates', 'offers', 'calendar_events', 'settings'
    ];
    
    if (!in_array($table, $allowedTables)) {
        logMessage('❌ Invalid table name: ' . $table, 'ERROR');
        throw new Exception('Invalid table name');
    }
    
    $db = getDBConnection();
    $processed = 0;
    $errors = [];
    
    // Process each change
    foreach ($changes as $index => $change) {
        try {
            logMessage("🔄 Processing record $index for $table", 'DEBUG', [
                'id' => $change['id'] ?? 'new',
                'fields' => array_keys($change)
            ]);
            
            $id = $change['id'] ?? null;
            unset($change['id']);
            unset($change['created_at']);
            unset($change['updated_at']);
            
            // Special handling for settings table
            if ($table === 'settings' && isset($change['setting_key'])) {
                $settingKey = $change['setting_key'];
                $settingValue = $change['setting_value'];
                
                // Check if setting exists
                $stmt = $db->prepare("SELECT id FROM settings WHERE setting_key = ?");
                $stmt->execute([$settingKey]);
                $existingId = $stmt->fetchColumn();
                
                if ($existingId) {
                    // Update existing setting
                    $stmt = $db->prepare("UPDATE settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = ?");
                    $stmt->execute([$settingValue, $settingKey]);
                    logMessage("✅ Updated setting: $settingKey", 'INFO');
                } else {
                    // Insert new setting
                    $stmt = $db->prepare("INSERT INTO settings (setting_key, setting_value, created_at, updated_at) VALUES (?, ?, NOW(), NOW())");
                    $stmt->execute([$settingKey, $settingValue]);
                    logMessage("✅ Inserted new setting: $settingKey", 'INFO');
                }
                
                $processed++;
                continue;
            }
            
            if ($id) {
                // Update existing record
                $fields = [];
                $values = [];
                foreach ($change as $key => $value) {
                    $fields[] = "$key = ?";
                    $values[] = $value;
                }
                $values[] = $id;
                
                $sql = "UPDATE $table SET " . implode(', ', $fields) . " WHERE id = ?";
                logMessage("🔄 Executing UPDATE for $table", 'DEBUG', [
                    'id' => $id,
                    'sql' => $sql,
                    'values_count' => count($values)
                ]);
                
                $stmt = $db->prepare($sql);
                $stmt->execute($values);
                
                logMessage("✅ Updated record $id in $table", 'INFO');
            } else {
                // Insert new record
                $fields = array_keys($change);
                $placeholders = array_fill(0, count($fields), '?');
                $values = array_values($change);
                
                $sql = "INSERT INTO $table (" . implode(', ', $fields) . ") 
                        VALUES (" . implode(', ', $placeholders) . ")";
                logMessage("➕ Executing INSERT for $table", 'DEBUG', [
                    'sql' => $sql,
                    'fields' => $fields,
                    'values_count' => count($values)
                ]);
                
                $stmt = $db->prepare($sql);
                $stmt->execute($values);
                
                $newId = $db->lastInsertId();
                logMessage("✅ Inserted new record in $table with id: $newId", 'INFO');
            }
            
            $processed++;
        } catch (Exception $e) {
            $errorMsg = "Record $id: " . $e->getMessage();
            logMessage("❌ Error processing record: " . $errorMsg, 'ERROR', [
                'exception' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            $errors[] = $errorMsg;
        }
    }
    
    logMessage("✅ Sync completed for $table", 'INFO', [
        'processed' => $processed,
        'errors_count' => count($errors)
    ]);
    
    echo json_encode([
        'success' => true,
        'processed' => $processed,
        'errors' => $errors,
        'message' => "Processed $processed records"
    ]);
    
} catch (Exception $e) {
    logMessage('❌ Sync failed with exception', 'ERROR', [
        'message' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
