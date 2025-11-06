/* ========================================
   Theme Manager - Dark/Light Mode
   ======================================== */

const Theme = {
  current: 'light',

  init() {
    // Load saved theme
    const saved = localStorage.getItem(CONFIG.THEME_KEY);
    if (saved) {
      this.current = saved;
    }
    // Αν δεν υπάρχει αποθηκευμένο, μένει light (default)
    
    this.apply();
    this.setupToggle();
    this.watchSystemChanges();
  },

  apply() {
    document.body.setAttribute('data-theme', this.current);
    
    // Force repaint for all elements
    document.documentElement.setAttribute('data-theme', this.current);
    
    // Update all theme toggle buttons
    this.updateToggleButtons();

    // Save preference
    localStorage.setItem(CONFIG.THEME_KEY, this.current);
    
    // Trigger custom event for components to update
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: this.current } }));
  },

  updateToggleButtons() {
    // Update header toggle button
    const headerBtn = document.getElementById('themeToggle');
    if (headerBtn) {
      const icon = headerBtn.querySelector('i');
      if (icon) {
        icon.className = this.current === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
      }
    }

    // Update dashboard toggle
    const dashboardToggle = document.getElementById('darkModeToggle');
    if (dashboardToggle) {
      dashboardToggle.checked = this.current === 'dark';
      
      const label = document.querySelector('#darkModeToggle + .toggle-slider + .toggle-label');
      if (label) {
        const icon = label.querySelector('i');
        if (icon) {
          icon.className = this.current === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
      }
    }
  },

  toggle() {
    this.current = this.current === 'dark' ? 'light' : 'dark';
    this.apply();
    
    // Force immediate repaint
    document.body.style.display = 'none';
    document.body.offsetHeight; // Trigger reflow
    document.body.style.display = '';
    
    // Smooth transition animation
    document.body.classList.add('theme-transitioning');
    setTimeout(() => {
      document.body.classList.remove('theme-transitioning');
    }, 300);
  },

  setupToggle() {
    const btn = document.getElementById('themeToggle');
    if (btn) {
      btn.addEventListener('click', () => this.toggle());
    }
  },

  watchSystemChanges() {
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        // Μόνο αν ο χρήστης δεν έχει ορίσει προτίμηση
        if (!localStorage.getItem(CONFIG.THEME_KEY)) {
          this.current = e.matches ? 'dark' : 'light';
          this.apply();
        }
      });
    }
  }
};
