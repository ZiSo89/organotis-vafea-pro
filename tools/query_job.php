<?php
try {
	require_once __DIR__ . '/../config/database.php';
	$pdo = getDBConnection();
	$year = 2025;
	$month = 11;
	$stmt = $pdo->prepare("SELECT id, title, total_cost, materials_cost, assigned_workers, billing_hours, billing_rate, vat, kilometers, cost_per_km, start_date FROM jobs WHERE YEAR(start_date)=:y AND MONTH(start_date)=:m AND (status='Εξοφλήθηκε' OR is_paid = 1)");
	$stmt->execute(['y' => $year, 'm' => $month]);
	$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
	$out = json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
	// Write to file to avoid CLI stdout issues
	file_put_contents(__DIR__ . '/query_job_output.json', $out);
	echo "OK: wrote output to tools/query_job_output.json\n";
} catch (Exception $e) {
	$err = "ERROR: " . $e->getMessage();
	file_put_contents(__DIR__ . '/query_job_error.txt', $err);
	echo $err . "\n";
}
