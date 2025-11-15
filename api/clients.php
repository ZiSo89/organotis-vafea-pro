<?php
/**
 * Οργανωτής Βαφέα Pro - Clients API
 * CRUD operations για πελάτες
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/auth_check.php';

// Check authentication
checkAuthentication();

// Log API request
logApiRequest('/api/clients.php', $_SERVER['REQUEST_METHOD'], $_GET);

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$db = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            handleGet($db);
            break;
        case 'POST':
            handlePost($db);
            break;
        case 'PUT':
            handlePut($db);
            break;
        case 'DELETE':
            handleDelete($db);
            break;
        default:
            sendError('Μη έγκυρη μέθοδος', 405);
    }
} catch (Exception $e) {
    error_log("Clients API Error: " . $e->getMessage());
    sendError('Σφάλμα επεξεργασίας αιτήματος: ' . $e->getMessage(), 500);
}

// GET - Λήψη πελατών
function handleGet($db) {
    if (isset($_GET['id'])) {
        // Λήψη συγκεκριμένου πελάτη
        $stmt = $db->prepare("SELECT * FROM clients WHERE id = ?");
        $stmt->execute([$_GET['id']]);
        $client = $stmt->fetch();
        
        if ($client) {
            sendSuccess(convertKeys($client));
        } else {
            sendError('Ο πελάτης δεν βρέθηκε', 404);
        }
    } else {
        // Λήψη όλων των πελατών
        $stmt = $db->query("SELECT * FROM clients ORDER BY name ASC");
        $clients = $stmt->fetchAll();
        
        // Convert keys to camelCase
        $clients = array_map('convertKeys', $clients);
        
        sendSuccess($clients);
    }
}

// POST - Δημιουργία νέου πελάτη
function handlePost($db) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['name'])) {
        sendError('Το όνομα του πελάτη είναι υποχρεωτικό');
    }
    
    // Convert camelCase to snake_case
    $data = convertToSnakeCase($input);

    // Basic sanitization
    $data['name'] = isset($data['name']) ? trim($data['name']) : null;
    $data['email'] = isset($data['email']) ? trim($data['email']) : null;
    $data['phone'] = isset($data['phone']) ? trim($data['phone']) : null;

    // Validate coordinates if present and normalize to JSON
    $coordsJson = null;
    if (isset($data['coordinates'])) {
        $coords = $data['coordinates'];
        if (is_string($coords)) {
            $decoded = json_decode($coords, true);
            if (json_last_error() === JSON_ERROR_NONE) $coords = $decoded;
        }
        if (is_array($coords) && isset($coords['lat']) && isset($coords['lng'])) {
            $lat = floatval($coords['lat']);
            $lng = floatval($coords['lng']);
            if ($lat >= -90 && $lat <= 90 && $lng >= -180 && $lng <= 180) {
                $coordsJson = json_encode(['lat' => $lat, 'lng' => $lng], JSON_UNESCAPED_UNICODE);
            }
        }
    }

    $sql = "INSERT INTO clients (name, phone, email, address, city, postal_code, afm, notes, coordinates)\n           VALUES (:name, :phone, :email, :address, :city, :postal_code, :afm, :notes, :coordinates)";

    $params = [
        ':name' => $data['name'],
        ':phone' => $data['phone'] ?? null,
        ':email' => filter_var($data['email'] ?? null, FILTER_SANITIZE_EMAIL),
        ':address' => $data['address'] ?? null,
        ':city' => $data['city'] ?? null,
        ':postal_code' => $data['postal_code'] ?? null,
        ':afm' => $data['afm'] ?? null,
        ':notes' => $data['notes'] ?? null,
        ':coordinates' => $coordsJson
    ];

    // Log the SQL & params (only when DEBUG_MODE enabled)
    logQuery($sql, $params);

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    
    $clientId = $db->lastInsertId();
    
    // Λήψη του νέου πελάτη
    $stmt = $db->prepare("SELECT * FROM clients WHERE id = ?");
    $stmt->execute([$clientId]);
    $client = $stmt->fetch();
    
    // Log API response
    logApiResponse('/api/clients.php?action=create', 200, $client);
    sendSuccess(convertKeys($client), 'Ο πελάτης δημιουργήθηκε επιτυχώς');
}

// PUT - Ενημέρωση πελάτη
function handlePut($db) {
    if (!isset($_GET['id'])) {
        sendError('Το ID του πελάτη είναι υποχρεωτικό');
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        sendError('Δεν υπάρχουν δεδομένα προς ενημέρωση');
    }
    
    // Convert camelCase to snake_case
    $data = convertToSnakeCase($input);

    // Fetch existing client to merge missing fields (allow partial update)
    $stmtFetch = $db->prepare("SELECT * FROM clients WHERE id = ?");
    $stmtFetch->execute([$_GET['id']]);
    $existing = $stmtFetch->fetch(PDO::FETCH_ASSOC);
    if (!$existing) {
        sendError('Ο πελάτης δεν βρέθηκε', 404);
    }

    // Merge incoming data into existing row (incoming wins)
    foreach ($existing as $k => $v) {
        if (!isset($data[$k])) {
            $data[$k] = $v;
        }
    }

    // Validate/normalize coordinates if present
    $coordsJson = null;
    if (isset($data['coordinates'])) {
        $coords = $data['coordinates'];
        if (is_string($coords)) {
            $decoded = json_decode($coords, true);
            if (json_last_error() === JSON_ERROR_NONE) $coords = $decoded;
        }
        if (is_array($coords) && isset($coords['lat']) && isset($coords['lng'])) {
            $lat = floatval($coords['lat']);
            $lng = floatval($coords['lng']);
            if ($lat >= -90 && $lat <= 90 && $lng >= -180 && $lng <= 180) {
                $coordsJson = json_encode(['lat' => $lat, 'lng' => $lng], JSON_UNESCAPED_UNICODE);
            }
        }
    }

    $sql = "UPDATE clients \n            SET name = :name,\n                phone = :phone,\n                email = :email,\n                address = :address,\n                city = :city,\n                postal_code = :postal_code,\n                afm = :afm,\n                notes = :notes,\n                coordinates = :coordinates\n            WHERE id = :id";

    $params = [
        ':id' => $_GET['id'],
        ':name' => $data['name'] ?? null,
        ':phone' => $data['phone'] ?? null,
        ':email' => filter_var($data['email'] ?? null, FILTER_SANITIZE_EMAIL),
        ':address' => $data['address'] ?? null,
        ':city' => $data['city'] ?? null,
        ':postal_code' => $data['postal_code'] ?? null,
        ':afm' => $data['afm'] ?? null,
        ':notes' => $data['notes'] ?? null,
        ':coordinates' => $coordsJson
    ];

    // Log SQL & params
    logQuery($sql, $params);

    $stmt = $db->prepare($sql);
    $result = $stmt->execute($params);
    
    if ($stmt->rowCount() === 0) {
        sendError('Ο πελάτης δεν βρέθηκε', 404);
    }
    
    // Λήψη του ενημερωμένου πελάτη
    $stmt = $db->prepare("SELECT * FROM clients WHERE id = ?");
    $stmt->execute([$_GET['id']]);
    $client = $stmt->fetch();
    
    // Log API response
    logApiResponse('/api/clients.php?action=update&id=' . $_GET['id'], 200, $client);
    sendSuccess(convertKeys($client), 'Ο πελάτης ενημερώθηκε επιτυχώς');
}

// DELETE - Διαγραφή πελάτη
function handleDelete($db) {
    if (!isset($_GET['id'])) {
        sendError('Το ID του πελάτη είναι υποχρεωτικό');
    }
    
    $stmt = $db->prepare("DELETE FROM clients WHERE id = ?");
    $sql = "DELETE FROM clients WHERE id = ?";
    logQuery($sql, [$_GET['id']]);
    $stmt->execute([$_GET['id']]);

    if ($stmt->rowCount() === 0) {
        sendError('Ο πελάτης δεν βρέθηκε', 404);
    }

    // Log API response
    logApiResponse('/api/clients.php?action=delete&id=' . $_GET['id'], 200, ['deletedId' => $_GET['id']]);
    sendSuccess(null, 'Ο πελάτης διαγράφηκε επιτυχώς');
}
?>
