/**
 * BIE Phase 1C — Governed knowledge activation
 * Run: node --test tests/phase1cKnowledgeActivation.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { classifyCurrentMessageIntent } = require('../services/currentMessageIntent');
const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');
const { isOriginalLanguageRequest } = require('../services/originalLanguageResponseFormatter');
const { attachVerifiedLessonPacketToEvidencePack } = require('../services/openAiFirstCompanionRuntime');
const { slimEvidencePackForComposer } = require('../services/evidencePackSlimmer');
const { RULES_DECISION } = require('../services/iogIcojGovernedIngestion');

describe('BIE Phase 1C knowledge activation', () => {
  it('1. Sunday celebration classifies as history and includes Sunday chain', () => {
    const q = 'Why do Christians celebrate Sunday?';
    const intent = classifyCurrentMessageIntent(q);
    assert.equal(intent.intent, 'history_question');
    const pack = buildRetrievalEvidencePack({
      userId: 'phase1c',
      message: q,
      mode: 'companion',
      recentSessions: [],
      runtimeContext: {},
      profile: {},
      safety: {},
      routingHintsOnly: true,
    });
    assert.equal(pack.history.included, true);
    assert.ok((pack.history.chainSteps || []).length > 0);
  });

  it('2. Ordinary historical ask opens history without doctrine fall-through', () => {
    const q = 'What was the transatlantic slave trade?';
    assert.equal(classifyCurrentMessageIntent(q).intent, 'history_question');
    const pack = buildRetrievalEvidencePack({
      userId: 'phase1c',
      message: q,
      mode: 'companion',
      recentSessions: [],
      runtimeContext: {},
      profile: {},
      safety: {},
      routingHintsOnly: true,
    });
    assert.equal(pack.history.included, true);
    assert.equal(pack.history.phase5dBooksActivated, false);
  });

  it('3. Jerusalem under Rome attaches productionEligible governed records', () => {
    const q = 'What happened to Jerusalem under Rome?';
    const pack = buildRetrievalEvidencePack({
      userId: 'phase1c',
      message: q,
      mode: 'companion',
      recentSessions: [],
      runtimeContext: {},
      profile: {},
      safety: {},
      routingHintsOnly: true,
    });
    assert.equal(pack.history.included, true);
    assert.ok(pack.history.governedRecordCount >= 1);
    for (const r of pack.history.governedRecords) {
      assert.equal(r.productionEligible, true);
      assert.match(r.authorityNote || '', /does not establish doctrine/i);
    }
  });

  it('4. Doctrine Sabbath ask stays non-historical; IOG xrefs still available', () => {
    const q = 'Explain the Sabbath.';
    assert.equal(classifyCurrentMessageIntent(q).intent, 'doctrine_explanation');
    const pack = buildRetrievalEvidencePack({
      userId: 'phase1c',
      message: q,
      mode: 'companion',
      recentSessions: [],
      runtimeContext: {},
      profile: {},
      safety: {},
      routingHintsOnly: true,
    });
    assert.equal(pack.history.included, false);
    assert.ok(pack.approvedCrossReferences.count > 0);
  });

  it('5. Original-language ask attaches bounded languageEvidence on packet', async () => {
    const q = 'What Hebrew word is translated forever in Leviticus 23?';
    assert.equal(isOriginalLanguageRequest(q), true);
    const pack = buildRetrievalEvidencePack({
      userId: 'phase1c',
      message: q,
      mode: 'companion',
      recentSessions: [],
      runtimeContext: {},
      profile: {},
      safety: {},
      routingHintsOnly: true,
    });
    await attachVerifiedLessonPacketToEvidencePack(pack, q);
    assert.ok(pack.verifiedLessonPacket);
    assert.ok((pack.languageEvidence || []).length >= 1);
    assert.equal(pack.verifiedLessonPacket.languageStatus, 'ATTACHED_BOUNDED');
    const slim = slimEvidencePackForComposer(pack);
    assert.ok(slim.languageEvidence || slim.verifiedLessonPacket?.languageEvidence);
  });

  it('6. Governance enums unchanged; NEEDS_ADMIN_REVIEW still present', () => {
    assert.equal(RULES_DECISION.NEEDS_ADMIN_REVIEW, 'NEEDS_ADMIN_REVIEW');
    assert.ok(RULES_DECISION.AUTO_APPROVED);
  });
});
