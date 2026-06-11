<?php
/**
 * Job Payments API - Πληρωμές πελάτη ανά εργασία
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/auth_check.php';
require_once __DIR__ . '/job_visits_schema.php';

checkAuthentication();

logApiRequest('/api/job_payments.php', $_SERVER['REQUEST_METHOD'], $_GET);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

$db = getDBConnection();
ensure_job_visits_schema($db);
$method = $_SERVER['REQUEST_METHOD'];

function job_payment_select_sql() {
    return "
        SELECT
            jp.*,
            j.title AS job_title,
            j.client_id AS client_id,
            c.name AS client_name
        FROM job_payments jp
        INNER JOIN jobs j ON j.id = jp.job_id
        LEFT JOIN clients c ON c.id = j.client_id
    ";
}

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                $stmt = $db->prepare(job_payment_select_sql() . " WHERE jp.id = ?");
                $stmt->execute([$_GET['id']]);
                $payment = $stmt->fetch();
                $payment ? sendSuccess(convertKeys($payment)) : sendError('Η πληρωμή δεν βρέθηκε', 404);
            } elseif (isset($_GET['job_id'])) {
                $stmt = $db->prepare(job_payment_select_sql() . " WHERE jp.job_id = ? ORDER BY jp.payment_date DESC, jp.id DESC");
                $stmt->execute([$_GET['job_id']]);
                sendSuccess(array_map('convertKeys', $stmt->fetchAll()));
            } else {
                $stmt = $db->query(job_payment_select_sql() . " ORDER BY jp.payment_date DESC, jp.id DESC");
                sendSuccess(array_map('convertKeys', $stmt->fetchAll()));
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) sendError('Δεν υπάρχουν δεδομένα');

            $data = convertToSnakeCase($input);
            $jobId = (int)($data['job_id'] ?? 0);
            $amount = (float)($data['amount'] ?? 0);
            if ($jobId <= 0) sendError('Η εργασία είναι υποχρεωτική');
            if ($amount <= 0) sendError('Το ποσό πληρωμής πρέπει να είναι μεγαλύτερο από 0');

            $check = $db->prepare("SELECT id FROM jobs WHERE id = ?");
            $check->execute([$jobId]);
            if (!$check->fetch()) sendError('Η εργασία δεν βρέθηκε', 404);

            $paymentDate = !empty($data['payment_date']) ? $data['payment_date'] : date('Y-m-d');

            $stmt = $db->prepare("
                INSERT INTO job_payments (job_id, payment_date, amount, notes)
                VALUES (:job_id, :payment_date, :amount, :notes)
            ");
            $stmt->execute([
                ':job_id' => $jobId,
                ':payment_date' => $paymentDate,
                ':amount' => $amount,
                ':notes' => $data['notes'] ?? null
            ]);

            $stmt = $db->prepare(job_payment_select_sql() . " WHERE jp.id = ?");
            $stmt->execute([$db->lastInsertId()]);
            sendSuccess(convertKeys($stmt->fetch()), 'Η πληρωμή καταχωρήθηκε επιτυχώς');
            break;

        case 'PUT':
            if (!isset($_GET['id'])) sendError('Το ID είναι υποχρεωτικό');
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) sendError('Δεν υπάρχουν δεδομένα');

            $data = convertToSnakeCase($input);
            $amount = (float)($data['amount'] ?? 0);
            if ($amount <= 0) sendError('Το ποσό πληρωμής πρέπει να είναι μεγαλύτερο από 0');
            $paymentDate = !empty($data['payment_date']) ? $data['payment_date'] : date('Y-m-d');

            $stmt = $db->prepare("
                UPDATE job_payments
                SET payment_date = :payment_date, amount = :amount, notes = :notes
                WHERE id = :id
            ");
            $stmt->execute([
                ':id' => $_GET['id'],
                ':payment_date' => $paymentDate,
                ':amount' => $amount,
                ':notes' => $data['notes'] ?? null
            ]);

            $stmt = $db->prepare(job_payment_select_sql() . " WHERE jp.id = ?");
            $stmt->execute([$_GET['id']]);
            $payment = $stmt->fetch();
            $payment ? sendSuccess(convertKeys($payment), 'Η πληρωμή ενημερώθηκε επιτυχώς') : sendError('Η πληρωμή δεν βρέθηκε', 404);
            break;

        case 'DELETE':
            if (!isset($_GET['id'])) sendError('Το ID είναι υποχρεωτικό');
            $stmt = $db->prepare("DELETE FROM job_payments WHERE id = ?");
            $stmt->execute([$_GET['id']]);
            $stmt->rowCount() > 0 ? sendSuccess(null, 'Η πληρωμή διαγράφηκε') : sendError('Δεν βρέθηκε', 404);
            break;

        default:
            sendError('Μη έγκυρη μέθοδος', 405);
    }
} catch (Exception $e) {
    error_log("Job Payments API Error: " . $e->getMessage());
    sendError('Σφάλμα: ' . $e->getMessage(), 500);
}
?>
