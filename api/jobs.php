<?php
/**
 * Jobs API - Εργασίες
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
                $stmt = $db->prepare("SELECT * FROM jobs WHERE id = ?");
                $stmt->execute([$_GET['id']]);
                $job = $stmt->fetch();
                if ($job) {
                    $job = convertKeys($job);
                    // Decode JSON fields
                    if (isset($job['coordinates'])) $job['coordinates'] = json_decode($job['coordinates'], true);
                    if (isset($job['assignedWorkers'])) $job['assignedWorkers'] = json_decode($job['assignedWorkers'], true);
                    if (isset($job['paints'])) $job['paints'] = json_decode($job['paints'], true);
                    sendSuccess($job);
                } else {
                    sendError('Η εργασία δεν βρέθηκε', 404);
                }
            } else {
                $stmt = $db->query("SELECT * FROM jobs ORDER BY created_at DESC");
                $jobs = array_map(function($job) {
                    $job = convertKeys($job);
                    if (isset($job['coordinates'])) $job['coordinates'] = json_decode($job['coordinates'], true);
                    if (isset($job['assignedWorkers'])) $job['assignedWorkers'] = json_decode($job['assignedWorkers'], true);
                    if (isset($job['paints'])) $job['paints'] = json_decode($job['paints'], true);
                    return $job;
                }, $stmt->fetchAll());
                sendSuccess($jobs);
            }
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input || !isset($input['clientId'])) {
                sendError('Ο πελάτης είναι υποχρεωτικός');
            }
            
            $data = convertToSnakeCase($input);
            
            $stmt = $db->prepare("
                INSERT INTO jobs (
                    client_id, title, type, date, next_visit, description, address, city, postal_code,
                    rooms, area, substrate, materials_cost, kilometers, billing_hours, billing_rate,
                    vat, cost_per_km, notes, assigned_workers, paints,
                    start_date, end_date, status, total_cost, is_paid, coordinates
                )
                VALUES (
                    :client_id, :title, :type, :date, :next_visit, :description, :address, :city, :postal_code,
                    :rooms, :area, :substrate, :materials_cost, :kilometers, :billing_hours, :billing_rate,
                    :vat, :cost_per_km, :notes, :assigned_workers, :paints,
                    :start_date, :end_date, :status, :total_cost, :is_paid, :coordinates
                )
            ");
            
            $stmt->execute([
                ':client_id' => $data['client_id'],
                ':title' => $data['title'] ?? ($data['type'] ?? 'Νέα Εργασία'),
                ':type' => $data['type'] ?? null,
                ':date' => $data['date'] ?? null,
                ':next_visit' => $data['next_visit'] ?? null,
                ':description' => $data['description'] ?? null,
                ':address' => $data['address'] ?? null,
                ':city' => $data['city'] ?? null,
                ':postal_code' => $data['postal_code'] ?? null,
                ':rooms' => $data['rooms'] ?? null,
                ':area' => $data['area'] ?? null,
                ':substrate' => $data['substrate'] ?? null,
                ':materials_cost' => $data['materials_cost'] ?? 0,
                ':kilometers' => $data['kilometers'] ?? 0,
                ':billing_hours' => $data['billing_hours'] ?? 0,
                ':billing_rate' => $data['billing_rate'] ?? 50,
                ':vat' => $data['vat'] ?? 24,
                ':cost_per_km' => $data['cost_per_km'] ?? 0.5,
                ':notes' => $data['notes'] ?? null,
                ':assigned_workers' => isset($input['assignedWorkers']) ? json_encode($input['assignedWorkers']) : null,
                ':paints' => isset($input['paints']) ? json_encode($input['paints']) : null,
                ':start_date' => $data['start_date'] ?? $data['date'] ?? null,
                ':end_date' => $data['end_date'] ?? null,
                ':status' => $data['status'] ?? 'pending',
                ':total_cost' => $data['total_cost'] ?? 0,
                ':is_paid' => $data['is_paid'] ?? 0,
                ':coordinates' => isset($data['coordinates']) ? json_encode($data['coordinates']) : null
            ]);
            
            $jobId = $db->lastInsertId();
            $stmt = $db->prepare("SELECT * FROM jobs WHERE id = ?");
            $stmt->execute([$jobId]);
            $job = convertKeys($stmt->fetch());
            if (isset($job['coordinates'])) $job['coordinates'] = json_decode($job['coordinates'], true);
            if (isset($job['assignedWorkers'])) $job['assignedWorkers'] = json_decode($job['assignedWorkers'], true);
            if (isset($job['paints'])) $job['paints'] = json_decode($job['paints'], true);
            
            sendSuccess($job, 'Η εργασία δημιουργήθηκε επιτυχώς');
            break;
            
        case 'PUT':
            if (!isset($_GET['id'])) sendError('Το ID είναι υποχρεωτικό');
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) sendError('Δεν υπάρχουν δεδομένα');
            
            $data = convertToSnakeCase($input);
            
            // Check if job exists first
            $checkStmt = $db->prepare("SELECT id FROM jobs WHERE id = ?");
            $checkStmt->execute([$_GET['id']]);
            if (!$checkStmt->fetch()) {
                sendError('Η εργασία δεν βρέθηκε', 404);
            }
            
            $stmt = $db->prepare("
                UPDATE jobs 
                SET client_id = :client_id, title = :title, type = :type, date = :date, 
                    next_visit = :next_visit, description = :description,
                    address = :address, city = :city, postal_code = :postal_code,
                    rooms = :rooms, area = :area, substrate = :substrate,
                    materials_cost = :materials_cost, kilometers = :kilometers,
                    billing_hours = :billing_hours, billing_rate = :billing_rate,
                    vat = :vat, cost_per_km = :cost_per_km, notes = :notes,
                    assigned_workers = :assigned_workers, paints = :paints,
                    start_date = :start_date, end_date = :end_date, status = :status,
                    total_cost = :total_cost, is_paid = :is_paid, coordinates = :coordinates
                WHERE id = :id
            ");
            
            $stmt->execute([
                ':id' => $_GET['id'],
                ':client_id' => $data['client_id'],
                ':title' => $data['title'] ?? ($data['type'] ?? 'Εργασία'),
                ':type' => $data['type'] ?? null,
                ':date' => $data['date'] ?? null,
                ':next_visit' => $data['next_visit'] ?? null,
                ':description' => $data['description'] ?? null,
                ':address' => $data['address'] ?? null,
                ':city' => $data['city'] ?? null,
                ':postal_code' => $data['postal_code'] ?? null,
                ':rooms' => $data['rooms'] ?? null,
                ':area' => $data['area'] ?? null,
                ':substrate' => $data['substrate'] ?? null,
                ':materials_cost' => $data['materials_cost'] ?? 0,
                ':kilometers' => $data['kilometers'] ?? 0,
                ':billing_hours' => $data['billing_hours'] ?? 0,
                ':billing_rate' => $data['billing_rate'] ?? 50,
                ':vat' => $data['vat'] ?? 24,
                ':cost_per_km' => $data['cost_per_km'] ?? 0.5,
                ':notes' => $data['notes'] ?? null,
                ':assigned_workers' => isset($input['assignedWorkers']) ? json_encode($input['assignedWorkers']) : null,
                ':paints' => isset($input['paints']) ? json_encode($input['paints']) : null,
                ':start_date' => $data['start_date'] ?? $data['date'] ?? null,
                ':end_date' => $data['end_date'] ?? null,
                ':status' => $data['status'] ?? 'pending',
                ':total_cost' => $data['total_cost'] ?? 0,
                ':is_paid' => $data['is_paid'] ?? 0,
                ':coordinates' => isset($data['coordinates']) ? json_encode($data['coordinates']) : null
            ]);
            
            $stmt = $db->prepare("SELECT * FROM jobs WHERE id = ?");
            $stmt->execute([$_GET['id']]);
            $job = convertKeys($stmt->fetch());
            if (isset($job['coordinates'])) $job['coordinates'] = json_decode($job['coordinates'], true);
            if (isset($job['assignedWorkers'])) $job['assignedWorkers'] = json_decode($job['assignedWorkers'], true);
            if (isset($job['paints'])) $job['paints'] = json_decode($job['paints'], true);
            
            sendSuccess($job, 'Η εργασία ενημερώθηκε επιτυχώς');
            break;
            
        case 'DELETE':
            if (!isset($_GET['id'])) sendError('Το ID είναι υποχρεωτικό');
            $stmt = $db->prepare("DELETE FROM jobs WHERE id = ?");
            $stmt->execute([$_GET['id']]);
            $stmt->rowCount() > 0 ? sendSuccess(null, 'Η εργασία διαγράφηκε') : sendError('Δεν βρέθηκε', 404);
            break;
            
        default:
            sendError('Μη έγκυρη μέθοδος', 405);
    }
} catch (Exception $e) {
    error_log("Jobs API Error: " . $e->getMessage());
    sendError('Σφάλμα: ' . $e->getMessage(), 500);
}
?>
