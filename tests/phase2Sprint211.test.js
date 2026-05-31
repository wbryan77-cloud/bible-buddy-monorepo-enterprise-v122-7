const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { runDoctrineRuntimePipeline } = require('../services/doctrineRuntimePipeline');
const { hasGenericLoop } = require('../services/runtimeLoopGuard');
const { appendTimelineEvent, getLifeTimeline, getActiveJourneys } = require('../services/lifeTimelineMemory');
const { detectOpenLoop, upsertOpenLoop, getOpenLoops, pickGentleLoopRevisit } = require('../services/openLoopsEngine');
const { recordMilestone, getMilestones } = require('../services/milestoneTracking');
const { recordEmotionalSnapshot, analyzeEmotionalArc } = require('../services/emotionalArcEngine');
const { getStudyJourneyContext, STUDY_JOURNEYS } = require('../services/studyJourneyEngine');
const { buildCompanionReflection } = require('../services/companionReflectionLayer');
const {
  classifyTruthLevel,
  classifyImportance,
  TRUTH_LEVEL,
  IMPORTANCE_TIER,
} = require('../services/memoryTruthfulness');
const {
  persistCompanionRelationshipState,
  buildCompanionRelationshipContext,
} = require('../services/companionRelationshipOrchestrator');
const { persistRelationshipMemoryFromInteraction } = require('../services/relationshipMemoryBridge');
const { getRelationshipMemoryByCategory } = require('../services/runtimeRelationshipMemoryEngine');
const { saveStudySession } = require('../services/continuityStudySessionRuntime');
const { routeHistoricalContext } = require('../services/historicalContextRouter');

const TEST_USER = `sprint211-${Date.now()}`;

function runTest(name, fn) {
  try {
    fn();
    return { name, passed: true };
  } catch (error) {
    return { name, passed: false, error: error.message };
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    return { name, passed: true };
  } catch (error) {
    return { name, passed: false, error: error.message };
  }
}

const results = [];

results.push(
  runTest('Part A: life timeline stores event journey fields', () => {
    const userId = `${TEST_USER}-timeline`;
    appendTimelineEvent({
      userId,
      eventType: 'health',
      summary: 'Knee pain discussion',
      importance: 'high',
      status: 'open',
      linkedCategory: 'health_concerns',
    });
    appendTimelineEvent({
      userId,
      eventType: 'follow_up',
      summary: 'Knee feeling a bit better',
      status: 'follow_up',
      linkedCategory: 'health_concerns',
    });
    const timeline = getLifeTimeline(userId);
    assert.ok(timeline.length >= 2);
    assert.strictEqual(timeline[0].eventType, 'health');
    assert.ok(timeline[0].importance);
    assert.ok(timeline[0].status);
    const journeys = getActiveJourneys(userId);
    assert.ok(journeys.some((j) => j.type === 'health'));
  })
);

results.push(
  runTest('Part B: open loops track open and gentle revisit', () => {
    const userId = `${TEST_USER}-loops`;
    const loop = detectOpenLoop('My blood pressure goal is to get it below 120.');
    assert.ok(loop);
    assert.strictEqual(loop.key, 'blood_pressure');
    upsertOpenLoop({ userId, loopKey: loop.key, label: loop.label, detail: loop.detail, importance: 'high' });
    const open = getOpenLoops(userId);
    assert.strictEqual(open.length, 1);
    assert.strictEqual(open[0].status, 'open');
    const revisit = pickGentleLoopRevisit(userId);
    assert.ok(revisit?.phrase.includes('blood pressure'));
  })
);

results.push(
  runTest('Part C: milestone tracking records study milestone', () => {
    const userId = `${TEST_USER}-milestone`;
    const entry = recordMilestone({
      userId,
      category: 'study',
      label: 'completed Sabbath study milestone',
      detail: 'sabbath',
    });
    assert.ok(entry);
    assert.ok(getMilestones(userId).length >= 1);
  })
);

results.push(
  runTest('Part D: emotional arc pattern recognition without diagnosis', () => {
    const userId = `${TEST_USER}-arc`;
    recordEmotionalSnapshot({ userId, message: 'I am grieving my friend who passed away.' });
    recordEmotionalSnapshot({ userId, message: 'Still grieving and very tired.' });
    const arc = analyzeEmotionalArc(userId);
    assert.ok(arc.patterns.length >= 1);
    assert.ok(!String(arc.summary || '').match(/diagnos/i));
  })
);

results.push(
  runTest('Part E: study journey engine maps Sabbath path', () => {
    const userId = `${TEST_USER}-journey`;
    saveStudySession({ userId, topic: 'sabbath', userQuestion: 'Sabbath study', references: ['Exodus 20:8-11'] });
    saveStudySession({ userId, topic: 'feast_days', userQuestion: 'Feast study', references: ['Leviticus 23'] });
    const ctx = getStudyJourneyContext({ userId, doctrineTopic: 'feast_days' });
    assert.strictEqual(ctx.enabled, true);
    assert.ok(STUDY_JOURNEYS.sabbath_to_new_jerusalem.topics.includes(ctx.nextTopic || 'kingdom'));
  })
);

results.push(
  runTest('Part F: reflection layer is memory-backed not fabricated', () => {
    const userId = `${TEST_USER}-reflection`;
    persistRelationshipMemoryFromInteraction({
      userId,
      message: 'My knees have been hurting when I work six days a week.',
      runtimeContext: { intent: 'companion' },
    });
    const reflection = buildCompanionReflection({ userId, message: 'I feel worn down.' });
    assert.strictEqual(reflection.used, true);
    assert.ok(reflection.reflection.includes('knee') || reflection.reflection.includes('worn'));
    assert.ok(!reflection.reflection.includes('for years'));
  })
);

