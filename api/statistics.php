<?php
/* ========================================
   Statistics API - Στατιστικά
   ======================================== */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Sync-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/auth_check.php';
require_once __DIR__ . '/job_financials.php';
require_once __DIR__ . '/material_identity.php';

checkAuthentication();

function stats_month_names() {
    return [
        1 => 'Ιανουάριος',
        2 => 'Φεβρουάριος',
        3 => 'Μάρτιος',
        4 => 'Απρίλιος',
        5 => 'Μάιος',
        6 => 'Ιούνιος',
        7 => 'Ιούλιος',
        8 => 'Αύγουστος',
        9 => 'Σεπτέμβριος',
        10 => 'Οκτώβριος',
        11 => 'Νοέμβριος',
        12 => 'Δεκέμβριος'
    ];
}

function stats_valid_date($value) {
    if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) return null;
    $date = DateTime::createFromFormat('Y-m-d', $value);
    return $date ? $date->format('Y-m-d') : null;
}

function stats_period_from_request($params) {
    $now = new DateTime('today');
    $year = isset($params['year']) && preg_match('/^\d{4}$/', (string)$params['year'])
        ? (int)$params['year']
        : (int)$now->format('Y');
    $month = isset($params['month']) && preg_match('/^\d{1,2}$/', (string)$params['month'])
        ? max(1, min(12, (int)$params['month']))
        : null;
    $preset = $params['period'] ?? '';

    $startInput = stats_valid_date($params['start_date'] ?? '');
    $endInput = stats_valid_date($params['end_date'] ?? '');

    if ($startInput && $endInput) {
        $start = new DateTime($startInput);
        $end = new DateTime($endInput);
        $end->modify('+1 day');
        $label = 'Προσαρμοσμένη περίοδος';
        $period = 'custom';
    } elseif ($preset === 'current_month') {
        $start = new DateTime($now->format('Y-m-01'));
        $end = (clone $start)->modify('+1 month');
        $label = 'Τρέχων μήνας';
        $period = 'current_month';
        $year = (int)$start->format('Y');
        $month = (int)$start->format('n');
    } elseif ($preset === 'previous_month') {
        $start = new DateTime($now->format('Y-m-01'));
        $start->modify('-1 month');
        $end = (clone $start)->modify('+1 month');
        $label = 'Προηγούμενος μήνας';
        $period = 'previous_month';
        $year = (int)$start->format('Y');
        $month = (int)$start->format('n');
    } elseif ($preset === 'last12') {
        $start = new DateTime($now->format('Y-m-01'));
        $start->modify('-11 months');
        $end = new DateTime($now->format('Y-m-01'));
        $end->modify('+1 month');
        $label = 'Τελευταίοι 12 μήνες';
        $period = 'last12';
        $month = null;
    } elseif ($month !== null) {
        $start = new DateTime(sprintf('%04d-%02d-01', $year, $month));
        $end = (clone $start)->modify('+1 month');
        $label = stats_month_names()[$month] . ' ' . $year;
        $period = 'month';
    } else {
        $start = new DateTime(sprintf('%04d-01-01', $year));
        $end = new DateTime(sprintf('%04d-01-01', $year + 1));
        $label = (string)$year;
        $period = 'year';
    }

    if ($end <= $start) {
        $end = (clone $start)->modify('+1 day');
    }

    return [
        'period' => $period,
        'label' => $label,
        'year' => $year,
        'month' => $month,
        'start_date' => $start->format('Y-m-d'),
        'end_date' => $end->format('Y-m-d'),
        'end_date_inclusive' => (clone $end)->modify('-1 day')->format('Y-m-d'),
        'status' => trim((string)($params['status'] ?? '')),
        'type' => trim((string)($params['type'] ?? '')),
        'client_id' => isset($params['client_id']) && $params['client_id'] !== '' ? (int)$params['client_id'] : null
    ];
}

function stats_previous_period($filter) {
    $start = new DateTime($filter['start_date']);
    $end = new DateTime($filter['end_date']);
    $days = max(1, (int)$start->diff($end)->format('%a'));
    $previousEnd = clone $start;
    $previousStart = (clone $start)->modify('-' . $days . ' days');

    $previous = $filter;
    $previous['start_date'] = $previousStart->format('Y-m-d');
    $previous['end_date'] = $previousEnd->format('Y-m-d');
    $previous['end_date_inclusive'] = (clone $previousEnd)->modify('-1 day')->format('Y-m-d');
    $previous['label'] = 'Προηγούμενη περίοδος';
    return $previous;
}

