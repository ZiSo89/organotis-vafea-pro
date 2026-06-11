/* ========================================
   Offline Service
   Handles local database operations via Electron API
   ======================================== */

window.OfflineService = {
  
  _dbReady: false,
  
  // Initialize and wait for database
  async init() {
    if (!this.isElectron()) {
      return false;
    }
    
    if (this._dbReady) {
      return true;
    }
    
    try {
      console.log('⏳ Waiting for database to be ready...');
      await window.electronAPI.db.waitReady();
      this._dbReady = true;
      console.log('✅ Database is ready!');
      return true;
    } catch (error) {
      console.error('❌ Error waiting for database:', error);
      return false;
    }
  },
  
  // Check if running in Electron
  isElectron() {
    return (
      typeof window.electronAPI !== 'undefined' &&
      typeof window.electronAPI.db !== 'undefined' &&
      typeof window.electronAPI.sync !== 'undefined'
    );
  },

  /* ========================================
     Database Operations
     ======================================== */

  async getAll(table) {
    if (!this.isElectron()) {
      return { success: false, message: 'Offline mode only available in Electron app or Electron API not loaded.' };
    }
    
    await this.init();
    
    try {
      if (!window.electronAPI.db || typeof window.electronAPI.db.getAll !== 'function') {
        throw new Error('Electron API db.getAll is not available');
      }
      const result = await window.electronAPI.db.getAll(table);
      // IPC already returns {success, data}, so just return it directly
      return result;
    } catch (error) {
      console.error(`Error getting all ${table}:`, error);
      return { success: false, message: error.message };
    }
  },

  async getById(table, id) {
    if (!this.isElectron()) {
      return { success: false, message: 'Offline mode only available in Electron app or Electron API not loaded.' };
    }
    try {
      if (!window.electronAPI.db || typeof window.electronAPI.db.getById !== 'function') {
        throw new Error('Electron API db.getById is not available');
      }
      const result = await window.electronAPI.db.getById(table, id);
      return result;
    } catch (error) {
      console.error(`Error getting ${table} by id:`, error);
      return { success: false, message: error.message };
    }
  },

  async insert(table, data) {
    if (!this.isElectron()) {
      return { success: false, message: 'Offline mode only available in Electron app or Electron API not loaded.' };
    }
    
    await this.init();
    
    try {
      if (!window.electronAPI.db || typeof window.electronAPI.db.insert !== 'function') {
        throw new Error('Electron API db.insert is not available');
      }
      const result = await window.electronAPI.db.insert(table, data);
      return result;
    } catch (error) {
      console.error(`Error inserting into ${table}:`, error);
      return { success: false, message: error.message };
    }
  },

  async update(table, id, data) {
    if (!this.isElectron()) {
      return { success: false, message: 'Offline mode only available in Electron app or Electron API not loaded.' };
    }
    
    await this.init();
    
    try {
      if (!window.electronAPI.db || typeof window.electronAPI.db.update !== 'function') {
        throw new Error('Electron API db.update is not available');
      }
      const result = await window.electronAPI.db.update(table, id, data);
      return result;
    } catch (error) {
      console.error(`Error updating ${table}:`, error);
      return { success: false, message: error.message };
    }
  },

  async delete(table, id) {
    if (!this.isElectron()) {
      return { success: false, message: 'Offline mode only available in Electron app or Electron API not loaded.' };
    }
    try {
      if (!window.electronAPI.db || typeof window.electronAPI.db.delete !== 'function') {
        throw new Error('Electron API db.delete is not available');
      }
      const result = await window.electronAPI.db.delete(table, id);
      return result;
    } catch (error) {
      console.error(`Error deleting from ${table}:`, error);
      return { success: false, message: error.message };
    }
  },

  async query(sql, params = []) {
    if (!this.isElectron()) {
      return { success: false, message: 'Offline mode only available in Electron app or Electron API not loaded.' };
    }
    try {
      if (!window.electronAPI.db || typeof window.electronAPI.db.query !== 'function') {
        throw new Error('Electron API db.query is not available');
      }
      const data = await window.electronAPI.db.query(sql, params);
      return { success: true, data };
    } catch (error) {
      console.error('Error executing query:', error);
      return { success: false, message: error.message };
    }
  },

  /* ========================================
     Sync Operations
     ======================================== */

  async checkOnline(serverUrl = null) {
    if (!this.isElectron()) {
      return navigator.onLine;
    }
    try {
      if (!window.electronAPI.sync || typeof window.electronAPI.sync.checkOnline !== 'function') {
        throw new Error('Electron API sync.checkOnline is not available');
      }
      return await window.electronAPI.sync.checkOnline(serverUrl);
    } catch (error) {
      console.error('Error checking online status:', error);
      return false;
    }
  },

  async downloadFromServer(serverUrl) {
    if (!this.isElectron()) {
      return { success: false, message: 'Sync only available in Electron app or Electron API not loaded.' };
    }
    try {
      if (!window.electronAPI.sync || typeof window.electronAPI.sync.download !== 'function') {
        throw new Error('Electron API sync.download is not available');
      }
      Toast.info('Λήψη δεδομένων από server...');
      const result = await window.electronAPI.sync.download(serverUrl);
      if (result.success) {
        Toast.success(`✅ Λήψη ολοκληρώθηκε! ${result.totalRecords} εγγραφές`);
      } else {
        Toast.warning(`⚠️ Λήψη με σφάλματα: ${result.errors.join(', ')}`);
      }
      return result;
    } catch (error) {
      console.error('Error downloading from server:', error);
      Toast.error('Σφάλμα κατά τη λήψη δεδομένων');
      return { success: false, message: error.message };
    }
  },

  async uploadToServer(serverUrl) {
    if (!this.isElectron()) {
      return { success: false, message: 'Sync only available in Electron app or Electron API not loaded.' };
    }
    try {
      if (!window.electronAPI.sync || typeof window.electronAPI.sync.upload !== 'function') {
        throw new Error('Electron API sync.upload is not available');
      }
      Toast.info('Αποστολή δεδομένων στον server...');
      const result = await window.electronAPI.sync.upload(serverUrl);
      if (result.success) {
        Toast.success(`✅ Αποστολή ολοκληρώθηκε! ${result.totalRecords} αλλαγές`);
      } else {
        Toast.warning(`⚠️ Αποστολή με σφάλματα: ${result.errors.join(', ')}`);
      }
      return result;
    } catch (error) {
      console.error('Error uploading to server:', error);
      Toast.error('Σφάλμα κατά την αποστολή δεδομένων');
      return { success: false, message: error.message };
    }
  },

  async getSyncStatus() {
    if (!this.isElectron()) {
      return null;
    }
    try {
      if (!window.electronAPI.sync || typeof window.electronAPI.sync.getStatus !== 'function') {
        throw new Error('Electron API sync.getStatus is not available');
      }
      return await window.electronAPI.sync.getStatus();
    } catch (error) {
      console.error('Error getting sync status:', error);
      return null;
    }
  },

  async getPendingCount() {
    if (!this.isElectron()) {
      return 0;
    }
    try {
      if (!window.electronAPI.sync || typeof window.electronAPI.sync.getPendingCount !== 'function') {
        throw new Error('Electron API sync.getPendingCount is not available');
      }
      return await window.electronAPI.sync.getPendingCount();
    } catch (error) {
      console.error('Error getting pending count:', error);
      return 0;
    }
  },

  /* ========================================
     Table-Specific Helpers
     ======================================== */

  // Clients
  async getClients() {
    return await this.getAll('clients');
  },

  async getClient(id) {
    return await this.getById('clients', id);
  },

  async createClient(data) {
    return await this.insert('clients', data);
  },

  async updateClient(id, data) {
    return await this.update('clients', id, data);
  },

  async deleteClient(id) {
    return await this.delete('clients', id);
  },

  // Jobs
  async getJobs() {
    return await this.getAll('jobs');
  },

  async getJob(id) {
    return await this.getById('jobs', id);
  },

  async createJob(data) {
    return await this.insert('jobs', data);
  },

  async updateJob(id, data) {
    return await this.update('jobs', id, data);
  },

  async deleteJob(id) {
    return await this.delete('jobs', id);
  },

  // Job Visits (επισκέψεις εργασίας)
  _computeVisitTotals(workers) {
    const list = Array.isArray(workers) ? workers : [];
    const totals = { totalHours: 0, employeeHours: 0, ownerHours: 0, laborCost: 0 };
    list.forEach(w => {
      const hours = parseFloat(w.hours || w.hoursAllocated || 0) || 0;
      const rate = parseFloat(w.hourlyRate || w.hourly_rate || 0) || 0;
      const type = (w.workerType || w.worker_type) === 'owner' ? 'owner' : 'employee';
      totals.totalHours += hours;
      if (type === 'owner') {
        totals.ownerHours += hours;
      } else {
        totals.employeeHours += hours;
        totals.laborCost += (w.laborCost !== undefined || w.labor_cost !== undefined)
          ? (parseFloat(w.laborCost ?? w.labor_cost) || 0)
          : hours * rate;
      }
    });
    return totals;
  },

  _enrichJobVisit(visit, jobs, clients) {
    let workers = visit.workers;
    if (typeof workers === 'string') {
      try { workers = JSON.parse(workers); } catch (e) { workers = []; }
    }
    if (!Array.isArray(workers)) workers = [];
    const job = jobs.find(j => Number(j.id) === Number(visit.jobId));
    const client = job ? clients.find(c => Number(c.id) === Number(job.clientId)) : null;
    return {
      ...visit,
      workers,
      jobTitle: job?.title || '',
      clientId: job?.clientId || null,
      clientName: client?.name || '',
      ...this._computeVisitTotals(workers)
    };
  },

  async _getJobContext() {
    const [jobsResult, clientsResult] = await Promise.all([
      this.getAll('jobs'),
      this.getAll('clients')
    ]);
    return {
      jobs: jobsResult.success ? jobsResult.data : [],
      clients: clientsResult.success ? clientsResult.data : []
    };
  },

  _enrichJobPayment(payment, jobs, clients) {
    const job = jobs.find(j => Number(j.id) === Number(payment.jobId));
    const client = job ? clients.find(c => Number(c.id) === Number(job.clientId)) : null;
    return {
      ...payment,
      jobTitle: job?.title || '',
      clientId: job?.clientId || null,
      clientName: client?.name || ''
    };
  },

  async getJobVisits() {
    const visitsResult = await this.getAll('job_visits');
    if (!visitsResult.success) return visitsResult;

    const { jobs, clients } = await this._getJobContext();

    visitsResult.data = visitsResult.data
      .map(visit => this._enrichJobVisit(visit, jobs, clients))
      .sort((a, b) => String(b.visitDate || '').localeCompare(String(a.visitDate || '')) || Number(b.id || 0) - Number(a.id || 0));

    return visitsResult;
  },

  async createJobVisit(data) {
    const payload = { ...data };
    if (Array.isArray(payload.workers)) {
      payload.workers = JSON.stringify(payload.workers);
    }
    const result = await this.insert('job_visits', payload);
    if (!result.success) return result;

    const visitId = result.data?.record?.id || result.data?.id;
    const refreshed = await this.getById('job_visits', visitId);
    const { jobs, clients } = await this._getJobContext();
    return {
      success: true,
      data: {
        record: this._enrichJobVisit(refreshed.data || {}, jobs, clients)
      }
    };
  },

  async updateJobVisit(id, data) {
    const payload = { ...data };
    if (Array.isArray(payload.workers)) {
      payload.workers = JSON.stringify(payload.workers);
    }
    const result = await this.update('job_visits', id, payload);
    if (!result.success) return result;

    const refreshed = await this.getById('job_visits', id);
    const { jobs, clients } = await this._getJobContext();
    return {
      success: true,
      data: {
        record: this._enrichJobVisit(refreshed.data || {}, jobs, clients)
      }
    };
  },

  async deleteJobVisit(id) {
    return await this.delete('job_visits', id);
  },

  // Job Payments (πληρωμές πελάτη)
  async getJobPayments() {
    const paymentsResult = await this.getAll('job_payments');
    if (!paymentsResult.success) return paymentsResult;

    const { jobs, clients } = await this._getJobContext();

    paymentsResult.data = paymentsResult.data
      .map(payment => this._enrichJobPayment(payment, jobs, clients))
      .sort((a, b) => String(b.paymentDate || '').localeCompare(String(a.paymentDate || '')) || Number(b.id || 0) - Number(a.id || 0));

    return paymentsResult;
  },

  async createJobPayment(data) {
    const result = await this.insert('job_payments', data);
    if (!result.success) return result;

    const paymentId = result.data?.record?.id || result.data?.id;
    const refreshed = await this.getById('job_payments', paymentId);
    const { jobs, clients } = await this._getJobContext();
    return {
      success: true,
      data: {
        record: this._enrichJobPayment(refreshed.data || {}, jobs, clients)
      }
    };
  },

  async updateJobPayment(id, data) {
    const result = await this.update('job_payments', id, data);
    if (!result.success) return result;

    const refreshed = await this.getById('job_payments', id);
    const { jobs, clients } = await this._getJobContext();
    return {
      success: true,
      data: {
        record: this._enrichJobPayment(refreshed.data || {}, jobs, clients)
      }
    };
  },

  async deleteJobPayment(id) {
    return await this.delete('job_payments', id);
  },

  // Workers
  async getWorkers() {
    return await this.getAll('workers');
  },

  async getWorker(id) {
    return await this.getById('workers', id);
  },

  async createWorker(data) {
    return await this.insert('workers', data);
  },

  async updateWorker(id, data) {
    return await this.update('workers', id, data);
  },

  async deleteWorker(id) {
    return await this.delete('workers', id);
  },

  // Materials
  async getMaterials() {
    return await this.getAll('materials');
  },

  async getMaterial(id) {
    return await this.getById('materials', id);
  },

  prepareMaterialData(data = {}) {
    if (typeof MaterialIdentity === 'undefined') {
      return data;
    }
    return MaterialIdentity.prepare(data);
  },

  async findMaterialDuplicate(data = {}, excludeId = null) {
    const materialsResult = await this.getMaterials();
    const materials = materialsResult.success ? materialsResult.data : [];
    if (typeof MaterialIdentity === 'undefined') return null;
    return MaterialIdentity.findDuplicate(materials, data, excludeId)
      || MaterialIdentity.findSimilar(materials, data, excludeId);
  },

  async resolveMaterialForItem(item = {}) {
    const materialId = Number(item.materialId || item.material_id || 0);
    if (materialId > 0) {
      const materialResult = await this.getById('materials', materialId);
      if (materialResult.success && materialResult.data) return materialResult.data;
    }

    const payload = this.prepareMaterialData({
      name: item.materialName || item.material_name || item.name,
      category: item.category || 'Άλλο',
      colorCode: item.colorCode || item.color_code || '',
      unit: item.unit || 'τμχ',
      unitPrice: item.unitPrice || item.unit_price || 0,
      stock: 0,
      minStock: 0
    });
    const duplicate = await this.findMaterialDuplicate(payload);
    if (duplicate) return duplicate;

    const created = await this.createMaterial(payload);
    return created.data?.record || created.data || created.record || created;
  },

  async createMaterial(data) {
    const payload = this.prepareMaterialData(data);
    const duplicate = await this.findMaterialDuplicate(payload);
    if (duplicate) {
      throw new Error(`Υπάρχει ήδη υλικό με ίδια κατηγορία και ταυτότητα: ${duplicate.name}`);
    }
    return await this.insert('materials', payload);
  },

  async updateMaterial(id, data) {
    const payload = this.prepareMaterialData(data);
    const duplicate = await this.findMaterialDuplicate(payload, id);
    if (duplicate) {
      throw new Error(`Υπάρχει ήδη υλικό με ίδια κατηγορία και ταυτότητα: ${duplicate.name}`);
    }
    return await this.update('materials', id, payload);
  },

  async deleteMaterial(id) {
    return await this.delete('materials', id);
  },

  async getMaterialDuplicateGroups() {
    const materialsResult = await this.getMaterials();
    if (!materialsResult.success) return materialsResult;

    const groupsByKey = new Map();
    for (const material of materialsResult.data || []) {
      const key = material.canonicalKey || material.canonical_key || MaterialIdentity.buildKey(material);
      if (!key) continue;
      if (!groupsByKey.has(key)) groupsByKey.set(key, []);
      groupsByKey.get(key).push(material);
    }

    const groups = [...groupsByKey.entries()]
      .filter(([, materials]) => materials.length > 1)
      .map(([canonicalKey, materials]) => ({
        canonicalKey,
        materials: materials.sort((a, b) => Number(a.id) - Number(b.id))
      }));

    return { success: true, data: groups };
  },

  async mergeMaterialDuplicates(primaryId, duplicateIds = []) {
    const primaryResult = await this.getMaterial(primaryId);
    if (!primaryResult.success || !primaryResult.data) {
      return { success: false, message: 'Το primary υλικό δεν βρέθηκε' };
    }

    const primary = primaryResult.data;
    const duplicates = [];
    for (const duplicateId of duplicateIds) {
      const result = await this.getMaterial(duplicateId);
      if (result.success && result.data && Number(result.data.id) !== Number(primaryId)) {
        duplicates.push(result.data);
      }
    }

    if (!duplicates.length) {
      return { success: false, message: 'Δεν επιλέχθηκαν διπλά υλικά' };
    }

    const primaryKey = primary.canonicalKey || primary.canonical_key || MaterialIdentity.buildKey(primary);
    if (duplicates.some(material => (material.canonicalKey || material.canonical_key || MaterialIdentity.buildKey(material)) !== primaryKey)) {
      return { success: false, message: 'Τα υλικά δεν ανήκουν στο ίδιο duplicate group' };
    }

    const duplicateIdSet = new Set(duplicates.map(material => Number(material.id)));
    const totalStock = [primary, ...duplicates].reduce((sum, material) => sum + (parseFloat(material.stock) || 0), 0);
    const maxMinStock = Math.max(...[primary, ...duplicates].map(material => parseFloat(material.minStock || material.min_stock || 0) || 0));
    const unitPrice = parseFloat(primary.unitPrice || primary.unit_price || 0)
      || duplicates.map(material => parseFloat(material.unitPrice || material.unit_price || 0) || 0).find(value => value > 0)
      || 0;

    const [itemsResult, movementsResult, jobsResult] = await Promise.all([
      this.getAll('material_purchase_items'),
      this.getAll('material_stock_movements'),
      this.getAll('jobs')
    ]);

    for (const item of itemsResult.success ? itemsResult.data : []) {
      if (duplicateIdSet.has(Number(item.materialId || item.material_id))) {
        await this.update('material_purchase_items', item.id, {
          ...item,
          materialId: primary.id,
          materialName: primary.name
        });
      }
    }

    for (const movement of movementsResult.success ? movementsResult.data : []) {
      if (duplicateIdSet.has(Number(movement.materialId || movement.material_id))) {
        await this.update('material_stock_movements', movement.id, {
          ...movement,
          materialId: primary.id
        });
      }
    }

    let updatedJobs = 0;
    for (const job of jobsResult.success ? jobsResult.data : []) {
      const paints = Array.isArray(job.paints) ? job.paints : [];
      let changed = false;
      const nextPaints = paints.map(paint => {
        const materialId = Number(paint.materialId || paint.material_id || 0);
        if (!duplicateIdSet.has(materialId)) return paint;
        changed = true;
        return {
          ...paint,
          materialId: primary.id,
          material_id: undefined,
          name: primary.name,
          category: primary.category,
          code: primary.colorCode || primary.color_code || paint.code,
          colorCode: primary.colorCode || primary.color_code || paint.colorCode,
          unit: primary.unit || paint.unit
        };
      }).map(paint => {
        const cleaned = { ...paint };
        delete cleaned.material_id;
        return cleaned;
      });

      if (changed) {
        updatedJobs++;
        await this.update('jobs', job.id, {
          ...job,
          paints: nextPaints
        });
      }
    }

    await this.update('materials', primary.id, this.prepareMaterialData({
      ...primary,
      stock: totalStock,
      minStock: maxMinStock,
      unitPrice
    }));

    for (const duplicate of duplicates) {
      await this.deleteMaterial(duplicate.id);
    }

    const refreshed = await this.getMaterial(primary.id);
    return {
      success: true,
      data: {
        primary: refreshed.data,
        mergedIds: duplicates.map(material => material.id),
        updatedJobs
      }
    };
  },

  async getMaterialStockMovements() {
    const movementsResult = await this.getAll('material_stock_movements');
    if (!movementsResult.success) return movementsResult;

    const materialsResult = await this.getAll('materials');
    const materials = materialsResult.success ? materialsResult.data : [];

    movementsResult.data = movementsResult.data
      .map(movement => {
        const material = materials.find(item => Number(item.id) === Number(movement.materialId));
        return {
          ...movement,
          materialName: material?.name || '',
          materialCategory: material?.category || ''
        };
      })
      .sort((a, b) => String(b.movementDate || '').localeCompare(String(a.movementDate || '')) || Number(b.id || 0) - Number(a.id || 0));

    return movementsResult;
  },

  async createMaterialStockMovement(data) {
    const materialId = Number(data.materialId || data.material_id || 0);
    const materialResult = await this.getById('materials', materialId);
    if (!materialResult.success || !materialResult.data) {
      return { success: false, message: 'Το υλικό δεν βρέθηκε' };
    }

    const material = materialResult.data;
    const movementType = data.movementType || data.movement_type || 'add';
    const quantity = parseFloat(data.quantity) || 0;
    if (quantity <= 0) {
      return { success: false, message: 'Η ποσότητα πρέπει να είναι μεγαλύτερη από 0' };
    }

    const previousStock = parseFloat(material.stock) || 0;
    let quantityDelta = quantity;
    if (movementType === 'remove') {
      quantityDelta = -quantity;
    } else if (movementType === 'adjust') {
      quantityDelta = quantity - previousStock;
    }
    const newStock = Math.max(0, previousStock + quantityDelta);

    await this.update('materials', materialId, {
      ...material,
      stock: newStock
    });

    const movementResult = await this.insert('material_stock_movements', {
      materialId,
      movementDate: data.movementDate || data.movement_date || new Date().toISOString().slice(0, 10),
      movementType,
      quantity: newStock - previousStock,
      previousStock,
      newStock,
      unit: data.unit || material.unit || 'λίτρα',
      referenceType: data.referenceType || data.reference_type || 'manual',
      referenceId: data.referenceId || data.reference_id || null,
      notes: data.notes || ''
    });

    if (!movementResult.success) return movementResult;

    const refreshedMaterial = await this.getById('materials', materialId);
    const movementId = movementResult.data?.record?.id || movementResult.data?.id;
    const refreshedMovement = await this.getById('material_stock_movements', movementId);

    return {
      success: true,
      data: {
        movement: {
          ...(refreshedMovement.data || {}),
          materialName: refreshedMaterial.data?.name || material.name || '',
          materialCategory: refreshedMaterial.data?.category || material.category || ''
        },
        material: refreshedMaterial.data
      }
    };
  },

  // Suppliers
  async getSuppliers() {
    return await this.getAll('suppliers');
  },

  async getSupplier(id) {
    return await this.getById('suppliers', id);
  },

  async createSupplier(data) {
    return await this.insert('suppliers', data);
  },

  async updateSupplier(id, data) {
    return await this.update('suppliers', id, data);
  },

  async deleteSupplier(id) {
    return await this.delete('suppliers', id);
  },

  // Material Purchases
  async getMaterialPurchases() {
    const purchasesResult = await this.getAll('material_purchases');
    if (!purchasesResult.success) return purchasesResult;

    const [itemsResult, paymentsResult, suppliersResult] = await Promise.all([
      this.getAll('material_purchase_items'),
      this.getAll('supplier_payments'),
      this.getAll('suppliers')
    ]);

    const items = itemsResult.success ? itemsResult.data : [];
    const payments = paymentsResult.success ? paymentsResult.data : [];
    const suppliers = suppliersResult.success ? suppliersResult.data : [];

    purchasesResult.data = purchasesResult.data.map(purchase => {
      const purchaseItems = items.filter(item => Number(item.purchaseId) === Number(purchase.id));
      const paidAmount = payments
        .filter(payment => Number(payment.purchaseId) === Number(purchase.id))
        .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
      const supplier = suppliers.find(s => Number(s.id) === Number(purchase.supplierId));
      const totalCost = parseFloat(purchase.totalCost) || 0;
      return {
        ...purchase,
        supplierName: supplier?.name || '',
        items: purchaseItems,
        paidAmount,
        balance: totalCost - paidAmount
      };
    });

    return purchasesResult;
  },

  async getMaterialPurchase(id) {
    const purchaseResult = await this.getById('material_purchases', id);
    if (!purchaseResult.success && !purchaseResult.data) return purchaseResult;

    const purchase = purchaseResult.data || purchaseResult;
    const [itemsResult, paymentsResult, suppliersResult] = await Promise.all([
      this.getAll('material_purchase_items'),
      this.getAll('supplier_payments'),
      this.getAll('suppliers')
    ]);

    const items = itemsResult.success ? itemsResult.data.filter(item => Number(item.purchaseId) === Number(id)) : [];
    const payments = paymentsResult.success ? paymentsResult.data : [];
    const suppliers = suppliersResult.success ? suppliersResult.data : [];
    const paidAmount = payments
      .filter(payment => Number(payment.purchaseId) === Number(id))
      .reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
    const supplier = suppliers.find(s => Number(s.id) === Number(purchase.supplierId));
    const totalCost = parseFloat(purchase.totalCost) || 0;

    return {
      success: true,
      data: {
        ...purchase,
        supplierName: supplier?.name || '',
        items,
        paidAmount,
        balance: totalCost - paidAmount
      }
    };
  },

  async createMaterialPurchase(data) {
    const items = Array.isArray(data.items) ? data.items : [];
    const itemsTotal = items.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice || item.unit_price) || 0;
      return sum + (parseFloat(item.totalCost || item.total_cost) || (quantity * unitPrice));
    }, 0);
    const totalCost = parseFloat(data.totalCost || data.total_cost || 0) || itemsTotal;

    const purchaseResult = await this.insert('material_purchases', {
      supplierId: data.supplierId,
      purchaseDate: data.purchaseDate,
      referenceNumber: data.referenceNumber || '',
      notes: data.notes,
      totalCost
    });

    if (!purchaseResult.success) return purchaseResult;

    const purchaseId = purchaseResult.data?.record?.id || purchaseResult.data?.id;
    for (const item of items) {
      const material = await this.resolveMaterialForItem(item);
      await this.insert('material_purchase_items', {
        purchaseId,
        materialId: material?.id || item.materialId || null,
        materialName: item.materialName || material?.name || '',
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        totalCost: item.totalCost,
        notes: item.notes || ''
      });

      if (material?.id) {
        await this.createMaterialStockMovement({
          materialId: material.id,
          movementType: 'add',
          quantity: item.quantity,
          movementDate: data.purchaseDate,
          unit: item.unit || material.unit,
          referenceType: 'purchase',
          referenceId: purchaseId,
          notes: 'Αγορά από προμηθευτή'
        });
      }
    }

    const initialPayment = data.initialPayment || data.initial_payment || {};
    const paymentStatus = initialPayment.status || 'none';
    const paymentAmount = paymentStatus === 'full'
      ? totalCost
      : (paymentStatus === 'partial' ? parseFloat(initialPayment.amount || 0) || 0 : 0);

    if (paymentAmount > 0 && paymentAmount <= totalCost) {
      await this.insert('supplier_payments', {
        supplierId: data.supplierId,
        purchaseId,
        paymentDate: data.purchaseDate,
        amount: paymentAmount,
        paymentMethod: initialPayment.paymentMethod || initialPayment.payment_method || '',
        notes: initialPayment.notes || ''
      });
    }

    const refreshed = await this.getMaterialPurchase(purchaseId);
    return {
      success: true,
      data: {
        record: refreshed.data || refreshed
      }
    };
  },

  async updateMaterialPurchase(id, data) {
    return await this.update('material_purchases', id, data);
  },

  async deleteMaterialPurchase(id) {
    return await this.delete('material_purchases', id);
  },

  // Supplier Payments
  async getSupplierPayments() {
    return await this.getAll('supplier_payments');
  },

  async getSupplierPayment(id) {
    return await this.getById('supplier_payments', id);
  },

  async createSupplierPayment(data) {
    return await this.insert('supplier_payments', data);
  },

  async updateSupplierPayment(id, data) {
    return await this.update('supplier_payments', id, data);
  },

  async deleteSupplierPayment(id) {
    return await this.delete('supplier_payments', id);
  },

  // Invoices
  async getInvoices() {
    return await this.getAll('invoices');
  },

  async getInvoice(id) {
    return await this.getById('invoices', id);
  },

  async createInvoice(data) {
    return await this.insert('invoices', data);
  },

  async updateInvoice(id, data) {
    return await this.update('invoices', id, data);
  },

  async deleteInvoice(id) {
    return await this.delete('invoices', id);
  },

  // Offers
  async getOffers() {
    return await this.getAll('offers');
  },

  async getOffer(id) {
    return await this.getById('offers', id);
  },

  async createOffer(data) {
    return await this.insert('offers', data);
  },

  async updateOffer(id, data) {
    return await this.update('offers', id, data);
  },

  async deleteOffer(id) {
    return await this.delete('offers', id);
  },

  // Templates
  async getTemplates() {
    return await this.getAll('templates');
  },

  async getTemplate(id) {
    return await this.getById('templates', id);
  },

  async createTemplate(data) {
    return await this.insert('templates', data);
  },

  async updateTemplate(id, data) {
    return await this.update('templates', id, data);
  },

  async deleteTemplate(id) {
    return await this.delete('templates', id);
  },

  // Settings
  async getSettings() {
    return await this.getAll('settings');
  },

  async getSetting(key) {
    // Get all settings and find by key
    const result = await this.getAll('settings');
    if (result.success && result.data) {
      return {
        success: true,
        data: result.data.find(s => s.settingKey === key)
      };
    }
    return result;
  },

  async saveSetting(key, value) {
    // Get all settings to find if it exists
    const allSettings = await this.getAll('settings');
    if (allSettings.success && allSettings.data) {
      const existing = allSettings.data.find(s => s.settingKey === key);
      if (existing) {
        return await this.update('settings', existing.id, { settingKey: key, settingValue: value });
      }
    }
    return await this.insert('settings', { settingKey: key, settingValue: value });
  }
};
