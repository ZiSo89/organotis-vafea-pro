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
      this.navigate(hash);
    });

    // Initial route
    const initialRoute = window.location.hash.slice(1) || 'dashboard';
    this.navigate(initialRoute);
  },

  registerRoutes() {
    this.routes = {
      dashboard: window.DashboardView,
      clients: window.ClientsView,
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
    const view = this.routes[route];
    
    if (!view) {
      console.error(`❌ Route not found: ${route}`);
      this.navigate('dashboard');
      return;
    }

    // Update state
    State.currentSection = route;
    this.currentRoute = route;

    // Update URL
    window.location.hash = route;

    // Update sidebar
    Sidebar.setActive(route);

    // Render view
    const contentArea = document.getElementById('contentArea');
    if (contentArea) {
      contentArea.innerHTML = '';
      
      if (view.render && typeof view.render === 'function') {
        view.render(contentArea);
      } else {
        console.error(`❌ view.render is not a function!`, view);
      }
    } else {
      console.error('❌ contentArea not found!');
    }
  }
};
