/* ========================================
   Jobs View - Διαχείριση Εργασιών
   ======================================== */

window.JobsView = {
  currentEdit: null,

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

  render(container) {
    const jobs = State.read('jobs') || [];
    const clients = State.read('clients') || [];
    const inventory = State.read('inventory') || [];

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
      <div id="jobForm" class="card" style="display: none;">
        <h2 id="formTitle">Νέα Εργασία</h2>
        
        <form id="jobFormElement">
          
          <!-- Tab Navigation -->
          <div class="tabs-nav">
            <button type="button" class="tab-btn active" data-tab="basic">
              <i class="fas fa-info-circle"></i>
              <span>Βασικά</span>
            </button>
            <button type="button" class="tab-btn" data-tab="details">
              <i class="fas fa-paint-roller"></i>
              <span>Εργασία & Υλικά</span>
            </button>
            <button type="button" class="tab-btn" data-tab="costs">
              <i class="fas fa-euro-sign"></i>
              <span>Κόστος & Εργάτες</span>
            </button>
            <button type="button" class="tab-btn" data-tab="notes">
              <i class="fas fa-sticky-note"></i>
              <span>Σημειώσεις</span>
            </button>
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

              <div class="form-group span-2" id="jobVisitsFormSection" style="margin-top: 20px;">
                ${this.renderVisitsSection(null, 'edit')}
              </div>
            </div>
            
            <!-- Navigation Buttons -->
            <div class="form-actions" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color); gap: 12px;">
              <button type="button" class="btn btn-primary" id="nextToDetailsBtn">
                Επόμενο: Εργασία & Υλικά <i class="fas fa-arrow-right"></i>
              </button>
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
                <label class="checkbox-inline" style="margin-top: 12px;">
                  <input type="checkbox" id="deductMaterialsFromStock">
                  Αφαίρεση από αποθήκη κατά την αποθήκευση
                </label>
                <small class="text-muted" style="display: block; margin-top: 4px;">
                  Χρησιμοποιήστε το μόνο όταν τα υλικά πρέπει να αφαιρεθούν από τη φυσική αποθήκη.
                </small>
                <div id="paintsContainer" style="margin-top: 15px;">
                  <!-- Materials will appear here -->
                </div>
              </div>
            </div>
            
            <!-- Navigation Buttons -->
            <div class="form-actions" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color); gap: 12px;">
              <button type="button" class="btn btn-ghost" id="backToBasicBtn">
                <i class="fas fa-arrow-left"></i> Πίσω: Βασικά
              </button>
              <button type="button" class="btn btn-primary" id="nextToCostsBtn">
                Επόμενο: Κόστος & Εργάτες <i class="fas fa-arrow-right"></i>
              </button>
            </div>
          </div>

          <!-- Tab: Κόστος & Εργάτες -->
          <div class="tab-content" id="tab-costs">
            <div class="form-grid">
              <!-- Εργάτες Section -->
              <div class="form-group span-2" style="margin-bottom: 20px;">
                <h4 style="margin-bottom: 10px;"><i class="fas fa-users"></i> Εργάτες</h4>
                <button type="button" class="btn btn-secondary" id="addWorkerToJobBtn">
                  <i class="fas fa-user-plus"></i> Προσθήκη Εργάτη
                </button>
                <div id="assignedWorkersContainer" style="margin-top: 15px;">
                  <!-- Workers table will appear here -->
                </div>
              </div>

              <!-- Divider -->
              <div class="form-group span-2" style="border-top: 2px solid var(--border-color); margin: 20px 0;"></div>

              <!-- Κοστολόγηση Section -->
              <div class="form-group span-2">
                <h4 style="margin-bottom: 10px;"><i class="fas fa-euro-sign"></i> Κοστολόγηση</h4>
              </div>

              <!-- Τρόπος Χρέωσης -->
              <div class="form-group span-2">
                <label>Τρόπος Χρέωσης</label>
                <div class="billing-option-list" role="radiogroup" aria-label="Τρόπος Χρέωσης">
                  <label class="billing-option is-active">
                    <input type="radio" name="jobBillingType" value="hourly" checked>
                    <span class="billing-option-icon"><i class="fas fa-clock"></i></span>
                    <span class="billing-option-content">
                      <span class="billing-option-title">Χρέωση με ώρες</span>
                      <span class="billing-option-description">Ο πελάτης χρεώνεται με βάση τις ώρες χρέωσης και την τιμή/ώρα.</span>
                      <span class="billing-option-meta">Έσοδα = Ώρες × Τιμή/ώρα</span>
                    </span>
                  </label>
                  <label class="billing-option">
                    <input type="radio" name="jobBillingType" value="fixed">
                    <span class="billing-option-icon"><i class="fas fa-handshake"></i></span>
                    <span class="billing-option-content">
                      <span class="billing-option-title">Συμφωνημένη τιμή</span>
                      <span class="billing-option-description">Η τιμή κλειδώνει από πριν, όσες επισκέψεις κι αν χρειαστούν.</span>
                      <span class="billing-option-meta">Οι ώρες μένουν για κέρδος/ανάλυση</span>
                    </span>
                  </label>
                </div>
                <small class="text-muted" style="display: block; margin-top: 4px;">
                  Με συμφωνημένη τιμή τα έσοδα είναι σταθερά, όσες επισκέψεις κι αν χρειαστούν. Οι ώρες καταγράφονται για ανάλυση κέρδους.
                </small>
              </div>

              <div class="form-group">
                <label title="Συμπληρώνεται αυτόματα από τα υλικά και μπορεί να αυξηθεί για έξτρα κόστος">
                  Κόστος Υλικών (€) <i class="fas fa-info-circle" style="font-size: 0.8em; color: var(--text-muted);"></i>
                </label>
                <input type="number" id="jobMaterialsCost" min="0" value="0" 
                       title="Δεν μπορεί να είναι μικρότερο από το άθροισμα των υλικών">
              </div>

              <div class="form-group">
                <label title="Χιλιόμετρα μετακίνησης για την εργασία">
                  Χιλιόμετρα <i class="fas fa-info-circle" style="font-size: 0.8em; color: var(--text-muted);"></i>
                </label>
                <input type="number" id="jobKilometers" min="0" value="0"
                       title="Χιλιόμετρα μετακίνησης για την εργασία (έξοδα)">
              </div>

              <div class="form-group" id="jobBillingHoursGroup">
                <label title="Συμπληρώνεται αυτόματα από τις ώρες εργασίας και μπορεί να αυξηθεί">
                  Ώρες Χρέωσης <i class="fas fa-info-circle" style="font-size: 0.8em; color: var(--text-muted);"></i>
                </label>
                <input type="number" id="jobBillingHours" min="0" value="0"
                       title="Δεν μπορεί να είναι μικρότερο από τις συνολικές ώρες εργασίας">
              </div>

              <div class="form-group" id="jobBillingRateGroup">
                <label title="Η τιμή ανά ώρα που χρεώνεις τον πελάτη για αυτή την εργασία">
                  Τιμή Χρέωσης/Ώρα (€) <i class="fas fa-info-circle" style="font-size: 0.8em; color: var(--text-muted);"></i>
                </label>
                <input type="number" id="jobBillingRate" min="0" value="50"
                       title="Προτείνεται από τις ρυθμίσεις, αλλά αλλάζει ανά εργασία">
              </div>

              <div class="form-group" id="jobAgreedPriceGroup" style="display: none;">
                <label title="Η τιμή που συμφωνήθηκε με τον πελάτη για όλο το έργο">
                  Συμφωνημένη Τιμή (€) <i class="fas fa-info-circle" style="font-size: 0.8em; color: var(--text-muted);"></i>
                </label>
                <input type="number" id="jobAgreedPrice" min="0" step="0.01" value="0"
                       title="Σταθερή τιμή για όλο το έργο">
              </div>

              <div class="form-group span-2" id="jobPaymentsFormSection" style="margin-top: 20px;">
                ${this.renderPaymentsSection(null, 'edit')}
              </div>

              <!-- Financial Summary -->
              <div class="form-group span-2" style="margin-top: 20px;">
                <h4 style="margin-bottom: 10px;"><i class="fas fa-calculator"></i> Σύνοψη</h4>
                <div class="financial-summary">
                  <!-- Expenses Card -->
                  <div class="financial-card expenses">
                    <div class="financial-header">
                      <i class="fas fa-arrow-down"></i>
                      <span>ΕΞΟΔΑ</span>
                    </div>
                    <div class="financial-body">
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
                        <span>Σύνολο</span>
                        <strong id="totalExpensesDisplay">0.00 €</strong>
                      </div>
                    </div>
                  </div>

                  <!-- Revenue Card -->
                  <div class="financial-card revenue">
                    <div class="financial-header">
                      <i class="fas fa-arrow-up"></i>
                      <span>ΕΣΟΔΑ</span>
                    </div>
                    <div class="financial-body">
                      <div class="financial-row">
                        <span>Χρέωση</span>
                        <strong id="billingAmountDisplay">0.00 €</strong>
                      </div>
                      <div class="financial-row total">
                        <span>Σύνολο</span>
                        <strong id="totalCostDisplay">0.00 €</strong>
                      </div>
                    </div>
                  </div>

                  <!-- Profit Card -->
                  <div class="financial-card profit">
                    <div class="financial-header">
                      <i class="fas fa-chart-line"></i>
                      <span>ΚΕΡΔΟΣ</span>
                    </div>
                    <div class="financial-body">
                      <div class="profit-summary-main">
                        <span class="profit-summary-label">Καθαρό κέρδος</span>
                        <strong id="profitDisplay">0.00 €</strong>
                      </div>
                      <div class="profit-summary-meta">
                        <span>Κέρδος ανά ώρα</span>
                        <strong id="profitPerHourDisplay">-</strong>
                      </div>
                    </div>
                  </div>

                  <!-- Owner Cost Card -->
                  <div class="financial-card owner-cost">
                    <div class="financial-header">
                      <i class="fas fa-user-clock"></i>
                      <span>ΚΟΣΤΟΣ ΙΔΙΟΚΤΗΤΗ</span>
                    </div>
                    <div class="financial-body">
                      <div class="financial-row">
                        <span>Κρυφό κόστος ιδιοκτήτη</span>
                        <strong id="ownerOpportunityCostDisplay">0.00 €</strong>
                      </div>
                      <div class="financial-row total">
                        <span>Κέρδος με κόστος ιδιοκτήτη</span>
                        <strong id="economicProfitDisplay">0.00 €</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Navigation Buttons -->
            <div class="form-actions" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color); gap: 12px;">
              <button type="button" class="btn btn-ghost" id="backToDetailsBtn">
                <i class="fas fa-arrow-left"></i> Πίσω: Εργασία & Υλικά
              </button>
              <button type="button" class="btn btn-primary" id="nextToNotesBtn">
                Επόμενο: Σημειώσεις <i class="fas fa-arrow-right"></i>
              </button>
            </div>
          </div>

          <!-- Tab: Σημειώσεις -->
          <div class="tab-content" id="tab-notes">
            <div class="form-grid">
              <div class="form-group span-2">
                <label>Σημειώσεις</label>
                <textarea id="jobNotes" rows="8"></textarea>
              </div>
            </div>
            
            <!-- Navigation Buttons -->
            <div class="form-actions" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color); gap: 12px;">
              <button type="button" class="btn btn-ghost" id="backToCostsBtn">
                <i class="fas fa-arrow-left"></i> Πίσω: Κόστος & Εργάτες
              </button>
            </div>
          </div>

          <!-- Actions -->
          <div class="form-actions" style="gap: 12px;">
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-save"></i> Αποθήκευση
            </button>
            <button type="button" class="btn btn-ghost" id="cancelJobFormBtn">
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
  },
  
  setupEventListeners() {
    // Tab navigation with event delegation
    const formElement = document.getElementById('jobFormElement');
    if (formElement) {
      // Remove old tab handler
      if (this.tabClickHandler) {
        formElement.removeEventListener('click', this.tabClickHandler);
      }
      
      // Create new handler with delegation
      this.tabClickHandler = (e) => {
        const tabBtn = e.target.closest('.tab-btn');
        if (tabBtn) {
          e.preventDefault();
          const targetTab = tabBtn.dataset.tab;
          
          // Remove active class from all tabs and contents
          document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
          
          // Add active class to clicked tab and corresponding content
          tabBtn.classList.add('active');
          document.getElementById(`tab-${targetTab}`).classList.add('active');
        }
      };
      
      formElement.addEventListener('click', this.tabClickHandler);
    }

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
    if (cancelBtn) {
      if (this.cancelBtnHandler) {
        cancelBtn.removeEventListener('click', this.cancelBtnHandler);
      }
      this.cancelBtnHandler = () => this.cancelForm();
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
      };
      clientSelect.addEventListener('change', this.clientSelectHandler);
    }

    // Add event listeners for progress bar updates on required fields
    const jobStatus = document.getElementById('jobStatus');
    
    if (jobStatus) {
      jobStatus.addEventListener('change', () => this.updateProgressBar());
    }

    // Navigation buttons
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
        this.costFieldHandlers[fieldId] = () => this.calculateCost();
        field.addEventListener('input', this.costFieldHandlers[fieldId]);

        if (fieldId === 'jobMaterialsCost' || fieldId === 'jobBillingHours') {
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
      return Utils.renderEmptyState(
        'fa-briefcase',
        'Δεν υπάρχουν εργασίες',
        'Δημιουργήστε την πρώτη σας εργασία!'
      );
    }

    // Sort by job date - latest first
    const sortedJobs = Utils.sortBy(jobs, 'date', 'desc');

    return `
      <div class="table-wrapper">
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
          ${sortedJobs.map(job => {
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
                <button class="btn-icon view-job-btn" data-job-id="${job.id}" title="Προβολή">
                  <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon edit-job-btn" data-job-id="${job.id}" title="Επεξεργασία">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-danger delete-job-btn" data-job-id="${job.id}" title="Διαγραφή">
                  <i class="fas fa-trash"></i>
                </button>
              </td>
              <td title="${clientName}">${clientName}</td>
              <td><span class="status-pill status-${job.status?.toLowerCase().replace(/\s+/g, '-')}">${Utils.translateStatus(job.status)}</span></td>
              <td>${this.formatVisitSchedule(job) !== '-' ? `<strong style="color: var(--accent-primary);">${this.formatVisitSchedule(job)}</strong>` : '-'}</td>
              <td title="${fin.billingType === 'fixed' ? 'Συμφωνημένη τιμή' : 'Χρέωση με ώρες'}"><strong>${Utils.formatCurrency(billingAmount)}</strong>${fin.balance > 0.005 && fin.paidAmount > 0 ? `<br><small style="color: var(--warning, #f59e0b);">Υπόλοιπο: ${Utils.formatCurrency(fin.balance)}</small>` : ''}</td>
              <td title="Κέρδος: ${Utils.formatCurrency(profit)}"><strong style="color: ${profitColor};">${profitSign}${Utils.formatCurrency(profit)}</strong></td>
            </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      </div>
    `;
  },

  getClientName(clientId) {
    const client = State.data.clients.find(c => Number(c.id) === Number(clientId));
    return client ? client.name : 'Άγνωστος';
  },

  showAddForm() {
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
    
    // Reset to first tab
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector('.tab-btn[data-tab="basic"]').classList.add('active');
    document.getElementById('tab-basic').classList.add('active');
    
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
    const normalized = String(value || '')
      .replace(/\./g, '')
      .replace(',', '.')
      .replace(/[^\d.-]/g, '');
    const parsed = parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  },

  getMaterialCostTotal() {
    return this.assignedPaints.reduce((sum, material) => {
      return sum + this.parseCurrencyInput(material.cost ?? material.totalCost ?? 0);
    }, 0);
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

  /** Επισκέψεις της εργασίας από το state */
  getVisitsForJob(jobId) {
    const visits = State.read('jobVisits') || [];
    return visits.filter(v => Number(v.jobId || v.job_id) === Number(jobId));
  },

  /** Πληρωμές πελάτη της εργασίας από το state */
  getPaymentsForJob(jobId) {
    const payments = State.read('jobPayments') || [];
    return payments.filter(p => Number(p.jobId || p.job_id) === Number(jobId));
  },

  /** Αθροίσματα ωρών/κόστους μιας επίσκεψης */
  getVisitTotals(visit) {
    let workers = visit.workers;
    if (typeof workers === 'string') {
      try { workers = JSON.parse(workers); } catch (e) { workers = []; }
    }
    if (!Array.isArray(workers)) workers = [];
    const totals = { totalHours: 0, laborCost: 0, ownerHours: 0, ownerOpportunityCost: 0, workers: [] };
    workers.forEach(w => {
      const hours = parseFloat(w.hours ?? w.hoursAllocated ?? w.hours_allocated ?? 0) || 0;
      const rate = parseFloat(w.hourlyRate ?? w.hourly_rate ?? 0) || 0;
      const type = (w.workerType || w.worker_type) === 'owner' ? 'owner' : 'employee';
      const ownerOpportunityCost = type === 'owner' ? hours * rate : 0;
      const laborCost = type === 'owner' ? 0 : (
        (w.laborCost !== undefined || w.labor_cost !== undefined)
          ? (parseFloat(w.laborCost ?? w.labor_cost) || 0)
          : hours * rate
      );
      totals.workers.push({
        ...w,
        workerId: w.workerId ?? w.worker_id ?? w.id ?? null,
        workerName: w.workerName ?? w.worker_name ?? w.name ?? 'Εργάτης',
        workerType: type,
        hourlyRate: rate,
        hours,
        laborCost,
        ownerOpportunityCost
      });
      totals.totalHours += hours;
      if (type === 'owner') {
        totals.ownerHours += hours;
        totals.ownerOpportunityCost += ownerOpportunityCost;
      } else {
        totals.laborCost += laborCost;
      }
    });
    return totals;
  },

  getVisitWorkerActuals(jobId) {
    const actuals = new Map();
    this.getVisitsForJob(jobId).forEach(visit => {
      const totals = this.getVisitTotals(visit);
      totals.workers.forEach(worker => {
        const key = worker.workerId ? `id:${worker.workerId}` : `name:${worker.workerName}`;
        const current = actuals.get(key) || {
          workerId: worker.workerId || null,
          workerName: worker.workerName || 'Εργάτης',
          workerType: worker.workerType || 'employee',
          hourlyRate: parseFloat(worker.hourlyRate || 0) || 0,
          actualHours: 0,
          actualLaborCost: 0,
          ownerOpportunityCost: 0
        };
        current.actualHours += parseFloat(worker.hours || 0) || 0;
        current.actualLaborCost += parseFloat(worker.laborCost || 0) || 0;
        current.ownerOpportunityCost += parseFloat(worker.ownerOpportunityCost || 0) || 0;
        actuals.set(key, current);
      });
    });
    return actuals;
  },

  getVisitAggregateTotals(jobId) {
    return this.getVisitsForJob(jobId).reduce((acc, visit) => {
      const totals = this.getVisitTotals(visit);
      acc.visitCount += 1;
      acc.totalHours += totals.totalHours;
      acc.laborCost += totals.laborCost;
      acc.ownerHours += totals.ownerHours;
      acc.ownerOpportunityCost += totals.ownerOpportunityCost;
      return acc;
    }, { visitCount: 0, totalHours: 0, laborCost: 0, ownerHours: 0, ownerOpportunityCost: 0 });
  },

  renderVisitsSection(jobId, mode = 'edit') {
    const isEdit = mode === 'edit';
    if (!jobId) {
      return `
        <div class="job-subsection">
          <h4><i class="fas fa-clock"></i> Καταγεγραμμένες επισκέψεις</h4>
          <p class="text-muted" style="font-style: italic;">Αποθηκεύστε πρώτα την εργασία για να καταχωρήσετε επισκέψεις.</p>
        </div>
      `;
    }

    const visits = this.getVisitsForJob(jobId)
      .slice()
      .sort((a, b) => String(b.visitDate || b.visit_date || '').localeCompare(String(a.visitDate || a.visit_date || '')));
    const aggregate = this.getVisitAggregateTotals(jobId);
    const actionsHeader = isEdit ? '<th style="width: 80px;">Ενέργειες</th>' : '';

    return `
      <div class="job-subsection">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 10px;">
          <h4 style="margin: 0;"><i class="fas fa-clock"></i> Καταγεγραμμένες επισκέψεις (${visits.length})</h4>
          ${isEdit ? `
            <button type="button" class="btn btn-secondary job-form-add-visit-btn" data-job-id="${jobId}">
              <i class="fas fa-plus"></i> Καταχώρηση Επίσκεψης
            </button>
          ` : ''}
        </div>
        ${visits.length > 0 ? `
          <div class="table-wrapper">
            <table class="data-table" style="margin-top: 10px;">
              <thead>
                <tr>
                  ${actionsHeader}
                  <th>Ημερομηνία</th>
                  <th>Εργάτες / Ώρες</th>
                  <th>Σύνολο Ωρών</th>
                  <th>Κόστος Υπαλλήλων</th>
                  <th>Σημειώσεις</th>
                </tr>
              </thead>
              <tbody>
                ${visits.map(visit => {
                  const totals = this.getVisitTotals(visit);
                  const workersText = totals.workers.length
                    ? totals.workers.map(w => `${w.workerName || 'Εργάτης'}: ${parseFloat(w.hours || 0)}ω`).join('<br>')
                    : '-';
                  return `
                    <tr>
                      ${isEdit ? `
                        <td>
                          <button type="button" class="btn-icon job-form-edit-visit-btn" data-job-id="${jobId}" data-visit-id="${visit.id}" title="Επεξεργασία">
                            <i class="fas fa-edit"></i>
                          </button>
                          <button type="button" class="btn-icon btn-danger job-form-delete-visit-btn" data-job-id="${jobId}" data-visit-id="${visit.id}" title="Διαγραφή">
                            <i class="fas fa-trash"></i>
                          </button>
                        </td>
                      ` : ''}
                      <td><strong>${Utils.formatDate(visit.visitDate || visit.visit_date)}</strong></td>
                      <td>${workersText}</td>
                      <td>${totals.totalHours.toFixed(1)}ω</td>
                      <td style="color: var(--error);">${Utils.formatCurrency(totals.laborCost)}</td>
                      <td>${visit.notes || '-'}</td>
                    </tr>
                  `;
                }).join('')}
                <tr style="background: var(--bg-secondary); font-weight: bold;">
                  ${isEdit ? '<td></td>' : ''}
                  <td colspan="2" style="text-align: right;">ΣΥΝΟΛΟ:</td>
                  <td>${aggregate.totalHours.toFixed(1)}ω</td>
                  <td style="color: var(--error);">${Utils.formatCurrency(aggregate.laborCost)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        ` : '<p class="text-muted" style="font-style: italic;">Δεν έχουν καταγραφεί επισκέψεις ακόμα.</p>'}
      </div>
    `;
  },

  renderPaymentsSection(jobId, mode = 'edit', financials = null) {
    const isEdit = mode === 'edit';
    if (!jobId) {
      return `
        <div class="job-subsection">
          <h4><i class="fas fa-hand-holding-usd"></i> Πληρωμές Πελάτη</h4>
          <p class="text-muted" style="font-style: italic;">Αποθηκεύστε πρώτα την εργασία για να καταχωρήσετε πληρωμές.</p>
        </div>
      `;
    }

    const job = State.read('jobs', jobId);
    const fin = financials || (job ? this.computeJobFinancials(job) : { billingAmount: 0, paidAmount: 0, balance: 0 });
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
            <span><strong>${Utils.formatCurrency(fin.billingAmount || 0)}</strong></span>
          </div>
          <div class="detail-item">
            <label>Πληρωμένο:</label>
            <span style="color: var(--success);"><strong>${Utils.formatCurrency(fin.paidAmount || 0)}</strong></span>
          </div>
          <div class="detail-item">
            <label>Υπόλοιπο:</label>
            <span style="color: ${(fin.balance || 0) > 0.005 ? 'var(--error)' : 'var(--success)'};"><strong>${Utils.formatCurrency(fin.balance || 0)}</strong></span>
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
          <label>Κέρδος ανά Ώρα:</label>
          <span style="color: ${(fin.profitPerHour || 0) >= 0 ? 'var(--success)' : 'var(--error)'};">${fin.profitPerHour === null ? '-' : Utils.formatCurrency(fin.profitPerHour) + '/ώρα'}</span>
        </div>
        <div class="detail-item">
          <label>Ώρες Ιδιοκτήτη:</label>
          <span>${fin.ownerHours.toFixed(1)} ώρες</span>
        </div>
        <div class="detail-item">
          <label>Κρυφό Κόστος Ιδιοκτήτη:</label>
          <span style="color: ${fin.ownerOpportunityCost > 0 ? 'var(--warning, #f59e0b)' : 'var(--success)'};">${Utils.formatCurrency(fin.ownerOpportunityCost)}</span>
        </div>
        <div class="detail-item span-2">
          <label>Κέρδος αν κοστολογηθεί ο ιδιοκτήτης:</label>
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
   * Αν υπάρχουν καταγεγραμμένες επισκέψεις, οι ώρες/εργατικά βγαίνουν από αυτές.
   */
  computeJobFinancials(job) {
    const assignedWorkers = this.parseJsonArray(job.assignedWorkers ?? job.assigned_workers ?? []);

    const visits = this.getVisitsForJob(job.id);
    let laborCost = 0;
    let actualHours = 0;
    let ownerHours = 0;
    let ownerOpportunityCost = 0;
    if (visits.length > 0) {
      visits.forEach(v => {
        const t = this.getVisitTotals(v);
        laborCost += t.laborCost;
        actualHours += t.totalHours;
        ownerHours += t.ownerHours;
        ownerOpportunityCost += t.ownerOpportunityCost;
      });
    } else {
      assignedWorkers.forEach(w => {
        const type = (w.workerType || w.worker_type) === 'owner' ? 'owner' : 'employee';
        const hours = parseFloat(w.hoursAllocated || w.hours_allocated || 0) || 0;
        const rate = parseFloat(w.hourlyRate || w.hourly_rate || 0) || 0;
        actualHours += hours;
        if (type === 'owner') {
          ownerHours += hours;
          ownerOpportunityCost += hours * rate;
        } else {
          laborCost += parseFloat(w.laborCost || w.labor_cost || 0) || 0;
        }
      });
    }

    const materialsCost = parseFloat(job.materialsCost || job.materials_cost || 0);
    const kilometers = parseFloat(job.kilometers || 0);
    const costPerKm = parseFloat(job.costPerKm || job.cost_per_km || 0.5);
    const travelCost = kilometers * costPerKm;
    const totalExpenses = materialsCost + laborCost + travelCost;

    const billingType = job.billingType || job.billing_type || 'hourly';
    const agreedPrice = parseFloat(job.agreedPrice || job.agreed_price || 0) || 0;
    const billingHours = parseFloat(job.billingHours || job.billing_hours || 0);
    const billingRate = parseFloat(job.billingRate || job.billing_rate || 50);
    const billingAmount = (billingType === 'fixed' && agreedPrice > 0)
      ? agreedPrice
      : billingHours * billingRate;

    const profit = billingAmount - totalExpenses;
    const economicProfit = profit - ownerOpportunityCost;
    const payments = this.getPaymentsForJob(job.id);
    const paidAmount = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    return {
      billingType,
      agreedPrice,
      billingHours,
      billingRate,
      billingAmount,
      materialsCost,
      laborCost,
      travelCost,
      totalExpenses,
      profit,
      economicProfit,
      actualHours,
      ownerHours,
      ownerOpportunityCost,
      visitCount: visits.length,
      paidAmount,
      balance: billingAmount - paidAmount,
      profitPerHour: actualHours > 0 ? profit / actualHours : null,
      economicProfitPerHour: actualHours > 0 ? economicProfit / actualHours : null
    };
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
    const workerHoursTotal = this.getAssignedWorkerHoursTotal();
    const materialsInput = document.getElementById('jobMaterialsCost');
    const billingHoursInput = document.getElementById('jobBillingHours');

    if (materialsInput) {
      materialsInput.min = String(materialTotal);
      const shouldAdjust = enforce || document.activeElement !== materialsInput;
      const currentMaterials = parseFloat(materialsInput.value || 0) || 0;
      if (shouldAdjust && currentMaterials < materialTotal) {
        materialsInput.value = materialTotal ? materialTotal.toFixed(2) : '0';
      }
    }

    if (billingHoursInput) {
      billingHoursInput.min = String(workerHoursTotal);
      const shouldAdjust = enforce || document.activeElement !== billingHoursInput;
      const currentHours = parseFloat(billingHoursInput.value || 0) || 0;
      if (shouldAdjust && currentHours < workerHoursTotal) {
        billingHoursInput.value = workerHoursTotal ? workerHoursTotal.toFixed(2) : '0';
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
    const visitTotals = this.currentEdit ? this.getVisitAggregateTotals(this.currentEdit) : { visitCount: 0, laborCost: 0, ownerHours: 0, ownerOpportunityCost: 0, totalHours: 0 };
    const laborCost = visitTotals.visitCount > 0 ? visitTotals.laborCost : this.getEmployeeLaborCost(); // Μόνο οι υπάλληλοι είναι έξοδο
    const ownerFallback = this.assignedWorkers.reduce((sum, worker) => {
      if (this.getWorkerType(worker) !== 'owner') return sum;
      const hours = parseFloat(worker.hoursAllocated || worker.hours_allocated || 0) || 0;
      const rate = parseFloat(worker.hourlyRate || worker.hourly_rate || 0) || 0;
      return sum + (hours * rate);
    }, 0);
    const ownerOpportunityCost = visitTotals.visitCount > 0 ? visitTotals.ownerOpportunityCost : ownerFallback;
    const actualHours = visitTotals.visitCount > 0 ? visitTotals.totalHours : this.getAssignedWorkerHoursTotal();
    const travelCost = kilometers * costPerKm; // Κόστος μετακίνησης
    const totalExpenses = materials + laborCost + travelCost; // Συνολικά έξοδα

    // ΕΣΟΔΑ: συμφωνημένη τιμή ή ώρες × τιμή/ώρα
    const billingAmount = billingType === 'fixed' ? agreedPrice : billingHours * billingRate;
    const totalCharge = billingAmount;

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
    const totalDisplay = document.getElementById('totalCostDisplay');
    const profitDisplay = document.getElementById('profitDisplay');
    const profitPerHourDisplay = document.getElementById('profitPerHourDisplay');
    const ownerOpportunityCostDisplay = document.getElementById('ownerOpportunityCostDisplay');
    const economicProfitDisplay = document.getElementById('economicProfitDisplay');
    
    if (laborDisplay) laborDisplay.textContent = Utils.formatCurrency(laborCost);
    if (materialsDisplay) materialsDisplay.textContent = Utils.formatCurrency(materials);
    if (travelDisplay) travelDisplay.textContent = Utils.formatCurrency(travelCost);
    if (totalExpensesDisplay) totalExpensesDisplay.textContent = Utils.formatCurrency(totalExpenses);
    if (billingAmountDisplay) billingAmountDisplay.textContent = Utils.formatCurrency(billingAmount);
    if (totalDisplay) totalDisplay.textContent = Utils.formatCurrency(totalCharge);
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
      // Switch to basic tab
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.querySelector('.tab-btn[data-tab="basic"]').classList.add('active');
      document.getElementById('tab-basic').classList.add('active');
      if (!Utils.isMobile()) {
        document.getElementById('jobClient').focus();
      }
      return;
    }
    
    if (!jobStatus) {
      console.warn('[Jobs] Missing status');
      Toast.error('Παρακαλώ επιλέξτε κατάσταση');
      // Switch to basic tab
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.querySelector('.tab-btn[data-tab="basic"]').classList.add('active');
      document.getElementById('tab-basic').classList.add('active');
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
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.querySelector('.tab-btn[data-tab="basic"]').classList.add('active');
      document.getElementById('tab-basic').classList.add('active');
      if (!Utils.isMobile()) {
        document.getElementById('jobNextVisit')?.focus();
      }
      return;
    }

    if (nextVisitConverted && visitEndConverted && visitEndConverted < nextVisitConverted) {
      Toast.error('Η Λήξη Επίσκεψης δεν μπορεί να είναι πριν από την Επόμενη Επίσκεψη.');
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.querySelector('.tab-btn[data-tab="basic"]').classList.add('active');
      document.getElementById('tab-basic').classList.add('active');
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

    const jobData = {
      clientId: Number(jobClient), // Convert to number
      type: null,
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
    const laborCost = this.getEmployeeLaborCost(); // Κόστος υπαλλήλων μόνο
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

    const shouldDeductStock = document.getElementById('deductMaterialsFromStock')?.checked === true;
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
        this.refreshJobFormLinkedSections(this.currentEdit);
      }
      this.refreshTable();
      if (typeof State !== 'undefined' && State.refreshCalendarIfNeeded) {
        State.refreshCalendarIfNeeded();
      }
    } catch (error) {
      console.error('❌ Error saving job:', error);
      Toast.error('Σφάλμα κατά την αποθήκευση: ' + error.message);
    }
  },

  validateStockDeduction() {
    const pendingItems = this.assignedPaints.filter(item => !item.stockDeducted);
    if (!pendingItems.length) {
      Toast.info('Τα υλικά έχουν ήδη αφαιρεθεί από την αποθήκη');
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
        notes: `Χρήση στην εργασία #${jobId}`
      });

      item.stockDeducted = true;
      item.stockDeductedAt = new Date().toISOString();
      item.stockMovementId = result?.movement?.id || null;
    }
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
    const container = document.getElementById('jobsTableContainer');
    if (container) {
      container.innerHTML = this.renderTable(jobs);
    }
  },

  refreshJobFormLinkedSections(jobId = this.currentEdit) {
    const visitsContainer = document.getElementById('jobVisitsFormSection');
    if (visitsContainer) {
      visitsContainer.innerHTML = this.renderVisitsSection(jobId, 'edit');
    }

    const paymentsContainer = document.getElementById('jobPaymentsFormSection');
    if (paymentsContainer) {
      const job = jobId ? State.read('jobs', jobId) : null;
      paymentsContainer.innerHTML = this.renderPaymentsSection(jobId, 'edit', job ? this.computeJobFinancials(job) : null);
    }

    this.setupJobFormActionListeners();
  },

  setupJobFormActionListeners() {
    document.querySelectorAll('.job-form-add-visit-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        this.openVisitModal(btn.dataset.jobId, null, 'edit');
      };
    });

    document.querySelectorAll('.job-form-edit-visit-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const visit = (State.read('jobVisits') || []).find(v => Number(v.id) === Number(btn.dataset.visitId));
        this.openVisitModal(btn.dataset.jobId, visit, 'edit');
      };
    });

    document.querySelectorAll('.job-form-delete-visit-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        this.deleteVisit(btn.dataset.visitId, btn.dataset.jobId, 'edit');
      };
    });

    document.querySelectorAll('.job-form-add-payment-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        this.openPaymentModal(btn.dataset.jobId, null, 'edit');
      };
    });

    document.querySelectorAll('.job-form-edit-payment-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const payment = (State.read('jobPayments') || []).find(p => Number(p.id) === Number(btn.dataset.paymentId));
        this.openPaymentModal(btn.dataset.jobId, payment, 'edit');
      };
    });

    document.querySelectorAll('.job-form-delete-payment-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        this.deletePayment(btn.dataset.paymentId, btn.dataset.jobId, 'edit');
      };
    });
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
    const visitTotals = this.getVisitAggregateTotals(job.id);
    const lastVisit = this.getVisitsForJob(job.id)
      .slice()
      .sort((a, b) => String(b.visitDate || b.visit_date || '').localeCompare(String(a.visitDate || a.visit_date || '')))[0];

    const content = `
      <div class="job-details">
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
            <div class="detail-item">
              <label>Τελευταία Καταγραφή:</label>
              <span>${lastVisit ? Utils.formatDate(lastVisit.visitDate || lastVisit.visit_date) : '-'}</span>
            </div>
            <div class="detail-item">
              <label>Επισκέψεις:</label>
              <span>${visitTotals.visitCount}</span>
            </div>
            <div class="detail-item">
              <label>Πραγματικές Ώρες:</label>
              <span>${visitTotals.totalHours.toFixed(1)} ώρες</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4><i class="fas fa-euro-sign"></i> Οικονομική Εικόνα</h4>
          ${this.renderFinancialSummary(job)}
        </div>

        <div class="detail-section">
          ${this.renderVisitsSection(job.id, 'view')}
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

    Modal.open({
      title: `${clientName}`,
      content,
      footer,
      size: 'lg'
    });

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

  // ==================== Job Visits (Επισκέψεις) ====================

  /** Modal καταχώρησης/επεξεργασίας επίσκεψης με ώρες ανά εργάτη */
  openVisitModal(jobId, visit = null, context = 'view') {
    const existingWorkers = visit ? this.getVisitTotals(visit).workers : [];
    const activeWorkers = (State.read('workers') || []).filter(w => w.status === 'active');
    const workersByKey = new Map();
    activeWorkers.forEach(worker => {
      workersByKey.set(`id:${worker.id}`, worker);
    });
    existingWorkers.forEach((worker, index) => {
      const workerId = worker.workerId ?? worker.worker_id ?? null;
      const key = workerId ? `id:${workerId}` : `existing:${index}`;
      if (!workersByKey.has(key)) {
        workersByKey.set(key, {
          id: workerId || '',
          name: worker.workerName || worker.worker_name || 'Ανενεργός εργάτης',
          workerType: worker.workerType || worker.worker_type || 'employee',
          hourlyRate: worker.hourlyRate ?? worker.hourly_rate ?? 0,
          status: 'inactive'
        });
      }
    });
    const workers = Array.from(workersByKey.values());
    const today = new Date().toISOString().split('T')[0];
    const visitDate = visit ? String(visit.visitDate || visit.visit_date || today).substring(0, 10) : today;
    let returnedToJob = false;
    const returnToJob = () => {
      if (returnedToJob) return;
      returnedToJob = true;
      setTimeout(() => {
        if (context === 'edit') {
          this.refreshJobFormLinkedSections(Number(jobId));
          this.renderAssignedWorkers();
          this.calculateCost();
        } else {
          this.viewJob(jobId);
        }
      }, 350);
    };

    const workerRows = workers.map(w => {
      const existing = existingWorkers.find(ew => Number(ew.workerId ?? ew.worker_id) === Number(w.id));
      const hours = existing ? parseFloat(existing.hours || 0) : '';
      const isOwner = this.getWorkerType(w) === 'owner';
      const hourlyRate = parseFloat(w.hourlyRate ?? w.hourly_rate ?? 0) || 0;
      const inactiveText = w.status === 'inactive' ? ' · ανενεργός' : '';
      return `
        <tr>
          <td><strong>${w.name}</strong><br><small class="text-muted">${isOwner ? 'Ιδιοκτήτης' : 'Υπάλληλος'} · ${Utils.formatCurrency(hourlyRate)}/ώρα${inactiveText}</small></td>
          <td style="width: 110px;">
            <input type="number" class="visit-worker-hours" min="0" step="0.5" value="${hours}"
                   placeholder="0"
                   data-worker-id="${w.id}"
                   data-worker-name="${w.name}"
                   data-worker-type="${isOwner ? 'owner' : 'employee'}"
                   data-hourly-rate="${hourlyRate}">
          </td>
        </tr>
      `;
    }).join('');

    const content = `
      <div class="form-grid">
        <div class="form-group">
          <label>Ημερομηνία <span class="required">*</span></label>
          <input type="date" id="visitDateInput" value="${visitDate}">
        </div>
        <div class="form-group span-2">
          <label>Ώρες ανά εργάτη</label>
          ${workers.length > 0 ? `
          <div class="table-wrapper">
            <table class="data-table" style="margin-top: 5px;">
              <thead>
                <tr>
                  <th>Εργάτης</th>
                  <th>Ώρες</th>
                </tr>
              </thead>
              <tbody>${workerRows}</tbody>
            </table>
          </div>
          <small class="text-muted" style="display: block; margin-top: 4px;">
            Αφήστε 0/κενό όσους δεν δούλεψαν. Οι ώρες υπαλλήλων μετράνε ως έξοδο, του ιδιοκτήτη μόνο ως χρόνος.
          </small>
          ` : '<p class="text-muted">Δεν υπάρχουν ενεργοί εργάτες</p>'}
        </div>
        <div class="form-group span-2">
          <label>Σύνολο</label>
          <input type="text" id="visitTotalsPreview" readonly value="0 ώρες · 0.00 € κόστος υπαλλήλων" style="font-weight: bold;">
        </div>
        <div class="form-group span-2">
          <label>Σημειώσεις</label>
          <textarea id="visitNotesInput" rows="2" placeholder="π.χ. Πρώτο χέρι σαλόνι">${visit?.notes || ''}</textarea>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn-ghost" id="cancelVisitModalBtn">Ακύρωση</button>
      <button class="btn-primary" id="confirmVisitBtn">
        <i class="fas fa-save"></i> ${visit ? 'Αποθήκευση' : 'Καταχώρηση'}
      </button>
    `;

    Modal.open({
      title: `<i class="fas fa-clock"></i> ${visit ? 'Επεξεργασία' : 'Καταχώρηση'} Επίσκεψης`,
      content: content,
      footer: footer,
      size: 'md',
      onClose: returnToJob
    });

    setTimeout(() => {
      const updatePreview = () => {
        let totalHours = 0;
        let laborCost = 0;
        document.querySelectorAll('.visit-worker-hours').forEach(input => {
          const hours = parseFloat(input.value || 0) || 0;
          if (hours <= 0) return;
          totalHours += hours;
          if (input.dataset.workerType !== 'owner') {
            laborCost += hours * (parseFloat(input.dataset.hourlyRate || 0) || 0);
          }
        });
        const preview = document.getElementById('visitTotalsPreview');
        if (preview) {
          preview.value = `${totalHours} ώρες · ${Utils.formatCurrency(laborCost)} κόστος υπαλλήλων`;
        }
      };
      document.querySelectorAll('.visit-worker-hours').forEach(input => {
        input.addEventListener('input', updatePreview);
      });
      updatePreview();

      const cancelBtn = document.getElementById('cancelVisitModalBtn');
      if (cancelBtn) {
        cancelBtn.onclick = () => {
          Modal.close();
          returnToJob();
        };
      }

      const confirmBtn = document.getElementById('confirmVisitBtn');
      if (confirmBtn) {
        confirmBtn.onclick = async () => {
          const visitDateValue = document.getElementById('visitDateInput')?.value;
          if (!visitDateValue) {
            Toast.error('Συμπληρώστε ημερομηνία επίσκεψης');
            return;
          }

          const visitWorkers = [];
          document.querySelectorAll('.visit-worker-hours').forEach(input => {
            const hours = parseFloat(input.value || 0) || 0;
            if (hours <= 0) return;
            const rate = parseFloat(input.dataset.hourlyRate || 0) || 0;
            const type = input.dataset.workerType === 'owner' ? 'owner' : 'employee';
            const workerId = Number(input.dataset.workerId);
            visitWorkers.push({
              workerId: Number.isFinite(workerId) && workerId > 0 ? workerId : null,
              workerName: input.dataset.workerName,
              workerType: type,
              hourlyRate: rate,
              hours: hours,
              laborCost: type === 'owner' ? 0 : hours * rate
            });
          });

          const payload = {
            jobId: Number(jobId),
            visitDate: visitDateValue,
            workers: visitWorkers,
            notes: document.getElementById('visitNotesInput')?.value || ''
          };

          try {
            if (visit) {
              await State.update('jobVisits', visit.id, payload);
              Toast.success('Η επίσκεψη ενημερώθηκε');
            } else {
              await State.create('jobVisits', payload);
              Toast.success('Η επίσκεψη καταχωρήθηκε');
            }
            Modal.close();
            this.refreshTable();
            if (State.refreshCalendarIfNeeded) State.refreshCalendarIfNeeded();
            returnToJob();
          } catch (error) {
            console.error('[Jobs] Error saving visit:', error);
          }
        };
      }
    }, 100);
  },

  deleteVisit(visitId, jobId, context = 'view') {
    Modal.confirm({
      title: 'Διαγραφή Επίσκεψης',
      message: 'Θέλετε σίγουρα να διαγράψετε αυτή την επίσκεψη; Οι ώρες της δεν θα μετράνε πλέον στα οικονομικά.',
      onConfirm: async () => {
        try {
          await State.delete('jobVisits', visitId);
          Toast.success('Η επίσκεψη διαγράφηκε');
          this.refreshTable();
          if (State.refreshCalendarIfNeeded) State.refreshCalendarIfNeeded();
          setTimeout(() => {
            if (context === 'edit') {
              this.refreshJobFormLinkedSections(Number(jobId));
              this.renderAssignedWorkers();
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

  // ==================== Job Payments (Πληρωμές Πελάτη) ====================

  openPaymentModal(jobId, payment = null, context = 'view') {
    const job = State.read('jobs', jobId);
    const fin = job ? this.computeJobFinancials(job) : null;
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
              jobId: Number(jobId),
              paymentDate: paymentDate,
              amount: amount,
              notes: document.getElementById('jobPaymentNotesInput')?.value || ''
            };
            if (payment) {
              await State.update('jobPayments', payment.id, payload);
              Toast.success('Η πληρωμή ενημερώθηκε');
            } else {
              await State.create('jobPayments', payload);
              Toast.success('Η πληρωμή καταχωρήθηκε');
            }
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

    // Reset to first tab
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector('.tab-btn[data-tab="basic"]').classList.add('active');
    document.getElementById('tab-basic').classList.add('active');

    // Fill form - convert dates from YYYY-MM-DD to DD/MM/YYYY
    document.getElementById('jobClient').value = job.clientId;
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
    document.getElementById('jobMaterialsCost').value = job.materialsCost ? Math.round(job.materialsCost) : 0;
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
      this.assignedPaints = this.assignedPaints.map(material => ({
        ...material,
        quantity: material.quantity || '',
        info: material.info || '',
        cost: this.parseCurrencyInput(material.cost || material.totalCost || 0)
      }));
      
      console.log('[Jobs] Parsed assignedWorkers:', this.assignedWorkers);
      console.log('[Jobs] Parsed assignedPaints:', this.assignedPaints);
    } catch (error) {
      console.error('[Jobs] Error parsing workers/materials:', error);
      this.assignedWorkers = [];
      this.assignedPaints = [];
    }
    
    this.renderAssignedWorkers();
    this.renderAssignedPaints();
    this.refreshJobFormLinkedSections(this.currentEdit);

    this.autoFillClientData();
    this.calculateCost();
    this.updateProgressBar();
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
    this.assignedWorkers = []; // Clear assigned workers
    this.assignedPaints = []; // Clear assigned job materials
    this.renderAssignedWorkers();
    this.renderAssignedPaints();
    this.calculateCost();
  },


  filterJobs() {
    const searchTerm = document.getElementById('jobSearch').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;

    let jobs = State.data.jobs;

    // Filter by search
    if (searchTerm) {
      jobs = jobs.filter(job => {
        const clientName = this.getClientName(job.clientId).toLowerCase();
        const jobIdStr = String(job.id).toLowerCase();
        return jobIdStr.includes(searchTerm) ||
               clientName.includes(searchTerm);
      });
    }

    // Filter by status
    if (statusFilter) {
      jobs = jobs.filter(job => job.status === statusFilter);
    }

    // Sort by date - newest first
    jobs = Utils.sortBy(jobs, 'date', 'desc');

    document.getElementById('jobsTableContainer').innerHTML = this.renderTable(jobs);
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
    // Tab 1 -> Tab 2
    const nextToDetails = document.getElementById('nextToDetailsBtn');
    if (nextToDetails) {
      nextToDetails.addEventListener('click', () => this.switchTab('details'));
    }

    // Tab 2 -> Tab 1
    const backToBasic = document.getElementById('backToBasicBtn');
    if (backToBasic) {
      backToBasic.addEventListener('click', () => this.switchTab('basic'));
    }

    // Tab 2 -> Tab 3
    const nextToCosts = document.getElementById('nextToCostsBtn');
    if (nextToCosts) {
      nextToCosts.addEventListener('click', () => this.switchTab('costs'));
    }

    // Tab 3 -> Tab 2
    const backToDetails = document.getElementById('backToDetailsBtn');
    if (backToDetails) {
      backToDetails.addEventListener('click', () => this.switchTab('details'));
    }

    // Tab 3 -> Tab 4
    const nextToNotes = document.getElementById('nextToNotesBtn');
    if (nextToNotes) {
      nextToNotes.addEventListener('click', () => this.switchTab('notes'));
    }

    // Tab 4 -> Tab 3
    const backToCosts = document.getElementById('backToCostsBtn');
    if (backToCosts) {
      backToCosts.addEventListener('click', () => this.switchTab('costs'));
    }
  },

  // Switch Tab Helper
  switchTab(tabName) {
    // Remove active from all
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    // Add active to target
    const targetBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    const targetContent = document.getElementById(`tab-${tabName}`);
    
    if (targetBtn) targetBtn.classList.add('active');
    if (targetContent) targetContent.classList.add('active');
    
    // Scroll to top of form smoothly
    const jobForm = document.getElementById('jobForm');
    if (jobForm) {
      jobForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
    Toast.success(`Ο ${worker.name} προστέθηκε στην εργασία`);
  },

  renderAssignedWorkers() {
    const container = document.getElementById('assignedWorkersContainer');
    
    if (this.assignedWorkers.length === 0) {
      const actuals = this.currentEdit ? Array.from(this.getVisitWorkerActuals(this.currentEdit).values()) : [];
      if (actuals.length === 0) {
        container.innerHTML = '<p class="text-muted" style="font-style: italic;">Δεν έχουν ανατεθεί εργάτες ακόμα</p>';
        return;
      }

      container.innerHTML = `
        <p class="text-muted" style="font-style: italic;">Δεν έχουν ανατεθεί εργάτες, αλλά υπάρχουν πραγματικές ώρες από επισκέψεις.</p>
        <div class="table-wrapper">
          <table class="data-table" style="margin-top: 10px;">
            <thead>
              <tr>
                <th>Εργάτης</th>
                <th>Τύπος</th>
                <th>Πραγματικές Ώρες</th>
                <th>Πραγματικό Κόστος</th>
                <th>Κρυφό Κόστος Ιδιοκτήτη</th>
              </tr>
            </thead>
            <tbody>
              ${actuals.map(actual => `
                <tr>
                  <td><strong>${actual.workerName}</strong><br><small class="text-muted">Μόνο από επισκέψεις</small></td>
                  <td>${actual.workerType === 'owner' ? 'Ιδιοκτήτης' : 'Υπάλληλος'}</td>
                  <td>${actual.actualHours.toFixed(1)}h</td>
                  <td><strong style="color: var(--accent-primary);">${Utils.formatCurrency(actual.actualLaborCost)}</strong></td>
                  <td><strong style="color: ${(actual.ownerOpportunityCost || 0) > 0 ? 'var(--warning, #f59e0b)' : 'var(--text-muted)'};">${Utils.formatCurrency(actual.ownerOpportunityCost || 0)}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
      return;
    }

    const actuals = this.currentEdit ? this.getVisitWorkerActuals(this.currentEdit) : new Map();
    const assignedKeys = new Set();
    const rows = this.assignedWorkers.map((w, index) => {
      const workerId = w.workerId ?? w.worker_id;
      const key = workerId ? `id:${workerId}` : `name:${w.workerName}`;
      assignedKeys.add(key);
      const actual = actuals.get(key) || { actualHours: 0, actualLaborCost: 0, ownerOpportunityCost: 0 };
      const plannedHours = parseFloat(w.hoursAllocated ?? w.hours_allocated ?? 0) || 0;
      const hourlyRate = parseFloat(w.hourlyRate ?? w.hourly_rate ?? 0) || 0;
      const fallbackOwnerCost = this.getWorkerType(w) === 'owner' ? plannedHours * hourlyRate : 0;
      return {
        ...w,
        index,
        isAssigned: true,
        plannedHours,
        actualHours: actual.actualHours || 0,
        actualLaborCost: actual.actualLaborCost || 0,
        ownerOpportunityCost: actual.ownerOpportunityCost || fallbackOwnerCost,
        variance: (actual.actualHours || 0) - plannedHours
      };
    });

    actuals.forEach((actual, key) => {
      if (assignedKeys.has(key)) return;
      rows.push({
        workerId: actual.workerId,
        workerName: actual.workerName,
        workerType: actual.workerType,
        hourlyRate: actual.hourlyRate,
        workerSpecialty: 'Μόνο από επισκέψεις',
        index: null,
        isAssigned: false,
        plannedHours: 0,
        actualHours: actual.actualHours || 0,
        actualLaborCost: actual.actualLaborCost || 0,
        ownerOpportunityCost: actual.ownerOpportunityCost || 0,
        variance: actual.actualHours || 0
      });
    });

    const totalPlannedHours = rows.reduce((sum, w) => sum + w.plannedHours, 0);
    const totalActualHours = rows.reduce((sum, w) => sum + w.actualHours, 0);
    const totalActualCost = rows.reduce((sum, w) => sum + w.actualLaborCost, 0);
    const totalOwnerOpportunityCost = rows.reduce((sum, w) => sum + (w.ownerOpportunityCost || 0), 0);
    const fallbackCost = this.assignedWorkers.reduce((sum, w) => sum + (parseFloat(w.laborCost || w.labor_cost || 0) || 0), 0);
    const hasActuals = totalActualHours > 0;

    container.innerHTML = `
      <div class="table-wrapper">
        <table class="data-table" style="margin-top: 10px;">
          <thead>
            <tr>
              <th style="width: 100px;">Ενέργειες</th>
              <th>Εργάτης</th>
              <th>Τύπος</th>
              <th>Ειδικότητα</th>
              <th>Ωρομίσθιο</th>
              <th>Προβλ. Ώρες</th>
              <th>Πραγμ. Ώρες</th>
              <th>Διαφορά</th>
              <th>Πραγμ. Κόστος</th>
              <th>Κρυφό Κόστος Ιδιοκτήτη</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(w => `
              <tr>
                <td>
                  ${w.isAssigned ? `
                  <button class="btn-icon edit-assigned-worker-btn" data-worker-index="${w.index}" title="Επεξεργασία">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn-icon remove-assigned-worker-btn" data-worker-index="${w.index}" title="Αφαίρεση">
                    <i class="fas fa-trash"></i>
                  </button>
                  ` : '<small class="text-muted">Από επίσκεψη</small>'}
                </td>
                <td><strong>${w.workerName}</strong>${!w.isAssigned ? '<br><small class="text-muted">Δεν είναι ανατεθειμένος</small>' : (w.actualHours === 0 && this.currentEdit ? '<br><small class="text-muted">Δεν έχει καταγεγραμμένες ώρες</small>' : '')}</td>
                <td>${this.getWorkerType(w) === 'owner' ? 'Ιδιοκτήτης' : 'Υπάλληλος'}</td>
                <td>${w.workerSpecialty || w.specialty || ''}</td>
                <td>${Utils.formatCurrency(w.hourlyRate)}/ώρα</td>
                <td>${w.plannedHours.toFixed(1)}h</td>
                <td><strong>${w.actualHours.toFixed(1)}h</strong></td>
                <td style="color: ${w.variance > 0 ? 'var(--warning, #f59e0b)' : 'var(--success)'};">${w.variance >= 0 ? '+' : ''}${w.variance.toFixed(1)}h</td>
                <td><strong style="color: var(--accent-primary);">${Utils.formatCurrency(hasActuals ? w.actualLaborCost : (parseFloat(w.laborCost || w.labor_cost || 0) || 0))}</strong></td>
                <td><strong style="color: ${(w.ownerOpportunityCost || 0) > 0 ? 'var(--warning, #f59e0b)' : 'var(--text-muted)'};">${Utils.formatCurrency(w.ownerOpportunityCost || 0)}</strong></td>
              </tr>
            `).join('')}
            <tr style="background: var(--bg-secondary); font-weight: bold;">
              <td></td>
              <td colspan="4" style="text-align: right;">ΣΥΝΟΛΟ:</td>
              <td>${totalPlannedHours.toFixed(1)}h</td>
              <td>${totalActualHours.toFixed(1)}h</td>
              <td>${(totalActualHours - totalPlannedHours) >= 0 ? '+' : ''}${(totalActualHours - totalPlannedHours).toFixed(1)}h</td>
              <td><strong style="color: var(--accent-primary);">${Utils.formatCurrency(hasActuals ? totalActualCost : fallbackCost)}</strong></td>
              <td><strong style="color: ${totalOwnerOpportunityCost > 0 ? 'var(--warning, #f59e0b)' : 'var(--text-muted)'};">${Utils.formatCurrency(totalOwnerOpportunityCost)}</strong></td>
            </tr>
          </tbody>
        </table>
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
      <button class="btn-ghost" onclick="Modal.close()">Ακύρωση</button>
      <button class="btn-primary" id="confirmEditWorkerBtn">
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

      hoursInput.addEventListener('input', () => {
        const hours = parseFloat(hoursInput.value || 0);
        const cost = this.getWorkerType(worker) === 'owner' ? 0 : hours * worker.hourlyRate;
        costInput.value = Utils.formatCurrency(cost);
      });

      document.getElementById('confirmEditWorkerBtn').addEventListener('click', () => {
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
  addPaint() {
    const content = `
      <div class="form-grid">
        <div class="form-group span-2">
          <label>Όνομα <span class="required">*</span></label>
          <input type="text" id="newPaintName" list="paintNamesList" placeholder="π.χ. Λευκό Ματ Ακρυλικό">
          <datalist id="paintNamesList">
            ${(State.read('inventory') || []).map(p => `<option value="${p.name}">`).join('')}
          </datalist>
        </div>

        <div class="form-group">
          <label>Κωδικός</label>
          <input type="text" id="newPaintCode" placeholder="π.χ. RAL 9010, NCS S0500-N">
        </div>

        <div class="form-group">
          <label>Ποσότητα</label>
          <input type="text" id="newMaterialQuantity" placeholder="π.χ. 10 λίτρα, 2 τεμάχια">
        </div>

        <div class="form-group">
          <label>Κόστος (€)</label>
          <input type="number" id="newMaterialCost" min="0" step="0.01" value="0">
        </div>

        <div class="form-group span-2">
          <label>Πληροφορίες</label>
          <textarea id="newMaterialInfo" rows="3" placeholder="π.χ. Υλικό για σαλόνι, δωμάτιο ή γενικές σημειώσεις"></textarea>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn-ghost" onclick="Modal.close()">Ακύρωση</button>
      <button class="btn-primary" id="confirmAddPaintBtn">
        <i class="fas fa-plus"></i> Προσθήκη
      </button>
    `;

    Modal.open({
      title: '<i class="fas fa-boxes"></i> Προσθήκη Υλικού',
      content: content,
      footer: footer,
      size: 'md'
    });

    setTimeout(() => {
      const confirmBtn = document.getElementById('confirmAddPaintBtn');
      const nameInput = document.getElementById('newPaintName');
      const codeInput = document.getElementById('newPaintCode');
      const quantityInput = document.getElementById('newMaterialQuantity');
      const costInput = document.getElementById('newMaterialCost');
      const infoInput = document.getElementById('newMaterialInfo');

      if (confirmBtn && nameInput) {
        confirmBtn.addEventListener('click', () => {
          const paintName = nameInput.value.trim();
          const paintCode = codeInput.value.trim();
          const quantity = quantityInput.value.trim();
          const cost = this.parseCurrencyInput(costInput.value);
          const info = infoInput.value.trim();
          const stockMaterial = (State.read('inventory') || []).find(material => {
            return String(material.name || '').toLowerCase() === paintName.toLowerCase();
          });

          if (!paintName) {
            Toast.error('Παρακαλώ εισάγετε όνομα υλικού');
            return;
          }

          this.assignedPaints.push({
            name: paintName,
            code: paintCode,
            quantity,
            cost,
            info,
            materialId: stockMaterial ? stockMaterial.id : null,
            unit: stockMaterial ? stockMaterial.unit : null,
            stockDeducted: false
          });

          this.renderAssignedPaints();
          this.calculateCost();
          Toast.success('Το υλικό προστέθηκε');
          Modal.close();
        });

        // Enter key support
        [nameInput, codeInput, quantityInput, costInput, infoInput].forEach(input => {
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
              <th style="width: 80px;">Ενέργειες</th>
              <th>Όνομα</th>
              <th>Κωδικός</th>
              <th>Ποσότητα</th>
              <th>Πληροφορίες</th>
              <th>Κόστος</th>
            </tr>
          </thead>
          <tbody>
            ${this.assignedPaints.map((paint, index) => `
              <tr>
                <td>
                  <button class="btn-icon remove-paint-btn" data-paint-index="${index}" title="Αφαίρεση">
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
                <td>
                  <strong>${paint.name}</strong>
                  ${paint.materialId || paint.material_id ? '<br><small class="text-muted">Συνδεδεμένο με Αποθήκη</small>' : ''}
                  ${paint.stockDeducted ? '<br><small style="color: var(--success);"><i class="fas fa-check"></i> Αφαιρέθηκε από αποθήκη</small>' : ''}
                </td>
                <td>${paint.code || '-'}</td>
                <td>${paint.quantity || '-'}</td>
                <td>${paint.info || '-'}</td>
                <td><strong>${Utils.formatCurrency(this.parseCurrencyInput(paint.cost || 0))}</strong></td>
              </tr>
            `).join('')}
            <tr style="background: var(--bg-secondary); font-weight: bold;">
              <td colspan="5" style="text-align: right;">ΣΥΝΟΛΟ ΥΛΙΚΩΝ:</td>
              <td><strong style="color: var(--accent-primary);">${Utils.formatCurrency(materialsTotal)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    this.applyMinimumCostFields();

    // Add event listeners for remove buttons
    setTimeout(() => {
      const removeButtons = container.querySelectorAll('.remove-paint-btn');
      
      removeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const index = parseInt(btn.dataset.paintIndex);
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
      onConfirm: () => {
        this.assignedPaints.splice(index, 1);
        this.renderAssignedPaints();
        this.calculateCost();
        Toast.success('Το υλικό αφαιρέθηκε');
      }
    });
  }
};


