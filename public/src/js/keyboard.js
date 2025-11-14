/* ========================================
   Keyboard Shortcuts
   ======================================== */

const Keyboard = {
  shortcuts: {
    // Ctrl/Cmd + N - Νέα εγγραφή
    'ctrl+n': () => {
      document.getElementById('fab')?.click();
    },

    // Ctrl/Cmd + S - Save (αποθήκευση)
    'ctrl+s': (e) => {
      e.preventDefault();
      Storage.save();
      Toast.success('Δεδομένα αποθηκεύτηκαν');
    },

    // Ctrl/Cmd + F - Focus search (desktop only)
    'ctrl+f': (e) => {
      e.preventDefault();
      if (!Utils.isMobile()) {
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    },

    // Ctrl/Cmd + Z - Undo
    'ctrl+z': (e) => {
      e.preventDefault();
      State.undo();
    },

    // Ctrl/Cmd + Y - Redo
    'ctrl+y': (e) => {
      e.preventDefault();
      State.redo();
    },

    // ESC - Close modal/sidebar
    'escape': () => {
      if (Modal.currentModal) {
        Modal.close();
      } else if (Sidebar.isMobile && Sidebar.element.classList.contains('open')) {
        Sidebar.close();
      }
    },

    // Ctrl/Cmd + P - Print
    'ctrl+p': (e) => {
      e.preventDefault();
      window.print();
    },

    // Ctrl/Cmd + E - Export
    'ctrl+e': (e) => {
      e.preventDefault();
      Storage.export();
    }
  },

  init() {
    document.addEventListener('keydown', (e) => {
      const key = this.getKeyCombo(e);
      const handler = this.shortcuts[key];
      
      if (handler) {
        handler(e);
      }
    });
  },

  getKeyCombo(e) {
    const keys = [];
    
    if (e.ctrlKey || e.metaKey) keys.push('ctrl');
    if (e.shiftKey) keys.push('shift');
    if (e.altKey) keys.push('alt');
    
    if (!e.key) return keys.join('+'); // Αν δεν υπάρχει key, επέστρεψε modifiers μόνο
    
    const key = e.key.toLowerCase();
    if (key !== 'control' && key !== 'shift' && key !== 'alt' && key !== 'meta') {
      keys.push(key);
    }
    
    return keys.join('+');
  }
};
