/* global require, global */

const test = require('node:test');
const assert = require('node:assert/strict');

global.window = globalThis;
const JobFinancials = require('../public/src/js/domain/job-financials.js');

test('compute uses owner hourly rate for lost billing value', () => {
  const job = {
    assignedWorkers: JSON.stringify([
      { workerType: 'owner', hoursAllocated: 5, hourlyRate: 10 },
      { workerType: 'employee', hoursAllocated: 3, hourlyRate: 20 }
    ]),
    materialsCost: 0,
    kilometers: 0,
    billingType: 'hourly',
    billingHours: 3,
    billingRate: 50
  };

  const result = JobFinancials.compute(job);

  assert.equal(result.lostBillingValue, -20);
  assert.equal(result.billingAmount, 150);
});

test('compute includes materials and km only when charge toggles are enabled', () => {
  const job = {
    assignedWorkers: JSON.stringify([
      { workerType: 'owner', hoursAllocated: 2, hourlyRate: 10 }
    ]),
    materialsCost: 100,
    kilometers: 5,
    costPerKm: 0.5,
    billingType: 'hourly',
    billingHours: 4,
    billingRate: 50,
    chargeMaterials: 1,
    chargeKm: 1
  };

  const result = JobFinancials.compute(job);

  assert.equal(result.billingAmount, 302.5);
  assert.equal(result.profit, 302.5 - 100 - 2.5);
});

test('compute exposes gross profit and owner time value as clearer breakdown fields', () => {
  const job = {
    assignedWorkers: JSON.stringify([
      { workerType: 'owner', hoursAllocated: 4, hourlyRate: 25 },
      { workerType: 'employee', hoursAllocated: 2, hourlyRate: 20 }
    ]),
    materialsCost: 10,
    kilometers: 0,
    billingType: 'hourly',
    billingHours: 6,
    billingRate: 50
  };

  const result = JobFinancials.compute(job);

  assert.equal(result.grossProfit, 300 - 10 - 40);
  assert.equal(result.ownerTimeValue, 100);
  assert.equal(result.netAfterOwnerTime, result.grossProfit - result.ownerTimeValue);
});
