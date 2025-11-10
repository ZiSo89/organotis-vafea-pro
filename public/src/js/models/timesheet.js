/* ========================================
   Timesheet Model - Διαχείριση Ωρών Εργασίας
   ======================================== */

console.log('⏰ Loading Timesheet Model...');

window.Timesheet = {
  
  /**
   * Check-in worker
   * @param {string} workerId - Worker ID
   * @returns {Object} Timesheet entry
   */
  checkIn(workerId) {
    const worker = State.data.workers.find(w => w.id === workerId);
    if (!worker) {
      throw new Error('Worker not found');
    }

    if (worker.currentCheckIn) {
      throw new Error('Worker already checked in');
    }

    const now = new Date().toISOString();
    
    // Create timesheet entry
    const timesheets = State.read('timesheets') || [];
    const timesheet = {
      id: this.generateId(),
      workerId: workerId,
      workerName: worker.name,
      checkIn: now,
      checkOut: null,
      hoursWorked: null,
      hourlyRate: worker.hourlyRate,
      earnings: null,
      jobId: null, // Can be linked to a job
      notes: ''
    };
    
    State.create('timesheets', timesheet);
    
    // Update worker
    worker.currentCheckIn = now;
    State.update('workers', workerId, worker);

    return timesheet;
  },

  /**
   * Check-out worker
   * @param {string} workerId - Worker ID
   * @returns {Object} Updated timesheet entry
   */
  checkOut(workerId) {
    const worker = State.data.workers.find(w => w.id === workerId);
    if (!worker) {
      throw new Error('Worker not found');
    }

    if (!worker.currentCheckIn) {
      throw new Error('Worker not checked in');
    }

    const now = new Date().toISOString();
    const checkInTime = new Date(worker.currentCheckIn);
    const checkOutTime = new Date(now);
    
    // Calculate hours worked
    const hoursWorked = (checkOutTime - checkInTime) / (1000 * 60 * 60);
    const earnings = hoursWorked * worker.hourlyRate;

    // Find and update timesheet
    const timesheets = State.read('timesheets') || [];
    const timesheet = timesheets.find(t => 
      t.workerId === workerId && 
      t.checkIn === worker.currentCheckIn && 
      !t.checkOut
    );

    if (!timesheet) {
      throw new Error('Timesheet entry not found');
    }

    timesheet.checkOut = now;
    timesheet.hoursWorked = hoursWorked;
    timesheet.earnings = earnings;
    State.update('timesheets', timesheet.id, timesheet);

    // Update worker totals
    worker.currentCheckIn = null;
    worker.totalHours = (worker.totalHours || 0) + hoursWorked;
    worker.totalEarnings = (worker.totalEarnings || 0) + earnings;
    State.update('workers', workerId, worker);

    return timesheet;
  },

  /**
   * Get worker timesheets
   * @param {string} workerId - Worker ID
   * @param {Object} options - Filter options
   * @returns {Array} Timesheets
   */
  getWorkerTimesheets(workerId, options = {}) {
    const timesheets = State.read('timesheets') || [];
    let filtered = timesheets.filter(t => t.workerId === workerId);

    // Filter by date range
    if (options.startDate) {
      filtered = filtered.filter(t => new Date(t.checkIn) >= new Date(options.startDate));
    }
    if (options.endDate) {
      filtered = filtered.filter(t => new Date(t.checkIn) <= new Date(options.endDate));
    }

    // Filter by job
    if (options.jobId) {
      filtered = filtered.filter(t => t.jobId === options.jobId);
    }

    // Sort by check-in time (newest first)
    filtered.sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn));

    return filtered;
  },

  /**
   * Get all timesheets for a specific month
   * @param {number} year - Year
   * @param {number} month - Month (0-11)
   * @returns {Array} Timesheets
   */
  getMonthlyTimesheets(year, month) {
    const timesheets = State.read('timesheets') || [];
    return timesheets.filter(t => {
      if (!t.checkOut) return false;
      const date = new Date(t.checkIn);
      return date.getFullYear() === year && date.getMonth() === month;
    });
  },

  /**
   * Calculate worker stats for a period
   * @param {string} workerId - Worker ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} Stats
   */
  calculateWorkerStats(workerId, startDate, endDate) {
    const timesheets = this.getWorkerTimesheets(workerId, { startDate, endDate });
    
    const totalHours = timesheets.reduce((sum, t) => sum + (t.hoursWorked || 0), 0);
    const totalEarnings = timesheets.reduce((sum, t) => sum + (t.earnings || 0), 0);
    const totalShifts = timesheets.length;
    const avgHoursPerShift = totalShifts > 0 ? totalHours / totalShifts : 0;

    return {
      totalHours: totalHours,
      totalEarnings: totalEarnings,
      totalShifts: totalShifts,
      avgHoursPerShift: avgHoursPerShift
    };
  },

  /**
   * Link timesheet to a job
   * @param {string} timesheetId - Timesheet ID
   * @param {string} jobId - Job ID
   */
  linkToJob(timesheetId, jobId) {
    const timesheet = State.read('timesheets', timesheetId);
    if (!timesheet) {
      throw new Error('Timesheet not found');
    }

    timesheet.jobId = jobId;
    State.update('timesheets', timesheetId, timesheet);
  },

  /**
   * Update timesheet notes
   * @param {string} timesheetId - Timesheet ID
   * @param {string} notes - Notes
   */
  updateNotes(timesheetId, notes) {
    const timesheet = State.read('timesheets', timesheetId);
    if (!timesheet) {
      throw new Error('Timesheet not found');
    }

    timesheet.notes = notes;
    State.update('timesheets', timesheetId, timesheet);
  },

  /**
   * Manually create timesheet entry (for past dates)
   * @param {Object} data - Timesheet data
   * @returns {Object} Created timesheet
   */
  createManual(data) {
    if (!data.workerId || !data.checkIn || !data.checkOut) {
      throw new Error('Missing required fields');
    }

    const worker = State.data.workers.find(w => w.id === data.workerId);
    if (!worker) {
      throw new Error('Worker not found');
    }

    const checkInTime = new Date(data.checkIn);
    const checkOutTime = new Date(data.checkOut);
    const hoursWorked = (checkOutTime - checkInTime) / (1000 * 60 * 60);
    const earnings = hoursWorked * (data.hourlyRate || worker.hourlyRate);

    const timesheet = {
      id: this.generateId(),
      workerId: data.workerId,
      workerName: worker.name,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      hoursWorked: hoursWorked,
      hourlyRate: data.hourlyRate || worker.hourlyRate,
      earnings: earnings,
      jobId: data.jobId || null,
      notes: data.notes || ''
    };

    State.create('timesheets', timesheet);

    // Update worker totals
    worker.totalHours = (worker.totalHours || 0) + hoursWorked;
    worker.totalEarnings = (worker.totalEarnings || 0) + earnings;
    State.update('workers', data.workerId, worker);

    return timesheet;
  },

  /**
   * Delete timesheet entry
   * @param {string} timesheetId - Timesheet ID
   */
  delete(timesheetId) {
    const timesheet = State.read('timesheets', timesheetId);
    if (!timesheet) {
      throw new Error('Timesheet not found');
    }

    // Update worker totals if timesheet is completed
    if (timesheet.checkOut && timesheet.hoursWorked && timesheet.earnings) {
      const worker = State.data.workers.find(w => w.id === timesheet.workerId);
      if (worker) {
        worker.totalHours = Math.max(0, (worker.totalHours || 0) - timesheet.hoursWorked);
        worker.totalEarnings = Math.max(0, (worker.totalEarnings || 0) - timesheet.earnings);
        State.update('workers', timesheet.workerId, worker);
      }
    }

    State.delete('timesheets', timesheetId);
  },

  /**
   * Generate timesheet ID
   * @returns {string} ID
   */
  generateId() {
    const timesheets = State.read('timesheets') || [];
    const maxId = timesheets.length > 0 
      ? Math.max(...timesheets.map(t => parseInt(t.id.split('-')[1]) || 0))
      : 0;
    return `TS-${String(maxId + 1).padStart(6, '0')}`;
  },

  /**
   * Get daily summary for all workers
   * @param {Date} date - Date
   * @returns {Array} Worker summaries
   */
  getDailySummary(date) {
    const timesheets = State.read('timesheets') || [];
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const dayTimesheets = timesheets.filter(t => {
      const checkInDate = new Date(t.checkIn);
      return checkInDate >= targetDate && checkInDate < nextDay;
    });

    // Group by worker
    const workerMap = new Map();
    dayTimesheets.forEach(t => {
      if (!workerMap.has(t.workerId)) {
        workerMap.set(t.workerId, {
          workerId: t.workerId,
          workerName: t.workerName,
          timesheets: [],
          totalHours: 0,
          totalEarnings: 0
        });
      }
      const summary = workerMap.get(t.workerId);
      summary.timesheets.push(t);
      summary.totalHours += t.hoursWorked || 0;
      summary.totalEarnings += t.earnings || 0;
    });

    return Array.from(workerMap.values());
  },

  /**
   * Get monthly summary for all workers
   * @param {number} year - Year
   * @param {number} month - Month (0-11)
   * @returns {Array} Worker summaries
   */
  getMonthlySummary(year, month) {
    const timesheets = this.getMonthlyTimesheets(year, month);

    // Group by worker
    const workerMap = new Map();
    timesheets.forEach(t => {
      if (!workerMap.has(t.workerId)) {
        workerMap.set(t.workerId, {
          workerId: t.workerId,
          workerName: t.workerName,
          totalHours: 0,
          totalEarnings: 0,
          totalShifts: 0
        });
      }
      const summary = workerMap.get(t.workerId);
      summary.totalHours += t.hoursWorked || 0;
      summary.totalEarnings += t.earnings || 0;
      summary.totalShifts += 1;
    });

    return Array.from(workerMap.values());
  },

  /**
   * Get job labor cost
   * @param {string} jobId - Job ID
   * @returns {Object} Labor cost breakdown
   */
  getJobLaborCost(jobId) {
    const timesheets = State.read('timesheets') || [];
    const jobTimesheets = timesheets.filter(t => t.jobId === jobId && t.checkOut);

    const totalHours = jobTimesheets.reduce((sum, t) => sum + (t.hoursWorked || 0), 0);
    const totalCost = jobTimesheets.reduce((sum, t) => sum + (t.earnings || 0), 0);
    const workerCount = new Set(jobTimesheets.map(t => t.workerId)).size;

    return {
      totalHours: totalHours,
      totalCost: totalCost,
      workerCount: workerCount,
      timesheets: jobTimesheets
    };
  }
};
