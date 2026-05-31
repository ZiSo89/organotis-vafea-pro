/**
 * ESLint flat config για Οργανωτή Βαφέα Pro.
 *
 * Στόχος: να πιάνει ΠΡΑΓΜΑΤΙΚΑ bugs (duplicate keys, unreachable code, λάθη
 * σύνταξης, redeclare) χωρίς να γεμίζει με style warnings. Ο frontend κώδικας
 * είναι vanilla JS με global scripts (χωρίς modules/bundler), οπότε το no-undef
 * είναι απενεργοποιημένο (πολλά cross-file globals).
 *
 * Χρήση:  npm run lint
 */

const js = require('@eslint/js');

module.exports = [
  // Αγνόησε build outputs / vendor
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'logs/**',
      'database/**',
    ],
  },

  // Βασικοί κανόνες (recommended) για όλα τα JS
  js.configs.recommended,

  // Frontend (browser) - public/
  {
    files: ['public/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        location: 'readonly',
        module: 'writable',
      },
    },
    rules: {
      // Cross-file globals: δεν μπορούμε να ξέρουμε όλα τα ονόματα
      'no-undef': 'off',
      // Συχνά υπάρχουν σκόπιμα αχρησιμοποίητα args/handlers
      'no-unused-vars': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      // Style-rules του recommended που δεν είναι bugs εδώ:
      'no-prototype-builtins': 'off',
      'no-useless-catch': 'off',
      // Πραγματικά bugs:
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-unreachable': 'error',
      'no-redeclare': 'error',
      'no-cond-assign': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],
      'use-isnan': 'error',
      'valid-typeof': 'error',
    },
  },

  // Node (Electron main/preload + scripts + tools)
  {
    files: ['electron/**/*.js', 'tools/**/*.js', '*.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'writable',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-prototype-builtins': 'off',
      'no-useless-catch': 'off',
      'no-dupe-keys': 'error',
      'no-unreachable': 'error',
      'no-redeclare': 'error',
    },
  },
];
