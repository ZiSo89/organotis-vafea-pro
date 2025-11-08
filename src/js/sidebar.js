/* ========================================
   Sidebar Navigation
   ======================================== */

const Sidebar = {
  element: null,
  isCollapsed: false,
  isMobile: window.innerWidth < 768,

  init() {
    this.element = document.getElementById('sidebar');
    this.setupToggle();
    this.setupNavigation();
    this.setupMobileMenu();
    this.handleResize();
  },

  setupToggle() {
    const toggleBtn = document.getElementById('sidebarToggle');
    console.log('🔘 Sidebar toggle button:', toggleBtn);
    
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        console.log('🔄 Toggle clicked!');
        this.toggle();
        this.updateToggleIcon(toggleBtn);
      });
    } else {
      console.error('❌ Sidebar toggle button not found!');
    }
  },

  updateToggleIcon(toggleBtn) {
    const icon = toggleBtn.querySelector('i');
    if (!icon) return;
    
    const isOpen = this.element.classList.contains('open');
    
    if (isOpen) {
      icon.classList.remove('fa-bars');
      icon.classList.add('fa-times');
    } else {
      icon.classList.remove('fa-times');
      icon.classList.add('fa-bars');
    }
  },

  toggle() {
    console.log('📱 Is mobile:', this.isMobile);
    
    if (this.isMobile) {
      this.element.classList.toggle('open');
      console.log('📱 Mobile: toggled open class');
    } else {
      this.isCollapsed = !this.isCollapsed;
      this.element.classList.toggle('collapsed');
      console.log('💻 Desktop: toggled collapsed class, isCollapsed:', this.isCollapsed);
    }
  },

  close() {
    if (this.isMobile) {
      this.element.classList.remove('open');
      // Update icon when closing
      const toggleBtn = document.getElementById('sidebarToggle');
      if (toggleBtn) this.updateToggleIcon(toggleBtn);
    }
  },

  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.getAttribute('data-section');
        
        // Update active state
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        // Navigate
        Router.navigate(section);
        
        // Close sidebar on mobile
        if (this.isMobile) {
          this.close();
        }
      });
    });
  },

  setupMobileMenu() {
    const mobileBtn = document.getElementById('mobileMenuBtn');
    console.log('📱 Mobile menu button:', mobileBtn);
    
    if (mobileBtn) {
      mobileBtn.addEventListener('click', () => {
        console.log('🍔 Hamburger clicked!');
        this.toggle();
        // Update icon after toggle
        const toggleBtn = document.getElementById('sidebarToggle');
        if (toggleBtn) this.updateToggleIcon(toggleBtn);
      });
    } else {
      console.error('❌ Mobile menu button not found!');
    }

    // Close on backdrop click (mobile)
    document.addEventListener('click', (e) => {
      if (this.isMobile && this.element.classList.contains('open')) {
        if (!this.element.contains(e.target) && !e.target.closest('#mobileMenuBtn')) {
          this.close();
        }
      }
    });
  },

  handleResize() {
    window.addEventListener('resize', () => {
      const wasMobile = this.isMobile;
      this.isMobile = window.innerWidth < 768;

      if (wasMobile !== this.isMobile) {
        // Reset states on breakpoint change
        this.element.classList.remove('open', 'collapsed');
        this.isCollapsed = false;
        
        // Reset icon to burger when switching breakpoints
        const toggleBtn = document.getElementById('sidebarToggle');
        if (toggleBtn) {
          const icon = toggleBtn.querySelector('i');
          if (icon) {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
          }
        }
      }
    });
  },

  setActive(section) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      if (item.getAttribute('data-section') === section) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }
};
