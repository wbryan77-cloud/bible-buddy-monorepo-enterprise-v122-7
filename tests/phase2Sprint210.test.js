const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { detectHealthConcern, persistRelationshipMemoryFromInteraction } = require('../services/relationshipMemoryBridge');
const { classifyRelationshipRecallQuery, buildMemoryPresenceLine, collectRelationshipMemoryHits } = require('../services/relationshipRecallEngine');
const { getRelationshipMemoryByCategory } = require('../services/runtimeRelationshipMemoryEngine');
const { resolveDeliveryMode } = require('../services/companionDeliveryLayer');
const { runDoctrineRuntimePipeline } = require('../services/doctrineRuntimePipeline');
const { hasGenericLoop } = require('../services/runtimeLoopGuard');
const { saveStudySession } = require('../services/continuityStudySessionRuntime');

const MEMORY_FILE = path.join(__dirname, '..', 'data', 'buddy-memory.json');

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
  runTest('health concern detection: knees', () => {
    const h = detectHealthConcern('My knees have been hurting lately.');
    assert.ok(h);
    assert.strictEqual(h.issue, 'knee pain');
  })
);

results.push(
  runTest('health concern detection: cholesterol', () => {
    assert.strictEqual(detectHealthConcern('My cholesterol has been high.').issue, 'cholesterol');
  })
);

results.push(
  runTest('health concern detection: blood pressure', () => {
    assert.ok(detectHealthConcern('Blood pressure has been elevated'));
  })
);

results.push(
  runTest('relationship recall intent: how have I been doing', () => {
    const q = classifyRelationshipRecallQuery('How have I been doing recently?');
    assert.strictEqual(q.isRecallQuery, true);
    assert.strictEqual(q.recallType, 'relationship_status');
  })
);

