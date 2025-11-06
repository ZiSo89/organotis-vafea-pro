/* ========================================
   Internationalization - Πολυγλωσσία
   ======================================== */

const i18n = {
  currentLanguage: 'el',
  
  translations: {
    el: {
      // Common
      save: 'Αποθήκευση',
      cancel: 'Ακύρωση',
      delete: 'Διαγραφή',
      edit: 'Επεξεργασία',
      duplicate: 'Αντιγραφή',
      search: 'Αναζήτηση',
      filter: 'Φίλτρο',
      export: 'Εξαγωγή',
      import: 'Εισαγωγή',
      print: 'Εκτύπωση',
      
      // Navigation
      dashboard: 'Αρχική',
      jobs: 'Εργασίες',
      clients: 'Πελάτες',
      inventory: 'Αποθήκη',
      calendar: 'Ημερολόγιο',
      offers: 'Προσφορές',
      invoices: 'Τιμολόγια',
      statistics: 'Στατιστικά',
      templates: 'Templates',
      settings: 'Ρυθμίσεις',
      
      // Messages
      saved: 'Αποθηκεύτηκε',
      deleted: 'Διαγράφηκε',
      error: 'Σφάλμα',
      success: 'Επιτυχία',
      offline: 'Λειτουργία Offline',
      
      // Other
      darkMode: 'Σκούρο Θέμα',
      lightMode: 'Φωτεινό Θέμα'
    },
    
    en: {
      // Common
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      duplicate: 'Duplicate',
      search: 'Search',
      filter: 'Filter',
      export: 'Export',
      import: 'Import',
      print: 'Print',
      
      // Navigation
      dashboard: 'Dashboard',
      jobs: 'Jobs',
      clients: 'Clients',
      inventory: 'Inventory',
      calendar: 'Calendar',
      offers: 'Offers',
      invoices: 'Invoices',
      statistics: 'Statistics',
      templates: 'Templates',
      settings: 'Settings',
      
      // Messages
      saved: 'Saved',
      deleted: 'Deleted',
      error: 'Error',
      success: 'Success',
      offline: 'Offline Mode',
      
      // Other
      darkMode: 'Dark Mode',
      lightMode: 'Light Mode'
    }
  },

  init() {
    // Load saved language
    const saved = localStorage.getItem(CONFIG.LANGUAGE_KEY);
    if (saved) {
      this.currentLanguage = saved;
    }
    this.apply();
  },

  setLanguage(lang) {
    this.currentLanguage = lang;
    localStorage.setItem(CONFIG.LANGUAGE_KEY, lang);
    this.apply();
  },

  apply() {
    // Update all elements with data-translate
    document.querySelectorAll('[data-translate]').forEach(element => {
      const key = element.getAttribute('data-translate');
      const translation = this.get(key);
      if (translation) {
        element.textContent = translation;
      }
    });

    // Update document language
    document.documentElement.lang = this.currentLanguage;
  },

  get(key) {
    return this.translations[this.currentLanguage]?.[key] || key;
  },

  toggle() {
    const newLang = this.currentLanguage === 'el' ? 'en' : 'el';
    this.setLanguage(newLang);
    
    // Update button text
    const btn = document.querySelector('.language-toggle span');
    if (btn) {
      btn.textContent = newLang.toUpperCase();
    }
    
    Toast.success(`Language changed to ${newLang.toUpperCase()}`);
  }
};
