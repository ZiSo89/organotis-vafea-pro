<?php
/**
 * Οργανωτής Βαφέα Pro - Google Calendar Integration (core helpers)
 *
 * OAuth2 + Google Calendar REST API v3, χωρίς εξωτερικές βιβλιοθήκες (μόνο cURL).
 *
 * Credentials (από env / config/secrets.local.php):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
 *
 * Τα tokens αποθηκεύονται σε ξεχωριστό πίνακα `google_meta` (ΟΧΙ στο settings),
 * ώστε να ΜΗΝ συγχρονίζονται στην Electron/SQLite (ευαίσθητα δεδομένα).
 */

require_once __DIR__ . '/secrets.php';
require_once __DIR__ . '/database.php';

define('GOOGLE_CLIENT_ID', app_secret('GOOGLE_CLIENT_ID', ''));
define('GOOGLE_CLIENT_SECRET', app_secret('GOOGLE_CLIENT_SECRET', ''));
define('GOOGLE_REDIRECT_URI', app_secret('GOOGLE_REDIRECT_URI', 'https://nikolpaintmaster.e-gata.gr/api/google_oauth.php?action=callback'));

// Πλήρες calendar scope: απαιτείται για δημιουργία ξεχωριστού ημερολογίου + CRUD events
define('GOOGLE_SCOPES', 'https://www.googleapis.com/auth/calendar');

/** Έχουν ρυθμιστεί τα OAuth credentials; */
function google_is_configured() {
    return GOOGLE_CLIENT_ID !== '' && GOOGLE_CLIENT_SECRET !== '';
}

/* ========================================
   Token / metadata store (google_meta table)
   ======================================== */

function google_ensure_table() {
    static $done = false;
    if ($done) return;
    $db = getDBConnection();
    $db->exec("
        CREATE TABLE IF NOT EXISTS google_meta (
            meta_key VARCHAR(100) NOT NULL PRIMARY KEY,
            meta_value LONGTEXT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    $done = true;
}

function google_meta_get($key, $default = null) {
    google_ensure_table();
    $db = getDBConnection();
    $stmt = $db->prepare("SELECT meta_value FROM google_meta WHERE meta_key = ?");
    $stmt->execute([$key]);
    $val = $stmt->fetchColumn();
    return $val === false ? $default : $val;
}

function google_meta_set($key, $value) {
    google_ensure_table();
    $db = getDBConnection();
    $stmt = $db->prepare("
        INSERT INTO google_meta (meta_key, meta_value) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)
    ");
    $stmt->execute([$key, $value]);
}

function google_meta_delete($key) {
    google_ensure_table();
    $db = getDBConnection();
    $stmt = $db->prepare("DELETE FROM google_meta WHERE meta_key = ?");
    $stmt->execute([$key]);
}

function google_get_tokens() {
    $raw = google_meta_get('tokens');
    if (!$raw) return null;
    $tokens = json_decode($raw, true);
    return is_array($tokens) ? $tokens : null;
}

function google_save_tokens($tokens) {
    // Preserve refresh_token if Google omits it on a refresh response
    $existing = google_get_tokens() ?: [];
    if (empty($tokens['refresh_token']) && !empty($existing['refresh_token'])) {
        $tokens['refresh_token'] = $existing['refresh_token'];
    }
    if (isset($tokens['expires_in'])) {
        $tokens['expires_at'] = time() + (int) $tokens['expires_in'] - 60; // 60s safety margin
    }
    google_meta_set('tokens', json_encode($tokens));
    return $tokens;
}

function google_is_connected() {
    $tokens = google_get_tokens();
    return $tokens && !empty($tokens['refresh_token']);
}

function google_calendar_id() {
    return google_meta_get('calendar_id', '');
}

define('GOOGLE_APP_CALENDAR_NAME', 'Οργανωτής Βαφέα');

/**
 * Εξασφαλίζει ΞΕΧΩΡΙΣΤΟ ημερολόγιο για την εφαρμογή (όχι το primary).
 * Έτσι ο συγχρονισμός ΔΕΝ αγγίζει ποτέ τα προσωπικά events του χρήστη.
 * Επιστρέφει το calendarId.
 */
function google_ensure_app_calendar() {
    $stored = google_meta_get('calendar_id');
    if ($stored && $stored !== 'primary') {
        return $stored;
    }
    // Ψάξε αν υπάρχει ήδη
    list($status, $json) = google_api('GET', '/users/me/calendarList', ['maxResults' => 250]);
    if ($status === 200 && !empty($json['items'])) {
        foreach ($json['items'] as $cal) {
            if (($cal['summary'] ?? '') === GOOGLE_APP_CALENDAR_NAME) {
                google_meta_set('calendar_id', $cal['id']);
                return $cal['id'];
            }
        }
    }
    // Δημιούργησέ το
    list($s2, $j2) = google_api('POST', '/calendars', [], [
        'summary' => GOOGLE_APP_CALENDAR_NAME,
        'timeZone' => 'Europe/Athens',
    ]);
    if ($s2 === 200 && isset($j2['id'])) {
        google_meta_set('calendar_id', $j2['id']);
        return $j2['id'];
    }
    throw new Exception('Could not create app calendar: HTTP ' . $s2 . ' ' . json_encode($j2));
}

/* ========================================
   HTTP helper (cURL)
   ======================================== */

/**
 * @return array [int $status, mixed $json, string $rawBody]
 */
function google_http($method, $url, $headers = [], $body = null) {
    // Persistent handle -> επαναχρησιμοποιεί τη σύνδεση/TLS (keep-alive) στις πολλές κλήσεις
    static $ch = null;
    if ($ch === null) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
        curl_setopt($ch, CURLOPT_TIMEOUT, 20);
        // Force IPv4 (αποφεύγει κρεμάσματα IPv6 σε Windows/XAMPP)
        curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
        // CA bundle: bundled αν υπάρχει (φορητό local + production)
        $caBundle = __DIR__ . '/cacert.pem';
        if (is_file($caBundle)) {
            curl_setopt($ch, CURLOPT_CAINFO, $caBundle);
        }
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
    }

    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body !== null ? $body : '');

    $raw = curl_exec($ch);
    if ($raw === false) {
        throw new Exception('HTTP error: [' . curl_errno($ch) . '] ' . curl_error($ch));
    }
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $json = json_decode($raw, true);
    return [$status, $json, $raw];
}