results.push(
  runTest('relationship recall intent: what have I been carrying', () => {
    const q = classifyRelationshipRecallQuery('What have I been carrying lately?');
    assert.strictEqual(q.isRecallQuery, true);
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
    runTest(`doctrine regression: ${scenario.topic}`, () => {
      const outcome = runDoctrineRuntimePipeline({ message: scenario.message });
      assert.ok(outcome?.intercepted);
      assert.strictEqual(outcome.topic, scenario.topic);
      assert.ok(outcome.reply.validation.passed);
    })
  );
}

(async () => {
  const uid = `sprint210-${Date.now()}`;

  async function seedHealth(userId, message) {
    persistRelationshipMemoryFromInteraction({ userId, message, runtimeContext: {}, structured: {} });
    await runBuddy({ userId, message });
  }

  results.push(
    await runAsyncTest('live: knee pain stored and recalled', async () => {
      const userId = `${uid}-knee`;
      await seedHealth(userId, 'My knees have been hurting lately.');
      const health = getRelationshipMemoryByCategory(userId, 'health_concerns');
      assert.ok(health.length >= 1);
      assert.ok(health[0].issue.includes('knee'));
      const r = await runBuddy({ userId, message: 'How have I been doing recently?' });
      assert.ok(r.runtime?.memoryRecall?.memoryAvailable);
      assert.ok(/knee|health|bothering|mentioned recently/i.test(r.reply));
      assert.ok(r.runtime.memoryRecall.confidenceBlock?.length >= 1);
    })
  );

  results.push(
    await runAsyncTest('live: cholesterol memory', async () => {
      const userId = `${uid}-chol`;
      await seedHealth(userId, 'My cholesterol has been a concern lately.');
      const r = await runBuddy({ userId, message: 'What have I been carrying lately?' });
      assert.ok(/cholesterol|health|mentioned recently/i.test(r.reply));
    })
  );

  results.push(
    await runAsyncTest('live: blood pressure memory', async () => {
      const userId = `${uid}-bp`;
      await seedHealth(userId, 'Blood pressure has been elevated.');
      const r = await runBuddy({ userId, message: 'How have I been feeling?' });
      assert.ok(/blood pressure|health|mentioned recently/i.test(r.reply));
    })
  );

  results.push(
    await runAsyncTest('live: fatigue memory', async () => {
      const userId = `${uid}-fatigue`;
      await runBuddy({ userId, message: 'I am tired and need rest.' });
      const r = await runBuddy({ userId, message: 'What have I been carrying lately?' });
      assert.ok(/tired|rest|weariness|fatigue|mentioned recently/i.test(r.reply));
    })
  );

  results.push(
    await runAsyncTest('live: lost friend grief + recall', async () => {
      const userId = `${uid}-grief`;
      const g = await runBuddy({ userId, message: 'I lost a friend.' });
      assert.ok(g.admin_flags.includes('grief_support'));
      assert.ok((g.scripture || []).length >= 2);
      const r = await runBuddy({ userId, message: 'What have I been carrying lately?' });
      assert.ok(/grief|loss|mentioned recently|carrying/i.test(r.reply));
    })
  );

  results.push(
    await runAsyncTest('live: prayer continuity', async () => {
      const userId = `${uid}-prayer`;
      await runBuddy({ userId, message: 'Please pray with me about my family.' });
      const r = await runBuddy({ userId, message: 'How have I been doing recently?' });
      assert.ok(/pray|family|mentioned recently|carrying/i.test(r.reply));
    })
  );

  results.push(
    await runAsyncTest('live: continue study', async () => {
      const userId = `${uid}-continue`;
      saveStudySession({ userId, topic: 'sabbath', references: ['Exodus 20:8-11'], studyStep: 'Exodus 20:8-11', studyProgress: 'in_progress', userQuestion: 'Sabbath' });
      const r = await runBuddy({ userId, message: 'Continue our study.' });
      assert.ok(r.admin_flags.includes('continue_study_intercept'));
      assert.ok(/Exodus|continue|Sabbath/i.test(r.reply));
    })
  );

  results.push(
    await runAsyncTest('live: sabbath study with witness', async () => {
      const r = await runBuddy({ userId: `${uid}-sabbath`, message: 'What is the Sabbath?' });
      assert.ok((r.scripture || []).length >= 2);
      assert.ok(/Historical context, secondary to Scripture|Genesis 2|Exodus 20/i.test(r.reply));
      assert.ok(!hasGenericLoop(r.reply));
    })
  );

  results.push(
    await runAsyncTest('live: kingdom study not generic fallback', async () => {
      const r = await runBuddy({ userId: `${uid}-kingdom`, message: 'What is the Kingdom of God?' });
      assert.ok(r.admin_flags.includes('registry_study_presenter'));
      assert.ok((r.scripture || []).length >= 2);
    })
  );

  results.push(
    await runAsyncTest('live: light vs deep learner delivery', async () => {
      const lightUser = `${uid}-light`;
      const deepUser = `${uid}-deep`;
      const store = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
      store[lightUser] = { profile: { scriptureDepth: 'light', memoryEnabled: true }, summaries: [] };
      store[deepUser] = { profile: { scriptureDepth: 'deep', memoryEnabled: true }, summaries: [] };
      fs.writeFileSync(MEMORY_FILE, JSON.stringify(store, null, 2));

      const lightDelivery = resolveDeliveryMode({ userId: lightUser, profile: store[lightUser].profile });
      const deepDelivery = resolveDeliveryMode({ userId: deepUser, profile: store[deepUser].profile });
      assert.strictEqual(lightDelivery.isLight, true);
      assert.strictEqual(deepDelivery.isDeep, true);

      const lightReply = await runBuddy({ userId: lightUser, message: 'What is the Kingdom of God?' });
      const deepReply = await runBuddy({ userId: deepUser, message: 'What is the Kingdom of God?' });
      assert.ok((lightReply.scripture || []).length <= (deepReply.scripture || []).length);
    })
  );

  results.push(
    await runAsyncTest('live: buddy summary writes on fallback path', async () => {
      const userId = `${uid}-summary`;
      await runBuddy({ userId, message: 'Hello there.' });
      const store = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
      assert.ok((store[userId]?.summaries || []).length >= 1);
    })
  );

  results.push(
    await runAsyncTest('live: memory presence line builder', async () => {
      const userId = `${uid}-presence`;
      persistRelationshipMemoryFromInteraction({ userId, message: 'My knees hurt.', runtimeContext: {}, structured: {} });
      persistRelationshipMemoryFromInteraction({ userId, message: 'I am tired after long work weeks.', runtimeContext: {}, structured: {} });
      const hits = collectRelationshipMemoryHits({ userId, recallType: 'relationship_status' });
      const line = buildMemoryPresenceLine(hits, 'relationship_status');
      assert.ok(line);
      assert.ok(/knee|tired|mentioned recently/i.test(line));
    })
  );

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed);

  console.log(`Phase 2 Sprint 2.10 tests: ${passed}/${results.length} passed`);

  if (failed.length) {
    for (const item of failed) {
      console.error(`FAIL: ${item.name} — ${item.error}`);
    }
    process.exit(1);
  }

  console.log('All Sprint 2.10 tests passed.');
  process.exit(0);
})();
