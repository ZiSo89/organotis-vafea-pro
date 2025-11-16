/**
 * Help System - Legacy support
 * Now using HelpView for in-app navigation
 */

const HelpSystem = {
  /**
   * Initialize help system
   */
  init() {
    console.log('✅ Help System initialized');
  },

  /**
   * Open help page (navigate to help view)
   */
  openHelpModal() {
    // Navigate to help view instead of opening modal
    if (window.Router) {
      Router.navigate('help');
    } else {
      window.location.hash = 'help';
    }
  }
};

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => HelpSystem.init());
} else {
  HelpSystem.init();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HelpSystem;
}
