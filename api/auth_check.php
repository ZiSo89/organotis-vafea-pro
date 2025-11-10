<?php
/**
 * Οργανωτής Βαφέα Pro - Auth Helper
 * Έλεγχος authentication για API endpoints
 */

session_start();

function checkAuthentication() {
    $isAuthenticated = false;
    
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
