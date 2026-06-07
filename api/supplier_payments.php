<?php
/**
 * Supplier Payments API - Πληρωμές προς καταστήματα
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/auth_check.php';
require_once __DIR__ . '/warehouse_schema.php';

checkAuthentication();

logApiRequest('/api/supplier_payments.php', $_SERVER['REQUEST_METHOD'], $_GET);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

$db = getDBConnection();
ensure_warehouse_schema($db);
$method = $_SERVER['REQUEST_METHOD'];

function payment_select_sql() {
    return "
        SELECT
            sp.*,
            s.name AS supplier_name,
            mp.reference_number AS purchase_reference,
            mp.purchase_date AS purchase_date
        FROM supplier_payments sp
        INNER JOIN suppliers s ON s.id = sp.supplier_id
        LEFT JOIN material_purchases mp ON mp.id = sp.purchase_id
    ";
}

function normalize_payment_purchase_id($db, $supplierId, $purchaseId) {
    if ($purchaseId === null || $purchaseId === '' || (int)$purchaseId === 0) return null;
    $stmt = $db->prepare("SELECT id FROM material_purchases WHERE id = ? AND supplier_id = ?");
    $stmt->execute([$purchaseId, $supplierId]);
    if (!$stmt->fetch()) {
        sendError('Η αγορά δεν ανήκει στο επιλεγμένο κατάστημα', 400);
    }
    return (int)$purchaseId;
}

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                $stmt = $db->prepare(payment_select_sql() . " WHERE sp.id = ?");
                $stmt->execute([$_GET['id']]);
                $payment = $stmt->fetch();
                $payment ? sendSuccess(convertKeys($payment)) : sendError('Η πληρωμή δεν βρέθηκε', 404);
            } elseif (isset($_GET['supplier_id'])) {
                $stmt = $db->prepare(payment_select_sql() . " WHERE sp.supplier_id = ? ORDER BY sp.payment_date DESC, sp.id DESC");
                $stmt->execute([$_GET['supplier_id']]);
                sendSuccess(array_map('convertKeys', $stmt->fetchAll()));
            } else {
                $stmt = $db->query(payment_select_sql() . " ORDER BY sp.payment_date DESC, sp.id DESC");
                sendSuccess(array_map('convertKeys', $stmt->fetchAll()));
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) sendError('Δεν υπάρχουν δεδομένα');

            $data = convertToSnakeCase($input);
            $supplierId = (int)($data['supplier_id'] ?? 0);
            $amount = warehouse_to_float($data['amount'] ?? 0);
            if ($supplierId <= 0) sendError('Το κατάστημα είναι υποχρεωτικό');
            if ($amount <= 0) sendError('Το ποσό πληρωμής πρέπει να είναι μεγαλύτερο από 0');

            $purchaseId = normalize_payment_purchase_id($db, $supplierId, $data['purchase_id'] ?? null);
            $paymentDate = !empty($data['payment_date']) ? $data['payment_date'] : date('Y-m-d');

            $stmt = $db->prepare("
                INSERT INTO supplier_payments (supplier_id, purchase_id, payment_date, amount, payment_method, notes)
                VALUES (:supplier_id, :purchase_id, :payment_date, :amount, :payment_method, :notes)
            ");
            $stmt->execute([
                ':supplier_id' => $supplierId,
                ':purchase_id' => $purchaseId,
                ':payment_date' => $paymentDate,
                ':amount' => $amount,
                ':payment_method' => $data['payment_method'] ?? null,
                ':notes' => $data['notes'] ?? null
            ]);

            $stmt = $db->prepare(payment_select_sql() . " WHERE sp.id = ?");
            $stmt->execute([$db->lastInsertId()]);
            sendSuccess(convertKeys($stmt->fetch()), 'Η πληρωμή καταχωρήθηκε επιτυχώς');
            break;

        case 'PUT':
            if (!isset($_GET['id'])) sendError('Το ID είναι υποχρεωτικό');
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) sendError('Δεν υπάρχουν δεδομένα');

            $data = convertToSnakeCase($input);
            $supplierId = (int)($data['supplier_id'] ?? 0);
            $amount = warehouse_to_float($data['amount'] ?? 0);
            if ($supplierId <= 0) sendError('Το κατάστημα είναι υποχρεωτικό');
            if ($amount <= 0) sendError('Το ποσό πληρωμής πρέπει να είναι μεγαλύτερο από 0');

            $purchaseId = normalize_payment_purchase_id($db, $supplierId, $data['purchase_id'] ?? null);
            $paymentDate = !empty($data['payment_date']) ? $data['payment_date'] : date('Y-m-d');

            $stmt = $db->prepare("
                UPDATE supplier_payments
                SET supplier_id = :supplier_id, purchase_id = :purchase_id, payment_date = :payment_date,
                    amount = :amount, payment_method = :payment_method, notes = :notes
                WHERE id = :id
            ");
            $stmt->execute([
                ':id' => $_GET['id'],
                ':supplier_id' => $supplierId,
                ':purchase_id' => $purchaseId,
                ':payment_date' => $paymentDate,
                ':amount' => $amount,
                ':payment_method' => $data['payment_method'] ?? null,
                ':notes' => $data['notes'] ?? null
            ]);

            $stmt = $db->prepare(payment_select_sql() . " WHERE sp.id = ?");
            $stmt->execute([$_GET['id']]);
            $payment = $stmt->fetch();
            $payment ? sendSuccess(convertKeys($payment), 'Η πληρωμή ενημερώθηκε επιτυχώς') : sendError('Η πληρωμή δεν βρέθηκε', 404);
            break;

        case 'DELETE':
            if (!isset($_GET['id'])) sendError('Το ID είναι υποχρεωτικό');
            $stmt = $db->prepare("DELETE FROM supplier_payments WHERE id = ?");
            $stmt->execute([$_GET['id']]);
            $stmt->rowCount() > 0 ? sendSuccess(null, 'Η πληρωμή διαγράφηκε') : sendError('Δεν βρέθηκε', 404);
            break;

        default:
            sendError('Μη έγκυρη μέθοδος', 405);
    }
} catch (Exception $e) {
    error_log("Supplier Payments API Error: " . $e->getMessage());
    sendError('Σφάλμα: ' . $e->getMessage(), 500);
}
?>
