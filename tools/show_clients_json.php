<?php
require_once __DIR__ . "/../config/database.php";
$db = getDBConnection();
$stmt = $db->query("SELECT id, name, address, city, postal_code, coordinates, created_at FROM clients ORDER BY id DESC LIMIT 20");
$rows = $stmt->fetchAll();
echo json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
?>