/* ========================================
   OAuth token exchange / refresh
   ======================================== */

/** Ανταλλαγή authorization code -> tokens */
function google_exchange_code($code) {
    $params = http_build_query([
        'code' => $code,
        'client_id' => GOOGLE_CLIENT_ID,
        'client_secret' => GOOGLE_CLIENT_SECRET,
        'redirect_uri' => GOOGLE_REDIRECT_URI,
        'grant_type' => 'authorization_code',
    ]);
    list($status, $json) = google_http('POST', 'https://oauth2.googleapis.com/token',
        ['Content-Type: application/x-www-form-urlencoded'], $params);
    if ($status !== 200 || !isset($json['access_token'])) {
        throw new Exception('Token exchange failed: ' . json_encode($json));
    }
    return google_save_tokens($json);
}

/** Ανανέωση access token μέσω refresh_token */
function google_refresh_access_token() {
    $tokens = google_get_tokens();
    if (!$tokens || empty($tokens['refresh_token'])) {
        throw new Exception('Not connected to Google (no refresh token)');
    }
    $params = http_build_query([
        'client_id' => GOOGLE_CLIENT_ID,
        'client_secret' => GOOGLE_CLIENT_SECRET,
        'refresh_token' => $tokens['refresh_token'],
        'grant_type' => 'refresh_token',
    ]);
    list($status, $json) = google_http('POST', 'https://oauth2.googleapis.com/token',
        ['Content-Type: application/x-www-form-urlencoded'], $params);
    if ($status !== 200 || !isset($json['access_token'])) {
        throw new Exception('Token refresh failed: ' . json_encode($json));
    }
    return google_save_tokens($json);
}

/** Επιστρέφει έγκυρο access token (ανανεώνει αν χρειάζεται) */
function google_access_token() {
    $tokens = google_get_tokens();
    if (!$tokens) {
        throw new Exception('Not connected to Google');
    }
    if (empty($tokens['access_token']) || empty($tokens['expires_at']) || time() >= $tokens['expires_at']) {
        $tokens = google_refresh_access_token();
    }
    return $tokens['access_token'];
}

/** Authenticated κλήση στο Google Calendar API */
function google_api($method, $path, $query = [], $payload = null) {
    $token = google_access_token();
    $url = 'https://www.googleapis.com/calendar/v3' . $path;
    if (!empty($query)) {
        $url .= '?' . http_build_query($query);
    }
    $headers = ['Authorization: Bearer ' . $token];
    $body = null;
    if ($payload !== null) {
        $headers[] = 'Content-Type: application/json';
        $body = json_encode($payload, JSON_UNESCAPED_UNICODE);
    }
    return google_http($method, $url, $headers, $body);
}

/* ========================================
   Μεμονωμένο event push/delete (για αυτόματο sync)
   ======================================== */

if (!defined('APP_TZ')) {
    define('APP_TZ', 'Europe/Athens');
}

