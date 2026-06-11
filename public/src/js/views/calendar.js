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
      </div>
      
      <div class="calendar-container">
        <!-- Λίστα Επόμενων Επισκέψεων -->
        <div class="upcoming-visits-panel">
          <div class="upcoming-visits-header">
            <h2><i class="fas fa-clock"></i> Επόμενες Επισκέψεις</h2>
            <span class="auto-sync-badge" title="Ο συγχρονισμός με τις εργασίες γίνεται αυτόματα">
              <i class="fas fa-sync-alt"></i> Αυτόματος συγχρονισμός
            </span>
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

    // Αυτόματος συγχρονισμός Εργασιών -> Ημερολόγιο (χωρίς κουμπί).
    // Web: ο backend κάνει upsert σε κάθε αποθήκευση εργασίας, οπότε δεν χρειάζεται.
    // Electron (offline): δεν υπάρχει backend hook, οπότε συγχρονίζουμε σιωπηλά εδώ.
    if (typeof window.electronAPI !== 'undefined') {
      await this.syncJobsToCalendar(true);
    }

    // Load upcoming visits
    await this.loadUpcomingVisits();
  },

  /** Μετατρέπει ελληνικό status εργασίας σε αγγλικό status επίσκεψης. */
  normalizeEventStatus(status) {
    const s = String(status || '').trim().toLowerCase();
    const map = {
      'ολοκληρώθηκε': 'completed',
      'εξοφλήθηκε': 'completed',
      'σε εξέλιξη': 'in_progress',
      'προγραμματισμένη': 'confirmed',
      'υποψήφιος': 'pending',
      'σε αναμονή': 'pending',
      'ακυρώθηκε': 'cancelled',
      'completed': 'completed',
      'in_progress': 'in_progress',
      'in-progress': 'in_progress',
      'confirmed': 'confirmed',
      'pending': 'pending',
      'cancelled': 'cancelled'
    };
    return map[s] || 'pending';
  },

  /* ========================================
     Initialize FullCalendar
     ======================================== */
  async initCalendar() {
    const calendarEl = document.getElementById('calendar');
    
    this.calendar = new FullCalendar.Calendar(calendarEl, {
      locale: 'el',
      timeZone: 'local', // Use local timezone to prevent date shifts
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
      selectable: false,
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
          console.log('🔄 FullCalendar requesting events for range:', info.start, 'to', info.end);
          const events = await this.loadEvents(info.start, info.end);
          console.log('✅ FullCalendar received', events.length, 'events');
          if (events.length > 0) {
            console.log('📅 First event to render:', events[0]);
            console.log('🏷️ Event title that will be displayed:', events[0].title);
          }
          successCallback(events);
        } catch (error) {
          console.error('Error loading events:', error);
          failureCallback(error);
        }
      },
      
      // Event rendering - log what FullCalendar is about to display
      eventDidMount: (info) => {
        console.log('🎨 FullCalendar rendering event:', {
          id: info.event.id,
          title: info.event.title,
          'element.textContent': info.el.textContent
        });
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
            c.name as clientName,
            c.phone as clientPhone
          FROM calendar_events ce
          LEFT JOIN clients c ON ce.client_id = c.id
          WHERE ce.start_date >= ? AND ce.start_date <= ?
            AND ce._sync_status != 'deleted'
          ORDER BY ce.start_date ASC
        `;
        
        const response = await window.electronAPI.db.query(sql, [startStr, endStr]);
        const result = response.success ? response.data : [];
        
        console.log('📅 loadEvents SQL result:', result.length, 'events');
        if (result.length > 0) {
          console.log('📅 First DB event:', result[0]);
          console.log('📊 DB event fields:', Object.keys(result[0]));
        }
        
        // Transform database results to FullCalendar format
        events = result.map(event => this.transformEventFromDB(event));

        const recordedVisits = await this.loadRecordedVisitEventsFromSQLite(startStr, endStr);
        events = [...events, ...recordedVisits];
        
        console.log('📅 After transformation:', events.length, 'events');
        if (events.length > 0) {
          console.log('📅 First transformed event:', events[0]);
          console.log('📊 Transformed event has title:', events[0].title);
        }
        
      } else {
        // Web version - use API
        const url = `/api/calendar.php?start=${startStr}&end=${endStr}`;
        const response = await fetch(url, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to load calendar events');
        }
        
        const payload = await response.json();
        events = Array.isArray(payload)
          ? payload
          : (Array.isArray(payload.data) ? payload.data : []);

        const recordedVisits = await this.loadRecordedVisitEventsFromApi(startStr, endStr);
        events = this.mergeRecordedVisitEvents(events, recordedVisits);
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
    let startDate = dbEvent.startDate || dbEvent.start_date || dbEvent.date;
    let endDate = dbEvent.endDate || dbEvent.end_date;
    const startTime = dbEvent.startTime || dbEvent.start_time;
    const endTime = dbEvent.endTime || dbEvent.end_time;
    const allDay = dbEvent.allDay !== undefined ? dbEvent.allDay : dbEvent.all_day;
    
    // Clean up date format - remove time part if it's ' 00:00:00'
    if (startDate && typeof startDate === 'string') {
      startDate = startDate.replace(' 00:00:00', '').split('T')[0];
    }
    if (endDate && typeof endDate === 'string') {
      endDate = endDate.replace(' 00:00:00', '').split('T')[0];
    }
    
    console.log('🔍 Date fields:', { startDate, endDate, startTime, endTime, allDay });
    
    // Extract client name - camelCase from electronAPI.db.query()
    const clientName = dbEvent.clientName || '';
    const clientPhone = dbEvent.clientPhone || '';
    
    // Use stored title as the base (clean job title or user input)
    const baseTitle = dbEvent.title || 'Επίσκεψη';
    
    // Build display title without duplicating "Client - Client" when the title is the client name.
    const displayTitle = clientName && baseTitle !== clientName ? `${baseTitle} - ${clientName}` : baseTitle;
    
    console.log('🏷️ Title info:', { 
      storedTitle: dbEvent.title,
      clientName: clientName,
      displayTitle: displayTitle
    });
    
    console.log('📊 RETURN EVENT:', {
      id: dbEvent.id,
      'event.title (FullCalendar display)': displayTitle,
      'extendedProps.originalTitle (for editing)': baseTitle,
      'extendedProps.clientName': clientName
    });
    
    // For all-day events, FullCalendar needs dates in local timezone to prevent shifts
    // Create Date objects in local timezone by parsing YYYY-MM-DD as local date
    let eventStart, eventEnd;
    
    if (allDay) {
      // For all-day events: parse as local date to prevent UTC conversion
      // Use date constructor with year, month, day to ensure local timezone
      const [year, month, day] = startDate.split('-').map(Number);
      eventStart = new Date(year, month - 1, day); // month is 0-indexed
      
      if (endDate) {
        const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
        // FullCalendar uses EXCLUSIVE end dates for all-day events
        // So we need to add 1 day to include the end date in the display
        const endDateObj = new Date(endYear, endMonth - 1, endDay);
        endDateObj.setDate(endDateObj.getDate() + 1); // Add 1 day to make it inclusive
        eventEnd = endDateObj;
      } else {
        eventEnd = null;
      }
    } else {
      // For timed events: include time component
      eventStart = `${startDate}T${startTime || '00:00:00'}`;
      eventEnd = endDate ? `${endDate}T${endTime || '23:59:59'}` : null;
    }
    
    return {
      id: dbEvent.id,
      title: displayTitle,
      start: eventStart,
      end: eventEnd,
      allDay: Boolean(allDay),
      backgroundColor: this.getStatusColor(dbEvent.status),
      borderColor: this.getStatusColor(dbEvent.status),
      extendedProps: {
        originalTitle: baseTitle,
        original_title: baseTitle,
        clientId: dbEvent.clientId,
        client_id: dbEvent.clientId,
        clientName: clientName,
        client_name: clientName,
        clientPhone: clientPhone,
        client_phone: clientPhone,
        jobId: dbEvent.jobId,
        job_id: dbEvent.jobId,
        address: dbEvent.address,
        description: dbEvent.description,
        status: dbEvent.status,
        startTime: startTime,
        start_time: startTime,
        endTime: endTime,
        end_time: endTime
      }
    };
  },

  getRecordedVisitTotals(workers) {
    if (typeof workers === 'string') {
      try {
        workers = JSON.parse(workers);
      } catch (error) {
        workers = [];
      }
    }
    if (!Array.isArray(workers)) workers = [];

    return workers.reduce((totals, worker) => {
      const hours = parseFloat(worker.hours ?? worker.hoursAllocated ?? worker.hours_allocated ?? 0) || 0;
      const rate = parseFloat(worker.hourlyRate ?? worker.hourly_rate ?? 0) || 0;
      const type = (worker.workerType || worker.worker_type) === 'owner' ? 'owner' : 'employee';
      totals.totalHours += hours;
      if (type !== 'owner') {
        totals.laborCost += (worker.laborCost !== undefined || worker.labor_cost !== undefined)
          ? (parseFloat(worker.laborCost ?? worker.labor_cost) || 0)
          : hours * rate;
      }
      return totals;
    }, { totalHours: 0, laborCost: 0 });
  },

  transformRecordedVisitFromDB(visit) {
    const totals = this.getRecordedVisitTotals(visit.workers);
    const who = visit.clientName || visit.jobTitle || 'Επίσκεψη';
    const hoursLabel = totals.totalHours > 0
      ? ` (${Number(totals.totalHours.toFixed(1)).toString()}ω)`
      : '';
    const visitDate = String(visit.visitDate || visit.visit_date || '').substring(0, 10);

    return {
      id: `jobvisit-${visit.id}`,
      title: `✔ ${who}${hoursLabel}`,
      start: visitDate,
      allDay: true,
      editable: false,
      backgroundColor: '#64748b',
      borderColor: '#64748b',
      extendedProps: {
        readonly_visit: true,
        visit_id: Number(visit.id),
        job_id: Number(visit.jobId || visit.job_id),
        job_title: visit.jobTitle || visit.job_title || '',
        client_name: visit.clientName || visit.client_name || '',
        description: visit.notes || '',
        total_hours: totals.totalHours,
        labor_cost: totals.laborCost,
        status: 'completed'
      }
    };
  },

  mergeRecordedVisitEvents(events, recordedVisits) {
    const merged = [...events];
    const existingIds = new Set(merged.map(event => String(event.id)));

    recordedVisits.forEach(visitEvent => {
      if (!existingIds.has(String(visitEvent.id))) {
        merged.push(visitEvent);
        existingIds.add(String(visitEvent.id));
      }
    });

    return merged;
  },

  async loadRecordedVisitEventsFromApi(start, end) {
    try {
      const response = await fetch('/api/job_visits.php', { credentials: 'include' });
      if (!response.ok) return [];

      const payload = await response.json();
      const visits = Array.isArray(payload)
        ? payload
        : (Array.isArray(payload.data) ? payload.data : []);

      return visits
        .filter(visit => {
          const visitDate = String(visit.visitDate || visit.visit_date || '').substring(0, 10);
          return visitDate && visitDate >= start && visitDate <= end;
        })
        .map(visit => this.transformRecordedVisitFromDB(visit));
    } catch (error) {
      console.error('Error loading recorded job visits:', error);
      return [];
    }
  },

  async loadRecordedVisitEventsFromSQLite(start, end) {
    const sql = `
      SELECT
        jv.id,
        jv.job_id,
        jv.visit_date,
        jv.workers,
        jv.notes,
        j.title as jobTitle,
        c.name as clientName
      FROM job_visits jv
      INNER JOIN jobs j ON j.id = jv.job_id
      LEFT JOIN clients c ON c.id = j.client_id
      WHERE jv.visit_date >= ? AND jv.visit_date <= ?
      ORDER BY jv.visit_date ASC
    `;

    const response = await window.electronAPI.db.query(sql, [start, end]);
    const visits = response.success ? response.data : [];
    return visits.map(visit => this.transformRecordedVisitFromDB(visit));
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
            c.name as clientName,
            c.phone as clientPhone
          FROM calendar_events ce
          LEFT JOIN clients c ON ce.client_id = c.id
          WHERE ce.start_date >= ? AND ce.start_date <= ?
          AND ce.start_date IS NOT NULL
          AND ce._sync_status != 'deleted'
          ORDER BY ce.start_date ASC
        `;  
        
        const response = await window.electronAPI.db.query(sql, [start, end]);
        console.log('📅 SQLite response:', response);
        const result = response.success ? response.data : [];
        console.log('📅 Calendar events from DB:', result);
        
        // Log first event to see ALL field names
        if (result.length > 0) {
          console.log('📅 First event raw data:', result[0]);
          console.log('📅 All field names:', Object.keys(result[0]));
          console.log('📅 clientId:', result[0].clientId);
          console.log('📅 jobId:', result[0].jobId);
          console.log('📅 clientName from JOIN:', result[0].clientName);
        }
        
        // Transform database results
        events = result.map(event => this.transformEventFromDB(event));
        const recordedVisits = await this.loadRecordedVisitEventsFromSQLite(start, end);
        events = this.mergeRecordedVisitEvents(events, recordedVisits)
          .sort((a, b) => new Date(a.start) - new Date(b.start))
          .slice(0, 10);
        console.log('📅 Transformed events:', events);
      } else {
        // Web version - use API
        const url = `/api/calendar.php?start=${start}&end=${end}`;
        const response = await fetch(url, { credentials: 'include' });
        const payload = await response.json();
        events = Array.isArray(payload)
          ? payload
          : (Array.isArray(payload.data) ? payload.data : []);

        const recordedVisits = await this.loadRecordedVisitEventsFromApi(start, end);
        events = this.mergeRecordedVisitEvents(events, recordedVisits);
        
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
      
      // Extract client info - use camelCase (from extendedProps)
      const clientName = props.clientName || props.client_name || '';
      const clientPhone = props.clientPhone || props.client_phone || '';
      const address = props.address || visit.address || '';
      
      // Use original_title from extendedProps (clean title without client name)
      // Build displayTitle from original_title + clientName, or use visit.title if original_title doesn't exist
      const originalTitle = props.original_title || props.originalTitle;
      const displayTitle = originalTitle
        ? (clientName && originalTitle !== clientName ? `${originalTitle} - ${clientName}` : originalTitle)
        : visit.title;
      
      console.log('📅 Rendering visit:', { 
        originalTitle,
        clientName, 
        displayTitle
      });
      
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
    
    console.log('📅 showEventDetailsFromData called with:', visitData);
    
    const props = visitData.extendedProps || {};

    if (props.readonly_visit || String(visitData.id).startsWith('jobvisit-')) {
      this.showRecordedVisitDetails(visitData, props);
      return;
    }
    
    console.log('📦 extendedProps:', props);
    
    // Get status from multiple possible sources
    const status = props.status || visitData.status || 'pending';
    const normalizedStatus = this.normalizeStatus(status);
    
    // Use originalTitle if available (without client name), otherwise use visitData.title
    const displayTitle = props.original_title || props.originalTitle || visitData.title;
    
    console.log('🏷️ Modal title will be:', displayTitle);
    console.log('📊 Title sources:', {
      'props.original_title': props.original_title,
      'props.originalTitle': props.originalTitle,
      'visitData.title': visitData.title,
      'FINAL displayTitle': displayTitle
    });
    
    // For all-day events, the API adds +1 day to end date for FullCalendar
    // We need to subtract 1 day to show the actual end date in the modal
    let displayEndDate = visitData.end;
    if (visitData.end && visitData.allDay) {
      // Handle both Date objects and strings
      let endDate;
      if (visitData.end instanceof Date) {
        endDate = new Date(visitData.end);
        endDate.setDate(endDate.getDate() - 1);
      } else {
        // Parse string as local date to avoid UTC conversion
        const endDateStr = visitData.end.split('T')[0];
        const [year, month, day] = endDateStr.split('-').map(Number);
        endDate = new Date(year, month - 1, day);
        endDate.setDate(endDate.getDate() - 1);
      }
      // Always format to string for display
      const newYear = endDate.getFullYear();
      const newMonth = String(endDate.getMonth() + 1).padStart(2, '0');
      const newDay = String(endDate.getDate()).padStart(2, '0');
      displayEndDate = `${newYear}-${newMonth}-${newDay}`;
    }
    
    Modal.show({
      title: displayTitle,
      content: `
        <div class="event-details">
          <div class="detail-row">
            <strong><i class="fas fa-calendar"></i> Ημερομηνία:</strong>
            <span>${this.formatDateTime(visitData.start)}</span>
          </div>
          ${displayEndDate ? `
            <div class="detail-row">
              <strong><i class="fas fa-calendar-check"></i> Λήξη:</strong>
              <span>${this.formatDateTime(displayEndDate)}</span>
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
              this.showDeleteConfirmation(visitData.id, props.job_id || props.jobId || null);
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
  showDeleteConfirmation(eventId, jobId = null) {
    // Επίσκεψη συνδεδεμένη με εργασία -> διαγραφή ολόκληρης εργασίας
    if (jobId) {
      Modal.show({
        title: 'Διαγραφή εργασίας',
        content: `
          <div class="confirmation-dialog">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--danger, #ef4444); margin-bottom: 1rem;"></i>
            <p style="font-size: 1.05rem; margin-bottom: 0.5rem;">Αυτή η επίσκεψη ανήκει σε <strong>εργασία</strong>.</p>
            <p style="color: var(--text-secondary); font-size: 0.9rem;">Η διαγραφή θα αφαιρέσει την εργασία και την επίσκεψη από το ημερολόγιο.</p>
          </div>
        `,
        buttons: [
          {
            text: 'Διαγραφή εργασίας',
            className: 'btn-danger',
            onClick: async () => {
              await this.deleteWholeJob(eventId, jobId);
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
      return;
    }

    // Ανεξάρτητη επίσκεψη -> απλή διαγραφή
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

  /* Αφαίρεση επίσκεψης από το ημερολόγιο — η εργασία παραμένει (καθαρίζει το next_visit) */
  async removeVisitFromCalendar(eventId, jobId) {
    try {
      if (typeof window.electronAPI !== 'undefined') {
        await window.electronAPI.db.delete('calendar_events', eventId);
        if (jobId) {
          await window.electronAPI.db.update('jobs', jobId, {
            next_visit: null,
            visit_end_date: null,
            visit_start_time: null,
            visit_end_time: null,
            visit_all_day: 1
          });
        }
      } else {
        const response = await fetch(`/api/calendar.php?id=${eventId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to remove visit');
      }

      Toast.show('Αφαιρέθηκε από το ημερολόγιο (η εργασία παραμένει)', 'success');
      this.refreshAfterDelete(eventId);
    } catch (error) {
      console.error('❌ Error removing visit:', error);
      Toast.show('Σφάλμα αφαίρεσης', 'error');
    }
  },

  /* Διαγραφή ολόκληρης της εργασίας (μαζί με την επίσκεψη + Google) */
  async deleteWholeJob(eventId, jobId) {
    try {
      if (typeof window.electronAPI !== 'undefined') {
        // Σβήσε πρώτα τις συνδεδεμένες επισκέψεις, μετά την εργασία
        await window.electronAPI.db.query('DELETE FROM calendar_events WHERE job_id = ?', [jobId]);
        await window.electronAPI.db.delete('jobs', jobId);
      } else {
        const response = await fetch(`/api/jobs.php?id=${jobId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to delete job');
      }

      Toast.show('Η εργασία διαγράφηκε', 'success');
      this.refreshAfterDelete(eventId);

      // Ανανέωσε και το State ώστε να φύγει από το tab Εργασίες
      if (typeof State !== 'undefined' && State.loadAll) {
        State.loadAll().catch(() => {});
      }
    } catch (error) {
      console.error('❌ Error deleting job:', error);
      Toast.show('Σφάλμα διαγραφής εργασίας', 'error');
    }
  },

  /* Κοινός καθαρισμός UI μετά από διαγραφή/αφαίρεση */
  refreshAfterDelete(eventId) {
    const event = this.calendar ? this.calendar.getEventById(eventId) : null;
    if (event) event.remove();
    this.loadUpcomingVisits().catch(err => console.error('Error reloading upcoming visits:', err));
    if (this.calendar) this.calendar.refetchEvents();
  },

  /* ========================================
     Delete Event by ID
     ======================================== */
  async deleteEventById(eventId) {
    try {
      console.log('🗑️ Deleting event ID:', eventId);
      
      // In Electron, use SQLite database
      if (typeof window.electronAPI !== 'undefined') {
        const result = await window.electronAPI.db.delete('calendar_events', eventId);
        console.log('🗑️ Delete result:', result);
        
      } else {
        // Web version - use API
        const response = await fetch(`/api/calendar.php?id=${eventId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to delete event');
      }
      
      Toast.show('Η επίσκεψη διαγράφηκε (η εργασία παραμένει)', 'success');
      
      this.refreshAfterDelete(eventId);
      if (typeof State !== 'undefined' && State.loadAll) {
        State.loadAll().catch(() => {});
      }
      
    } catch (error) {
      console.error('❌ Error deleting event:', error);
      Toast.show('Σφάλμα διαγραφής', 'error');
    }
  },

  /* ========================================
     Read-only modal για καταγεγραμμένη επίσκεψη εργασίας
     ======================================== */
  showRecordedVisitDetails(event, props) {
    const dateText = event.start ? Utils.formatDate(event.start) : '-';
    const hours = parseFloat(props.total_hours || 0) || 0;
    const content = `
      <div class="detail-grid">
        <div class="detail-item">
          <label>Πελάτης:</label>
          <span>${props.client_name || '-'}</span>
        </div>
        <div class="detail-item">
          <label>Ημερομηνία:</label>
          <span>${dateText}</span>
        </div>
        <div class="detail-item">
          <label>Σύνολο ωρών:</label>
          <span>${hours ? hours + ' ώρες' : '-'}</span>
        </div>
        ${props.description ? `
        <div class="detail-item span-2">
          <label>Σημειώσεις:</label>
          <span>${props.description}</span>
        </div>
        ` : ''}
        <div class="detail-item span-2">
          <small class="text-muted">
            <i class="fas fa-info-circle"></i> Η καταγεγραμμένη επίσκεψη επεξεργάζεται από την αντίστοιχη καρτέλα.
          </small>
        </div>
      </div>
    `;
    const footer = props.job_id ? `
      <button class="btn-primary" onclick="Modal.close(); Router.navigate('jobs'); setTimeout(() => window.JobsView && window.JobsView.viewJob(${props.job_id}), 300);">
        <i class="fas fa-briefcase"></i> Άνοιγμα
      </button>
    ` : '';
    Modal.open({
      title: '<i class="fas fa-clock"></i> Καταγεγραμμένη Επίσκεψη',
      content,
      footer,
      size: 'md'
    });
  },

  /* ========================================
     Show Event Details Modal
     ======================================== */
  showEventDetails(event) {
    
    console.log('📅 showEventDetails called with:', event);
    
    const props = event.extendedProps || {};

    // Read-only events από καταγεγραμμένες επισκέψεις εργασιών (job_visits)
    if (props.readonly_visit || String(event.id).startsWith('jobvisit-')) {
      this.showRecordedVisitDetails(event, props);
      return;
    }
    
    console.log('📦 extendedProps:', props);
    
    // Get status from multiple possible sources
    const status = props.status || event.status || 'pending';
    const normalizedStatus = this.normalizeStatus(status);
    
    // Use originalTitle if available (without client name), otherwise use event.title
    const displayTitle = props.originalTitle || props.original_title || event.title;
    const clientName = props.clientName || props.client_name || '';
    const clientPhone = props.clientPhone || props.client_phone || '';
    
    console.log('🏷️ Modal title will be:', displayTitle);
    console.log('👤 Client info:', { clientName, clientPhone });
    console.log('📊 Title sources:', {
      'props.originalTitle': props.originalTitle,
      'props.original_title': props.original_title,
      'event.title': event.title,
      'FINAL displayTitle': displayTitle
    });
    
    // For all-day events, the API adds +1 day to end date for FullCalendar
    // We need to subtract 1 day to show the actual end date in the modal
    let displayEndDate = event.end;
    if (event.end && event.allDay) {
      // Handle both Date objects and strings
      let endDate;
      if (event.end instanceof Date) {
        endDate = new Date(event.end);
        endDate.setDate(endDate.getDate() - 1);
      } else {
        // Parse string as local date to avoid UTC conversion
        const endDateStr = event.end.split('T')[0];
        const [year, month, day] = endDateStr.split('-').map(Number);
        endDate = new Date(year, month - 1, day);
        endDate.setDate(endDate.getDate() - 1);
      }
      // Format back to string or keep as Date
      if (typeof event.end === 'string') {
        const newYear = endDate.getFullYear();
        const newMonth = String(endDate.getMonth() + 1).padStart(2, '0');
        const newDay = String(endDate.getDate()).padStart(2, '0');
        displayEndDate = `${newYear}-${newMonth}-${newDay}`;
      } else {
        displayEndDate = endDate;
      }
    }
    
    Modal.show({
      title: displayTitle,
      content: `
        <div class="event-details">
          <div class="detail-row">
            <strong><i class="fas fa-calendar"></i> Ημερομηνία:</strong>
            <span>${this.formatDateTime(event.start)}</span>
          </div>
          ${displayEndDate ? `
            <div class="detail-row">
              <strong><i class="fas fa-calendar-check"></i> Λήξη:</strong>
              <span>${this.formatDateTime(displayEndDate)}</span>
            </div>
          ` : ''}
          ${!event.allDay && (props.startTime || props.start_time || props.endTime || props.end_time) ? `
            <div class="detail-row">
              <strong><i class="fas fa-clock"></i> Ώρα:</strong>
              <span>${this.formatTime(props.startTime || props.start_time) || ''}${(props.endTime || props.end_time) ? ' - ' + this.formatTime(props.endTime || props.end_time) : ''}</span>
            </div>
          ` : ''}
          ${clientName ? `
            <div class="detail-row">
              <strong><i class="fas fa-user"></i> Πελάτης:</strong>
              <span>${clientName}</span>
            </div>
          ` : ''}
          ${clientPhone ? `
            <div class="detail-row">
              <strong><i class="fas fa-phone"></i> Τηλέφωνο:</strong>
              <span><a href="tel:${clientPhone}">${clientPhone}</a></span>
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
     Show Edit Visit Modal
     ======================================== */
  async showEditVisitModal(event) {
    const props = event.extendedProps || {};
    
    // Handle date conversion safely - use local timezone to avoid date shifts
    let startDate = '';
    let endDate = '';
    
    // Convert start date - if it's already YYYY-MM-DD string, use it directly
    if (event.start) {
      if (typeof event.start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(event.start)) {
        startDate = event.start;
      } else {
        const startObj = typeof event.start === 'string' ? new Date(event.start) : event.start;
        if (startObj && !isNaN(startObj.getTime())) {
          // Use local date to avoid UTC conversion shift
          const year = startObj.getFullYear();
          const month = String(startObj.getMonth() + 1).padStart(2, '0');
          const day = String(startObj.getDate()).padStart(2, '0');
          startDate = `${year}-${month}-${day}`;
        }
      }
    }
    
    // Convert end date - if it's already YYYY-MM-DD string, use it directly
    if (event.end) {
      if (typeof event.end === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(event.end)) {
        endDate = event.end;
      } else {
        const endObj = typeof event.end === 'string' ? new Date(event.end) : event.end;
        if (endObj && !isNaN(endObj.getTime())) {
          // For all-day events, FullCalendar adds +1 day to end date (exclusive end)
          // We need to subtract 1 day to show the actual end date in the form
          const adjustedEndObj = new Date(endObj);
          if (event.allDay) {
            adjustedEndObj.setDate(adjustedEndObj.getDate() - 1);
          }
          
          // Use local date to avoid UTC conversion shift
          const year = adjustedEndObj.getFullYear();
          const month = String(adjustedEndObj.getMonth() + 1).padStart(2, '0');
          const day = String(adjustedEndObj.getDate()).padStart(2, '0');
          endDate = `${year}-${month}-${day}`;
        }
      }
    }
    
    // Get jobs and clients for dropdowns
    let jobs = [];
    let clients = [];
    
    try {
      jobs = await API.getJobs();
      clients = await API.getClients();
      
      // Map client names to jobs
      jobs = jobs.map(job => {
        const jobClientId = job.clientId || job.client_id;
        const client = clients.find(c => c.id === jobClientId);
        return {
          ...job,
          clientName: client ? client.name : 'Χωρίς πελάτη'
        };
      });
      
      console.log('📋 Edit Modal - Jobs with clients:', jobs);
      
    } catch (error) {
      console.error('Error loading data:', error);
    }
    
    const clientId = props.clientId || props.client_id || '';
    const jobId = props.jobId || props.job_id || '';
    const isLinkedJob = Boolean(jobId);
    
    console.log('✏️ Edit Modal - Event data:', {
      eventId: event.id,
      clientId: clientId,
      jobId: jobId,
      cleanTitle: props.originalTitle || props.original_title,
      fullTitle: event.title
    });
    
    
    // Use title from extendedProps (clean title without client name)
    // For events with jobs, this should be the job title
    // For manual events, this is the user-entered title
    const cleanTitle = props.originalTitle || props.original_title || event.title;
    const linkedJob = isLinkedJob ? jobs.find(j => j.id == jobId) : null;
    const linkedClientName = props.clientName || props.client_name || linkedJob?.clientName || '';
    const linkedJobTitle = linkedJob?.title || '';
    const visitTitleValue = isLinkedJob && linkedClientName && (!cleanTitle || cleanTitle === linkedJobTitle || cleanTitle === 'Εργασία')
      ? linkedClientName
      : cleanTitle;
    
    // Normalize status for comparison
    const normalizedStatus = this.normalizeStatus(props.status || 'pending');
    
    // Check if event is all-day (handle both boolean and number)
    const isAllDay = Boolean(event.allDay);
    
    
    Modal.show({
      title: isLinkedJob ? 'Πρόγραμμα Επίσκεψης (συνδεδεμένη εργασία)' : 'Επεξεργασία Επίσκεψης',
      content: `
        <form id="editVisitForm" class="form">
          ${isLinkedJob ? `
          <div class="alert alert-info" style="margin-bottom: 1rem;">
            <p style="margin: 0 0 0.5rem;">Η <strong>διεύθυνση</strong> και η <strong>περιγραφή</strong> επεξεργάζονται από την Εργασία.</p>
            <button type="button" class="btn btn-sm btn-secondary" id="openLinkedJobBtn">
              <i class="fas fa-briefcase"></i> Άνοιγμα εργασίας
            </button>
          </div>` : ''}
          <div class="form-group">
            <label for="editVisitJob">Σχετίζεται με Εργασία</label>
            <select id="editVisitJob" class="form-control" ${isLinkedJob ? 'disabled data-linked-job-id="' + jobId + '"' : ''}>
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
          
          <div class="form-group" id="editVisitTitleGroup" style="display: ${isLinkedJob ? 'none' : 'block'};">
            <label for="editVisitTitle">Τίτλος *</label>
            <input type="text" id="editVisitTitle" class="form-control" value="${visitTitleValue}" placeholder="π.χ. ${linkedClientName || 'Βαφή Διαμερίσματος'}" ${isLinkedJob ? 'disabled' : 'required'}>
          </div>
          
          <div class="form-group">
            <label for="editVisitAddress">Διεύθυνση</label>
            <input type="text" id="editVisitAddress" class="form-control" value="${props.address || ''}" placeholder="Διεύθυνση" ${isLinkedJob ? 'readonly' : ''}>
          </div>
          
          <div class="form-group">
            <label for="editVisitDescription">Περιγραφή</label>
            <textarea id="editVisitDescription" class="form-control" rows="3" placeholder="Περιγραφή εργασίας" ${isLinkedJob ? 'readonly' : ''}>${props.description || ''}</textarea>
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
    const titleGroup = document.getElementById('editVisitTitleGroup');
    const titleInput = document.getElementById('editVisitTitle');

    const setTitleFieldVisible = (visible) => {
      if (titleGroup) titleGroup.style.display = visible ? 'block' : 'none';
      if (titleInput) {
        titleInput.disabled = !visible;
        titleInput.required = visible;
      }
    };
    
    // Initialize: if job is selected, show readonly client field
    if (jobId) {
      const selectedJob = jobs.find(j => j.id == jobId);
      if (selectedJob) {
        clientSelectGroup.style.display = 'none';
        clientTextGroup.style.display = 'block';
        clientText.value = selectedJob.clientName || '';
        setTitleFieldVisible(false);
      }
    } else {
      // No job - show client dropdown
      clientSelectGroup.style.display = 'block';
      clientTextGroup.style.display = 'none';
      setTitleFieldVisible(true);
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
        setTitleFieldVisible(false);
        const titleInput = document.getElementById('editVisitTitle');
        if (titleInput && !titleInput.value.trim()) {
          titleInput.value = selectedOption.dataset.client || selectedOption.dataset.title || '';
        }
      } else {
        // Independent visit - show client dropdown
        clientSelectGroup.style.display = 'block';
        clientTextGroup.style.display = 'none';
        setTitleFieldVisible(true);
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

    const openJobBtn = document.getElementById('openLinkedJobBtn');
    if (openJobBtn && jobId) {
      openJobBtn.addEventListener('click', () => {
        Modal.hide();
        if (typeof Router !== 'undefined') Router.navigate('jobs');
        if (window.JobsView && typeof window.JobsView.editJob === 'function') {
          setTimeout(() => window.JobsView.editJob(jobId), 250);
        }
      });
    }
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
    
    const jobId = jobElement ? (jobElement.dataset.linkedJobId || jobElement.value || null) : null;
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
    
    const titleInput = document.getElementById('editVisitTitle');
    const title = titleInput && !titleInput.disabled ? titleInput.value : null;
    
    console.log('✏️ Updating visit with:', {
      eventId: event.id,
      title: title,
      clientId: clientId,
      jobId: jobId,
      'Stored in DB as title': jobId ? '(unchanged - linked job)' : title,
      'Stored in DB as original_title': jobId ? '(unchanged - linked job)' : title
    });
    
    const eventData = {
      start_date: document.getElementById('editVisitStartDate').value,
      end_date: document.getElementById('editVisitEndDate').value || null,
      job_id: jobId,
      client_id: clientId,
      address: document.getElementById('editVisitAddress').value,
      description: document.getElementById('editVisitDescription').value,
      status: document.getElementById('editVisitStatus').value,
      all_day: isAllDay ? 1 : 0
    };

    if (!jobId) {
      eventData.title = title;
      eventData.original_title = title;
    }
    
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
      if (typeof State !== 'undefined') {
        if (State.loadAll) await State.loadAll();
        if (State.refreshJobsIfNeeded) State.refreshJobsIfNeeded();
      }
      
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
      // Οι καταγεγραμμένες επισκέψεις (job_visits) δεν μετακινούνται από το ημερολόγιο
      if (String(event.id).startsWith('jobvisit-')) {
        this.calendar.refetchEvents();
        return;
      }
      const pad = (n) => String(n).padStart(2, '0');
      const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const fmtTime = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

      let startDate;
      let endDate = null;
      const eventData = { all_day: event.allDay ? 1 : 0 };

      if (event.allDay) {
        startDate = fmtDate(event.start);
        if (event.end) {
          const e = new Date(event.end);
          e.setDate(e.getDate() - 1);
          endDate = fmtDate(e);
        } else {
          endDate = startDate;
        }
        eventData.start_time = null;
        eventData.end_time = null;
      } else {
        startDate = fmtDate(event.start);
        endDate = event.end ? fmtDate(event.end) : startDate;
        eventData.start_time = fmtTime(event.start);
        eventData.end_time = event.end ? fmtTime(event.end) : null;
      }

      eventData.start_date = startDate;
      eventData.end_date = endDate;
      
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
      if (typeof State !== 'undefined') {
        if (State.loadAll) State.loadAll().catch(() => {});
        if (State.refreshJobsIfNeeded) State.refreshJobsIfNeeded();
      }
      
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
  async syncJobsToCalendar(silent = false) {
    try {
      // Εμφάνιση loading (το κουμπί μπορεί να μην υπάρχει πλέον - αυτόματος sync)
      const btn = document.getElementById('syncCalendarBtn');
      const originalHTML = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Συγχρονισμός...';
      }
      
      let result;
      
      // In Electron, use SQLite database
      if (typeof window.electronAPI !== 'undefined') {
        // Get all jobs and clients from database
        const jobsResponse = await window.electronAPI.db.getAll('jobs');
        const jobs = jobsResponse.success ? jobsResponse.data : [];
        
        const clientsResponse = await window.electronAPI.db.getAll('clients');
        const clients = clientsResponse.success ? clientsResponse.data : [];
        
        console.log('📋 Syncing jobs to calendar:', jobs.length, 'jobs');
        console.log('👥 Available clients:', clients.length, 'clients');
        
        let created = 0;
        let updated = 0;
        let skipped = 0;
        let deleted = 0;
        
        // First, get all job IDs that have next_visit
        const jobIdsWithVisits = jobs
          .filter(job => job.nextVisit || job.next_visit)
          .map(job => job.id);
        
        // Delete calendar events for jobs that no longer have next_visit
        // ONLY delete events that are linked to jobs (job_id IS NOT NULL)
        // Manual events (job_id = NULL) should never be touched by sync
        if (jobIdsWithVisits.length > 0) {
          const placeholders = jobIdsWithVisits.map(() => '?').join(',');
          const deleteSQL = `
            UPDATE calendar_events 
            SET _sync_status = 'deleted', _sync_timestamp = ?
            WHERE job_id IS NOT NULL 
              AND job_id NOT IN (${placeholders})
              AND _sync_status != 'deleted'
          `;
          const deleteResult = await window.electronAPI.db.query(deleteSQL, [Date.now(), ...jobIdsWithVisits]);
          deleted = deleteResult.success && deleteResult.data?.changes ? deleteResult.data.changes : 0;
          
          if (deleted > 0) {
            console.log(`🗑️ Deleted ${deleted} events for jobs without next_visit`);
          }
        }
        
        // For each job, create/update calendar event if it has next_visit
        for (const job of jobs) {
          // Support both camelCase (from Electron) and snake_case (from API)
          const visitDate = job.nextVisit || job.next_visit;
          
          // Skip if no next_visit date
          if (!visitDate) {
            skipped++;
            continue;
          }
          
          // Get client ID
          const jobClientId = job.clientId || job.client_id;
          const jobClient = clients.find(client => Number(client.id) === Number(jobClientId));
          
          // Default title is the customer name, but existing events keep user edits.
          const eventTitle = jobClient?.name || job.title || 'Εργασία';
          
          console.log(`📅 Job ${job.id}: clientId=${jobClientId}, storing title="${eventTitle}"`);
          
          // Check if calendar event already exists for this job (excluding deleted ones)
          const sql = `SELECT id, end_date FROM calendar_events WHERE job_id = ? AND _sync_status != 'deleted'`;
          const existingResponse = await window.electronAPI.db.query(sql, [job.id]);
          const existing = existingResponse.success ? existingResponse.data : [];

          const visitStart = String(visitDate).substring(0, 10);
          const jobEndDate = job.visitEndDate || job.visit_end_date;
          let eventEndDate = visitStart;
          if (jobEndDate && String(jobEndDate).substring(0, 10) >= visitStart) {
            eventEndDate = String(jobEndDate).substring(0, 10);
          } else if (existing && existing.length > 0 && existing[0].end_date) {
            const evEnd = String(existing[0].end_date).substring(0, 10);
            if (evEnd >= visitStart) eventEndDate = evEnd;
          }
          
          // Ωράριο επίσκεψης (ενοποιημένο με την εργασία)
          const rawAllDay = (job.visitAllDay !== undefined ? job.visitAllDay : job.visit_all_day);
          const isAllDay = (rawAllDay === undefined || rawAllDay === null) ? 1 : Number(rawAllDay);
          const startTime = isAllDay ? null : (job.visitStartTime || job.visit_start_time || null);
          const endTime = isAllDay ? null : (job.visitEndTime || job.visit_end_time || null);

          const eventData = {
            title: eventTitle,
            original_title: eventTitle,
            start_date: visitStart,
            end_date: eventEndDate,
            start_time: startTime,
            end_time: endTime,
            job_id: job.id,
            client_id: jobClientId,
            address: job.address || '',
            description: job.notes || '',
            status: this.normalizeEventStatus(job.status),
            all_day: isAllDay
          };
          
          if (existing && existing.length > 0) {
            // Update existing event without overwriting a user-edited title.
            const scheduleData = { ...eventData };
            delete scheduleData.title;
            delete scheduleData.original_title;
            await window.electronAPI.db.update('calendar_events', existing[0].id, scheduleData);
            updated++;
          } else {
            // Create new event only if job has next_visit
            await window.electronAPI.db.insert('calendar_events', eventData);
            created++;
          }
        }
        
        let message = `Δημιουργήθηκαν ${created}, ενημερώθηκαν ${updated}`;
        if (deleted > 0) {
          message += `, διαγράφηκαν ${deleted}`;
        }
        message += ' επισκέψεις';
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
        if (!silent) Toast.show(`✅ ${result.message}`, 'success');

        // Force re-render of calendar
        console.log('🔄 Refreshing calendar after sync...');

        // Reload upcoming visits first
        await this.loadUpcomingVisits();

        // Then refresh the calendar
        if (this.calendar) {
          this.calendar.refetchEvents();
        }
      } else if (!silent) {
        Toast.show('❌ Σφάλμα κατά τον συγχρονισμό', 'error');
      }

      // Επαναφορά κουμπιού (αν υπάρχει)
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
      }

    } catch (error) {
      console.error('Sync error:', error);
      if (!silent) Toast.show('❌ Σφάλμα σύνδεσης', 'error');

      // Επαναφορά κουμπιού (αν υπάρχει)
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
