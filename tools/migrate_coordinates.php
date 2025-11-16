<?php
/**
 * Migrate Coordinates from Cache to Database
 * This script takes coordinates from the frontend geocode cache
 * and updates the database with them
 */

// Disable HTML errors - output JSON only
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Set headers first
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Custom error handler to return JSON
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $errstr,
        'file' => basename($errfile),
        'line' => $errline
    ], JSON_UNESCAPED_UNICODE);
    exit();
});

try {
    // Try to load database config
    $configPath = dirname(__DIR__) . '/config/database.php';
    if (!file_exists($configPath)) {
        throw new Exception('Database config not found at: ' . $configPath);
    }
    
    require_once $configPath;
    
    $db = getDBConnection();
    
    // Get the geocode cache from POST data
    $input = file_get_contents('php://input');
    $geocodeCache = json_decode($input, true);
    
    if (!$geocodeCache || !is_array($geocodeCache)) {
        throw new Exception('No valid geocode cache provided');
    }
    
    $updated = 0;
    $skipped = 0;
    $details = [];
    $mismatches = []; // Track why addresses don't match
    
    // Get all clients
    $stmt = $db->query("SELECT id, name, address, city, postal_code FROM clients");
    $clients = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Log first few clients for debugging
    $sampleClients = array_slice($clients, 0, 3);
    
    foreach ($clients as $client) {
        if (!$client['address'] || !$client['city']) {
            $skipped++;
            continue;
        }
        
        // Build the address key like the frontend does (WITHOUT postal code)
        $address = trim($client['address'] . ', ' . $client['city'] . ',  Greece');
        
        // Try to find a match (case-insensitive and with flexible spacing)
        $found = false;
        $matchedKey = null;
        
        foreach (array_keys($geocodeCache) as $cacheKey) {
            // Normalize both strings for comparison
            $normalizedCache = preg_replace('/\s+/', ' ', strtolower(trim($cacheKey)));
            
            // Normalize address - remove "Λεωφόρος" prefix if present
            $normalizedDbAddr = preg_replace('/^λεωφόρος\s+/iu', '', strtolower(trim($address)));
            $normalizedDbAddr = preg_replace('/\s+/', ' ', $normalizedDbAddr);
            
            if ($normalizedCache === $normalizedDbAddr) {
                $found = true;
                $matchedKey = $cacheKey;
                break;
            }
        }
        
        if ($found && $geocodeCache[$matchedKey] !== 'ZERO_RESULTS') {
            $coords = $geocodeCache[$matchedKey];
            
            // Validate coordinates
            if (!isset($coords['lat']) || !isset($coords['lng'])) {
                $skipped++;
                continue;
            }
            
            // Update the database
            $updateStmt = $db->prepare("
                UPDATE clients 
                SET coordinates = :coords,
                    updated_at = NOW()
                WHERE id = :id
            ");
            
            $coordsJson = json_encode($coords, JSON_UNESCAPED_UNICODE);
            $updateStmt->execute([
                'coords' => $coordsJson,
                'id' => $client['id']
            ]);
            
            $updated++;
            $details[] = [
                'id' => $client['id'],
                'name' => $client['name'],
                'coords' => $coords
            ];
        } else {
            $skipped++;
            // Track first few mismatches for debugging
            if (count($mismatches) < 5) {
                $mismatches[] = [
                    'client' => $client['name'],
                    'expected_address' => $address,
                    'tried_variations' => 'normalized'
                ];
            }
        }
    }
    
    echo json_encode([
        'success' => true,
        'updated' => $updated,
        'skipped' => $skipped,
        'total_clients' => count($clients),
        'cache_entries' => count($geocodeCache),
        'sample' => array_slice($details, 0, 5),
        'sample_clients' => $sampleClients,
        'sample_cache_keys' => array_slice(array_keys($geocodeCache), 0, 5),
        'mismatches' => $mismatches
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_UNESCAPED_UNICODE);
}
