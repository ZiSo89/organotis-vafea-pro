<?php
/**
 * Workers API Endpoint
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
                $stmt = $db->prepare("SELECT * FROM workers WHERE id = ?");
                $stmt->execute([$_GET['id']]);
                $worker = $stmt->fetch();
                
                if ($worker) {
                    sendResponse($worker);
                } else {
                    sendError('Worker not found', 404);
                }
            } else {
                $stmt = $db->query("SELECT * FROM workers ORDER BY name ASC");
                $workers = $stmt->fetchAll();
                sendResponse($workers);
            }
            break;
            
        case 'POST':
            $data = getRequestBody();
            
            if (empty($data['name'])) {
                sendError('Worker name is required', 400);
            }
            
            $stmt = $db->prepare("
                INSERT INTO workers (id, name, phone, specialty, hourly_rate, status, hire_date, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $data['id'] ?? null,
                $data['name'],
                $data['phone'] ?? null,
                $data['specialty'] ?? null,
                $data['hourly_rate'] ?? 15.00,
                $data['status'] ?? 'active',
                $data['hire_date'] ?? date('Y-m-d'),
                $data['notes'] ?? null
            ]);
            
            sendResponse([
                'success' => true,
                'id' => $data['id'] ?? $db->lastInsertId(),
                'message' => 'Worker created successfully'
            ], 201);
            break;
            
        case 'PUT':
            $data = getRequestBody();
            $id = $_GET['id'] ?? $data['id'] ?? null;
            
            if (!$id) {
                sendError('Worker ID is required', 400);
            }
            
            $stmt = $db->prepare("
                UPDATE workers 
                SET name = ?, phone = ?, specialty = ?, hourly_rate = ?, status = ?, hire_date = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ");
            
            $stmt->execute([
                $data['name'],
                $data['phone'],
                $data['specialty'],
                $data['hourly_rate'],
                $data['status'],
                $data['hire_date'],
                $data['notes'],
                $id
            ]);
            
            sendResponse([
                'success' => true,
                'message' => 'Worker updated successfully'
            ]);
            break;
            
        case 'DELETE':
            $id = $_GET['id'] ?? null;
            
            if (!$id) {
                sendError('Worker ID is required', 400);
            }
            
            $stmt = $db->prepare("DELETE FROM workers WHERE id = ?");
            $stmt->execute([$id]);
            
            sendResponse([
                'success' => true,
                'message' => 'Worker deleted successfully'
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
