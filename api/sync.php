<?php
/**
 * Sync API Endpoint
 * Receives and processes sync data from Electron app
 */

require_once __DIR__ . '/common.php';
require_once '../config/database.php';
require_once '../config/logger.php';
require_once __DIR__ . '/auth_check.php';
require_once __DIR__ . '/calendar_helpers.php';

checkAuthentication();

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
    logMessage('🔑 Sync API key received', 'DEBUG');
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
            $syncStatus = $change['_sync_status'] ?? null;
            unset($change['id']);
            unset($change['created_at']);
            unset($change['updated_at']);
            unset($change['_sync_status']);
            unset($change['_sync_timestamp']);

            // Διαγραφή από Electron
            if ($syncStatus === 'deleted' && $id) {
                if ($table === 'calendar_events') {
                    $sel = $db->prepare("SELECT job_id, google_event_id FROM calendar_events WHERE id = ?");
                    $sel->execute([$id]);
                    $row = $sel->fetch(PDO::FETCH_ASSOC);
                    if ($row && !empty($row['google_event_id'])) {
                        google_delete_remote_event($row['google_event_id']);
                    }
                    if ($row && !empty($row['job_id'])) {
                        clear_job_visit_after_event_removed($db, $row['job_id']);
                    }
                }
                $db->prepare("DELETE FROM $table WHERE id = ?")->execute([$id]);
                logMessage("🗑️ Deleted record $id from $table", 'INFO');
                $processed++;
                continue;
            }
            
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
                    // Whitelist and sanitize field names to prevent SQL injection
                    $safeKey = preg_replace('/[^a-z0-9_]/i', '', $key);
                    if ($safeKey !== $key) {
                        logMessage("⚠️ Skipping invalid field name: $key", 'WARNING');
                        continue;
                    }
                    // Don't let the Electron client wipe a server-side Google Calendar link
                    if ($table === 'calendar_events' && $safeKey === 'google_event_id'
                        && ($value === null || $value === '')) {
                        continue;
                    }
                    $fields[] = "$safeKey = ?";
                    $values[] = $value;
                }
                $values[] = $id;
                
                // Table name is validated from whitelist above, safe to use
                $sql = "UPDATE $table SET " . implode(', ', $fields) . " WHERE id = ?";
                logMessage("🔄 Executing UPDATE for $table", 'DEBUG', [
                    'id' => $id,
                    'sql' => $sql,
                    'values_count' => count($values)
                ]);
                
                $stmt = $db->prepare($sql);
                $stmt->execute($values);
                
                if ($table === 'calendar_events') {
                    try { sync_event_back_to_job($db, $id); } catch (Exception $e) { /* ignore */ }
                }

                logMessage("✅ Updated record $id in $table", 'INFO');
            } else {
                // Insert new record
                $rawFields = array_keys($change);
                $fields = [];
                $values = [];
                
                // Whitelist and sanitize field names to prevent SQL injection
                foreach ($rawFields as $field) {
                    $safeField = preg_replace('/[^a-z0-9_]/i', '', $field);
                    if ($safeField !== $field) {
                        logMessage("⚠️ Skipping invalid field name: $field", 'WARNING');
                        continue;
                    }
                    $fields[] = $safeField;
                    $values[] = $change[$field];
                }
                
                $placeholders = array_fill(0, count($fields), '?');
                
                // Table name is validated from whitelist above, safe to use
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
