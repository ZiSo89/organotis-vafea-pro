/* ========================================
   Data Storage - Διαχείριση LocalStorage
   ======================================== */

// Δομή Δεδομένων - όλες οι οντότητες
const DB_STRUCTURE = {
  clients: [],    // Πελάτες
  workers: [],    // Εργάτες/Προσωπικό
  timesheets: [], // Ώρες εργασίας εργατών
  paints: [],     // Χρώματα/Αποθήκη
  jobs: [],       // Εργασίες
  offers: [],     // Προσφορές
  invoices: [],   // Τιμολόγια
  templates: [],  // Templates για επαναλαμβανόμενες εργασίες
  settings: {}    // Ρυθμίσεις χρήστη
};

const Storage = {
  // Φόρτωση δεδομένων από LocalStorage
  load() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        Object.assign(DB_STRUCTURE, data);
      } else {
        // Πρώτη φορά - φόρτωσε demo data
        this.loadDemoData();
      }
      return DB_STRUCTURE;
    } catch (error) {
      console.error('Σφάλμα φόρτωσης δεδομένων:', error);
      this.loadDemoData();
      return DB_STRUCTURE;
    }
  },

  // Αποθήκευση στο LocalStorage
  save() {
    try {
      const json = JSON.stringify(DB_STRUCTURE);
      localStorage.setItem(CONFIG.STORAGE_KEY, json);
      return true;
    } catch (error) {
      console.error('Σφάλμα αποθήκευσης:', error);
      if (error.name === 'QuotaExceededError') {
        Toast.error('Ο χώρος αποθήκευσης έχει γεμίσει!');
      }
      return false;
    }
  },

  // Καθαρισμός όλων των δεδομένων
  clear() {
    if (confirm('ΠΡΟΣΟΧΗ: Θα διαγραφούν ΟΛΑ τα δεδομένα! Είστε σίγουροι;')) {
      localStorage.removeItem(CONFIG.STORAGE_KEY);
      Object.keys(DB_STRUCTURE).forEach(key => {
        if (Array.isArray(DB_STRUCTURE[key])) {
          DB_STRUCTURE[key] = [];
        } else {
          DB_STRUCTURE[key] = {};
        }
      });
      this.save();
      Toast.success('Όλα τα δεδομένα διαγράφηκαν');
      setTimeout(() => location.reload(), 1000);
    }
  },

  // Εξαγωγή JSON
  export() {
    const json = JSON.stringify(DB_STRUCTURE, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `painter_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Toast.success('Τα δεδομένα εξήχθησαν επιτυχώς');
  },

  // Εισαγωγή JSON
  import(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        // Validation - έλεγχος δομής
        if (typeof data !== 'object') {
          throw new Error('Μη έγκυρο format');
        }
        
        // Merge με υπάρχοντα δεδομένα ή αντικατάσταση
        if (confirm('Θέλετε να αντικαταστήσετε τα υπάρχοντα δεδομένα;')) {
          Object.assign(DB_STRUCTURE, data);
        } else {
          // Merge - πρόσθεσε νέα χωρίς να αφαιρέσεις υπάρχοντα
          Object.keys(data).forEach(key => {
            if (Array.isArray(data[key])) {
              DB_STRUCTURE[key] = [...DB_STRUCTURE[key], ...data[key]];
            }
          });
        }
        
        this.save();
        Toast.success('Τα δεδομένα εισήχθησαν επιτυχώς');
        setTimeout(() => location.reload(), 1000);
      } catch (error) {
        console.error('Σφάλμα εισαγωγής:', error);
        Toast.error('Μη έγκυρο αρχείο JSON');
      }
    };
    reader.readAsText(file);
  },

  // Demo Data - παραδείγματα για testing
  loadDemoData() {
    DB_STRUCTURE.clients = [
      {
        id: 'Π-0001',
        name: 'κ. Παπαδόπουλος Γιώργος',
        phone: '6900000001',
        email: 'papadopoulos@example.com',
        address: 'L. Dimokratias 127',
        city: 'Alexandroupoli',
        postal: '68100',
        notes: 'VIP πελάτης - προτεραιότητα'
      },
      {
        id: 'Π-0002',
        name: 'κ. Ιωάννου Νίκος',
        phone: '6900000002',
        email: 'ioannou@example.com',
        address: '14ης Μαΐου 23',
        city: 'Αλεξανδρούπολη',
        postal: '68100',
        notes: 'Προτιμά βιολογικά χρώματα'
      },
      {
        id: 'Π-0003',
        name: 'κα. Κωνσταντίνου Μαρία',
        phone: '6900000003',
        email: 'konstantinou@example.com',
        address: 'Καραολή & Δημητρίου 12',
        city: 'Αλεξανδρούπολη',
        postal: '68100',
        notes: ''
      }
    ];

    DB_STRUCTURE.paints = [
      {
        brand: 'Benjamin Moore',
        line: 'Aura Interior',
        name: 'White Dove',
        code: 'OC-17',
        finish: 'Eggshell',
        size: 3.0,
        qty: 5,
        cost: 40,
        notes: 'Best seller - πολύ δημοφιλές'
      },
      {
        brand: 'Dulux',
        line: 'Trade Diamond',
        name: 'Pure Brilliant White',
        code: 'PBW',
        finish: 'Ματ',
        size: 3.0,
        qty: 2,
        cost: 25,
        notes: 'Για εξωτερικούς χώρους'
      },
      {
        brand: 'Vivechrom',
        line: 'Neopal',
        name: 'Λευκό',
        code: 'NP-001',
        finish: 'Ματ',
        size: 3.0,
        qty: 10,
        cost: 18,
        notes: 'Οικονομική επιλογή'
      }
    ];

    DB_STRUCTURE.jobs = [
      {
        id: 'Ε-0001',
        date: '2025-11-10',
        clientId: 'Π-0001',
        type: 'Εσωτερικοί χώροι',
        status: 'Σε εξέλιξη',
        rooms: 3,
        area: 65,
        substrate: 'Γυψοσανίδα',
        paintName: 'White Dove',
        paintCode: 'OC-17',
        finish: 'Eggshell',
        primer: 'Ναι',
        coats: 2,
        nextVisit: '2025-11-12',
        materialsCost: 120,
        hours: 14,
        kilometers: 20,
        hourlyRate: 25,
        costPerKm: 0.5,
        vat: 24,
        laborCost: 350,
        travelCost: 10,
        netCost: 480,
        vatAmount: 115.20,
        totalCost: 595.20,
        notes: 'Να γίνει προσεκτική προετοιμασία'
      },
      {
        id: 'Ε-0002',
        date: '2025-11-03',
        clientId: 'Π-0002',
        type: 'Εξωτερικοί χώροι',
        status: 'Εξοφλήθηκε',
        rooms: 1,
        area: 40,
        substrate: 'Μέταλλο',
        paintName: 'Pure Brilliant White',
        paintCode: 'PBW',
        finish: 'Ματ',
        primer: 'Ναι',
        coats: 1,
        nextVisit: '',
        materialsCost: 90,
        hours: 10,
        kilometers: 30,
        hourlyRate: 25,
        costPerKm: 0.5,
        vat: 24,
        laborCost: 250,
        travelCost: 15,
        netCost: 355,
        vatAmount: 85.20,
        totalCost: 440.20,
        notes: 'Χρειάζεται αντισκωριακό'
      },
      {
        id: 'Ε-0003',
        date: '2025-11-01',
        clientId: 'Π-0003',
        type: 'Κατοικία',
        status: 'Ολοκληρώθηκε',
        rooms: 2,
        area: 45,
        substrate: 'Σοβάς',
        paintName: 'Λευκό',
        paintCode: 'NP-001',
        finish: 'Ματ',
        primer: 'Όχι',
        coats: 2,
        nextVisit: '',
        materialsCost: 75,
        hours: 8,
        kilometers: 40,
        hourlyRate: 25,
        costPerKm: 0.5,
        vat: 24,
        laborCost: 200,
        travelCost: 20,
        netCost: 295,
        vatAmount: 70.80,
        totalCost: 365.80,
        notes: 'Πελάτης πολύ ικανοποιημένος'
      },
      {
        id: 'Ε-0004',
        date: '2025-11-15',
        clientId: 'Π-0002',
        type: 'Εξωτερικοί χώροι',
        status: 'Προγραμματισμένη',
        rooms: 1,
        area: 30,
        substrate: 'Ξύλο',
        paintName: 'Trade Diamond',
        paintCode: 'PBW',
        finish: 'Satin',
        primer: 'Ναι',
        coats: 2,
        nextVisit: '2025-11-20',
        materialsCost: 150,
        hours: 12,
        kilometers: 20,
        hourlyRate: 25,
        costPerKm: 0.5,
        vat: 24,
        laborCost: 300,
        travelCost: 10,
        netCost: 460,
        vatAmount: 110.40,
        totalCost: 570.40,
        notes: 'Πελάτης ακύρωσε λόγω οικονομικών προβλημάτων'
      }
    ];

    DB_STRUCTURE.offers = [
      {
        id: 'ΠΡ-0001',
        date: '2025-11-01',
        job: 'Ε-0001 — κ. Παπαδόπουλος Γιώργος',
        desc: 'Βαφή εσωτερικών χώρων (σαλόνι + κουζίνα) με premium χρώματα Benjamin Moore',
        net: 470,
        vat: 24
      }
    ];

    DB_STRUCTURE.invoices = [
      {
        id: 'ΤΙ-0001',
        date: '2025-11-03',
        offer: 'ΠΡ-0001',
        net: 470,
        vat: 24
      }
    ];

    DB_STRUCTURE.templates = [];
    
    DB_STRUCTURE.workers = [
      {
        id: 'W-0001',
        name: 'Γιώργος Μαστρογιάννης',
        phone: '6977123456',
        specialty: 'Ελαιοχρωματιστής',
        hourlyRate: 15.00,
        status: 'active',
        hireDate: '2024-01-15',
        notes: 'Έμπειρος επαγγελματίας, 10 χρόνια εμπειρία'
      },
      {
        id: 'W-0002',
        name: 'Νίκος Παπαδόπουλος',
        phone: '6988654321',
        specialty: 'Βοηθός',
        hourlyRate: 10.00,
        status: 'active',
        hireDate: '2024-06-01',
        notes: ''
      },
      {
        id: 'W-0003',
        name: 'Κώστας Ιωάννου',
        phone: '6955111222',
        specialty: 'Γυψαδόρος',
        hourlyRate: 18.00,
        status: 'active',
        hireDate: '2023-09-10',
        notes: 'Εξειδικευμένος σε ταβάνια και γυψοσανίδες'
      }
    ];

    DB_STRUCTURE.timesheets = [];
    
    DB_STRUCTURE.settings = {
      defaultVAT: 24,
      defaultRate: 25,
      companyName: 'Βαφές Επαγγελματικές',
      companyPhone: '210-1234567',
      companyEmail: 'info@vafes.gr',
      companyAddress: 'Αθήνα'
    };

    this.save();
  }
};
