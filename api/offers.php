<?php
/**
 * Generic API Endpoint Template
 * For: offers, invoices, templates, timesheets
 * Copy and customize for each collection
 */

define('API_ACCESS', true);
require_once 'config.php';

setCorsHeaders();
checkAuth();

$db = Database::getInstance()->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

// ⚠️ CHANGE THIS to match your table name
$table = 'offers'; // Change to: invoices, templates, timesheets

try {
    switch($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                $stmt = $db->prepare("SELECT * FROM {$table} WHERE id = ?");
                $stmt->execute([$_GET['id']]);
                $item = $stmt->fetch();
                
                if ($item) {
                    sendResponse($item);
                } else {
                    sendError('Item not found', 404);
                }
            } else {
                $stmt = $db->query("SELECT * FROM {$table} ORDER BY created_at DESC");
                $items = $stmt->fetchAll();
                sendResponse($items);
            }
            break;
            
        case 'POST':
            $data = getRequestBody();
            
            // Build INSERT query dynamically
            $columns = array_keys($data);
            $placeholders = array_fill(0, count($columns), '?');
            
            $sql = "INSERT INTO {$table} (" . implode(', ', $columns) . ") 
                    VALUES (" . implode(', ', $placeholders) . ")";
            
            $stmt = $db->prepare($sql);
            $stmt->execute(array_values($data));
            
            sendResponse([
                'success' => true,
                'id' => $data['id'] ?? $db->lastInsertId(),
                'message' => 'Item created successfully'
            ], 201);
            break;
            
        case 'PUT':
            $data = getRequestBody();
            $id = $_GET['id'] ?? $data['id'] ?? null;
            
            if (!$id) {
                sendError('ID is required', 400);
            }
            
            // Remove id from data for update
            unset($data['id']);
            
            // Build UPDATE query dynamically
            $setParts = [];
            foreach (array_keys($data) as $column) {
                $setParts[] = "{$column} = ?";
            }
            
            $sql = "UPDATE {$table} SET " . implode(', ', $setParts) . ", updated_at = CURRENT_TIMESTAMP WHERE id = ?";
            
            $values = array_values($data);
            $values[] = $id;
            
            $stmt = $db->prepare($sql);
            $stmt->execute($values);
            
            sendResponse([
                'success' => true,
                'message' => 'Item updated successfully'
            ]);
            break;
            
        case 'DELETE':
            $id = $_GET['id'] ?? null;
            
            if (!$id) {
                sendError('ID is required', 400);
            }
            
            $stmt = $db->prepare("DELETE FROM {$table} WHERE id = ?");
            $stmt->execute([$id]);
            
            sendResponse([
                'success' => true,
                'message' => 'Item deleted successfully'
            ]);
            break;
            
        default:
            sendError('Method not allowed', 405);
    }
} catch (PDOException $e) {
    error_log('Database error: ' . $e->getMessage());
    sendError('Database error occurred', 500);
} catch (Exception $e) {
    error_log('Error: ' . $e->getMessage());
    sendError('An error occurred', 500);
}
?>
