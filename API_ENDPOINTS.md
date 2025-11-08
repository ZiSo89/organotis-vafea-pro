# API Endpoints - Additional CRUD Files

Για να ολοκληρώσεις το API, δημιούργησε τα παρακάτω αρχεία στον φάκελο `api/`:

## 📁 Workers API (`api/workers.php`)

```php
<?php
define('API_ACCESS', true);
require_once 'config.php';
setCorsHeaders();
checkAuth();

$db = Database::getInstance()->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch($method) {
        case 'GET':
            $id = isset($_GET['id']) ? sanitize($_GET['id']) : null;
            if ($id) {
                $stmt = $db->prepare("SELECT * FROM workers WHERE id = ?");
                $stmt->execute([$id]);
                sendResponse($stmt->fetch() ?: []);
            } else {
                $stmt = $db->query("SELECT * FROM workers ORDER BY created_at DESC");
                sendResponse($stmt->fetchAll());
            }
            break;
            
        case 'POST':
            $data = getRequestBody();
            $stmt = $db->prepare("
                INSERT INTO workers (id, name, phone, specialty, hourly_rate, status, hire_date, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $data['id'] ?? 'W-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT),
                sanitize($data['name']),
                sanitize($data['phone'] ?? ''),
                sanitize($data['specialty'] ?? ''),
                $data['hourly_rate'] ?? 0,
                $data['status'] ?? 'active',
                $data['hire_date'] ?? date('Y-m-d'),
                sanitize($data['notes'] ?? '')
            ]);
            sendResponse(['success' => true, 'id' => $db->lastInsertId()], 201);
            break;
            
        case 'PUT':
            $data = getRequestBody();
            $id = $_GET['id'] ?? $data['id'] ?? null;
            $stmt = $db->prepare("
                UPDATE workers 
                SET name=?, phone=?, specialty=?, hourly_rate=?, status=?, hire_date=?, notes=? 
                WHERE id=?
            ");
            $stmt->execute([
                sanitize($data['name']),
                sanitize($data['phone']),
                sanitize($data['specialty']),
                $data['hourly_rate'],
                $data['status'],
                $data['hire_date'],
                sanitize($data['notes']),
                $id
            ]);
            sendResponse(['success' => true]);
            break;
            
        case 'DELETE':
            $id = $_GET['id'] ?? null;
            $stmt = $db->prepare("DELETE FROM workers WHERE id = ?");
            $stmt->execute([$id]);
            sendResponse(['success' => true]);
            break;
    }
} catch (Exception $e) {
    error_log('Error in workers.php: ' . $e->getMessage());
    sendError('An error occurred', 500);
}
?>
```

---

## 📁 Jobs API (`api/jobs.php`)

```php
<?php
define('API_ACCESS', true);
require_once 'config.php';
setCorsHeaders();
checkAuth();

$db = Database::getInstance()->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch($method) {
        case 'GET':
            $id = isset($_GET['id']) ? sanitize($_GET['id']) : null;
            if ($id) {
                $stmt = $db->prepare("SELECT * FROM jobs WHERE id = ?");
                $stmt->execute([$id]);
                $job = $stmt->fetch();
                if ($job) {
                    // Decode JSON fields
                    $job['paints'] = json_decode($job['paints'] ?? '[]');
                    $job['assigned_workers'] = json_decode($job['assigned_workers'] ?? '[]');
                    sendResponse($job);
                } else {
                    sendError('Job not found', 404);
                }
            } else {
                $stmt = $db->query("SELECT * FROM jobs ORDER BY date DESC, created_at DESC");
                $jobs = $stmt->fetchAll();
                // Decode JSON fields for all jobs
                foreach ($jobs as &$job) {
                    $job['paints'] = json_decode($job['paints'] ?? '[]');
                    $job['assigned_workers'] = json_decode($job['assigned_workers'] ?? '[]');
                }
                sendResponse($jobs);
            }
            break;
            
        case 'POST':
            $data = getRequestBody();
            $stmt = $db->prepare("
                INSERT INTO jobs (
                    id, client_id, date, type, status, rooms, area, substrate,
                    paints, next_visit, materials_cost, hours, kilometers,
                    billing_hours, billing_rate, hourly_rate, cost_per_km, vat,
                    assigned_workers, labor_cost, travel_cost, total_expenses,
                    billing_amount, vat_amount, total_cost, profit, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $data['id'] ?? 'Ε-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT),
                $data['client_id'] ?? null,
                $data['date'] ?? date('Y-m-d'),
                sanitize($data['type'] ?? ''),
                $data['status'] ?? 'Προγραμματισμένη',
                $data['rooms'] ?? 0,
                $data['area'] ?? 0,
                sanitize($data['substrate'] ?? ''),
                json_encode($data['paints'] ?? []),
                $data['next_visit'] ?? null,
                $data['materials_cost'] ?? 0,
                $data['hours'] ?? 0,
                $data['kilometers'] ?? 0,
                $data['billing_hours'] ?? 0,
                $data['billing_rate'] ?? 0,
                $data['hourly_rate'] ?? 0,
                $data['cost_per_km'] ?? 0,
                $data['vat'] ?? 24,
                json_encode($data['assigned_workers'] ?? []),
                $data['labor_cost'] ?? 0,
                $data['travel_cost'] ?? 0,
                $data['total_expenses'] ?? 0,
                $data['billing_amount'] ?? 0,
                $data['vat_amount'] ?? 0,
                $data['total_cost'] ?? 0,
                $data['profit'] ?? 0,
                sanitize($data['notes'] ?? '')
            ]);
            sendResponse(['success' => true, 'id' => $db->lastInsertId()], 201);
            break;
            
        case 'PUT':
            $data = getRequestBody();
            $id = $_GET['id'] ?? $data['id'] ?? null;
            $stmt = $db->prepare("
                UPDATE jobs SET
                    client_id=?, date=?, type=?, status=?, rooms=?, area=?, substrate=?,
                    paints=?, next_visit=?, materials_cost=?, hours=?, kilometers=?,
                    billing_hours=?, billing_rate=?, hourly_rate=?, cost_per_km=?, vat=?,
                    assigned_workers=?, labor_cost=?, travel_cost=?, total_expenses=?,
                    billing_amount=?, vat_amount=?, total_cost=?, profit=?, notes=?
                WHERE id=?
            ");
            $stmt->execute([
                $data['client_id'],
                $data['date'],
                sanitize($data['type']),
                $data['status'],
                $data['rooms'],
                $data['area'],
                sanitize($data['substrate']),
                json_encode($data['paints']),
                $data['next_visit'],
                $data['materials_cost'],
                $data['hours'],
                $data['kilometers'],
                $data['billing_hours'],
                $data['billing_rate'],
                $data['hourly_rate'],
                $data['cost_per_km'],
                $data['vat'],
                json_encode($data['assigned_workers']),
                $data['labor_cost'],
                $data['travel_cost'],
                $data['total_expenses'],
                $data['billing_amount'],
                $data['vat_amount'],
                $data['total_cost'],
                $data['profit'],
                sanitize($data['notes']),
                $id
            ]);
            sendResponse(['success' => true]);
            break;
            
        case 'DELETE':
            $id = $_GET['id'] ?? null;
            $stmt = $db->prepare("DELETE FROM jobs WHERE id = ?");
            $stmt->execute([$id]);
            sendResponse(['success' => true]);
            break;
    }
} catch (Exception $e) {
    error_log('Error in jobs.php: ' . $e->getMessage());
    sendError('An error occurred', 500);
}
?>
```

