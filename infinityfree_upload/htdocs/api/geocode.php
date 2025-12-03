<?php
/**
 * Nominatim Geocoding Proxy
 * Λύνει το CORS issue καλώντας το Nominatim από server-side
 */

require_once __DIR__ . '/common.php';

// Rate limiting - Max 1 request per second
$tmpDir = __DIR__ . '/../logs';
if (!is_dir($tmpDir)) {
    @mkdir($tmpDir, 0755, true);
}

$rateFile = $tmpDir . '/geocode_rate.txt';
if (file_exists($rateFile)) {
    $lastRequest = (float)file_get_contents($rateFile);
    $timeSinceLastRequest = microtime(true) - $lastRequest;
    
    if ($timeSinceLastRequest < 1.0) {
        // Wait for remaining time
        usleep((int)((1.0 - $timeSinceLastRequest) * 1000000));
    }
}

// Update rate limit timestamp
@file_put_contents($rateFile, microtime(true));

try {
    // Get address from query parameter
    $address = $_GET['address'] ?? '';
    
    if (empty($address)) {
        throw new Exception('Address parameter is required');
    }

    // Build Nominatim URL
    // Note: Using HTTP instead of HTTPS as fallback if OpenSSL not available
    $protocol = (function_exists('curl_init') || extension_loaded('openssl')) ? 'https' : 'http';
    $nominatimUrl = $protocol . '://nominatim.openstreetmap.org/search?' . http_build_query([
        'format' => 'json',
        'q' => $address,
        'limit' => 1,
        'countrycodes' => 'gr',
        'addressdetails' => 1
    ]);

    // Try cURL first (if available), fallback to file_get_contents
    $response = false;
    
    if (function_exists('curl_init')) {
        // Use cURL
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $nominatimUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_USERAGENT => 'Painter-Organizer-App/1.0 (nikolpaintmaster.e-gata.gr)',
            CURLOPT_HTTPHEADER => [
                'Accept: application/json',
                'Accept-Language: el,en'
            ]
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            throw new Exception('cURL Error: ' . $curlError);
        }

        if ($httpCode !== 200) {
            throw new Exception('Nominatim returned HTTP ' . $httpCode);
        }
    } else {
        // Fallback to file_get_contents
        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => [
                    'User-Agent: Painter-Organizer-App/1.0 (nikolpaintmaster.e-gata.gr)',
                    'Accept: application/json',
                    'Accept-Language: el,en'
                ],
                'timeout' => 10,
                'follow_location' => 1
            ]
        ]);
        
        $response = @file_get_contents($nominatimUrl, false, $context);
        
        if ($response === false) {
            throw new Exception('Failed to fetch geocoding data');
        }
    }

    $data = json_decode($response, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON response from Nominatim');
    }

    // Return the response
    echo json_encode([
        'success' => true,
        'data' => $data
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
