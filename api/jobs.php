<?php
/**
 * Jobs API - Εργασίες
 */
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/auth_check.php';
require_once __DIR__ . '/calendar_helpers.php';
require_once __DIR__ . '/job_visits_schema.php';
checkAuthentication();

logApiRequest('/api/jobs.php', $_SERVER['REQUEST_METHOD'], $_GET);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

$db = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

// Εξασφάλισε τα πεδία ώρας επίσκεψης (ενοποίηση εργασίας ↔ ημερολογίου)
ensure_job_visit_columns($db);
// Εξασφάλισε job_visits / job_payments + billing_type / agreed_price
ensure_job_visits_schema($db);

/**
 * Aggregated totals από job_visits ανά εργασία.
 * @return array map: job_id => ['total_hours','employee_hours','owner_hours','labor_cost','visit_count']
 */
function fetch_all_job_visit_totals($db) {
    static $cache = null;
    if ($cache !== null) return $cache;
    $cache = [];
    try {
        $stmt = $db->query("SELECT job_id, workers FROM job_visits");
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $jid = (int)$row['job_id'];
            $t = job_visit_totals($row['workers']);
            if (!isset($cache[$jid])) {
                $cache[$jid] = ['total_hours' => 0.0, 'employee_hours' => 0.0, 'owner_hours' => 0.0, 'labor_cost' => 0.0, 'visit_count' => 0];
            }
            $cache[$jid]['total_hours'] += $t['total_hours'];
            $cache[$jid]['employee_hours'] += $t['employee_hours'];
            $cache[$jid]['owner_hours'] += $t['owner_hours'];
            $cache[$jid]['labor_cost'] += $t['labor_cost'];
            $cache[$jid]['visit_count'] += 1;
        }
    } catch (Exception $e) {
        error_log('fetch_all_job_visit_totals: ' . $e->getMessage());
    }
    return $cache;
}

// Helper: compute job-level financials (billing, net profit)
function compute_job_financials_job($job, $visitTotals = null) {
    $toFloat = function($v) {
        if ($v === null || $v === '') return 0.0;
        return (float)$v;
    };

    $billing = 0.0;

    // Συμφωνημένη τιμή (κατ' αποκοπή): τα έσοδα είναι σταθερά, ανεξάρτητα από ώρες
    $billingType = $job['billing_type'] ?? $job['billingType'] ?? 'hourly';
    $agreedPrice = $toFloat($job['agreed_price'] ?? $job['agreedPrice'] ?? 0);
    if ($billingType === 'fixed' && $agreedPrice > 0) {
        $billing = $agreedPrice;
    }

    if ($billing == 0.0 && isset($job['billing_amount'])) $billing = $toFloat($job['billing_amount']);
    if ($billing == 0.0 && isset($job['billingAmount'])) $billing = $toFloat($job['billingAmount']);

    if ($billing == 0.0) {
        $hours = $toFloat($job['billing_hours'] ?? $job['billingHours'] ?? 0);
        $rate = $toFloat($job['billing_rate'] ?? $job['billingRate'] ?? 0);
        if ($hours > 0 && $rate > 0) $billing = $hours * $rate;
    }

    if ($billing == 0.0) {
        $total_cost = $toFloat($job['total_cost'] ?? $job['totalCost'] ?? 0);
        if ($total_cost > 0) {
            $billing = $total_cost;
        }
    }

    $materials = $toFloat($job['materials_cost'] ?? $job['materialsCost'] ?? 0);
    $kilometers = $toFloat($job['kilometers'] ?? $job['km'] ?? 0);
    $cost_per_km = $toFloat($job['cost_per_km'] ?? $job['costPerKm'] ?? $job['travel_cost'] ?? 0.5);
    $travel = $kilometers * $cost_per_km;

    // Εργατικό κόστος: αν υπάρχουν καταγεγραμμένες επισκέψεις, αυτές είναι η πηγή
    // αλήθειας. Αλλιώς, από τους ανατεθειμένους εργάτες της εργασίας.
    $labor = 0.0;
    $actualHours = 0.0;
    $hasVisits = is_array($visitTotals) && ($visitTotals['visit_count'] ?? 0) > 0;
    if ($hasVisits) {
        $labor = $toFloat($visitTotals['labor_cost']);
        $actualHours = $toFloat($visitTotals['total_hours']);
    } else {
        $assigned = $job['assigned_workers'] ?? $job['assignedWorkers'] ?? $job['workers'] ?? null;
        $decoded = null;
        if ($assigned) {
            if (is_string($assigned)) {
                $decoded = json_decode($assigned, true);
                if ($decoded !== null && !is_array($decoded) && is_string($decoded)) {
                    $decoded2 = json_decode($decoded, true);
                    if (is_array($decoded2)) $decoded = $decoded2;
                }
            } elseif (is_array($assigned)) {
                $decoded = $assigned;
            }

            if (is_array($decoded)) {
                foreach ($decoded as $w) {
                    $workerType = $w['worker_type'] ?? $w['workerType'] ?? 'employee';
                    $actualHours += $toFloat($w['hours_allocated'] ?? $w['hoursAllocated'] ?? 0);
                    if ($workerType === 'owner') continue;
                    $labor += $toFloat($w['labor_cost'] ?? $w['laborCost'] ?? $w['cost'] ?? 0);
                }
            }
        }
    }

    $expenses = $materials + $labor + $travel;
    $profit = $billing - $expenses;

    return [
        'billing' => $billing,
        'materials' => $materials,
        'labor' => $labor,
        'travel' => $travel,
        'expenses' => $expenses,
        'profit' => $profit,
        'actual_hours' => $actualHours,
        'visit_count' => $hasVisits ? (int)$visitTotals['visit_count'] : 0
    ];
}

