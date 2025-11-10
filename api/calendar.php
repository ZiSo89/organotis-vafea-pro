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

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

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
        
        // Build query - παίρνουμε τις εργασίες που έχουν ημερομηνία
        $query = "
            SELECT 
                j.id,
                j.title,
                j.start_date,
                j.end_date,
                j.next_visit,
                j.status,
                j.description,
                j.address,
                j.total_cost,
                c.name as client_name,
                c.phone as client_phone
            FROM jobs j
            LEFT JOIN clients c ON j.client_id = c.id
            WHERE j.start_date IS NOT NULL
        ";
        
        // Add date range filter if provided
        if ($start && $end) {
            $query .= " AND (
                (j.start_date BETWEEN :start1 AND :end1) OR
                (j.end_date BETWEEN :start2 AND :end2) OR
                (j.start_date <= :start3 AND j.end_date >= :end3)
            )";
        }
        
        $query .= " ORDER BY j.start_date ASC";
        
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
        $jobs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Μετατροπή σε FullCalendar format
        $events = [];
        foreach ($jobs as $job) {
            $color = getEventColor($job['status']);
            
            // Δημιουργία πλούσιου τίτλου με πελάτη
            $title = $job['title'];
            if ($job['client_name']) {
                $title .= ' - ' . $job['client_name'];
            }
            
            // Event για την κύρια εργασία (start_date - end_date)
            $events[] = [
                'id' => $job['id'],
                'title' => $title,
                'start' => $job['start_date'],
                'end' => $job['end_date'] ?: $job['start_date'],
                'backgroundColor' => $color,
                'borderColor' => $color,
                'extendedProps' => [
                    'eventType' => 'job',
                    'status' => $job['status'],
                    'client_name' => $job['client_name'],
                    'client_phone' => $job['client_phone'],
                    'address' => $job['address'],
                    'description' => $job['description'],
                    'total_cost' => $job['total_cost']
                ]
            ];
            
            // Event για next_visit (πορτοκαλί)
            if ($job['next_visit']) {
                $events[] = [
                    'id' => 'next_' . $job['id'],
                    'title' => '🔔 ' . $title,
                    'start' => $job['next_visit'],
                    'backgroundColor' => '#f97316',
                    'borderColor' => '#f97316',
                    'allDay' => true,
                    'extendedProps' => [
                        'eventType' => 'next_visit',
                        'jobId' => $job['id'],
                        'status' => $job['status'],
                        'client_name' => $job['client_name'],
                        'client_phone' => $job['client_phone'],
                        'address' => $job['address'],
                        'description' => $job['description'],
                        'total_cost' => $job['total_cost']
                    ]
                ];
            }
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
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validation
        if (!isset($data['title']) || !isset($data['start_date'])) {
            sendResponse(['error' => 'Missing required fields'], 400);
            return;
        }
        
        // Insert new job
        $query = "
            INSERT INTO jobs (
                title, 
                client_id, 
                start_date, 
                end_date,
                next_visit,
                status, 
                address,
                description,
                created_at
            ) VALUES (
                :title,
                :client_id,
                :start_date,
                :end_date,
                :next_visit,
                :status,
                :address,
                :description,
                NOW()
            )
        ";
        
        $stmt = $conn->prepare($query);
        
        $stmt->bindParam(':title', $data['title']);
        $stmt->bindValue(':client_id', $data['client_id'] ?? null);
        $stmt->bindParam(':start_date', $data['start_date']);
        $stmt->bindValue(':end_date', $data['end_date'] ?? null);
        $stmt->bindValue(':next_visit', $data['next_visit'] ?? null);
        $stmt->bindValue(':status', $data['status'] ?? 'pending');
        $stmt->bindValue(':address', $data['address'] ?? null);
        $stmt->bindValue(':description', $data['description'] ?? null);
        
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
            sendResponse(['error' => 'Missing job ID'], 400);
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
        
        if (isset($data['next_visit'])) {
            $updateFields[] = "next_visit = :next_visit";
            $params[':next_visit'] = $data['next_visit'];
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
        
        if (empty($updateFields)) {
            sendResponse(['error' => 'No fields to update'], 400);
            return;
        }
        
        $updateFields[] = "updated_at = NOW()";
        
        $query = "UPDATE jobs SET " . implode(', ', $updateFields) . " WHERE id = :id";
        
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
            sendResponse(['error' => 'Missing job ID'], 400);
            return;
        }
        
        // Delete job
        $query = "DELETE FROM jobs WHERE id = :id";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->execute();
        
        sendResponse([
            'success' => true,
            'message' => 'Η επίσκεψη διαγράφηκε'
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

?>
