/* ========================================
   Global Search — cross-entity search
   ======================================== */

const GlobalSearch = {
  minQueryLength: 2,
  maxResults: 24,

  init() {
    this.desktopResults = document.getElementById('globalSearchResults');
    this.mobileResults = document.getElementById('globalSearchResultsMobile');
    this.bindInput(document.getElementById('globalSearch'), false);
    this.bindInput(document.getElementById('globalSearchOverlay'), true);

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.global-search-root')) {
        this.hideResults();
      }
    });
  },

  bindInput(input, isMobile) {
    if (!input) return;

    const handler = Utils.debounce((e) => {
      const value = e.target.value.trim();
      this.syncInputs(value, input);
      this.run(value, isMobile);
    }, 200);

    input.addEventListener('input', handler);
    input.addEventListener('focus', () => {
      const value = input.value.trim();
      if (value.length >= this.minQueryLength) {
        this.run(value, isMobile);
      }
    });
  },

  syncInputs(value, sourceInput) {
    const desktop = document.getElementById('globalSearch');
    const mobile = document.getElementById('globalSearchOverlay');
    [desktop, mobile].forEach(input => {
      if (input && input !== sourceInput) {
        input.value = value;
      }
    });
  },

  run(query, isMobile = false) {
    State.searchQuery = query;

    if (query.length < this.minQueryLength) {
      this.hideResults();
      if (this.applyToCurrentView('')) return;
      return;
    }

    const results = this.searchAll(query);
    this.renderResults(results, isMobile);

    if (this.applyToCurrentView(query)) {
      return;
    }
  },

  searchAll(query) {
    const q = query.toLowerCase();
    const results = [];

    const push = (item) => {
      if (results.length >= this.maxResults) return;
      results.push(item);
    };

    (State.data.clients || []).forEach(client => {
      const haystack = [client.id, client.name, client.phone, client.email, client.address, client.city]
        .filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(q)) return;
      push({
        type: 'client',
        icon: 'fas fa-user',
        title: client.name || `Πελάτης #${client.id}`,
        meta: client.phone || client.email || '',
        route: `clients?clientId=${client.id}`
      });
    });

    (State.data.jobs || []).forEach(job => {
      const client = (State.data.clients || []).find(c => Number(c.id) === Number(job.clientId));
      const haystack = [job.id, job.title, job.type, job.status, job.address, client?.name]
        .filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(q)) return;
      push({
        type: 'job',
        icon: 'fas fa-briefcase',
        title: job.title || job.type || `Εργασία #${job.id}`,
        meta: `${client?.name || 'Άγνωστος'} · ${job.status || '-'}`,
        route: `jobs?jobId=${job.id}`
      });
    });

    (State.data.workers || []).forEach(worker => {
      const haystack = [worker.id, worker.name, worker.phone, worker.specialty, worker.workerType]
        .filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(q)) return;
      push({
        type: 'worker',
        icon: 'fas fa-hard-hat',
        title: worker.name || `Εργάτης #${worker.id}`,
        meta: worker.phone || worker.specialty || '',
        route: `workers?workerId=${worker.id}`
      });
    });

    (State.data.inventory || []).forEach(material => {
      const haystack = [material.id, material.name, material.category, material.colorCode, material.color_code]
        .filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(q)) return;
      push({
        type: 'material',
        icon: 'fas fa-boxes',
        title: material.name || `Υλικό #${material.id}`,
        meta: material.category || 'Αποθήκη',
        route: 'inventory'
      });
    });

    (State.data.suppliers || []).forEach(supplier => {
      const haystack = [supplier.id, supplier.name, supplier.phone, supplier.email]
        .filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(q)) return;
      push({
        type: 'supplier',
        icon: 'fas fa-store',
        title: supplier.name || `Προμηθευτής #${supplier.id}`,
        meta: supplier.phone || '',
        route: 'suppliers'
      });
    });

    return results;
  },

  renderResults(results, isMobile) {
    const container = isMobile ? this.mobileResults : this.desktopResults;
    if (!container) return;

    if (!results.length) {
      container.innerHTML = `
        <div class="global-search-empty">
          <i class="fas fa-search"></i>
          <p>Δεν βρέθηκαν αποτελέσματα</p>
        </div>
      `;
      container.hidden = false;
      return;
    }

    const typeLabels = {
      job: 'Εργασία',
      client: 'Πελάτης',
      worker: 'Εργάτης',
      material: 'Υλικό',
      supplier: 'Προμηθευτής'
    };

    container.innerHTML = results.map(result => `
      <button type="button" class="global-search-result" data-route="${Utils.escapeHtml(result.route)}">
        <span class="global-search-result-icon"><i class="${Utils.escapeHtml(result.icon)}"></i></span>
        <span class="global-search-result-body">
          <strong>${Utils.escapeHtml(result.title)}</strong>
          <small>${Utils.escapeHtml(typeLabels[result.type] || '')}${result.meta ? ` · ${Utils.escapeHtml(result.meta)}` : ''}</small>
        </span>
        <i class="fas fa-chevron-right global-search-result-arrow"></i>
      </button>
    `).join('');

    container.hidden = false;
    container.querySelectorAll('.global-search-result').forEach(btn => {
      btn.addEventListener('click', () => {
        const route = btn.dataset.route;
        this.hideResults();
        window.AppShell?.closeSearch();
        if (route) Router.navigate(route);
      });
    });
  },

  hideResults() {
    [this.desktopResults, this.mobileResults].forEach(container => {
      if (container) {
        container.hidden = true;
        container.innerHTML = '';
      }
    });
  },

  applyToCurrentView(query) {
    const viewFilters = {
      jobs: { inputId: 'jobSearch', method: 'filterJobs' },
      clients: { inputId: 'clientSearch', method: 'filterClients' },
      workers: { inputId: 'workerSearch', method: 'filterWorkers' }
    };

    const cfg = viewFilters[State.currentSection];
    if (!cfg) return false;

    const input = document.getElementById(cfg.inputId);
    const view = State.currentSection === 'jobs' ? window.JobsView
      : State.currentSection === 'clients' ? window.ClientsView
        : window.WorkersView;

    if (!input || !view || typeof view[cfg.method] !== 'function') {
      return false;
    }

    input.value = query;
    view[cfg.method]();
    return true;
  }
};

window.GlobalSearch = GlobalSearch;
