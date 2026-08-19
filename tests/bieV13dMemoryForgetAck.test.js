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

  it('1b. forgetMemory(scope=all) clears explicit remember pins', () => {
    const { maybeCapturePin, getPins } = require('../services/explicitRememberPin');
    const { forgetMemory } = require('../services/companionMemoryManager');
    const userId = `prealpha-pin-forget-${Date.now()}`;
    maybeCapturePin(userId, 'Remember that my favorite book of the Bible is Romans.');
    assert.ok(getPins(userId).length >= 1);
    const result = forgetMemory({ userId, scope: 'all' });
    assert.equal(result.cleared, true);
    assert.equal(getPins(userId).length, 0);
  });

  it('1c. companion personal forget path clears explicit remember pins', async () => {
    const { maybeCapturePin, getPins, tryAnswerPinRecall } = require('../services/explicitRememberPin');
    const { runBuddy } = require('../services/buddyBrain');
    const userId = `prealpha-pin-forget-live-${Date.now()}`;
    maybeCapturePin(userId, 'Remember that my favorite verse is John 11:35.');
    assert.ok(getPins(userId).length >= 1);
    const out = await runBuddy({
      userId,
      mode: 'companion',
      personaKey: 'pastor',
      message: 'Please forget what I told you.',
    });
    const nested = out && out.reply && typeof out.reply === 'object' ? out.reply : out;
    assert.equal(nested?.runtime?.masterRoute, 'companion_personal_forget');
    assert.equal(getPins(userId).length, 0);
    const miss = tryAnswerPinRecall(userId, 'What is my favorite verse?');
    assert.equal(miss.runtime.masterRoute, 'explicit_remember_pin_honest_miss');
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
