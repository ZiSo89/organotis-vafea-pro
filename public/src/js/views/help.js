/* ========================================
   Help View - Οδηγός Χρήσης
   ======================================== */

window.HelpView = {
  currentSection: 'intro',

  // Help content organized by section
  helpContent: {
    intro: {
      title: '🎨 Καλώς ήρθες στο Τέχνη και Χρώμα',
      content: `
        <p>Αυτό το πρόγραμμα σε βοηθά να διαχειρίζεσαι:</p>
        <ul>
          <li>Τους πελάτες σου</li>
          <li>Τις εργασίες και τα έργα</li>
          <li>Το προσωπικό σου</li>
          <li>Τα ραντεβού και το ημερολόγιο</li>
          <li>Τους προμηθευτές, τις αγορές και τις πληρωμές</li>
          <li>Τη φυσική αποθήκη με υλικά και κινήσεις stock</li>
          <li>Τα οικονομικά και τα στατιστικά</li>
        </ul>
        <p><strong>Η λογική πλέον είναι χωρίς ΦΠΑ:</strong> βλέπεις έσοδα, έξοδα και κέρδος καθαρά, με βάση υλικά, υπαλλήλους, μετακινήσεις και χρέωση εργασίας.</p>
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
          <li><strong>Προμηθευτές:</strong> Καταστήματα, αγορές υλικών και πληρωμές</li>
          <li><strong>Αποθήκη:</strong> Φυσικό stock υλικών και ιστορικό κινήσεων</li>
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
          <li>Συμπλήρωσε το <strong>Ονοματεπώνυμο</strong> και, αν υπάρχουν, τηλέφωνο και email</li>
          <li>Βάλε <strong>διεύθυνση, πόλη και Τ.Κ.</strong> για να εμφανιστεί σωστά στο χάρτη</li>
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
          <li>Στο tab <strong>Βασικά</strong>, επίλεξε πελάτη, κατάσταση και επόμενη επίσκεψη. Η διεύθυνση έρχεται αυτόματα από τον πελάτη.</li>
          <li>Αν η επίσκεψη κρατάει πολλές μέρες, βάλε και <strong>Λήξη Επίσκεψης</strong>. Αν δεν είναι ολοήμερη, ξετσέκαρε το <strong>Ολοήμερη επίσκεψη</strong> και βάλε ώρες.</li>
          <li>Στο tab <strong>Εργασία & Υλικά</strong>, συμπλήρωσε δωμάτια, τετραγωνικά και πρόσθεσε υλικά.</li>
          <li>Για υλικό που πρέπει να φύγει από τη φυσική αποθήκη, διάλεξε υλικό που ταιριάζει με την <strong>Αποθήκη</strong> και τσέκαρε <strong>"Αφαίρεση από αποθήκη"</strong>.</li>
          <li>Στο tab <strong>Κόστος & Εργάτες</strong>, πρόσθεσε εργάτες, ώρες και διάλεξε τρόπο χρέωσης: <strong>Χρέωση με ώρες</strong> ή <strong>Συμφωνημένη τιμή</strong>.</li>
          <li>Έλεγξε τη <strong>Σύνοψη</strong> για έξοδα, έσοδα, καθαρό κέρδος και αξία χρόνου ιδιοκτήτη.</li>
          <li>Στο tab <strong>Σημειώσεις</strong>, γράψε ό,τι πρέπει να θυμάσαι για την εργασία.</li>
          <li>Πάτα <strong>"Αποθήκευση"</strong></li>
        </ol>

        <h3>Αναλυτικό παράδειγμα καταχώρησης:</h3>
        <p><strong>Παράδειγμα:</strong> Ο πελάτης «κ. Παπαδόπουλος Γιώργος» θέλει βάψιμο σαλονιού και υπνοδωματίου σε διαμέρισμα 55 m².</p>
        <ol>
          <li>Πριν ξεκινήσεις, βεβαιώσου ότι υπάρχει ο πελάτης στους <strong>Πελάτες</strong>, με σωστή διεύθυνση. Αν θα αφαιρέσεις υλικά από stock, βεβαιώσου ότι υπάρχουν πρώτα στην <strong>Αποθήκη</strong>.</li>
          <li>Πάτα <strong>"Νέα Εργασία"</strong>.</li>
          <li>Στο tab <strong>Βασικά</strong>, διάλεξε πελάτη «κ. Παπαδόπουλος Γιώργος». Η διεύθυνση συμπληρώνεται αυτόματα.</li>
          <li>Βάλε κατάσταση <strong>Προγραμματισμένη</strong>, <strong>Επόμενη Επίσκεψη</strong> 18/06/2026 και <strong>Λήξη Επίσκεψης</strong> 19/06/2026 αν η δουλειά κρατήσει δύο μέρες.</li>
          <li>Αν έχεις συγκεκριμένο ωράριο, ξετσέκαρε το <strong>Ολοήμερη επίσκεψη</strong> και γράψε π.χ. ώρα από 08:30 έως 15:00.</li>
          <li>Πάτα <strong>Επόμενο: Εργασία & Υλικά</strong>. Βάλε <strong>Αριθμός Δωματίων</strong> 2 και <strong>Τετραγωνικά</strong> 55.</li>
          <li>Πάτα <strong>Προσθήκη Υλικού</strong> και πρόσθεσε π.χ. «Πλαστικό λευκό», ποσότητα 10 λίτρα, κόστος 65 €. Αν υπάρχει στην αποθήκη και θα χρησιμοποιηθεί πραγματικά, τσέκαρε <strong>Αφαίρεση από αποθήκη</strong>.</li>
          <li>Πρόσθεσε δεύτερο υλικό, π.χ. «Χαρτοταινία», ποσότητα 3 τεμάχια, κόστος 9 €. Το <strong>Κόστος Υλικών</strong> θα ενημερωθεί στη συνέχεια από το άθροισμα των υλικών.</li>
          <li>Πάτα <strong>Επόμενο: Κόστος & Εργάτες</strong> και μετά <strong>Προσθήκη Εργάτη</strong>. Πρόσθεσε π.χ. έναν υπάλληλο για 8 ώρες με 15 €/ώρα και τον ιδιοκτήτη για 8 ώρες.</li>
          <li>Άφησε <strong>Χρέωση με ώρες</strong> αν χρεώνεις με ώρα. Αν οι συνολικές ώρες είναι 16 και η τιμή χρέωσης/ώρα είναι 45 €, τα έσοδα θα είναι 720 €.</li>
          <li>Αν έχεις συμφωνήσει συνολική τιμή, διάλεξε <strong>Συμφωνημένη τιμή</strong> και γράψε π.χ. 700 €. Τότε τα έσοδα μένουν 700 €, ανεξάρτητα από τις ώρες.</li>
          <li>Βάλε <strong>Χιλιόμετρα</strong> π.χ. 12. Η μετακίνηση υπολογίζεται με βάση το κόστος χιλιομέτρου από τις Ρυθμίσεις.</li>
          <li>Έλεγξε τη <strong>Σύνοψη</strong>: τα έξοδα περιλαμβάνουν υλικά, υπαλλήλους και μετακίνηση. Οι ώρες ιδιοκτήτη δεν μπαίνουν στα έξοδα προσωπικού, αλλά φαίνονται στην κάρτα <strong>Κόστος Ιδιοκτήτη</strong>.</li>
          <li>Στο tab <strong>Σημειώσεις</strong>, γράψε π.χ. «Ο πελάτης θέλει ματ τελείωμα και κάλυψη επίπλων».</li>
          <li>Πάτα <strong>Αποθήκευση</strong>.</li>
          <li>Μετά την πρώτη αποθήκευση, μπορείς να ανοίξεις ξανά την εργασία και να χρησιμοποιήσεις <strong>Καταχώρηση Επίσκεψης</strong> για πραγματικές επισκέψεις/ώρες ή <strong>Καταχώρηση Πληρωμής</strong> για προκαταβολή και εξόφληση.</li>
        </ol>

        <h3>Υλικά εργασίας:</h3>
        <ul>
          <li>Τα υλικά αντικατέστησαν τα παλιά "χρώματα".</li>
          <li>Το <strong>Κόστος Υλικών</strong> συμπληρώνεται αυτόματα από το άθροισμα των υλικών.</li>
          <li>Μπορείς να αυξήσεις το κόστος υλικών χειροκίνητα για έξτρα έξοδα, αλλά δεν πρέπει να πέφτει κάτω από το άθροισμα των καταχωρημένων υλικών.</li>
          <li>Για να αφαιρεθεί stock, το υλικό πρέπει να ταιριάζει με υλικό που υπάρχει στη σελίδα <strong>Αποθήκη</strong>.</li>
          <li>Η αφαίρεση από αποθήκη γίνεται μία φορά για κάθε υλικό και κρατάει κίνηση στο ιστορικό αποθήκης.</li>
        </ul>

        <h3>Οικονομική λογική:</h3>
        <ul>
          <li><strong>Έσοδα με ώρες:</strong> Ώρες χρέωσης × Τιμή χρέωσης/ώρα.</li>
          <li><strong>Έσοδα με συμφωνημένη τιμή:</strong> Η συμφωνημένη τιμή που έβαλες στην εργασία.</li>
          <li><strong>Έξοδα:</strong> Υλικά + υπάλληλοι + μετακίνηση.</li>
          <li><strong>Κέρδος:</strong> Έσοδα - έξοδα.</li>
          <li><strong>Ιδιοκτήτης:</strong> Οι ώρες ιδιοκτήτη δεν μετράνε σαν έξοδο προσωπικού.</li>
          <li><strong>Υπάλληλος:</strong> Οι ώρες υπαλλήλου μετράνε σαν έξοδο.</li>
          <li><strong>ΦΠΑ:</strong> Έχει αφαιρεθεί από το UI και τους υπολογισμούς.</li>
        </ul>

        <h3>Επισκέψεις και πληρωμές:</h3>
        <ul>
          <li>Οι <strong>Επόμενη Επίσκεψη</strong> και <strong>Λήξη Επίσκεψης</strong> συγχρονίζονται αυτόματα με το ημερολόγιο.</li>
          <li>Οι <strong>Πληρωμές Πελάτη</strong> ανοίγουν αφού αποθηκευτεί η εργασία, ώστε να γράφεις προκαταβολές, έναντι και εξοφλήσεις.</li>
          <li>Όταν το υπόλοιπο μηδενιστεί, η εργασία μπορεί να εμφανιστεί ως <strong>Εξοφλήθηκε</strong>.</li>
        </ul>
        
        <h3>Κατάσταση εργασίας:</h3>
        <ul>
          <li><strong>Υποψήφιος:</strong> Πιθανή εργασία που δεν έχει κλείσει ακόμα.</li>
          <li><strong>Προγραμματισμένη:</strong> Έχει οριστεί επίσκεψη ή ημερομηνία.</li>
          <li><strong>Σε εξέλιξη:</strong> Η εργασία τρέχει τώρα.</li>
          <li><strong>Σε αναμονή:</strong> Περιμένει κάτι πριν συνεχίσει.</li>
          <li><strong>Ολοκληρώθηκε:</strong> Η εργασία τελείωσε, αλλά μπορεί να υπάρχει υπόλοιπο πληρωμής.</li>
          <li><strong>Εξοφλήθηκε:</strong> Η χρέωση έχει πληρωθεί πλήρως.</li>
          <li><strong>Ακυρώθηκε:</strong> Η εργασία δεν θα γίνει ή ακυρώθηκε.</li>
        </ul>
      `
    },
    
    workers: {
      title: '👷 Προσωπικό',
      content: `
        <h3>Προσθήκη εργάτη:</h3>
        <ol>
          <li>Πάτα <strong>"Νέος Εργάτης"</strong></li>
          <li>Συμπλήρωσε <strong>Ονοματεπώνυμο</strong> και <strong>Τηλέφωνο</strong></li>
          <li>Βάλε το <strong>ωρομίσθιο</strong></li>
          <li>Επίλεξε <strong>Τύπος Προσωπικού</strong>: Υπάλληλος ή Ιδιοκτήτης</li>
          <li>Επίλεξε κατάσταση: <strong>Ενεργός</strong> ή Ανενεργός</li>
          <li>Προαιρετικά βάλε ημερομηνία πρόσληψης και σημειώσεις</li>
          <li>Πάτα <strong>"Αποθήκευση"</strong></li>
        </ol>
        
        <h3>Πώς επηρεάζει τα οικονομικά:</h3>
        <ul>
          <li><strong>Υπάλληλος:</strong> Οι ώρες του είναι έξοδο και μειώνουν το κέρδος.</li>
          <li><strong>Ιδιοκτήτης:</strong> Οι ώρες του δεν υπολογίζονται σαν εργατικό έξοδο.</li>
          <li>Οι ώρες όλων βοηθούν να συμπληρώνονται αυτόματα οι <strong>Ώρες Χρέωσης</strong> στην εργασία.</li>
        </ul>
      `
    },

    suppliers: {
      title: '🏪 Προμηθευτές',
      content: `
        <p>Η παλιά σελίδα <strong>Αποθήκη</strong> μετονομάστηκε σε <strong>Προμηθευτές</strong>. Εκεί διαχειρίζεσαι τα καταστήματα από όπου αγοράζεις υλικά.</p>

        <h3>Τι μπορείς να κάνεις:</h3>
        <ul>
          <li><strong>Καταστήματα:</strong> Καταχώρηση προμηθευτών/χρωματοπωλείων.</li>
          <li><strong>Αγορές:</strong> Καταχώρηση υλικών που αγόρασες από κάθε κατάστημα.</li>
          <li><strong>Πληρωμές:</strong> Καταχώρηση πληρωμών προς προμηθευτές.</li>
          <li><strong>Υπόλοιπα:</strong> Βλέπεις τι έχεις αγοράσει, τι έχεις πληρώσει και τι χρωστάς ακόμα.</li>
        </ul>

        <h3>Καταχώρηση αγοράς:</h3>
        <ol>
          <li>Πήγαινε στους <strong>Προμηθευτές</strong>.</li>
          <li>Άνοιξε το tab <strong>Αγορές</strong>.</li>
          <li>Επίλεξε κατάστημα και πρόσθεσε υλικά αγοράς.</li>
          <li>Διάλεξε κατάσταση πληρωμής: <strong>Δεν πληρώθηκε</strong>, <strong>Πληρώθηκε όλο</strong> ή <strong>Πληρώθηκε μέρος</strong>.</li>
          <li>Πάτα <strong>Καταχώρηση Αγοράς</strong>.</li>
        </ol>

        <p><strong>Σημαντικό:</strong> Οι αγορές αυξάνουν αυτόματα το stock στη νέα σελίδα <strong>Αποθήκη</strong> και γράφουν κίνηση στο ιστορικό.</p>
      `
    },

    inventory: {
      title: '📦 Αποθήκη',
      content: `
        <p>Η νέα σελίδα <strong>Αποθήκη</strong> είναι μόνο για τη φυσική σου αποθήκη: τι υλικά έχεις και πόση ποσότητα υπάρχει διαθέσιμη.</p>

        <h3>Υλικά/Stock:</h3>
        <ul>
          <li>Καταγράφεις υλικά όπως χρώματα, αστάρια, στόκους, ρολά, ταινίες και αναλώσιμα.</li>
          <li>Η βασική μονάδα είναι κυρίως <strong>λίτρα</strong>, αλλά μπορείς να γράψεις και τεμάχια, kg ή άλλη μονάδα.</li>
          <li>Βλέπεις ποσότητα, μονάδα, τιμή/μονάδα και αξία αποθήκης.</li>
          <li>Δεν υπάρχουν ειδοποιήσεις χαμηλού αποθέματος, επειδή δεν τις θέλεις προς το παρόν.</li>
        </ul>

        <h3>Κινήσεις αποθήκης:</h3>
        <ul>
          <li><strong>Προσθήκη:</strong> Βάζεις ποσότητα στην αποθήκη.</li>
          <li><strong>Αφαίρεση:</strong> Αφαιρείς ποσότητα όταν χρησιμοποιήθηκε ή χάθηκε.</li>
          <li><strong>Διόρθωση απογραφής:</strong> Ορίζεις τη νέα πραγματική ποσότητα μετά από μέτρηση.</li>
          <li>Κάθε κίνηση κρατάει ιστορικό: ημερομηνία, υλικό, ποσότητα, πριν/μετά και σημειώσεις.</li>
        </ul>

        <h3>Σύνδεση με εργασίες:</h3>
        <p>Στην εργασία υπάρχει checkbox <strong>"Αφαίρεση από αποθήκη"</strong>. Αν το τσεκάρεις, τα υλικά που είναι συνδεδεμένα με την Αποθήκη αφαιρούνται από το stock και γράφεται κίνηση ιστορικού.</p>
      `
    },
    
    calendar: {
      title: '📅 Ημερολόγιο',
      content: `
        <h3>Προσθήκη ραντεβού:</h3>
        <p>Τα ραντεβού δημιουργούνται <strong>αυτόματα</strong> όταν προσθέτεις ή επεξεργάζεσαι μια <strong>Εργασία</strong> με «Επόμενη Επίσκεψη».</p>
        <ol>
          <li>Πήγαινε στο tab <strong>Εργασίες</strong></li>
          <li>Δημιούργησε ή επεξεργάσου εργασία</li>
          <li>Όρισε <strong>Επόμενη Επίσκεψη</strong>, <strong>Λήξη Επίσκεψης</strong> αν είναι πολυήμερη, και ώρα αν χρειάζεται</li>
          <li>Αποθήκευσε — εμφανίζεται αυτόματα στο ημερολόγιο</li>
        </ol>
        
        <h3>Χρήσιμα:</h3>
        <ul>
          <li><strong>Αυτόματος συγχρονισμός:</strong> Κάθε αλλαγή εργασίας ενημερώνει το ημερολόγιο</li>
          <li><strong>Κλικ σε ραντεβού:</strong> Προβολή και επεξεργασία ημερομηνιών/ωρών</li>
          <li><strong>Σύρε και άφησε:</strong> Αλλαγή ημερομηνίας</li>
          <li><strong>Google Calendar:</strong> Αν είναι συνδεδεμένο, μπορείς να εισάγεις/συγχρονίζεις επισκέψεις με το Google Calendar.</li>
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
          <li><strong>Κέρδη:</strong> Έσοδα μείον έξοδα, χωρίς ΦΠΑ</li>
          <li><strong>Εργασίες:</strong> Πόσες ολοκληρώθηκαν</li>
          <li><strong>Υλικά:</strong> Κόστη υλικών από τις εργασίες</li>
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
          <li><strong>Κόστος χιλιομέτρου:</strong> Για μετακινήσεις</li>
        </ul>
        
        <h3>Backup:</h3>
        <ul>
          <li><strong>Εξαγωγή JSON:</strong> Αντίγραφο ασφαλείας</li>
          <li><strong>Εισαγωγή JSON:</strong> Επαναφορά δεδομένων</li>
          <li>Το backup περιλαμβάνει πελάτες, εργασίες, υλικά, προμηθευτές, αγορές, πληρωμές και κινήσεις αποθήκης.</li>
          <li><strong>Κάνε backup τακτικά!</strong></li>
        </ul>

        <h3>Excel export:</h3>
        <ul>
          <li>Εξάγει αναφορές με πελάτες, προσωπικό, υλικά, προμηθευτές, αγορές, πληρωμές και κινήσεις αποθήκης.</li>
          <li>Χρησιμοποίησέ το για έλεγχο δεδομένων ή οικονομική εικόνα.</li>
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
          <li>📦 <strong>Αποθήκη:</strong> Όταν χρησιμοποιείς πραγματικό υλικό, τσέκαρε "Αφαίρεση από αποθήκη" στην εργασία</li>
          <li>🏪 <strong>Προμηθευτές:</strong> Καταχώρησε τις αγορές και τις πληρωμές για να βλέπεις υπόλοιπα</li>
          <li>✅ <strong>Κατάσταση:</strong> Ενημέρωσε την κατάσταση των εργασιών</li>
        </ul>
      `
    }
  },

  render(container) {
    const sectionButtons = Object.keys(this.helpContent).map(key => {
      const item = this.helpContent[key];
      const iconMatch = item.title.match(/^\S+/);
      const label = item.title.replace(/^\S+\s*/, '');
      return `<button type="button" class="help-mobile-nav-btn" data-section="${key}">${Utils.escapeHtml(label)}</button>`;
    }).join('');

    container.innerHTML = `
      <div class="help-view">
        <div class="help-mobile-nav">
          <details class="ui-accordion-item">
            <summary class="ui-accordion-summary"><i class="fas fa-list"></i> Μενού οδηγού</summary>
            <div class="help-mobile-nav-list">${sectionButtons}</div>
          </details>
        </div>
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
              <button class="help-nav-item" data-section="suppliers">
                <i class="fas fa-store"></i> Προμηθευτές
              </button>
              <button class="help-nav-item" data-section="inventory">
                <i class="fas fa-warehouse"></i> Αποθήκη
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
    this.setupMobileNavigation();
  },

  setupMobileNavigation() {
    document.querySelectorAll('.help-mobile-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const section = btn.dataset.section;
        document.querySelectorAll('.help-nav-item').forEach(nav => {
          nav.classList.toggle('active', nav.dataset.section === section);
        });
        const contentArea = document.getElementById('helpContentArea');
        if (contentArea) {
          contentArea.innerHTML = this.renderSection(section);
        }
        this.currentSection = section;
        contentArea?.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
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
