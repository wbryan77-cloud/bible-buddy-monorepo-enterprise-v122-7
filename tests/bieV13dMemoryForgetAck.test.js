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

  it('1e. repeated durable forget is idempotent and leaves another user untouched', async () => {
    const {
      maybeCapturePin,
      getPins,
      dualWriteUserPinsNow,
    } = require('../services/explicitRememberPin');
    const durableMemory = require('../services/durableUserMemory');
    const durablePins = require('../services/founderExperienceDurableStore');
    const { runBuddy } = require('../services/buddyBrain');
    const suffix = Date.now();
    const targetUserId = `prealpha-forget-target-${suffix}`;
    const otherUserId = `prealpha-forget-other-${suffix}`;

    durableMemory.resetDurableBackendForTests();
    for (const [userId, subject] of [
      [targetUserId, 'target-person'],
      [otherUserId, 'other-person'],
    ]) {
      await durableMemory.ensureHydrated(userId);
      durableMemory.upsertMemory({
        userId,
        memoryType: durableMemory.MEMORY_TYPES.IMPORTANT_PERSON,
        subject,
        content: `bounded cross-user fixture for ${subject}`,
      });
      await durableMemory.flushUser(userId);
      maybeCapturePin(userId, `Remember that my favorite verse is ${userId === targetUserId ? 'John 11:35' : 'Psalm 23:1'}.`);
      await dualWriteUserPinsNow(userId, getPins(userId));
    }
    await new Promise((resolve) => setImmediate(resolve));

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const out = await runBuddy({
        userId: targetUserId,
        mode: 'companion',
        personaKey: 'pastor',
        message: 'Please forget what I told you.',
      });
      const nested = out && out.reply && typeof out.reply === 'object' ? out.reply : out;
      assert.equal(nested?.runtime?.masterRoute, 'companion_personal_forget');
      assert.equal(nested?.runtime?.durableForgetConfirmed, true);
    }

    assert.equal(getPins(targetUserId).length, 0);
    assert.ok(getPins(otherUserId).length >= 1);

    durableMemory.resetDurableBackendForTests();
    await durableMemory.ensureHydrated(targetUserId);
    await durableMemory.ensureHydrated(otherUserId);
    assert.equal(durableMemory.listActive(targetUserId).length, 0);
    assert.equal(durableMemory.listActive(otherUserId).length, 1);

    const pinStore = await durablePins.readItems(durablePins.DOC.explicitRememberPins);
    const targetPins = (pinStore.items || []).find((item) => item?.userId === targetUserId);
    const otherPins = (pinStore.items || []).find((item) => item?.userId === otherUserId);
    assert.deepEqual(targetPins?.pins || [], []);
    assert.ok((otherPins?.pins || []).length >= 1);
  });

  it('1f. verified-subject export and withdrawal cover every personal-memory owner', async () => {
    const {
      exportVerifiedSubjectMemory,
      withdrawVerifiedSubjectMemory,
    } = require('../services/companionMemoryManager');
    const {
      updateDoctrineConversationState,
      getDoctrineConversationState,
    } = require('../services/doctrineConversationState');
    const {
      recordReflection,
      getReflectionState,
    } = require('../services/reflectionMemoryEngine');
    const {
      updateActiveConversation,
      getActiveConversation,
    } = require('../services/activeConversationManager');
    const {
      appendTimelineEvent,
      getLifeTimeline,
    } = require('../services/lifeTimelineMemory');
    const {
      maybeCapturePin,
      getPins,
      dualWriteUserPinsNow,
    } = require('../services/explicitRememberPin');
    const durableMemory = require('../services/durableUserMemory');

    const suffix = Date.now();
    const targetUserId = `prealpha-subject-target-${suffix}`;
    const otherUserId = `prealpha-subject-other-${suffix}`;
    const targetPrincipal = { authenticated: true, subjectId: targetUserId };

    durableMemory.resetDurableBackendForTests();
    for (const [userId, subject] of [
      [targetUserId, 'target-private-marker'],
      [otherUserId, 'other-private-marker'],
    ]) {
      updateDoctrineConversationState(userId, {
        lastAnsweredConcept: `${subject}-doctrine`,
      });
      recordReflection(userId, {
        type: 'companion_preference',
        label: `${subject}-reflection`,
        userMessage: `${subject}-reflection-value`,
        sessionOnly: false,
      });
      updateActiveConversation({
        userId,
        topic: 'prayer',
        message: `${subject}-active-conversation`,
      });
      appendTimelineEvent({
        userId,
        eventType: 'prayer',
        summary: `${subject}-timeline`,
      });
      await durableMemory.ensureHydrated(userId);
      durableMemory.upsertMemory({
        userId,
        memoryType: durableMemory.MEMORY_TYPES.IMPORTANT_PERSON,
        subject,
        content: `${subject}-durable-memory`,
      });
      await durableMemory.flushUser(userId);
      maybeCapturePin(userId, `Remember that my private marker is ${subject}.`);
      await dualWriteUserPinsNow(userId, getPins(userId));
    }

    const denied = await exportVerifiedSubjectMemory({
      userId: targetUserId,
      principal: { authenticated: true, subjectId: otherUserId },
    });
    assert.equal(denied.ok, false);
    assert.equal(denied.code, 'VERIFIED_SUBJECT_REQUIRED');
    assert.equal(denied.stores, undefined);

    const exported = await exportVerifiedSubjectMemory({
      userId: targetUserId,
      principal: targetPrincipal,
    });
    assert.equal(exported.ok, true);
    assert.equal(exported.subjectId, targetUserId);
    assert.ok(exported.stores.doctrineConversation);
    assert.ok(exported.stores.activeConversation);
    assert.equal(exported.stores.lifeTimeline.length, 1);
    assert.equal(exported.stores.reflection.records.length, 1);
    assert.equal(exported.stores.durableUserMemory.length, 1);
    assert.equal(exported.stores.explicitRememberPins.length, 1);
    assert.equal(exported.stores.reflection.globalCandidates, undefined);
    assert.equal(exported.stores.reflection.growthCandidates, undefined);
    assert.doesNotMatch(JSON.stringify(exported), new RegExp(otherUserId));

    const deniedWithdrawal = await withdrawVerifiedSubjectMemory({
      userId: targetUserId,
      principal: { authenticated: false, subjectId: targetUserId },
    });
    assert.equal(deniedWithdrawal.ok, false);
    assert.ok(getActiveConversation(targetUserId));

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const result = await withdrawVerifiedSubjectMemory({
        userId: targetUserId,
        principal: targetPrincipal,
      });
      assert.equal(result.ok, true);
      assert.equal(result.idempotent, true);
      assert.ok(Object.values(result.verifiedEmpty).every(Boolean));
    }

    assert.equal(getDoctrineConversationState(targetUserId).lastAnsweredConcept, null);
    assert.equal(getReflectionState(targetUserId).records.length, 0);
    assert.equal(getActiveConversation(targetUserId), null);
    assert.equal(getLifeTimeline(targetUserId).length, 0);
    assert.equal(durableMemory.listActive(targetUserId, { includeDeleted: true }).length, 0);
    assert.equal(getPins(targetUserId).length, 0);

    assert.equal(
      getDoctrineConversationState(otherUserId).lastAnsweredConcept,
      'other-private-marker-doctrine',
    );
    assert.equal(getReflectionState(otherUserId).records.length, 1);
    assert.ok(getActiveConversation(otherUserId));
    assert.equal(getLifeTimeline(otherUserId).length, 1);
    assert.equal(durableMemory.listActive(otherUserId, { includeDeleted: true }).length, 1);
    assert.equal(getPins(otherUserId).length, 1);
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
