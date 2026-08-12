/**
 * Decision Queue DEFER lifecycle — overlay + audit only.
 * Uses lesson-alignment source so DEFER does not call learning-record
 * transitions or activate knowledge (founder-experience path is separate).
 */
const assert = require('assert');
const {
  applyDecisionQueueAction,
  getDecisionQueueItemAuditHistory,
  STATUS,
} = require('../services/adminDecisionQueue');

const FIXTURE_ID = 'lesson-alignment:lifecycle-defer-regression-fixture';

function main() {
  const note = 'lifecycle certification — reversible';
  const first = applyDecisionQueueAction({
    id: FIXTURE_ID,
    action: 'defer',
    note,
    decidedBy: 'regression-test',
  });
  assert.equal(first.ok, true, `defer ok: ${first.error || ''}`);
  assert.equal(first.status, STATUS.DEFERRED);
  assert.ok(first.auditRecord, 'audit record returned');
  assert.equal(first.underlyingResult, null, 'no underlying knowledge mutation for lesson-alignment defer');

  const history = getDecisionQueueItemAuditHistory(FIXTURE_ID, { limit: 100 });
  assert.ok(
    history.some((e) => e.action === 'DECISION_QUEUE_DEFER' && e.target === FIXTURE_ID),
    'audit trail contains DECISION_QUEUE_DEFER for fixture',
  );

  // Independent second path: defer again (idempotent status) still audits
  const second = applyDecisionQueueAction({
    id: FIXTURE_ID,
    action: 'defer',
    note: 'lifecycle certification — retest',
    decidedBy: 'regression-test',
  });
  assert.equal(second.ok, true);
  assert.equal(second.status, STATUS.DEFERRED);

  const history2 = getDecisionQueueItemAuditHistory(FIXTURE_ID, { limit: 100 });
  const deferCount = history2.filter((e) => e.action === 'DECISION_QUEUE_DEFER' && e.target === FIXTURE_ID).length;
  assert.ok(deferCount >= 2, `expected >=2 defer audits, got ${deferCount}`);

  console.log('PASS decisionQueueDeferLifecycle');
}

main();
