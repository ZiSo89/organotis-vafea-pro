<?php
/**
 * Geocode all clients and save coordinates to database
 * Run this ONCE to populate coordinates for existing clients
 */

require_once __DIR__ . '/../config/database.php';

// Nominatim API settings
define('NOMINATIM_URL', 'https://nominatim.openstreetmap.org/search');
define('DELAY_MS', 1500); // 1.5 seconds to be safe with rate limits

function geocodeAddress($address) {
    // URL encode properly for Greek characters
    $url = NOMINATIM_URL . '?' . http_build_query([
        'q' => $address,
        'format' => 'json',
        'limit' => 1,
        'addressdetails' => 1
    ], '', '&', PHP_QUERY_RFC3986);
    
    $opts = [
        'http' => [
            'method' => 'GET',
            'header' => "User-Agent: PainterApp/1.0\r\n" .
                       "Accept-Language: el,en\r\n" .
                       "Accept-Charset: UTF-8\r\n",
            'timeout' => 10
        ]
    ];
    
    $context = stream_context_create($opts);
    $response = @file_get_contents($url, false, $context);
    
    if (!$response) {
        return null;
    }
    
    $data = json_decode($response, true);
    
    if (!empty($data) && isset($data[0]['lat']) && isset($data[0]['lon'])) {
        return [
            'lat' => floatval($data[0]['lat']),
            'lng' => floatval($data[0]['lon'])
        ];
    }
    
    return null;
}

try {
    $db = getDBConnection();
    
    // Get all clients without coordinates
    $stmt = $db->query("
        SELECT id, name, address, city, postal_code, coordinates 
        FROM clients 
        WHERE address IS NOT NULL 
        AND city IS NOT NULL
        ORDER BY id
    ");
    
    $clients = $stmt->fetchAll();
    $total = count($clients);
    $updated = 0;
    $skipped = 0;
    $failed = 0;
    
    echo "Found $total clients\n";
    echo "Starting geocoding process...\n\n";
    
    foreach ($clients as $i => $client) {
        $num = $i + 1;
        echo "[$num/$total] {$client['name']} - ";
        
        // Skip if already has coordinates
        if ($client['coordinates']) {
            echo "Already has coordinates ✓\n";
            $skipped++;
            continue;
        }
        
        // Build address
        $address = trim("{$client['address']}, {$client['city']}, {$client['postal_code']} Greece");
        echo "$address ... ";
        
        // Geocode
        $coords = geocodeAddress($address);
        
        if ($coords) {
            // Save to database
            $stmt = $db->prepare("
                UPDATE clients 
                SET coordinates = :coords 
                WHERE id = :id
            ");
            
            $stmt->execute([
                ':coords' => json_encode($coords),
                ':id' => $client['id']
            ]);
            
            echo "✅ ({$coords['lat']}, {$coords['lng']})\n";
            $updated++;
        } else {
            echo "❌ Not found\n";
            $failed++;
        }
        
        // Respect rate limit
        usleep(DELAY_MS * 1000);
    }
    
    echo "\n";
    echo "═══════════════════════════════════════\n";
    echo "Summary:\n";
    echo "  Total:    $total\n";
    echo "  Updated:  $updated ✅\n";
    echo "  Skipped:  $skipped ⏭️\n";
    echo "  Failed:   $failed ❌\n";
    echo "═══════════════════════════════════════\n";
    
} catch (Exception $e) {
    echo "\n❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>
