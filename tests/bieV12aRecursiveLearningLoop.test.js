/**
 * BIE v1.2A — Recursive learning loop completion
 * Run: node --test tests/bieV12aRecursiveLearningLoop.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { appendExperienceEvent } = require('../services/experienceEventLedger');
const {
  createLearningRecord,
  listLearningRecords,
  transitionLearningRecord,
} = require('../services/learningRecordStore');
const {
  buildRankedRecommendations,
  fingerprintPackage,
  fingerprintFromLearningRecord,
} = require('../services/recommendationIntelligence');
const { runDiscoveryPass } = require('../services/discoveryEngine');

function flushAsync() {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('BIE v1.2A recursive learning loop', () => {
  it('1. Admin REJECTED status materializes on listLearningRecords', () => {
    const created = createLearningRecord({
      behaviorFamily: 'v12a_status_materialize',
      failurePattern: 'RECURRING_FAILURE',
      expectedBehavior: 'Reduce RECURRING_FAILURE recurrence on v12a_status_materialize',
      candidateRepair: 'Investigate v12a_status_materialize path',
      discoveryId: 'disc_v12a_status',
      packageFingerprint: 'fp_status_test_001',
      forceNew: true,
    });
    assert.equal(created.ok, true);
    assert.equal(created.duplicate, false);

    const before = listLearningRecords({ limit: 50 }).find(
      (r) => r.learningRecordId === created.record.learningRecordId,
    );
    assert.ok(before);
    assert.equal(before.adminStatus, 'READY_FOR_ADMIN_REVIEW');

    const t = transitionLearningRecord(created.record.learningRecordId, 'REJECTED', {
      actor: 'admin-v12a',
      note: 'not actionable unchanged',
    });
    assert.equal(t.ok, true);
    assert.equal(t.adminStatus, 'REJECTED');
    assert.equal(t.packageFingerprint, 'fp_status_test_001');

    const after = listLearningRecords({ limit: 50 }).find(
      (r) => r.learningRecordId === created.record.learningRecordId,
    );
    assert.ok(after);
    assert.equal(after.adminStatus, 'REJECTED');
    assert.equal(after.packageFingerprint, 'fp_status_test_001');

    const rejectedOnly = listLearningRecords({ limit: 50, status: 'REJECTED' });
    assert.ok(rejectedOnly.some((r) => r.learningRecordId === created.record.learningRecordId));
  });

  it('2. rejection fingerprint matches package fingerprint', () => {
    const pkg = {
      behaviorFamily: 'v12a_fp_family',
      smallestProposedRepair: 'Smallest governed repair for fp family',
      discoveryId: 'disc_v12a_fp',
      expectedBehaviorChange: 'Reduce RECURRING_FAILURE recurrence on v12a_fp_family',
    };
    const fp = fingerprintPackage(pkg);
    const lr = {
      behaviorFamily: pkg.behaviorFamily,
      candidateRepair: pkg.smallestProposedRepair,
      discoveryId: pkg.discoveryId,
      expectedBehavior: pkg.expectedBehaviorChange,
    };
    assert.equal(fingerprintFromLearningRecord(lr), fp);
    assert.equal(fingerprintFromLearningRecord({ packageFingerprint: 'stored_fp' }), 'stored_fp');
  });

  it('3. full loop: recommend → reject → replay → suppress unchanged', async () => {
    const topic = `v12a_loop_${Date.now()}`;
    for (let i = 0; i < 3; i += 1) {
      appendExperienceEvent({
        eventType: 'ANSWER_REJECTED',
        requestId: `${topic}-rej-${i}`,
        topic,
        lane: 'reason_first_openai',
        founderFeedback: { mark: 'REJECTED' },
      });
    }

    const disc = runDiscoveryPass({ persist: true });
    const fam = disc.discoveries.find(
      (d) => d.recommendationEligibility && String(d.behaviorFamily || '').includes(topic),
    );
    assert.ok(fam, 'eligible discovery for seeded topic');

    const first = await buildRankedRecommendations({ persist: true });
    assert.equal(first.ok, true);
    const target = first.ranked.find(
      (p) => p.discoveryId === fam.discoveryId && !p.suppressedAsUnchangedRejection,
    );
    assert.ok(target, 'ready recommendation package');
    assert.ok(target.packageFingerprint);

    const lr = listLearningRecords({ limit: 300 }).find(
      (r) =>
        r.packageFingerprint === target.packageFingerprint ||
        (r.discoveryId === target.discoveryId && r.behaviorFamily === target.behaviorFamily),
    );
    assert.ok(lr, 'learning record linked to recommendation');

    const rejected = transitionLearningRecord(lr.learningRecordId, 'REJECTED', {
      actor: 'admin-v12a-loop',
      note: 'reject unchanged package for suppression proof',
      packageFingerprint: target.packageFingerprint,
    });
    assert.equal(rejected.adminStatus, 'REJECTED');
    await flushAsync();

    const listed = listLearningRecords({ limit: 300 }).find(
      (r) => r.learningRecordId === lr.learningRecordId,
    );
    assert.equal(listed.adminStatus, 'REJECTED');

    const second = await buildRankedRecommendations({ persist: true });
    const again = second.ranked.find((p) => p.discoveryId === fam.discoveryId);
    assert.ok(again);
    assert.equal(again.packageFingerprint, target.packageFingerprint);
    assert.equal(again.suppressedAsUnchangedRejection, true);
    assert.equal(again.adminStatus, 'SUPPRESSED_DUPLICATE_REJECTION');
    assert.ok(second.suppressedUnchangedRejections >= 1);
  });

  it('4. APPROVED transition also materializes without production mutation', () => {
    const created = createLearningRecord({
      behaviorFamily: 'v12a_approve_materialize',
      failurePattern: 'TRUST_BREAK_PATTERN',
      expectedBehavior: 'Preserve approved shadow candidate',
      forceNew: true,
    });
    const t = transitionLearningRecord(created.record.learningRecordId, 'APPROVED', {
      actor: 'admin-v12a',
    });
    assert.equal(t.productionMutation, false);
    const listed = listLearningRecords({ limit: 50 }).find(
      (r) => r.learningRecordId === created.record.learningRecordId,
    );
    assert.equal(listed.adminStatus, 'APPROVED');
  });
});
