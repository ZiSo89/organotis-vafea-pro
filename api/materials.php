<?php
/**
 * Materials API - Υλικά/Χρώματα
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/auth_check.php';
checkAuthentication();

// Log API request
logApiRequest('/api/materials.php', $_SERVER['REQUEST_METHOD'], $_GET);

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
                $stmt = $db->prepare("SELECT * FROM materials WHERE id = ?");
                $stmt->execute([$_GET['id']]);
                $material = $stmt->fetch();
                $material ? sendSuccess(convertKeys($material)) : sendError('Το υλικό δεν βρέθηκε', 404);
            } else {
                $stmt = $db->query("SELECT * FROM materials ORDER BY name ASC");
                sendSuccess(array_map('convertKeys', $stmt->fetchAll()));
            }
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input || !isset($input['name'])) sendError('Το όνομα είναι υποχρεωτικό');
            
            $data = convertToSnakeCase($input);
            $stmt = $db->prepare("
                INSERT INTO materials (name, unit, unit_price, stock, min_stock, category)
                VALUES (:name, :unit, :unit_price, :stock, :min_stock, :category)
            ");
            $stmt->execute([
                ':name' => $data['name'],
                ':unit' => $data['unit'] ?? 'τμχ',
                ':unit_price' => $data['unit_price'] ?? 0,
                ':stock' => $data['stock'] ?? 0,
                ':min_stock' => $data['min_stock'] ?? 0,
                ':category' => $data['category'] ?? null
            ]);
            
            $stmt = $db->prepare("SELECT * FROM materials WHERE id = ?");
            $stmt->execute([$db->lastInsertId()]);
            sendSuccess(convertKeys($stmt->fetch()), 'Το υλικό δημιουργήθηκε επιτυχώς');
            break;
            
        case 'PUT':
            if (!isset($_GET['id'])) sendError('Το ID είναι υποχρεωτικό');
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) sendError('Δεν υπάρχουν δεδομένα');
            
            $data = convertToSnakeCase($input);
            $stmt = $db->prepare("
                UPDATE materials 
                SET name = :name, unit = :unit, unit_price = :unit_price,
                    stock = :stock, min_stock = :min_stock, category = :category
                WHERE id = :id
            ");
            $stmt->execute([
                ':id' => $_GET['id'],
                ':name' => $data['name'],
                ':unit' => $data['unit'] ?? 'τμχ',
                ':unit_price' => $data['unit_price'] ?? 0,
                ':stock' => $data['stock'] ?? 0,
                ':min_stock' => $data['min_stock'] ?? 0,
                ':category' => $data['category'] ?? null
            ]);
            
            if ($stmt->rowCount() === 0) sendError('Το υλικό δεν βρέθηκε', 404);
            
            $stmt = $db->prepare("SELECT * FROM materials WHERE id = ?");
            $stmt->execute([$_GET['id']]);
            sendSuccess(convertKeys($stmt->fetch()), 'Το υλικό ενημερώθηκε επιτυχώς');
            break;
            
        case 'DELETE':
            if (!isset($_GET['id'])) sendError('Το ID είναι υποχρεωτικό');
            $stmt = $db->prepare("DELETE FROM materials WHERE id = ?");
            $stmt->execute([$_GET['id']]);
            $stmt->rowCount() > 0 ? sendSuccess(null, 'Το υλικό διαγράφηκε') : sendError('Δεν βρέθηκε', 404);
            break;
            
        default:
            sendError('Μη έγκυρη μέθοδος', 405);
    }
} catch (Exception $e) {
    error_log("Materials API Error: " . $e->getMessage());
    sendError('Σφάλμα: ' . $e->getMessage(), 500);
}
?>