function encode_job_json_field($input, $key) {
    if (!array_key_exists($key, $input)) return null;
    $value = $input[$key];
    if (is_array($value)) {
        return json_encode($value, JSON_UNESCAPED_UNICODE);
    }
    if (is_string($value)) {
        $decoded = json_decode($value, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            return json_encode($decoded, JSON_UNESCAPED_UNICODE);
        }
        return $value;
    }
    return null;
}

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
                    // Add computed financials
                    $visitTotalsMap = fetch_all_job_visit_totals($db);
                    $fin = compute_job_financials_job($job, $visitTotalsMap[(int)$job['id']] ?? null);
                    $job['billing_amount'] = (float)$fin['billing'];
                    $job['net_profit'] = (float)$fin['profit'];
                    $job['actual_hours'] = (float)$fin['actual_hours'];
                    $job['visit_count'] = (int)$fin['visit_count'];
                    sendSuccess($job);
                } else {
                    sendError('Η εργασία δεν βρέθηκε', 404);
                }
            } else {
                $stmt = $db->query("
                    SELECT 
                        j.*,
                        c.name as client_name,
                        c.phone as client_phone
                    FROM jobs j
                    LEFT JOIN clients c ON j.client_id = c.id
                    ORDER BY j.created_at DESC
                ");
                $visitTotalsMap = fetch_all_job_visit_totals($db);
                $jobs = array_map(function($job) use ($visitTotalsMap) {
                    $job = convertKeys($job);
                    if (isset($job['coordinates'])) $job['coordinates'] = json_decode($job['coordinates'], true);
                    if (isset($job['assignedWorkers'])) $job['assignedWorkers'] = json_decode($job['assignedWorkers'], true);
                    if (isset($job['paints'])) $job['paints'] = json_decode($job['paints'], true);
                    // Add computed financials
                    $fin = compute_job_financials_job($job, $visitTotalsMap[(int)$job['id']] ?? null);
                    $job['billing_amount'] = (float)$fin['billing'];
                    $job['net_profit'] = (float)$fin['profit'];
                    $job['actual_hours'] = (float)$fin['actual_hours'];
                    $job['visit_count'] = (int)$fin['visit_count'];
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
            
            // Auto-set date to NOW if not provided
            if (!isset($data['date']) || empty($data['date'])) {
                $data['date'] = date('Y-m-d');
            }
            
            // Auto-update is_paid based on status
            if (isset($data['status']) && $data['status'] === 'Εξοφλήθηκε') {
                $data['is_paid'] = 1;
            } elseif (!isset($data['is_paid'])) {
                $data['is_paid'] = 0;
            }
            
            $stmt = $db->prepare("
                INSERT INTO jobs (
                    client_id, title, type, date, next_visit, visit_end_date, visit_start_time, visit_end_time, visit_all_day,
                    description, address, city, postal_code,
                    rooms, area, substrate, materials_cost, kilometers, billing_hours, billing_rate,
                    billing_type, agreed_price,
                    cost_per_km, notes, assigned_workers, paints,
                    start_date, end_date, status, total_cost, is_paid, coordinates
                )
                VALUES (
                    :client_id, :title, :type, :date, :next_visit, :visit_end_date, :visit_start_time, :visit_end_time, :visit_all_day,
                    :description, :address, :city, :postal_code,
                    :rooms, :area, :substrate, :materials_cost, :kilometers, :billing_hours, :billing_rate,
                    :billing_type, :agreed_price,
                    :cost_per_km, :notes, :assigned_workers, :paints,
                    :start_date, :end_date, :status, :total_cost, :is_paid, :coordinates
                )
            ");
            
            $stmt->execute([
                ':client_id' => $data['client_id'],
                ':title' => $data['title'] ?? ($data['type'] ?? 'Νέα Εργασία'),
                ':type' => $data['type'] ?? null,
                ':date' => $data['date'] ?? null,
                ':next_visit' => $data['next_visit'] ?? null,
                ':visit_end_date' => !empty($data['visit_end_date']) ? $data['visit_end_date'] : null,
                ':visit_start_time' => !empty($data['visit_start_time']) ? $data['visit_start_time'] : null,
                ':visit_end_time' => !empty($data['visit_end_time']) ? $data['visit_end_time'] : null,
                ':visit_all_day' => isset($data['visit_all_day']) ? (int)$data['visit_all_day'] : 1,
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
                ':billing_type' => ($data['billing_type'] ?? 'hourly') === 'fixed' ? 'fixed' : 'hourly',
                ':agreed_price' => $data['agreed_price'] ?? 0,
                ':cost_per_km' => $data['cost_per_km'] ?? 0.5,
                ':notes' => $data['notes'] ?? null,
                ':assigned_workers' => encode_job_json_field($input, 'assignedWorkers'),
                ':paints' => encode_job_json_field($input, 'paints'),
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

            // Αυτόματος συγχρονισμός με το ημερολόγιο (+ Google αν συνδεδεμένο) — χωρίς κουμπί
            try { upsert_calendar_event_for_job($db, $jobId); } catch (Exception $e) { error_log('job->calendar upsert: ' . $e->getMessage()); }

            sendSuccess($job, 'Η εργασία δημιουργήθηκε επιτυχώς');
            break;
            
        case 'PUT':
            if (!isset($_GET['id'])) sendError('Το ID είναι υποχρεωτικό');
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) sendError('Δεν υπάρχουν δεδομένα');
            
            $data = convertToSnakeCase($input);
            
            // When editing, preserve existing date if not provided
            if (!isset($data['date']) || empty($data['date'])) {
                $existingStmt = $db->prepare("SELECT date FROM jobs WHERE id = ?");
                $existingStmt->execute([$_GET['id']]);
                $existing = $existingStmt->fetch();
                if ($existing && $existing['date']) {
                    $data['date'] = $existing['date'];
                } else {
                    $data['date'] = date('Y-m-d');
                }
            }
            
            // Auto-update is_paid based on status
            if (isset($data['status']) && $data['status'] === 'Εξοφλήθηκε') {
                $data['is_paid'] = 1;
            } elseif (!isset($data['is_paid'])) {
                $data['is_paid'] = 0;
            }
            
            // Check if job exists first + φόρτωσε υπάρχοντα πεδία προγραμματισμού
            $checkStmt = $db->prepare("SELECT id, next_visit, visit_end_date, end_date, visit_start_time, visit_end_time, visit_all_day FROM jobs WHERE id = ?");
            $checkStmt->execute([$_GET['id']]);
            $existingJob = $checkStmt->fetch(PDO::FETCH_ASSOC);
            if (!$existingJob) {
                sendError('Η εργασία δεν βρέθηκε', 404);
            }

            // Η φόρμα εργασίας δεν στέλνει end_date — μην το μηδενίσεις όταν αλλάζεις άλλα πεδία
            if (!array_key_exists('end_date', $data) || $data['end_date'] === '' || $data['end_date'] === null) {
                $data['end_date'] = $existingJob['end_date'];
            }
            if (!array_key_exists('visit_end_date', $data)) {
                $data['visit_end_date'] = $existingJob['visit_end_date'] ?? null;
            } elseif ($data['visit_end_date'] === '' || $data['visit_end_date'] === null) {
                $data['visit_end_date'] = null;
            }
            // Διατήρηση next_visit αν δεν στάλθηκε (defensive)
            if (!array_key_exists('next_visit', $data)) {
                $data['next_visit'] = $existingJob['next_visit'];
            }
            
            $stmt = $db->prepare("
                UPDATE jobs 
                SET client_id = :client_id, title = :title, type = :type, date = :date, 
                    next_visit = :next_visit, visit_end_date = :visit_end_date, visit_start_time = :visit_start_time,
                    visit_end_time = :visit_end_time, visit_all_day = :visit_all_day,
                    description = :description,
                    address = :address, city = :city, postal_code = :postal_code,
                    rooms = :rooms, area = :area, substrate = :substrate,
                    materials_cost = :materials_cost, kilometers = :kilometers,
                    billing_hours = :billing_hours, billing_rate = :billing_rate,
                    billing_type = :billing_type, agreed_price = :agreed_price,
                    cost_per_km = :cost_per_km, notes = :notes,
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
                ':visit_end_date' => !empty($data['visit_end_date']) ? $data['visit_end_date'] : null,
                ':visit_start_time' => !empty($data['visit_start_time']) ? $data['visit_start_time'] : null,
                ':visit_end_time' => !empty($data['visit_end_time']) ? $data['visit_end_time'] : null,
                ':visit_all_day' => isset($data['visit_all_day']) ? (int)$data['visit_all_day'] : 1,
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
                ':billing_type' => ($data['billing_type'] ?? 'hourly') === 'fixed' ? 'fixed' : 'hourly',
                ':agreed_price' => $data['agreed_price'] ?? 0,
                ':cost_per_km' => $data['cost_per_km'] ?? 0.5,
                ':notes' => $data['notes'] ?? null,
                ':assigned_workers' => encode_job_json_field($input, 'assignedWorkers'),
                ':paints' => encode_job_json_field($input, 'paints'),
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

            // Αυτόματος συγχρονισμός με το ημερολόγιο (+ Google αν συνδεδεμένο) — χωρίς κουμπί
            try { upsert_calendar_event_for_job($db, $_GET['id']); } catch (Exception $e) { error_log('job->calendar upsert: ' . $e->getMessage()); }

            sendSuccess($job, 'Η εργασία ενημερώθηκε επιτυχώς');
            break;
            
        case 'DELETE':
            if (!isset($_GET['id'])) sendError('Το ID είναι υποχρεωτικό');

            // Σβήσε πρώτα τις συνδεδεμένες επισκέψεις ημερολογίου (+ Google)
            try {
                $evStmt = $db->prepare("SELECT id, google_event_id FROM calendar_events WHERE job_id = ?");
                $evStmt->execute([$_GET['id']]);
                foreach ($evStmt->fetchAll(PDO::FETCH_ASSOC) as $ev) {
                    if (!empty($ev['google_event_id'])) {
                        google_delete_remote_event($ev['google_event_id']);
                    }
                }
                $db->prepare("DELETE FROM calendar_events WHERE job_id = ?")->execute([$_GET['id']]);
            } catch (Exception $e) { error_log('job delete -> calendar cleanup: ' . $e->getMessage()); }

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