---

## 📁 Inventory API (`api/inventory.php`)

```php
<?php
define('API_ACCESS', true);
require_once 'config.php';
setCorsHeaders();
checkAuth();

$db = Database::getInstance()->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

try {
    switch($method) {
        case 'GET':
            $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
            if ($id) {
                $stmt = $db->prepare("SELECT * FROM inventory WHERE id = ?");
                $stmt->execute([$id]);
                sendResponse($stmt->fetch() ?: []);
            } else {
                $stmt = $db->query("SELECT * FROM inventory ORDER BY brand, name");
                sendResponse($stmt->fetchAll());
            }
            break;
            
        case 'POST':
            $data = getRequestBody();
            $stmt = $db->prepare("
                INSERT INTO inventory (brand, line, name, code, finish, size, qty, cost, notes) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                sanitize($data['brand'] ?? ''),
                sanitize($data['line'] ?? ''),
                sanitize($data['name']),
                sanitize($data['code'] ?? ''),
                sanitize($data['finish'] ?? ''),
                $data['size'] ?? 0,
                $data['qty'] ?? 0,
                $data['cost'] ?? 0,
                sanitize($data['notes'] ?? '')
            ]);
            sendResponse(['success' => true, 'id' => $db->lastInsertId()], 201);
            break;
            
        case 'PUT':
            $data = getRequestBody();
            $id = $_GET['id'] ?? $data['id'] ?? null;
            $stmt = $db->prepare("
                UPDATE inventory 
                SET brand=?, line=?, name=?, code=?, finish=?, size=?, qty=?, cost=?, notes=?
                WHERE id=?
            ");
            $stmt->execute([
                sanitize($data['brand']),
                sanitize($data['line']),
                sanitize($data['name']),
                sanitize($data['code']),
                sanitize($data['finish']),
                $data['size'],
                $data['qty'],
                $data['cost'],
                sanitize($data['notes']),
                $id
            ]);
            sendResponse(['success' => true]);
            break;
            
        case 'DELETE':
            $id = $_GET['id'] ?? null;
            $stmt = $db->prepare("DELETE FROM inventory WHERE id = ?");
            $stmt->execute([$id]);
            sendResponse(['success' => true]);
            break;
    }
} catch (Exception $e) {
    error_log('Error in inventory.php: ' . $e->getMessage());
    sendError('An error occurred', 500);
}
?>
```

---

## 📝 Για τα υπόλοιπα endpoints

Δημιούργησε με τον ίδιο τρόπο:
- `api/offers.php`
- `api/invoices.php`
- `api/timesheets.php`
- `api/templates.php`

Όλα ακολουθούν το ίδιο pattern (GET, POST, PUT, DELETE).

---

## 🧪 Testing API

Χρησιμοποίησε το Postman ή curl:

```bash
# Test ping
curl https://nikolpaintmaster.e-gata.gr/api/ping.php

# Test get clients
curl https://nikolpaintmaster.e-gata.gr/api/clients.php

# Test create client
curl -X POST https://nikolpaintmaster.e-gata.gr/api/clients.php \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Client","phone":"1234567890"}'
```
