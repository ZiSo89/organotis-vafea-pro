<?php
/**
 * Settings API - Ρυθμίσεις Εφαρμογής
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/auth_check.php';
checkAuthentication();

// Log API request
logApiRequest('/api/settings.php', $_SERVER['REQUEST_METHOD'], $_GET);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

$db = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // Check for action parameter (for sync compatibility)
            if (isset($_GET['action']) && $_GET['action'] === 'list') {
                // Return array of settings objects (for sync)
                $stmt = $db->query("SELECT * FROM settings ORDER BY setting_key ASC");
                $settings = $stmt->fetchAll();
                
                $result = [];
                foreach ($settings as $setting) {
                    $converted = convertKeysForSettings($setting);
                    // Don't parse JSON for sync - keep it as string for SQLite storage
                    // The Electron client will handle parsing
                    $result[] = $converted;
                }
                
                sendSuccess($result);
            } elseif (isset($_GET['key'])) {
                // Get specific setting by key
                $stmt = $db->prepare("SELECT * FROM settings WHERE setting_key = ?");
                $stmt->execute([$_GET['key']]);
                $setting = $stmt->fetch();
                
                if ($setting) {
                    $result = convertKeysForSettings($setting);
                    // Parse JSON value if it's a JSON string
                    if ($result['settingValue'] && isJson($result['settingValue'])) {
                        $result['settingValue'] = json_decode($result['settingValue'], true);
                    }
                    sendSuccess($result);
                } else {
                    sendError('Η ρύθμιση δεν βρέθηκε', 404);
                }
            } else {
                // Get all settings as associative array (for web app)
                $stmt = $db->query("SELECT * FROM settings ORDER BY setting_key ASC");
                $settings = $stmt->fetchAll();
                
                // Convert to associative array: key => value
                $result = [];
                foreach ($settings as $setting) {
                    $key = $setting['setting_key'];
                    $value = $setting['setting_value'];
                    
                    // Parse JSON values
                    if ($value && isJson($value)) {
                        $value = json_decode($value, true);
                    }
                    
                    $result[$key] = $value;
                }
                
                sendSuccess($result);
            }
            break;
            
        case 'POST':
        case 'PUT':
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($input['key']) || !isset($input['value'])) {
                sendError('Απαιτείται key και value', 400);
            }
            
            $key = $input['key'];
            $value = $input['value'];
            
            // Convert array/object to JSON string
            if (is_array($value) || is_object($value)) {
                $value = json_encode($value);
            }
            
            // Check if setting exists
            $stmt = $db->prepare("SELECT id FROM settings WHERE setting_key = ?");
            $stmt->execute([$key]);
            $exists = $stmt->fetch();
            
            if ($exists) {
                // Update existing setting
                $stmt = $db->prepare("UPDATE settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = ?");
                $stmt->execute([$value, $key]);
                logInfo("Setting updated: $key");
            } else {
                // Insert new setting
                $stmt = $db->prepare("INSERT INTO settings (setting_key, setting_value, created_at, updated_at) VALUES (?, ?, NOW(), NOW())");
                $stmt->execute([$key, $value]);
                logInfo("Setting created: $key");
            }
            
            sendSuccess([
                'message' => 'Η ρύθμιση αποθηκεύτηκε',
                'key' => $key
            ]);
            break;
            
        case 'DELETE':
            if (!isset($_GET['key'])) {
                sendError('Απαιτείται key', 400);
            }
            
            $key = $_GET['key'];
            $stmt = $db->prepare("DELETE FROM settings WHERE setting_key = ?");
            $stmt->execute([$key]);
            
            logInfo("Setting deleted: $key");
            sendSuccess(['message' => 'Η ρύθμιση διαγράφηκε']);
            break;
            
        default:
            sendError('Μη υποστηριζόμενη μέθοδος', 405);
    }
} catch (Exception $e) {
    logError('Settings API error', ['error' => $e->getMessage()]);
    sendError($e->getMessage(), 500);
}

// Helper functions
function convertKeysForSettings($row) {
    return [
        'id' => $row['id'],
        'settingKey' => $row['setting_key'],
        'settingValue' => $row['setting_value'],
        'createdAt' => $row['created_at'] ?? null,
        'updatedAt' => $row['updated_at'] ?? null
    ];
}

function isJson($string) {
    if (!is_string($string)) return false;
    json_decode($string);
    return (json_last_error() == JSON_ERROR_NONE);
}
