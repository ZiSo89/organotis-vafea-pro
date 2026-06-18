/* ========================================
   Dashboard View - Αρχική Σελίδα
   ======================================== */

window.DashboardView = {
  statusChart: null, // Store chart instance
  themeToggleHandler: null, // Store theme toggle handler
  themeChangeListener: null, // Store theme change listener to prevent duplicates
  
  render(container) {
    const stats = this.calculateStats();
    const companyName = State.data?.settings?.company_settings?.name || document.getElementById('sidebarCompanyName')?.textContent || 'Τέχνη και Χρώμα';
    const isMobile = Utils.isMobile();
    
    container.innerHTML = `
      <div class="dashboard">
          ${isMobile ? `<div class="dashboard-greeting">
            <span class="dashboard-greeting-label">Καλημέρα,</span>
            <span class="dashboard-greeting-name">${Utils.escapeHtml(companyName)}</span>
          </div>` : `<h1>Αρχική Σελίδα</h1>`}
          
          <!-- Widgets -->
          <div class="dashboard-widgets-single-row">
            <div class="widget-compact clickable" onclick="Router.navigate('jobs')">
              <div class="widget-content">
                <div class="widget-title">Εργασίες</div>
                <div class="widget-value">${stats.totalJobs}</div>
                <div class="widget-footer">${stats.activeJobs} ενεργές</div>
              </div>
              <div class="widget-icon primary">
                <i class="fas fa-briefcase"></i>
              </div>
            </div>

            <div class="widget-compact clickable" onclick="Router.navigate('clients')">
              <div class="widget-content">
                <div class="widget-title">Πελάτες</div>
                <div class="widget-value">${stats.totalClients}</div>
                <div class="widget-footer">${stats.newClientsThisMonth} νέοι</div>
              </div>
              <div class="widget-icon info">
                <i class="fas fa-users"></i>
              </div>
            </div>

            <div class="widget-compact clickable" onclick="Router.navigate('suppliers')">
              <div class="widget-content">
                <div class="widget-title">Προμηθευτές</div>
                <div class="widget-value">${stats.totalSuppliers}</div>
                <div class="widget-footer">Υπόλοιπο: ${Utils.formatCurrency(stats.supplierBalance)}</div>
              </div>
              <div class="widget-icon warning">
                <i class="fas fa-store"></i>
              </div>
            </div>

            <div class="widget-compact clickable" onclick="Router.navigate('inventory')">
              <div class="widget-content">
                <div class="widget-title">Αποθήκη</div>
                <div class="widget-value">${stats.totalMaterials}</div>
                <div class="widget-footer">Αξία: ${Utils.formatCurrency(stats.stockValue)}</div>
              </div>
              <div class="widget-icon info">
                <i class="fas fa-boxes"></i>
              </div>
            </div>

            <div class="widget-compact clickable" onclick="Router.navigate('statistics')">
              <div class="widget-content">
                <div class="widget-title">Καθαρά Κέρδη Μήνα</div>
                <div id="monthlyProfitValue" class="widget-value" style="color: ${stats.monthlyProfit >= 0 ? 'var(--success)' : 'var(--error)'}">
                  ${stats.monthlyProfit >= 0 ? '+' : ''}${Utils.formatCurrency(stats.monthlyProfit)}
                </div>
                <div class="widget-footer">${stats.completedThisMonth} ολοκληρωμένες</div>
              </div>
              <div class="widget-icon ${stats.monthlyProfit >= 0 ? 'success' : 'error'}">
                <i class="fas fa-chart-line"></i>
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
                <div class="dashboard-visits-timeline">
                ${this.renderUpcomingVisits()}
                </div>
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
              <div class="card-body dashboard-map-collapsible dashboard-map-preview" style="padding: 0; position: relative;">
                ${isMobile ? '<details open><summary style="padding: var(--spacing-md);">Εμφάνιση χάρτη</summary>' : ''}
                <div id="dashboardMap" class="dashboard-map-static" style="height: ${isMobile ? '280px' : '350px'}; width: 100%;" role="link" aria-label="Άνοιγμα πλήρους χάρτη"></div>
                ${isMobile ? '</details>' : ''}
              </div>
            </div>
          </div>
      </div>
      
      <!-- Scroll to Top Button -->
      <button id="scrollToTopBtn" class="scroll-to-top" title="Επιστροφή στην αρχή">
        <i class="fas fa-arrow-up"></i>
      </button>
    `;

    // Render charts
    this.renderCharts(stats);
    
    // Setup dark mode toggle
    this.setupDarkModeToggle();
    
    // Setup scroll to top button
    this.setupScrollToTop();
    
    // Setup event delegation for activity items
    this.setupActivityListeners(container);
    
    // Remove old theme change listener
    if (this.themeChangeListener) {
      window.removeEventListener('themeChanged', this.themeChangeListener);
    }
    
    // Listen for theme changes - store reference to remove it later
    // Only for charts, skip on mobile to prevent loops
    if (!Utils.isMobile()) {
      this.themeChangeListener = () => {
        this.renderCharts(this.calculateStats());
      };
      window.addEventListener('themeChanged', this.themeChangeListener);
    }
    
    // Initialize dashboard map
    this.initDashboardMap();
    
    // Fetch server-side aggregates only in web mode (not Electron)
    if (typeof window.electronAPI === 'undefined' && typeof this.fetchServerStats === 'function') {
      this.fetchServerStats();
    }
  },

  setupActivityListeners(container) {
    // Event delegation για τα activity items
    container.addEventListener('click', (e) => {
      const activityItem = e.target.closest('.activity-item[data-job-id]');
      
      if (activityItem) {
        const jobId = Number(activityItem.dataset.jobId);
        
        // Καλεί ΠΑΝΤΑ το JobsView.viewJob() αντί για το DashboardView.viewJob()
        try {
          if (typeof JobsView !== 'undefined' && JobsView.viewJob) {
            JobsView.viewJob(jobId);
          } else {
            // Fallback αν δεν υπάρχει το JobsView
            this.viewJob(jobId);
          }
        } catch (error) {
          console.error('Error calling JobsView.viewJob:', error);
          this.viewJob(jobId);
        }
      }
    });
  },

  calculateStats() {
    console.log('📊 [Dashboard] calculateStats - State.data:', State.data);
    console.log('📊 [Dashboard] State.data.jobs type:', typeof State.data.jobs, 'isArray:', Array.isArray(State.data.jobs));
    console.log('📊 [Dashboard] State.data.jobs:', State.data.jobs);
    
    // Ensure jobs is an array
    let jobs = State.data.jobs;
    if (!Array.isArray(jobs)) {
      console.warn('⚠️ [Dashboard] jobs is not an array, trying to extract from response object');
      if (jobs && typeof jobs === 'object' && Array.isArray(jobs.data)) {
        jobs = jobs.data;
      } else {
        console.error('❌ [Dashboard] Cannot extract jobs array, defaulting to empty array');
        jobs = [];
      }
    }
    
    const clients = State.data.clients;
    const workers = State.data.workers || [];
    const suppliers = State.data.suppliers || [];
    const inventory = State.data.inventory || [];
    const materialPurchases = State.data.materialPurchases || [];
    const supplierPayments = State.data.supplierPayments || [];
    
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    console.log('📊 [Dashboard] Processing', jobs.length, 'jobs');

    // Calculate monthly revenue and profit
    const monthlyJobs = jobs.filter(j => {
      const jobDate = new Date(j.date);
      return (j.status === 'Ολοκληρώθηκε' || j.status === 'Εξοφλήθηκε') &&
             jobDate.getMonth() === thisMonth &&
             jobDate.getFullYear() === thisYear;
    });

    // Calculate monthly revenue and profit using billing amount.
    // Consider only jobs with status 'Ολοκληρώθηκε' or 'Εξοφλήθηκε' (already filtered into monthlyJobs).
    const parseNumber = (v) => {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    };
    const payments = State.data.jobPayments || [];
    const getPaymentsForJob = (jobId) => payments.filter(payment => Number(payment.jobId || payment.job_id) === Number(jobId));

    const monthlyRevenue = monthlyJobs.reduce((total, j) => {
      const financials = window.JobFinancials.compute(j, { payments: getPaymentsForJob(j.id) });
      console.log('💰 Adding job billing to monthly revenue:', financials.billingAmount, 'from job:', j.id);
      return total + financials.billingAmount;
    }, 0);

    const monthlyProfit = monthlyJobs.reduce((total, j) => {
      const financials = window.JobFinancials.compute(j, { payments: getPaymentsForJob(j.id) });
      console.log('📈 Job', j.id, 'profit:', financials.profit, '(revenue:', financials.billingAmount, '- expenses:', financials.totalExpenses, ')');
      return total + financials.profit;
    }, 0);

    // NOTE: removed older fallback monthlyProfit calculation to avoid duplicate declaration.
    // The `monthlyProfit` above (billing minus expenses) is the canonical value.

    const supplierPurchasesTotal = materialPurchases.reduce((sum, purchase) => {
      return sum + parseNumber(purchase.totalCost || purchase.total_cost);
    }, 0);
    const supplierPaymentsTotal = supplierPayments.reduce((sum, payment) => {
      return sum + parseNumber(payment.amount);
    }, 0);
    const stockValue = inventory.reduce((sum, material) => {
      const stock = parseNumber(material.stock);
      const unitPrice = parseNumber(material.unitPrice || material.unit_price);
      return sum + (stock * unitPrice);
    }, 0);

    const stats = {
      totalJobs: jobs.length,
      totalClients: clients.length,
      totalWorkers: workers.length,
      totalSuppliers: suppliers.length,
      supplierBalance: supplierPurchasesTotal - supplierPaymentsTotal,
      totalMaterials: inventory.length,
      stockValue,
      lowStockMaterials: inventory.filter(material => {
        const stock = parseNumber(material.stock);
        const minStock = parseNumber(material.minStock || material.min_stock);
        return minStock > 0 && stock <= minStock;
      }).length,
      activeJobs: jobs.filter(j => 
        j.status === 'Σε εξέλιξη' || j.status === 'Προγραμματισμένη'
      ).length,
      scheduledJobs: jobs.filter(j => {
        return j.status === 'Προγραμματισμένη';
      }).length,
      completedThisMonth: jobs.filter(j => {
        const jobDate = new Date(j.date);
        return j.status === 'Ολοκληρώθηκε' && 
               jobDate.getMonth() === thisMonth &&
               jobDate.getFullYear() === thisYear;
      }).length,
      newClientsThisMonth: 0, // Θα χρειαζόταν createdAt field
      monthlyRevenue: monthlyRevenue,
      monthlyProfit: monthlyProfit,
      statusBreakdown: this.getStatusBreakdown(jobs)
    };
    
    console.log('📊 Dashboard stats calculated:', {
      monthlyRevenue: stats.monthlyRevenue,
      monthlyProfit: stats.monthlyProfit,
      completedThisMonth: stats.completedThisMonth
    });
    
    return stats;
  },

  getStatusBreakdown(jobs) {
    const breakdown = {};
    CONFIG.STATUS_OPTIONS.forEach(status => {
      breakdown[status] = jobs.filter(j => j.status === status).length;
    });
    return breakdown;
  },

  async fetchServerStats() {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');

      const resp = await fetch(`/api/statistics.php?action=revenue&year=${year}`);
      if (!resp.ok) return;
      const json = await resp.json();
      if (!json || !json.success) return;

      const monthRow = (json.data || []).find(r => String(r.month) === month);
      if (!monthRow) return;

      // revenue: prefer normalized billing amount, else revenue
      const billing = Number(monthRow.billing_amount ?? monthRow.revenue ?? 0);
      const net = Number(monthRow.net_profit ?? monthRow.profit ?? 0);

      const revEl = document.getElementById('monthlyRevenueValue');
      const profEl = document.getElementById('monthlyProfitValue');
      if (revEl) revEl.textContent = Utils.formatCurrency(billing);
      if (profEl) {
        profEl.textContent = (net >= 0 ? '+' : '') + Utils.formatCurrency(net);
        profEl.style.color = net >= 0 ? getComputedStyle(document.documentElement).getPropertyValue('--success').trim() : getComputedStyle(document.documentElement).getPropertyValue('--error').trim();
      }
    } catch (e) {
      // ignore network errors
      console.debug('fetchServerStats error', e);
    }
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
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    // Get jobs with upcoming visits - ΜΟΝΟ 7 ΗΜΕΡΕΣ
    const upcomingJobs = State.data.jobs
      .filter(job => {
        if (!job.nextVisit) return false;
        if (job.status === 'Ακυρώθηκε' || job.status === 'cancelled') return false;
        const visitDate = new Date(job.nextVisit);
        visitDate.setHours(0, 0, 0, 0);
        return visitDate >= today && visitDate <= nextWeek;
      })
      .sort((a, b) => new Date(a.nextVisit) - new Date(b.nextVisit))
      .slice(0, 5); // Show up to 5 upcoming visits

    if (upcomingJobs.length === 0) {
      return '<p class="text-muted text-center">Δεν υπάρχουν προγραμματισμένες επισκέψεις τις επόμενες 7 ημέρες</p>';
    }

    return `
      <ul class="activities-list">
        ${upcomingJobs.map(job => {
          const clients = State.data?.clients || [];
          const client = clients.find(c => Number(c.id) === Number(job.clientId));
          const clientName = client ? client.name : 'Άγνωστος πελάτης';
          const visitDate = new Date(job.nextVisit);
          visitDate.setHours(0, 0, 0, 0);
          const todayDate = new Date();
          todayDate.setHours(0, 0, 0, 0);
          const daysUntil = Math.round((visitDate - todayDate) / (1000 * 60 * 60 * 24));
          
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
    const job = State.data.jobs.find(j => Number(j.id) === Number(id));
    
    if (!job) {
      console.error('❌ Job not found!', id, State.data.jobs);
      Toast.error('Η εργασία δεν βρέθηκε');
      return;
    }

    const client = State.data.clients.find(c => Number(c.id) === Number(job.clientId));
    const clientName = client ? client.name : 'Άγνωστος πελάτης';
    
    // Parse JSON fields
    let assignedWorkers = [];
    let paints = [];
    
    try {
      assignedWorkers = typeof job.assignedWorkers === 'string' 
        ? JSON.parse(job.assignedWorkers) 
        : (job.assignedWorkers || []);
    } catch (e) {
      console.error('Error parsing assignedWorkers:', e);
      assignedWorkers = [];
    }
    
    try {
      paints = typeof job.paints === 'string' 
        ? JSON.parse(job.paints) 
        : (job.paints || []);
    } catch (e) {
      console.error('Error parsing paints:', e);
      paints = [];
    }
    
    // Calculate costs
    const laborCost = assignedWorkers.reduce((sum, w) => {
      const type = w.workerType || w.worker_type || 'employee';
      if (type === 'owner') return sum;
      return sum + (w.laborCost || 0);
    }, 0);
    const materialsCost = Number(job.materialsCost) || 0;
    const kilometers = Number(job.kilometers) || 0;
    const costPerKm = Number(job.costPerKm) || 0.5;
    const travelCost = kilometers * costPerKm;
    const totalExpenses = materialsCost + laborCost + travelCost;
    
    const billingHours = Number(job.billingHours) || 0;
    const billingRate = Number(job.billingRate) || 50;
    const billingAmount = billingHours * billingRate;
    const totalCost = billingAmount;
    const profit = billingAmount - totalExpenses;

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
                  <button class="btn-icon" onclick="Utils.openInMaps('${client.address}, ${client.city}, ${client.postal || 'Ελλάδα'}')" title="Άνοιγμα στο Google Maps">
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

        <!-- Υλικά -->
        ${paints.length > 0 ? `
        <div class="detail-section">
          <h4><i class="fas fa-boxes"></i> Υλικά</h4>
          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Όνομα</th>
                  <th>Κωδικός</th>
                  <th>Ποσότητα</th>
                  <th>Κόστος</th>
                </tr>
              </thead>
              <tbody>
                ${paints.map(paint => `
                  <tr>
                    <td><strong>${paint.name}</strong></td>
                    <td>${paint.code || '-'}</td>
                    <td>${paint.quantity || '-'}</td>
                    <td><strong>${Utils.formatCurrency(Number(paint.cost) || 0)}</strong></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        ` : ''}

        <!-- Ανατεθειμένοι Εργάτες -->
        ${assignedWorkers.length > 0 ? `
        <div class="detail-section">
          <h4><i class="fas fa-hard-hat"></i> Ανατεθειμένοι Εργάτες</h4>
          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Εργάτης</th>
                  <th>Τύπος</th>
                  <th>Ωρομίσθιο</th>
                  <th>Ώρες</th>
                  <th>Κόστος</th>
                </tr>
              </thead>
              <tbody>
                ${assignedWorkers.map(worker => `
                  <tr>
                    <td><strong>${worker.workerName}</strong></td>
                    <td>${(worker.workerType || worker.worker_type) === 'owner' ? 'Ιδιοκτήτης' : 'Υπάλληλος'}</td>
                    <td>${Utils.formatCurrency(worker.hourlyRate)}/ώρα</td>
                    <td>${worker.hoursAllocated}h</td>
                    <td><strong style="color: var(--error);">${Utils.formatCurrency(worker.laborCost)}</strong></td>
                  </tr>
                `).join('')}
                <tr style="background: var(--bg-secondary); font-weight: bold;">
                  <td colspan="3" style="text-align: right;">ΣΥΝΟΛΟ:</td>
                  <td>${assignedWorkers.reduce((sum, w) => sum + w.hoursAllocated, 0).toFixed(1)}h</td>
                  <td><strong style="color: var(--error);">${Utils.formatCurrency(laborCost)}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        ` : ''}

        <!-- Κόστος -->
        <div class="detail-section">
          <h4><i class="fas fa-euro-sign"></i> Κόστος</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Κόστος Εργατών:</label>
              <span style="color: var(--error);">${Utils.formatCurrency(laborCost)}</span>
            </div>
            <div class="detail-item">
              <label>Κόστος Υλικών:</label>
              <span style="color: var(--error);">${Utils.formatCurrency(materialsCost)}</span>
            </div>
            <div class="detail-item">
              <label>Κόστος Μετακίνησης:</label>
              <span style="color: var(--error);">${Utils.formatCurrency(travelCost)} (${kilometers} km)</span>
            </div>
            <div class="detail-item">
              <label>Σύνολο Εξόδων:</label>
              <span><strong style="color: var(--error);">${Utils.formatCurrency(totalExpenses)}</strong></span>
            </div>
            <div class="detail-item">
              <label>Ώρες Χρέωσης:</label>
              <span>${billingHours}h × ${Utils.formatCurrency(billingRate)}/h</span>
            </div>
            <div class="detail-item">
              <label>Ποσό Χρέωσης:</label>
              <span style="color: var(--success);">${Utils.formatCurrency(billingAmount)}</span>
            </div>
            <div class="detail-item">
              <label>Σύνολο Χρέωσης:</label>
              <span><strong style="color: var(--success); font-size: 1.2em;">${Utils.formatCurrency(totalCost)}</strong></span>
            </div>
            <div class="detail-item span-2">
              <label>Κέρδος:</label>
              <span><strong style="color: ${profit >= 0 ? 'var(--success)' : 'var(--error)'}; font-size: 1.2em;">${Utils.formatCurrency(profit)}</strong></span>
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
    
    Modal.open({
      title: `${clientName}`,
      content: content,
      size: 'lg'
    });
  },

  openInMaps(address) {
    Utils.openInMaps(address);
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
    
    // Remove old handler
    if (this.themeToggleHandler) {
      toggle.removeEventListener('change', this.themeToggleHandler);
    }
    
    // Handle toggle change
    this.themeToggleHandler = (e) => {
      Theme.current = e.target.checked ? 'dark' : 'light';
      Theme.apply();
    };
    
    toggle.addEventListener('change', this.themeToggleHandler);
  },

  setupScrollToTop() {
    const scrollBtn = document.getElementById('scrollToTopBtn');
    if (!scrollBtn) return;

    // Show/hide button based on scroll position
    const toggleButton = () => {
      if (window.scrollY > 300) {
        scrollBtn.classList.add('visible');
      } else {
        scrollBtn.classList.remove('visible');
      }
    };

    // Scroll to top when clicked
    scrollBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });

    // Listen to scroll events
    window.addEventListener('scroll', toggleButton);
    
    // Initial check
    toggleButton();
  },

  initDashboardMap() {
    // Check if Google Maps is already loaded
    if (typeof google !== 'undefined' && google.maps && google.maps.Map) {
      // Already loaded, render map immediately
      setTimeout(() => this.loadDashboardMap(), 100);
      return;
    }
    
    // Load Google Maps API
    if (typeof window.loadGoogleMaps === 'function') {
      window.loadGoogleMaps()
        .then(() => {
          setTimeout(() => this.loadDashboardMap(), 100);
        })
        .catch(err => {
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
        });
    } else {
      // Fallback if loadGoogleMaps is not available
      const mapElement = document.getElementById('dashboardMap');
      if (mapElement) {
        mapElement.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: var(--bg-secondary); color: var(--text-secondary); padding: 2rem; text-align: center;">
            <div>
              <i class="fas fa-map-marked-alt" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
              <p style="margin: 0;">Χρησιμοποιήστε την καρτέλα "Χάρτης"</p>
              <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">για πλήρη προβολή.</p>
            </div>
          </div>
        `;
      }
    }
  },

  loadDashboardMap() {
    const mapElement = document.getElementById('dashboardMap');
    if (!mapElement) {
      return;
    }

    try {
      // Create map centered on Alexandroupoli
      const map = new google.maps.Map(mapElement, {
        center: { lat: 40.8475, lng: 25.8747 },
        zoom: 13,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        zoomControl: false,
        draggable: false,
        scrollwheel: false,
        disableDoubleClickZoom: true,
        gestureHandling: 'none',
        keyboardShortcuts: false
      });

      mapElement.style.cursor = 'pointer';
      map.addListener('click', () => {
        window.location.hash = 'map';
      });

    const clients = State.data.clients || [];
    const jobs = State.data.jobs || [];

    // Use ISO format YYYY-MM-DD for comparison
    const todayDate = new Date();
    const today = todayDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const nextWeekDate = new Date();
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    const nextWeek = nextWeekDate.toISOString().split('T')[0]; // YYYY-MM-DD

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

      // Get coordinates from database
      const coordinates = client.coordinates;
      
      if (!coordinates || !coordinates.lat || !coordinates.lng) {
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

      // Add click event to navigate to full map
      marker.addListener('click', () => {
        window.location.hash = 'map';
      });

      markerCount++;
    }
    
    } catch (error) {
      console.error('❌ Error loading dashboard map:', error);
    }
  },

  loadDashboardMapLeaflet() {
    const mapElement = document.getElementById('dashboardMap');
    if (!mapElement) return;

    // Load Leaflet if not already loaded
    if (typeof L === 'undefined') {
      // Load Leaflet CSS
      if (!document.querySelector('link[href*="leaflet"]')) {
        const leafletCSS = document.createElement('link');
        leafletCSS.rel = 'stylesheet';
        leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(leafletCSS);
      }

      // Load Leaflet JS
      const leafletScript = document.createElement('script');
      leafletScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      leafletScript.onload = () => {
        this.renderLeafletMap();
      };
      leafletScript.onerror = () => {
        console.error('❌ Failed to load Leaflet');
        mapElement.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: var(--bg-secondary); color: var(--text-secondary); padding: 2rem; text-align: center;">
            <div>
              <i class="fas fa-map-marked-alt" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
              <p style="margin: 0;">Ο χάρτης δεν μπόρεσε να φορτώσει.</p>
            </div>
          </div>
        `;
      };
      document.head.appendChild(leafletScript);
    } else {
      this.renderLeafletMap();
    }
  },

  renderLeafletMap() {
    const mapElement = document.getElementById('dashboardMap');
    if (!mapElement) return;

    try {
      // Clear existing content
      mapElement.innerHTML = '';

      // Create Leaflet map
      const map = L.map(mapElement, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        dragging: false,
        doubleClickZoom: false,
        touchZoom: false,
        boxZoom: false,
        keyboard: false,
        tap: false
      }).setView([40.8475, 25.8747], 13);

      mapElement.style.cursor = 'pointer';
      map.on('click', () => {
        window.location.hash = 'map';
      });

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(map);

      const clients = State.data.clients || [];
      const jobs = State.data.jobs || [];

      // Use ISO format for date comparison
      const todayDate = new Date();
      const today = todayDate.toISOString().split('T')[0];
      const nextWeekDate = new Date();
      nextWeekDate.setDate(nextWeekDate.getDate() + 7);
      const nextWeek = nextWeekDate.toISOString().split('T')[0];

      // Create client-job map
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
      const bounds = [];

      // Add markers
      for (const [clientId, clientJobs] of clientJobMap) {
        const client = clients.find(c => c.id === clientId);
        if (!client || !client.address || !client.city) continue;

        // Get coordinates from database
        const coordinates = client.coordinates;
        
        if (!coordinates || !coordinates.lat || !coordinates.lng) continue;

        // Determine marker color based on next visit
        let color, label, priority;
        const nextVisitJob = clientJobs.find(j => j.nextVisit);
        
        if (nextVisitJob && nextVisitJob.nextVisit === today) {
          color = '#dc3545'; // Red
          label = 'Σημερινή Επίσκεψη';
          priority = 3;
        } else if (nextVisitJob && nextVisitJob.nextVisit > today && nextVisitJob.nextVisit <= nextWeek) {
          color = '#28a745'; // Green
          label = 'Προγραμματισμένη Επίσκεψη';
          priority = 2;
        } else {
          color = '#007bff'; // Blue
          label = 'Πελάτης';
          priority = 1;
        }

        // Create marker with default Leaflet icon (no custom divIcon)
        const marker = L.marker([coordinates.lat, coordinates.lng]).addTo(map);
        
        // Add click event to navigate to full map
        marker.on('click', () => {
          window.location.hash = 'map';
        });
        
        bounds.push([coordinates.lat, coordinates.lng]);
        markerCount++;
      }

      // Fit map to show all markers
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [20, 20] });
      }

    } catch (error) {
      console.error('❌ Error loading Leaflet dashboard map:', error);
      mapElement.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: var(--bg-secondary); color: var(--text-secondary); padding: 2rem; text-align: center;">
          <div>
            <i class="fas fa-map-marked-alt" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
            <p style="margin: 0;">Σφάλμα φόρτωσης χάρτη.</p>
          </div>
        </div>
      `;
    }
  }
};
