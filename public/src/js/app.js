/* ========================================
   Main Application Entry Point
   ======================================== */

// Tracks the last time a successful full data load completed.
// Used to throttle resume-triggered refreshes.
let lastDataLoadTime = 0;
const RESUME_REFRESH_THROTTLE_MS = 5000;

/**
 * Re-fetch data and re-render the current view. Called on app resume events
 * (visibilitychange, pageshow bfcache, focus) so that a stale/empty snapshot
 * from a previous session is replaced without re-running the full boot.
 *
 * @param {boolean} force - Skip throttle (use for confirmed bfcache restores).
 */
async function refreshIfNeeded(force = false) {
  if (!force && Date.now() - lastDataLoadTime < RESUME_REFRESH_THROTTLE_MS) return;

  // Don't fire while the initial boot loading overlay is still up
  if (typeof AppLoading !== 'undefined' && AppLoading.isVisible && AppLoading.isVisible()) return;

  try {
    await State.reload({ silent: true });
    lastDataLoadTime = Date.now();
    // Clear any pending cold-start reload guard now that we have good data
    if (!State.isCoreDataEmpty()) {
      try { sessionStorage.removeItem('pwaColdReloadDone'); } catch (_) {}
    }
  } catch (error) {
    console.error('[App] refreshIfNeeded failed:', error);
  }
}

// Αναμονή για DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  const isElectron = typeof window.electronAPI !== 'undefined';
  
  if (isElectron) {
    console.log('🖥️ Running in Electron - Offline Mode');
    console.log('📱 SQLite Database Active');
  }

  // Initialize theme FIRST (before anything else)
  Theme.init();

  // Disable transitions during initial load
  document.documentElement.style.setProperty('--transition-base', '0s');

  // Loading overlay is in HTML; ensure body class is set until boot completes
  if (typeof AppLoading !== 'undefined') AppLoading.show();
  
  // Toast first so any later failure can be surfaced to the user
  try { Toast.init(); } catch (e) { console.error('[App] Toast.init failed:', e); }

  // PWA cold-start: wait for network before the first API batch
  try {
    if (typeof Utils !== 'undefined' && Utils.waitForPwaNetwork) {
      await Utils.waitForPwaNetwork();
    }
  } catch (error) {
    console.warn('[App] waitForPwaNetwork failed:', error);
  }

  // Initialize data. State.init() is resilient and never throws, but guard anyway
  // so a failure here can never leave the user on a blank white screen.
  try {
    await State.init();
    if (!State.isCoreDataEmpty()) {
      lastDataLoadTime = Date.now();
      // Clear cold-start reload guard now that we loaded real data
      try { sessionStorage.removeItem('pwaColdReloadDone'); } catch (_) {}
    }
  } catch (error) {
    console.error('[App] State.init failed:', error);
    if (!State.data) State.data = State.emptyData();
  }

  // Load settings from database (non-fatal)
  try {
    console.log('📋 Loading settings from database...');
    await SettingsService.loadAll();
  } catch (error) {
    console.error('[App] SettingsService.loadAll failed:', error);
  }

  // Each subsystem is guarded individually: one failure must not stop the rest
  // (especially Router.init, which renders the actual content).
  const safeInit = (label, fn) => {
    try { fn(); } catch (error) { console.error(`[App] ${label} failed:`, error); }
  };

  safeInit('i18n.init', () => i18n.init());
  safeInit('Sidebar.init', () => Sidebar.init());
  safeInit('AppShell.init', () => AppShell.init());
  safeInit('GlobalSearch.init', () => GlobalSearch.init());
  safeInit('Keyboard.init', () => Keyboard.init());
  safeInit('Modal.init', () => Modal.init());
  safeInit('Router.init', () => Router.init());

  // If the first load was incomplete (common on PWA), silently re-fetch once
  // and re-render — no toasts, no full-page reload.
  // ensureDataReady() may trigger a window.location.reload() internally (the
  // guarded cold-start reload). In that case we keep the loading overlay
  // visible so the user never sees a flash of all-zero dashboard values.
  try {
    await State.ensureDataReady();
  } catch (error) {
    console.error('[App] ensureDataReady failed:', error);
  } finally {
    // Only hide the loading overlay if we are NOT about to perform a full reload.
    // If a reload was triggered, State.isCoreDataEmpty() is still true and the
    // page is about to restart — leave the overlay up.
    const isPwaInstalled = typeof Utils !== 'undefined' && Utils.isPwaInstalled && Utils.isPwaInstalled();
    const coldReloadAttempted = (() => { try { return !!sessionStorage.getItem('pwaColdReloadDone'); } catch (_) { return false; } })();
    const shouldKeepLoading = typeof window !== 'undefined' && window.PwaBootstrap && typeof window.PwaBootstrap.shouldKeepLoadingOverlay === 'function'
      ? window.PwaBootstrap.shouldKeepLoadingOverlay({
          data: State.data,
          isPwaInstalled,
          sessionStorageValue: coldReloadAttempted ? '1' : null
        })
      : false;

    if (!shouldKeepLoading && typeof AppLoading !== 'undefined') AppLoading.hide();
  }

  // Setup global event listeners
  safeInit('setupGlobalEventListeners', () => setupGlobalEventListeners());

  // Re-fetch data when the app returns to the foreground (resume/bfcache).
  // This is the primary fix for the installed-PWA case where Android resumes a
  // previous page instance (DOMContentLoaded never re-fires) and the user sees
  // a stale/empty snapshot. State.reload() re-fetches and re-renders via Router.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshIfNeeded();
  });
  window.addEventListener('pageshow', (event) => {
    // event.persisted === true means the page was restored from the bfcache
    if (event.persisted) refreshIfNeeded(true);
  });
  window.addEventListener('focus', () => refreshIfNeeded());
  
  // Load company name in sidebar (non-fatal)
  try {
    await loadCompanyName();
  } catch (error) {
    console.error('[App] loadCompanyName failed:', error);
  }
  
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
  // Floating Action Button — handled by AppShell.bindFab()

  // Global search — handled by GlobalSearch.init()
  
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
      Toast.info('Χρησιμοποιήστε τη φόρμα της Αποθήκης για κατηγορία και κωδικό χρώματος');
      return;

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
      const registration = await navigator.serviceWorker.register('sw.js?v=20260621a', { scope: './' });
      registration.update();
    } catch (error) {
      console.warn('[PWA] Service worker registration failed:', error);
    }
  });
}
