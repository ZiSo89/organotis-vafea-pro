<?php
/**
 * Κοινές βοηθητικές για το ημερολόγιο + ενοποίηση Εργασιών ↔ calendar_events.
 */

require_once __DIR__ . '/../config/google.php';

/* ========================================
   Migrations
   ======================================== */

function ensure_job_visit_columns($db) {
    static $done = false;
    if ($done) return;
    try {
        $cols = [
            'visit_start_time' => "ADD COLUMN visit_start_time TIME NULL",
            'visit_end_time'   => "ADD COLUMN visit_end_time TIME NULL",
            'visit_all_day'    => "ADD COLUMN visit_all_day TINYINT(1) NOT NULL DEFAULT 1",
            'visit_end_date'   => "ADD COLUMN visit_end_date DATE NULL COMMENT 'Λήξη πολυήμερης επίσκεψης (≠ end_date έργου)'",
        ];
        foreach ($cols as $name => $ddl) {
            $exists = $db->query("SHOW COLUMNS FROM jobs LIKE '" . $name . "'")->fetch();
            if (!$exists) {
                $db->exec("ALTER TABLE jobs " . $ddl);
            }
        }
    } catch (Exception $e) {
        error_log('ensure_job_visit_columns: ' . $e->getMessage());
    }
    $done = true;
}

/** Σύνδεση calendar_events ↔ job_visits (συνεδρίες Start/Stop). */
function ensure_calendar_job_visit_link($db) {
    static $done = false;
    if ($done) return;
    try {
        $exists = $db->query("SHOW COLUMNS FROM calendar_events LIKE 'job_visit_id'")->fetch();
        if (!$exists) {
            $db->exec("ALTER TABLE calendar_events ADD COLUMN job_visit_id int(11) DEFAULT NULL COMMENT 'Συνεδρία job_visits (Start/Stop)' AFTER job_id");
            $db->exec("ALTER TABLE calendar_events ADD KEY idx_calendar_events_job_visit_id (job_visit_id)");
        }
    } catch (Exception $e) {
        error_log('ensure_calendar_job_visit_link: ' . $e->getMessage());
    }
    $done = true;
}

