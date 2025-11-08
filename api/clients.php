<?php
/**
 * Clients API Endpoint
 * CRUD operations for clients
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
            // Get all clients or single client by ID
            $id = isset($_GET['id']) ? sanitize($_GET['id']) : null;
            
            if ($id) {
                $stmt = $db->prepare("SELECT * FROM clients WHERE id = ?");
                $stmt->execute([$id]);
                $client = $stmt->fetch();
                
                if ($client) {
                    sendResponse($client);
                } else {
                    sendError('Client not found', 404);
                }
            } else {
                $stmt = $db->query("SELECT * FROM clients ORDER BY created_at DESC");
                $clients = $stmt->fetchAll();
                sendResponse($clients);
            }
            break;
            
        case 'POST':
            // Create new client
            $data = getRequestBody();
            
            if (!isset($data['name']) || empty($data['name'])) {
                sendError('Client name is required', 400);
            }
            
            $stmt = $db->prepare("
                INSERT INTO clients (id, name, phone, email, address, city, postal, notes, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            
            $stmt->execute([
                $data['id'] ?? 'Π-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT),
                sanitize($data['name']),
                sanitize($data['phone'] ?? ''),
                sanitize($data['email'] ?? ''),
                sanitize($data['address'] ?? ''),
                sanitize($data['city'] ?? ''),
                sanitize($data['postal'] ?? ''),
                sanitize($data['notes'] ?? '')
            ]);
            
            sendResponse([
                'success' => true,
                'id' => $db->lastInsertId(),
                'message' => 'Client created successfully'
            ], 201);
            break;
            
        case 'PUT':
            // Update client
            $data = getRequestBody();
            $id = isset($_GET['id']) ? sanitize($_GET['id']) : ($data['id'] ?? null);
            
            if (!$id) {
                sendError('Client ID is required', 400);
            }
            
            $stmt = $db->prepare("
                UPDATE clients 
                SET name = ?, phone = ?, email = ?, address = ?, city = ?, postal = ?, notes = ?, updated_at = NOW()
                WHERE id = ?
            ");
            
            $stmt->execute([
                sanitize($data['name']),
                sanitize($data['phone'] ?? ''),
                sanitize($data['email'] ?? ''),
                sanitize($data['address'] ?? ''),
                sanitize($data['city'] ?? ''),
                sanitize($data['postal'] ?? ''),
                sanitize($data['notes'] ?? ''),
                $id
            ]);
            
            sendResponse([
                'success' => true,
                'message' => 'Client updated successfully'
            ]);
            break;
            
        case 'DELETE':
            // Delete client
            $id = isset($_GET['id']) ? sanitize($_GET['id']) : null;
            
            if (!$id) {
                sendError('Client ID is required', 400);
            }
            
            $stmt = $db->prepare("DELETE FROM clients WHERE id = ?");
            $stmt->execute([$id]);
            
            sendResponse([
                'success' => true,
                'message' => 'Client deleted successfully'
            ]);
            break;
            
        default:
            sendError('Method not allowed', 405);
    }
} catch (PDOException $e) {
    error_log('Database error in clients.php: ' . $e->getMessage());
    sendError('Database error occurred', 500);
} catch (Exception $e) {
    error_log('Error in clients.php: ' . $e->getMessage());
    sendError('An error occurred', 500);
}
?>
