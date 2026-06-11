<?php
/* ========================================
   Calendar API - Διαχείριση Επισκέψεων
   ======================================== */

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0); // Disable display to avoid breaking JSON
ini_set('log_errors', 1);

require_once '../config/database.php';
require_once __DIR__ . '/auth_check.php';
require_once __DIR__ . '/calendar_helpers.php';
require_once __DIR__ . '/job_visits_schema.php';

checkAuthentication();

// Set headers after all processing
function sendResponse($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

// Get database connection
$conn = getDBConnection();

// Log API request
logApiRequest('/api/calendar.php', $_SERVER['REQUEST_METHOD'], $_GET);

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

// Check for special action parameter
$action = $_GET['action'] ?? null;

// Handle sync action
if ($action === 'sync') {
    handleSync($conn);
    exit;
}

// Handle list action for Electron sync
if ($action === 'list') {
    handleList($conn);
    exit;
}

// Handle different HTTP methods
switch($method) {
    case 'GET':
        handleGet($conn);
        break;
    case 'PUT':
        handlePut($conn);
        break;
    case 'DELETE':
        handleDelete($conn);
        break;
    default:
        sendResponse(['error' => 'Method not allowed'], 405);
        break;
}

/* ========================================
   GET - Λήψη επισκέψεων
   ======================================== */
function handleGet($conn) {
    try {
        // Get query parameters
        $start = $_GET['start'] ?? null;
        $end = $_GET['end'] ?? null;
        
        // Build query - παίρνουμε τις επισκέψεις από calendar_events
        $query = "
            SELECT 
                ce.id,
                ce.title,
                ce.original_title,
                ce.start_date,
                ce.end_date,
                ce.start_time,
                ce.end_time,
                ce.all_day,
                ce.status,
                ce.description,
                ce.address,
                ce.color,
                ce.client_id,
                ce.job_id,
                c.name as client_name,
                c.phone as client_phone,
                j.title as job_title
            FROM calendar_events ce
            LEFT JOIN clients c ON ce.client_id = c.id
            LEFT JOIN jobs j ON ce.job_id = j.id
            WHERE 1=1
        ";
        
        // Add date range filter if provided
        if ($start && $end) {
            $query .= " AND (
                (ce.start_date BETWEEN :start1 AND :end1) OR
                (ce.end_date BETWEEN :start2 AND :end2) OR
                (ce.start_date <= :start3 AND ce.end_date >= :end3)
            )";
        }
        
        $query .= " ORDER BY ce.start_date ASC";
        
        $stmt = $conn->prepare($query);
        
        if ($start && $end) {
            $stmt->bindParam(':start1', $start);
            $stmt->bindParam(':end1', $end);
            $stmt->bindParam(':start2', $start);
            $stmt->bindParam(':end2', $end);
            $stmt->bindParam(':start3', $start);
            $stmt->bindParam(':end3', $end);
        }
        
        $stmt->execute();
        $calendarEvents = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Μετατροπή σε FullCalendar format
        $events = [];
        foreach ($calendarEvents as $event) {
            $color = $event['color'] ?: getEventColor($event['status']);
            
            // Δημιουργία πλούσιου τίτλου με πελάτη για το ημερολόγιο
            // clean_title = original_title (αν υπάρχει) αλλιώς title
            $cleanTitle = !empty($event['original_title']) ? $event['original_title'] : $event['title'];
            $displayTitle = '';
            
            // Build display title based on what we have
            if (!empty($cleanTitle) && !empty($event['client_name']) && trim($cleanTitle) !== trim($event['client_name'])) {
                // Both title and client: "Title - ClientName"
                $displayTitle = $cleanTitle . ' - ' . $event['client_name'];
            } else if (!empty($cleanTitle)) {
                // Only title, no client
                $displayTitle = $cleanTitle;
            } else if (!empty($event['client_name'])) {
                // Only client, no title - just show client name without " - "
                $displayTitle = $event['client_name'];
            } else {
                // Neither - fallback
                $displayTitle = 'Επίσκεψη';
            }
            
            // Format start and end with time if not all-day
            $start = substr($event['start_date'], 0, 10); // Get only YYYY-MM-DD part
            $end = $event['end_date'] ? substr($event['end_date'], 0, 10) : $start;
            
            if (!$event['all_day']) {
                if ($event['start_time']) {
                    $start .= 'T' . $event['start_time'];
                }
                
                // If we have an end_time, use it; otherwise use start_time + 1 hour as default
                if ($event['end_time']) {
                    $end .= 'T' . $event['end_time'];
                } else if ($event['start_time']) {
                    // Add 1 hour to start_time for default end
                    $startDateOnly = substr($event['start_date'], 0, 10);
                    $endDateTime = new DateTime($startDateOnly . ' ' . $event['start_time']);
                    $endDateTime->modify('+1 hour');
                    $end = $endDateTime->format('Y-m-d\TH:i:s');
                }
            } else if ($event['end_date']) {
                // For all-day events, FullCalendar uses EXCLUSIVE end dates
                // Add 1 day to make the end date inclusive in the display
                $endDateTime = new DateTime($end);
                $endDateTime->modify('+1 day');
                $end = $endDateTime->format('Y-m-d');
            }
            
            $events[] = [
                'id' => $event['id'],
                'title' => $displayTitle,
                'start' => $start,
                'end' => $end,
                'allDay' => (bool)$event['all_day'],
                'backgroundColor' => $color,
                'borderColor' => $color,
                'extendedProps' => [
                    'original_title' => $cleanTitle, // Clean title χωρίς το όνομα πελάτη
                    'status' => $event['status'],
                    'client_id' => $event['client_id'],
                    'client_name' => $event['client_name'],
                    'client_phone' => $event['client_phone'],
                    'address' => $event['address'],
                    'description' => $event['description'],
                    'job_id' => $event['job_id'],
                    'job_title' => $event['job_title'],
                    'start_time' => $event['start_time'],
                    'end_time' => $event['end_time']
                ]
            ];
        }
        
        // Καταγεγραμμένες επισκέψεις εργασιών (job_visits) — read-only events
        try {
            ensure_job_visits_schema($conn);
            $vQuery = "
                SELECT jv.id, jv.job_id, jv.visit_date, jv.workers, jv.notes,
                       j.title AS job_title, c.name AS client_name
                FROM job_visits jv
                INNER JOIN jobs j ON j.id = jv.job_id
                LEFT JOIN clients c ON c.id = j.client_id
            ";
            $vParams = [];
            if ($start && $end) {
                $vQuery .= " WHERE jv.visit_date BETWEEN :start AND :end";
                $vParams = [':start' => $start, ':end' => $end];
            }
            $vStmt = $conn->prepare($vQuery);
            $vStmt->execute($vParams);
            foreach ($vStmt->fetchAll(PDO::FETCH_ASSOC) as $visit) {
                $totals = job_visit_totals($visit['workers']);
                $who = $visit['client_name'] ?: ($visit['job_title'] ?: 'Εργασία');
                $hoursLabel = $totals['total_hours'] > 0 ? ' (' . rtrim(rtrim(number_format($totals['total_hours'], 1, '.', ''), '0'), '.') . 'ω)' : '';
                $events[] = [
                    'id' => 'jobvisit-' . $visit['id'],
                    'title' => '✔ ' . $who . $hoursLabel,
                    'start' => substr($visit['visit_date'], 0, 10),
                    'allDay' => true,
                    'editable' => false,
                    'backgroundColor' => '#64748b',
                    'borderColor' => '#64748b',
                    'extendedProps' => [
                        'readonly_visit' => true,
                        'visit_id' => (int)$visit['id'],
                        'job_id' => (int)$visit['job_id'],
                        'job_title' => $visit['job_title'],
                        'client_name' => $visit['client_name'],
                        'description' => $visit['notes'],
                        'total_hours' => $totals['total_hours'],
                        'labor_cost' => $totals['labor_cost']
                    ]
                ];
            }
        } catch (Exception $e) {
            error_log('calendar job_visits events: ' . $e->getMessage());
        }

        sendResponse($events);
        
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

/* ========================================
   PUT - Ενημέρωση επίσκεψης
   ======================================== */
function handlePut($conn) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['id'])) {
            sendResponse(['error' => 'Missing event ID'], 400);
            return;
        }
        
        // Build dynamic update query based on provided fields
        $updateFields = [];
        $params = [':id' => $data['id']];
        
        if (isset($data['title'])) {
            $updateFields[] = "title = :title";
            $params[':title'] = $data['title'];
        }
        
        if (isset($data['original_title'])) {
            $updateFields[] = "original_title = :original_title";
            $params[':original_title'] = $data['original_title'];
        }
        
        if (isset($data['start_date'])) {
            $updateFields[] = "start_date = :start_date";
            $params[':start_date'] = $data['start_date'];
        }
        
        if (isset($data['end_date'])) {
            $updateFields[] = "end_date = :end_date";
            $params[':end_date'] = $data['end_date'];
        }
        
        if (isset($data['start_time'])) {
            $updateFields[] = "start_time = :start_time";
            $params[':start_time'] = $data['start_time'];
        }
        
        if (isset($data['end_time'])) {
            $updateFields[] = "end_time = :end_time";
            $params[':end_time'] = $data['end_time'];
        }
        
        if (isset($data['all_day'])) {
            $updateFields[] = "all_day = :all_day";
            $params[':all_day'] = $data['all_day'];
        }
        
        if (isset($data['client_id'])) {
            $updateFields[] = "client_id = :client_id";
            $params[':client_id'] = $data['client_id'];
        }
        
        if (isset($data['job_id'])) {
            $updateFields[] = "job_id = :job_id";
            $params[':job_id'] = $data['job_id'];
        }
        
        if (isset($data['address'])) {
            $updateFields[] = "address = :address";
            $params[':address'] = $data['address'];
        }
        
        if (isset($data['description'])) {
            $updateFields[] = "description = :description";
            $params[':description'] = $data['description'];
        }
        
        if (isset($data['status'])) {
            $updateFields[] = "status = :status";
            $params[':status'] = $data['status'];
        }
        
        if (isset($data['color'])) {
            $updateFields[] = "color = :color";
            $params[':color'] = $data['color'];
        }
        
        if (empty($updateFields)) {
            sendResponse(['error' => 'No fields to update'], 400);
            return;
        }
        
        $updateFields[] = "updated_at = NOW()";
        
        $query = "UPDATE calendar_events SET " . implode(', ', $updateFields) . " WHERE id = :id";
        
        $stmt = $conn->prepare($query);
        $stmt->execute($params);

        // Τίτλος επίσκεψης → τίτλος εργασίας (αν συνδέεται)
        if (isset($data['title']) || isset($data['original_title'])) {
            $evStmt = $conn->prepare("SELECT job_id FROM calendar_events WHERE id = ?");
            $evStmt->execute([$data['id']]);
            $linkedJobId = $evStmt->fetchColumn();
            if ($linkedJobId) {
                $newTitle = $data['title'] ?? $data['original_title'] ?? null;
                if ($newTitle) {
                    $conn->prepare("UPDATE jobs SET title = ?, updated_at = NOW() WHERE id = ?")
                        ->execute([$newTitle, $linkedJobId]);
                }
            }
        }

        // Αντίστροφος συγχρονισμός: αν η επίσκεψη είναι συνδεδεμένη με εργασία,
        // ενημέρωσε την εργασία (ημερομηνία/ώρες) ώστε τα δεδομένα να μένουν ενοποιημένα.
        sync_event_back_to_job($conn, $data['id']);

        // Auto-push στο Google (αν υπάρχει σύνδεση)
        calendar_push_event_to_google($conn, $data['id']);

        sendResponse([
            'success' => true,
            'message' => 'Η επίσκεψη ενημερώθηκε'
        ]);
        
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

