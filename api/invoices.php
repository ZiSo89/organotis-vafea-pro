<?php
/**
 * Invoices API Endpoint
 * CRUD operations for invoices
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
                $stmt = $db->prepare("SELECT * FROM invoices WHERE id = ?");
                $stmt->execute([$id]);
                $invoice = $stmt->fetch();
                
                if ($invoice) {
                    sendResponse($invoice);
                } else {
                    sendError('Invoice not found', 404);
                }
            } else {
                $stmt = $db->query("SELECT * FROM invoices ORDER BY created_at DESC");
                $invoices = $stmt->fetchAll();
                sendResponse($invoices);
            }
            break;
            
        case 'POST':
            $data = getRequestBody();
            
            $stmt = $db->prepare("
                INSERT INTO invoices (id, job_id, client_id, invoice_number, amount, tax, total, status, issue_date, due_date, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $data['id'] ?? 'INV-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT),
                $data['job_id'] ?? null,
                $data['client_id'] ?? null,
                sanitize($data['invoice_number'] ?? ''),
                $data['amount'] ?? 0,
                $data['tax'] ?? 0,
                $data['total'] ?? 0,
                sanitize($data['status'] ?? 'unpaid'),
                $data['issue_date'] ?? date('Y-m-d'),
                $data['due_date'] ?? null,
                sanitize($data['notes'] ?? '')
            ]);
            
            sendResponse([
                'success' => true,
                'id' => $data['id'] ?? $db->lastInsertId(),
                'message' => 'Invoice created successfully'
            ], 201);
            break;
            
        case 'PUT':
            $data = getRequestBody();
            $id = isset($_GET['id']) ? sanitize($_GET['id']) : ($data['id'] ?? null);
            
            if (!$id) {
                sendError('Invoice ID is required', 400);
            }
            
            $stmt = $db->prepare("
                UPDATE invoices 
                SET job_id = ?, client_id = ?, invoice_number = ?, amount = ?, tax = ?, total = ?, 
                    status = ?, issue_date = ?, due_date = ?, notes = ?, updated_at = NOW()
                WHERE id = ?
            ");
            
            $stmt->execute([
                $data['job_id'] ?? null,
                $data['client_id'] ?? null,
                sanitize($data['invoice_number'] ?? ''),
                $data['amount'] ?? 0,
                $data['tax'] ?? 0,
                $data['total'] ?? 0,
                sanitize($data['status']),
                $data['issue_date'],
                $data['due_date'] ?? null,
                sanitize($data['notes'] ?? ''),
                $id
            ]);
            
            sendResponse([
                'success' => true,
                'message' => 'Invoice updated successfully'
            ]);
            break;
            
        case 'DELETE':
            $id = isset($_GET['id']) ? sanitize($_GET['id']) : null;
            
            if (!$id) {
                sendError('Invoice ID is required', 400);
            }
            
            $stmt = $db->prepare("DELETE FROM invoices WHERE id = ?");
            $stmt->execute([$id]);
            
            sendResponse([
                'success' => true,
                'message' => 'Invoice deleted successfully'
            ]);
            break;
            
        default:
            sendError('Method not allowed', 405);
    }
} catch (PDOException $e) {
    error_log('Database error in invoices.php: ' . $e->getMessage());
    sendError('Database error occurred', 500);
} catch (Exception $e) {
    error_log('Error in invoices.php: ' . $e->getMessage());
    sendError('An error occurred', 500);
}
?>
