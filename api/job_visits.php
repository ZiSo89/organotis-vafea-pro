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
        $hours = (float)($w['hours'] ?? $w['hoursAllocated'] ?? $w['hours_allocated'] ?? 0);
        // Keep a selected worker even when the visit currently has 0 minutes.
        // Otherwise a quick session / manual edit would erase its crew.
        $hours = max(0, $hours);
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

function normalize_visit_datetime($value) {
    if ($value === null || $value === '') return null;
    if ($value instanceof DateTime) return $value->format('Y-m-d H:i:s');
    if (is_numeric($value)) return date('Y-m-d H:i:s', (int)$value);
    $text = trim((string)$value);
    if ($text === '') return null;
    try {
        $dt = new DateTime($text);
        return $dt->format('Y-m-d H:i:s');
    } catch (Exception $e) {
        return null;
    }
}

function normalize_visit_activity($data, $defaultJobId = null) {
    $jobId = (int)($data['job_id'] ?? $data['jobId'] ?? $defaultJobId ?? 0);
    $visitDate = !empty($data['visit_date'] ?? $data['visitDate'])
        ? substr((string)(normalize_visit_datetime($data['visit_date'] ?? $data['visitDate']) ?? date('Y-m-d H:i:s')), 0, 10)
        : date('Y-m-d');
    $startedAt = normalize_visit_datetime($data['session_started_at'] ?? $data['sessionStartedAt'] ?? null);
    if ($startedAt === null && isset($data['started_at'])) {
        $startedAt = normalize_visit_datetime($data['started_at']);
    }
    $endedAt = normalize_visit_datetime($data['session_ended_at'] ?? $data['sessionEndedAt'] ?? null);
    if ($endedAt === null && isset($data['ended_at'])) {
        $endedAt = normalize_visit_datetime($data['ended_at']);
    }
    $isActive = isset($data['is_active']) ? (int)$data['is_active'] : (isset($data['isActive']) ? (int)$data['isActive'] : 0);
    $duration = isset($data['session_duration_minutes']) ? (int)$data['session_duration_minutes'] : (isset($data['sessionDurationMinutes']) ? (int)$data['sessionDurationMinutes'] : 0);
    if ($startedAt && $endedAt && $duration <= 0) {
        $duration = max(0, (int)round((strtotime($endedAt) - strtotime($startedAt)) / 60));
    }
    return [
        'jobId' => $jobId,
        'visitDate' => $visitDate,
        'startedAt' => $startedAt,
        'endedAt' => $endedAt,
        'isActive' => $isActive,
        'duration' => max(0, $duration),
    ];
}

