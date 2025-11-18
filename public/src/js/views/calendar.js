/* ========================================
   Calendar View - Ημερολόγιο Εργασιών
   ======================================== */

window.CalendarView = {
  calendar: null,
  
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
          <div class="upcoming-visits-header">
            <h2><i class="fas fa-clock"></i> Επόμενες Επισκέψεις</h2>
            <button class="btn btn-primary btn-sm" id="syncCalendarBtn" title="Συγχρονισμός με Εργασίες">
              <i class="fas fa-sync-alt"></i> Συγχρονισμός
            </button>
          </div>
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
    
    document.getElementById('syncCalendarBtn').addEventListener('click', () => {
      this.syncJobsToCalendar();
    });
  },

  /* ========================================
     Initialize FullCalendar
     ======================================== */
  async initCalendar() {
    const calendarEl = document.getElementById('calendar');
    
    this.calendar = new FullCalendar.Calendar(calendarEl, {
      locale: 'el',
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      },
      buttonText: {
        today: 'Σήμερα',
        month: 'Μήνας',
        week: 'Εβδομάδα',
        day: 'Ημέρα'
      },
      height: 'auto',
      firstDay: 1,
      weekNumbers: true,
      weekText: 'Εβδ.',
      editable: true,
      selectable: true,
      selectMirror: true,
      selectOverlap: true,
      dayMaxEvents: true,
      moreLinkClick: 'popover',
      eventMaxStack: 2,
      
      // Event display settings
      eventDisplay: 'block',
      displayEventTime: true,
      eventTimeFormat: {
        hour: '2-digit',
        minute: '2-digit',
        meridiem: false
      },
      
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
        console.log('📅 Event clicked:', info);
        this.showEventDetails(info.event);
      },
      
      // Event mouse enter - show tooltip
      eventMouseEnter: (info) => {
        const props = info.event.extendedProps || {};
        // Use original_title to avoid duplicate client names
        const title = props.original_title || info.event.title;
        const tooltip = `${title}${props.client_name ? '\n👤 ' + props.client_name : ''}${props.address ? '\n📍 ' + props.address : ''}`;
        info.el.title = tooltip;
      },
      
      // Date click - create new event on click
      dateClick: (info) => {
        console.log('📅 Date clicked:', info.dateStr);
        this.showAddVisitModal(info.dateStr, info.dateStr);
      },
      
      // Select - create new event on date range selection
      select: (info) => {
        console.log('📅 Date range selected:', info.startStr, 'to', info.endStr);
        this.showAddVisitModal(info.startStr, info.endStr);
        // Unselect after opening modal
        this.calendar.unselect();
      },
      
      // Event drop - update dates on drag & drop
      eventDrop: (info) => {
        console.log('📅 Event dropped:', info.event);
        this.updateEventDates(info.event);
      },
      
      // Event resize - update dates on resize
      eventResize: (info) => {
        console.log('📅 Event resized:', info.event);
        this.updateEventDates(info.event);
      }
    });
    
    this.calendar.render();
  },

  /* ========================================
     Load Events from API
     ======================================== */
  async loadEvents(start, end) {
    try {
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];
      
      let events = [];
      
      // In Electron, use SQLite database
      if (typeof window.electronAPI !== 'undefined') {
        const sql = `
          SELECT 
            ce.*,
            c.name as client_name,
            c.phone as client_phone,
            j.title as original_title
          FROM calendar_events ce
          LEFT JOIN clients c ON ce.client_id = c.id
          LEFT JOIN jobs j ON ce.job_id = j.id
          WHERE ce.start_date >= ? AND ce.start_date <= ?
          ORDER BY ce.start_date ASC
        `;
        
        const response = await window.electronAPI.db.query(sql, [startStr, endStr]);
        const result = response.success ? response.data : [];
        
        // Transform database results to FullCalendar format
        events = result.map(event => this.transformEventFromDB(event));
        
      } else {
        // Web version - use API
        const url = `/api/calendar.php?start=${startStr}&end=${endStr}`;
        const response = await fetch(url, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to load calendar events');
        }
        
        events = await response.json();
      }
      
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
      
      return [...events, ...holidays];
      
    } catch (error) {
      console.error('❌ ═══════════════════════════════════════');
      console.error('❌ Error loading events:', error);
      console.error('❌ Stack:', error.stack);
      console.error('❌ ═══════════════════════════════════════');
      Toast.show('Σφάλμα φόρτωσης επισκέψεων', 'error');
      return [];
    }
  },
  
  /* ========================================
     Transform Event from Database
     ======================================== */
  transformEventFromDB(dbEvent) {
    console.log('🔄 Transforming DB event:', dbEvent);
    
    // Check what field names exist
    let startDate = dbEvent.start_date || dbEvent.startDate || dbEvent.date;
    let endDate = dbEvent.end_date || dbEvent.endDate;
    const startTime = dbEvent.start_time || dbEvent.startTime;
    const endTime = dbEvent.end_time || dbEvent.endTime;
    const allDay = dbEvent.all_day !== undefined ? dbEvent.all_day : dbEvent.allDay;
    
    // Clean up date format - remove time part if it's ' 00:00:00'
    if (startDate && typeof startDate === 'string') {
      startDate = startDate.replace(' 00:00:00', '');
    }
    if (endDate && typeof endDate === 'string') {
      endDate = endDate.replace(' 00:00:00', '');
    }
    
    console.log('🔍 Date fields:', { startDate, endDate, startTime, endTime, allDay });
    
    const title = dbEvent.client_name 
      ? `${dbEvent.client_name} - ${dbEvent.title}` 
      : dbEvent.title;
    
    return {
      id: dbEvent.id,
      title: title,
      start: allDay ? startDate : `${startDate}T${startTime || '00:00:00'}`,
      end: endDate 
        ? (allDay ? endDate : `${endDate}T${endTime || '23:59:59'}`)
        : null,
      allDay: Boolean(allDay),
      backgroundColor: this.getStatusColor(dbEvent.status),
      borderColor: this.getStatusColor(dbEvent.status),
      extendedProps: {
        original_title: dbEvent.original_title || dbEvent.title,
        client_id: dbEvent.client_id,
        client_name: dbEvent.client_name,
        client_phone: dbEvent.client_phone,
        job_id: dbEvent.job_id,
        address: dbEvent.address,
        description: dbEvent.description,
        status: dbEvent.status,
        start_time: startTime,
        end_time: endTime
      }
    };
  },
  
  /* ========================================
     Get Status Color
     ======================================== */
  getStatusColor(status) {
    const statusColors = {
      'pending': '#6b7280',
      'confirmed': '#3b82f6',
      'in_progress': '#f59e0b',
      'completed': '#10b981',
      'cancelled': '#ef4444'
    };
    
    const normalized = this.normalizeStatus(status);
    return statusColors[normalized] || statusColors.pending;
  },

  /* ========================================
     Load Upcoming Visits
     ======================================== */
  async loadUpcomingVisits() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const start = today.toISOString().split('T')[0];
      const end = futureDate.toISOString().split('T')[0];
      
      let events = [];
      
      // In Electron, use SQLite database
      if (typeof window.electronAPI !== 'undefined') {
        console.log('📅 Loading upcoming visits from SQLite...');
        const sql = `
          SELECT 
            ce.*,
            c.name as client_name,
            c.phone as client_phone,
            j.title as original_title
          FROM calendar_events ce
          LEFT JOIN clients c ON ce.client_id = c.id
          LEFT JOIN jobs j ON ce.job_id = j.id
          WHERE ce.start_date >= ? AND ce.start_date <= ?
          AND ce.start_date IS NOT NULL
          ORDER BY ce.start_date ASC
          LIMIT 10
        `;  
        
        const response = await window.electronAPI.db.query(sql, [start, end]);
        console.log('📅 SQLite response:', response);
        const result = response.success ? response.data : [];
        console.log('📅 Calendar events from DB:', result);
        
        // Transform database results
        events = result.map(event => this.transformEventFromDB(event));
        console.log('📅 Transformed events:', events);      } else {
        // Web version - use API
        const url = `/api/calendar.php?start=${start}&end=${end}`;
        const response = await fetch(url, { credentials: 'include' });
        events = await response.json();
        
        // Filter future events and sort by date
        events = events
          .filter(event => {
            const eventDate = new Date(event.start);
            return eventDate >= today;
          })
          .sort((a, b) => new Date(a.start) - new Date(b.start))
          .slice(0, 10);
      }
      
      this.renderUpcomingVisits(events);
      
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
    console.log('📅 Rendering upcoming visits:', visits);
    const container = document.getElementById('upcomingVisitsList');
    
    if (visits.length === 0) {
      container.innerHTML = `
        <div class="empty-state-small">
          <i class="fas fa-calendar-check"></i>
          <p>Δεν υπάρχουν προγραμματισμένες επισκέψεις</p>
        </div>
      `;
      return;
    }
    
    // Store visits data for later access
    this._upcomingVisitsData = {};
    visits.forEach(visit => {
      this._upcomingVisitsData[visit.id] = visit;
    });
    
    container.innerHTML = visits.map(visit => {
      console.log('📅 Processing visit:', visit);
      
      // Check if visit.start exists and is valid
      if (!visit.start) {
        console.error('❌ Visit missing start date:', visit);
        return '';
      }
      
      const startDate = new Date(visit.start);
      
      // Check if date is valid
      if (isNaN(startDate.getTime())) {
        console.error('❌ Invalid start date:', visit.start, 'for visit:', visit);
        return '';
      }
      
      const props = visit.extendedProps || {};
      
      // Normalize status - handle both from API and from calendar
      const status = props.status || visit.status || 'pending';
      const normalizedStatus = this.normalizeStatus(status);
      
      // Extract client info
      const clientName = props.client_name || visit.client_name || '';
      const clientPhone = props.client_phone || visit.client_phone || '';
      const address = props.address || visit.address || '';
      
      // Use original_title to avoid duplicate client name in title
      const displayTitle = props.original_title || visit.title;
      
      console.log('📅 Rendering visit:', { title: displayTitle, clientName, hasOriginalTitle: !!props.original_title });
      
      return `
        <div class="visit-item" data-event-id="${visit.id}" style="cursor: pointer;">
          <div class="visit-date">
            <div class="visit-day">${startDate.getDate()}</div>
            <div class="visit-month">${startDate.toLocaleDateString('el-GR', { month: 'short' })}</div>
          </div>
          <div class="visit-info">
            <div class="visit-title">${displayTitle}</div>
            <div class="visit-details">
              ${address ? `<span><i class="fas fa-map-marker-alt"></i> ${address}</span>` : ''}
              ${clientPhone ? `<span><i class="fas fa-phone"></i> <a href="tel:${clientPhone}" style="color: var(--color-text); text-decoration: none;">${clientPhone}</a></span>` : ''}
            </div>
            <div class="visit-time">${this.formatDateTime(startDate)}</div>
          </div>
          <div class="visit-status">
            <span class="status-badge status-${normalizedStatus}">${this.getStatusText(status)}</span>
          </div>
        </div>
      `;
    }).join('');
    
    // Setup event delegation
    this.setupUpcomingVisitsListeners();
  },
  
  /* ========================================
     Setup Upcoming Visits Click Listeners
     ======================================== */
  setupUpcomingVisitsListeners() {
    const container = document.getElementById('upcomingVisitsList');
    if (!container) return;
    
    // Remove old listener if exists
    if (this._upcomingVisitsClickHandler) {
      container.removeEventListener('click', this._upcomingVisitsClickHandler);
    }
    
    // Create new click handler
    this._upcomingVisitsClickHandler = (e) => {
      // Prevent link clicks from triggering visit click
      if (e.target.tagName === 'A') {
        return;
      }
      
      // Find the clicked visit-item (even if clicked on child element)
      const visitItem = e.target.closest('.visit-item');
      if (!visitItem) return;
      
      const eventId = visitItem.getAttribute('data-event-id');
      
      if (!eventId) {
        console.warn('⚠️ Visit item clicked but no event ID found');
        return;
      }
      
      console.log('📅 Visit item clicked, ID:', eventId);
      
      // First try to get from stored data
      let visitData = this._upcomingVisitsData[eventId];
      
      if (!visitData) {
        // Fallback: try to get from calendar
        const event = this.calendar.getEventById(eventId);
        if (event) {
          visitData = {
            id: event.id,
            title: event.title,
            start: event.start,
            end: event.end,
            extendedProps: event.extendedProps
          };
        } else {
          console.error('❌ Event not found in stored data or calendar for ID:', eventId);
          return;
        }
      }
      
      console.log('📅 Opening modal for visit:', visitData);
      
      // Show modal with the visit data
      this.showEventDetailsFromData(visitData);
      
      // Navigate calendar to that date
      const dateToGo = typeof visitData.start === 'string' 
        ? new Date(visitData.start) 
        : visitData.start;
      
      if (dateToGo && !isNaN(dateToGo.getTime())) {
        this.calendar.gotoDate(dateToGo);
      }
    };
    
    // Add new listener
    container.addEventListener('click', this._upcomingVisitsClickHandler);
    console.log('✅ Upcoming visits click listeners attached');
  },

  /* ========================================
     Show Event Details from Raw Data
     ======================================== */
  showEventDetailsFromData(visitData) {
    
    const props = visitData.extendedProps || {};
    
    // Get status from multiple possible sources
    const status = props.status || visitData.status || 'pending';
    const normalizedStatus = this.normalizeStatus(status);
    
    // Use original_title if available (without client name), otherwise use visitData.title
    const displayTitle = props.original_title || visitData.title;
    
    
    Modal.show({
      title: displayTitle,
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
          ${!visitData.allDay && (props.start_time || props.end_time) ? `
            <div class="detail-row">
              <strong><i class="fas fa-clock"></i> Ώρα:</strong>
              <span>${this.formatTime(props.start_time) || ''}${props.end_time ? ' - ' + this.formatTime(props.end_time) : ''}</span>
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
            <span class="status-badge status-${normalizedStatus}">${this.getStatusText(status)}</span>
          </div>
          ${props.total_cost ? `
            <div class="detail-row">
              <strong><i class="fas fa-euro-sign"></i> Κόστος:</strong>
              <span>${Utils.formatCurrency(parseFloat(props.total_cost))}</span>
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
            // Create properly formatted event object
            const startDate = typeof visitData.start === 'string' ? new Date(visitData.start) : visitData.start;
            const endDate = visitData.end ? (typeof visitData.end === 'string' ? new Date(visitData.end) : visitData.end) : null;
            
            const fakeEvent = {
              id: visitData.id,
              title: visitData.title,
              start: startDate && !isNaN(startDate.getTime()) ? startDate : new Date(),
              end: endDate && !isNaN(endDate.getTime()) ? endDate : null,
              allDay: visitData.allDay || false,
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
          onClick: () => {
            Modal.hide();
            setTimeout(() => {
              this.showDeleteConfirmation(visitData.id);
            }, 350);
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
     Show Delete Confirmation Modal
     ======================================== */
  showDeleteConfirmation(eventId) {
    Modal.show({
      title: 'Επιβεβαίωση Διαγραφής',
      content: `
        <div class="confirmation-dialog">
          <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--danger); margin-bottom: 1rem;"></i>
          <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την επίσκεψη;</p>
          <p style="color: var(--text-secondary); font-size: 0.9rem;">Η ενέργεια αυτή δεν μπορεί να αναιρεθεί.</p>
        </div>
      `,
      buttons: [
        {
          text: 'Διαγραφή',
          className: 'btn-danger',
          onClick: async () => {
            await this.deleteEventById(eventId);
            Modal.hide();
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
     Delete Event by ID
     ======================================== */
  async deleteEventById(eventId) {
    try {
      // In Electron, use SQLite database
      if (typeof window.electronAPI !== 'undefined') {
        await window.electronAPI.db.delete('calendar_events', eventId);
        
      } else {
        // Web version - use API
        const response = await fetch(`/api/calendar.php?id=${eventId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to delete event');
      }
      
      Toast.show('Η επίσκεψη διαγράφηκε (η εργασία παραμένει)', 'success');
      
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
    
    // Get status from multiple possible sources
    const status = props.status || event.status || 'pending';
    const normalizedStatus = this.normalizeStatus(status);
    
    // Use original_title if available (without client name), otherwise use event.title
    const displayTitle = props.original_title || event.title;
    
    
    Modal.show({
      title: displayTitle,
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
          ${!event.allDay && (props.start_time || props.end_time) ? `
            <div class="detail-row">
              <strong><i class="fas fa-clock"></i> Ώρα:</strong>
              <span>${this.formatTime(props.start_time) || ''}${props.end_time ? ' - ' + this.formatTime(props.end_time) : ''}</span>
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
            <span class="status-badge status-${normalizedStatus}">${this.getStatusText(status)}</span>
          </div>
          ${props.total_cost ? `
            <div class="detail-row">
              <strong><i class="fas fa-euro-sign"></i> Κόστος:</strong>
              <span>${Utils.formatCurrency(parseFloat(props.total_cost))}</span>
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
          onClick: () => {
            Modal.hide();
            setTimeout(() => {
              this.showDeleteConfirmation(event.id);
            }, 350);
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
    // Load jobs and clients for dropdown
    let jobs = [];
    let clients = [];
    
    try {
      jobs = await API.getJobs();
      clients = await API.getClients();
    } catch (error) {
      console.error('Error loading data:', error);
    }
    
    const today = new Date().toISOString().split('T')[0];
    // Extract only date part (YYYY-MM-DD) from datetime strings
    const defaultStart = startDate ? startDate.split('T')[0] : today;
    const defaultEnd = endDate ? endDate.split('T')[0] : defaultStart;
    
    Modal.show({
      title: 'Νέα Επίσκεψη',
      content: `
        <form id="addVisitForm" class="form">
          <div class="form-group">
            <label for="visitJob">Σχετίζεται με Εργασία</label>
            <select id="visitJob" class="form-control">
              <option value="">-- Νέα Επίσκεψη (Ανεξάρτητη) --</option>
              ${jobs.map(j => `<option value="${j.id}" 
                data-title="${j.title}" 
                data-client-id="${j.clientId || j.client_id || ''}"
                data-client="${j.clientName || ''}"
                data-address="${j.address || ''}"
                data-description="${(j.description || '').replace(/"/g, '&quot;')}"
                data-status="${j.status || 'pending'}"
              >${j.clientName || 'Χωρίς πελάτη'} - ${j.title}</option>`).join('')}
            </select>
            <small class="form-text">Επιλέξτε εργασία για να συνδέσετε την επίσκεψη με αυτήν</small>
          </div>
          
          <div class="form-group" id="clientSelectGroup">
            <label for="visitClient">Πελάτης</label>
            <select id="visitClient" class="form-control">
              <option value="">-- Χωρίς Πελάτη --</option>
              ${clients.map(c => `<option value="${c.id}"
                data-address="${c.address || ''}"
              >${c.name}</option>`).join('')}
            </select>
          </div>
          
          <div class="form-group" id="clientTextGroup" style="display: none;">
            <label for="visitClientText">Πελάτης από Εργασία</label>
            <input type="text" id="visitClientText" class="form-control" readonly>
          </div>
          
          <div class="form-group" id="clientTextGroup" style="display: none;">
            <label for="visitClientText">Πελάτης από Εργασία</label>
            <input type="text" id="visitClientText" class="form-control" readonly>
          </div>
          
          <div class="form-group">
            <label for="visitTitle">Τίτλος *</label>
            <input type="text" id="visitTitle" class="form-control" placeholder="π.χ. Βαφή Διαμερίσματος" required>
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
                <option value="confirmed">Επιβεβαιωμένη</option>
                <option value="in_progress">Σε Εξέλιξη</option>
                <option value="completed">Ολοκληρωμένη</option>
                <option value="cancelled">Ακυρωμένη</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="visitAllDay">
                Ολοήμερη
                <i class="fas fa-info-circle" title="Αν είναι ενεργό, η επίσκεψη διαρκεί όλη τη μέρα χωρίς συγκεκριμένη ώρα"></i>
              </label>
              <label class="toggle-switch">
                <input type="checkbox" id="visitAllDay" checked>
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="visitStartDate">Ημερομηνία Έναρξης *</label>
              <input type="date" id="visitStartDate" class="form-control" value="${defaultStart}" required>
            </div>
            
            <div class="form-group">
              <label for="visitEndDate">
                Ημερομηνία Λήξης
                <i class="fas fa-info-circle" title="Προαιρετικό. Χρησιμοποιήστε για επισκέψεις που διαρκούν πολλές μέρες"></i>
              </label>
              <input type="date" id="visitEndDate" class="form-control" value="${defaultEnd}">
            </div>
          </div>
          
          <div class="form-row" id="visitTimeRow" style="display: none;">
            <div class="form-group">
              <label for="visitStartTime">Ώρα Έναρξης</label>
              <input type="time" id="visitStartTime" class="form-control" value="09:00">
            </div>
            
            <div class="form-group">
              <label for="visitEndTime">Ώρα Λήξης</label>
              <input type="time" id="visitEndTime" class="form-control" value="17:00">
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
    const clientSelectGroup = document.getElementById('clientSelectGroup');
    const clientTextGroup = document.getElementById('clientTextGroup');
    const clientText = document.getElementById('visitClientText');
    const clientSelect = document.getElementById('visitClient');
    
    jobSelect.addEventListener('change', (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex];
      if (selectedOption.value) {
        // Job selected - show readonly client field and auto-fill data
        clientSelectGroup.style.display = 'none';
        clientTextGroup.style.display = 'block';
        clientText.value = selectedOption.dataset.client || '';
        
        document.getElementById('visitTitle').value = selectedOption.dataset.title || '';
        document.getElementById('visitAddress').value = selectedOption.dataset.address || '';
        document.getElementById('visitDescription').value = selectedOption.dataset.description || '';
        document.getElementById('visitStatus').value = selectedOption.dataset.status || 'pending';
      } else {
        // Independent visit - show client dropdown and clear fields
        clientSelectGroup.style.display = 'block';
        clientTextGroup.style.display = 'none';
        
        document.getElementById('visitTitle').value = '';
        document.getElementById('visitAddress').value = '';
        document.getElementById('visitDescription').value = '';
        document.getElementById('visitStatus').value = 'pending';
      }
    });
    
    // Auto-fill address when client is selected from dropdown
    clientSelect.addEventListener('change', (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex];
      if (selectedOption.value) {
        const selectedClient = clients.find(c => c.id == selectedOption.value);
        if (selectedClient && selectedClient.address) {
          document.getElementById('visitAddress').value = selectedClient.address;
        }
      }
    });
    
    // Toggle time fields based on all-day checkbox
    const allDayCheckbox = document.getElementById('visitAllDay');
    const timeRow = document.getElementById('visitTimeRow');
    
    allDayCheckbox.addEventListener('change', (e) => {
      timeRow.style.display = e.target.checked ? 'none' : 'flex';
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
    let clientId = null;
    
    if (selectedJobId) {
      // Get client_id from selected job's data attribute
      const jobOption = document.querySelector(`#visitJob option[value="${selectedJobId}"]`);
      clientId = jobOption?.dataset.clientId || null;
    } else {
      // Get client_id from dropdown
      const clientSelect = document.getElementById('visitClient');
      clientId = clientSelect?.value || null;
    }
    
    const allDayCheckbox = document.getElementById('visitAllDay');
    const isAllDay = allDayCheckbox ? allDayCheckbox.checked : false;
    
    const data = {
      title: document.getElementById('visitTitle').value,
      start_date: document.getElementById('visitStartDate').value,
      end_date: document.getElementById('visitEndDate').value || null,
      client_id: clientId || null,
      job_id: selectedJobId || null,
      address: document.getElementById('visitAddress').value,
      description: document.getElementById('visitDescription').value,
      status: document.getElementById('visitStatus').value,
      all_day: isAllDay ? 1 : 0
    };
    
    // Add or clear time fields based on all-day status
    if (!isAllDay) {
      // Not all-day: include time values
      data.start_time = document.getElementById('visitStartTime').value || null;
      data.end_time = document.getElementById('visitEndTime').value || null;
    } else {
      // All-day: explicitly clear time fields
      data.start_time = null;
      data.end_time = null;
    }
    
    try {
      let result;
      
      // In Electron, use SQLite database
      if (typeof window.electronAPI !== 'undefined') {
        result = await window.electronAPI.db.insert('calendar_events', data);
        
      } else {
        // Web version - use API
        const response = await fetch('/api/calendar.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          const error = await response.json();
          console.error('❌ Server Error:', error);
          throw new Error(error.error || 'Failed to create event');
        }
        
        result = await response.json();
      }
      
      Toast.show('Η επίσκεψη δημιουργήθηκε επιτυχώς', 'success');
      Modal.hide();
      
      // Reload calendar
      this.calendar.refetchEvents();
      await this.loadUpcomingVisits();
      
    } catch (error) {
      console.error('❌ ═══════════════════════════════════════');
      console.error('❌ CREATE VISIT - ERROR');
      console.error('❌ Error:', error);
      console.error('❌ Stack:', error.stack);
      console.error('❌ ═══════════════════════════════════════');
      Toast.show('Σφάλμα δημιουργίας επίσκεψης', 'error');
    }
  },

  /* ========================================
     Show Edit Visit Modal
     ======================================== */
  async showEditVisitModal(event) {
    const props = event.extendedProps || {};
    
    // Handle date conversion safely
    let startDate = '';
    let endDate = '';
    
    // Convert start date
    if (event.start) {
      const startObj = typeof event.start === 'string' ? new Date(event.start) : event.start;
      startDate = (startObj && !isNaN(startObj.getTime())) ? startObj.toISOString().split('T')[0] : '';
    }
    
    // Convert end date
    if (event.end) {
      const endObj = typeof event.end === 'string' ? new Date(event.end) : event.end;
      endDate = (endObj && !isNaN(endObj.getTime())) ? endObj.toISOString().split('T')[0] : '';
    }
    
    // Get jobs and clients for dropdowns
    let jobs = [];
    let clients = [];
    
    try {
      jobs = await API.getJobs();
      clients = await API.getClients();
    } catch (error) {
      console.error('Error loading data:', error);
    }
    
    const clientId = props.client_id || '';
    const jobId = props.job_id || '';
    
    
    // Use original_title (without client name) for editing
    const originalTitle = props.original_title || event.title;
    
    // Normalize status for comparison
    const normalizedStatus = this.normalizeStatus(props.status || 'pending');
    
    // Check if event is all-day (handle both boolean and number)
    const isAllDay = Boolean(event.allDay);
    
    
    Modal.show({
      title: 'Επεξεργασία Επίσκεψης',
      content: `
        <form id="editVisitForm" class="form">
          <div class="form-group">
            <label for="editVisitJob">Σχετίζεται με Εργασία</label>
            <select id="editVisitJob" class="form-control">
              <option value="">-- Ανεξάρτητη Επίσκεψη --</option>
              ${jobs.map(j => `<option value="${j.id}" ${j.id == jobId ? 'selected' : ''}
                data-title="${j.title}" 
                data-client-id="${j.clientId || j.client_id || ''}"
                data-client="${j.clientName || ''}"
                data-address="${j.address || ''}"
              >${j.clientName || 'Χωρίς πελάτη'} - ${j.title}</option>`).join('')}
            </select>
            <small class="form-text">Η επίσκεψη συνδέεται με αυτή την εργασία</small>
          </div>
          
          <div class="form-group" id="editClientSelectGroup">
            <label for="editVisitClient">Πελάτης</label>
            <select id="editVisitClient" class="form-control">
              <option value="">-- Χωρίς Πελάτη --</option>
              ${clients.map(c => `<option value="${c.id}" ${c.id == clientId ? 'selected' : ''}
                data-phone="${c.phone || ''}"
                data-address="${c.address || ''}"
              >${c.name}</option>`).join('')}
            </select>
          </div>
          
          <div class="form-group" id="editClientTextGroup" style="display: none;">
            <label for="editVisitClientText">Πελάτης από Εργασία</label>
            <input type="text" id="editVisitClientText" class="form-control" readonly>
          </div>
          
          <div class="form-group">
            <label for="editVisitTitle">Τίτλος *</label>
            <input type="text" id="editVisitTitle" class="form-control" value="${originalTitle}" placeholder="π.χ. Βαφή Διαμερίσματος" required>
          </div>
          
          <div class="form-group">
            <label for="editVisitAddress">Διεύθυνση</label>
            <input type="text" id="editVisitAddress" class="form-control" value="${props.address || ''}" placeholder="Διεύθυνση">
          </div>
          
          <div class="form-group">
            <label for="editVisitDescription">Περιγραφή</label>
            <textarea id="editVisitDescription" class="form-control" rows="3" placeholder="Περιγραφή εργασίας">${props.description || ''}</textarea>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="editVisitStatus">Κατάσταση</label>
              <select id="editVisitStatus" class="form-control">
                <option value="pending" ${normalizedStatus === 'pending' ? 'selected' : ''}>Σε Αναμονή</option>
                <option value="confirmed" ${normalizedStatus === 'confirmed' ? 'selected' : ''}>Επιβεβαιωμένη</option>
                <option value="in_progress" ${normalizedStatus === 'in_progress' ? 'selected' : ''}>Σε Εξέλιξη</option>
                <option value="completed" ${normalizedStatus === 'completed' ? 'selected' : ''}>Ολοκληρωμένη</option>
                <option value="cancelled" ${normalizedStatus === 'cancelled' ? 'selected' : ''}>Ακυρωμένη</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="editVisitAllDay">
                Ολοήμερη
                <i class="fas fa-info-circle" title="Αν είναι ενεργό, η επίσκεψη διαρκεί όλη τη μέρα χωρίς συγκεκριμένη ώρα"></i>
              </label>
              <label class="toggle-switch">
                <input type="checkbox" id="editVisitAllDay" ${isAllDay ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="editVisitStartDate">Ημερομηνία Έναρξης *</label>
              <input type="date" id="editVisitStartDate" class="form-control" value="${startDate}" required>
            </div>
            
            <div class="form-group">
              <label for="editVisitEndDate">
                Ημερομηνία Λήξης
                <i class="fas fa-info-circle" title="Προαιρετικό. Χρησιμοποιήστε για επισκέψεις που διαρκούν πολλές μέρες"></i>
              </label>
              <input type="date" id="editVisitEndDate" class="form-control" value="${endDate}">
            </div>
          </div>
          
          <div class="form-row" id="editVisitTimeRow" style="display: ${isAllDay ? 'none' : 'flex'};">
            <div class="form-group">
              <label for="editVisitStartTime">Ώρα Έναρξης</label>
              <input type="time" id="editVisitStartTime" class="form-control" value="${props.start_time || '09:00'}">
            </div>
            
            <div class="form-group">
              <label for="editVisitEndTime">Ώρα Λήξης</label>
              <input type="time" id="editVisitEndTime" class="form-control" value="${props.end_time || '17:00'}">
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
    
    // Auto-fill when job is selected
    const jobSelect = document.getElementById('editVisitJob');
    const clientSelectGroup = document.getElementById('editClientSelectGroup');
    const clientTextGroup = document.getElementById('editClientTextGroup');
    const clientText = document.getElementById('editVisitClientText');
    const clientSelect = document.getElementById('editVisitClient');
    
    // Initialize: if job is selected, show readonly client field
    if (jobId) {
      const selectedJob = jobs.find(j => j.id == jobId);
      if (selectedJob) {
        clientSelectGroup.style.display = 'none';
        clientTextGroup.style.display = 'block';
        clientText.value = selectedJob.clientName || '';
      }
    } else {
      // No job - show client dropdown
      clientSelectGroup.style.display = 'block';
      clientTextGroup.style.display = 'none';
      // Ensure client is selected in dropdown
      if (clientId) {
        clientSelect.value = String(clientId); // Force string comparison
      }
    }
    
    jobSelect.addEventListener('change', (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex];
      if (selectedOption.value) {
        // Job selected - show readonly client field
        clientSelectGroup.style.display = 'none';
        clientTextGroup.style.display = 'block';
        clientText.value = selectedOption.dataset.client || '';
      } else {
        // Independent visit - show client dropdown
        clientSelectGroup.style.display = 'block';
        clientTextGroup.style.display = 'none';
      }
    });
    
    // Auto-fill address when client is selected
    clientSelect.addEventListener('change', (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex];
      if (selectedOption.value) {
        const address = selectedOption.dataset.address;
        if (address) {
          document.getElementById('editVisitAddress').value = address;
        }
      }
    });
    
    // Toggle time fields based on all-day checkbox
    const allDayCheckbox = document.getElementById('editVisitAllDay');
    const timeRow = document.getElementById('editVisitTimeRow');
    
    allDayCheckbox.addEventListener('change', (e) => {
      timeRow.style.display = e.target.checked ? 'none' : 'flex';
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
    
    const jobElement = document.getElementById('editVisitJob');
    const clientElement = document.getElementById('editVisitClient');
    const allDayElement = document.getElementById('editVisitAllDay');
    
    const jobId = jobElement ? jobElement.value || null : null;
    let clientId = null;
    
    if (jobId) {
      // If job selected, get client_id from job's data attribute
      const selectedOption = jobElement.options[jobElement.selectedIndex];
      clientId = selectedOption.dataset.clientId || null;
    } else {
      // If independent visit, get client_id from client select
      clientId = clientElement ? clientElement.value || null : null;
    }
    
    const isAllDay = allDayElement ? allDayElement.checked : false;
    
    const eventData = {
      title: document.getElementById('editVisitTitle').value,
      start_date: document.getElementById('editVisitStartDate').value,
      end_date: document.getElementById('editVisitEndDate').value || null,
      job_id: jobId,
      client_id: clientId,
      address: document.getElementById('editVisitAddress').value,
      description: document.getElementById('editVisitDescription').value,
      status: document.getElementById('editVisitStatus').value,
      all_day: isAllDay ? 1 : 0
    };
    
    // Add or clear time fields based on all-day status
    if (!isAllDay) {
      // Not all-day: include time values
      eventData.start_time = document.getElementById('editVisitStartTime').value || null;
      eventData.end_time = document.getElementById('editVisitEndTime').value || null;
    } else {
      // All-day: explicitly clear time fields
      eventData.start_time = null;
      eventData.end_time = null;
    }
    
    try {
      // In Electron, use SQLite database
      if (typeof window.electronAPI !== 'undefined') {
        await window.electronAPI.db.update('calendar_events', event.id, eventData);
        
      } else {
        // Web version - use API
        eventData.id = event.id;
        const response = await fetch('/api/calendar.php', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(eventData)
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update event');
        }
      }
      
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
      const eventData = {
        start_date: event.start.toISOString().split('T')[0],
        end_date: event.end ? event.end.toISOString().split('T')[0] : null
      };
      
      // In Electron, use SQLite database
      if (typeof window.electronAPI !== 'undefined') {
        await window.electronAPI.db.update('calendar_events', event.id, eventData);
        
      } else {
        // Web version - use API
        eventData.id = event.id;
        const response = await fetch('/api/calendar.php', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(eventData)
        });
        
        if (!response.ok) throw new Error('Failed to update event');
      }
      
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
      // In Electron, use SQLite database
      if (typeof window.electronAPI !== 'undefined') {
        await window.electronAPI.db.delete('calendar_events', event.id);
        
      } else {
        // Web version - use API
        const response = await fetch(`/api/calendar.php?id=${event.id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to delete event');
      }
      
      Toast.show('Η επίσκεψη διαγράφηκε (η εργασία παραμένει)', 'success');
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
      'confirmed': 'Επιβεβαιωμένη',
      'in_progress': 'Σε Εξέλιξη',
      'in-progress': 'Σε Εξέλιξη',
      'completed': 'Ολοκληρωμένη',
      'cancelled': 'Ακυρωμένη',
      'σε εξέλιξη': 'Σε Εξέλιξη',
      'ολοκληρώθηκε': 'Ολοκληρωμένη',
      'υποψήφιος': 'Σε Αναμονή',
      'σε αναμονή': 'Σε Αναμονή',
      'επιβεβαιωμένη': 'Επιβεβαιωμένη',
      'ακυρώθηκε': 'Ακυρωμένη'
    };
    
    return statusMap[normalized] || status;
  },
  
  /* ========================================
     Συγχρονισμός Εργασιών με Ημερολόγιο
     ======================================== */
  async syncJobsToCalendar() {
    try {
      // Εμφάνιση loading
      const btn = document.getElementById('syncCalendarBtn');
      const originalHTML = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Συγχρονισμός...';
      
      let result;
      
      // In Electron, use SQLite database
      if (typeof window.electronAPI !== 'undefined') {
        // Get all jobs from database
        const jobsResponse = await window.electronAPI.db.getAll('jobs');
        const jobs = jobsResponse.success ? jobsResponse.data : [];
        
        console.log('📋 Syncing jobs to calendar:', jobs.length, 'jobs');
        
        let created = 0;
        let updated = 0;
        let skipped = 0;
        
        // For each job, create/update calendar event if it has next_visit
        for (const job of jobs) {
          const visitDate = job.next_visit;
          
          // Skip if no next_visit date
          if (!visitDate) {
            skipped++;
            continue;
          }
          
          // Check if calendar event already exists for this job
          const sql = `SELECT id FROM calendar_events WHERE job_id = ?`;
          const existingResponse = await window.electronAPI.db.query(sql, [job.id]);
          const existing = existingResponse.success ? existingResponse.data : [];
          
          const eventData = {
            title: job.title || 'Εργασία',
            start_date: visitDate,
            end_date: null,
            job_id: job.id,
            client_id: job.client_id || null,
            address: job.address || '',
            description: job.notes || '',
            status: job.status || 'pending',
            all_day: 1
          };
          
          if (existing && existing.length > 0) {
            // Update existing event
            await window.electronAPI.db.update('calendar_events', existing[0].id, eventData);
            updated++;
          } else {
            // Create new event only if job has next_visit
            await window.electronAPI.db.insert('calendar_events', eventData);
            created++;
          }
        }
        
        let message = `Δημιουργήθηκαν ${created} και ενημερώθηκαν ${updated} επισκέψεις`;
        if (skipped > 0) {
          message += ` (παραλείφθηκαν ${skipped})`;
        }
        
        result = { success: true, message };
        
      } else {
        // Web version - use API
        const response = await API.get('/api/calendar.php?action=sync');
        result = response;
      }
      
      if (result.success) {
        Toast.show(`✅ ${result.message}`, 'success');
        
        // Ανανέωση του ημερολογίου
        if (this.calendar) {
          this.calendar.refetchEvents();
        }
        
        // Ανανέωση της λίστας επόμενων επισκέψεων
        await this.loadUpcomingVisits();
      } else {
        Toast.show('❌ Σφάλμα κατά τον συγχρονισμό', 'error');
      }
      
      // Επαναφορά κουμπιού
      btn.disabled = false;
      btn.innerHTML = originalHTML;
      
    } catch (error) {
      console.error('Sync error:', error);
      Toast.show('❌ Σφάλμα σύνδεσης', 'error');
      
      // Επαναφορά κουμπιού
      const btn = document.getElementById('syncCalendarBtn');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sync-alt"></i> Συγχρονισμός';
      }
    }
  },
  
  /* ========================================
     Καθαρισμός Διπλότυπων Events
     ======================================== */
  async cleanDuplicateEvents() {
    if (typeof window.electronAPI === 'undefined') {
      Toast.show('Η λειτουργία είναι διαθέσιμη μόνο σε Electron mode', 'warning');
      return;
    }
    
    try {
      console.log('🧹 Cleaning duplicate calendar events...');
      
      // Delete all events where job_id is NOT NULL (keep only manually created events)
      // Then we'll sync again to recreate them properly
      const deleteJobEvents = await window.electronAPI.db.query(
        'DELETE FROM calendar_events WHERE job_id IS NOT NULL',
        []
      );
      
      console.log('🗑️ Deleted job-linked events:', deleteJobEvents);
      
      Toast.show('✅ Καθαρίστηκαν τα διπλότυπα events. Πατήστε Συγχρονισμός για να τα ξαναδημιουργήσετε.', 'success');
      
      // Refresh calendar
      if (this.calendar) {
        this.calendar.refetchEvents();
      }
      
      // Refresh upcoming visits
      await this.loadUpcomingVisits();
      
    } catch (error) {
      console.error('Error cleaning duplicates:', error);
      Toast.show('❌ Σφάλμα κατά τον καθαρισμό', 'error');
    }
  },
  
  /* ========================================
     Format Time (Remove seconds)
     ======================================== */
  formatTime(time) {
    if (!time) return '';
    // Remove seconds from time string (HH:MM:SS -> HH:MM)
    return time.substring(0, 5);
  }
};
