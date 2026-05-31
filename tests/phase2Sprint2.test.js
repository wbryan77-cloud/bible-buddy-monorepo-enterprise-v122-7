const assert = require('assert');

const { MODE, TIER, NO_AUTO_PROMOTION } = require('../services/studyModeGating');
const {
  filterChainForMode,
  resolveEffectiveMode,
  canPromoteMode,
  isModeTransitionAllowed,
  findModeViolations,
} = require('../services/studyModeGating');
const {
  evaluateTopicSafety,
  evaluateDoctrineTopicSafety,
  mapDoctrineTopicToRegistryKey,
} = require('../services/doctrineSafetyLayer');
const {
  validateDoctrineResponse,
  buildCertaintyValidation,
} = require('../services/runtimeQualityValidator');
const { buildConfidenceRuntime } = require('../services/scriptureConfidenceRuntime');
const { getRegistryTopic } = require('../services/genesisToRevelationContinuityRegistry');
const { runDoctrineRuntimePipeline } = require('../services/doctrineRuntimePipeline');

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
  runTest('no automatic promotion is enforced', () => {
    assert.strictEqual(NO_AUTO_PROMOTION, true);
    assert.strictEqual(canPromoteMode(), false);
    assert.strictEqual(isModeTransitionAllowed(MODE.ADVANCED_STUDY, MODE.NORMAL_DOCTRINE), false);
    assert.strictEqual(isModeTransitionAllowed(MODE.NORMAL_DOCTRINE, MODE.ADVANCED_STUDY), true);
  })
);

results.push(
  runTest('resolveEffectiveMode downgrades ineligible normal requests', () => {
    const resolved = resolveEffectiveMode({
      requestedMode: MODE.NORMAL_DOCTRINE,
      recommendedMode: MODE.ADVANCED_STUDY,
      eligibleForRequestedMode: false,
    });
    assert.strictEqual(resolved.effectiveMode, MODE.ADVANCED_STUDY);
    assert.strictEqual(resolved.adjusted, true);
  })
);

results.push(
  runTest('resolveEffectiveMode never promotes mode', () => {
    const resolved = resolveEffectiveMode({
      requestedMode: MODE.ADVANCED_STUDY,
      recommendedMode: MODE.NORMAL_DOCTRINE,
      eligibleForRequestedMode: true,
    });
    assert.strictEqual(resolved.effectiveMode, MODE.ADVANCED_STUDY);
    assert.strictEqual(resolved.adjusted, false);
  })
);

results.push(
  runTest('covenant canonicalEngine is null', () => {
    const entry = getRegistryTopic('covenant');
    assert.strictEqual(entry.canonicalEngine, null);
  })
);

results.push(
  runTest('live doctrine topics map to registry keys', () => {
    assert.strictEqual(mapDoctrineTopicToRegistryKey('dietaryLaw'), 'dietary_law');
    assert.strictEqual(mapDoctrineTopicToRegistryKey('resurrection_timeline'), 'resurrection');
  })
);

results.push(
  runTest('live intercept topics eligible for normal doctrine', () => {
    const topics = ['sabbath', 'dietaryLaw', 'feast_days', 'traditions', 'resurrection_timeline'];
    for (const topic of topics) {
      const safety = evaluateDoctrineTopicSafety(topic, MODE.NORMAL_DOCTRINE);
      assert.strictEqual(safety.eligibleForNormalDoctrine, true, topic);
      assert.strictEqual(safety.effectiveMode, MODE.NORMAL_DOCTRINE, topic);
      assert.ok(safety.confidenceScore >= 75, topic);
    }
  })
);

results.push(
  runTest('advanced default topics recommend advanced or research not normal', () => {
    const babylon = evaluateTopicSafety('babylon', MODE.NORMAL_DOCTRINE);
    assert.strictEqual(babylon.defaultMode, MODE.ADVANCED_STUDY);
    assert.strictEqual(babylon.eligibleForNormalDoctrine, true);
    assert.strictEqual(babylon.effectiveMode, MODE.NORMAL_DOCTRINE);
  })
);

results.push(
  runTest('historical-only chain routes to research question mode', () => {
    const recommendation = require('../services/doctrineSafetyLayer').recommendModeFromChain([
      { reference: 'Example', tier: TIER.D },
      { reference: 'Example 2', tier: TIER.E },
    ], { defaultMode: MODE.ADVANCED_STUDY });
    assert.strictEqual(recommendation.recommendedMode, MODE.RESEARCH_QUESTION);
  })
);

results.push(
  runTest('filterChainForMode removes weak B from normal doctrine', () => {
    const nodes = [
      { reference: 'Genesis 1:1', tier: TIER.A },
      { reference: 'Inference', tier: TIER.B, strongB: false },
    ];
    const filtered = filterChainForMode(nodes, MODE.NORMAL_DOCTRINE);
    assert.strictEqual(filtered.length, 1);
  })
);

results.push(
  runTest('validateDoctrineResponse attaches certainty metadata', () => {
    const result = validateDoctrineResponse('Genesis 2 and Exodus 20 teach the Sabbath.', 'sabbath');
    assert.ok(result.certainty);
    assert.strictEqual(result.certainty.registryTopicKey, 'sabbath');
    assert.strictEqual(result.certainty.eligibleForNormalDoctrine, true);
    assert.ok(result.score >= 75);
    assert.strictEqual(result.passed, true);
  })
);

results.push(
  runTest('validateDoctrineResponse still penalizes forbidden phrases', () => {
    const result = validateDoctrineResponse(
      'Sunday replaced the Sabbath according to church practice.',
      'sabbath'
    );
    assert.ok(result.issues.some((issue) => issue.startsWith('forbidden_phrase:')));
    assert.ok(result.score < 75);
    assert.strictEqual(result.passed, false);
  })
);

results.push(
  runTest('buildConfidenceRuntime includes registry certainty', () => {
    const runtime = buildConfidenceRuntime({ topic: 'sabbath', references: ['Genesis 2:2-3'], continuityScore: 80 });
    assert.ok(runtime.registryCertainty);
    assert.strictEqual(runtime.registryCertainty.registryTopicKey, 'sabbath');
    assert.ok(runtime.scriptureConfidence >= runtime.heuristicConfidence);
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
    runTest(`regression intercept: ${scenario.topic}`, () => {
      const outcome = runDoctrineRuntimePipeline({ message: scenario.message });
      assert.ok(outcome?.intercepted, 'intercept expected');
      assert.strictEqual(outcome.topic, scenario.topic);
      assert.ok(outcome.reply?.reply);
      assert.ok(Array.isArray(outcome.reply?.scripture));
      assert.ok(outcome.reply.scripture.length >= 3);
      assert.strictEqual(outcome.reply.validation.passed, true);
      assert.ok(outcome.reply.validation.score >= 75);
      assert.ok(outcome.reply.validation.certainty);
      assert.strictEqual(outcome.reply.validation.certainty.eligibleForNormalDoctrine, true);
    })
  );
}

const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed);

console.log(`Phase 2 Sprint 2 tests: ${passed}/${results.length} passed`);

if (failed.length) {
  for (const item of failed) {
    console.error(`FAIL: ${item.name} — ${item.error}`);
  }
  process.exit(1);
}

console.log('All Sprint 2 tests passed.');
process.exit(0);
