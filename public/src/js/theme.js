/* ========================================
   Theme Manager - Dark/Light Mode
   ======================================== */

const Theme = {
  current: 'light',
  isApplying: false, // Prevent re-entry

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
    // Prevent re-entry (infinite loop protection)
    if (this.isApplying) {
      console.log('⚠️ Theme.apply() already in progress - skipping');
      return;
    }
    
    this.isApplying = true;
    console.log(`🎨 Applying theme: ${this.current}`);
    
    document.body.setAttribute('data-theme', this.current);
    document.documentElement.setAttribute('data-theme', this.current);
    
    // Update all theme toggle buttons
    this.updateToggleButtons();

    // Save preference
    localStorage.setItem(CONFIG.THEME_KEY, this.current);
    
    // Trigger custom event for components to update
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: this.current } }));
    
    this.isApplying = false;
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