/** local calendar_events row -> Google event payload */
function local_to_google_event($row) {
    // Τίτλος event = ΟΝΟΜΑ ΠΕΛΑΤΗ (αν υπάρχει), όχι ο τύπος εργασίας
    $clientName = trim($row['client_name'] ?? '');
    $title = $clientName !== '' ? $clientName : ($row['title'] ?: 'Επίσκεψη');

    $dateOnly = substr($row['start_date'], 0, 10);
    $endDateOnly = !empty($row['end_date']) ? substr($row['end_date'], 0, 10) : $dateOnly;

    // Περιγραφή: τηλέφωνο πελάτη + τίτλος εργασίας + τυχόν σημειώσεις
    $descParts = [];
    if (!empty($row['client_phone'])) {
        $descParts[] = '📞 ' . $row['client_phone'];
    }
    if (!empty($row['title']) && $row['title'] !== $clientName) {
        $descParts[] = 'Εργασία: ' . $row['title'];
    }
    if (!empty($row['description'])) {
        $descParts[] = $row['description'];
    }

    $event = [
        'summary' => $title,
        'description' => implode("\n", $descParts),
        'location' => $row['address'] ?: '',
        'extendedProperties' => [
            'private' => ['painterEventId' => (string) $row['id']],
        ],
    ];

    if (!empty($row['all_day'])) {
        // All-day: end.date είναι EXCLUSIVE
        $endExclusive = (new DateTime($endDateOnly))->modify('+1 day')->format('Y-m-d');
        $event['start'] = ['date' => $dateOnly];
        $event['end'] = ['date' => $endExclusive];
    } else {
        $startTime = $row['start_time'] ?: '09:00:00';
        $startDT = $dateOnly . 'T' . substr($startTime, 0, 8);
        if (!empty($row['end_time'])) {
            $endDT = $endDateOnly . 'T' . substr($row['end_time'], 0, 8);
        } else {
            $endDT = (new DateTime($startDT))->modify('+1 hour')->format('Y-m-d\TH:i:s');
        }
        $event['start'] = ['dateTime' => $startDT, 'timeZone' => APP_TZ];
        $event['end'] = ['dateTime' => $endDT, 'timeZone' => APP_TZ];
    }

    return $event;
}

/**
 * Στέλνει ΕΝΑ calendar_events row στο Google (create ή update) και ενημερώνει το google_event_id.
 * Δεν πετάει exception προς τα έξω: επιστρέφει [bool ok, string|null gid, string|null error].
 * Ασφαλές για κλήση μέσα σε CRUD endpoints (δεν μπλοκάρει την κύρια λειτουργία).
 */
function google_push_local_row($db, $row) {
    if (!google_is_configured() || !google_is_connected()) {
        return [false, $row['google_event_id'] ?? null, 'not_connected'];
    }
    try {
        $appCalId = google_ensure_app_calendar();
        if ($appCalId === '' || $appCalId === 'primary') {
            return [false, null, 'invalid_calendar'];
        }
        $calId = rawurlencode($appCalId);
        $payload = local_to_google_event($row);

        if (!empty($row['google_event_id'])) {
            list($status) = google_api('PATCH',
                "/calendars/$calId/events/" . rawurlencode($row['google_event_id']), [], $payload);
            if ($status === 200) {
                return [true, $row['google_event_id'], null];
            }
            if ($status === 404 || $status === 410) {
                // Χάθηκε στο Google -> ξαναδημιούργησε
                list($s2, $j2) = google_api('POST', "/calendars/$calId/events", [], $payload);
                if ($s2 === 200 && isset($j2['id'])) {
                    $u = $db->prepare("UPDATE calendar_events SET google_event_id = ? WHERE id = ?");
                    $u->execute([$j2['id'], $row['id']]);
                    return [true, $j2['id'], null];
                }
                return [false, null, 'recreate HTTP ' . $s2];
            }
            return [false, $row['google_event_id'], 'update HTTP ' . $status];
        }

        // Νέο event
        list($status, $json) = google_api('POST', "/calendars/$calId/events", [], $payload);
        if ($status === 200 && isset($json['id'])) {
            $u = $db->prepare("UPDATE calendar_events SET google_event_id = ? WHERE id = ?");
            $u->execute([$json['id'], $row['id']]);
            return [true, $json['id'], null];
        }
        return [false, null, 'insert HTTP ' . $status];
    } catch (Exception $e) {
        error_log('google_push_local_row: ' . $e->getMessage());
        return [false, null, $e->getMessage()];
    }
}

/** Διαγράφει ΕΝΑ remote Google event (αν υπάρχει). Ασφαλές (δεν πετάει). */
function google_delete_remote_event($googleEventId) {
    if (!$googleEventId || !google_is_configured() || !google_is_connected()) {
        return false;
    }
    try {
        $appCalId = google_ensure_app_calendar();
        if ($appCalId === '' || $appCalId === 'primary') {
            return false;
        }
        $calId = rawurlencode($appCalId);
        list($status) = google_api('DELETE', "/calendars/$calId/events/" . rawurlencode($googleEventId));
        // 200/204 ok, 404/410 ήδη διαγραμμένο
        return in_array($status, [200, 204, 404, 410], true);
    } catch (Exception $e) {
        error_log('google_delete_remote_event: ' . $e->getMessage());
        return false;
    }
}

/** Δημιουργία του OAuth consent URL */
function google_auth_url($state = '') {
    $params = [
        'client_id' => GOOGLE_CLIENT_ID,
        'redirect_uri' => GOOGLE_REDIRECT_URI,
        'response_type' => 'code',
        'scope' => GOOGLE_SCOPES,
        'access_type' => 'offline',
        'prompt' => 'consent',     // εξασφαλίζει refresh_token
        'include_granted_scopes' => 'true',
    ];
    if ($state !== '') {
        $params['state'] = $state;
    }
    return 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query($params);
}
