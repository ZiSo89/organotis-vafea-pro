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
            <div class="stat-label">Ολοκληρωμένες</div>
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
    `;

    // Event Listeners
    this.attachEventListeners();
    
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
      const response = await API.get('/api/statistics.php?action=available_years');
      if (response.success) {
        const years = response.data;
        const select = document.getElementById('yearFilter');
        
        select.innerHTML = years.map(year => 
          `<option value="${year}" ${year == this.currentYear ? 'selected' : ''}>${year}</option>`
        ).join('');
      }
    } catch (error) {
      console.error('Σφάλμα φόρτωσης ετών:', error);
    }
  },

  async loadStatistics() {
    try {
      // Φόρτωση όλων των δεδομένων παράλληλα
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

    } catch (error) {
      console.error('Σφάλμα φόρτωσης στατιστικών:', error);
      showToast('Σφάλμα φόρτωσης στατιστικών', 'error');
    }
  },

  updateSummaryCards(data) {
    document.getElementById('totalRevenue').textContent = 
      `€${(data.total_revenue || 0).toLocaleString('el-GR', {minimumFractionDigits: 2})}`;
    document.getElementById('totalProfit').textContent = 
      `€${(data.total_profit || 0).toLocaleString('el-GR', {minimumFractionDigits: 2})}`;
    document.getElementById('totalJobs').textContent = data.total_jobs || 0;
    document.getElementById('completedJobs').textContent = data.completed_jobs || 0;
  },

  createRevenueChart(data) {
    // Καταστροφή προηγούμενου chart
    if (this.charts.revenue) {
      this.charts.revenue.destroy();
    }

    const ctx = document.getElementById('revenueMonthChart');
    if (!ctx) return;

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
          tension: 0.4
        }, {
          label: 'Κέρδη',
          data: profitData,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: true,
          tension: 0.4
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

    this.charts.jobsType = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(item => item.job_type),
        datasets: [{
          data: data.map(item => item.revenue),
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#fff'
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
          }
        }
      }
    });
  },

  createJobsStatusChart(data) {
    if (this.charts.jobsStatus) {
      this.charts.jobsStatus.destroy();
    }

    const ctx = document.getElementById('jobsStatusChart');
    if (!ctx || !data || data.length === 0) {
      if (ctx) {
        ctx.parentElement.innerHTML = '<p class="text-muted text-center">Δεν υπάρχουν δεδομένα</p>';
      }
      return;
    }

    const statusColors = {
      'Ολοκληρωμένες': 'rgb(34, 197, 94)',       // Green
      'Σε εξέλιξη': 'rgb(59, 130, 246)',          // Blue
      'Εκκρεμείς': 'rgb(249, 115, 22)',           // Orange
      'Ακυρωμένες': 'rgb(239, 68, 68)',           // Red
      'Προγραμματισμένες': 'rgb(168, 85, 247)',   // Purple
      'Υποψήφιες': 'rgb(236, 72, 153)',           // Pink
      'Άλλες': 'rgb(156, 163, 175)'               // Gray
    };

    this.charts.jobsStatus = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(item => item.status_label),
        datasets: [{
          data: data.map(item => item.count),
          backgroundColor: data.map(item => statusColors[item.status_label] || 'rgb(156, 163, 175)'),
          borderWidth: 2,
          borderColor: '#fff'
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
    
    // Έλεγχος αν έχουμε κόστος ή χρήσεις
    const hasCost = topMaterials.some(item => item.total_cost > 0);
    const chartData = topMaterials.map(item => hasCost ? item.total_cost : item.total_quantity);
    const label = hasCost ? 'Κόστος' : 'Χρήσεις';

    this.charts.materials = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: topMaterials.map(item => item.name),
        datasets: [{
          label: label,
          data: chartData,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1
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
                
                if (hasCost) {
                  labels.push('Κόστος: €' + context.parsed.x.toLocaleString('el-GR', {minimumFractionDigits: 2}));
                  labels.push('Ποσότητα: ' + item.total_quantity + ' ' + item.unit);
                } else {
                  labels.push('Χρήσεις: ' + context.parsed.x);
                }
                
                labels.push('Εργασίες: ' + item.jobs_count);
                
                return labels;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return hasCost ? '€' + value.toLocaleString('el-GR') : value;
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
          data: data.map(item => item.profit),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1
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
                return item.title + ' - ' + item.client_name;
              },
              label: function(context) {
                const item = data[context.dataIndex];
                return [
                  'Κέρδος: €' + item.profit.toLocaleString('el-GR', {minimumFractionDigits: 2}),
                  'Έσοδα: €' + item.revenue.toLocaleString('el-GR', {minimumFractionDigits: 2}),
                  'Υλικά: €' + item.materials_cost.toLocaleString('el-GR', {minimumFractionDigits: 2}),
                  'Τύπος: ' + (item.type || 'N/A')
                ];
              }
            }
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
