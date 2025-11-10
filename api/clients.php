<?php
/**
 * Οργανωτής Βαφέα Pro - Clients API
 * CRUD operations για πελάτες
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/auth_check.php';

// Check authentication
checkAuthentication();

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
    
    $stmt = $db->prepare("
        INSERT INTO clients (name, phone, email, address, city, postal_code, afm, notes)
        VALUES (:name, :phone, :email, :address, :city, :postal_code, :afm, :notes)
    ");
    
    $stmt->execute([
        ':name' => $data['name'],
        ':phone' => $data['phone'] ?? null,
        ':email' => $data['email'] ?? null,
        ':address' => $data['address'] ?? null,
        ':city' => $data['city'] ?? null,
        ':postal_code' => $data['postal_code'] ?? null,
        ':afm' => $data['afm'] ?? null,
        ':notes' => $data['notes'] ?? null
    ]);
    
    $clientId = $db->lastInsertId();
    
    // Λήψη του νέου πελάτη
    $stmt = $db->prepare("SELECT * FROM clients WHERE id = ?");
    $stmt->execute([$clientId]);
    $client = $stmt->fetch();
    
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
    
    $stmt = $db->prepare("
        UPDATE clients 
        SET name = :name,
            phone = :phone,
            email = :email,
            address = :address,
            city = :city,
            postal_code = :postal_code,
            afm = :afm,
            notes = :notes
        WHERE id = :id
    ");
    
    $result = $stmt->execute([
        ':id' => $_GET['id'],
        ':name' => $data['name'],
        ':phone' => $data['phone'] ?? null,
        ':email' => $data['email'] ?? null,
        ':address' => $data['address'] ?? null,
        ':city' => $data['city'] ?? null,
        ':postal_code' => $data['postal_code'] ?? null,
        ':afm' => $data['afm'] ?? null,
        ':notes' => $data['notes'] ?? null
    ]);
    
    if ($stmt->rowCount() === 0) {
        sendError('Ο πελάτης δεν βρέθηκε', 404);
    }
    
    // Λήψη του ενημερωμένου πελάτη
    $stmt = $db->prepare("SELECT * FROM clients WHERE id = ?");
    $stmt->execute([$_GET['id']]);
    $client = $stmt->fetch();
    
    sendSuccess(convertKeys($client), 'Ο πελάτης ενημερώθηκε επιτυχώς');
}

// DELETE - Διαγραφή πελάτη
function handleDelete($db) {
    if (!isset($_GET['id'])) {
        sendError('Το ID του πελάτη είναι υποχρεωτικό');
    }
    
    $stmt = $db->prepare("DELETE FROM clients WHERE id = ?");
    $stmt->execute([$_GET['id']]);
    
    if ($stmt->rowCount() === 0) {
        sendError('Ο πελάτης δεν βρέθηκε', 404);
    }
    
    sendSuccess(null, 'Ο πελάτης διαγράφηκε επιτυχώς');
}
?>
