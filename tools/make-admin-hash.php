<?php
/**
 * Δημιουργία bcrypt hash για τον admin κωδικό.
 *
 * Χρήση:
 *   php tools/make-admin-hash.php "ο-κωδικός-μου"
 *   php tools/make-admin-hash.php            (θα ζητήσει τον κωδικό)
 *
 * Αντίγραψε το παραγόμενο 'ADMIN_PASSWORD_HASH' => '...' στο
 * config/secrets.local.php (gitignored). Τότε ο plaintext ADMIN_PASSWORD
 * αγνοείται και χρησιμοποιείται το hash (password_verify).
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("Τρέξε το μόνο από command line.\n");
}

$password = $argv[1] ?? null;

if ($password === null || $password === '') {
    fwrite(STDOUT, "Δώσε τον νέο admin κωδικό: ");
    $password = trim(fgets(STDIN));
}

if ($password === '') {
    fwrite(STDERR, "❌ Κενός κωδικός - ακύρωση.\n");
    exit(1);
}

if (strlen($password) < 8) {
    fwrite(STDERR, "⚠️  Προσοχή: ο κωδικός είναι μικρότερος από 8 χαρακτήρες.\n");
}

$hash = password_hash($password, PASSWORD_BCRYPT);

echo "\n✅ Bcrypt hash δημιουργήθηκε.\n\n";
echo "Πρόσθεσε/άλλαξε στο config/secrets.local.php:\n\n";
echo "    'ADMIN_PASSWORD_HASH' => '" . $hash . "',\n\n";
echo "(Μπορείς να αφαιρέσεις/αγνοήσεις το 'ADMIN_PASSWORD' plaintext.)\n";
