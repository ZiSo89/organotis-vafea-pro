<?php
require_once __DIR__ . "/../config/database.php";
try {
    $db = getDBConnection();
    $stmt = $db->query("SELECT id, name, address, city, postal_code, coordinates, created_at FROM clients ORDER BY id DESC LIMIT 20");
    $rows = $stmt->fetchAll();
    // Helper: multibyte-safe substring (fallback to substr if mbstring not available)
    function mbs($str, $start, $length = null) {
        if (function_exists('mb_substr')) {
            return mb_substr($str, $start, $length, 'UTF-8');
        }
        if ($length === null) return substr($str, $start);
        return substr($str, $start, $length);
    }

    foreach ($rows as $r) {
    // Pretty print coordinates
    $coords = $r['coordinates'];
    if ($coords) {
        $coords = json_decode($coords, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($coords)) {
            $coords = "{" . ($coords['lat'] ?? 'null') . "," . ($coords['lng'] ?? 'null') . "}";
        }
    } else {
        $coords = 'NULL';
    }
    echo sprintf("%3d | %-20s | %-30s | %-15s | %10s | %s\n", $r['id'], mbs($r['name'],0,20), mbs($r['address'],0,30), $r['city'] ?? '', $r['postal_code'] ?? '', $coords);
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    // Dump last PHP error if any
    $err = error_get_last();
    if ($err) {
        echo "Last PHP error: " . ($err['message'] ?? '') . "\n";
    }
    exit(1);
}

?>