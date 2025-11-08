<?php
/**
 * Ping Endpoint - Server Status Check
 */

define('API_ACCESS', true);
require_once 'config.php';

setCorsHeaders();

// Simple ping response
sendResponse([
    'status' => 'ok',
    'timestamp' => time(),
    'datetime' => date('Y-m-d H:i:s'),
    'version' => '1.0',
    'message' => 'Server is online and ready'
]);
?>
