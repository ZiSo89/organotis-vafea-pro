<?php
/**
 * Οργανωτής Βαφέα Pro - Database Configuration
 * Ρυθμίσεις σύνδεσης με τη MySQL database
 */

// Debug mode - Set to false in production
define('DEBUG_MODE', true);

// Database credentials
define('DB_HOST', 'localhost');
define('DB_PORT', '3306');
define('DB_NAME', 'painter_app');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// Include logger
require_once __DIR__ . '/logger.php';

// Δημιουργία σύνδεσης με τη database
function getDBConnection() {
    static $conn = null;
    
    if ($conn === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
            ];
            
            $conn = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            // Log error (σε production περιβάλλον)
            error_log("Database connection error: " . $e->getMessage());
            
            // Επιστροφή generic error στον client
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Σφάλμα σύνδεσης με τη βάση δεδομένων'
            ]);
            exit;
        }
    }
    
    return $conn;
}

// Helper function για JSON responses
function sendJSON($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// Helper function για errors
function sendError($message, $statusCode = 400) {
    sendJSON([
        'success' => false,
        'error' => $message
    ], $statusCode);
}

// Helper function για success responses
function sendSuccess($data = null, $message = null) {
    $response = ['success' => true];
    if ($message) $response['message'] = $message;
    if ($data !== null) $response['data'] = $data;
    sendJSON($response);
}

// Convert snake_case to camelCase για τα column names
function convertKeys($data) {
    if (!is_array($data)) return $data;
    
    $result = [];
    foreach ($data as $key => $value) {
        // Μετατροπή snake_case σε camelCase
        $newKey = lcfirst(str_replace('_', '', ucwords($key, '_')));
        $result[$newKey] = is_array($value) ? convertKeys($value) : $value;
    }
    return $result;
}

// Convert camelCase to snake_case για τα incoming data
function convertToSnakeCase($data) {
    if (!is_array($data)) return $data;
    
    $result = [];
    foreach ($data as $key => $value) {
        // Μετατροπή camelCase σε snake_case
        $newKey = strtolower(preg_replace('/([a-z])([A-Z])/', '$1_$2', $key));
        $result[$newKey] = is_array($value) ? convertToSnakeCase($value) : $value;
    }
    return $result;
}
?>
