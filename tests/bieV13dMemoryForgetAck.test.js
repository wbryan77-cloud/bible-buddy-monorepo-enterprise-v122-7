/**
 * BIE v1.3D — forget acknowledgment must state forget/memory clearly
 * Run: node --test tests/bieV13dMemoryForgetAck.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  isForgetRequest,
  companionRememberAck,
} = require('../services/relationshipContextSelector');
const { detectHumanNeed } = require('../services/humanNeedDetector');
const { findHintedReference, detectSatanReleaseQuestion } = require('../services/groundedScriptureEngine');
const { planCompanionDoctrineRouting } = require('../services/companionDoctrineRouter');

describe('BIE v1.3D memory forget + satan frees routing', () => {
  it('1. forget request is detected and ack names forget/memory', () => {
    const msg = 'Can you forget what I told you?';
    assert.equal(isForgetRequest(msg), true);
    assert.equal(detectHumanNeed(msg), 'memory_update');
    const ack = companionRememberAck(msg);
    assert.match(ack, /forget|memory/i);
  });

  it('2. frees-Satan wording routes to grounded Rev 20 path', () => {
    const msg =
      'After the millennium ends, does Revelation name who frees Satan? Yes or no.';
    assert.equal(findHintedReference(msg), 'Revelation 20:7-10');
    assert.equal(detectSatanReleaseQuestion(msg), 'explicit_agent_named');
    const plan = planCompanionDoctrineRouting({ userId: 'v13d-frees', message: msg });
    assert.notEqual(plan.intent, 'user_correction');
    assert.ok(
      plan.lane === 'bible_wide' || plan.intent === 'explicit_scripture_reference',
      JSON.stringify(plan),
    );
  });
});
