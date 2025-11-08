/* ========================================
   Jobs View - Διαχείριση Εργασιών
   ======================================== */

window.JobsView = {
  currentEdit: null,
  assignedWorkers: [], // Array to hold workers assigned to current job
  assignedPaints: [], // Array to hold paints assigned to current job
  tableClickHandler: null,
  // Store all event handlers to prevent duplicates
  formSubmitHandler: null,
  addBtnHandler: null,
  clearBtnHandler: null,
  clientSelectHandler: null,
  costFieldHandlers: {},
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
    const paints = State.read('paints') || [];

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
              <span>Λεπτομέρειες</span>
            </button>
            <button type="button" class="tab-btn" data-tab="workers">
              <i class="fas fa-users"></i>
              <span>Εργάτες</span>
            </button>
            <button type="button" class="tab-btn" data-tab="costs">
              <i class="fas fa-euro-sign"></i>
              <span>Κοστολόγηση</span>
            </button>
            <button type="button" class="tab-btn" data-tab="notes">
              <i class="fas fa-sticky-note"></i>
              <span>Σημειώσεις</span>
            </button>
          </div>

          <!-- Tab: Βασικά Στοιχεία -->
          <div class="tab-content active" id="tab-basic">
            <div class="form-grid">
              <!-- Row 1: Date & Status -->
              <div class="form-group">
                <label>Ημερομηνία <span class="required">*</span></label>
                <input type="text" id="jobDate" placeholder="ΗΗ/ΜΜ/ΕΕΕΕ" pattern="\\d{2}/\\d{2}/\\d{4}" required>
              </div>

              <div class="form-group">
                <label>Κατάσταση <span class="required">*</span></label>
                <select id="jobStatus" required>
                  ${CONFIG.STATUS_OPTIONS.map(status => `<option value="${status}">${status}</option>`).join('')}
                </select>
              </div>

              <!-- Row 2: Client -->
              <div class="form-group span-2">
                <label>Πελάτης <span class="required">*</span></label>
                <select id="jobClient" required>
                  <option value="">Επιλέξτε πελάτη...</option>
                  ${sortedClients.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
                </select>
              </div>

              <!-- Client Info (auto-filled, readonly) -->
              <div class="form-group">
                <label>Τηλέφωνο</label>
                <input type="tel" id="jobPhone" readonly>
              </div>

              <div class="form-group">
                <label>Email</label>
                <input type="email" id="jobEmail" readonly>
              </div>

              <div class="form-group">
                <label>Διεύθυνση</label>
                <input type="text" id="jobAddress" readonly>
              </div>

              <div class="form-group">
                <label>Πόλη</label>
                <input type="text" id="jobCity" readonly>
              </div>

              <div class="form-group">
                <label>ΤΚ</label>
                <input type="text" id="jobPostal" readonly>
              </div>

              <div class="form-group">
                <label>Επόμενη Επίσκεψη</label>
                <input type="text" id="jobNextVisit" placeholder="ΗΗ/ΜΜ/ΕΕΕΕ" pattern="\\d{2}/\\d{2}/\\d{4}">
              </div>
            </div>
          </div>

          <!-- Tab: Λεπτομέρειες Εργασίας -->
          <div class="tab-content" id="tab-details">
            <div class="form-grid">
              <div class="form-group">
                <label>Τύπος Εργασίας <span class="required">*</span></label>
                <select id="jobType" required>
                  <option value="">Επιλέξτε τύπο...</option>
                  ${CONFIG.JOB_TYPES.map(type => `<option value="${type}">${type}</option>`).join('')}
                </select>
              </div>

              <div class="form-group">
                <label>Αριθμός Δωματίων</label>
                <input type="number" id="jobRooms" min="1">
              </div>

              <div class="form-group">
                <label>Τετραγωνικά (m²)</label>
                <input type="number" id="jobArea" step="0.01">
              </div>

              <div class="form-group">
                <label>Υπόστρωμα</label>
                <input type="text" id="jobSubstrate" placeholder="π.χ. Γυψοσανίδα, Σοβάς">
              </div>

              <!-- Χρώματα -->
              <div class="form-group span-2" style="margin-top: 20px;">
                <h4 style="margin-bottom: 10px;"><i class="fas fa-palette"></i> Χρώματα</h4>
                <button type="button" class="btn btn-secondary" id="addPaintBtn">
                  <i class="fas fa-plus"></i> Προσθήκη Χρώματος
                </button>
                <div id="paintsContainer" style="margin-top: 15px;">
                  <!-- Paints will appear here -->
                </div>
              </div>
            </div>
          </div>

          <!-- Tab: Εργάτες -->
          <div class="tab-content" id="tab-workers">
            <div class="form-grid">
              <div class="form-group span-2">
                <button type="button" class="btn btn-secondary" id="addWorkerToJobBtn">
                  <i class="fas fa-user-plus"></i> Προσθήκη Εργάτη
                </button>
                <div id="assignedWorkersContainer" style="margin-top: 15px;">
                  <!-- Workers table will appear here -->
                </div>
              </div>
            </div>
          </div>

          <!-- Tab: Κοστολόγηση -->
          <div class="tab-content" id="tab-costs">
            <div class="form-grid">
              <div class="form-group">
                <label title="Το κόστος των υλικών που χρησιμοποιήθηκαν">
                  Κόστος Υλικών (€) <i class="fas fa-info-circle" style="font-size: 0.8em; color: var(--text-muted);"></i>
                </label>
                <input type="number" id="jobMaterialsCost" step="0.01" min="0" value="0" 
                       title="Το κόστος των υλικών που χρησιμοποιήθηκαν (έξοδα)">
              </div>

              <div class="form-group">
                <label title="Χιλιόμετρα μετακίνησης για την εργασία">
                  Χιλιόμετρα <i class="fas fa-info-circle" style="font-size: 0.8em; color: var(--text-muted);"></i>
                </label>
                <input type="number" id="jobKilometers" step="1" min="0" value="0"
                       title="Χιλιόμετρα μετακίνησης για την εργασία (έξοδα)">
              </div>

              <div class="form-group">
                <label title="Οι ώρες που χρεώνεις τον πελάτη (δικές σου ώρες)">
                  Ώρες Χρέωσης <i class="fas fa-info-circle" style="font-size: 0.8em; color: var(--text-muted);"></i>
                </label>
                <input type="number" id="jobBillingHours" step="0.5" min="0" value="0"
                       title="Οι ώρες που χρεώνεις τον πελάτη - δικές σου ώρες εργασίας (έσοδα)">
              </div>

              <div class="form-group">
                <label title="Η τιμή ανά ώρα που χρεώνεις τον πελάτη (από Ρυθμίσεις)">
                  Τιμή Χρέωσης/Ώρα (€) <i class="fas fa-info-circle" style="font-size: 0.8em; color: var(--text-muted);"></i>
                </label>
                <input type="number" id="jobBillingRate" step="0.01" min="0" value="50" readonly
                       style="background-color: var(--bg-secondary); cursor: not-allowed;"
                       title="Η τιμή ανά ώρα που χρεώνεις τον πελάτη (από Ρυθμίσεις > Ωριαία Αμοιβή)">
              </div>

              <!-- Financial Summary -->
              <div class="form-group span-2" style="margin-top: 20px;">
                <div class="financial-summary">
                  <!-- Expenses Card -->
                  <div class="financial-card expenses">
                    <div class="financial-header">
                      <i class="fas fa-arrow-down"></i>
                      <span>ΕΞΟΔΑ</span>
                    </div>
                    <div class="financial-body">
                      <div class="financial-row">
                        <span>Εργάτες</span>
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
                      <div class="financial-row">
                        <span>ΦΠΑ (24%)</span>
                        <strong id="vatCostDisplay">0.00 €</strong>
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
                      <div class="financial-row profit-row">
                        <strong id="profitDisplay">0.00 €</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
          </div>

          <!-- Actions -->
          <div class="form-actions">
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
    
    // Initialize date pickers
    Utils.initDatePicker('#jobDate');
    Utils.initDatePicker('#jobNextVisit');
    
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
      this.clientSelectHandler = () => this.autoFillClientData();
      clientSelect.addEventListener('change', this.clientSelectHandler);
    }

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

    // Cost calculation fields - real-time updates (jobBillingRate removed as it's readonly)
    const costFields = ['jobMaterialsCost', 'jobKilometers', 'jobBillingHours'];
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
              <th>Ημ/νία</th>
              <th>Πελάτης</th>
              <th>Τύπος</th>
              <th>Κατάσταση</th>
              <th>Επόμ. Επίσκ.</th>
              <th>Σύνολο</th>
              <th style="text-align: right;">Ενέργειες</th>
            </tr>
          </thead>
          <tbody>
          ${sortedJobs.map(job => {
            const clientName = this.getClientName(job.clientId);
            return `
            <tr>
              <td title="${Utils.formatDate(job.date)}">${Utils.formatDate(job.date)}</td>
              <td title="${clientName}">${clientName}</td>
              <td title="${job.type || '-'}">${job.type || '-'}</td>
              <td><span class="status-pill status-${job.status?.toLowerCase().replace(/\s+/g, '-')}">${job.status}</span></td>
              <td>${job.nextVisit ? `<strong style="color: var(--accent-primary);" title="${Utils.formatDate(job.nextVisit)}">${Utils.formatDate(job.nextVisit)}</strong>` : '-'}</td>
              <td title="${Utils.formatCurrency(job.totalCost || 0)}"><strong>${Utils.formatCurrency(job.totalCost || 0)}</strong></td>
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
            </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      </div>
    `;
  },

  getClientName(clientId) {
    const client = State.data.clients.find(c => c.id === clientId);
    return client ? client.name : 'Άγνωστος';
  },

  showAddForm() {
    this.currentEdit = null;
    const formTitle = document.getElementById('formTitle');
    const jobForm = document.getElementById('jobForm');
    const jobDate = document.getElementById('jobDate');
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
    
    // Reset form and set defaults - use Greek date format
    document.getElementById('jobFormElement').reset();
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    jobDate.value = `${dd}/${mm}/${yyyy}`;
    jobStatus.value = 'Υποψήφιος';
    
    // Load default billing rate from settings
    const pricingSettings = JSON.parse(localStorage.getItem('pricing_settings') || '{}');
    const defaultBillingRate = pricingSettings.hourlyRate || 50;
    document.getElementById('jobBillingRate').value = defaultBillingRate;
    
    // Clear assigned workers and paints
    this.assignedWorkers = [];
    this.assignedPaints = [];
    this.renderAssignedWorkers();
    this.renderAssignedPaints();
    
    this.calculateCost();
    jobForm.scrollIntoView({ behavior: 'smooth' });
  },

  autoFillClientData() {
    const clientId = document.getElementById('jobClient').value;
    const client = State.data.clients.find(c => c.id === clientId);

    if (client) {
      document.getElementById('jobPhone').value = client.phone || '';
      document.getElementById('jobEmail').value = client.email || '';
      document.getElementById('jobAddress').value = client.address || '';
      document.getElementById('jobCity').value = client.city || '';
      document.getElementById('jobPostal').value = client.postal || client.postalCode || '';
    } else {
      document.getElementById('jobPhone').value = '';
      document.getElementById('jobEmail').value = '';
      document.getElementById('jobAddress').value = '';
      document.getElementById('jobCity').value = '';
      document.getElementById('jobPostal').value = '';
    }
  },

  calculateCost() {
    // Get pricing settings from localStorage
    const pricingSettings = JSON.parse(localStorage.getItem('pricing_settings') || '{}');
    const vatPercent = pricingSettings.vat || 24;
    const costPerKm = pricingSettings.travelCost || 0.5;
    
    const materials = parseFloat(document.getElementById('jobMaterialsCost')?.value || 0);
    const kilometers = parseFloat(document.getElementById('jobKilometers')?.value || 0);
    const billingHours = parseFloat(document.getElementById('jobBillingHours')?.value || 0);
    const billingRate = parseFloat(document.getElementById('jobBillingRate')?.value || 50);

    // ΕΞΟΔΑ
    const laborCost = this.assignedWorkers.reduce((sum, w) => sum + w.laborCost, 0); // Κόστος εργατών
    const travelCost = kilometers * costPerKm; // Κόστος μετακίνησης
    const totalExpenses = materials + laborCost + travelCost; // Συνολικά έξοδα

    // ΕΣΟΔΑ
    const billingAmount = billingHours * billingRate; // Χρέωση εργασίας (δικές σου ώρες)
    const vatAmount = billingAmount * (vatPercent / 100); // ΦΠΑ
    const totalCharge = billingAmount + vatAmount; // Συνολική χρέωση

    // ΚΕΡΔΟΣ
    const profit = billingAmount - totalExpenses; // Κέρδος (χωρίς ΦΠΑ)

    // Update displays
    const laborDisplay = document.getElementById('laborCostDisplay');
    const materialsDisplay = document.getElementById('materialsCostDisplay');
    const travelDisplay = document.getElementById('travelCostDisplay');
    const totalExpensesDisplay = document.getElementById('totalExpensesDisplay');
    const billingAmountDisplay = document.getElementById('billingAmountDisplay');
    const vatDisplay = document.getElementById('vatCostDisplay');
    const totalDisplay = document.getElementById('totalCostDisplay');
    const profitDisplay = document.getElementById('profitDisplay');
    
    if (laborDisplay) laborDisplay.textContent = Utils.formatCurrency(laborCost);
    if (materialsDisplay) materialsDisplay.textContent = Utils.formatCurrency(materials);
    if (travelDisplay) travelDisplay.textContent = Utils.formatCurrency(travelCost);
    if (totalExpensesDisplay) totalExpensesDisplay.textContent = Utils.formatCurrency(totalExpenses);
    if (billingAmountDisplay) billingAmountDisplay.textContent = Utils.formatCurrency(billingAmount);
    if (vatDisplay) vatDisplay.textContent = Utils.formatCurrency(vatAmount);
    if (totalDisplay) totalDisplay.textContent = Utils.formatCurrency(totalCharge);
    
    if (profitDisplay) {
      // Format profit with sign
      const profitText = profit >= 0 
        ? `+${Utils.formatCurrency(profit)}` 
        : Utils.formatCurrency(profit);
      profitDisplay.textContent = profitText;
      
      // Change color based on profit/loss
      const profitContainer = profitDisplay.parentElement.parentElement;
      if (profit < 0) {
        // Loss - red background, white text
        profitDisplay.style.color = 'white';
        profitContainer.style.background = '#ff4444';
      } else {
        // Profit - green background, white text
        profitDisplay.style.color = 'white';
        profitContainer.style.background = '#28a745';
      }
    }
  },

  saveJob(e) {
    e.preventDefault();

    // Get pricing settings
    const pricingSettings = JSON.parse(localStorage.getItem('pricing_settings') || '{}');
    const vatPercent = pricingSettings.vat || 24;
    const costPerKm = pricingSettings.travelCost || 0.5;

    const billingHours = parseFloat(document.getElementById('jobBillingHours').value) || 0;
    const billingRate = parseFloat(document.getElementById('jobBillingRate').value) || 50;

    const jobData = {
      date: Utils.greekToDate(document.getElementById('jobDate').value),
      clientId: document.getElementById('jobClient').value,
      type: document.getElementById('jobType').value,
      status: document.getElementById('jobStatus').value,
      rooms: parseInt(document.getElementById('jobRooms').value) || null,
      area: parseFloat(document.getElementById('jobArea').value) || null,
      substrate: document.getElementById('jobSubstrate').value,
      nextVisit: Utils.greekToDate(document.getElementById('jobNextVisit').value),
      materialsCost: parseFloat(document.getElementById('jobMaterialsCost').value) || 0,
      kilometers: parseFloat(document.getElementById('jobKilometers').value) || 0,
      billingHours: billingHours,
      billingRate: billingRate,
      vat: vatPercent,
      costPerKm: costPerKm,
      notes: document.getElementById('jobNotes').value,
      // Add assigned workers and paints
      assignedWorkers: [...this.assignedWorkers],
      paints: [...this.assignedPaints]
    };

    // Auto-generate ID if new job
    if (!this.currentEdit) {
      const jobs = State.read('jobs') || [];
      const maxId = jobs.length > 0 
        ? Math.max(...jobs.map(j => parseInt(j.id.split('-')[1]) || 0))
        : 0;
      jobData.id = `E-${String(maxId + 1).padStart(4, '0')}`;
    } else {
      jobData.id = this.currentEdit;
    }

    // ΕΞΟΔΑ
    const laborCost = this.assignedWorkers.reduce((sum, w) => sum + w.laborCost, 0); // Κόστος εργατών
    const totalWorkerHours = this.assignedWorkers.reduce((sum, w) => sum + w.hoursAllocated, 0);
    const travelCost = jobData.kilometers * jobData.costPerKm;
    const totalExpenses = jobData.materialsCost + laborCost + travelCost;

    // ΕΣΟΔΑ
    const billingAmount = billingHours * billingRate; // Χρέωση εργασίας
    const vatAmount = billingAmount * (jobData.vat / 100);
    const totalCharge = billingAmount + vatAmount;

    // ΚΕΡΔΟΣ
    const profit = billingAmount - totalExpenses;
    
    jobData.hours = billingHours; // Billing hours (owner's hours)
    jobData.workerHours = totalWorkerHours; // Total worker hours
    jobData.laborCost = laborCost; // Cost of workers (expense)
    jobData.travelCost = travelCost;
    jobData.totalExpenses = totalExpenses;
    jobData.billingAmount = billingAmount; // Billing amount (revenue)
    jobData.vatAmount = vatAmount;
    jobData.totalCost = totalCharge; // Total charge to client
    jobData.profit = profit; // Net profit

    // Validate
    const validation = Validation.validateJob(jobData);
    if (!validation.valid) {
      Toast.error(validation.errors[0]);
      return;
    }

    // Save or update
    if (this.currentEdit) {
      State.update('jobs', jobData.id, jobData);
      Toast.success('Η εργασία ενημερώθηκε!');
    } else {
      State.create('jobs', jobData);
      Toast.success('Η εργασία δημιουργήθηκε!');
    }

    this.cancelForm();
    // Refresh the table to show the new/updated job
    this.refreshTable();
  },

  refreshTable() {
    const jobs = State.read('jobs') || [];
    const container = document.getElementById('jobsTableContainer');
    if (container) {
      container.innerHTML = this.renderTable(jobs);
    }
  },

  viewJob(id) {
    const job = State.data.jobs.find(j => j.id === id);
    if (!job) return;

    const client = State.data.clients.find(c => c.id === job.clientId);
    const clientName = client ? client.name : 'Άγνωστος';

    const content = `
      <div class="job-details">
        <!-- Βασικά Στοιχεία -->
        <div class="detail-section">
          <h4><i class="fas fa-info-circle"></i> Βασικά Στοιχεία</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Κωδικός:</label>
              <span>${job.id}</span>
            </div>
            <div class="detail-item">
              <label>Ημερομηνία:</label>
              <span>${Utils.formatDate(job.date)}</span>
            </div>
            <div class="detail-item">
              <label>Κατάσταση:</label>
              <span class="status-pill status-${job.status?.toLowerCase().replace(/\s+/g, '-')}">${job.status}</span>
            </div>
            <div class="detail-item">
              <label>Επόμενη Επίσκεψη:</label>
              <span>${job.nextVisit ? Utils.formatDate(job.nextVisit) : '-'}</span>
            </div>
          </div>
        </div>

        <!-- Στοιχεία Πελάτη -->
        <div class="detail-section">
          <h4><i class="fas fa-user"></i> Πελάτης</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Όνομα:</label>
              <span>${clientName}</span>
            </div>
            <div class="detail-item">
              <label>Τηλέφωνο:</label>
              <span>${client?.phone || '-'}</span>
            </div>
            <div class="detail-item">
              <label>Email:</label>
              <span>${client?.email || '-'}</span>
            </div>
            <div class="detail-item span-2">
              <label>Διεύθυνση:</label>
              <div style="display: flex; align-items: center; gap: 10px;">
                <span>${client?.address || '-'}, ${client?.city || '-'}, ${client?.postal || '-'}</span>
                ${client?.address && client?.city ? `
                  <button class="btn-icon" onclick="JobsView.openInMaps('${encodeURIComponent(client.address + ', ' + client.city + ', ' + (client.postal || 'Ελλάδα'))}')" title="Άνοιγμα στο Google Maps">
                    <i class="fas fa-map-marked-alt"></i>
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        </div>

        <!-- Λεπτομέρειες Εργασίας -->
        <div class="detail-section">
          <h4><i class="fas fa-paint-roller"></i> Λεπτομέρειες Εργασίας</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Τύπος Εργασίας:</label>
              <span>${job.type || '-'}</span>
            </div>
            <div class="detail-item">
              <label>Δωμάτια:</label>
              <span>${job.rooms || '-'}</span>
            </div>
            <div class="detail-item">
              <label>Εμβαδόν (m²):</label>
              <span>${job.area || '-'}</span>
            </div>
            <div class="detail-item">
              <label>Υπόστρωμα:</label>
              <span>${job.substrate || '-'}</span>
            </div>
          </div>
        </div>

        <!-- Χρώματα -->
        ${job.paints && job.paints.length > 0 ? `
        <div class="detail-section">
          <h4><i class="fas fa-palette"></i> Χρώματα</h4>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Όνομα Χρώματος</th>
                  <th>Κωδικός</th>
                </tr>
              </thead>
              <tbody>
                ${job.paints.map(paint => `
                  <tr>
                    <td><strong>${paint.name}</strong></td>
                    <td>${paint.code || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        ` : ''}

        <!-- Εργάτες -->
        ${job.assignedWorkers && job.assignedWorkers.length > 0 ? `
        <div class="detail-section">
          <h4><i class="fas fa-users"></i> Ανατεθειμένοι Εργάτες</h4>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Εργάτης</th>
                  <th>Ειδικότητα</th>
                  <th>Ωρομίσθιο</th>
                  <th>Ώρες</th>
                  <th>Κόστος</th>
                </tr>
              </thead>
              <tbody>
                ${job.assignedWorkers.map(worker => `
                  <tr>
                    <td><strong>${worker.workerName}</strong></td>
                    <td>${worker.specialty}</td>
                    <td>${Utils.formatCurrency(worker.hourlyRate)}/ώρα</td>
                    <td>${worker.hoursAllocated}h</td>
                    <td><strong style="color: var(--error);">${Utils.formatCurrency(worker.laborCost)}</strong></td>
                  </tr>
                `).join('')}
                <tr style="background: var(--bg-secondary); font-weight: bold;">
                  <td colspan="3" style="text-align: right;">ΣΥΝΟΛΟ:</td>
                  <td>${job.assignedWorkers.reduce((sum, w) => sum + w.hoursAllocated, 0).toFixed(1)}h</td>
                  <td><strong style="color: var(--error);">${Utils.formatCurrency(job.assignedWorkers.reduce((sum, w) => sum + w.laborCost, 0))}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        ` : ''}

        <!-- Κόστος -->
        <div class="detail-section">
          <h4><i class="fas fa-euro-sign"></i> Κόστος</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Υλικά:</label>
              <span>${Utils.formatCurrency(job.materialsCost || 0)}</span>
            </div>
            <div class="detail-item">
              <label>Ώρες Εργασίας:</label>
              <span>${job.hours || 0} ώρες</span>
            </div>
            <div class="detail-item">
              <label>Κόστος Εργασίας:</label>
              <span>${Utils.formatCurrency(job.laborCost || 0)}</span>
            </div>
            <div class="detail-item">
              <label>Χιλιόμετρα:</label>
              <span>${job.kilometers || 0} km</span>
            </div>
            <div class="detail-item">
              <label>Κόστος Μετακίνησης:</label>
              <span>${Utils.formatCurrency(job.travelCost || 0)}</span>
            </div>
            <div class="detail-item">
              <label>Καθαρό Σύνολο:</label>
              <span><strong>${Utils.formatCurrency(job.netCost || 0)}</strong></span>
            </div>
            <div class="detail-item">
              <label>ΦΠΑ (${job.vat || 0}%):</label>
              <span>${Utils.formatCurrency(job.vatAmount || 0)}</span>
            </div>
            <div class="detail-item">
              <label>Τελικό Σύνολο:</label>
              <span><strong style="color: var(--accent-primary); font-size: 1.2em;">${Utils.formatCurrency(job.totalCost || 0)}</strong></span>
            </div>
          </div>
        </div>

        <!-- Σημειώσεις -->
        ${job.notes ? `
        <div class="detail-section">
          <h4><i class="fas fa-sticky-note"></i> Σημειώσεις</h4>
          <div class="detail-notes">
            ${job.notes}
          </div>
        </div>
        ` : ''}
      </div>
    `;

    const footer = `
      <button class="btn-ghost" onclick="Modal.close()">Κλείσιμο</button>
      <button class="btn-primary" id="editJobFromModalBtn">
        <i class="fas fa-edit"></i> Επεξεργασία
      </button>
    `;

    const modal = Modal.open({
      title: `${clientName}`,
      content: content,
      footer: footer,
      size: 'lg'
    });

    // Add event listener for edit button
    setTimeout(() => {
      const editBtn = document.getElementById('editJobFromModalBtn');
      if (editBtn) {
        editBtn.onclick = () => {
          Modal.close();
          setTimeout(() => {
            this.editJob(id);
          }, 100);
        };
      }
    }, 50);
  },

  editJob(id) {
    const job = State.data.jobs.find(j => j.id === id);
    if (!job) return;

    this.currentEdit = id;
    document.getElementById('formTitle').textContent = 'Επεξεργασία Εργασίας';
    document.getElementById('jobForm').style.display = 'block';

    // Reset to first tab
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelector('.tab-btn[data-tab="basic"]').classList.add('active');
    document.getElementById('tab-basic').classList.add('active');

    // Fill form - convert dates from YYYY-MM-DD to DD/MM/YYYY
    document.getElementById('jobDate').value = Utils.dateToGreek(job.date);
    document.getElementById('jobClient').value = job.clientId;
    document.getElementById('jobType').value = job.type || '';
    document.getElementById('jobStatus').value = job.status || '';
    document.getElementById('jobRooms').value = job.rooms || '';
    document.getElementById('jobArea').value = job.area || '';
    document.getElementById('jobSubstrate').value = job.substrate || '';
    document.getElementById('jobNextVisit').value = Utils.dateToGreek(job.nextVisit);
    document.getElementById('jobMaterialsCost').value = job.materialsCost || 0;
    document.getElementById('jobKilometers').value = job.kilometers || 0;
    document.getElementById('jobBillingHours').value = job.billingHours || 0;
    document.getElementById('jobBillingRate').value = job.billingRate || 50;
    document.getElementById('jobNotes').value = job.notes || '';

    // Load assigned workers and paints
    this.assignedWorkers = job.assignedWorkers ? [...job.assignedWorkers] : [];
    this.assignedPaints = job.paints ? [...job.paints] : [];
    this.renderAssignedWorkers();
    this.renderAssignedPaints();

    this.autoFillClientData();
    this.calculateCost();
    document.getElementById('jobForm').scrollIntoView({ behavior: 'smooth' });
  },

  deleteJob(id) {
    Modal.confirm({
      title: 'Διαγραφή Εργασίας',
      message: 'Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την εργασία;',
      onConfirm: () => {
        State.delete('jobs', id);
        Toast.success('Η εργασία διαγράφηκε');
        // Refresh the table to remove the deleted job
        this.refreshTable();
      }
    });
  },

  cancelForm() {
    document.getElementById('jobForm').style.display = 'none';
    document.getElementById('jobFormElement').reset();
    this.currentEdit = null;
    this.assignedWorkers = []; // Clear assigned workers
    this.assignedPaints = []; // Clear assigned paints
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
        return job.id.toLowerCase().includes(searchTerm) ||
               clientName.includes(searchTerm) ||
               (job.type || '').toLowerCase().includes(searchTerm);
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
          <select id="modalWorkerSelect" required>
            <option value="">Επιλέξτε εργάτη...</option>
            ${activeWorkers.map(w => `
              <option value="${w.id}" data-rate="${w.hourlyRate}">
                ${w.name} - ${w.specialty} (${Utils.formatCurrency(w.hourlyRate)}/ώρα)
              </option>
            `).join('')}
          </select>
        </div>

        <div class="form-group">
          <label>Ώρες Εργασίας <span class="required">*</span></label>
          <input type="number" id="modalWorkerHours" step="0.5" min="0.5" value="1" required>
        </div>

        <div class="form-group">
          <label>Ωρομίσθιο</label>
          <input type="text" id="modalWorkerRate" readonly value="0.00 €">
        </div>

        <div class="form-group span-2">
          <label>Κόστος Εργασίας</label>
          <input type="text" id="modalWorkerCost" readonly value="0.00 €" style="font-weight: bold; color: var(--accent-primary);">
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
        const hours = parseFloat(hoursInput.value || 0);
        const cost = rate * hours;

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

  addWorkerToJob(workerId, hours) {
    const workers = State.read('workers') || [];
    const worker = workers.find(w => w.id === workerId);

    if (!worker) {
      Toast.error('Ο εργάτης δεν βρέθηκε');
      return;
    }

    // Check if worker already assigned
    const existingIndex = this.assignedWorkers.findIndex(w => w.workerId === workerId);
    
    if (existingIndex !== -1) {
      Toast.warning(`Ο ${worker.name} είναι ήδη ανατεθειμένος. Επεξεργαστείτε τις ώρες του.`);
      return;
    }

    const laborCost = hours * worker.hourlyRate;

    this.assignedWorkers.push({
      workerId: worker.id,
      workerName: worker.name,
      specialty: worker.specialty,
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
      container.innerHTML = '<p class="text-muted" style="font-style: italic;">Δεν έχουν ανατεθεί εργάτες ακόμα</p>';
      return;
    }

    const totalHours = this.assignedWorkers.reduce((sum, w) => sum + w.hoursAllocated, 0);
    const totalCost = this.assignedWorkers.reduce((sum, w) => sum + w.laborCost, 0);

    container.innerHTML = `
      <div class="table-wrapper">
        <table class="data-table" style="margin-top: 10px;">
          <thead>
            <tr>
              <th>Εργάτης</th>
              <th>Ειδικότητα</th>
              <th>Ωρομίσθιο</th>
              <th>Ώρες</th>
              <th>Κόστος</th>
              <th style="width: 100px;">Ενέργειες</th>
            </tr>
          </thead>
          <tbody>
            ${this.assignedWorkers.map((w, index) => `
              <tr>
                <td><strong>${w.workerName}</strong></td>
                <td>${w.specialty}</td>
                <td>${Utils.formatCurrency(w.hourlyRate)}/ώρα</td>
                <td>${w.hoursAllocated}h</td>
                <td><strong style="color: var(--accent-primary);">${Utils.formatCurrency(w.laborCost)}</strong></td>
                <td>
                  <button class="btn-icon edit-assigned-worker-btn" data-worker-index="${index}" title="Επεξεργασία">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn-icon remove-assigned-worker-btn" data-worker-index="${index}" title="Αφαίρεση">
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            `).join('')}
            <tr style="background: var(--bg-secondary); font-weight: bold;">
              <td colspan="3" style="text-align: right;">ΣΥΝΟΛΟ:</td>
              <td>${totalHours.toFixed(1)}h</td>
              <td><strong style="color: var(--accent-primary);">${Utils.formatCurrency(totalCost)}</strong></td>
              <td></td>
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
          <input type="text" value="${worker.workerName} - ${worker.specialty}" readonly>
        </div>

        <div class="form-group">
          <label>Ώρες Εργασίας <span class="required">*</span></label>
          <input type="number" id="editWorkerHours" step="0.5" min="0.5" value="${worker.hoursAllocated}" required>
        </div>

        <div class="form-group">
          <label>Ωρομίσθιο</label>
          <input type="text" value="${Utils.formatCurrency(worker.hourlyRate)}/ώρα" readonly>
        </div>

        <div class="form-group span-2">
          <label>Κόστος Εργασίας</label>
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
        const cost = hours * worker.hourlyRate;
        costInput.value = Utils.formatCurrency(cost);
      });

      document.getElementById('confirmEditWorkerBtn').addEventListener('click', () => {
        const newHours = parseFloat(hoursInput.value);

        if (!newHours || newHours <= 0) {
          Toast.error('Εισάγετε έγκυρες ώρες εργασίας');
          return;
        }

        this.assignedWorkers[index].hoursAllocated = newHours;
        this.assignedWorkers[index].laborCost = newHours * worker.hourlyRate;

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

  // Paint Management Methods
  addPaint() {
    const content = `
      <div class="form-grid">
        <div class="form-group span-2">
          <label>Όνομα Χρώματος <span class="required">*</span></label>
          <input type="text" id="newPaintName" list="paintNamesList" placeholder="π.χ. Λευκό Ματ Ακρυλικό" required>
          <datalist id="paintNamesList">
            ${(State.read('paints') || []).map(p => `<option value="${p.name}">`).join('')}
          </datalist>
        </div>

        <div class="form-group span-2">
          <label>Κωδικός Χρώματος</label>
          <input type="text" id="newPaintCode" placeholder="π.χ. RAL 9010, NCS S0500-N">
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
      title: '<i class="fas fa-paint-brush"></i> Προσθήκη Χρώματος',
      content: content,
      footer: footer,
      size: 'md'
    });

    setTimeout(() => {
      const confirmBtn = document.getElementById('confirmAddPaintBtn');
      const nameInput = document.getElementById('newPaintName');
      const codeInput = document.getElementById('newPaintCode');

      if (confirmBtn && nameInput) {
        confirmBtn.addEventListener('click', () => {
          const paintName = nameInput.value.trim();
          const paintCode = codeInput.value.trim();

          if (!paintName) {
            Toast.error('Παρακαλώ εισάγετε όνομα χρώματος');
            return;
          }

          this.assignedPaints.push({
            name: paintName,
            code: paintCode
          });

          this.renderAssignedPaints();
          Toast.success('Το χρώμα προστέθηκε');
          Modal.close();
        });

        // Enter key support
        [nameInput, codeInput].forEach(input => {
          input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              confirmBtn.click();
            }
          });
        });

        nameInput.focus();
      }
    }, 100);
  },

  renderAssignedPaints() {
    const container = document.getElementById('paintsContainer');
    
    if (!container) return;

    if (this.assignedPaints.length === 0) {
      container.innerHTML = '<p class="text-muted" style="font-style: italic; margin: 10px 0;">Δεν έχουν προστεθεί χρώματα ακόμα</p>';
      return;
    }

    container.innerHTML = `
      <div class="table-wrapper">
        <table class="data-table" style="margin-top: 10px;">
          <thead>
            <tr>
              <th>Όνομα Χρώματος</th>
              <th>Κωδικός</th>
              <th style="width: 80px;">Ενέργειες</th>
            </tr>
          </thead>
          <tbody>
            ${this.assignedPaints.map((paint, index) => `
              <tr>
                <td><strong>${paint.name}</strong></td>
                <td>${paint.code || '-'}</td>
                <td>
                  <button class="btn-icon remove-paint-btn" data-paint-index="${index}" title="Αφαίρεση">
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

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
      title: 'Αφαίρεση Χρώματος',
      message: `Θέλετε σίγουρα να αφαιρέσετε το χρώμα "${paint.name}";`,
      confirmText: 'Αφαίρεση',
      confirmClass: 'btn-danger',
      onConfirm: () => {
        this.assignedPaints.splice(index, 1);
        this.renderAssignedPaints();
        Toast.success('Το χρώμα αφαιρέθηκε');
      }
    });
  }
};


