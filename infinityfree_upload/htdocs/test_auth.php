<?php
/**
 * Auth Test for InfinityFree
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json; charset=utf-8');

$result = [
    'test' => 'Auth System Test',
    'timestamp' => date('Y-m-d H:i:s'),
    'php_version' => PHP_VERSION,
    'session_support' => false,
    'errors' => []
];

// Test session
try {
    session_start();
    $_SESSION['test'] = 'working';
    $result['session_support'] = ($_SESSION['test'] === 'working');
    $result['session_id'] = session_id();
} catch (Exception $e) {
    $result['errors'][] = 'Session error: ' . $e->getMessage();
}

// Test random_bytes (for tokens)
try {
    $token = bin2hex(random_bytes(16));
    $result['random_bytes_support'] = true;
    $result['sample_token'] = $token;
} catch (Exception $e) {
    $result['random_bytes_support'] = false;
    $result['errors'][] = 'Random bytes error: ' . $e->getMessage();
}

// Test cookie setting capability
$result['cookies_enabled'] = !empty($_COOKIE);

// Check if auth.php file exists
$result['auth_file_exists'] = file_exists(__DIR__ . '/api/auth.php');

// Check request info
$result['request_method'] = $_SERVER['REQUEST_METHOD'];
$result['server_software'] = $_SERVER['SERVER_SOFTWARE'] ?? 'unknown';

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
?>
