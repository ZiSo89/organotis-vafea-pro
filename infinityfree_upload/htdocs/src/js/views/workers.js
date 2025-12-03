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
  specialtyFilterHandler: null,

  render(container) {
    const workers = State.read('workers') || [];

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
            <label>Ειδικότητα <span class="required">*</span></label>
            <select id="w_specialty" required>
              <option value="">Επιλέξτε ειδικότητα...</option>
              <option value="Όλες οι ειδικότητες">Όλες οι ειδικότητες</option>
              <option value="Ελαιοχρωματιστής">Ελαιοχρωματιστής</option>
              <option value="Βοηθός">Βοηθός</option>
              <option value="Γυψαδόρος">Γυψαδόρος</option>
              <option value="Βαφέας">Βαφέας</option>
              <option value="Ειδικός σε Ξύλο">Ειδικός σε Ξύλο</option>
            </select>
          </div>

          <div class="form-group">
            <label>Ωρομίσθιο (€) <span class="required">*</span></label>
            <input type="number" id="w_hourlyRate" min="0" placeholder="π.χ. 15" required />
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

          <select id="statusFilter">
            <option value="">Όλες οι καταστάσεις</option>
            <option value="active">Ενεργοί</option>
            <option value="inactive">Ανενεργοί</option>
          </select>

          <select id="specialtyFilter">
            <option value="">Όλες οι ειδικότητες</option>
            <option value="Ελαιοχρωματιστής">Ελαιοχρωματιστής</option>
            <option value="Βοηθός">Βοηθός</option>
            <option value="Γυψαδόρος">Γυψαδόρος</option>
            <option value="Βαφέας">Βαφέας</option>
            <option value="Ειδικός σε Ξύλο">Ειδικός σε Ξύλο</option>
          </select>
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

    // Specialty filter
    const specialtyFilter = document.getElementById('specialtyFilter');
    if (specialtyFilter) {
      if (this.specialtyFilterHandler) {
        specialtyFilter.removeEventListener('change', this.specialtyFilterHandler);
      }
      this.specialtyFilterHandler = () => this.filterWorkers();
      specialtyFilter.addEventListener('change', this.specialtyFilterHandler);
    }
    
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

  renderTable(workers) {
    if (workers.length === 0) {
      return Utils.renderEmptyState(
        'fa-hard-hat',
        'Δεν υπάρχουν εργάτες',
        'Δημιουργήστε τον πρώτο σας εργάτη!'
      );
    }

    // Get jobs to calculate monthly stats
    const jobs = State.read('jobs') || [];
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    // Sort by createdAt timestamp - latest first
    const sortedWorkers = Utils.sortBy(workers, 'createdAt', 'desc');

    return `
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Όνομα</th>
              <th>Ειδικότητα</th>
              <th>Ωρομίσθιο</th>
              <th>Τηλέφωνο</th>
              <th>Ώρες Μήνα</th>
              <th>Μισθός Μήνα</th>
              <th>Κατάσταση</th>
              <th style="text-align: right;">Ενέργειες</th>
            </tr>
          </thead>
          <tbody>
          ${sortedWorkers.map(worker => {
            // Calculate monthly hours and earnings
            let monthlyHours = 0;
            let monthlyEarnings = 0;

            jobs.forEach(job => {
              // Parse assignedWorkers if it's a string
              let assignedWorkers = job.assignedWorkers;
              if (typeof assignedWorkers === 'string') {
                try {
                  assignedWorkers = JSON.parse(assignedWorkers);
                } catch (e) {
                  console.error('Error parsing assignedWorkers for job', job.id, e);
                  assignedWorkers = [];
                }
              }
              
              if (Array.isArray(assignedWorkers) && job.date) {
                const jobDate = new Date(job.date);
                if (jobDate.getMonth() === thisMonth && jobDate.getFullYear() === thisYear) {
                  const workerAssignment = assignedWorkers.find(w => w.workerId === worker.id);
                  if (workerAssignment) {
                    monthlyHours += workerAssignment.hoursAllocated || 0;
                    // laborCost is what you PAY the worker (their hourlyRate × hours)
                    monthlyEarnings += workerAssignment.laborCost || 0;
                  }
                }
              }
            });

            const statusBadge = worker.status === 'active' 
              ? '<span class="status-pill status-active">Ενεργός</span>'
              : '<span class="status-pill status-inactive">Ανενεργός</span>';
            
            return `
            <tr>
              <td title="${worker.name}"><strong>${worker.name}</strong></td>
              <td title="${worker.specialty}">${worker.specialty}</td>
              <td title="${Utils.formatCurrency(worker.hourlyRate)}">${Utils.formatCurrency(worker.hourlyRate)}/ώρα</td>
              <td title="${worker.phone || '-'}">${worker.phone ? `<a href="tel:${worker.phone}" style="color: var(--color-text); text-decoration: none;">${worker.phone}</a>` : '-'}</td>
              <td><strong>${monthlyHours.toFixed(1)}h</strong></td>
              <td><strong>${Utils.formatCurrency(monthlyEarnings)}</strong></td>
              <td>${statusBadge}</td>
              <td class="actions">
                <button class="btn-icon view-worker-btn" data-worker-id="${worker.id}" title="Προβολή">
                  <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon edit-worker-btn" data-worker-id="${worker.id}" title="Επεξεργασία">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-danger delete-worker-btn" data-worker-id="${worker.id}" title="Διαγραφή">
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
      specialty: document.getElementById('w_specialty').value,
      hourlyRate: parseFloat(document.getElementById('w_hourlyRate').value) || 0,
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
    if (!workerData.name || !workerData.phone || !workerData.specialty || !workerData.hourlyRate) {
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
    const container = document.getElementById('workersTableContainer');
    if (container) {
      container.innerHTML = this.renderTable(workers);
    }
  },

  viewWorker(id) {
    console.log('[Workers] Viewing worker:', id);
    const worker = State.data.workers.find(w => Number(w.id) === Number(id));
    if (!worker) {
      console.error('[Workers] Worker not found:', id);
      return;
    }

    console.log('[Workers] Worker data:', worker);

    // Get worker's work history from jobs
    const jobs = State.read('jobs') || [];
    console.log('[Workers] Total jobs in database:', jobs.length);
    
    const workerJobs = jobs.filter(job => {
      // Parse assignedWorkers if it's a string
      let assignedWorkers = job.assignedWorkers;
      if (typeof assignedWorkers === 'string') {
        try {
          assignedWorkers = JSON.parse(assignedWorkers);
        } catch (e) {
          console.error('[Workers] Error parsing assignedWorkers for job', job.id, e);
          return false;
        }
      }
      
      // Check if worker is in this job - compare as strings to avoid type issues
      const hasWorker = Array.isArray(assignedWorkers) && assignedWorkers.some(w => String(w.workerId) === String(id));
      if (hasWorker) {
        console.log('[Workers] Job', job.id, 'includes worker', id);
      }
      return hasWorker;
    });

    console.log('[Workers] Found', workerJobs.length, 'jobs for worker', id);

    const statusBadge = worker.status === 'active' 
      ? '<span class="status-pill status-active">Ενεργός</span>'
      : '<span class="status-pill status-inactive">Ανενεργός</span>';

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
              <span>${worker.specialty}</span>
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
        ${workerJobs.length > 0 ? `
        <div class="detail-section">
          <h4><i class="fas fa-briefcase"></i> Εργασίες (${workerJobs.length})</h4>
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Εργασία</th>
                  <th>Πελάτης</th>
                  <th>Ώρες</th>
                  <th>Κόστος</th>
                </tr>
              </thead>
              <tbody>
                ${workerJobs.map(job => {
                  const client = State.data.clients.find(c => c.id === job.clientId);
                  
                  // Parse assignedWorkers if it's a string
                  let assignedWorkers = job.assignedWorkers;
                  if (typeof assignedWorkers === 'string') {
                    try {
                      assignedWorkers = JSON.parse(assignedWorkers);
                    } catch (e) {
                      console.error('[Workers] Error parsing assignedWorkers for job', job.id, e);
                      assignedWorkers = [];
                    }
                  }
                  
                  // Compare as strings to avoid type mismatch
                  const workerAssignment = Array.isArray(assignedWorkers) 
                    ? assignedWorkers.find(w => String(w.workerId) === String(id))
                    : null;
                    
                  return `
                    <tr>
                      <td><strong>${job.id}</strong></td>
                      <td>${client?.name || 'Άγνωστος'}</td>
                      <td>${workerAssignment?.hoursAllocated || 0}h</td>
                      <td><strong style="color: var(--accent-primary);">${Utils.formatCurrency(workerAssignment?.laborCost || 0)}</strong></td>
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
    document.getElementById('w_specialty').value = worker.specialty || '';
    document.getElementById('w_hourlyRate').value = worker.hourlyRate || '';
    document.getElementById('w_status').value = worker.status || 'active';
    document.getElementById('w_hireDate').value = Utils.dateToGreek(worker.hireDate);
    document.getElementById('w_notes').value = worker.notes || '';

    document.getElementById('workerForm').scrollIntoView({ behavior: 'smooth' });
  },

  async deleteWorker(id) {
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
    this.currentEdit = null;
    Toast.info('Η φόρμα καθαρίστηκε');
  },

  filterWorkers() {
    const searchTerm = document.getElementById('workerSearch').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const specialtyFilter = document.getElementById('specialtyFilter').value;

    let workers = State.data.workers;

    // Filter by search
    if (searchTerm) {
      workers = workers.filter(worker =>
        worker.name.toLowerCase().includes(searchTerm) ||
        (worker.phone || '').includes(searchTerm) ||
        worker.specialty.toLowerCase().includes(searchTerm)
      );
    }

    // Filter by status
    if (statusFilter) {
      workers = workers.filter(worker => worker.status === statusFilter);
    }

    // Filter by specialty
    if (specialtyFilter) {
      workers = workers.filter(worker => worker.specialty === specialtyFilter);
    }

    document.getElementById('workersTableContainer').innerHTML = this.renderTable(workers);
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
    const timesheets = State.read('timesheets') || [];
    
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    // Calculate monthly stats per worker
    const workerStats = workers.map(worker => {
      const monthlyTimesheets = timesheets.filter(t => {
        if (t.workerId !== worker.id || !t.checkOut) return false;
        const date = new Date(t.checkIn);
        return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
      });

      const monthlyHours = monthlyTimesheets.reduce((sum, t) => sum + (t.hoursWorked || 0), 0);
      const monthlyEarnings = monthlyHours * worker.hourlyRate;

      return {
        name: worker.name,
        specialty: worker.specialty,
        hours: monthlyHours,
        earnings: monthlyEarnings,
        shifts: monthlyTimesheets.length
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
                    <th>Ειδικότητα</th>
                    <th>Βάρδιες</th>
                    <th>Ώρες</th>
                    <th>Έσοδα</th>
                  </tr>
                </thead>
                <tbody>
                  ${workerStats.map(stat => `
                    <tr>
                      <td><strong>${stat.name}</strong></td>
                      <td>${stat.specialty}</td>
                      <td>${stat.shifts}</td>
                      <td><strong>${stat.hours.toFixed(1)}h</strong></td>
                      <td><strong style="color: var(--accent-primary);">${Utils.formatCurrency(stat.earnings)}</strong></td>
                    </tr>
                  `).join('')}
                  <tr style="background: var(--bg-secondary); font-weight: bold;">
                    <td colspan="2">ΣΥΝΟΛΟ</td>
                    <td>${workerStats.reduce((sum, s) => sum + s.shifts, 0)}</td>
                    <td>${workerStats.reduce((sum, s) => sum + s.hours, 0).toFixed(1)}h</td>
                    <td style="color: var(--accent-primary);">${Utils.formatCurrency(workerStats.reduce((sum, s) => sum + s.earnings, 0))}</td>
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
  }
};
