<?php
// CLI test script to create a client via the API
// Usage: php tools/test_create_client.php [url]
// Example: php tools/test_create_client.php "http://localhost/nikolpaintmaster.e-gata.gr/api/clients.php?action=create"

$url = $argv[1] ?? 'http://localhost/nikolpaintmaster.e-gata.gr/api/clients.php?action=create';

$payload = [
    'name' => 'Test Client ' . time(),
    'phone' => '6970000000',
    'email' => 'test@example.com',
    'address' => 'Οδός Δοκιμής 5',
    'city' => 'Αλεξανδρούπολη',
    'postalCode' => '68100',
    'notes' => 'Δοκιμή δημιουργίας πελάτη',
    'coordinates' => [
        'lat' => 40.8473,
        'lng' => 25.8753
    ]
];

$json = json_encode($payload, JSON_UNESCAPED_UNICODE);

if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Content-Length: ' . strlen($json),
        'X-SYNC-API-KEY: electron-sync-key-2025'
    ]);

    $response = curl_exec($ch);
    $err = curl_error($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($err) {
        echo "cURL Error: $err\n";
        exit(1);
    }

    echo "HTTP Status: $code\n";
    echo "Response:\n" . $response . "\n";
} else {
    // Fallback to file_get_contents for environments without cURL
    $opts = [
        'http' => [
            'method'  => 'POST',
            'header'  => "Content-Type: application/json\r\nContent-Length: " . strlen($json) . "\r\nX-SYNC-API-KEY: electron-sync-key-2025\r\n",
            'content' => $json,
            'timeout' => 10
        ]
    ];
    $context  = stream_context_create($opts);
    $response = @file_get_contents($url, false, $context);

    $httpCode = 0;
    if (!empty($http_response_header)) {
        // Parse HTTP status from response headers
        foreach ($http_response_header as $hdr) {
            if (preg_match('#HTTP/\d+\.\d+\s+(\d+)#', $hdr, $m)) {
                $httpCode = intval($m[1]);
                break;
            }
        }
    }

    if ($response === false) {
        echo "Request failed (no cURL). HTTP Status: $httpCode\n";
        exit(1);
    }

    echo "HTTP Status: $httpCode\n";
    echo "Response:\n" . $response . "\n";
}

?>