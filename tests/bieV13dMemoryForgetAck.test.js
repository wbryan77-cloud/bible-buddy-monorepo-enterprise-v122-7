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

  it('1c. companion personal forget confirms durable clears before acknowledgment', async () => {
    const {
      maybeCapturePin,
      getPins,
      tryAnswerPinRecall,
      dualWriteUserPinsNow,
    } = require('../services/explicitRememberPin');
    const durableMemory = require('../services/durableUserMemory');
    const durablePins = require('../services/founderExperienceDurableStore');
    const { runBuddy } = require('../services/buddyBrain');
    const userId = `prealpha-pin-forget-live-${Date.now()}`;

    durableMemory.resetDurableBackendForTests();
    await durableMemory.ensureHydrated(userId);
    durableMemory.upsertMemory({
      userId,
      memoryType: durableMemory.MEMORY_TYPES.IMPORTANT_PERSON,
      subject: 'test-person',
      content: 'bounded durable forget regression fixture',
    });
    await durableMemory.flushUser(userId);

    maybeCapturePin(userId, 'Remember that my favorite verse is John 11:35.');
    assert.ok(getPins(userId).length >= 1);
    await dualWriteUserPinsNow(userId, getPins(userId));

    const out = await runBuddy({
      userId,
      mode: 'companion',
      personaKey: 'pastor',
      message: 'Please forget what I told you.',
    });
    const nested = out && out.reply && typeof out.reply === 'object' ? out.reply : out;
    assert.equal(nested?.runtime?.masterRoute, 'companion_personal_forget');
    assert.equal(nested?.runtime?.durableForgetConfirmed, true);
    assert.equal(getPins(userId).length, 0);

    durableMemory.resetDurableBackendForTests();
    await durableMemory.ensureHydrated(userId);
    assert.equal(durableMemory.listActive(userId).length, 0);

    const pinStore = await durablePins.readItems(durablePins.DOC.explicitRememberPins);
    const durablePinRecord = (pinStore.items || []).find((item) => item?.userId === userId);
    assert.deepEqual(durablePinRecord?.pins || [], []);

    const miss = tryAnswerPinRecall(userId, 'What is my favorite verse?');
    assert.equal(miss.runtime.masterRoute, 'explicit_remember_pin_honest_miss');
  });


  it('1d. all-scope forget clears doctrine + attributable reflection state and hides global learning queue', () => {
    const {
      recordReflection,
      getReflectionState,
      recordConceptLearningCandidate,
    } = require('../services/reflectionMemoryEngine');
    const {
      updateDoctrineConversationState,
      getDoctrineConversationState,
    } = require('../services/doctrineConversationState');
    const {
      forgetMemory,
      getMemorySnapshot,
      buildMemoryDisclosureReply,
    } = require('../services/companionMemoryManager');

    const userId = `prealpha-memory-lifecycle-${Date.now()}`;
    recordReflection(userId, {
      type: 'companion_preference',
      label: 'private_context',
      userMessage: 'bounded test memory',
      sessionOnly: false,
    });
    recordConceptLearningCandidate({
      phrase: 'bounded learning-review candidate',
      proposedConcept: 'test_only',
      correction: 'test only',
      source: 'test',
      userId,
    });
    updateDoctrineConversationState(userId, {
      lastAnsweredConcept: 'sabbath',
      sessionMemory: { activeConcept: 'sabbath' },
    });

    const before = getMemorySnapshot({ userId });
    assert.deepEqual(before.learningCandidates, []);

    const result = forgetMemory({ userId, scope: 'all' });
    assert.equal(result.cleared, true);
    assert.equal(getReflectionState(userId).records.length, 0);
    assert.equal(getDoctrineConversationState(userId).lastAnsweredConcept, null);

    const disclosure = buildMemoryDisclosureReply({ userId });
    assert.match(disclosure, /forget stored companion memory/i);
    assert.doesNotMatch(disclosure, /remember.*forever|store.*forever/i);
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
