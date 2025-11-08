<?php
/**
 * Inventory API Endpoint
 * Οργανωτής Βαφέα Pro - CRUD Operations
 */

define('API_ACCESS', true);
require_once 'config.php';

setCorsHeaders();
checkAuth();

$db = Database::getInstance()->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                $stmt = $db->prepare("SELECT * FROM inventory WHERE id = ?");
                $stmt->execute([$_GET['id']]);
                $item = $stmt->fetch();
                
                if ($item) {
                    sendResponse($item);
                } else {
                    sendError('Item not found', 404);
                }
            } else {
                $stmt = $db->query("SELECT * FROM inventory ORDER BY name ASC");
                $items = $stmt->fetchAll();
                sendResponse($items);
            }
            break;
            
        case 'POST':
            $data = getRequestBody();
            
            if (empty($data['name'])) {
                sendError('Item name is required', 400);
            }
            
            $stmt = $db->prepare("
                INSERT INTO inventory (brand, line, name, code, finish, size, quantity, cost, min_stock, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $data['brand'] ?? null,
                $data['line'] ?? null,
                $data['name'],
                $data['code'] ?? null,
                $data['finish'] ?? null,
                $data['size'] ?? 0,
                $data['quantity'] ?? 0,
                $data['cost'] ?? 0,
                $data['min_stock'] ?? 0,
                $data['notes'] ?? null
            ]);
            
            sendResponse([
                'success' => true,
                'id' => $db->lastInsertId(),
                'message' => 'Item created successfully'
            ], 201);
            break;
            
        case 'PUT':
            $data = getRequestBody();
            $id = $_GET['id'] ?? $data['id'] ?? null;
            
            if (!$id) {
                sendError('Item ID is required', 400);
            }
            
            $stmt = $db->prepare("
                UPDATE inventory 
                SET brand = ?, line = ?, name = ?, code = ?, finish = ?, size = ?, quantity = ?, cost = ?, min_stock = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ");
            
            $stmt->execute([
                $data['brand'],
                $data['line'],
                $data['name'],
                $data['code'],
                $data['finish'],
                $data['size'],
                $data['quantity'],
                $data['cost'],
                $data['min_stock'],
                $data['notes'],
                $id
            ]);
            
            sendResponse([
                'success' => true,
                'message' => 'Item updated successfully'
            ]);
            break;
            
        case 'DELETE':
            $id = $_GET['id'] ?? null;
            
            if (!$id) {
                sendError('Item ID is required', 400);
            }
            
            $stmt = $db->prepare("DELETE FROM inventory WHERE id = ?");
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
