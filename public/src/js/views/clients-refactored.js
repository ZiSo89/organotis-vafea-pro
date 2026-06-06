/* ========================================
   Clients View - Refactored with BaseView
   Διαχείριση Πελατών με proper event cleanup
   ======================================== */

class ClientsViewNew extends BaseView {
  constructor() {
    super('ClientsView');
    this.editingClientId = null;
  }

  render(container) {
    const clients = this.getData('clients') || [];

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
            <input type="text" id="c_city" placeholder="Αθήνα" />
          </div>

          <div class="form-group">
            <label>Τ.Κ.</label>
            <input type="text" id="c_postal" placeholder="12345" maxlength="5" />
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
  }

  setupEventListeners() {
    // Add button
    const addBtn = document.getElementById('addClientBtn');
    this.addEventListener(addBtn, 'click', () => this.showAddForm());

    // Form submit
    const form = document.getElementById('clientFormElement');
    this.addEventListener(form, 'submit', (e) => {
      e.preventDefault();
      this.saveClient();
    });

    // Cancel button
    const cancelBtn = document.getElementById('cancelClientFormBtn');
    this.addEventListener(cancelBtn, 'click', () => this.cancelForm());

    // Search
    const searchInput = document.getElementById('clientSearch');
    this.addEventListener(searchInput, 'input', () => this.filterClients());

    // Event delegation for table buttons (more efficient)
    const container = document.getElementById('contentArea');
    this.addDelegatedListener(container, 'click', '.view-client-btn', (e) => {
      const clientId = e.currentTarget.dataset.clientId;
      this.viewClient(clientId);
    });

    this.addDelegatedListener(container, 'click', '.edit-client-btn', (e) => {
      const clientId = e.currentTarget.dataset.clientId;
      this.editClient(clientId);
    });

    this.addDelegatedListener(container, 'click', '.delete-client-btn', (e) => {
      const clientId = e.currentTarget.dataset.clientId;
      this.deleteClient(clientId);
    });
  }

  showAddForm() {
    this.editingClientId = null;
    this.showForm('clientForm', 'Νέος Πελάτης');
  }

  async saveClient() {
    const name = document.getElementById('c_name').value.trim();
    const phone = document.getElementById('c_phone').value.trim();
    const email = document.getElementById('c_email').value.trim();
    const address = document.getElementById('c_address').value.trim();
    const city = document.getElementById('c_city').value.trim();
    const postalCode = document.getElementById('c_postal').value.trim();
    const afm = document.getElementById('c_afm')?.value.trim() || '';
    const notes = document.getElementById('c_notes').value.trim();

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

    // Validation
    if (!this.validate('client', client)) {
      return;
    }

    // Get coordinates
    if (!this.editingClientId) {
      if (address && city) {
        Toast.info('🔍 Αναζήτηση συντεταγμένων...');
        const coords = await Geocoding.getCoordinates(address, city);
        
        if (coords) {
          client.coordinates = coords;
          Toast.success('✅ Βρέθηκαν συντεταγμένες!');
        } else {
          client.coordinates = null;
          Toast.warning('⚠️ Δεν βρέθηκαν συντεταγμένες - μπορείς να τις ορίσεις στον Χάρτη');
        }
      } else {
        client.coordinates = null;
      }
    } else {
      const existing = this.getData('clients', this.editingClientId);
      client.coordinates = existing.coordinates;
    }

    // Save or update
    const success = this.editingClientId
      ? await this.update('clients', this.editingClientId, client)
      : await this.create('clients', client);

    if (success) {
      this.cancelForm();
      this.refreshTable('clientsTableContainer', this.getData('clients'));
    }
  }

  cancelForm() {
    this.hideForm('clientForm');
    this.editingClientId = null;
  }

  viewClient(id) {
    const client = this.getData('clients', id);
    if (!client) {
      console.error('❌ Client not found:', id);
      return;
    }

    const content = `
      <div class="job-details">
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

        <div class="detail-section">
          <h4><i class="fas fa-phone"></i> Επικοινωνία</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Τηλέφωνο:</label>
              <span>${client.phone ? `<a href="tel:${client.phone}">${client.phone}</a>` : '-'}</span>
            </div>
            <div class="detail-item">
              <label>Email:</label>
              <span>${client.email ? `<a href="mailto:${client.email}">${client.email}</a>` : '-'}</span>
            </div>
          </div>
        </div>

        ${client.notes ? `
        <div class="detail-section">
          <h4><i class="fas fa-sticky-note"></i> Σημειώσεις</h4>
          <div class="detail-notes">${client.notes}</div>
        </div>
        ` : ''}
      </div>
    `;

    Modal.open({
      title: client.name,
      content: content,
      size: 'lg'
    });
  }

  editClient(id) {
    const client = this.getData('clients', id);
    
    if (client) {
      this.editingClientId = id;
      this.showForm('clientForm', 'Επεξεργασία Πελάτη');
      
      document.getElementById('c_name').value = client.name;
      document.getElementById('c_phone').value = client.phone || '';
      document.getElementById('c_email').value = client.email || '';
      document.getElementById('c_address').value = client.address || '';
      document.getElementById('c_city').value = client.city || '';
      document.getElementById('c_postal').value = client.postalCode || client.postal || '';
      document.getElementById('c_notes').value = client.notes || '';
    }
  }

  async deleteClient(id) {
    const success = await this.delete(
      'clients',
      id,
      'Είστε σίγουροι ότι θέλετε να διαγράψετε αυτόν τον πελάτη;'
    );

    if (success) {
      this.refreshTable('clientsTableContainer', this.getData('clients'));
    }
  }

  filterClients() {
    const searchTerm = document.getElementById('clientSearch').value.toLowerCase();
    let clients = this.getData('clients');

    if (searchTerm) {
      clients = clients.filter(client => 
        client.name.toLowerCase().includes(searchTerm) ||
        (client.phone || '').includes(searchTerm) ||
        (client.email || '').toLowerCase().includes(searchTerm) ||
        (client.city || '').toLowerCase().includes(searchTerm)
      );
    }

    this.refreshTable('clientsTableContainer', clients);
  }

  renderTable(clients) {
    if (clients.length === 0) {
      return this.renderEmptyState(
        'fa-users',
        'Δεν υπάρχουν πελάτες',
        'Δημιουργήστε τον πρώτο σας πελάτη!'
      );
    }

    const sortedClients = this.sortData(clients, 'createdAt', 'desc');

    return `
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th style="text-align: left;">Ενέργειες</th>
              <th>Όνομα</th>
              <th>Τηλ.</th>
              <th>Email</th>
              <th>Οδός</th>
            </tr>
          </thead>
          <tbody>
            ${sortedClients.map(client => `
              <tr>
                <td class="actions">
                  <button class="btn-icon view-client-btn" data-client-id="${client.id}" title="Προβολή">
                    <i class="fas fa-eye"></i>
                  </button>
                  <button class="btn-icon edit-client-btn" data-client-id="${client.id}" title="Επεξεργασία">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn-icon btn-danger delete-client-btn" data-client-id="${client.id}" title="Διαγραφή">
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
                <td>${client.name}</td>
                <td>${client.phone ? `<a href="tel:${client.phone}">${client.phone}</a>` : '-'}</td>
                <td>${client.email || '-'}</td>
                <td>${client.address || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Implement cleanup to remove all listeners when view changes
  cleanup() {
    super.cleanup();
    this.editingClientId = null;
  }
}

// Keep old reference for backwards compatibility while migrating
// window.ClientsView = new ClientsViewNew();
