<?php
/**
 * Shared material identity helpers.
 * Keeps duplicate detection consistent across materials and purchases APIs.
 */

function material_category_options() {
    return [
        'Χρώμα',
        'Αστάρι',
        'Βερνίκι / Λούστρο',
        'Στόκος / Σπατουλάρισμα',
        'Διαλυτικό / Καθαριστικό',
        'Ταινίες / Προστασία',
        'Ρολά / Πινέλα',
        'Εργαλεία',
        'Άλλο'
    ];
}

function material_normalize_text($value) {
    $text = trim((string)($value ?? ''));
    $text = str_replace(
        ['Ά','Έ','Ή','Ί','Ό','Ύ','Ώ','Ϊ','Ϋ','ά','έ','ή','ί','ό','ύ','ώ','ϊ','ϋ','ΐ','ΰ'],
        ['Α','Ε','Η','Ι','Ο','Υ','Ω','Ι','Υ','α','ε','η','ι','ο','υ','ω','ι','υ','ι','υ'],
        $text
    );
    $text = function_exists('mb_strtolower') ? mb_strtolower($text, 'UTF-8') : strtolower($text);
    $text = preg_replace('/[^\p{L}\p{N}]+/u', ' ', $text);
    $text = preg_replace('/\s+/u', ' ', $text);
    return trim($text);
}

function material_normalize_code($value) {
    $text = trim((string)($value ?? ''));
    $text = str_replace(
        ['Ά','Έ','Ή','Ί','Ό','Ύ','Ώ','Ϊ','Ϋ','ά','έ','ή','ί','ό','ύ','ώ','ϊ','ϋ','ΐ','ΰ'],
        ['Α','Ε','Η','Ι','Ο','Υ','Ω','Ι','Υ','α','ε','η','ι','ο','υ','ω','ι','υ','ι','υ'],
        $text
    );
    $text = function_exists('mb_strtoupper') ? mb_strtoupper($text, 'UTF-8') : strtoupper($text);
    return preg_replace('/[^\p{L}\p{N}]+/u', '', $text);
}

function material_name_key($value) {
    $normalized = material_normalize_text($value);
    if ($normalized === '') return '';
    $words = preg_split('/\s+/u', $normalized, -1, PREG_SPLIT_NO_EMPTY);
    sort($words, SORT_STRING);
    return implode(' ', $words);
}

function material_normalize_category($category) {
    $aliases = [
        'χρωματα' => 'Χρώμα',
        'χρωμα' => 'Χρώμα',
        'ασταρια' => 'Αστάρι',
        'ασταρι' => 'Αστάρι',
        'βερνικι λουστρο' => 'Βερνίκι / Λούστρο',
        'βερνικια λουστρα' => 'Βερνίκι / Λούστρο',
        'στοκος σπατουλαρισμα' => 'Στόκος / Σπατουλάρισμα',
        'στοκοι σπατουλαρισματα' => 'Στόκος / Σπατουλάρισμα',
        'διαλυτικο καθαριστικο' => 'Διαλυτικό / Καθαριστικό',
        'διαλυτικα καθαριστικα' => 'Διαλυτικό / Καθαριστικό',
        'ταινιες προστασια' => 'Ταινίες / Προστασία',
        'ρολα πινελα' => 'Ρολά / Πινέλα',
        'εργαλεια' => 'Εργαλεία',
        'αλλο' => 'Άλλο'
    ];

    $normalized = material_normalize_text($category);
    if ($normalized === '') return 'Άλλο';
    if (isset($aliases[$normalized])) return $aliases[$normalized];

    foreach (material_category_options() as $option) {
        if (material_normalize_text($option) === $normalized) {
            return $option;
        }
    }

    return 'Άλλο';
}

