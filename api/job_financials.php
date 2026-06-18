<?php
/**
 * Shared job financial helpers.
 * Keeps billing, labor, travel, and net-profit calculations consistent.
 */
function job_financial_to_float($value) {
    if ($value === null || $value === '') return 0.0;
    return (float)$value;
}

function job_financial_decode_json($value) {
    if (is_array($value)) return $value;
    if (!is_string($value) || trim($value) === '') return null;

    $decoded = json_decode($value, true);
    if ($decoded !== null && !is_array($decoded) && is_string($decoded)) {
        $decodedAgain = json_decode($decoded, true);
        if (is_array($decodedAgain)) return $decodedAgain;
    }

    return is_array($decoded) ? $decoded : null;
}

function job_financial_compute($job) {
    $billing = 0.0;
    $billingType = $job['billing_type'] ?? $job['billingType'] ?? 'hourly';
    $agreedPrice = job_financial_to_float($job['agreed_price'] ?? $job['agreedPrice'] ?? 0);

    if ($billingType === 'fixed' && $agreedPrice > 0) {
        $billing = $agreedPrice;
    }

    if ($billing == 0.0 && isset($job['billing_amount'])) {
        $billing = job_financial_to_float($job['billing_amount']);
    }
    if ($billing == 0.0 && isset($job['billingAmount'])) {
        $billing = job_financial_to_float($job['billingAmount']);
    }

    if ($billing == 0.0) {
        $hours = job_financial_to_float($job['billing_hours'] ?? $job['billingHours'] ?? 0);
        $rate = job_financial_to_float($job['billing_rate'] ?? $job['billingRate'] ?? 0);
        if ($hours > 0 && $rate > 0) {
            $billing = $hours * $rate;
        }
    }

    if ($billing == 0.0) {
        $totalCost = job_financial_to_float($job['total_cost'] ?? $job['totalCost'] ?? 0);
        if ($totalCost > 0) {
            $billing = $totalCost;
        }
    }

    $materials = job_financial_to_float($job['materials_cost'] ?? $job['materialsCost'] ?? 0);
    $kilometers = job_financial_to_float($job['kilometers'] ?? $job['km'] ?? 0);
    $costPerKm = job_financial_to_float($job['cost_per_km'] ?? $job['costPerKm'] ?? $job['travel_cost'] ?? 0.5);
    $travel = $kilometers * $costPerKm;

    $labor = 0.0;
    $actualHours = 0.0;
    $assigned = $job['assigned_workers'] ?? $job['assignedWorkers'] ?? $job['workers'] ?? null;
    $workers = job_financial_decode_json($assigned);
    if (is_array($workers)) {
        foreach ($workers as $worker) {
            $workerType = $worker['worker_type'] ?? $worker['workerType'] ?? 'employee';
            $actualHours += job_financial_to_float($worker['hours_allocated'] ?? $worker['hoursAllocated'] ?? 0);
            if ($workerType === 'owner') continue;
            $labor += job_financial_to_float($worker['labor_cost'] ?? $worker['laborCost'] ?? $worker['cost'] ?? 0);
        }
    }

    $expenses = $materials + $labor + $travel;

    return [
        'billing' => $billing,
        'materials' => $materials,
        'labor' => $labor,
        'travel' => $travel,
        'expenses' => $expenses,
        'profit' => $billing - $expenses,
        'actual_hours' => $actualHours
    ];
}

function job_financial_status_label($status) {
    if (!$status) return 'Άλλες';
    $value = function_exists('mb_strtolower') ? mb_strtolower((string)$status, 'UTF-8') : strtolower((string)$status);

    if (strpos($value, 'υποψ') !== false || $value === 'candidate') return 'Υποψήφιος';
    if (strpos($value, 'προγραμ') !== false || $value === 'scheduled') return 'Προγραμματισμένη';
    if (strpos($value, 'εξέλι') !== false || strpos($value, 'progress') !== false) return 'Σε εξέλιξη';
    if (strpos($value, 'αναμον') !== false || $value === 'waiting') return 'Σε αναμονή';
    if (strpos($value, 'ολοκληρ') !== false || $value === 'completed') return 'Ολοκληρώθηκε';
    if (strpos($value, 'εξοφλ') !== false || $value === 'paid') return 'Εξοφλήθηκε';
    if (strpos($value, 'ακυρ') !== false || $value === 'cancelled') return 'Ακυρώθηκε';

    return 'Άλλες';
}

function job_financial_is_paid($job) {
    $status = job_financial_status_label($job['status'] ?? '');
    return $status === 'Εξοφλήθηκε' || (int)($job['is_paid'] ?? $job['isPaid'] ?? 0) === 1;
}

function job_financial_is_billable($job) {
    $status = job_financial_status_label($job['status'] ?? '');
    return $status === 'Εξοφλήθηκε' || $status === 'Ολοκληρώθηκε' || (int)($job['is_paid'] ?? $job['isPaid'] ?? 0) === 1;
}
?>
