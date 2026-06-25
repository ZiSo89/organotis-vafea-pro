/* global require */

const test = require('node:test');
const assert = require('node:assert/strict');

const { hasCoreData, shouldKeepLoadingOverlay } = require('../public/src/js/pwa-bootstrap.js');

test('hasCoreData returns true when core collections have items', () => {
  const data = {
    clients: [],
    jobs: [{ id: 1 }],
    suppliers: [],
    inventory: []
  };

  assert.equal(hasCoreData(data), true);
});

test('hasCoreData returns false when all core collections are empty', () => {
  const data = {
    clients: [],
    jobs: [],
    suppliers: [],
    inventory: []
  };

  assert.equal(hasCoreData(data), false);
});

test('shouldKeepLoadingOverlay stays true for installed PWA while data is still empty', () => {
  const decision = shouldKeepLoadingOverlay({
    data: {
      clients: [],
      jobs: [],
      suppliers: [],
      inventory: []
    },
    isPwaInstalled: true,
    sessionStorageValue: null
  });

  assert.equal(decision, true);
});

test('shouldKeepLoadingOverlay returns false once data is ready or reload already started', () => {
  const populated = shouldKeepLoadingOverlay({
    data: {
      clients: [{ id: 1 }],
      jobs: [],
      suppliers: [],
      inventory: []
    },
    isPwaInstalled: true,
    sessionStorageValue: null
  });

  const reloading = shouldKeepLoadingOverlay({
    data: {
      clients: [],
      jobs: [],
      suppliers: [],
      inventory: []
    },
    isPwaInstalled: true,
    sessionStorageValue: '1'
  });

  assert.equal(populated, false);
  assert.equal(reloading, false);
});