try {
    switch ($method) {
        case 'GET':
            if (isset($_GET['id'])) {
                $stmt = $db->prepare(visit_select_sql() . " WHERE jv.id = ?");
                $stmt->execute([$_GET['id']]);
                $visit = $stmt->fetch();
                $visit ? sendSuccess(format_visit_row($visit)) : sendError('Η επίσκεψη δεν βρέθηκε', 404);
            } elseif (isset($_GET['job_id']) && isset($_GET['active'])) {
                $stmt = $db->prepare(visit_select_sql() . " WHERE jv.job_id = ? AND jv.is_active = 1 ORDER BY jv.id DESC LIMIT 1");
                $stmt->execute([$_GET['job_id']]);
                $visit = $stmt->fetch();
                sendSuccess($visit ? format_visit_row($visit) : null);
            } elseif (isset($_GET['active'])) {
                // Όλες οι ενεργές συνεδρίες (για Start/Stop στη λίστα εργασιών)
                $stmt = $db->query(visit_select_sql() . " WHERE jv.is_active = 1 ORDER BY jv.id DESC");
                sendSuccess(array_map('format_visit_row', $stmt->fetchAll()));
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
            if (isset($_GET['action']) && $_GET['action'] === 'toggle') {
                $input = json_decode(file_get_contents('php://input'), true) ?: [];
                $data = convertToSnakeCase($input);
                $jobId = (int)($data['job_id'] ?? $data['jobId'] ?? 0);
                if ($jobId <= 0) sendError('Η εργασία είναι υποχρεωτική');

                $check = $db->prepare("SELECT id FROM jobs WHERE id = ?");
                $check->execute([$jobId]);
                if (!$check->fetch()) sendError('Η εργασία δεν βρέθηκε', 404);

                $activity = normalize_visit_activity($data, $jobId);
                $workers = normalize_visit_workers($input);
                $activeStmt = $db->prepare("SELECT * FROM job_visits WHERE job_id = ? AND is_active = 1 ORDER BY id DESC LIMIT 1");
                $activeStmt->execute([$jobId]);
                $activeVisit = $activeStmt->fetch();

                if ($activeVisit) {
                    $endedAt = $activity['endedAt'] ?: date('Y-m-d H:i:s');
                    $startedAt = $activeVisit['session_started_at'] ?: $activeVisit['created_at'];
                    $duration = max(0, (int)round((strtotime($endedAt) - strtotime($startedAt)) / 60));
                    // Record actual worked time for every worker selected at Start.
                    // The selected crew itself remains immutable after the session ends.
                    $sessionWorkers = json_decode($activeVisit['workers'] ?? '[]', true);
                    if (!is_array($sessionWorkers)) $sessionWorkers = [];
                    $workedHours = $duration / 60;
                    foreach ($sessionWorkers as &$worker) {
                        if (!is_array($worker)) continue;
                        $worker['hours'] = $workedHours;
                        $worker['hoursAllocated'] = $workedHours;
                        $rate = (float)($worker['hourlyRate'] ?? $worker['hourly_rate'] ?? 0);
                        $worker['laborCost'] = (($worker['workerType'] ?? $worker['worker_type'] ?? 'employee') === 'owner') ? 0 : $workedHours * $rate;
                    }
                    unset($worker);
                    $stmt = $db->prepare("
                        UPDATE job_visits
                        SET session_ended_at = :session_ended_at,
                            session_duration_minutes = :session_duration_minutes,
                            workers = :workers,
                            is_active = 0
                        WHERE id = :id
                    ");
                    $stmt->execute([
                        ':id' => $activeVisit['id'],
                        ':session_ended_at' => $endedAt,
                        ':session_duration_minutes' => $duration,
                        ':workers' => json_encode($sessionWorkers, JSON_UNESCAPED_UNICODE)
                    ]);
                    $stmt = $db->prepare(visit_select_sql() . " WHERE jv.id = ?");
                    $stmt->execute([$activeVisit['id']]);
                    $visit = $stmt->fetch();
                    sendSuccess(format_visit_row($visit), 'Η δραστηριότητα σταμάτησε');
                }

                $startedAt = $activity['startedAt'] ?: date('Y-m-d H:i:s');
                $visitDate = $activity['visitDate'] ?: date('Y-m-d');
                $stmt = $db->prepare("
                    INSERT INTO job_visits (job_id, visit_date, workers, notes, session_started_at, session_ended_at, session_duration_minutes, is_active)
                    VALUES (:job_id, :visit_date, :workers, :notes, :session_started_at, :session_ended_at, :session_duration_minutes, :is_active)
                ");
                $stmt->execute([
                    ':job_id' => $jobId,
                    ':visit_date' => $visitDate,
                    ':workers' => json_encode($workers, JSON_UNESCAPED_UNICODE),
                    ':notes' => $data['notes'] ?? null,
                    ':session_started_at' => $startedAt,
                    ':session_ended_at' => null,
                    ':session_duration_minutes' => 0,
                    ':is_active' => 1
                ]);
                $stmt = $db->prepare(visit_select_sql() . " WHERE jv.id = ?");
                $stmt->execute([$db->lastInsertId()]);
                sendSuccess(format_visit_row($stmt->fetch()), 'Η δραστηριότητα ξεκίνησε');
            }

            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) sendError('Δεν υπάρχουν δεδομένα');

            $data = convertToSnakeCase($input);
            $jobId = (int)($data['job_id'] ?? 0);
            if ($jobId <= 0) sendError('Η εργασία είναι υποχρεωτική');

            $check = $db->prepare("SELECT id FROM jobs WHERE id = ?");
            $check->execute([$jobId]);
            if (!$check->fetch()) sendError('Η εργασία δεν βρέθηκε', 404);

            $activity = normalize_visit_activity($data, $jobId);
            $visitDate = $activity['visitDate'] ?: date('Y-m-d');
            $workers = normalize_visit_workers($input);

            $stmt = $db->prepare("
                INSERT INTO job_visits (job_id, visit_date, workers, notes, session_started_at, session_ended_at, session_duration_minutes, is_active)
                VALUES (:job_id, :visit_date, :workers, :notes, :session_started_at, :session_ended_at, :session_duration_minutes, :is_active)
            ");
            $stmt->execute([
                ':job_id' => $jobId,
                ':visit_date' => $visitDate,
                ':workers' => json_encode($workers, JSON_UNESCAPED_UNICODE),
                ':notes' => $data['notes'] ?? null,
                ':session_started_at' => $activity['startedAt'],
                ':session_ended_at' => $activity['endedAt'],
                ':session_duration_minutes' => $activity['duration'],
                ':is_active' => $activity['isActive']
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
            $activity = normalize_visit_activity($data);
            $visitDate = $activity['visitDate'] ?: date('Y-m-d');
            $workers = normalize_visit_workers($input);

            $stmt = $db->prepare("
                UPDATE job_visits
                SET visit_date = :visit_date, workers = :workers, notes = :notes,
                    session_started_at = :session_started_at,
                    session_ended_at = :session_ended_at,
                    session_duration_minutes = :session_duration_minutes,
                    is_active = :is_active
                WHERE id = :id
            ");
            $stmt->execute([
                ':id' => $_GET['id'],
                ':visit_date' => $visitDate,
                ':workers' => json_encode($workers, JSON_UNESCAPED_UNICODE),
                ':notes' => $data['notes'] ?? null,
                ':session_started_at' => $activity['startedAt'],
                ':session_ended_at' => $activity['endedAt'],
                ':session_duration_minutes' => $activity['duration'],
                ':is_active' => $activity['isActive']
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
