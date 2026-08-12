/**
 * Decision Queue empty-source semantics — production-empty is a valid 200.
 * Run: node --test tests/decisionQueueEmptySourcesSemantics.test.js
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('decision queue empty-source / envelope contract', () => {
  it('listDecisionQueue envelope always exposes ok/total/counts/items', () => {
    const { listDecisionQueue } = require('../services/adminDecisionQueue');
    const q = listDecisionQueue({ limit: 5 });
    assert.equal(q.ok, true);
    assert.equal(typeof q.total, 'number');
    assert.ok(q.counts && typeof q.counts === 'object');
    assert.ok(Array.isArray(q.items));
    assert.ok(q.items.length <= 5);
    // Local gitignored data/ usually has rows; production Render often has total:0.
    // Contract: total === items federation size after filters, not "open only".
  });

  it('operator preflight surfaces queueTotal for empty-store diagnosis', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'scripts', 'adminGovernedDeferOperator.js'),
      'utf8',
    );
    assert.ok(src.includes('queueTotal'), 'preflight must log queueTotal');
    assert.ok(src.includes('emptyStore'), 'preflight must flag emptyStore');
  });

  it('learningRecordStore exports durable hydrate hook', () => {
    const store = require('../services/learningRecordStore');
    assert.equal(typeof store.hydrateLearningRecordsFromDurableIfNeeded, 'function');
  });

  it('server.js boots durable learning hydrate (no new subsystem)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    assert.ok(src.includes('hydrateLearningRecordsFromDurableIfNeeded'));
  });
});
