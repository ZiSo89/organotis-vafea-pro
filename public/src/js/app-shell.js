/* ========================================
   App Shell — Mobile navigation, FAB, search
   ======================================== */

const AppShell = {
  isMobile: false,
  moreOpen: false,
  searchOpen: false,

  bottomNavRoutes: ['dashboard', 'jobs', 'calendar', 'clients'],
  moreRoutes: ['workers', 'suppliers', 'inventory', 'map', 'statistics', 'settings', 'help', 'offers', 'invoices', 'templates'],

  routeTitles: {
    dashboard: 'Αρχική',
    jobs: 'Εργασίες',
    calendar: 'Ημερολόγιο',
    clients: 'Πελάτες',
    workers: 'Προσωπικό',
    suppliers: 'Προμηθευτές',
    inventory: 'Αποθήκη',
    map: 'Χάρτης',
    statistics: 'Στατιστικά',
    settings: 'Ρυθμίσεις',
    help: 'Βοήθεια',
    offers: 'Προσφορές',
    invoices: 'Τιμολόγια',
    templates: 'Πρότυπα'
  },

  fabConfig: {
    jobs: { label: 'Νέα εργασία', icon: 'fas fa-briefcase', triggerId: 'addJobBtn' },
    clients: { label: 'Νέος πελάτης', icon: 'fas fa-user-plus', triggerId: 'addClientBtn' },
    workers: { label: 'Νέος εργάτης', icon: 'fas fa-hard-hat', triggerId: 'addWorkerBtn' },
    calendar: { label: 'Νέα εργασία', icon: 'fas fa-briefcase', action: 'openJobsAdd' }
  },

  init() {
    this.isMobile = window.innerWidth < 768;
    this.bindBottomNav();
    this.bindMoreSheet();
    this.bindSearch();
    this.bindFab();
    this.handleResize();
    this.onNavigate(State.currentSection || 'dashboard');
    document.body.classList.toggle('has-bottom-nav', this.isMobile);
  },

  handleResize() {
    window.addEventListener('resize', () => {
      const wasMobile = this.isMobile;
      this.isMobile = window.innerWidth < 768;
      if (wasMobile !== this.isMobile) {
        document.body.classList.toggle('has-bottom-nav', this.isMobile);
        if (!this.isMobile) {
          this.closeMoreSheet();
          this.closeSearch();
        }
      }
    });
  },

  onNavigate(routeName) {
    const section = String(routeName || 'dashboard').split('?')[0];
    this.updateMobileTitle(section);
    this.updateBottomNav(section);
    this.updateFab(section);
    this.closeMoreSheet();
  },

  updateMobileTitle(section) {
    const titleEl = document.getElementById('mobilePageTitle');
    if (titleEl) {
      titleEl.textContent = this.routeTitles[section] || 'Τέχνη και Χρώμα';
    }
  },

  updateBottomNav(section) {
    document.querySelectorAll('.bottom-nav-item').forEach(item => {
      const route = item.dataset.route;
      const isMore = item.dataset.route === 'more';
      const active = isMore
        ? this.moreRoutes.includes(section)
        : route === section;
      item.classList.toggle('is-active', active);
      if (active && !isMore) {
        item.setAttribute('aria-current', 'page');
      } else {
        item.removeAttribute('aria-current');
      }
    });

    document.querySelectorAll('.more-sheet-item').forEach(item => {
      item.classList.toggle('is-active', item.dataset.route === section);
    });
  },

  updateFab(section) {
    const fab = document.getElementById('fab');
    if (!fab) return;

    const config = this.fabConfig[section];
    const formOpen = this.isFormModeOpen();
    const show = this.isMobile && config && !formOpen;

    fab.hidden = !show;
    fab.classList.toggle('is-visible', show);

    if (config) {
      fab.title = config.label;
      fab.setAttribute('aria-label', config.label);
      const icon = fab.querySelector('i');
      if (icon && config.icon) {
        icon.className = config.icon;
      }
    }
  },

  isFormModeOpen() {
    const selectors = ['#jobForm', '#clientForm', '#workerForm'];
    return selectors.some(sel => {
      const el = document.querySelector(sel);
      return el && el.style.display !== 'none' && getComputedStyle(el).display !== 'none';
    });
  },

  refreshFab() {
    this.updateFab(State.currentSection || 'dashboard');
  },

  bindBottomNav() {
    document.querySelectorAll('.bottom-nav-item[data-route]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const route = item.dataset.route;
        if (route === 'more') {
          this.toggleMoreSheet();
          return;
        }
        Router.navigate(route);
      });
    });
  },

  bindMoreSheet() {
    const backdrop = document.getElementById('moreSheetBackdrop');
    const closeBtn = document.getElementById('moreSheetCloseBtn');

    if (backdrop) {
      backdrop.addEventListener('click', () => this.closeMoreSheet());
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeMoreSheet());
    }

    document.querySelectorAll('.more-sheet-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const route = item.dataset.route;
        this.closeMoreSheet();
        Router.navigate(route);
      });
    });
  },

  toggleMoreSheet() {
    if (this.moreOpen) {
      this.closeMoreSheet();
    } else {
      this.openMoreSheet();
    }
  },

  openMoreSheet() {
    const sheet = document.getElementById('moreSheet');
    const backdrop = document.getElementById('moreSheetBackdrop');
    if (!sheet) return;
    this.moreOpen = true;
    sheet.classList.add('is-open');
    backdrop?.classList.add('is-open');
    document.body.classList.add('more-sheet-open');
  },

  closeMoreSheet() {
    const sheet = document.getElementById('moreSheet');
    const backdrop = document.getElementById('moreSheetBackdrop');
    this.moreOpen = false;
    sheet?.classList.remove('is-open');
    backdrop?.classList.remove('is-open');
    document.body.classList.remove('more-sheet-open');
  },

  bindSearch() {
    const openBtn = document.getElementById('mobileSearchBtn');
    const closeBtn = document.getElementById('searchOverlayCloseBtn');
    const backdrop = document.getElementById('searchOverlayBackdrop');

    openBtn?.addEventListener('click', () => this.openSearch());
    closeBtn?.addEventListener('click', () => this.closeSearch());
    backdrop?.addEventListener('click', () => this.closeSearch());
  },

  openSearch() {
    const overlay = document.getElementById('searchOverlay');
    const input = document.getElementById('globalSearchOverlay');
    if (!overlay) return;
    this.searchOpen = true;
    overlay.classList.add('is-open');
    document.body.classList.add('search-open');
    setTimeout(() => input?.focus(), 120);
  },

  closeSearch() {
    const overlay = document.getElementById('searchOverlay');
    this.searchOpen = false;
    overlay?.classList.remove('is-open');
    document.body.classList.remove('search-open');
    GlobalSearch?.hideResults();
  },

  bindFab() {
    const fab = document.getElementById('fab');
    if (!fab) return;

    fab.addEventListener('click', () => {
      const section = State.currentSection || 'dashboard';
      const config = this.fabConfig[section];
      if (!config) return;

      if (config.triggerId) {
        const btn = document.getElementById(config.triggerId);
        if (btn) {
          btn.click();
          setTimeout(() => this.refreshFab(), 50);
          return;
        }
      }

      if (config.action === 'openJobsAdd') {
        Router.navigate('jobs');
        setTimeout(() => document.getElementById('addJobBtn')?.click(), 120);
      } else {
        showQuickAddModal();
      }
    });
  },

  openBottomSheet({ title = '', content = '', actions = [] } = {}) {
    const sheet = document.getElementById('appBottomSheet');
    const backdrop = document.getElementById('appBottomSheetBackdrop');
    if (!sheet) return null;

    const titleEl = sheet.querySelector('.app-bottom-sheet-title');
    const bodyEl = sheet.querySelector('.app-bottom-sheet-body');
    const actionsEl = sheet.querySelector('.app-bottom-sheet-actions');

    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = content;
    if (actionsEl) {
      actionsEl.innerHTML = actions.map(action => `
        <button type="button"
          class="btn ${Utils.escapeHtml(action.className || 'btn-secondary')}"
          data-sheet-action="${Utils.escapeHtml(action.id || '')}">
          ${action.icon ? `<i class="${Utils.escapeHtml(action.icon)}"></i> ` : ''}${Utils.escapeHtml(action.label || '')}
        </button>
      `).join('');

      actionsEl.querySelectorAll('[data-sheet-action]').forEach(btn => {
        const id = btn.dataset.sheetAction;
        const action = actions.find(item => item.id === id);
        if (action?.onClick) {
          btn.onclick = () => action.onClick();
        }
      });
    }

    sheet.classList.add('is-open');
    backdrop?.classList.add('is-open');
    document.body.classList.add('bottom-sheet-open');

    const close = () => this.closeBottomSheet();
    backdrop?.addEventListener('click', close, { once: true });
    sheet.querySelector('.app-bottom-sheet-close')?.addEventListener('click', close, { once: true });

    return { close: () => this.closeBottomSheet() };
  },

  closeBottomSheet() {
    document.getElementById('appBottomSheet')?.classList.remove('is-open');
    document.getElementById('appBottomSheetBackdrop')?.classList.remove('is-open');
    document.body.classList.remove('bottom-sheet-open');
  }
};

window.AppShell = AppShell;
