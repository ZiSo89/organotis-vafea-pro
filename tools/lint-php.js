#!/usr/bin/env node
/**
 * PHP syntax checker - τρέχει `php -l` σε όλα τα .php αρχεία του project.
 * Χρήση:  npm run lint:php
 * Απαιτεί το `php` στο PATH (XAMPP: πρόσθεσε C:\\xampp\\php στο PATH).
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'logs', '.git', 'database']);

function findPhpFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      out.push(...findPhpFiles(path.join(dir, entry.name)));
    } else if (entry.isFile() && entry.name.endsWith('.php')) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

function main() {
  // Verify php exists
  try {
    execFileSync('php', ['--version'], { stdio: 'ignore' });
  } catch (e) {
    console.error('❌ Δεν βρέθηκε το `php` στο PATH. Πρόσθεσε το (π.χ. C:\\xampp\\php) και ξαναδοκίμασε.');
    process.exit(2);
  }

  const files = findPhpFiles(ROOT);
  let failed = 0;

  for (const file of files) {
    try {
      execFileSync('php', ['-l', file], { stdio: 'pipe' });
    } catch (err) {
      failed++;
      const output = (err.stdout || err.stderr || Buffer.from('')).toString();
      console.error(`❌ ${path.relative(ROOT, file)}`);
      console.error(output.trim());
    }
  }

  if (failed > 0) {
    console.error(`\n❌ PHP lint: ${failed} αρχείο/α με σφάλματα (από ${files.length}).`);
    process.exit(1);
  }
  console.log(`✅ PHP lint OK (${files.length} αρχεία).`);
}

main();
