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

        // Helper: compute financials for a job row (billing WITHOUT VAT, expenses, profit)
        function compute_job_financials($job) {
            $toFloat = function($v) {
                if ($v === null || $v === '') return 0.0;
                return (float)$v;
            };

            // billingAmount preference order: billing_amount, hours*rate, total_cost/(1+vat), total_cost
            $billing = 0.0;
            if (isset($job['billing_amount'])) {
                $billing = $toFloat($job['billing_amount']);
            } elseif (isset($job['billingAmount'])) {
                $billing = $toFloat($job['billingAmount']);
            }

            if ($billing == 0.0) {
                $hours = $toFloat($job['billing_hours'] ?? $job['billingHours'] ?? 0);
                $rate = $toFloat($job['billing_rate'] ?? $job['billingRate'] ?? 0);
                if ($hours > 0 && $rate > 0) {
                    $billing = $hours * $rate;
                }
            }

            if ($billing == 0.0) {
                $total_cost = $toFloat($job['total_cost'] ?? $job['totalCost'] ?? 0);
                $vat = $toFloat($job['vat'] ?? 0);
                if ($total_cost > 0) {
                    if ($vat > 0) {
                        $denom = 1 + ($vat / 100.0);
                        if ($denom > 0) $billing = $total_cost / $denom;
                        else $billing = $total_cost;
                    } else {
                        $billing = $total_cost;
                    }
                }
            }

            $materials = $toFloat($job['materials_cost'] ?? $job['materialsCost'] ?? 0);
            $kilometers = $toFloat($job['kilometers'] ?? $job['km'] ?? 0);
            $cost_per_km = $toFloat($job['cost_per_km'] ?? $job['costPerKm'] ?? $job['travel_cost'] ?? 0.5);
            $travel = $kilometers * $cost_per_km;

            // parse assigned workers JSON if exists to compute labor cost
            $labor = 0.0;
            $assigned = $job['assigned_workers'] ?? $job['assignedWorkers'] ?? $job['workers'] ?? null;
            $decoded = null;
            if ($assigned) {
                if (is_string($assigned)) {
                    // decode; handle cases where the JSON string is encoded twice
                    $decoded = json_decode($assigned, true);
                    // if decoding produced another JSON string, decode again
                    if ($decoded !== null && !is_array($decoded) && is_string($decoded)) {
                        $decoded2 = json_decode($decoded, true);
                        if (is_array($decoded2)) {
                            $decoded = $decoded2;
                        }
                    }
                } elseif (is_array($assigned)) {
                    $decoded = $assigned;
                }

                if (is_array($decoded)) {
                    foreach ($decoded as $w) {
                        $labor += $toFloat($w['labor_cost'] ?? $w['laborCost'] ?? $w['cost'] ?? 0);
                    }
                }
            }

            $expenses = $materials + $labor + $travel;
            $profit = $billing - $expenses; // WITHOUT VAT

            return [
                'billing' => $billing,
                'materials' => $materials,
                'labor' => $labor,
                'travel' => $travel,
                'expenses' => $expenses,
                'profit' => $profit
            ];
        }

        switch ($action) {
            case 'revenue':
                $year = $_GET['year'] ?? date('Y');
                // Fetch jobs for the year and compute month aggregates in PHP
                $stmt = $pdo->prepare("SELECT * FROM jobs WHERE start_date IS NOT NULL AND YEAR(start_date) = :year AND (status = 'Εξοφλήθηκε' OR status = 'Ολοκληρώθηκε' OR is_paid = 1)");
                $stmt->execute(['year' => $year]);
                $jobs = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $months = [
                    1 => 'Ιανουάριος', 2 => 'Φεβρουάριος', 3 => 'Μάρτιος',
                    4 => 'Απρίλιος', 5 => 'Μάιος', 6 => 'Ιούνιος',
                    7 => 'Ιούλιος', 8 => 'Αύγουστος', 9 => 'Σεπτέμβριος',
                    10 => 'Οκτώβριος', 11 => 'Νοέμβριος', 12 => 'Δεκέμβριος'
                ];

                $agg = [];
                for ($m=1;$m<=12;$m++) {
                    $agg[$m] = ['month' => str_pad((string)$m,2,'0',STR_PAD_LEFT), 'month_name' => $months[$m], 'total_jobs' => 0, 'revenue' => 0.0, 'materials_cost' => 0.0, 'profit' => 0.0];
                }

                foreach ($jobs as $job) {
                    $dt = strtotime($job['start_date']);
                    if ($dt === false) continue;
                    $m = (int)date('n', $dt);
                    $fin = compute_job_financials($job);
                    $agg[$m]['total_jobs'] += 1;
                    $agg[$m]['revenue'] += $fin['billing'];
                    $agg[$m]['materials_cost'] += $fin['materials'];
                    $agg[$m]['profit'] += $fin['profit'];
                }

                $data = array_values($agg);
                echo json_encode(['success' => true, 'data' => $data]);
                break;
            
            // Έσοδα ανά έτος (σύνολο) - aggregate using job-level financials
            case 'revenue_by_year':
                $stmt = $pdo->prepare("SELECT * FROM jobs WHERE start_date IS NOT NULL AND (status = 'Εξοφλήθηκε' OR status = 'Ολοκληρώθηκε' OR is_paid = 1) ORDER BY start_date DESC");
                $stmt->execute();
                $jobs = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $years = [];
                foreach ($jobs as $job) {
                    $dt = strtotime($job['start_date']);
                    if ($dt === false) continue;
                    $y = (int)date('Y', $dt);
                    if (!isset($years[$y])) {
                        $years[$y] = ['year' => $y, 'total_jobs' => 0, 'billing' => 0.0, 'materials_cost' => 0.0, 'net_profit' => 0.0];
                    }
                    $fin = compute_job_financials($job);
                    $years[$y]['total_jobs'] += 1;
                    $years[$y]['billing'] += $fin['billing'];
                    $years[$y]['materials_cost'] += $fin['materials'];
                    $years[$y]['net_profit'] += $fin['profit'];
                }

                // Convert to array ordered by year desc
                $data = array_values($years);
                usort($data, function($a, $b) { return $b['year'] - $a['year']; });

                echo json_encode(['success' => true, 'data' => $data]);
                break;
            
            // Κατανομή εργασιών ανά τύπο
            case 'jobs_by_type':
                $year = isset($_GET['year']) ? $_GET['year'] : null;

                // Fetch jobs (filtered by year if provided) and aggregate by type using job-level financials
                $sql = "SELECT * FROM jobs WHERE (status = 'Εξοφλήθηκε' OR status = 'Ολοκληρώθηκε' OR is_paid = 1)";
                $params = [];
                if ($year) {
                    $sql .= " AND YEAR(start_date) = :year";
                    $params['year'] = $year;
                }
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                $jobs = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $byType = [];
                foreach ($jobs as $job) {
                    $type = isset($job['type']) && $job['type'] !== null ? $job['type'] : 'Χωρίς κατηγορία';
                    if (!isset($byType[$type])) {
                        $byType[$type] = ['job_type' => $type, 'count' => 0, 'billing' => 0.0, 'materials_cost' => 0.0, 'net_profit' => 0.0];
                    }
                    $fin = compute_job_financials($job);
                    $byType[$type]['count'] += 1;
                    $byType[$type]['billing'] += $fin['billing'];
                    $byType[$type]['materials_cost'] += $fin['materials'];
                    $byType[$type]['net_profit'] += $fin['profit'];
                }

                $data = array_values($byType);
                // Order by billing desc
                usort($data, function($a, $b) { return $b['billing'] <=> $a['billing']; });

                echo json_encode(['success' => true, 'data' => $data]);
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
                        AND (j.status = 'Εξοφλήθηκε' OR j.status = 'Ολοκληρώθηκε' OR j.is_paid = 1)
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

                    // Backward-compatible: compute billing_without_vat and net_profit for this job row
                    $fin = compute_job_financials($row);
                    $row['billing_without_vat'] = (float)$fin['billing'];
                    $row['net_profit'] = (float)$fin['profit'];
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
                    WHERE (j.status = 'Εξοφλήθηκε' OR j.status = 'Ολοκληρώθηκε' OR j.is_paid = 1)
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
                            AND (j.status = 'Εξοφλήθηκε' OR j.status = 'Ολοκληρώθηκε' OR j.is_paid = 1)
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
                $year = isset($_GET['year']) ? $_GET['year'] : null;

                // Fetch jobs and aggregate by normalized status label
                $sql = "SELECT * FROM jobs WHERE 1=1";
                $params = [];
                if ($year) {
                    $sql .= " AND YEAR(start_date) = :year";
                    $params['year'] = $year;
                }
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                $jobs = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $mapLabel = function($status) {
                    if (!$status) return 'Άλλες';
                    $s = mb_strtolower($status, 'UTF-8');
                    if (mb_strpos($s, 'υποψ') !== false || $s === 'candidate') return 'Υποψήφιος';
                    if (mb_strpos($s, 'προγραμ') !== false || $s === 'scheduled') return 'Προγραμματισμένη';
                    if (mb_strpos($s, 'εξέλι') !== false || mb_strpos($s, 'progress') !== false) return 'Σε εξέλιξη';
                    if (mb_strpos($s, 'αναμον') !== false || $s === 'waiting') return 'Σε αναμονή';
                    if (mb_strpos($s, 'ολοκληρ') !== false || $s === 'completed') return 'Ολοκληρώθηκε';
                    if (mb_strpos($s, 'εξοφλ') !== false || $s === 'paid') return 'Εξοφλήθηκε';
                    if (mb_strpos($s, 'ακυρ') !== false || $s === 'cancelled') return 'Ακυρώθηκε';
                    return 'Άλλες';
                };

                $agg = [];
                foreach ($jobs as $job) {
                    $label = $mapLabel($job['status']);
                    if (!isset($agg[$label])) $agg[$label] = ['status_label' => $label, 'status_key' => $job['status'], 'count' => 0, 'billing' => 0.0, 'net_profit' => 0.0];
                    $agg[$label]['count'] += 1;
                    $fin = compute_job_financials($job);
                    $agg[$label]['billing'] += $fin['billing'];
                    $agg[$label]['net_profit'] += $fin['profit'];
                }

                $data = array_values($agg);
                // Sort by count desc
                usort($data, function($a, $b) { return $b['count'] <=> $a['count']; });

                echo json_encode(['success' => true, 'data' => $data]);
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
                        SUM(CASE WHEN status = 'Εξοφλήθηκε' OR status = 'Ολοκληρώθηκε' OR is_paid = 1 THEN 1 ELSE 0 END) as completed_jobs,
                        SUM(CASE WHEN LOWER(status) LIKE '%εξέλιξη%' OR LOWER(status) LIKE '%progress%' THEN 1 ELSE 0 END) as in_progress_jobs,
                        SUM(CASE WHEN LOWER(status) LIKE '%εκκρεμ%' OR LOWER(status) = 'pending' OR LOWER(status) LIKE '%υποψ%' THEN 1 ELSE 0 END) as pending_jobs,
                        SUM(CASE WHEN status = 'Εξοφλήθηκε' OR status = 'Ολοκληρώθηκε' OR is_paid = 1 THEN total_cost ELSE 0 END) as total_revenue,
                        SUM(CASE WHEN status = 'Εξοφλήθηκε' OR status = 'Ολοκληρώθηκε' OR is_paid = 1 THEN materials_cost ELSE 0 END) as total_materials_cost,
                        SUM(CASE WHEN status = 'Εξοφλήθηκε' OR status = 'Ολοκληρώθηκε' OR is_paid = 1 THEN (total_cost - materials_cost) ELSE 0 END) as total_profit,
                        AVG(CASE WHEN status = 'Εξοφλήθηκε' OR status = 'Ολοκληρώθηκε' OR is_paid = 1 THEN total_cost ELSE NULL END) as avg_job_cost
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

                // Backward-compatible totals computed via job-level financials
                $billingSum = 0.0;
                $profitSum = 0.0;
                $stmt2 = $pdo->prepare("SELECT * FROM jobs WHERE YEAR(start_date) = :year AND (status = 'Εξοφλήθηκε' OR status = 'Ολοκληρώθηκε' OR is_paid = 1)");
                $stmt2->execute(['year' => $year]);
                $jobsYear = $stmt2->fetchAll(PDO::FETCH_ASSOC);
                foreach ($jobsYear as $jr) {
                    $fin = compute_job_financials($jr);
                    $billingSum += $fin['billing'];
                    $profitSum += $fin['profit'];
                }

                $summary['billing_without_vat'] = (float)$billingSum;
                $summary['net_profit'] = (float)$profitSum;

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
