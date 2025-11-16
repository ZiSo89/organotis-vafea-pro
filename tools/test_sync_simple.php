<?php
/**
 * Simple Sync Test - Direct Include
 */

error_reporting(E_ALL);
ini_set('display_errors', '1');

echo "=== Testing Sync Endpoint ===\n\n";

// Simulate POST request
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['CONTENT_TYPE'] = 'application/json';
$_SERVER['HTTP_X_SYNC_API_KEY'] = 'electron-sync-key-2025';

// Test data
$testData = [
    'table' => 'clients',
    'changes' => [
        [
            'id' => 999,
            'name' => 'Test Client - Direct',
            'phone' => '6912345678',
            'email' => 'test@direct.gr',
            'address' => 'Test Address 789',
            'city' => 'Athens',
            'postal_code' => '12345',
            'notes' => 'Test from direct PHP'
        ]
    ]
];

// Prepare input
$input = json_encode($testData);
echo "Input JSON:\n";
echo $input . "\n\n";

// Create a temp stream
$stream = fopen('php://temp', 'r+');
fputs($stream, $input);
rewind($stream);

// Override php://input
stream_wrapper_unregister('php');
stream_wrapper_register('php', 'PHPInputMock');

class PHPInputMock {
    public $position;
    public $content;
    
    function stream_open($path, $mode, $options, &$opened_path) {
        global $input;
        $this->content = $input;
        $this->position = 0;
        return true;
    }
    
    function stream_read($count) {
        $ret = substr($this->content, $this->position, $count);
        $this->position += strlen($ret);
        return $ret;
    }
    
    function stream_eof() {
        return $this->position >= strlen($this->content);
    }
    
    function stream_stat() {
        return [];
    }
}

echo "Executing sync.php...\n\n";
echo "=== OUTPUT ===\n";

// Capture output
ob_start();
include __DIR__ . '/../api/sync.php';
$output = ob_get_clean();

echo $output . "\n";
echo "\n=== END OUTPUT ===\n";

// Try to decode as JSON
$result = json_decode($output, true);
if ($result) {
    echo "\nParsed Result:\n";
    print_r($result);
    
    if (isset($result['success']) && $result['success']) {
        echo "\n✅ SUCCESS\n";
    } else {
        echo "\n❌ FAILED\n";
    }
} else {
    echo "\n❌ Could not parse JSON output\n";
}
?>