function stats_fetch_jobs(PDO $pdo, $filter) {
    $conditions = [
        'j.date IS NOT NULL',
        'j.date >= :start_date',
        'j.date < :end_date'
    ];
    $params = [
        'start_date' => $filter['start_date'],
        'end_date' => $filter['end_date']
    ];

    if ($filter['type'] !== '') {
        $conditions[] = 'j.type = :type';
        $params['type'] = $filter['type'];
    }
    if ($filter['client_id']) {
        $conditions[] = 'j.client_id = :client_id';
        $params['client_id'] = $filter['client_id'];
    }

    $sql = "
        SELECT j.*, c.name AS client_name
        FROM jobs j
        LEFT JOIN clients c ON j.client_id = c.id
        WHERE " . implode(' AND ', $conditions) . "
        ORDER BY j.date ASC, j.id ASC
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $jobs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if ($filter['status'] !== '') {
        $wanted = $filter['status'];
        $jobs = array_values(array_filter($jobs, function($job) use ($wanted) {
            return job_financial_status_label($job['status'] ?? '') === $wanted;
        }));
    }

    return $jobs;
}

function stats_empty_summary() {
    return [
        'total_jobs' => 0,
        'completed_jobs' => 0,
        'paid_jobs' => 0,
        'billable_jobs' => 0,
        'in_progress_jobs' => 0,
        'pending_jobs' => 0,
        'cancelled_jobs' => 0,
        'billing_amount' => 0.0,
        'total_revenue' => 0.0,
        'total_expenses' => 0.0,
        'total_materials_cost' => 0.0,
        'total_labor_cost' => 0.0,
        'total_travel_cost' => 0.0,
        'net_profit' => 0.0,
        'total_profit' => 0.0,
        'profit_margin' => 0.0,
        'avg_job_value' => 0.0,
        'avg_net_profit' => 0.0,
        'unpaid_amount' => 0.0
    ];
}

function stats_month_key($date) {
    $time = strtotime($date);
    return $time ? date('Y-m', $time) : null;
}

function stats_build_month_buckets($filter) {
    $months = stats_month_names();
    $start = new DateTime(substr($filter['start_date'], 0, 7) . '-01');
    $end = new DateTime($filter['end_date']);
    $includeYear = $filter['period'] !== 'year';
    $buckets = [];

    while ($start < $end) {
        $key = $start->format('Y-m');
        $monthNumber = (int)$start->format('n');
        $buckets[$key] = [
            'month' => $start->format('m'),
            'month_key' => $key,
            'month_name' => $includeYear ? $months[$monthNumber] . ' ' . $start->format('Y') : $months[$monthNumber],
            'total_jobs' => 0,
            'revenue' => 0.0,
            'billing' => 0.0,
            'materials_cost' => 0.0,
            'labor_cost' => 0.0,
            'travel_cost' => 0.0,
            'expenses' => 0.0,
            'profit' => 0.0
        ];
        $start->modify('+1 month');
    }

    return $buckets;
}

function stats_material_key($paint) {
    $name = trim((string)($paint['name'] ?? $paint['material_name'] ?? $paint['materialName'] ?? $paint['color'] ?? 'Άγνωστο'));
    $category = $paint['category'] ?? 'Χρώμα';
    $colorCode = $paint['color_code'] ?? $paint['colorCode'] ?? '';

    if (function_exists('material_build_canonical_key')) {
        return material_build_canonical_key($name, $category, $colorCode);
    }

    return mb_strtolower($category . '|' . $name . '|' . $colorCode, 'UTF-8');
}

