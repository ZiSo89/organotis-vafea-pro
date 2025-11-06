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

  render(container) {
    const clients = State.read('clients') || [];

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
            <button type="button" class="btn btn-secondary" id="clearClientFormBtn">
              <i class="fas fa-eraser"></i> Καθαρισμός
            </button>
            <button type="button" class="btn btn-ghost" id="cancelClientFormBtn">
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

    // Clear button - remove old listener first
    const clearBtn = document.getElementById('clearClientFormBtn');
    if (clearBtn) {
      if (this.clearBtnHandler) {
        clearBtn.removeEventListener('click', this.clearBtnHandler);
      }
      this.clearBtnHandler = () => this.clearForm();
      clearBtn.addEventListener('click', this.clearBtnHandler);
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
          this.viewClient(clientId);
        } else if (editBtn) {
          const clientId = editBtn.dataset.clientId;
          this.editClient(clientId);
        } else if (deleteBtn) {
          const clientId = deleteBtn.dataset.clientId;
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
    const name = document.getElementById('c_name').value.trim();
    const phone = document.getElementById('c_phone').value.trim();
    const email = document.getElementById('c_email').value.trim();
    const address = document.getElementById('c_address').value.trim();
    const city = document.getElementById('c_city').value.trim();
    const postal = document.getElementById('c_postal').value.trim();
    const notes = document.getElementById('c_notes').value.trim();

    // Check if updating existing client
    const existingId = this.editingClientId;
    
    const client = {
      id: existingId || Utils.generateNextId('clients', 'Π'),
      name,
      phone,
      email,
      address,
      city,
      postal,
      notes
    };

    // Validation
    const validation = Validation.validateClient(client);
    if (!validation.valid) {
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
          // Fallback to random coordinates
          client.coordinates = Utils.generateRandomCoordinates();
          Toast.warning('⚠️ Χρήση τυχαίων συντεταγμένων - διόρθωσε στον Χάρτη');
        }
      } else {
        client.coordinates = Utils.generateRandomCoordinates();
      }
    } else {
      // Keep existing coordinates
      const existing = State.data.clients.find(c => c.id === existingId);
      client.coordinates = existing.coordinates;
    }

    // Save or update
    if (existingId) {
      State.update('clients', client.id, client);
      Toast.success('Ο πελάτης ενημερώθηκε!');
    } else {
      State.create('clients', client);
      Toast.success('Ο πελάτης δημιουργήθηκε!');
    }

    this.cancelForm();
    // Refresh the table to show the new/updated client
    this.refreshTable();
  },

  refreshTable() {
    const clients = State.read('clients') || [];
    const container = document.getElementById('clientsTableContainer');
    if (container) {
      container.innerHTML = this.renderTable(clients);
    }
  },

  cancelForm() {
    document.getElementById('clientForm').style.display = 'none';
    document.getElementById('clientFormElement').reset();
    this.editingClientId = null;
  },

  clearForm() {
    document.getElementById('clientFormElement').reset();
    this.editingClientId = null;
    Toast.info('Η φόρμα καθαρίστηκε');
  },

  viewClient(id) {
    const client = State.data.clients.find(c => c.id === id);
    if (!client) return;

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
              <span>${client.phone || '-'}</span>
            </div>
            <div class="detail-item">
              <label>Email:</label>
              <span>${client.email || '-'}</span>
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
              <span>${client.postal || '-'}</span>
            </div>
            ${client.address && client.city ? `
            <div class="detail-item span-2">
              <button class="btn btn-secondary" onclick="ClientsView.openInMaps('${encodeURIComponent(client.address + ', ' + client.city + ', ' + (client.postal || 'Ελλάδα'))}')" style="width: fit-content;">
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
      </div>
    `;

    const footer = `
      <button class="btn-ghost" onclick="Modal.close()">Κλείσιμο</button>
      <button class="btn-primary" id="editClientFromModalBtn">
        <i class="fas fa-edit"></i> Επεξεργασία
      </button>
    `;

    const modal = Modal.open({
      title: `${client.name}`,
      content: content,
      footer: footer,
      size: 'lg'
    });

    // Add event listener for edit button
    setTimeout(() => {
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
    console.log('📝 Editing client:', id, client);
    
    if (client) {
      this.editingClientId = id;
      document.getElementById('clientFormTitle').textContent = 'Επεξεργασία Πελάτη';
      document.getElementById('clientForm').style.display = 'block';
      
      const nameInput = document.getElementById('c_name');
      console.log('📝 Name input exists:', !!nameInput);
      
      if (nameInput) {
        nameInput.value = client.name;
        nameInput.focus();
      }
      document.getElementById('c_phone').value = client.phone || '';
      document.getElementById('c_email').value = client.email || '';
      document.getElementById('c_address').value = client.address || '';
      document.getElementById('c_city').value = client.city || '';
      document.getElementById('c_postal').value = client.postal || '';
      document.getElementById('c_notes').value = client.notes || '';

      document.getElementById('clientForm').scrollIntoView({ behavior: 'smooth' });
    } else {
      console.error('❌ Client not found:', id);
    }
  },

  deleteClient(id) {
    Modal.confirm({
      title: 'Διαγραφή Πελάτη',
      message: 'Είστε σίγουροι ότι θέλετε να διαγράψετε αυτόν τον πελάτη;',
      confirmText: 'Διαγραφή',
      onConfirm: () => {
        State.delete('clients', id);
        Toast.success('Ο πελάτης διαγράφηκε');
        // Refresh the table to remove the deleted client
        this.refreshTable();
      }
    });
  },

  filterClients() {
    const searchTerm = document.getElementById('clientSearch').value.toLowerCase();
    let clients = State.data.clients;

    // Filter by search
    if (searchTerm) {
      clients = clients.filter(client => 
        client.name.toLowerCase().includes(searchTerm) ||
        (client.phone || '').includes(searchTerm) ||
        (client.email || '').toLowerCase().includes(searchTerm) ||
        (client.city || '').toLowerCase().includes(searchTerm)
      );
    }

    document.getElementById('clientsTableContainer').innerHTML = this.renderTable(clients);
  },

  renderTable(clients) {
    if (clients.length === 0) {
      return `
        <div class="empty-state">
          <i class="fas fa-users fa-3x"></i>
          <h3>Δεν υπάρχουν πελάτες</h3>
          <p>Δημιουργήστε τον πρώτο σας πελάτη!</p>
        </div>
      `;
    }

    // Reverse to show latest first
    const sortedClients = [...clients].reverse();

    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>Όνομα</th>
            <th>Τηλέφωνο</th>
            <th>Email</th>
            <th>Πόλη</th>
            <th>Ενέργειες</th>
          </tr>
        </thead>
        <tbody>
          ${sortedClients.map(client => `
            <tr>
              <td title="${client.name}">${client.name}</td>
              <td title="${client.phone || '-'}">${client.phone || '-'}</td>
              <td title="${client.email || '-'}">${client.email || '-'}</td>
              <td title="${client.city || '-'}">${client.city || '-'}</td>
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
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },

  openInMaps(address) {
    const url = `https://www.google.com/maps/search/?api=1&query=${address}`;
    window.open(url, '_blank');
  }
};

