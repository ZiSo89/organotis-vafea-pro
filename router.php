<?php
/**
 * Router for PHP Built-in Server
 * Handles API requests correctly
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// API requests - route to correct file
if (strpos($uri, '/api/') === 0) {
    $apiFile = __DIR__ . $uri . '.php';
    
    // Remove .php if already in URI
    if (!file_exists($apiFile)) {
        $apiFile = __DIR__ . $uri;
    }
    
    if (file_exists($apiFile) && is_file($apiFile)) {
        require $apiFile;
        exit;
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found']);
        exit;
    }
}

// Static files
$file = __DIR__ . $uri;

if ($uri !== '/' && file_exists($file) && is_file($file)) {
    return false; // Serve file as-is
}

// Default to index.html
if ($uri === '/' || !file_exists($file)) {
    require __DIR__ . '/index.html';
}
?>
