/* ========================================
   Configuration - Ρυθμίσεις Εφαρμογής
   ======================================== */

const CONFIG = {
  // LocalStorage Keys
  STORAGE_KEY: 'painter_db_v2',
  THEME_KEY: 'painter_theme',
  LANGUAGE_KEY: 'painter_language',
  
  // Auto-save
  AUTO_SAVE_INTERVAL: 30000, // 30 δευτερόλεπτα
  
  // History
  MAX_HISTORY: 10,
  
  // Pagination
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
  
  // Dropdowns - Όλες οι επιλογές στα ελληνικά
  STATUS_OPTIONS: [
    'Υποψήφιος',
    'Προγραμματισμένη',
    'Σε εξέλιξη',
    'Σε αναμονή',
    'Ολοκληρώθηκε',
    'Εξοφλήθηκε',
    'Ακυρώθηκε'
  ],
  
  JOB_TYPES: [
    'Εσωτερικοί χώροι',
    'Εξωτερικοί χώροι',
    'Κάγκελα/Πέργκολα',
    'Επαγγελματικός',
    'Κατοικία',
    'Μικροεπισκευή',
    'Άλλο'
  ],
  
  FINISH_OPTIONS: [
    'Ματ',
    'Eggshell',
    'Satin',
    'Ημι-γυαλιστερό',
    'Γυαλιστερό',
    'High-Gloss'
  ],
  
  PRIMER_OPTIONS: ['Ναι', 'Όχι'],
  
  // Status Colors - αντιστοίχιση με CSS classes
  STATUS_COLORS: {
    'Υποψήφιος': 'status-candidate',
    'Προγραμματισμένη': 'status-scheduled',
    'Σε εξέλιξη': 'status-inprogress',
    'Σε αναμονή': 'status-scheduled',
    'Ολοκληρώθηκε': 'status-completed',
    'Εξοφλήθηκε': 'status-completed',
    'Ακυρώθηκε': 'status-cancelled'
  },
  
  // Date Format
  DATE_FORMAT: 'el-GR',
  
  // Toast Duration
  TOAST_DURATION: 3000,
  
  // Google Maps API
  GOOGLE_MAPS_API_KEY: 'AIzaSyDbO_6f6Y_y_2_2MreK0XTWAIsZw-2AKWQ',
  
  // Demo Data
  DEMO_MODE: true
};

// Export για χρήση σε άλλα modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
