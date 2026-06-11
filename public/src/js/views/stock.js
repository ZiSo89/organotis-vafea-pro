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
        <div class="card" id="stockMaterialEditorCard">
          <h3>${this.editingMaterialId ? 'Επεξεργασία Υλικού' : 'Νέο Υλικό'}</h3>
          <form id="stockMaterialForm" class="form-grid">
            <div class="form-group">
              <label>Όνομα υλικού <span class="required">*</span></label>
              <div class="autocomplete-container">
                <input type="text" id="stockMaterialName" required placeholder="π.χ. Πλαστικό λευκό" autocomplete="off">
                <div id="stockMaterialNameResults" class="autocomplete-results" style="display: none;"></div>
              </div>
            </div>
            <div class="form-group">
              <label>Κατηγορία</label>
              <select id="stockMaterialCategory">
                ${this.renderCategoryOptions('Χρώμα')}
              </select>
            </div>
            <div class="form-group" id="stockColorCodeGroup" style="display: none;">
              <label>Κωδικός χρώματος</label>
              <input type="text" id="stockMaterialColorCode" placeholder="π.χ. RAL 9010">
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
              <div class="autocomplete-container">
                <input type="text" id="stockMovementMaterialSearch" placeholder="Αναζήτηση υλικού..." autocomplete="off" required>
                <input type="hidden" id="stockMovementMaterial">
                <div id="stockMovementMaterialResults" class="autocomplete-results" style="display: none;"></div>
              </div>
              <small class="text-muted">Γράψτε όνομα, κατηγορία ή κωδικό και επιλέξτε από τις προτάσεις.</small>
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
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
          <h3><i class="fas fa-list"></i> Υλικά στην αποθήκη</h3>
          <button type="button" class="btn btn-secondary" id="checkDuplicateMaterialsBtn">
            <i class="fas fa-object-group"></i> Έλεγχος διπλών
          </button>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Ενέργειες</th>
                <th>Υλικό</th>
                <th>Κωδικός</th>
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
                    <td>${this.escape(material.colorCode || material.color_code || '-')}</td>
                    <td>${this.escape(material.category || '-')}</td>
                    <td><strong>${stock.toFixed(2)}</strong></td>
                    <td>${this.escape(material.unit || '-')}</td>
                    <td>${Utils.formatCurrency(unitPrice)}</td>
                    <td>${Utils.formatCurrency(stock * unitPrice)}</td>
                  </tr>
                `;
              }).join('') : '<tr><td colspan="8" class="text-muted">Δεν υπάρχουν υλικά ακόμα.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderMovementsTable(movements) {
    const latestMovements = movements
      .slice()
      .sort((a, b) => {
        const dateCompare = String(b.movementDate || b.movement_date || '').localeCompare(String(a.movementDate || a.movement_date || ''));
        if (dateCompare !== 0) return dateCompare;
        return Number(b.id || 0) - Number(a.id || 0);
      })
      .slice(0, 10);

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
              ${latestMovements.length ? latestMovements.map(movement => `
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
        this.scrollToMaterialEditor(container);
      });
    });

    container.querySelectorAll('.delete-stock-material-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const material = State.read('inventory', btn.dataset.id);
        const confirmed = await Modal.confirm({
          title: 'Διαγραφή Υλικού',
          message: `Να διαγραφεί το υλικό <strong>${this.escape(material?.name || '')}</strong> από την αποθήκη;`,
          confirmText: 'Διαγραφή',
          cancelText: 'Ακύρωση'
        });
        if (!confirmed) return;
        await State.delete('inventory', btn.dataset.id);
        Toast.success('Το υλικό διαγράφηκε');
        this.render(container);
      });
    });

    container.querySelectorAll('.quick-stock-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = container.querySelector('#stockMovementType');
        this.setMovementMaterialSelection(container, btn.dataset.id);
        if (type) type.value = 'remove';
        this.updateMovementUnit(container);
        this.updateMovementLabel(container);
        container.querySelector('#stockMovementQuantity')?.focus();
      });
    });

    this.setupMovementMaterialAutocomplete(container);
    if (!this.editingMaterialId) {
      this.setupMaterialNameAutocomplete(container);
    }
    container.querySelector('#stockMovementType')?.addEventListener('change', () => this.updateMovementLabel(container));
    container.querySelector('#stockMaterialCategory')?.addEventListener('change', () => this.updateColorCodeVisibility(container));
    container.querySelector('#checkDuplicateMaterialsBtn')?.addEventListener('click', () => this.showDuplicateMaterialsModal(container));
    this.updateMovementUnit(container);
    this.updateMovementLabel(container);
    this.updateColorCodeVisibility(container);
  },

  populateEditForm(container) {
    if (!this.editingMaterialId) return;
    const material = State.read('inventory', this.editingMaterialId);
    if (!material) return;

    container.querySelector('#stockMaterialName').value = material.name || '';
    container.querySelector('#stockMaterialCategory').value = MaterialIdentity.normalizeCategory(material.category || 'Άλλο');
    container.querySelector('#stockMaterialColorCode').value = material.colorCode || material.color_code || '';
    container.querySelector('#stockMaterialUnit').value = material.unit || 'λίτρα';
    container.querySelector('#stockMaterialUnitPrice').value = this.toNumber(material.unitPrice || material.unit_price);
    this.updateColorCodeVisibility(container);
  },

  scrollToMaterialEditor(container) {
    requestAnimationFrame(() => {
      const editor = container.querySelector('#stockMaterialEditorCard');
      const nameInput = container.querySelector('#stockMaterialName');
      if (!editor) return;

      editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => nameInput?.focus({ preventScroll: true }), 250);
    });
  },

  async saveMaterial(event, container) {
    event.preventDefault();
    const payload = {
      name: container.querySelector('#stockMaterialName').value.trim(),
      category: container.querySelector('#stockMaterialCategory').value,
      colorCode: container.querySelector('#stockMaterialColorCode')?.value.trim() || '',
      unit: container.querySelector('#stockMaterialUnit').value || 'λίτρα',
      unitPrice: this.toNumber(container.querySelector('#stockMaterialUnitPrice').value),
      stock: 0,
      minStock: 0
    };
    const preparedPayload = MaterialIdentity.prepare(payload);

    if (!preparedPayload.name) {
      Toast.error('Συμπληρώστε όνομα υλικού');
      return;
    }

    if (this.editingMaterialId) {
      const duplicate = MaterialIdentity.findDuplicate(State.read('inventory') || [], preparedPayload, this.editingMaterialId);
      if (duplicate) {
        Toast.error(`Υπάρχει ήδη το υλικό "${duplicate.name}"`);
        return;
      }
      const existing = State.read('inventory', this.editingMaterialId);
      await State.update('inventory', this.editingMaterialId, {
        ...preparedPayload,
        stock: this.toNumber(existing?.stock),
        minStock: this.toNumber(existing?.minStock || existing?.min_stock)
      });
      this.editingMaterialId = null;
      Toast.success('Το υλικό ενημερώθηκε');
    } else {
      const initialQuantity = this.toNumber(container.querySelector('#stockInitialQuantity')?.value);
      const duplicate = MaterialIdentity.findSimilar(State.read('inventory') || [], preparedPayload);
      if (duplicate) {
        const useExisting = await MaterialIdentity.confirmUseExisting(preparedPayload, duplicate);
        if (useExisting) {
          if (initialQuantity > 0) {
            await State.create('materialStockMovements', {
              materialId: duplicate.id,
              movementType: 'add',
              quantity: initialQuantity,
              movementDate: this.today(),
              unit: duplicate.unit || preparedPayload.unit,
              referenceType: 'manual',
              notes: 'Προσθήκη σε υπάρχον υλικό'
            });
          }
          Toast.success('Χρησιμοποιήθηκε το υπάρχον υλικό');
          this.render(container);
          return;
        }
      }

      const material = await State.create('inventory', preparedPayload);
      if (initialQuantity > 0) {
        await State.create('materialStockMovements', {
          materialId: material.id,
          movementType: 'add',
          quantity: initialQuantity,
          movementDate: this.today(),
          unit: preparedPayload.unit,
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
    const materialId = container.querySelector('#stockMovementMaterial')?.value;
    const material = materialId ? State.read('inventory', materialId) : null;
    const unitInput = container.querySelector('#stockMovementUnit');
    if (material && unitInput) {
      unitInput.value = material.unit || 'λίτρα';
    }
  },

  updateMovementMaterialFromSearch(container) {
    const input = container.querySelector('#stockMovementMaterialSearch');
    const hidden = container.querySelector('#stockMovementMaterial');
    if (!input || !hidden) return;

    const material = this.findMovementMaterialByLabel(input.value);
    hidden.value = material ? material.id : '';
    if (material) input.value = this.movementMaterialLabel(material);
    this.updateMovementUnit(container);
  },

  setMovementMaterialSelection(container, materialId) {
    const material = State.read('inventory', materialId);
    const input = container.querySelector('#stockMovementMaterialSearch');
    const hidden = container.querySelector('#stockMovementMaterial');
    if (!material || !input || !hidden) return;

    input.value = this.movementMaterialLabel(material);
    hidden.value = material.id;
  },

  setupMovementMaterialAutocomplete(container) {
    const input = container.querySelector('#stockMovementMaterialSearch');
    const results = container.querySelector('#stockMovementMaterialResults');
    const hidden = container.querySelector('#stockMovementMaterial');
    if (!input || !results || !hidden) return;

    const render = () => {
      hidden.value = '';
      const matches = this.searchMaterials(input.value);
      this.renderMaterialAutocompleteResults(results, matches, (material) => {
        this.setMovementMaterialSelection(container, material.id);
        results.style.display = 'none';
        this.updateMovementUnit(container);
        container.querySelector('#stockMovementQuantity')?.focus();
      });
    };

    input.addEventListener('focus', render);
    input.addEventListener('input', render);
    input.addEventListener('blur', () => {
      setTimeout(() => {
        results.style.display = 'none';
        this.updateMovementMaterialFromSearch(container);
      }, 150);
    });
  },

  setupMaterialNameAutocomplete(container) {
    const input = container.querySelector('#stockMaterialName');
    const results = container.querySelector('#stockMaterialNameResults');
    if (!input || !results) return;

    const render = () => {
      const matches = this.searchMaterials(input.value);
      this.renderMaterialAutocompleteResults(results, matches, (material) => {
        input.value = material.name || '';
        results.style.display = 'none';
        this.fillMaterialFormFromName(container);
      });
    };

    input.addEventListener('focus', render);
    input.addEventListener('input', render);
    input.addEventListener('blur', () => {
      setTimeout(() => {
        results.style.display = 'none';
        this.fillMaterialFormFromName(container);
      }, 150);
    });
  },

  searchMaterials(query, limit = 12) {
    const materials = State.read('inventory') || [];
    const normalizedQuery = MaterialIdentity.normalizeText(query);
    if (!normalizedQuery) return materials.slice(0, limit);

    const words = normalizedQuery.split(' ').filter(Boolean);
    return materials
      .map(material => {
        const haystack = MaterialIdentity.normalizeText([
          material.name,
          material.category,
          material.colorCode || material.color_code,
          this.movementMaterialLabel(material)
        ].filter(Boolean).join(' '));
        const matches = words.every(word => haystack.includes(word));
        const startsWithName = MaterialIdentity.normalizeSearchText(material.name).startsWith(normalizedQuery);
        return { material, matches, startsWithName };
      })
      .filter(result => result.matches)
      .sort((a, b) => Number(b.startsWithName) - Number(a.startsWithName) || String(a.material.name).localeCompare(String(b.material.name), 'el'))
      .slice(0, limit)
      .map(result => result.material);
  },

  renderMaterialAutocompleteResults(results, materials, onSelect) {
    if (!materials.length) {
      results.innerHTML = '<div class="autocomplete-item text-muted">Δεν βρέθηκαν υλικά</div>';
      results.style.display = '';
      return;
    }

    results.innerHTML = materials.map(material => `
      <div class="autocomplete-item" data-material-id="${material.id}">
        <strong>${this.escape(material.name)}</strong>
        <br>
        <small class="text-muted">
          ${this.escape(material.category || 'Άλλο')}
          ${material.colorCode || material.color_code ? ` • ${this.escape(material.colorCode || material.color_code)}` : ''}
          • ${this.toNumber(material.stock).toFixed(2)} ${this.escape(material.unit || '')}
        </small>
      </div>
    `).join('');
    results.style.display = '';

    results.querySelectorAll('.autocomplete-item[data-material-id]').forEach(item => {
      item.addEventListener('mousedown', (event) => {
        event.preventDefault();
        const material = State.read('inventory', item.dataset.materialId);
        if (material) onSelect(material);
      });
    });
  },

  findMovementMaterialByLabel(label) {
    const value = String(label || '').trim();
    if (!value) return null;

    const materials = State.read('inventory') || [];
    return materials.find(material => this.movementMaterialLabel(material) === value)
      || materials.find(material => MaterialIdentity.normalizeText(this.movementMaterialLabel(material)) === MaterialIdentity.normalizeText(value))
      || materials.find(material => MaterialIdentity.normalizeSearchText(material.name) === MaterialIdentity.normalizeSearchText(value))
      || null;
  },

  movementMaterialLabel(material) {
    const code = material.colorCode || material.color_code;
    const codePart = code ? ` • ${code}` : '';
    return `${material.name}${codePart} • ${material.category || 'Άλλο'} • ${this.toNumber(material.stock).toFixed(2)} ${material.unit || ''}`;
  },

  materialNameOptionLabel(material) {
    const code = material.colorCode || material.color_code;
    const codePart = code ? ` • ${code}` : '';
    return `${material.category || 'Άλλο'}${codePart} • ${this.toNumber(material.stock).toFixed(2)} ${material.unit || ''}`;
  },

  updateMovementLabel(container) {
    const type = container.querySelector('#stockMovementType')?.value || 'add';
    const label = container.querySelector('#stockMovementQuantityLabel');
    if (!label) return;
    label.textContent = type === 'adjust' ? 'Νέα συνολική ποσότητα' : 'Ποσότητα';
  },

  updateColorCodeVisibility(container) {
    const category = container.querySelector('#stockMaterialCategory')?.value;
    const group = container.querySelector('#stockColorCodeGroup');
    const input = container.querySelector('#stockMaterialColorCode');
    const isColor = MaterialIdentity.normalizeCategory(category) === 'Χρώμα';
    if (group) group.style.display = isColor ? '' : 'none';
    if (!isColor && input) input.value = '';
  },

  fillMaterialFormFromName(container) {
    const name = container.querySelector('#stockMaterialName')?.value.trim();
    if (!name) return;

    const material = this.findMaterialByName(name);
    if (!material) return;

    container.querySelector('#stockMaterialName').value = material.name || name;
    container.querySelector('#stockMaterialCategory').value = MaterialIdentity.normalizeCategory(material.category);
    container.querySelector('#stockMaterialColorCode').value = material.colorCode || material.color_code || '';
    container.querySelector('#stockMaterialUnit').value = material.unit || 'λίτρα';
    container.querySelector('#stockMaterialUnitPrice').value = this.toNumber(material.unitPrice || material.unit_price);
    this.updateColorCodeVisibility(container);
    Toast.info(`Υπάρχει ήδη το υλικό "${material.name}". Αν το καταχωρήσετε, θα προταθεί χρήση του υπάρχοντος.`);
  },

  findMaterialByName(name) {
    const normalized = MaterialIdentity.normalizeSearchText(name);
    return (State.read('inventory') || []).find(material => {
      return MaterialIdentity.normalizeSearchText(material.name) === normalized;
    }) || null;
  },

  async showDuplicateMaterialsModal(container) {
    try {
      const groups = await API.getMaterialDuplicateGroups();
      if (!groups.length) {
        Modal.alert('Δεν βρέθηκαν διπλά υλικά με βάση την κατηγορία, τον κωδικό χρώματος και το καθαρισμένο όνομα.', 'Έλεγχος διπλών');
        return;
      }

      const content = groups.map((group, index) => `
        <div class="duplicate-material-group" data-group-index="${index}" style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px; margin-bottom: 12px;">
          <h4 style="margin: 0 0 10px;">Ομάδα ${index + 1}</h4>
          <div class="form-group">
            <label>Primary υλικό που θα κρατηθεί</label>
            <select class="duplicate-primary-select">
              ${group.materials.map(material => `<option value="${material.id}">#${material.id} - ${this.escape(material.name)} (${this.escape(material.category || 'Άλλο')}${material.colorCode || material.color_code ? ', ' + this.escape(material.colorCode || material.color_code) : ''})</option>`).join('')}
            </select>
          </div>
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr><th>ID</th><th>Υλικό</th><th>Κατηγορία</th><th>Κωδικός</th><th>Stock</th></tr></thead>
              <tbody>
                ${group.materials.map(material => `
                  <tr>
                    <td>#${material.id}</td>
                    <td><strong>${this.escape(material.name)}</strong></td>
                    <td>${this.escape(material.category || 'Άλλο')}</td>
                    <td>${this.escape(material.colorCode || material.color_code || '-')}</td>
                    <td>${this.toNumber(material.stock).toFixed(2)} ${this.escape(material.unit || '')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <button type="button" class="btn btn-primary merge-duplicate-group-btn" data-group-index="${index}" style="margin-top: 10px;">
            Συγχώνευση ομάδας
          </button>
        </div>
      `).join('');

      const modal = Modal.open({
        title: 'Συγχώνευση διπλών υλικών',
        size: 'xl',
        content,
        footer: '<button class="btn-ghost" onclick="Modal.close()">Κλείσιμο</button>'
      });

      modal.querySelectorAll('.merge-duplicate-group-btn').forEach(button => {
        button.addEventListener('click', async () => {
          const index = Number(button.dataset.groupIndex);
          const groupEl = modal.querySelector(`.duplicate-material-group[data-group-index="${index}"]`);
          const primaryId = Number(groupEl.querySelector('.duplicate-primary-select').value);
          const duplicateIds = groups[index].materials
            .map(material => Number(material.id))
            .filter(id => id !== primaryId);

          const confirmed = await Modal.confirm({
            title: 'Επιβεβαίωση συγχώνευσης',
            message: `Θα κρατηθεί το υλικό #${primaryId} και θα μεταφερθούν σε αυτό stock, αγορές, κινήσεις και συνδέσεις εργασιών από ${duplicateIds.length} διπλά υλικά. Να συνεχίσω;`,
            confirmText: 'Συγχώνευση',
            cancelText: 'Ακύρωση'
          });
          if (!confirmed) return;

          const result = await API.mergeMaterialDuplicates(primaryId, duplicateIds);
          await State.loadAll();
          Toast.success(`Συγχωνεύτηκαν ${result.mergedIds?.length || duplicateIds.length} υλικά`);
          Modal.close();
          this.render(container);
        });
      });
    } catch (error) {
      console.error('Duplicate material merge error:', error);
      Toast.error(error.message || 'Σφάλμα στον έλεγχο διπλών');
    }
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

  escapeAttribute(value) {
    return this.escape(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  renderUnitOptions(selected = 'λίτρα') {
    const units = ['λίτρα', 'τεμ.', 'kg', 'm²', 'μέτρα', 'ρολά', 'κουβάδες', 'σακιά', 'άλλο'];
    return units.map(unit => `<option value="${this.escape(unit)}" ${unit === selected ? 'selected' : ''}>${this.escape(unit)}</option>`).join('');
  },

  renderCategoryOptions(selected = 'Χρώμα') {
    return MaterialIdentity.categoryOptions(selected);
  }
};
