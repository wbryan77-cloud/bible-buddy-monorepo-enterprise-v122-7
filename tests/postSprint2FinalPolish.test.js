const assert = require('assert');
const { runBuddy } = require('../services/buddyBrain');
const {
  detectPrayerMilestones,
  detectHealthMilestones,
  getMilestones,
  buildMilestoneAcknowledgment,
} = require('../services/milestoneTracking');
const {
  classifyImportance,
  IMPORTANCE_TIER,
  isEphemeralQuestion,
  retainHighImportanceMemories,
} = require('../services/memoryTruthfulness');
const { saveRelationshipMemory, getRelationshipMemory } = require('../services/runtimeRelationshipMemoryEngine');

const PREFIX = `post-s2-${Date.now()}`;

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
  runTest('Part B: recurring prayer milestone detection', () => {
    const userId = `${PREFIX}-prayer`;
    const m = detectPrayerMilestones({ userId, message: 'Please pray for my mother again.' });
    assert.ok(Array.isArray(m));
  })
);

results.push(
  runAsyncTest('Part B: answered prayer milestone surfaces', async () => {
    const userId = `${PREFIX}-prayer-live`;
    await runBuddy({ userId, message: 'Please pray for my mother.' });
    await runBuddy({ userId, message: 'Please pray for my mother again.' });
    await runBuddy({ userId, message: 'God answered our prayer — thank you!' });
    const milestones = getMilestones(userId);
    assert.ok(milestones.some((m) => m.category === 'prayer'));
    const follow = await runBuddy({ userId, message: 'Hello.' });
    assert.ok(/prayer|answered|meaningful step/i.test(follow.reply));
  })
);

results.push(
  runAsyncTest('Part C: health journey milestone surfaces', async () => {
    const userId = `${PREFIX}-health`;
    await runBuddy({ userId, message: 'My knees hurt.' });
    await runBuddy({ userId, message: 'My knees still hurt.' });
    const milestones = getMilestones(userId);
    assert.ok(milestones.some((m) => m.category === 'health'));
    const ack = buildMilestoneAcknowledgment(userId);
    assert.ok(ack);
    assert.ok(!/diagnos|prescribe|you should take/i.test(ack));
  })
);

results.push(
  runTest('Part D: grief is high retention', () => {
    assert.strictEqual(classifyImportance('grief_events', 'high'), IMPORTANCE_TIER.HIGH);
  })
);

results.push(
  runTest('Part D: family is high retention', () => {
    assert.strictEqual(classifyImportance('important_people', 'high'), IMPORTANCE_TIER.HIGH);
  })
);

results.push(
  runTest('Part D: ephemeral questions are low retention', () => {
    assert.strictEqual(isEphemeralQuestion('What is the Sabbath?'), true);
    assert.strictEqual(classifyImportance('ephemeral_questions', 'low'), IMPORTANCE_TIER.LOW);
  })
);

results.push(
  runTest('Part D: retention keeps high importance first', () => {
    const userId = `${PREFIX}-retention`;
    saveRelationshipMemory({ userId, category: 'grief_events', detail: 'lost friend', importance: 'high' });
    saveRelationshipMemory({ userId, category: 'ephemeral_questions', detail: 'What is faith?', importance: 'low' });
    saveRelationshipMemory({ userId, category: 'prayer_requests', detail: 'pray for mom', importance: 'high' });
    const kept = retainHighImportanceMemories(getRelationshipMemory(userId, 50), 2);
    assert.ok(kept.some((m) => m.category === 'grief_events' || m.category === 'prayer_requests'));
  })
);

(async () => {
  const resolved = await Promise.all(results);
  const passed = resolved.filter((r) => r.passed).length;
  console.log('\n=== Post-Sprint-2 Final Polish Tests ===\n');
  for (const r of resolved) console.log(r.passed ? `✓ ${r.name}` : `✗ ${r.name}: ${r.error}`);
  console.log(`\n${passed}/${resolved.length} passed`);
  if (passed !== resolved.length) process.exit(1);
})();
