/* ========================================
   Router - Navigation System
   ======================================== */

const Router = {
  routes: {},
  currentRoute: null,

  init() {
    // Register routes
    this.registerRoutes();

    // Handle hash changes
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.slice(1) || 'dashboard';
      // Αποφυγή re-navigation αν είμαστε ήδη εκεί
      if (hash !== this.currentRoute) {
        this.navigate(hash);
      }
    });

    // Initial route
    const initialRoute = window.location.hash.slice(1) || 'dashboard';
    this.navigate(initialRoute);
  },

  registerRoutes() {
    this.routes = {
      dashboard: window.DashboardView,
      clients: window.ClientsView,
      workers: window.WorkersView,
      inventory: window.InventoryView,
      jobs: window.JobsView,
      calendar: window.CalendarView,
      map: window.MapView,
      offers: window.OffersView,
      invoices: window.InvoicesView,
      statistics: window.StatisticsView,
      templates: window.TemplatesView,
      settings: window.SettingsView
    };
  },

  navigate(route) {
    // Parse route and query parameters
    const [routeName, queryString] = route.split('?');
    const params = {};
    
    if (queryString) {
      queryString.split('&').forEach(param => {
        const [key, value] = param.split('=');
        params[key] = decodeURIComponent(value);
      });
    }
    
    const view = this.routes[routeName];
    
    if (!view) {
      const fallback = 'dashboard';
      if (routeName === fallback) {
        console.warn('Route not found and fallback unavailable:', routeName);
        return;
      }
      // Set hash to trigger a single navigation (avoids recursive calls)
      if (window.location.hash.slice(1) !== fallback) {
        window.location.hash = fallback;
      }
      return;
    }

    // Update state
    State.currentSection = routeName;
    this.currentRoute = route; // Store full route with params

    // Update URL (keep query params) - Only if different
    if (window.location.hash.slice(1) !== route) {
      window.location.hash = route;
    }

    // Update sidebar
    Sidebar.setActive(routeName);

    // Render view
    const contentArea = document.getElementById('contentArea');
    if (contentArea) {
      contentArea.innerHTML = '';
      
      if (view.render && typeof view.render === 'function') {
        view.render(contentArea, params); // Pass params to view
      }
    }
  }
};
