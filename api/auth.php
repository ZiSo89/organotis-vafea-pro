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

// Credentials come from env / config/secrets.local.php / default (see config/secrets.php)
require_once __DIR__ . '/../config/secrets.php';
require_once __DIR__ . '/auth_helpers.php';

// Admin password: prefer a bcrypt hash (ADMIN_PASSWORD_HASH) over a plaintext value.
define('ADMIN_PASSWORD_HASH', app_secret('ADMIN_PASSWORD_HASH', ''));
define('ADMIN_PASSWORD', app_secret('ADMIN_PASSWORD', 'admin'));
const SESSION_TIMEOUT = 7200; // 2 hours

/**
 * Verify the supplied password against a hash (preferred) or plaintext fallback.
 */
function verifyAdminPassword($password) {
    if (ADMIN_PASSWORD_HASH !== '') {
        return password_verify($password, ADMIN_PASSWORD_HASH);
    }
    // Constant-time compare for the plaintext fallback
    return hash_equals((string) ADMIN_PASSWORD, (string) $password);
}

// Login
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_GET['action']) && $_GET['action'] === 'login') {
    $input = json_decode(file_get_contents('php://input'), true);
    $password = $input['password'] ?? '';
    $rememberMe = $input['rememberMe'] ?? false;
    
    if (verifyAdminPassword($password)) {
        $_SESSION['authenticated'] = true;
        $_SESSION['login_time'] = time();
        
        // Remember me cookie (30 days)
        if ($rememberMe) {
            $token = bin2hex(random_bytes(32));
            remember_me_store($token);
            // Set cookie with proper parameters for mobile/desktop
            setcookie('remember_token', $token, [
                'expires' => time() + (30 * 24 * 60 * 60),
                'path' => '/',
                'secure' => false, // Set to true if using HTTPS
                'httponly' => true,
                'samesite' => 'Lax'
            ]);
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
    
    // Check session first
    if (isset($_SESSION['authenticated']) && $_SESSION['authenticated'] === true) {
        // Check session timeout
        if (time() - $_SESSION['login_time'] < SESSION_TIMEOUT) {
            $isAuthenticated = true;
            $_SESSION['login_time'] = time(); // Refresh session
        } else {
            // Session expired
            session_destroy();
            session_start();
        }
    }
    
    if (!$isAuthenticated) {
        $isAuthenticated = auth_try_remember_cookie();
    }
    
    echo json_encode([
        'success' => true,
        'authenticated' => $isAuthenticated
    ]);
    exit;
}

// Logout
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_GET['action']) && $_GET['action'] === 'logout') {
    remember_me_clear();
    session_destroy();
    // Clear remember me cookie
    setcookie('remember_token', '', [
        'expires' => time() - 3600,
        'path' => '/',
        'secure' => false,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    
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
