/**
 * Governance durability follow-ons after 51f0072 production verify.
 * Run: node --test tests/governanceDurabilityFollowOn.test.js
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('governance durability follow-on', () => {
  it('maps learning adminStatus DEFERRED → queue Deferred (overlay-independent)', () => {
    const { learningAdminStatusToQueueStatus, STATUS } = require('../services/adminDecisionQueue');
    assert.equal(learningAdminStatusToQueueStatus('DEFERRED'), STATUS.DEFERRED);
    assert.equal(learningAdminStatusToQueueStatus('READY_FOR_ADMIN_REVIEW'), STATUS.READY_FOR_DECISION);
    assert.equal(learningAdminStatusToQueueStatus('APPROVED'), STATUS.APPROVED);
    assert.equal(learningAdminStatusToQueueStatus('REJECTED'), STATUS.REJECTED);
  });

  it('adminAuditTrail exports durable hydrate and dual-writes on record', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'services/adminAuditTrail.js'), 'utf8');
    assert.ok(src.includes('hydrateAdminAuditFromDurableIfNeeded'));
    assert.ok(src.includes('dualWriteAuditDurable'));
    assert.ok(src.includes('DOC.adminUnifiedAudit'));
    const trail = require('../services/adminAuditTrail');
    assert.equal(typeof trail.hydrateAdminAuditFromDurableIfNeeded, 'function');
  });

  it('durable store documents adminUnifiedAudit', () => {
    const { DOC, MAX } = require('../services/founderExperienceDurableStore');
    assert.ok(DOC.adminUnifiedAudit);
    assert.ok(MAX.adminUnifiedAudit >= 1000);
  });

  it('server boots audit hydrate alongside learning hydrate', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
    assert.ok(src.includes('hydrateAdminAuditFromDurableIfNeeded'));
    assert.ok(src.includes('hydrateLearningRecordsFromDurableIfNeeded'));
  });
});
