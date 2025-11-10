/* ========================================
   Calendar View - Ημερολόγιο Εργασιών
   ======================================== */

window.CalendarView = {
  calendar: null,
  isSwipeInProgress: false, // Track swipe gestures to prevent accidental modal opens
  
  /* ========================================
     Ελληνικές Αργίες 2025-2026
     ======================================== */
  greekHolidays: [
    // 2025
    { date: '2025-01-01', title: 'Πρωτοχρονιά' },
    { date: '2025-01-06', title: 'Θεοφάνεια' },
    { date: '2025-03-03', title: 'Καθαρά Δευτέρα' },
    { date: '2025-03-25', title: '25η Μαρτίου' },
    { date: '2025-04-18', title: 'Μεγάλη Παρασκευή' },
    { date: '2025-04-20', title: 'Κυριακή του Πάσχα' },
    { date: '2025-04-21', title: 'Δευτέρα του Πάσχα' },
    { date: '2025-05-01', title: 'Πρωτομαγιά' },
    { date: '2025-06-08', title: 'Αγίου Πνεύματος' },
    { date: '2025-08-15', title: 'Κοίμηση Θεοτόκου' },
    { date: '2025-10-28', title: '28η Οκτωβρίου' },
    { date: '2025-12-25', title: 'Χριστούγεννα' },
    { date: '2025-12-26', title: 'Σύναξη Θεοτόκου' },
    // 2026
    { date: '2026-01-01', title: 'Πρωτοχρονιά' },
    { date: '2026-01-06', title: 'Θεοφάνεια' },
    { date: '2026-02-23', title: 'Καθαρά Δευτέρα' },
    { date: '2026-03-25', title: '25η Μαρτίου' },
    { date: '2026-04-10', title: 'Μεγάλη Παρασκευή' },
    { date: '2026-04-12', title: 'Κυριακή του Πάσχα' },
    { date: '2026-04-13', title: 'Δευτέρα του Πάσχα' },
    { date: '2026-05-01', title: 'Πρωτομαγιά' },
    { date: '2026-06-01', title: 'Αγίου Πνεύματος' },
    { date: '2026-08-15', title: 'Κοίμηση Θεοτόκου' },
    { date: '2026-10-28', title: '28η Οκτωβρίου' },
    { date: '2026-12-25', title: 'Χριστούγεννα' },
    { date: '2026-12-26', title: 'Σύναξη Θεοτόκου' }
  ],

  /* ========================================
     Render - Κύρια Συνάρτηση
     ======================================== */
  async render(container, params = {}) {
    console.log('📅 Calendar View Rendering...', params);
    
    container.innerHTML = `
      <div class="view-header">
        <h1><i class="fas fa-calendar-alt"></i> Ημερολόγιο Επισκέψεων</h1>
        <button class="btn btn-primary" id="addVisitBtn">
          <i class="fas fa-plus"></i> Νέα Επίσκεψη
        </button>
      </div>
      
      <div class="calendar-container">
        <!-- Λίστα Επόμενων Επισκέψεων -->
        <div class="upcoming-visits-panel">
          <h2><i class="fas fa-clock"></i> Επόμενες Επισκέψεις</h2>
          <div id="upcomingVisitsList" class="upcoming-visits-list">
            <div class="loading">Φόρτωση...</div>
          </div>
        </div>
        
        <!-- FullCalendar -->
        <div class="calendar-main">
          <div id="calendar"></div>
        </div>
      </div>
    `;

    // Initialize calendar
    await this.initCalendar();
    
    // Load upcoming visits
    await this.loadUpcomingVisits();
    
    // Event listeners
    document.getElementById('addVisitBtn').addEventListener('click', () => {
      this.showAddVisitModal();
    });
  },

  /* ========================================
     Initialize FullCalendar
     ======================================== */
  async initCalendar() {
    const calendarEl = document.getElementById('calendar');
    
    // Detect mobile device
    const isMobile = window.innerWidth <= 768;
    
    this.calendar = new FullCalendar.Calendar(calendarEl, {
      locale: 'el',
      initialView: isMobile ? 'timeGridDay' : 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: isMobile ? 'dayGridMonth,timeGridDay' : 'dayGridMonth,timeGridWeek,timeGridDay'
      },
      buttonText: {
        today: 'Σήμερα',
        month: 'Μήνας',
        week: 'Εβδομάδα',
        day: 'Ημέρα'
      },
      height: 'auto',
      firstDay: 1, // Δευτέρα
      weekNumbers: !isMobile, // Κρύψε week numbers σε mobile
      weekText: 'Εβδ.',
      editable: !isMobile, // Απενεργοποίηση drag σε mobile
      selectable: true,
      selectMirror: true,
      dayMaxEvents: isMobile ? 3 : true, // Περιορισμός events σε mobile
      moreLinkClick: 'popover', // Click on "more" shows popover
      eventMaxStack: isMobile ? 3 : 2, // Max events visible before showing "more"
      
      // Touch-friendly settings
      longPressDelay: 500,
      eventLongPressDelay: 500,
      selectLongPressDelay: 500,
      
      // Event sources
      events: async (info, successCallback, failureCallback) => {
        try {
          const events = await this.loadEvents(info.start, info.end);
          successCallback(events);
        } catch (error) {
          console.error('Error loading events:', error);
          failureCallback(error);
        }
      },
      
      // Event click - Only on deliberate click
      eventClick: (info) => {
        // Prevent opening modal if it was part of a swipe gesture
        if (this.isSwipeInProgress) {
          return;
        }
        
        // Add small delay to distinguish from scroll
        setTimeout(() => {
          if (!this.isSwipeInProgress) {
            this.showEventDetails(info.event);
          }
        }, 100);
      },
      
      // Event mouse enter - show tooltip
      eventMouseEnter: (info) => {
        const props = info.event.extendedProps || {};
        const tooltip = `${info.event.title}${props.client_name ? '\n👤 ' + props.client_name : ''}${props.address ? '\n📍 ' + props.address : ''}`;
        info.el.title = tooltip;
      },
      
      // Date click - Δημιουργία νέας επίσκεψης (only deliberate)
      dateClick: (info) => {
        if (this.isSwipeInProgress) {
          return;
        }
        
        setTimeout(() => {
          if (!this.isSwipeInProgress) {
            this.showAddVisitModal(info.dateStr);
          }
        }, 100);
      },
      
      // Event drag & drop
      eventDrop: async (info) => {
        await this.updateEventDates(info.event);
      },
      
      // Event resize
      eventResize: async (info) => {
        await this.updateEventDates(info.event);
      },
      
      // Date select
      select: (info) => {
        if (this.isSwipeInProgress) {
          return;
        }
        this.showAddVisitModal(info.startStr, info.endStr);
      }
    });
    
    this.calendar.render();
    
    // Handle window resize for responsive behavior
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
    
    // Add touch gestures for mobile
    if (window.innerWidth <= 768) {
      this.addTouchGestures();
      this.addScrollHintRemoval();
    }
  },

  /* ========================================
     Add Scroll Hint Removal
     ======================================== */
  addScrollHintRemoval() {
    const calendarMain = document.querySelector('.calendar-main');
    if (!calendarMain) return;
    
    calendarMain.addEventListener('scroll', () => {
      calendarMain.classList.add('scrolled');
    }, { once: true, passive: true });
  },

  /* ========================================
     Add Touch Gestures for Mobile
     ======================================== */
  addTouchGestures() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;
    
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    let touchStartTime = 0;
    const minSwipeDistance = 80; // Μεγαλύτερη απόσταση για να αποφύγουμε accidental swipes
    
    calendarEl.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
      touchStartTime = Date.now();
      this.isSwipeInProgress = false;
    }, { passive: true });
    
    calendarEl.addEventListener('touchmove', (e) => {
      // Detect if user is swiping (not just tapping)
      const currentX = e.changedTouches[0].screenX;
      const deltaX = Math.abs(currentX - touchStartX);
      
      if (deltaX > 10) { // 10px threshold for swipe detection
        this.isSwipeInProgress = true;
      }
    }, { passive: true });
    
    calendarEl.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      
      const touchDuration = Date.now() - touchStartTime;
      
      // If it was a quick tap (< 200ms) and minimal movement, allow clicks
      if (touchDuration < 200 && Math.abs(touchEndX - touchStartX) < 10) {
        this.isSwipeInProgress = false;
      } else {
        this.handleSwipe(touchStartX, touchEndX, touchStartY, touchEndY, minSwipeDistance);
      }
      
      // Reset flag after a short delay
      setTimeout(() => {
        this.isSwipeInProgress = false;
      }, 300);
    }, { passive: true });
  },

  /* ========================================
     Handle Swipe Gestures
     ======================================== */
  handleSwipe(startX, endX, startY, endY, minDistance) {
    if (!this.calendar) return;
    
    const swipeDistanceX = endX - startX;
    const swipeDistanceY = Math.abs(endY - startY);
    
    // Αγνόησε αν είναι κάθετο scroll
    if (swipeDistanceY > Math.abs(swipeDistanceX)) return;
    
    // Αγνόησε αν η απόσταση είναι πολύ μικρή
    if (Math.abs(swipeDistanceX) < minDistance) return;
    
    if (swipeDistanceX > 0) {
      // Swipe right - previous
      this.calendar.prev();
    } else {
      // Swipe left - next
      this.calendar.next();
    }
  },

  /* ========================================
     Handle Responsive Resize
     ======================================== */
  handleResize() {
    if (!this.calendar) return;
    
    const isMobile = window.innerWidth <= 768;
    const currentView = this.calendar.view.type;
    
    // Switch to appropriate view for screen size
    if (isMobile && currentView === 'timeGridWeek') {
      this.calendar.changeView('timeGridDay');
    }
    
    // Update calendar options based on screen size
    this.calendar.setOption('editable', !isMobile);
    this.calendar.setOption('weekNumbers', !isMobile);
  },

  /* ========================================
     Load Events from API
     ======================================== */
  async loadEvents(start, end) {
    try {
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];
      
      console.log(`🔄 Loading events: ${startStr} to ${endStr}`);
      
      const response = await API.get(`/api/calendar.php?start=${startStr}&end=${endStr}`);
      
      console.log(`✅ Loaded ${response.length} events`);
      
      // Προσθήκη ελληνικών αργιών
      const holidays = this.greekHolidays
        .filter(h => h.date >= startStr && h.date <= endStr)
        .map(h => ({
          title: '🇬🇷 ' + h.title,
          start: h.date,
          display: 'background',
          backgroundColor: '#ef444410',
          borderColor: '#ef4444',
          classNames: ['holiday-event'],
          allDay: true
        }));
      
      return [...response, ...holidays];
      
    } catch (error) {
      console.error('❌ Error loading events:', error);
      Toast.show('Σφάλμα φόρτωσης επισκέψεων', 'error');
      return [];
    }
  },

  /* ========================================
     Load Upcoming Visits
     ======================================== */
  async loadUpcomingVisits() {
    try {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const startStr = today.toISOString().split('T')[0];
      const endStr = futureDate.toISOString().split('T')[0];
      
      const events = await API.get(`/api/calendar.php?start=${startStr}&end=${endStr}`);
      
      // Φιλτράρισμα μόνο μελλοντικών
      const upcoming = events
        .filter(e => new Date(e.start) >= today)
        .sort((a, b) => new Date(a.start) - new Date(b.start))
        .slice(0, 10);
      
      this.renderUpcomingVisits(upcoming);
      
    } catch (error) {
      console.error('Error loading upcoming visits:', error);
      document.getElementById('upcomingVisitsList').innerHTML = 
        '<div class="error">Σφάλμα φόρτωσης</div>';
    }
  },

  /* ========================================
     Render Upcoming Visits List
     ======================================== */
  renderUpcomingVisits(visits) {
    console.log('🔄 renderUpcomingVisits called with', visits.length, 'visits');
    
    const container = document.getElementById('upcomingVisitsList');
    console.log('📦 Container found:', container ? 'YES' : 'NO', container);
    
    if (visits.length === 0) {
      container.innerHTML = `
        <div class="empty-state-small">
          <i class="fas fa-calendar-check"></i>
          <p>Δεν υπάρχουν προγραμματισμένες επισκέψεις</p>
        </div>
      `;
      return;
    }
    
    console.log('📋 Visit IDs being rendered:', visits.map(v => v.id));
    
    // Store visits data for later access
    this._upcomingVisitsData = {};
    visits.forEach(visit => {
      this._upcomingVisitsData[visit.id] = visit;
    });
    
    container.innerHTML = visits.map(visit => {
      const startDate = new Date(visit.start);
      const props = visit.extendedProps || {};
      const normalizedStatus = this.normalizeStatus(props.status);
      
      console.log(`  - Rendering visit ID: ${visit.id}, Title: ${visit.title}`);
      
      return `
        <div class="visit-item" data-event-id="${visit.id}" style="cursor: pointer;">
          <div class="visit-date">
            <div class="visit-day">${startDate.getDate()}</div>
            <div class="visit-month">${startDate.toLocaleDateString('el-GR', { month: 'short' })}</div>
          </div>
          <div class="visit-info">
            <div class="visit-title">${visit.title}</div>
            <div class="visit-details">
              ${props.address ? `<span><i class="fas fa-map-marker-alt"></i> ${props.address}</span>` : ''}
              ${props.client_phone ? `<span><i class="fas fa-phone"></i> ${props.client_phone}</span>` : ''}
            </div>
            <div class="visit-time">${this.formatDateTime(startDate)}</div>
          </div>
          <div class="visit-status">
            <span class="status-badge status-${normalizedStatus}">${this.getStatusText(props.status)}</span>
          </div>
        </div>
      `;
    }).join('');
    
    console.log('✅ HTML rendered, checking items in DOM...');
    const renderedItems = container.querySelectorAll('.visit-item');
    console.log(`📊 Found ${renderedItems.length} items in DOM`);
    renderedItems.forEach((item, index) => {
      const id = item.getAttribute('data-event-id');
      console.log(`  Item ${index}: data-event-id="${id}"`);
    });
    
    // Setup event delegation ONCE on first call
    if (!this._upcomingVisitsSetup) {
      console.log('🆕 Setting up event delegation for the FIRST time');
      this._upcomingVisitsSetup = true;
      
      // Use event delegation on the container (permanent listener)
      container.addEventListener('click', (e) => {
        console.log('🖱️ Click detected on container');
        console.log('  - e.target:', e.target);
        console.log('  - isSwipeInProgress:', this.isSwipeInProgress);
        
        // Prevent if swipe in progress
        if (this.isSwipeInProgress) {
          console.log('❌ Swipe in progress, ignoring click');
          return;
        }
        
        // Find the clicked visit-item (even if clicked on child element)
        const visitItem = e.target.closest('.visit-item');
        console.log('  - Found visit-item:', visitItem ? 'YES' : 'NO');
        if (!visitItem) return;
        
        const eventId = visitItem.getAttribute('data-event-id');
        console.log('  - Event ID from clicked item:', eventId);
        
        if (!eventId) {
          console.warn('⚠️ No event ID found on item');
          return;
        }
        
        console.log('🔍 Looking for visit data with ID:', eventId);
        
        // First try to get from stored data
        let visitData = this._upcomingVisitsData[eventId];
        console.log('  - Found in stored data:', visitData ? 'YES' : 'NO');
        
        if (!visitData) {
          // Fallback: try to get from calendar
          console.log('  - Trying to get from calendar...');
          const event = this.calendar.getEventById(eventId);
          if (event) {
            visitData = {
              id: event.id,
              title: event.title,
              start: event.start,
              end: event.end,
              extendedProps: event.extendedProps
            };
            console.log('  - Found in calendar: YES');
          } else {
            console.error('❌ Event not found in stored data or calendar for ID:', eventId);
            return;
          }
        }
        
        console.log('✅ Opening event details for:', visitData.title);
        
        // Show modal with the visit data
        this.showEventDetailsFromData(visitData);
        
        // Navigate calendar to that date
        this.calendar.gotoDate(visitData.start);
      });
      
      console.log('✅ Upcoming visits event delegation setup complete');
    } else {
      console.log('ℹ️ Event delegation already setup, skipping');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  },

  /* ========================================
     Show Event Details from Raw Data
     ======================================== */
  showEventDetailsFromData(visitData) {
    const props = visitData.extendedProps || {};
    const normalizedStatus = this.normalizeStatus(props.status);
    
    Modal.show({
      title: visitData.title,
      content: `
        <div class="event-details">
          <div class="detail-row">
            <strong><i class="fas fa-calendar"></i> Ημερομηνία:</strong>
            <span>${this.formatDateTime(visitData.start)}</span>
          </div>
          ${visitData.end ? `
            <div class="detail-row">
              <strong><i class="fas fa-calendar-check"></i> Λήξη:</strong>
              <span>${this.formatDateTime(visitData.end)}</span>
            </div>
          ` : ''}
          ${props.client_name ? `
            <div class="detail-row">
              <strong><i class="fas fa-user"></i> Πελάτης:</strong>
              <span>${props.client_name}</span>
            </div>
          ` : ''}
          ${props.client_phone ? `
            <div class="detail-row">
              <strong><i class="fas fa-phone"></i> Τηλέφωνο:</strong>
              <span><a href="tel:${props.client_phone}">${props.client_phone}</a></span>
            </div>
          ` : ''}
          ${props.address ? `
            <div class="detail-row">
              <strong><i class="fas fa-map-marker-alt"></i> Διεύθυνση:</strong>
              <span>${props.address}</span>
            </div>
          ` : ''}
          ${props.description ? `
            <div class="detail-row">
              <strong><i class="fas fa-info-circle"></i> Περιγραφή:</strong>
              <span>${props.description}</span>
            </div>
          ` : ''}
          <div class="detail-row">
            <strong><i class="fas fa-flag"></i> Κατάσταση:</strong>
            <span class="status-badge status-${normalizedStatus}">${this.getStatusText(props.status)}</span>
          </div>
          ${props.total_cost ? `
            <div class="detail-row">
              <strong><i class="fas fa-euro-sign"></i> Κόστος:</strong>
              <span>${parseFloat(props.total_cost).toFixed(2)} €</span>
            </div>
          ` : ''}
        </div>
      `,
      buttons: [
        {
          text: 'Επεξεργασία Επίσκεψης',
          className: 'btn-primary',
          onClick: () => {
            Modal.hide();
            // Create a fake event object for edit modal
            const fakeEvent = {
              id: visitData.id,
              title: visitData.title,
              start: new Date(visitData.start),
              end: visitData.end ? new Date(visitData.end) : null,
              extendedProps: props
            };
            setTimeout(() => {
              this.showEditVisitModal(fakeEvent);
            }, 350);
          }
        },
        {
          text: 'Διαγραφή',
          className: 'btn-danger',
          onClick: async () => {
            if (confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την επίσκεψη;')) {
              await this.deleteEventById(visitData.id);
              Modal.hide();
            }
          }
        },
        {
          text: 'Κλείσιμο',
          className: 'btn-secondary',
          onClick: () => Modal.hide()
        }
      ]
    });
  },

  /* ========================================
     Delete Event by ID
     ======================================== */
  async deleteEventById(eventId) {
    try {
      await API.delete(`/api/calendar.php?id=${eventId}`);
      Toast.show('Η επίσκεψη διαγράφηκε', 'success');
      
      // Remove from calendar if exists
      const event = this.calendar.getEventById(eventId);
      if (event) {
        event.remove();
      }
      
      // Reload upcoming visits
      await this.loadUpcomingVisits();
      
    } catch (error) {
      console.error('Error deleting event:', error);
      Toast.show('Σφάλμα διαγραφής', 'error');
    }
  },

  /* ========================================
     Show Event Details Modal
     ======================================== */
  showEventDetails(event) {
    const props = event.extendedProps || {};
    const normalizedStatus = this.normalizeStatus(props.status);
    
    Modal.show({
      title: event.title,
      content: `
        <div class="event-details">
          <div class="detail-row">
            <strong><i class="fas fa-calendar"></i> Ημερομηνία:</strong>
            <span>${this.formatDateTime(event.start)}</span>
          </div>
          ${event.end ? `
            <div class="detail-row">
              <strong><i class="fas fa-calendar-check"></i> Λήξη:</strong>
              <span>${this.formatDateTime(event.end)}</span>
            </div>
          ` : ''}
          ${props.client_name ? `
            <div class="detail-row">
              <strong><i class="fas fa-user"></i> Πελάτης:</strong>
              <span>${props.client_name}</span>
            </div>
          ` : ''}
          ${props.client_phone ? `
            <div class="detail-row">
              <strong><i class="fas fa-phone"></i> Τηλέφωνο:</strong>
              <span><a href="tel:${props.client_phone}">${props.client_phone}</a></span>
            </div>
          ` : ''}
          ${props.address ? `
            <div class="detail-row">
              <strong><i class="fas fa-map-marker-alt"></i> Διεύθυνση:</strong>
              <span>${props.address}</span>
            </div>
          ` : ''}
          ${props.description ? `
            <div class="detail-row">
              <strong><i class="fas fa-info-circle"></i> Περιγραφή:</strong>
              <span>${props.description}</span>
            </div>
          ` : ''}
          <div class="detail-row">
            <strong><i class="fas fa-flag"></i> Κατάσταση:</strong>
            <span class="status-badge status-${normalizedStatus}">${this.getStatusText(props.status)}</span>
          </div>
          ${props.total_cost ? `
            <div class="detail-row">
              <strong><i class="fas fa-euro-sign"></i> Κόστος:</strong>
              <span>${parseFloat(props.total_cost).toFixed(2)} €</span>
            </div>
          ` : ''}
        </div>
      `,
      buttons: [
        {
          text: 'Επεξεργασία Επίσκεψης',
          className: 'btn-primary',
          onClick: () => {
            Modal.hide();
            setTimeout(() => {
              this.showEditVisitModal(event);
            }, 350);
          }
        },
        {
          text: 'Διαγραφή',
          className: 'btn-danger',
          onClick: async () => {
            if (confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την επίσκεψη;')) {
              await this.deleteEvent(event);
              Modal.hide();
            }
          }
        },
        {
          text: 'Κλείσιμο',
          className: 'btn-secondary',
          onClick: () => Modal.hide()
        }
      ]
    });
  },

  /* ========================================
     Show Add Visit Modal
     ======================================== */
  async showAddVisitModal(startDate = null, endDate = null) {
    // Load jobs for dropdown
    let jobs = [];
    
    try {
      const response = await API.get('/api/jobs.php');
      jobs = Array.isArray(response) ? response : (response.data || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
    
    const today = new Date().toISOString().split('T')[0];
    const defaultStart = startDate || today;
    const defaultEnd = endDate || defaultStart;
    
    Modal.show({
      title: 'Νέα Επίσκεψη',
      content: `
        <form id="addVisitForm" class="form">
          <div class="form-group">
            <label for="visitJob">Σχετίζεται με Εργασία</label>
            <select id="visitJob" class="form-control">
              <option value="">-- Νέα Εργασία (Ανεξάρτητη) --</option>
              ${jobs.map(j => `<option value="${j.id}" 
                data-title="${j.title}" 
                data-client="${j.clientName || ''}"
                data-phone="${j.clientPhone || ''}"
                data-address="${j.address || ''}"
                data-description="${(j.description || '').replace(/"/g, '&quot;')}"
                data-status="${j.status || 'pending'}"
                data-cost="${j.total_cost || ''}"
              >${j.clientName || 'Χωρίς πελάτη'} (${j.title})</option>`).join('')}
            </select>
            <small class="form-text">Επιλέξτε εργασία για αυτόματη συμπλήρωση στοιχείων</small>
          </div>
          
          <div class="form-group">
            <label for="visitTitle">Τίτλος *</label>
            <input type="text" id="visitTitle" class="form-control" placeholder="π.χ. Βαφή Διαμερίσματος" required>
          </div>
          
          <div class="form-group">
            <label for="visitClient">Πελάτης</label>
            <input type="text" id="visitClient" class="form-control" placeholder="Όνομα πελάτη">
          </div>
          
          <div class="form-group">
            <label for="visitPhone">Τηλέφωνο</label>
            <input type="text" id="visitPhone" class="form-control" placeholder="Τηλέφωνο πελάτη">
          </div>
          
          <div class="form-group">
            <label for="visitAddress">Διεύθυνση</label>
            <input type="text" id="visitAddress" class="form-control" placeholder="Διεύθυνση">
          </div>
          
          <div class="form-group">
            <label for="visitDescription">Περιγραφή</label>
            <textarea id="visitDescription" class="form-control" rows="3" placeholder="Περιγραφή εργασίας"></textarea>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="visitStatus">Κατάσταση</label>
              <select id="visitStatus" class="form-control">
                <option value="pending">Σε Αναμονή</option>
                <option value="in_progress">Σε Εξέλιξη</option>
                <option value="completed">Ολοκληρωμένη</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="visitCost">Κόστος (€)</label>
              <input type="number" id="visitCost" class="form-control" placeholder="0.00" step="0.01">
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="visitStartDate">Ημερομηνία Έναρξης *</label>
              <input type="date" id="visitStartDate" class="form-control" value="${defaultStart}" required>
            </div>
            
            <div class="form-group">
              <label for="visitEndDate">Ημερομηνία Λήξης</label>
              <input type="date" id="visitEndDate" class="form-control" value="${defaultEnd}">
            </div>
          </div>
        </form>
      `,
      buttons: [
        {
          text: 'Δημιουργία',
          className: 'btn-primary',
          onClick: async () => {
            await this.createVisit();
          }
        },
        {
          text: 'Ακύρωση',
          className: 'btn-secondary',
          onClick: () => Modal.hide()
        }
      ]
    });
    
    // Auto-fill when job is selected
    const jobSelect = document.getElementById('visitJob');
    jobSelect.addEventListener('change', (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex];
      if (selectedOption.value) {
        document.getElementById('visitTitle').value = selectedOption.dataset.title || '';
        document.getElementById('visitClient').value = selectedOption.dataset.client || '';
        document.getElementById('visitPhone').value = selectedOption.dataset.phone || '';
        document.getElementById('visitAddress').value = selectedOption.dataset.address || '';
        document.getElementById('visitDescription').value = selectedOption.dataset.description || '';
        document.getElementById('visitStatus').value = selectedOption.dataset.status || 'pending';
        document.getElementById('visitCost').value = selectedOption.dataset.cost || '';
      } else {
        // Clear fields
        document.getElementById('visitTitle').value = '';
        document.getElementById('visitClient').value = '';
        document.getElementById('visitPhone').value = '';
        document.getElementById('visitAddress').value = '';
        document.getElementById('visitDescription').value = '';
        document.getElementById('visitStatus').value = 'pending';
        document.getElementById('visitCost').value = '';
      }
    });
  },

  /* ========================================
     Create Visit
     ======================================== */
  async createVisit() {
    const form = document.getElementById('addVisitForm');
    if (!form.checkValidity()) {
      Toast.show('Συμπληρώστε όλα τα υποχρεωτικά πεδία', 'error');
      return;
    }
    
    const selectedJobId = document.getElementById('visitJob').value;
    
    const data = {
      title: document.getElementById('visitTitle').value,
      start_date: document.getElementById('visitStartDate').value,
      end_date: document.getElementById('visitEndDate').value || null,
      address: document.getElementById('visitAddress').value,
      description: document.getElementById('visitDescription').value,
      status: document.getElementById('visitStatus').value
    };
    
    try {
      // Αν επιλέχθηκε εργασία, ενημέρωσε το next_visit της εργασίας
      if (selectedJobId) {
        await API.put('/api/calendar.php', {
          id: selectedJobId,
          next_visit: data.start_date
        });
        Toast.show('Η επόμενη επίσκεψη προστέθηκε στην εργασία', 'success');
      } else {
        // Αλλιώς δημιούργησε νέα εργασία
        await API.post('/api/calendar.php', data);
        Toast.show('Η επίσκεψη δημιουργήθηκε επιτυχώς', 'success');
      }
      
      Modal.hide();
      
      // Reload calendar
      this.calendar.refetchEvents();
      await this.loadUpcomingVisits();
      
    } catch (error) {
      console.error('Error creating visit:', error);
      Toast.show('Σφάλμα δημιουργίας επίσκεψης', 'error');
    }
  },

  /* ========================================
     Show Edit Visit Modal
     ======================================== */
  async showEditVisitModal(event) {
    const props = event.extendedProps || {};
    const startDate = event.start.toISOString().split('T')[0];
    const endDate = event.end ? event.end.toISOString().split('T')[0] : '';
    
    // Use snake_case field names from API
    const clientName = props.client_name || props.clientName || '';
    const clientPhone = props.client_phone || props.clientPhone || '';
    const totalCost = props.total_cost || props.totalCost || '';
    
    Modal.show({
      title: 'Επεξεργασία Επίσκεψης',
      content: `
        <form id="editVisitForm" class="form">
          <div class="form-group">
            <label for="editVisitTitle">Τίτλος *</label>
            <input type="text" id="editVisitTitle" class="form-control" value="${event.title}" required>
          </div>
          
          <div class="form-group">
            <label for="editVisitClient">Πελάτης</label>
            <input type="text" id="editVisitClient" class="form-control" value="${clientName}">
          </div>
          
          <div class="form-group">
            <label for="editVisitPhone">Τηλέφωνο</label>
            <input type="text" id="editVisitPhone" class="form-control" value="${clientPhone}">
          </div>
          
          <div class="form-group">
            <label for="editVisitAddress">Διεύθυνση</label>
            <input type="text" id="editVisitAddress" class="form-control" value="${props.address || ''}">
          </div>
          
          <div class="form-group">
            <label for="editVisitDescription">Περιγραφή</label>
            <textarea id="editVisitDescription" class="form-control" rows="3">${props.description || ''}</textarea>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="editVisitStatus">Κατάσταση</label>
              <select id="editVisitStatus" class="form-control">
                <option value="pending" ${props.status === 'pending' ? 'selected' : ''}>Σε Αναμονή</option>
                <option value="in_progress" ${props.status === 'in_progress' ? 'selected' : ''}>Σε Εξέλιξη</option>
                <option value="completed" ${props.status === 'completed' ? 'selected' : ''}>Ολοκληρωμένη</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="editVisitCost">Κόστος (€)</label>
              <input type="number" id="editVisitCost" class="form-control" value="${totalCost}" step="0.01">
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="editVisitStartDate">Ημερομηνία Έναρξης *</label>
              <input type="date" id="editVisitStartDate" class="form-control" value="${startDate}" required>
            </div>
            
            <div class="form-group">
              <label for="editVisitEndDate">Ημερομηνία Λήξης</label>
              <input type="date" id="editVisitEndDate" class="form-control" value="${endDate}">
            </div>
          </div>
        </form>
      `,
      buttons: [
        {
          text: 'Αποθήκευση',
          className: 'btn-primary',
          onClick: async () => {
            await this.updateVisit(event);
          }
        },
        {
          text: 'Ακύρωση',
          className: 'btn-secondary',
          onClick: () => Modal.hide()
        }
      ]
    });
  },

  /* ========================================
     Update Visit
     ======================================== */
  async updateVisit(event) {
    const form = document.getElementById('editVisitForm');
    if (!form.checkValidity()) {
      Toast.show('Συμπληρώστε όλα τα υποχρεωτικά πεδία', 'error');
      return;
    }
    
    const data = {
      id: event.id,
      title: document.getElementById('editVisitTitle').value,
      start_date: document.getElementById('editVisitStartDate').value,
      end_date: document.getElementById('editVisitEndDate').value || null,
      address: document.getElementById('editVisitAddress').value,
      description: document.getElementById('editVisitDescription').value,
      status: document.getElementById('editVisitStatus').value
    };
    
    try {
      await API.put('/api/calendar.php', data);
      Toast.show('Η επίσκεψη ενημερώθηκε επιτυχώς', 'success');
      Modal.hide();
      
      // Reload calendar
      this.calendar.refetchEvents();
      await this.loadUpcomingVisits();
      
    } catch (error) {
      console.error('Error updating visit:', error);
      Toast.show('Σφάλμα ενημέρωσης επίσκεψης', 'error');
    }
  },

  /* ========================================
     Update Event Dates (Drag & Drop)
     ======================================== */
  async updateEventDates(event) {
    try {
      const data = {
        id: event.id,
        start_date: event.start.toISOString().split('T')[0],
        end_date: event.end ? event.end.toISOString().split('T')[0] : null
      };
      
      await API.put('/api/calendar.php', data);
      Toast.show('Η επίσκεψη ενημερώθηκε', 'success');
      await this.loadUpcomingVisits();
      
    } catch (error) {
      console.error('Error updating event:', error);
      Toast.show('Σφάλμα ενημέρωσης', 'error');
      event.revert();
    }
  },

  /* ========================================
     Delete Event
     ======================================== */
  async deleteEvent(event) {
    try {
      await API.delete(`/api/calendar.php?id=${event.id}`);
      Toast.show('Η επίσκεψη διαγράφηκε', 'success');
      event.remove();
      await this.loadUpcomingVisits();
      
    } catch (error) {
      console.error('Error deleting event:', error);
      Toast.show('Σφάλμα διαγραφής', 'error');
    }
  },

  /* ========================================
     Helper Functions
     ======================================== */
  normalizeStatus(status) {
    // Convert Greek status to English class names
    const normalized = String(status || '').toLowerCase().trim();
    
    const statusMap = {
      'σε εξέλιξη': 'in_progress',
      'ολοκληρώθηκε': 'completed',
      'υποψήφιος': 'pending',
      'σε αναμονή': 'pending',
      'ακυρώθηκε': 'cancelled',
      'in-progress': 'in_progress',
      'in_progress': 'in_progress',
      'pending': 'pending',
      'completed': 'completed',
      'cancelled': 'cancelled'
    };
    
    return statusMap[normalized] || 'pending';
  },

  formatDateTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('el-GR', {
      weekday: 'short',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  getStatusText(status) {
    // Normalize and handle both Greek and English
    const normalized = String(status || '').toLowerCase().trim();
    
    const statusMap = {
      'pending': 'Σε Αναμονή',
      'in_progress': 'Σε Εξέλιξη',
      'in-progress': 'Σε Εξέλιξη',
      'completed': 'Ολοκληρωμένη',
      'cancelled': 'Ακυρωμένη',
      'σε εξέλιξη': 'Σε Εξέλιξη',
      'ολοκληρώθηκε': 'Ολοκληρωμένη',
      'υποψήφιος': 'Σε Αναμονή',
      'σε αναμονή': 'Σε Αναμονή',
      'ακυρώθηκε': 'Ακυρωμένη'
    };
    
    return statusMap[normalized] || status;
  }
};
