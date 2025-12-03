<?php
/**
 * Router for PHP Built-in Server
 * 
 * ΣΗΜΑΝΤΙΚΟ: Ο PHP built-in server ΔΕΝ υποστηρίζει .htaccess!
 * Χρησιμοποίησε: php -S localhost:8000 -t public
 * 
 * Ή αν θες να χρησιμοποιήσεις αυτόν τον router:
 * php -S localhost:8000 router.php
 */

// Get the requested URI
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// API requests - route to API files in root
if (preg_match('#^/api/([a-zA-Z_]+)(\.php)?$#', $uri, $matches)) {
    $apiFile = __DIR__ . '/api/' . $matches[1] . '.php';
    if (file_exists($apiFile)) {
        chdir(__DIR__ . '/api');
        require $apiFile;
        return true;
    }
    http_response_code(404);
    echo json_encode(['error' => 'API endpoint not found']);
    return true;
}

// All other requests - serve from public folder
$filePath = __DIR__ . '/public' . $uri;

// If it's a directory, try index.html
if (is_dir($filePath)) {
    $filePath .= '/index.html';
}

// If file exists, serve it
if (file_exists($filePath) && is_file($filePath)) {
    return false; // Let PHP serve the file
}

// File not found
http_response_code(404);
echo '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>404 - Η σελίδα δεν βρέθηκε</title>
</head>
<body>
    <h1>404 - Η σελίδα δεν βρέθηκε</h1>
    <p>Το αρχείο δεν υπάρχει.</p>
</body>
</html>';
return true;
