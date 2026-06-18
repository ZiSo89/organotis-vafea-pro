/* ========================================
   Statistics View - Στατιστικά & Αναφορές
   ======================================== */

window.StatisticsView = {
  charts: {},
  overview: null,
  currentFilters: {
    period: 'year',
    year: new Date().getFullYear(),
    month: '',
    start_date: '',
    end_date: '',
    status: '',
    type: '',
    client_id: ''
  },
  chartMetrics: {
    status: 'count'
  },

  monthNames: [
    'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
    'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'
  ],

  async render(container) {
    container.innerHTML = `
      <div class="statistics-page">
        <div class="view-header">
          <div>
            <h1><i class="fas fa-chart-bar"></i> Στατιστικά</h1>
            <p class="view-subtitle" id="statsPeriodLabel">Οικονομική εικόνα και απόδοση εργασιών</p>
          </div>
          <div class="view-actions">
            <button id="refreshStatsBtn" class="btn btn-secondary">
              <i class="fas fa-sync-alt"></i> Ανανέωση
            </button>
          </div>
        </div>

        <div class="statistics-filters card ${window.innerWidth <= 768 ? 'is-collapsed' : ''}" id="statisticsFiltersPanel">
          <button type="button" class="statistics-filters-toggle" id="statisticsFiltersToggle" aria-expanded="false">
            <span><i class="fas fa-filter"></i> Φίλτρα</span>
            <i class="fas fa-chevron-down"></i>
          </button>
          <div class="statistics-filter-grid">
            <div class="form-group">
              <label for="periodFilter">Περίοδος</label>
              <select id="periodFilter" class="input">
                <option value="year">Έτος</option>
                <option value="month">Μήνας</option>
                <option value="current_month">Τρέχων μήνας</option>
                <option value="previous_month">Προηγούμενος μήνας</option>
                <option value="last12">Τελευταίοι 12 μήνες</option>
                <option value="custom">Προσαρμοσμένη</option>
              </select>
            </div>
            <div class="form-group">
              <label for="yearFilter">Έτος</label>
              <select id="yearFilter" class="input">
                <option value="${this.currentFilters.year}">${this.currentFilters.year}</option>
              </select>
            </div>
            <div class="form-group stats-month-filter">
              <label for="monthFilter">Μήνας</label>
              <select id="monthFilter" class="input">
                <option value="">Όλοι</option>
                ${this.monthNames.map((name, index) => `<option value="${index + 1}">${name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group stats-custom-date">
              <label for="startDateFilter">Από</label>
              <input id="startDateFilter" class="input" type="date">
            </div>
            <div class="form-group stats-custom-date">
              <label for="endDateFilter">Έως</label>
              <input id="endDateFilter" class="input" type="date">
            </div>
            <div class="form-group">
              <label for="statusFilter">Κατάσταση</label>
              <select id="statusFilter" class="input">
                <option value="">Όλες</option>
              </select>
            </div>
            <div class="form-group">
              <label for="typeFilter">Τύπος εργασίας</label>
              <select id="typeFilter" class="input">
                <option value="">Όλοι</option>
              </select>
            </div>
            <div class="form-group">
              <label for="clientFilter">Πελάτης</label>
              <select id="clientFilter" class="input">
                <option value="">Όλοι</option>
              </select>
            </div>
          </div>
          <div class="statistics-filter-actions">
            <span id="activeFiltersText" class="text-muted">Χωρίς επιπλέον φίλτρα</span>
            <button id="resetStatsFilters" class="btn btn-secondary btn-sm">
              <i class="fas fa-times"></i> Καθαρισμός φίλτρων
            </button>
          </div>
        </div>

        <div id="statsError" class="statistics-error" hidden>
          <div>
            <strong>Δεν φορτώθηκαν τα στατιστικά.</strong>
            <span id="statsErrorText">Δοκιμάστε ξανά.</span>
          </div>
          <button id="retryStatsLoad" class="btn btn-primary btn-sm">Επανάληψη</button>
        </div>

        <div class="stats-summary">
          ${this.renderStatCard('totalRevenue', 'Συνολικά Έσοδα', '€0', 'fas fa-euro-sign', 'success')}
          ${this.renderStatCard('totalProfit', 'Καθαρά Κέρδη', '€0', 'fas fa-chart-line', 'info')}
          ${this.renderStatCard('profitMargin', 'Περιθώριο Κέρδους', '0%', 'fas fa-percent', 'primary')}
          ${this.renderStatCard('totalJobs', 'Σύνολο Εργασιών', '0', 'fas fa-briefcase', 'warning')}
          ${this.renderStatCard('paidJobs', 'Εξοφλημένες', '0', 'fas fa-check-circle', 'primary')}
          ${this.renderStatCard('completedJobs', 'Ολοκληρωμένες', '0', 'fas fa-clipboard-check', 'success')}
          ${this.renderStatCard('totalWorkHours', 'Εργατοώρες', '0h', 'fas fa-clock', 'info')}
          ${this.renderStatCard('avgJobValue', 'Μέση Αξία Εργασίας', '€0', 'fas fa-calculator', 'info')}
          ${this.renderStatCard('unpaidAmount', 'Ανεξόφλητα / Εκκρεμή', '€0', 'fas fa-hourglass-half', 'danger')}
        </div>

        <div id="statsEmptyState" class="empty-state" hidden>
          <i class="fas fa-chart-pie"></i>
          <h3>Δεν υπάρχουν δεδομένα για τα επιλεγμένα φίλτρα</h3>
          <p>Δοκιμάστε άλλη περίοδο ή καθαρίστε τα φίλτρα.</p>
        </div>

        <div class="charts-grid" id="statisticsCharts">
          ${this.renderChartCard('revenueMonthChart', 'Έσοδα, Έξοδα & Κέρδη ανά Περίοδο', 'fas fa-calendar-alt', '', true)}
          ${this.renderChartCard('jobsStatusChart', 'Κατάσταση Εργασιών', 'fas fa-tasks', this.renderMetricSelect('statusMetric'))}
          ${this.renderChartCard('materialsChart', 'Top 10 Υλικά', 'fas fa-boxes')}
          <div class="card card-full stats-top-jobs-panel">
            <div class="card-header">
              <h3><i class="fas fa-trophy"></i> Top 10 Εργασίες — Καθαρά Κέρδη</h3>
            </div>
            <div class="card-body">
              <div class="stats-top-jobs-chart-wrap chart-body">
                <canvas id="topJobsChart"></canvas>
                <div class="chart-empty" id="topJobsChartEmpty" hidden>Δεν υπάρχουν δεδομένα</div>
              </div>
              <div id="statsTopJobsCards" class="stats-top-jobs-cards"></div>
            </div>
          </div>
        </div>

        <button id="scrollToTopBtn" class="scroll-to-top" title="Επιστροφή στην αρχή">
          <i class="fas fa-arrow-up"></i>
        </button>
      </div>
    `;

    this.attachEventListeners();
    this.setupScrollToTop();
    this.syncFilterControls();
    this.updatePeriodControlVisibility();
    await this.loadAvailableYears();
    await this.loadStatistics();
  },

  renderStatCard(id, label, value, icon, tone) {
    return `
      <div class="stat-card stat-card-${tone}">
        <div class="stat-icon">
          <i class="${icon}"></i>
        </div>
        <div class="stat-content">
          <div class="stat-label">${label}</div>
          <div class="stat-value" id="${id}">${value}</div>
          <div class="stat-trend" id="${id}Trend">-</div>
        </div>
      </div>
    `;
  },

  renderMetricSelect(id) {
    return `
      <select id="${id}" class="input input-sm chart-metric-select">
        <option value="count">Πλήθος</option>
        <option value="billing">Έσοδα</option>
        <option value="net_profit">Κέρδος</option>
      </select>
    `;
  },

  renderChartCard(canvasId, title, icon, action = '', full = false) {
    return `
      <div class="card ${full ? 'card-full' : ''}">
        <div class="card-header">
          <h3><i class="${icon}"></i> ${title}</h3>
          ${action ? `<div class="card-actions">${action}</div>` : ''}
        </div>
        <div class="card-body chart-body">
          <canvas id="${canvasId}"></canvas>
          <div class="chart-empty" id="${canvasId}Empty" hidden>Δεν υπάρχουν δεδομένα</div>
        </div>
      </div>
    `;
  },

  attachEventListeners() {
    const controls = [
      'periodFilter', 'yearFilter', 'monthFilter', 'startDateFilter', 'endDateFilter',
      'statusFilter', 'typeFilter', 'clientFilter'
    ];

    controls.forEach((id) => {
      const element = document.getElementById(id);
      if (!element) return;
      element.addEventListener('change', async () => {
        this.readFilterControls();
        this.updatePeriodControlVisibility();
        await this.loadStatistics();
      });
    });

    document.getElementById('refreshStatsBtn')?.addEventListener('click', () => this.loadStatistics());
    document.getElementById('retryStatsLoad')?.addEventListener('click', () => this.loadStatistics());
    document.getElementById('statisticsFiltersToggle')?.addEventListener('click', () => {
      const panel = document.getElementById('statisticsFiltersPanel');
      const toggle = document.getElementById('statisticsFiltersToggle');
      if (!panel || !toggle) return;
      const collapsed = panel.classList.toggle('is-collapsed');
      toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    });
    document.getElementById('resetStatsFilters')?.addEventListener('click', async () => {
      this.currentFilters = {
        period: 'year',
        year: new Date().getFullYear(),
        month: '',
        start_date: '',
        end_date: '',
        status: '',
        type: '',
        client_id: ''
      };
      this.syncFilterControls();
      this.updatePeriodControlVisibility();
      await this.loadStatistics();
    });

    document.getElementById('statusMetric')?.addEventListener('change', (event) => {
      this.chartMetrics.status = event.target.value;
      this.createJobsStatusChart(this.overview?.jobs_status || []);
    });
  },

  syncFilterControls() {
    this.setControlValue('periodFilter', this.currentFilters.period);
    this.setControlValue('yearFilter', this.currentFilters.year);
    this.setControlValue('monthFilter', this.currentFilters.month);
    this.setControlValue('startDateFilter', this.currentFilters.start_date);
    this.setControlValue('endDateFilter', this.currentFilters.end_date);
    this.setControlValue('statusFilter', this.currentFilters.status);
    this.setControlValue('typeFilter', this.currentFilters.type);
    this.setControlValue('clientFilter', this.currentFilters.client_id);
  },

  readFilterControls() {
    this.currentFilters = {
      period: document.getElementById('periodFilter')?.value || 'year',
      year: Number(document.getElementById('yearFilter')?.value || new Date().getFullYear()),
      month: document.getElementById('monthFilter')?.value || '',
      start_date: document.getElementById('startDateFilter')?.value || '',
      end_date: document.getElementById('endDateFilter')?.value || '',
      status: document.getElementById('statusFilter')?.value || '',
      type: document.getElementById('typeFilter')?.value || '',
      client_id: document.getElementById('clientFilter')?.value || ''
    };
  },

  setControlValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value ?? '';
  },

  updatePeriodControlVisibility() {
    const period = this.currentFilters.period;
    document.querySelectorAll('.stats-month-filter').forEach((el) => {
      el.hidden = period !== 'month';
    });
    document.querySelectorAll('.stats-custom-date').forEach((el) => {
      el.hidden = period !== 'custom';
    });
  },

  async loadAvailableYears() {
    try {
      let years = [];
      if (typeof window.electronAPI !== 'undefined') {
        const response = await window.electronAPI.db.query(`
          SELECT DISTINCT strftime('%Y', date) AS year
          FROM jobs
          WHERE date IS NOT NULL
          ORDER BY year DESC
        `);
        years = response.success ? response.data.map((row) => row.year).filter(Boolean) : [];
      } else {
        const response = await API.get('/api/statistics.php?action=available_years');
        years = response.success ? response.data : [];
      }

      if (!years.includes(String(this.currentFilters.year)) && !years.includes(Number(this.currentFilters.year))) {
        years.unshift(String(this.currentFilters.year));
      }
      const yearFilter = document.getElementById('yearFilter');
      if (yearFilter) {
        yearFilter.innerHTML = years.map((year) => (
          `<option value="${year}" ${String(year) === String(this.currentFilters.year) ? 'selected' : ''}>${year}</option>`
        )).join('');
      }
    } catch (error) {
      console.error('Σφάλμα φόρτωσης ετών:', error);
    }
  },

  async loadStatistics() {
    this.setLoading(true);
    this.hideError();

    try {
      const overview = typeof window.electronAPI !== 'undefined'
        ? await this.loadStatisticsFromElectron()
        : await this.loadStatisticsFromApi();

      this.overview = overview;
      this.applyServerFilters(overview.filters || {});
      this.populateFilterOptions(overview.filter_options || {});
      this.updateFilterSummary();
      this.updateSummaryCards(overview.summary || {});
      this.createRevenueChart(overview.revenue || []);
      this.createJobsStatusChart(overview.jobs_status || []);
      this.createMaterialsChart(overview.materials_usage || []);
      this.createTopJobsChart(overview.top_jobs || []);
      this.updateEmptyState(overview.summary || {});
    } catch (error) {
      console.error('Σφάλμα φόρτωσης στατιστικών:', error);
      this.showError(error.message || 'Άγνωστο σφάλμα');
      if (typeof Toast !== 'undefined') Toast.error('Σφάλμα φόρτωσης στατιστικών');
    } finally {
      this.setLoading(false);
    }
  },

  async loadStatisticsFromApi() {
    const params = new URLSearchParams({ action: 'overview' });
    Object.entries(this.currentFilters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.set(key, value);
      }
    });

    const response = await API.get(`/api/statistics.php?${params.toString()}`);
    if (!response.success) {
      throw new Error(response.message || response.error || 'Το API επέστρεψε σφάλμα');
    }
    return response.data;
  },

  async loadStatisticsFromElectron() {
    const filters = this.resolveFiltersForElectron();
    const jobs = await this.fetchElectronJobs(filters);
    const overview = this.buildOverviewFromJobs(jobs, filters);

    const previousFilters = this.previousFilters(filters);
    const previousJobs = await this.fetchElectronJobs(previousFilters);
    const previousOverview = this.buildOverviewFromJobs(previousJobs, previousFilters);

    overview.previous_filters = {
      label: 'Προηγούμενη περίοδος',
      start_date: previousFilters.start_date,
      end_date: this.addDays(previousFilters.end_date, -1)
    };
    overview.comparison = this.buildComparison(overview.summary, previousOverview.summary);
    overview.filter_options = await this.loadElectronFilterOptions();
    return overview;
  },

  resolveFiltersForElectron() {
    const now = new Date();
    const year = Number(this.currentFilters.year || now.getFullYear());
    const month = this.currentFilters.month ? Number(this.currentFilters.month) : null;
    let start;
    let end;
    let label;
    let period = this.currentFilters.period || 'year';

    if (period === 'custom' && this.currentFilters.start_date && this.currentFilters.end_date) {
      start = this.currentFilters.start_date;
      end = this.addDays(this.currentFilters.end_date, 1);
      label = 'Προσαρμοσμένη περίοδος';
    } else if (period === 'current_month') {
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      start = this.formatDate(currentMonth);
      end = this.formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 1));
      label = 'Τρέχων μήνας';
    } else if (period === 'previous_month') {
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      start = this.formatDate(previousMonth);
      end = this.formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
      label = 'Προηγούμενος μήνας';
    } else if (period === 'last12') {
      start = this.formatDate(new Date(now.getFullYear(), now.getMonth() - 11, 1));
      end = this.formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 1));
      label = 'Τελευταίοι 12 μήνες';
    } else if (period === 'month' && month) {
      start = this.formatDate(new Date(year, month - 1, 1));
      end = this.formatDate(new Date(year, month, 1));
      label = `${this.monthNames[month - 1]} ${year}`;
    } else {
      period = 'year';
      start = `${year}-01-01`;
      end = `${year + 1}-01-01`;
      label = String(year);
    }

    return {
      period,
      label,
      year,
      month,
      start_date: start,
      end_date: end,
      end_date_inclusive: this.addDays(end, -1),
      status: this.currentFilters.status,
      type: this.currentFilters.type,
      client_id: this.currentFilters.client_id
    };
  },

  previousFilters(filters) {
    const start = new Date(`${filters.start_date}T00:00:00`);
    const end = new Date(`${filters.end_date}T00:00:00`);
    const days = Math.max(1, Math.round((end - start) / 86400000));
    const previousEnd = new Date(start);
    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - days);
    return {
      ...filters,
      label: 'Προηγούμενη περίοδος',
      start_date: this.formatDate(previousStart),
      end_date: this.formatDate(previousEnd),
      end_date_inclusive: this.addDays(this.formatDate(previousEnd), -1)
    };
  },

  async fetchElectronJobs(filters) {
    const where = ['j.date IS NOT NULL', 'j.date >= ?', 'j.date < ?'];
    const params = [filters.start_date, filters.end_date];
    if (filters.type) {
      where.push('j.type = ?');
      params.push(filters.type);
    }
    if (filters.client_id) {
      where.push('j.client_id = ?');
      params.push(filters.client_id);
    }

    const result = await window.electronAPI.db.query(`
      SELECT j.*, c.name AS client_name
      FROM jobs j
      LEFT JOIN clients c ON j.client_id = c.id
      WHERE ${where.join(' AND ')}
      ORDER BY j.date ASC, j.id ASC
    `, params);

    const jobs = result.success ? result.data : [];
    if (!filters.status) return jobs;
    return jobs.filter((job) => this.normalizeStatus(job.status) === filters.status);
  },

  async loadElectronFilterOptions() {
    const [typesResult, statusesResult, clientsResult] = await Promise.all([
      window.electronAPI.db.query("SELECT DISTINCT type FROM jobs WHERE type IS NOT NULL AND type != '' ORDER BY type ASC"),
      window.electronAPI.db.query("SELECT DISTINCT status FROM jobs WHERE status IS NOT NULL AND status != '' ORDER BY status ASC"),
      window.electronAPI.db.query("SELECT id, name FROM clients ORDER BY name ASC")
    ]);

    const statuses = new Set((statusesResult.success ? statusesResult.data : []).map((row) => this.normalizeStatus(row.status)));
    return {
      types: (typesResult.success ? typesResult.data : []).map((row) => row.type).filter(Boolean),
      statuses: Array.from(statuses).filter(Boolean),
      clients: (clientsResult.success ? clientsResult.data : []).map((row) => ({ id: row.id, name: row.name }))
    };
  },

  buildOverviewFromJobs(jobs, filters) {
    const summary = this.emptySummary();
    const revenue = this.buildMonthBuckets(filters);
    const types = new Map();
    const statuses = new Map();
    const materials = new Map();
    const topJobs = [];

    jobs.forEach((job) => {
      const id = Number(job.id);
      const status = this.normalizeStatus(job.status);
      const type = (job.type || 'Χωρίς κατηγορία').trim() || 'Χωρίς κατηγορία';
      const financials = this.computeJobFinancials(job);
      const billable = this.isBillableJob(job);
      const paid = this.isPaidJob(job);

      summary.total_jobs += 1;
      if (status === 'Ολοκληρώθηκε' || status === 'Εξοφλήθηκε') summary.completed_jobs += 1;
      if (paid) summary.paid_jobs += 1;
      if (billable) summary.billable_jobs += 1;
      if (status === 'Σε εξέλιξη') summary.in_progress_jobs += 1;
      if (['Υποψήφιος', 'Προγραμματισμένη', 'Σε αναμονή'].includes(status)) summary.pending_jobs += 1;
      if (status === 'Ακυρώθηκε') summary.cancelled_jobs += 1;
      if (!paid && financials.billing > 0) summary.unpaid_amount += financials.billing;
      if (this.shouldCountWorkHours(status)) {
        summary.total_work_hours += financials.actual_hours;
      }

      if (!types.has(type)) {
        types.set(type, { job_type: type, type, count: 0, billable_count: 0, billing: 0, net_profit: 0 });
      }
      if (!statuses.has(status)) {
        statuses.set(status, { status_label: status, status, count: 0, billing: 0, net_profit: 0 });
      }
      types.get(type).count += 1;
      statuses.get(status).count += 1;

      if (!billable) return;

      summary.billing_amount += financials.billing;
      summary.total_revenue += financials.billing;
      summary.total_expenses += financials.expenses;
      summary.total_materials_cost += financials.materials;
      summary.total_labor_cost += financials.labor;
      summary.total_travel_cost += financials.travel;
      summary.net_profit += financials.profit;
      summary.total_profit += financials.profit;

      types.get(type).billable_count += 1;
      types.get(type).billing += financials.billing;
      types.get(type).net_profit += financials.profit;
      statuses.get(status).billing += financials.billing;
      statuses.get(status).net_profit += financials.profit;

      const monthKey = this.monthKey(job.date);
      if (monthKey && revenue[monthKey]) {
        revenue[monthKey].total_jobs += 1;
        revenue[monthKey].revenue += financials.billing;
        revenue[monthKey].billing += financials.billing;
        revenue[monthKey].materials_cost += financials.materials;
        revenue[monthKey].labor_cost += financials.labor;
        revenue[monthKey].travel_cost += financials.travel;
        revenue[monthKey].expenses += financials.expenses;
        revenue[monthKey].profit += financials.profit;
      }

      const paints = this.parseArray(job.paints);
      paints.forEach((paint) => {
        const name = (paint.name || paint.materialName || paint.material_name || paint.color || 'Άγνωστο').trim() || 'Άγνωστο';
        const key = this.materialKey(paint);
        if (!materials.has(key)) {
          materials.set(key, {
            name,
            category: paint.category || 'Χρώμα',
            unit: paint.unit || 'χρήσεις',
            total_quantity: 0,
            total_cost: 0,
            jobs_count: 0,
            jobs: new Set()
          });
        }
        const material = materials.get(key);
        material.total_quantity += this.toNumber(paint.quantity ?? 1);
        material.total_cost += this.toNumber(paint.totalCost ?? paint.total_cost ?? paint.cost ?? paint.price ?? 0);
        material.jobs.add(id);
      });

      topJobs.push({
        id,
        title: job.title || `Εργασία #${id}`,
        client_name: job.clientName || job.client_name || null,
        type,
        date: job.date,
        status,
        revenue: financials.billing,
        billing_amount: financials.billing,
        materials_cost: financials.materials,
        labor_cost: financials.labor,
        travel_cost: financials.travel,
        expenses: financials.expenses,
        profit: financials.profit,
        net_profit: financials.profit
      });
    });

    if (summary.billing_amount > 0) {
      summary.profit_margin = (summary.net_profit / summary.billing_amount) * 100;
    }
    if (summary.billable_jobs > 0) {
      summary.avg_job_value = summary.billing_amount / summary.billable_jobs;
      summary.avg_net_profit = summary.net_profit / summary.billable_jobs;
    }

    const materialsList = Array.from(materials.values()).map((material) => ({
      ...material,
      jobs_count: material.jobs.size,
      jobs: undefined
    })).sort((a, b) => (b.total_cost - a.total_cost) || (b.total_quantity - a.total_quantity)).slice(0, 10);

    return {
      filters: {
        period: filters.period,
        label: filters.label,
        year: filters.year,
        month: filters.month,
        start_date: filters.start_date,
        end_date: filters.end_date_inclusive,
        status: filters.status,
        type: filters.type,
        client_id: filters.client_id
      },
      summary,
      comparison: {},
      revenue: Object.values(revenue),
      jobs_by_type: Array.from(types.values()).sort((a, b) => (b.billing - a.billing) || (b.count - a.count)),
      jobs_status: Array.from(statuses.values()).sort((a, b) => b.count - a.count),
      materials_usage: materialsList,
      top_jobs: topJobs.sort((a, b) => b.net_profit - a.net_profit).slice(0, 10),
      filter_options: {}
    };
  },

  emptySummary() {
    return {
      total_jobs: 0,
      completed_jobs: 0,
      paid_jobs: 0,
      billable_jobs: 0,
      in_progress_jobs: 0,
      pending_jobs: 0,
      cancelled_jobs: 0,
      billing_amount: 0,
      total_revenue: 0,
      total_expenses: 0,
      total_materials_cost: 0,
      total_labor_cost: 0,
      total_travel_cost: 0,
      total_work_hours: 0,
      net_profit: 0,
      total_profit: 0,
      profit_margin: 0,
      avg_job_value: 0,
      avg_net_profit: 0,
      unpaid_amount: 0
    };
  },

  buildMonthBuckets(filters) {
    const start = new Date(`${filters.start_date.slice(0, 7)}-01T00:00:00`);
    const end = new Date(`${filters.end_date}T00:00:00`);
    const includeYear = filters.period !== 'year';
    const buckets = {};
    const cursor = new Date(start);
    while (cursor < end) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      buckets[key] = {
        month: String(cursor.getMonth() + 1).padStart(2, '0'),
        month_key: key,
        month_name: includeYear ? `${this.monthNames[cursor.getMonth()]} ${cursor.getFullYear()}` : this.monthNames[cursor.getMonth()],
        total_jobs: 0,
        revenue: 0,
        billing: 0,
        materials_cost: 0,
        labor_cost: 0,
        travel_cost: 0,
        expenses: 0,
        profit: 0
      };
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return buckets;
  },

  computeJobFinancials(job) {
    const payments = (State.data?.jobPayments || []).filter(payment => Number(payment.jobId || payment.job_id) === Number(job.id));
    const financials = window.JobFinancials.compute(job, { payments });
    return {
      billing: financials.billingAmount,
      materials: financials.materialsCost,
      labor: financials.laborCost,
      travel: financials.travelCost,
      expenses: financials.totalExpenses,
      profit: financials.profit,
      actual_hours: financials.actualHours
    };
  },

  shouldCountWorkHours(status) {
    return status === 'Σε εξέλιξη'
      || status === 'Ολοκληρώθηκε'
      || status === 'Εξοφλήθηκε';
  },

  normalizeStatus(status) {
    const value = String(status || '').toLowerCase();
    if (value.includes('υποψ') || value === 'candidate') return 'Υποψήφιος';
    if (value.includes('προγραμ') || value === 'scheduled') return 'Προγραμματισμένη';
    if (value.includes('εξέλιξη') || value.includes('progress')) return 'Σε εξέλιξη';
    if (value.includes('αναμον') || value === 'waiting') return 'Σε αναμονή';
    if (value.includes('ολοκληρ') || value === 'completed') return 'Ολοκληρώθηκε';
    if (value.includes('εξοφλ') || value === 'paid') return 'Εξοφλήθηκε';
    if (value.includes('ακυρ') || value === 'cancelled') return 'Ακυρώθηκε';
    return status || 'Άλλες';
  },

  isPaidJob(job) {
    return this.normalizeStatus(job.status) === 'Εξοφλήθηκε' || Number(job.isPaid ?? job.is_paid ?? 0) === 1;
  },

  isBillableJob(job) {
    const status = this.normalizeStatus(job.status);
    return status === 'Εξοφλήθηκε' || status === 'Ολοκληρώθηκε' || Number(job.isPaid ?? job.is_paid ?? 0) === 1;
  },

  buildComparison(current, previous) {
    return {
      billing_amount: this.delta(current.billing_amount, previous.billing_amount),
      net_profit: this.delta(current.net_profit, previous.net_profit),
      profit_margin: this.delta(current.profit_margin, previous.profit_margin),
      total_jobs: this.delta(current.total_jobs, previous.total_jobs),
      completed_jobs: this.delta(current.completed_jobs, previous.completed_jobs),
      total_work_hours: this.delta(current.total_work_hours, previous.total_work_hours)
    };
  },

  delta(current, previous) {
    const change = this.toNumber(current) - this.toNumber(previous);
    const previousValue = this.toNumber(previous);
    return {
      current: this.toNumber(current),
      previous: previousValue,
      change,
      percent: previousValue !== 0 ? (change / Math.abs(previousValue)) * 100 : null
    };
  },

  applyServerFilters(filters) {
    const previousYear = this.currentFilters.year;
    this.currentFilters = {
      ...this.currentFilters,
      period: filters.period || this.currentFilters.period,
      year: filters.year || previousYear,
      month: filters.month || '',
      start_date: filters.period === 'custom' ? filters.start_date || '' : this.currentFilters.start_date,
      end_date: filters.period === 'custom' ? filters.end_date || '' : this.currentFilters.end_date,
      status: filters.status || '',
      type: filters.type || '',
      client_id: filters.client_id || ''
    };
    this.syncFilterControls();
    this.updatePeriodControlVisibility();
    const periodLabel = document.getElementById('statsPeriodLabel');
    if (periodLabel) {
      periodLabel.textContent = filters.label ? `Περίοδος: ${filters.label}` : 'Οικονομική εικόνα και απόδοση εργασιών';
    }
  },

  populateFilterOptions(options) {
    this.populateSelect('typeFilter', options.types || [], 'Όλοι');
    this.populateSelect('statusFilter', options.statuses || [], 'Όλες');
    this.populateSelect('clientFilter', (options.clients || []).map((client) => ({
      value: client.id,
      label: client.name
    })), 'Όλοι');
    this.syncFilterControls();
  },

  populateSelect(id, options, emptyLabel) {
    const select = document.getElementById(id);
    if (!select) return;
    const currentValue = select.value;
    const normalized = options.map((option) => (
      typeof option === 'object' ? option : { value: option, label: option }
    ));
    select.innerHTML = [
      `<option value="">${emptyLabel}</option>`,
      ...normalized.map((option) => `<option value="${this.escapeHtml(option.value)}">${this.escapeHtml(option.label)}</option>`)
    ].join('');
    if (normalized.some((option) => String(option.value) === String(currentValue))) {
      select.value = currentValue;
    }
  },

  updateFilterSummary() {
    const active = [];
    if (this.currentFilters.status) active.push(`Κατάσταση: ${this.currentFilters.status}`);
    if (this.currentFilters.type) active.push(`Τύπος: ${this.currentFilters.type}`);
    if (this.currentFilters.client_id) {
      const clientSelect = document.getElementById('clientFilter');
      active.push(`Πελάτης: ${clientSelect?.selectedOptions?.[0]?.textContent || this.currentFilters.client_id}`);
    }
    const element = document.getElementById('activeFiltersText');
    if (element) element.textContent = active.length ? active.join(' • ') : 'Χωρίς επιπλέον φίλτρα';
  },

  updateSummaryCards(summary) {
    const comparison = this.overview?.comparison || {};
    this.updateCard('totalRevenue', this.formatCurrency(summary.billing_amount ?? summary.total_revenue), comparison.billing_amount, 'currency');
    this.updateCard('totalProfit', this.formatCurrency(summary.net_profit ?? summary.total_profit), comparison.net_profit, 'currency', summary.net_profit);
    this.updateCard('profitMargin', this.formatPercent(summary.profit_margin), comparison.profit_margin, 'percent', summary.profit_margin);
    this.updateCard('totalJobs', this.formatNumber(summary.total_jobs), comparison.total_jobs, 'number');
    this.updateCard('paidJobs', this.formatNumber(summary.paid_jobs), null, 'number');
    this.updateCard('completedJobs', this.formatNumber(summary.completed_jobs), comparison.completed_jobs, 'number');
    this.updateCard('totalWorkHours', this.formatHours(summary.total_work_hours), comparison.total_work_hours, 'hours');
    this.updateCard('avgJobValue', this.formatCurrency(summary.avg_job_value), null, 'currency');
    this.updateCard('unpaidAmount', this.formatCurrency(summary.unpaid_amount), null, 'currency', -summary.unpaid_amount);
  },

  updateCard(id, value, delta, type, signedValue = null) {
    const valueEl = document.getElementById(id);
    const trendEl = document.getElementById(`${id}Trend`);
    if (valueEl) {
      valueEl.textContent = value;
      valueEl.classList.toggle('is-negative', Number(signedValue) < 0);
      valueEl.classList.toggle('is-positive', Number(signedValue) > 0);
    }
    if (!trendEl) return;
    if (!delta || (delta.percent === null && delta.change === 0)) {
      trendEl.textContent = 'Δεν υπάρχει σύγκριση';
      trendEl.className = 'stat-trend';
      return;
    }
    const direction = delta.change >= 0 ? '+' : '';
    const changeLabel = type === 'currency'
      ? `${direction}${this.formatCurrency(delta.change)}`
      : type === 'percent'
        ? `${direction}${this.formatPercent(delta.change)}`
        : type === 'hours'
          ? `${direction}${this.formatHours(delta.change)}`
          : `${direction}${this.formatNumber(delta.change)}`;
    const percentLabel = delta.percent === null ? '' : ` (${direction}${this.formatPercent(delta.percent)})`;
    trendEl.textContent = `${changeLabel}${percentLabel} από προηγ. περίοδο`;
    trendEl.className = `stat-trend ${delta.change >= 0 ? 'is-positive' : 'is-negative'}`;
  },

  createRevenueChart(data) {
    this.destroyChart('revenue');
    const ctx = document.getElementById('revenueMonthChart');
    if (!this.hasChartData(data, ['revenue', 'expenses', 'profit'])) {
      this.showChartEmpty('revenueMonthChart');
      return;
    }
    this.showChartCanvas('revenueMonthChart');

    this.charts.revenue = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map((item) => item.month_name),
        datasets: [
          this.lineDataset('Έσοδα', data.map((item) => item.revenue || item.billing || 0), '59, 130, 246'),
          this.lineDataset('Έξοδα', data.map((item) => item.expenses || 0), '249, 115, 22'),
          this.lineDataset('Καθαρά Κέρδη', data.map((item) => item.profit || 0), '34, 197, 94')
        ]
      },
      options: this.moneyChartOptions()
    });
  },

  createJobsTypeChart(data) {
    this.destroyChart('jobsType');
    const metric = this.chartMetrics.type;
    const ctx = document.getElementById('jobsTypeChart');
    const values = data.map((item) => this.metricValue(item, metric));
    if (!values.some((value) => value > 0)) {
      this.showChartEmpty('jobsTypeChart');
      return;
    }
    this.showChartCanvas('jobsTypeChart');

    this.charts.jobsType = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map((item) => item.job_type || item.type || 'Άγνωστο'),
        datasets: [{
          data: values,
          backgroundColor: this.palette(),
          borderWidth: 2,
          borderColor: '#fff',
          datalabels: { display: false }
        }]
      },
      options: this.doughnutOptions(metric, (label) => {
        this.currentFilters.type = label;
        this.syncFilterControls();
        this.loadStatistics();
      })
    });
  },

  createJobsStatusChart(data) {
    this.destroyChart('jobsStatus');
    const metric = this.chartMetrics.status;
    const ctx = document.getElementById('jobsStatusChart');
    const values = data.map((item) => this.metricValue(item, metric));
    if (!values.some((value) => value > 0)) {
      this.showChartEmpty('jobsStatusChart');
      return;
    }
    this.showChartCanvas('jobsStatusChart');

    const colors = {
      'Υποψήφιος': 'rgb(107, 114, 128)',
      'Προγραμματισμένη': 'rgb(59, 130, 246)',
      'Σε εξέλιξη': 'rgb(245, 158, 11)',
      'Σε αναμονή': 'rgb(234, 179, 8)',
      'Ολοκληρώθηκε': 'rgb(34, 197, 94)',
      'Εξοφλήθηκε': 'rgb(236, 72, 153)',
      'Ακυρώθηκε': 'rgb(239, 68, 68)',
      'Άλλες': 'rgb(156, 163, 175)'
    };
    const labels = data.map((item) => item.status_label || item.status || 'Άλλες');

    this.charts.jobsStatus = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: labels.map((label) => colors[label] || colors['Άλλες']),
          borderWidth: 2,
          borderColor: '#fff',
          datalabels: { display: false }
        }]
      },
      options: this.doughnutOptions(metric, (label) => {
        this.currentFilters.status = label;
        this.syncFilterControls();
        this.loadStatistics();
      })
    });
  },

  createMaterialsChart(data) {
    this.destroyChart('materials');
    const ctx = document.getElementById('materialsChart');
    const values = data.map((item) => this.toNumber(item.total_cost) || this.toNumber(item.total_quantity) || this.toNumber(item.jobs_count));
    if (!values.some((value) => value > 0)) {
      this.showChartEmpty('materialsChart');
      return;
    }
    this.showChartCanvas('materialsChart');

    const usesCost = data.some((item) => this.toNumber(item.total_cost) > 0);
    this.charts.materials = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map((item) => item.name || 'Άγνωστο'),
        datasets: [{
          label: usesCost ? 'Κόστος (€)' : 'Ποσότητα / Χρήσεις',
          data: values,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
          datalabels: { display: false }
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const item = data[context.dataIndex];
                const labels = [];
                if (item.jobs_count) labels.push(`Εργασίες: ${item.jobs_count}`);
                if (item.total_quantity) labels.push(`Ποσότητα: ${this.formatNumber(item.total_quantity)} ${item.unit || ''}`.trim());
                if (item.total_cost) labels.push(`Κόστος: ${this.formatCurrency(item.total_cost)}`);
                return labels.length ? labels : [`Τιμή: ${this.formatNumber(context.parsed.x)}`];
              }
            }
          },
          datalabels: { display: false }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              callback: (value) => usesCost ? this.formatCurrency(value) : this.formatNumber(value)
            }
          }
        }
      }
    });
  },

  renderTopJobsCards(data) {
    const container = document.getElementById('statsTopJobsCards');
    if (!container) return;

    if (!data || !data.length) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = data.map((item, index) => `
      <article class="entity-mobile-card stats-top-job-card" data-job-id="${Utils.escapeHtml(String(item.id))}">
        <div class="entity-mobile-card-header">
          <div class="entity-mobile-card-title">
            <strong>#${index + 1} ${Utils.escapeHtml(item.title || `Εργασία ${item.id}`)}</strong>
            <span>${Utils.escapeHtml(item.client_name || '')}</span>
          </div>
        </div>
        <div class="entity-mobile-card-meta">
          <span><i class="fas fa-chart-line"></i> ${this.formatCurrency(item.net_profit ?? item.profit ?? 0)}</span>
          <span><i class="fas fa-euro-sign"></i> ${this.formatCurrency(item.revenue ?? item.billing_amount ?? 0)}</span>
        </div>
      </article>
    `).join('');

    container.querySelectorAll('.stats-top-job-card').forEach(card => {
      card.addEventListener('click', () => {
        const jobId = card.dataset.jobId;
        if (jobId && window.JobsView?.viewJob) {
          window.JobsView.viewJob(jobId);
        }
      });
    });
  },

  createTopJobsChart(data) {
    this.destroyChart('topJobs');
    this.renderTopJobsCards(data);
    const ctx = document.getElementById('topJobsChart');
    if (!data || data.length === 0) {
      this.showChartEmpty('topJobsChart');
      return;
    }
    this.showChartCanvas('topJobsChart');

    this.charts.topJobs = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map((item) => item.title),
        datasets: [{
          label: 'Καθαρό Κέρδος',
          data: data.map((item) => item.net_profit ?? item.profit ?? 0),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1,
          datalabels: { display: false }
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        onClick: (_, elements) => {
          if (!elements.length) return;
          const item = data[elements[0].index];
          if (item?.id && typeof JobsView !== 'undefined' && JobsView.viewJob) {
            JobsView.viewJob(item.id);
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (context) => {
                const item = data[context[0].dataIndex];
                return item.client_name ? `${item.title} - ${item.client_name}` : item.title;
              },
              label: (context) => {
                const item = data[context.dataIndex];
                return [
                  `Καθαρό κέρδος: ${this.formatCurrency(item.net_profit ?? item.profit)}`,
                  `Έσοδα: ${this.formatCurrency(item.revenue ?? item.billing_amount)}`,
                  `Έξοδα: ${this.formatCurrency(item.expenses)}`,
                  `Υλικά: ${this.formatCurrency(item.materials_cost)}`,
                  `Εργατικά: ${this.formatCurrency(item.labor_cost)}`,
                  `Μεταφορικά: ${this.formatCurrency(item.travel_cost)}`
                ];
              }
            }
          },
          datalabels: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: (value) => this.formatCurrency(value) }
          }
        }
      }
    });
  },

  lineDataset(label, data, rgb) {
    return {
      label,
      data,
      borderColor: `rgb(${rgb})`,
      backgroundColor: `rgba(${rgb}, 0.1)`,
      fill: true,
      tension: 0.35,
      datalabels: { display: false }
    };
  },

  moneyChartOptions() {
    return {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ${this.formatCurrency(context.parsed.y)}`
          }
        },
        datalabels: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (value) => this.formatCurrency(value) }
        }
      }
    };
  },

  doughnutOptions(metric, onSegmentClick) {
    return {
      responsive: true,
      maintainAspectRatio: true,
      onClick: (_, elements, chart) => {
        if (!elements.length || !onSegmentClick) return;
        onSegmentClick(chart.data.labels[elements[0].index]);
      },
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.parsed;
              const total = context.dataset.data.reduce((sum, item) => sum + item, 0);
              const percentage = total > 0 ? ` (${((value / total) * 100).toFixed(1)}%)` : '';
              const formatted = metric === 'count' ? `${this.formatNumber(value)} εργασίες` : this.formatCurrency(value);
              return `${context.label}: ${formatted}${percentage}`;
            }
          }
        },
        datalabels: { display: false }
      }
    };
  },

  metricValue(item, metric) {
    if (metric === 'billing') return this.toNumber(item.billing);
    if (metric === 'net_profit') return this.toNumber(item.net_profit);
    return this.toNumber(item.count);
  },

  palette() {
    return [
      'rgb(59, 130, 246)',
      'rgb(34, 197, 94)',
      'rgb(249, 115, 22)',
      'rgb(239, 68, 68)',
      'rgb(168, 85, 247)',
      'rgb(236, 72, 153)',
      'rgb(20, 184, 166)',
      'rgb(234, 179, 8)'
    ];
  },

  hasChartData(data, keys) {
    return Array.isArray(data) && data.some((item) => keys.some((key) => this.toNumber(item[key]) !== 0));
  },

  showChartEmpty(canvasId) {
    const canvas = document.getElementById(canvasId);
    const empty = document.getElementById(`${canvasId}Empty`);
    if (canvas) canvas.hidden = true;
    if (empty) empty.hidden = false;
  },

  showChartCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    const empty = document.getElementById(`${canvasId}Empty`);
    if (canvas) canvas.hidden = false;
    if (empty) empty.hidden = true;
  },

  destroyChart(key) {
    if (this.charts[key]) {
      this.charts[key].destroy();
      delete this.charts[key];
    }
  },

  updateEmptyState(summary) {
    const empty = document.getElementById('statsEmptyState');
    const charts = document.getElementById('statisticsCharts');
    const hasJobs = Number(summary.total_jobs || 0) > 0;
    if (empty) empty.hidden = hasJobs;
    if (charts) charts.hidden = !hasJobs;
  },

  setLoading(isLoading) {
    document.querySelector('.statistics-page')?.classList.toggle('is-loading', isLoading);
    const refreshIcon = document.querySelector('#refreshStatsBtn i');
    if (refreshIcon) refreshIcon.classList.toggle('fa-spin', isLoading);
  },

  showError(message) {
    const error = document.getElementById('statsError');
    const text = document.getElementById('statsErrorText');
    if (text) text.textContent = message;
    if (error) error.hidden = false;
  },

  hideError() {
    const error = document.getElementById('statsError');
    if (error) error.hidden = true;
  },

  setupScrollToTop() {
    const scrollBtn = document.getElementById('scrollToTopBtn');
    if (!scrollBtn) return;
    const toggleButton = () => scrollBtn.classList.toggle('visible', window.scrollY > 300);
    scrollBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    window.addEventListener('scroll', toggleButton);
    toggleButton();
  },

  parseArray(value) {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'string') return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
      if (typeof parsed === 'string') {
        const parsedAgain = JSON.parse(parsed);
        return Array.isArray(parsedAgain) ? parsedAgain : [];
      }
    } catch (error) {
      return [];
    }
    return [];
  },

  materialKey(paint) {
    const normalize = (value) => String(value || '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const category = normalize(paint.category || 'Χρώμα');
    const colorCode = normalize(paint.colorCode || paint.color_code || '');
    const name = normalize(paint.name || paint.materialName || paint.material_name || paint.color || 'Άγνωστο');
    return colorCode ? `${category}|code:${colorCode}` : `${category}|name:${name}`;
  },

  monthKey(date) {
    if (!date) return null;
    const parsed = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return null;
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
  },

  formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },

  addDays(dateString, days) {
    const date = new Date(`${dateString}T00:00:00`);
    date.setDate(date.getDate() + days);
    return this.formatDate(date);
  },

  toNumber(value) {
    const number = Number.parseFloat(value);
    return Number.isFinite(number) ? number : 0;
  },

  formatCurrency(value) {
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(this.toNumber(value));
  },

  formatPercent(value) {
    return `${this.toNumber(value).toLocaleString('el-GR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    })}%`;
  },

  formatNumber(value) {
    return this.toNumber(value).toLocaleString('el-GR', {
      maximumFractionDigits: 0
    });
  },

  formatHours(value) {
    return `${this.toNumber(value).toLocaleString('el-GR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    })}h`;
  },

  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};
