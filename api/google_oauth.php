<?php
/**
 * Οργανωτής Βαφέα Pro - Google OAuth2 endpoint
 *
 * Actions:
 *   ?action=connect     -> redirect στο Google consent (browser navigation)
 *   ?action=callback    -> Google redirect εδώ με ?code, αποθήκευση tokens
 *   ?action=status      -> JSON κατάσταση σύνδεσης (AJAX)
 *   ?action=disconnect  -> διαγραφή tokens (AJAX, POST)
 */

require_once __DIR__ . '/../config/google.php';
require_once __DIR__ . '/auth_check.php'; // starts session

$action = $_GET['action'] ?? '';

/** Επιστρέφει JSON και τερματίζει */
function gjson($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/** Login απενεργοποιημένο — browser navigations επιτρέπονται απευθείας. */
function require_session_or_redirect() {
    return true;
}

try {
    switch ($action) {
        case 'connect':
            require_session_or_redirect();
            if (!google_is_configured()) {
                gjson(['success' => false, 'error' => 'Google OAuth δεν έχει ρυθμιστεί (GOOGLE_CLIENT_ID/SECRET).'], 500);
            }
            // CSRF state δεμένο με το session
            $state = bin2hex(random_bytes(16));
            $_SESSION['google_oauth_state'] = $state;
            header('Location: ' . google_auth_url($state));
            exit;

        case 'callback':
            require_session_or_redirect();

            if (isset($_GET['error'])) {
                header('Location: /?gcal=error#settings');
                exit;
            }

            $code = $_GET['code'] ?? '';
            $state = $_GET['state'] ?? '';
            $expectedState = $_SESSION['google_oauth_state'] ?? '';

            if ($code === '' || $state === '' || !hash_equals($expectedState, $state)) {
                header('Location: /?gcal=error#settings');
                exit;
            }
            unset($_SESSION['google_oauth_state']);

            google_exchange_code($code);

            // ΔΕΝ ορίζουμε primary. Στο 1ο sync δημιουργείται ξεχωριστό
            // ημερολόγιο "Οργανωτής Βαφέα" (google_ensure_app_calendar).

            header('Location: /?gcal=connected#settings');
            exit;

        case 'status':
            checkAuthentication();
            gjson([
                'success' => true,
                'configured' => google_is_configured(),
                'connected' => google_is_connected(),
                'calendarId' => google_calendar_id(),
                'lastSync' => google_meta_get('last_sync'),
            ]);
            break;

        case 'disconnect':
            checkAuthentication();
            // Best-effort revoke
            $tokens = google_get_tokens();
            if ($tokens && !empty($tokens['refresh_token'])) {
                try {
                    google_http('POST', 'https://oauth2.googleapis.com/revoke',
                        ['Content-Type: application/x-www-form-urlencoded'],
                        http_build_query(['token' => $tokens['refresh_token']]));
                } catch (Exception $e) { /* ignore */ }
            }
            google_meta_delete('tokens');
            google_meta_delete('sync_token');
            google_meta_delete('last_sync');
            gjson(['success' => true, 'message' => 'Αποσυνδέθηκε από Google Calendar']);
            break;

        default:
            gjson(['success' => false, 'error' => 'Άγνωστη ενέργεια'], 400);
    }
} catch (Exception $e) {
    error_log('Google OAuth error: ' . $e->getMessage());
    if (in_array($action, ['connect', 'callback'], true)) {
        header('Location: /?gcal=error#settings');
        exit;
    }
    gjson(['success' => false, 'error' => $e->getMessage()], 500);
}
