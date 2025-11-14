<?php
/* ========================================
   Calendar API - Διαχείριση Επισκέψεων
   ======================================== */

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0); // Disable display to avoid breaking JSON
ini_set('log_errors', 1);

require_once '../config/database.php';

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
    case 'POST':
        handlePost($conn);
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
            $displayTitle = $event['title'];
            if ($event['client_name']) {
                $displayTitle .= ' - ' . $event['client_name'];
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
                    'original_title' => $event['title'], // Original title χωρίς το όνομα πελάτη
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
        
        sendResponse($events);
        
    } catch(PDOException $e) {
        sendResponse(['error' => $e->getMessage()], 500);
    }
}

/* ========================================
   POST - Δημιουργία νέας επίσκεψης
   ======================================== */
function handlePost($conn) {
    try {
        $rawInput = file_get_contents('php://input');
        $data = json_decode($rawInput, true);
        
        // Validation
        if (!isset($data['title']) || !isset($data['start_date'])) {
            sendResponse(['error' => 'Missing required fields'], 400);
            return;
        }
        
        // Insert new calendar event
        $query = "
            INSERT INTO calendar_events (
                title, 
                client_id, 
                job_id,
                start_date, 
                end_date,
                start_time,
                end_time,
                all_day,
                status, 
                address,
                description,
                color,
                created_at
            ) VALUES (
                :title,
                :client_id,
                :job_id,
                :start_date,
                :end_date,
                :start_time,
                :end_time,
                :all_day,
                :status,
                :address,
                :description,
                :color,
                NOW()
            )
        ";
        
        $stmt = $conn->prepare($query);
        
        $stmt->bindParam(':title', $data['title']);
        $stmt->bindValue(':client_id', $data['client_id'] ?? null);
        $stmt->bindValue(':job_id', $data['job_id'] ?? null);
        $stmt->bindParam(':start_date', $data['start_date']);
        $stmt->bindValue(':end_date', $data['end_date'] ?? null);
        $stmt->bindValue(':start_time', $data['start_time'] ?? null);
        $stmt->bindValue(':end_time', $data['end_time'] ?? null);
        $stmt->bindValue(':all_day', $data['all_day'] ?? 0, PDO::PARAM_INT);
        $stmt->bindValue(':status', $data['status'] ?? 'pending');
        $stmt->bindValue(':address', $data['address'] ?? null);
        $stmt->bindValue(':description', $data['description'] ?? null);
        $stmt->bindValue(':color', $data['color'] ?? null);
        
        $stmt->execute();
        
        $newId = $conn->lastInsertId();
        
        sendResponse([
            'success' => true,
            'id' => $newId,
            'message' => 'Η επίσκεψη δημιουργήθηκε επιτυχώς'
        ], 201);
        
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
        
        // Delete calendar event (NOT the job!)
        $query = "DELETE FROM calendar_events WHERE id = :id";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        
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
function getEventColor($status) {
    // Normalize status - handle both Greek and English
    $status = strtolower(trim($status));
    
    // Map Greek to English
    $greekToEnglish = [
        'ολοκληρώθηκε' => 'completed',
        'σε εξέλιξη' => 'in_progress',
        'υποψήφιος' => 'pending',
        'σε αναμονή' => 'pending',
        'ακυρώθηκε' => 'cancelled'
    ];
    
    if (isset($greekToEnglish[$status])) {
        $status = $greekToEnglish[$status];
    }
    
    switch($status) {
        case 'completed':
            return '#10b981'; // green
        case 'in_progress':
        case 'in-progress':
            return '#3b82f6'; // blue
        case 'pending':
            return '#f59e0b'; // orange
        case 'cancelled':
            return '#ef4444'; // red
        default:
            return '#6b7280'; // gray
    }
}

/* ========================================
   SYNC - Συγχρονισμός Εργασιών με Ημερολόγιο
   ======================================== */
function handleSync($conn) {
    try {
        // Διαγραφή υπαρχόντων calendar events που έχουν job_id (δηλαδή προήλθαν από εργασίες)
        $deleteQuery = "DELETE FROM calendar_events WHERE job_id IS NOT NULL";
        $conn->exec($deleteQuery);
        
        // Παίρνουμε όλες τις εργασίες που έχουν next_visit
        $query = "
            SELECT 
                j.id,
                j.title,
                j.client_id,
                j.address,
                j.description,
                j.status,
                j.next_visit,
                c.name as client_name,
                c.phone as client_phone
            FROM jobs j
            LEFT JOIN clients c ON j.client_id = c.id
            WHERE j.next_visit IS NOT NULL 
            AND j.next_visit != ''
            AND j.next_visit != '0000-00-00'
            ORDER BY j.next_visit ASC
        ";
        
        $stmt = $conn->prepare($query);
        $stmt->execute();
        $jobs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $syncedCount = 0;
        
        // Δημιουργία calendar event για κάθε εργασία
        foreach ($jobs as $job) {
            // Δημιουργία τίτλου
            $title = $job['title'];
            if ($job['client_name']) {
                $title = $job['client_name'] . ' - ' . $job['title'];
            }
            
            // Προσδιορισμός χρώματος βάσει status
            $color = getEventColor($job['status']);
            
            // Insert στο calendar
            $insertQuery = "
                INSERT INTO calendar_events (
                    title,
                    client_id,
                    job_id,
                    start_date,
                    end_date,
                    all_day,
                    status,
                    address,
                    description,
                    color,
                    created_at
                ) VALUES (
                    :title,
                    :client_id,
                    :job_id,
                    :start_date,
                    :end_date,
                    1,
                    :status,
                    :address,
                    :description,
                    :color,
                    NOW()
                )
            ";
            
            $insertStmt = $conn->prepare($insertQuery);
            $insertStmt->bindParam(':title', $title);
            $insertStmt->bindParam(':client_id', $job['client_id']);
            $insertStmt->bindParam(':job_id', $job['id']);
            $insertStmt->bindParam(':start_date', $job['next_visit']);
            $insertStmt->bindParam(':end_date', $job['next_visit']);
            $insertStmt->bindParam(':status', $job['status']);
            $insertStmt->bindParam(':address', $job['address']);
            $insertStmt->bindParam(':description', $job['description']);
            $insertStmt->bindParam(':color', $color);
            
            $insertStmt->execute();
            $syncedCount++;
        }
        
        sendResponse([
            'success' => true,
            'synced' => $syncedCount,
            'message' => "✅ Συγχρονίστηκαν $syncedCount εργασίες (οι χειροκίνητες επισκέψεις διατηρήθηκαν)"
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