/* ========================================
   DELETE - Διαγραφή επίσκεψης
   ======================================== */
function handleDelete($conn) {
    try {
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            sendResponse(['error' => 'Missing event ID'], 400);
            return;
        }

        // Κράτησε google_event_id + job_id πριν τη διαγραφή
        $sel = $conn->prepare("SELECT google_event_id, job_id FROM calendar_events WHERE id = ?");
        $sel->execute([$id]);
        $info = $sel->fetch(PDO::FETCH_ASSOC) ?: [];
        $googleEventId = $info['google_event_id'] ?? null;
        $jobId = $info['job_id'] ?? null;

        // Delete calendar event (NOT the job!)
        $query = "DELETE FROM calendar_events WHERE id = :id";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();

        // Συνδεδεμένη εργασία: καθάρισε πάντα τον προγραμματισμό επίσκεψης
        if ($jobId) {
            clear_job_visit_after_event_removed($conn, $jobId);
        }

        // Auto-delete από το Google (αν υπάρχει σύνδεση)
        if ($googleEventId) {
            google_delete_remote_event($googleEventId);
        }

        sendResponse([
            'success' => true,
            'message' => 'Η επίσκεψη διαγράφηκε (η εργασία παραμένει)'
        ]);
        
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

/* ========================================
   Helper Functions
   ======================================== */
// getEventColor() ορίζεται πλέον στο api/calendar_helpers.php (κοινή χρήση)

/* ========================================
   SYNC - Συγχρονισμός Εργασιών με Ημερολόγιο
   ======================================== */
function handleSync($conn) {
    try {
        // Πλήρης επανασυγχρονισμός (repair): UPSERT ανά εργασία ώστε να ΜΗΝ χαθούν τα Google links.
        // Κανονικά ο συγχρονισμός γίνεται αυτόματα σε κάθε αποθήκευση εργασίας.
        $jobIds = $conn->query("SELECT id FROM jobs")->fetchAll(PDO::FETCH_COLUMN);

        $syncedCount = 0;
        foreach ($jobIds as $jobId) {
            upsert_calendar_event_for_job($conn, $jobId);
            $syncedCount++;
        }

        sendResponse([
            'success' => true,
            'synced' => $syncedCount,
            'message' => "✅ Επανασυγχρονίστηκαν $syncedCount εργασίες (οι χειροκίνητες επισκέψεις διατηρήθηκαν)"
        ]);

    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

/* ========================================
   LIST - Λίστα όλων των events για sync
   ======================================== */
function handleList($conn) {
    try {
        $query = "
            SELECT 
                id,
                title,
                start_date AS startDate,
                end_date AS endDate,
                start_time AS startTime,
                end_time AS endTime,
                all_day AS allDay,
                client_id AS clientId,
                job_id AS jobId,
                address,
                description,
                status,
                color,
                google_event_id AS googleEventId,
                created_at AS createdAt,
                updated_at AS updatedAt
            FROM calendar_events
            ORDER BY id ASC
        ";
        
        $stmt = $conn->query($query);
        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendResponse([
            'success' => true,
            'data' => $events
        ]);
        
    } catch(PDOException $e) {
        sendResponse([
            'success' => false,
            'message' => $e->getMessage()
        ], 500);
    }
}

?>
