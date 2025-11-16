/* ========================================
   Help View - Οδηγός Χρήσης
   ======================================== */

window.HelpView = {
  currentSection: 'intro',

  // Help content organized by section
  helpContent: {
    intro: {
      title: '🎨 Καλώς ήρθες στον Οργανωτή Βαφέα Pro',
      content: `
        <p>Αυτό το πρόγραμμα σε βοηθά να διαχειρίζεσαι:</p>
        <ul>
          <li>Τους πελάτες σου</li>
          <li>Τις εργασίες και τα έργα</li>
          <li>Το προσωπικό σου</li>
          <li>Τα ραντεβού και το ημερολόγιο</li>
          <li>Τα οικονομικά και τα στατιστικά</li>
        </ul>
        <p><strong>Όλα γίνονται εύκολα μέσα από τον browser!</strong></p>
      `
    },
    
    navigation: {
      title: '🧭 Πλοήγηση',
      content: `
        <p>Το <strong>αριστερό μενού</strong> σου δίνει πρόσβαση σε όλες τις λειτουργίες:</p>
        <ul>
          <li><strong>Αρχική:</strong> Γρήγορη επισκόπηση της δουλειάς σου</li>
          <li><strong>Εργασίες:</strong> Δημιουργία και διαχείριση έργων</li>
          <li><strong>Πελάτες:</strong> Καταχώρηση στοιχείων πελατών</li>
          <li><strong>Προσωπικό:</strong> Εργάτες και συνεργάτες</li>
          <li><strong>Ημερολόγιο:</strong> Προγραμματισμός ραντεβού</li>
          <li><strong>Χάρτης:</strong> Οι πελάτες σου στο χάρτη</li>
          <li><strong>Στατιστικά:</strong> Έσοδα, έξοδα, κέρδη</li>
          <li><strong>Ρυθμίσεις:</strong> Ρύθμιση επιχείρησης και backup</li>
        </ul>
      `
    },
    
    clients: {
      title: '👥 Πελάτες',
      content: `
        <h3>Προσθήκη νέου πελάτη:</h3>
        <ol>
          <li>Πάτα <strong>"Νέος Πελάτης"</strong></li>
          <li>Συμπλήρωσε: Όνομα, τηλέφωνο, email</li>
          <li>Βάλε τη <strong>διεύθυνση</strong> για να εμφανιστεί στο χάρτη</li>
          <li>Πάτα <strong>"Αποθήκευση"</strong></li>
        </ol>
        
        <h3>Χρήσιμα:</h3>
        <ul>
          <li><strong>Αναζήτηση:</strong> Βρες γρήγορα πελάτη με όνομα ή τηλέφωνο</li>
          <li><strong>Μάτι (👁️):</strong> Προβολή όλων των στοιχείων</li>
          <li><strong>Μολύβι (✏️):</strong> Επεξεργασία</li>
          <li><strong>Κάδος (🗑️):</strong> Διαγραφή</li>
        </ul>
      `
    },
    
    jobs: {
      title: '💼 Εργασίες',
      content: `
        <h3>Δημιουργία νέας εργασίας:</h3>
        <ol>
          <li>Πάτα <strong>"Νέα Εργασία"</strong></li>
          <li><strong>Επίλεξε πελάτη</strong> από τη λίστα</li>
          <li>Συμπλήρωσε: Περιγραφή, τύπο εργασίας, τετραγωνικά</li>
          <li>Πρόσθεσε <strong>χρώματα</strong> που θα χρησιμοποιήσεις</li>
          <li>Όρισε <strong>προσωπικό</strong> (αν έχεις)</li>
          <li>Συμπλήρωσε <strong>κόστη και τιμές</strong></li>
          <li>Πάτα <strong>"Αποθήκευση"</strong></li>
        </ol>
        
        <h3>Κατάσταση εργασίας:</h3>
        <ul>
          <li><strong>Σε εκκρεμότητα:</strong> Δεν ξεκίνησε ακόμα</li>
          <li><strong>Προγραμματισμένη:</strong> Έχει οριστεί ημερομηνία</li>
          <li><strong>Σε εξέλιξη:</strong> Τρέχει τώρα</li>
          <li><strong>Ολοκληρωμένη:</strong> Τελείωσε</li>
        </ul>
      `
    },
    
    workers: {
      title: '👷 Προσωπικό',
      content: `
        <h3>Προσθήκη εργάτη:</h3>
        <ol>
          <li>Πάτα <strong>"Νέος Συνεργάτης"</strong></li>
          <li>Συμπλήρωσε: Όνομα, τηλέφωνο, ειδικότητα</li>
          <li>Βάλε το <strong>ωρομίσθιο</strong></li>
          <li>Επίλεξε κατάσταση: <strong>Ενεργός</strong> ή Ανενεργός</li>
          <li>Πάτα <strong>"Αποθήκευση"</strong></li>
        </ol>
        
        <p><strong>Σημείωση:</strong> Όταν προσθέτεις εργάτη σε εργασία, υπολογίζεται αυτόματα το εργατικό κόστος.</p>
      `
    },
    
    calendar: {
      title: '📅 Ημερολόγιο',
      content: `
        <h3>Προσθήκη ραντεβού:</h3>
        <ol>
          <li>Πάτα <strong>"Νέα Επίσκεψη"</strong></li>
          <li>Επίλεξε <strong>εργασία</strong> (αν υπάρχει)</li>
          <li>Όρισε <strong>ημερομηνία και ώρα</strong></li>
          <li>Πρόσθεσε σημειώσεις αν χρειάζεται</li>
          <li>Πάτα <strong>"Αποθήκευση"</strong></li>
        </ol>
        
        <h3>Χρήσιμα:</h3>
        <ul>
          <li><strong>Συγχρονισμός:</strong> Δημιουργεί αυτόματα ραντεβού από τις εργασίες</li>
          <li><strong>Κλικ σε ραντεβού:</strong> Προβολή και επεξεργασία</li>
          <li><strong>Σύρε και άφησε:</strong> Αλλαγή ημερομηνίας</li>
        </ul>
      `
    },
    
    map: {
      title: '🗺️ Χάρτης',
      content: `
        <p>Ο χάρτης δείχνει:</p>
        <ul>
          <li><strong>Μπλε pins:</strong> Πελάτες με διεύθυνση</li>
          <li><strong>Πράσινα pins:</strong> Επισκέψεις επόμενων 7 ημερών</li>
          <li><strong>Κόκκινα pins:</strong> Σημερινές επισκέψεις</li>
        </ul>
        
        <h3>Τι μπορείς να κάνεις:</h3>
        <ul>
          <li><strong>Κλικ σε pin:</strong> Δες στοιχεία πελάτη/εργασίας</li>
          <li><strong>Κουμπί "Οδηγίες":</strong> Άνοιγμα στο Google Maps</li>
          <li><strong>Φίλτρα:</strong> Εμφάνιση/απόκρυψη κατηγοριών</li>
        </ul>
      `
    },
    
    statistics: {
      title: '📊 Στατιστικά',
      content: `
        <p>Βλέπεις αναλυτικά:</p>
        <ul>
          <li><strong>Έσοδα ανά μήνα:</strong> Γράφημα εισπράξεων</li>
          <li><strong>Κέρδη:</strong> Έσοδα μείον έξοδα</li>
          <li><strong>Εργασίες:</strong> Πόσες ολοκληρώθηκαν</li>
          <li><strong>Top υλικά:</strong> Τα πιο δημοφιλή</li>
          <li><strong>Κερδοφόρες εργασίες:</strong> Οι πιο επικερδείς</li>
        </ul>
        
        <p><strong>Φίλτρο έτους:</strong> Επίλεξε έτος για να δεις τα στατιστικά του.</p>
      `
    },
    
    settings: {
      title: '⚙️ Ρυθμίσεις',
      content: `
        <h3>Στοιχεία επιχείρησης:</h3>
        <ul>
          <li>Όνομα, ΑΦΜ, Διεύθυνση</li>
          <li>Τηλέφωνο, Email</li>
          <li>Εμφανίζονται σε τιμολόγια και προσφορές</li>
        </ul>
        
        <h3>Προεπιλεγμένες τιμές:</h3>
        <ul>
          <li><strong>Ωρομίσθιο:</strong> Η βασική χρέωση ανά ώρα</li>
          <li><strong>ΦΠΑ:</strong> Συνήθως 24%</li>
          <li><strong>Κόστος χιλιομέτρου:</strong> Για μετακινήσεις</li>
        </ul>
        
        <h3>Backup:</h3>
        <ul>
          <li><strong>Εξαγωγή JSON:</strong> Αντίγραφο ασφαλείας</li>
          <li><strong>Εισαγωγή JSON:</strong> Επαναφορά δεδομένων</li>
          <li><strong>Κάνε backup τακτικά!</strong></li>
        </ul>
      `
    },
    
    tips: {
      title: '💡 Χρήσιμες Συμβουλές',
      content: `
        <ul>
          <li>🔍 <strong>Αναζήτηση:</strong> Χρησιμοποίησέ την για να βρεις γρήγορα ό,τι χρειάζεσαι</li>
          <li>💾 <strong>Backup:</strong> Κάνε εξαγωγή δεδομένων κάθε εβδομάδα</li>
          <li>📍 <strong>Διευθύνσεις:</strong> Βάλε πλήρη διεύθυνση για ακριβή χάρτη</li>
          <li>📅 <strong>Ημερολόγιο:</strong> Χρησιμοποίησέ το για να μη ξεχνάς ραντεβού</li>
          <li>💰 <strong>Κόστη:</strong> Συμπλήρωσε πάντα τα κόστη για σωστά στατιστικά</li>
          <li>✅ <strong>Κατάσταση:</strong> Ενημέρωσε την κατάσταση των εργασιών</li>
        </ul>
      `
    }
  },

  render(container) {
    container.innerHTML = `
      <div class="help-view">
        <div class="help-container">
          <!-- Sidebar Navigation -->
          <aside class="help-sidebar">
            <div class="help-sidebar-header">
              <h2><i class="fas fa-question-circle"></i> Οδηγός Χρήσης</h2>
            </div>
            <nav class="help-nav">
              <button class="help-nav-item active" data-section="intro">
                <i class="fas fa-home"></i> Εισαγωγή
              </button>
              <button class="help-nav-item" data-section="navigation">
                <i class="fas fa-compass"></i> Πλοήγηση
              </button>
              <button class="help-nav-item" data-section="clients">
                <i class="fas fa-users"></i> Πελάτες
              </button>
              <button class="help-nav-item" data-section="jobs">
                <i class="fas fa-briefcase"></i> Εργασίες
              </button>
              <button class="help-nav-item" data-section="workers">
                <i class="fas fa-hard-hat"></i> Προσωπικό
              </button>
              <button class="help-nav-item" data-section="calendar">
                <i class="fas fa-calendar-alt"></i> Ημερολόγιο
              </button>
              <button class="help-nav-item" data-section="map">
                <i class="fas fa-map-marked-alt"></i> Χάρτης
              </button>
              <button class="help-nav-item" data-section="statistics">
                <i class="fas fa-chart-bar"></i> Στατιστικά
              </button>
              <button class="help-nav-item" data-section="settings">
                <i class="fas fa-cog"></i> Ρυθμίσεις
              </button>
              <button class="help-nav-item" data-section="tips">
                <i class="fas fa-lightbulb"></i> Συμβουλές
              </button>
            </nav>
          </aside>

          <!-- Content Area -->
          <main class="help-content">
            <div id="helpContentArea">
              ${this.renderSection('intro')}
            </div>
          </main>
        </div>
      </div>
    `;

    this.setupNavigation();
  },

  renderSection(sectionId) {
    const content = this.helpContent[sectionId];
    if (!content) return '<p>Δεν βρέθηκε περιεχόμενο.</p>';
    
    return `
      <div class="help-section" data-section="${sectionId}">
        <h1>${content.title}</h1>
        <div class="help-section-content">
          ${content.content}
        </div>
      </div>
    `;
  },

  setupNavigation() {
    const navItems = document.querySelectorAll('.help-nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const section = item.dataset.section;
        
        // Update active state
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        // Update content
        const contentArea = document.getElementById('helpContentArea');
        contentArea.innerHTML = this.renderSection(section);
        
        // Scroll to top
        contentArea.scrollTo({ top: 0, behavior: 'smooth' });
        
        this.currentSection = section;
      });
    });
  },

  cleanup() {
    // Nothing to cleanup
  }
};
