const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  classifyMemoryRecallQuery,
  classifyTimestamp,
  searchMemoryRecall,
  HONEST_UNAVAILABLE,
  MEMORY_WINDOWS,
} = require('../services/memoryRecallEngine');
const { buildContinueStudyOffer, findNextInRegistryChain } = require('../services/continueStudyEngine');
const { recordCompanionLearning, buildLearningContext } = require('../services/companionLearningLayer');
const { routeHistoricalContext, isIdentityBlocked } = require('../services/historicalContextRouter');
const { buildScriptureWitnessBlock, WITNESS_LEVELS } = require('../services/scriptureWitnessEngine');
const { applyFallbackLoopGuard, persistBuddyMemory } = require('../services/buddyBrain');
const { presentCompanionDoctrine } = require('../services/companionDoctrinePresenter');
const { runDoctrineRuntimePipeline } = require('../services/doctrineRuntimePipeline');
const { saveStudySession } = require('../services/continuityStudySessionRuntime');
const { saveContinuityMemory } = require('../services/continuityMemoryRuntime');
const { saveConversationState } = require('../services/runtimeConversationStateEngine');
const { savePrayerContinuity } = require('../services/runtimePrayerContinuityEngine');
const { saveStudyContext } = require('../services/studyContinuityRuntime');
const { suppressFallbackLoops } = require('../services/fallbackLoopSuppressor');
const { hasGenericLoop } = require('../services/runtimeLoopGuard');

function runTest(name, fn) {
  try {
    fn();
    return { name, passed: true };
  } catch (error) {
    return { name, passed: false, error: error.message };
  }
}

const results = [];

results.push(
  runTest('memory recall query detects last week phrasing', () => {
    const recall = classifyMemoryRecallQuery('What were we talking about last week?');
    assert.strictEqual(recall.isRecallQuery, true);
    assert.strictEqual(recall.timeWindow, MEMORY_WINDOWS.LAST_7_DAYS);
  })
);

results.push(
  runTest('memory recall returns honest unavailable when empty', () => {
    const result = searchMemoryRecall({
      userId: `sprint26-empty-${Date.now()}`,
      message: 'What were we talking about last week?',
      timeWindow: MEMORY_WINDOWS.LAST_7_DAYS,
    });
    assert.strictEqual(result.memoryAvailable, false);
    assert.ok(result.reply.includes(HONEST_UNAVAILABLE));
  })
);

results.push(
  runTest('time-aware windows distinguish yesterday vs last week', () => {
    const now = new Date('2026-05-28T12:00:00.000Z');
    const yesterday = classifyTimestamp('2026-05-27T18:00:00.000Z', now);
    const lastWeek = classifyTimestamp('2026-05-23T12:00:00.000Z', now);
    const minutesAgo = classifyTimestamp('2026-05-28T11:50:00.000Z', now);
    assert.strictEqual(yesterday, MEMORY_WINDOWS.YESTERDAY);
    assert.strictEqual(lastWeek, MEMORY_WINDOWS.LAST_7_DAYS);
    assert.strictEqual(minutesAgo, MEMORY_WINDOWS.CURRENT);
  })
);

results.push(
  runTest('fallback loop suppressor replaces slow-down phrase', () => {
    const result = suppressFallbackLoops("Let's slow this down together.");
    assert.strictEqual(result.suppressed, true);
    assert.ok(result.replacement.includes('biblical text'));
  })
);

results.push(
  runTest('applyFallbackLoopGuard regenerates on loop risk', () => {
    const guarded = applyFallbackLoopGuard({
      reply: {
        reply: "I'm here with you. Let's slow this down together.",
        admin_flags: [],
      },
      runtimeContext: { loopRisk: { fallbackLoop: true } },
      recentSessions: [{ message: 'I feel overwhelmed about Sabbath study.' }],
      message: 'help me',
      safety: { level: 'standard' },
    });
    assert.ok(!hasGenericLoop(guarded.reply));
    assert.ok(guarded.admin_flags.includes('fallback_loop_suppressed') || guarded.admin_flags.includes('personalized_fallback'));
  })
);

results.push(
  runTest('continue study engine finds next registry reference', () => {
    const step = findNextInRegistryChain('Exodus 12:1-14', 'feast_days');
    assert.ok(step);
    assert.ok(step.nextRef);
  })
);

results.push(
  runTest('continue study offer uses verse path phrasing', () => {
    const userId = `sprint26-study-${Date.now()}`;
    saveStudySession({
      userId,
      topic: 'feast_days',
      references: ['Exodus 12:1-14'],
      studyStep: 'Exodus 12:1-14',
      studyProgress: 'in_progress',
      userQuestion: 'What about Passover?',
    });
    const offer = buildContinueStudyOffer({ userId, doctrineTopic: 'feast_days' });
    assert.strictEqual(offer.resumeStudy, true);
    assert.ok(offer.phrase.includes('continue into') || offer.phrase.includes('pick up'));
  })
);

results.push(
  runTest('companion learning layer tracks behavior only', () => {
    const userId = `sprint26-learn-${Date.now()}`;
    const profile = recordCompanionLearning({
      userId,
      message: 'Can we study the Sabbath?',
      structured: { mode: 'study', scripture: [{ reference: 'Genesis 2:2-3' }, { reference: 'Exodus 20:8-11' }] },
      runtimeContext: { intent: 'doctrinal_study', doctrinalMode: true },
      doctrineTopic: 'sabbath',
    });
    assert.ok(profile.favoriteTopics.sabbath >= 1);
    assert.ok(['light', 'moderate', 'deep'].includes(profile.studyDepth));
    const ctx = buildLearningContext(userId);
    assert.strictEqual(ctx.enabled, true);
    assert.ok(ctx.favoriteTopics.includes('sabbath'));
  })
);

