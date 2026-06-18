/* ========================================
   Workers View - Διαχείριση Εργατών/Προσωπικού
   ======================================== */

window.WorkersView = {
  currentEdit: null,
  tableClickHandler: null,
  formSubmitHandler: null,
  addBtnHandler: null,
  clearBtnHandler: null,
  cancelBtnHandler: null,
  searchInputHandler: null,
  statusFilterHandler: null,
  lazyTableKey: 'workers-table',
  lazyBatchSize: 20,

  render(container, params = {}) {
    const workers = State.read('workers') || [];
    Utils.resetInfiniteList(this.lazyTableKey, this.lazyBatchSize);

    container.innerHTML = `
      <div class="view-header">
        <h1><i class="fas fa-hard-hat"></i> Προσωπικό</h1>
        <button class="btn btn-primary" id="addWorkerBtn">
          <i class="fas fa-plus"></i> Νέος Εργάτης
        </button>
      </div>

      <!-- Form (Hidden by default) -->
      <div id="workerForm" class="card" style="display: none;">
        <h2 id="workerFormTitle">Νέος Εργάτης</h2>
        <form id="workerFormElement" class="form-grid">
          
          <!-- Βασικά Στοιχεία -->
          <div class="form-section span-2">
            <h3><i class="fas fa-info-circle"></i> Βασικά Στοιχεία</h3>
          </div>

          <div class="form-group span-2">
            <label>Ονοματεπώνυμο <span class="required">*</span></label>
            <input type="text" id="w_name" placeholder="π.χ. Γιώργος Παπαδόπουλος" required />
          </div>

          <div class="form-group">
            <label>Τηλέφωνο <span class="required">*</span></label>
            <input type="tel" id="w_phone" placeholder="6900000000" required />
          </div>

          <div class="form-group">
            <label>Ωρομίσθιο (€) <span class="required">*</span></label>
            <input type="number" id="w_hourlyRate" min="0" placeholder="π.χ. 15" required />
          </div>

          <div class="form-group">
            <label>Τύπος Προσωπικού <span class="required">*</span></label>
            <select id="w_workerType" required>
              <option value="employee">Υπάλληλος</option>
              <option value="owner">Ιδιοκτήτης</option>
            </select>
          </div>

          <div class="form-group">
            <label>Κατάσταση <span class="required">*</span></label>
            <select id="w_status" required>
              <option value="active">Ενεργός</option>
              <option value="inactive">Ανενεργός</option>
            </select>
          </div>

          <div class="form-group">
            <label>Ημερομηνία Πρόσληψης</label>
            <input type="text" id="w_hireDate" placeholder="ΗΗ/ΜΜ/ΕΕΕΕ" pattern="\\d{2}/\\d{2}/\\d{4}" />
          </div>

          <!-- Σημειώσεις -->
          <div class="form-section span-2">
            <h3><i class="fas fa-sticky-note"></i> Σημειώσεις</h3>
          </div>

          <div class="form-group span-2">
            <label>Σημειώσεις</label>
            <textarea id="w_notes" rows="3" placeholder="Πρόσθετες πληροφορίες..."></textarea>
          </div>

          <!-- Actions -->
          <div class="form-actions span-2">
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-save"></i> Αποθήκευση
            </button>
            <button type="button" class="btn btn-ghost" id="cancelWorkerFormBtn">
              <i class="fas fa-times"></i> Ακύρωση
            </button>
          </div>

        </form>
      </div>

      <!-- Filters & Search -->
      <div class="card filters-card">
        <div class="filters">
          <div class="search-box">
            <i class="fas fa-search"></i>
            <input type="text" id="workerSearch" placeholder="Αναζήτηση εργατών..." />
          </div>

          <select id="statusFilter" class="filter-bar-select-desktop">
            <option value="">Όλες οι καταστάσεις</option>
            <option value="active">Ενεργοί</option>
            <option value="inactive">Ανενεργοί</option>
          </select>
        </div>
        <div class="filter-chip-row" id="workerStatusChips" role="tablist" aria-label="Φίλτρο κατάστασης">
          <button type="button" class="filter-chip is-active" data-worker-status="">Όλοι</button>
          <button type="button" class="filter-chip" data-worker-status="active">Ενεργοί</button>
          <button type="button" class="filter-chip" data-worker-status="inactive">Ανενεργοί</button>
        </div>
      </div>

      <!-- Workers Table -->
      <div class="card">
        <div id="workersTableContainer">
          ${this.renderTable(workers)}
        </div>
      </div>
    `;
    
    this.setupEventListeners();
    this.setupLazyTable(workers);

    if (params?.workerId) {
      setTimeout(() => this.viewWorker(params.workerId), 0);
    }
  },
  
  setupEventListeners() {
    // Add button
    const addBtn = document.getElementById('addWorkerBtn');
    if (addBtn) {
      if (this.addBtnHandler) {
        addBtn.removeEventListener('click', this.addBtnHandler);
      }
      this.addBtnHandler = () => this.showAddForm();
      addBtn.addEventListener('click', this.addBtnHandler);
    }


    // Form submit
    const form = document.getElementById('workerFormElement');
    if (form) {
      if (this.formSubmitHandler) {
        form.removeEventListener('submit', this.formSubmitHandler);
      }
      this.formSubmitHandler = (e) => this.saveWorker(e);
      form.addEventListener('submit', this.formSubmitHandler);
    }
    
    // Initialize date picker
    Utils.initDatePicker('#w_hireDate');
    
    // Cancel button
    const cancelBtn = document.getElementById('cancelWorkerFormBtn');
    if (cancelBtn) {
      if (this.cancelBtnHandler) {
        cancelBtn.removeEventListener('click', this.cancelBtnHandler);
      }
      this.cancelBtnHandler = () => this.cancelForm();
      cancelBtn.addEventListener('click', this.cancelBtnHandler);
    }
    
    // Search input
    const searchInput = document.getElementById('workerSearch');
    if (searchInput) {
      if (this.searchInputHandler) {
        searchInput.removeEventListener('input', this.searchInputHandler);
      }
      this.searchInputHandler = () => this.filterWorkers();
      searchInput.addEventListener('input', this.searchInputHandler);
    }
    
    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
      if (this.statusFilterHandler) {
        statusFilter.removeEventListener('change', this.statusFilterHandler);
      }
      this.statusFilterHandler = () => this.filterWorkers();
      statusFilter.addEventListener('change', this.statusFilterHandler);
    }

    document.querySelectorAll('#workerStatusChips .filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#workerStatusChips .filter-chip').forEach(item => item.classList.remove('is-active'));
        chip.classList.add('is-active');
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
          statusFilter.value = chip.dataset.workerStatus || '';
          this.filterWorkers();
        }
      });
    });

    // Event delegation for table buttons
    const container = document.getElementById('contentArea');
    if (container) {
      if (this.tableClickHandler) {
        container.removeEventListener('click', this.tableClickHandler);
      }
      
      this.tableClickHandler = (e) => {
        const viewBtn = e.target.closest('.view-worker-btn');
        const editBtn = e.target.closest('.edit-worker-btn');
        const deleteBtn = e.target.closest('.delete-worker-btn');
        
        if (viewBtn) {
          const workerId = viewBtn.dataset.workerId;
          this.viewWorker(workerId);
        } else if (editBtn) {
          const workerId = editBtn.dataset.workerId;
          this.editWorker(workerId);
        } else if (deleteBtn) {
          const workerId = deleteBtn.dataset.workerId;
          this.deleteWorker(workerId);
        }
      };
      
      container.addEventListener('click', this.tableClickHandler);
    }
  },

  parseJsonArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.error('[Workers] Error parsing JSON array:', error);
      }
    }
    return [];
  },

  getWorkerType(worker) {
    return (worker.workerType || worker.worker_type) === 'owner' ? 'owner' : 'employee';
  },

  parseNumber(value) {
    if (value === null || value === undefined || value === '') return 0;
    const normalized = typeof value === 'string'
      ? value.replace(',', '.').replace(/[^\d.-]/g, '')
      : value;
    const number = parseFloat(normalized);
    return Number.isFinite(number) ? number : 0;
  },

  getEntryHours(entry) {
    return this.parseNumber(entry.hours ?? entry.hoursAllocated ?? entry.hours_allocated);
  },

  getEntryHourlyRate(entry, fallbackWorker = null) {
    return this.parseNumber(entry.hourlyRate ?? entry.hourly_rate ?? fallbackWorker?.hourlyRate ?? fallbackWorker?.hourly_rate);
  },

  getEntryLaborCost(entry, fallbackWorker = null) {
    const type = (entry.workerType || entry.worker_type || fallbackWorker?.workerType || fallbackWorker?.worker_type) === 'owner' ? 'owner' : 'employee';
    if (type === 'owner') return 0;

    const hours = this.getEntryHours(entry);
    const rate = this.getEntryHourlyRate(entry, fallbackWorker);
    if (rate > 0) return hours * rate;

    // Fallback only for old records that do not carry an hourly rate.
    return this.parseNumber(entry.laborCost ?? entry.labor_cost);
  },

  isWorkerEntry(entry, worker) {
    const entryWorkerId = entry.workerId ?? entry.worker_id ?? entry.id;
    if (entryWorkerId !== undefined && entryWorkerId !== null && entryWorkerId !== '' && Number(entryWorkerId) > 0) {
      return String(entryWorkerId) === String(worker.id);
    }

    const entryName = String(entry.workerName ?? entry.worker_name ?? entry.name ?? '').trim().toLowerCase();
    const workerName = String(worker.name ?? '').trim().toLowerCase();
    return !!entryName && entryName === workerName;
  },

  computeJobProfit(job) {
    const financials = window.JobFinancials.compute(job);

    return {
      profit: financials.profit,
      actualHours: financials.actualHours,
      profitPerHour: financials.profitPerHour
    };
  },

  getWorkerAssignedStats(worker, options = {}) {
    const jobs = State.read('jobs') || [];
    const month = options.month;
    const year = options.year;
    const jobIdFilter = options.jobId ? String(options.jobId) : null;

    return jobs.reduce((stats, job) => {
      const jobId = String(job.id);
      if (jobIdFilter && jobId !== jobIdFilter) return stats;

      const jobDateValue = job.date || job.createdAt || job.created_at;
      if (!jobDateValue) return stats;
      const jobDate = new Date(String(jobDateValue).substring(0, 10));
      if (Number.isNaN(jobDate.getTime())) return stats;
      if (month !== undefined && (jobDate.getMonth() !== month || jobDate.getFullYear() !== year)) return stats;

      const assignedWorkers = this.parseJsonArray(job.assignedWorkers ?? job.assigned_workers);
      const assignment = assignedWorkers.find(entry => this.isWorkerEntry(entry, worker));
      if (!assignment) return stats;

      const hours = this.getEntryHours(assignment);
      const laborCost = this.getEntryLaborCost(assignment, worker);

      stats.hours += hours;
      stats.earnings += laborCost;
      stats.assignments += 1;
      return stats;
    }, { hours: 0, earnings: 0, assignments: 0, source: 'assignments' });
  },

  getOwnerPerformanceStats(worker, options = {}) {
    const jobs = State.read('jobs') || [];
    let performanceValue = 0;
    let ownerHours = 0;

    jobs.forEach(job => {
      if (options.jobId && String(job.id) !== String(options.jobId)) return;

      const workerStats = this.getWorkerAssignedStats(worker, { ...options, jobId: job.id });
      const hours = workerStats.hours;
      if (hours <= 0) return;

      const financials = this.computeJobProfit(job);
      if (financials.profitPerHour === null) return;

      performanceValue += financials.profitPerHour * hours;
      ownerHours += hours;
    });

    return {
      value: performanceValue,
      rate: ownerHours > 0 ? performanceValue / ownerHours : null
    };
  },

  getWorkerWorkStats(worker, options = {}) {
    const assignedStats = this.getWorkerAssignedStats(worker, options);
    const ownerPerformance = this.getWorkerType(worker) === 'owner'
      ? this.getOwnerPerformanceStats(worker, options)
      : { value: 0, rate: null };
    return {
      hours: assignedStats.hours,
      earnings: assignedStats.earnings,
      assignments: assignedStats.assignments,
      ownerPerformanceValue: ownerPerformance.value,
      ownerPerformanceRate: ownerPerformance.rate
    };
  },

  renderTable(workers) {
    if (workers.length === 0) {
      return UIPrimitives.emptyState({
        icon: 'fas fa-hard-hat',
        title: 'Δεν υπάρχουν εργάτες',
        description: 'Δημιουργήστε τον πρώτο σας εργάτη!'
      });
    }

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    // Sort by createdAt timestamp - latest first
    const sortedWorkers = Utils.sortBy(workers, 'createdAt', 'desc');
    const lazy = Utils.getInfiniteSlice(this.lazyTableKey, sortedWorkers, this.lazyBatchSize);
    const visibleWorkers = lazy.items;

    return `
      <div class="table-wrapper has-mobile-cards">
        <table class="data-table">
          <thead>
            <tr>
              <th class="text-left">Ενέργειες</th>
              <th>Όνομα</th>
              <th>Ωρομίσθιο</th>
              <th>Τηλέφωνο</th>
              <th>Ώρες Μήνα</th>
              <th>Μισθός / Απόδοση</th>
              <th>Κατάσταση</th>
            </tr>
          </thead>
          <tbody>
          ${visibleWorkers.map(worker => {
            const monthlyStats = this.getWorkerWorkStats(worker, { month: thisMonth, year: thisYear });
            const isOwner = this.getWorkerType(worker) === 'owner';
            const valueDisplay = isOwner
              ? (monthlyStats.ownerPerformanceRate === null
                ? '<strong>-</strong><br><small class="text-muted">Απόδοση/ώρα</small>'
                : `<strong style="color: ${monthlyStats.ownerPerformanceRate >= 0 ? 'var(--success)' : 'var(--error)'};">${Utils.formatCurrency(monthlyStats.ownerPerformanceRate)}/ώρα</strong><br><small class="text-muted">Σύνολο: ${Utils.formatCurrency(monthlyStats.ownerPerformanceValue)}</small>`)
              : `<strong>${Utils.formatCurrency(monthlyStats.earnings)}</strong>`;

            const statusBadge = worker.status === 'active'
              ? UIPrimitives.statusBadge('Ενεργός', 'active')
              : UIPrimitives.statusBadge('Ανενεργός', 'inactive');
            
            return `
            <tr>
              <td class="actions">
                ${UIPrimitives.actionButton({ className: 'view-worker-btn', icon: 'fas fa-eye', title: 'Προβολή', data: { 'worker-id': worker.id } })}
                ${UIPrimitives.actionButton({ className: 'edit-worker-btn', icon: 'fas fa-edit', title: 'Επεξεργασία', data: { 'worker-id': worker.id } })}
                ${UIPrimitives.actionButton({ className: 'btn-danger delete-worker-btn', icon: 'fas fa-trash', title: 'Διαγραφή', data: { 'worker-id': worker.id } })}
              </td>
              <td title="${worker.name}"><strong>${worker.name}</strong></td>
              <td title="${Utils.formatCurrency(worker.hourlyRate)}">${Utils.formatCurrency(worker.hourlyRate)}/ώρα</td>
              <td title="${worker.phone || '-'}">${worker.phone ? `<a href="tel:${worker.phone}" style="color: var(--color-text); text-decoration: none;">${worker.phone}</a>` : '-'}</td>
              <td><strong>${monthlyStats.hours.toFixed(1)}h</strong></td>
              <td>${valueDisplay}</td>
              <td>${statusBadge}</td>
            </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      </div>
      <div class="mobile-card-list" aria-label="Λίστα εργατών για κινητό">
        ${visibleWorkers.map(worker => {
          const monthlyStats = this.getWorkerWorkStats(worker, { month: thisMonth, year: thisYear });
          const isOwner = this.getWorkerType(worker) === 'owner';
          const statusBadge = worker.status === 'active'
            ? UIPrimitives.statusBadge('Ενεργός', 'active')
            : UIPrimitives.statusBadge('Ανενεργός', 'inactive');
          const valueLabel = isOwner ? 'Απόδοση' : 'Μισθός μήνα';
          const value = isOwner
            ? (monthlyStats.ownerPerformanceRate === null ? '-' : `${Utils.formatCurrency(monthlyStats.ownerPerformanceRate)}/ώρα`)
            : Utils.formatCurrency(monthlyStats.earnings);

          return `
            <article class="entity-mobile-card">
              <div class="entity-mobile-card-header">
                <div class="entity-mobile-card-title">
                  <strong>${Utils.escapeHtml(worker.name || '-')}</strong>
                  <span class="worker-type-badge ${isOwner ? 'is-owner' : ''}">${isOwner ? 'Ιδιοκτήτης' : 'Υπάλληλος'}</span>
                  <span>${statusBadge}</span>
                </div>
                <div class="entity-mobile-card-actions">
                  ${UIPrimitives.actionButton({ className: 'view-worker-btn', icon: 'fas fa-eye', title: 'Προβολή', data: { 'worker-id': worker.id } })}
                  ${UIPrimitives.actionButton({ className: 'edit-worker-btn', icon: 'fas fa-edit', title: 'Επεξεργασία', data: { 'worker-id': worker.id } })}
                  ${UIPrimitives.actionButton({ className: 'btn-danger delete-worker-btn', icon: 'fas fa-trash', title: 'Διαγραφή', data: { 'worker-id': worker.id } })}
                </div>
              </div>
              <div class="entity-mobile-card-meta">
                ${worker.phone ? `<a href="tel:${Utils.escapeHtml(worker.phone)}"><i class="fas fa-phone"></i>${Utils.escapeHtml(worker.phone)}</a>` : '<span><i class="fas fa-phone"></i>Χωρίς τηλέφωνο</span>'}
                <span><i class="fas fa-euro-sign"></i>${Utils.formatCurrency(worker.hourlyRate)}/ώρα</span>
                <span><i class="fas fa-clock"></i>${monthlyStats.hours.toFixed(1)} ώρες μήνα</span>
                <span><i class="fas fa-chart-line"></i>${valueLabel}: ${value}</span>
              </div>
            </article>
          `;
        }).join('')}
      </div>
      ${Utils.renderInfiniteFooter(this.lazyTableKey, lazy.visible, lazy.total, this.lazyBatchSize)}
    `;
  },

  showAddForm() {
    this.currentEdit = null;
    const formTitle = document.getElementById('workerFormTitle');
    const workerForm = document.getElementById('workerForm');
    const workerStatus = document.getElementById('w_status');
    
    if (!workerForm) {
      console.error('❌ Form elements not found!');
      return;
    }
    
    formTitle.textContent = 'Νέος Εργάτης';
    workerForm.style.display = 'block';
    
    // Reset form and set defaults
    document.getElementById('workerFormElement').reset();
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    document.getElementById('w_hireDate').value = `${dd}/${mm}/${yyyy}`;
    workerStatus.value = 'active';
    
    workerForm.scrollIntoView({ behavior: 'smooth' });
  },

  async saveWorker(e) {
    e.preventDefault();
    console.log('[Workers] Saving worker...');

    const workerData = {
      name: document.getElementById('w_name').value.trim(),
      phone: document.getElementById('w_phone').value.trim(),
      specialty: null,
      hourlyRate: parseFloat(document.getElementById('w_hourlyRate').value) || 0,
      workerType: document.getElementById('w_workerType').value || 'employee',
      status: document.getElementById('w_status').value,
      hireDate: Utils.greekToDate(document.getElementById('w_hireDate').value),
      notes: document.getElementById('w_notes').value.trim(),
      totalHours: 0,
      totalEarnings: 0,
      currentCheckIn: null
    };

    console.log('[Workers] Worker data:', workerData);
    console.log('[Workers] Editing ID:', this.currentEdit);

    // Auto-generate ID if new worker
    if (!this.currentEdit) {
      const workers = State.read('workers') || [];
      const maxId = workers.length > 0 
        ? Math.max(...workers.map(w => {
            const id = String(w.id);
            return id.includes('-') ? parseInt(id.split('-')[1]) || 0 : parseInt(id) || 0;
          }))
        : 0;
      workerData.id = `W-${String(maxId + 1).padStart(4, '0')}`;
      console.log('[Workers] New worker ID:', workerData.id);
    } else {
      workerData.id = this.currentEdit;
      // Keep existing totals when editing
      const existing = State.data.workers.find(w => w.id === this.currentEdit);
      if (existing) {
        workerData.totalHours = existing.totalHours || 0;
        workerData.totalEarnings = existing.totalEarnings || 0;
        workerData.currentCheckIn = existing.currentCheckIn || null;
        console.log('[Workers] Kept existing totals:', { totalHours: workerData.totalHours, totalEarnings: workerData.totalEarnings });
      }
    }

    // Basic validation
    if (!workerData.name || !workerData.phone || !workerData.hourlyRate) {
      console.warn('[Workers] Validation failed');
      Toast.error('Παρακαλώ συμπληρώστε όλα τα υποχρεωτικά πεδία');
      return;
    }

    // Save or update
    try {
      if (this.currentEdit) {
        await State.update('workers', workerData.id, workerData);
        Toast.success('Ο εργάτης ενημερώθηκε!');
      } else {
        await State.create('workers', workerData);
        Toast.success('Ο εργάτης δημιουργήθηκε!');
      }

      this.cancelForm();
      this.refreshTable();
    } catch (error) {
      console.error('Error saving worker:', error);
      // Error toast already shown by State
    }
  },

  refreshTable() {
    const workers = State.read('workers') || [];
    this.renderTableWithLazy(workers, { reset: true });
  },

  renderTableWithLazy(workers, { reset = false } = {}) {
    const container = document.getElementById('workersTableContainer');
    if (container) {
      if (reset) {
        Utils.resetInfiniteList(this.lazyTableKey, this.lazyBatchSize);
      }
      container.innerHTML = this.renderTable(workers);
      this.setupLazyTable(workers);
    }
  },

  setupLazyTable(workers) {
    Utils.setupInfiniteScroll({
      key: this.lazyTableKey,
      total: Array.isArray(workers) ? workers.length : 0,
      batchSize: this.lazyBatchSize,
      onLoadMore: () => this.renderTableWithLazy(workers)
    });
  },

  viewWorker(id) {
    console.log('[Workers] Viewing worker:', id);
    const worker = State.data.workers.find(w => Number(w.id) === Number(id));
    if (!worker) {
      console.error('[Workers] Worker not found:', id);
      return;
    }

    console.log('[Workers] Worker data:', worker);

    // Get worker's work history from job assignments.
    const jobs = State.read('jobs') || [];
    console.log('[Workers] Total jobs in database:', jobs.length);

    const workerJobRows = jobs
      .map(job => ({
        job,
        stats: this.getWorkerWorkStats(worker, { jobId: job.id })
      }))
      .filter(row => row.stats.hours > 0);

    console.log('[Workers] Found', workerJobRows.length, 'jobs for worker', id);

    const statusBadge = worker.status === 'active'
      ? UIPrimitives.statusBadge('Ενεργός', 'active')
      : UIPrimitives.statusBadge('Ανενεργός', 'inactive');

    const content = `
      <div class="job-details">
        <!-- Βασικά Στοιχεία -->
        <div class="detail-section">
          <h4><i class="fas fa-info-circle"></i> Βασικά Στοιχεία</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Κωδικός:</label>
              <span>${worker.id}</span>
            </div>
            <div class="detail-item">
              <label>Ονοματεπώνυμο:</label>
              <span><strong>${worker.name}</strong></span>
            </div>
            <div class="detail-item">
              <label>Ειδικότητα:</label>
              <span>${worker.specialty || '-'}</span>
            </div>
            <div class="detail-item">
              <label>Τύπος:</label>
              <span>${(worker.workerType || worker.worker_type) === 'owner' ? 'Ιδιοκτήτης' : 'Υπάλληλος'}</span>
            </div>
            <div class="detail-item">
              <label>Ωρομίσθιο:</label>
              <span><strong>${Utils.formatCurrency(worker.hourlyRate)}/ώρα</strong></span>
            </div>
            <div class="detail-item">
              <label>Κατάσταση:</label>
              <span>${statusBadge}</span>
            </div>
            <div class="detail-item">
              <label>Ημερομηνία Πρόσληψης:</label>
              <span>${worker.hireDate ? Utils.formatDate(worker.hireDate) : '-'}</span>
            </div>
          </div>
        </div>

        <!-- Επικοινωνία -->
        <div class="detail-section">
          <h4><i class="fas fa-phone"></i> Επικοινωνία</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Τηλέφωνο:</label>
              <span>${worker.phone ? `<a href="tel:${worker.phone}" style="color: var(--color-primary); text-decoration: none;">${worker.phone}</a>` : '-'}</span>
            </div>
          </div>
        </div>

        <!-- Εργασίες -->
        ${workerJobRows.length > 0 ? `
        <div class="detail-section">
          <h4><i class="fas fa-briefcase"></i> Εργασίες (${workerJobRows.length})</h4>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Εργασία</th>
                  <th>Πελάτης</th>
                  <th>Ώρες</th>
                  <th>Κόστος / Απόδοση</th>
                </tr>
              </thead>
              <tbody>
                ${workerJobRows.map(({ job, stats }) => {
                  const client = State.data.clients.find(c => Number(c.id) === Number(job.clientId || job.client_id));
                  const isOwner = this.getWorkerType(worker) === 'owner';
                  const valueDisplay = isOwner
                    ? (stats.ownerPerformanceRate === null
                      ? '-'
                      : `${Utils.formatCurrency(stats.ownerPerformanceRate)}/ώρα<br><small class="text-muted">Σύνολο: ${Utils.formatCurrency(stats.ownerPerformanceValue)}</small>`)
                    : Utils.formatCurrency(stats.earnings);
                  return `
                    <tr>
                      <td><strong>${job.id}</strong></td>
                      <td>${client?.name || 'Άγνωστος'}</td>
                      <td>${stats.hours.toFixed(1)}h</td>
                      <td><strong style="color: var(--accent-primary);">${valueDisplay}</strong></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
        ` : ''}

        <!-- Σημειώσεις -->
        ${worker.notes ? `
        <div class="detail-section">
          <h4><i class="fas fa-sticky-note"></i> Σημειώσεις</h4>
          <div class="detail-notes">
            ${worker.notes}
          </div>
        </div>
        ` : ''}
      </div>
    `;

    const footer = `
      <button class="btn-primary" id="editWorkerFromModalBtn">
        <i class="fas fa-edit"></i> Επεξεργασία
      </button>
    `;

    Modal.open({
      title: `${worker.name}`,
      content: content,
      footer: footer,
      size: 'lg'
    });

    // Add event listener for edit button
    setTimeout(() => {
      const editBtn = document.getElementById('editWorkerFromModalBtn');
      if (editBtn) {
        editBtn.onclick = () => {
          Modal.close();
          setTimeout(() => {
            this.editWorker(id);
          }, 100);
        };
      }
    }, 50);
  },

  editWorker(id) {
    const worker = State.data.workers.find(w => Number(w.id) === Number(id));
    if (!worker) return;

    this.currentEdit = Number(id);
    document.getElementById('workerFormTitle').textContent = 'Επεξεργασία Εργάτη';
    document.getElementById('workerForm').style.display = 'block';

    // Fill form
    document.getElementById('w_name').value = worker.name || '';
    document.getElementById('w_phone').value = worker.phone || '';
    document.getElementById('w_hourlyRate').value = worker.hourlyRate || '';
    document.getElementById('w_workerType').value = worker.workerType || worker.worker_type || 'employee';
    document.getElementById('w_status').value = worker.status || 'active';
    document.getElementById('w_hireDate').value = Utils.dateToGreek(worker.hireDate);
    document.getElementById('w_notes').value = worker.notes || '';

    document.getElementById('workerForm').scrollIntoView({ behavior: 'smooth' });
  },

  getWorkerDeleteBlockers(worker) {
    const jobs = State.read('jobs') || [];

    const assignedJobs = jobs.filter(job => {
      const assignedWorkers = this.parseJsonArray(job.assignedWorkers ?? job.assigned_workers);
      return assignedWorkers.some(entry => this.isWorkerEntry(entry, worker));
    });

    return { assignedJobs };
  },

  async deleteWorker(id) {
    const worker = State.read('workers', id);
    if (!worker) {
      Toast.error('Ο εργάτης δεν βρέθηκε');
      return;
    }

    const blockers = this.getWorkerDeleteBlockers(worker);
    if (blockers.assignedJobs.length > 0) {
      const modal = Modal.open({
        title: '<i class="fas fa-exclamation-triangle"></i> Δεν επιτρέπεται η διαγραφή',
        content: `
          <div class="alert alert-warning">
            <p><strong>Ο εργάτης δεν μπορεί να διαγραφεί.</strong></p>
            <p>Είναι συνδεδεμένος με ${blockers.assignedJobs.length} εργασίες.</p>
            <p class="text-muted mb-0">Αν δεν εργάζεται πλέον, αλλάξτε την κατάστασή του σε <strong>Ανενεργός</strong> για να διατηρηθεί σωστά το ιστορικό.</p>
          </div>
        `,
        footer: '<button class="btn-primary" id="workerDeleteBlockedOkBtn">OK</button>',
        size: 'sm'
      });
      modal.querySelector('#workerDeleteBlockedOkBtn').onclick = () => Modal.close();
      return;
    }

    Modal.confirm({
      title: 'Διαγραφή Εργάτη',
      message: 'Είστε σίγουροι ότι θέλετε να διαγράψετε αυτόν τον εργάτη;',
      onConfirm: async () => {
        try {
          await State.delete('workers', id);
          Toast.success('Ο εργάτης διαγράφηκε');
          this.refreshTable();
        } catch (error) {
          // Error toast already shown by State
        }
      }
    });
  },

  cancelForm() {
    document.getElementById('workerForm').style.display = 'none';
    document.getElementById('workerFormElement').reset();
    this.currentEdit = null;
  },

  clearForm() {
    document.getElementById('workerFormElement').reset();
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    document.getElementById('w_hireDate').value = `${dd}/${mm}/${yyyy}`;
    document.getElementById('w_status').value = 'active';
    document.getElementById('w_workerType').value = 'employee';
    this.currentEdit = null;
    Toast.info('Η φόρμα καθαρίστηκε');
  },

  filterWorkers() {
    const searchTerm = document.getElementById('workerSearch').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;

    let workers = State.data.workers;

    // Filter by search
    if (searchTerm) {
      workers = workers.filter(worker =>
        worker.name.toLowerCase().includes(searchTerm) ||
        (worker.phone || '').includes(searchTerm) ||
        (worker.specialty || '').toLowerCase().includes(searchTerm)
      );
    }

    // Filter by status
    if (statusFilter) {
      workers = workers.filter(worker => worker.status === statusFilter);
    }

    this.renderTableWithLazy(workers, { reset: true });
  },

  // TODO: Future feature - Timesheet Check-in/Check-out
  // Currently not used in UI, but functions are ready for implementation
  /*
  checkIn(id) {
    const worker = State.data.workers.find(w => w.id === id);
    if (!worker) return;

    if (worker.currentCheckIn) {
      Toast.warning('Ο εργάτης έχει ήδη κάνει check-in!');
      return;
    }

    const now = new Date().toISOString();
    
    // Update worker
    worker.currentCheckIn = now;
    State.update('workers', id, worker);

    // Create timesheet entry
    const timesheets = State.read('timesheets') || [];
    const timesheet = {
      id: `TS-${String(timesheets.length + 1).padStart(6, '0')}`,
      workerId: id,
      workerName: worker.name,
      checkIn: now,
      checkOut: null,
      hoursWorked: null,
      hourlyRate: worker.hourlyRate,
      earnings: null
    };
    
    State.create('timesheets', timesheet);
    
    Toast.success(`${worker.name} έκανε check-in!`);
    this.refreshTable();
  },

  checkOut(id) {
    const worker = State.data.workers.find(w => w.id === id);
    if (!worker) return;

    if (!worker.currentCheckIn) {
      Toast.warning('Ο εργάτης δεν έχει κάνει check-in!');
      return;
    }

    const now = new Date().toISOString();
    const checkInTime = new Date(worker.currentCheckIn);
    const checkOutTime = new Date(now);
    
    // Calculate hours worked
    const hoursWorked = (checkOutTime - checkInTime) / (1000 * 60 * 60);
    const earnings = hoursWorked * worker.hourlyRate;

    // Find and update timesheet
    const timesheets = State.read('timesheets') || [];
    const timesheet = timesheets.find(t => 
      t.workerId === id && t.checkIn === worker.currentCheckIn && !t.checkOut
    );

    if (timesheet) {
      timesheet.checkOut = now;
      timesheet.hoursWorked = hoursWorked;
      timesheet.earnings = earnings;
      State.update('timesheets', timesheet.id, timesheet);
    }

    // Update worker
    worker.currentCheckIn = null;
    worker.totalHours = (worker.totalHours || 0) + hoursWorked;
    worker.totalEarnings = (worker.totalEarnings || 0) + earnings;
    State.update('workers', id, worker);

    Toast.success(`${worker.name} έκανε check-out! Ώρες: ${hoursWorked.toFixed(2)}, Έσοδα: ${Utils.formatCurrency(earnings)}`);
    this.refreshTable();
  },
  */

  showReports() {
    const workers = State.read('workers') || [];

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    // Calculate monthly stats per worker
    const workerStats = workers.map(worker => {
      const stats = this.getWorkerWorkStats(worker, { month: thisMonth, year: thisYear });

      return {
        name: worker.name,
        workerType: this.getWorkerType(worker),
        hours: stats.hours,
        earnings: stats.earnings,
        ownerPerformanceValue: stats.ownerPerformanceValue,
        ownerPerformanceRate: stats.ownerPerformanceRate,
        shifts: stats.assignments
      };
    }).filter(s => s.hours > 0); // Only show workers with hours

    const content = `
      <div class="job-details">
        <div class="detail-section">
          <h4><i class="fas fa-calendar-alt"></i> Αναφορά Μήνα: ${now.toLocaleString('el-GR', { month: 'long', year: 'numeric' })}</h4>
          
          ${workerStats.length === 0 ? `
            <p class="text-muted">Δεν υπάρχουν καταχωρημένες ώρες για τον τρέχοντα μήνα.</p>
          ` : `
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Όνομα</th>
                    <th>Βάρδιες</th>
                    <th>Ώρες</th>
                    <th>Μισθός / Απόδοση</th>
                  </tr>
                </thead>
                <tbody>
                  ${workerStats.map(stat => `
                    <tr>
                      <td><strong>${stat.name}</strong></td>
                      <td>${stat.shifts}</td>
                      <td><strong>${stat.hours.toFixed(1)}h</strong></td>
                      <td><strong style="color: var(--accent-primary);">${stat.workerType === 'owner' ? (stat.ownerPerformanceRate === null ? '-' : Utils.formatCurrency(stat.ownerPerformanceRate) + '/ώρα<br><small class="text-muted">Σύνολο: ' + Utils.formatCurrency(stat.ownerPerformanceValue) + '</small>') : Utils.formatCurrency(stat.earnings)}</strong></td>
                    </tr>
                  `).join('')}
                  <tr style="background: var(--bg-secondary); font-weight: bold;">
                    <td>ΣΥΝΟΛΟ</td>
                    <td>${workerStats.reduce((sum, s) => sum + s.shifts, 0)}</td>
                    <td>${workerStats.reduce((sum, s) => sum + s.hours, 0).toFixed(1)}h</td>
                    <td style="color: var(--accent-primary);">${Utils.formatCurrency(workerStats.reduce((sum, s) => sum + (s.workerType === 'owner' ? s.ownerPerformanceValue : s.earnings), 0))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;

    const footer = `
      <button class="btn-secondary" onclick="WorkersView.exportReport()">
        <i class="fas fa-download"></i> Export Excel
      </button>
    `;

    Modal.open({
      title: 'Αναφορές Προσωπικού',
      content: content,
      footer: footer,
      size: 'lg'
    });
  },

  exportReport() {
    Toast.info('Η λειτουργία export θα υλοποιηθεί σύντομα');
  },

  cleanup() {
    document.getElementById('addWorkerBtn')?.removeEventListener('click', this.addBtnHandler);
    document.getElementById('workerFormElement')?.removeEventListener('submit', this.formSubmitHandler);
    document.getElementById('cancelWorkerFormBtn')?.removeEventListener('click', this.cancelBtnHandler);
    document.getElementById('workerSearch')?.removeEventListener('input', this.searchInputHandler);
    document.getElementById('workerStatusFilter')?.removeEventListener('change', this.statusFilterHandler);
    document.getElementById('contentArea')?.removeEventListener('click', this.tableClickHandler);

    this.tableClickHandler = null;
    this.formSubmitHandler = null;
    this.addBtnHandler = null;
    this.clearBtnHandler = null;
    this.cancelBtnHandler = null;
    this.searchInputHandler = null;
    this.statusFilterHandler = null;
  }
};
