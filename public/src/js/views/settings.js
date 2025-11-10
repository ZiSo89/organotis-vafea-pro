/* ========================================
   Settings View - Ρυθμίσεις
   ======================================== */

window.SettingsView = {
  // Event handlers stored to prevent duplicates
  companyFormHandler: null,
  pricingFormHandler: null,
  
  saveCompany(e) {
    e.preventDefault();
    
    const companyData = {
      name: document.getElementById('companyName').value,
      vat: document.getElementById('companyVat').value,
      address: document.getElementById('companyAddress').value,
      phone: document.getElementById('companyPhone').value
    };
    
    localStorage.setItem('company_settings', JSON.stringify(companyData));
    
    // Update sidebar
    const sidebarName = document.getElementById('sidebarCompanyName');
    if (sidebarName) {
      sidebarName.textContent = companyData.name ? `Οργανωτής Βαφέα ${companyData.name}` : 'Οργανωτής Βαφέα';
    }
    
    Toast.success('Τα στοιχεία επιχείρησης αποθηκεύτηκαν');
  },

  savePricing(e) {
    e.preventDefault();
    
    const pricingData = {
      hourlyRate: parseFloat(document.getElementById('defaultHourlyRate').value) || 25,
      vat: parseFloat(document.getElementById('defaultVat').value) || 24,
      travelCost: parseFloat(document.getElementById('defaultTravelCost').value) || 0.5
    };
    
    localStorage.setItem('pricing_settings', JSON.stringify(pricingData));
    Toast.success('Οι προεπιλογές τιμολόγησης αποθηκεύτηκαν');
  },

  importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) Storage.import(file);
    };
    input.click();
  },

  exportPDF() {
    Toast.info('Export PDF - Coming soon!');
  },

  exportExcel() {
    Toast.info('Export Excel - Coming soon!');
  },

  loadCompanyData() {
    // Default company data
    const defaultData = {
      name: 'Νικολαΐδη',
      vat: '123456789',
      address: 'Θάσου 8',
      phone: '+306978093442'
    };
    
    // Get saved data or use defaults
    let companyData = JSON.parse(localStorage.getItem('company_settings') || 'null');
    
    // If no saved data, save and use defaults
    if (!companyData) {
      companyData = defaultData;
      localStorage.setItem('company_settings', JSON.stringify(companyData));
      
      // Update sidebar immediately
      const sidebarName = document.getElementById('sidebarCompanyName');
      if (sidebarName) {
        sidebarName.textContent = `Οργανωτής Βαφέα ${companyData.name}`;
      }
    }
    
    // Populate form fields
    if (companyData.name) {
      document.getElementById('companyName').value = companyData.name;
    }
    if (companyData.vat) {
      document.getElementById('companyVat').value = companyData.vat;
    }
    if (companyData.address) {
      document.getElementById('companyAddress').value = companyData.address;
    }
    if (companyData.phone) {
      document.getElementById('companyPhone').value = companyData.phone;
    }
  },
  
  loadPricingData() {
    // Get saved pricing data
    const pricingData = JSON.parse(localStorage.getItem('pricing_settings') || 'null');
    
    if (pricingData) {
      if (pricingData.hourlyRate !== undefined) {
        document.getElementById('defaultHourlyRate').value = pricingData.hourlyRate;
      }
      if (pricingData.vat !== undefined) {
        document.getElementById('defaultVat').value = pricingData.vat;
      }
      if (pricingData.travelCost !== undefined) {
        document.getElementById('defaultTravelCost').value = pricingData.travelCost;
      }
    }
  },

  render(container) {
    
    container.innerHTML = `
      <div class="view-header">
        <h1><i class="fas fa-cog"></i> Ρυθμίσεις</h1>
      </div>

      <div class="settings-grid">
        <div class="card">
          <h3><i class="fas fa-building"></i> Στοιχεία Επιχείρησης</h3>
          <form class="form-grid" id="companyForm">
            <div class="form-group">
              <label>Επωνυμία</label>
              <input type="text" id="companyName" placeholder="π.χ. Νικολαΐδη" value="Νικολαΐδη">
            </div>
            <div class="form-group">
              <label>ΑΦΜ</label>
              <input type="text" id="companyVat" placeholder="123456789" value="123456789">
            </div>
            <div class="form-group">
              <label>Διεύθυνση</label>
              <input type="text" id="companyAddress" placeholder="π.χ. Θάσου 8" value="Θάσου 8">
            </div>
            <div class="form-group">
              <label>Τηλέφωνο</label>
              <input type="tel" id="companyPhone" placeholder="+30..." value="+306978093442">
            </div>
            <div class="form-group span-2">
              <button type="submit" class="btn btn-primary">
                <i class="fas fa-save"></i> Αποθήκευση
              </button>
            </div>
          </form>
        </div>

        <div class="card">
          <h3><i class="fas fa-euro-sign"></i> Προεπιλογές Τιμολόγησης</h3>
          <form class="form-grid" id="pricingForm">
            <div class="form-group">
              <label>Ωριαία Αμοιβή (€)</label>
              <input type="number" id="defaultHourlyRate" value="25" step="0.5">
            </div>
            <div class="form-group">
              <label>ΦΠΑ (%)</label>
              <input type="number" id="defaultVat" value="24" step="1">
            </div>
            <div class="form-group">
              <label>Κόστος Μετακίνησης (€/km)</label>
              <input type="number" id="defaultTravelCost" value="0.5" step="0.1">
            </div>
            <div class="form-group span-2">
              <button type="submit" class="btn btn-primary">
                <i class="fas fa-save"></i> Αποθήκευση
              </button>
            </div>
          </form>
        </div>

        <div class="card">
          <h3><i class="fas fa-database"></i> Διαχείριση Δεδομένων</h3>
          <div class="button-group">
            <button class="btn btn-secondary" id="exportJsonBtn">
              <i class="fas fa-download"></i> Export JSON
            </button>
            <button class="btn btn-secondary" id="importJsonBtn">
              <i class="fas fa-upload"></i> Import JSON
            </button>
            <button class="btn btn-secondary" id="exportPdfBtn">
              <i class="fas fa-file-pdf"></i> Export PDF
            </button>
            <button class="btn btn-secondary" id="exportExcelBtn">
              <i class="fas fa-file-excel"></i> Export Excel
            </button>
            <button class="btn btn-info" id="loadDemoBtn">
              <i class="fas fa-database"></i> Ανανέωση Demo Data
            </button>
          </div>
        </div>

        <div class="card">
          <h3><i class="fas fa-palette"></i> Εμφάνιση</h3>
          <div class="button-group">
            <button class="btn btn-secondary" id="toggleThemeBtn">
              <i class="fas fa-adjust"></i> Toggle Dark/Light Mode
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Load saved company data
    this.loadCompanyData();
    this.loadPricingData();
    
    // Attach event listeners (remove old ones first to prevent duplicates)
    const companyForm = document.getElementById('companyForm');
    if (companyForm) {
      if (this.companyFormHandler) {
        companyForm.removeEventListener('submit', this.companyFormHandler);
      }
      this.companyFormHandler = (e) => this.saveCompany(e);
      companyForm.addEventListener('submit', this.companyFormHandler);
    }
    
    const pricingForm = document.getElementById('pricingForm');
    if (pricingForm) {
      if (this.pricingFormHandler) {
        pricingForm.removeEventListener('submit', this.pricingFormHandler);
      }
      this.pricingFormHandler = (e) => this.savePricing(e);
      pricingForm.addEventListener('submit', this.pricingFormHandler);
    }
    
    // Data management buttons - using { once: true } to auto-remove after one click
    document.getElementById('exportJsonBtn')?.addEventListener('click', () => Storage.export(), { once: true });
    document.getElementById('importJsonBtn')?.addEventListener('click', () => this.importData(), { once: true });
    document.getElementById('exportPdfBtn')?.addEventListener('click', () => this.exportPDF(), { once: true });
    document.getElementById('exportExcelBtn')?.addEventListener('click', () => this.exportExcel(), { once: true });
    document.getElementById('loadDemoBtn')?.addEventListener('click', () => {
      if (confirm('Θέλετε να ξαναφορτώσετε τα demo data; Θα διαγραφούν τα τρέχοντα δεδομένα!')) {
        Storage.loadDemoData();
        Storage.save();
        Toast.success('Τα demo data φορτώθηκαν!');
        setTimeout(() => location.reload(), 1000);
      }
    }, { once: true });
    
    // Theme toggle button
    document.getElementById('toggleThemeBtn')?.addEventListener('click', () => Theme.toggle());
  }
};
