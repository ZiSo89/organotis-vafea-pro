<?php
/**
 * Invoices API - Τιμολόγια
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/auth_check.php';
checkAuthentication();

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

$db = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                $stmt = $db->prepare("SELECT * FROM invoices WHERE id = ?");
                $stmt->execute([$_GET['id']]);
                $invoice = $stmt->fetch();
                if ($invoice) {
                    $invoice = convertKeys($invoice);
                    $invoice['items'] = json_decode($invoice['items'], true);
                    sendSuccess($invoice);
                } else {
                    sendError('Το τιμολόγιο δεν βρέθηκε', 404);
                }
            } else {
                $stmt = $db->query("
                    SELECT i.*, c.name as client_name, j.title as job_title
                    FROM invoices i 
                    LEFT JOIN clients c ON i.client_id = c.id 
                    LEFT JOIN jobs j ON i.job_id = j.id
                    ORDER BY i.date DESC
                ");
                $invoices = $stmt->fetchAll();
                foreach ($invoices as &$invoice) {
                    $invoice = convertKeys($invoice);
                    $invoice['items'] = json_decode($invoice['items'], true);
                }
                sendSuccess($invoices);
            }
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input || !isset($input['clientId']) || !isset($input['invoiceNumber'])) {
                sendError('Ο πελάτης και ο αριθμός τιμολογίου είναι υποχρεωτικά');
            }
            
            $data = convertToSnakeCase($input);
            $stmt = $db->prepare("
                INSERT INTO invoices (job_id, client_id, invoice_number, date, items,
                                     subtotal, tax, discount, total, is_paid, paid_date, notes)
                VALUES (:job_id, :client_id, :invoice_number, :date, :items,
                       :subtotal, :tax, :discount, :total, :is_paid, :paid_date, :notes)
            ");
            $stmt->execute([
                ':job_id' => $data['job_id'] ?? null,
                ':client_id' => $data['client_id'],
                ':invoice_number' => $data['invoice_number'],
                ':date' => $data['date'] ?? date('Y-m-d'),
                ':items' => json_encode($input['items'] ?? []),
                ':subtotal' => $data['subtotal'] ?? 0,
                ':tax' => $data['tax'] ?? 0,
                ':discount' => $data['discount'] ?? 0,
                ':total' => $data['total'] ?? 0,
                ':is_paid' => $data['is_paid'] ?? 0,
                ':paid_date' => $data['paid_date'] ?? null,
                ':notes' => $data['notes'] ?? null
            ]);
            
            $stmt = $db->prepare("SELECT * FROM invoices WHERE id = ?");
            $stmt->execute([$db->lastInsertId()]);
            $invoice = convertKeys($stmt->fetch());
            $invoice['items'] = json_decode($invoice['items'], true);
            sendSuccess($invoice, 'Το τιμολόγιο δημιουργήθηκε επιτυχώς');
            break;
            
        case 'PUT':
            if (!isset($_GET['id'])) sendError('Το ID είναι υποχρεωτικό');
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) sendError('Δεν υπάρχουν δεδομένα');
            
            $data = convertToSnakeCase($input);
            $stmt = $db->prepare("
                UPDATE invoices 
                SET job_id = :job_id, client_id = :client_id, invoice_number = :invoice_number,
                    date = :date, items = :items, subtotal = :subtotal, tax = :tax,
                    discount = :discount, total = :total, is_paid = :is_paid, 
                    paid_date = :paid_date, notes = :notes
                WHERE id = :id
            ");
            $stmt->execute([
                ':id' => $_GET['id'],
                ':job_id' => $data['job_id'] ?? null,
                ':client_id' => $data['client_id'],
                ':invoice_number' => $data['invoice_number'],
                ':date' => $data['date'],
                ':items' => json_encode($input['items'] ?? []),
                ':subtotal' => $data['subtotal'] ?? 0,
                ':tax' => $data['tax'] ?? 0,
                ':discount' => $data['discount'] ?? 0,
                ':total' => $data['total'] ?? 0,
                ':is_paid' => $data['is_paid'] ?? 0,
                ':paid_date' => $data['paid_date'] ?? null,
                ':notes' => $data['notes'] ?? null
            ]);
            
            if ($stmt->rowCount() === 0) sendError('Το τιμολόγιο δεν βρέθηκε', 404);
            
            $stmt = $db->prepare("SELECT * FROM invoices WHERE id = ?");
            $stmt->execute([$_GET['id']]);
            $invoice = convertKeys($stmt->fetch());
            $invoice['items'] = json_decode($invoice['items'], true);
            sendSuccess($invoice, 'Το τιμολόγιο ενημερώθηκε επιτυχώς');
            break;
            
        case 'DELETE':
            if (!isset($_GET['id'])) sendError('Το ID είναι υποχρεωτικό');
            $stmt = $db->prepare("DELETE FROM invoices WHERE id = ?");
            $stmt->execute([$_GET['id']]);
            $stmt->rowCount() > 0 ? sendSuccess(null, 'Το τιμολόγιο διαγράφηκε') : sendError('Δεν βρέθηκε', 404);
            break;
            
        default:
            sendError('Μη έγκυρη μέθοδος', 405);
    }
} catch (Exception $e) {
    error_log("Invoices API Error: " . $e->getMessage());
    sendError('Σφάλμα: ' . $e->getMessage(), 500);
}
?>
