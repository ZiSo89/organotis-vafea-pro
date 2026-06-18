/* ========================================
   Jobs View - Διαχείριση Εργασιών
   ======================================== */

window.JobsView = {
  currentEdit: null,
  lazyTableKey: 'jobs-table',
  lazyBatchSize: 20,
  formSteps: [
    { id: 'basic', label: 'Βασικά', icon: 'fas fa-info-circle' },
    { id: 'details', label: 'Εργασία & Υλικά', icon: 'fas fa-paint-roller' },
    { id: 'workers', label: 'Συνεργείο', icon: 'fas fa-users' },
    { id: 'expenses', label: 'Έξοδα', icon: 'fas fa-arrow-down' },
    { id: 'billing', label: 'Χρέωση', icon: 'fas fa-receipt' },
    { id: 'payments', label: 'Πληρωμές', icon: 'fas fa-hand-holding-usd' },
    { id: 'notes', label: 'Σύνοψη & Σημειώσεις', icon: 'fas fa-clipboard-check' }
  ],
  financialStepIds: ['workers', 'expenses', 'billing', 'payments', 'notes'],
  currentStepIndex: 0,
  draftPayments: [],
  formDirty: false,

  isFinancialStep(stepId) {
    return this.financialStepIds.includes(stepId);
  },

  updateKpiStripVisibility() {
    const strip = document.getElementById('jobFormKpiStrip');
    if (!strip) return;
    const step = this.formSteps[this.currentStepIndex];
    strip.hidden = !(step && this.isFinancialStep(step.id));
  },

  updateStepNavButtons() {
    const prevBtn = document.getElementById('jobFormPrevStepBtn');
    const nextBtn = document.getElementById('jobFormNextStepBtn');
    const prev = this.formSteps[this.currentStepIndex - 1];
    const next = this.formSteps[this.currentStepIndex + 1];
    const compactNav = Utils.isMobile();

    if (prevBtn) {
      prevBtn.disabled = !prev;
      prevBtn.innerHTML = !prev
        ? '<i class="fas fa-arrow-left"></i> Πίσω'
        : compactNav
          ? '<i class="fas fa-arrow-left"></i> Πίσω'
          : `<i class="fas fa-arrow-left"></i> ${Utils.escapeHtml(prev.label)}`;
    }
    if (nextBtn) {
      nextBtn.disabled = !next;
      nextBtn.innerHTML = !next
        ? 'Επόμενο <i class="fas fa-arrow-right"></i>'
        : compactNav
          ? 'Επόμενο <i class="fas fa-arrow-right"></i>'
          : `${Utils.escapeHtml(next.label)} <i class="fas fa-arrow-right"></i>`;
    }
  },

  renderJobFormKpiStrip() {
    return `
      <section id="jobFormKpiStrip" class="cost-kpi-strip cost-kpi-strip-compact job-form-kpi-strip" hidden aria-label="Σύνοψη κόστους και χρέωσης">
        <div class="cost-kpi cost-kpi-primary">
          <span>Χρέωση</span>
          <strong id="billingAmountKpiDisplay">0.00 €</strong>
        </div>
        <div class="cost-kpi profit">
          <span>Καθαρό κέρδος</span>
          <strong id="profitDisplay">0.00 €</strong>
        </div>
        <div class="cost-kpi">
          <span>Δουλεμένες</span>
          <strong id="workedHoursDisplay">0.0 ώρες</strong>
        </div>
        <div class="cost-kpi">
          <span>Χρεωμένες</span>
          <strong id="chargedHoursDisplay">0.0 ώρες</strong>
        </div>
        <div class="cost-kpi warning">
          <span>Μη χρεωμένες</span>
          <strong id="unbilledHoursDisplay">0.0 ώρες</strong>
        </div>
        <div class="cost-kpi danger">
          <span>Χαμένη αξία</span>
          <strong id="lostBillingValueDisplay">0.00 €</strong>
        </div>
      </section>
    `;
  },

  getJobField(job, ...keys) {
    if (!job) return '';
    for (const key of keys) {
      const value = job[key];
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return '';
  },

  normalizeIsoDate(value) {
    if (!value || value === 'null' || value === 'undefined') return '';
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : String(value);
  },

  normalizeJobSchedule(job, fallbackJob = null) {
    if (!job && !fallbackJob) return null;
    const source = job || {};
    const fallback = fallbackJob || {};
    const normalized = { ...source };
    const nextVisit = this.normalizeIsoDate(
      this.getJobField(source, 'nextVisit', 'next_visit') || this.getJobField(fallback, 'nextVisit', 'next_visit')
    );
    let visitEndDate = this.normalizeIsoDate(
      this.getJobField(source, 'visitEndDate', 'visit_end_date') || this.getJobField(fallback, 'visitEndDate', 'visit_end_date')
    );
    const legacyEndDate = this.normalizeIsoDate(this.getJobField(source, 'endDate', 'end_date') || this.getJobField(fallback, 'endDate', 'end_date'));
    if (!visitEndDate && legacyEndDate && (!nextVisit || legacyEndDate >= nextVisit)) {
      visitEndDate = legacyEndDate;
    }

    const sourceAllDay = this.getJobField(source, 'visitAllDay', 'visit_all_day');
    const sourceStartTime = this.getJobField(source, 'visitStartTime', 'visit_start_time');
    const sourceEndTime = this.getJobField(source, 'visitEndTime', 'visit_end_time');

    normalized.nextVisit = nextVisit;
    normalized.visitEndDate = visitEndDate;
    normalized.visitAllDay = sourceAllDay !== '' ? sourceAllDay : this.getJobField(fallback, 'visitAllDay', 'visit_all_day');
    normalized.visitStartTime = sourceStartTime !== '' ? sourceStartTime : this.getJobField(fallback, 'visitStartTime', 'visit_start_time');
    normalized.visitEndTime = sourceEndTime !== '' ? sourceEndTime : this.getJobField(fallback, 'visitEndTime', 'visit_end_time');

    delete normalized.next_visit;
    delete normalized.visit_end_date;
    delete normalized.visit_all_day;
    delete normalized.visit_start_time;
    delete normalized.visit_end_time;

    return normalized;
  },

  setDateInputValue(input, isoDate) {
    if (!input) return;
    const displayValue = Utils.dateToGreek(this.normalizeIsoDate(isoDate));
    if (input._flatpickr) {
      if (displayValue) {
        input._flatpickr.setDate(displayValue, false, 'd/m/Y');
      } else {
        input._flatpickr.clear();
      }
    }
    input.value = displayValue;
  },

  /** Μορφοποίηση προγραμματισμού επίσκεψης για πίνακα/προβολή */
  formatVisitSchedule(job) {
    const normalized = this.normalizeJobSchedule(job);
    const nv = normalized.nextVisit;
    if (!nv) return '-';
    let text = Utils.formatDate(nv);
    const ved = normalized.visitEndDate;
    const nvDay = String(nv).substring(0, 10);
    const vedDay = ved ? String(ved).substring(0, 10) : null;
    if (vedDay && vedDay !== nvDay) {
      text += ' – ' + Utils.formatDate(ved);
    }
    const allDay = normalized.visitAllDay;
    const isAllDay = allDay === '' || Number(allDay) === 1;
    const st = normalized.visitStartTime;
    if (!isAllDay && st) {
      const start = String(st).substring(0, 5);
      const et = normalized.visitEndTime;
      text += et ? ` (${start}–${String(et).substring(0, 5)})` : ` (${start})`;
    }
    return text;
  },

  resetJobFormSession() {
    this.currentStepIndex = 0;
    this.draftPayments = [];
    this.formDirty = false;
    this.goToJobStep('basic');
    this.updateJobFormBanner();
  },

  markJobFormDirty() {
    this.formDirty = true;
    this.updateJobFormBanner();
  },

  updateJobFormBanner(options = {}) {
    const banner = document.getElementById('jobFormStatusBanner');
    if (!banner) return;

    if (options.saved) {
      this.formDirty = false;
    }

    if (this.formDirty) {
      banner.className = 'job-form-status-banner is-dirty';
      banner.innerHTML = `
        <div class="job-form-status-copy">
          <i class="fas fa-circle-exclamation"></i>
          <span>Υπάρχουν μη αποθηκευμένες αλλαγές</span>
        </div>
      `;
      return;
    }

    banner.className = 'job-form-status-banner';
    banner.innerHTML = '';
  },

  updateJobFormStepper() {
    const steps = document.querySelectorAll('.job-form-step');
    steps.forEach((stepEl, index) => {
      stepEl.classList.toggle('is-active', index === this.currentStepIndex);
      stepEl.classList.toggle('is-complete', index < this.currentStepIndex);
      stepEl.setAttribute('aria-current', index === this.currentStepIndex ? 'step' : 'false');
    });

    const progress = document.getElementById('jobFormStepProgress');
    if (progress) {
      const pct = ((this.currentStepIndex + 1) / this.formSteps.length) * 100;
      progress.style.width = `${pct}%`;
    }

    const label = document.getElementById('jobFormStepLabel');
    if (label) {
      const current = this.formSteps[this.currentStepIndex];
      label.textContent = current ? `Βήμα ${this.currentStepIndex + 1}/${this.formSteps.length}: ${current.label}` : '';
    }

    this.updateStepNavButtons();
  },

  goToJobStep(stepRef) {
    let index = this.currentStepIndex;
    if (typeof stepRef === 'number') {
      index = Math.max(0, Math.min(this.formSteps.length - 1, stepRef));
    } else if (typeof stepRef === 'string') {
      const found = this.formSteps.findIndex(step => step.id === stepRef);
      if (found >= 0) index = found;
    }

    this.currentStepIndex = index;
    const step = this.formSteps[index];
    if (!step) return;

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === step.id);
    });
    document.querySelectorAll('.tab-content').forEach(panel => {
      panel.classList.toggle('active', panel.id === `tab-${step.id}`);
    });

    this.updateJobFormStepper();
    this.updateKpiStripVisibility();

    if (this.isFinancialStep(step.id)) {
      this.calculateCost();
    }
    if (step.id === 'notes') {
      this.updateJobFormReview();
    }

    const jobForm = document.getElementById('jobForm');
    if (jobForm) {
      jobForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },

  getDraftPaymentsTotal() {
    return (this.draftPayments || []).reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
  },

  async flushDraftPayments(jobId) {
    if (!jobId || !this.draftPayments.length) return;

    for (const payment of this.draftPayments) {
      await State.create('jobPayments', {
        jobId: Number(jobId),
        paymentDate: payment.paymentDate,
        amount: payment.amount,
        notes: payment.notes || ''
      });
    }

    this.draftPayments = [];
    await this.syncJobStatusFromPayments(jobId);
  },

  assignedWorkers: [], // Array to hold workers assigned to current job
  assignedPaints: [], // Legacy DB field: UI treats these rows as job materials
  tableClickHandler: null,
  // Store all event handlers to prevent duplicates
  formSubmitHandler: null,
  addBtnHandler: null,
  clearBtnHandler: null,
  clientSelectHandler: null,
  costFieldHandlers: {},
  costBlurHandlers: {},
  visitDateHandlers: {},
  visitDatePickerHandlers: {},
  tabClickHandler: null,
  addWorkerBtnHandler: null,
  addPaintBtnHandler: null,

  // Store handlers for filters
  cancelBtnHandler: null,
  searchInputHandler: null,
  statusFilterHandler: null,

  render(container, params = {}) {
    const jobs = State.read('jobs') || [];
    const clients = State.read('clients') || [];
    const inventory = State.read('inventory') || [];
    Utils.resetInfiniteList(this.lazyTableKey, this.lazyBatchSize);

    // Reverse clients to show latest first
    const sortedClients = [...clients].reverse();

    container.innerHTML = `
      <div class="view-header">
        <h1><i class="fas fa-briefcase"></i> Εργασίες</h1>
        <button class="btn btn-primary" id="addJobBtn">
          <i class="fas fa-plus"></i> Νέα Εργασία
        </button>
      </div>

      <!-- Form -->
      <div id="jobForm" class="card job-form-shell" style="display: none;">
        <div class="job-form-header">
          <div>
            <h2 id="formTitle">Νέα Εργασία</h2>
            <p id="jobFormStepLabel" class="job-form-step-label" aria-live="polite"></p>
          </div>
          <button type="button" class="btn-icon job-form-close-btn" id="jobFormHeaderCloseBtn" title="Κλείσιμο φόρμας">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div id="jobFormStatusBanner" class="job-form-status-banner" role="status" aria-live="polite"></div>

        <div class="job-form-progress-track" aria-hidden="true">
          <div id="jobFormStepProgress" class="job-form-progress-fill"></div>
        </div>

        <nav class="job-form-stepper" aria-label="Βήματα φόρμας εργασίας">
          ${this.formSteps.map((step, index) => `
            <button type="button"
              class="job-form-step ${index === 0 ? 'is-active' : ''}"
              data-step="${step.id}"
              data-step-index="${index}"
              aria-current="${index === 0 ? 'step' : 'false'}">
              <span class="job-form-step-index">${index + 1}</span>
              <span class="job-form-step-label">${step.label}</span>
            </button>
          `).join('')}
        </nav>

        ${this.renderJobFormKpiStrip()}
        
        <form id="jobFormElement">
          
          <!-- Tab Navigation (desktop) -->
          <div class="tabs-nav job-form-tabs-nav">
            ${this.formSteps.map((step, index) => `
              <button type="button" class="tab-btn ${index === 0 ? 'active' : ''}" data-tab="${step.id}">
                <i class="${step.icon}"></i>
                <span>${step.label}</span>
              </button>
            `).join('')}
          </div>

          <!-- Tab: Βασικά Στοιχεία -->
          <div class="tab-content active" id="tab-basic">
            <div class="form-grid">
              <!-- Row 1: Client -->
              <div class="form-group span-2">
                <label>Πελάτης <span class="required">*</span></label>
                <select id="jobClient" required>
                  <option value="">Επιλέξτε πελάτη...</option>
                  ${sortedClients.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                </select>
              </div>

              <div class="form-group span-2">
                <label>Τίτλος εργασίας</label>
                <input type="text" id="jobTitle" placeholder="π.χ. Βάψιμο σαλονιού — κενό = όνομα πελάτη">
                <small class="text-muted">Εμφανίζεται στο ημερολόγιο και στις λίστες.</small>
              </div>

              <!-- Client Address (auto-filled, readonly) -->
              <div class="form-group span-2">
                <label>Διεύθυνση</label>
                <input type="text" id="jobAddress" readonly style="background-color: var(--bg-secondary);">
              </div>

              <!-- Row 2: Status -->
              <div class="form-group span-2">
                <label>Κατάσταση <span class="required">*</span></label>
                <select id="jobStatus" required>
                  ${CONFIG.STATUS_OPTIONS.map(status => `<option value="${status}">${status}</option>`).join('')}
                </select>
              </div>

              <!-- Πρόγραμμα επίσκεψης -->
              <div class="form-group span-2" style="margin-top: 0.5rem; padding-top: 12px; border-top: 1px solid var(--border-color);">
                <h4 style="margin: 0 0 12px; font-size: 1rem; color: var(--text-primary);">
                  <i class="fas fa-calendar-check"></i> Πρόγραμμα επίσκεψης
                </h4>
              </div>
              <div class="form-group">
                <label>Επόμενη Επίσκεψη</label>
                <input type="text" id="jobNextVisit" placeholder="ΗΗ/ΜΜ/ΕΕΕΕ" inputmode="numeric" autocomplete="off">
              </div>
              <div class="form-group">
                <label>Λήξη Επίσκεψης</label>
                <input type="text" id="jobVisitEndDate" placeholder="ΗΗ/ΜΜ/ΕΕΕΕ (πολυήμερη)" inputmode="numeric" autocomplete="off">
                <small style="color: var(--text-muted); margin-top: 0.25rem; display: block;">
                  <i class="fas fa-info-circle"></i> Για πολυήμερες επισκέψεις — αφήστε κενό για μία μέρα
                </small>
              </div>
              <div class="form-group span-2">
                <small style="color: var(--text-muted); display: block;">
                  <i class="fas fa-info-circle"></i> Οι ημερομηνίες συγχρονίζονται αυτόματα με το ημερολόγιο
                </small>
              </div>

              <!-- Row 3b: Ωράριο επίσκεψης (ενοποιημένο με το ημερολόγιο) -->
              <div class="form-group span-2">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                  <input type="checkbox" id="jobVisitAllDay" checked style="width: auto;">
                  Ολοήμερη επίσκεψη
                </label>
              </div>
              <div class="form-group" id="jobVisitTimeWrap" style="display: none;">
                <label>Ώρα από</label>
                <input type="time" id="jobVisitStartTime" autocomplete="off">
              </div>
              <div class="form-group" id="jobVisitEndTimeWrap" style="display: none;">
                <label>Ώρα έως</label>
                <input type="time" id="jobVisitEndTime" autocomplete="off">
              </div>

            </div>
          </div>

          <!-- Tab: Εργασία & Υλικά -->
          <div class="tab-content" id="tab-details">
            <div class="form-grid">
              <div class="form-group">
                <label>Αριθμός Δωματίων</label>
                <input type="number" id="jobRooms" min="1" placeholder="π.χ. 3">
              </div>

              <div class="form-group">
                <label>Τετραγωνικά (m²)</label>
                <input type="number" id="jobArea" placeholder="π.χ. 80">
              </div>

              <!-- Υλικά -->
              <div class="form-group span-2" style="margin-top: 20px;">
                <h4 style="margin-bottom: 10px;"><i class="fas fa-boxes"></i> Υλικά</h4>
                <button type="button" class="btn btn-secondary" id="addPaintBtn">
                  <i class="fas fa-plus"></i> Προσθήκη Υλικού
                </button>
                <div id="paintsContainer" style="margin-top: 15px;">
                  <!-- Materials will appear here -->
                </div>
              </div>
            </div>
          </div>

          <!-- Tab: Συνεργείο -->
          <div class="tab-content" id="tab-workers">
            <section class="cost-workers-panel cost-step-panel">
              <div class="cost-panel-header">
                <div>
                  <h4><i class="fas fa-users"></i> Συνεργείο</h4>
                  <p class="cost-panel-lead">Ποιος δούλεψε, πόσες ώρες και τι κόστος έφερε στην εργασία.</p>
                </div>
                <button type="button" class="btn btn-secondary" id="addWorkerToJobBtn">
                  <i class="fas fa-user-plus"></i> Προσθήκη
                </button>
              </div>
              <div id="assignedWorkersContainer" class="worker-compact-list"></div>
            </section>
          </div>

          <!-- Tab: Έξοδα -->
          <div class="tab-content" id="tab-expenses">
            <section class="cost-panel cost-expenses-panel cost-step-panel">
              <div class="cost-panel-header compact">
                <h4><i class="fas fa-arrow-down"></i> Έξοδα</h4>
              </div>
              <div class="cost-input-grid">
                <div class="form-group">
                  <label title="Μπορείτε να το αυξήσετε χειροκίνητα για έξτρα έξοδα· δεν μπορεί να είναι μικρότερο από το άθροισμα των υλικών">
                    Συνολικό κόστος υλικών (€) <i class="fas fa-info-circle" style="font-size: 0.8em; color: var(--text-muted);"></i>
                  </label>
                  <input type="number" id="jobMaterialsCost" min="0" step="0.01" value="0"
                         title="Ελάχιστο: άθροισμα καταχωρημένων υλικών. Μπορείτε να το αυξήσετε χειροκίνητα.">
                  <small class="text-muted">Ελάχιστο: <span id="materialsLineTotalHint">0.00 €</span> (άθροισμα γραμμών υλικών)</small>
                </div>
                <div class="form-group">
                  <label title="Χιλιόμετρα μετακίνησης για την εργασία">
                    Χιλιόμετρα <i class="fas fa-info-circle" style="font-size: 0.8em; color: var(--text-muted);"></i>
                  </label>
                  <input type="number" id="jobKilometers" min="0" value="0"
                         title="Χιλιόμετρα μετακίνησης για την εργασία (έξοδα)">
                </div>
              </div>
              <div class="cost-metric-list">
                <div class="financial-row">
                  <span>Υπάλληλοι</span>
                  <strong id="laborCostDisplay">0.00 €</strong>
                </div>
                <div class="financial-row">
                  <span>Υλικά</span>
                  <strong id="materialsCostDisplay">0.00 €</strong>
                </div>
                <div class="financial-row">
                  <span>Μετακίνηση</span>
                  <strong id="travelCostDisplay">0.00 €</strong>
                </div>
                <div class="financial-row total">
                  <span>Σύνολο εξόδων</span>
                  <strong id="totalExpensesDisplay">0.00 €</strong>
                </div>
              </div>
            </section>
          </div>

          <!-- Tab: Χρέωση -->
          <div class="tab-content" id="tab-billing">
            <section class="cost-panel cost-step-panel">
              <div class="cost-panel-header compact">
                <h4><i class="fas fa-receipt"></i> Χρέωση</h4>
              </div>
              <div class="billing-option-list compact" role="radiogroup" aria-label="Τρόπος Χρέωσης">
                <label class="billing-option is-active">
                  <input type="radio" name="jobBillingType" value="hourly" checked>
                  <span class="billing-option-icon"><i class="fas fa-clock"></i></span>
                  <span class="billing-option-content">
                    <span class="billing-option-title">Με ώρες</span>
                    <span class="billing-option-meta">Ώρες × τιμή/ώρα</span>
                  </span>
                </label>
                <label class="billing-option">
                  <input type="radio" name="jobBillingType" value="fixed">
                  <span class="billing-option-icon"><i class="fas fa-handshake"></i></span>
                  <span class="billing-option-content">
                    <span class="billing-option-title">Συμφωνημένη</span>
                    <span class="billing-option-meta">Σταθερό ποσό</span>
                  </span>
                </label>
              </div>
              <div class="cost-input-grid">
                <div class="form-group" id="jobBillingHoursGroup">
                  <label title="Οι ώρες που θα χρεωθούν στον πελάτη. Μπορούν να είναι λιγότερες από τις δουλεμένες ώρες.">
                    Ώρες Χρέωσης <i class="fas fa-info-circle" style="font-size: 0.8em; color: var(--text-muted);"></i>
                  </label>
                  <input type="number" id="jobBillingHours" min="0" value="0"
                         title="Μπορείτε να χρεώσετε λιγότερες ή περισσότερες ώρες από τις δουλεμένες">
                </div>
                <div class="form-group" id="jobBillingRateGroup">
                  <label title="Η τιμή ανά ώρα που χρεώνεις τον πελάτη για αυτή την εργασία">
                    Τιμή/Ώρα (€) <i class="fas fa-info-circle" style="font-size: 0.8em; color: var(--text-muted);"></i>
                  </label>
                  <input type="number" id="jobBillingRate" min="0" value="50"
                         title="Προτείνεται από τις ρυθμίσεις, αλλά αλλάζει ανά εργασία">
                </div>
                <div class="form-group span-2" id="jobAgreedPriceGroup" style="display: none;">
                  <label title="Η τιμή που συμφωνήθηκε με τον πελάτη για όλο το έργο">
                    Συμφωνημένη Τιμή (€) <i class="fas fa-info-circle" style="font-size: 0.8em; color: var(--text-muted);"></i>
                  </label>
                  <input type="number" id="jobAgreedPrice" min="0" step="0.01" value="0"
                         title="Σταθερή τιμή για όλο το έργο">
                </div>
              </div>
            </section>
          </div>

          <!-- Tab: Πληρωμές -->
          <div class="tab-content" id="tab-payments">
            <section class="cost-panel cost-payments-panel cost-step-panel" id="jobPaymentsFormSection">
              ${this.renderPaymentsSection(null, 'edit')}
            </section>
          </div>

          <!-- Tab: Σύνοψη & Σημειώσεις -->
          <div class="tab-content" id="tab-notes">
            <section class="cost-panel result cost-step-panel">
              <div class="cost-panel-header compact">
                <h4><i class="fas fa-chart-line"></i> Τελικό αποτέλεσμα</h4>
              </div>
              <div class="cost-result-main">
                <span>Σύνολο χρέωσης</span>
                <strong id="billingAmountDisplay">0.00 €</strong>
              </div>
              <div class="cost-metric-list">
                <div class="financial-row total">
                  <span>Έσοδα</span>
                  <strong id="totalCostDisplay">0.00 €</strong>
                </div>
                <div class="financial-row">
                  <span>Κέρδος ανά ώρα</span>
                  <strong id="profitPerHourDisplay">-</strong>
                </div>
                <div class="financial-row">
                  <span>Αξία χρόνου ιδιοκτήτη</span>
                  <strong id="ownerOpportunityCostDisplay">0.00 €</strong>
                </div>
                <div class="financial-row total">
                  <span>Μετά την αξία χρόνου</span>
                  <strong id="economicProfitDisplay">0.00 €</strong>
                </div>
              </div>
            </section>

            <div class="form-grid">
              <div class="form-group span-2">
                <label>Σημειώσεις</label>
                <textarea id="jobNotes" rows="6"></textarea>
              </div>
            </div>

            <section class="job-form-review" id="jobFormReview" aria-label="Σύνοψη πριν την αποθήκευση">
              <h4><i class="fas fa-clipboard-check"></i> Έλεγχος πριν την αποθήκευση</h4>
              <div class="job-mobile-info-list" id="jobFormReviewContent"></div>
            </section>
          </div>

          <div class="job-form-footer" aria-label="Ενέργειες φόρμας">
            <div class="job-form-footer-summary">
              <div>
                <span>Χρέωση</span>
                <strong id="mobileEditBillingDisplay">0.00 €</strong>
              </div>
              <div>
                <span>Κέρδος</span>
                <strong id="mobileEditProfitDisplay">0.00 €</strong>
              </div>
              <div>
                <span>Χαμένο</span>
                <strong id="mobileEditLostDisplay">0.00 €</strong>
              </div>
            </div>
            <div class="job-form-footer-nav" id="jobFormStepNav">
              <button type="button" class="btn btn-ghost" id="jobFormPrevStepBtn" disabled>
                <i class="fas fa-arrow-left"></i> Πίσω
              </button>
              <button type="button" class="btn btn-primary" id="jobFormNextStepBtn">
                Επόμενο <i class="fas fa-arrow-right"></i>
              </button>
            </div>
            <div class="job-form-footer-actions">
              <button type="button" class="btn btn-ghost btn-compact-mobile" id="cancelJobFormBtn">
                <i class="fas fa-times"></i> <span class="btn-text">Ακύρωση</span>
              </button>
              <button type="submit" class="btn btn-primary btn-compact-mobile" id="saveJobFormBtn">
                <i class="fas fa-save"></i> <span class="btn-text">Αποθήκευση</span>
              </button>
            </div>
          </div>

        </form>
      </div>

      <!-- Filters & Search -->
      <div class="card filters-card">
        <div class="filters">
          <div class="search-box">
            <i class="fas fa-search"></i>
            <input type="text" id="jobSearch" placeholder="Αναζήτηση εργασιών...">
          </div>

          <select id="statusFilter">
            <option value="">Όλες οι καταστάσεις</option>
            ${CONFIG.STATUS_OPTIONS.map(status => `<option value="${status}">${status}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Jobs Table -->
      <div class="card">
        <div id="jobsTableContainer">
          ${this.renderTable(jobs)}
        </div>
      </div>
    `;
    
    // Setup event listeners after render
    this.setupEventListeners();
    this.setupLazyTable(jobs);

    if (params?.clientId) {
      setTimeout(() => {
        this.showAddForm();
        const clientSelect = document.getElementById('jobClient');
        if (clientSelect) clientSelect.value = String(params.clientId);
      }, 0);
    }
    if (params?.jobId) {
      setTimeout(() => this.editJob(params.jobId), 0);
    }
  },
  
  setupEventListeners() {
    // Tab/step navigation — delegate on #jobForm (stepper sits outside #jobFormElement)
    const jobFormShell = document.getElementById('jobForm');
    if (jobFormShell) {
      if (this.tabClickHandler) {
        jobFormShell.removeEventListener('click', this.tabClickHandler);
      }

      this.tabClickHandler = (e) => {
        const stepBtn = e.target.closest('.job-form-step');
        if (stepBtn) {
          e.preventDefault();
          this.goToJobStep(stepBtn.dataset.step);
          return;
        }

        const tabBtn = e.target.closest('.tab-btn');
        if (tabBtn) {
          e.preventDefault();
          this.goToJobStep(tabBtn.dataset.tab);
        }
      };

      jobFormShell.addEventListener('click', this.tabClickHandler);
    }

    document.getElementById('jobFormHeaderCloseBtn')?.addEventListener('click', () => {
      if (this.formDirty) {
        Modal.confirm({
          title: 'Κλείσιμο φόρμας',
          message: 'Υπάρχουν μη αποθηκευμένες αλλαγές. Θέλετε να κλείσετε τη φόρμα;',
          onConfirm: () => this.cancelForm()
        });
        return;
      }
      this.cancelForm();
    });

    // Add button - remove old listener first
    const addBtn = document.getElementById('addJobBtn');
    if (addBtn) {
      if (this.addBtnHandler) {
        addBtn.removeEventListener('click', this.addBtnHandler);
      }
      this.addBtnHandler = () => this.showAddForm();
      addBtn.addEventListener('click', this.addBtnHandler);
    }

    // Form submit - remove old listener first
    const form = document.getElementById('jobFormElement');
    if (form) {
      if (this.formSubmitHandler) {
        form.removeEventListener('submit', this.formSubmitHandler);
      }
      this.formSubmitHandler = (e) => this.saveJob(e);
      form.addEventListener('submit', this.formSubmitHandler);
    }
    
    // Initialize date pickers (#jobDate δεν υπάρχει πλέον στη φόρμα)
    Utils.initDatePicker('#jobNextVisit');
    Utils.initDatePicker('#jobVisitEndDate');
    this.setupVisitDateValidation();

    // Toggle ωραρίου επίσκεψης (ολοήμερη <-> με ώρα)
    const allDayToggle = document.getElementById('jobVisitAllDay');
    if (allDayToggle) {
      const applyVisitTimeVisibility = () => {
        const show = !allDayToggle.checked;
        const wrap = document.getElementById('jobVisitTimeWrap');
        const endWrap = document.getElementById('jobVisitEndTimeWrap');
        if (wrap) wrap.style.display = show ? '' : 'none';
        if (endWrap) endWrap.style.display = show ? '' : 'none';
      };
      allDayToggle.addEventListener('change', applyVisitTimeVisibility);
      applyVisitTimeVisibility();
    }
    
    // Cancel button - remove old listener first
    const cancelBtn = document.getElementById('cancelJobFormBtn');
    this.cancelBtnHandler = this.cancelBtnHandler || (() => this.cancelForm());
    if (cancelBtn) {
      cancelBtn.removeEventListener('click', this.cancelBtnHandler);
      cancelBtn.addEventListener('click', this.cancelBtnHandler);
    }
    
    // Search input - remove old listener first
    const searchInput = document.getElementById('jobSearch');
    if (searchInput) {
      if (this.searchInputHandler) {
        searchInput.removeEventListener('input', this.searchInputHandler);
      }
      this.searchInputHandler = () => this.filterJobs();
      searchInput.addEventListener('input', this.searchInputHandler);
    }
    
    // Status filter - remove old listener first
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
      if (this.statusFilterHandler) {
        statusFilter.removeEventListener('change', this.statusFilterHandler);
      }
      this.statusFilterHandler = () => this.filterJobs();
      statusFilter.addEventListener('change', this.statusFilterHandler);
    }
    
    // Client select auto-fill - remove old listener first
    const clientSelect = document.getElementById('jobClient');
    if (clientSelect) {
      if (this.clientSelectHandler) {
        clientSelect.removeEventListener('change', this.clientSelectHandler);
      }
      this.clientSelectHandler = () => {
        this.autoFillClientData();
        this.updateProgressBar();
        this.markJobFormDirty();
      };
      clientSelect.addEventListener('change', this.clientSelectHandler);
    }

    // Add event listeners for progress bar updates on required fields
    const jobStatus = document.getElementById('jobStatus');
    
    if (jobStatus) {
      jobStatus.addEventListener('change', () => this.updateProgressBar());
    }

    // Step navigation (footer prev/next)
    this.setupNavigationButtons();

    // Add Worker button
    const addWorkerBtn = document.getElementById('addWorkerToJobBtn');
    if (addWorkerBtn) {
      if (this.addWorkerBtnHandler) {
        addWorkerBtn.removeEventListener('click', this.addWorkerBtnHandler);
      }
      this.addWorkerBtnHandler = () => this.openWorkerAssignmentModal();
      addWorkerBtn.addEventListener('click', this.addWorkerBtnHandler);
    }

    // Add Paint button
    const addPaintBtn = document.getElementById('addPaintBtn');
    if (addPaintBtn) {
      if (this.addPaintBtnHandler) {
        addPaintBtn.removeEventListener('click', this.addPaintBtnHandler);
      }
      this.addPaintBtnHandler = () => this.addPaint();
      addPaintBtn.addEventListener('click', this.addPaintBtnHandler);
    }

    // Τρόπος χρέωσης - toggle πεδίων + επανυπολογισμός
    document.querySelectorAll('input[name="jobBillingType"]').forEach(radio => {
      radio.addEventListener('change', () => {
        this.applyBillingTypeVisibility();
        this.calculateCost();
      });
    });

    // Cost calculation fields - real-time updates
    const costFields = ['jobMaterialsCost', 'jobKilometers', 'jobBillingHours', 'jobBillingRate', 'jobAgreedPrice'];
    costFields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        // Remove old handler if exists
        if (this.costFieldHandlers[fieldId]) {
          field.removeEventListener('input', this.costFieldHandlers[fieldId]);
        }
        // Create and store new handler
        this.costFieldHandlers[fieldId] = () => {
          this.calculateCost();
          this.markJobFormDirty();
        };
        field.addEventListener('input', this.costFieldHandlers[fieldId]);

        if (fieldId === 'jobMaterialsCost') {
          if (this.costBlurHandlers[fieldId]) {
            field.removeEventListener('blur', this.costBlurHandlers[fieldId]);
          }
          this.costBlurHandlers[fieldId] = () => {
            this.applyMinimumCostFields(true);
            this.calculateCost();
          };
          field.addEventListener('blur', this.costBlurHandlers[fieldId]);
        }
      }
    });
    
    // Event delegation for table buttons
    const container = document.getElementById('contentArea');
    if (container) {
      // Remove old listener if exists
      if (this.tableClickHandler) {
        container.removeEventListener('click', this.tableClickHandler);
      }
      
      // Create new handler
      this.tableClickHandler = (e) => {
        const viewBtn = e.target.closest('.view-job-btn');
        const editBtn = e.target.closest('.edit-job-btn');
        const deleteBtn = e.target.closest('.delete-job-btn');
        
        if (viewBtn) {
          e.preventDefault();
          e.stopPropagation();
          const jobId = viewBtn.dataset.jobId;
          this.viewJob(jobId);
        } else if (editBtn) {
          e.preventDefault();
          e.stopPropagation();
          const jobId = editBtn.dataset.jobId;
          this.editJob(jobId);
        } else if (deleteBtn) {
          e.preventDefault();
          e.stopPropagation();
          const jobId = deleteBtn.dataset.jobId;
          this.deleteJob(jobId);
        }
      };
      
      // Add new listener
      container.addEventListener('click', this.tableClickHandler);
    }

    this.setupJobFormActionListeners();
  },

  renderTable(jobs) {
    if (jobs.length === 0) {
      return UIPrimitives.emptyState({
        icon: 'fas fa-briefcase',
        title: 'Δεν υπάρχουν εργασίες',
        description: 'Δημιουργήστε την πρώτη σας εργασία!'
      });
    }

    // Sort by job date - latest first
    const sortedJobs = Utils.sortBy(jobs, 'date', 'desc');
    const lazy = Utils.getInfiniteSlice(this.lazyTableKey, sortedJobs, this.lazyBatchSize);
    const visibleJobs = lazy.items;

    return `
      <div class="table-wrapper has-mobile-cards">
        <table class="data-table">
          <thead>
            <tr>
              <th style="text-align: left;">Ενέργειες</th>
              <th>Πελάτης</th>
              <th>Κατάσταση</th>
              <th>Επόμ. Επίσκ.</th>
              <th>Σύνολο</th>
              <th>Καθαρό Κέρδος</th>
            </tr>
          </thead>
          <tbody>
          ${visibleJobs.map(job => {
            const clientName = this.getClientName(job.clientId);

            // Ενιαίος υπολογισμός οικονομικών (λαμβάνει υπόψη επισκέψεις + τρόπο χρέωσης)
            const fin = this.computeJobFinancials(job);
            const profit = fin.profit;
            const billingAmount = fin.billingAmount;

            const profitColor = profit >= 0 ? 'var(--success)' : 'var(--error)';
            const profitSign = profit >= 0 ? '+' : '';
            
            return `
            <tr>
              <td class="actions">
                ${UIPrimitives.actionButton({ className: 'view-job-btn', icon: 'fas fa-eye', title: 'Προβολή', data: { 'job-id': job.id } })}
                ${UIPrimitives.actionButton({ className: 'edit-job-btn', icon: 'fas fa-edit', title: 'Επεξεργασία', data: { 'job-id': job.id } })}
                ${UIPrimitives.actionButton({ className: 'btn-danger delete-job-btn', icon: 'fas fa-trash', title: 'Διαγραφή', data: { 'job-id': job.id } })}
              </td>
              <td title="${clientName}">${clientName}</td>
              <td>${UIPrimitives.statusBadge(Utils.translateStatus(job.status), job.status || 'unknown')}</td>
              <td>${this.formatVisitSchedule(job) !== '-' ? `<strong style="color: var(--accent-primary);">${this.formatVisitSchedule(job)}</strong>` : '-'}</td>
              <td title="${fin.billingType === 'fixed' ? 'Συμφωνημένη τιμή' : 'Χρέωση με ώρες'}"><strong>${Utils.formatCurrency(billingAmount)}</strong>${fin.balance > 0.005 && fin.paidAmount > 0 ? `<br><small style="color: var(--warning, #f59e0b);">Υπόλοιπο: ${Utils.formatCurrency(fin.balance)}</small>` : ''}</td>
              <td title="Κέρδος: ${Utils.formatCurrency(profit)}"><strong style="color: ${profitColor};">${profitSign}${Utils.formatCurrency(profit)}</strong></td>
            </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      </div>
      <div class="mobile-card-list" aria-label="Λίστα εργασιών για κινητό">
        ${visibleJobs.map(job => {
          const clientName = this.getClientName(job.clientId);
          const fin = this.computeJobFinancials(job);
          const schedule = this.formatVisitSchedule(job);
          const profitColor = fin.profit >= 0 ? 'var(--success)' : 'var(--error)';
          const profitSign = fin.profit >= 0 ? '+' : '';
          return `
            <article class="entity-mobile-card">
              <div class="entity-mobile-card-header">
                <div class="entity-mobile-card-title">
                  <strong>${Utils.escapeHtml(clientName)}</strong>
                  <span>${UIPrimitives.statusBadge(Utils.translateStatus(job.status), job.status || 'unknown')}</span>
                </div>
                <div class="entity-mobile-card-actions">
                  ${UIPrimitives.actionButton({ className: 'view-job-btn', icon: 'fas fa-eye', title: 'Προβολή', data: { 'job-id': job.id } })}
                  ${UIPrimitives.actionButton({ className: 'edit-job-btn', icon: 'fas fa-edit', title: 'Επεξεργασία', data: { 'job-id': job.id } })}
                  ${UIPrimitives.actionButton({ className: 'btn-danger delete-job-btn', icon: 'fas fa-trash', title: 'Διαγραφή', data: { 'job-id': job.id } })}
                </div>
              </div>
              <div class="entity-mobile-card-meta">
                <span><i class="fas fa-calendar-check"></i>${Utils.escapeHtml(schedule !== '-' ? schedule : 'Χωρίς επόμενη επίσκεψη')}</span>
                <span><i class="fas fa-file-invoice-dollar"></i>Χρέωση: ${Utils.formatCurrency(fin.billingAmount)}</span>
                ${fin.balance > 0.005 && fin.paidAmount > 0 ? `<span style="color: var(--warning, #f59e0b);"><i class="fas fa-scale-balanced"></i>Υπόλοιπο: ${Utils.formatCurrency(fin.balance)}</span>` : ''}
                <span style="color: ${profitColor};"><i class="fas fa-chart-line"></i>Κέρδος: ${profitSign}${Utils.formatCurrency(fin.profit)}</span>
              </div>
            </article>
          `;
        }).join('')}
      </div>
      ${Utils.renderInfiniteFooter(this.lazyTableKey, lazy.visible, lazy.total, this.lazyBatchSize)}
    `;
  },

  getClientName(clientId) {
    const client = State.data.clients.find(c => Number(c.id) === Number(clientId));
    return client ? client.name : 'Άγνωστος';
  },

  showAddForm() {
    this.resetJobFormSession();
    this.currentEdit = null;
    const formTitle = document.getElementById('formTitle');
    const jobForm = document.getElementById('jobForm');
    const jobStatus = document.getElementById('jobStatus');
    
    if (!jobForm) {
      console.error('❌ Form elements not found!');
      return;
    }
    
    formTitle.textContent = 'Νέα Εργασία';
    jobForm.style.display = 'block';
    window.AppShell?.refreshFab();
    
    // Reset form and set defaults
    document.getElementById('jobFormElement').reset();
    jobStatus.value = 'Υποψήφιος';
    
    // Initialize date picker for next visit
    Utils.initDatePicker('#jobNextVisit');
    Utils.initDatePicker('#jobVisitEndDate');
    this.setupVisitDateValidation();
    
    // Load default billing rate from settings (use cached value)
    const pricingSettings = SettingsService.cache.pricing_settings || { hourlyRate: 50, travelCost: 0.5 };
    const defaultBillingRate = pricingSettings.hourlyRate || 50;
    console.log('[Jobs] Using pricing settings:', pricingSettings);
    document.getElementById('jobBillingRate').value = defaultBillingRate;

    // Επαναφορά τρόπου χρέωσης σε "Χρέωση με ώρες"
    const hourlyRadio = document.querySelector('input[name="jobBillingType"][value="hourly"]');
    if (hourlyRadio) hourlyRadio.checked = true;
    const agreedInput = document.getElementById('jobAgreedPrice');
    if (agreedInput) agreedInput.value = 0;
    this.applyBillingTypeVisibility();
    
    // Clear assigned workers and job materials
    this.assignedWorkers = [];
    this.assignedPaints = [];
    this.renderAssignedWorkers();
    this.renderAssignedPaints();
    this.refreshJobFormLinkedSections(null);
    
    this.calculateCost();
    this.updateProgressBar();
    this.updateJobFormStepper();
    this.updateJobFormBanner();
    jobForm.scrollIntoView({ behavior: 'smooth' });
  },

  autoFillClientData() {
    const clientId = document.getElementById('jobClient').value;
    const client = State.data.clients.find(c => Number(c.id) === Number(clientId));

    if (client) {
      // Only auto-fill address (full address with city and postal)
      const fullAddress = `${client.address || ''}, ${client.city || ''} ${client.postalCode || client.postal || ''}`.trim();
      document.getElementById('jobAddress').value = fullAddress;
    } else {
      document.getElementById('jobAddress').value = '';
    }
    
    // Update progress bar
    this.updateProgressBar();
  },

  parseCurrencyInput(value) {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    let normalized = String(value || '').trim().replace(/[^\d,.-]/g, '');
    if (!normalized) return 0;

    const hasComma = normalized.includes(',');
    const hasDot = normalized.includes('.');

    if (hasComma) {
      // Greek format: 1.234,56
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else if (hasDot) {
      const dotParts = normalized.split('.');
      const lastPart = dotParts[dotParts.length - 1];
      if (dotParts.length > 2 || lastPart.length === 3) {
        // Thousands format: 1.234 or 40.000
        normalized = normalized.replace(/\./g, '');
      }
      // Otherwise keep decimal dot: 20.00
    }

    const parsed = parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  },

  formatMaterialCurrency(amount) {
    const value = this.parseCurrencyInput(amount);
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  },

  getMaterialCostTotal() {
    return this.assignedPaints.reduce((sum, material) => {
      return sum + this.getAssignedMaterialLineCost(material);
    }, 0);
  },

  getAssignedMaterialLineCost(material = {}) {
    const stockMaterial = this.getInventoryMaterialForAssignedMaterial(material);
    if (stockMaterial) {
      const unitPrice = this.parseCurrencyInput(stockMaterial.unitPrice || stockMaterial.unit_price || 0);
      const quantity = this.parseMaterialQuantity(material.quantity);
      return unitPrice * quantity;
    }

    return this.parseCurrencyInput(material.cost ?? material.totalCost ?? 0);
  },

  recalculateAssignedMaterialCosts() {
    if (!Array.isArray(this.assignedPaints)) return;

    this.assignedPaints = this.assignedPaints.map(material => ({
      ...material,
      cost: this.getAssignedMaterialLineCost(material)
    }));
  },

  getInventoryMaterialForAssignedMaterial(material = {}) {
    const inventory = State.read('inventory') || [];
    const materialId = material.materialId || material.material_id;
    if (materialId) {
      const byId = State.read('inventory', materialId);
      if (byId) return byId;
    }

    if (!material.name || typeof MaterialIdentity === 'undefined') return null;
    return inventory.find(item => {
      return MaterialIdentity.normalizeSearchText(item.name) === MaterialIdentity.normalizeSearchText(material.name);
    }) || null;
  },

  getWorkerType(worker) {
    return worker.workerType || worker.worker_type || 'employee';
  },

  parseJsonArray(value) {
    let parsed = value;
    for (let i = 0; i < 2 && typeof parsed === 'string'; i++) {
      try {
        parsed = JSON.parse(parsed);
      } catch (error) {
        return [];
      }
    }
    return Array.isArray(parsed) ? parsed : [];
  },

  /** Τρόπος χρέωσης από τη φόρμα */
  getFormBillingType() {
    const checked = document.querySelector('input[name="jobBillingType"]:checked');
    return checked && checked.value === 'fixed' ? 'fixed' : 'hourly';
  },

  /** Εμφάνιση/απόκρυψη πεδίων ανά τρόπο χρέωσης */
  applyBillingTypeVisibility() {
    const isFixed = this.getFormBillingType() === 'fixed';
    const hoursGroup = document.getElementById('jobBillingHoursGroup');
    const rateGroup = document.getElementById('jobBillingRateGroup');
    const agreedGroup = document.getElementById('jobAgreedPriceGroup');
    document.querySelectorAll('.billing-option').forEach(option => {
      const input = option.querySelector('input[name="jobBillingType"]');
      option.classList.toggle('is-active', !!input?.checked);
    });
    if (hoursGroup) hoursGroup.style.display = isFixed ? 'none' : '';
    if (rateGroup) rateGroup.style.display = isFixed ? 'none' : '';
    if (agreedGroup) agreedGroup.style.display = isFixed ? '' : 'none';
  },

  setupVisitDateValidation() {
    const startInput = document.getElementById('jobNextVisit');
    const endInput = document.getElementById('jobVisitEndDate');
    if (!startInput || !endInput) return;

    Object.entries(this.visitDateHandlers).forEach(([key, stored]) => {
      if (typeof stored === 'function') {
        const target = key.startsWith('start') ? startInput : endInput;
        const eventName = key.includes('Blur') ? 'blur' : 'change';
        target.removeEventListener(eventName, stored);
        return;
      }
      stored.target?.removeEventListener(stored.event, stored.handler);
    });

    const removePickerHook = (picker, handler) => {
      if (!picker || !handler) return;
      picker.config.onChange = picker.config.onChange.filter(fn => fn !== handler);
      picker.config.onValueUpdate = picker.config.onValueUpdate.filter(fn => fn !== handler);
      picker.config.onClose = picker.config.onClose.filter(fn => fn !== handler);
    };

    removePickerHook(startInput._flatpickr, this.visitDatePickerHandlers.start);
    removePickerHook(endInput._flatpickr, this.visitDatePickerHandlers.end);

    const syncEndDate = (showWarning = false) => {
      const readDate = (input) => {
        if (!input.value.trim()) return null;
        const typedDate = Utils.greekToDate(input.value);
        if (typedDate) return typedDate;
        if (input._flatpickr?.selectedDates?.[0]) {
          const date = input._flatpickr.selectedDates[0];
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
        return null;
      };
      const startDate = readDate(startInput);
      const endDate = readDate(endInput);
      const toLocalDate = (isoDate) => {
        if (!isoDate) return null;
        const [year, month, day] = isoDate.split('-').map(Number);
        return new Date(year, month - 1, day);
      };

      if (endInput._flatpickr) {
        const nextMinDate = startDate || '';
        if (endInput.dataset.minVisitDate !== nextMinDate) {
          // flatpickr.set() fires hooks; only call it when the min date actually changes.
          endInput.dataset.minVisitDate = nextMinDate;
          endInput._flatpickr.set('minDate', toLocalDate(startDate));
        }
      }

      if (startDate && endDate && endDate < startDate) {
        if (endInput._flatpickr) {
          endInput._flatpickr.clear();
        } else {
          endInput.value = '';
        }
        if (showWarning) {
          Toast.warning('Η λήξη επίσκεψης δεν μπορεί να είναι πριν από την επόμενη επίσκεψη.');
        }
      }
    };

    const addDomHandler = (key, target, event, handler) => {
      this.visitDateHandlers[key] = { target, event, handler };
      target.addEventListener(event, handler);
    };

    this.visitDateHandlers = {};
    addDomHandler('startInput', startInput, 'input', () => syncEndDate(false));
    addDomHandler('startChange', startInput, 'change', () => syncEndDate(true));
    addDomHandler('startBlur', startInput, 'blur', () => syncEndDate(true));
    addDomHandler('endInput', endInput, 'input', () => syncEndDate(false));
    addDomHandler('endChange', endInput, 'change', () => syncEndDate(true));
    addDomHandler('endBlur', endInput, 'blur', () => syncEndDate(true));

    this.visitDatePickerHandlers = {
      start: () => syncEndDate(true),
      end: () => syncEndDate(true)
    };

    if (startInput._flatpickr) {
      startInput._flatpickr.config.onChange.push(this.visitDatePickerHandlers.start);
      startInput._flatpickr.config.onValueUpdate.push(this.visitDatePickerHandlers.start);
      startInput._flatpickr.config.onClose.push(this.visitDatePickerHandlers.start);
    }
    if (endInput._flatpickr) {
      endInput._flatpickr.config.onChange.push(this.visitDatePickerHandlers.end);
      endInput._flatpickr.config.onValueUpdate.push(this.visitDatePickerHandlers.end);
      endInput._flatpickr.config.onClose.push(this.visitDatePickerHandlers.end);
    }

    syncEndDate(false);
  },

  /** Πληρωμές πελάτη της εργασίας από το state */
  getPaymentsForJob(jobId) {
    const payments = State.read('jobPayments') || [];
    return payments.filter(p => Number(p.jobId || p.job_id) === Number(jobId));
  },

  async setJobPaymentState(jobId, status, isPaid) {
    const job = State.read('jobs', jobId);
    if (!job) return null;

    const currentIsPaid = Number(job.isPaid ?? job.is_paid ?? 0);
    if (job.status === status && currentIsPaid === Number(isPaid)) {
      return job;
    }

    const updatedJob = await State.update('jobs', jobId, {
      ...job,
      status,
      isPaid: Number(isPaid)
    });

    if (Number(this.currentEdit) === Number(jobId)) {
      const statusEl = document.getElementById('jobStatus');
      if (statusEl) statusEl.value = status;
    }

    return updatedJob;
  },

  async syncJobStatusFromPayments(jobId) {
    const job = State.read('jobs', jobId);
    if (!job) return null;

    const fin = this.computeJobFinancials(job);
    const isFullyPaid = fin.billingAmount > 0 && fin.balance <= 0.005;

    if (isFullyPaid) {
      return this.setJobPaymentState(jobId, 'Εξοφλήθηκε', 1);
    }

    if (job.status === 'Εξοφλήθηκε' || Number(job.isPaid ?? job.is_paid ?? 0) === 1) {
      return this.setJobPaymentState(jobId, 'Ολοκληρώθηκε', 0);
    }

    return job;
  },

  async ensurePaymentForPaidStatus(jobId) {
    const job = State.read('jobs', jobId);
    if (!job || job.status !== 'Εξοφλήθηκε') return null;

    const fin = this.computeJobFinancials(job);
    if (fin.billingAmount <= 0 || fin.balance <= 0.005) return null;

    const payment = await State.create('jobPayments', {
      jobId: Number(jobId),
      paymentDate: new Date().toISOString().split('T')[0],
      amount: Number(fin.balance.toFixed(2)),
      notes: 'Αυτόματη εξόφληση από την κατάσταση εργασίας'
    });

    Toast.info(`Προστέθηκε αυτόματη πληρωμή ${Utils.formatCurrency(fin.balance)} για εξόφληση.`);
    return payment;
  },

  getWorkedTimeTotals(assignedWorkers = []) {
    return window.JobFinancials.getWorkedTimeTotals(assignedWorkers);
  },

  renderPaymentsSection(jobId, mode = 'edit', financials = null) {
    const isEdit = mode === 'edit';
    const draftPayments = this.draftPayments || [];

    if (!jobId) {
      const billingType = this.getFormBillingType();
      const billingHours = parseFloat(document.getElementById('jobBillingHours')?.value || 0) || 0;
      const billingRate = parseFloat(document.getElementById('jobBillingRate')?.value || 0) || 0;
      const agreedPrice = parseFloat(document.getElementById('jobAgreedPrice')?.value || 0) || 0;
      const billingAmount = billingType === 'fixed' ? agreedPrice : billingHours * billingRate;
      const paidAmount = this.getDraftPaymentsTotal();
      const balance = billingAmount - paidAmount;

      return `
        <div class="job-subsection">
          <div class="job-payments-header">
            <h4><i class="fas fa-hand-holding-usd"></i> Πληρωμές Πελάτη</h4>
            <button type="button" class="btn btn-secondary job-form-add-payment-btn" data-job-id="">
              <i class="fas fa-plus"></i> Προσχέδιο πληρωμής
            </button>
          </div>
          <p class="job-payments-hint">
            <i class="fas fa-lightbulb"></i>
            Μπορείτε να προσθέσετε πληρωμές πριν την αποθήκευση. Θα καταχωρηθούν αυτόματα με το «Αποθήκευση».
          </p>
          <div class="detail-grid job-payments-summary">
            <div class="detail-item">
              <label>Σύνολο Χρέωσης:</label>
              <span><strong id="paymentsBillingAmountDisplay">${Utils.formatCurrency(billingAmount || 0)}</strong></span>
            </div>
            <div class="detail-item">
              <label>Προσχέδιο:</label>
              <span style="color: var(--success);"><strong id="paymentsPaidAmountDisplay">${Utils.formatCurrency(paidAmount || 0)}</strong></span>
            </div>
            <div class="detail-item">
              <label>Υπόλοιπο:</label>
              <span id="paymentsBalanceWrap" style="color: ${balance > 0.005 ? 'var(--error)' : 'var(--success)'};"><strong id="paymentsBalanceDisplay">${Utils.formatCurrency(balance || 0)}</strong></span>
            </div>
          </div>
          ${draftPayments.length > 0 ? `
            <div class="job-draft-payments">
              ${draftPayments.map(payment => `
                <article class="job-draft-payment-card">
                  <div>
                    <strong>${Utils.formatCurrency(payment.amount)}</strong>
                    <span>${Utils.formatDate(payment.paymentDate)}</span>
                    ${payment.notes ? `<small>${Utils.escapeHtml(payment.notes)}</small>` : ''}
                  </div>
                  <div class="job-draft-payment-actions">
                    <button type="button" class="btn-icon job-form-edit-payment-btn" data-job-id="" data-draft-id="${payment._draftId}" title="Επεξεργασία">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn-icon btn-danger job-form-delete-payment-btn" data-job-id="" data-draft-id="${payment._draftId}" title="Διαγραφή">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </article>
              `).join('')}
            </div>
          ` : '<p class="text-muted job-payments-empty">Δεν έχουν προστεθεί προσχέδια πληρωμών.</p>'}
        </div>
      `;
    }

    const job = State.read('jobs', jobId);
    const baseFinancials = financials || (job ? this.computeJobFinancials(job) : { billingAmount: 0, paidAmount: 0, balance: 0 });
    const fin = isEdit ? this.getCurrentFormPaymentFinancials(jobId, baseFinancials) : baseFinancials;
    const payments = this.getPaymentsForJob(jobId)
      .slice()
      .sort((a, b) => String(b.paymentDate || b.payment_date || '').localeCompare(String(a.paymentDate || a.payment_date || '')));

    return `
      <div class="job-subsection">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 10px;">
          <h4 style="margin: 0;"><i class="fas fa-hand-holding-usd"></i> Πληρωμές Πελάτη</h4>
          ${isEdit ? `
            <button type="button" class="btn btn-secondary job-form-add-payment-btn" data-job-id="${jobId}">
              <i class="fas fa-plus"></i> Καταχώρηση Πληρωμής
            </button>
          ` : ''}
        </div>
        <div class="detail-grid" style="margin-bottom: 10px;">
          <div class="detail-item">
            <label>Σύνολο Χρέωσης:</label>
            <span><strong id="paymentsBillingAmountDisplay">${Utils.formatCurrency(fin.billingAmount || 0)}</strong></span>
          </div>
          <div class="detail-item">
            <label>Πληρωμένο:</label>
            <span style="color: var(--success);"><strong id="paymentsPaidAmountDisplay">${Utils.formatCurrency(fin.paidAmount || 0)}</strong></span>
          </div>
          <div class="detail-item">
            <label>Υπόλοιπο:</label>
            <span id="paymentsBalanceWrap" style="color: ${(fin.balance || 0) > 0.005 ? 'var(--error)' : 'var(--success)'};"><strong id="paymentsBalanceDisplay">${Utils.formatCurrency(fin.balance || 0)}</strong></span>
          </div>
        </div>
        ${payments.length > 0 ? `
          <div class="table-wrapper">
            <table class="data-table" style="margin-top: 10px;">
              <thead>
                <tr>
                  ${isEdit ? '<th style="width: 80px;">Ενέργειες</th>' : ''}
                  <th>Ημερομηνία</th>
                  <th>Ποσό</th>
                  <th>Σημειώσεις</th>
                </tr>
              </thead>
              <tbody>
                ${payments.map(payment => `
                  <tr>
                    ${isEdit ? `
                      <td>
                        <button type="button" class="btn-icon job-form-edit-payment-btn" data-job-id="${jobId}" data-payment-id="${payment.id}" title="Επεξεργασία">
                          <i class="fas fa-edit"></i>
                        </button>
                        <button type="button" class="btn-icon btn-danger job-form-delete-payment-btn" data-job-id="${jobId}" data-payment-id="${payment.id}" title="Διαγραφή">
                          <i class="fas fa-trash"></i>
                        </button>
                      </td>
                    ` : ''}
                    <td>${Utils.formatDate(payment.paymentDate || payment.payment_date)}</td>
                    <td><strong style="color: var(--success);">${Utils.formatCurrency(payment.amount)}</strong></td>
                    <td>${payment.notes || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p class="text-muted" style="font-style: italic;">Δεν έχουν καταχωρηθεί πληρωμές ακόμα.</p>'}
      </div>
    `;
  },

  getCurrentFormPaymentFinancials(jobId, fallbackFinancials = {}) {
    if (!jobId) {
      const billingType = this.getFormBillingType();
      const billingHours = parseFloat(document.getElementById('jobBillingHours')?.value || 0) || 0;
      const billingRate = parseFloat(document.getElementById('jobBillingRate')?.value || 0) || 0;
      const agreedPrice = parseFloat(document.getElementById('jobAgreedPrice')?.value || 0) || 0;
      const billingAmount = billingType === 'fixed' ? agreedPrice : billingHours * billingRate;
      const paidAmount = this.getDraftPaymentsTotal();
      return {
        billingAmount,
        paidAmount,
        balance: billingAmount - paidAmount
      };
    }

    const payments = this.getPaymentsForJob(jobId);
    const paidAmount = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    let billingAmount = parseFloat(fallbackFinancials.billingAmount || 0) || 0;
    if (Number(this.currentEdit) === Number(jobId) && document.getElementById('jobForm')?.style.display !== 'none') {
      const billingType = this.getFormBillingType();
      const billingHours = parseFloat(document.getElementById('jobBillingHours')?.value || 0) || 0;
      const billingRate = parseFloat(document.getElementById('jobBillingRate')?.value || 0) || 0;
      const agreedPrice = parseFloat(document.getElementById('jobAgreedPrice')?.value || 0) || 0;
      billingAmount = billingType === 'fixed' ? agreedPrice : billingHours * billingRate;
    }

    return {
      ...fallbackFinancials,
      billingAmount,
      paidAmount,
      balance: billingAmount - paidAmount
    };
  },

  updatePaymentsSummaryFromForm() {
    if (!this.currentEdit) return;

    const fin = this.getCurrentFormPaymentFinancials(this.currentEdit);
    const billingEl = document.getElementById('paymentsBillingAmountDisplay');
    const paidEl = document.getElementById('paymentsPaidAmountDisplay');
    const balanceEl = document.getElementById('paymentsBalanceDisplay');
    const balanceWrap = document.getElementById('paymentsBalanceWrap');

    if (billingEl) billingEl.textContent = Utils.formatCurrency(fin.billingAmount || 0);
    if (paidEl) paidEl.textContent = Utils.formatCurrency(fin.paidAmount || 0);
    if (balanceEl) balanceEl.textContent = Utils.formatCurrency(fin.balance || 0);
    if (balanceWrap) balanceWrap.style.color = (fin.balance || 0) > 0.005 ? 'var(--error)' : 'var(--success)';
  },

  renderFinancialSummary(job, options = {}) {
    const fin = this.computeJobFinancials(job);
    const includePayments = options.includePayments !== false;
    return `
      <div class="detail-grid">
        <div class="detail-item">
          <label>Τρόπος Χρέωσης:</label>
          <span>${fin.billingType === 'fixed' ? "Συμφωνημένη τιμή (κατ' αποκοπή)" : 'Χρέωση με ώρες'}</span>
        </div>
        <div class="detail-item">
          <label>Σύνολο Χρέωσης:</label>
          <span><strong style="color: var(--success);">${Utils.formatCurrency(fin.billingAmount)}</strong></span>
        </div>
        ${includePayments ? `
          <div class="detail-item">
            <label>Πληρωμένο:</label>
            <span style="color: var(--success);">${Utils.formatCurrency(fin.paidAmount)}</span>
          </div>
          <div class="detail-item">
            <label>Υπόλοιπο:</label>
            <span style="color: ${fin.balance > 0.005 ? 'var(--error)' : 'var(--success)'};">${Utils.formatCurrency(fin.balance)}</span>
          </div>
        ` : ''}
        <div class="detail-item">
          <label>Σύνολο Εξόδων:</label>
          <span><strong style="color: var(--error);">${Utils.formatCurrency(fin.totalExpenses)}</strong></span>
        </div>
        <div class="detail-item">
          <label>Πραγματικές Ώρες:</label>
          <span>${fin.actualHours.toFixed(1)} ώρες</span>
        </div>
        <div class="detail-item">
          <label>Χρεωμένες Ώρες:</label>
          <span>${fin.billingType === 'fixed' ? '-' : fin.billingHours.toFixed(1) + ' ώρες'}</span>
        </div>
        <div class="detail-item">
          <label>Μη Χρεωμένες Ώρες:</label>
          <span style="color: ${fin.unbilledHours > 0 ? 'var(--warning, #f59e0b)' : 'var(--success)'};">${fin.billingType === 'fixed' ? '-' : fin.unbilledHours.toFixed(1) + ' ώρες'}</span>
        </div>
        <div class="detail-item">
          <label>Χαμένη Αξία:</label>
          <span style="color: ${fin.lostBillingValue > 0 ? 'var(--error)' : 'var(--success)'};">${fin.billingType === 'fixed' ? '-' : Utils.formatCurrency(fin.lostBillingValue)}</span>
        </div>
        <div class="detail-item">
          <label>Κέρδος ανά Ώρα:</label>
          <span style="color: ${(fin.profitPerHour || 0) >= 0 ? 'var(--success)' : 'var(--error)'};">${fin.profitPerHour === null ? '-' : Utils.formatCurrency(fin.profitPerHour) + '/ώρα'}</span>
        </div>
        <div class="detail-item">
          <label>Ώρες Ιδιοκτήτη:</label>
          <span>${fin.ownerHours.toFixed(1)} ώρες</span>
        </div>
        <div class="detail-item">
          <label>Αξία Χρόνου Ιδιοκτήτη:</label>
          <span style="color: ${fin.ownerOpportunityCost > 0 ? 'var(--warning, #f59e0b)' : 'var(--success)'};">${Utils.formatCurrency(fin.ownerOpportunityCost)}</span>
        </div>
        <div class="detail-item span-2">
          <label>Κέρδος μετά την αξία χρόνου:</label>
          <span><strong style="color: ${fin.economicProfit >= 0 ? 'var(--success)' : 'var(--error)'};">${fin.economicProfit >= 0 ? '+' : ''}${Utils.formatCurrency(fin.economicProfit)}</strong></span>
        </div>
        <div class="detail-item span-2" style="border-top: 2px solid var(--border-color); padding-top: 1rem; margin-top: 0.5rem;">
          <label style="font-size: 1.1em;">Καθαρό Κέρδος:</label>
          <span><strong style="color: ${fin.profit >= 0 ? 'var(--success)' : 'var(--error)'}; font-size: 1.3em;">${fin.profit >= 0 ? '+' : ''}${Utils.formatCurrency(fin.profit)}</strong></span>
        </div>
      </div>
    `;
  },

  /**
   * Ενιαίος υπολογισμός οικονομικών εργασίας (web + Electron).
   */
  computeJobFinancials(job) {
    return window.JobFinancials.compute(job, {
      payments: this.getPaymentsForJob(job.id)
    });
  },

  getAssignedWorkerHoursTotal() {
    return this.assignedWorkers.reduce((sum, worker) => {
      return sum + (parseFloat(worker.hoursAllocated || worker.hours_allocated || 0) || 0);
    }, 0);
  },

  getEmployeeLaborCost() {
    return this.assignedWorkers.reduce((sum, worker) => {
      if (this.getWorkerType(worker) === 'owner') return sum;
      return sum + (parseFloat(worker.laborCost || worker.labor_cost || 0) || 0);
    }, 0);
  },

  applyMinimumCostFields(enforce = false) {
    const materialTotal = this.getMaterialCostTotal();
    const materialsInput = document.getElementById('jobMaterialsCost');
    const lineTotalHint = document.getElementById('materialsLineTotalHint');

    if (lineTotalHint) {
      lineTotalHint.textContent = this.formatMaterialCurrency(materialTotal);
    }

    if (materialsInput) {
      materialsInput.min = String(materialTotal);
      const isEditingField = document.activeElement === materialsInput;
      if (enforce || !isEditingField) {
        const currentMaterials = parseFloat(materialsInput.value || 0) || 0;
        // Μόνο ελάχιστο — επιτρέπεται χειροκίνητη αύξηση πάνω από το άθροισμα γραμμών
        if (currentMaterials + 0.005 < materialTotal) {
          materialsInput.value = materialTotal ? materialTotal.toFixed(2) : '0';
        }
      }
    }
  },

  calculateCost() {
    this.applyMinimumCostFields();

    // Get travel settings from cache
    const pricingSettings = SettingsService.cache.pricing_settings || { travelCost: 0.5 };
    const costPerKm = pricingSettings.travelCost || 0.5;
    console.log('[Jobs] Calculate cost with settings:', { costPerKm });
    
    const materials = parseFloat(document.getElementById('jobMaterialsCost')?.value || 0);
    const kilometers = parseFloat(document.getElementById('jobKilometers')?.value || 0);
    const billingHours = parseFloat(document.getElementById('jobBillingHours')?.value || 0);
    const billingRate = parseFloat(document.getElementById('jobBillingRate')?.value || 50);
    const agreedPrice = parseFloat(document.getElementById('jobAgreedPrice')?.value || 0);
    const billingType = this.getFormBillingType();

    // ΕΞΟΔΑ
    const ownerFallback = this.assignedWorkers.reduce((sum, worker) => {
      if (this.getWorkerType(worker) !== 'owner') return sum;
      const hours = parseFloat(worker.hoursAllocated || worker.hours_allocated || 0) || 0;
      const rate = parseFloat(worker.hourlyRate || worker.hourly_rate || 0) || 0;
      return sum + (hours * rate);
    }, 0);
    const workedTotals = this.getWorkedTimeTotals(this.assignedWorkers);
    const laborCost = workedTotals.laborCost; // Μόνο οι υπάλληλοι είναι έξοδο
    const ownerOpportunityCost = workedTotals.ownerOpportunityCost || ownerFallback;
    const actualHours = workedTotals.totalHours;
    const travelCost = kilometers * costPerKm; // Κόστος μετακίνησης
    const totalExpenses = materials + laborCost + travelCost; // Συνολικά έξοδα

    // ΕΣΟΔΑ: συμφωνημένη τιμή ή ώρες × τιμή/ώρα
    const billingAmount = billingType === 'fixed' ? agreedPrice : billingHours * billingRate;
    const totalCharge = billingAmount;
    const chargedHours = billingType === 'fixed' ? 0 : billingHours;
    const unbilledHours = billingType === 'fixed' ? 0 : Math.max(0, actualHours - chargedHours);
    const lostBillingValue = unbilledHours * billingRate;

    // ΚΕΡΔΟΣ
    const profit = billingAmount - totalExpenses;
    const economicProfit = profit - ownerOpportunityCost;
    const profitPerHour = actualHours > 0 ? profit / actualHours : null;

    // Update displays
    const laborDisplay = document.getElementById('laborCostDisplay');
    const materialsDisplay = document.getElementById('materialsCostDisplay');
    const travelDisplay = document.getElementById('travelCostDisplay');
    const totalExpensesDisplay = document.getElementById('totalExpensesDisplay');
    const billingAmountDisplay = document.getElementById('billingAmountDisplay');
    const billingAmountKpiDisplay = document.getElementById('billingAmountKpiDisplay');
    const totalDisplay = document.getElementById('totalCostDisplay');
    const profitDisplay = document.getElementById('profitDisplay');
    const profitPerHourDisplay = document.getElementById('profitPerHourDisplay');
    const workedHoursDisplay = document.getElementById('workedHoursDisplay');
    const chargedHoursDisplay = document.getElementById('chargedHoursDisplay');
    const unbilledHoursDisplay = document.getElementById('unbilledHoursDisplay');
    const lostBillingValueDisplay = document.getElementById('lostBillingValueDisplay');
    const ownerOpportunityCostDisplay = document.getElementById('ownerOpportunityCostDisplay');
    const economicProfitDisplay = document.getElementById('economicProfitDisplay');
    const mobileEditBillingDisplay = document.getElementById('mobileEditBillingDisplay');
    const mobileEditProfitDisplay = document.getElementById('mobileEditProfitDisplay');
    const mobileEditLostDisplay = document.getElementById('mobileEditLostDisplay');
    
    if (laborDisplay) laborDisplay.textContent = Utils.formatCurrency(laborCost);
    if (materialsDisplay) materialsDisplay.textContent = this.formatMaterialCurrency(materials);
    if (travelDisplay) travelDisplay.textContent = Utils.formatCurrency(travelCost);
    if (totalExpensesDisplay) totalExpensesDisplay.textContent = Utils.formatCurrency(totalExpenses);
    if (billingAmountDisplay) billingAmountDisplay.textContent = Utils.formatCurrency(billingAmount);
    if (billingAmountKpiDisplay) billingAmountKpiDisplay.textContent = Utils.formatCurrency(billingAmount);
    if (totalDisplay) totalDisplay.textContent = Utils.formatCurrency(totalCharge);
    if (workedHoursDisplay) workedHoursDisplay.textContent = `${actualHours.toFixed(1)} ώρες`;
    if (chargedHoursDisplay) chargedHoursDisplay.textContent = billingType === 'fixed' ? '-' : `${chargedHours.toFixed(1)} ώρες`;
    if (unbilledHoursDisplay) {
      unbilledHoursDisplay.textContent = billingType === 'fixed' ? '-' : `${unbilledHours.toFixed(1)} ώρες`;
      unbilledHoursDisplay.style.color = unbilledHours > 0 ? 'var(--warning, #f59e0b)' : 'var(--success)';
    }
    if (lostBillingValueDisplay) {
      lostBillingValueDisplay.textContent = billingType === 'fixed' ? '-' : Utils.formatCurrency(lostBillingValue);
      lostBillingValueDisplay.style.color = lostBillingValue > 0 ? 'var(--error)' : 'var(--success)';
    }
    if (profitPerHourDisplay) {
      profitPerHourDisplay.textContent = profitPerHour === null ? '-' : `${Utils.formatCurrency(profitPerHour)}/ώρα`;
      profitPerHourDisplay.style.color = (profitPerHour || 0) >= 0 ? 'var(--success)' : 'var(--error)';
    }
    if (ownerOpportunityCostDisplay) {
      ownerOpportunityCostDisplay.textContent = Utils.formatCurrency(ownerOpportunityCost);
      ownerOpportunityCostDisplay.style.color = ownerOpportunityCost > 0 ? 'var(--warning, #f59e0b)' : 'var(--success)';
    }
    if (economicProfitDisplay) {
      economicProfitDisplay.textContent = `${economicProfit >= 0 ? '+' : ''}${Utils.formatCurrency(economicProfit)}`;
      economicProfitDisplay.style.color = economicProfit >= 0 ? 'var(--success)' : 'var(--error)';
    }
    if (mobileEditBillingDisplay) mobileEditBillingDisplay.textContent = Utils.formatCurrency(billingAmount);
    if (mobileEditProfitDisplay) {
      mobileEditProfitDisplay.textContent = `${profit >= 0 ? '+' : ''}${Utils.formatCurrency(profit)}`;
      mobileEditProfitDisplay.style.color = profit >= 0 ? 'var(--success)' : 'var(--error)';
    }
    if (mobileEditLostDisplay) {
      mobileEditLostDisplay.textContent = billingType === 'fixed' ? '-' : Utils.formatCurrency(lostBillingValue);
      mobileEditLostDisplay.style.color = lostBillingValue > 0 ? 'var(--error)' : 'var(--success)';
    }
    this.updatePaymentsSummaryFromForm();
    
    if (profitDisplay) {
      // Format profit with sign
      const profitText = profit >= 0 
        ? `+${Utils.formatCurrency(profit)}` 
        : Utils.formatCurrency(profit);
      profitDisplay.textContent = profitText;
      
      // Change color based on profit/loss
      const profitContainer = profitDisplay.closest('.financial-card.profit');
      if (profit < 0) {
        profitDisplay.style.color = 'var(--error)';
        profitContainer?.classList.add('profit-negative');
        profitContainer?.classList.remove('profit-positive');
      } else {
        profitDisplay.style.color = 'var(--success)';
        profitContainer?.classList.add('profit-positive');
        profitContainer?.classList.remove('profit-negative');
      }
    }
    this.updateJobFormReview();
  },

  async saveJob(e) {
    e.preventDefault();
    console.log('[Jobs] Saving job...');

    // Saving from this form should never refresh the dashboard or close the user's context.
    if (typeof State !== 'undefined') {
      State.currentSection = 'jobs';
    }
    
    // Manual validation check for required fields
    const jobClient = document.getElementById('jobClient').value;
    const jobStatus = document.getElementById('jobStatus').value;
    
    console.log('[Jobs] Job data:', { jobClient, jobStatus });
    
    if (!jobClient) {
      console.warn('[Jobs] Missing client');
      Toast.error('Παρακαλώ επιλέξτε πελάτη');
      this.goToJobStep('basic');
      if (!Utils.isMobile()) {
        document.getElementById('jobClient').focus();
      }
      return;
    }
    
    if (!jobStatus) {
      console.warn('[Jobs] Missing status');
      Toast.error('Παρακαλώ επιλέξτε κατάσταση');
      this.goToJobStep('basic');
      if (!Utils.isMobile()) {
        document.getElementById('jobStatus').focus();
      }
      return;
    }

    // Get travel settings from cache
    const pricingSettings = SettingsService.cache.pricing_settings || { travelCost: 0.5 };
    const costPerKm = pricingSettings.travelCost || 0.5;
    console.log('[Jobs] Pricing settings:', { costPerKm });

    this.applyMinimumCostFields(true);

    const billingHours = parseFloat(document.getElementById('jobBillingHours').value) || 0;
    const billingRate = parseFloat(document.getElementById('jobBillingRate').value) || 50;
    const billingType = this.getFormBillingType();
    const agreedPrice = parseFloat(document.getElementById('jobAgreedPrice')?.value || 0) || 0;

    // Get and log next visit field value
    const nextVisitRaw = document.getElementById('jobNextVisit').value;
    const nextVisitConverted = Utils.greekToDate(nextVisitRaw);
    const visitEndRaw = document.getElementById('jobVisitEndDate')?.value || '';
    const visitEndConverted = visitEndRaw ? Utils.greekToDate(visitEndRaw) : null;
    console.log('[Jobs] Next visit field:', { raw: nextVisitRaw, converted: nextVisitConverted, visitEnd: visitEndConverted });

    if (visitEndConverted && !nextVisitConverted) {
      Toast.error('Συμπληρώστε πρώτα την Επόμενη Επίσκεψη πριν βάλετε Λήξη Επίσκεψης.');
      this.goToJobStep('basic');
      if (!Utils.isMobile()) {
        document.getElementById('jobNextVisit')?.focus();
      }
      return;
    }

    if (nextVisitConverted && visitEndConverted && visitEndConverted < nextVisitConverted) {
      Toast.error('Η Λήξη Επίσκεψης δεν μπορεί να είναι πριν από την Επόμενη Επίσκεψη.');
      this.goToJobStep('basic');
      if (!Utils.isMobile()) {
        document.getElementById('jobVisitEndDate')?.focus();
      }
      return;
    }

    // Ωράριο επίσκεψης (ενοποίηση με ημερολόγιο)
    const visitAllDayEl = document.getElementById('jobVisitAllDay');
    const visitAllDay = visitAllDayEl && !visitAllDayEl.checked ? 0 : 1;
    const visitStartTime = visitAllDay ? null : (document.getElementById('jobVisitStartTime')?.value || null);
    const visitEndTime = visitAllDay ? null : (document.getElementById('jobVisitEndTime')?.value || null);

    this.recalculateAssignedMaterialCosts();

    const titleInput = document.getElementById('jobTitle')?.value?.trim();
    const clientName = this.getClientName(Number(jobClient));

    const jobData = {
      clientId: Number(jobClient),
      title: titleInput || clientName || 'Νέα Εργασία',
      type: titleInput || clientName || null,
      status: jobStatus,
      address: document.getElementById('jobAddress')?.value || null,
      rooms: parseInt(document.getElementById('jobRooms').value) || null,
      area: parseFloat(document.getElementById('jobArea').value) || null,
      nextVisit: nextVisitConverted,
      visitEndDate: visitEndConverted,
      visitAllDay: visitAllDay,
      visitStartTime: visitStartTime,
      visitEndTime: visitEndTime,
      materialsCost: parseFloat(document.getElementById('jobMaterialsCost').value) || 0,
      kilometers: parseFloat(document.getElementById('jobKilometers').value) || 0,
      billingHours: billingHours,
      billingRate: billingRate,
      billingType: billingType,
      agreedPrice: agreedPrice,
      costPerKm: costPerKm,
      notes: document.getElementById('jobNotes').value,
      assignedWorkers: JSON.stringify(this.assignedWorkers),
      paints: JSON.stringify(this.assignedPaints)
    };
    
    // Add date only for new jobs, not for edits
    if (!this.currentEdit) {
      jobData.date = new Date().toISOString().split('T')[0];
    }
    
    console.log('[Jobs] Job data to save:', jobData);

    // If editing, add the ID
    if (this.currentEdit) {
      jobData.id = this.currentEdit;
    }

    // ΕΞΟΔΑ
    const laborCost = this.getWorkedTimeTotals(this.assignedWorkers).laborCost; // Κόστος υπαλλήλων μόνο
    const travelCost = jobData.kilometers * jobData.costPerKm;
    const totalExpenses = jobData.materialsCost + laborCost + travelCost;

    // ΕΣΟΔΑ: συμφωνημένη τιμή ή ώρες × τιμή/ώρα
    const billingAmount = billingType === 'fixed' ? agreedPrice : billingHours * billingRate;
    const totalCharge = billingAmount;

    // ΚΕΡΔΟΣ
    const profit = billingAmount - totalExpenses;
    
    // Save only the fields that exist in the database schema
    jobData.billingHours = billingHours;
    jobData.billingRate = billingRate;
    // materialsCost, kilometers and costPerKm are already in jobData
    jobData.totalCost = totalCharge;
    
    // Update is_paid based on status
    jobData.isPaid = jobStatus === 'Εξοφλήθηκε' ? 1 : 0;
    
    // These are calculated values - don't save to DB:
    // workerHours, laborCost, travelCost, totalExpenses, billingAmount, profit

    // Validate
    const validation = Validation.validateJob(jobData);
    if (!validation.valid) {
      console.error('❌ Validation failed:', validation.errors);
      Toast.error(validation.errors[0]);
      return;
    }

    const shouldDeductStock = this.assignedPaints.some(item => item.deductFromStock && !item.stockDeducted);
    if (shouldDeductStock && !this.validateStockDeduction()) {
      return;
    }

    try {
      let savedJob = null;
      // Save or update
      if (this.currentEdit) {
        savedJob = await State.update('jobs', jobData.id, jobData);
        if (savedJob) {
          savedJob.visitEndDate = visitEndConverted;
        }
        if (shouldDeductStock) {
          await this.deductAssignedMaterialsFromStock(jobData.id);
          jobData.paints = JSON.stringify(this.assignedPaints);
          savedJob = await State.update('jobs', jobData.id, jobData);
          if (savedJob) {
            savedJob.visitEndDate = visitEndConverted;
          }
        }
        Toast.success('Η εργασία ενημερώθηκε!');
      } else {
        savedJob = await State.create('jobs', jobData);
        if (savedJob) {
          savedJob.visitEndDate = visitEndConverted;
        }
        if (shouldDeductStock && savedJob?.id) {
          await this.deductAssignedMaterialsFromStock(savedJob.id);
          jobData.paints = JSON.stringify(this.assignedPaints);
          savedJob = await State.update('jobs', savedJob.id, jobData);
          if (savedJob) {
            savedJob.visitEndDate = visitEndConverted;
          }
        }
        Toast.success('Η εργασία δημιουργήθηκε!');
      }

      const savedJobId = savedJob?.id || jobData.id;
      if (savedJobId) {
        await this.flushDraftPayments(savedJobId);

        const schedulePatch = {
          nextVisit: nextVisitConverted,
          visitEndDate: visitEndConverted,
          visitStartTime: visitStartTime,
          visitEndTime: visitEndTime,
          visitAllDay: visitAllDay
        };
        if (savedJob) Object.assign(savedJob, schedulePatch);
        const stateJob = State.data.jobs.find(j => Number(j.id) === Number(savedJobId));
        if (stateJob) Object.assign(stateJob, schedulePatch);

        this.currentEdit = Number(savedJobId);
        const formTitle = document.getElementById('formTitle');
        if (formTitle) formTitle.textContent = 'Επεξεργασία Εργασίας';
        if (jobStatus === 'Εξοφλήθηκε') {
          await this.ensurePaymentForPaidStatus(savedJobId);
        }
        await this.syncJobStatusFromPayments(savedJobId);
        this.refreshJobFormLinkedSections(this.currentEdit);
        this.updateJobFormBanner({ saved: true });
      }
      this.refreshTable();
      this.renderAssignedPaints();
      if (typeof State !== 'undefined' && State.refreshCalendarIfNeeded) {
        State.refreshCalendarIfNeeded();
      }
    } catch (error) {
      console.error('❌ Error saving job:', error);
      Toast.error('Σφάλμα κατά την αποθήκευση: ' + error.message);
    }
  },

  validateStockDeduction() {
    const pendingItems = this.assignedPaints.filter(item => item.deductFromStock && !item.stockDeducted);
    if (!pendingItems.length) {
      Toast.info('Δεν υπάρχουν υλικά προς αφαίρεση από την αποθήκη');
      return false;
    }

    const requiredByMaterial = new Map();
    for (const item of pendingItems) {
      const materialId = item.materialId || item.material_id;
      const quantity = this.parseMaterialQuantity(item.quantity);
      if (!materialId) {
        Toast.error(`Το υλικό "${item.name}" δεν είναι συνδεδεμένο με την Αποθήκη`);
        return false;
      }
      if (quantity <= 0) {
        Toast.error(`Συμπληρώστε αριθμητική ποσότητα για το υλικό "${item.name}"`);
        return false;
      }
      requiredByMaterial.set(Number(materialId), (requiredByMaterial.get(Number(materialId)) || 0) + quantity);
    }

    for (const [materialId, requiredQuantity] of requiredByMaterial.entries()) {
      const material = State.read('inventory', materialId);
      const available = parseFloat(material?.stock || 0) || 0;
      if (requiredQuantity > available) {
        Toast.error(`Δεν υπάρχει αρκετό απόθεμα για "${material?.name || 'υλικό'}" (${available} διαθέσιμο, ${requiredQuantity} ζητήθηκε)`);
        return false;
      }
    }

    return true;
  },

  async deductAssignedMaterialsFromStock(jobId) {
    for (const item of this.assignedPaints) {
      if (!item.deductFromStock) continue;
      if (item.stockDeducted) continue;

      const materialId = item.materialId || item.material_id;
      const quantity = this.parseMaterialQuantity(item.quantity);
      const material = State.read('inventory', materialId);
      if (!materialId || quantity <= 0 || !material) continue;

      const result = await State.create('materialStockMovements', {
        materialId: Number(materialId),
        movementType: 'remove',
        quantity,
        movementDate: new Date().toISOString().split('T')[0],
        unit: item.unit || material.unit || 'λίτρα',
        referenceType: 'job',
        referenceId: jobId,
        notes: this.getJobStockMovementNote('Χρήση', jobId)
      });

      if (!result?.movement || !result?.material) {
        throw new Error(`Δεν επιβεβαιώθηκε η κίνηση αποθήκης για "${item.name}"`);
      }

      item.stockDeducted = true;
      item.stockDeductedAt = new Date().toISOString();
      item.stockMovementId = result.movement.id || null;
    }
  },

  async createJobMaterialStockMovement(item, jobId, movementType, quantity, notePrefix = 'Χρήση') {
    const materialId = item.materialId || item.material_id;
    const numericQuantity = this.parseMaterialQuantity(quantity);
    const material = State.read('inventory', materialId);
    if (!materialId || numericQuantity <= 0 || !material) {
      throw new Error(`Το υλικό "${item.name}" δεν είναι συνδεδεμένο με την αποθήκη`);
    }

    const result = await State.create('materialStockMovements', {
      materialId: Number(materialId),
      movementType,
      quantity: numericQuantity,
      movementDate: new Date().toISOString().split('T')[0],
      unit: item.unit || material.unit || 'λίτρα',
      referenceType: 'job',
      referenceId: jobId,
      notes: this.getJobStockMovementNote(notePrefix, jobId)
    });

    if (!result?.movement || !result?.material) {
      throw new Error(`Δεν επιβεβαιώθηκε η κίνηση αποθήκης για "${item.name}"`);
    }

    return result;
  },

  getJobStockMovementNote(action, jobId = this.currentEdit) {
    const clientName = this.getJobClientNameForStockMovement(jobId);
    return clientName && clientName !== 'Άγνωστος'
      ? `${action} - Πελάτης: ${clientName}`
      : action;
  },

  getJobClientNameForStockMovement(jobId = this.currentEdit) {
    const selectedClientId = document.getElementById('jobClient')?.value;
    const job = jobId ? State.read('jobs', jobId) : null;
    const clientId = selectedClientId || job?.clientId || job?.client_id;
    return clientId ? this.getClientName(clientId) : 'Άγνωστος';
  },

  async adjustDeductedMaterialStockChange(previousItem, nextItem, jobId) {
    if (!jobId) return;

    const previousMaterialId = Number(previousItem.materialId || previousItem.material_id || 0);
    const nextMaterialId = Number(nextItem.materialId || nextItem.material_id || 0);
    const previousQuantity = this.parseMaterialQuantity(previousItem.quantity);
    const nextQuantity = this.parseMaterialQuantity(nextItem.quantity);
    if (!previousMaterialId || !nextMaterialId || previousQuantity <= 0 || nextQuantity <= 0) return;

    if (previousMaterialId !== nextMaterialId) {
      await this.createJobMaterialStockMovement(previousItem, jobId, 'add', previousQuantity, 'Διόρθωση επιστροφής υλικού');
      const removal = await this.createJobMaterialStockMovement(nextItem, jobId, 'remove', nextQuantity, 'Διόρθωση χρήσης υλικού');
      nextItem.stockMovementId = removal.movement.id || nextItem.stockMovementId || null;
      nextItem.stockDeductedAt = new Date().toISOString();
      return;
    }

    const delta = nextQuantity - previousQuantity;
    if (Math.abs(delta) < 0.0001) return;

    if (delta > 0) {
      const removal = await this.createJobMaterialStockMovement(nextItem, jobId, 'remove', delta, 'Διόρθωση επιπλέον χρήσης υλικού');
      nextItem.stockMovementId = removal.movement.id || nextItem.stockMovementId || null;
      nextItem.stockDeductedAt = new Date().toISOString();
    } else {
      await this.createJobMaterialStockMovement(nextItem, jobId, 'add', Math.abs(delta), 'Διόρθωση επιστροφής υλικού');
    }
  },

  hasStockDeductionMovement(item, jobId = this.currentEdit) {
    const materialId = Number(item.materialId || item.material_id || 0);
    if (!materialId || !jobId) return false;

    const stockMovementId = item.stockMovementId || item.stock_movement_id;
    const movements = State.read('materialStockMovements') || [];
    if (stockMovementId && movements.some(movement => Number(movement.id) === Number(stockMovementId))) {
      return true;
    }

    return movements.some(movement => {
      const movementMaterialId = Number(movement.materialId || movement.material_id || 0);
      const referenceType = movement.referenceType || movement.reference_type;
      const referenceId = Number(movement.referenceId || movement.reference_id || 0);
      const movementType = movement.movementType || movement.movement_type;
      const quantity = parseFloat(movement.quantity || 0) || 0;
      return movementMaterialId === materialId
        && referenceType === 'job'
        && referenceId === Number(jobId)
        && (movementType === 'remove' || quantity < 0);
    });
  },

  reconcileAssignedPaintStockFlags(jobId = this.currentEdit) {
    if (!Array.isArray(this.assignedPaints) || !jobId) return;

    this.assignedPaints = this.assignedPaints.map(item => {
      const hasDeductionMovement = this.hasStockDeductionMovement(item, jobId);
      if (!item.stockDeducted && !hasDeductionMovement) {
        return item;
      }

      return {
        ...item,
        deductFromStock: item.deductFromStock === true || hasDeductionMovement,
        stockDeducted: hasDeductionMovement,
        stockMovementId: hasDeductionMovement ? (item.stockMovementId || item.stock_movement_id || null) : null
      };
    });
  },

  parseMaterialQuantity(value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const normalized = String(value).replace(',', '.');
    const match = normalized.match(/-?\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : 0;
  },

  refreshTable() {
    const jobs = State.read('jobs') || [];
    this.renderTableWithLazy(jobs, { reset: true });
  },

  renderTableWithLazy(jobs, { reset = false } = {}) {
    const container = document.getElementById('jobsTableContainer');
    if (container) {
      if (reset) {
        Utils.resetInfiniteList(this.lazyTableKey, this.lazyBatchSize);
      }
      container.innerHTML = this.renderTable(jobs);
      this.setupLazyTable(jobs);
    }
  },

  setupLazyTable(jobs) {
    Utils.setupInfiniteScroll({
      key: this.lazyTableKey,
      total: Array.isArray(jobs) ? jobs.length : 0,
      batchSize: this.lazyBatchSize,
      onLoadMore: () => this.renderTableWithLazy(jobs)
    });
  },

  refreshJobFormLinkedSections(jobId = this.currentEdit) {
    const paymentsContainer = document.getElementById('jobPaymentsFormSection');
    if (paymentsContainer) {
      const job = jobId ? State.read('jobs', jobId) : null;
      paymentsContainer.innerHTML = this.renderPaymentsSection(jobId || null, 'edit', job ? this.computeJobFinancials(job) : null);
    }

    this.setupJobFormActionListeners();
  },

  setupJobFormActionListeners() {
    document.querySelectorAll('.job-form-add-payment-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const jobId = btn.dataset.jobId ? Number(btn.dataset.jobId) : null;
        this.openPaymentModal(jobId || null, null, 'edit');
      };
    });

    document.querySelectorAll('.job-form-edit-payment-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const draftId = btn.dataset.draftId;
        if (draftId) {
          const payment = this.draftPayments.find(item => item._draftId === draftId);
          this.openPaymentModal(null, payment, 'edit');
          return;
        }
        const payment = (State.read('jobPayments') || []).find(p => Number(p.id) === Number(btn.dataset.paymentId));
        this.openPaymentModal(btn.dataset.jobId, payment, 'edit');
      };
    });

    document.querySelectorAll('.job-form-delete-payment-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const draftId = btn.dataset.draftId;
        if (draftId) {
          this.draftPayments = this.draftPayments.filter(item => item._draftId !== draftId);
          this.markJobFormDirty();
          this.refreshJobFormLinkedSections(this.currentEdit);
          this.calculateCost();
          Toast.success('Το προσχέδιο πληρωμής αφαιρέθηκε');
          return;
        }
        this.deletePayment(btn.dataset.paymentId, btn.dataset.jobId, 'edit');
      };
    });
  },

  renderMobileJobDetails(job, client, clientName) {
    const fin = this.computeJobFinancials(job);
    const addressParts = [
      client?.address || job.address,
      client?.city,
      client?.postalCode || client?.postal
    ].filter(Boolean);
    const fullAddress = addressParts.join(', ');
    const phone = client?.phone || '';
    const status = Utils.escapeHtml(Utils.translateStatus(job.status));
    const safeClientName = Utils.escapeHtml(clientName);
    const safeAddress = Utils.escapeHtml(fullAddress || 'Χωρίς διεύθυνση');
    const safeSchedule = Utils.escapeHtml(this.formatVisitSchedule(job));
    const safeJobId = Utils.escapeHtml(String(job.id));
    const phoneHref = phone ? `tel:${String(phone).replace(/\s+/g, '')}` : '';
    const mapHref = fullAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}` : '';

    return `
      <section class="job-mobile-card" aria-label="Προβολή εργασίας σε κινητό">
        <div class="job-mobile-hero">
          <div>
            <span class="job-mobile-code">#${safeJobId}</span>
            <h2>${safeClientName}</h2>
            <span class="job-mobile-status">${status}</span>
          </div>
        </div>

        <div class="job-mobile-action-row">
          ${phoneHref ? `
            <a href="${phoneHref}">
              <i class="fas fa-phone"></i>
              Κλήση
            </a>
          ` : ''}
          ${mapHref ? `
            <a href="${mapHref}" target="_blank" rel="noopener">
              <i class="fas fa-route"></i>
              Διαδρομή
            </a>
          ` : ''}
        </div>

        <div class="job-mobile-info-list">
          <div>
            <i class="fas fa-calendar-check"></i>
            <span>Πρόγραμμα</span>
            <strong>${safeSchedule}</strong>
          </div>
          <div>
            <i class="fas fa-location-dot"></i>
            <span>Διεύθυνση</span>
            <strong>${safeAddress}</strong>
          </div>
          ${phone ? `
            <div>
              <i class="fas fa-phone"></i>
              <span>Τηλέφωνο</span>
              <strong>${Utils.escapeHtml(phone)}</strong>
            </div>
          ` : ''}
        </div>

        <div class="job-mobile-kpis">
          <div>
            <span>Δουλεμένες</span>
            <strong>${fin.actualHours.toFixed(1)}ω</strong>
          </div>
          <div>
            <span>Χρεωμένες</span>
            <strong>${fin.billingType === 'fixed' ? '-' : `${fin.billingHours.toFixed(1)}ω`}</strong>
          </div>
          <div class="${fin.unbilledHours > 0 ? 'warning' : ''}">
            <span>Μη χρεωμένες</span>
            <strong>${fin.billingType === 'fixed' ? '-' : `${fin.unbilledHours.toFixed(1)}ω`}</strong>
          </div>
          <div class="${fin.profit < 0 ? 'danger' : 'success'}">
            <span>Κέρδος</span>
            <strong>${fin.profit >= 0 ? '+' : ''}${Utils.formatCurrency(fin.profit)}</strong>
          </div>
        </div>

        <div class="job-mobile-money-card">
          <div>
            <span>Σύνολο χρέωσης</span>
            <strong>${Utils.formatCurrency(fin.billingAmount)}</strong>
          </div>
          <div>
            <span>Πληρωμένο</span>
            <strong>${Utils.formatCurrency(fin.paidAmount)}</strong>
          </div>
          <div class="${fin.balance > 0.005 ? 'danger' : 'success'}">
            <span>Υπόλοιπο</span>
            <strong>${Utils.formatCurrency(fin.balance)}</strong>
          </div>
          <div class="${fin.lostBillingValue > 0 ? 'danger' : 'success'}">
            <span>Χαμένη αξία</span>
            <strong>${fin.billingType === 'fixed' ? '-' : Utils.formatCurrency(fin.lostBillingValue)}</strong>
          </div>
        </div>

        ${job.notes ? `
          <div class="job-mobile-notes">
            <span><i class="fas fa-sticky-note"></i> Σημειώσεις</span>
            <p>${Utils.escapeHtml(job.notes)}</p>
          </div>
        ` : ''}
      </section>
    `;
  },

  async viewJob(id) {
    console.log('[Jobs] Viewing job:', id);
    let job = null;
    try {
      job = await API.getJob(id);
      const idx = State.data.jobs.findIndex(j => Number(j.id) === Number(id));
      if (idx >= 0) State.data.jobs[idx] = job;
    } catch (e) {
      job = State.data.jobs.find(j => Number(j.id) === Number(id));
    }
    if (!job) {
      console.error('[Jobs] Job not found:', id);
      return;
    }

    const client = State.data.clients.find(c => Number(c.id) === Number(job.clientId));
    const clientName = client ? client.name : 'Άγνωστος';

    const content = `
      ${this.renderMobileJobDetails(job, client, clientName)}
      <div class="job-details job-details-desktop">
        <div class="detail-section">
          <h4><i class="fas fa-info-circle"></i> Σύνοψη Εργασίας</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Κωδικός:</label>
              <span>${job.id}</span>
            </div>
            <div class="detail-item">
              <label>Κατάσταση:</label>
              <span class="status-pill status-${job.status?.toLowerCase().replace(/\s+/g, '-')}">${Utils.translateStatus(job.status)}</span>
            </div>
            <div class="detail-item">
              <label>Πελάτης:</label>
              <span>${clientName}</span>
            </div>
            <div class="detail-item">
              <label>Τηλέφωνο:</label>
              <span>${client?.phone || '-'}</span>
            </div>
            <div class="detail-item span-2">
              <label>Διεύθυνση:</label>
              <span>${client?.address || '-'}, ${client?.city || '-'}, ${client?.postalCode || client?.postal || '-'}</span>
            </div>
            <div class="detail-item">
              <label>Επόμενη Επίσκεψη:</label>
              <span>${this.formatVisitSchedule(job)}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4><i class="fas fa-euro-sign"></i> Οικονομική Εικόνα</h4>
          ${this.renderFinancialSummary(job)}
        </div>

        <div class="detail-section">
          ${this.renderPaymentsSection(job.id, 'view', this.computeJobFinancials(job))}
        </div>

        ${job.notes ? `
        <div class="detail-section">
          <h4><i class="fas fa-sticky-note"></i> Σημειώσεις</h4>
          <div class="detail-notes">${job.notes}</div>
        </div>
        ` : ''}
      </div>
    `;

    const footer = `
      <button class="btn-primary" id="editJobFromModalBtn">
        <i class="fas fa-edit"></i> Επεξεργασία
      </button>
    `;

    const modal = Modal.open({
      title: `${clientName}`,
      content,
      footer,
      size: 'lg'
    });
    modal.classList.add('job-view-modal');

    setTimeout(() => {
      const editBtn = document.getElementById('editJobFromModalBtn');
      if (editBtn) {
        editBtn.onclick = () => {
          Modal.close();
          setTimeout(() => this.editJob(id), 100);
        };
      }
    }, 50);
  },

  // ==================== Job Payments (Πληρωμές Πελάτη) ====================

  openPaymentModal(jobId, payment = null, context = 'view') {
    const isDraft = !jobId && context === 'edit';
    const job = jobId ? State.read('jobs', jobId) : null;
    const baseFinancials = job ? this.computeJobFinancials(job) : null;
    const fin = context === 'edit' ? this.getCurrentFormPaymentFinancials(jobId, baseFinancials || {}) : baseFinancials;
    const suggested = payment ? (payment.amount || '') : (fin && fin.balance > 0 ? fin.balance.toFixed(2) : '');
    const today = new Date().toISOString().split('T')[0];
    const paymentDate = payment ? String(payment.paymentDate || payment.payment_date || today).substring(0, 10) : today;
    const paymentNotes = payment ? (payment.notes || '') : '';
    let returnedToJob = false;
    const returnToJob = () => {
      if (returnedToJob) return;
      returnedToJob = true;
      setTimeout(() => {
        if (context === 'edit') {
          this.refreshJobFormLinkedSections(Number(jobId));
          this.calculateCost();
        } else {
          this.viewJob(jobId);
        }
      }, 350);
    };

    const content = `
      <div class="form-grid">
        <div class="form-group">
          <label>Ημερομηνία <span class="required">*</span></label>
          <input type="date" id="jobPaymentDateInput" value="${paymentDate}">
        </div>
        <div class="form-group">
          <label>Ποσό (€) <span class="required">*</span></label>
          <input type="number" id="jobPaymentAmountInput" min="0.01" step="0.01" value="${suggested}" placeholder="0.00">
          ${fin ? `<small class="text-muted" style="display: block; margin-top: 4px;">Υπόλοιπο: ${Utils.formatCurrency(fin.balance)}</small>` : ''}
        </div>
        <div class="form-group span-2">
          <label>Σημειώσεις</label>
          <textarea id="jobPaymentNotesInput" rows="2" placeholder="π.χ. Προκαταβολή, εξόφληση">${paymentNotes}</textarea>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn-ghost" id="cancelJobPaymentBtn">Ακύρωση</button>
      <button class="btn-primary" id="confirmJobPaymentBtn">
        <i class="fas fa-save"></i> ${payment ? 'Αποθήκευση' : 'Καταχώρηση'}
      </button>
    `;

    Modal.open({
      title: `<i class="fas fa-hand-holding-usd"></i> ${payment ? 'Επεξεργασία' : 'Καταχώρηση'} Πληρωμής Πελάτη`,
      content: content,
      footer: footer,
      size: 'md',
      onClose: returnToJob
    });

    setTimeout(() => {
      const cancelBtn = document.getElementById('cancelJobPaymentBtn');
      if (cancelBtn) {
        cancelBtn.onclick = () => {
          Modal.close();
          returnToJob();
        };
      }

      const confirmBtn = document.getElementById('confirmJobPaymentBtn');
      if (confirmBtn) {
        confirmBtn.onclick = async () => {
          const amount = parseFloat(document.getElementById('jobPaymentAmountInput')?.value || 0) || 0;
          const paymentDate = document.getElementById('jobPaymentDateInput')?.value;
          if (!paymentDate) {
            Toast.error('Συμπληρώστε ημερομηνία');
            return;
          }
          if (amount <= 0) {
            Toast.error('Το ποσό πρέπει να είναι μεγαλύτερο από 0');
            return;
          }

          try {
            const payload = {
              jobId: jobId ? Number(jobId) : null,
              paymentDate: paymentDate,
              amount: amount,
              notes: document.getElementById('jobPaymentNotesInput')?.value || ''
            };

            if (isDraft) {
              const draftId = payment?._draftId || `draft-${Date.now()}`;
              const draftRecord = { ...payload, _draftId: draftId };
              const existingIndex = this.draftPayments.findIndex(item => item._draftId === draftId);
              if (existingIndex >= 0) {
                this.draftPayments[existingIndex] = draftRecord;
              } else {
                this.draftPayments.push(draftRecord);
              }
              this.markJobFormDirty();
              Toast.success(payment ? 'Το προσχέδιο πληρωμής ενημερώθηκε' : 'Προστέθηκε προσχέδιο πληρωμής');
              Modal.close();
              this.refreshJobFormLinkedSections(this.currentEdit);
              this.calculateCost();
              return;
            }

            payload.jobId = Number(jobId);
            if (payment) {
              await State.update('jobPayments', payment.id, payload);
              Toast.success('Η πληρωμή ενημερώθηκε');
            } else {
              await State.create('jobPayments', payload);
              Toast.success('Η πληρωμή καταχωρήθηκε');
            }
            await this.syncJobStatusFromPayments(jobId);
            Modal.close();
            this.refreshTable();
            returnToJob();
          } catch (error) {
            console.error('[Jobs] Error saving payment:', error);
          }
        };
      }
    }, 100);
  },

  deletePayment(paymentId, jobId, context = 'view') {
    Modal.confirm({
      title: 'Διαγραφή Πληρωμής',
      message: 'Θέλετε σίγουρα να διαγράψετε αυτή την πληρωμή;',
      onConfirm: async () => {
        try {
          await State.delete('jobPayments', paymentId);
          await this.syncJobStatusFromPayments(jobId);
          Toast.success('Η πληρωμή διαγράφηκε');
          this.refreshTable();
          setTimeout(() => {
            if (context === 'edit') {
              this.refreshJobFormLinkedSections(Number(jobId));
              this.calculateCost();
            } else {
              this.viewJob(jobId);
            }
          }, 350);
        } catch (error) {
          // Error toast already shown by State
        }
      },
      onCancel: () => {
        if (context !== 'edit') setTimeout(() => this.viewJob(jobId), 350);
      }
    });
  },

  async editJob(id) {
    console.log('[Jobs] Editing job:', id);
    let job = null;
    const stateJob = State.data.jobs.find(j => Number(j.id) === Number(id));
    try {
      job = await API.getJob(id);
      job = this.normalizeJobSchedule(job, stateJob);
      const idx = State.data.jobs.findIndex(j => Number(j.id) === Number(id));
      if (idx >= 0) State.data.jobs[idx] = job;
    } catch (e) {
      job = this.normalizeJobSchedule(stateJob);
    }
    if (!job) {
      console.error('[Jobs] Job not found:', id);
      return;
    }

    this.fillJobForm(job);
  },

  fillJobForm(job) {
    job = this.normalizeJobSchedule(job);
    console.log('[Jobs] Job data:', job);
    this.currentEdit = Number(job.id);
    document.getElementById('formTitle').textContent = 'Επεξεργασία Εργασίας';
    document.getElementById('jobForm').style.display = 'block';
    window.AppShell?.refreshFab();

    // Fill form - convert dates from YYYY-MM-DD to DD/MM/YYYY
    document.getElementById('jobClient').value = job.clientId;
    document.getElementById('jobTitle').value = job.title || job.type || '';
    document.getElementById('jobStatus').value = job.status || '';
    document.getElementById('jobRooms').value = job.rooms ? Math.round(job.rooms) : '';
    document.getElementById('jobArea').value = job.area ? Math.round(job.area) : '';
    const nextVisitEl = document.getElementById('jobNextVisit');
    const visitEndEl = document.getElementById('jobVisitEndDate');
    this.setDateInputValue(nextVisitEl, job.nextVisit);
    this.setDateInputValue(visitEndEl, job.visitEndDate);
    this.setupVisitDateValidation();
    this.setDateInputValue(visitEndEl, job.visitEndDate);
    document.getElementById('jobAddress').value = job.address || '';
    // Ωράριο επίσκεψης (ενοποιημένο με ημερολόγιο)
    const editAllDayEl = document.getElementById('jobVisitAllDay');
    if (editAllDayEl) {
      const isAllDay = job.visitAllDay === '' ? true : !!Number(job.visitAllDay);
      editAllDayEl.checked = isAllDay;
      const startEl = document.getElementById('jobVisitStartTime');
      const endEl = document.getElementById('jobVisitEndTime');
      if (startEl) startEl.value = job.visitStartTime ? String(job.visitStartTime).substring(0, 5) : '';
      if (endEl) endEl.value = job.visitEndTime ? String(job.visitEndTime).substring(0, 5) : '';
      const wrap = document.getElementById('jobVisitTimeWrap');
      const endWrap = document.getElementById('jobVisitEndTimeWrap');
      if (wrap) wrap.style.display = isAllDay ? 'none' : '';
      if (endWrap) endWrap.style.display = isAllDay ? 'none' : '';
    }
    document.getElementById('jobKilometers').value = job.kilometers ? Math.round(job.kilometers) : 0;
    document.getElementById('jobBillingHours').value = job.billingHours ? Math.round(job.billingHours) : 0;
    document.getElementById('jobBillingRate').value = job.billingRate ? Math.round(job.billingRate) : 50;
    // Τρόπος χρέωσης + συμφωνημένη τιμή
    const billingType = (job.billingType || job.billing_type) === 'fixed' ? 'fixed' : 'hourly';
    const typeRadio = document.querySelector(`input[name="jobBillingType"][value="${billingType}"]`);
    if (typeRadio) typeRadio.checked = true;
    const agreedPriceInput = document.getElementById('jobAgreedPrice');
    if (agreedPriceInput) agreedPriceInput.value = parseFloat(job.agreedPrice || job.agreed_price || 0) || 0;
    this.applyBillingTypeVisibility();
    document.getElementById('jobNotes').value = job.notes || '';

    // Load assigned workers and job materials - Parse JSON if stored as string
    console.log('[Jobs] Raw assignedWorkers:', job.assignedWorkers, typeof job.assignedWorkers);
    console.log('[Jobs] Raw paints:', job.paints, typeof job.paints);
    
    try {
      if (typeof job.assignedWorkers === 'string') {
        this.assignedWorkers = JSON.parse(job.assignedWorkers);
      } else if (Array.isArray(job.assignedWorkers)) {
        this.assignedWorkers = [...job.assignedWorkers];
      } else {
        this.assignedWorkers = [];
      }
      this.assignedWorkers = this.assignedWorkers.map(worker => ({
        ...worker,
        workerType: worker.workerType || worker.worker_type || 'employee',
        laborCost: (worker.workerType || worker.worker_type) === 'owner'
          ? 0
          : (parseFloat(worker.laborCost || worker.labor_cost || 0) || 0)
      }));
      
      if (typeof job.paints === 'string') {
        this.assignedPaints = JSON.parse(job.paints);
      } else if (Array.isArray(job.paints)) {
        this.assignedPaints = [...job.paints];
      } else {
        this.assignedPaints = [];
      }
      this.assignedPaints = this.assignedPaints.map(material => {
        const hasDeductionMovement = this.hasStockDeductionMovement(material, job.id);
        return {
          ...material,
          quantity: material.quantity || '',
          info: material.info || '',
          cost: this.parseCurrencyInput(material.cost || material.totalCost || 0),
          deductFromStock: material.deductFromStock === true || hasDeductionMovement,
          stockDeducted: hasDeductionMovement,
          stockMovementId: hasDeductionMovement ? (material.stockMovementId || material.stock_movement_id || null) : null
        };
      });
      
      console.log('[Jobs] Parsed assignedWorkers:', this.assignedWorkers);
      console.log('[Jobs] Parsed assignedPaints:', this.assignedPaints);
    } catch (error) {
      console.error('[Jobs] Error parsing workers/materials:', error);
      this.assignedWorkers = [];
      this.assignedPaints = [];
    }
    
    this.renderAssignedWorkers();
    this.renderAssignedPaints();

    const materialTotal = this.getMaterialCostTotal();
    const savedMaterialsCost = parseFloat(job.materialsCost ?? job.materials_cost ?? 0) || 0;
    document.getElementById('jobMaterialsCost').value = Math.max(savedMaterialsCost, materialTotal).toFixed(2);

    this.draftPayments = [];
    this.formDirty = false;
    this.currentStepIndex = 0;
    this.refreshJobFormLinkedSections(this.currentEdit);

    this.autoFillClientData();
    this.calculateCost();
    this.updateProgressBar();
    this.goToJobStep('basic');
    this.updateJobFormBanner({ saved: true });
    document.getElementById('jobForm').scrollIntoView({ behavior: 'smooth' });
  },

  async deleteJob(id) {
    Modal.confirm({
      title: 'Διαγραφή Εργασίας',
      message: 'Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την εργασία;',
      onConfirm: async () => {
        try {
          await State.delete('jobs', id);
          Toast.success('Η εργασία διαγράφηκε');
          this.refreshTable();
        } catch (error) {
          // Error toast already shown by State
        }
      }
    });
  },

  cancelForm() {
    document.getElementById('jobForm').style.display = 'none';
    document.getElementById('jobFormElement').reset();
    this.currentEdit = null;
    this.assignedWorkers = [];
    this.assignedPaints = [];
    this.resetJobFormSession();
    this.renderAssignedWorkers();
    this.renderAssignedPaints();
    this.calculateCost();
    window.AppShell?.refreshFab();
  },

  updateJobFormReview() {
    const review = document.getElementById('jobFormReviewContent');
    if (!review) return;

    const clientId = document.getElementById('jobClient')?.value;
    const clientName = clientId ? this.getClientName(clientId) : '-';
    const status = document.getElementById('jobStatus')?.value || '-';
    const visit = document.getElementById('jobNextVisit')?.value || '-';
    const billing = document.getElementById('billingAmountDisplay')?.textContent || '0.00 €';
    const profit = document.getElementById('profitDisplay')?.textContent || '0.00 €';
    const materialsCount = (this.assignedPaints || []).length;
    const workersCount = (this.assignedWorkers || []).length;

    review.innerHTML = `
      <div><strong>Πελάτης:</strong> ${Utils.escapeHtml(clientName)}</div>
      <div><strong>Κατάσταση:</strong> ${Utils.escapeHtml(status)}</div>
      <div><strong>Επόμενη επίσκεψη:</strong> ${Utils.escapeHtml(visit)}</div>
      <div><strong>Υλικά:</strong> ${materialsCount}</div>
      <div><strong>Εργάτες:</strong> ${workersCount}</div>
      <div><strong>Χρέωση:</strong> ${billing}</div>
      <div><strong>Κέρδος:</strong> ${profit}</div>
    `;
  },


  filterJobs() {
    const searchTerm = document.getElementById('jobSearch').value;
    const statusFilter = document.getElementById('statusFilter').value;

    let jobs = State.data.jobs;

    if (searchTerm) {
      jobs = jobs.filter(job => {
        const clientName = this.getClientName(job.clientId);
        return Utils.matchesSearch([job.id, job.title, job.type, job.status, job.address, clientName], searchTerm);
      });
    }

    // Filter by status
    if (statusFilter) {
      jobs = jobs.filter(job => job.status === statusFilter);
    }

    // Sort by date - newest first
    jobs = Utils.sortBy(jobs, 'date', 'desc');

    this.renderTableWithLazy(jobs, { reset: true });
  },

  openInMaps(address) {
    Utils.openInMaps(address);
  },

  // ==================== Worker Assignment Methods ====================

  openWorkerAssignmentModal() {
    const workers = State.read('workers') || [];
    const activeWorkers = workers.filter(w => w.status === 'active');

    if (activeWorkers.length === 0) {
      Toast.warning('Δεν υπάρχουν διαθέσιμοι εργάτες. Προσθέστε εργάτες πρώτα.');
      return;
    }

    const content = `
      <div class="form-grid">
        <div class="form-group span-2">
          <label>Επιλέξτε Εργάτη <span class="required">*</span></label>
          <select id="modalWorkerSelect">
            <option value="">Επιλέξτε εργάτη...</option>
            ${activeWorkers.map(w => `
              <option value="${w.id}" data-rate="${w.hourlyRate}" data-type="${w.workerType || w.worker_type || 'employee'}">
                ${w.name}${w.specialty ? ` - ${w.specialty}` : ''} - ${(w.workerType || w.worker_type) === 'owner' ? 'Ιδιοκτήτης' : 'Υπάλληλος'} (${Utils.formatCurrency(w.hourlyRate)}/ώρα)
              </option>
            `).join('')}
          </select>
        </div>

        <div class="form-group">
          <label>Ώρες Εργασίας <span class="required">*</span></label>
          <input type="number" id="modalWorkerHours" min="1" value="1">
        </div>

        <div class="form-group">
          <label>Ωρομίσθιο</label>
          <input type="text" id="modalWorkerRate" readonly value="0.00 €">
        </div>

        <div class="form-group span-2">
          <label>Κόστος Εργασίας</label>
          <input type="text" id="modalWorkerCost" readonly value="0.00 €" style="font-weight: bold; color: var(--accent-primary);">
          <small style="color: var(--text-muted); display: block; margin-top: 0.25rem;">
            Οι ιδιοκτήτες δεν προστίθενται στα έξοδα. Οι ώρες τους μετράνε στη χρέωση.
          </small>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn-ghost" onclick="Modal.close()">Ακύρωση</button>
      <button class="btn-primary" id="confirmAddWorkerBtn">
        <i class="fas fa-check"></i> Προσθήκη
      </button>
    `;

    Modal.open({
      title: '<i class="fas fa-user-plus"></i> Προσθήκη Εργάτη στην Εργασία',
      content: content,
      footer: footer,
      size: 'md'
    });

    // Event listeners for modal
    setTimeout(() => {
      const workerSelect = document.getElementById('modalWorkerSelect');
      const hoursInput = document.getElementById('modalWorkerHours');
      const rateInput = document.getElementById('modalWorkerRate');
      const costInput = document.getElementById('modalWorkerCost');

      const updateCost = () => {
        const selectedOption = workerSelect.options[workerSelect.selectedIndex];
        const rate = parseFloat(selectedOption.dataset.rate || 0);
        const workerType = selectedOption.dataset.type || 'employee';
        const hours = parseFloat(hoursInput.value || 0);
        const cost = workerType === 'owner' ? 0 : rate * hours;

        rateInput.value = Utils.formatCurrency(rate);
        costInput.value = Utils.formatCurrency(cost);
      };

      workerSelect.addEventListener('change', updateCost);
      hoursInput.addEventListener('input', updateCost);

      // Confirm button
      document.getElementById('confirmAddWorkerBtn').addEventListener('click', () => {
        const workerId = workerSelect.value;
        const hours = parseFloat(hoursInput.value);

        if (!workerId) {
          Toast.error('Επιλέξτε εργάτη');
          return;
        }

        if (!hours || hours <= 0) {
          Toast.error('Εισάγετε έγκυρες ώρες εργασίας');
          return;
        }

        this.addWorkerToJob(workerId, hours);
        Modal.close();
      });
    }, 100);
  },

  // Setup Navigation Buttons
  setupNavigationButtons() {
    const prevBtn = document.getElementById('jobFormPrevStepBtn');
    const nextBtn = document.getElementById('jobFormNextStepBtn');

    if (prevBtn) {
      prevBtn.onclick = () => {
        const prev = this.formSteps[this.currentStepIndex - 1];
        if (prev) this.goToJobStep(prev.id);
      };
    }
    if (nextBtn) {
      nextBtn.onclick = () => {
        const next = this.formSteps[this.currentStepIndex + 1];
        if (next) this.goToJobStep(next.id);
      };
    }
  },

  // Switch Tab Helper
  switchTab(tabName) {
    this.goToJobStep(tabName);
  },

  // Progress Bar Update Method (HIDDEN - keeping for future use)
  updateProgressBar() {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    if (!progressFill || !progressText) return;
    
    // Count completed required fields
    let completed = 0;
    const total = 2;
    
    // 1. Client
    const client = document.getElementById('jobClient')?.value;
    if (client) completed++;
    
    // 2. Status
    const status = document.getElementById('jobStatus')?.value;
    if (status) completed++;
    
    // Update UI
    const percentage = (completed / total) * 100;
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `${completed}/${total} πεδία`;
    
    // Change color based on completion
    if (completed === total) {
      progressFill.style.background = 'var(--success)';
      progressText.style.color = 'var(--success)';
    } else {
      progressFill.style.background = 'linear-gradient(90deg, var(--accent-primary), var(--success))';
      progressText.style.color = 'var(--accent-primary)';
    }
  },

  addWorkerToJob(workerId, hours) {
    const workers = State.read('workers') || [];
    
    // Convert workerId to number for comparison
    const numericWorkerId = Number(workerId);
    const worker = workers.find(w => Number(w.id) === numericWorkerId);

    if (!worker) {
      console.error('❌ Worker not found! workerId:', workerId);
      Toast.error('Ο εργάτης δεν βρέθηκε');
      return;
    }

    // Check if worker already assigned
    const existingIndex = this.assignedWorkers.findIndex(w => Number(w.workerId) === numericWorkerId);
    
    if (existingIndex !== -1) {
      Toast.warning(`Ο ${worker.name} είναι ήδη ανατεθειμένος. Επεξεργαστείτε τις ώρες του.`);
      return;
    }

    const workerType = worker.workerType || worker.worker_type || 'employee';
    const laborCost = workerType === 'owner' ? 0 : hours * worker.hourlyRate;

    this.assignedWorkers.push({
      workerId: worker.id,
      workerName: worker.name,
      workerSpecialty: worker.specialty,
      specialty: worker.specialty,
      workerType,
      hourlyRate: worker.hourlyRate,
      hoursAllocated: hours,
      laborCost: laborCost
    });

    this.renderAssignedWorkers();
    this.calculateCost(); // Recalculate total cost
    this.markJobFormDirty();
    Toast.success(`Ο ${worker.name} προστέθηκε στην εργασία`);
  },

  renderAssignedWorkers() {
    const container = document.getElementById('assignedWorkersContainer');
    
    if (this.assignedWorkers.length === 0) {
      container.innerHTML = `
        <div class="worker-empty-state">
          <i class="fas fa-user-plus"></i>
          <span>Δεν έχουν ανατεθεί εργάτες ακόμα</span>
        </div>
      `;
      return;
    }

    const rows = this.assignedWorkers.map((w, index) => {
      const hours = parseFloat(w.hoursAllocated ?? w.hours_allocated ?? 0) || 0;
      const hourlyRate = parseFloat(w.hourlyRate ?? w.hourly_rate ?? 0) || 0;
      const workerType = this.getWorkerType(w);
      const laborCost = workerType === 'owner'
        ? 0
        : ((w.laborCost !== undefined || w.labor_cost !== undefined)
          ? (parseFloat(w.laborCost ?? w.labor_cost) || 0)
          : hours * hourlyRate);
      const ownerOpportunityCost = workerType === 'owner' ? hours * hourlyRate : 0;
      return {
        ...w,
        index,
        hours,
        hourlyRate,
        laborCost,
        ownerOpportunityCost
      };
    });

    const totalHours = rows.reduce((sum, w) => sum + w.hours, 0);
    const totalLaborCost = rows.reduce((sum, w) => sum + (parseFloat(w.laborCost || 0) || 0), 0);
    const totalOwnerOpportunityCost = rows.reduce((sum, w) => sum + (w.ownerOpportunityCost || 0), 0);

    container.innerHTML = `
      <div class="worker-compact-rows">
        ${rows.map(w => {
          const isOwner = this.getWorkerType(w) === 'owner';
          const primaryCost = isOwner ? w.ownerOpportunityCost : w.laborCost;
          return `
            <article class="worker-compact-row">
              <div class="worker-compact-main">
                <strong>${w.workerName}</strong>
                <span>${isOwner ? 'Ιδιοκτήτης' : 'Υπάλληλος'}${w.workerSpecialty || w.specialty ? ` · ${w.workerSpecialty || w.specialty}` : ''}</span>
              </div>
              <div class="worker-compact-metrics">
                <div>
                  <span>Ώρες</span>
                  <strong>${w.hours.toFixed(1)}h</strong>
                </div>
                <div>
                  <span>Ωρομίσθιο</span>
                  <strong>${Utils.formatCurrency(w.hourlyRate)}</strong>
                </div>
                <div>
                  <span>${isOwner ? 'Αξία χρόνου' : 'Κόστος'}</span>
                  <strong style="color: ${isOwner ? 'var(--warning, #f59e0b)' : 'var(--accent-primary)'};">${Utils.formatCurrency(primaryCost || 0)}</strong>
                </div>
              </div>
              <div class="worker-compact-actions">
                <button class="btn-icon edit-assigned-worker-btn" data-worker-index="${w.index}" title="Επεξεργασία">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-danger remove-assigned-worker-btn" data-worker-index="${w.index}" title="Αφαίρεση">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </article>
          `;
        }).join('')}

        <div class="worker-compact-total">
          <span>Σύνολο</span>
          <strong>${totalHours.toFixed(1)}h</strong>
          <strong>${Utils.formatCurrency(totalLaborCost)}</strong>
          <strong>${Utils.formatCurrency(totalOwnerOpportunityCost)}</strong>
        </div>
      </div>
    `;

    // Add event listeners for edit/remove buttons
    setTimeout(() => {
      const editButtons = container.querySelectorAll('.edit-assigned-worker-btn');
      const removeButtons = container.querySelectorAll('.remove-assigned-worker-btn');

      editButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const index = parseInt(btn.dataset.workerIndex);
          this.editWorkerAssignment(index);
        });
      });

      removeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const index = parseInt(btn.dataset.workerIndex);
          this.removeWorkerAssignment(index);
        });
      });
    }, 0);
  },

  editWorkerAssignment(index) {
    const worker = this.assignedWorkers[index];
    
    const content = `
      <div class="form-grid">
        <div class="form-group span-2">
          <label>Εργάτης</label>
          <input type="text" value="${worker.workerName}${(worker.workerSpecialty || worker.specialty) ? ` - ${worker.workerSpecialty || worker.specialty}` : ''}" readonly>
        </div>

        <div class="form-group">
          <label>Ώρες Εργασίας <span class="required">*</span></label>
          <input type="number" id="editWorkerHours" min="1" value="${worker.hoursAllocated}">
        </div>

        <div class="form-group">
          <label>Ωρομίσθιο</label>
          <input type="text" value="${Utils.formatCurrency(worker.hourlyRate)}/ώρα" readonly>
        </div>

        <div class="form-group">
          <label>Τύπος</label>
          <input type="text" value="${this.getWorkerType(worker) === 'owner' ? 'Ιδιοκτήτης' : 'Υπάλληλος'}" readonly>
        </div>

        <div class="form-group">
          <label>Κόστος Εξόδου</label>
          <input type="text" id="editWorkerCost" readonly value="${Utils.formatCurrency(worker.laborCost)}" style="font-weight: bold; color: var(--accent-primary);">
        </div>
      </div>
    `;

    const footer = `
      <button type="button" class="btn-ghost" onclick="Modal.close()">Ακύρωση</button>
      <button type="button" class="btn-primary" id="confirmEditWorkerBtn">
        <i class="fas fa-save"></i> Αποθήκευση
      </button>
    `;

    Modal.open({
      title: '<i class="fas fa-edit"></i> Επεξεργασία Εργάτη',
      content: content,
      footer: footer,
      size: 'md'
    });

    setTimeout(() => {
      const hoursInput = document.getElementById('editWorkerHours');
      const costInput = document.getElementById('editWorkerCost');
      const confirmBtn = document.getElementById('confirmEditWorkerBtn');

      hoursInput.addEventListener('input', () => {
        const hours = parseFloat(hoursInput.value || 0);
        const cost = this.getWorkerType(worker) === 'owner' ? 0 : hours * worker.hourlyRate;
        costInput.value = Utils.formatCurrency(cost);
      });

      hoursInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          confirmBtn.click();
        }
      });

      confirmBtn.addEventListener('click', () => {
        const newHours = parseFloat(hoursInput.value);

        if (!newHours || newHours <= 0) {
          Toast.error('Εισάγετε έγκυρες ώρες εργασίας');
          return;
        }

        this.assignedWorkers[index].hoursAllocated = newHours;
        this.assignedWorkers[index].laborCost = this.getWorkerType(worker) === 'owner' ? 0 : newHours * worker.hourlyRate;

        this.renderAssignedWorkers();
        this.calculateCost();
        Modal.close();
        Toast.success('Οι ώρες ενημερώθηκαν');
      });
    }, 100);
  },

  removeWorkerAssignment(index) {
    const worker = this.assignedWorkers[index];
    
    Modal.confirm({
      title: 'Αφαίρεση Εργάτη',
      message: `Είστε σίγουροι ότι θέλετε να αφαιρέσετε τον <strong>${worker.workerName}</strong> από την εργασία;`,
      onConfirm: () => {
        this.assignedWorkers.splice(index, 1);
        this.renderAssignedWorkers();
        this.calculateCost();
        Toast.success(`Ο ${worker.workerName} αφαιρέθηκε`);
      }
    });
  },

  // Material Management Methods (stored in legacy `paints` JSON field)
  addPaint(index = null) {
    const editIndex = Number.isInteger(index) ? index : null;
    const editingPaint = editIndex !== null ? this.assignedPaints[editIndex] : null;
    const isEditing = !!editingPaint;

    const content = `
      <div class="form-grid">
        <div class="form-group span-2">
          <label>Όνομα <span class="required">*</span></label>
          <div class="autocomplete-container">
            <input type="text" id="newPaintName" placeholder="Αναζήτηση υλικού..." autocomplete="off">
            <input type="hidden" id="newMaterialStockId">
            <div id="newPaintNameResults" class="autocomplete-results" style="display: none;"></div>
          </div>
        </div>

        <div class="form-group">
          <label>Κατηγορία</label>
          <select id="newMaterialCategory">
            ${MaterialIdentity.categoryOptions('Χρώμα')}
          </select>
        </div>

        <div class="form-group" id="newPaintCodeGroup">
          <label>Κωδικός χρώματος</label>
          <input type="text" id="newPaintCode" placeholder="π.χ. RAL 9010, NCS S0500-N">
        </div>

        <div class="form-group">
          <label>Ποσότητα</label>
          <input type="text" id="newMaterialQuantity" placeholder="π.χ. 10 λίτρα, 2 τεμάχια">
        </div>

        <div class="form-group">
          <label>Κόστος (€)</label>
          <input type="number" id="newMaterialCost" min="0" step="0.01" value="0">
          <small class="text-muted">Συμπληρώνεται αυτόματα από την τιμή του υλικού αποθήκης και την ποσότητα.</small>
        </div>

        <div class="form-group span-2">
          <label class="checkbox-inline" style="align-items: flex-start;">
            <input type="checkbox" id="deductNewMaterialFromStock" style="margin-top: 3px;">
            <span>
              Αφαίρεση από αποθήκη κατά την αποθήκευση
              <small class="text-muted" style="display: block; margin-top: 4px;">
                Ενεργοποιήστε το μόνο αν αυτό το υλικό πρέπει να αφαιρεθεί από το φυσικό απόθεμα.
              </small>
            </span>
          </label>
        </div>

      </div>
    `;

    const footer = `
      <button class="btn-ghost" onclick="Modal.close()">Ακύρωση</button>
      <button class="btn-primary" id="confirmAddPaintBtn">
        <i class="fas fa-${isEditing ? 'save' : 'plus'}"></i> ${isEditing ? 'Αποθήκευση' : 'Προσθήκη'}
      </button>
    `;

    Modal.open({
      title: `<i class="fas fa-boxes"></i> ${isEditing ? 'Επεξεργασία Υλικού' : 'Προσθήκη Υλικού'}`,
      content: content,
      footer: footer,
      size: 'md',
      closeOnBackdrop: false,
      closeOnEscape: false
    });

    setTimeout(() => {
      const confirmBtn = document.getElementById('confirmAddPaintBtn');
      const nameInput = document.getElementById('newPaintName');
      const stockIdInput = document.getElementById('newMaterialStockId');
      const nameResults = document.getElementById('newPaintNameResults');
      const categoryInput = document.getElementById('newMaterialCategory');
      const codeGroup = document.getElementById('newPaintCodeGroup');
      const codeInput = document.getElementById('newPaintCode');
      const quantityInput = document.getElementById('newMaterialQuantity');
      const costInput = document.getElementById('newMaterialCost');
      const deductInput = document.getElementById('deductNewMaterialFromStock');
      const updateCodeVisibility = () => {
        const isColor = MaterialIdentity.normalizeCategory(categoryInput?.value) === 'Χρώμα';
        if (codeGroup) codeGroup.style.display = isColor ? '' : 'none';
        if (!isColor && codeInput) codeInput.value = '';
      };
      categoryInput?.addEventListener('change', updateCodeVisibility);
      updateCodeVisibility();

      const getSelectedStockMaterial = () => {
        if (stockIdInput?.value) {
          const byId = State.read('inventory', stockIdInput.value);
          if (byId) return byId;
        }
        return (State.read('inventory') || []).find(item => {
          return MaterialIdentity.normalizeSearchText(item.name) === MaterialIdentity.normalizeSearchText(nameInput.value);
        }) || null;
      };

      const updateAutoCost = () => {
        const material = getSelectedStockMaterial();
        const unitPrice = this.parseCurrencyInput(material?.unitPrice || material?.unit_price || 0);
        if (!material) {
          costInput.readOnly = false;
          return;
        }

        const quantity = this.parseMaterialQuantity(quantityInput.value);
        const multiplier = quantity > 0 ? quantity : 1;
        costInput.value = (unitPrice * multiplier).toFixed(2);
        costInput.readOnly = true;
        costInput.title = 'Το κόστος υπολογίζεται από την τιμή του υλικού στην αποθήκη επί την ποσότητα';
      };

      if (isEditing) {
        nameInput.value = editingPaint.name || '';
        stockIdInput.value = editingPaint.materialId || editingPaint.material_id || '';
        categoryInput.value = MaterialIdentity.normalizeCategory(editingPaint.category || 'Χρώμα');
        codeInput.value = editingPaint.colorCode || editingPaint.code || '';
        quantityInput.value = editingPaint.quantity || '';
        costInput.value = this.parseCurrencyInput(editingPaint.cost || 0);
        costInput.dataset.manual = 'false';
        deductInput.checked = editingPaint.deductFromStock === true || editingPaint.stockDeducted === true;
        deductInput.disabled = editingPaint.stockDeducted === true;
        updateCodeVisibility();
      } else {
        costInput.dataset.manual = 'false';
      }
      updateAutoCost();

      quantityInput?.addEventListener('input', updateAutoCost);
      costInput?.addEventListener('input', () => {
        if (!getSelectedStockMaterial()) {
          costInput.dataset.manual = 'true';
        }
      });

      const escape = window.Utils && typeof Utils.escapeHtml === 'function'
        ? Utils.escapeHtml.bind(Utils)
        : (value) => String(value || '');
      const renderMaterialResults = () => {
        if (!nameInput || !nameResults) return;
        const matches = MaterialIdentity.search(State.read('inventory') || [], nameInput.value);
        if (!matches.length) {
          nameResults.innerHTML = '<div class="autocomplete-item text-muted">Δεν βρέθηκαν υλικά</div>';
          nameResults.style.display = '';
          return;
        }
        nameResults.innerHTML = matches.map(material => `
          <div class="autocomplete-item" data-material-id="${material.id}">
            <strong>${escape(material.name)}</strong>
            <br>
            <small class="text-muted">
              ${escape(material.category || 'Άλλο')}
              ${material.colorCode || material.color_code ? ` • ${escape(material.colorCode || material.color_code)}` : ''}
              • ${parseFloat(material.stock || 0).toFixed(2)} ${escape(material.unit || '')}
            </small>
          </div>
        `).join('');
        nameResults.style.display = '';
        nameResults.querySelectorAll('.autocomplete-item[data-material-id]').forEach(item => {
          item.addEventListener('mousedown', (event) => {
            event.preventDefault();
            const material = State.read('inventory', item.dataset.materialId);
            if (!material) return;
            nameInput.value = material.name || '';
            stockIdInput.value = material.id || '';
            categoryInput.value = MaterialIdentity.normalizeCategory(material.category);
            codeInput.value = material.colorCode || material.color_code || '';
            costInput.dataset.manual = 'false';
            updateAutoCost();
            updateCodeVisibility();
            nameResults.style.display = 'none';
          });
        });
      };

      nameInput?.addEventListener('focus', renderMaterialResults);
      nameInput?.addEventListener('input', () => {
        stockIdInput.value = '';
        costInput.readOnly = false;
        renderMaterialResults();
      });
      nameInput?.addEventListener('blur', () => {
        setTimeout(() => {
          if (nameResults) nameResults.style.display = 'none';
          const material = (State.read('inventory') || []).find(item => {
            return MaterialIdentity.normalizeSearchText(item.name) === MaterialIdentity.normalizeSearchText(nameInput.value);
          });
          if (!material) return;
          nameInput.value = material.name || nameInput.value;
          stockIdInput.value = material.id || '';
          categoryInput.value = MaterialIdentity.normalizeCategory(material.category);
          codeInput.value = material.colorCode || material.color_code || '';
          updateAutoCost();
          updateCodeVisibility();
        }, 150);
      });

      if (confirmBtn && nameInput) {
        confirmBtn.addEventListener('click', async () => {
          const paintName = nameInput.value.trim();
          const category = MaterialIdentity.normalizeCategory(categoryInput?.value || 'Χρώμα');
          const paintCode = category === 'Χρώμα' ? codeInput.value.trim() : '';
          const quantity = quantityInput.value.trim();
          const deductFromStock = deductInput?.checked === true;
          const inventory = State.read('inventory') || [];
          const candidate = MaterialIdentity.prepare({ name: paintName, category, colorCode: paintCode });
          let stockMaterial = getSelectedStockMaterial();

          if (!paintName) {
            Toast.error('Παρακαλώ εισάγετε όνομα υλικού');
            return;
          }

          const similar = MaterialIdentity.findSimilar(inventory, candidate);
          if (similar && (!stockMaterial || Number(stockMaterial.id) !== Number(similar.id))) {
            const useExisting = await MaterialIdentity.confirmUseExisting(candidate, similar);
            if (useExisting) {
              stockMaterial = similar;
            }
          } else if (similar) {
            stockMaterial = similar;
          }

          if (stockMaterial) {
            stockIdInput.value = stockMaterial.id || '';
            updateAutoCost();
          }

          const cost = stockMaterial
            ? this.getAssignedMaterialLineCost({ materialId: stockMaterial.id, quantity })
            : this.parseCurrencyInput(costInput.value);

          if (deductFromStock && !stockMaterial) {
            Toast.error('Για αφαίρεση από αποθήκη, επιλέξτε υπάρχον υλικό από την αναζήτηση');
            return;
          }

          if (deductFromStock) {
            const numericQuantity = this.parseMaterialQuantity(quantity);
            if (numericQuantity <= 0) {
              Toast.error('Για αφαίρεση από αποθήκη, γράψτε αριθμητική ποσότητα');
              return;
            }
            const available = parseFloat(stockMaterial?.stock || 0) || 0;
            const previousMaterialId = Number(editingPaint?.materialId || editingPaint?.material_id || 0);
            const previousQuantity = editingPaint?.stockDeducted
              ? this.parseMaterialQuantity(editingPaint.quantity)
              : 0;
            const additionalQuantity = editingPaint?.stockDeducted && previousMaterialId === Number(stockMaterial.id)
              ? Math.max(0, numericQuantity - previousQuantity)
              : numericQuantity;
            if (additionalQuantity > available) {
              Toast.error(`Δεν υπάρχει αρκετό απόθεμα για "${stockMaterial.name}" (${available} διαθέσιμο, ${additionalQuantity} ζητήθηκε)`);
              return;
            }
          }

          const nextPaint = {
            name: stockMaterial ? stockMaterial.name : paintName,
            category: stockMaterial ? stockMaterial.category : category,
            code: stockMaterial ? (stockMaterial.colorCode || stockMaterial.color_code || paintCode) : paintCode,
            colorCode: stockMaterial ? (stockMaterial.colorCode || stockMaterial.color_code || paintCode) : paintCode,
            quantity,
            cost,
            materialId: stockMaterial ? stockMaterial.id : null,
            unit: stockMaterial ? stockMaterial.unit : null,
            deductFromStock: editingPaint?.stockDeducted ? true : deductFromStock,
            stockDeducted: editingPaint?.stockDeducted === true,
            stockDeductedAt: editingPaint?.stockDeductedAt || null,
            stockMovementId: editingPaint?.stockMovementId || null
          };

          if (isEditing && editingPaint?.stockDeducted === true) {
            try {
              await this.adjustDeductedMaterialStockChange(editingPaint, nextPaint, this.currentEdit);
            } catch (error) {
              console.error('[Jobs] Stock adjustment failed:', error);
              Toast.error('Δεν έγινε η διορθωτική κίνηση αποθήκης: ' + error.message);
              return;
            }
          }

          if (isEditing) {
            this.assignedPaints[editIndex] = nextPaint;
          } else {
            this.assignedPaints.push(nextPaint);
          }

          this.renderAssignedPaints();
          this.calculateCost();
          Modal.close();
          await this.autoSaveMaterialsIfEditing(isEditing ? 'Το υλικό ενημερώθηκε' : 'Το υλικό προστέθηκε');
        });

        // Enter key support
        [nameInput, codeInput, quantityInput, costInput].forEach(input => {
          input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              confirmBtn.click();
            }
          });
        });

        if (!Utils.isMobile()) {
          nameInput.focus();
        }
      }
    }, 100);
  },

  renderAssignedPaints() {
    const container = document.getElementById('paintsContainer');
    
    if (!container) return;
    this.reconcileAssignedPaintStockFlags();

    if (this.assignedPaints.length === 0) {
      container.innerHTML = '<p class="text-muted" style="font-style: italic; margin: 10px 0;">Δεν έχουν προστεθεί υλικά ακόμα</p>';
      this.applyMinimumCostFields();
      return;
    }

    const materialsTotal = this.getMaterialCostTotal();

    container.innerHTML = `
      <div class="table-wrapper">
        <table class="data-table" style="margin-top: 10px;">
          <thead>
            <tr>
              <th style="width: 110px;">Ενέργειες</th>
              <th>Όνομα</th>
              <th>Κωδικός</th>
              <th>Ποσότητα</th>
              <th>Κόστος</th>
            </tr>
          </thead>
          <tbody>
            ${this.assignedPaints.map((paint, index) => `
              <tr>
                <td>
                  <button class="btn-icon edit-paint-btn" data-paint-index="${index}" title="Επεξεργασία">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn-icon remove-paint-btn" data-paint-index="${index}" title="Αφαίρεση">
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
                <td>
                  <strong>${paint.name}</strong>
                  ${paint.materialId || paint.material_id ? '<br><small class="text-muted">Συνδεδεμένο με Αποθήκη</small>' : ''}
                  ${paint.deductFromStock && !paint.stockDeducted ? '<br><small style="color: var(--color-warning);"><i class="fas fa-box-open"></i> Θα αφαιρεθεί από αποθήκη</small>' : ''}
                  ${paint.stockDeducted ? '<br><small style="color: var(--success);"><i class="fas fa-check"></i> Αφαιρέθηκε από αποθήκη</small>' : ''}
                </td>
                <td>${paint.code || '-'}</td>
                <td>${paint.quantity || '-'}</td>
                <td><strong>${this.formatMaterialCurrency(this.getAssignedMaterialLineCost(paint))}</strong></td>
              </tr>
            `).join('')}
            <tr style="background: var(--bg-secondary); font-weight: bold;">
              <td colspan="4" style="text-align: right;">ΣΥΝΟΛΟ ΥΛΙΚΩΝ:</td>
              <td><strong style="color: var(--accent-primary);">${this.formatMaterialCurrency(materialsTotal)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    this.applyMinimumCostFields();

    // Add event listeners for edit/remove buttons
    setTimeout(() => {
      const editButtons = container.querySelectorAll('.edit-paint-btn');
      const removeButtons = container.querySelectorAll('.remove-paint-btn');

      editButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const index = parseInt(btn.dataset.paintIndex, 10);
          this.addPaint(index);
        });
      });
      
      removeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const index = parseInt(btn.dataset.paintIndex, 10);
          this.removePaint(index);
        });
      });
    }, 0);
  },

  removePaint(index) {
    const paint = this.assignedPaints[index];
    
    Modal.confirm({
      title: 'Αφαίρεση Υλικού',
      message: `Θέλετε σίγουρα να αφαιρέσετε το υλικό "${paint.name}";`,
      confirmText: 'Αφαίρεση',
      confirmClass: 'btn-danger',
      onConfirm: async () => {
        this.assignedPaints.splice(index, 1);
        this.renderAssignedPaints();
        this.calculateCost();
        await this.autoSaveMaterialsIfEditing('Το υλικό αφαιρέθηκε');
      }
    });
  },

  async autoSaveMaterialsIfEditing(successMessage = 'Τα υλικά ενημερώθηκαν') {
    this.markJobFormDirty();
    Toast.success(`${successMessage}. Πατήστε «Αποθήκευση» για οριστική εφαρμογή.`);
  },

  cleanup() {
    document.getElementById('addJobBtn')?.removeEventListener('click', this.addBtnHandler);
    document.getElementById('jobFormElement')?.removeEventListener('submit', this.formSubmitHandler);
    document.getElementById('jobForm')?.removeEventListener('click', this.tabClickHandler);
    document.getElementById('cancelJobFormBtn')?.removeEventListener('click', this.cancelBtnHandler);
    document.getElementById('jobSearch')?.removeEventListener('input', this.searchInputHandler);
    document.getElementById('statusFilter')?.removeEventListener('change', this.statusFilterHandler);
    document.getElementById('jobClient')?.removeEventListener('change', this.clientSelectHandler);
    document.getElementById('addWorkerToJobBtn')?.removeEventListener('click', this.addWorkerBtnHandler);
    document.getElementById('addPaintBtn')?.removeEventListener('click', this.addPaintBtnHandler);
    document.getElementById('contentArea')?.removeEventListener('click', this.tableClickHandler);

    Object.entries(this.costFieldHandlers).forEach(([fieldId, handler]) => {
      document.getElementById(fieldId)?.removeEventListener('input', handler);
    });
    Object.entries(this.costBlurHandlers).forEach(([fieldId, handler]) => {
      document.getElementById(fieldId)?.removeEventListener('blur', handler);
    });

    Object.values(this.visitDateHandlers).forEach(stored => {
      stored?.target?.removeEventListener(stored.event, stored.handler);
    });

    const removePickerHook = (picker, handler) => {
      if (!picker || !handler) return;
      ['onChange', 'onValueUpdate', 'onClose'].forEach(name => {
        picker.config[name] = picker.config[name].filter(existing => existing !== handler);
      });
    };

    removePickerHook(document.getElementById('jobNextVisit')?._flatpickr, this.visitDatePickerHandlers.start);
    removePickerHook(document.getElementById('jobVisitEndDate')?._flatpickr, this.visitDatePickerHandlers.end);

    this.tableClickHandler = null;
    this.formSubmitHandler = null;
    this.addBtnHandler = null;
    this.clearBtnHandler = null;
    this.clientSelectHandler = null;
    this.costFieldHandlers = {};
    this.costBlurHandlers = {};
    this.visitDateHandlers = {};
    this.visitDatePickerHandlers = {};
    this.tabClickHandler = null;
    this.addWorkerBtnHandler = null;
    this.addPaintBtnHandler = null;
    this.cancelBtnHandler = null;
    this.searchInputHandler = null;
    this.statusFilterHandler = null;
  }
};


