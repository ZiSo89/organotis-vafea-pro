<?php
/**
 * Οργανωτής Βαφέα Pro - Auth Helper
 * Έλεγχος authentication για API endpoints
 */

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

$logDir = __DIR__ . '/../logs';
if (!is_dir($logDir)) {
    @mkdir($logDir, 0755, true);
}
ini_set('error_log', $logDir . '/php_errors.log');

session_start();

require_once __DIR__ . '/../config/secrets.php';
require_once __DIR__ . '/auth_helpers.php';

define('SYNC_API_KEY', app_secret('SYNC_API_KEY', 'electron-sync-key-2025'));

function checkAuthentication() {
    $syncKey = $_SERVER['HTTP_X_SYNC_API_KEY'] ?? '';
    if (SYNC_API_KEY !== '' && hash_equals((string) SYNC_API_KEY, (string) $syncKey)) {
        return true;
    }

    $isAuthenticated = false;

    if (isset($_SESSION['authenticated']) && $_SESSION['authenticated'] === true) {
        if (isset($_SESSION['login_time']) && (time() - $_SESSION['login_time'] < 7200)) {
            $isAuthenticated = true;
            $_SESSION['login_time'] = time();
        } else {
            session_destroy();
            session_start();
        }
    }

    if (!$isAuthenticated) {
        $isAuthenticated = auth_try_remember_cookie();
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
