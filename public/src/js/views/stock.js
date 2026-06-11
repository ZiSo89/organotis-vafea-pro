/* ========================================
   Stock View - Φυσική Αποθήκη
   ======================================== */

window.InventoryView = {
  editingMaterialId: null,

  render(container) {
    const materials = State.read('inventory') || [];
    const movements = State.read('materialStockMovements') || [];
    const summary = this.calculateSummary(materials);

    container.innerHTML = `
      <div class="view-header">
        <h1><i class="fas fa-warehouse"></i> Αποθήκη</h1>
      </div>

      <div class="stats-grid" style="margin-bottom: 20px;">
        <div class="stat-card">
          <div class="stat-icon info"><i class="fas fa-boxes"></i></div>
          <div class="stat-content">
            <h3>${materials.length}</h3>
            <p>Υλικά</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon success"><i class="fas fa-fill-drip"></i></div>
          <div class="stat-content">
            <h3>${summary.liters.toFixed(2)}</h3>
            <p>Λίτρα σε απόθεμα</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon warning"><i class="fas fa-euro-sign"></i></div>
          <div class="stat-content">
            <h3>${Utils.formatCurrency(summary.value)}</h3>
            <p>Αξία αποθήκης</p>
          </div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <h3>${this.editingMaterialId ? 'Επεξεργασία Υλικού' : 'Νέο Υλικό'}</h3>
          <form id="stockMaterialForm" class="form-grid">
            <div class="form-group">
              <label>Όνομα υλικού <span class="required">*</span></label>
              <input type="text" id="stockMaterialName" required placeholder="π.χ. Πλαστικό λευκό">
            </div>
            <div class="form-group">
              <label>Κατηγορία</label>
              <input type="text" id="stockMaterialCategory" placeholder="π.χ. Χρώματα, Αναλώσιμα">
            </div>
            <div class="form-group">
              <label>Μονάδα</label>
              <select id="stockMaterialUnit">
                ${this.renderUnitOptions()}
              </select>
            </div>
            <div class="form-group">
              <label>Τιμή/μονάδα (€)</label>
              <input type="number" id="stockMaterialUnitPrice" min="0" step="0.01" value="0">
            </div>
            ${this.editingMaterialId ? '' : `
              <div class="form-group">
                <label>Αρχική ποσότητα</label>
                <input type="number" id="stockInitialQuantity" min="0" step="0.01" value="0">
              </div>
            `}
            <div class="form-group span-2">
              <button type="submit" class="btn btn-primary">
                <i class="fas fa-save"></i> ${this.editingMaterialId ? 'Αποθήκευση' : 'Καταχώρηση Υλικού'}
              </button>
              ${this.editingMaterialId ? '<button type="button" class="btn btn-secondary" id="cancelMaterialEditBtn">Ακύρωση</button>' : ''}
            </div>
          </form>
        </div>

        <div class="card">
          <h3><i class="fas fa-exchange-alt"></i> Κίνηση Αποθήκης</h3>
          <form id="stockMovementForm" class="form-grid">
            <div class="form-group span-2">
              <label>Υλικό <span class="required">*</span></label>
              <select id="stockMovementMaterial" required>
                <option value="">Επιλέξτε υλικό...</option>
                ${materials.map(material => `<option value="${material.id}" data-unit="${this.escape(material.unit || 'λίτρα')}">${this.escape(material.name)} (${this.toNumber(material.stock).toFixed(2)} ${this.escape(material.unit || '')})</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Τύπος κίνησης</label>
              <select id="stockMovementType">
                <option value="add">Προσθήκη στην αποθήκη</option>
                <option value="remove">Αφαίρεση από αποθήκη</option>
                <option value="adjust">Διόρθωση απογραφής</option>
              </select>
            </div>
            <div class="form-group">
              <label id="stockMovementQuantityLabel">Ποσότητα</label>
              <input type="number" id="stockMovementQuantity" min="0.01" step="0.01" required>
            </div>
            <div class="form-group">
              <label>Ημερομηνία</label>
              <input type="date" id="stockMovementDate" value="${this.today()}">
            </div>
            <div class="form-group">
              <label>Μονάδα</label>
              <select id="stockMovementUnit">
                ${this.renderUnitOptions()}
              </select>
            </div>
            <div class="form-group span-2">
              <label>Σημειώσεις</label>
              <input type="text" id="stockMovementNotes" placeholder="π.χ. Χρήση σε εργασία, απογραφή, σπάσιμο">
            </div>
            <div class="form-group span-2">
              <button type="submit" class="btn btn-primary">
                <i class="fas fa-check"></i> Καταχώρηση Κίνησης
              </button>
            </div>
          </form>
        </div>
      </div>

      ${this.renderMaterialsTable(materials)}
      ${this.renderMovementsTable(movements)}
    `;

    this.setupEventListeners(container);
    this.populateEditForm(container);
  },

  calculateSummary(materials) {
    return materials.reduce((summary, material) => {
      const stock = this.toNumber(material.stock);
      const unitPrice = this.toNumber(material.unitPrice || material.unit_price);
      const unit = String(material.unit || '').toLowerCase();
      if (unit.includes('λίτρ') || unit.includes('lt') || unit.includes('l')) {
        summary.liters += stock;
      }
      summary.value += stock * unitPrice;
      return summary;
    }, { liters: 0, value: 0 });
  },

  renderMaterialsTable(materials) {
    return `
      <div class="card" style="margin-top: 20px;">
        <h3><i class="fas fa-list"></i> Υλικά στην αποθήκη</h3>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Ενέργειες</th>
                <th>Υλικό</th>
                <th>Κατηγορία</th>
                <th>Ποσότητα</th>
                <th>Μονάδα</th>
                <th>Τιμή/μονάδα</th>
                <th>Αξία</th>
              </tr>
            </thead>
            <tbody>
              ${materials.length ? materials.map(material => {
                const stock = this.toNumber(material.stock);
                const unitPrice = this.toNumber(material.unitPrice || material.unit_price);
                return `
                  <tr>
                    <td class="actions">
                      <button class="btn-icon quick-stock-remove-btn" data-id="${material.id}" title="Αφαίρεση από αποθήκη"><i class="fas fa-minus"></i></button>
                      <button class="btn-icon edit-stock-material-btn" data-id="${material.id}" title="Επεξεργασία"><i class="fas fa-edit"></i></button>
                      <button class="btn-icon btn-danger delete-stock-material-btn" data-id="${material.id}" title="Διαγραφή"><i class="fas fa-trash"></i></button>
                    </td>
                    <td><strong>${this.escape(material.name)}</strong></td>
                    <td>${this.escape(material.category || '-')}</td>
                    <td><strong>${stock.toFixed(2)}</strong></td>
                    <td>${this.escape(material.unit || '-')}</td>
                    <td>${Utils.formatCurrency(unitPrice)}</td>
                    <td>${Utils.formatCurrency(stock * unitPrice)}</td>
                  </tr>
                `;
              }).join('') : '<tr><td colspan="7" class="text-muted">Δεν υπάρχουν υλικά ακόμα.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderMovementsTable(movements) {
    return `
      <div class="card" style="margin-top: 20px;">
        <h3><i class="fas fa-history"></i> Ιστορικό κινήσεων</h3>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Ημερομηνία</th>
                <th>Υλικό</th>
                <th>Κίνηση</th>
                <th>Ποσότητα</th>
                <th>Πριν</th>
                <th>Μετά</th>
                <th>Σημειώσεις</th>
              </tr>
            </thead>
            <tbody>
              ${movements.length ? movements.slice(0, 80).map(movement => `
                <tr>
                  <td>${Utils.formatDate(movement.movementDate || movement.movement_date)}</td>
                  <td><strong>${this.escape(movement.materialName || movement.material_name || '-')}</strong></td>
                  <td>${this.movementLabel(movement.movementType || movement.movement_type)}</td>
                  <td style="color: ${this.toNumber(movement.quantity) < 0 ? 'var(--error)' : 'var(--success)'}">
                    <strong>${this.toNumber(movement.quantity).toFixed(2)} ${this.escape(movement.unit || '')}</strong>
                  </td>
                  <td>${this.toNumber(movement.previousStock || movement.previous_stock).toFixed(2)}</td>
                  <td>${this.toNumber(movement.newStock || movement.new_stock).toFixed(2)}</td>
                  <td>${this.escape(movement.notes || '-')}</td>
                </tr>
              `).join('') : '<tr><td colspan="7" class="text-muted">Δεν υπάρχουν κινήσεις ακόμα.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  setupEventListeners(container) {
    const materialForm = container.querySelector('#stockMaterialForm');
    if (materialForm) {
      materialForm.addEventListener('submit', (event) => this.saveMaterial(event, container));
    }

    const movementForm = container.querySelector('#stockMovementForm');
    if (movementForm) {
      movementForm.addEventListener('submit', (event) => this.saveMovement(event, container));
    }

    container.querySelector('#cancelMaterialEditBtn')?.addEventListener('click', () => {
      this.editingMaterialId = null;
      this.render(container);
    });

    container.querySelectorAll('.edit-stock-material-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.editingMaterialId = btn.dataset.id;
        this.render(container);
      });
    });

    container.querySelectorAll('.delete-stock-material-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Να διαγραφεί το υλικό από την αποθήκη;')) return;
        await State.delete('inventory', btn.dataset.id);
        Toast.success('Το υλικό διαγράφηκε');
        this.render(container);
      });
    });

    container.querySelectorAll('.quick-stock-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const select = container.querySelector('#stockMovementMaterial');
        const type = container.querySelector('#stockMovementType');
        if (select) select.value = btn.dataset.id;
        if (type) type.value = 'remove';
        this.updateMovementUnit(container);
        this.updateMovementLabel(container);
        container.querySelector('#stockMovementQuantity')?.focus();
      });
    });

    container.querySelector('#stockMovementMaterial')?.addEventListener('change', () => this.updateMovementUnit(container));
    container.querySelector('#stockMovementType')?.addEventListener('change', () => this.updateMovementLabel(container));
    this.updateMovementUnit(container);
    this.updateMovementLabel(container);
  },

  populateEditForm(container) {
    if (!this.editingMaterialId) return;
    const material = State.read('inventory', this.editingMaterialId);
    if (!material) return;

    container.querySelector('#stockMaterialName').value = material.name || '';
    container.querySelector('#stockMaterialCategory').value = material.category || '';
    container.querySelector('#stockMaterialUnit').value = material.unit || 'λίτρα';
    container.querySelector('#stockMaterialUnitPrice').value = this.toNumber(material.unitPrice || material.unit_price);
  },

  async saveMaterial(event, container) {
    event.preventDefault();
    const payload = {
      name: container.querySelector('#stockMaterialName').value.trim(),
      category: container.querySelector('#stockMaterialCategory').value.trim(),
      unit: container.querySelector('#stockMaterialUnit').value || 'λίτρα',
      unitPrice: this.toNumber(container.querySelector('#stockMaterialUnitPrice').value),
      stock: 0,
      minStock: 0
    };

    if (!payload.name) {
      Toast.error('Συμπληρώστε όνομα υλικού');
      return;
    }

    if (this.editingMaterialId) {
      const existing = State.read('inventory', this.editingMaterialId);
      await State.update('inventory', this.editingMaterialId, {
        ...payload,
        stock: this.toNumber(existing?.stock),
        minStock: this.toNumber(existing?.minStock || existing?.min_stock)
      });
      this.editingMaterialId = null;
      Toast.success('Το υλικό ενημερώθηκε');
    } else {
      const material = await State.create('inventory', payload);
      const initialQuantity = this.toNumber(container.querySelector('#stockInitialQuantity')?.value);
      if (initialQuantity > 0) {
        await State.create('materialStockMovements', {
          materialId: material.id,
          movementType: 'add',
          quantity: initialQuantity,
          movementDate: this.today(),
          unit: payload.unit,
          referenceType: 'manual',
          notes: 'Αρχική ποσότητα'
        });
      }
      Toast.success('Το υλικό καταχωρήθηκε');
    }

    this.render(container);
  },

  async saveMovement(event, container) {
    event.preventDefault();
    const materialId = container.querySelector('#stockMovementMaterial').value;
    const movementType = container.querySelector('#stockMovementType').value;
    const quantity = this.toNumber(container.querySelector('#stockMovementQuantity').value);
    const material = State.read('inventory', materialId);

    if (!materialId) {
      Toast.error('Επιλέξτε υλικό');
      return;
    }
    if (quantity <= 0) {
      Toast.error('Συμπληρώστε ποσότητα');
      return;
    }
    if (movementType === 'remove' && quantity > this.toNumber(material?.stock)) {
      Toast.error('Η ποσότητα αφαίρεσης είναι μεγαλύτερη από το διαθέσιμο stock');
      return;
    }

    await State.create('materialStockMovements', {
      materialId: Number(materialId),
      movementType,
      quantity,
      movementDate: container.querySelector('#stockMovementDate').value || this.today(),
      unit: container.querySelector('#stockMovementUnit').value || material?.unit || 'λίτρα',
      referenceType: 'manual',
      notes: container.querySelector('#stockMovementNotes').value.trim()
    });

    Toast.success('Η κίνηση καταχωρήθηκε');
    this.render(container);
  },

  updateMovementUnit(container) {
    const selected = container.querySelector('#stockMovementMaterial')?.selectedOptions?.[0];
    const unitInput = container.querySelector('#stockMovementUnit');
    if (selected && unitInput) {
      unitInput.value = selected.dataset.unit || '';
    }
  },

  updateMovementLabel(container) {
    const type = container.querySelector('#stockMovementType')?.value || 'add';
    const label = container.querySelector('#stockMovementQuantityLabel');
    if (!label) return;
    label.textContent = type === 'adjust' ? 'Νέα συνολική ποσότητα' : 'Ποσότητα';
  },

  movementLabel(type) {
    const labels = {
      add: 'Προσθήκη',
      remove: 'Αφαίρεση',
      adjust: 'Διόρθωση',
      purchase: 'Αγορά',
      purchase_rollback: 'Αντιστροφή αγοράς',
      job_usage: 'Χρήση σε εργασία'
    };
    return labels[type] || type || '-';
  },

  toNumber(value) {
    const number = parseFloat(value);
    return Number.isFinite(number) ? number : 0;
  },

  today() {
    return new Date().toISOString().split('T')[0];
  },

  escape(value) {
    const div = document.createElement('div');
    div.textContent = value === null || value === undefined ? '' : String(value);
    return div.innerHTML;
  },

  renderUnitOptions(selected = 'λίτρα') {
    const units = ['λίτρα', 'τεμ.', 'kg', 'm²', 'μέτρα', 'ρολά', 'κουβάδες', 'σακιά', 'άλλο'];
    return units.map(unit => `<option value="${this.escape(unit)}" ${unit === selected ? 'selected' : ''}>${this.escape(unit)}</option>`).join('');
  }
};
