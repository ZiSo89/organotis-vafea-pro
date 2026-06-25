/* ========================================
   Job Financials Domain Helper
   ======================================== */

const JobFinancials = {
  toNumber(value, fallback = 0) {
    const number = parseFloat(value);
    return Number.isFinite(number) ? number : fallback;
  },

  parseJsonArray(value) {
    if (Array.isArray(value)) return value;
    if (!value || value === 'null' || value === 'undefined') return [];

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('[JobFinancials] Invalid JSON array:', error);
      return [];
    }
  },

  getWorkerType(worker = {}) {
    return (worker.workerType || worker.worker_type) === 'owner' ? 'owner' : 'employee';
  },

  getWorkedTimeTotals(assignedWorkers = []) {
    const totals = {
      totalHours: 0,
      laborCost: 0,
      ownerHours: 0,
      ownerOpportunityCost: 0
    };

    assignedWorkers.forEach(worker => {
      const workedHours = this.toNumber(worker.hoursAllocated ?? worker.hours_allocated);
      const hourlyRate = this.toNumber(worker.hourlyRate ?? worker.hourly_rate);
      const workerType = this.getWorkerType(worker);
      const laborCost = worker.laborCost !== undefined || worker.labor_cost !== undefined
        ? this.toNumber(worker.laborCost ?? worker.labor_cost)
        : workedHours * hourlyRate;

      totals.totalHours += workedHours;

      if (workerType === 'owner') {
        totals.ownerHours += workedHours;
        totals.ownerOpportunityCost += workedHours * hourlyRate;
      } else {
        totals.laborCost += laborCost;
      }
    });

    return totals;
  },

  getPaymentsTotal(payments = []) {
    return payments.reduce((sum, payment) => {
      return sum + this.toNumber(payment.amount);
    }, 0);
  },

  toBoolean(value, fallback = false) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
      if (['0', 'false', 'no', 'off', ''].includes(normalized)) return false;
    }
    return fallback;
  },

  getOwnerHourlyRateForLost(assignedWorkers = []) {
    return assignedWorkers.reduce((rate, worker) => {
      if (this.getWorkerType(worker) !== 'owner') return rate;
      const r = this.toNumber(worker.hourlyRate ?? worker.hourly_rate);
      return r > 0 ? r : rate;
    }, 0);
  },

  buildSnapshot(job = {}, options = {}) {
    const assignedWorkers = this.parseJsonArray(job.assignedWorkers ?? job.assigned_workers ?? []);
    const workedTotals = this.getWorkedTimeTotals(assignedWorkers);

    const materialsCost = this.toNumber(job.materialsCost ?? job.materials_cost);
    const kilometers = this.toNumber(job.kilometers);
    const costPerKm = this.toNumber(job.costPerKm ?? job.cost_per_km, 0.5);
    const travelCost = kilometers * costPerKm;

    const billingType = (job.billingType || job.billing_type) === 'fixed' ? 'fixed' : 'hourly';
    const agreedPrice = this.toNumber(job.agreedPrice ?? job.agreed_price);
    const billingHours = this.toNumber(job.billingHours ?? job.billing_hours);
    const billingRate = this.toNumber(job.billingRate ?? job.billing_rate, 50);
    const explicitBillingAmount = this.toNumber(job.billingAmount ?? job.billing_amount);
    const fallbackTotalCost = this.toNumber(job.totalCost ?? job.total_cost);
    const chargeMaterials = this.toBoolean(options.chargeMaterials ?? job.chargeMaterials ?? job.charge_materials ?? 0);
    const chargeKm = this.toBoolean(options.chargeKm ?? job.chargeKm ?? job.charge_km ?? 0);

    let baseCharge = 0;
    if (billingType === 'fixed' && agreedPrice > 0) {
      baseCharge = agreedPrice;
    } else if (billingHours || billingRate) {
      baseCharge = billingHours * billingRate;
    }

    if (!baseCharge && explicitBillingAmount) {
      baseCharge = explicitBillingAmount;
    }

    if (!baseCharge && fallbackTotalCost) {
      baseCharge = fallbackTotalCost;
    }

    const materialsCharge = chargeMaterials ? materialsCost : 0;
    const kmCharge = chargeKm ? travelCost : 0;
    const billingAmount = baseCharge + materialsCharge + kmCharge;
    const totalExpenses = materialsCost + workedTotals.laborCost + travelCost;

    const chargedHours = billingType === 'fixed' ? 0 : billingHours;
    const unbilledHours = billingType === 'fixed' ? 0 : Math.max(0, workedTotals.totalHours - chargedHours);
    const ownerUnbilledHours = billingType === 'fixed' ? 0 : Math.max(0, workedTotals.ownerHours - chargedHours);
    const ownerHourlyRateForLost = this.getOwnerHourlyRateForLost(assignedWorkers);
    const lostBillingValue = ownerHourlyRateForLost > 0
      ? -(ownerUnbilledHours * ownerHourlyRateForLost)
      : -(unbilledHours * ownerHourlyRateForLost);
    const grossProfit = billingAmount - totalExpenses;
    const ownerTimeValue = workedTotals.ownerOpportunityCost;
    const netAfterOwnerTime = grossProfit - ownerTimeValue;
    const profit = grossProfit;
    const economicProfit = netAfterOwnerTime;
    const margin = billingAmount > 0 ? (profit / billingAmount) * 100 : null;

    return {
      billingType,
      agreedPrice,
      billingHours,
      billingRate,
      baseCharge,
      materialsCharge,
      kmCharge,
      chargeMaterials,
      chargeKm,
      billingAmount,
      materialsCost,
      laborCost: workedTotals.laborCost,
      travelCost,
      totalExpenses,
      grossProfit,
      ownerTimeValue,
      netAfterOwnerTime,
      profit,
      economicProfit,
      actualHours: workedTotals.totalHours,
      chargedHours,
      unbilledHours,
      ownerUnbilledHours,
      lostBillingValue,
      ownerHours: workedTotals.ownerHours,
      ownerOpportunityCost: workedTotals.ownerOpportunityCost,
      visitCount: 0,
      profitPerHour: workedTotals.totalHours > 0 ? profit / workedTotals.totalHours : null,
      economicProfitPerHour: workedTotals.totalHours > 0 ? economicProfit / workedTotals.totalHours : null,
      margin
    };
  },

  compute(job = {}, options = {}) {
    const snapshot = this.buildSnapshot(job, options);
    const payments = Array.isArray(options.payments) ? options.payments : [];
    const paidAmount = this.getPaymentsTotal(payments);

    return {
      ...snapshot,
      paidAmount,
      balance: snapshot.billingAmount - paidAmount,
    };
  }
};

window.JobFinancials = JobFinancials;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = JobFinancials;
}