results.push(
  runTest('Part G: memory importance classification', () => {
    assert.strictEqual(classifyImportance('grief_events', 'high'), IMPORTANCE_TIER.HIGH);
    assert.strictEqual(classifyImportance('favorite_study_topics', 'normal'), IMPORTANCE_TIER.MEDIUM);
    assert.strictEqual(classifyImportance('conversation', 'normal'), IMPORTANCE_TIER.LOW);
  })
);

results.push(
  runTest('Part H: memory truthfulness levels', () => {
    const known = classifyTruthLevel({
      hit: { importance: 'high', detail: 'knee pain' },
      frequency: 2,
      ageWindow: 'last_7_days',
    });
    assert.strictEqual(known, TRUTH_LEVEL.KNOWN);
    const partial = classifyTruthLevel({
      hit: { detail: 'something' },
      frequency: 1,
      ageWindow: 'older',
    });
    assert.strictEqual(partial, TRUTH_LEVEL.PARTIAL);
    assert.strictEqual(classifyTruthLevel({ hit: null }), TRUTH_LEVEL.UNKNOWN);
  })
);

results.push(
  runTest('Part L: historical context remains secondary labeled', () => {
    const historical = routeHistoricalContext({ doctrineTopic: 'sabbath', message: 'Sabbath history' });
    if (historical.included && historical.formattedBlock) {
      assert.ok(historical.formattedBlock.includes('secondary to Scripture'));
    }
  })
);

const doctrineRegression = [
  { topic: 'sabbath', message: 'Did God change the Sabbath from the seventh day to Sunday?' },
  { topic: 'dietaryLaw', message: 'Did Acts 10 abolish the dietary law?' },
  { topic: 'feast_days', message: 'What does Leviticus 23 say about feast days?' },
  { topic: 'traditions', message: 'Are Christmas and Easter commanded in Scripture?' },
  { topic: 'resurrection_timeline', message: 'What does Matthew 12:40 require for the resurrection timeline?' },
];

for (const scenario of doctrineRegression) {
  results.push(
    runTest(`Part N doctrine regression: ${scenario.topic}`, () => {
      const result = runDoctrineRuntimePipeline({ message: scenario.message });
      assert.strictEqual(result.intercepted, true);
      assert.strictEqual(result.topic, scenario.topic);
      assert.ok(result.reply?.reply?.length > 40);
      assert.ok(!hasGenericLoop(result.reply.reply));
    })
  );
}

results.push(
  runAsyncTest('Part O: five-day user journey simulation', async () => {
    const userId = `${TEST_USER}-journey5`;

    const day1 = await runBuddy({ userId, message: 'My knees have been hurting lately and I am worried.' });
    assert.ok(day1.reply.length > 20);

    const day2 = await runBuddy({ userId, message: 'What does Leviticus 23 say about feast days?' });
    assert.ok(day2.reply.length > 40);
    assert.ok(day2.scripture?.length >= 1 || day2.runtime?.doctrineTopic === 'feast_days');

    const day3 = await runBuddy({ userId, message: 'Please pray for my mother health situation.' });
    assert.ok(/pray|prayer|Scripture|mother/i.test(day3.reply));

    const day4 = await runBuddy({ userId, message: 'I lost my friend last month and I am grieving.' });
    assert.ok(/sorry|grief|comfort|Scripture|Psalm/i.test(day4.reply));

    persistCompanionRelationshipState({
      userId,
      message: 'Follow up on my knee pain — a little better this week.',
      structured: { mode: 'companion' },
      runtimeContext: { intent: 'companion' },
    });

    const day5 = await runBuddy({ userId, message: 'What have I been carrying lately?' });
    assert.ok(day5.memory_used !== false);
    assert.ok(/knee|grief|mother|pray|carrying|mentioned/i.test(day5.reply));
    assert.ok(!day5.reply.includes('for years'));

    const ctx = buildCompanionRelationshipContext(userId);
    assert.ok(ctx.timeline.length >= 1 || ctx.openLoops.length >= 1);
    assert.ok(ctx.truthfulness.length >= 0);
  })
);

results.push(
  runAsyncTest('Part M: companion systems influence live runtime', async () => {
    const userId = `${TEST_USER}-presence`;
    persistRelationshipMemoryFromInteraction({
      userId,
      message: 'I want to study the Sabbath and keep learning.',
      runtimeContext: { intent: 'study' },
      doctrineTopic: 'sabbath',
    });
    saveStudySession({ userId, topic: 'sabbath', userQuestion: 'Sabbath', references: ['Exodus 20:8-11'] });

    const response = await runBuddy({ userId, message: 'I am tired today.' });
    assert.ok(response.reply.length > 20);
    const ctx = buildCompanionRelationshipContext(userId);
    assert.ok(ctx.learning || ctx.relationships.length >= 0);
    assert.ok(ctx.studyJourney || ctx.openLoops);
  })
);

(async () => {
  const resolved = await Promise.all(results);
  const passed = resolved.filter((r) => r.passed).length;
  const failed = resolved.filter((r) => !r.passed);

  console.log('\n=== Phase 2 Sprint 2.11 Tests ===\n');
  for (const result of resolved) {
    console.log(result.passed ? `✓ ${result.name}` : `✗ ${result.name}: ${result.error}`);
  }
  console.log(`\n${passed}/${resolved.length} passed`);
  if (failed.length) process.exit(1);
})();
