<?php
/**
 * Backup API - Εξαγωγή και Εισαγωγή Βάσης Δεδομένων
 * Υποστηρίζει πλήρες backup όλων των πινάκων σε JSON format
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../config/database.php';

$action = $_GET['action'] ?? '';

// ============================================================================
// EXPORT DATABASE
// ============================================================================
if ($action === 'export') {
    try {
        $db = getDBConnection();
        
        // Λίστα όλων των πινάκων (με τη σειρά που υπάρχουν στη βάση)
        $tables = [
            'clients',
            'workers',
            'materials',
            'jobs',
            'job_workers',
            'job_materials',
            'timesheets',
            'calendar_events',
            'offers',
            'invoices',
            'templates',
            'settings'
        ];
        
        // Έλεγχος ποιοι πίνακες υπάρχουν πραγματικά στη βάση
        $stmt = $db->query("SHOW TABLES");
        $existingTables = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        // Φιλτράρισμα μόνο των πινάκων που υπάρχουν
        $tables = array_intersect($tables, $existingTables);
        
        $backup = [
            'version' => '1.0',
            'exported_at' => date('Y-m-d H:i:s'),
            'database' => 'painter_app',
            'tables' => []
        ];
        
        // Εξαγωγή δεδομένων από κάθε πίνακα
        foreach ($tables as $table) {
            $stmt = $db->query("SELECT * FROM `$table`");
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Διόρθωση τύπων δεδομένων για τον πίνακα jobs
            if ($table === 'jobs' && !empty($data)) {
                foreach ($data as &$row) {
                    // Μετατροπή kilometers από decimal σε integer
                    if (isset($row['kilometers'])) {
                        $row['kilometers'] = (int)$row['kilometers'];
                    }
                    // Μετατροπή rooms σε integer (αν υπάρχει)
                    if (isset($row['rooms'])) {
                        $row['rooms'] = $row['rooms'] !== null ? (int)$row['rooms'] : null;
                    }
                    // Μετατροπή is_paid σε boolean
                    if (isset($row['is_paid'])) {
                        $row['is_paid'] = (bool)$row['is_paid'];
                    }
                }
                unset($row); // Καθαρισμός reference
            }
            
            // Διόρθωση τύπων δεδομένων για τον πίνακα invoices
            if ($table === 'invoices' && !empty($data)) {
                foreach ($data as &$row) {
                    if (isset($row['is_paid'])) {
                        $row['is_paid'] = (bool)$row['is_paid'];
                    }
                }
                unset($row);
            }
            
            $backup['tables'][$table] = [
                'count' => count($data),
                'data' => $data
            ];
        }
        
        // Επιστροφή JSON αρχείου για download
        header('Content-Type: application/json; charset=utf-8');
        header('Content-Disposition: attachment; filename="backup_' . date('Y-m-d_His') . '.json"');
        header('Cache-Control: no-cache, must-revalidate');
        header('Expires: 0');
        
        echo json_encode($backup, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit();
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Σφάλμα κατά την εξαγωγή: ' . $e->getMessage()
        ]);
        exit();
    }
}

// ============================================================================
// IMPORT DATABASE
// ============================================================================
if ($action === 'import') {
    $db = null;
    try {
        // Έλεγχος αν ανέβηκε αρχείο
        if (!isset($_FILES['backup']) || $_FILES['backup']['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('Δεν ανέβηκε αρχείο backup');
        }
        
        // Διάβασμα του JSON αρχείου
        $jsonContent = file_get_contents($_FILES['backup']['tmp_name']);
        $backup = json_decode($jsonContent, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Μη έγκυρο JSON αρχείο: ' . json_last_error_msg());
        }
        
        // Έλεγχος δομής backup
        if (!isset($backup['version']) || !isset($backup['tables'])) {
            throw new Exception('Μη έγκυρη δομή backup αρχείου');
        }
        
        $db = getDBConnection();
        
        // Απενεργοποίηση foreign key checks και autocommit
        $db->exec('SET FOREIGN_KEY_CHECKS = 0');
        $db->exec('SET autocommit = 0');
        
        // Σειρά διαγραφής (ανάποδη από τις foreign keys)
        $deleteOrder = [
            'timesheets',
            'calendar_events',
            'job_materials',
            'job_workers',
            'invoices',
            'offers',
            'jobs',
            'materials',
            'workers',
            'clients',
            'templates',
            'settings'
        ];
        
        // Διαγραφή υπαρχόντων δεδομένων
        foreach ($deleteOrder as $table) {
            try {
                $db->exec("DELETE FROM `$table`");
            } catch (Exception $e) {
                error_log("Error clearing table $table: " . $e->getMessage());
            }
        }
        
        // Σειρά εισαγωγής (σωστή σειρά για foreign keys)
        $insertOrder = [
            'clients',
            'workers',
            'materials',
            'jobs',
            'job_workers',
            'job_materials',
            'timesheets',
            'calendar_events',
            'offers',
            'invoices',
            'templates',
            'settings'
        ];
        
        $stats = [];
        
        // Εισαγωγή δεδομένων
        foreach ($insertOrder as $table) {
            if (!isset($backup['tables'][$table])) {
                $stats[$table] = 0;
                continue;
            }
            
            $tableData = $backup['tables'][$table]['data'];
            $count = 0;
            
            if (!empty($tableData)) {
                try {
                    // Δημιουργία prepared statement
                    $firstRow = $tableData[0];
                    $columns = array_keys($firstRow);
                    
                    // Έλεγχος ποια columns υπάρχουν στον πίνακα
                    $describeStmt = $db->query("DESCRIBE `$table`");
                    $tableColumnsData = $describeStmt->fetchAll(PDO::FETCH_ASSOC);
                    $tableColumns = array_column($tableColumnsData, 'Field');
                    
                    // Κρατάμε μόνο τα columns που υπάρχουν στον πίνακα
                    $validColumns = array_intersect($columns, $tableColumns);
                    
                    if (empty($validColumns)) {
                        $stats[$table] = 0;
                        continue;
                    }
                    
                    $placeholders = ':' . implode(', :', $validColumns);
                    $columnsStr = '`' . implode('`, `', $validColumns) . '`';
                    
                    $sql = "INSERT INTO `$table` ($columnsStr) VALUES ($placeholders)";
                    $insertStmt = $db->prepare($sql);
                    
                    foreach ($tableData as $row) {
                        // Bind values μόνο για τα έγκυρα columns
                        foreach ($validColumns as $column) {
                            $value = isset($row[$column]) ? $row[$column] : null;
                            // Μετατροπή boolean σε integer για MySQL
                            if (is_bool($value)) {
                                $value = $value ? 1 : 0;
                            }
                            $insertStmt->bindValue(":$column", $value);
                        }
                        $insertStmt->execute();
                        $count++;
                    }
                } catch (Exception $tableError) {
                    throw new Exception("Σφάλμα στον πίνακα '$table': " . $tableError->getMessage());
                }
            }
            
            $stats[$table] = $count;
        }
        
        // Επανενεργοποίηση foreign key checks
        $db->exec('SET FOREIGN_KEY_CHECKS = 1');
        
        // Commit όλες τις αλλαγές
        $db->exec('COMMIT');
        $db->exec('SET autocommit = 1');
        
        echo json_encode([
            'success' => true,
            'message' => 'Η βάση δεδομένων εισήχθη επιτυχώς',
            'stats' => $stats
        ]);
        
    } catch (Exception $e) {
        // Rollback σε περίπτωση σφάλματος
        if ($db !== null) {
            try {
                $db->exec('ROLLBACK');
                $db->exec('SET autocommit = 1');
                $db->exec('SET FOREIGN_KEY_CHECKS = 1');
            } catch (Exception $rollbackError) {
                error_log("Rollback error: " . $rollbackError->getMessage());
            }
        }
        
        // Log the full error for debugging
        error_log("Backup import error: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage(),
            'debug' => [
                'file' => basename($e->getFile()),
                'line' => $e->getLine()
            ]
        ], JSON_UNESCAPED_UNICODE);
    }
    exit();
}

// ============================================================================
// INVALID ACTION
// ============================================================================
http_response_code(400);
echo json_encode([
    'success' => false,
    'error' => 'Μη έγκυρη ενέργεια. Χρησιμοποιήστε action=export ή action=import'
]);
