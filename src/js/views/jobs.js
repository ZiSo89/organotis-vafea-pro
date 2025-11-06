/* ========================================
   Jobs View - Διαχείριση Εργασιών
   ======================================== */

console.log('💼 Loading JobsView...');

window.JobsView = {
  currentEdit: null,
  tableClickHandler: null,
  // Store all event handlers to prevent duplicates
  formSubmitHandler: null,
  addBtnHandler: null,
  clearBtnHandler: null,
  clientSelectHandler: null,
  costFieldHandlers: {},

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
        <form id="jobFormElement" class="form-grid">
          
          <!-- Βασικά Στοιχεία -->
          <div class="form-section span-2">
            <h3><i class="fas fa-info-circle"></i> Βασικά Στοιχεία</h3>
          </div>

          <div class="form-group span-2">
            <label>Ημερομηνία <span class="required">*</span></label>
            <input type="text" id="jobDate" placeholder="ΗΗ/ΜΜ/ΕΕΕΕ" pattern="\\d{2}/\\d{2}/\\d{4}" required>
          </div>

          <!-- Στοιχεία Πελάτη -->
          <div class="form-section span-2">
            <h3><i class="fas fa-user"></i> Στοιχεία Πελάτη</h3>
          </div>

          <div class="form-group span-2">
            <label>Πελάτης <span class="required">*</span></label>
            <select id="jobClient" required>
              <option value="">Επιλέξτε πελάτη...</option>
              ${sortedClients.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </div>

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

          <!-- Λεπτομέρειες Εργασίας -->
          <div class="form-section span-2">
            <h3><i class="fas fa-paint-roller"></i> Λεπτομέρειες Εργασίας</h3>
          </div>

          <div class="form-group">
            <label>Τύπος Εργασίας <span class="required">*</span></label>
            <select id="jobType" required>
              <option value="">Επιλέξτε τύπο...</option>
              ${CONFIG.JOB_TYPES.map(type => `<option value="${type}">${type}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label>Κατάσταση <span class="required">*</span></label>
            <select id="jobStatus" required>
              ${CONFIG.STATUS_OPTIONS.map(status => `<option value="${status}">${status}</option>`).join('')}
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

          <!-- Χρώμα & Υλικά -->
          <div class="form-section span-2">
            <h3><i class="fas fa-palette"></i> Χρώμα & Υλικά</h3>
          </div>

          <div class="form-group">
            <label>Όνομα Χρώματος</label>
            <input type="text" id="jobPaintName" list="paintNames">
            <datalist id="paintNames">
              ${paints.map(p => `<option value="${p.name}">`).join('')}
            </datalist>
          </div>

          <div class="form-group">
            <label>Κωδικός Χρώματος</label>
            <input type="text" id="jobPaintCode" list="paintCodes">
            <datalist id="paintCodes">
              ${paints.map(p => `<option value="${p.code}">`).join('')}
            </datalist>
          </div>

          <div class="form-group">
            <label>Φινίρισμα</label>
            <select id="jobFinish">
              <option value="">Επιλέξτε...</option>
              ${CONFIG.FINISH_OPTIONS.map(finish => `<option value="${finish}">${finish}</option>`).join('')}
            </select>
          </div>

          <div class="form-group">
            <label>Primer/Υπόστρωμα</label>
            <input type="text" id="jobPrimer">
          </div>

          <div class="form-group">
            <label>Αριθμός Στρώσεων</label>
            <input type="number" id="jobCoats" min="1" value="2">
          </div>

          <!-- Προγραμματισμός -->
          <div class="form-section span-2">
            <h3><i class="fas fa-calendar"></i> Προγραμματισμός</h3>
          </div>

          <div class="form-group">
            <label>Επόμενη Επίσκεψη</label>
            <input type="text" id="jobNextVisit" placeholder="ΗΗ/ΜΜ/ΕΕΕΕ" pattern="\\d{2}/\\d{2}/\\d{4}">
          </div>

          <!-- Κοστολόγηση -->
          <div class="form-section span-2">
            <h3><i class="fas fa-euro-sign"></i> Κοστολόγηση</h3>
          </div>

          <div class="form-group">
            <label>Κόστος Υλικών (€)</label>
            <input type="number" id="jobMaterialsCost" step="0.01" min="0" value="0">
          </div>

          <div class="form-group">
            <label>Ώρες Εργασίας</label>
            <input type="number" id="jobHours" step="0.5" min="0" value="0">
          </div>

          <div class="form-group">
            <label>Χιλιόμετρα</label>
            <input type="number" id="jobKilometers" step="1" min="0" value="0">
          </div>

          <!-- Cost Summary -->
          <div class="form-group span-2">
            <div class="cost-summary">
              <div class="cost-row">
                <span>Κόστος Εργασίας:</span>
                <strong id="laborCostDisplay">0.00 €</strong>
              </div>
              <div class="cost-row">
                <span>Υλικά:</span>
                <strong id="materialsCostDisplay">0.00 €</strong>
              </div>
              <div class="cost-row">
                <span>Μετακίνηση:</span>
                <strong id="travelCostDisplay">0.00 €</strong>
              </div>
              <div class="cost-row">
                <span>Καθαρό:</span>
                <strong id="netCostDisplay">0.00 €</strong>
              </div>
              <div class="cost-row">
                <span>ΦΠΑ:</span>
                <strong id="vatCostDisplay">0.00 €</strong>
              </div>
              <div class="cost-row total">
                <span>ΣΥΝΟΛΟ:</span>
                <strong id="totalCostDisplay">0.00 €</strong>
              </div>
            </div>
          </div>

          <!-- Σημειώσεις -->
          <div class="form-section span-2">
            <h3><i class="fas fa-sticky-note"></i> Σημειώσεις</h3>
          </div>

          <div class="form-group span-2">
            <label>Σημειώσεις</label>
            <textarea id="jobNotes" rows="4"></textarea>
          </div>

          <!-- Actions -->
          <div class="form-actions span-2">
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-save"></i> Αποθήκευση
            </button>
            <button type="button" class="btn btn-secondary" id="clearJobFormBtn">
              <i class="fas fa-eraser"></i> Καθαρισμός
            </button>
            <button type="button" class="btn btn-ghost" id="cancelJobFormBtn">
              <i class="fas fa-times"></i> Ακύρωση
            </button>
          </div>

        </form>
      </div>

      <!-- Filters & Search -->
      <div class="card">
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
    
    // Clear form button - remove old listener first
    const clearBtn = document.getElementById('clearJobFormBtn');
    if (clearBtn) {
      if (this.clearBtnHandler) {
        clearBtn.removeEventListener('click', this.clearBtnHandler);
      }
      this.clearBtnHandler = () => this.clearForm();
      clearBtn.addEventListener('click', this.clearBtnHandler);
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
      this.clientSelectHandler = () => this.autoFillClientData();
      clientSelect.addEventListener('change', this.clientSelectHandler);
    }

    // Cost calculation fields - real-time updates
    const costFields = ['jobMaterialsCost', 'jobHours', 'jobKilometers'];
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
          const jobId = viewBtn.dataset.jobId;
          this.viewJob(jobId);
        } else if (editBtn) {
          const jobId = editBtn.dataset.jobId;
          this.editJob(jobId);
        } else if (deleteBtn) {
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
      return `
        <div class="empty-state">
          <i class="fas fa-briefcase fa-3x"></i>
          <h3>Δεν υπάρχουν εργασίες</h3>
          <p>Δημιουργήστε την πρώτη σας εργασία!</p>
        </div>
      `;
    }

    // Reverse to show latest first
    const sortedJobs = [...jobs].reverse();

    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>Ημερομηνία</th>
            <th>Πελάτης</th>
            <th>Τύπος</th>
            <th>Κατάσταση</th>
            <th>Επόμενη Επίσκεψη</th>
            <th>Σύνολο</th>
            <th>Ενέργειες</th>
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
    
    // Reset form and set defaults - use Greek date format
    document.getElementById('jobFormElement').reset();
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    jobDate.value = `${dd}/${mm}/${yyyy}`;
    jobStatus.value = 'Υποψήφιος';
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
    const hourlyRate = pricingSettings.hourlyRate || 25;
    const vatPercent = pricingSettings.vat || 24;
    const costPerKm = pricingSettings.travelCost || 0.5;
    
    const materials = parseFloat(document.getElementById('jobMaterialsCost')?.value || 0);
    const hours = parseFloat(document.getElementById('jobHours')?.value || 0);
    const kilometers = parseFloat(document.getElementById('jobKilometers')?.value || 0);

    const laborCost = hours * hourlyRate;
    const travelCost = kilometers * costPerKm;
    const netCost = materials + laborCost + travelCost;
    const vatAmount = netCost * (vatPercent / 100);
    const totalCost = netCost + vatAmount;

    // Update displays
    const laborDisplay = document.getElementById('laborCostDisplay');
    const materialsDisplay = document.getElementById('materialsCostDisplay');
    const travelDisplay = document.getElementById('travelCostDisplay');
    const netDisplay = document.getElementById('netCostDisplay');
    const vatDisplay = document.getElementById('vatCostDisplay');
    const totalDisplay = document.getElementById('totalCostDisplay');
    
    if (laborDisplay) laborDisplay.textContent = Utils.formatCurrency(laborCost);
    if (materialsDisplay) materialsDisplay.textContent = Utils.formatCurrency(materials);
    if (travelDisplay) travelDisplay.textContent = Utils.formatCurrency(travelCost);
    if (netDisplay) netDisplay.textContent = Utils.formatCurrency(netCost);
    if (vatDisplay) vatDisplay.textContent = Utils.formatCurrency(vatAmount);
    if (totalDisplay) totalDisplay.textContent = Utils.formatCurrency(totalCost);
  },

  saveJob(e) {
    e.preventDefault();

    // Get pricing settings
    const pricingSettings = JSON.parse(localStorage.getItem('pricing_settings') || '{}');
    const hourlyRate = pricingSettings.hourlyRate || 25;
    const vatPercent = pricingSettings.vat || 24;
    const costPerKm = pricingSettings.travelCost || 0.5;

    const jobData = {
      date: Utils.greekToDate(document.getElementById('jobDate').value),
      clientId: document.getElementById('jobClient').value,
      type: document.getElementById('jobType').value,
      status: document.getElementById('jobStatus').value,
      rooms: parseInt(document.getElementById('jobRooms').value) || null,
      area: parseFloat(document.getElementById('jobArea').value) || null,
      substrate: document.getElementById('jobSubstrate').value,
      paintName: document.getElementById('jobPaintName').value,
      paintCode: document.getElementById('jobPaintCode').value,
      finish: document.getElementById('jobFinish').value,
      primer: document.getElementById('jobPrimer').value,
      coats: parseInt(document.getElementById('jobCoats').value) || 2,
      nextVisit: Utils.greekToDate(document.getElementById('jobNextVisit').value),
      materialsCost: parseFloat(document.getElementById('jobMaterialsCost').value) || 0,
      hours: parseFloat(document.getElementById('jobHours').value) || 0,
      kilometers: parseFloat(document.getElementById('jobKilometers').value) || 0,
      hourlyRate: hourlyRate,
      vat: vatPercent,
      costPerKm: costPerKm,
      notes: document.getElementById('jobNotes').value
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

    // Calculate costs
    const laborCost = jobData.hours * jobData.hourlyRate;
    const travelCost = jobData.kilometers * jobData.costPerKm;
    const netCost = jobData.materialsCost + laborCost + travelCost;
    const vatAmount = netCost * (jobData.vat / 100);
    
    jobData.laborCost = laborCost;
    jobData.travelCost = travelCost;
    jobData.netCost = netCost;
    jobData.vatAmount = vatAmount;
    jobData.totalCost = netCost + vatAmount;

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

        <!-- Χρώμα -->
        <div class="detail-section">
          <h4><i class="fas fa-palette"></i> Χρώμα</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Όνομα Χρώματος:</label>
              <span>${job.paintName || '-'}</span>
            </div>
            <div class="detail-item">
              <label>Κωδικός:</label>
              <span>${job.paintCode || '-'}</span>
            </div>
            <div class="detail-item">
              <label>Φινίρισμα:</label>
              <span>${job.finish || '-'}</span>
            </div>
            <div class="detail-item">
              <label>Αστάρι:</label>
              <span>${job.primer || '-'}</span>
            </div>
            <div class="detail-item">
              <label>Στρώσεις:</label>
              <span>${job.coats || '-'}</span>
            </div>
          </div>
        </div>

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

    // Fill form - convert dates from YYYY-MM-DD to DD/MM/YYYY
    document.getElementById('jobDate').value = Utils.dateToGreek(job.date);
    document.getElementById('jobClient').value = job.clientId;
    document.getElementById('jobType').value = job.type || '';
    document.getElementById('jobStatus').value = job.status || '';
    document.getElementById('jobRooms').value = job.rooms || '';
    document.getElementById('jobArea').value = job.area || '';
    document.getElementById('jobSubstrate').value = job.substrate || '';
    document.getElementById('jobPaintName').value = job.paintName || '';
    document.getElementById('jobPaintCode').value = job.paintCode || '';
    document.getElementById('jobFinish').value = job.finish || '';
    document.getElementById('jobPrimer').value = job.primer || '';
    document.getElementById('jobCoats').value = job.coats || 2;
    document.getElementById('jobNextVisit').value = Utils.dateToGreek(job.nextVisit);
    document.getElementById('jobMaterialsCost').value = job.materialsCost || 0;
    document.getElementById('jobHours').value = job.hours || 0;
    document.getElementById('jobKilometers').value = job.kilometers || 0;
    document.getElementById('jobNotes').value = job.notes || '';

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
    this.calculateCost();
  },

  clearForm() {
    document.getElementById('jobFormElement').reset();
    // Reset to default values
    document.getElementById('jobDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('jobStatus').value = 'Υποψήφιος';
    document.getElementById('jobCoats').value = 2;
    this.currentEdit = null;
    this.calculateCost();
    Toast.info('Η φόρμα καθαρίστηκε');
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

    document.getElementById('jobsTableContainer').innerHTML = this.renderTable(jobs);
  },

  openInMaps(address) {
    const url = `https://www.google.com/maps/search/?api=1&query=${address}`;
    window.open(url, '_blank');
  }
};

