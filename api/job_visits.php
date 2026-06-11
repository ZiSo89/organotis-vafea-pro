<?php
/**
 * Job Visits API - Επισκέψεις εργασίας (ώρες ανά εργάτη / επίσκεψη)
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/auth_check.php';
require_once __DIR__ . '/job_visits_schema.php';

checkAuthentication();

logApiRequest('/api/job_visits.php', $_SERVER['REQUEST_METHOD'], $_GET);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

$db = getDBConnection();
ensure_job_visits_schema($db);
$method = $_SERVER['REQUEST_METHOD'];

function visit_select_sql() {
    return "
        SELECT
            jv.*,
            j.title AS job_title,
            j.client_id AS client_id,
            c.name AS client_name
        FROM job_visits jv
        INNER JOIN jobs j ON j.id = jv.job_id
        LEFT JOIN clients c ON c.id = j.client_id
    ";
}

function format_visit_row($row) {
    $row = convertKeys($row);
    if (isset($row['workers'])) {
        $decoded = is_string($row['workers']) ? json_decode($row['workers'], true) : $row['workers'];
        $row['workers'] = is_array($decoded) ? $decoded : [];
    } else {
        $row['workers'] = [];
    }
    $totals = job_visit_totals($row['workers']);
    $row['totalHours'] = $totals['total_hours'];
    $row['employeeHours'] = $totals['employee_hours'];
    $row['ownerHours'] = $totals['owner_hours'];
    $row['laborCost'] = $totals['labor_cost'];
    return $row;
}

function normalize_visit_workers($input) {
    $workers = $input['workers'] ?? [];
    if (is_string($workers)) {
        $decoded = json_decode($workers, true);
        $workers = is_array($decoded) ? $decoded : [];
    }
    if (!is_array($workers)) $workers = [];

    $normalized = [];
    foreach ($workers as $w) {
        if (!is_array($w)) continue;
        $hours = (float)($w['hours'] ?? $w['hoursAllocated'] ?? 0);
        if ($hours <= 0) continue;
        $rate = (float)($w['hourlyRate'] ?? $w['hourly_rate'] ?? 0);
        $type = ($w['workerType'] ?? $w['worker_type'] ?? 'employee') === 'owner' ? 'owner' : 'employee';
        $normalized[] = [
            'workerId' => isset($w['workerId']) ? (int)$w['workerId'] : (isset($w['worker_id']) ? (int)$w['worker_id'] : null),
            'workerName' => $w['workerName'] ?? $w['worker_name'] ?? '',
            'workerType' => $type,
            'hourlyRate' => $rate,
            'hours' => $hours,
            'laborCost' => $type === 'owner' ? 0 : $hours * $rate,
        ];
    }
    return $normalized;
}

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                $stmt = $db->prepare(visit_select_sql() . " WHERE jv.id = ?");
                $stmt->execute([$_GET['id']]);
                $visit = $stmt->fetch();
                $visit ? sendSuccess(format_visit_row($visit)) : sendError('Η επίσκεψη δεν βρέθηκε', 404);
            } elseif (isset($_GET['job_id'])) {
                $stmt = $db->prepare(visit_select_sql() . " WHERE jv.job_id = ? ORDER BY jv.visit_date DESC, jv.id DESC");
                $stmt->execute([$_GET['job_id']]);
                sendSuccess(array_map('format_visit_row', $stmt->fetchAll()));
            } else {
                $stmt = $db->query(visit_select_sql() . " ORDER BY jv.visit_date DESC, jv.id DESC");
                sendSuccess(array_map('format_visit_row', $stmt->fetchAll()));
            }
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) sendError('Δεν υπάρχουν δεδομένα');

            $data = convertToSnakeCase($input);
            $jobId = (int)($data['job_id'] ?? 0);
            if ($jobId <= 0) sendError('Η εργασία είναι υποχρεωτική');

            $check = $db->prepare("SELECT id FROM jobs WHERE id = ?");
            $check->execute([$jobId]);
            if (!$check->fetch()) sendError('Η εργασία δεν βρέθηκε', 404);

            $visitDate = !empty($data['visit_date']) ? $data['visit_date'] : date('Y-m-d');
            $workers = normalize_visit_workers($input);

            $stmt = $db->prepare("
                INSERT INTO job_visits (job_id, visit_date, workers, notes)
                VALUES (:job_id, :visit_date, :workers, :notes)
            ");
            $stmt->execute([
                ':job_id' => $jobId,
                ':visit_date' => $visitDate,
                ':workers' => json_encode($workers, JSON_UNESCAPED_UNICODE),
                ':notes' => $data['notes'] ?? null
            ]);

            $stmt = $db->prepare(visit_select_sql() . " WHERE jv.id = ?");
            $stmt->execute([$db->lastInsertId()]);
            sendSuccess(format_visit_row($stmt->fetch()), 'Η επίσκεψη καταχωρήθηκε επιτυχώς');
            break;

        case 'PUT':
            if (!isset($_GET['id'])) sendError('Το ID είναι υποχρεωτικό');
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) sendError('Δεν υπάρχουν δεδομένα');

            $data = convertToSnakeCase($input);
            $visitDate = !empty($data['visit_date']) ? $data['visit_date'] : date('Y-m-d');
            $workers = normalize_visit_workers($input);

            $stmt = $db->prepare("
                UPDATE job_visits
                SET visit_date = :visit_date, workers = :workers, notes = :notes
                WHERE id = :id
            ");
            $stmt->execute([
                ':id' => $_GET['id'],
                ':visit_date' => $visitDate,
                ':workers' => json_encode($workers, JSON_UNESCAPED_UNICODE),
                ':notes' => $data['notes'] ?? null
            ]);

            $stmt = $db->prepare(visit_select_sql() . " WHERE jv.id = ?");
            $stmt->execute([$_GET['id']]);
            $visit = $stmt->fetch();
            $visit ? sendSuccess(format_visit_row($visit), 'Η επίσκεψη ενημερώθηκε επιτυχώς') : sendError('Η επίσκεψη δεν βρέθηκε', 404);
            break;

        case 'DELETE':
            if (!isset($_GET['id'])) sendError('Το ID είναι υποχρεωτικό');
            $stmt = $db->prepare("DELETE FROM job_visits WHERE id = ?");
            $stmt->execute([$_GET['id']]);
            $stmt->rowCount() > 0 ? sendSuccess(null, 'Η επίσκεψη διαγράφηκε') : sendError('Δεν βρέθηκε', 404);
            break;

        default:
            sendError('Μη έγκυρη μέθοδος', 405);
    }
} catch (Exception $e) {
    error_log("Job Visits API Error: " . $e->getMessage());
    sendError('Σφάλμα: ' . $e->getMessage(), 500);
}
?>
