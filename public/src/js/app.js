/* ========================================
   Main Application Entry Point
   ======================================== */

// Αναμονή για DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  // Skip authentication check in Electron
  const isElectron = typeof window.electronAPI !== 'undefined';
  
  if (isElectron) {
    console.log('🖥️ Running in Electron - Offline Mode');
    console.log('📱 SQLite Database Active');
  }
  
  if (!isElectron) {
    // Check authentication only for web version
    const isAuthenticated = await API.checkAuth();
    
    if (!isAuthenticated) {
      window.location.href = 'login.html';
      return;
    }
  }

  // Initialize theme FIRST (before anything else)
  Theme.init();

  // Disable transitions during initial load
  document.documentElement.style.setProperty('--transition-base', '0s');
  
  // Initialize all systems
  await State.init();
  
  // Load settings from database
  console.log('📋 Loading settings from database...');
  await SettingsService.loadAll();
  
  i18n.init();
  Sidebar.init();
  Keyboard.init();
  Toast.init();
  Modal.init();
  Router.init();

  // Setup global event listeners
  setupGlobalEventListeners();
  
  // Load company name in sidebar
  await loadCompanyName();
  
  // Enable transitions after everything is loaded
  setTimeout(() => {
    document.documentElement.style.removeProperty('--transition-base');
    document.documentElement.classList.add('transitions-enabled');
  }, 200);
});

async function loadCompanyName() {
  console.log('[App] Loading company name...');
  
  // Default company data
  const defaultData = {
    name: 'Τέχνη και Χρώμα',
    taxId: '123456789',
    address: 'Θάσου 8',
    phone: '+306978093442'
  };
  
  // Get saved data or use defaults
  let companyData = await SettingsService.get('company_settings', null);
  
  // If no saved data, save defaults
  if (!companyData) {
    console.log('[App] No company data, using defaults');
    companyData = defaultData;
    await SettingsService.set('company_settings', companyData);
  }
  
  // Update sidebar
  const sidebarName = document.getElementById('sidebarCompanyName');
  if (sidebarName && companyData.name) {
    sidebarName.textContent = companyData.name || 'Τέχνη και Χρώμα';
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
  
  // Απενεργοποίηση scroll στα number inputs
  document.addEventListener('wheel', (e) => {
    if (e.target.type === 'number' && document.activeElement === e.target) {
      e.preventDefault();
    }
  }, { passive: false });
  
  document.addEventListener('focus', (e) => {
    if (e.target.type === 'number') {
      e.target.addEventListener('wheel', (evt) => {
        evt.preventDefault();
      }, { passive: false });
    }
  }, true);
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
        { name: 'client', label: 'Πελάτης', type: 'select', options: State.data.clients.map(c => c.name), required: true }
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

// Service Worker για PWA updates
if ('serviceWorker' in navigator) {
  let refreshing = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('sw.js?v=20260611e', { scope: './' });
      registration.update();
    } catch (error) {
      console.warn('[PWA] Service worker registration failed:', error);
    }
  });
}
