<?php
/**
 * Οργανωτής Βαφέα Pro - Auth Helper
 * Έλεγχος authentication για API endpoints
 */

// Disable error display to prevent HTML in JSON response
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// Log errors to file
$logDir = __DIR__ . '/../logs';
if (!is_dir($logDir)) {
    @mkdir($logDir, 0755, true);
}
ini_set('error_log', $logDir . '/php_errors.log');

session_start();

// Sync API key for Electron offline sync
const SYNC_API_KEY = 'electron-sync-key-2025';

function checkAuthentication() {
    $isAuthenticated = false;
    
    // Check for sync API key header (for Electron sync)
    $syncKey = $_SERVER['HTTP_X_SYNC_API_KEY'] ?? '';
    if ($syncKey === SYNC_API_KEY) {
        return true;
    }
    
    // Check session first
    if (isset($_SESSION['authenticated']) && $_SESSION['authenticated'] === true) {
        // Check session timeout (2 hours)
        if (isset($_SESSION['login_time']) && (time() - $_SESSION['login_time'] < 7200)) {
            $isAuthenticated = true;
            $_SESSION['login_time'] = time(); // Refresh session
        } else {
            // Session expired
            session_destroy();
            session_start();
        }
    }
    
    // If not authenticated via session, check remember me cookie
    if (!$isAuthenticated && isset($_COOKIE['remember_token']) && !empty($_COOKIE['remember_token'])) {
        // Cookie exists, authenticate automatically
        $_SESSION['authenticated'] = true;
        $_SESSION['login_time'] = time();
        $_SESSION['remember_token'] = $_COOKIE['remember_token'];
        $isAuthenticated = true;
    }
    
    if (!$isAuthenticated) {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'error' => 'Μη εξουσιοδοτημένη πρόσβαση'
        ]);
        exit;
    }
    
    return true;
}
?>
