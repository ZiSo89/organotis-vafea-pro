/* global require */

const test = require('node:test');
const assert = require('node:assert/strict');

const { shouldSkipResumeRefresh } = require('../public/src/js/app-resume-guard.js');

function createElement(tagName, closestResult = null) {
  return {
    tagName,
    closest: () => closestResult,
  };
}

test('skips resume refresh when a modal is currently open', () => {
  assert.equal(shouldSkipResumeRefresh({ activeElement: null }, { currentModal: {} }), true);
});

test('skips resume refresh while an input inside a form is focused', () => {
  const activeElement = createElement('INPUT', 'form');
  assert.equal(shouldSkipResumeRefresh({ activeElement }, {}), true);
});

test('skips resume refresh when the job edit form is open', () => {
  const activeElement = createElement('BODY', null);
  const documentRef = {
    activeElement,
    getElementById: (id) => (id === 'jobForm' ? { style: { display: 'block' } } : null)
  };

  assert.equal(shouldSkipResumeRefresh(documentRef, {}), true);
});

test('allows resume refresh when no modal or form input is active', () => {
  const activeElement = createElement('BODY', null);
  assert.equal(shouldSkipResumeRefresh({ activeElement }, {}), false);
});
