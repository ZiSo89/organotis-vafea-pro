<?php
/**
 * Οργανωτής Βαφέα Pro - Auth Helper
 * Login απενεργοποιημένο — ανοιχτή πρόσβαση στο web UI.
 * Το Electron sync προστατεύεται ξεχωριστά με checkSyncAuthentication().
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
// Auth is disabled — release the session lock immediately so parallel API
// requests (e.g. initial data load) don't block each other on mobile/PWA.
session_write_close();

require_once __DIR__ . '/../config/secrets.php';

define('SYNC_API_KEY', app_secret('SYNC_API_KEY', 'electron-sync-key-2025'));

/**
 * Web UI + κανονικά API endpoints — χωρίς login.
 */
function checkAuthentication() {
    return true;
}

/**
 * Μόνο για api/sync.php — απαιτεί X-Sync-API-Key (Electron).
 */
function checkSyncAuthentication() {
    $syncKey = $_SERVER['HTTP_X_SYNC_API_KEY'] ?? '';

    if (SYNC_API_KEY !== '' && hash_equals((string) SYNC_API_KEY, (string) $syncKey)) {
        return true;
    }

    http_response_code(401);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'error' => 'Μη εξουσιοδοτημένη πρόσβαση (sync API key)'
    ]);
    exit;
}

?>
