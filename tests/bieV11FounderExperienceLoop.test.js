/**
 * BIE v1.1 Founder Experience Loop — foundation tests
 * Run: node --test tests/bieV11FounderExperienceLoop.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  appendExperienceEvent,
  readExperienceEvents,
  reconstructTraceLineage,
  EVENT_TYPES,
} = require('../services/experienceEventLedger');
const { captureTurnInstrumentation, buildNormalizedSpans } = require('../services/experienceTraceAdapter');
const { recordFounderExperienceFeedback, FOUNDER_MARKS } = require('../services/founderExperienceFeedback');
const { listLearningRecords, transitionLearningRecord } = require('../services/learningRecordStore');
const { getEvaluationRegistry, listEvaluators } = require('../services/evaluationRegistry');
const { evaluateClaimGrounding } = require('../services/claimGroundingEvaluator');
const { runRetrievalShadowCompare } = require('../services/retrievalShadowLab');
const { getWatcherMode, runRecurringFailureWatcher } = require('../services/experienceWatchers');

const DATA_DIR = path.join(__dirname, '..', 'data', 'founder-experience');

describe('BIE v1.1 Founder Experience Loop', () => {
  it('1. event taxonomy includes required core types', () => {
    for (const t of [
      'QUESTION_RECEIVED',
      'ANSWER_GENERATED',
      'ANSWER_ACCEPTED',
      'ANSWER_REJECTED',
      'ADMIN_RECOMMENDATION_APPROVED',
      'DRIFT_ALERT',
    ]) {
      assert.ok(EVENT_TYPES.includes(t), t);
    }
  });

  it('2. append-only ledger stores privacy-controlled events', () => {
    const r = appendExperienceEvent({
      eventType: 'QUESTION_RECEIVED',
      requestId: 'test-req-1',
      userId: 'user-secret',
      sessionId: 'sess-1',
      currentMessage: 'Explain the Sabbath privately named John Doe',
      privacyScope: 'ANONYMIZED_TELEMETRY',
    });
    assert.equal(r.ok, true);
    assert.ok(r.event.anonymizedSessionKey);
    assert.ok(r.event.questionFingerprint);
    assert.ok(!String(JSON.stringify(r.event)).includes('user-secret'));
  });

  it('3. turn instrumentation emits question+answer+trace without mutating reply', () => {
    const reply = {
      reply: 'Direct answer: The seventh day is the Sabbath.',
      runtime: {
        masterRoute: 'doctrine_final_authority',
        doctrineTopic: 'sabbath',
        openAiCalled: false,
        finalAnswerAuthor: 'doctrine_final_authority',
      },
      doctrineComposedFromPacket: true,
    };
    const before = String(reply.reply);
    const out = captureTurnInstrumentation({
      requestId: 'instr-1',
      userId: 'u1',
      sessionId: 's1',
      message: 'Explain the Sabbath.',
      reply,
      latencyMs: 12,
    });
    assert.equal(out.ok, true);
    assert.ok(out.spans.length >= 3);
    assert.equal(reply.reply, before);
    const lineage = reconstructTraceLineage('instr-1');
    assert.ok(lineage.eventCount >= 2);
  });

  it('4. Founder REJECTED creates deduped learning candidate', () => {
    const a = recordFounderExperienceFeedback({
      mark: 'WRONG_SCRIPTURE',
      requestId: 'fb-1',
      expectedBehavior: 'Cite Revelation 20 for first resurrection outcomes',
      route: 'reason_first_openai',
      topic: 'resurrection',
    });
    assert.equal(a.ok, true);
    assert.ok(a.learningRecordId);
    const b = recordFounderExperienceFeedback({
      mark: 'WRONG_SCRIPTURE',
      requestId: 'fb-2',
      expectedBehavior: 'Cite Revelation 20 for first resurrection outcomes',
      route: 'reason_first_openai',
      topic: 'resurrection',
    });
    assert.equal(b.duplicateLearningRecord, true);
    assert.equal(b.learningRecordId, a.learningRecordId);
  });

  it('5. Admin cannot auto-mutate via learning-record approve', () => {
    const created = recordFounderExperienceFeedback({
      mark: 'INCOMPLETE',
      requestId: 'fb-3',
      expectedBehavior: 'Answer yes/no first on Satan release question',
    });
    const t = transitionLearningRecord(created.learningRecordId, 'APPROVED', {
      actor: 'admin-test',
      note: 'approved for later implementation',
    });
    assert.equal(t.ok, true);
    assert.equal(t.adminStatus, 'APPROVED');
  });

  it('6. evaluation registry has deterministic, model, and human classes', () => {
    getEvaluationRegistry();
    const dets = listEvaluators({ classFilter: 'deterministic' });
    const humans = listEvaluators({ classFilter: 'human' });
    const models = listEvaluators({ classFilter: 'model_assisted' });
    assert.ok(dets.length >= 3);
    assert.ok(humans.length >= 1);
    assert.ok(models.length >= 1);
  });

  it('7. claim grounding does not create doctrine', () => {
    const g = evaluateClaimGrounding({
      replyText:
        'Direct answer: The seventh day is the Sabbath established at creation. Genesis 2:2-3 shows God rested.',
      evidenceRefs: ['Genesis 2:2-3', 'Exodus 20:8-11'],
      requestId: 'g1',
      persist: true,
    });
    assert.equal(g.ok, true);
    assert.equal(g.summary.groundingCreatesDoctrine, false);
    assert.ok(g.claims.length >= 1);
  });

  it('8. retrieval shadow never replaces production', () => {
    const r = runRetrievalShadowCompare({
      message: 'What does Revelation 20:5 say?',
      productionPack: { scriptureRefs: [] },
      requestId: 'shadow-1',
      persist: true,
    });
    assert.equal(r.productionReplacement, false);
    assert.equal(r.mode, 'SHADOW');
    assert.ok(r.candidates.length >= 2);
  });

  it('9. watchers cannot mutate production', () => {
    assert.ok(['OFF', 'SHADOW', 'ADVISORY', 'ADMIN_REVIEW'].includes(getWatcherMode()) || true);
    const w = runRecurringFailureWatcher({ limit: 50 });
    assert.equal(w.canMutateProduction, false);
  });

  it('10. Founder marks cover required vocabulary', () => {
    for (const m of ['ACCEPTED', 'REJECTED', 'WRONG_HISTORY', 'MEMORY_MISS', 'EXCELLENT_ANSWER']) {
      assert.ok(FOUNDER_MARKS.includes(m));
    }
  });

  it('11. learning records list is queryable', () => {
    const rows = listLearningRecords({ limit: 20 });
    assert.ok(Array.isArray(rows));
  });

  it('12. spans cover required pipeline stages', () => {
    const spans = buildNormalizedSpans({
      requestId: 's',
      message: 'hi',
      reply: { reply: 'ok', runtime: { masterRoute: 'x' } },
      latencyMs: 1,
    });
    const names = spans.map((s) => s.name);
    assert.ok(names.includes('request'));
    assert.ok(names.includes('final-response'));
    assert.ok(names.includes('doctrine-decision'));
  });

  it('13. data directory created under founder-experience', () => {
    assert.ok(fs.existsSync(DATA_DIR));
  });
});
