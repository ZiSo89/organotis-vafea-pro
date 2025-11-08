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
   * Loads data from storage and sets up auto-save
   */
  async init() {
    this.data = await Storage.load();
    this.setupAutoSave();
    this.detectOffline();
    console.log('✅ State initialized with data:', this.data);
  },

  // Auto-save κάθε 30 δευτερόλεπτα
  setupAutoSave() {
    setInterval(() => {
      const saved = Storage.save();
      if (saved) {
        this.showAutoSaveIndicator();
      }
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

  // Offline Detection
  detectOffline() {
    const updateStatus = () => {
      const indicator = document.getElementById('offlineIndicator');
      if (indicator) {
        if (!navigator.onLine) {
          indicator.classList.remove('hidden');
        } else {
          indicator.classList.add('hidden');
        }
      }
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
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
    Storage.save();
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
  create(collection, item) {
    // Add createdAt timestamp if not exists
    if (!item.createdAt) {
      item.createdAt = new Date().toISOString();
    }
    this.data[collection].push(item);
    this.saveToHistory(`Προσθήκη ${collection}`, this.data);
    Storage.save();
    // Toast removed - let the calling view handle user feedback
    
    // Refresh Dashboard if we're on it
    this.refreshDashboardIfNeeded();
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
      return this.data[collection].find(item => item.id === id);
    }
    return this.data[collection];
  },

  /**
   * Update existing item in collection
   * @param {string} collection - Collection name
   * @param {string} id - Item ID to update
   * @param {Object} updatedItem - New item data
   */
  update(collection, id, updatedItem) {
    const index = this.data[collection].findIndex(item => item.id === id);
    if (index !== -1) {
      this.data[collection][index] = updatedItem;
      this.saveToHistory(`Ενημέρωση ${collection}`, this.data);
      Storage.save();
      // Toast removed - let the calling view handle user feedback
      
      // Refresh Dashboard if we're on it
      this.refreshDashboardIfNeeded();
    }
  },

  /**
   * Delete item from collection
   * @param {string} collection - Collection name
   * @param {string} id - Item ID to delete
   */
  delete(collection, id) {
    const index = this.data[collection].findIndex(item => item.id === id);
    if (index !== -1) {
      this.data[collection].splice(index, 1);
      this.saveToHistory(`Διαγραφή ${collection}`, this.data);
      Storage.save();
      // Toast removed - let the calling view handle user feedback
      
      // Refresh Dashboard if we're on it
      this.refreshDashboardIfNeeded();
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
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        return Object.values(item).some(value => 
          String(value).toLowerCase().includes(query)
        );
      });
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
      console.log('🔄 Refreshing Dashboard...');
      window.DashboardView.render();
    }
  }
};
