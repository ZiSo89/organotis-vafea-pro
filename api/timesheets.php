<?php
/**
 * Timesheets API Endpoint
 * CRUD operations for timesheets
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
                $stmt = $db->prepare("SELECT * FROM timesheets WHERE id = ?");
                $stmt->execute([$id]);
                $timesheet = $stmt->fetch();
                
                if ($timesheet) {
                    sendResponse($timesheet);
                } else {
                    sendError('Timesheet not found', 404);
                }
            } else {
                $stmt = $db->query("SELECT * FROM timesheets ORDER BY date DESC");
                $timesheets = $stmt->fetchAll();
                sendResponse($timesheets);
            }
            break;
            
        case 'POST':
            $data = getRequestBody();
            
            $stmt = $db->prepare("
                INSERT INTO timesheets (id, worker_id, job_id, date, hours, notes) 
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $data['id'] ?? 'T-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT),
                $data['worker_id'] ?? null,
                $data['job_id'] ?? null,
                $data['date'] ?? date('Y-m-d'),
                $data['hours'] ?? 0,
                sanitize($data['notes'] ?? '')
            ]);
            
            sendResponse([
                'success' => true,
                'id' => $data['id'] ?? $db->lastInsertId(),
                'message' => 'Timesheet created successfully'
            ], 201);
            break;
            
        case 'PUT':
            $data = getRequestBody();
            $id = isset($_GET['id']) ? sanitize($_GET['id']) : ($data['id'] ?? null);
            
            if (!$id) {
                sendError('Timesheet ID is required', 400);
            }
            
            $stmt = $db->prepare("
                UPDATE timesheets 
                SET worker_id = ?, job_id = ?, date = ?, hours = ?, notes = ?, updated_at = NOW()
                WHERE id = ?
            ");
            
            $stmt->execute([
                $data['worker_id'] ?? null,
                $data['job_id'] ?? null,
                $data['date'],
                $data['hours'],
                sanitize($data['notes'] ?? ''),
                $id
            ]);
            
            sendResponse([
                'success' => true,
                'message' => 'Timesheet updated successfully'
            ]);
            break;
            
        case 'DELETE':
            $id = isset($_GET['id']) ? sanitize($_GET['id']) : null;
            
            if (!$id) {
                sendError('Timesheet ID is required', 400);
            }
            
            $stmt = $db->prepare("DELETE FROM timesheets WHERE id = ?");
            $stmt->execute([$id]);
            
            sendResponse([
                'success' => true,
                'message' => 'Timesheet deleted successfully'
            ]);
            break;
            
        default:
            sendError('Method not allowed', 405);
    }
} catch (PDOException $e) {
    error_log('Database error in timesheets.php: ' . $e->getMessage());
    sendError('Database error occurred', 500);
} catch (Exception $e) {
    error_log('Error in timesheets.php: ' . $e->getMessage());
    sendError('An error occurred', 500);
}
?>
