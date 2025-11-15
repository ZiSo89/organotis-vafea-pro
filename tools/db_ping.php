<?php
require_once __DIR__ . "/../config/database.php";
$mysqli = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);
if ($mysqli->connect_errno) {
    echo "MySQL connect failed: (" . $mysqli->connect_errno . ") " . $mysqli->connect_error . "\n";
    exit(1);
}
echo "MySQL connected: " . $mysqli->host_info . "\n";
$mysqli->close();
?>