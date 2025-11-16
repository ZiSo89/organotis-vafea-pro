/* ========================================
   Base View Class - Κοινή λογική για όλα τα views
   ======================================== */

/**
 * BaseView - Abstract base class για όλα τα views
 * Παρέχει κοινή λογική για event handling, cleanup, και rendering
 */
class BaseView {
  constructor(viewName) {
    this.viewName = viewName;
    this.eventListeners = new Map(); // Track all event listeners for cleanup
    this.delegatedListeners = new Map(); // Track delegated listeners
  }

  /**
   * Render method - πρέπει να υλοποιηθεί από κάθε view
   */
  render(container) {
    throw new Error(`${this.viewName}: render() must be implemented`);
  }

  /**
   * Setup event listeners - πρέπει να υλοποιηθεί από κάθε view
   */
  setupEventListeners() {
    throw new Error(`${this.viewName}: setupEventListeners() must be implemented`);
  }

  /**
   * Καταγραφή event listener για cleanup αργότερα
   */
  addEventListener(element, event, handler, options = {}) {
    if (!element) {
      console.warn(`[${this.viewName}] Attempted to add listener to null element`);
      return;
    }

    // Create unique key for this listener
    const key = `${element.id || 'no-id'}_${event}`;
    
    // Remove old listener if exists
    if (this.eventListeners.has(key)) {
      const oldHandler = this.eventListeners.get(key);
      element.removeEventListener(event, oldHandler, options);
    }

    // Add new listener
    element.addEventListener(event, handler, options);
    this.eventListeners.set(key, handler);
  }

  /**
   * Event delegation - add listener to parent, handle events from children
   */
  addDelegatedListener(parentElement, event, selector, handler) {
    if (!parentElement) {
      console.warn(`[${this.viewName}] Attempted to add delegated listener to null element`);
      return;
    }

    const key = `${parentElement.id || 'no-id'}_${event}_${selector}`;
    
    // Remove old delegated listener if exists
    if (this.delegatedListeners.has(key)) {
      const oldHandler = this.delegatedListeners.get(key);
      parentElement.removeEventListener(event, oldHandler);
    }

    // Create delegated handler
    const delegatedHandler = (e) => {
      const target = e.target.closest(selector);
      if (target) {
        handler.call(target, e);
      }
    };

    // Add listener
    parentElement.addEventListener(event, delegatedHandler);
    this.delegatedListeners.set(key, delegatedHandler);
  }

  /**
   * Καθαρισμός όλων των event listeners
   */
  cleanup() {
    console.log(`[${this.viewName}] Cleaning up ${this.eventListeners.size} listeners and ${this.delegatedListeners.size} delegated listeners`);
    
    // Clear all tracked listeners
    this.eventListeners.clear();
    this.delegatedListeners.clear();
  }

  /**
   * Render empty state
   */
  renderEmptyState(icon, title, message) {
    return Utils.renderEmptyState(icon, title, message);
  }

  /**
   * Show form
   */
  showForm(formId, title = null) {
    const form = document.getElementById(formId);
    if (form) {
      if (title) {
        const titleEl = form.querySelector('h2');
        if (titleEl) titleEl.textContent = title;
      }
      form.style.display = 'block';
      form.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /**
   * Hide form
   */
  hideForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
      form.style.display = 'none';
      const formElement = form.querySelector('form');
      if (formElement) formElement.reset();
    }
  }

  /**
   * Refresh table
   */
  refreshTable(containerId, data) {
    const container = document.getElementById(containerId);
    if (container && typeof this.renderTable === 'function') {
      container.innerHTML = this.renderTable(data);
    }
  }

  /**
   * Filter data based on search term and filters
   */
  filterData(data, searchTerm, filters = {}) {
    let filtered = [...data];

    // Apply search
    if (searchTerm && typeof this.searchFilter === 'function') {
      filtered = filtered.filter(item => this.searchFilter(item, searchTerm));
    }

    // Apply additional filters
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        filtered = filtered.filter(item => item[key] === filters[key]);
      }
    });

    return filtered;
  }

  /**
   * Sort data
   */
  sortData(data, field, direction = 'asc') {
    return Utils.sortBy(data, field, direction);
  }

  /**
   * Get data from State
   */
  getData(entityType, id = null) {
    return id ? State.read(entityType, id) : State.read(entityType);
  }

  /**
   * Create record
   */
  async create(entityType, data) {
    try {
      await State.create(entityType, data);
      Toast.success('Η εγγραφή δημιουργήθηκε επιτυχώς!');
      return true;
    } catch (error) {
      console.error(`[${this.viewName}] Create error:`, error);
      return false;
    }
  }

  /**
   * Update record
   */
  async update(entityType, id, data) {
    try {
      await State.update(entityType, id, data);
      Toast.success('Η εγγραφή ενημερώθηκε επιτυχώς!');
      return true;
    } catch (error) {
      console.error(`[${this.viewName}] Update error:`, error);
      return false;
    }
  }

  /**
   * Delete record with confirmation
   */
  async delete(entityType, id, confirmMessage = 'Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την εγγραφή;') {
    return new Promise((resolve) => {
      Modal.confirm({
        title: 'Διαγραφή',
        message: confirmMessage,
        confirmText: 'Διαγραφή',
        onConfirm: async () => {
          try {
            await State.delete(entityType, id);
            Toast.success('Η εγγραφή διαγράφηκε επιτυχώς!');
            resolve(true);
          } catch (error) {
            console.error(`[${this.viewName}] Delete error:`, error);
            resolve(false);
          }
        },
        onCancel: () => resolve(false)
      });
    });
  }

  /**
   * Validate form data
   */
  validate(entityType, data) {
    const validation = Validation[`validate${entityType.charAt(0).toUpperCase() + entityType.slice(1)}`]?.(data);
    
    if (validation && !validation.valid) {
      Validation.showErrors(validation.errors);
      return false;
    }
    
    return true;
  }
}

// Export για χρήση
window.BaseView = BaseView;
