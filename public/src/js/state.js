/* ========================================
   State Management - Κατάσταση Εφαρμογής
   ======================================== */

/**
 * Global application state manager
 * Handles CRUD operations, history, search, filters, and persistence
 * @namespace State
 */
const State = {
  // Current Data
  data: null,
  
  // Current Section
  currentSection: 'dashboard',
  
  // History για Undo/Redo
  history: [],
  historyIndex: -1,
  
  // Search & Filters
  searchQuery: '',
  filters: {},
  
  // Pagination
  currentPage: 1,
  pageSize: CONFIG.DEFAULT_PAGE_SIZE,
  
  // Selected Items (για bulk actions)
  selectedItems: new Set(),
  
  /**
   * Initialize application state
   * Loads data from API and sets up auto-save
   */
  emptyData() {
    return {
      clients: [],
      workers: [],
      inventory: [],
      materialStockMovements: [],
      suppliers: [],
      materialPurchases: [],
      supplierPayments: [],
      jobs: [],
      jobPayments: [],
      offers: [],
      invoices: [],
      templates: [],
      timesheets: [],
    };
  },

  async init() {
    // Never let a data-load failure crash the whole app (white screen).
    // We always end up with a valid (possibly empty) data structure so the
    // UI can render, and surface a non-blocking error + retry instead.
    this.loadHadErrors = false;
    try {
      const isElectron = typeof window.electronAPI !== 'undefined';

      if (isElectron) {
        this.data = await this.loadFromSQLite();
      } else {
        this.data = await this.loadFromAPI();
      }
    } catch (error) {
      console.error('❌ Failed to load data:', error);
      this.loadHadErrors = true;
      this.data = this.emptyData();
    }

    if (!this.data) {
      this.data = this.emptyData();
    }

    if (this.loadHadErrors) {
      Toast.error('Μερικά δεδομένα δεν φορτώθηκαν. Πατήστε ανανέωση για επανάληψη.');
    }

    // Setup auto-save (every 30 seconds - but now it's just for indicators)
    this.setupAutoSave();
  },

  /** Reload all data and re-render the current view. Used for manual retry. */
  async reload() {
    try {
      const isElectron = typeof window.electronAPI !== 'undefined';
      this.loadHadErrors = false;
      this.data = isElectron ? await this.loadFromSQLite() : await this.loadFromAPI();
      if (!this.data) this.data = this.emptyData();
      if (typeof Router !== 'undefined' && Router.reload) {
        Router.reload();
      }
      if (!this.loadHadErrors) {
        Toast.success('Τα δεδομένα ανανεώθηκαν');
      }
    } catch (error) {
      console.error('❌ Reload failed:', error);
      Toast.error('Αποτυχία ανανέωσης δεδομένων');
    }
  },

  /**
   * Load all data from SQLite (Electron)
   */
  async loadFromSQLite() {
    try {
      console.log('📥 [State] Loading data from SQLite...');
      
      // Use OfflineService directly in Electron (already extracts data properly)
      const [clients, workers, materials, materialStockMovements, suppliers, materialPurchases, supplierPayments, jobs, jobPayments, offers, invoices, templates] = await Promise.all([
        window.OfflineService.getClients(),
        window.OfflineService.getWorkers(),
        window.OfflineService.getMaterials(),
        window.OfflineService.getMaterialStockMovements(),
        window.OfflineService.getSuppliers(),
        window.OfflineService.getMaterialPurchases(),
        window.OfflineService.getSupplierPayments(),
        window.OfflineService.getJobs(),
        window.OfflineService.getJobPayments(),
        window.OfflineService.getOffers(),
        window.OfflineService.getInvoices(),
        window.OfflineService.getTemplates(),
      ]);

      console.log('📦 [State] Raw responses:', { clients, workers, materials, materialStockMovements, suppliers, materialPurchases, supplierPayments, jobs, jobPayments, offers, invoices, templates });
      console.log('📦 [State] jobs response:', jobs);
      console.log('📦 [State] jobs.data type:', typeof jobs?.data, 'isArray:', Array.isArray(jobs?.data));

      const extractData = (response, fallback = []) => DataMappers.extractCollection(response, fallback);

      const stateData = {
        clients: extractData(clients, []),
        workers: extractData(workers, []),
        inventory: extractData(materials, []), // materials -> inventory
        materialStockMovements: extractData(materialStockMovements, []),
        suppliers: extractData(suppliers, []),
        materialPurchases: extractData(materialPurchases, []),
        supplierPayments: extractData(supplierPayments, []),
        jobs: extractData(jobs, []),
        jobPayments: extractData(jobPayments, []),
        offers: extractData(offers, []),
        invoices: extractData(invoices, []),
        templates: extractData(templates, []),
        timesheets: [],
      };

      console.log('✅ Data loaded from SQLite via OfflineService');
      console.log('📊 [State] Final state.data:', stateData);
      console.log('📊 [State] state.data.jobs type:', typeof stateData.jobs, 'isArray:', Array.isArray(stateData.jobs), 'length:', stateData.jobs?.length);

      return stateData;
    } catch (error) {
      console.error('Error loading from SQLite:', error);
      
      // Return empty data structure on error
      return {
        clients: [],
        workers: [],
        inventory: [],
        materialStockMovements: [],
        suppliers: [],
        materialPurchases: [],
        supplierPayments: [],
        jobs: [],
        jobPayments: [],
        offers: [],
        invoices: [],
        templates: [],
        timesheets: [],
      };
    }
  },

  /**
   * Load all data from API
   */
  async loadFromAPI() {
    // Use allSettled so a single failed/slow endpoint (common on PWA cold-start)
    // doesn't blow away the entire load and leave the user with a white screen.
    const calls = [
      ['clients', () => API.getClients()],
      ['workers', () => API.getWorkers()],
      ['inventory', () => API.getMaterials()],
      ['materialStockMovements', () => API.getMaterialStockMovements()],
      ['suppliers', () => API.getSuppliers()],
      ['materialPurchases', () => API.getMaterialPurchases()],
      ['supplierPayments', () => API.getSupplierPayments()],
      ['jobs', () => API.getJobs()],
      ['jobPayments', () => API.getJobPayments()],
      ['offers', () => API.getOffers()],
      ['invoices', () => API.getInvoices()],
      ['templates', () => API.getTemplates()],
    ];

    const settled = await Promise.allSettled(calls.map(([, fn]) => fn()));
    const result = this.emptyData();
    const failedKeys = [];

    settled.forEach((outcome, index) => {
      const key = calls[index][0];
      if (outcome.status === 'fulfilled') {
        result[key] = DataMappers.extractCollection(outcome.value, []);
      } else {
        failedKeys.push(key);
        console.error(`[State] API load failed for "${key}":`, outcome.reason);
      }
    });

    if (failedKeys.length) {
      this.loadHadErrors = true;
      console.warn('[State] Some collections failed to load:', failedKeys);
    }

    return result;
  },

  // Auto-save κάθε 30 δευτερόλεπτα
  setupAutoSave() {
    // Since we use API, auto-save indicator shows after successful API calls
    // This is just for keeping the interval running (can be used later)
    setInterval(() => {
      // Auto-save is handled by API calls in create/update/delete methods
      // This interval can be used for background sync if needed
    }, CONFIG.AUTO_SAVE_INTERVAL);
  },

  // Ένδειξη auto-save
  showAutoSaveIndicator() {
    const indicator = document.getElementById('autoSaveIndicator');
    if (indicator) {
      indicator.classList.remove('saving');
      indicator.classList.add('saved');
      
      setTimeout(() => {
        indicator.classList.remove('saved');
      }, 2000);
    }
  },

  // History Management για Undo/Redo
  saveToHistory(action, data) {
    // Αφαίρεσε future history αν είμαστε στη μέση
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    // Πρόσθεσε νέα ενέργεια
    this.history.push({
      action,
      data: JSON.parse(JSON.stringify(data)), // Deep clone
      timestamp: Date.now()
    });

    // Κράτα μόνο τις τελευταίες X ενέργειες
    if (this.history.length > CONFIG.MAX_HISTORY) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }

    this.updateUndoRedoButtons();
  },

  // Undo
  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const entry = this.history[this.historyIndex];
      this.restoreState(entry);
      this.updateUndoRedoButtons();
      Toast.info('Αναίρεση: ' + entry.action);
    }
  },

  // Redo
  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const entry = this.history[this.historyIndex];
      this.restoreState(entry);
      this.updateUndoRedoButtons();
      Toast.info('Επαναφορά: ' + entry.action);
    }
  },

  // Restore State
  restoreState(entry) {
    // Ανάλογα με την ενέργεια, επαναφέρουμε την κατάσταση
    Object.assign(this.data, entry.data);
    // Refresh την τρέχουσα σελίδα
    Router.navigate(this.currentSection);
  },

  // Update Undo/Redo Buttons
  updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');

    if (undoBtn) {
      undoBtn.disabled = this.historyIndex <= 0;
    }
    if (redoBtn) {
      redoBtn.disabled = this.historyIndex >= this.history.length - 1;
    }
  },

  // CRUD Operations με History

  /**
   * Create new item in collection
   * @param {string} collection - Collection name (e.g., 'clients', 'jobs')
   * @param {Object} item - Item data to create
   */
  async create(collection, item) {
    try {
      // Add createdAt timestamp if not exists
      if (!item.createdAt) {
        item.createdAt = new Date().toISOString();
      }

      // Check if running in Electron
      const isElectron = typeof window.electronAPI !== 'undefined';
      
      // Map collection names to API methods
      const apiCollection = collection === 'inventory' ? 'materials' : collection;
      const apiMethodMap = {
        clients: 'createClient',
        workers: 'createWorker',
        materials: 'createMaterial',
        materialStockMovements: 'createMaterialStockMovement',
        suppliers: 'createSupplier',
        materialPurchases: 'createMaterialPurchase',
        supplierPayments: 'createSupplierPayment',
        jobs: 'createJob',
        jobPayments: 'createJobPayment',
        offers: 'createOffer',
        invoices: 'createInvoice',
        templates: 'createTemplate',
      };

      const method = apiMethodMap[apiCollection];
      if (!method) {
        throw new Error(`Unknown collection: ${collection}`);
      }

      // Call appropriate service
      const service = isElectron ? window.OfflineService : API;
      console.log('[State] Creating item via', isElectron ? 'OfflineService' : 'API');
      const result = await service[method](item);
      console.log('[State] Create result:', result);
      
      const createdItem = DataMappers.extractRecord(result, result);
      
      console.log('[State] Created item:', createdItem);
      
      // Update local state
      if (collection === 'materialStockMovements' && createdItem?.movement) {
        this.data.materialStockMovements.unshift(createdItem.movement);
        const materialIndex = this.data.inventory.findIndex(item => Number(item.id) === Number(createdItem.material?.id));
        if (materialIndex !== -1) {
          this.data.inventory[materialIndex] = createdItem.material;
        }
      } else {
        this.data[collection].push(createdItem);
      }
      this.saveToHistory(`Προσθήκη ${collection}`, this.data);
      
      // Refresh Dashboard if needed
      this.refreshDashboardIfNeeded();
      if (collection === 'jobs') {
        this.refreshWorkersIfNeeded();
      }
      
      return createdItem;
    } catch (error) {
      console.error(`Error creating ${collection}:`, error);
      Toast.error('Σφάλμα κατά την αποθήκευση');
      throw error;
    }
  },

  /**
   * Read item(s) from collection
   * @param {string} collection - Collection name
   * @param {string} [id] - Optional item ID. If omitted, returns all items
   * @returns {Object|Array|null} Single item, array of items, or null
   */
  read(collection, id = null) {
    if (!this.data) {
      console.error('❌ State.data is null!');
      return id ? null : [];
    }
    if (!this.data[collection]) {
      console.error(`❌ Collection '${collection}' not found in State.data`);
      return id ? null : [];
    }
    if (id) {
      // Convert both to numbers for comparison (API returns numeric IDs)
      return this.data[collection].find(item => Number(item.id) === Number(id));
    }
    return this.data[collection];
  },

  /**
   * Update existing item in collection
   * @param {string} collection - Collection name
   * @param {string} id - Item ID to update
   * @param {Object} updatedItem - New item data
   */
  async update(collection, id, updatedItem) {
    try {
      // Check if running in Electron
      const isElectron = typeof window.electronAPI !== 'undefined';
      
      // Map collection names to API methods
      const apiCollection = collection === 'inventory' ? 'materials' : collection;
      const apiMethodMap = {
        clients: 'updateClient',
        workers: 'updateWorker',
        materials: 'updateMaterial',
        suppliers: 'updateSupplier',
        materialPurchases: 'updateMaterialPurchase',
        supplierPayments: 'updateSupplierPayment',
        jobs: 'updateJob',
        jobPayments: 'updateJobPayment',
        offers: 'updateOffer',
        invoices: 'updateInvoice',
        templates: 'updateTemplate',
      };

      const method = apiMethodMap[apiCollection];
      if (!method) {
        throw new Error(`Unknown collection: ${collection}`);
      }

      // Call appropriate service
      const service = isElectron ? window.OfflineService : API;
      console.log('[State] Updating item via', isElectron ? 'OfflineService' : 'API');
      const result = await service[method](id, updatedItem);
      console.log('[State] Update result:', result);
      
      const updated = DataMappers.extractRecord(result, result);
      
      console.log('[State] Updated item:', updated);
      
      // Update local state
      const index = this.data[collection].findIndex(item => Number(item.id) === Number(id));
      if (index !== -1) {
        this.data[collection][index] = updated;
        this.saveToHistory(`Ενημέρωση ${collection}`, this.data);
        this.refreshDashboardIfNeeded();
        if (collection === 'jobs') {
          this.refreshWorkersIfNeeded();
        }
      }
      
      return updated;
    } catch (error) {
      console.error(`❌ Error updating ${collection}:`, error);
      Toast.error('Σφάλμα κατά την ενημέρωση');
      throw error;
    }
  },

  /**
   * Delete item from collection
   * @param {string} collection - Collection name
   * @param {string} id - Item ID to delete
   */
  async delete(collection, id) {
    try {
      console.log(`[State] Deleting ${collection} id:`, id);
      
      // Check if running in Electron
      const isElectron = typeof window.electronAPI !== 'undefined';
      
      // Map collection names to API methods
      const apiCollection = collection === 'inventory' ? 'materials' : collection;
      const apiMethodMap = {
        clients: 'deleteClient',
        workers: 'deleteWorker',
        materials: 'deleteMaterial',
        suppliers: 'deleteSupplier',
        materialPurchases: 'deleteMaterialPurchase',
        supplierPayments: 'deleteSupplierPayment',
        jobs: 'deleteJob',
        jobPayments: 'deleteJobPayment',
        offers: 'deleteOffer',
        invoices: 'deleteInvoice',
        templates: 'deleteTemplate',
      };

      const method = apiMethodMap[apiCollection];
      if (!method) {
        throw new Error(`Unknown collection: ${collection}`);
      }

      // Call appropriate service
      const service = isElectron ? window.OfflineService : API;
      await service[method](id);
      
      console.log(`[State] Delete successful, updating local state`);

      let stateChanged = false;

      if (collection === 'jobs') {
        const matchesDeletedJob = (record) => Number(record.jobId || record.job_id) === Number(id);
        ['jobPayments'].forEach((linkedCollection) => {
          if (!Array.isArray(this.data[linkedCollection])) return;
          const before = this.data[linkedCollection].length;
          this.data[linkedCollection] = this.data[linkedCollection].filter(record => !matchesDeletedJob(record));
          if (this.data[linkedCollection].length !== before) {
            stateChanged = true;
            console.log(`[State] Removed ${before - this.data[linkedCollection].length} linked ${linkedCollection}`);
          }
        });
      }

      // Update local state - remove the item from array
      const index = this.data[collection].findIndex(item => Number(item.id) === Number(id));
      if (index !== -1) {
        console.log(`[State] Removing item at index ${index} from ${collection}`);
        this.data[collection].splice(index, 1);
        stateChanged = true;
      } else {
        console.warn(`[State] Item with id ${id} not found in ${collection}`);
      }

      if (stateChanged) {
        this.saveToHistory(`Διαγραφή ${collection}`, this.data);
        this.refreshDashboardIfNeeded();
        if (collection === 'jobs') {
          this.refreshWorkersIfNeeded();
        }
      }
      
      return true;
    } catch (error) {
      console.error(`❌ Error deleting ${collection}:`, error);
      Toast.error('Σφάλμα κατά τη διαγραφή');
      throw error;
    }
  },

  // TODO: Future feature - Bulk operations
  // bulkDelete(collection, ids) {
  //   ids.forEach(id => {
  //     const index = this.data[collection].findIndex(item => item.id === id);
  //     if (index !== -1) {
  //       this.data[collection].splice(index, 1);
  //     }
  //   });
  //   this.saveToHistory(`Μαζική διαγραφή ${ids.length} ${collection}`, this.data);
  //   Storage.save();
  //   Toast.success(`Διαγράφηκαν ${ids.length} εγγραφές`);
  //   this.selectedItems.clear();
  // },

  // TODO: Future feature - Duplicate items
  // duplicate(collection, id) {
  //   const item = this.read(collection, id);
  //   if (item) {
  //     const copy = JSON.parse(JSON.stringify(item));
  //     
  //     // Δημιούργησε νέο ID
  //     const prefix = id.match(/^[Α-ΩΠΕΤα-ω]+-/)?.[0] || '';
  //     const maxNum = Math.max(
  //       ...this.data[collection]
  //         .map(i => parseInt(i.id.replace(prefix, '')) || 0)
  //     );
  //     copy.id = `${prefix}${String(maxNum + 1).padStart(4, '0')}`;
  //     
  //     this.create(collection, copy);
  //     return copy;
  //   }
  // },

  // Search & Filter
  applyFilters(collection, items) {
    let filtered = [...items];

    // Search
    if (this.searchQuery) {
      filtered = filtered.filter(item =>
        Utils.matchesSearch(Object.values(item), this.searchQuery)
      );
    }

    // Filters
    Object.keys(this.filters).forEach(key => {
      const filterValue = this.filters[key];
      if (filterValue) {
        filtered = filtered.filter(item => item[key] === filterValue);
      }
    });

    return filtered;
  },

  // Pagination
  paginate(items) {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return items.slice(start, end);
  },

  // Get total pages
  getTotalPages(totalItems) {
    return Math.ceil(totalItems / this.pageSize);
  },

  // Refresh Dashboard if currently viewing it
  refreshDashboardIfNeeded() {
    if (this.currentSection === 'dashboard' && window.DashboardView) {
      const container = document.getElementById('main-content');
      if (container) {
        window.DashboardView.render(container);
      }
    }
  },

  refreshCalendarIfNeeded() {
    if (this.currentSection === 'calendar' && window.CalendarView && window.CalendarView.calendar) {
      window.CalendarView.calendar.refetchEvents();
      if (window.CalendarView.loadUpcomingVisits) {
        window.CalendarView.loadUpcomingVisits().catch(() => {});
      }
    }
  },

  refreshJobsIfNeeded() {
    if (this.currentSection === 'jobs' && window.JobsView && window.JobsView.refreshTable) {
      window.JobsView.refreshTable();
    }
  },

  refreshWorkersIfNeeded() {
    if (this.currentSection === 'workers' && window.WorkersView && window.WorkersView.refreshTable) {
      window.WorkersView.refreshTable();
    }
  },

  /**
   * Reload all data from SQLite/API
   * Useful after sync operations
   */
  async loadAll() {
    try {
      console.log('🔄 [State] Reloading all data...');
      
      // Check if running in Electron
      const isElectron = typeof window.electronAPI !== 'undefined';
      
      if (isElectron) {
        // Reload from SQLite in Electron
        this.data = await this.loadFromSQLite();
      } else {
        // Reload from API in web version
        this.data = await this.loadFromAPI();
      }
      
      console.log('✅ [State] Data reloaded successfully');
      console.log('📊 [State] New data:', this.data);
      
      return this.data;
    } catch (error) {
      console.error('❌ [State] Failed to reload data:', error);
      throw error;
    }
  }
};
