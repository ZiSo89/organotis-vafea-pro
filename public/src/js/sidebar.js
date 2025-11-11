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
    this.setInitialIcon();
  },
  
  setInitialIcon() {
    const toggleBtn = document.getElementById('sidebarToggle');
    if (toggleBtn) {
      const icon = toggleBtn.querySelector('i');
      if (icon) {
        // Set correct initial icon based on device type
        icon.classList.remove('fa-bars', 'fa-chevron-left', 'fa-chevron-right', 'fa-times');
        if (this.isMobile) {
          icon.classList.add('fa-bars');
        } else {
          icon.classList.add('fa-chevron-left');
        }
      }
    }
  },

  setupToggle() {
    const toggleBtn = document.getElementById('sidebarToggle');
    
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
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
    
    if (this.isMobile) {
      const isOpen = this.element.classList.contains('open');
      
      if (isOpen) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-times');
      } else {
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
      }
    } else {
      // Desktop: show chevrons for collapsed state
      const isCollapsed = this.element.classList.contains('collapsed');
      
      if (isCollapsed) {
        icon.classList.remove('fa-chevron-left');
        icon.classList.add('fa-chevron-right');
      } else {
        icon.classList.remove('fa-chevron-right');
        icon.classList.add('fa-chevron-left');
      }
    }
  },

  toggle() {
    if (this.isMobile) {
      this.element.classList.toggle('open');
    } else {
      this.isCollapsed = !this.isCollapsed;
      this.element.classList.toggle('collapsed');
      
      // Refresh calendar after sidebar animation completes
      setTimeout(() => {
        if (window.CalendarView && window.CalendarView.calendar) {
          window.CalendarView.calendar.updateSize();
        }
      }, 300); // Wait for CSS transition to complete
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
    
    if (mobileBtn) {
      mobileBtn.addEventListener('click', () => {
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
        
        // Update icon based on new breakpoint
        const toggleBtn = document.getElementById('sidebarToggle');
        if (toggleBtn) {
          const icon = toggleBtn.querySelector('i');
          if (icon) {
            icon.classList.remove('fa-times', 'fa-chevron-left', 'fa-chevron-right');
            if (this.isMobile) {
              icon.classList.add('fa-bars');
            } else {
              icon.classList.add('fa-chevron-left');
            }
          }
        }
      }
    });
    
    // Set initial icon based on screen size
    const toggleBtn = document.getElementById('sidebarToggle');
    if (toggleBtn) {
      const icon = toggleBtn.querySelector('i');
      if (icon && !this.isMobile) {
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-chevron-left');
      }
    }
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
