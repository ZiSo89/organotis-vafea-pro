<?php
/**
 * Material duplicate detection and merge API.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/auth_check.php';
require_once __DIR__ . '/material_identity.php';

checkAuthentication();

logApiRequest('/api/material_duplicates.php', $_SERVER['REQUEST_METHOD'], $_GET);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

$db = getDBConnection();
ensure_material_identity_schema($db);
$method = $_SERVER['REQUEST_METHOD'];

function get_duplicate_groups($db) {
    $stmt = $db->query("
        SELECT canonical_key
        FROM materials
        WHERE canonical_key IS NOT NULL AND canonical_key <> ''
        GROUP BY canonical_key
        HAVING COUNT(*) > 1
        ORDER BY MIN(name) ASC
    ");

    $groups = [];
    $itemStmt = $db->prepare("SELECT * FROM materials WHERE canonical_key = ? ORDER BY id ASC");
    foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $key) {
        $itemStmt->execute([$key]);
        $materials = array_map('convertKeys', $itemStmt->fetchAll());
        $groups[] = [
            'canonicalKey' => $key,
            'materials' => $materials
        ];
    }

    return $groups;
}

function normalize_material_ids($ids) {
    if (!is_array($ids)) return [];
    $result = [];
    foreach ($ids as $id) {
        $value = (int)$id;
        if ($value > 0 && !in_array($value, $result, true)) {
            $result[] = $value;
        }
    }
    return $result;
}

function update_job_paints_for_merge($db, $primary, $duplicates) {
    $duplicateById = [];
    foreach ($duplicates as $duplicate) {
        $duplicateById[(int)$duplicate['id']] = $duplicate;
    }

    $jobs = $db->query("SELECT id, paints FROM jobs WHERE paints IS NOT NULL AND paints <> ''")->fetchAll(PDO::FETCH_ASSOC);
    $update = $db->prepare("UPDATE jobs SET paints = :paints WHERE id = :id");
    $updatedJobs = 0;

    foreach ($jobs as $job) {
        $paints = json_decode($job['paints'], true);
        if (!is_array($paints)) continue;

        $changed = false;
        foreach ($paints as &$paint) {
            if (!is_array($paint)) continue;
            $materialId = (int)($paint['materialId'] ?? $paint['material_id'] ?? 0);
            if ($materialId > 0 && isset($duplicateById[$materialId])) {
                $paint['materialId'] = (int)$primary['id'];
                unset($paint['material_id']);
                $paint['name'] = $primary['name'];
                $paint['category'] = $primary['category'];
                if (!empty($primary['color_code'])) {
                    $paint['code'] = $primary['color_code'];
                    $paint['colorCode'] = $primary['color_code'];
                }
                $paint['unit'] = $primary['unit'] ?? ($paint['unit'] ?? null);
                $changed = true;
            }
        }
        unset($paint);

        if ($changed) {
            $update->execute([
                ':id' => $job['id'],
                ':paints' => json_encode($paints, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
            ]);
            $updatedJobs++;
        }
    }

    return $updatedJobs;
}

function merge_material_duplicates($db, $primaryId, $duplicateIds) {
    $primaryId = (int)$primaryId;
    $duplicateIds = normalize_material_ids($duplicateIds);
    $duplicateIds = array_values(array_filter($duplicateIds, function($id) use ($primaryId) {
        return $id !== $primaryId;
    }));
    if ($primaryId <= 0 || count($duplicateIds) === 0) {
        sendError('Επιλέξτε primary υλικό και τουλάχιστον ένα διπλό');
    }

    $ids = array_merge([$primaryId], $duplicateIds);
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $db->prepare("SELECT * FROM materials WHERE id IN ($placeholders) ORDER BY id ASC");
    $stmt->execute($ids);
    $materials = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (count($materials) !== count($ids)) {
        sendError('Δεν βρέθηκαν όλα τα υλικά προς συγχώνευση', 404);
    }

    $primary = null;
    $duplicates = [];
    foreach ($materials as $material) {
        if ((int)$material['id'] === $primaryId) {
            $primary = $material;
        } else {
            $duplicates[] = $material;
        }
    }
    if (!$primary) sendError('Το primary υλικό δεν βρέθηκε', 404);

    foreach ($duplicates as $duplicate) {
        if (($duplicate['canonical_key'] ?? '') !== ($primary['canonical_key'] ?? '')) {
            sendError('Τα υλικά δεν ανήκουν στο ίδιο duplicate group');
        }
    }

    $duplicatePlaceholders = implode(',', array_fill(0, count($duplicateIds), '?'));
    $totalStock = warehouse_safe_float($primary['stock'] ?? 0);
    $maxMinStock = warehouse_safe_float($primary['min_stock'] ?? 0);
    $unitPrice = warehouse_safe_float($primary['unit_price'] ?? 0);
    foreach ($duplicates as $duplicate) {
        $totalStock += warehouse_safe_float($duplicate['stock'] ?? 0);
        $maxMinStock = max($maxMinStock, warehouse_safe_float($duplicate['min_stock'] ?? 0));
        if ($unitPrice <= 0 && warehouse_safe_float($duplicate['unit_price'] ?? 0) > 0) {
            $unitPrice = warehouse_safe_float($duplicate['unit_price']);
        }
    }

    $db->beginTransaction();

    $params = array_merge([$primaryId], $duplicateIds);
    $db->prepare("UPDATE material_purchase_items SET material_id = ?, material_name = (SELECT name FROM materials WHERE id = ?) WHERE material_id IN ($duplicatePlaceholders)")
        ->execute(array_merge([$primaryId, $primaryId], $duplicateIds));
    $db->prepare("UPDATE material_stock_movements SET material_id = ? WHERE material_id IN ($duplicatePlaceholders)")
        ->execute($params);
    try {
        $db->prepare("UPDATE job_materials SET material_id = ? WHERE material_id IN ($duplicatePlaceholders)")
            ->execute($params);
    } catch (Exception $e) {
        error_log('job_materials merge skipped: ' . $e->getMessage());
    }

    $updatedJobs = update_job_paints_for_merge($db, $primary, $duplicates);

    $db->prepare("UPDATE materials SET stock = ?, min_stock = ?, unit_price = ? WHERE id = ?")
        ->execute([$totalStock, $maxMinStock, $unitPrice, $primaryId]);

    $delete = $db->prepare("DELETE FROM materials WHERE id IN ($duplicatePlaceholders)");
    $delete->execute($duplicateIds);

    $db->commit();

    $stmt = $db->prepare("SELECT * FROM materials WHERE id = ?");
    $stmt->execute([$primaryId]);

    return [
        'primary' => convertKeys($stmt->fetch()),
        'mergedIds' => $duplicateIds,
        'updatedJobs' => $updatedJobs
    ];
}

function warehouse_safe_float($value) {
    if ($value === null || $value === '') return 0.0;
    return (float)$value;
}

try {
    switch ($method) {
        case 'GET':
            sendSuccess(get_duplicate_groups($db));
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) sendError('Δεν υπάρχουν δεδομένα');
            sendSuccess(
                merge_material_duplicates($db, $input['primaryId'] ?? $input['primary_id'] ?? 0, $input['duplicateIds'] ?? $input['duplicate_ids'] ?? []),
                'Τα διπλά υλικά συγχωνεύτηκαν'
            );
            break;

        default:
            sendError('Μη έγκυρη μέθοδος', 405);
    }
} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    error_log('Material Duplicates API Error: ' . $e->getMessage());
    sendError('Σφάλμα: ' . $e->getMessage(), 500);
}
?>
