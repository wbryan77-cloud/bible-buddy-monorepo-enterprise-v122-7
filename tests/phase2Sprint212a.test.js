const assert = require('assert');
const { runBuddy } = require('../services/buddyBrain');
const { classifyHealthCompanion } = require('../services/healthCompanionResponse');
const { classifyPrayerIntent } = require('../services/prayerCompanionResponse');
const { classifyContinueStudyIntent } = require('../services/continueStudyIntent');
const { classifyStudyConnectionQuery } = require('../services/studyConnectionIntent');
const { getStudyJourneyContext } = require('../services/studyJourneyEngine');
const { polishCompanionReply } = require('../services/companionReplyPolish');
const { runDoctrineRuntimePipeline } = require('../services/doctrineRuntimePipeline');

const PREFIX = `s212a-${Date.now()}`;

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

function countMatches(text, pattern) {
  return (String(text).match(pattern) || []).length;
}

const results = [];

results.push(
  runTest('Part A: health classification knees hurt', () => {
    const h = classifyHealthCompanion('My knees hurt.');
    assert.strictEqual(h.isHealthSupport, true);
    assert.strictEqual(h.health.issue, 'knee pain');
  })
);

results.push(
  runTest('Part B: prayer classification', () => {
    assert.strictEqual(classifyPrayerIntent('Please pray for her daughters.').isPrayerRequest, true);
  })
);

results.push(
  runTest('Part C: short continue with userId', () => {
    const userId = `${PREFIX}-continue-classify`;
    const { saveStudySession } = require('../services/continuityStudySessionRuntime');
    saveStudySession({ userId, topic: 'kingdom', userQuestion: 'Kingdom', references: ['Isaiah 2:1-4'] });
    assert.strictEqual(classifyContinueStudyIntent('Continue.', userId).isContinueStudy, true);
    assert.strictEqual(classifyContinueStudyIntent('Continue.', 'no-sessions').isContinueStudy, false);
  })
);

results.push(
  runTest('Part D: kingdom forward path', () => {
    const userId = `${PREFIX}-journey-fwd`;
    const { saveStudySession } = require('../services/continuityStudySessionRuntime');
    saveStudySession({ userId, topic: 'kingdom', userQuestion: 'Kingdom', references: ['Isaiah 2:1-4'] });
    const ctx = getStudyJourneyContext({ userId, doctrineTopic: 'kingdom' });
    assert.strictEqual(ctx.enabled, true);
    assert.ok(['messiah', 'death_resurrection', 'resurrection_timeline', 'heaven_heavens'].includes(ctx.nextTopic));
    assert.ok(!/Sabbath/i.test(ctx.phrase) || /continue into Messiah|Resurrection|New Jerusalem/i.test(ctx.phrase));
  })
);

results.push(
  runTest('Part E: study connection classification', () => {
    assert.strictEqual(classifyStudyConnectionQuery('What connects to this study?').isStudyConnection, true);
    assert.strictEqual(classifyStudyConnectionQuery('What should I study next?').isStudyConnection, true);
  })
);

