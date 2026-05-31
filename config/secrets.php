<?php
/**
 * Οργανωτής Βαφέα Pro - Secret / Credential Loader
 *
 * ΣΗΜΑΝΤΙΚΟ: Σε ΑΥΤΟ το αρχείο ΔΕΝ μπαίνουν ποτέ πραγματικά μυστικά.
 * Οι πραγματικές τιμές ορίζονται (κατά σειρά προτεραιότητας):
 *   1. Environment variables (π.χ. στο Plesk/Apache/hosting panel)
 *   2. config/secrets.local.php  (gitignored - ΔΕΝ ανεβαίνει ποτέ σε commit)
 *   3. Τα defaults που δίνονται από τον κώδικα (τιμές development)
 *
 * Δημιούργησε το config/secrets.local.php αντιγράφοντας το
 * config/secrets.local.example.php και συμπλήρωσε τις πραγματικές τιμές.
 */

if (!function_exists('app_secret')) {
    /**
     * Επιστρέφει το μυστικό/ρύθμιση για το $key.
     *
     * @param string $key     Το κλειδί (π.χ. 'DB_PASS', 'ADMIN_PASSWORD')
     * @param mixed  $default Default τιμή (development) αν δεν βρεθεί αλλού
     * @return mixed
     */
    function app_secret($key, $default = null) {
        static $local = null;

        if ($local === null) {
            $localFile = __DIR__ . '/secrets.local.php';
            $loaded = is_file($localFile) ? include $localFile : [];
            $local = is_array($loaded) ? $loaded : [];
        }

        // 1. Environment variable
        $env = getenv($key);
        if ($env !== false && $env !== '') {
            return $env;
        }

        // 2. Local secrets file
        if (array_key_exists($key, $local)) {
            return $local[$key];
        }

        // 3. Code default (development)
        return $default;
    }
}

if (!function_exists('app_secret_bool')) {
    /**
     * Boolean εκδοχή του app_secret (δέχεται true/false/"1"/"0"/"true"/"false").
     */
    function app_secret_bool($key, $default = false) {
        $value = app_secret($key, $default);
        if (is_bool($value)) {
            return $value;
        }
        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }
}
