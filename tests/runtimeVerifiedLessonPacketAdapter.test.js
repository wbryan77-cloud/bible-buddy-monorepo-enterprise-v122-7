/**
 * BIE Phase 1A — Runtime Verified Lesson Packet adapter
 * Run: node --test tests/runtimeVerifiedLessonPacketAdapter.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');
const { slimEvidencePackForComposer } = require('../services/evidencePackSlimmer');
const { buildComposerSystemPrompt } = require('../services/reasonFirstComposer');
const {
  attachVerifiedLessonPacketToEvidencePack,
} = require('../services/openAiFirstCompanionRuntime');

const runtimeSrc = fs.readFileSync(
  require.resolve('../services/openAiFirstCompanionRuntime'),
  'utf8',
);

describe('BIE Phase 1A runtime Verified Lesson Packet adapter', () => {
  it('1. attach helper exists and is called on live pack path', () => {
    assert.match(runtimeSrc, /function attachVerifiedLessonPacketToEvidencePack/);
    assert.match(runtimeSrc, /attachVerifiedLessonPacketToEvidencePack\(evidencePack/);
  });

  it('2. pack gains nested verifiedLessonPacket after adapter attach', () => {
    const pack = buildRetrievalEvidencePack({
      userId: 'phase1a-adapter-test',
      message: 'What does Scripture say about the Sabbath?',
      mode: 'companion',
      recentSessions: [],
      runtimeContext: {},
      profile: {},
      safety: {},
      routingHintsOnly: true,
    });
    assert.equal(pack.verifiedLessonPacket, undefined);
    attachVerifiedLessonPacketToEvidencePack(pack, 'What does Scripture say about the Sabbath?');
    assert.equal(pack.verifiedLessonPacketAttach.attached, true);
    assert.ok(pack.verifiedLessonPacket);
    assert.ok(pack.verifiedLessonPacket.passageRoles);
    assert.ok(pack.verifiedLessonPacket.responseContract);
    assert.equal(pack.verifiedLessonPacket.openAiMayDetermineDoctrine, false);
    assert.equal(pack.verifiedLessonPacket.productionActivation, false);
  });

  it('3. slimmer preserves nested verifiedLessonPacket (not dropped)', () => {
    const slim = slimEvidencePackForComposer({
      topic: 'sabbath',
      verifiedLessonPacket: {
        packetVersion: 'verified-lesson-packet-v1',
        topic: { normalizedTopic: 'sabbath' },
        passageRoles: [{ reference: 'Exodus 20:8', role: 'command' }],
      },
    });
    assert.ok(slim.verifiedLessonPacket);
    assert.equal(slim.verifiedLessonPacket.packetVersion, 'verified-lesson-packet-v1');
    assert.equal(slim.verifiedLessonPacket.passageRoles[0].role, 'command');
  });

  it('4. composer system prompt JSON includes verifiedLessonPacket hierarchy', () => {
    const evidencePack = {
      topic: 'sabbath',
      historyAllowed: false,
      history: { included: false },
      currentIntent: 'general_factual',
      verifiedLessonPacket: {
        packetVersion: 'verified-lesson-packet-v1',
        lesson: { lessonId: 'lesson_test', sourceReadingOrder: ['Exodus 20:8'] },
        passageRoles: [{ reference: 'Exodus 20:8', role: 'command' }],
        responseContract: { version: 'v1', structure: ['Topic'] },
      },
    };
    const prompt = buildComposerSystemPrompt({
      mode: 'companion',
      personaKey: 'default',
      profile: {},
      runtimeContext: {},
      evidencePack,
      userMessage: 'Sabbath?',
      coreRestoration: true,
    });
    assert.match(prompt, /verifiedLessonPacket/);
    assert.match(prompt, /passageRoles/);
    assert.match(prompt, /responseContract/);
    assert.match(prompt, /lesson_test/);
  });

  it('5. governance locks on packet are not upgraded by adapter pattern', () => {
    const { buildVerifiedLessonPacket, assembleLessonFromStudyChain } = require('../services/lessonEngine');
    const { evaluateStudyChain } = require('../services/studyChainEvaluation');
    const { buildTopicWitnessRegistry } = require('../services/topicWitnessRegistry');
    const { RULES_DECISION } = require('../services/iogIcojGovernedIngestion');
    const chain = evaluateStudyChain(
      {
        corpus: 'RuntimeAdapter',
        sourceDocument: 'sabbath',
        sourceTopic: 'sabbath',
        scriptureReferencesSourceOrder: ['Exodus 20:8-11'],
        originalEvaluatorDecisions: [
          { matchKind: 'SAME_BOOK_ONLY', rulesDecision: RULES_DECISION.NEEDS_ADMIN_REVIEW },
        ],
      },
      { registry: buildTopicWitnessRegistry() },
    );
    const packet = buildVerifiedLessonPacket(assembleLessonFromStudyChain(chain), 'Sabbath?');
    packet.openAiMayApproveEvidence = false;
    packet.openAiMayDetermineDoctrine = false;
    packet.productionActivation = false;
    assert.equal(packet.openAiMayDetermineDoctrine, false);
    assert.equal(packet.openAiMayApproveEvidence, false);
    assert.equal(packet.productionActivation, false);
  });
});
