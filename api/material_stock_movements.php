<?php
/**
 * Material Stock Movements API - Ιστορικό φυσικής αποθήκης
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/auth_check.php';
require_once __DIR__ . '/warehouse_schema.php';

checkAuthentication();

logApiRequest('/api/material_stock_movements.php', $_SERVER['REQUEST_METHOD'], $_GET);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

$db = getDBConnection();
ensure_warehouse_schema($db);
$method = $_SERVER['REQUEST_METHOD'];

function stock_movements_select_sql() {
    return "
        SELECT
            msm.*,
            m.name AS material_name,
            m.category AS material_category
        FROM material_stock_movements msm
        INNER JOIN materials m ON m.id = msm.material_id
    ";
}

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['material_id'])) {
                $stmt = $db->prepare(stock_movements_select_sql() . " WHERE msm.material_id = ? ORDER BY msm.movement_date DESC, msm.id DESC");
                $stmt->execute([$_GET['material_id']]);
            } else {
                $stmt = $db->query(stock_movements_select_sql() . " ORDER BY msm.movement_date DESC, msm.id DESC LIMIT 300");
            }
            sendSuccess(array_map('convertKeys', $stmt->fetchAll()));
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) sendError('Δεν υπάρχουν δεδομένα');

            $data = convertToSnakeCase($input);
            $materialId = (int)($data['material_id'] ?? 0);
            if ($materialId <= 0) sendError('Επιλέξτε υλικό');

            $movementType = $data['movement_type'] ?? 'add';
            $quantity = warehouse_to_float($data['quantity'] ?? 0);
            if ($quantity <= 0) sendError('Η ποσότητα πρέπει να είναι μεγαλύτερη από 0');

            $db->beginTransaction();

            $currentStmt = $db->prepare("SELECT stock FROM materials WHERE id = ? FOR UPDATE");
            $currentStmt->execute([$materialId]);
            $currentStock = $currentStmt->fetchColumn();
            if ($currentStock === false) {
                throw new Exception('Το υλικό δεν βρέθηκε');
            }

            if ($movementType === 'remove') {
                if ($quantity > warehouse_to_float($currentStock)) {
                    sendError('Η ποσότητα αφαίρεσης είναι μεγαλύτερη από το διαθέσιμο stock');
                }
                $quantityDelta = -$quantity;
            } elseif ($movementType === 'adjust') {
                $quantityDelta = $quantity - warehouse_to_float($currentStock);
            } else {
                $movementType = 'add';
                $quantityDelta = $quantity;
            }

            if ($quantityDelta == 0.0) {
                sendError('Η ποσότητα δεν αλλάζει το απόθεμα');
            }

            $movementId = record_material_stock_movement($db, $materialId, $quantityDelta, $movementType, [
                'movement_date' => !empty($data['movement_date']) ? $data['movement_date'] : date('Y-m-d'),
                'unit' => $data['unit'] ?? null,
                'reference_type' => $data['reference_type'] ?? 'manual',
                'reference_id' => !empty($data['reference_id']) ? (int)$data['reference_id'] : null,
                'notes' => $data['notes'] ?? null
            ]);

            $stmt = $db->prepare(stock_movements_select_sql() . " WHERE msm.id = ?");
            $stmt->execute([$movementId]);
            $movement = convertKeys($stmt->fetch());

            $materialStmt = $db->prepare("SELECT * FROM materials WHERE id = ?");
            $materialStmt->execute([$materialId]);
            $material = convertKeys($materialStmt->fetch());

            $db->commit();
            sendSuccess(['movement' => $movement, 'material' => $material], 'Η κίνηση αποθήκης καταχωρήθηκε');
            break;

        default:
            sendError('Μη έγκυρη μέθοδος', 405);
    }
} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    error_log("Material Stock Movements API Error: " . $e->getMessage());
    sendError('Σφάλμα: ' . $e->getMessage(), 500);
}
?>
