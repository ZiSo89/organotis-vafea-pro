/* ========================================
   Main Application Entry Point
   ======================================== */

// Αναμονή για DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication first
  const isAuthenticated = await API.checkAuth();
  
  if (!isAuthenticated) {
    window.location.href = 'login.html';
    return;
  }

  // Initialize theme FIRST (before anything else)
  Theme.init();

  // Disable transitions during initial load
  document.documentElement.style.setProperty('--transition-base', '0s');
  
  // Initialize all systems
  await State.init();
  i18n.init();
  Sidebar.init();
  Keyboard.init();
  Toast.init();
  Modal.init();
  Router.init();

  // Setup global event listeners
  setupGlobalEventListeners();
  
  // Load company name in sidebar
  loadCompanyName();
  
  // Initialize pricing settings
  initializePricingSettings();
  
  // Enable transitions after everything is loaded
  setTimeout(() => {
    document.documentElement.style.removeProperty('--transition-base');
    document.documentElement.classList.add('transitions-enabled');
  }, 200);
});

function initializePricingSettings() {
  // Check if pricing settings exist
  const pricingData = JSON.parse(localStorage.getItem('pricing_settings') || 'null');
  
  // If no saved data, set defaults
  if (!pricingData) {
    const defaultPricing = {
      hourlyRate: 50,
      vat: 24,
      travelCost: 0.5
    };
    localStorage.setItem('pricing_settings', JSON.stringify(defaultPricing));
  }
}

function loadCompanyName() {
  // Default company data
  const defaultData = {
    name: 'Νικολαΐδη',
    vat: '123456789',
    address: 'Θάσου 8',
    phone: '+306978093442'
  };
  
  // Get saved data or use defaults
  let companyData = JSON.parse(localStorage.getItem('company_settings') || 'null');
  
  // If no saved data, save defaults
  if (!companyData) {
    companyData = defaultData;
    localStorage.setItem('company_settings', JSON.stringify(companyData));
  }
  
  // Update sidebar
  const sidebarName = document.getElementById('sidebarCompanyName');
  if (sidebarName && companyData.name) {
    sidebarName.textContent = `Οργανωτής Βαφέα ${companyData.name}`;
  }
}

function setupGlobalEventListeners() {
  // Floating Action Button
  const fab = document.getElementById('fab');
  if (fab) {
    fab.addEventListener('click', () => {
      showQuickAddModal();
    });
  }

  // Global Search
  setupGlobalSearch();
}

function setupGlobalSearch() {
  const searchInput = document.getElementById('globalSearch');
  if (searchInput) {
    searchInput.addEventListener('input', Utils.debounce((e) => {
      State.searchQuery = e.target.value;
      // Refresh current view
      Router.navigate(State.currentSection);
    }, 300));
  }
}

function showQuickAddModal() {
  const section = State.currentSection;
  
  let fields = [];
  let title = 'Γρήγορη Προσθήκη';

  switch (section) {
    case 'clients':
      title = 'Νέος Πελάτης';
      fields = [
        { name: 'name', label: 'Ονοματεπώνυμο', required: true },
        { name: 'phone', label: 'Τηλέφωνο', type: 'tel' },
        { name: 'email', label: 'Email', type: 'email' }
      ];
      break;

    case 'jobs':
      title = 'Νέα Εργασία';
      fields = [
        { name: 'id', label: 'ID Εργασίας', required: true, value: Utils.generateNextId('jobs', 'Ε') },
        { name: 'client', label: 'Πελάτης', type: 'select', options: State.data.clients.map(c => c.name), required: true },
        { name: 'type', label: 'Τύπος', type: 'select', options: CONFIG.JOB_TYPES, required: true }
      ];
      break;

    case 'inventory':
      title = 'Νέο Χρώμα';
      fields = [
        { name: 'name', label: 'Όνομα Χρώματος', required: true },
        { name: 'code', label: 'Κωδικός' },
        { name: 'brand', label: 'Μάρκα' }
      ];
      break;

    default:
      Toast.info('Χρησιμοποιήστε τη φόρμα στην τρέχουσα σελίδα');
      return;
  }

  Modal.form({
    title,
    fields,
    onSubmit: (data) => {
      // Add ID if not present
      if (!data.id) {
        const prefix = section === 'clients' ? 'Π' : section === 'jobs' ? 'Ε' : 'I';
        data.id = Utils.generateNextId(section, prefix);
      }

      // Create the item
      State.create(section, data);
      
      // Refresh view
      Router.navigate(section);
    }
  });
}

// Service Worker για PWA (optional)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Uncomment όταν έχεις service worker
    // navigator.serviceWorker.register('/sw.js');
  });
}
