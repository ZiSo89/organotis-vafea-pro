<?php
/**
 * Suppliers API - Καταστήματα / Προμηθευτές
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/auth_check.php';
require_once __DIR__ . '/warehouse_schema.php';

checkAuthentication();

logApiRequest('/api/suppliers.php', $_SERVER['REQUEST_METHOD'], $_GET);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

$db = getDBConnection();
ensure_warehouse_schema($db);
$method = $_SERVER['REQUEST_METHOD'];

function supplier_select_sql() {
    return "
        SELECT
            s.*,
            COALESCE(p.total_purchases, 0) AS total_purchases,
            COALESCE(pay.total_paid, 0) AS total_paid,
            COALESCE(p.total_purchases, 0) - COALESCE(pay.total_paid, 0) AS balance
        FROM suppliers s
        LEFT JOIN (
            SELECT supplier_id, SUM(total_cost) AS total_purchases
            FROM material_purchases
            GROUP BY supplier_id
        ) p ON p.supplier_id = s.id
        LEFT JOIN (
            SELECT supplier_id, SUM(amount) AS total_paid
            FROM supplier_payments
            GROUP BY supplier_id
        ) pay ON pay.supplier_id = s.id
    ";
}

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                $stmt = $db->prepare(supplier_select_sql() . " WHERE s.id = ?");
                $stmt->execute([$_GET['id']]);
                $supplier = $stmt->fetch();
                $supplier ? sendSuccess(convertKeys($supplier)) : sendError('Το κατάστημα δεν βρέθηκε', 404);
            } else {
                $stmt = $db->query(supplier_select_sql() . " ORDER BY s.name ASC");
                sendSuccess(array_map('convertKeys', $stmt->fetchAll()));
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input || empty(trim($input['name'] ?? ''))) sendError('Το όνομα καταστήματος είναι υποχρεωτικό');

            $data = convertToSnakeCase($input);
            $stmt = $db->prepare("
                INSERT INTO suppliers (name, phone, email, address, notes)
                VALUES (:name, :phone, :email, :address, :notes)
            ");
            $stmt->execute([
                ':name' => trim($data['name']),
                ':phone' => $data['phone'] ?? null,
                ':email' => $data['email'] ?? null,
                ':address' => $data['address'] ?? null,
                ':notes' => $data['notes'] ?? null
            ]);

            $stmt = $db->prepare(supplier_select_sql() . " WHERE s.id = ?");
            $stmt->execute([$db->lastInsertId()]);
            sendSuccess(convertKeys($stmt->fetch()), 'Το κατάστημα δημιουργήθηκε επιτυχώς');
            break;

        case 'PUT':
            if (!isset($_GET['id'])) sendError('Το ID είναι υποχρεωτικό');
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) sendError('Δεν υπάρχουν δεδομένα');
            if (empty(trim($input['name'] ?? ''))) sendError('Το όνομα καταστήματος είναι υποχρεωτικό');

            $data = convertToSnakeCase($input);
            $stmt = $db->prepare("
                UPDATE suppliers
                SET name = :name, phone = :phone, email = :email, address = :address, notes = :notes
                WHERE id = :id
            ");
            $stmt->execute([
                ':id' => $_GET['id'],
                ':name' => trim($data['name']),
                ':phone' => $data['phone'] ?? null,
                ':email' => $data['email'] ?? null,
                ':address' => $data['address'] ?? null,
                ':notes' => $data['notes'] ?? null
            ]);

            $stmt = $db->prepare(supplier_select_sql() . " WHERE s.id = ?");
            $stmt->execute([$_GET['id']]);
            $supplier = $stmt->fetch();
            $supplier ? sendSuccess(convertKeys($supplier), 'Το κατάστημα ενημερώθηκε επιτυχώς') : sendError('Το κατάστημα δεν βρέθηκε', 404);
            break;

        case 'DELETE':
            if (!isset($_GET['id'])) sendError('Το ID είναι υποχρεωτικό');
            $db->beginTransaction();
            $stockStmt = $db->prepare("
                SELECT mpi.material_id, mpi.quantity, mpi.unit, mp.id AS purchase_id, mp.purchase_date
                FROM material_purchase_items mpi
                INNER JOIN material_purchases mp ON mp.id = mpi.purchase_id
                WHERE mp.supplier_id = ? AND mpi.material_id IS NOT NULL
            ");
            $stockStmt->execute([$_GET['id']]);
            foreach ($stockStmt->fetchAll() as $item) {
                record_material_stock_movement($db, (int)$item['material_id'], -warehouse_to_float($item['quantity']), 'purchase_rollback', [
                    'movement_date' => $item['purchase_date'] ?: date('Y-m-d'),
                    'unit' => $item['unit'] ?? null,
                    'reference_type' => 'purchase',
                    'reference_id' => $item['purchase_id'] ?? null,
                    'notes' => 'Αντιστροφή λόγω διαγραφής προμηθευτή'
                ]);
            }

            $stmt = $db->prepare("DELETE FROM suppliers WHERE id = ?");
            $stmt->execute([$_GET['id']]);
            $deleted = $stmt->rowCount();
            $db->commit();
            $deleted > 0 ? sendSuccess(null, 'Το κατάστημα διαγράφηκε') : sendError('Δεν βρέθηκε', 404);
            break;

        default:
            sendError('Μη έγκυρη μέθοδος', 405);
    }
} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    error_log("Suppliers API Error: " . $e->getMessage());
    sendError('Σφάλμα: ' . $e->getMessage(), 500);
}
?>
