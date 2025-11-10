<?php
/**
 * Templates API - Πρότυπα Εργασιών
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
                $stmt = $db->prepare("SELECT * FROM templates WHERE id = ?");
                $stmt->execute([$_GET['id']]);
                $template = $stmt->fetch();
                if ($template) {
                    $template = convertKeys($template);
                    $template['materials'] = json_decode($template['materials'], true);
                    $template['tasks'] = json_decode($template['tasks'], true);
                    sendSuccess($template);
                } else {
                    sendError('Το πρότυπο δεν βρέθηκε', 404);
                }
            } else {
                $stmt = $db->query("SELECT * FROM templates ORDER BY name ASC");
                $templates = $stmt->fetchAll();
                foreach ($templates as &$template) {
                    $template = convertKeys($template);
                    $template['materials'] = json_decode($template['materials'], true);
                    $template['tasks'] = json_decode($template['tasks'], true);
                }
                sendSuccess($templates);
            }
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input || !isset($input['name'])) {
                sendError('Το όνομα είναι υποχρεωτικό');
            }
            
            $data = convertToSnakeCase($input);
            $stmt = $db->prepare("
                INSERT INTO templates (name, category, description, estimated_duration, materials, tasks)
                VALUES (:name, :category, :description, :estimated_duration, :materials, :tasks)
            ");
            $stmt->execute([
                ':name' => $data['name'],
                ':category' => $data['category'] ?? null,
                ':description' => $data['description'] ?? null,
                ':estimated_duration' => $data['estimated_duration'] ?? null,
                ':materials' => json_encode($input['materials'] ?? []),
                ':tasks' => json_encode($input['tasks'] ?? [])
            ]);
            
            $stmt = $db->prepare("SELECT * FROM templates WHERE id = ?");
            $stmt->execute([$db->lastInsertId()]);
            $template = convertKeys($stmt->fetch());
            $template['materials'] = json_decode($template['materials'], true);
            $template['tasks'] = json_decode($template['tasks'], true);
            sendSuccess($template, 'Το πρότυπο δημιουργήθηκε επιτυχώς');
            break;
            
        case 'PUT':
            if (!isset($_GET['id'])) sendError('Το ID είναι υποχρεωτικό');
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) sendError('Δεν υπάρχουν δεδομένα');
            
            $data = convertToSnakeCase($input);
            $stmt = $db->prepare("
                UPDATE templates 
                SET name = :name, category = :category, description = :description,
                    estimated_duration = :estimated_duration, materials = :materials, tasks = :tasks
                WHERE id = :id
            ");
            $stmt->execute([
                ':id' => $_GET['id'],
                ':name' => $data['name'],
                ':category' => $data['category'] ?? null,
                ':description' => $data['description'] ?? null,
                ':estimated_duration' => $data['estimated_duration'] ?? null,
                ':materials' => json_encode($input['materials'] ?? []),
                ':tasks' => json_encode($input['tasks'] ?? [])
            ]);
            
            if ($stmt->rowCount() === 0) sendError('Το πρότυπο δεν βρέθηκε', 404);
            
            $stmt = $db->prepare("SELECT * FROM templates WHERE id = ?");
            $stmt->execute([$_GET['id']]);
            $template = convertKeys($stmt->fetch());
            $template['materials'] = json_decode($template['materials'], true);
            $template['tasks'] = json_decode($template['tasks'], true);
            sendSuccess($template, 'Το πρότυπο ενημερώθηκε επιτυχώς');
            break;
            
        case 'DELETE':
            if (!isset($_GET['id'])) sendError('Το ID είναι υποχρεωτικό');
            $stmt = $db->prepare("DELETE FROM templates WHERE id = ?");
            $stmt->execute([$_GET['id']]);
            $stmt->rowCount() > 0 ? sendSuccess(null, 'Το πρότυπο διαγράφηκε') : sendError('Δεν βρέθηκε', 404);
            break;
            
        default:
            sendError('Μη έγκυρη μέθοδος', 405);
    }
} catch (Exception $e) {
    error_log("Templates API Error: " . $e->getMessage());
    sendError('Σφάλμα: ' . $e->getMessage(), 500);
}
?>