function stats_build_dataset($jobs, $visitTotals, $filter, $topLimit = 10) {
    $summary = stats_empty_summary();
    $revenue = stats_build_month_buckets($filter);
    $types = [];
    $statuses = [];
    $materials = [];
    $topJobs = [];

    foreach ($jobs as $job) {
        $jobId = (int)($job['id'] ?? 0);
        $status = job_financial_status_label($job['status'] ?? '');
        $type = trim((string)($job['type'] ?? ''));
        if ($type === '') $type = 'Χωρίς κατηγορία';

        $financials = job_financial_compute($job, $visitTotals[$jobId] ?? null);
        $isBillable = job_financial_is_billable($job);
        $isPaid = job_financial_is_paid($job);

        $summary['total_jobs'] += 1;
        if ($status === 'Ολοκληρώθηκε' || $status === 'Εξοφλήθηκε') $summary['completed_jobs'] += 1;
        if ($isPaid) $summary['paid_jobs'] += 1;
        if ($isBillable) $summary['billable_jobs'] += 1;
        if ($status === 'Σε εξέλιξη') $summary['in_progress_jobs'] += 1;
        if ($status === 'Υποψήφιος' || $status === 'Προγραμματισμένη' || $status === 'Σε αναμονή') $summary['pending_jobs'] += 1;
        if ($status === 'Ακυρώθηκε') $summary['cancelled_jobs'] += 1;
        if (!$isPaid && $financials['billing'] > 0) $summary['unpaid_amount'] += $financials['billing'];

        if (!isset($types[$type])) {
            $types[$type] = [
                'job_type' => $type,
                'type' => $type,
                'count' => 0,
                'billable_count' => 0,
                'billing' => 0.0,
                'net_profit' => 0.0
            ];
        }
        $types[$type]['count'] += 1;

        if (!isset($statuses[$status])) {
            $statuses[$status] = [
                'status_label' => $status,
                'status' => $status,
                'count' => 0,
                'billing' => 0.0,
                'net_profit' => 0.0
            ];
        }
        $statuses[$status]['count'] += 1;

        if (!$isBillable) continue;

        $summary['billing_amount'] += $financials['billing'];
        $summary['total_revenue'] += $financials['billing'];
        $summary['total_expenses'] += $financials['expenses'];
        $summary['total_materials_cost'] += $financials['materials'];
        $summary['total_labor_cost'] += $financials['labor'];
        $summary['total_travel_cost'] += $financials['travel'];
        $summary['net_profit'] += $financials['profit'];
        $summary['total_profit'] += $financials['profit'];

        $types[$type]['billable_count'] += 1;
        $types[$type]['billing'] += $financials['billing'];
        $types[$type]['net_profit'] += $financials['profit'];
        $statuses[$status]['billing'] += $financials['billing'];
        $statuses[$status]['net_profit'] += $financials['profit'];

        $monthKey = stats_month_key($job['date'] ?? null);
        if ($monthKey && isset($revenue[$monthKey])) {
            $revenue[$monthKey]['total_jobs'] += 1;
            $revenue[$monthKey]['revenue'] += $financials['billing'];
            $revenue[$monthKey]['billing'] += $financials['billing'];
            $revenue[$monthKey]['materials_cost'] += $financials['materials'];
            $revenue[$monthKey]['labor_cost'] += $financials['labor'];
            $revenue[$monthKey]['travel_cost'] += $financials['travel'];
            $revenue[$monthKey]['expenses'] += $financials['expenses'];
            $revenue[$monthKey]['profit'] += $financials['profit'];
        }

        $paints = job_financial_decode_json($job['paints'] ?? null);
        if (is_array($paints)) {
            foreach ($paints as $paint) {
                if (!is_array($paint)) continue;
                $name = trim((string)($paint['name'] ?? $paint['material_name'] ?? $paint['materialName'] ?? $paint['color'] ?? 'Άγνωστο'));
                if ($name === '') $name = 'Άγνωστο';
                $key = stats_material_key($paint);
                if (!isset($materials[$key])) {
                    $materials[$key] = [
                        'name' => $name,
                        'category' => $paint['category'] ?? 'Χρώμα',
                        'unit' => $paint['unit'] ?? 'χρήσεις',
                        'total_quantity' => 0.0,
                        'total_cost' => 0.0,
                        'jobs_count' => 0,
                        '_jobs' => []
                    ];
                }
                $materials[$key]['total_quantity'] += job_financial_to_float($paint['quantity'] ?? 1);
                $materials[$key]['total_cost'] += job_financial_to_float($paint['total_cost'] ?? $paint['totalCost'] ?? $paint['cost'] ?? $paint['price'] ?? 0);
                $materials[$key]['_jobs'][$jobId] = true;
            }
        }

        $topJobs[] = [
            'id' => $jobId,
            'title' => $job['title'] ?? 'Εργασία #' . $jobId,
            'client_name' => $job['client_name'] ?? null,
            'type' => $type,
            'date' => $job['date'] ?? null,
            'status' => $status,
            'revenue' => (float)$financials['billing'],
            'billing_amount' => (float)$financials['billing'],
            'materials_cost' => (float)$financials['materials'],
            'labor_cost' => (float)$financials['labor'],
            'travel_cost' => (float)$financials['travel'],
            'expenses' => (float)$financials['expenses'],
            'profit' => (float)$financials['profit'],
            'net_profit' => (float)$financials['profit']
        ];
    }

    if ($summary['billing_amount'] > 0) {
        $summary['profit_margin'] = ($summary['net_profit'] / $summary['billing_amount']) * 100;
    }
    if ($summary['billable_jobs'] > 0) {
        $summary['avg_job_value'] = $summary['billing_amount'] / $summary['billable_jobs'];
        $summary['avg_net_profit'] = $summary['net_profit'] / $summary['billable_jobs'];
    }

    $types = array_values($types);
    usort($types, function($a, $b) {
        return $b['billing'] <=> $a['billing'] ?: $b['count'] <=> $a['count'];
    });

    $statuses = array_values($statuses);
    usort($statuses, function($a, $b) {
        return $b['count'] <=> $a['count'];
    });

    $materials = array_map(function($material) {
        $material['jobs_count'] = count($material['_jobs']);
        unset($material['_jobs']);
        return $material;
    }, array_values($materials));
    usort($materials, function($a, $b) {
        return $b['total_cost'] <=> $a['total_cost'] ?: $b['total_quantity'] <=> $a['total_quantity'];
    });
    $materials = array_slice($materials, 0, 10);

    usort($topJobs, function($a, $b) {
        return $b['net_profit'] <=> $a['net_profit'];
    });
    $topJobs = array_slice($topJobs, 0, $topLimit);

    return [
        'summary' => $summary,
        'revenue' => array_values($revenue),
        'jobs_by_type' => $types,
        'jobs_status' => $statuses,
        'materials_usage' => $materials,
        'top_jobs' => $topJobs
    ];
}

