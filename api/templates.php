<?php
/**
 * Templates API Endpoint
 * CRUD operations for templates
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
            $id = isset($_GET['id']) ? sanitize($_GET['id']) : null;
            
            if ($id) {
                $stmt = $db->prepare("SELECT * FROM templates WHERE id = ?");
                $stmt->execute([$id]);
                $template = $stmt->fetch();
                
                if ($template) {
                    sendResponse($template);
                } else {
                    sendError('Template not found', 404);
                }
            } else {
                $stmt = $db->query("SELECT * FROM templates ORDER BY created_at DESC");
                $templates = $stmt->fetchAll();
                sendResponse($templates);
            }
            break;
            
        case 'POST':
            $data = getRequestBody();
            
            if (!isset($data['name']) || empty($data['name'])) {
                sendError('Template name is required', 400);
            }
            
            $stmt = $db->prepare("
                INSERT INTO templates (id, name, type, content) 
                VALUES (?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $data['id'] ?? 'TPL-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT),
                sanitize($data['name']),
                sanitize($data['type'] ?? ''),
                sanitize($data['content'] ?? '')
            ]);
            
            sendResponse([
                'success' => true,
                'id' => $data['id'] ?? $db->lastInsertId(),
                'message' => 'Template created successfully'
            ], 201);
            break;
            
        case 'PUT':
            $data = getRequestBody();
            $id = isset($_GET['id']) ? sanitize($_GET['id']) : ($data['id'] ?? null);
            
            if (!$id) {
                sendError('Template ID is required', 400);
            }
            
            $stmt = $db->prepare("
                UPDATE templates 
                SET name = ?, type = ?, content = ?, updated_at = NOW()
                WHERE id = ?
            ");
            
            $stmt->execute([
                sanitize($data['name']),
                sanitize($data['type'] ?? ''),
                sanitize($data['content'] ?? ''),
                $id
            ]);
            
            sendResponse([
                'success' => true,
                'message' => 'Template updated successfully'
            ]);
            break;
            
        case 'DELETE':
            $id = isset($_GET['id']) ? sanitize($_GET['id']) : null;
            
            if (!$id) {
                sendError('Template ID is required', 400);
            }
            
            $stmt = $db->prepare("DELETE FROM templates WHERE id = ?");
            $stmt->execute([$id]);
            
            sendResponse([
                'success' => true,
                'message' => 'Template deleted successfully'
            ]);
            break;
            
        default:
            sendError('Method not allowed', 405);
    }
} catch (PDOException $e) {
    error_log('Database error in templates.php: ' . $e->getMessage());
    sendError('Database error occurred', 500);
} catch (Exception $e) {
    error_log('Error in templates.php: ' . $e->getMessage());
    sendError('An error occurred', 500);
}
?>
