<?php
/**
 * Shared schema helpers for job visits & client payments.
 * Creates job_visits / job_payments tables lazily for existing installations
 * and adds billing_type / agreed_price columns to jobs.
 */

function ensure_job_visits_schema($db) {
    static $done = false;
    if ($done) return;

    $db->exec("
        CREATE TABLE IF NOT EXISTS job_visits (
            id int(11) NOT NULL AUTO_INCREMENT,
            job_id int(11) NOT NULL,
            visit_date date NOT NULL,
            workers longtext DEFAULT NULL,
            notes text DEFAULT NULL,
            created_at timestamp NOT NULL DEFAULT current_timestamp(),
            updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
            PRIMARY KEY (id),
            KEY idx_job_visits_job (job_id),
            KEY idx_job_visits_date (visit_date),
            CONSTRAINT job_visits_ibfk_1 FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $db->exec("
        CREATE TABLE IF NOT EXISTS job_payments (
            id int(11) NOT NULL AUTO_INCREMENT,
            job_id int(11) NOT NULL,
            payment_date date NOT NULL,
            amount decimal(10,2) NOT NULL DEFAULT 0.00,
            notes text DEFAULT NULL,
            created_at timestamp NOT NULL DEFAULT current_timestamp(),
            updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
            PRIMARY KEY (id),
            KEY idx_job_payments_job (job_id),
            KEY idx_job_payments_date (payment_date),
            CONSTRAINT job_payments_ibfk_1 FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    try {
        $visitCols = [
            'session_started_at' => "ADD COLUMN session_started_at datetime DEFAULT NULL COMMENT 'Χρόνος έναρξης της ενεργής συνεδρίας'",
            'session_ended_at' => "ADD COLUMN session_ended_at datetime DEFAULT NULL COMMENT 'Χρόνος λήξης της ενεργής συνεδρίας'",
            'session_duration_minutes' => "ADD COLUMN session_duration_minutes int(11) NOT NULL DEFAULT 0 COMMENT 'Διάρκεια συνεδρίας σε λεπτά'",
            'is_active' => "ADD COLUMN is_active tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Αν η συνεδρία είναι ενεργή'",
        ];
        foreach ($visitCols as $name => $ddl) {
            $exists = $db->query("SHOW COLUMNS FROM job_visits LIKE '" . $name . "'")->fetch();
            if (!$exists) {
                $db->exec("ALTER TABLE job_visits " . $ddl);
            }
        }
    } catch (Exception $e) {
        error_log('ensure_job_visits_schema (job_visits columns): ' . $e->getMessage());
    }

    // Νέες στήλες τιμολόγησης στα jobs
    try {
        $cols = [
            'billing_type' => "ADD COLUMN billing_type varchar(20) NOT NULL DEFAULT 'hourly' COMMENT 'hourly | fixed'",
            'agreed_price' => "ADD COLUMN agreed_price decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Συμφωνημένη τιμή (κατ αποκοπή)'",
            'charge_materials' => "ADD COLUMN charge_materials tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Χρέωση υλικών στον πελάτη'",
            'charge_km' => "ADD COLUMN charge_km tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Χρέωση χιλιομέτρων στον πελάτη'",
        ];
        foreach ($cols as $name => $ddl) {
            $exists = $db->query("SHOW COLUMNS FROM jobs LIKE '" . $name . "'")->fetch();
            if (!$exists) {
                $db->exec("ALTER TABLE jobs " . $ddl);
            }
        }
    } catch (Exception $e) {
        error_log('ensure_job_visits_schema (jobs columns): ' . $e->getMessage());
    }

    $done = true;
}

/**
 * Αθροίσματα ωρών/κόστους μιας επίσκεψης από το JSON πεδίο workers.
 * Επιστρέφει: total_hours, employee_hours, owner_hours, labor_cost (μόνο υπάλληλοι).
 */
function job_visit_totals($workers) {
    $toFloat = function($v) {
        if ($v === null || $v === '') return 0.0;
        return (float)$v;
    };

    if (is_string($workers)) {
        $workers = json_decode($workers, true);
    }
    if (!is_array($workers)) $workers = [];

    $totals = ['total_hours' => 0.0, 'employee_hours' => 0.0, 'owner_hours' => 0.0, 'labor_cost' => 0.0];
    foreach ($workers as $w) {
        if (!is_array($w)) continue;
        $hours = $toFloat($w['hours'] ?? $w['hoursAllocated'] ?? $w['hours_allocated'] ?? 0);
        $rate = $toFloat($w['hourlyRate'] ?? $w['hourly_rate'] ?? 0);
        $type = $w['workerType'] ?? $w['worker_type'] ?? 'employee';
        $totals['total_hours'] += $hours;
        if ($type === 'owner') {
            $totals['owner_hours'] += $hours;
        } else {
            $totals['employee_hours'] += $hours;
            $cost = isset($w['laborCost']) || isset($w['labor_cost'])
                ? $toFloat($w['laborCost'] ?? $w['labor_cost'])
                : $hours * $rate;
            $totals['labor_cost'] += $cost;
        }
    }
    return $totals;
}
?>
