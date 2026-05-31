<?php
/**
 * Οργανωτής Βαφέα Pro - Google Calendar αμφίδρομος συγχρονισμός
 *
 * Συγχρονίζει τον πίνακα calendar_events <-> Google Calendar.
 * Κάθε Google event σημειώνεται με extendedProperties.private.painterEventId = local id,
 * ώστε να γίνεται αντιστοίχιση και στις δύο κατευθύνσεις (incl. deletes).
 *
 * Actions:
 *   ?action=sync   (POST) -> pull + push + delete reconcile
 */

require_once __DIR__ . '/../config/google.php';
require_once __DIR__ . '/calendar_helpers.php';
require_once __DIR__ . '/auth_check.php';
checkAuthentication();

header('Content-Type: application/json; charset=utf-8');

// Ο συγχρονισμός κάνει πολλές διαδοχικές κλήσεις στο Google API
@set_time_limit(180);

// APP_TZ + local_to_google_event ορίζονται πλέον στο config/google.php (κοινή χρήση)

function gcjson($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/** Εξασφαλίζει ότι υπάρχει η στήλη google_event_id στο calendar_events */
function ensure_google_event_id_column($db) {
    $col = $db->query("SHOW COLUMNS FROM calendar_events LIKE 'google_event_id'")->fetch();
    if (!$col) {
        $db->exec("ALTER TABLE calendar_events ADD COLUMN google_event_id VARCHAR(255) NULL");
        $db->exec("CREATE INDEX idx_calendar_google_event_id ON calendar_events (google_event_id)");
    }
}

/* ========================================
   Μετατροπές local <-> Google event
   ======================================== */

// local_to_google_event() -> config/google.php (κοινή χρήση με auto-sync)

/** Google event -> πεδία για το local calendar_events */
function google_to_local_fields($event) {
    $fields = [
        'title' => $event['summary'] ?? 'Επίσκεψη',
        'description' => $event['description'] ?? null,
        'address' => $event['location'] ?? null,
    ];

    if (isset($event['start']['date'])) {
        // All-day
        $fields['all_day'] = 1;
        $fields['start_date'] = $event['start']['date'];
        $endDate = $event['end']['date'] ?? $event['start']['date'];
        // Google end.date είναι exclusive -> -1 ημέρα για inclusive αποθήκευση
        $fields['end_date'] = (new DateTime($endDate))->modify('-1 day')->format('Y-m-d');
        $fields['start_time'] = null;
        $fields['end_time'] = null;
    } else {
        $fields['all_day'] = 0;
        $start = new DateTime($event['start']['dateTime']);
        $fields['start_date'] = $start->format('Y-m-d H:i:s');
        $fields['start_time'] = $start->format('H:i:s');
        if (isset($event['end']['dateTime'])) {
            $end = new DateTime($event['end']['dateTime']);
            $fields['end_date'] = $end->format('Y-m-d');
            $fields['end_time'] = $end->format('H:i:s');
        }
    }

    return $fields;
}

/* ========================================
   Sync
   ======================================== */

/**
 * Two-way conflict resolution: γράφει το Google πάνω στο τοπικό ΜΟΝΟ αν είναι πιο πρόσφατο.
 * (Ισχύει και για events συνδεδεμένα με εργασία — έτσι αν αλλάξεις ημέρα στο Google, περνάει στο app.)
 * Χρησιμοποιεί UNIX_TIMESTAMP από τη MySQL ώστε να αποφεύγονται λάθη ζώνης ώρας.
 */
function pull_should_overwrite($db, $localId, $googleUpdated) {
    $stmt = $db->prepare("
        SELECT UNIX_TIMESTAMP(COALESCE(updated_at, created_at)) AS local_epoch
        FROM calendar_events WHERE id = ?
    ");
    $stmt->execute([$localId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    // Δεν υπάρχει τοπικά -> το painterId είναι stale· μην κάνεις τίποτα (το delete-reconcile θα το καθαρίσει)
    if (!$row) return false;
    if (empty($googleUpdated)) return false;

    $localEpoch = (int) ($row['local_epoch'] ?? 0);
    if ($localEpoch <= 0) return true; // χωρίς τοπικό timestamp -> άσε το Google να περάσει

    try {
        $googleEpoch = (new DateTime($googleUpdated))->getTimestamp(); // RFC3339 με tz
        // 5s ανοχή ώστε να μη «χτυπιούνται» σχεδόν ταυτόχρονες αλλαγές
        return $googleEpoch > ($localEpoch + 5);
    } catch (Exception $e) {
        return false; // σε αμφιβολία, μην πατήσεις τα τοπικά
    }
}

/** Βρίσκει job_id πριν τη διαγραφή local event (painterId ή google_event_id). */
function lookup_job_for_google_event($db, $painterId, $googleEventId) {
    if ($painterId) {
        $stmt = $db->prepare("SELECT job_id FROM calendar_events WHERE id = ?");
        $stmt->execute([$painterId]);
        $jid = $stmt->fetchColumn();
        if ($jid) return (int) $jid;
    }
    if ($googleEventId) {
        $stmt = $db->prepare("SELECT job_id FROM calendar_events WHERE google_event_id = ?");
        $stmt->execute([$googleEventId]);
        $jid = $stmt->fetchColumn();
        if ($jid) return (int) $jid;
    }
    return null;
}

/**
 * Φόρτωσε όλα τα Google event ids (ενεργά + cancelled) με pagination — μία κλήση/σελίδα, όχι N GETs.
 * @return array{0: array<string,true>, 1: array<string,array>} activeIds, cancelledEvents by id
 */
function fetch_google_event_maps($encCalId) {
    $activeIds = [];
    $cancelledEvents = [];
    $pageToken = null;
    do {
        $query = [
            'singleEvents' => 'true',
            'showDeleted' => 'true',
            'maxResults' => 250,
        ];
        if ($pageToken) {
            $query['pageToken'] = $pageToken;
        }
        list($status, $json) = google_api('GET', "/calendars/$encCalId/events", $query);
        if ($status !== 200) {
            break;
        }
        foreach (($json['items'] ?? []) as $event) {
            $gid = $event['id'] ?? null;
            if (!$gid) {
                continue;
            }
            if (($event['status'] ?? '') === 'cancelled') {
                $cancelledEvents[$gid] = $event;
            } else {
                $activeIds[$gid] = true;
            }
        }
        $pageToken = $json['nextPageToken'] ?? null;
    } while ($pageToken);

    return [$activeIds, $cancelledEvents];
}

/** Διαγραφή local event + καθαρισμός εργασίας. */
function remove_local_calendar_event($db, $localId, $jobId, &$result) {
    if ($jobId) {
        clear_job_visit_after_event_removed($db, $jobId);
    }
    $db->prepare('DELETE FROM calendar_events WHERE id = ?')->execute([$localId]);
    $result['deletedLocal']++;
}

/**
 * Συγκρίνει local events με Google: cancelled / εξαφανισμένα → διαγραφή local + καθαρισμός job.
 */
function reconcile_google_deletions($db, $encCalId, &$result) {
    list($activeIds, $cancelledEvents) = fetch_google_event_maps($encCalId);

    // Cancelled στο Google (με painterEventId)
    foreach ($cancelledEvents as $gid => $event) {
        $painterId = $event['extendedProperties']['private']['painterEventId'] ?? null;
        $linkedJobId = lookup_job_for_google_event($db, $painterId, $gid);

        if ($painterId) {
            $sel = $db->prepare('SELECT id, job_id FROM calendar_events WHERE id = ? OR google_event_id = ?');
            $sel->execute([$painterId, $gid]);
            while ($row = $sel->fetch(PDO::FETCH_ASSOC)) {
                $jid = $row['job_id'] ?: $linkedJobId;
                remove_local_calendar_event($db, $row['id'], $jid, $result);
            }
        } else {
            $sel = $db->prepare('SELECT id, job_id FROM calendar_events WHERE google_event_id = ?');
            $sel->execute([$gid]);
            while ($row = $sel->fetch(PDO::FETCH_ASSOC)) {
                $jid = $row['job_id'] ?: $linkedJobId;
                remove_local_calendar_event($db, $row['id'], $jid, $result);
            }
        }
        if ($linkedJobId) {
            clear_job_visit_after_event_removed($db, $linkedJobId);
            $result['clearedJobs']++;
        }
    }

    // Local με google_event_id που δεν είναι πλέον ενεργό στο Google
    $locals = $db->query("
        SELECT id, google_event_id, job_id
        FROM calendar_events
        WHERE google_event_id IS NOT NULL AND TRIM(google_event_id) != ''
    ")->fetchAll(PDO::FETCH_ASSOC);

    foreach ($locals as $row) {
        $gid = $row['google_event_id'];
        if (isset($activeIds[$gid])) {
            continue;
        }
        remove_local_calendar_event($db, $row['id'], $row['job_id'] ?? null, $result);
    }
}

function run_sync() {
    if (!google_is_configured()) {
        gcjson(['success' => false, 'error' => 'Google OAuth δεν έχει ρυθμιστεί.'], 500);
    }
    if (!google_is_connected()) {
        gcjson(['success' => false, 'error' => 'Δεν υπάρχει σύνδεση με Google Calendar.'], 400);
    }

    $db = getDBConnection();
    ensure_google_event_id_column($db);
    ensure_job_visit_columns($db);

    // ΠΑΝΤΑ ξεχωριστό ημερολόγιο εφαρμογής - ποτέ το primary του χρήστη
    $appCalId = google_ensure_app_calendar();
    if ($appCalId === '' || $appCalId === 'primary') {
        gcjson(['success' => false, 'error' => 'Άκυρο app calendar (ασφάλεια: δεν συγχρονίζουμε στο primary).'], 500);
    }
    $calId = rawurlencode($appCalId);

    $result = ['pulled' => 0, 'pushed' => 0, 'deletedRemote' => 0, 'deletedLocal' => 0, 'clearedJobs' => 0, 'errors' => []];

    // Τοπικά events που «κέρδισε» το Google στο PULL -> δεν τα ξαναπατάμε στο PUSH
    $pulledIds = [];

    /* ---------- 1) PULL: Google -> local (Google νικάει μόνο αν είναι πιο πρόσφατο) ---------- */
    $lastSync = google_meta_get('last_sync');
    $pageToken = null;
    do {
        $query = [
            'singleEvents' => 'true',
            'showDeleted' => 'true',
            'maxResults' => 250,
        ];
        if ($lastSync) {
            // updatedMin πρέπει να είναι RFC3339
            $query['updatedMin'] = (new DateTime($lastSync))->format('Y-m-d\TH:i:sP');
        }
        if ($pageToken) {
            $query['pageToken'] = $pageToken;
        }

        list($status, $json) = google_api('GET', "/calendars/$calId/events", $query);
        if ($status !== 200) {
            // Αν λήξει το updatedMin window ή άλλο σφάλμα, κάνε full pull
            $result['errors'][] = 'pull: HTTP ' . $status . ' ' . json_encode($json);
            break;
        }

        foreach (($json['items'] ?? []) as $event) {
            try {
                $painterId = $event['extendedProperties']['private']['painterEventId'] ?? null;
                $isCancelled = (($event['status'] ?? '') === 'cancelled');

                if ($isCancelled) {
                    $linkedJobId = lookup_job_for_google_event($db, $painterId, $event['id'] ?? null);
                    if ($painterId) {
                        $del = $db->prepare("DELETE FROM calendar_events WHERE id = ? OR google_event_id = ?");
                        $del->execute([$painterId, $event['id']]);
                        if ($del->rowCount() > 0) $result['deletedLocal']++;
                    } else {
                        $del = $db->prepare("DELETE FROM calendar_events WHERE google_event_id = ?");
                        $del->execute([$event['id']]);
                        if ($del->rowCount() > 0) $result['deletedLocal']++;
                    }
                    if ($linkedJobId) {
                        clear_job_visit_after_event_removed($db, $linkedJobId);
                        $result['clearedJobs']++;
                    }
                    continue;
                }

                $fields = google_to_local_fields($event);

                if ($painterId) {
                    // Υπάρχον local event -> overwrite ΜΟΝΟ αν το Google είναι πιο πρόσφατο
                    if (pull_should_overwrite($db, $painterId, $event['updated'] ?? null)) {
                        $upd = $db->prepare("
                            UPDATE calendar_events
                            SET title = :title, description = :description, address = :address,
                                all_day = :all_day, start_date = :start_date, end_date = :end_date,
                                start_time = :start_time, end_time = :end_time,
                                google_event_id = :gid, updated_at = NOW()
                            WHERE id = :id
                        ");
                        $upd->execute([
                            ':title' => $fields['title'], ':description' => $fields['description'],
                            ':address' => $fields['address'], ':all_day' => $fields['all_day'],
                            ':start_date' => $fields['start_date'], ':end_date' => $fields['end_date'] ?? null,
                            ':start_time' => $fields['start_time'] ?? null, ':end_time' => $fields['end_time'] ?? null,
                            ':gid' => $event['id'], ':id' => $painterId,
                        ]);
                        $pulledIds[(string) $painterId] = true;
                        // Αν είναι συνδεδεμένο με εργασία, ενημέρωσε και την εργασία (ημ/νία/ώρες)
                        try { sync_event_back_to_job($db, $painterId); } catch (Exception $e) { /* ignore */ }
                        $result['pulled']++;
                    }
                } else {
                    // Δημιουργήθηκε απευθείας στο Google -> νέο local event + tag πίσω
                    $ins = $db->prepare("
                        INSERT INTO calendar_events
                            (title, description, address, all_day, start_date, end_date, start_time, end_time, status, google_event_id, created_at)
                        VALUES (:title, :description, :address, :all_day, :start_date, :end_date, :start_time, :end_time, 'pending', :gid, NOW())
                    ");
                    $ins->execute([
                        ':title' => $fields['title'], ':description' => $fields['description'],
                        ':address' => $fields['address'], ':all_day' => $fields['all_day'],
                        ':start_date' => $fields['start_date'], ':end_date' => $fields['end_date'] ?? null,
                        ':start_time' => $fields['start_time'] ?? null, ':end_time' => $fields['end_time'] ?? null,
                        ':gid' => $event['id'],
                    ]);
                    $newId = $db->lastInsertId();
                    $pulledIds[(string) $newId] = true;
                    // Tag το Google event με το painterEventId
                    google_api('PATCH', "/calendars/$calId/events/" . rawurlencode($event['id']), [], [
                        'extendedProperties' => ['private' => ['painterEventId' => (string) $newId]],
                    ]);
                    $result['pulled']++;
                }
            } catch (Exception $e) {
                $result['errors'][] = 'pull item: ' . $e->getMessage();
            }
        }

        $pageToken = $json['nextPageToken'] ?? null;
    } while ($pageToken);

    // Google deletions (batch — γρήγορο, πριν το PUSH)
    reconcile_google_deletions($db, $calId, $result);

    /* ---------- 2) PUSH: local -> Google (εκτός όσων μόλις κέρδισε το Google) ---------- */
    $rows = $db->query("
        SELECT ce.*, c.name AS client_name, c.phone AS client_phone
        FROM calendar_events ce
        LEFT JOIN clients c ON ce.client_id = c.id
        ORDER BY ce.id ASC
    ")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as $row) {
        // Το Google ήταν πιο πρόσφατο γι' αυτό -> μην το ξαναπατήσεις
        if (isset($pulledIds[(string) $row['id']])) {
            continue;
        }
        try {
            $payload = local_to_google_event($row);
            if (!empty($row['google_event_id'])) {
                // Update υπάρχοντος
                list($status, $json) = google_api('PATCH',
                    "/calendars/$calId/events/" . rawurlencode($row['google_event_id']), [], $payload);
                if ($status === 200) {
                    $result['pushed']++;
                } elseif ($status === 404 || $status === 410) {
                    // Διαγράφηκε στο Google — ΜΗΝ το ξαναδημιουργήσεις· καθάρισε local + εργασία
                    if (!empty($row['job_id'])) {
                        clear_job_visit_after_event_removed($db, $row['job_id']);
                        $result['clearedJobs']++;
                    }
                    $db->prepare('DELETE FROM calendar_events WHERE id = ?')->execute([$row['id']]);
                    $result['deletedLocal']++;
                } else {
                    $result['errors'][] = 'push update ' . $row['id'] . ': HTTP ' . $status;
                }
            } else {
                // Δημιουργία νέου
                list($status, $json) = google_api('POST', "/calendars/$calId/events", [], $payload);
                if ($status === 200 && isset($json['id'])) {
                    $u = $db->prepare("UPDATE calendar_events SET google_event_id = ? WHERE id = ?");
                    $u->execute([$json['id'], $row['id']]);
                    $result['pushed']++;
                } else {
                    $result['errors'][] = 'push insert ' . $row['id'] . ': HTTP ' . $status;
                }
            }
        } catch (Exception $e) {
            $result['errors'][] = 'push ' . $row['id'] . ': ' . $e->getMessage();
        }
    }

    /* ---------- 3) DELETE reconcile: local deleted -> Google ---------- */
    // Βρες Google events που έχουν painterEventId αλλά δεν υπάρχει local εγγραφή
    $localIds = $db->query("SELECT id FROM calendar_events")->fetchAll(PDO::FETCH_COLUMN);
    $localIdSet = array_flip(array_map('strval', $localIds));

    $pageToken = null;
    do {
        $query = ['singleEvents' => 'true', 'maxResults' => 250];
        if ($pageToken) $query['pageToken'] = $pageToken;
        list($status, $json) = google_api('GET', "/calendars/$calId/events", $query);
        if ($status !== 200) {
            $result['errors'][] = 'delete-reconcile: HTTP ' . $status;
            break;
        }
        foreach (($json['items'] ?? []) as $event) {
            $painterId = $event['extendedProperties']['private']['painterEventId'] ?? null;
            if ($painterId !== null && !isset($localIdSet[(string) $painterId])) {
                try {
                    google_api('DELETE', "/calendars/$calId/events/" . rawurlencode($event['id']));
                    $result['deletedRemote']++;
                } catch (Exception $e) {
                    $result['errors'][] = 'delete remote: ' . $e->getMessage();
                }
            }
        }
        $pageToken = $json['nextPageToken'] ?? null;
    } while ($pageToken);

    google_meta_set('last_sync', (new DateTime('now', new DateTimeZone('UTC')))->format('Y-m-d\TH:i:sP'));

    // Τελικός καθαρισμός: εργασίες με next_visit χωρίς επίσκεψη στο ημερολόγιο
    $result['clearedJobs'] += reconcile_jobs_missing_calendar_visit($db);

    $result['success'] = count($result['errors']) === 0;
    return $result;
}

try {
    $action = $_GET['action'] ?? 'sync';
    if ($action === 'sync') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            gcjson(['success' => false, 'error' => 'Χρησιμοποίησε POST'], 405);
        }
        $res = run_sync();
        gcjson($res);
    }
    gcjson(['success' => false, 'error' => 'Άγνωστη ενέργεια'], 400);
} catch (Exception $e) {
    error_log('Google Calendar sync error: ' . $e->getMessage());
    gcjson(['success' => false, 'error' => $e->getMessage()], 500);
}
