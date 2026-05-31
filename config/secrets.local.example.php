<?php
/**
 * TEMPLATE - Αντίγραψε αυτό το αρχείο σε:  config/secrets.local.php
 * και συμπλήρωσε τις πραγματικές τιμές.
 *
 * Το config/secrets.local.php είναι gitignored και ΔΕΝ πρέπει ΠΟΤΕ να μπει σε commit.
 *
 * Εναλλακτικά, μπορείς να ορίσεις τις ίδιες τιμές ως environment variables
 * στο hosting panel (Plesk / Apache SetEnv), οπότε δεν χρειάζεται αυτό το αρχείο.
 */

return [
    // --- Database ---
    'DB_HOST'        => 'localhost',
    'DB_PORT'        => '3306',
    'DB_NAME'        => 'painter_app',
    'DB_USER'        => 'root',
    'DB_PASS'        => '',

    // --- Authentication ---
    // ΠΡΟΤΙΜΩΜΕΝΟ: bcrypt hash του κωδικού (δημιουργία: npm run admin:hash).
    // Αν οριστεί, αγνοείται το plaintext ADMIN_PASSWORD παρακάτω.
    // 'ADMIN_PASSWORD_HASH' => '$2y$10$....',

    // Fallback plaintext κωδικός. ΑΛΛΑΞΕ τον για production!
    'ADMIN_PASSWORD' => 'admin',

    // Κλειδί συγχρονισμού Electron <-> Server. Πρέπει να είναι ίδιο
    // με αυτό που χρησιμοποιεί η desktop εφαρμογή (electron/db/sync.js).
    'SYNC_API_KEY'   => 'change-me-sync-key',

    // --- Google Calendar sync (προαιρετικό) ---
    // Από Google Cloud Console > APIs & Services > Credentials > OAuth client ID (Web application).
    // Authorized redirect URI: https://<domain>/api/google_oauth.php?action=callback
    // 'GOOGLE_CLIENT_ID'     => 'xxxxxxxx.apps.googleusercontent.com',
    // 'GOOGLE_CLIENT_SECRET' => 'GOCSPX-xxxxxxxx',
    // 'GOOGLE_REDIRECT_URI'  => 'https://nikolpaintmaster.e-gata.gr/api/google_oauth.php?action=callback',

    // --- Misc ---
    // false σε production (κρύβει errors/logs).
    'DEBUG_MODE'     => true,
];
