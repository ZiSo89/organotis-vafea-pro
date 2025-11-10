<?php
/**
 * Οργανωτής Βαφέα Pro - Authentication API
 * Login, logout και session management
 */

session_start();
header('Content-Type: application/json; charset=utf-8');

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Hardcoded password
const ADMIN_PASSWORD = 'admin';
const SESSION_TIMEOUT = 7200; // 2 hours

// Login
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_GET['action']) && $_GET['action'] === 'login') {
    $input = json_decode(file_get_contents('php://input'), true);
    $password = $input['password'] ?? '';
    $remember = $input['remember'] ?? false;
    
    if ($password === ADMIN_PASSWORD) {
        $_SESSION['authenticated'] = true;
        $_SESSION['login_time'] = time();
        
        // Remember me cookie (30 days)
        if ($remember) {
            $token = bin2hex(random_bytes(32));
            $_SESSION['remember_token'] = $token;
            setcookie('remember_token', $token, time() + (30 * 24 * 60 * 60), '/');
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Επιτυχής σύνδεση'
        ]);
    } else {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Λάθος κωδικός πρόσβασης'
        ]);
    }
    exit;
}

// Check authentication status
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'check') {
    $isAuthenticated = false;
    
    // Check session
    if (isset($_SESSION['authenticated']) && $_SESSION['authenticated'] === true) {
        // Check session timeout
        if (time() - $_SESSION['login_time'] < SESSION_TIMEOUT) {
            $isAuthenticated = true;
            $_SESSION['login_time'] = time(); // Refresh session
        } else {
            // Session expired
            session_destroy();
        }
    }
    
    // Check remember me cookie
    if (!$isAuthenticated && isset($_COOKIE['remember_token']) && !empty($_COOKIE['remember_token'])) {
        if (isset($_SESSION['remember_token']) && $_SESSION['remember_token'] === $_COOKIE['remember_token']) {
            $_SESSION['authenticated'] = true;
            $_SESSION['login_time'] = time();
            $isAuthenticated = true;
        }
    }
    
    echo json_encode([
        'success' => true,
        'authenticated' => $isAuthenticated
    ]);
    exit;
}

// Logout
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_GET['action']) && $_GET['action'] === 'logout') {
    session_destroy();
    setcookie('remember_token', '', time() - 3600, '/');
    
    echo json_encode([
        'success' => true,
        'message' => 'Αποσυνδεθήκατε επιτυχώς'
    ]);
    exit;
}

// Invalid request
http_response_code(400);
echo json_encode([
    'success' => false,
    'error' => 'Μη έγκυρο αίτημα'
]);
?>
