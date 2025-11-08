<?php
/**
 * Jobs API Endpoint
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
                $stmt = $db->prepare("SELECT * FROM jobs WHERE id = ?");
                $stmt->execute([$_GET['id']]);
                $job = $stmt->fetch();
                
                if ($job) {
                    // Decode JSON fields
                    $job['paints'] = json_decode($job['paints'], true);
                    $job['assigned_workers'] = json_decode($job['assigned_workers'], true);
                    sendResponse($job);
                } else {
                    sendError('Job not found', 404);
                }
            } else {
                $stmt = $db->query("SELECT * FROM jobs ORDER BY created_at DESC");
                $jobs = $stmt->fetchAll();
                
                // Decode JSON fields for each job
                foreach ($jobs as &$job) {
                    $job['paints'] = json_decode($job['paints'], true);
                    $job['assigned_workers'] = json_decode($job['assigned_workers'], true);
                }
                
                sendResponse($jobs);
            }
            break;
            
        case 'POST':
            $data = getRequestBody();
            
            if (empty($data['title'])) {
                sendError('Title is required', 400);
            }
            
            $stmt = $db->prepare("
                INSERT INTO jobs (
                    id, client_id, title, description, location, start_date, end_date,
                    status, total_cost, paints, assigned_workers, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $data['id'] ?? 'J-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT),
                $data['client_id'] ?? null,
                sanitize($data['title']),
                sanitize($data['description'] ?? ''),
                sanitize($data['location'] ?? ''),
                $data['start_date'] ?? null,
                $data['end_date'] ?? null,
                sanitize($data['status'] ?? 'pending'),
                $data['total_cost'] ?? 0,
                json_encode($data['paints'] ?? []),
                json_encode($data['assigned_workers'] ?? []),
                sanitize($data['notes'] ?? '')
            ]);
            
            sendResponse([
                'success' => true,
                'id' => $data['id'] ?? $db->lastInsertId(),
                'message' => 'Job created successfully'
            ], 201);
            break;
            
        case 'PUT':
            $data = getRequestBody();
            $id = $_GET['id'] ?? $data['id'] ?? null;
            
            if (!$id) {
                sendError('Job ID is required', 400);
            }
            
            $stmt = $db->prepare("
                UPDATE jobs SET
                    client_id = ?, title = ?, description = ?, location = ?, start_date = ?, end_date = ?,
                    status = ?, total_cost = ?, paints = ?, assigned_workers = ?, notes = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ");
            
            $stmt->execute([
                $data['client_id'] ?? null,
                sanitize($data['title']),
                sanitize($data['description'] ?? ''),
                sanitize($data['location'] ?? ''),
                $data['start_date'] ?? null,
                $data['end_date'] ?? null,
                sanitize($data['status']),
                $data['total_cost'] ?? 0,
                json_encode($data['paints'] ?? []),
                json_encode($data['assigned_workers'] ?? []),
                sanitize($data['notes'] ?? ''),
                $id
            ]);
            
            sendResponse([
                'success' => true,
                'message' => 'Job updated successfully'
            ]);
            break;
            
        case 'DELETE':
            $id = $_GET['id'] ?? null;
            
            if (!$id) {
                sendError('Job ID is required', 400);
            }
            
            $stmt = $db->prepare("DELETE FROM jobs WHERE id = ?");
            $stmt->execute([$id]);
            
            sendResponse([
                'success' => true,
                'message' => 'Job deleted successfully'
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
