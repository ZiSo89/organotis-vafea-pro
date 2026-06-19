/* ========================================
   Utilities - Helper Functions
   ======================================== */

/**
 * Utility functions for common operations across the application
 * @namespace Utils
 */
const Utils = {
  /**
   * Shorthand for document.querySelector
   * @param {string} selector - CSS selector
   * @returns {Element|null} Selected element
   */
  $(selector) {
    return document.querySelector(selector);
  },

  /**
   * Shorthand for document.querySelectorAll
   * @param {string} selector - CSS selector
   * @returns {NodeList} Selected elements
   */
  $$(selector) {
    return document.querySelectorAll(selector);
  },

  /**
   * Format date for display
   * @param {string|Date} dateString - Date to format
   * @returns {string} Formatted date or '-' if invalid
   */
  formatDate(dateString) {
    if (!dateString || dateString === 'null' || dateString === 'undefined') return '-';
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) return '-';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  },

  // Convert YYYY-MM-DD to DD/MM/YYYY for form display
  dateToGreek(isoDate) {
    if (!isoDate || isoDate === 'null' || isoDate === 'undefined') return '';
    if (isoDate instanceof Date && !isNaN(isoDate.getTime())) {
      const day = String(isoDate.getDate()).padStart(2, '0');
      const month = String(isoDate.getMonth() + 1).padStart(2, '0');
      const year = isoDate.getFullYear();
      return `${day}/${month}/${year}`;
    }
    const normalizedDate = String(isoDate).trim().substring(0, 10);
    const parts = normalizedDate.split('-');
    if (parts.length !== 3) return '';
    const [year, month, day] = parts;
    // Validate parts exist and are numbers
    if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) return '';
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  },

  // Convert DD/MM/YYYY to YYYY-MM-DD for storage
  greekToDate(greekDate) {
    if (!greekDate) return null;
    if (typeof greekDate !== 'string') return null;
    if (greekDate.trim() === '') return null;
    const parts = greekDate.split('/');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts;
    // Validate parts are numbers
    if (!day || !month || !year || isNaN(day) || isNaN(month) || isNaN(year)) return null;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  },

  /**
   * Initialize Flatpickr date picker on element
   * @param {string|Element} selector - CSS selector or element
   * @returns {Object|undefined} Flatpickr instance
   */
  initDatePicker(selector) {
    const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!element) return;
    
    // If flatpickr is not available, add manual date input handler
    if (typeof flatpickr === 'undefined') {
      console.warn('Flatpickr not loaded, using manual date input');
      
      // Format input as user types (dd/mm/yyyy)
      const formatHandler = function(e) {
        let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
        if (value.length >= 2) {
          value = value.substring(0, 2) + '/' + value.substring(2);
        }
        if (value.length >= 5) {
          value = value.substring(0, 5) + '/' + value.substring(5, 9);
        }
        e.target.value = value;
      };
      
      // Remove previous handler if exists
      element.removeEventListener('input', formatHandler);
      element.addEventListener('input', formatHandler);
      
      return;
    }
    
    // Destroy existing flatpickr instance if any
    if (element._flatpickr) {
      element._flatpickr.destroy();
    }
    
    // Use flatpickr with Greek locale - preserve existing value
    const config = {
      dateFormat: 'd/m/Y',
      altInput: false,
      allowInput: true,
      clickOpens: true
    };
    
    // Set Greek locale if available
    if (typeof flatpickr.l10ns !== 'undefined' && flatpickr.l10ns.gr) {
      config.locale = flatpickr.l10ns.gr;
    }
    
    // If there's already a value, parse it correctly as dd/mm/yyyy
    if (element.value && element.value.includes('/')) {
      const parts = element.value.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
        const year = parseInt(parts[2], 10);
        config.defaultDate = new Date(year, month, day);
      }
    }
    
    return flatpickr(element, config);
  },

  /**
   * Format number as currency (EUR)
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency or '-'
   */
  formatCurrency(amount) {
    if (!amount && amount !== 0) return '-';
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  },

  /**
   * Translate status from English to Greek
   * @param {string} status - Status in English
   * @returns {string} Status in Greek
   */
  translateStatus(status) {
    if (!status) return '-';
    
    // Αν είναι ήδη ελληνικά, επέστρεψε το όπως είναι
    const greekStatuses = [
      'Υποψήφιος', 'Προγραμματισμένη', 'Σε εξέλιξη', 'Σε αναμονή',
      'Ολοκληρώθηκε', 'Εξοφλήθηκε', 'Ακυρώθηκε',
      'Ενεργός', 'Ανενεργός', 'Πληρωμένο', 'Απλήρωτο'
    ];
    
    if (greekStatuses.includes(status)) {
      return status;
    }
    
    // Μετάφραση από αγγλικά σε ελληνικά
    const translations = {
      'pending': 'Σε αναμονή',
      'in-progress': 'Σε εξέλιξη',
      'completed': 'Ολοκληρώθηκε',
      'cancelled': 'Ακυρώθηκε',
      'active': 'Ενεργός',
      'inactive': 'Ανενεργός',
      'paid': 'Πληρωμένο',
      'unpaid': 'Απλήρωτο'
    };
    
    return translations[status] || status;
  },

  // Escape HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Debounce function execution
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Throttle function execution
   * @param {Function} func - Function to throttle
   * @param {number} limit - Limit in milliseconds
   * @returns {Function} Throttled function
   */
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Generate Dropdown Options
  createOptions(options, selected = '') {
    return options.map(option => 
      `<option value="${option}" ${option === selected ? 'selected' : ''}>${option}</option>`
    ).join('');
  },

  // Create Client Dropdown
  createClientDropdown(clients, selected = '') {
    const options = clients.map(client => 
      `<option value="${client.name}" ${client.name === selected ? 'selected' : ''}>
        ${client.name}
      </option>`
    ).join('');
    return `<option value="">— Διάλεξε πελάτη —</option>${options}`;
  },

  // Create Job Dropdown
  createJobDropdown(jobs, selected = '') {
    const options = jobs.map(job => 
      `<option value="${job.id} — ${job.client}" ${(`${job.id} — ${job.client}` === selected) ? 'selected' : ''}>
        ${job.id} — ${job.client}
      </option>`
    ).join('');
    return `<option value="">— Διάλεξε εργασία —</option>${options}`;
  },

  // Create Offer Dropdown
  createOfferDropdown(offers, selected = '') {
    const options = offers.map(offer => 
      `<option value="${offer.id}" ${offer.id === selected ? 'selected' : ''}>
        ${offer.id}
      </option>`
    ).join('');
    return `<option value="">— Διάλεξε προσφορά —</option>${options}`;
  },

  // Get Status Pill Class
  getStatusClass(status) {
    return CONFIG.STATUS_COLORS[status] || 'status-candidate';
  },

  // Create Status Pill
  createStatusPill(status) {
    const statusClass = this.getStatusClass(status);
    return `<span class="pill ${statusClass}">${status}</span>`;
  },

  // Download File
  downloadFile(content, filename, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  // Copy to Clipboard
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      Toast.success('Αντιγράφηκε στο clipboard');
    } catch (error) {
      Toast.error('Αποτυχία αντιγραφής');
    }
  },

  // Get Relative Time (π.χ. "πριν 2 ώρες")
  getRelativeTime(date) {
    const now = new Date();
    const past = new Date(date);
    const diff = now - past;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `πριν ${days} μέρα${days > 1 ? 'ες' : ''}`;
    if (hours > 0) return `πριν ${hours} ώρα${hours > 1 ? 'ες' : ''}`;
    if (minutes > 0) return `πριν ${minutes} λεπτό${minutes > 1 ? 'ά' : ''}`;
    return 'μόλις τώρα';
  },

  // Auto-fill Client Data
  autoFillClientData(clientName, targetElements) {
    const client = State.data.clients.find(c => c.name === clientName);
    if (client) {
      if (targetElements.phone) targetElements.phone.value = client.phone || '';
      if (targetElements.email) targetElements.email.value = client.email || '';
      if (targetElements.address) targetElements.address.value = client.address || '';
      if (targetElements.city) targetElements.city.value = client.city || '';
      if (targetElements.postal) targetElements.postal.value = client.postal || '';
    }
  },

  /**
   * Generate next sequential ID for collection
   * @param {string} collection - Collection name (e.g., 'clients', 'jobs')
   * @param {string} prefix - ID prefix (e.g., 'Π', 'Ε')
   * @returns {string} Generated ID (e.g., 'Π-0005')
   */
  generateNextId(collection, prefix) {
    const items = State.data[collection];
    const maxNum = Math.max(
      0,
      ...items.map(item => {
        const match = item.id.match(new RegExp(`^${prefix}-(\\d+)$`));
        return match ? parseInt(match[1]) : 0;
      })
    );
    return `${prefix}-${String(maxNum + 1).padStart(4, '0')}`;
  },

  // Check if ID exists
  idExists(collection, id) {
    return State.data[collection].some(item => item.id === id);
  },

  // Truncate Text
  truncate(text, maxLength = 50) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  },

  /**
   * Sort array by specified key
   * @param {Array} array - Array to sort
   * @param {string} key - Property key to sort by
   * @param {string} direction - 'asc' or 'desc'
   * @returns {Array} Sorted array (new instance)
   */
  sortBy(array, key, direction = 'asc') {
    return [...array].sort((a, b) => {
      let aVal = a[key];
      let bVal = b[key];

      // Handle numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Handle strings
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
      
      if (direction === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  },

  /**
   * Group array items by property value
   * @param {Array} array - Array to group
   * @param {string} key - Property key to group by
   * @returns {Object} Object with grouped items
   */
  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const value = item[key];
      if (!groups[value]) {
        groups[value] = [];
      }
      groups[value].push(item);
      return groups;
    }, {});
  },

  // Sum array values
  sum(array, key) {
    return array.reduce((total, item) => total + (parseFloat(item[key]) || 0), 0);
  },

  // Average
  average(array, key) {
    if (array.length === 0) return 0;
    return this.sum(array, key) / array.length;
  },

  // Generate random coordinates near Alexandroupoli
  generateRandomCoordinates() {
    // Center: Alexandroupoli (40.8475, 25.8747)
    // Random offset within ~2km radius
    const baseLat = 40.8475;
    const baseLng = 25.8747;
    const offsetLat = (Math.random() - 0.5) * 0.02; // ~1km
    const offsetLng = (Math.random() - 0.5) * 0.03; // ~1.5km
    
    return {
      lat: baseLat + offsetLat,
      lng: baseLng + offsetLng
    };
  },

  /**
   * Render empty state UI component
   * @param {string} icon - Font Awesome icon class
   * @param {string} title - Title text
   * @param {string} message - Description message
   * @returns {string} HTML string for empty state
   */
  renderEmptyState(icon, title, message) {
    return `
      <div class="empty-state">
        <i class="fas ${icon} fa-3x"></i>
        <h3>${title}</h3>
        <p>${message}</p>
      </div>
    `;
  },

  /**
   * Reset one infinite list back to the first page.
   */
  resetInfiniteList(key, batchSize = 20) {
    this.infiniteLists = this.infiniteLists || {};
    const existing = this.infiniteLists[key];
    if (existing?.scrollHandler) {
      window.removeEventListener('scroll', existing.scrollHandler);
    }
    if (existing?.clickHandler && existing.button) {
      existing.button.removeEventListener('click', existing.clickHandler);
    }
    this.infiniteLists[key] = {
      visible: batchSize,
      batchSize,
      scrollHandler: null,
      clickHandler: null,
      button: null
    };
  },

  getInfiniteListState(key, batchSize = 20) {
    this.infiniteLists = this.infiniteLists || {};
    if (!this.infiniteLists[key]) {
      this.infiniteLists[key] = {
        visible: batchSize,
        batchSize,
        scrollHandler: null,
        clickHandler: null,
        button: null
      };
    }
    return this.infiniteLists[key];
  },

  getInfiniteSlice(key, items, batchSize = 20) {
    const list = Array.isArray(items) ? items : [];
    const state = this.getInfiniteListState(key, batchSize);
    const visible = Math.min(state.visible || batchSize, list.length);
    state.visible = visible || batchSize;

    return {
      items: list.slice(0, visible || batchSize),
      visible: Math.min(visible || batchSize, list.length),
      total: list.length,
      hasMore: list.length > (visible || batchSize)
    };
  },

  renderInfiniteFooter(key, visible, total, batchSize = 20) {
    if (total <= batchSize) return '';

    const hasMore = visible < total;
    return `
      <div class="lazy-load-footer" data-infinite-key="${key}" style="display: flex; justify-content: center; align-items: center; gap: 12px; flex-wrap: wrap; padding: 16px; color: var(--text-muted);">
        <span>Εμφανίζονται <strong>${visible}</strong> από <strong>${total}</strong> εγγραφές</span>
        ${hasMore ? `
          <button type="button" class="btn btn-secondary" data-infinite-load-more="${key}">
            Φόρτωση άλλων ${batchSize}
          </button>
        ` : '<span style="color: var(--success);">Φορτώθηκαν όλες οι εγγραφές</span>'}
      </div>
    `;
  },

  setupInfiniteScroll({ key, total, onLoadMore, batchSize = 20, threshold = 320 }) {
    const state = this.getInfiniteListState(key, batchSize);

    if (state.scrollHandler) {
      window.removeEventListener('scroll', state.scrollHandler);
      state.scrollHandler = null;
    }
    if (state.clickHandler && state.button) {
      state.button.removeEventListener('click', state.clickHandler);
      state.clickHandler = null;
      state.button = null;
    }

    if (!total || state.visible >= total) return;

    const loadMore = () => {
      const nextVisible = Math.min((state.visible || batchSize) + batchSize, total);
      if (nextVisible === state.visible) return;
      state.visible = nextVisible;
      if (typeof onLoadMore === 'function') {
        onLoadMore();
      }
    };

    state.scrollHandler = this.throttle(() => {
      const doc = document.documentElement;
      const scrollBottom = window.scrollY + window.innerHeight;
      const pageBottom = Math.max(doc.scrollHeight, document.body.scrollHeight);
      if (scrollBottom >= pageBottom - threshold) {
        loadMore();
      }
    }, 150);

    window.addEventListener('scroll', state.scrollHandler, { passive: true });

    state.button = document.querySelector(`[data-infinite-load-more="${key}"]`);
    if (state.button) {
      state.clickHandler = (event) => {
        event.preventDefault();
        loadMore();
      };
      state.button.addEventListener('click', state.clickHandler);
    }
  },

  /**
   * Open address in Google Maps in new tab
   * @param {string} address - Address to search
   */
  openInMaps(address) {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  },

  /**
   * Normalize text for search: lowercase, no accents/tonos, greeklish→Greek, collapsed spaces.
   * @param {string} value
   * @returns {string}
   */
  normalizeSearchText(value) {
    if (typeof MaterialIdentity !== 'undefined' && typeof MaterialIdentity.normalizeSearchText === 'function') {
      return MaterialIdentity.normalizeSearchText(value);
    }

    return String(value || '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  },

  /**
   * Accent/case/greeklish-insensitive match against one or more field values.
   * @param {string|string[]} fields
   * @param {string} query
   * @returns {boolean}
   */
  matchesSearch(fields, query) {
    const normalizedQuery = Utils.normalizeSearchText(query);
    if (!normalizedQuery) return true;

    const haystack = Utils.normalizeSearchText(
      (Array.isArray(fields) ? fields : [fields])
        .filter(value => value !== undefined && value !== null && value !== '')
        .join(' ')
    );
    if (!haystack) return false;

    const words = normalizedQuery.split(' ').filter(Boolean);
    return words.every(word => haystack.includes(word));
  },

  /**
   * Check if user is on mobile device
   * @returns {boolean} True if mobile device
   */
  isMobile() {
    // Check screen width
    if (window.innerWidth <= 768) return true;
    
    // Check user agent for mobile devices
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
  },

  /** True when running as installed PWA (home-screen app). */
  isPwaInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
  },

  /**
   * On PWA cold-start the network may not be ready at DOMContentLoaded.
   * Wait briefly so the first API batch doesn't fail silently.
   */
  async waitForPwaNetwork() {
    if (!this.isPwaInstalled()) return;

    if (!navigator.onLine) {
      await new Promise((resolve) => {
        const done = () => {
          window.removeEventListener('online', done);
          resolve();
        };
        window.addEventListener('online', done, { once: true });
        setTimeout(resolve, 4000);
      });
    }

    // navigator.onLine === true does NOT guarantee the network stack / DNS is
    // actually ready on a cold PWA launch. Probe a cheap API endpoint until it
    // responds (up to ~6s) so the first data batch doesn't fire into a dead
    // connection and come back empty.
    const probe = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      try {
        const resp = await fetch('/api/statistics.php?action=available_years', {
          signal: controller.signal,
          cache: 'no-store',
          credentials: 'include'
        });
        return !!(resp && resp.ok);
      } catch (error) {
        return false;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (await probe()) return;
      await new Promise((resolve) => setTimeout(resolve, 500 + attempt * 400));
    }
  },

  /**
   * Check if device has touch screen
   * @returns {boolean} True if touch device
   */
  isTouchDevice() {
    return ('ontouchstart' in window) || 
           (navigator.maxTouchPoints > 0) || 
           (navigator.msMaxTouchPoints > 0);
  }
};
