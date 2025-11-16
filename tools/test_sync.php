<?php
/**
 * Test Sync Endpoint
 * Δοκιμάζει το sync.php endpoint με sample data
 */

// Test data
$testData = [
    'table' => 'clients',
    'changes' => [
        [
            'id' => 999,
            'name' => 'Test Client - Sync',
            'phone' => '6912345678',
            'email' => 'test@sync.gr',
            'address' => 'Test Address 123',
            'city' => 'Athens',
            'postal_code' => '12345',
            'notes' => 'Test client for sync'
        ]
    ]
];

$url = 'http://localhost/nikolpaintmaster.e-gata.gr/api/sync.php';

echo "🧪 Testing Sync Endpoint\n";
echo "========================\n\n";
echo "📍 URL: $url\n";
echo "📦 Payload:\n";
echo json_encode($testData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n\n";

// Initialize curl
$ch = curl_init($url);

// Set options
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'X-Sync-API-Key: electron-sync-key-2025'
]);

// Execute
echo "📤 Sending request...\n";
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

// Check for errors
if (curl_errno($ch)) {
    echo "❌ cURL Error: " . curl_error($ch) . "\n";
    curl_close($ch);
    exit(1);
}

curl_close($ch);

echo "\n📡 Response:\n";
echo "   HTTP Code: $httpCode\n";
echo "   Body:\n";

// Pretty print JSON response
$json = json_decode($response, true);
if ($json) {
    echo json_encode($json, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
} else {
    echo "   (Raw) " . $response . "\n";
}

echo "\n";

// Check result
if ($httpCode === 200 && isset($json['success']) && $json['success']) {
    echo "✅ Test PASSED\n";
    exit(0);
} else {
    echo "❌ Test FAILED\n";
    exit(1);
}
?>