function stats_delta($current, $previous) {
    $change = $current - $previous;
    return [
        'current' => (float)$current,
        'previous' => (float)$previous,
        'change' => (float)$change,
        'percent' => $previous != 0 ? (float)(($change / abs($previous)) * 100) : null
    ];
}

function stats_build_comparison($currentSummary, $previousSummary) {
    return [
        'billing_amount' => stats_delta($currentSummary['billing_amount'], $previousSummary['billing_amount']),
        'net_profit' => stats_delta($currentSummary['net_profit'], $previousSummary['net_profit']),
        'profit_margin' => stats_delta($currentSummary['profit_margin'], $previousSummary['profit_margin']),
        'total_jobs' => stats_delta($currentSummary['total_jobs'], $previousSummary['total_jobs']),
        'completed_jobs' => stats_delta($currentSummary['completed_jobs'], $previousSummary['completed_jobs'])
    ];
}

function stats_filter_options(PDO $pdo) {
    $types = $pdo->query("
        SELECT DISTINCT type
        FROM jobs
        WHERE type IS NOT NULL AND type <> ''
        ORDER BY type ASC
    ")->fetchAll(PDO::FETCH_COLUMN);

    $rawStatuses = $pdo->query("
        SELECT DISTINCT status
        FROM jobs
        WHERE status IS NOT NULL AND status <> ''
        ORDER BY status ASC
    ")->fetchAll(PDO::FETCH_COLUMN);
    $statuses = [];
    foreach ($rawStatuses as $status) {
        $statuses[job_financial_status_label($status)] = true;
    }

    $clients = $pdo->query("
        SELECT id, name
        FROM clients
        ORDER BY name ASC
    ")->fetchAll(PDO::FETCH_ASSOC);

    return [
        'types' => array_values($types),
        'statuses' => array_keys($statuses),
        'clients' => array_map(function($client) {
            return ['id' => (int)$client['id'], 'name' => $client['name']];
        }, $clients)
    ];
}

function stats_available_years(PDO $pdo) {
    $stmt = $pdo->query("
        SELECT DISTINCT YEAR(date) AS year
        FROM jobs
        WHERE date IS NOT NULL
        ORDER BY year DESC
    ");
    $years = array_values(array_filter($stmt->fetchAll(PDO::FETCH_COLUMN)));
    if (count($years) === 0) $years[] = date('Y');
    return $years;
}

function stats_overview(PDO $pdo, $params, $topLimit = 10) {
    $filter = stats_period_from_request($params);
    $jobs = stats_fetch_jobs($pdo, $filter);
    $jobIds = array_map(function($job) { return (int)$job['id']; }, $jobs);
    $visitTotals = job_financial_fetch_visit_totals_for_jobs($pdo, $jobIds);
    $dataset = stats_build_dataset($jobs, $visitTotals, $filter, $topLimit);

    $previousFilter = stats_previous_period($filter);
    $previousJobs = stats_fetch_jobs($pdo, $previousFilter);
    $previousIds = array_map(function($job) { return (int)$job['id']; }, $previousJobs);
    $previousVisitTotals = job_financial_fetch_visit_totals_for_jobs($pdo, $previousIds);
    $previousDataset = stats_build_dataset($previousJobs, $previousVisitTotals, $previousFilter, $topLimit);

    return [
        'filters' => [
            'period' => $filter['period'],
            'label' => $filter['label'],
            'year' => $filter['year'],
            'month' => $filter['month'],
            'start_date' => $filter['start_date'],
            'end_date' => $filter['end_date_inclusive'],
            'status' => $filter['status'],
            'type' => $filter['type'],
            'client_id' => $filter['client_id']
        ],
        'previous_filters' => [
            'label' => $previousFilter['label'],
            'start_date' => $previousFilter['start_date'],
            'end_date' => $previousFilter['end_date_inclusive']
        ],
        'summary' => $dataset['summary'],
        'comparison' => stats_build_comparison($dataset['summary'], $previousDataset['summary']),
        'revenue' => $dataset['revenue'],
        'jobs_by_type' => $dataset['jobs_by_type'],
        'jobs_status' => $dataset['jobs_status'],
        'materials_usage' => $dataset['materials_usage'],
        'top_jobs' => $dataset['top_jobs'],
        'filter_options' => stats_filter_options($pdo)
    ];
}

function stats_revenue_by_year(PDO $pdo) {
    $stmt = $pdo->query("
        SELECT *
        FROM jobs
        WHERE date IS NOT NULL
        ORDER BY date DESC, id ASC
    ");
    $jobs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $jobIds = array_map(function($job) { return (int)$job['id']; }, $jobs);
    $visitTotals = job_financial_fetch_visit_totals_for_jobs($pdo, $jobIds);
    $years = [];

    foreach ($jobs as $job) {
        if (!job_financial_is_billable($job)) continue;
        $time = strtotime($job['date']);
        if (!$time) continue;
        $year = (int)date('Y', $time);
        if (!isset($years[$year])) {
            $years[$year] = [
                'year' => $year,
                'total_jobs' => 0,
                'billing' => 0.0,
                'materials_cost' => 0.0,
                'net_profit' => 0.0
            ];
        }
        $fin = job_financial_compute($job, $visitTotals[(int)$job['id']] ?? null);
        $years[$year]['total_jobs'] += 1;
        $years[$year]['billing'] += $fin['billing'];
        $years[$year]['materials_cost'] += $fin['materials'];
        $years[$year]['net_profit'] += $fin['profit'];
    }

    $data = array_values($years);
    usort($data, function($a, $b) { return $b['year'] <=> $a['year']; });
    return $data;
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        sendError('Μη επιτρεπτή μέθοδος', 405);
    }

    $pdo = getDBConnection();
    ensure_job_visits_schema($pdo);

    $action = $_GET['action'] ?? 'overview';
    $limit = isset($_GET['limit']) ? max(1, min(50, (int)$_GET['limit'])) : 10;

    switch ($action) {
        case 'available_years':
            sendSuccess(stats_available_years($pdo));
            break;

        case 'overview':
            sendSuccess(stats_overview($pdo, $_GET, $limit));
            break;

        case 'summary':
            $overview = stats_overview($pdo, $_GET, $limit);
            sendSuccess($overview['summary']);
            break;

        case 'revenue':
            $overview = stats_overview($pdo, $_GET, $limit);
            sendSuccess($overview['revenue']);
            break;

        case 'jobs_by_type':
            $overview = stats_overview($pdo, $_GET, $limit);
            sendSuccess($overview['jobs_by_type']);
            break;

        case 'jobs_status':
            $overview = stats_overview($pdo, $_GET, $limit);
            sendSuccess($overview['jobs_status']);
            break;

        case 'materials_usage':
            $overview = stats_overview($pdo, $_GET, $limit);
            sendSuccess($overview['materials_usage']);
            break;

        case 'top_jobs':
            $overview = stats_overview($pdo, $_GET, $limit);
            sendSuccess($overview['top_jobs']);
            break;

        case 'revenue_by_year':
            sendSuccess(stats_revenue_by_year($pdo));
            break;

        default:
            sendError('Μη έγκυρη ενέργεια', 400);
    }
} catch (PDOException $e) {
    sendError('Σφάλμα βάσης δεδομένων: ' . $e->getMessage(), 500);
} catch (Exception $e) {
    sendError('Σφάλμα: ' . $e->getMessage(), 500);
}
?>
