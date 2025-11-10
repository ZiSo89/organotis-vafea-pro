<?php
/**
 * Οργανωτής Βαφέα Pro - Workers API
 * CRUD operations για εργάτες
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
                $stmt = $db->prepare("SELECT * FROM workers WHERE id = ?");
                $stmt->execute([$_GET['id']]);
                $worker = $stmt->fetch();
                $worker ? sendSuccess(convertKeys($worker)) : sendError('Ο εργάτης δεν βρέθηκε', 404);
            } else {
                $stmt = $db->query("SELECT * FROM workers ORDER BY name ASC");
                sendSuccess(array_map('convertKeys', $stmt->fetchAll()));
            }
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input || !isset($input['name'])) sendError('Το όνομα είναι υποχρεωτικό');
            
            $data = convertToSnakeCase($input);
            $stmt = $db->prepare("
                INSERT INTO workers (name, phone, specialty, hourly_rate, daily_rate, status, hire_date, notes, total_hours, total_earnings)
                VALUES (:name, :phone, :specialty, :hourly_rate, :daily_rate, :status, :hire_date, :notes, :total_hours, :total_earnings)
            ");
            $stmt->execute([
                ':name' => $data['name'],
                ':phone' => $data['phone'] ?? null,
                ':specialty' => $data['specialty'] ?? null,
                ':hourly_rate' => $data['hourly_rate'] ?? 0,
                ':daily_rate' => $data['daily_rate'] ?? 0,
                ':status' => $data['status'] ?? 'active',
                ':hire_date' => $data['hire_date'] ?? null,
                ':notes' => $data['notes'] ?? null,
                ':total_hours' => $data['total_hours'] ?? 0,
                ':total_earnings' => $data['total_earnings'] ?? 0
            ]);
            
            $stmt = $db->prepare("SELECT * FROM workers WHERE id = ?");
            $stmt->execute([$db->lastInsertId()]);
            sendSuccess(convertKeys($stmt->fetch()), 'Ο εργάτης δημιουργήθηκε επιτυχώς');
            break;
            
        case 'PUT':
            if (!isset($_GET['id'])) sendError('Το ID είναι υποχρεωτικό');
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) sendError('Δεν υπάρχουν δεδομένα');
            
            $data = convertToSnakeCase($input);
            $stmt = $db->prepare("
                UPDATE workers 
                SET name = :name, phone = :phone, specialty = :specialty,
                    hourly_rate = :hourly_rate, daily_rate = :daily_rate,
                    status = :status, hire_date = :hire_date, notes = :notes,
                    total_hours = :total_hours, total_earnings = :total_earnings
                WHERE id = :id
            ");
            $stmt->execute([
                ':id' => $_GET['id'],
                ':name' => $data['name'],
                ':phone' => $data['phone'] ?? null,
                ':specialty' => $data['specialty'] ?? null,
                ':hourly_rate' => $data['hourly_rate'] ?? 0,
                ':daily_rate' => $data['daily_rate'] ?? 0,
                ':status' => $data['status'] ?? 'active',
                ':hire_date' => $data['hire_date'] ?? null,
                ':notes' => $data['notes'] ?? null,
                ':total_hours' => $data['total_hours'] ?? 0,
                ':total_earnings' => $data['total_earnings'] ?? 0
            ]);
            
            if ($stmt->rowCount() === 0) sendError('Ο εργάτης δεν βρέθηκε', 404);
            
            $stmt = $db->prepare("SELECT * FROM workers WHERE id = ?");
            $stmt->execute([$_GET['id']]);
            sendSuccess(convertKeys($stmt->fetch()), 'Ο εργάτης ενημερώθηκε επιτυχώς');
            break;
            
        case 'DELETE':
            if (!isset($_GET['id'])) sendError('Το ID είναι υποχρεωτικό');
            $stmt = $db->prepare("DELETE FROM workers WHERE id = ?");
            $stmt->execute([$_GET['id']]);
            $stmt->rowCount() > 0 ? sendSuccess(null, 'Ο εργάτης διαγράφηκε') : sendError('Δεν βρέθηκε', 404);
            break;
            
        default:
            sendError('Μη έγκυρη μέθοδος', 405);
    }
} catch (Exception $e) {
    error_log("Workers API Error: " . $e->getMessage());
    sendError('Σφάλμα: ' . $e->getMessage(), 500);
}
?>
