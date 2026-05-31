const assert = require('assert');
const { runBuddy } = require('../services/buddyBrain');
const { saveStudySession } = require('../services/continuityStudySessionRuntime');
const { classifyContinueStudyIntent, buildContinueStudyResponse } = require('../services/continueStudyIntent');
const { classifyEmotionalSupport } = require('../services/griefCompanionResponse');
const { detectRegistryStudyTopic } = require('../services/registryStudyPresenter');
const { searchMemoryRecall, classifyMemoryRecallQuery, MEMORY_WINDOWS } = require('../services/memoryRecallEngine');
const { runDoctrineRuntimePipeline } = require('../services/doctrineRuntimePipeline');
const { routeHistoricalContext, isIdentityBlocked } = require('../services/historicalContextRouter');
const { getRelationshipMemory } = require('../services/runtimeRelationshipMemoryEngine');
const { hasGenericLoop } = require('../services/runtimeLoopGuard');

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
  runTest('continue study intent detects phrase', () => {
    assert.strictEqual(classifyContinueStudyIntent('Continue our study.').isContinueStudy, true);
  })
);

results.push(
  runTest('grief detection catches lost a friend', () => {
    const grief = classifyEmotionalSupport('I lost a friend.');
    assert.strictEqual(grief.isEmotionalSupport, true);
    assert.strictEqual(grief.supportType, 'grief');
  })
);

results.push(
  runTest('registry detects kingdom question', () => {
    assert.strictEqual(detectRegistryStudyTopic('What is the Kingdom of God?'), 'kingdom');
  })
);

results.push(
  runTest('memory recall respects last week window labeling', () => {
    const userId = `sprint28-window-${Date.now()}`;
    saveStudySession({
      userId,
      topic: 'sabbath',
      references: ['Exodus 20:8-11'],
      studyStep: 'Exodus 20:8-11',
      studyProgress: 'in_progress',
      userQuestion: 'Sabbath study',
    });
    const recall = searchMemoryRecall({
      userId,
      message: 'What were we talking about last week?',
      timeWindow: MEMORY_WINDOWS.LAST_7_DAYS,
    });
    assert.ok(
      recall.partialMatch || recall.reply.includes('do not have a stored memory') || recall.reply.includes('within the last week'),
      'expected honest window handling'
    );
    assert.ok(!recall.reply.startsWith('From just a few minutes ago'));
  })
);

results.push(
  runTest('historical label uses secondary to Scripture wording', () => {
    const historical = routeHistoricalContext({ doctrineTopic: 'sabbath', message: 'Sabbath history' });
    assert.ok(historical.formattedBlock.includes('Historical context, secondary to Scripture:'));
  })
);

results.push(
  runTest('identity buckets remain blocked', () => {
    assert.strictEqual(isIdentityBlocked({ message: 'ethnic identity lineage bucket doctrine' }), true);
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
    runTest(`doctrine regression preserved: ${scenario.topic}`, () => {
      const outcome = runDoctrineRuntimePipeline({ message: scenario.message });
      assert.ok(outcome?.intercepted);
      assert.strictEqual(outcome.topic, scenario.topic);
      assert.ok(outcome.reply.validation.passed);
    })
  );
}

(async () => {
  const userId = `sprint28-live-${Date.now()}`;
  saveStudySession({
    userId,
    topic: 'sabbath',
    references: ['Exodus 20:8-11'],
    studyStep: 'Exodus 20:8-11',
    studyProgress: 'in_progress',
    userQuestion: 'What is the Sabbath?',
  });

  const liveQueries = [
    {
      label: 'memory recall last week',
      message: 'What were we talking about last week?',
      expect: (r) => r.runtime?.memoryRecall || r.admin_flags?.includes('memory_recall') || r.admin_flags?.includes('memory_unavailable'),
    },
    {
      label: 'continue study',
      message: 'Continue our study.',
      expect: (r) => r.admin_flags?.includes('continue_study_intercept') || r.runtime?.continueStudy?.enabled,
    },
    {
      label: 'sabbath history',
      message: 'Who changed Sabbath from Saturday to Sunday?',
      expect: (r) =>
        r.runtime?.companionPresentation?.historicalSecondary === true ||
        String(r.reply).includes('Historical context, secondary to Scripture'),
    },
    {
      label: 'grief',
      message: 'I lost a friend.',
      expect: (r) => r.admin_flags?.includes('grief_support') && !hasGenericLoop(r.reply),
    },
    {
      label: 'kingdom registry',
      message: 'What is the Kingdom of God?',
      expect: (r) => r.admin_flags?.includes('registry_study_presenter') && (r.scripture?.length || 0) >= 2,
    },
    {
      label: 'rest support',
      message: 'I am tired and need rest.',
      expect: (r) => r.admin_flags?.includes('rest_support') || r.safety_level === 'emotional_support',
    },
    {
      label: 'earlier today recall',
      message: 'Do you remember what we studied earlier today?',
      expect: (r) => r.runtime?.memoryRecall || r.admin_flags?.includes('memory_recall'),
    },
  ];

  for (const query of liveQueries) {
    results.push(
      await runAsyncTest(`live: ${query.label}`, async () => {
        const response = await runBuddy({ userId, message: query.message });
        assert.ok(query.expect(response), `expectation failed for ${query.label}`);
        if (query.label === 'grief' || query.label === 'kingdom registry' || query.label === 'sabbath history') {
          assert.ok((response.scripture || []).length >= 2, 'expected at least two scriptures');
        }
      })
    );
  }

  results.push(
    await runAsyncTest('relationship memory writes on grief', async () => {
      const griefUser = `sprint28-grief-${Date.now()}`;
      await runBuddy({ userId: griefUser, message: 'I lost a friend.' });
      const memories = getRelationshipMemory(griefUser, 10);
      assert.ok(memories.some((item) => item.category === 'grief_events'));
    })
  );

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed);

  console.log(`Phase 2 Sprint 2.8 tests: ${passed}/${results.length} passed`);

  if (failed.length) {
    for (const item of failed) {
      console.error(`FAIL: ${item.name} — ${item.error}`);
    }
    process.exit(1);
  }

  console.log('All Sprint 2.8 tests passed.');
  process.exit(0);
})();
