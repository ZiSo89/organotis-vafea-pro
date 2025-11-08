/* ========================================
   Dashboard View - Αρχική Σελίδα
   ======================================== */

window.DashboardView = {
  statusChart: null, // Store chart instance
  
  render(container) {
    const stats = this.calculateStats();
    
    container.innerHTML = `
      <div class="dashboard">
        <h1>Αρχική Σελίδα</h1>
        
        <!-- Widgets - Single Row -->
        <div class="dashboard-widgets-single-row">
          <div class="widget-compact">
            <div class="widget-content">
              <div class="widget-title">Εργασίες</div>
              <div class="widget-value">${stats.totalJobs}</div>
              <div class="widget-footer">${stats.activeJobs} ενεργές</div>
            </div>
            <div class="widget-icon primary">
              <i class="fas fa-briefcase"></i>
            </div>
          </div>

          <div class="widget-compact">
            <div class="widget-content">
              <div class="widget-title">Πελάτες</div>
              <div class="widget-value">${stats.totalClients}</div>
              <div class="widget-footer">${stats.newClientsThisMonth} νέοι</div>
            </div>
            <div class="widget-icon info">
              <i class="fas fa-users"></i>
            </div>
          </div>

          <div class="widget-compact clickable" onclick="Router.navigate('workers')">
            <div class="widget-content">
              <div class="widget-title">Προσωπικό</div>
              <div class="widget-value">${stats.totalWorkers}</div>
              <div class="widget-footer">${stats.totalWorkers} εργάτες</div>
            </div>
            <div class="widget-icon success">
              <i class="fas fa-hard-hat"></i>
            </div>
          </div>

          <div class="widget-compact">
            <div class="widget-content">
              <div class="widget-title">Προγραμματισμένες</div>
              <div class="widget-value">${stats.scheduledJobs}</div>
              <div class="widget-footer">7 ημέρες</div>
            </div>
            <div class="widget-icon warning">
              <i class="fas fa-calendar-check"></i>
            </div>
          </div>

          <div class="widget-compact">
            <div class="widget-content">
              <div class="widget-title">Έσοδα Μήνα</div>
              <div class="widget-value">${Utils.formatCurrency(stats.monthlyRevenue)}</div>
              <div class="widget-footer">${stats.completedThisMonth} ολοκληρωμένες</div>
            </div>
            <div class="widget-icon primary">
              <i class="fas fa-euro-sign"></i>
            </div>
          </div>
        </div>

        <!-- Recent Activities & Charts -->
        <div class="grid grid-2">
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">
                <i class="fas fa-calendar-check"></i> Επόμενες Επισκέψεις
              </h2>
            </div>
            <div class="card-body">
              ${this.renderUpcomingVisits()}
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Πρόσφατες Ενέργειες</h2>
            </div>
            <div class="card-body">
              ${this.renderRecentActivities()}
            </div>
          </div>
        </div>

        <!-- Status Chart & Map -->
        <div class="grid grid-2">
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Κατάσταση Εργασιών</h2>
            </div>
            <div class="card-body">
              <canvas id="statusChart" style="max-height: 300px;"></canvas>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h2 class="card-title">
                <i class="fas fa-map-marked-alt"></i> Χάρτης
              </h2>
            </div>
            <div class="card-body" style="padding: 0; position: relative;">
              <div id="dashboardMap" style="height: 350px; width: 100%;"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Render charts
    this.renderCharts(stats);
    
    // Setup dark mode toggle
    this.setupDarkModeToggle();
    
    // Setup event delegation for activity items
    this.setupActivityListeners(container);
    
    // Listen for theme changes
    window.addEventListener('themeChanged', () => {
      this.renderCharts(this.calculateStats());
    });
    
    // Initialize dashboard map
    this.initDashboardMap();
  },

  setupActivityListeners(container) {
    console.log('🔧 Setting up activity listeners on container:', container);
    
    // Event delegation για τα activity items
    container.addEventListener('click', (e) => {
      console.log('👆 Click detected on dashboard, target:', e.target);
      
      const activityItem = e.target.closest('.activity-item[data-job-id]');
      console.log('🎯 Activity item found:', activityItem);
      
      if (activityItem) {
        const jobId = activityItem.dataset.jobId;
        console.log('📋 Opening job with ID:', jobId);
        this.viewJob(jobId);
      } else {
        console.log('❌ No activity item found');
      }
    });
  },

  calculateStats() {
    const jobs = State.data.jobs;
    const clients = State.data.clients;
    const workers = State.data.workers || [];
    
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return {
      totalJobs: jobs.length,
      totalClients: clients.length,
      totalWorkers: workers.length,
      activeJobs: jobs.filter(j => 
        j.status === 'Σε εξέλιξη' || j.status === 'Προγραμματισμένη'
      ).length,
      scheduledJobs: jobs.filter(j => {
        const jobDate = new Date(j.date);
        return jobDate >= now && jobDate <= nextWeek;
      }).length,
      completedThisMonth: jobs.filter(j => {
        const jobDate = new Date(j.date);
        return j.status === 'Ολοκληρώθηκε' && 
               jobDate.getMonth() === thisMonth &&
               jobDate.getFullYear() === thisYear;
      }).length,
      newClientsThisMonth: 0, // Θα χρειαζόταν createdAt field
      monthlyRevenue: jobs
        .filter(j => {
          const jobDate = new Date(j.date);
          return (j.status === 'Ολοκληρώθηκε' || j.status === 'Εξοφλήθηκε') &&
                 jobDate.getMonth() === thisMonth &&
                 jobDate.getFullYear() === thisYear;
        })
        .reduce((total, j) => total + (j.totalCost || 0), 0),
      statusBreakdown: this.getStatusBreakdown(jobs)
    };
  },

  getStatusBreakdown(jobs) {
    const breakdown = {};
    CONFIG.STATUS_OPTIONS.forEach(status => {
      breakdown[status] = jobs.filter(j => j.status === status).length;
    });
    return breakdown;
  },

  renderRecentActivities() {
    const jobs = State.data.jobs
      .slice(-5)
      .reverse();

    if (jobs.length === 0) {
      return '<p class="text-muted text-center">Δεν υπάρχουν πρόσφατες ενέργειες</p>';
    }

    return `
      <ul class="activities-list">
        ${jobs.map(job => {
          const client = State.data.clients.find(c => c.id === job.clientId);
          const clientName = client ? client.name : 'Άγνωστος πελάτης';
          
          return `
            <li class="activity-item" data-job-id="${job.id}" style="cursor: pointer;">
              <div class="activity-icon">
                <i class="fas fa-briefcase"></i>
              </div>
              <div class="activity-content">
                <div class="activity-title">${clientName}</div>
                <div class="activity-time">
                  ${Utils.createStatusPill(job.status)}
                  · ${Utils.formatDate(job.date)}
                </div>
              </div>
            </li>
          `;
        }).join('')}
      </ul>
    `;
  },

  renderUpcomingVisits() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get jobs with upcoming visits
    const upcomingJobs = State.data.jobs
      .filter(job => {
        if (!job.nextVisit) return false;
        const visitDate = new Date(job.nextVisit);
        visitDate.setHours(0, 0, 0, 0);
        return visitDate >= today;
      })
      .sort((a, b) => new Date(a.nextVisit) - new Date(b.nextVisit))
      .slice(0, 10); // Show up to 10 upcoming visits

    if (upcomingJobs.length === 0) {
      return '<p class="text-muted text-center">Δεν υπάρχουν προγραμματισμένες επισκέψεις</p>';
    }

    return `
      <ul class="activities-list">
        ${upcomingJobs.map(job => {
          const client = State.data.clients.find(c => c.id === job.clientId);
          const clientName = client ? client.name : 'Άγνωστος πελάτης';
          const visitDate = new Date(job.nextVisit);
          const daysUntil = Math.ceil((visitDate - today) / (1000 * 60 * 60 * 24));
          
          let urgencyClass = '';
          let urgencyText = '';
          if (daysUntil === 0) {
            urgencyClass = 'urgent-today';
            urgencyText = 'Σήμερα';
          } else if (daysUntil === 1) {
            urgencyClass = 'urgent-tomorrow';
            urgencyText = 'Αύριο';
          } else if (daysUntil <= 3) {
            urgencyClass = 'urgent-soon';
            urgencyText = `Σε ${daysUntil} ημέρες`;
          } else {
            urgencyText = `Σε ${daysUntil} ημέρες`;
          }
          
          return `
            <li class="activity-item ${urgencyClass}" data-job-id="${job.id}" style="cursor: pointer;">
              <div class="activity-icon ${urgencyClass}">
                <i class="fas fa-calendar-day"></i>
              </div>
              <div class="activity-content">
                <div class="activity-title">${clientName}</div>
                <div class="activity-subtitle">${job.type || 'Εργασία'}</div>
                <div class="activity-time">
                  <strong style="color: var(--accent-primary);">${Utils.formatDate(job.nextVisit)}</strong>
                  · ${urgencyText}
                </div>
              </div>
            </li>
          `;
        }).join('')}
      </ul>
    `;
  },

  renderCharts(stats) {
    // Destroy existing chart if it exists
    if (this.statusChart) {
      this.statusChart.destroy();
    }
    
    // Status Chart - Get theme colors
    const getThemeColor = (varName) => {
      return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    };
    
    const ctx = document.getElementById('statusChart');
    if (ctx && typeof Chart !== 'undefined') {
      this.statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: Object.keys(stats.statusBreakdown),
          datasets: [{
            data: Object.values(stats.statusBreakdown),
            backgroundColor: [
              getThemeColor('--chart-gray'),     // Υποψήφιος
              getThemeColor('--chart-blue'),     // Προγραμματισμένη
              getThemeColor('--chart-orange'),   // Σε εξέλιξη
              getThemeColor('--chart-yellow'),   // Σε αναμονή
              getThemeColor('--chart-green'),    // Ολοκληρώθηκε
              getThemeColor('--chart-pink'),     // Εξοφλήθηκε
              getThemeColor('--chart-red')       // Ακυρώθηκε
            ],
            borderRadius: 8,
            spacing: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'bottom',
              align: 'center',
              labels: {
                color: getThemeColor('--color-text'),
                padding: 12,
                font: {
                  size: 13,
                  family: "'Inter', -apple-system, sans-serif"
                },
                usePointStyle: true,
                pointStyle: 'circle',
                boxWidth: 8,
                boxHeight: 8,
                textAlign: 'left'
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.parsed || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                  return `${label}: ${value} (${percentage}%)`;
                }
              }
            }
          },
          layout: {
            padding: {
              top: 10,
              bottom: 10
            }
          }
        }
      });
    }
  },

  viewJob(id) {
    console.log('🔍 viewJob called with ID:', id);
    
    const job = State.data.jobs.find(j => j.id === id);
    console.log('📦 Job found:', job);
    
    if (!job) {
      console.error('❌ Job not found!');
      return;
    }

    const client = State.data.clients.find(c => c.id === job.clientId);
    const clientName = client ? client.name : 'Άγνωστος';
    
    console.log('👤 Client:', client);
    console.log('📱 About to open modal...');

    const content = `
      <div class="job-details">
        <!-- Βασικά Στοιχεία -->
        <div class="detail-section">
          <h4><i class="fas fa-info-circle"></i> Βασικά Στοιχεία</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Κωδικός:</label>
              <span>${job.id}</span>
            </div>
            <div class="detail-item">
              <label>Ημερομηνία:</label>
              <span>${Utils.formatDate(job.date)}</span>
            </div>
            <div class="detail-item">
              <label>Κατάσταση:</label>
              <span class="status-pill status-${job.status?.toLowerCase().replace(/\s+/g, '-')}">${job.status}</span>
            </div>
            <div class="detail-item">
              <label>Επόμενη Επίσκεψη:</label>
              <span>${job.nextVisit ? Utils.formatDate(job.nextVisit) : '-'}</span>
            </div>
          </div>
        </div>

        <!-- Στοιχεία Πελάτη -->
        <div class="detail-section">
          <h4><i class="fas fa-user"></i> Πελάτης</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Όνομα:</label>
              <span>${clientName}</span>
            </div>
            <div class="detail-item">
              <label>Τηλέφωνο:</label>
              <span>${client?.phone || '-'}</span>
            </div>
            <div class="detail-item">
              <label>Email:</label>
              <span>${client?.email || '-'}</span>
            </div>
            <div class="detail-item span-2">
              <label>Διεύθυνση:</label>
              <div style="display: flex; align-items: center; gap: 10px;">
                <span>${client?.address || '-'}, ${client?.city || '-'}, ${client?.postal || '-'}</span>
                ${client?.address && client?.city ? `
                  <button class="btn-icon" onclick="DashboardView.openInMaps('${encodeURIComponent(client.address + ', ' + client.city + ', ' + (client.postal || 'Ελλάδα'))}')" title="Άνοιγμα στο Google Maps">
                    <i class="fas fa-map-marked-alt"></i>
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        </div>

        <!-- Λεπτομέρειες Εργασίας -->
        <div class="detail-section">
          <h4><i class="fas fa-paint-roller"></i> Λεπτομέρειες Εργασίας</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Τύπος Εργασίας:</label>
              <span>${job.type || '-'}</span>
            </div>
            <div class="detail-item">
              <label>Δωμάτια:</label>
              <span>${job.rooms || '-'}</span>
            </div>
            <div class="detail-item">
              <label>Εμβαδόν (m²):</label>
              <span>${job.area || '-'}</span>
            </div>
            <div class="detail-item">
              <label>Υπόστρωμα:</label>
              <span>${job.substrate || '-'}</span>
            </div>
          </div>
        </div>

        <!-- Χρώμα -->
        <div class="detail-section">
          <h4><i class="fas fa-palette"></i> Χρώμα</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Όνομα Χρώματος:</label>
              <span>${job.paintName || '-'}</span>
            </div>
            <div class="detail-item">
              <label>Κωδικός:</label>
              <span>${job.paintCode || '-'}</span>
            </div>
            <div class="detail-item">
              <label>Φινίρισμα:</label>
              <span>${job.finish || '-'}</span>
            </div>
            <div class="detail-item">
              <label>Αστάρι:</label>
              <span>${job.primer || '-'}</span>
            </div>
            <div class="detail-item">
              <label>Στρώσεις:</label>
              <span>${job.coats || '-'}</span>
            </div>
          </div>
        </div>

        <!-- Κόστος -->
        <div class="detail-section">
          <h4><i class="fas fa-euro-sign"></i> Κόστος</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Υλικά:</label>
              <span>${Utils.formatCurrency(job.materialsCost || 0)}</span>
            </div>
            <div class="detail-item">
              <label>Ώρες Εργασίας:</label>
              <span>${job.hours || 0} ώρες</span>
            </div>
            <div class="detail-item">
              <label>Κόστος Εργασίας:</label>
              <span>${Utils.formatCurrency(job.laborCost || 0)}</span>
            </div>
            <div class="detail-item">
              <label>Χιλιόμετρα:</label>
              <span>${job.kilometers || 0} km</span>
            </div>
            <div class="detail-item">
              <label>Κόστος Μετακίνησης:</label>
              <span>${Utils.formatCurrency(job.travelCost || 0)}</span>
            </div>
            <div class="detail-item">
              <label>Καθαρό Σύνολο:</label>
              <span><strong>${Utils.formatCurrency(job.netCost || 0)}</strong></span>
            </div>
            <div class="detail-item">
              <label>ΦΠΑ (${job.vat || 0}%):</label>
              <span>${Utils.formatCurrency(job.vatAmount || 0)}</span>
            </div>
            <div class="detail-item">
              <label>Τελικό Σύνολο:</label>
              <span><strong style="color: var(--accent-primary); font-size: 1.2em;">${Utils.formatCurrency(job.totalCost || 0)}</strong></span>
            </div>
          </div>
        </div>

        <!-- Σημειώσεις -->
        ${job.notes ? `
        <div class="detail-section">
          <h4><i class="fas fa-sticky-note"></i> Σημειώσεις</h4>
          <div class="detail-notes">
            ${job.notes}
          </div>
        </div>
        ` : ''}
      </div>
    `;

    const footer = `
      <button class="btn-ghost" onclick="Modal.close()">Κλείσιμο</button>
      <button class="btn-primary" onclick="Modal.close(); setTimeout(() => Router.navigate('jobs'), 100);">
        <i class="fas fa-list"></i> Προβολή στις Εργασίες
      </button>
    `;

    console.log('🪟 Opening modal with title:', clientName);
    console.log('🪟 Modal object:', Modal);
    
    Modal.open({
      title: `${clientName}`,
      content: content,
      footer: footer,
      size: 'lg'
    });
  },

  openInMaps(address) {
    const url = `https://www.google.com/maps/search/?api=1&query=${address}`;
    window.open(url, '_blank');
  },

  setupDarkModeToggle() {
    const toggle = document.getElementById('darkModeToggle');
    if (!toggle) return;
    
    // Set initial state
    const currentTheme = document.body.getAttribute('data-theme');
    toggle.checked = currentTheme === 'dark';
    
    // Set initial icon
    const label = document.querySelector('#darkModeToggle + .toggle-slider + .toggle-label');
    if (label) {
      const icon = label.querySelector('i');
      if (icon) {
        icon.className = currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
      }
    }
    
    // Handle toggle change
    toggle.addEventListener('change', (e) => {
      Theme.current = e.target.checked ? 'dark' : 'light';
      Theme.apply();
    });
  },

  initDashboardMap() {
    // Wait for Google Maps to load
    const waitForGoogleMaps = (attempts = 0) => {
      const maxAttempts = 15; // Wait up to 1.5 seconds
      
      if (typeof google !== 'undefined' && google.maps && google.maps.Map) {
        // Add delay to ensure DOM is ready
        setTimeout(() => this.loadDashboardMap(), 100);
      } else if (attempts < maxAttempts) {
        setTimeout(() => waitForGoogleMaps(attempts + 1), 100);
      } else {
        // Show fallback message if Google Maps doesn't load
        const mapElement = document.getElementById('dashboardMap');
        if (mapElement) {
          mapElement.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: var(--bg-secondary); color: var(--text-secondary); padding: 2rem; text-align: center;">
              <div>
                <i class="fas fa-map-marked-alt" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p style="margin: 0;">Ο χάρτης δεν μπόρεσε να φορτώσει.</p>
                <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">Χρησιμοποιήστε την καρτέλα "Χάρτης" για πλήρη προβολή.</p>
              </div>
            </div>
          `;
        }
      }
    };
    waitForGoogleMaps();
  },

  loadDashboardMap() {
    const mapElement = document.getElementById('dashboardMap');
    if (!mapElement) {
      console.warn('⚠️ Dashboard map element not found');
      return;
    }

    try {
      // Create map centered on Alexandroupoli
      const map = new google.maps.Map(mapElement, {
        center: { lat: 40.8475, lng: 25.8747 },
        zoom: 13,
        mapTypeControl: false,
        fullscreenControl: true,
        streetViewControl: false
      });

    const clients = State.data.clients || [];
    const jobs = State.data.jobs || [];
    
    console.log(`📊 Dashboard: ${clients.length} clients, ${jobs.length} jobs`);

    // Use ISO format YYYY-MM-DD for comparison
    const todayDate = new Date();
    const today = todayDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const nextWeekDate = new Date();
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    const nextWeek = nextWeekDate.toISOString().split('T')[0]; // YYYY-MM-DD

    // Load geocode cache
    let geocodeCache = {};
    try {
      const cached = localStorage.getItem('geocode_cache');
      if (cached) {
        geocodeCache = JSON.parse(cached);
      }
    } catch (e) {
      console.error('Error loading geocode cache:', e);
    }

    // Create a map of clientId -> job info
    const clientJobMap = new Map();
    
    jobs.forEach(job => {
      const client = clients.find(c => c.id === job.clientId);
      if (!client || !client.address || !client.city) return;
      
      if (!clientJobMap.has(job.clientId)) {
        clientJobMap.set(job.clientId, []);
      }
      clientJobMap.get(job.clientId).push(job);
    });

    let markerCount = 0;

    // Add markers for all clients with jobs
    for (const [clientId, clientJobs] of clientJobMap) {
      const client = clients.find(c => c.id === clientId);
      if (!client || !client.address || !client.city) continue;

      // Get coordinates from cache
      const address = `${client.address}, ${client.city}, ${client.postal || ''} Greece`;
      let coordinates = geocodeCache[address];
      
      if (!coordinates || coordinates === 'ZERO_RESULTS') {
        console.log(`⚠️ No cached coordinates for: ${client.name} (${address})`);
        continue;
      }

      // Determine color based on next visit date
      let color, label, priority;
      const nextVisitJob = clientJobs.find(j => j.nextVisit);
      
      if (nextVisitJob && nextVisitJob.nextVisit === today) {
        color = '#dc3545'; // Red - today's visit
        label = 'Σημερινή Επίσκεψη';
        priority = 3;
      } else if (nextVisitJob && nextVisitJob.nextVisit > today && nextVisitJob.nextVisit <= nextWeek) {
        color = '#28a745'; // Green - upcoming visit
        label = 'Προγραμματισμένη Επίσκεψη';
        priority = 2;
      } else {
        color = '#007bff'; // Blue - regular client
        label = 'Πελάτης';
        priority = 1;
      }

      const marker = new google.maps.Marker({
        position: coordinates,
        map: map,
        title: client.name,
        zIndex: priority,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: priority === 3 ? 10 : priority === 2 ? 9 : 8
        }
      });

      markerCount++;

      // Build job list for info window
      const jobList = clientJobs.map(job => 
        `<div style="margin: 5px 0; padding: 5px; background: #f8f9fa; border-radius: 4px;">
          <strong>${job.id}</strong> - ${job.status}<br>
          ${job.nextVisit ? `Επόμενη: ${Utils.dateToGreek(job.nextVisit)}` : 'Χωρίς προγραμματισμό'}
        </div>`
      ).join('');

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; max-width: 250px;">
            <strong style="color: ${color};">${label}</strong><br>
            <strong>${client.name}</strong><br>
            ${client.address || ''}<br>
            <div style="margin-top: 8px; max-height: 150px; overflow-y: auto;">
              <small><strong>Εργασίες (${clientJobs.length}):</strong></small>
              ${jobList}
            </div>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });
    }
    
    console.log(`✅ Dashboard map: ${markerCount} markers added`);
    
    } catch (error) {
      console.error('❌ Error loading dashboard map:', error);
    }
  }
};