results.push(
  runTest('historical routing is secondary for sabbath and blocked for identity', () => {
    const sabbath = routeHistoricalContext({
      doctrineTopic: 'sabbath',
      message: 'Who changed Sabbath from Saturday to Sunday?',
    });
    assert.strictEqual(sabbath.included, true);
    assert.strictEqual(sabbath.secondary, true);
    assert.ok(sabbath.formattedBlock.includes('Historical context, secondary to Scripture'));
    assert.ok(sabbath.formattedBlock.includes('Historical developments are not the same'));

    assert.strictEqual(
      isIdentityBlocked({ message: 'What is the African diaspora identity evidence bucket?' }),
      true
    );
    const blocked = routeHistoricalContext({
      doctrineTopic: 'identity',
      message: 'Tell me about ethnic identity lineage doctrine',
    });
    assert.strictEqual(blocked.included, false);
    assert.strictEqual(blocked.blocked, true);
  })
);

results.push(
  runTest('scripture witness prefers two or more supporting scriptures', () => {
    const witness = buildScriptureWitnessBlock({
      doctrineTopic: 'sabbath',
      scripture: [{ reference: 'Genesis 2:2-3' }],
      chainMeta: { genesisToRevelationPath: ['Exodus 20:8-11', 'Isaiah 58:13-14'] },
    });
    assert.ok(witness.refs.all.length >= 2);
    assert.ok(witness.level >= WITNESS_LEVELS.MULTI);
    assert.ok(witness.scriptureInterpretsScripture);
    assert.ok(witness.block.includes('Genesis 2:2-3'));
  })
);

results.push(
  runTest('presenter includes witness and historical routing without changing doctrine body', () => {
    const presented = presentCompanionDoctrine({
      structured: {
        reply: 'Genesis 2 and Exodus 20 establish the seventh-day Sabbath as Scripture states.',
        scripture: [
          { reference: 'Genesis 2:2-3' },
          { reference: 'Exodus 20:8-11' },
          { reference: 'Isaiah 58:13-14' },
        ],
        mode: 'study',
      },
      userId: `sprint26-present-${Date.now()}`,
      message: 'What is the Sabbath?',
      runtimeContext: { intent: 'doctrinal_study' },
      profile: { memoryEnabled: true },
      safety: { level: 'standard' },
      doctrineTopic: 'sabbath',
    });
    assert.ok(presented.reply.includes('Genesis 2 and Exodus 20 establish'));
    assert.ok(presented.scripture.length >= 2);
    assert.ok(presented.runtime.companionPresentation.scriptureWitness.level >= WITNESS_LEVELS.MULTI);
    assert.strictEqual(presented.runtime.companionPresentation.historicalSecondary, true);
    assert.ok(presented.presentationMeta.authorityOrder[0] === 'Scripture');
  })
);

results.push(
  runTest('persistBuddyMemory wires conversation, continuity, prayer, and study stores', () => {
    const userId = `sprint26-persist-${Date.now()}`;
    persistBuddyMemory({
      userId,
      message: 'Please pray with me about my family',
      structured: {
        mode: 'prayer',
        reply: 'Let us bring this before the Lord.',
        scripture: [{ reference: 'Philippians 4:6-7' }],
      },
      runtimeContext: { intent: 'prayer' },
      profile: { memoryEnabled: true },
    });

    saveConversationState({
      userId,
      mode: 'prayer',
      currentTopic: 'prayer',
      unresolvedTopics: [],
      lastScriptures: ['Philippians 4:6-7'],
    });
    saveContinuityMemory({
      userId,
      message: 'Please pray with me about my family',
      response: { reply: 'Let us bring this before the Lord.' },
    });
    savePrayerContinuity({
      userId,
      topic: 'family',
      prayerRequest: 'family',
      scriptures: ['Philippians 4:6-7'],
    });
    saveStudyContext({
      userId,
      message: 'study sabbath',
      response: { reply: 'Genesis 2' },
      context: { enabled: true, topic: 'sabbath', references: ['Genesis 2:2-3'], prior: [] },
    });

    const recall = searchMemoryRecall({
      userId,
      message: 'What were we talking about?',
      timeWindow: MEMORY_WINDOWS.LAST_7_DAYS,
    });
    assert.strictEqual(recall.memoryAvailable, true);
  })
);

const regressionPrompts = [
  { topic: 'sabbath', message: 'Did God change the Sabbath from the seventh day to Sunday?' },
  { topic: 'dietaryLaw', message: 'Did Acts 10 abolish the dietary law?' },
  { topic: 'feast_days', message: 'What does Leviticus 23 say about feast days?' },
  { topic: 'traditions', message: 'Are Christmas and Easter commanded in Scripture?' },
  { topic: 'resurrection_timeline', message: 'What does Matthew 12:40 require for the resurrection timeline?' },
];

for (const scenario of regressionPrompts) {
  results.push(
    runTest(`regression intercept preserved: ${scenario.topic}`, () => {
      const outcome = runDoctrineRuntimePipeline({ message: scenario.message });
      assert.ok(outcome?.intercepted, 'intercept expected');
      assert.strictEqual(outcome.topic, scenario.topic);
      assert.ok(outcome.reply?.reply);
      assert.ok(Array.isArray(outcome.reply?.scripture));
      assert.ok(outcome.reply.scripture.length >= 3);
      assert.strictEqual(outcome.reply.validation.passed, true);
    })
  );
}

const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed);

console.log(`Phase 2 Sprint 2.6 tests: ${passed}/${results.length} passed`);

if (failed.length) {
  for (const item of failed) {
    console.error(`FAIL: ${item.name} — ${item.error}`);
  }
  process.exit(1);
}

console.log('All Sprint 2.6 tests passed.');
process.exit(0);
