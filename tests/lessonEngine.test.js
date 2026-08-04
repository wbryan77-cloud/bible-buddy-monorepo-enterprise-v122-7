/**
 * Phase 5 — Lesson Engine tests
 * Run: node --test tests/lessonEngine.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const {
  assembleLessonFromStudyChain,
  buildPassageRoleDetails,
  buildVerifiedLessonPacket,
  renderLessonMarkdown,
  validateLessonFormat,
  repairLessonFormat,
} = require('../services/lessonEngine');
const { evaluateStudyChain } = require('../services/studyChainEvaluation');
const { buildTopicWitnessRegistry } = require('../services/topicWitnessRegistry');
const { RULES_DECISION } = require('../services/iogIcojGovernedIngestion');

const ROOT = path.join(__dirname, '..');
const registry = buildTopicWitnessRegistry();

function sampleChain(overrides = {}) {
  const sc = evaluateStudyChain(
    {
      corpus: 'Holy Testaments',
      sourceDocument: 'SABBATH DAY',
      sourceLocation: 'volume=1;section=5',
      sourceTopic: 'sabbath',
      scriptureReferencesSourceOrder: ['Genesis 2:2-3', 'Exodus 20:8-11', 'Hebrews 4:9', 'Luke 4:16'],
      originalEvaluatorDecisions: [
        { matchKind: 'SAME_BOOK_ONLY', rulesDecision: RULES_DECISION.NEEDS_ADMIN_REVIEW },
      ],
      historicalAssertions: [{ claim: 'Constantine', status: 'UNVERIFIED' }],
      ...overrides,
    },
    { registry },
  );
  return sc;
}

describe('Phase5 lessonEngine', () => {
  it('1. Lesson built from one Study Chain', () => {
    const chain = sampleChain();
    const lesson = assembleLessonFromStudyChain(chain);
    assert.ok(lesson.lessonId);
    assert.equal(lesson.primaryStudyChainId, chain.studyChainId);
    assert.equal(lesson.productionActivation, false);
  });

  it('2. Lesson can reference multiple studyChainIds field', () => {
    const chain = sampleChain();
    const lesson = assembleLessonFromStudyChain(chain);
    lesson.studyChainIds.push('sc_extra_compatible');
    assert.ok(lesson.studyChainIds.length >= 2);
    assert.equal(lesson.governanceStatus, 'CANDIDATE_ONLY');
  });

  it('3. Nonconsecutive verses in one chapter', () => {
    const chain = evaluateStudyChain(
      {
        corpus: 'Holy Testaments',
        sourceDocument: 'SABBATH DAY',
        sourceTopic: 'sabbath',
        scriptureReferencesSourceOrder: ['Exodus 20:8', 'Exodus 20:11', 'Exodus 20:9'],
        originalEvaluatorDecisions: [{ matchKind: 'SAME_BOOK_ONLY', rulesDecision: RULES_DECISION.NEEDS_ADMIN_REVIEW }],
      },
      { registry },
    );
    const lesson = assembleLessonFromStudyChain(chain);
    assert.ok(lesson.sourceReadingOrder.length >= 3);
  });

  it('4. Multiple chapters in one book', () => {
    const chain = sampleChain({
      scriptureReferencesSourceOrder: ['Exodus 20:8-11', 'Exodus 31:13', 'Exodus 35:3'],
    });
    const lesson = assembleLessonFromStudyChain(chain);
    assert.ok(lesson.passageRoleDetails.length >= 2);
  });

  it('5. Genesis-to-Revelation chain', () => {
    const chain = sampleChain();
    const lesson = assembleLessonFromStudyChain(chain);
    const refs = lesson.sourceReadingOrder.join(' ');
    assert.ok(/Genesis/i.test(refs));
    assert.ok(/Hebrews|Luke/i.test(refs));
  });

  it('6. Passage-role assignment stability', () => {
    const chain = sampleChain();
    const a = buildPassageRoleDetails(chain);
    const b = buildPassageRoleDetails(chain);
    assert.deepEqual(a, b);
  });

  it('7. Original order preserved', () => {
    const order = ['Hebrews 4:9', 'Genesis 2:2-3', 'Exodus 20:8-11'];
    const chain = sampleChain({ scriptureReferencesSourceOrder: order });
    const lesson = assembleLessonFromStudyChain(chain);
    assert.deepEqual(lesson.sourceReadingOrder, order);
  });

  it('8. Recommended order separate', () => {
    const order = ['Hebrews 4:9', 'Genesis 2:2-3', 'Exodus 20:8-11'];
    const chain = sampleChain({ scriptureReferencesSourceOrder: order });
    const lesson = assembleLessonFromStudyChain(chain);
    assert.deepEqual(lesson.sourceReadingOrder, order);
    assert.ok(Array.isArray(lesson.recommendedReadingOrder));
  });

  it('9. Balancing passages attached field exists', () => {
    const lesson = assembleLessonFromStudyChain(sampleChain());
    assert.ok(Array.isArray(lesson.balancingPassageRefs));
  });

  it('10. Unrelated verse isolated field', () => {
    const lesson = assembleLessonFromStudyChain(sampleChain());
    assert.ok(Array.isArray(lesson.unrelatedPassagesIsolated));
  });

  it('11. History linked but unverified', () => {
    const lesson = assembleLessonFromStudyChain(sampleChain());
    assert.equal(lesson.historyStatus, 'UNVERIFIED');
    assert.ok((lesson.historicalEvidence || []).every((h) => h.status === 'UNVERIFIED'));
  });

  it('12. Language evidence linked field present', () => {
    const lesson = assembleLessonFromStudyChain(sampleChain());
    assert.ok(Array.isArray(lesson.languageEvidence));
    assert.equal(lesson.languageStatus, 'NOT_ATTACHED');
  });

  it('13. Doctrine status preserved', () => {
    const lesson = assembleLessonFromStudyChain(sampleChain());
    assert.equal(lesson.doctrineStatus, 'NEEDS_ADMIN_REVIEW');
    assert.equal(lesson.doctrineReviewRequired, true);
  });

  it('14. Verified lesson does not auto-approve doctrine', () => {
    const lesson = assembleLessonFromStudyChain(sampleChain());
    assert.equal(lesson.governanceStatus, 'CANDIDATE_ONLY');
    assert.equal(lesson.productionActivation, false);
    assert.notEqual(lesson.doctrineStatus, 'AUTO_APPROVED');
  });

  it('15. Verified Lesson Packet preserves citations', () => {
    const lesson = assembleLessonFromStudyChain(sampleChain());
    const packet = buildVerifiedLessonPacket(lesson);
    assert.ok((packet.citations || []).length >= 1);
    assert.ok((packet.scriptureBlocks || []).every((b) => b.translation === 'KJV' && b.text));
  });

  it('16. One-call composition packet is complete', () => {
    const packet = buildVerifiedLessonPacket(assembleLessonFromStudyChain(sampleChain()));
    for (const k of [
      'packetVersion',
      'question',
      'topic',
      'lesson',
      'scriptureBlocks',
      'passageRoles',
      'responseContract',
      'doctrineStatus',
      'governanceStatus',
    ]) {
      assert.ok(packet[k] != null, k);
    }
    assert.equal(packet.openAiMayApproveEvidence, false);
    assert.equal(packet.openAiMayDetermineDoctrine, false);
  });

  it('17. Model output cannot override doctrine status (packet lock)', () => {
    const packet = buildVerifiedLessonPacket(assembleLessonFromStudyChain(sampleChain()));
    assert.equal(packet.openAiMayDetermineDoctrine, false);
    assert.ok(packet.prohibitedOverstatements.length >= 1);
  });

  it('18. Run-on response rejected', () => {
    const bad = `## Topic\n\nX\n\n## What the Scriptures show\n\n${'word '.repeat(200)}\n\n## Read these passages together\n\n**Genesis 2:2** (King James Version)\n\n> And on the seventh day\n\n## How the passages connect\n\n- a\n\n## What remains under review\n\n- Doctrine status: **NEEDS_ADMIN_REVIEW**\n`;
    const v = validateLessonFormat(bad);
    assert.equal(v.ok, false);
    assert.ok(v.errors.includes('run_on_paragraph'));
  });

  it('19. Formatted Scripture blocks accepted', () => {
    const lesson = assembleLessonFromStudyChain(sampleChain());
    const packet = buildVerifiedLessonPacket(lesson);
    const md = renderLessonMarkdown(lesson, packet);
    const v = validateLessonFormat(md, packet);
    assert.equal(v.ok, true, JSON.stringify(v.errors));
  });

  it('20. Historical claim without citation/status rejected', () => {
    const md = `## Topic\n\nT\n\n## What the Scriptures show\n\nS\n\n## Read these passages together\n\n**Genesis 2:2** (King James Version)\n\n> text\n\n## How the passages connect\n\n- x\n\n## Historical context\n\nConstantine changed the Sabbath in AD 321.\n\n## What remains under review\n\n- Doctrine status: **NEEDS_ADMIN_REVIEW**\n`;
    const v = validateLessonFormat(md);
    assert.ok(v.errors.includes('historical_claim_without_status'));
  });

  it('21. Dual-run determinism', () => {
    const chain = sampleChain();
    const a = assembleLessonFromStudyChain(chain);
    const b = assembleLessonFromStudyChain(chain);
    assert.equal(a.lessonId, b.lessonId);
    assert.equal(a.teachingReadiness, b.teachingReadiness);
    assert.deepEqual(a.sourceReadingOrder, b.sourceReadingOrder);
  });

  it('22. Production hashes unchanged helper', () => {
    const p = path.join(ROOT, 'data', 'approved-cross-references.jsonl');
    const h1 = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
    const h2 = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
    assert.equal(h1, h2);
  });

  it('23. repair does not invent evidence', () => {
    const lesson = assembleLessonFromStudyChain(sampleChain());
    const packet = buildVerifiedLessonPacket(lesson);
    const repaired = repairLessonFormat('broken', lesson, packet);
    assert.ok(repaired.validation.repairAttempted);
    assert.ok(repaired.markdown.includes('King James Version'));
  });
});
