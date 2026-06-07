<?php
/**
 * Material Purchases API - Αγορές υλικών από καταστήματα
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/auth_check.php';
require_once __DIR__ . '/warehouse_schema.php';

checkAuthentication();

logApiRequest('/api/material_purchases.php', $_SERVER['REQUEST_METHOD'], $_GET);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

$db = getDBConnection();
ensure_warehouse_schema($db);
$method = $_SERVER['REQUEST_METHOD'];

function purchase_select_sql() {
    return "
        SELECT
            mp.*,
            s.name AS supplier_name,
            COALESCE(pay.total_paid, 0) AS paid_amount,
            mp.total_cost - COALESCE(pay.total_paid, 0) AS balance
        FROM material_purchases mp
        INNER JOIN suppliers s ON s.id = mp.supplier_id
        LEFT JOIN (
            SELECT purchase_id, SUM(amount) AS total_paid
            FROM supplier_payments
            WHERE purchase_id IS NOT NULL
            GROUP BY purchase_id
        ) pay ON pay.purchase_id = mp.id
    ";
}

function ensure_supplier_exists($db, $supplierId) {
    $stmt = $db->prepare("SELECT id FROM suppliers WHERE id = ?");
    $stmt->execute([$supplierId]);
    return (bool)$stmt->fetch();
}

function get_purchase_items($db, $purchaseId) {
    $stmt = $db->prepare("
        SELECT *
        FROM material_purchase_items
        WHERE purchase_id = ?
        ORDER BY id ASC
    ");
    $stmt->execute([$purchaseId]);
    return array_map('convertKeys', $stmt->fetchAll());
}

function get_purchase($db, $purchaseId) {
    $stmt = $db->prepare(purchase_select_sql() . " WHERE mp.id = ?");
    $stmt->execute([$purchaseId]);
    $purchase = $stmt->fetch();
    if (!$purchase) return null;
    $purchase = convertKeys($purchase);
    $purchase['items'] = get_purchase_items($db, $purchaseId);
    return $purchase;
}

function normalize_purchase_items($items) {
    if (!is_array($items) || count($items) === 0) {
        sendError('Προσθέστε τουλάχιστον ένα υλικό στην αγορά');
    }

    $normalized = [];
    foreach ($items as $item) {
        $data = convertToSnakeCase($item);
        $name = trim($data['material_name'] ?? $data['name'] ?? '');
        $quantity = warehouse_to_float($data['quantity'] ?? 0);
        $unitPrice = warehouse_to_float($data['unit_price'] ?? 0);
        $totalCost = isset($data['total_cost']) && $data['total_cost'] !== ''
            ? warehouse_to_float($data['total_cost'])
            : round($quantity * $unitPrice, 2);

        if ($name === '') sendError('Το όνομα υλικού είναι υποχρεωτικό');
        if ($quantity <= 0) sendError('Η ποσότητα υλικού πρέπει να είναι μεγαλύτερη από 0');
        if ($unitPrice < 0 || $totalCost < 0) sendError('Οι τιμές υλικού δεν μπορεί να είναι αρνητικές');

        $normalized[] = [
            'material_id' => !empty($data['material_id']) ? (int)$data['material_id'] : null,
            'material_name' => $name,
            'quantity' => $quantity,
            'unit' => $data['unit'] ?? null,
            'unit_price' => $unitPrice,
            'total_cost' => $totalCost,
            'notes' => $data['notes'] ?? null
        ];
    }

    return $normalized;
}

function resolve_material_id($db, $item) {
    if (!empty($item['material_id'])) {
        $stmt = $db->prepare("SELECT id FROM materials WHERE id = ?");
        $stmt->execute([$item['material_id']]);
        if ($stmt->fetch()) return (int)$item['material_id'];
    }

    $stmt = $db->prepare("SELECT id FROM materials WHERE name = ? LIMIT 1");
    $stmt->execute([$item['material_name']]);
    $existingId = $stmt->fetchColumn();
    if ($existingId) return (int)$existingId;

    $stmt = $db->prepare("
        INSERT INTO materials (name, unit, unit_price, stock, min_stock, category)
        VALUES (:name, :unit, :unit_price, 0, 0, :category)
    ");
    $stmt->execute([
        ':name' => $item['material_name'],
        ':unit' => $item['unit'] ?: 'τμχ',
        ':unit_price' => $item['unit_price'],
        ':category' => 'Αγορά'
    ]);
    return (int)$db->lastInsertId();
}

function insert_purchase_items($db, $purchaseId, $items, $purchaseDate) {
    $total = 0.0;
    $stmt = $db->prepare("
        INSERT INTO material_purchase_items
            (purchase_id, material_id, material_name, quantity, unit, unit_price, total_cost, notes)
        VALUES
            (:purchase_id, :material_id, :material_name, :quantity, :unit, :unit_price, :total_cost, :notes)
    ");

    foreach ($items as $item) {
        $materialId = resolve_material_id($db, $item);
        record_material_stock_movement($db, $materialId, $item['quantity'], 'purchase', [
            'movement_date' => $purchaseDate,
            'unit' => $item['unit'],
            'unit_price' => $item['unit_price'],
            'reference_type' => 'purchase',
            'reference_id' => $purchaseId,
            'notes' => 'Αγορά από προμηθευτή'
        ]);

        $stmt->execute([
            ':purchase_id' => $purchaseId,
            ':material_id' => $materialId,
            ':material_name' => $item['material_name'],
            ':quantity' => $item['quantity'],
            ':unit' => $item['unit'],
            ':unit_price' => $item['unit_price'],
            ':total_cost' => $item['total_cost'],
            ':notes' => $item['notes']
        ]);

        $total += $item['total_cost'];
    }

    $update = $db->prepare("UPDATE material_purchases SET total_cost = ? WHERE id = ?");
    $update->execute([round($total, 2), $purchaseId]);
    return round($total, 2);
}

function normalize_initial_payment($input, $purchaseTotal) {
    $payment = $input['initialPayment'] ?? $input['initial_payment'] ?? null;
    if (!is_array($payment)) return null;

    $data = convertToSnakeCase($payment);
    $status = $data['status'] ?? 'none';
    if ($status === 'none') return null;

    $amount = $status === 'full'
        ? $purchaseTotal
        : warehouse_to_float($data['amount'] ?? 0);

    if ($amount <= 0) {
        sendError('Το ποσό πληρωμής πρέπει να είναι μεγαλύτερο από 0');
    }
    if ($amount > $purchaseTotal) {
        sendError('Η πληρωμή δεν μπορεί να είναι μεγαλύτερη από το σύνολο της αγοράς');
    }

    return [
        'amount' => $amount,
        'payment_method' => $data['payment_method'] ?? null,
        'notes' => $data['notes'] ?? null
    ];
}

function insert_initial_payment($db, $supplierId, $purchaseId, $purchaseDate, $purchaseTotal, $input) {
    $payment = normalize_initial_payment($input, $purchaseTotal);
    if (!$payment) return;

    $stmt = $db->prepare("
        INSERT INTO supplier_payments (supplier_id, purchase_id, payment_date, amount, payment_method, notes)
        VALUES (:supplier_id, :purchase_id, :payment_date, :amount, :payment_method, :notes)
    ");
    $stmt->execute([
        ':supplier_id' => $supplierId,
        ':purchase_id' => $purchaseId,
        ':payment_date' => $purchaseDate,
        ':amount' => $payment['amount'],
        ':payment_method' => $payment['payment_method'],
        ':notes' => $payment['notes']
    ]);
}

function rollback_purchase_stock($db, $purchaseId) {
    $stmt = $db->prepare("
        SELECT mpi.material_id, mpi.quantity, mpi.unit, mp.purchase_date
        FROM material_purchase_items mpi
        INNER JOIN material_purchases mp ON mp.id = mpi.purchase_id
        WHERE mpi.purchase_id = ?
    ");
    $stmt->execute([$purchaseId]);
    foreach ($stmt->fetchAll() as $item) {
        if (!empty($item['material_id'])) {
            record_material_stock_movement($db, (int)$item['material_id'], -warehouse_to_float($item['quantity']), 'purchase_rollback', [
                'movement_date' => $item['purchase_date'] ?: date('Y-m-d'),
                'unit' => $item['unit'] ?? null,
                'reference_type' => 'purchase',
                'reference_id' => $purchaseId,
                'notes' => 'Αντιστροφή αγοράς'
            ]);
        }
    }
}

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                $purchase = get_purchase($db, $_GET['id']);
                $purchase ? sendSuccess($purchase) : sendError('Η αγορά δεν βρέθηκε', 404);
            } elseif (isset($_GET['supplier_id'])) {
                $stmt = $db->prepare(purchase_select_sql() . " WHERE mp.supplier_id = ? ORDER BY mp.purchase_date DESC, mp.id DESC");
                $stmt->execute([$_GET['supplier_id']]);
                $purchases = array_map('convertKeys', $stmt->fetchAll());
                foreach ($purchases as &$purchase) {
                    $purchase['items'] = get_purchase_items($db, $purchase['id']);
                }
                unset($purchase);
                sendSuccess($purchases);
            } else {
                $stmt = $db->query(purchase_select_sql() . " ORDER BY mp.purchase_date DESC, mp.id DESC");
                $purchases = array_map('convertKeys', $stmt->fetchAll());
                foreach ($purchases as &$purchase) {
                    $purchase['items'] = get_purchase_items($db, $purchase['id']);
                }
                unset($purchase);
                sendSuccess($purchases);
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) sendError('Δεν υπάρχουν δεδομένα');

            $data = convertToSnakeCase($input);
            $supplierId = (int)($data['supplier_id'] ?? 0);
            if ($supplierId <= 0 || !ensure_supplier_exists($db, $supplierId)) {
                sendError('Επιλέξτε έγκυρο κατάστημα');
            }

            $items = normalize_purchase_items($input['items'] ?? []);
            $purchaseDate = !empty($data['purchase_date']) ? $data['purchase_date'] : date('Y-m-d');

            $db->beginTransaction();
            $stmt = $db->prepare("
                INSERT INTO material_purchases (supplier_id, purchase_date, reference_number, notes, total_cost)
                VALUES (:supplier_id, :purchase_date, :reference_number, :notes, 0)
            ");
            $stmt->execute([
                ':supplier_id' => $supplierId,
                ':purchase_date' => $purchaseDate,
                ':reference_number' => $data['reference_number'] ?? null,
                ':notes' => $data['notes'] ?? null
            ]);

            $purchaseId = (int)$db->lastInsertId();
            $purchaseTotal = insert_purchase_items($db, $purchaseId, $items, $purchaseDate);
            insert_initial_payment($db, $supplierId, $purchaseId, $purchaseDate, $purchaseTotal, $input);
            $db->commit();

            sendSuccess(get_purchase($db, $purchaseId), 'Η αγορά καταχωρήθηκε επιτυχώς');
            break;

        case 'PUT':
            if (!isset($_GET['id'])) sendError('Το ID είναι υποχρεωτικό');
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) sendError('Δεν υπάρχουν δεδομένα');

            $existing = get_purchase($db, $_GET['id']);
            if (!$existing) sendError('Η αγορά δεν βρέθηκε', 404);

            $data = convertToSnakeCase($input);
            $supplierId = (int)($data['supplier_id'] ?? 0);
            if ($supplierId <= 0 || !ensure_supplier_exists($db, $supplierId)) {
                sendError('Επιλέξτε έγκυρο κατάστημα');
            }

            $items = normalize_purchase_items($input['items'] ?? []);
            $purchaseDate = !empty($data['purchase_date']) ? $data['purchase_date'] : date('Y-m-d');

            $db->beginTransaction();
            rollback_purchase_stock($db, $_GET['id']);
            $db->prepare("DELETE FROM material_purchase_items WHERE purchase_id = ?")->execute([$_GET['id']]);

            $stmt = $db->prepare("
                UPDATE material_purchases
                SET supplier_id = :supplier_id, purchase_date = :purchase_date,
                    reference_number = :reference_number, notes = :notes, total_cost = 0
                WHERE id = :id
            ");
            $stmt->execute([
                ':id' => $_GET['id'],
                ':supplier_id' => $supplierId,
                ':purchase_date' => $purchaseDate,
                ':reference_number' => $data['reference_number'] ?? null,
                ':notes' => $data['notes'] ?? null
            ]);

            insert_purchase_items($db, $_GET['id'], $items, $purchaseDate);
            $db->prepare("UPDATE supplier_payments SET supplier_id = ? WHERE purchase_id = ?")->execute([$supplierId, $_GET['id']]);
            $db->commit();

            sendSuccess(get_purchase($db, $_GET['id']), 'Η αγορά ενημερώθηκε επιτυχώς');
            break;

        case 'DELETE':
            if (!isset($_GET['id'])) sendError('Το ID είναι υποχρεωτικό');
            $existing = get_purchase($db, $_GET['id']);
            if (!$existing) sendError('Η αγορά δεν βρέθηκε', 404);

            $db->beginTransaction();
            rollback_purchase_stock($db, $_GET['id']);
            $stmt = $db->prepare("DELETE FROM material_purchases WHERE id = ?");
            $stmt->execute([$_GET['id']]);
            $db->commit();

            sendSuccess(null, 'Η αγορά διαγράφηκε');
            break;

        default:
            sendError('Μη έγκυρη μέθοδος', 405);
    }
} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    error_log("Material Purchases API Error: " . $e->getMessage());
    sendError('Σφάλμα: ' . $e->getMessage(), 500);
}
?>