/** Μία προγραμματισμένη επίσκεψη ανά εργασία — αφαίρεση διπλότυπων (όχι session events). */
function dedupe_calendar_events_for_job($db, $jobId, $keepId = null) {
    if (!$jobId) return;
    ensure_calendar_job_visit_link($db);
    $stmt = $db->prepare("
        SELECT id FROM calendar_events
        WHERE job_id = ?
          AND (job_visit_id IS NULL OR job_visit_id = 0)
        ORDER BY id ASC
    ");
    $stmt->execute([$jobId]);
    $ids = $stmt->fetchAll(PDO::FETCH_COLUMN);
    if (count($ids) <= 1) return;

    $keep = $keepId && in_array((int) $keepId, array_map('intval', $ids), true)
        ? (int) $keepId
        : (int) $ids[0];

    foreach ($ids as $id) {
        if ((int) $id === $keep) continue;
        $row = $db->prepare("SELECT google_event_id FROM calendar_events WHERE id = ?");
        $row->execute([$id]);
        $gid = $row->fetchColumn();
        if ($gid) {
            google_delete_remote_event($gid);
        }
        $db->prepare("DELETE FROM calendar_events WHERE id = ?")->execute([$id]);
    }
}

/** Καθαρισμός προγραμματισμού — επιστρέφει true αν ενημερώθηκε γραμμή. */
function clear_job_visit_schedule($db, $jobId) {
    if (!$jobId) return false;
    ensure_job_visit_columns($db);
    try {
        $stmt = $db->prepare("
            UPDATE jobs SET
                next_visit = NULL,
                visit_end_date = NULL,
                visit_start_time = NULL,
                visit_end_time = NULL,
                visit_all_day = 1,
                updated_at = NOW()
            WHERE id = ?
              AND (next_visit IS NOT NULL OR visit_end_date IS NOT NULL
                   OR visit_start_time IS NOT NULL OR visit_end_time IS NOT NULL)
        ");
        $stmt->execute([$jobId]);
        return $stmt->rowCount() > 0;
    } catch (Exception $e) {
        error_log('clear_job_visit_schedule: ' . $e->getMessage());
        // Fallback αν λείπουν νέες στήλες
        try {
            $stmt = $db->prepare("UPDATE jobs SET next_visit = NULL, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$jobId]);
            return $stmt->rowCount() > 0;
        } catch (Exception $e2) {
            error_log('clear_job_visit_schedule fallback: ' . $e2->getMessage());
        }
    }
    return false;
}

/**
 * Εργασίες με next_visit αλλά χωρίς calendar_event (ασυνέπεια μετά από Google delete).
 */
function reconcile_jobs_missing_calendar_visit($db) {
    ensure_job_visit_columns($db);
    try {
        $stmt = $db->prepare("
            UPDATE jobs j
            SET j.next_visit = NULL,
                j.visit_end_date = NULL,
                j.visit_start_time = NULL,
                j.visit_end_time = NULL,
                j.visit_all_day = 1,
                j.updated_at = NOW()
            WHERE j.next_visit IS NOT NULL
              AND j.next_visit != '0000-00-00'
              AND NOT EXISTS (
                  SELECT 1 FROM calendar_events ce
                  WHERE ce.job_id = j.id
                    AND (ce.job_visit_id IS NULL OR ce.job_visit_id = 0)
              )
        ");
        $stmt->execute();
        return (int) $stmt->rowCount();
    } catch (Exception $e) {
        error_log('reconcile_jobs_missing_calendar_visit: ' . $e->getMessage());
        try {
            $stmt = $db->prepare("
                UPDATE jobs j
                SET j.next_visit = NULL, j.updated_at = NOW()
                WHERE j.next_visit IS NOT NULL
                  AND NOT EXISTS (SELECT 1 FROM calendar_events ce WHERE ce.job_id = j.id AND (ce.job_visit_id IS NULL OR ce.job_visit_id = 0))
            ");
            $stmt->execute();
            return (int) $stmt->rowCount();
        } catch (Exception $e2) {
            error_log('reconcile_jobs_missing_calendar_visit fallback: ' . $e2->getMessage());
        }
    }
    return 0;
}

/* ========================================
   Status / χρώμα
   ======================================== */

function normalizeEventStatus($status) {
    $s = mb_strtolower(trim((string) $status), 'UTF-8');

    $map = [
        'ολοκληρώθηκε'      => 'completed',
        'εξοφλήθηκε'        => 'completed',
        'σε εξέλιξη'        => 'in_progress',
        'προγραμματισμένη'  => 'confirmed',
        'υποψήφιος'         => 'pending',
        'σε αναμονή'        => 'pending',
        'ακυρώθηκε'         => 'cancelled',
        'completed'         => 'completed',
        'in_progress'       => 'in_progress',
        'in-progress'       => 'in_progress',
        'confirmed'         => 'confirmed',
        'pending'           => 'pending',
        'cancelled'         => 'cancelled',
    ];

    return $map[$s] ?? 'pending';
}

function denormalizeEventStatusToJob($eventStatus) {
    switch (normalizeEventStatus($eventStatus)) {
        case 'completed':   return 'Ολοκληρώθηκε';
        case 'in_progress': return 'Σε εξέλιξη';
        case 'confirmed':   return 'Προγραμματισμένη';
        case 'cancelled':   return 'Ακυρώθηκε';
        default:            return 'Υποψήφιος';
    }
}

function getEventColor($status) {
    switch (normalizeEventStatus($status)) {
        case 'completed':   return '#10b981';
        case 'in_progress': return '#3b82f6';
        case 'confirmed':   return '#8b5cf6';
        case 'pending':     return '#f59e0b';
        case 'cancelled':   return '#ef4444';
        default:            return '#6b7280';
    }
}

/* ========================================
   Auto-push μεμονωμένου event στο Google
   ======================================== */

function calendar_push_event_to_google($db, $eventId) {
    if (!function_exists('google_push_local_row') || !google_is_configured() || !google_is_connected()) {
        return;
    }
    try {
        $stmt = $db->prepare("
            SELECT ce.*, c.name AS client_name, c.phone AS client_phone
            FROM calendar_events ce
            LEFT JOIN clients c ON ce.client_id = c.id
            WHERE ce.id = ?
        ");
        $stmt->execute([$eventId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            google_push_local_row($db, $row);
        }
    } catch (Exception $e) {
        error_log('calendar_push_event_to_google: ' . $e->getMessage());
    }
}

/* ========================================
   Εργασία -> calendar_event (UPSERT)
   ======================================== */

function upsert_calendar_event_for_job($db, $jobId) {
    if (!$jobId) return;

    ensure_job_visit_columns($db);

    $stmt = $db->prepare("
        SELECT j.*, c.name AS client_name
        FROM jobs j
        LEFT JOIN clients c ON j.client_id = c.id
        WHERE j.id = ?
    ");
    $stmt->execute([$jobId]);
    $job = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$job) return;

    $nextVisit = $job['next_visit'] ?? null;
    $hasVisit = $nextVisit && $nextVisit !== '' && substr($nextVisit, 0, 10) !== '0000-00-00';

    $stmt = $db->prepare("SELECT * FROM calendar_events WHERE job_id = ? ORDER BY id ASC LIMIT 1");
    $stmt->execute([$jobId]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    dedupe_calendar_events_for_job($db, $jobId, $existing ? $existing['id'] : null);

    if (!$hasVisit) {
        if ($existing) {
            if (!empty($existing['google_event_id'])) {
                google_delete_remote_event($existing['google_event_id']);
            }
            $db->prepare("DELETE FROM calendar_events WHERE id = ?")->execute([$existing['id']]);
        }
        return;
    }

    $cleanTitle  = $job['client_name'] ?: ($job['title'] ?: 'Εργασία');
    $description = $job['notes'] ?? '';
    $address     = $job['address'] ?? '';
    $status      = normalizeEventStatus($job['status'] ?? '');
    $color       = getEventColor($job['status'] ?? '');
    $startDate   = substr($nextVisit, 0, 10);

    $startTime = !empty($job['visit_start_time']) ? $job['visit_start_time'] : null;
    $endTime   = !empty($job['visit_end_time'])   ? $job['visit_end_time']   : null;
    if (isset($job['visit_all_day'])) {
        $allDay = (int) $job['visit_all_day'];
    } else {
        $allDay = $startTime ? 0 : 1;
    }

    // visit_end_date = λήξη επίσκεψης· calendar_events.end_date μένει πεδίο ημερολογίου.
    $endDate = $startDate;
    $visitEnd = $job['visit_end_date'] ?? null;
    if (!empty($visitEnd) && substr($visitEnd, 0, 10) !== '0000-00-00') {
        $ve = substr($visitEnd, 0, 10);
        if ($ve >= $startDate) {
            $endDate = $ve;
        }
    } elseif ($existing && !empty($existing['end_date'])) {
        $evEnd = substr($existing['end_date'], 0, 10);
        if ($evEnd >= $startDate) {
            $endDate = $evEnd;
        }
    }

    if ($existing && !$startTime && !empty($existing['start_time'])) {
        $startTime = $existing['start_time'];
    }
    if ($existing && !$endTime && !empty($existing['end_time'])) {
        $endTime = $existing['end_time'];
    }

    if ($existing) {
        // Υπάρχουσα επίσκεψη: ενημέρωσε ΜΟΝΟ πρόγραμμα + status/χρώμα (όχι title/address/description)
        $upd = $db->prepare("
            UPDATE calendar_events SET
                client_id = :client_id,
                start_date = :start_date,
                end_date = :end_date,
                start_time = :start_time,
                end_time = :end_time,
                all_day = :all_day,
                status = :status,
                color = :color,
                updated_at = NOW()
            WHERE id = :id
        ");
        $upd->execute([
            ':client_id' => $job['client_id'],
            ':start_date' => $startDate,
            ':end_date' => $endDate,
            ':start_time' => $startTime,
            ':end_time' => $endTime,
            ':all_day' => $allDay,
            ':status' => $status,
            ':color' => $color,
            ':id' => $existing['id'],
        ]);
        $eventId = $existing['id'];
    } else {
        $ins = $db->prepare("
            INSERT INTO calendar_events
                (title, original_title, client_id, job_id, start_date, end_date,
                 start_time, end_time, all_day, status, address, description, color, created_at)
            VALUES
                (:title, :original_title, :client_id, :job_id, :start_date, :end_date,
                 :start_time, :end_time, :all_day, :status, :address, :description, :color, NOW())
        ");
        $ins->execute([
            ':title' => $cleanTitle,
            ':original_title' => $cleanTitle,
            ':client_id' => $job['client_id'],
            ':job_id' => $jobId,
            ':start_date' => $startDate,
            ':end_date' => $endDate,
            ':start_time' => $startTime,
            ':end_time' => $endTime,
            ':all_day' => $allDay,
            ':status' => $status,
            ':address' => $address,
            ':description' => $description,
            ':color' => $color,
        ]);
        $eventId = $db->lastInsertId();
    }

    calendar_push_event_to_google($db, $eventId);
}

/**
 * Αντίστροφος συγχρονισμός: επίσκεψη → εργασία (πρόγραμμα + status).
 */
function sync_event_back_to_job($db, $eventId) {
    ensure_job_visit_columns($db);

    $stmt = $db->prepare("SELECT * FROM calendar_events WHERE id = ?");
    $stmt->execute([$eventId]);
    $ev = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$ev || empty($ev['job_id'])) return;

    $startDate = substr($ev['start_date'], 0, 10);
    $endDate = !empty($ev['end_date']) ? substr($ev['end_date'], 0, 10) : $startDate;
    if ($endDate < $startDate) {
        $endDate = $startDate;
    }

    $jobStatus = denormalizeEventStatusToJob($ev['status'] ?? 'pending');

    $upd = $db->prepare("
        UPDATE jobs SET
            next_visit = :nv,
            visit_end_date = :ved,
            visit_start_time = :st,
            visit_end_time = :et,
            visit_all_day = :ad,
            status = :status,
            updated_at = NOW()
        WHERE id = :id
    ");
    $upd->execute([
        ':nv' => $startDate,
        ':ved' => $endDate,
        ':st' => $ev['start_time'] ?: null,
        ':et' => $ev['end_time'] ?: null,
        ':ad' => (int) ($ev['all_day'] ?? 1),
        ':status' => $jobStatus,
        ':id' => $ev['job_id'],
    ]);
}

/** Μετά από διαγραφή/ακύρωση event — καθάρισε την εργασία αν ήταν συνδεδεμένη. */
function clear_job_visit_after_event_removed($db, $jobId) {
    if ($jobId) {
        clear_job_visit_schedule($db, $jobId);
    }
}