function material_build_canonical_key($name, $category = null, $colorCode = null) {
    $categoryLabel = material_normalize_category($category);
    $categoryKey = material_normalize_text($categoryLabel);
    $codeKey = material_normalize_code($colorCode);
    if ($categoryLabel === 'Χρώμα' && $codeKey !== '') {
        return 'category:' . $categoryKey . '|color_code:' . $codeKey;
    }

    return 'category:' . $categoryKey . '|name:' . material_name_key($name);
}

function material_prepare_data($input) {
    $data = convertToSnakeCase($input);
    $name = trim($data['name'] ?? '');
    if ($name === '') sendError('Το όνομα υλικού είναι υποχρεωτικό');

    $category = material_normalize_category($data['category'] ?? 'Άλλο');
    $colorCode = $category === 'Χρώμα' ? trim($data['color_code'] ?? '') : '';

    return [
        'name' => $name,
        'category' => $category,
        'color_code' => $colorCode,
        'canonical_key' => material_build_canonical_key($name, $category, $colorCode),
        'unit' => $data['unit'] ?? 'τμχ',
        'unit_price' => $data['unit_price'] ?? 0,
        'stock' => $data['stock'] ?? 0,
        'min_stock' => $data['min_stock'] ?? 0
    ];
}

function ensure_material_identity_schema($db) {
    $columns = $db->query("SHOW COLUMNS FROM materials")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('color_code', $columns, true)) {
        $db->exec("ALTER TABLE materials ADD COLUMN color_code varchar(100) DEFAULT NULL AFTER category");
    }
    if (!in_array('canonical_key', $columns, true)) {
        $db->exec("ALTER TABLE materials ADD COLUMN canonical_key varchar(512) DEFAULT NULL AFTER color_code");
    }

    try {
        $indexes = $db->query("SHOW INDEX FROM materials WHERE Key_name = 'idx_materials_canonical_key'")->fetchAll();
        if (count($indexes) === 0) {
            $db->exec("ALTER TABLE materials ADD KEY idx_materials_canonical_key (canonical_key)");
        }
    } catch (Exception $e) {
        error_log('Material canonical index check failed: ' . $e->getMessage());
    }

    $stmt = $db->query("SELECT id, name, category, color_code, canonical_key FROM materials");
    $update = $db->prepare("
        UPDATE materials
        SET category = :category, color_code = :color_code, canonical_key = :canonical_key
        WHERE id = :id
    ");
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $category = material_normalize_category($row['category'] ?? 'Άλλο');
        $colorCode = $category === 'Χρώμα' ? trim($row['color_code'] ?? '') : '';
        $canonicalKey = material_build_canonical_key($row['name'] ?? '', $category, $colorCode);
        if (($row['category'] ?? '') !== $category || ($row['color_code'] ?? '') !== $colorCode || ($row['canonical_key'] ?? '') !== $canonicalKey) {
            $update->execute([
                ':id' => $row['id'],
                ':category' => $category,
                ':color_code' => $colorCode ?: null,
                ':canonical_key' => $canonicalKey
            ]);
        }
    }
}

function find_material_duplicate($db, $prepared, $excludeId = null) {
    $params = [':canonical_key' => $prepared['canonical_key']];
    $sql = "SELECT * FROM materials WHERE canonical_key = :canonical_key";
    if ($excludeId !== null) {
        $sql .= " AND id <> :exclude_id";
        $params[':exclude_id'] = (int)$excludeId;
    }
    $sql .= " ORDER BY id ASC LIMIT 1";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $duplicate = $stmt->fetch(PDO::FETCH_ASSOC);
    return $duplicate ?: null;
}

function find_material_by_normalized_name($db, $name, $excludeId = null) {
    $target = material_name_key($name);
    if ($target === '') return null;

    $params = [];
    $sql = "SELECT * FROM materials";
    if ($excludeId !== null) {
        $sql .= " WHERE id <> :exclude_id";
        $params[':exclude_id'] = (int)$excludeId;
    }
    $sql .= " ORDER BY id ASC";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $material) {
        if (material_name_key($material['name'] ?? '') === $target) {
            return $material;
        }
    }

    return null;
}
?>
