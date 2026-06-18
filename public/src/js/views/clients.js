/* ========================================
   Clients View - Διαχείριση Πελατών
   ======================================== */

window.ClientsView = {
  editingClientId: null,
  // Event handlers stored to prevent duplicates
  formSubmitHandler: null,
  clearBtnHandler: null,
  cancelBtnHandler: null,
  addBtnHandler: null,
  searchHandler: null,
  tableClickHandler: null,
  lazyTableKey: 'clients-table',
  lazyBatchSize: 20,

  render(container, params = {}) {
    const clients = State.read('clients') || [];
    Utils.resetInfiniteList(this.lazyTableKey, this.lazyBatchSize);

    container.innerHTML = `
      <div class="view-header">
        <h1><i class="fas fa-users"></i> Πελάτες</h1>
        <button class="btn btn-primary" id="addClientBtn">
          <i class="fas fa-plus"></i> Νέος Πελάτης
        </button>
      </div>

      <!-- Form (Hidden by default) -->
      <div id="clientForm" class="card" style="display: none;">
        <h2 id="clientFormTitle">Νέος Πελάτης</h2>
        <form id="clientFormElement" class="form-grid">
          
          <!-- Βασικά Στοιχεία -->
          <div class="form-section span-2">
            <h3><i class="fas fa-info-circle"></i> Βασικά Στοιχεία</h3>
          </div>

          <div class="form-group span-2">
            <label>Ονοματεπώνυμο <span class="required">*</span></label>
            <input type="text" id="c_name" placeholder="π.χ. κ. Παπαδόπουλος Γιώργος" required />
          </div>

          <div class="form-group">
            <label>Τηλέφωνο</label>
            <input type="tel" id="c_phone" placeholder="6900000000" />
          </div>

          <div class="form-group">
            <label>Email</label>
            <input type="email" id="c_email" placeholder="email@example.com" />
          </div>

          <!-- Διεύθυνση -->
          <div class="form-section span-2">
            <h3><i class="fas fa-map-marker-alt"></i> Διεύθυνση</h3>
          </div>

          <div class="form-group span-2">
            <label>Διεύθυνση</label>
            <input type="text" id="c_address" placeholder="Οδός Αριθμός" />
          </div>

          <div class="form-group">
            <label>Πόλη</label>
            <input type="text" id="c_city" placeholder="Αλεξανδρούπολη" value="Αλεξανδρούπολη" />
          </div>

          <div class="form-group">
            <label>Τ.Κ.</label>
            <input type="text" id="c_postal" placeholder="68100" value="68100" maxlength="5" />
          </div>

          <!-- Σημειώσεις -->
          <div class="form-section span-2">
            <h3><i class="fas fa-sticky-note"></i> Σημειώσεις</h3>
          </div>

          <div class="form-group span-2">
            <label>Σημειώσεις</label>
            <textarea id="c_notes" rows="3"></textarea>
          </div>

          <!-- Actions -->
          <div class="form-actions span-2">
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-save"></i> Αποθήκευση
            </button>
            <button type="button" class="btn btn-ghost" id="cancelClientFormBtn">
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
            <input type="text" id="clientSearch" placeholder="Αναζήτηση πελατών..." />
          </div>
        </div>
      </div>

      <!-- Clients Table -->
      <div class="card">
        <div id="clientsTableContainer">
          ${this.renderTable(clients)}
        </div>
      </div>
    `;

    this.setupEventListeners();
    this.setupLazyTable(clients);

    if (params?.clientId) {
      setTimeout(() => this.viewClient(params.clientId), 0);
    }
  },

  setupEventListeners() {
    // Add button - remove old listener first
    const addBtn = document.getElementById('addClientBtn');
    if (addBtn) {
      if (this.addBtnHandler) {
        addBtn.removeEventListener('click', this.addBtnHandler);
      }
      this.addBtnHandler = () => this.showAddForm();
      addBtn.addEventListener('click', this.addBtnHandler);
    }

    // Form submit - remove old listener first
    const form = document.getElementById('clientFormElement');
    if (form) {
      if (this.formSubmitHandler) {
        form.removeEventListener('submit', this.formSubmitHandler);
      }
      this.formSubmitHandler = (e) => {
        e.preventDefault();
        this.saveClient();
      };
      form.addEventListener('submit', this.formSubmitHandler);
    }
    // Cancel button - remove old listener first
    const cancelBtn = document.getElementById('cancelClientFormBtn');
    if (cancelBtn) {
      if (this.cancelBtnHandler) {
        cancelBtn.removeEventListener('click', this.cancelBtnHandler);
      }
      this.cancelBtnHandler = () => this.cancelForm();
      cancelBtn.addEventListener('click', this.cancelBtnHandler);
    }

    // Search - remove old listener first
    const searchInput = document.getElementById('clientSearch');
    if (searchInput) {
      if (this.searchHandler) {
        searchInput.removeEventListener('input', this.searchHandler);
      }
      this.searchHandler = () => this.filterClients();
      searchInput.addEventListener('input', this.searchHandler);
    }

    // Event delegation for table buttons
    const container = document.getElementById('contentArea');
    if (container) {
      // Remove old listener if exists
      if (this.tableClickHandler) {
        container.removeEventListener('click', this.tableClickHandler);
      }
      
      // Create new handler
      this.tableClickHandler = (e) => {
        const viewBtn = e.target.closest('.view-client-btn');
        const editBtn = e.target.closest('.edit-client-btn');
        const deleteBtn = e.target.closest('.delete-client-btn');
        
        if (viewBtn) {
          const clientId = viewBtn.dataset.clientId;
          console.log('[Clients] View button clicked, clientId:', clientId);
          this.viewClient(clientId);
        } else if (editBtn) {
          const clientId = editBtn.dataset.clientId;
          console.log('[Clients] Edit button clicked, clientId:', clientId);
          this.editClient(clientId);
        } else if (deleteBtn) {
          const clientId = deleteBtn.dataset.clientId;
          console.log('[Clients] Delete button clicked, clientId:', clientId, 'button:', deleteBtn);
          this.deleteClient(clientId);
        }
      };
      
      // Add new listener
      container.addEventListener('click', this.tableClickHandler);
    }
  },

  showAddForm() {
    this.editingClientId = null;
    document.getElementById('clientFormTitle').textContent = 'Νέος Πελάτης';
    document.getElementById('clientForm').style.display = 'block';
    document.getElementById('clientFormElement').reset();
    document.getElementById('clientForm').scrollIntoView({ behavior: 'smooth' });
  },

  async saveClient() {
    console.log('[Clients] Saving client...');
    const name = document.getElementById('c_name').value.trim();
    const phone = document.getElementById('c_phone').value.trim();
    const email = document.getElementById('c_email').value.trim();
    const address = document.getElementById('c_address').value.trim();
    const city = document.getElementById('c_city').value.trim();
    const postalCode = document.getElementById('c_postal').value.trim();
    const afm = document.getElementById('c_afm')?.value.trim() || '';
    const notes = document.getElementById('c_notes').value.trim();

    // Check if updating existing client
    const existingId = this.editingClientId;
    console.log('[Clients] Existing ID:', existingId);
    
    const client = {
      name,
      phone,
      email,
      address,
      city,
      postalCode,
      afm,
      notes
    };

    console.log('[Clients] Client data:', client);

    // Validation
    const validation = Validation.validateClient(client);
    if (!validation.valid) {
      console.warn('[Clients] Validation failed:', validation.errors);
      Validation.showErrors(validation.errors);
      return;
    }

    // Get coordinates
    if (!existingId || !State.data.clients.find(c => c.id === existingId)?.coordinates) {
      // Try to geocode the address
      if (address && city) {
        Toast.info('🔍 Αναζήτηση συντεταγμένων...');
        const coords = await Geocoding.getCoordinates(address, city);
        
        if (coords) {
          client.coordinates = coords;
          Toast.success('✅ Βρέθηκαν συντεταγμένες!');
        } else {
          // No coordinates found - leave empty
          client.coordinates = null;
          Toast.warning('⚠️ Δεν βρέθηκαν συντεταγμένες - μπορείς να τις ορίσεις στον Χάρτη');
        }
      } else {
        // No address provided
        client.coordinates = null;
      }
    } else {
      // Keep existing coordinates
      const existing = State.data.clients.find(c => c.id === existingId);
      client.coordinates = existing.coordinates;
    }

    // Save or update
    try {
      if (existingId) {
        await State.update('clients', existingId, client);
        Toast.success('Ο πελάτης ενημερώθηκε!');
      } else {
        await State.create('clients', client);
        Toast.success('Ο πελάτης δημιουργήθηκε!');
      }

      this.cancelForm();
      this.refreshTable();
    } catch (error) {
      console.error('❌ Error saving client:', error);
    }
  },

  refreshTable() {
    const clients = State.read('clients') || [];
    this.renderTableWithLazy(clients, { reset: true });
  },

  renderTableWithLazy(clients, { reset = false } = {}) {
    const container = document.getElementById('clientsTableContainer');
    if (container) {
      if (reset) {
        Utils.resetInfiniteList(this.lazyTableKey, this.lazyBatchSize);
      }
      container.innerHTML = this.renderTable(clients);
      this.setupLazyTable(clients);
    }
  },

  setupLazyTable(clients) {
    Utils.setupInfiniteScroll({
      key: this.lazyTableKey,
      total: Array.isArray(clients) ? clients.length : 0,
      batchSize: this.lazyBatchSize,
      onLoadMore: () => this.renderTableWithLazy(clients)
    });
  },

  cancelForm() {
    document.getElementById('clientForm').style.display = 'none';
    document.getElementById('clientFormElement').reset();
    this.editingClientId = null;
  },

  clearForm() {
    document.getElementById('clientFormElement').reset();
    // Επαναφορά default τιμών
    document.getElementById('c_city').value = 'Αλεξανδρούπολη';
    document.getElementById('c_postal').value = '68100';
    this.editingClientId = null;
    Toast.info('Η φόρμα καθαρίστηκε');
  },

  getPaymentsForClient(clientId) {
    const payments = State.read('jobPayments') || [];
    const jobs = State.read('jobs') || [];
    const jobsById = new Map(jobs.map(job => [Number(job.id), job]));

    return payments
      .filter(payment => {
        const paymentClientId = payment.clientId || payment.client_id;
        if (paymentClientId) {
          return Number(paymentClientId) === Number(clientId);
        }

        const jobId = payment.jobId || payment.job_id;
        const job = jobsById.get(Number(jobId));
        const jobClientId = job?.clientId || job?.client_id;
        return Number(jobClientId) === Number(clientId);
      })
      .map(payment => {
        const jobId = payment.jobId || payment.job_id;
        return {
          ...payment,
          job: jobsById.get(Number(jobId)) || null
        };
      })
      .sort((a, b) => {
        const dateCompare = String(b.paymentDate || b.payment_date || '').localeCompare(String(a.paymentDate || a.payment_date || ''));
        if (dateCompare !== 0) return dateCompare;
        return Number(b.id || 0) - Number(a.id || 0);
      });
  },

  getJobsForClient(clientId) {
    const jobs = State.read('jobs') || [];
    return jobs.filter(job => Number(job.clientId || job.client_id) === Number(clientId));
  },

  getJobBillingAmount(job) {
    if (!job) return 0;

    return window.JobFinancials.compute(job).billingAmount;
  },

  getClientPaymentSummary(clientId) {
    const payments = this.getPaymentsForClient(clientId);
    const jobs = this.getJobsForClient(clientId);
    const paidAmount = payments.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
    const billingAmount = jobs.reduce((sum, job) => sum + this.getJobBillingAmount(job), 0);

    return {
      paidAmount,
      billingAmount,
      balance: billingAmount - paidAmount,
      hasFinancialActivity: payments.length > 0 || billingAmount > 0
    };
  },

  renderClientPaymentCell(clientId) {
    const summary = this.getClientPaymentSummary(clientId);
    if (!summary.hasFinancialActivity) {
      return '-';
    }

    const balance = Math.max(summary.balance, 0);
    return `
      <strong style="color: var(--success);">${Utils.formatCurrency(summary.paidAmount)}</strong>
      ${balance > 0.005 ? `<br><small style="color: var(--warning, #f59e0b);">Υπόλοιπο: ${Utils.formatCurrency(balance)}</small>` : ''}
    `;
  },

  getClientJobs(clientId) {
    return (State.data.jobs || []).filter(job => Number(job.clientId) === Number(clientId));
  },

  viewClient(id) {
    const client = State.data.clients.find(c => Number(c.id) === Number(id));
    if (!client) {
      console.error('❌ Client not found:', id);
      return;
    }

    const clientJobs = this.getClientJobs(client.id).slice(0, 8);
    const jobsHtml = clientJobs.length
      ? `<ul class="activities-list">${clientJobs.map(job => `
          <li class="activity-item" style="cursor:pointer;" onclick="Router.navigate('jobs?jobId=${job.id}')">
            <div class="activity-content">
              <div class="activity-title">#${Utils.escapeHtml(String(job.id))} — ${Utils.escapeHtml(job.title || job.type || 'Εργασία')}</div>
              <div class="activity-time">${Utils.escapeHtml(job.status || '-')} · ${job.nextVisit ? Utils.formatDate(job.nextVisit) : 'Χωρίς επίσκεψη'}</div>
            </div>
          </li>
        `).join('')}</ul>`
      : '<p class="text-muted">Δεν υπάρχουν εργασίες για αυτόν τον πελάτη.</p>';

    const content = `
      <div class="job-details">
        <!-- Βασικά Στοιχεία -->
        <div class="detail-section">
          <h4><i class="fas fa-info-circle"></i> Βασικά Στοιχεία</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Κωδικός:</label>
              <span>${client.id}</span>
            </div>
            <div class="detail-item">
              <label>Ονοματεπώνυμο:</label>
              <span>${client.name}</span>
            </div>
          </div>
        </div>

        <!-- Επικοινωνία -->
        <div class="detail-section">
          <h4><i class="fas fa-phone"></i> Επικοινωνία</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Τηλέφωνο:</label>
              <span>${client.phone ? `<a href="tel:${client.phone}" style="color: var(--color-primary); text-decoration: none;">${client.phone}</a>` : '-'}</span>
            </div>
            <div class="detail-item">
              <label>Email:</label>
              <span>${client.email ? `<a href="mailto:${client.email}" style="color: var(--color-primary); text-decoration: none;">${client.email}</a>` : '-'}</span>
            </div>
          </div>
        </div>

        <!-- Διεύθυνση -->
        <div class="detail-section">
          <h4><i class="fas fa-map-marker-alt"></i> Διεύθυνση</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Οδός:</label>
              <span>${client.address || '-'}</span>
            </div>
            <div class="detail-item">
              <label>Πόλη:</label>
              <span>${client.city || '-'}</span>
            </div>
            <div class="detail-item">
              <label>Τ.Κ.:</label>
              <span>${client.postalCode || client.postal || '-'}</span>
            </div>
            ${client.address && client.city ? `
            <div class="detail-item span-2">
              <button class="btn btn-secondary" onclick="ClientsView.openInMaps(\`${client.address}, ${client.city}, ${client.postalCode || client.postal || 'Ελλάδα'}\`)" style="width: fit-content;">
                <i class="fas fa-map-marked-alt"></i> Άνοιγμα στο Google Maps
              </button>
            </div>
            ` : ''}
          </div>
        </div>

        <!-- Σημειώσεις -->
        ${client.notes ? `
        <div class="detail-section">
          <h4><i class="fas fa-sticky-note"></i> Σημειώσεις</h4>
          <div class="detail-notes">
            ${client.notes}
          </div>
        </div>
        ` : ''}

        <div class="detail-section">
          <h4><i class="fas fa-briefcase"></i> Εργασίες</h4>
          ${jobsHtml}
        </div>

        <div class="client-detail-actions">
          <button type="button" class="btn btn-primary" id="newJobForClientBtn">
            <i class="fas fa-plus"></i> Νέα εργασία για αυτόν τον πελάτη
          </button>
        </div>

      </div>
    `;

    const footer = `
      <button class="btn-primary" id="editClientFromModalBtn">
        <i class="fas fa-edit"></i> Επεξεργασία
      </button>
    `;

    const modalSize = Utils.isMobile() ? 'xl' : 'lg';
    const modal = Modal.open({
      title: `${client.name}`,
      content: content,
      footer: footer,
      size: modalSize
    });

    // Add event listener for edit button
    setTimeout(() => {
      document.getElementById('newJobForClientBtn')?.addEventListener('click', () => {
        Modal.close();
        Router.navigate(`jobs?clientId=${client.id}`);
        setTimeout(() => {
          const addBtn = document.getElementById('addJobBtn');
          if (addBtn) addBtn.click();
          const clientSelect = document.getElementById('jobClient');
          if (clientSelect) clientSelect.value = String(client.id);
        }, 150);
      });

      const editBtn = document.getElementById('editClientFromModalBtn');
      if (editBtn) {
        editBtn.onclick = () => {
          Modal.close();
          setTimeout(() => {
            this.editClient(id);
          }, 100);
        };
      }
    }, 50);
  },

  editClient(id) {
    const client = State.read('clients', id);
    
    if (client) {
      this.editingClientId = id;
      document.getElementById('clientFormTitle').textContent = 'Επεξεργασία Πελάτη';
      document.getElementById('clientForm').style.display = 'block';
      
      const nameInput = document.getElementById('c_name');
      
      if (nameInput) {
        nameInput.value = client.name;
        if (!Utils.isMobile()) {
          nameInput.focus();
        }
      }
      document.getElementById('c_phone').value = client.phone || '';
      document.getElementById('c_email').value = client.email || '';
      document.getElementById('c_address').value = client.address || '';
      document.getElementById('c_city').value = client.city || '';
      document.getElementById('c_postal').value = client.postalCode || client.postal || '';
      document.getElementById('c_notes').value = client.notes || '';

      document.getElementById('clientForm').scrollIntoView({ behavior: 'smooth' });
    } else {
      console.error('❌ Client not found:', id);
    }
  },

  async deleteClient(id) {
    console.log('[Clients] Delete request for client:', id, 'type:', typeof id);
    
    if (!id || id === 'undefined' || id === undefined) {
      console.error('[Clients] Invalid client ID:', id);
      Toast.error('Σφάλμα: Μη έγκυρο ID πελάτη');
      return;
    }

    const linkedJobs = this.getJobsForClient(id);
    if (linkedJobs.length > 0) {
      const modal = Modal.open({
        title: '<i class="fas fa-exclamation-triangle"></i> Δεν επιτρέπεται η διαγραφή',
        content: `
          <div class="alert alert-warning">
            <p><strong>Ο πελάτης δεν μπορεί να διαγραφεί.</strong></p>
            <p>Υπάρχουν ${linkedJobs.length} συνδεδεμένες εργασίες με αυτόν τον πελάτη.</p>
            <p class="text-muted mb-0">Αν δεν τον χρειάζεστε πλέον, κρατήστε τον στο αρχείο ή αλλάξτε πρώτα τις συνδεδεμένες εργασίες.</p>
          </div>
        `,
        footer: '<button class="btn-primary" id="clientDeleteBlockedOkBtn">OK</button>',
        size: 'sm'
      });
      modal.querySelector('#clientDeleteBlockedOkBtn').onclick = () => Modal.close();
      return;
    }
    
    Modal.confirm({
      title: 'Διαγραφή Πελάτη',
      message: 'Είστε σίγουροι ότι θέλετε να διαγράψετε αυτόν τον πελάτη;',
      confirmText: 'Διαγραφή',
      onConfirm: async () => {
        try {
          console.log('[Clients] Deleting client:', id);
          await State.delete('clients', id);
          Toast.success('Ο πελάτης διαγράφηκε');
          this.refreshTable();
        } catch (error) {
          console.error('❌ Error deleting client:', error);
        }
      }
    });
  },

  filterClients() {
    const searchTerm = document.getElementById('clientSearch').value;
    let clients = State.data.clients;

    if (searchTerm) {
      clients = clients.filter(client =>
        Utils.matchesSearch([client.name, client.phone, client.email, client.city, client.address], searchTerm)
      );
    }

    this.renderTableWithLazy(clients, { reset: true });
  },

  renderTable(clients) {
    console.log('[Clients] renderTable called with clients:', clients);
    console.log('[Clients] renderTable - clients count:', clients?.length);
    if (clients && clients.length > 0) {
      console.log('[Clients] renderTable - first client:', clients[0]);
    }
    
    if (clients.length === 0) {
      return UIPrimitives.emptyState({
        icon: 'fas fa-users',
        title: 'Δεν υπάρχουν πελάτες',
        description: 'Δημιουργήστε τον πρώτο σας πελάτη!'
      });
    }

    // Sort by createdAt timestamp - latest first
    const sortedClients = Utils.sortBy(clients, 'createdAt', 'desc');
    const lazy = Utils.getInfiniteSlice(this.lazyTableKey, sortedClients, this.lazyBatchSize);
    const visibleClients = lazy.items;

    return `
      <div class="table-wrapper has-mobile-cards">
        <table class="data-table">
          <thead>
            <tr>
              <th class="text-left">Ενέργειες</th>
              <th>Όνομα</th>
              <th>Τηλ.</th>
              <th>Email</th>
              <th>Οδός</th>
              <th>Πληρωμές</th>
            </tr>
          </thead>
          <tbody>
            ${visibleClients.map(client => {
              return `
                <tr>
                  <td class="actions">
                    ${UIPrimitives.actionButton({ className: 'view-client-btn', icon: 'fas fa-eye', title: 'Προβολή', data: { 'client-id': client.id } })}
                    ${UIPrimitives.actionButton({ className: 'edit-client-btn', icon: 'fas fa-edit', title: 'Επεξεργασία', data: { 'client-id': client.id } })}
                    ${UIPrimitives.actionButton({ className: 'btn-danger delete-client-btn', icon: 'fas fa-trash', title: 'Διαγραφή', data: { 'client-id': client.id } })}
                  </td>
                  <td title="${client.name}">${client.name}</td>
                  <td title="${client.phone || '-'}">${client.phone ? `<a href="tel:${client.phone}" style="color: var(--color-text); text-decoration: none;">${client.phone}</a>` : '-'}</td>
                  <td title="${client.email || '-'}">${client.email || '-'}</td>
                  <td title="${client.address || '-'}">${client.address || '-'}</td>
                  <td>${this.renderClientPaymentCell(client.id)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="mobile-card-list" aria-label="Λίστα πελατών για κινητό">
        ${visibleClients.map(client => {
          const phone = client.phone || '';
          const email = client.email || '';
          const addressParts = [client.address, client.city, client.postal].filter(Boolean);
          const address = addressParts.join(', ');

          return `
            <article class="entity-mobile-card">
              <div class="entity-mobile-card-header">
                <div class="entity-mobile-card-title">
                  <strong>${Utils.escapeHtml(client.name || '-')}</strong>
                  <span>${this.renderClientPaymentCell(client.id)}</span>
                </div>
                <div class="entity-mobile-card-actions">
                  ${UIPrimitives.actionButton({ className: 'view-client-btn', icon: 'fas fa-eye', title: 'Προβολή', data: { 'client-id': client.id } })}
                  ${UIPrimitives.actionButton({ className: 'edit-client-btn', icon: 'fas fa-edit', title: 'Επεξεργασία', data: { 'client-id': client.id } })}
                  ${UIPrimitives.actionButton({ className: 'btn-danger delete-client-btn', icon: 'fas fa-trash', title: 'Διαγραφή', data: { 'client-id': client.id } })}
                </div>
              </div>
              <div class="entity-mobile-card-meta">
                ${phone ? `<a href="tel:${Utils.escapeHtml(phone)}"><i class="fas fa-phone"></i>${Utils.escapeHtml(phone)}</a>` : '<span><i class="fas fa-phone"></i>Χωρίς τηλέφωνο</span>'}
                ${email ? `<a href="mailto:${Utils.escapeHtml(email)}"><i class="fas fa-envelope"></i>${Utils.escapeHtml(email)}</a>` : ''}
                ${address ? `<span><i class="fas fa-location-dot"></i>${Utils.escapeHtml(address)}</span>` : ''}
              </div>
            </article>
          `;
        }).join('')}
      </div>
      ${Utils.renderInfiniteFooter(this.lazyTableKey, lazy.visible, lazy.total, this.lazyBatchSize)}
    `;
  },

  openInMaps(address) {
    Utils.openInMaps(address);
  },

  cleanup() {
    document.getElementById('addClientBtn')?.removeEventListener('click', this.addBtnHandler);
    document.getElementById('clientFormElement')?.removeEventListener('submit', this.formSubmitHandler);
    document.getElementById('cancelClientFormBtn')?.removeEventListener('click', this.cancelBtnHandler);
    document.getElementById('clientSearch')?.removeEventListener('input', this.searchHandler);
    document.getElementById('contentArea')?.removeEventListener('click', this.tableClickHandler);

    this.formSubmitHandler = null;
    this.clearBtnHandler = null;
    this.cancelBtnHandler = null;
    this.addBtnHandler = null;
    this.searchHandler = null;
    this.tableClickHandler = null;
  }
};

