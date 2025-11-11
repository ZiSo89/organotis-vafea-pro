/* ========================================
   Toast Notifications System
   ======================================== */

const Toast = {
  container: null,

  init() {
    this.container = document.getElementById('toastContainer');
  },

  show(message, type = 'info', duration = CONFIG.TOAST_DURATION) {
    if (!this.container) this.init();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = this.getIcon(type);
    
    toast.innerHTML = `
      <div class="toast-icon">
        <i class="${icon}"></i>
      </div>
      <div class="toast-content">
        <div class="toast-title">${this.getTitle(type)}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Close">
        <i class="fas fa-times"></i>
      </button>
    `;

    // Close button
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.onclick = () => this.remove(toast);

    this.container.appendChild(toast);

    // Auto remove
    if (duration > 0) {
      setTimeout(() => this.remove(toast), duration);
    }

    return toast;
  },

  remove(toast) {
    toast.classList.add('toast-exit');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  },

  getIcon(type) {
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };
    return icons[type] || icons.info;
  },

  getTitle(type) {
    const titles = {
      success: 'Επιτυχία',
      error: 'Σφάλμα',
      warning: 'Προσοχή',
      info: 'Πληροφορία'
    };
    return titles[type] || titles.info;
  },

  // Shortcuts
  success(message, duration) {
    console.log('✅ Toast Success:', message);
    return this.show(message, 'success', duration);
  },

  error(message, duration) {
    console.error('🔴 Toast Error:', message);
    return this.show(message, 'error', duration);
  },

  warning(message, duration) {
    console.warn('⚠️ Toast Warning:', message);
    return this.show(message, 'warning', duration);
  },

  info(message, duration) {
    return this.show(message, 'info', duration);
  },

  // Loading toast (no auto-close)
  loading(message) {
    return this.show(message, 'info', 0);
  }
};
