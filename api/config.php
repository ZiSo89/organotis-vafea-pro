<?php
/**
 * Database Configuration
 * Οργανωτής Βαφέα Pro - API
 */

// Prevent direct access
defined('API_ACCESS') or define('API_ACCESS', true);

// Database credentials
// ⚠️ UPDATE THESE WITH YOUR ACTUAL DATABASE CREDENTIALS!
define('DB_HOST', 'localhost'); // or localhost:3306
define('DB_NAME', 'painter_app');
define('DB_USER', 'painter_user');
define('DB_PASS', 'A9PLrn$nhtbmu31#');
define('DB_CHARSET', 'utf8mb4');

// Allowed origin for CORS
// Auto-detect: localhost για development, production URL για server
$isLocal = isset($_SERVER['HTTP_HOST']) && (
    strpos($_SERVER['HTTP_HOST'], 'localhost') !== false || 
    strpos($_SERVER['HTTP_HOST'], '127.0.0.1') !== false
);

// Determine the exact origin including port
$origin = 'https://nikolpaintmaster.e-gata.gr'; // Default production
if ($isLocal) {
    // Check if we have an Origin header from the request
    if (isset($_SERVER['HTTP_ORIGIN'])) {
        $origin = $_SERVER['HTTP_ORIGIN'];
    } else {
        $origin = 'http://localhost:8000';
    }
}

define('ALLOWED_ORIGIN', $origin);

// API Authentication (simple token-based)
define('API_KEY', 'your_secret_api_key_here'); // Change this!

// Error reporting
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't display errors in production
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/error.log');

// Timezone
date_default_timezone_set('Europe/Athens');

/**
 * Database Connection
 */
class Database {
    private static $instance = null;
    private $pdo;
    
    private function __construct() {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
            ];
            
            $this->pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            error_log('Database connection failed: ' . $e->getMessage());
            http_response_code(500);
            die(json_encode(['error' => 'Database connection failed']));
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->pdo;
    }
}

/**
 * CORS Headers
 */
function setCorsHeaders() {
    header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Credentials: true');
    header('Content-Type: application/json; charset=utf-8');
    
    // Handle preflight OPTIONS request
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

/**
 * Authentication Check
 */
function checkAuth() {
    // Start session if not already started
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // You can add token validation here
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    
    // Simple validation - you can enhance this
    if (empty($authHeader)) {
        // For development, allow requests without token
        // In production, uncomment this to require authentication:
        // http_response_code(401);
        // die(json_encode(['error' => 'Unauthorized']));
    }
    
    return true;
}

/**
 * Send JSON Response
 */
function sendResponse($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Send Error Response
 */
function sendError($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Get Request Body
 */
function getRequestBody() {
    $input = file_get_contents('php://input');
    return json_decode($input, true);
}

/**
 * Sanitize Input
 */
function sanitize($data) {
    if (is_array($data)) {
        return array_map('sanitize', $data);
    }
    return htmlspecialchars(strip_tags($data), ENT_QUOTES, 'UTF-8');
}
?>
