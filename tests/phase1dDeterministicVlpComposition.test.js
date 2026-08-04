/**
 * BIE Phase 1D — Deterministic doctrine VLP composition
 * Run: node --test tests/phase1dDeterministicVlpComposition.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildFinalAuthorityAnswer,
  buildFinalAuthorityStructured,
  composeDeterministicDoctrineReply,
  buildDoctrineDecisionContract,
} = require('../services/doctrineFinalAuthorityEngine');
const { BASE_CONTRACTS } = require('../services/doctrineAuthorityContract');

function mockPacket(topic = 'sabbath') {
  const witnesses = (BASE_CONTRACTS[topic]?.approvedWitnesses || []).slice(0, 3);
  return {
    schemaVersion: 'verified-lesson-packet-v1',
    passageRoles: witnesses.map((reference, i) => ({
      reference,
      role: i === 0 ? 'primary' : 'supporting',
    })),
    scriptureBlocks: witnesses.slice(0, 2).map((reference) => ({
      reference,
      text: `Sample text for ${reference}`,
    })),
    prohibitedOverstatements: ['Do not claim certainty beyond witnesses'],
  };
}

describe('BIE Phase 1D deterministic VLP composition', () => {
  it('1. decision contract keeps conclusion and witnesses; does not own fixed stamp', () => {
    const authority = buildFinalAuthorityAnswer({
      topic: 'sabbath',
      contract: BASE_CONTRACTS.sabbath,
      message: 'Explain the Sabbath.',
    });
    const decision = buildDoctrineDecisionContract(authority, { verifiedLessonPacket: mockPacket() }, 'Explain the Sabbath.');
    assert.ok(decision.doctrinalConclusion);
    assert.ok((decision.requiredWitnesses || []).length >= 1);
    assert.equal(decision.governanceLocks.noDoctrineReasoning, true);
    assert.equal(decision.governanceLocks.openAiMayDetermineDoctrine, false);
  });

  it('2. with VLP, reply is not the fixed approved-witnesses stamp', () => {
    const authority = buildFinalAuthorityAnswer({
      topic: 'sabbath',
      contract: BASE_CONTRACTS.sabbath,
      message: 'Explain the Sabbath.',
    });
    const composed = composeDeterministicDoctrineReply({
      authority,
      evidencePack: { verifiedLessonPacket: mockPacket('sabbath') },
      message: 'Explain the Sabbath.',
    });
    assert.ok(composed.reply);
    assert.ok(!/^From the approved Scripture witnesses/i.test(composed.reply));
    assert.ok(composed.reply.includes(authority.finalConclusion.slice(0, 40)));
    assert.equal(composed.doctrineDecision.composedFromVerifiedLessonPacket, true);
  });

  it('3. brief follow-up shortens without changing conclusion', () => {
    const authority = buildFinalAuthorityAnswer({
      topic: 'resurrection',
      contract: BASE_CONTRACTS.resurrection,
      message: 'Explain it briefly.',
    });
    const composed = composeDeterministicDoctrineReply({
      authority,
      evidencePack: { verifiedLessonPacket: mockPacket('resurrection') },
      message: 'Explain it briefly.',
    });
    assert.equal(composed.doctrineDecision.responseRequirements.shortAnswer, true);
    assert.ok(composed.reply.includes(authority.finalConclusion.slice(0, 40)));
    assert.ok(composed.reply.length < (authority.seedReply || authority.reply).length + 40);
  });

  it('4. follow-up focus acknowledges current question', () => {
    const authority = buildFinalAuthorityAnswer({
      topic: 'resurrection',
      contract: BASE_CONTRACTS.resurrection,
      message: 'I asked what they do, not merely when they rise.',
    });
    const composed = composeDeterministicDoctrineReply({
      authority,
      evidencePack: { verifiedLessonPacket: mockPacket('resurrection') },
      message: 'I asked what they do, not merely when they rise.',
    });
    assert.match(composed.reply, /follow-up/i);
    assert.ok(composed.reply.includes(authority.finalConclusion.slice(0, 40)));
  });

  it('5. structured path exposes doctrineDecision and keeps finalConclusion', () => {
    const authority = buildFinalAuthorityAnswer({
      topic: 'sabbath',
      contract: BASE_CONTRACTS.sabbath,
      message: 'Explain the Sabbath.',
    });
    const structured = buildFinalAuthorityStructured(authority, { intent: 'study' }, { level: 'standard' }, {
      evidencePack: { verifiedLessonPacket: mockPacket('sabbath') },
      message: 'Explain the Sabbath.',
    });
    assert.equal(structured.finalConclusion, authority.finalConclusion);
    assert.equal(structured.doctrineComposedFromPacket, true);
    assert.ok(structured.doctrineDecision);
    assert.ok(!/^From the approved Scripture witnesses/i.test(structured.reply));
    assert.equal(structured.runtime.noDoctrineReasoning, true);
  });

  it('6. without packet, seed template remains available (compat)', () => {
    const authority = buildFinalAuthorityAnswer({
      topic: 'sabbath',
      contract: BASE_CONTRACTS.sabbath,
      message: 'Explain the Sabbath.',
    });
    const composed = composeDeterministicDoctrineReply({
      authority,
      evidencePack: {},
      message: 'Explain the Sabbath.',
    });
    assert.equal(composed.doctrineDecision.composedFromVerifiedLessonPacket, false);
    assert.match(composed.reply, /approved Scripture witnesses|Sabbath|seventh/i);
  });

  it('7. forbidden governance locks remain on decision', () => {
    const authority = buildFinalAuthorityAnswer({
      topic: 'acts_10',
      contract: BASE_CONTRACTS.acts_10,
      message: 'What is Acts 10 about?',
    });
    const structured = buildFinalAuthorityStructured(authority, {}, {}, {
      evidencePack: { verifiedLessonPacket: mockPacket('acts_10') },
      message: 'What is Acts 10 about?',
    });
    assert.equal(structured.doctrineDecision.governanceLocks.openAiMayDetermineDoctrine, false);
    assert.ok(structured.reply.toLowerCase().includes('people') || structured.reply.toLowerCase().includes('gentile'));
  });
});
