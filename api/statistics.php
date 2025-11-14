<?php
/* ========================================
   Statistics API - Στατιστικά
   ======================================== */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/database.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    $pdo = getDBConnection();
    
    if ($method === 'GET') {
        
        switch ($action) {
            
            // Έσοδα ανά μήνα και χρόνο
            case 'revenue':
                $year = $_GET['year'] ?? date('Y');
                $stmt = $pdo->prepare("
                    SELECT 
                        YEAR(start_date) as year,
                        MONTH(start_date) as month,
                        COUNT(*) as total_jobs,
                        SUM(total_cost) as revenue,
                        SUM(materials_cost) as materials_cost,
                        SUM(total_cost - materials_cost) as profit
                    FROM jobs
                    WHERE start_date IS NOT NULL
                        AND YEAR(start_date) = :year
                        AND (status = 'Εξοφλήθηκε' OR is_paid = 1)
                    GROUP BY YEAR(start_date), MONTH(start_date)
                    ORDER BY year, month
                ");
                $stmt->execute(['year' => $year]);
                $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Μετατροπή μηνών σε ονόματα
                $months = [
                    1 => 'Ιανουάριος', 2 => 'Φεβρουάριος', 3 => 'Μάρτιος',
                    4 => 'Απρίλιος', 5 => 'Μάιος', 6 => 'Ιούνιος',
                    7 => 'Ιούλιος', 8 => 'Αύγουστος', 9 => 'Σεπτέμβριος',
                    10 => 'Οκτώβριος', 11 => 'Νοέμβριος', 12 => 'Δεκέμβριος'
                ];
                
                foreach ($data as &$row) {
                    $row['month_name'] = $months[(int)$row['month']];
                    $row['revenue'] = (float)$row['revenue'];
                    $row['materials_cost'] = (float)$row['materials_cost'];
                    $row['profit'] = (float)$row['profit'];
                }
                
                echo json_encode([
                    'success' => true,
                    'data' => $data
                ]);
                break;
            
            // Έσοδα ανά έτος (σύνολο)
            case 'revenue_by_year':
                $stmt = $pdo->query("
                    SELECT 
                        YEAR(start_date) as year,
                        COUNT(*) as total_jobs,
                        SUM(total_cost) as revenue,
                        SUM(materials_cost) as materials_cost,
                        SUM(total_cost - materials_cost) as profit
                    FROM jobs
                    WHERE start_date IS NOT NULL
                        AND (status = 'Εξοφλήθηκε' OR is_paid = 1)
                    GROUP BY YEAR(start_date)
                    ORDER BY year DESC
                ");
                $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                foreach ($data as &$row) {
                    $row['revenue'] = (float)$row['revenue'];
                    $row['materials_cost'] = (float)$row['materials_cost'];
                    $row['profit'] = (float)$row['profit'];
                }
                
                echo json_encode([
                    'success' => true,
                    'data' => $data
                ]);
                break;
            
            // Κατανομή εργασιών ανά τύπο
            case 'jobs_by_type':
                $year = $_GET['year'] ?? null;
                
                $sql = "
                    SELECT 
                        COALESCE(type, 'Χωρίς κατηγορία') as job_type,
                        COUNT(*) as count,
                        SUM(total_cost) as revenue,
                        SUM(total_cost - materials_cost) as profit
                    FROM jobs
                    WHERE (status = 'Εξοφλήθηκε' OR is_paid = 1)
                ";
                
                if ($year) {
                    $sql .= " AND YEAR(start_date) = :year";
                }
                
                $sql .= " GROUP BY type ORDER BY revenue DESC";
                
                $stmt = $pdo->prepare($sql);
                if ($year) {
                    $stmt->execute(['year' => $year]);
                } else {
                    $stmt->execute();
                }
                
                $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                foreach ($data as &$row) {
                    $row['revenue'] = (float)$row['revenue'];
                    $row['profit'] = (float)$row['profit'];
                }
                
                echo json_encode([
                    'success' => true,
                    'data' => $data
                ]);
                break;
            
            // Top εργασίες με βάση τα κέρδη
            case 'top_jobs':
                $limit = $_GET['limit'] ?? 10;
                $year = $_GET['year'] ?? null;
                
                $sql = "
                    SELECT 
                        j.id,
                        j.title,
                        j.type,
                        c.name as client_name,
                        j.total_cost as revenue,
                        j.materials_cost,
                        (j.total_cost - j.materials_cost) as profit,
                        j.start_date,
                        j.end_date,
                        j.status
                    FROM jobs j
                    LEFT JOIN clients c ON j.client_id = c.id
                    WHERE j.total_cost > 0
                        AND (j.status = 'Εξοφλήθηκε' OR j.is_paid = 1)
                ";
                
                if ($year) {
                    $sql .= " AND YEAR(j.start_date) = :year";
                }
                
                $sql .= " ORDER BY profit DESC LIMIT :limit";
                
                $stmt = $pdo->prepare($sql);
                if ($year) {
                    $stmt->bindValue(':year', $year, PDO::PARAM_INT);
                }
                $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
                $stmt->execute();
                
                $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                foreach ($data as &$row) {
                    $row['revenue'] = (float)$row['revenue'];
                    $row['materials_cost'] = (float)$row['materials_cost'];
                    $row['profit'] = (float)$row['profit'];
                }
                
                echo json_encode([
                    'success' => true,
                    'data' => $data
                ]);
                break;
            
            // Υλικά που χρησιμοποιούνται (από paints στις εργασίες)
            case 'materials_usage':
                $year = $_GET['year'] ?? null;
                
                // Πρώτα προσπαθούμε να πάρουμε από job_materials
                $sql = "
                    SELECT 
                        m.name,
                        m.category,
                        SUM(jm.quantity) as total_quantity,
                        m.unit,
                        SUM(jm.total_cost) as total_cost,
                        COUNT(DISTINCT jm.job_id) as jobs_count
                    FROM job_materials jm
                    INNER JOIN materials m ON jm.material_id = m.id
                    INNER JOIN jobs j ON jm.job_id = j.id
                    WHERE (j.status = 'Εξοφλήθηκε' OR j.is_paid = 1)
                ";
                
                if ($year) {
                    $sql .= " AND YEAR(j.start_date) = :year";
                }
                
                $sql .= " GROUP BY m.id ORDER BY total_cost DESC LIMIT 10";
                
                $stmt = $pdo->prepare($sql);
                if ($year) {
                    $stmt->execute(['year' => $year]);
                } else {
                    $stmt->execute();
                }
                
                $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Αν δεν υπάρχουν δεδομένα στο job_materials, πάρε από paints
                if (empty($data)) {
                    $sql = "
                        SELECT 
                            j.id,
                            j.paints,
                            j.title
                        FROM jobs j
                        WHERE j.paints IS NOT NULL 
                            AND j.paints != '[]'
                            AND j.paints != ''
                            AND (j.status = 'Εξοφλήθηκε' OR j.is_paid = 1)
                    ";
                    
                    if ($year) {
                        $sql .= " AND YEAR(j.start_date) = :year";
                    }
                    
                    $stmt = $pdo->prepare($sql);
                    if ($year) {
                        $stmt->execute(['year' => $year]);
                    } else {
                        $stmt->execute();
                    }
                    
                    $jobs = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    
                    // Επεξεργασία JSON paints
                    $paintsCount = [];
                    $paintsJobs = [];
                    
                    foreach ($jobs as $job) {
                        $paints = json_decode($job['paints'], true);
                        if (is_array($paints)) {
                            foreach ($paints as $paint) {
                                $paintName = $paint['name'] ?? 'Άγνωστο';
                                
                                if (!isset($paintsCount[$paintName])) {
                                    $paintsCount[$paintName] = 0;
                                    $paintsJobs[$paintName] = [];
                                }
                                
                                $paintsCount[$paintName]++;
                                if (!in_array($job['id'], $paintsJobs[$paintName])) {
                                    $paintsJobs[$paintName][] = $job['id'];
                                }
                            }
                        }
                    }
                    
                    // Μετατροπή σε array για το response
                    $data = [];
                    foreach ($paintsCount as $name => $count) {
                        $data[] = [
                            'name' => $name,
                            'category' => 'Χρώματα',
                            'total_quantity' => $count,
                            'unit' => 'χρήσεις',
                            'total_cost' => 0, // Δεν έχουμε κόστος από paints
                            'jobs_count' => count($paintsJobs[$name])
                        ];
                    }
                    
                    // Ταξινόμηση με βάση τις χρήσεις
                    usort($data, function($a, $b) {
                        return $b['total_quantity'] - $a['total_quantity'];
                    });
                    
                    // Top 10
                    $data = array_slice($data, 0, 10);
                }
                
                foreach ($data as &$row) {
                    $row['total_quantity'] = (float)$row['total_quantity'];
                    $row['total_cost'] = (float)$row['total_cost'];
                }
                
                echo json_encode([
                    'success' => true,
                    'data' => $data
                ]);
                break;
            
            // Κατάσταση εργασιών (όλες οι 7 καταστάσεις)
            case 'jobs_status':
                $year = $_GET['year'] ?? null;
                
                $sql = "
                    SELECT 
                        CASE 
                            WHEN LOWER(status) LIKE '%υποψ%' OR LOWER(status) = 'candidate' THEN 'Υποψήφιος'
                            WHEN LOWER(status) LIKE '%προγραμ%' OR LOWER(status) = 'scheduled' THEN 'Προγραμματισμένη'
                            WHEN LOWER(status) LIKE '%εξέλιξη%' OR LOWER(status) LIKE '%progress%' THEN 'Σε εξέλιξη'
                            WHEN LOWER(status) LIKE '%αναμον%' OR LOWER(status) = 'waiting' THEN 'Σε αναμονή'
                            WHEN LOWER(status) LIKE '%ολοκληρ%' OR LOWER(status) = 'completed' THEN 'Ολοκληρώθηκε'
                            WHEN LOWER(status) LIKE '%εξοφλ%' OR LOWER(status) = 'paid' THEN 'Εξοφλήθηκε'
                            WHEN LOWER(status) LIKE '%ακυρ%' OR LOWER(status) = 'cancelled' THEN 'Ακυρώθηκε'
                            ELSE 'Άλλες'
                        END as status_label,
                        status as status_key,
                        COUNT(*) as count,
                        SUM(total_cost) as revenue
                    FROM jobs
                    WHERE 1=1
                ";
                
                if ($year) {
                    $sql .= " AND YEAR(start_date) = :year";
                }
                
                $sql .= " GROUP BY status_label, status_key ORDER BY count DESC";
                
                $stmt = $pdo->prepare($sql);
                if ($year) {
                    $stmt->execute(['year' => $year]);
                } else {
                    $stmt->execute();
                }
                
                $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                foreach ($data as &$row) {
                    $row['revenue'] = (float)$row['revenue'];
                }
                
                echo json_encode([
                    'success' => true,
                    'data' => $data
                ]);
                break;
            
            // Διαθέσιμα έτη για φιλτράρισμα
            case 'available_years':
                $stmt = $pdo->query("
                    SELECT DISTINCT YEAR(start_date) as year
                    FROM jobs
                    WHERE start_date IS NOT NULL
                    ORDER BY year DESC
                ");
                $years = $stmt->fetchAll(PDO::FETCH_COLUMN);
                
                echo json_encode([
                    'success' => true,
                    'data' => $years
                ]);
                break;
            
            // Γενική περίληψη
            case 'summary':
                $year = $_GET['year'] ?? date('Y');
                
                // Συνολικά στατιστικά - μόνο εξοφλημένες
                $stmt = $pdo->prepare("
                    SELECT 
                        COUNT(*) as total_jobs,
                        SUM(CASE WHEN status = 'Εξοφλήθηκε' OR is_paid = 1 THEN 1 ELSE 0 END) as completed_jobs,
                        SUM(CASE WHEN LOWER(status) LIKE '%εξέλιξη%' OR LOWER(status) LIKE '%progress%' THEN 1 ELSE 0 END) as in_progress_jobs,
                        SUM(CASE WHEN LOWER(status) LIKE '%εκκρεμ%' OR LOWER(status) = 'pending' OR LOWER(status) LIKE '%υποψ%' THEN 1 ELSE 0 END) as pending_jobs,
                        SUM(CASE WHEN status = 'Εξοφλήθηκε' OR is_paid = 1 THEN total_cost ELSE 0 END) as total_revenue,
                        SUM(CASE WHEN status = 'Εξοφλήθηκε' OR is_paid = 1 THEN materials_cost ELSE 0 END) as total_materials_cost,
                        SUM(CASE WHEN status = 'Εξοφλήθηκε' OR is_paid = 1 THEN (total_cost - materials_cost) ELSE 0 END) as total_profit,
                        AVG(CASE WHEN status = 'Εξοφλήθηκε' OR is_paid = 1 THEN total_cost ELSE NULL END) as avg_job_cost
                    FROM jobs
                    WHERE YEAR(start_date) = :year
                ");
                $stmt->execute(['year' => $year]);
                $summary = $stmt->fetch(PDO::FETCH_ASSOC);
                
                // Μετατροπή σε float
                $summary['total_revenue'] = (float)$summary['total_revenue'];
                $summary['total_materials_cost'] = (float)$summary['total_materials_cost'];
                $summary['total_profit'] = (float)$summary['total_profit'];
                $summary['avg_job_cost'] = (float)$summary['avg_job_cost'];
                
                echo json_encode([
                    'success' => true,
                    'data' => $summary
                ]);
                break;
            
            default:
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Μη έγκυρη ενέργεια'
                ]);
        }
        
    } else {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'message' => 'Μη επιτρεπτή μέθοδος'
        ]);
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Σφάλμα βάσης δεδομένων: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Σφάλμα: ' . $e->getMessage()
    ]);
}
