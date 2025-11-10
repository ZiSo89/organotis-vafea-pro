<?php
/**
 * Offers API - Προσφορές
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
                $stmt = $db->prepare("SELECT * FROM offers WHERE id = ?");
                $stmt->execute([$_GET['id']]);
                $offer = $stmt->fetch();
                if ($offer) {
                    $offer = convertKeys($offer);
                    $offer['items'] = json_decode($offer['items'], true);
                    sendSuccess($offer);
                } else {
                    sendError('Η προσφορά δεν βρέθηκε', 404);
                }
            } else {
                $stmt = $db->query("
                    SELECT o.*, c.name as client_name 
                    FROM offers o 
                    LEFT JOIN clients c ON o.client_id = c.id 
                    ORDER BY o.date DESC
                ");
                $offers = $stmt->fetchAll();
                foreach ($offers as &$offer) {
                    $offer = convertKeys($offer);
                    $offer['items'] = json_decode($offer['items'], true);
                }
                sendSuccess($offers);
            }
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input || !isset($input['clientId']) || !isset($input['offerNumber'])) {
                sendError('Ο πελάτης και ο αριθμός προσφοράς είναι υποχρεωτικά');
            }
            
            $data = convertToSnakeCase($input);
            $stmt = $db->prepare("
                INSERT INTO offers (client_id, offer_number, date, valid_until, items, 
                                   subtotal, tax, discount, total, status, notes)
                VALUES (:client_id, :offer_number, :date, :valid_until, :items,
                       :subtotal, :tax, :discount, :total, :status, :notes)
            ");
            $stmt->execute([
                ':client_id' => $data['client_id'],
                ':offer_number' => $data['offer_number'],
                ':date' => $data['date'] ?? date('Y-m-d'),
                ':valid_until' => $data['valid_until'] ?? null,
                ':items' => json_encode($input['items'] ?? []),
                ':subtotal' => $data['subtotal'] ?? 0,
                ':tax' => $data['tax'] ?? 0,
                ':discount' => $data['discount'] ?? 0,
                ':total' => $data['total'] ?? 0,
                ':status' => $data['status'] ?? 'pending',
                ':notes' => $data['notes'] ?? null
            ]);
            
            $stmt = $db->prepare("SELECT * FROM offers WHERE id = ?");
            $stmt->execute([$db->lastInsertId()]);
            $offer = convertKeys($stmt->fetch());
            $offer['items'] = json_decode($offer['items'], true);
            sendSuccess($offer, 'Η προσφορά δημιουργήθηκε επιτυχώς');
            break;
            
        case 'PUT':
            if (!isset($_GET['id'])) sendError('Το ID είναι υποχρεωτικό');
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) sendError('Δεν υπάρχουν δεδομένα');
            
            $data = convertToSnakeCase($input);
            $stmt = $db->prepare("
                UPDATE offers 
                SET client_id = :client_id, offer_number = :offer_number, date = :date,
                    valid_until = :valid_until, items = :items, subtotal = :subtotal,
                    tax = :tax, discount = :discount, total = :total, status = :status, notes = :notes
                WHERE id = :id
            ");
            $stmt->execute([
                ':id' => $_GET['id'],
                ':client_id' => $data['client_id'],
                ':offer_number' => $data['offer_number'],
                ':date' => $data['date'],
                ':valid_until' => $data['valid_until'] ?? null,
                ':items' => json_encode($input['items'] ?? []),
                ':subtotal' => $data['subtotal'] ?? 0,
                ':tax' => $data['tax'] ?? 0,
                ':discount' => $data['discount'] ?? 0,
                ':total' => $data['total'] ?? 0,
                ':status' => $data['status'] ?? 'pending',
                ':notes' => $data['notes'] ?? null
            ]);
            
            if ($stmt->rowCount() === 0) sendError('Η προσφορά δεν βρέθηκε', 404);
            
            $stmt = $db->prepare("SELECT * FROM offers WHERE id = ?");
            $stmt->execute([$_GET['id']]);
            $offer = convertKeys($stmt->fetch());
            $offer['items'] = json_decode($offer['items'], true);
            sendSuccess($offer, 'Η προσφορά ενημερώθηκε επιτυχώς');
            break;
            
        case 'DELETE':
            if (!isset($_GET['id'])) sendError('Το ID είναι υποχρεωτικό');
            $stmt = $db->prepare("DELETE FROM offers WHERE id = ?");
            $stmt->execute([$_GET['id']]);
            $stmt->rowCount() > 0 ? sendSuccess(null, 'Η προσφορά διαγράφηκε') : sendError('Δεν βρέθηκε', 404);
            break;
            
        default:
            sendError('Μη έγκυρη μέθοδος', 405);
    }
} catch (Exception $e) {
    error_log("Offers API Error: " . $e->getMessage());
    sendError('Σφάλμα: ' . $e->getMessage(), 500);
}
?>