results.push(
  runTest('Part F/G/H: polish removes duplicates and object leaks', () => {
    const raw =
      "You've been walking a study journey through Sabbath, Feast Days, Kingdom. Would you like to continue into Feast Days?\n\n" +
      "You've been walking a study journey through Sabbath, Feast Days, Kingdom. Would you like to continue into Feast Days?\n\n" +
      '[object Object] opens the theme';
    const polished = polishCompanionReply(raw);
    assert.strictEqual(countMatches(polished, /You've been walking a study journey/gi), 1);
    assert.ok(!polished.includes('[object Object]'));
  })
);

results.push(
  runAsyncTest('Part J: relationship intelligence available in live runtime', async () => {
    const userId = `${PREFIX}-openai-ctx`;
    await runBuddy({ userId, message: 'My knees hurt.' });
    const { buildCompanionRelationshipContext } = require('../services/companionRelationshipOrchestrator');
    const ctx = buildCompanionRelationshipContext(userId);
    assert.ok(ctx.timeline.length >= 1 || ctx.relationships.length >= 1);
    assert.ok(ctx.truthfulness !== undefined);
    assert.ok(ctx.studyJourney !== undefined);
  })
);

for (const scenario of [
  { topic: 'sabbath', message: 'Did God change the Sabbath from the seventh day to Sunday?' },
  { topic: 'feast_days', message: 'What does Leviticus 23 say about feast days?' },
]) {
  results.push(
    runTest(`doctrine regression: ${scenario.topic}`, () => {
      const result = runDoctrineRuntimePipeline({ message: scenario.message });
      assert.strictEqual(result.intercepted, true);
    })
  );
}

results.push(
  runAsyncTest('Scenario 1: Health Day 1 routing', async () => {
    const userId = `${PREFIX}-health`;
    const d1 = await runBuddy({ userId, message: 'My knees hurt.' });
    assert.ok(d1.admin_flags?.includes('health_support') || d1.runtime?.intent === 'health_support');
    assert.ok(/knee|health|Scripture|pray/i.test(d1.reply));
    assert.ok(d1.memory_used);
    assert.ok(!/I'm here with you\. We can pray together, open a Scripture that fits what you're carrying/i.test(d1.reply));
  })
);

results.push(
  runAsyncTest('Scenario 2: Grief + Prayer Day 3', async () => {
    const userId = `${PREFIX}-grief-prayer`;
    await runBuddy({ userId, message: 'I lost a friend.' });
    const d3 = await runBuddy({ userId, message: 'Please pray for her daughters.' });
    assert.ok(d3.admin_flags?.includes('prayer_intercept') || d3.runtime?.intent === 'prayer');
    assert.ok(/pray|Father|amen|Scripture/i.test(d3.reply));
    assert.ok(!d3.admin_flags?.includes('personalized_fallback'));
  })
);

results.push(
  runAsyncTest('Scenario 3: Study continue and next', async () => {
    const userId = `${PREFIX}-study`;
    await runBuddy({ userId, message: 'What is the Sabbath?' });
    const d2 = await runBuddy({ userId, message: 'Continue our study.' });
    assert.ok(d2.admin_flags?.includes('continue_study_intercept') || d2.runtime?.intent === 'continue_study');
    const d3 = await runBuddy({ userId, message: 'What should I study next?' });
    assert.ok(d3.admin_flags?.includes('study_connection_intercept') || d3.runtime?.intent === 'study_connection');
    assert.ok(/Feast|study|Scripture|continue/i.test(d3.reply));
  })
);

results.push(
  runAsyncTest('Scenario 4: Kingdom continue and connect', async () => {
    const userId = `${PREFIX}-kingdom`;
    await runBuddy({ userId, message: 'What is the Kingdom of God?' });
    const d2 = await runBuddy({ userId, message: 'Continue.' });
    assert.ok(d2.admin_flags?.includes('continue_study_intercept') || /kingdom|continue|study/i.test(d2.reply));
    assert.ok(!d2.reply.includes('[object Object]'));
    const d3 = await runBuddy({ userId, message: 'What connects to this study?' });
    assert.ok(d3.admin_flags?.includes('study_connection_intercept') || d3.runtime?.intent === 'study_connection');
    assert.ok(/connect|Messiah|Kingdom|Resurrection|Scripture/i.test(d3.reply));
    assert.ok(countMatches(d3.reply, /You've been walking a study journey/gi) <= 1);
  })
);

results.push(
  runAsyncTest('Scenario 5: Open loop + recall quality', async () => {
    const userId = `${PREFIX}-openloop`;
    await runBuddy({ userId, message: 'I have a job opportunity.' });
    const d10 = await runBuddy({ userId, message: 'What should I focus on?' });
    assert.ok(d10.memory_used);
    assert.ok(/job|opportunity|focus|carrying/i.test(d10.reply));
    const dupQuotes = (d10.reply.match(/I have a job opportunity/gi) || []).length;
    assert.ok(dupQuotes <= 1);
    assert.ok(!/How have your fatigue been/i.test(d10.reply));
  })
);

(async () => {
  const resolved = await Promise.all(results);
  const passed = resolved.filter((r) => r.passed).length;
  console.log('\n=== Phase 2 Sprint 2.12A Tests ===\n');
  for (const r of resolved) console.log(r.passed ? `✓ ${r.name}` : `✗ ${r.name}: ${r.error}`);
  console.log(`\n${passed}/${resolved.length} passed`);
  if (passed !== resolved.length) process.exit(1);
})();
