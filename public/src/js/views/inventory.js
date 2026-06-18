/* Placeholder Views - Θα υλοποιηθούν σύντομα */

// Suppliers View (stores, purchases and payments)
window.SuppliersView = {
  activeTab: 'suppliers',
  editingSupplierId: null,
  editingPaymentId: null,
  lazyBatchSize: 20,
  lazyKeys: {
    suppliers: 'suppliers-table',
    purchases: 'supplier-purchases-table',
    payments: 'supplier-payments-table'
  },

  render(container) {
    const suppliers = State.read('suppliers') || [];
    const purchases = State.read('materialPurchases') || [];
    const payments = State.read('supplierPayments') || [];
    const inventory = State.read('inventory') || [];
    const summary = this.calculateSummary(suppliers, purchases, payments, inventory);
    Utils.resetInfiniteList(this.lazyKeys[this.activeTab] || this.lazyKeys.suppliers, this.lazyBatchSize);

    container.innerHTML = `
      <div class="view-header">
        <h1><i class="fas fa-store"></i> Προμηθευτές</h1>
      </div>

      <div class="stats-grid" style="margin-bottom: 20px;">
        <div class="stat-card">
          <div class="stat-icon"><i class="fas fa-shopping-cart"></i></div>
          <div class="stat-content">
            <h3>${Utils.formatCurrency(summary.totalPurchases)}</h3>
            <p>Σύνολο Αγορών</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon success"><i class="fas fa-money-bill-wave"></i></div>
          <div class="stat-content">
            <h3>${Utils.formatCurrency(summary.totalPaid)}</h3>
            <p>Πληρωμένα</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon warning"><i class="fas fa-hand-holding-usd"></i></div>
          <div class="stat-content">
            <h3>${Utils.formatCurrency(summary.balance)}</h3>
            <p>Υπόλοιπο</p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="tabs segmented-control is-sticky ui-tab-nav">
          <button class="tab-btn ${this.activeTab === 'suppliers' ? 'active' : ''}" data-inventory-tab="suppliers">
            <i class="fas fa-store"></i> Καταστήματα
          </button>
          <button class="tab-btn ${this.activeTab === 'purchases' ? 'active' : ''}" data-inventory-tab="purchases">
            <i class="fas fa-receipt"></i> Αγορές
          </button>
          <button class="tab-btn ${this.activeTab === 'payments' ? 'active' : ''}" data-inventory-tab="payments">
            <i class="fas fa-credit-card"></i> Πληρωμές
          </button>
        </div>

        <div id="suppliersActiveTabContent" style="margin-top: 20px;">
          ${this.renderActiveTab(suppliers, purchases, payments, inventory)}
        </div>
      </div>
    `;

    this.setupEventListeners(container);
    this.setupLazyTable(container, suppliers, purchases, payments, inventory);
  },

  calculateSummary(suppliers, purchases, payments, inventory) {
    const totalPurchases = purchases.reduce((sum, p) => sum + this.toNumber(p.totalCost || p.total_cost), 0);
    const totalPaid = payments.reduce((sum, p) => sum + this.toNumber(p.amount), 0);
    const stockValue = inventory.reduce((sum, m) => {
      return sum + (this.toNumber(m.stock) * this.toNumber(m.unitPrice || m.unit_price));
    }, 0);

    return {
      suppliers: suppliers.length,
      totalPurchases,
      totalPaid,
      balance: totalPurchases - totalPaid,
      stockValue
    };
  },

  renderActiveTab(suppliers, purchases, payments, inventory) {
    if (this.activeTab === 'purchases') return this.renderPurchasesTab(suppliers, purchases, inventory);
    if (this.activeTab === 'payments') return this.renderPaymentsTab(suppliers, purchases, payments);
    return this.renderSuppliersTab(suppliers, purchases, payments);
  },

  renderSuppliersTab(suppliers, purchases, payments) {
    const lazy = Utils.getInfiniteSlice(this.lazyKeys.suppliers, suppliers, this.lazyBatchSize);
    const visibleSuppliers = lazy.items;

    return `
      <div class="form-section">
        <h3>${this.editingSupplierId ? 'Επεξεργασία Καταστήματος' : 'Νέο Κατάστημα'}</h3>
        <form id="supplierForm" class="form-grid">
          <div class="form-group">
            <label>Όνομα Καταστήματος <span class="required">*</span></label>
            <input type="text" id="supplierName" required placeholder="π.χ. Χρωματοπωλείο Παπαδόπουλος">
          </div>
          <div class="form-group">
            <label>Τηλέφωνο</label>
            <input type="tel" id="supplierPhone" placeholder="π.χ. 25510...">
          </div>
          <div class="form-group span-2">
            <label>Διεύθυνση</label>
            <input type="text" id="supplierAddress" placeholder="Διεύθυνση καταστήματος">
          </div>
          <div class="form-group span-2">
            <label>Σημειώσεις</label>
            <textarea id="supplierNotes" rows="2" placeholder="Π.χ. αγορά με πίστωση, υπεύθυνος κλπ."></textarea>
          </div>
          <div class="form-group span-2">
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-save"></i> ${this.editingSupplierId ? 'Αποθήκευση' : 'Προσθήκη Καταστήματος'}
            </button>
            ${this.editingSupplierId ? '<button type="button" class="btn btn-secondary" id="cancelSupplierEditBtn">Ακύρωση</button>' : ''}
          </div>
        </form>
      </div>

      <div class="table-wrapper has-mobile-cards" style="margin-top: 20px;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Ενέργειες</th>
              <th>Κατάστημα</th>
              <th>Τηλέφωνο</th>
              <th>Σύνολο Αγορών</th>
              <th>Πληρωμένα</th>
              <th>Υπόλοιπο</th>
            </tr>
          </thead>
          <tbody>
            ${visibleSuppliers.length ? visibleSuppliers.map(supplier => {
              const totals = this.getSupplierTotals(supplier.id, purchases, payments);
              return `
                <tr>
                  <td class="actions">
                    ${UIPrimitives.actionButton({ className: 'edit-supplier-btn', icon: 'fas fa-edit', title: 'Επεξεργασία', data: { id: supplier.id } })}
                    ${UIPrimitives.actionButton({ className: 'btn-danger delete-supplier-btn', icon: 'fas fa-trash', title: 'Διαγραφή', data: { id: supplier.id } })}
                  </td>
                  <td><strong>${this.escape(supplier.name)}</strong><br><small>${this.escape(supplier.address || supplier.notes || '')}</small></td>
                  <td>${supplier.phone ? `<a href="tel:${supplier.phone}">${this.escape(supplier.phone)}</a>` : '-'}</td>
                  <td>${Utils.formatCurrency(totals.totalPurchases)}</td>
                  <td>${Utils.formatCurrency(totals.totalPaid)}</td>
                  <td><strong style="color: ${totals.balance > 0 ? 'var(--error)' : 'var(--success)'}">${Utils.formatCurrency(totals.balance)}</strong></td>
                </tr>
              `;
            }).join('') : '<tr><td colspan="6" class="text-muted">Δεν υπάρχουν καταστήματα ακόμα.</td></tr>'}
          </tbody>
        </table>
      </div>
      <div class="mobile-card-list" aria-label="Καταστήματα για κινητό">
        ${visibleSuppliers.length ? visibleSuppliers.map(supplier => {
          const totals = this.getSupplierTotals(supplier.id, purchases, payments);
          return `
            <article class="entity-mobile-card">
              <div class="entity-mobile-card-header">
                <div class="entity-mobile-card-title">
                  <strong>${this.escape(supplier.name || '-')}</strong>
                  <span>${this.escape(supplier.address || supplier.notes || '')}</span>
                </div>
                <div class="entity-mobile-card-actions">
                  ${UIPrimitives.actionButton({ className: 'edit-supplier-btn', icon: 'fas fa-edit', title: 'Επεξεργασία', data: { id: supplier.id } })}
                  ${UIPrimitives.actionButton({ className: 'btn-danger delete-supplier-btn', icon: 'fas fa-trash', title: 'Διαγραφή', data: { id: supplier.id } })}
                </div>
              </div>
              <div class="entity-mobile-card-meta">
                ${supplier.phone ? `<a href="tel:${this.escape(supplier.phone)}"><i class="fas fa-phone"></i>${this.escape(supplier.phone)}</a>` : '<span><i class="fas fa-phone"></i>Χωρίς τηλέφωνο</span>'}
                <span><i class="fas fa-receipt"></i>Αγορές: ${Utils.formatCurrency(totals.totalPurchases)}</span>
                <span><i class="fas fa-money-bill-wave"></i>Πληρωμένα: ${Utils.formatCurrency(totals.totalPaid)}</span>
                <span style="color: ${totals.balance > 0 ? 'var(--error)' : 'var(--success)'};"><i class="fas fa-scale-balanced"></i>Υπόλοιπο: ${Utils.formatCurrency(totals.balance)}</span>
              </div>
            </article>
          `;
        }).join('') : UIPrimitives.emptyState({
          icon: 'fas fa-store',
          title: 'Δεν υπάρχουν καταστήματα',
          description: 'Προσθέστε το πρώτο κατάστημα προμηθευτή.'
        })}
      </div>
      ${Utils.renderInfiniteFooter(this.lazyKeys.suppliers, lazy.visible, lazy.total, this.lazyBatchSize)}
    `;
  },

  renderPurchasesTab(suppliers, purchases, inventory) {
    const sortedPurchases = purchases
      .slice()
      .sort((a, b) => String(b.purchaseDate || b.purchase_date || '').localeCompare(String(a.purchaseDate || a.purchase_date || '')));
    const lazy = Utils.getInfiniteSlice(this.lazyKeys.purchases, sortedPurchases, this.lazyBatchSize);
    const visiblePurchases = lazy.items;

    return `
      <div class="form-section">
        <h3>Νέα Αγορά Υλικών</h3>
        <form id="purchaseForm">
          <div class="form-grid">
            <div class="form-group">
              <label>Κατάστημα <span class="required">*</span></label>
              <select id="purchaseSupplier" required>
                <option value="">Επιλέξτε κατάστημα...</option>
                ${suppliers.map(s => `<option value="${s.id}">${this.escape(s.name)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Ημερομηνία</label>
              <input type="date" id="purchaseDate" value="${this.today()}">
            </div>
            <div class="form-group">
              <label>Σύνολο Αγοράς (€) <span class="required">*</span></label>
              <input type="number" id="purchaseTotalAmount" min="0.01" step="0.01" value="0" required>
              <small class="text-muted">Μπορείτε να γράψετε μόνο το ποσό, χωρίς αναλυτικά υλικά.</small>
            </div>
            <div class="form-group span-2">
              <label>Σημειώσεις</label>
              <textarea id="purchaseNotes" rows="2"></textarea>
            </div>
          </div>

          <h4 style="margin-top: 20px;">Υλικά Αγοράς</h4>
          <p class="text-muted" style="margin-bottom: 10px;">Προαιρετικά: αν προσθέσετε υλικά, θα ενημερωθεί και η φυσική Αποθήκη.</p>
          <div id="purchaseItemsContainer"></div>
          <button type="button" class="btn btn-secondary" id="addPurchaseItemBtn" style="margin-top: 10px;">
            <i class="fas fa-plus"></i> Προσθήκη Υλικού
          </button>

          <div class="form-section purchase-payment-section">
            <h4><i class="fas fa-money-check-alt"></i> Πληρωμή Αγοράς</h4>
            <p class="payment-helper-text">Διαλέξτε τι έγινε με την πληρωμή τη στιγμή της αγοράς.</p>
            <div class="form-grid">
              <div class="form-group span-2">
                <div class="payment-option-list" role="radiogroup" aria-label="Κατάσταση πληρωμής αγοράς">
                  <label class="payment-option is-active">
                    <input type="radio" name="purchasePaymentStatus" value="none" checked>
                    <span class="payment-option-content">
                      <span class="payment-option-title">Δεν πληρώθηκε ακόμα</span>
                      <span class="payment-option-description">Η αγορά θα εμφανιστεί ως οφειλή στο κατάστημα.</span>
                    </span>
                  </label>
                  <label class="payment-option">
                    <input type="radio" name="purchasePaymentStatus" value="full">
                    <span class="payment-option-content">
                      <span class="payment-option-title">Πληρώθηκε όλο τώρα</span>
                      <span class="payment-option-description">Θα καταχωρηθεί αυτόματα πληρωμή για όλο το ποσό.</span>
                    </span>
                  </label>
                  <label class="payment-option">
                    <input type="radio" name="purchasePaymentStatus" value="partial">
                    <span class="payment-option-content">
                      <span class="payment-option-title">Πληρώθηκε μέρος τώρα</span>
                      <span class="payment-option-description">Θα γράψετε πόσα δώσατε και το υπόλοιπο μένει ανοικτό.</span>
                    </span>
                  </label>
                </div>
              </div>
              <div class="form-group" id="purchasePaymentAmountWrap" style="display: none;">
                <label>Ποσό Πληρωμής (€)</label>
                <input type="number" id="purchasePaymentAmount" min="0.01" step="0.01" value="" disabled>
              </div>
            </div>
          </div>

          <button type="submit" class="btn btn-primary" style="margin-top: 10px;">
            <i class="fas fa-save"></i> Καταχώρηση Αγοράς
          </button>
        </form>
      </div>

      <div class="table-wrapper has-mobile-cards" style="margin-top: 25px;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Ενέργειες</th>
              <th>Ημερομηνία</th>
              <th>Κατάστημα</th>
              <th>Υλικά</th>
              <th>Σύνολο</th>
              <th>Πληρωμένο στην αγορά</th>
              <th>Υπόλοιπο αγοράς</th>
            </tr>
          </thead>
          <tbody>
            ${visiblePurchases.length ? visiblePurchases.map(purchase => `
              <tr>
                <td class="actions">
                  ${UIPrimitives.actionButton({ className: 'view-purchase-btn', icon: 'fas fa-eye', title: 'Προβολή', data: { id: purchase.id } })}
                  ${UIPrimitives.actionButton({ className: 'btn-danger delete-purchase-btn', icon: 'fas fa-trash', title: 'Διαγραφή', data: { id: purchase.id } })}
                </td>
                <td>${Utils.formatDate(purchase.purchaseDate || purchase.purchase_date)}</td>
                <td>${this.escape(purchase.supplierName || this.getSupplierName(purchase.supplierId || purchase.supplier_id, suppliers))}</td>
                <td>${(purchase.items || []).length}</td>
                <td>${Utils.formatCurrency(purchase.totalCost || purchase.total_cost)}</td>
                <td>${Utils.formatCurrency(purchase.paidAmount || purchase.paid_amount || 0)}</td>
                <td><strong>${Utils.formatCurrency(purchase.balance || 0)}</strong></td>
              </tr>
            `).join('') : '<tr><td colspan="7" class="text-muted">Δεν υπάρχουν αγορές ακόμα.</td></tr>'}
          </tbody>
        </table>
      </div>
      <div class="mobile-card-list" aria-label="Αγορές για κινητό">
        ${visiblePurchases.length ? visiblePurchases.map(purchase => {
          const supplierName = purchase.supplierName || this.getSupplierName(purchase.supplierId || purchase.supplier_id, suppliers);
          const items = Array.isArray(purchase.items) ? purchase.items : DataMappers.parseJsonArray(purchase.items);
          const totalCost = this.toNumber(purchase.totalCost || purchase.total_cost);
          const paidAmount = this.toNumber(purchase.paidAmount || purchase.paid_amount);
          const balance = this.toNumber(purchase.balance);
          return `
            <article class="entity-mobile-card">
              <div class="entity-mobile-card-header">
                <div class="entity-mobile-card-title">
                  <strong>${this.escape(supplierName || '-')}</strong>
                  <span>${Utils.formatDate(purchase.purchaseDate || purchase.purchase_date)} · ${items.length} υλικά</span>
                </div>
                <div class="entity-mobile-card-actions">
                  ${UIPrimitives.actionButton({ className: 'view-purchase-btn', icon: 'fas fa-eye', title: 'Προβολή', data: { id: purchase.id } })}
                  ${UIPrimitives.actionButton({ className: 'btn-danger delete-purchase-btn', icon: 'fas fa-trash', title: 'Διαγραφή', data: { id: purchase.id } })}
                </div>
              </div>
              <div class="entity-mobile-card-meta">
                <span><i class="fas fa-receipt"></i>Σύνολο: ${Utils.formatCurrency(totalCost)}</span>
                <span><i class="fas fa-money-bill-wave"></i>Πληρωμένο: ${Utils.formatCurrency(paidAmount)}</span>
                <span style="color: ${balance > 0 ? 'var(--error)' : 'var(--success)'};"><i class="fas fa-scale-balanced"></i>Υπόλοιπο: ${Utils.formatCurrency(balance)}</span>
              </div>
            </article>
          `;
        }).join('') : UIPrimitives.emptyState({
          icon: 'fas fa-receipt',
          title: 'Δεν υπάρχουν αγορές',
          description: 'Οι αγορές υλικών θα εμφανίζονται εδώ.'
        })}
      </div>
      ${Utils.renderInfiniteFooter(this.lazyKeys.purchases, lazy.visible, lazy.total, this.lazyBatchSize)}

    `;
  },

  renderPaymentsTab(suppliers, purchases, payments) {
    const sortedPayments = payments
      .slice()
      .sort((a, b) => String(b.paymentDate || b.payment_date || '').localeCompare(String(a.paymentDate || a.payment_date || '')));
    const lazy = Utils.getInfiniteSlice(this.lazyKeys.payments, sortedPayments, this.lazyBatchSize);
    const visiblePayments = lazy.items;

    return `
      <div class="form-section">
        <h3>${this.editingPaymentId ? 'Επεξεργασία Πληρωμής' : 'Νέα Πληρωμή'}</h3>
        <form id="supplierPaymentForm" class="form-grid">
          <div class="form-group">
            <label>Κατάστημα <span class="required">*</span></label>
            <select id="paymentSupplier" required>
              <option value="">Επιλέξτε κατάστημα...</option>
              ${suppliers.map(s => `<option value="${s.id}">${this.escape(s.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Σύνδεση με αγορά</label>
            <select id="paymentPurchase">
              <option value="">Έναντι στο κατάστημα</option>
              ${purchases.map(p => {
                const total = this.toNumber(p.totalCost || p.total_cost);
                const balance = this.toNumber(p.balance ?? (total - this.toNumber(p.paidAmount || p.paid_amount)));
                return `<option value="${p.id}" data-supplier-id="${p.supplierId || p.supplier_id}" data-total="${total}" data-balance="${balance}">${Utils.formatDate(p.purchaseDate || p.purchase_date)} - ${this.escape(p.supplierName || '')} - Υπόλοιπο ${Utils.formatCurrency(balance)}</option>`;
              }).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Ημερομηνία</label>
            <input type="date" id="paymentDate" value="${this.today()}">
          </div>
          <div class="form-group">
            <label>Ποσό (€) <span class="required">*</span></label>
            <input type="number" id="paymentAmount" min="0.01" step="0.01" required>
          </div>
          <div class="form-group">
            <label>Σημειώσεις</label>
            <input type="text" id="paymentNotes" placeholder="π.χ. έναντι λογαριασμού">
          </div>
          <div class="form-group span-2">
            <button type="submit" class="btn btn-primary">
              <i class="fas fa-save"></i> ${this.editingPaymentId ? 'Αποθήκευση' : 'Καταχώρηση Πληρωμής'}
            </button>
            ${this.editingPaymentId ? '<button type="button" class="btn btn-secondary" id="cancelPaymentEditBtn">Ακύρωση</button>' : ''}
          </div>
        </form>
      </div>

      <div class="table-wrapper has-mobile-cards" style="margin-top: 25px;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Ενέργειες</th>
              <th>Ημερομηνία</th>
              <th>Κατάστημα</th>
              <th>Αγορά</th>
              <th>Ποσό</th>
              <th>Σημειώσεις</th>
            </tr>
          </thead>
          <tbody>
            ${visiblePayments.length ? visiblePayments.map(payment => `
              <tr>
                <td class="actions">
                  ${UIPrimitives.actionButton({ className: 'edit-payment-btn', icon: 'fas fa-edit', title: 'Επεξεργασία', data: { id: payment.id } })}
                  ${UIPrimitives.actionButton({ className: 'btn-danger delete-payment-btn', icon: 'fas fa-trash', title: 'Διαγραφή', data: { id: payment.id } })}
                </td>
                <td>${Utils.formatDate(payment.paymentDate || payment.payment_date)}</td>
                <td>${this.escape(payment.supplierName || this.getSupplierName(payment.supplierId || payment.supplier_id, suppliers))}</td>
                <td>${payment.purchaseId || payment.purchase_id ? `#${payment.purchaseId || payment.purchase_id}` : 'Έναντι'}</td>
                <td><strong>${Utils.formatCurrency(payment.amount)}</strong></td>
                <td>${this.escape(payment.notes || '-')}</td>
              </tr>
            `).join('') : '<tr><td colspan="6" class="text-muted">Δεν υπάρχουν πληρωμές ακόμα.</td></tr>'}
          </tbody>
        </table>
      </div>
      <div class="mobile-card-list" aria-label="Πληρωμές προμηθευτών για κινητό">
        ${visiblePayments.length ? visiblePayments.map(payment => {
          const supplierName = payment.supplierName || this.getSupplierName(payment.supplierId || payment.supplier_id, suppliers);
          const purchaseId = payment.purchaseId || payment.purchase_id;
          return `
            <article class="entity-mobile-card">
              <div class="entity-mobile-card-header">
                <div class="entity-mobile-card-title">
                  <strong>${this.escape(supplierName || '-')}</strong>
                  <span>${Utils.formatDate(payment.paymentDate || payment.payment_date)} · ${purchaseId ? `Αγορά #${purchaseId}` : 'Έναντι'}</span>
                </div>
                <div class="entity-mobile-card-actions">
                  ${UIPrimitives.actionButton({ className: 'edit-payment-btn', icon: 'fas fa-edit', title: 'Επεξεργασία', data: { id: payment.id } })}
                  ${UIPrimitives.actionButton({ className: 'btn-danger delete-payment-btn', icon: 'fas fa-trash', title: 'Διαγραφή', data: { id: payment.id } })}
                </div>
              </div>
              <div class="entity-mobile-card-meta">
                <span><i class="fas fa-euro-sign"></i>Ποσό: ${Utils.formatCurrency(payment.amount)}</span>
                ${payment.notes ? `<span><i class="fas fa-note-sticky"></i>${this.escape(payment.notes)}</span>` : ''}
              </div>
            </article>
          `;
        }).join('') : UIPrimitives.emptyState({
          icon: 'fas fa-credit-card',
          title: 'Δεν υπάρχουν πληρωμές',
          description: 'Οι πληρωμές προμηθευτών θα εμφανίζονται εδώ.'
        })}
      </div>
      ${Utils.renderInfiniteFooter(this.lazyKeys.payments, lazy.visible, lazy.total, this.lazyBatchSize)}
    `;
  },

  renderMaterialsTab(inventory) {
    return `
      <div class="table-wrapper has-mobile-cards">
        <table class="data-table">
          <thead>
            <tr>
              <th>Υλικό</th>
              <th>Μονάδα</th>
              <th>Τελευταία Τιμή</th>
              <th>Απόθεμα</th>
              <th>Αξία</th>
              <th>Κατηγορία</th>
            </tr>
          </thead>
          <tbody>
            ${inventory.length ? inventory.map(material => {
              const unitPrice = this.toNumber(material.unitPrice || material.unit_price);
              const stock = this.toNumber(material.stock);
              return `
                <tr>
                  <td><strong>${this.escape(material.name)}</strong></td>
                  <td>${this.escape(material.unit || '-')}</td>
                  <td>${Utils.formatCurrency(unitPrice)}</td>
                  <td>${stock.toFixed(2)}</td>
                  <td>${Utils.formatCurrency(unitPrice * stock)}</td>
                  <td>${this.escape(material.category || '-')}</td>
                </tr>
              `;
            }).join('') : '<tr><td colspan="6" class="text-muted">Δεν υπάρχουν υλικά ακόμα.</td></tr>'}
          </tbody>
        </table>
      </div>
      <div class="mobile-card-list" aria-label="Υλικά για κινητό">
        ${inventory.length ? inventory.map(material => {
          const unitPrice = this.toNumber(material.unitPrice || material.unit_price);
          const stock = this.toNumber(material.stock);
          return `
            <article class="entity-mobile-card">
              <div class="entity-mobile-card-header">
                <div class="entity-mobile-card-title">
                  <strong>${this.escape(material.name || '-')}</strong>
                  <span>${this.escape(material.category || '-')}</span>
                </div>
              </div>
              <div class="entity-mobile-card-meta">
                <span><i class="fas fa-boxes-stacked"></i>${stock.toFixed(2)} ${this.escape(material.unit || '')}</span>
                <span><i class="fas fa-tag"></i>${Utils.formatCurrency(unitPrice)} / μονάδα</span>
                <span><i class="fas fa-coins"></i>Αξία: ${Utils.formatCurrency(unitPrice * stock)}</span>
              </div>
            </article>
          `;
        }).join('') : UIPrimitives.emptyState({
          icon: 'fas fa-box-open',
          title: 'Δεν υπάρχουν υλικά',
          description: 'Τα υλικά θα εμφανίζονται εδώ όταν καταχωρηθούν.'
        })}
      </div>
    `;
  },

  renderActiveTabWithLazy(container, suppliers, purchases, payments, inventory, { reset = false } = {}) {
    const key = this.lazyKeys[this.activeTab] || this.lazyKeys.suppliers;
    if (reset) {
      Utils.resetInfiniteList(key, this.lazyBatchSize);
    }

    const tabContent = container.querySelector('#suppliersActiveTabContent');
    if (!tabContent) return;

    tabContent.innerHTML = this.renderActiveTab(suppliers, purchases, payments, inventory);
    this.setupSupplierForm(container);
    this.setupPurchaseForm(container);
    this.setupPaymentForm(container);
    this.setupTableActions(container);
    this.setupLazyTable(container, suppliers, purchases, payments, inventory);
  },

  setupLazyTable(container, suppliers, purchases, payments, inventory) {
    const key = this.lazyKeys[this.activeTab] || this.lazyKeys.suppliers;
    const totalByTab = {
      suppliers: Array.isArray(suppliers) ? suppliers.length : 0,
      purchases: Array.isArray(purchases) ? purchases.length : 0,
      payments: Array.isArray(payments) ? payments.length : 0
    };

    Utils.setupInfiniteScroll({
      key,
      total: totalByTab[this.activeTab] || 0,
      batchSize: this.lazyBatchSize,
      onLoadMore: () => this.renderActiveTabWithLazy(container, suppliers, purchases, payments, inventory)
    });
  },

  setupEventListeners(container) {
    container.querySelectorAll('[data-inventory-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.dataset.inventoryTab;
        this.render(container);
      });
    });

    this.setupSupplierForm(container);
    this.setupPurchaseForm(container);
    this.setupPaymentForm(container);
    this.setupTableActions(container);
  },

  setupSupplierForm(container) {
    const form = container.querySelector('#supplierForm');
    if (!form) return;

    if (this.editingSupplierId) {
      const supplier = State.read('suppliers', this.editingSupplierId);
      if (supplier) {
        container.querySelector('#supplierName').value = supplier.name || '';
        container.querySelector('#supplierPhone').value = supplier.phone || '';
        container.querySelector('#supplierAddress').value = supplier.address || '';
        container.querySelector('#supplierNotes').value = supplier.notes || '';
      }
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        name: container.querySelector('#supplierName').value.trim(),
        phone: container.querySelector('#supplierPhone').value.trim(),
        address: container.querySelector('#supplierAddress').value.trim(),
        notes: container.querySelector('#supplierNotes').value.trim()
      };

      if (!data.name) {
        Toast.error('Συμπληρώστε όνομα καταστήματος');
        return;
      }

      if (this.editingSupplierId) {
        await State.update('suppliers', this.editingSupplierId, data);
        this.editingSupplierId = null;
        Toast.success('Το κατάστημα ενημερώθηκε');
      } else {
        await State.create('suppliers', data);
        Toast.success('Το κατάστημα προστέθηκε');
      }
      await this.refreshWarehouseData();
      this.render(container);
    });

    const cancelBtn = container.querySelector('#cancelSupplierEditBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.editingSupplierId = null;
        this.render(container);
      });
    }
  },

  setupPurchaseForm(container) {
    const form = container.querySelector('#purchaseForm');
    if (!form) return;

    const itemsContainer = container.querySelector('#purchaseItemsContainer');
    const addBtn = container.querySelector('#addPurchaseItemBtn');
    const addRow = () => {
      const row = document.createElement('div');
      row.className = 'purchase-item-row form-grid';
      row.style.marginBottom = '10px';
      row.innerHTML = `
        <div class="form-group">
          <label>Υλικό</label>
          <div class="autocomplete-container">
            <input type="text" class="purchase-material-name" required placeholder="Αναζήτηση υλικού..." autocomplete="off">
            <div class="purchase-material-results autocomplete-results" style="display: none;"></div>
          </div>
        </div>
        <div class="form-group">
          <label>Κατηγορία</label>
          <select class="purchase-category">
            ${this.renderCategoryOptions('Χρώμα')}
          </select>
        </div>
        <div class="form-group purchase-color-code-group">
          <label>Κωδικός χρώματος</label>
          <input type="text" class="purchase-color-code" placeholder="π.χ. RAL 9010">
        </div>
        <div class="form-group">
          <label>Ποσότητα</label>
          <input type="number" class="purchase-quantity" min="0.01" step="0.01" value="1" required>
        </div>
        <div class="form-group">
          <label>Μονάδα</label>
          <select class="purchase-unit">
            ${this.renderUnitOptions()}
          </select>
        </div>
        <div class="form-group">
          <label>Τιμή/Μονάδα</label>
          <input type="number" class="purchase-unit-price" min="0" step="0.01" value="0">
        </div>
        <div class="form-group">
          <label>Σύνολο</label>
          <input type="text" class="purchase-line-total" readonly value="0.00 €">
        </div>
        <div class="form-group">
          <label>&nbsp;</label>
          <button type="button" class="btn btn-danger remove-purchase-item-btn"><i class="fas fa-trash"></i></button>
        </div>
      `;
      itemsContainer.appendChild(row);
      row.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('input', () => this.updatePurchaseTotals(container));
        input.addEventListener('change', () => this.updatePurchaseTotals(container));
      });
      row.querySelector('.purchase-category').addEventListener('change', () => this.updatePurchaseColorCodeVisibility(row));
      this.setupPurchaseMaterialAutocomplete(row);
      row.querySelector('.remove-purchase-item-btn').addEventListener('click', () => {
        row.remove();
        this.updatePurchaseTotals(container);
      });
      this.updatePurchaseColorCodeVisibility(row);
      this.updatePurchaseTotals(container);
    };

    addBtn.addEventListener('click', addRow);

    const totalInput = container.querySelector('#purchaseTotalAmount');
    if (totalInput) {
      totalInput.addEventListener('input', () => {
        totalInput.dataset.manualTotal = 'true';
      });
    }

    const updatePaymentVisibility = () => {
      const status = container.querySelector('input[name="purchasePaymentStatus"]:checked')?.value || 'none';
      const showPaymentFields = status !== 'none';
      const showAmountField = status === 'partial';
      const amountWrap = container.querySelector('#purchasePaymentAmountWrap');
      const amountInput = container.querySelector('#purchasePaymentAmount');
      if (amountWrap) amountWrap.style.display = showAmountField ? '' : 'none';
      if (amountInput) {
        amountInput.disabled = !showAmountField;
        amountInput.required = showAmountField;
        if (!showAmountField) {
          amountInput.value = '';
        }
      }
      container.querySelectorAll('.payment-option').forEach(option => {
        const input = option.querySelector('input[name="purchasePaymentStatus"]');
        option.classList.toggle('is-active', input?.checked === true);
      });
    };

    container.querySelectorAll('input[name="purchasePaymentStatus"]').forEach(input => {
      input.addEventListener('change', updatePaymentVisibility);
    });
    updatePaymentVisibility();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const rows = [...container.querySelectorAll('.purchase-item-row')];
      const inventory = State.read('inventory') || [];
      const items = [];
      for (const row of rows) {
        const name = row.querySelector('.purchase-material-name').value.trim();
        const category = row.querySelector('.purchase-category').value;
        const colorCode = row.querySelector('.purchase-color-code')?.value.trim() || '';
        let material = inventory.find(m => MaterialIdentity.normalizeSearchText(m.name) === MaterialIdentity.normalizeSearchText(name));
        const candidate = MaterialIdentity.prepare({ name, category, colorCode });
        const similar = MaterialIdentity.findSimilar(inventory, candidate);
        if (similar && (!material || Number(material.id) !== Number(similar.id))) {
          const useExisting = await MaterialIdentity.confirmUseExisting(candidate, similar);
          if (useExisting) {
            material = similar;
            row.querySelector('.purchase-material-name').value = similar.name || name;
            row.querySelector('.purchase-category').value = MaterialIdentity.normalizeCategory(similar.category || category);
            row.querySelector('.purchase-color-code').value = similar.colorCode || similar.color_code || '';
            this.updatePurchaseColorCodeVisibility(row);
          }
        } else if (similar) {
          material = similar;
        }
        const quantity = this.toNumber(row.querySelector('.purchase-quantity').value);
        const unitPrice = this.toNumber(row.querySelector('.purchase-unit-price').value);
        items.push({
          materialId: material ? material.id : null,
          materialName: material ? material.name : name,
          category: material ? (material.category || category) : category,
          colorCode: material ? (material.colorCode || material.color_code || colorCode) : colorCode,
          quantity,
          unit: row.querySelector('.purchase-unit').value.trim() || (material ? material.unit : ''),
          unitPrice,
          totalCost: quantity * unitPrice
        });
      }
      const filteredItems = items.filter(item => item.materialName || item.quantity > 0 || item.unitPrice > 0);

      if (!container.querySelector('#purchaseSupplier').value) {
        Toast.error('Επιλέξτε κατάστημα');
        return;
      }
      if (filteredItems.some(item => !item.materialName || item.quantity <= 0)) {
        Toast.error('Συμπληρώστε σωστά τα υλικά της αγοράς ή αφαιρέστε την κενή γραμμή');
        return;
      }

      const paymentStatus = container.querySelector('input[name="purchasePaymentStatus"]:checked')?.value || 'none';
      const itemsTotal = filteredItems.reduce((sum, item) => sum + this.toNumber(item.totalCost), 0);
      const purchaseTotal = this.toNumber(container.querySelector('#purchaseTotalAmount').value) || itemsTotal;
      if (purchaseTotal <= 0) {
        Toast.error('Συμπληρώστε το σύνολο αγοράς');
        return;
      }
      const paymentAmount = paymentStatus === 'full'
        ? purchaseTotal
        : (paymentStatus === 'partial' ? this.toNumber(container.querySelector('#purchasePaymentAmount').value) : 0);

      if (paymentStatus === 'partial' && paymentAmount <= 0) {
        Toast.error('Συμπληρώστε ποσό μερικής πληρωμής');
        return;
      }
      if (paymentAmount > purchaseTotal) {
        Toast.error('Η πληρωμή δεν μπορεί να είναι μεγαλύτερη από το σύνολο της αγοράς');
        return;
      }

      await State.create('materialPurchases', {
        supplierId: parseInt(container.querySelector('#purchaseSupplier').value, 10),
        purchaseDate: container.querySelector('#purchaseDate').value,
        totalCost: purchaseTotal,
        referenceNumber: '',
        notes: container.querySelector('#purchaseNotes').value.trim(),
        initialPayment: {
          status: paymentStatus,
          amount: paymentAmount,
          paymentMethod: '',
          notes: ''
        },
        items: filteredItems
      });
      Toast.success('Η αγορά καταχωρήθηκε');
      await this.refreshWarehouseData();
      this.render(container);
    });
  },

  setupPaymentForm(container) {
    const form = container.querySelector('#supplierPaymentForm');
    if (!form) return;

    const supplierSelect = container.querySelector('#paymentSupplier');
    const purchaseSelect = container.querySelector('#paymentPurchase');
    const amountInput = container.querySelector('#paymentAmount');
    const filterPurchases = () => {
      const supplierId = supplierSelect.value;
      [...purchaseSelect.options].forEach(option => {
        if (!option.value) {
          option.hidden = false;
          return;
        }
        option.hidden = supplierId && option.dataset.supplierId !== supplierId;
      });
      if (purchaseSelect.selectedOptions[0]?.hidden) purchaseSelect.value = '';
    };
    const fillAmountFromSelectedPurchase = () => {
      const selected = purchaseSelect.selectedOptions[0];
      if (!selected || !selected.value) return;

      if (!supplierSelect.value && selected.dataset.supplierId) {
        supplierSelect.value = selected.dataset.supplierId;
        filterPurchases();
      }

      const balance = this.toNumber(selected.dataset.balance);
      const total = this.toNumber(selected.dataset.total);
      const suggestedAmount = balance > 0 ? balance : total;
      if (suggestedAmount > 0 && amountInput) {
        amountInput.value = suggestedAmount.toFixed(2);
      }
    };
    supplierSelect.addEventListener('change', filterPurchases);
    purchaseSelect.addEventListener('change', fillAmountFromSelectedPurchase);

    if (this.editingPaymentId) {
      const payment = State.read('supplierPayments', this.editingPaymentId);
      if (payment) {
        supplierSelect.value = payment.supplierId || payment.supplier_id || '';
        filterPurchases();
        purchaseSelect.value = payment.purchaseId || payment.purchase_id || '';
        container.querySelector('#paymentDate').value = payment.paymentDate || payment.payment_date || this.today();
        container.querySelector('#paymentAmount').value = payment.amount || '';
        container.querySelector('#paymentNotes').value = payment.notes || '';
      }
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        supplierId: parseInt(supplierSelect.value, 10),
        purchaseId: purchaseSelect.value ? parseInt(purchaseSelect.value, 10) : null,
        paymentDate: container.querySelector('#paymentDate').value,
        amount: this.toNumber(container.querySelector('#paymentAmount').value),
        paymentMethod: '',
        notes: container.querySelector('#paymentNotes').value.trim()
      };

      if (!data.supplierId || data.amount <= 0) {
        Toast.error('Συμπληρώστε κατάστημα και ποσό πληρωμής');
        return;
      }

      if (this.editingPaymentId) {
        await State.update('supplierPayments', this.editingPaymentId, data);
        this.editingPaymentId = null;
        Toast.success('Η πληρωμή ενημερώθηκε');
      } else {
        await State.create('supplierPayments', data);
        Toast.success('Η πληρωμή καταχωρήθηκε');
      }
      await this.refreshWarehouseData();
      this.render(container);
    });

    const cancelBtn = container.querySelector('#cancelPaymentEditBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.editingPaymentId = null;
        this.render(container);
      });
    }
  },

  setupTableActions(container) {
    container.querySelectorAll('.edit-supplier-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.editingSupplierId = btn.dataset.id;
        this.render(container);
      });
    });

    container.querySelectorAll('.delete-supplier-btn').forEach(btn => {
      btn.addEventListener('click', () => this.confirmDeleteSupplier(container, btn.dataset.id));
    });

    container.querySelectorAll('.view-purchase-btn').forEach(btn => {
      btn.addEventListener('click', () => this.viewPurchase(btn.dataset.id));
    });

    container.querySelectorAll('.delete-purchase-btn').forEach(btn => {
      btn.addEventListener('click', () => this.confirmDeletePurchase(container, btn.dataset.id));
    });

    container.querySelectorAll('.edit-payment-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.editingPaymentId = btn.dataset.id;
        this.activeTab = 'payments';
        this.render(container);
      });
    });

    container.querySelectorAll('.delete-payment-btn').forEach(btn => {
      btn.addEventListener('click', () => this.confirmDeletePayment(container, btn.dataset.id));
    });
  },

  async confirmDeleteSupplier(container, id) {
    const supplier = State.read('suppliers', id);
    Modal.confirm({
      title: 'Διαγραφή Καταστήματος',
      message: `Θέλετε σίγουρα να διαγράψετε το κατάστημα <strong>${this.escape(supplier?.name || '')}</strong>; Θα διαγραφούν και οι αγορές/πληρωμές του.`,
      onConfirm: async () => {
        await State.delete('suppliers', id);
        await this.refreshWarehouseData();
        this.render(container);
        Toast.success('Το κατάστημα διαγράφηκε');
      }
    });
  },

  async confirmDeletePurchase(container, id) {
    Modal.confirm({
      title: 'Διαγραφή Αγοράς',
      message: 'Θέλετε σίγουρα να διαγράψετε την αγορά; Το απόθεμα των υλικών θα μειωθεί αντίστοιχα.',
      onConfirm: async () => {
        await State.delete('materialPurchases', id);
        await this.refreshWarehouseData();
        this.render(container);
        Toast.success('Η αγορά διαγράφηκε');
      }
    });
  },

  async confirmDeletePayment(container, id) {
    Modal.confirm({
      title: 'Διαγραφή Πληρωμής',
      message: 'Θέλετε σίγουρα να διαγράψετε την πληρωμή;',
      onConfirm: async () => {
        await State.delete('supplierPayments', id);
        await this.refreshWarehouseData();
        this.render(container);
        Toast.success('Η πληρωμή διαγράφηκε');
      }
    });
  },

  viewPurchase(id) {
    const purchase = State.read('materialPurchases', id);
    if (!purchase) return;

    const items = purchase.items || [];
    Modal.open({
      title: `Αγορά #${purchase.id}`,
      size: 'lg',
      content: `
        <div class="detail-grid">
          <div class="detail-item"><label>Κατάστημα:</label><span>${this.escape(purchase.supplierName || '')}</span></div>
          <div class="detail-item"><label>Ημερομηνία:</label><span>${Utils.formatDate(purchase.purchaseDate || purchase.purchase_date)}</span></div>
          <div class="detail-item"><label>Σύνολο:</label><span><strong>${Utils.formatCurrency(purchase.totalCost || purchase.total_cost)}</strong></span></div>
        </div>
        ${items.length ? `<div class="table-wrapper" style="margin-top: 15px;">
          <table class="data-table">
            <thead><tr><th>Υλικό</th><th>Ποσότητα</th><th>Μονάδα</th><th>Τιμή</th><th>Σύνολο</th></tr></thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td>${this.escape(item.materialName || item.material_name)}</td>
                  <td>${this.toNumber(item.quantity).toFixed(2)}</td>
                  <td>${this.escape(item.unit || '-')}</td>
                  <td>${Utils.formatCurrency(item.unitPrice || item.unit_price)}</td>
                  <td>${Utils.formatCurrency(item.totalCost || item.total_cost)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>` : '<p class="text-muted" style="margin-top: 15px;">Η αγορά καταχωρήθηκε μόνο με συνολικό ποσό, χωρίς αναλυτικά υλικά.</p>'}
      `,
      footer: '<button class="btn-primary" onclick="Modal.close()">Κλείσιμο</button>'
    });
  },

  updatePurchaseTotals(container) {
    let total = 0;
    container.querySelectorAll('.purchase-item-row').forEach(row => {
      const quantity = this.toNumber(row.querySelector('.purchase-quantity').value);
      const unitPrice = this.toNumber(row.querySelector('.purchase-unit-price').value);
      const lineTotal = quantity * unitPrice;
      total += lineTotal;
      row.querySelector('.purchase-line-total').value = Utils.formatCurrency(lineTotal);
    });
    const totalInput = container.querySelector('#purchaseTotalAmount');
    if (totalInput && total > 0 && totalInput.dataset.manualTotal !== 'true') {
      totalInput.value = total.toFixed(2);
    }
  },

  updatePurchaseColorCodeVisibility(row) {
    const category = row.querySelector('.purchase-category')?.value;
    const group = row.querySelector('.purchase-color-code-group');
    const input = row.querySelector('.purchase-color-code');
    const isColor = MaterialIdentity.normalizeCategory(category) === 'Χρώμα';
    if (group) group.style.display = isColor ? '' : 'none';
    if (!isColor && input) input.value = '';
  },

  fillPurchaseRowFromInventory(row) {
    const name = row.querySelector('.purchase-material-name')?.value.trim();
    if (!name) return;

    const inventory = State.read('inventory') || [];
    const material = inventory.find(item => MaterialIdentity.normalizeSearchText(item.name) === MaterialIdentity.normalizeSearchText(name));
    if (!material) return;

    row.querySelector('.purchase-material-name').value = material.name || name;
    row.querySelector('.purchase-category').value = MaterialIdentity.normalizeCategory(material.category);
    row.querySelector('.purchase-color-code').value = material.colorCode || material.color_code || '';
    row.querySelector('.purchase-unit').value = material.unit || row.querySelector('.purchase-unit').value;
    row.querySelector('.purchase-unit-price').value = this.toNumber(material.unitPrice || material.unit_price).toFixed(2);
    this.updatePurchaseColorCodeVisibility(row);
  },

  setupPurchaseMaterialAutocomplete(row) {
    const input = row.querySelector('.purchase-material-name');
    const results = row.querySelector('.purchase-material-results');
    if (!input || !results) return;

    const render = () => {
      const matches = MaterialIdentity.search(State.read('inventory') || [], input.value);
      this.renderMaterialAutocompleteResults(results, matches, (material) => {
        input.value = material.name || '';
        results.style.display = 'none';
        this.fillPurchaseRowFromInventory(row);
        this.updatePurchaseTotals(row.closest('#purchaseForm') || document);
      });
    };

    input.addEventListener('focus', render);
    input.addEventListener('input', render);
    input.addEventListener('blur', () => {
      setTimeout(() => {
        results.style.display = 'none';
        this.fillPurchaseRowFromInventory(row);
      }, 150);
    });
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

  async refreshWarehouseData() {
    const [materials, movements, suppliers, purchases, payments] = await Promise.all([
      API.getMaterials(),
      API.getMaterialStockMovements(),
      API.getSuppliers(),
      API.getMaterialPurchases(),
      API.getSupplierPayments()
    ]);
    State.data.inventory = materials || [];
    State.data.materialStockMovements = movements || [];
    State.data.suppliers = suppliers || [];
    State.data.materialPurchases = purchases || [];
    State.data.supplierPayments = payments || [];
  },

  getSupplierTotals(supplierId, purchases, payments) {
    const totalPurchases = purchases
      .filter(p => Number(p.supplierId || p.supplier_id) === Number(supplierId))
      .reduce((sum, p) => sum + this.toNumber(p.totalCost || p.total_cost), 0);
    const totalPaid = payments
      .filter(p => Number(p.supplierId || p.supplier_id) === Number(supplierId))
      .reduce((sum, p) => sum + this.toNumber(p.amount), 0);
    return {
      totalPurchases,
      totalPaid,
      balance: totalPurchases - totalPaid
    };
  },

  getSupplierName(id, suppliers) {
    return suppliers.find(s => Number(s.id) === Number(id))?.name || '-';
  },

  toNumber(value) {
    const parsed = parseFloat(String(value ?? '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  },

  today() {
    return new Date().toISOString().slice(0, 10);
  },

  renderUnitOptions(selected = 'λίτρα') {
    const units = ['λίτρα', 'τεμ.', 'kg', 'm²', 'μέτρα', 'ρολά', 'κουβάδες', 'σακιά', 'άλλο'];
    return units.map(unit => `<option value="${this.escape(unit)}" ${unit === selected ? 'selected' : ''}>${this.escape(unit)}</option>`).join('');
  },

  renderCategoryOptions(selected = 'Χρώμα') {
    return MaterialIdentity.categoryOptions(selected);
  },

  escape(value) {
    if (window.Utils && typeof Utils.escapeHtml === 'function') return Utils.escapeHtml(value || '');
    const div = document.createElement('div');
    div.textContent = value || '';
    return div.innerHTML;
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
