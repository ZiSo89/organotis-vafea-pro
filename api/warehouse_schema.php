<?php
/**
 * Shared warehouse schema helpers.
 * Creates supplier/purchase/payment tables lazily for existing installations.
 */

function ensure_warehouse_schema($db) {
    $db->exec("
        CREATE TABLE IF NOT EXISTS suppliers (
            id int(11) NOT NULL AUTO_INCREMENT,
            name varchar(255) NOT NULL,
            phone varchar(50) DEFAULT NULL,
            email varchar(255) DEFAULT NULL,
            address text DEFAULT NULL,
            notes text DEFAULT NULL,
            created_at timestamp NOT NULL DEFAULT current_timestamp(),
            updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
            PRIMARY KEY (id),
            KEY idx_suppliers_name (name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $db->exec("
        CREATE TABLE IF NOT EXISTS material_purchases (
            id int(11) NOT NULL AUTO_INCREMENT,
            supplier_id int(11) NOT NULL,
            purchase_date date NOT NULL,
            reference_number varchar(100) DEFAULT NULL,
            notes text DEFAULT NULL,
            total_cost decimal(10,2) DEFAULT 0.00,
            created_at timestamp NOT NULL DEFAULT current_timestamp(),
            updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
            PRIMARY KEY (id),
            KEY idx_material_purchases_supplier (supplier_id),
            KEY idx_material_purchases_date (purchase_date),
            CONSTRAINT material_purchases_ibfk_1 FOREIGN KEY (supplier_id) REFERENCES suppliers (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $db->exec("
        CREATE TABLE IF NOT EXISTS material_purchase_items (
            id int(11) NOT NULL AUTO_INCREMENT,
            purchase_id int(11) NOT NULL,
            material_id int(11) DEFAULT NULL,
            material_name varchar(255) NOT NULL,
            quantity decimal(10,2) DEFAULT 0.00,
            unit varchar(50) DEFAULT NULL,
            unit_price decimal(10,2) DEFAULT 0.00,
            total_cost decimal(10,2) DEFAULT 0.00,
            notes text DEFAULT NULL,
            created_at timestamp NOT NULL DEFAULT current_timestamp(),
            PRIMARY KEY (id),
            KEY idx_purchase_items_purchase (purchase_id),
            KEY idx_purchase_items_material (material_id),
            CONSTRAINT material_purchase_items_ibfk_1 FOREIGN KEY (purchase_id) REFERENCES material_purchases (id) ON DELETE CASCADE,
            CONSTRAINT material_purchase_items_ibfk_2 FOREIGN KEY (material_id) REFERENCES materials (id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $db->exec("
        CREATE TABLE IF NOT EXISTS supplier_payments (
            id int(11) NOT NULL AUTO_INCREMENT,
            supplier_id int(11) NOT NULL,
            purchase_id int(11) DEFAULT NULL,
            payment_date date NOT NULL,
            amount decimal(10,2) NOT NULL DEFAULT 0.00,
            payment_method varchar(100) DEFAULT NULL,
            notes text DEFAULT NULL,
            created_at timestamp NOT NULL DEFAULT current_timestamp(),
            updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
            PRIMARY KEY (id),
            KEY idx_supplier_payments_supplier (supplier_id),
            KEY idx_supplier_payments_purchase (purchase_id),
            KEY idx_supplier_payments_date (payment_date),
            CONSTRAINT supplier_payments_ibfk_1 FOREIGN KEY (supplier_id) REFERENCES suppliers (id) ON DELETE CASCADE,
            CONSTRAINT supplier_payments_ibfk_2 FOREIGN KEY (purchase_id) REFERENCES material_purchases (id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $db->exec("
        CREATE TABLE IF NOT EXISTS material_stock_movements (
            id int(11) NOT NULL AUTO_INCREMENT,
            material_id int(11) NOT NULL,
            movement_date date NOT NULL,
            movement_type varchar(50) NOT NULL,
            quantity decimal(10,2) NOT NULL DEFAULT 0.00,
            previous_stock decimal(10,2) NOT NULL DEFAULT 0.00,
            new_stock decimal(10,2) NOT NULL DEFAULT 0.00,
            unit varchar(50) DEFAULT NULL,
            reference_type varchar(50) DEFAULT NULL,
            reference_id int(11) DEFAULT NULL,
            notes text DEFAULT NULL,
            created_at timestamp NOT NULL DEFAULT current_timestamp(),
            PRIMARY KEY (id),
            KEY idx_stock_movements_material (material_id),
            KEY idx_stock_movements_date (movement_date),
            KEY idx_stock_movements_reference (reference_type, reference_id),
            CONSTRAINT material_stock_movements_ibfk_1 FOREIGN KEY (material_id) REFERENCES materials (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
}

function warehouse_to_float($value) {
    if ($value === null || $value === '') return 0.0;
    return (float)$value;
}

function record_material_stock_movement($db, $materialId, $quantityDelta, $movementType, $options = []) {
    $materialId = (int)$materialId;
    $quantityDelta = warehouse_to_float($quantityDelta);
    if ($materialId <= 0 || $quantityDelta == 0.0) return null;

    $stmt = $db->prepare("SELECT id, name, unit, stock FROM materials WHERE id = ? FOR UPDATE");
    $stmt->execute([$materialId]);
    $material = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$material) {
        throw new Exception('Το υλικό δεν βρέθηκε');
    }

    $previousStock = warehouse_to_float($material['stock']);
    $newStock = max(0, $previousStock + $quantityDelta);

    $unitPrice = $options['unit_price'] ?? null;
    if ($unitPrice !== null && warehouse_to_float($unitPrice) >= 0) {
        $update = $db->prepare("UPDATE materials SET stock = :stock, unit_price = :unit_price WHERE id = :id");
        $update->execute([
            ':id' => $materialId,
            ':stock' => $newStock,
            ':unit_price' => warehouse_to_float($unitPrice)
        ]);
    } else {
        $update = $db->prepare("UPDATE materials SET stock = :stock WHERE id = :id");
        $update->execute([
            ':id' => $materialId,
            ':stock' => $newStock
        ]);
    }

    $movementDate = $options['movement_date'] ?? date('Y-m-d');
    $insert = $db->prepare("
        INSERT INTO material_stock_movements
            (material_id, movement_date, movement_type, quantity, previous_stock, new_stock, unit, reference_type, reference_id, notes)
        VALUES
            (:material_id, :movement_date, :movement_type, :quantity, :previous_stock, :new_stock, :unit, :reference_type, :reference_id, :notes)
    ");
    $insert->execute([
        ':material_id' => $materialId,
        ':movement_date' => $movementDate,
        ':movement_type' => $movementType,
        ':quantity' => $newStock - $previousStock,
        ':previous_stock' => $previousStock,
        ':new_stock' => $newStock,
        ':unit' => $options['unit'] ?? $material['unit'],
        ':reference_type' => $options['reference_type'] ?? null,
        ':reference_id' => $options['reference_id'] ?? null,
        ':notes' => $options['notes'] ?? null
    ]);

    return (int)$db->lastInsertId();
}
?>
