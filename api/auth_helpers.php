<?php
/**
 * Remember-me token storage (server-side validation).
 * Tokens stored as SHA-256 hash in google_meta — not in cookies alone.
 */

require_once __DIR__ . '/../config/google.php';

const REMEMBER_ME_DAYS = 30;

function remember_me_store($token) {
    google_meta_set('remember_token_hash', hash('sha256', $token));
    google_meta_set('remember_token_expires', (string) (time() + REMEMBER_ME_DAYS * 86400));
}

function remember_me_validate($cookieToken) {
    if (!$cookieToken || !is_string($cookieToken)) {
        return false;
    }
    $hash = google_meta_get('remember_token_hash');
    $expires = (int) google_meta_get('remember_token_expires', 0);
    if (!$hash || $expires < time()) {
        return false;
    }
    return hash_equals($hash, hash('sha256', $cookieToken));
}

function remember_me_clear() {
    google_meta_delete('remember_token_hash');
    google_meta_delete('remember_token_expires');
}

function auth_try_remember_cookie() {
    if (!isset($_COOKIE['remember_token']) || $_COOKIE['remember_token'] === '') {
        return false;
    }
    if (!remember_me_validate($_COOKIE['remember_token'])) {
        remember_me_clear();
        setcookie('remember_token', '', [
            'expires' => time() - 3600,
            'path' => '/',
            'secure' => false,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        return false;
    }
    $_SESSION['authenticated'] = true;
    $_SESSION['login_time'] = time();
    return true;
}
