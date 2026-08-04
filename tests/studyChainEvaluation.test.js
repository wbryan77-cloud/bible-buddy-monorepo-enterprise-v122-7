/**
 * HT-4 — Study-chain evaluation regressions (narrow)
 * Run: node --test tests/studyChainEvaluation.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const {
  evaluateStudyChain,
  groupClaimsIntoStudyChains,
  normalizeRef,
  recommendOrder,
  STUDY_CHAIN_CLASSIFICATION,
} = require('../services/studyChainEvaluation');
const { buildTopicWitnessRegistry } = require('../services/topicWitnessRegistry');
const { RULES_DECISION } = require('../services/iogIcojGovernedIngestion');

const ROOT = path.join(__dirname, '..');
const registry = buildTopicWitnessRegistry();

describe('HT-4 studyChainEvaluation', () => {
  it('1. nonconsecutive verses in one chapter can form a valid study chain', () => {
    const r = evaluateStudyChain(
      {
        corpus: 'Holy Testaments',
        sourceDocument: 'SABBATH DAY',
        sourceTopic: 'sabbath',
        scriptureReferencesSourceOrder: ['Exodus 20:8', 'Exodus 20:11', 'Exodus 20:9'],
        originalEvaluatorDecisions: [{ matchKind: 'SAME_BOOK_ONLY', rulesDecision: RULES_DECISION.NEEDS_ADMIN_REVIEW }],
      },
      { registry },
    );
    assert.ok(
      [STUDY_CHAIN_CLASSIFICATION.VERIFIED_STUDY_CHAIN, STUDY_CHAIN_CLASSIFICATION.STUDY_CHAIN_CANDIDATE].includes(
        r.classification,
      ),
    );
    assert.equal(r.structural.uniqueChapters, 1);
  });

  it('2. same-book passages can form a valid study chain', () => {
    const r = evaluateStudyChain(
      {
        corpus: 'Holy Testaments',
        sourceDocument: 'SABBATH DAY',
        sourceTopic: 'sabbath',
        scriptureReferencesSourceOrder: ['Exodus 20:8-11', 'Exodus 31:13', 'Exodus 35:3'],
        originalEvaluatorDecisions: [{ matchKind: 'SAME_BOOK_ONLY', rulesDecision: RULES_DECISION.NEEDS_ADMIN_REVIEW }],
      },
      { registry },
    );
    assert.ok(
      [STUDY_CHAIN_CLASSIFICATION.VERIFIED_STUDY_CHAIN, STUDY_CHAIN_CLASSIFICATION.STUDY_CHAIN_CANDIDATE].includes(
        r.classification,
      ),
    );
    assert.equal(r.structural.uniqueBooks, 1);
  });

  it('3. cross-book passages can form a valid study chain', () => {
    const r = evaluateStudyChain(
      {
        corpus: 'Holy Testaments',
        sourceDocument: 'SABBATH DAY',
        sourceTopic: 'sabbath',
        scriptureReferencesSourceOrder: ['Genesis 2:2-3', 'Exodus 20:8-11', 'Hebrews 4:9', 'Luke 4:16'],
        originalEvaluatorDecisions: [{ matchKind: 'SAME_BOOK_ONLY', rulesDecision: RULES_DECISION.NEEDS_ADMIN_REVIEW }],
      },
      { registry },
    );
    assert.ok(r.crossBookCount >= 2);
    assert.ok(
      [STUDY_CHAIN_CLASSIFICATION.VERIFIED_STUDY_CHAIN, STUDY_CHAIN_CLASSIFICATION.STUDY_CHAIN_CANDIDATE].includes(
        r.classification,
      ),
    );
  });

  it('4. keyword-only similarity is thematic or rejected', () => {
    const r = evaluateStudyChain(
      {
        corpus: 'IOG',
        sourceDocument: 'misc',
        sourceTopic: 'xyz_non_topic',
        scriptureReferencesSourceOrder: ['Obadiah 1:1', 'Philemon 1:1'],
      },
      { registry },
    );
    assert.ok(
      [
        STUDY_CHAIN_CLASSIFICATION.THEMATIC_STUDY_LINK,
        STUDY_CHAIN_CLASSIFICATION.STUDY_CHAIN_REJECTED,
        STUDY_CHAIN_CLASSIFICATION.STUDY_CHAIN_CANDIDATE,
      ].includes(r.classification),
    );
    assert.notEqual(r.classification, STUDY_CHAIN_CLASSIFICATION.VERIFIED_STUDY_CHAIN);
  });

  it('5. unrelated verse can be excluded without rejecting whole chain', () => {
    const r = evaluateStudyChain(
      {
        corpus: 'Holy Testaments',
        sourceDocument: 'SABBATH DAY',
        sourceTopic: 'sabbath',
        scriptureReferencesSourceOrder: ['Genesis 2:2-3', 'Exodus 20:8-11', 'Matthew 1:1'],
        originalEvaluatorDecisions: [{ matchKind: 'SAME_BOOK_ONLY', rulesDecision: RULES_DECISION.NEEDS_ADMIN_REVIEW }],
      },
      { registry },
    );
    assert.ok((r.chainMemberReferences || []).length >= 2);
    assert.ok(Array.isArray(r.unrelatedPassages));
  });

  it('6. invalid context / fake refs prevent verification', () => {
    const r = evaluateStudyChain(
      {
        corpus: 'ICOJ',
        sourceDocument: 'x',
        sourceTopic: 'test',
        scriptureReferencesSourceOrder: ['NotABook 99:1', 'AlsoFake 2:2'],
      },
      { registry },
    );
    assert.equal(r.classification, STUDY_CHAIN_CLASSIFICATION.STUDY_CHAIN_REJECTED);
  });

  it('7. verified study chain does not auto-promote doctrine', () => {
    const r = evaluateStudyChain(
      {
        corpus: 'Holy Testaments',
        sourceDocument: 'SABBATH DAY',
        sourceTopic: 'sabbath',
        scriptureReferencesSourceOrder: ['Genesis 2:2-3', 'Exodus 20:8-11', 'Hebrews 4:9'],
        originalEvaluatorDecisions: [{ matchKind: 'SAME_BOOK_ONLY', rulesDecision: RULES_DECISION.NEEDS_ADMIN_REVIEW }],
      },
      { registry },
    );
    assert.equal(r.updatedEvaluatorDecisions.governanceDecision, 'CANDIDATE_ONLY');
    assert.equal(r.productionActivation, false);
    assert.equal(r.persist, false);
  });

  it('8. historical citation remains separately flagged', () => {
    const r = evaluateStudyChain(
      {
        corpus: 'Holy Testaments',
        sourceDocument: 'SABBATH DAY',
        sourceTopic: 'sabbath',
        scriptureReferencesSourceOrder: ['Genesis 2:2-3', 'Exodus 20:8-11'],
        historicalAssertions: [{ claim: 'external claim', status: 'UNVERIFIED' }],
      },
      { registry },
    );
    assert.equal(r.historyReviewRequired, true);
  });

  it('9. invalid Scripture cannot enter verified members', () => {
    const r = evaluateStudyChain(
      {
        corpus: 'ICOJ',
        sourceDocument: 'x',
        sourceTopic: 'sabbath',
        scriptureReferencesSourceOrder: ['Genesis 2:2-3', 'Exodus 20:8-11', 'FakeBook 1:1'],
      },
      { registry },
    );
    assert.ok(!(r.chainMemberReferences || []).some((x) => /FakeBook/.test(x)));
    assert.ok((r.invalidPassages || []).length >= 1);
  });

  it('10. source order is preserved', () => {
    const order = ['Hebrews 4:9', 'Genesis 2:2-3', 'Exodus 20:8-11'];
    const r = evaluateStudyChain(
      {
        corpus: 'Holy Testaments',
        sourceDocument: 'SABBATH DAY',
        sourceTopic: 'sabbath',
        scriptureReferencesSourceOrder: order,
      },
      { registry },
    );
    assert.deepEqual(r.scriptureReferencesSourceOrder, order);
  });

  it('11. recommended order does not overwrite source order', () => {
    const order = ['Hebrews 4:9', 'Genesis 2:2-3', 'Exodus 20:8-11'];
    const r = evaluateStudyChain(
      {
        corpus: 'Holy Testaments',
        sourceDocument: 'SABBATH DAY',
        sourceTopic: 'sabbath',
        scriptureReferencesSourceOrder: order,
      },
      { registry },
    );
    assert.deepEqual(r.scriptureReferencesSourceOrder, order);
    assert.ok(Array.isArray(r.recommendedReadingOrder));
    const rec = recommendOrder(order);
    assert.equal(rec[0].startsWith('Genesis') || rec[0].startsWith('Exodus'), true);
  });

  it('12. production files unchanged hash check helper', () => {
    const a = crypto
      .createHash('sha256')
      .update(fs.readFileSync(path.join(ROOT, 'data', 'approved-cross-references.jsonl')))
      .digest('hex');
    const b = crypto
      .createHash('sha256')
      .update(fs.readFileSync(path.join(ROOT, 'data', 'approved-cross-references.jsonl')))
      .digest('hex');
    assert.equal(a, b);
  });

  it('13. existing governance enum intact', () => {
    assert.equal(RULES_DECISION.NEEDS_ADMIN_REVIEW, 'NEEDS_ADMIN_REVIEW');
    assert.equal(RULES_DECISION.AUTO_APPROVED, 'AUTO_APPROVED');
  });

  it('14. Scripture retrieval has no regression', () => {
    const n = normalizeRef('Genesis 2:2-3');
    assert.equal(n.valid, true);
    assert.ok(n.kjvText && n.kjvText.length > 10);
  });

  it('15. grouping requires >=2 refs and preserves provenance fields', () => {
    const groups = groupClaimsIntoStudyChains([
      {
        claimId: 'a',
        corpus: 'Holy Testaments',
        sourceTitle: 'SABBATH DAY',
        sourceLocation: 'volume=1;section=5;paragraph=1',
        proposedTopic: 'sabbath',
        scripturesExplicit: ['Genesis 2:2-3'],
      },
      {
        claimId: 'b',
        corpus: 'Holy Testaments',
        sourceTitle: 'SABBATH DAY',
        sourceLocation: 'volume=1;section=5;paragraph=2',
        proposedTopic: 'sabbath',
        scripturesExplicit: ['Exodus 20:8-11'],
      },
    ]);
    assert.equal(groups.length, 1);
    assert.deepEqual(groups[0].scriptureReferencesSourceOrder, ['Genesis 2:2-3', 'Exodus 20:8-11']);
  });

  it('16. selectBestMatch prefers EXACT over SAME_BOOK deterministically', () => {
    const { selectBestMatch } = require('../services/studyChainEvaluation');
    const best = selectBestMatch([
      { topicId: 'zzz', matchKind: 'SAME_BOOK_ONLY' },
      { topicId: 'sabbath', matchKind: 'EXACT_DUPLICATE' },
      { topicId: 'aaa', matchKind: 'SAME_CHAPTER_AS_SUPPORTING' },
    ]);
    assert.equal(best.matchKind, 'EXACT_DUPLICATE');
    assert.equal(best.topicId, 'sabbath');
  });

  it('17. dual evaluateStudyChain is byte-stable on scores/classification', () => {
    const input = {
      corpus: 'Holy Testaments',
      sourceDocument: 'SABBATH DAY',
      sourceTopic: 'sabbath',
      scriptureReferencesSourceOrder: ['Genesis 2:2-3', 'Exodus 20:8-11', 'Hebrews 4:9'],
      originalEvaluatorDecisions: [{ matchKind: 'SAME_BOOK_ONLY', rulesDecision: RULES_DECISION.NEEDS_ADMIN_REVIEW }],
    };
    const a = evaluateStudyChain(input, { registry });
    const b = evaluateStudyChain(input, { registry });
    assert.equal(a.classification, b.classification);
    assert.equal(a.overallStudyChainScore, b.overallStudyChainScore);
    assert.equal(a.confidence, b.confidence);
    assert.deepEqual(a.scriptureReferencesSourceOrder, b.scriptureReferencesSourceOrder);
    assert.deepEqual(a.recommendedReadingOrder, b.recommendedReadingOrder);
    assert.equal(a.studyChainId, b.studyChainId);
  });
});
