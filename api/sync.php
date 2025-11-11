<?php
/**
 * Sync API Endpoint
 * Receives and processes sync data from Electron app
 */

require_once '../config/database.php';
header('Content-Type: application/json');

// Enable CORS for local development
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    // Get JSON input
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data || !isset($data['table']) || !isset($data['changes'])) {
        throw new Exception('Invalid request data');
    }
    
    $table = $data['table'];
    $changes = $data['changes'];
    
    // Validate table name (security)
    $allowedTables = [
        'clients', 'jobs', 'workers', 'materials', 
        'job_materials', 'invoices', 'templates', 'offers'
    ];
    
    if (!in_array($table, $allowedTables)) {
        throw new Exception('Invalid table name');
    }
    
    $db = Database::getInstance()->getConnection();
    $processed = 0;
    $errors = [];
    
    // Process each change
    foreach ($changes as $change) {
        try {
            $id = $change['id'] ?? null;
            unset($change['id']);
            unset($change['created_at']);
            unset($change['updated_at']);
            
            if ($id) {
                // Update existing record
                $fields = [];
                $values = [];
                foreach ($change as $key => $value) {
                    $fields[] = "$key = ?";
                    $values[] = $value;
                }
                $values[] = $id;
                
                $sql = "UPDATE $table SET " . implode(', ', $fields) . " WHERE id = ?";
                $stmt = $db->prepare($sql);
                $stmt->execute($values);
            } else {
                // Insert new record
                $fields = array_keys($change);
                $placeholders = array_fill(0, count($fields), '?');
                $values = array_values($change);
                
                $sql = "INSERT INTO $table (" . implode(', ', $fields) . ") 
                        VALUES (" . implode(', ', $placeholders) . ")";
                $stmt = $db->prepare($sql);
                $stmt->execute($values);
            }
            
            $processed++;
        } catch (Exception $e) {
            $errors[] = "Record $id: " . $e->getMessage();
        }
    }
    
    echo json_encode([
        'success' => true,
        'processed' => $processed,
        'errors' => $errors,
        'message' => "Processed $processed records"
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
