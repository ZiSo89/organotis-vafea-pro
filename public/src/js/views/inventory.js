/* Placeholder Views - Θα υλοποιηθούν σύντομα */

// Inventory View
window.InventoryView = {
  render(container) {
    container.innerHTML = `
      <div class="view-header">
        <h1><i class="fas fa-boxes"></i> Αποθήκη Χρωμάτων</h1>
      </div>
      <div class="card">
        <div class="empty-state">
          <i class="fas fa-hammer fa-3x" style="color: var(--color-warning);"></i>
          <h2>Σε ανάπτυξη...</h2>
          <p class="text-muted">Αυτή η λειτουργία θα είναι σύντομα διαθέσιμη</p>
        </div>
      </div>
    `;
  }
};

// Jobs View  
const JobsView = {
  render(container) {
    container.innerHTML = `
      <div class="card">
        <h1>Εργασίες</h1>
        <p>Σε ανάπτυξη... (πλήρης φόρμα με όλα τα πεδία)</p>
      </div>
    `;
  }
};

// Calendar View
const CalendarView = {
  render(container) {
    container.innerHTML = `
      <div class="card">
        <h1>Ημερολόγιο</h1>
        <p>Σε ανάπτυξη... (calendar με drag & drop)</p>
      </div>
    `;
  }
};

// Offers View
const OffersView = {
  render(container) {
    container.innerHTML = `
      <div class="card">
        <h1>Προσφορές</h1>
        <p>Σε ανάπτυξη...</p>
      </div>
    `;
  }
};

// Invoices View
const InvoicesView = {
  render(container) {
    container.innerHTML = `
      <div class="card">
        <h1>Τιμολόγια</h1>
        <p>Σε ανάπτυξη...</p>
      </div>
    `;
  }
};

// Statistics View
const StatisticsView = {
  render(container) {
    container.innerHTML = `
      <div class="card">
        <h1>Στατιστικά</h1>
        <p>Σε ανάπτυξη... (Chart.js graphs)</p>
      </div>
    `;
  }
};

// Templates View
const TemplatesView = {
  render(container) {
    container.innerHTML = `
      <div class="card">
        <h1>Templates</h1>
        <p>Σε ανάπτυξη... (αποθηκευμένα templates)</p>
      </div>
    `;
  }
};

// Settings View
const SettingsView = {
  render(container) {
    container.innerHTML = `
      <div class="card">
        <h1>Ρυθμίσεις</h1>
        <div class="form-group">
          <label>Όνομα Εταιρείας</label>
          <input type="text" value="Βαφές Επαγγελματικές" />
        </div>
        <div class="form-group">
          <label>Προεπιλεγμένο ΦΠΑ (%)</label>
          <input type="number" value="24" />
        </div>
        <div class="form-group">
          <label>Προεπιλεγμένο Ωρομίσθιο (€)</label>
          <input type="number" value="25" />
        </div>
        <button class="btn-primary">Αποθήκευση</button>
        <hr style="margin: 20px 0;">
        <h3>Επικίνδυνη Ζώνη</h3>
        <button class="btn-danger" onclick="Storage.clear()">
          <i class="fas fa-trash"></i> Καθαρισμός Όλων των Δεδομένων
        </button>
      </div>
    `;
  }
};
