/* ========================================
   Statistics View - Στατιστικά & Αναφορές
   ======================================== */

window.StatisticsView = {
  
  charts: {}, // Αποθήκευση instances των charts
  currentYear: new Date().getFullYear(),
  
  async render(container) {
    container.innerHTML = `
      <div class="view-header">
        <h1><i class="fas fa-chart-bar"></i> Στατιστικά</h1>
        <div class="view-actions">
          <select id="yearFilter" class="input">
            <option value="">Φόρτωση...</option>
          </select>
        </div>
      </div>

      <!-- Κάρτες Συνόλων -->
      <div class="stats-summary">
        <div class="stat-card">
          <div class="stat-icon" style="background: var(--color-success-light);">
            <i class="fas fa-euro-sign" style="color: var(--color-success);"></i>
          </div>
          <div class="stat-content">
            <div class="stat-label">Συνολικά Έσοδα</div>
            <div class="stat-value" id="totalRevenue">€0</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon" style="background: var(--color-info-light);">
            <i class="fas fa-chart-line" style="color: var(--color-info);"></i>
          </div>
          <div class="stat-content">
            <div class="stat-label">Καθαρά Κέρδη</div>
            <div class="stat-value" id="totalProfit">€0</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon" style="background: var(--color-warning-light);">
            <i class="fas fa-briefcase" style="color: var(--color-warning);"></i>
          </div>
          <div class="stat-content">
            <div class="stat-label">Σύνολο Εργασιών</div>
            <div class="stat-value" id="totalJobs">0</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon" style="background: var(--color-primary-light);">
            <i class="fas fa-check-circle" style="color: var(--color-primary);"></i>
          </div>
          <div class="stat-content">
            <div class="stat-label">Εξοφλημένες</div>
            <div class="stat-value" id="completedJobs">0</div>
          </div>
        </div>
      </div>

      <!-- Γραφήματα -->
      <div class="charts-grid">
        
        <!-- Έσοδα ανά μήνα -->
        <div class="card">
          <div class="card-header">
            <h3><i class="fas fa-calendar-alt"></i> Έσοδα ανά Μήνα</h3>
          </div>
          <div class="card-body">
            <canvas id="revenueMonthChart"></canvas>
          </div>
        </div>
        
        <!-- Κατανομή Εργασιών -->
        <div class="card">
          <div class="card-header">
            <h3><i class="fas fa-pie-chart"></i> Κατανομή Εργασιών</h3>
          </div>
          <div class="card-body">
            <canvas id="jobsTypeChart"></canvas>
          </div>
        </div>
        
        <!-- Κατάσταση Εργασιών -->
        <div class="card">
          <div class="card-header">
            <h3><i class="fas fa-tasks"></i> Κατάσταση Εργασιών</h3>
          </div>
          <div class="card-body">
            <canvas id="jobsStatusChart"></canvas>
          </div>
        </div>
        
        <!-- Υλικά που Χρησιμοποιούνται -->
        <div class="card">
          <div class="card-header">
            <h3><i class="fas fa-boxes"></i> Top 10 Υλικά</h3>
          </div>
          <div class="card-body">
            <canvas id="materialsChart"></canvas>
          </div>
        </div>
        
        <!-- Top Εργασίες με Κέρδη -->
        <div class="card card-full">
          <div class="card-header">
            <h3><i class="fas fa-trophy"></i> Top 10 Εργασίες με Βάση τα Κέρδη</h3>
          </div>
          <div class="card-body">
            <canvas id="topJobsChart"></canvas>
          </div>
        </div>
        
      </div>
      
      <!-- Scroll to Top Button -->
      <button id="scrollToTopBtn" class="scroll-to-top" title="Επιστροφή στην αρχή">
        <i class="fas fa-arrow-up"></i>
      </button>
    `;

    // Event Listeners
    this.attachEventListeners();
    
    // Setup scroll to top button
    this.setupScrollToTop();
    
    // Φόρτωση δεδομένων
    await this.loadAvailableYears();
    await this.loadStatistics();
  },

  attachEventListeners() {
    const yearFilter = document.getElementById('yearFilter');
    if (yearFilter) {
      yearFilter.addEventListener('change', async (e) => {
        this.currentYear = e.target.value;
        await this.loadStatistics();
      });
    }
  },

  async loadAvailableYears() {
    try {
      // Χρήση Electron API για τοπικά δεδομένα
      if (typeof window.electronAPI !== 'undefined') {
        const jobs = await window.electronAPI.db.query("SELECT DISTINCT strftime('%Y', date) as year FROM jobs WHERE date IS NOT NULL ORDER BY year DESC");
        const years = jobs.map(j => j.year).filter(y => y);
        
        if (years.length === 0) {
          years.push(new Date().getFullYear().toString());
        }
        
        const select = document.getElementById('yearFilter');
        select.innerHTML = years.map(year => 
          `<option value="${year}" ${year == this.currentYear ? 'selected' : ''}>${year}</option>`
        ).join('');
        

      } else {
        // Fallback για web version
        const response = await API.get('/api/statistics.php?action=available_years');
        if (response.success) {
          const years = response.data;
          const select = document.getElementById('yearFilter');
          
          select.innerHTML = years.map(year => 
            `<option value="${year}" ${year == this.currentYear ? 'selected' : ''}>${year}</option>`
          ).join('');
        }
      }
    } catch (error) {
      console.error('Σφάλμα φόρτωσης ετών:', error);
    }
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

  async loadStatistics() {
    try {

      
      if (typeof window.electronAPI !== 'undefined') {

        // Υπολογισμός στατιστικών από SQLite
        await this.loadStatisticsFromElectron();
      } else {

        // Φόρτωση από server
        const [summary, revenue, jobsType, jobsStatus, materials, topJobs] = await Promise.all([
          API.get(`/api/statistics.php?action=summary&year=${this.currentYear}`),
          API.get(`/api/statistics.php?action=revenue&year=${this.currentYear}`),
          API.get(`/api/statistics.php?action=jobs_by_type&year=${this.currentYear}`),
          API.get(`/api/statistics.php?action=jobs_status&year=${this.currentYear}`),
          API.get(`/api/statistics.php?action=materials_usage&year=${this.currentYear}`),
          API.get(`/api/statistics.php?action=top_jobs&limit=10&year=${this.currentYear}`)
        ]);



        // Ενημέρωση summary cards
        this.updateSummaryCards(summary.data);

        // Δημιουργία γραφημάτων
        this.createRevenueChart(revenue.data);
        this.createJobsTypeChart(jobsType.data);
        this.createJobsStatusChart(jobsStatus.data);
        this.createMaterialsChart(materials.data);
        this.createTopJobsChart(topJobs.data);
      }
    } catch (error) {
      console.error('❌ Σφάλμα φόρτωσης στατιστικών:', error);
      console.error('Error stack:', error.stack);
      if (typeof Toast !== 'undefined') {
        Toast.error('Σφάλμα φόρτωσης στατιστικών');
      }
    }
  },

  async loadStatisticsFromElectron() {
    try {

      
      // Convert year to string for SQL comparison
      const yearString = String(this.currentYear);
      
      // Summary
      console.log('📊 Fetching summary for year:', yearString);
      const jobs = await window.electronAPI.db.query(`
        SELECT 
          COUNT(*) as total_jobs,
          SUM(CASE WHEN status = 'Εξοφλήθηκε' OR is_paid = 1 THEN 1 ELSE 0 END) as completed_jobs,
          SUM(CASE WHEN status = 'Εξοφλήθηκε' OR is_paid = 1 THEN total_cost ELSE 0 END) as total_revenue,
          SUM(CASE WHEN status = 'Εξοφλήθηκε' OR is_paid = 1 THEN (total_cost - materials_cost) ELSE 0 END) as total_profit
        FROM jobs 
        WHERE strftime('%Y', date) = ?
      `, [yearString]);
      
      console.log('📊 Summary results:', jobs[0]);
      





      
      // Also check what statuses exist
      const statuses = await window.electronAPI.db.query(`
        SELECT DISTINCT status FROM jobs WHERE strftime('%Y', date) = ?
      `, [yearString]);

      
      this.updateSummaryCards(jobs[0] || {});

      // Revenue by month

      const revenue = await window.electronAPI.db.query(`
        SELECT 
          strftime('%m', date) as month,
          SUM(CASE WHEN status = 'Εξοφλήθηκε' OR is_paid = 1 THEN total_cost ELSE 0 END) as revenue,
          SUM(CASE WHEN status = 'Εξοφλήθηκε' OR is_paid = 1 THEN (total_cost - materials_cost) ELSE 0 END) as profit
        FROM jobs 
        WHERE strftime('%Y', date) = ?
        GROUP BY month
        ORDER BY month
      `, [yearString]);
      

      this.createRevenueChart(revenue);

      // Jobs by type

      const jobsType = await window.electronAPI.db.query(`
        SELECT type, COUNT(*) as count
        FROM jobs 
        WHERE strftime('%Y', date) = ?
        GROUP BY type
      `, [yearString]);
      

      this.createJobsTypeChart(jobsType);

      // Jobs by status
      console.log('🔍 Fetching jobs by status...');
      const jobsStatus = await window.electronAPI.db.query(`
        SELECT 
          CASE 
            WHEN LOWER(status) LIKE '%υποψ%' THEN 'Υποψήφιος'
            WHEN LOWER(status) LIKE '%προγραμ%' THEN 'Προγραμματισμένη'
            WHEN LOWER(status) LIKE '%εξέλιξη%' THEN 'Σε εξέλιξη'
            WHEN LOWER(status) LIKE '%αναμον%' THEN 'Σε αναμονή'
            WHEN LOWER(status) LIKE '%ολοκληρ%' THEN 'Ολοκληρώθηκε'
            WHEN LOWER(status) LIKE '%εξοφλ%' THEN 'Εξοφλήθηκε'
            WHEN LOWER(status) LIKE '%ακυρ%' THEN 'Ακυρώθηκε'
            ELSE 'Άλλες'
          END as status,
          COUNT(*) as count
        FROM jobs 
        WHERE strftime('%Y', date) = ?
        GROUP BY status
      `, [yearString]);
      console.log('📊 Jobs status data:', jobsStatus);

      this.createJobsStatusChart(jobsStatus);

      // Materials usage - Get paints from jobs

      const jobsWithPaints = await window.electronAPI.db.query(`
        SELECT 
          j.id,
          j.title,
          j.paints,
          j.materials_cost,
          j.total_cost,
          j.status
        FROM jobs j
        WHERE strftime('%Y', j.date) = ?
        AND (j.status = 'Εξοφλήθηκε' OR j.is_paid = 1)
        AND j.paints IS NOT NULL 
        AND j.paints != ''
        AND j.paints != '[]'
        ORDER BY j.materials_cost DESC
        LIMIT 50
      `, [yearString]);
      

      
      // Parse and aggregate paints
      const paintsMap = new Map();
      jobsWithPaints.forEach(job => {
        try {

          const paints = typeof job.paints === 'string' ? JSON.parse(job.paints) : job.paints;

          
          if (Array.isArray(paints)) {
            paints.forEach(paint => {

              const key = paint.name || paint.color || 'Άγνωστο';
              if (!paintsMap.has(key)) {
                paintsMap.set(key, {
                  name: key,
                  totalQuantity: 0,
                  totalCost: 0,
                  jobs: 0,
                  unit: paint.unit || 'λίτρα'
                });
              }
              const existing = paintsMap.get(key);
              const quantity = parseFloat(paint.quantity || 0);
              const cost = parseFloat(paint.cost || paint.price || paint.totalPrice || 0);
              
              existing.totalQuantity += quantity;
              existing.totalCost += cost;
              existing.jobs++;
              

            });
          }
        } catch (error) {
          console.error('❌ Error parsing paints for job:', job.id, error);
        }
      });
      
      const aggregatedPaints = Array.from(paintsMap.values())
        .sort((a, b) => {
          // Ταξινόμηση με βάση το κόστος αν υπάρχει, αλλιώς με την ποσότητα
          if (b.totalCost > 0 || a.totalCost > 0) {
            return b.totalCost - a.totalCost;
          }
          return b.totalQuantity - a.totalQuantity;
        })
        .slice(0, 10);
      
      this.createMaterialsChart(aggregatedPaints);

      // Top jobs

      const topJobs = await window.electronAPI.db.query(`
        SELECT 
          title, 
          total_cost as revenue,
          materials_cost,
          (total_cost - materials_cost) as profit,
          type
        FROM jobs 
        WHERE strftime('%Y', date) = ?
        AND (status = 'Εξοφλήθηκε' OR is_paid = 1)
        ORDER BY (total_cost - materials_cost) DESC
        LIMIT 10
      `, [yearString]);
      

      this.createTopJobsChart(topJobs);
      

    } catch (error) {
      console.error('❌ Error in loadStatisticsFromElectron:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  },

  updateSummaryCards(data) {
    console.log('📊 Updating summary cards with data:', data);
    
    const totalRevenueEl = document.getElementById('totalRevenue');
    const totalProfitEl = document.getElementById('totalProfit');
    const totalJobsEl = document.getElementById('totalJobs');
    const completedJobsEl = document.getElementById('completedJobs');
    
    // Support both camelCase (from Electron/SQLite) and snake_case (from API)
    const totalRevenue = data.totalRevenue || data.total_revenue || 0;
    const totalProfit = data.totalProfit || data.total_profit || 0;
    const totalJobs = data.totalJobs || data.total_jobs || 0;
    const completedJobs = data.completedJobs || data.completed_jobs || 0;
    
    console.log('💰 Summary values:', { totalRevenue, totalProfit, totalJobs, completedJobs });
    
    if (totalRevenueEl) {
      totalRevenueEl.textContent = `€${totalRevenue.toLocaleString('el-GR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
    }
    
    if (totalProfitEl) {
      totalProfitEl.textContent = `€${totalProfit.toLocaleString('el-GR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
    }
    
    if (totalJobsEl) {
      totalJobsEl.textContent = totalJobs;
    }
    
    if (completedJobsEl) {
      completedJobsEl.textContent = completedJobs;
    }
  },

  createRevenueChart(data) {

    
    // Καταστροφή προηγούμενου chart
    if (this.charts.revenue) {

      this.charts.revenue.destroy();
    }

    const ctx = document.getElementById('revenueMonthChart');
    if (!ctx) {
      console.error('❌ Revenue chart canvas not found!');
      return;
    }

    // Δημιουργία πλήρους dataset για όλους τους μήνες
    const months = [
      'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
      'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'
    ];

    const revenueData = new Array(12).fill(0);
    const profitData = new Array(12).fill(0);

    data.forEach(item => {
      const monthIndex = parseInt(item.month) - 1;
      revenueData[monthIndex] = item.revenue;
      profitData[monthIndex] = item.profit;
    });
    
    // Υπολογισμός συνολικών
    const totalRevenue = revenueData.reduce((sum, val) => sum + val, 0);
    const totalProfit = profitData.reduce((sum, val) => sum + val, 0);
    



    this.charts.revenue = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'Έσοδα',
          data: revenueData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          datalabels: {
            display: false
          }
        }, {
          label: 'Κέρδη',
          data: profitData,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: true,
          tension: 0.4,
          datalabels: {
            display: false
          }
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.dataset.label + ': €' + context.parsed.y.toLocaleString('el-GR', {minimumFractionDigits: 2});
              }
            }
          },
          datalabels: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '€' + value.toLocaleString('el-GR');
              }
            }
          }
        }
      }
    });
  },

  createJobsTypeChart(data) {

    
    if (this.charts.jobsType) {
      this.charts.jobsType.destroy();
    }

    const ctx = document.getElementById('jobsTypeChart');
    if (!ctx || !data || data.length === 0) {

      if (ctx) {
        ctx.parentElement.innerHTML = '<p class="text-muted text-center">Δεν υπάρχουν δεδομένα</p>';
      }
      return;
    }

    const colors = [
      'rgb(59, 130, 246)',   // Blue
      'rgb(34, 197, 94)',    // Green
      'rgb(249, 115, 22)',   // Orange
      'rgb(239, 68, 68)',    // Red
      'rgb(168, 85, 247)',   // Purple
      'rgb(236, 72, 153)',   // Pink
    ];
    
    // Support both formats: type (Electron), job_type (Online), or category
    const labels = data.map(item => {
      const label = item.type || item.job_type || item.category || 'Άγνωστο';

      return label;
    });



    this.charts.jobsType = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data.map(item => item.count),
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#fff',
          datalabels: {
            display: false
          }
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = context.parsed;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return context.label + ': €' + value.toLocaleString('el-GR', {minimumFractionDigits: 2}) + 
                       ' (' + percentage + '%)';
              }
            }
          },
          datalabels: {
            display: false
          }
        }
      }
    });
  },

  createJobsStatusChart(data) {
    console.log('📊 Creating jobs status chart with data:', data);
    
    if (this.charts.jobsStatus) {
      this.charts.jobsStatus.destroy();
    }

    const ctx = document.getElementById('jobsStatusChart');
    if (!ctx || !data || data.length === 0) {
      console.warn('⚠️ No data for jobs status chart');
      if (ctx) {
        ctx.parentElement.innerHTML = '<p class="text-muted text-center">Δεν υπάρχουν δεδομένα</p>';
      }
      return;
    }

    // Χρώματα για όλες τις 7 καταστάσεις
    const statusColors = {
      // Exact statuses from database
      'Υποψήφιος': 'rgb(107, 114, 128)',           // Gray
      'Προγραμματισμένη': 'rgb(59, 130, 246)',     // Blue
      'Σε εξέλιξη': 'rgb(245, 158, 11)',           // Orange
      'Σε αναμονή': 'rgb(234, 179, 8)',            // Yellow
      'Ολοκληρώθηκε': 'rgb(34, 197, 94)',          // Green
      'Εξοφλήθηκε': 'rgb(236, 72, 153)',           // Pink
      'Ακυρώθηκε': 'rgb(239, 68, 68)',             // Red
      
      // Alternative plural forms (for API compatibility)
      'Ολοκληρωμένες': 'rgb(34, 197, 94)',
      'Προγραμματισμένες': 'rgb(59, 130, 246)',
      'Υποψήφιες': 'rgb(107, 114, 128)',
      'Ακυρωμένες': 'rgb(239, 68, 68)',
      
      // Default
      'Άλλες': 'rgb(156, 163, 175)'               // Gray
    };
    
    console.log('✅ Status chart data processed:', data.map(item => ({
      status: item.status || item.status_label,
      count: item.count
    })));

    this.charts.jobsStatus = new Chart(ctx, {
      type: 'doughnut',
      data: {
        // Support both 'status' (from Electron) and 'status_label' (from API)
        labels: data.map(item => item.status || item.status_label),
        datasets: [{
          data: data.map(item => item.count),
          backgroundColor: data.map(item => {
            const statusKey = item.status || item.status_label;
            return statusColors[statusKey] || 'rgb(156, 163, 175)';
          }),
          borderWidth: 2,
          borderColor: '#fff',
          datalabels: {
            display: false
          }
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = context.parsed;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return context.label + ': ' + value + ' εργασίες (' + percentage + '%)';
              }
            }
          },
          datalabels: {
            display: false
          }
        }
      }
    });
  },

  createMaterialsChart(data) {

    
    if (this.charts.materials) {
      this.charts.materials.destroy();
    }

    const ctx = document.getElementById('materialsChart');
    if (!ctx || !data || data.length === 0) {

      if (ctx) {
        ctx.parentElement.innerHTML = '<p class="text-muted text-center">Δεν υπάρχουν δεδομένα</p>';
      }
      return;
    }

    // Top 10
    const topMaterials = data.slice(0, 10);
    

    
    // Για χρώματα από paints, δείχνουμε πόσες φορές χρησιμοποιήθηκαν (jobs count)
    // Για υλικά από job_materials, δείχνουμε το κόστος
    const hasJobsCount = topMaterials.some(item => (item.jobs || 0) > 0);
    const hasCost = topMaterials.some(item => {
      const cost = item.total_cost || item.totalCost || 0;

      return cost > 0;
    });
    
    const chartData = topMaterials.map(item => {
      const totalCost = item.total_cost || item.totalCost || 0;
      const totalQuantity = item.total_quantity || item.totalQuantity || 0;
      const jobsCount = item.jobs || item.jobs_count || 0;
      
      // Προτεραιότητα: jobs count (για χρώματα) > κόστος > ποσότητα
      let value;
      if (hasJobsCount && jobsCount > 0) {
        value = jobsCount;
      } else if (hasCost && totalCost > 0) {
        value = totalCost;
      } else {
        value = totalQuantity;
      }
      
      return value;
    });
    
    const label = hasJobsCount ? 'Χρήσεις (Εργασίες)' : hasCost ? 'Κόστος (€)' : 'Ποσότητα';



    
    // Έλεγχος αν έχουμε έστω ένα μη-μηδενικό στοιχείο
    const hasData = chartData.some(val => val > 0);
    if (!hasData) {


      // Δείξε το γράφημα ακόμα και με μηδενικά για debugging
      // if (ctx) {
      //   ctx.parentElement.innerHTML = '<p class="text-muted text-center">Δεν υπάρχουν δεδομένα</p>';
      // }
      // return;
    }
    


    this.charts.materials = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: topMaterials.map(item => item.name || 'Άγνωστο'),
        datasets: [{
          label: label,
          data: chartData,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
          datalabels: {
            display: false
          }
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        indexAxis: 'y',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const item = topMaterials[context.dataIndex];
                const labels = [];
                const totalCost = item.total_cost || item.totalCost || 0;
                const totalQuantity = item.total_quantity || item.totalQuantity || 0;
                const unit = item.unit || 'λίτρα';
                const jobs = item.jobs || item.jobs_count || 0;
                
                // Πάντα δείχνουμε τις εργασίες αν υπάρχουν
                if (jobs > 0) {
                  labels.push('Εργασίες: ' + jobs);
                }
                if (totalQuantity > 0) {
                  labels.push('Ποσότητα: ' + totalQuantity.toLocaleString('el-GR', {minimumFractionDigits: 2}) + ' ' + unit);
                }
                if (totalCost > 0) {
                  labels.push('Κόστος: €' + totalCost.toLocaleString('el-GR', {minimumFractionDigits: 2}));
                }
                
                return labels.length > 0 ? labels : ['Χρήσεις: ' + context.parsed.x];
              }
            }
          },
          datalabels: {
            display: false
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                // Αν δείχνουμε χρήσεις (jobs count), δείξε ακέραιο αριθμό
                // Αν δείχνουμε κόστος, δείξε με €
                // Αλλιώς δείξε την ποσότητα
                if (hasJobsCount) {
                  return Math.round(value);
                } else if (hasCost) {
                  return '€' + value.toLocaleString('el-GR');
                } else {
                  return value.toLocaleString('el-GR');
                }
              }
            }
          }
        }
      }
    });
  },

  createTopJobsChart(data) {

    
    if (this.charts.topJobs) {
      this.charts.topJobs.destroy();
    }

    const ctx = document.getElementById('topJobsChart');
    if (!ctx || !data || data.length === 0) {

      if (ctx) {
        ctx.parentElement.innerHTML = '<p class="text-muted text-center">Δεν υπάρχουν δεδομένα</p>';
      }
      return;
    }
    


    this.charts.topJobs = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map(item => item.title),
        datasets: [{
          label: 'Κέρδος',
          data: data.map(item => {
            // Support both formats: with profit field or calculate from revenue - materials_cost
            if (item.profit !== undefined) {
              return item.profit;
            } else if (item.revenue !== undefined && item.materialsCost !== undefined) {
              return item.revenue - item.materialsCost;
            } else if (item.revenue !== undefined && item.materials_cost !== undefined) {
              return item.revenue - item.materials_cost;
            }
            return 0;
          }),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1,
          datalabels: {
            display: false
          }
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              title: function(context) {
                const item = data[context[0].dataIndex];
                // Support both clientName and client_name
                const clientName = item.clientName || item.client_name;
                return clientName ? item.title + ' - ' + clientName : item.title;
              },
              label: function(context) {
                const item = data[context.dataIndex];
                const labels = [];
                
                // Calculate profit
                const profit = item.profit !== undefined 
                  ? item.profit 
                  : (item.revenue || 0) - (item.materialsCost || item.materials_cost || 0);
                
                const revenue = item.revenue || 0;
                const materialsCost = item.materialsCost || item.materials_cost || 0;
                
                labels.push('Κέρδος: €' + profit.toLocaleString('el-GR', {minimumFractionDigits: 2}));
                labels.push('Έσοδα: €' + revenue.toLocaleString('el-GR', {minimumFractionDigits: 2}));
                labels.push('Υλικά: €' + materialsCost.toLocaleString('el-GR', {minimumFractionDigits: 2}));
                
                if (item.type) {
                  labels.push('Τύπος: ' + item.type);
                }
                
                return labels;
              }
            }
          },
          datalabels: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '€' + value.toLocaleString('el-GR');
              }
            }
          }
        }
      }
    });
  }
};
