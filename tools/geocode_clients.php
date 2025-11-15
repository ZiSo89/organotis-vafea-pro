<?php
/**
 * Bulk geocode clients CLI
 * Usage: php tools/geocode_clients.php [--delay=seconds] [--limit=N]
 *
 * Connects directly to the database, finds clients with NULL coordinates,
 * queries Nominatim (OpenStreetMap) once per `delay` seconds, and updates the
 * `clients.coordinates` column with JSON {lat,lng} so the app can use them.
 *
 * WARNING: Respect Nominatim usage policy: https://operations.osmfoundation.org/policies/nominatim/
 */

require_once __DIR__ . "/../config/database.php";

$opts = getopt('', ['delay::', 'limit::']);
$delay = isset($opts['delay']) ? floatval($opts['delay']) : 1.0;
$limit = isset($opts['limit']) ? intval($opts['limit']) : 0; // 0 = all

echo "Bulk geocode clients (delay={$delay}s)\n";

$db = getDBConnection();

// Fetch clients without coordinates
$sql = 'SELECT id, address, city, postal_code FROM clients WHERE coordinates IS NULL OR coordinates = ""';
if ($limit > 0) {
    $sql .= ' LIMIT ' . intval($limit);
}

$stmt = $db->query($sql);
$clients = $stmt->fetchAll();

echo "Found " . count($clients) . " clients to geocode.\n";

foreach ($clients as $i => $c) {
    $id = $c['id'];
    $address = trim(($c['address'] ?? '') . ', ' . ($c['city'] ?? '') . ' ' . ($c['postal_code'] ?? '') . ', Greece');
    if (empty(trim($address))) {
        echo "[$i] Client $id: no address, skipping\n";
        continue;
    }

    echo "[$i] Geocoding client $id: $address ... ";

    // Determine protocol: prefer https, but fall back to http if OpenSSL missing
    $protocol = extension_loaded('openssl') ? 'https' : 'http';

    // Build Nominatim URL
    $url = $protocol . '://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=' . urlencode($address) . '&countrycodes=gr';

    // Prepare headers as a single string (more compatible with stream context)
    $headerStr = "User-Agent: Painter-Organizer-App/1.0 (nikolpaintmaster.e-gata.gr)\r\n" .
                 "Accept: application/json\r\n" .
                 "Accept-Language: el,en\r\n";

    $opts = [
        'http' => [
            'method' => 'GET',
            'header' => $headerStr,
            'timeout' => 15,
            'ignore_errors' => true
        ]
    ];

    $response = false;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_USERAGENT, 'Painter-Organizer-App/1.0 (nikolpaintmaster.e-gata.gr)');
        curl_setopt($ch, CURLOPT_TIMEOUT, 15);
        $response = curl_exec($ch);
        $err = curl_error($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($err) {
            echo "cURL error: $err\n";
            // wait and continue
            sleep( (int) max(1, $delay) );
            continue;
        }
        if ($code != 200) {
            echo "HTTP $code from Nominatim\n";
            sleep( (int) max(1, $delay) );
            continue;
        }
    } else {
        $context = stream_context_create($opts);
        // Try file_get_contents; if https fails and openssl not available, try http
        $response = @file_get_contents($url, false, $context);
        if ($response === false) {
            $err = error_get_last();
            $msg = $err['message'] ?? 'Unknown error';
            echo "Request failed: {$msg}\n";

            // If we used https but OpenSSL might be missing or failing, try http once
            if ($protocol === 'https') {
                $altUrl = 'http://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=' . urlencode($address) . '&countrycodes=gr';
                echo "Retrying with http... ";
                $response = @file_get_contents($altUrl, false, $context);
                if ($response === false) {
                    $err2 = error_get_last();
                    $msg2 = $err2['message'] ?? 'Unknown error';
                    echo "failed: {$msg2}\n";
                    sleep( (int) max(1, $delay) );
                    continue;
                } else {
                    echo "ok (http)\n";
                }
            } else {
                sleep( (int) max(1, $delay) );
                continue;
            }
        }
    }

    $data = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        echo "Invalid JSON response\n";
        sleep( (int) max(1, $delay) );
        continue;
    }

    if (empty($data)) {
        echo "No results\n";
        sleep( (int) max(1, $delay) );
        continue;
    }

    $lat = floatval($data[0]['lat']);
    $lng = floatval($data[0]['lon']);

    // Persist to DB
    $coordsJson = json_encode(['lat' => $lat, 'lng' => $lng], JSON_UNESCAPED_UNICODE);
    $update = $db->prepare('UPDATE clients SET coordinates = :coords, updated_at = CURRENT_TIMESTAMP() WHERE id = :id');
    $update->execute([':coords' => $coordsJson, ':id' => $id]);

    echo "OK -> ({$lat}, {$lng}) saved\n";

    // Respect Nominatim policy: at most 1 request per second
    usleep((int)($delay * 1000000));
}

echo "Bulk geocoding finished.\n";

?>