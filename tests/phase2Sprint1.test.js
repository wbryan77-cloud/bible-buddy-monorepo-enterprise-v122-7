const assert = require('assert');

const {
  TIER,
  MODE,
  tierForNode,
  isStrongB,
  isTierAllowedForMode,
  aggregatePathTier,
  confidenceScore,
  tierLabel,
  filterNodesForMode,
} = require('../services/scriptureCertaintyFramework');

const {
  TOPIC_REGISTRY,
  CORE_TOPIC_KEYS,
  listRegistryTopicKeys,
  listCoreTopicKeys,
  getRegistryTopic,
  getRegistryChain,
  listLiveInterceptTopics,
  getRegistrySummary,
} = require('../services/genesisToRevelationContinuityRegistry');

const {
  loadInventory,
  findExistingChain,
  findExistingEngine,
  findExistingCatalog,
  findDuplicateTopicKeys,
  assertReuseBeforeCreate,
  getGovernanceSummary,
} = require('../services/registryGovernance');

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
  runTest('TIER constants are A through E', () => {
    assert.strictEqual(TIER.A, 'A');
    assert.strictEqual(TIER.E, 'E');
  })
);

results.push(
  runTest('tierLabel returns human-readable labels', () => {
    assert.strictEqual(tierLabel('A'), 'Explicit Scripture');
    assert.strictEqual(tierLabel('E'), 'Speculation');
  })
);

results.push(
  runTest('aggregatePathTier returns weakest tier', () => {
    const nodes = [
      { reference: 'Genesis 1:1', tier: 'A' },
      { reference: 'Example', tier: 'C' },
    ];
    assert.strictEqual(aggregatePathTier(nodes), 'C');
  })
);

results.push(
  runTest('confidenceScore averages tier weights', () => {
    const nodes = [
      { reference: 'A', tier: 'A' },
      { reference: 'B', tier: 'B' },
    ];
    const score = confidenceScore(nodes);
    assert.ok(score >= 90 && score <= 93);
  })
);

results.push(
  runTest('Normal Doctrine allows A and strong B only', () => {
    assert.strictEqual(isTierAllowedForMode('A', MODE.NORMAL_DOCTRINE), true);
    assert.strictEqual(
      isTierAllowedForMode('B', MODE.NORMAL_DOCTRINE, { strongB: true }),
      true
    );
    assert.strictEqual(
      isTierAllowedForMode('B', MODE.NORMAL_DOCTRINE, { strongB: false }),
      false
    );
    assert.strictEqual(isTierAllowedForMode('C', MODE.NORMAL_DOCTRINE), false);
  })
);

results.push(
  runTest('Advanced Study allows through C', () => {
    assert.strictEqual(isTierAllowedForMode('C', MODE.ADVANCED_STUDY), true);
    assert.strictEqual(isTierAllowedForMode('D', MODE.ADVANCED_STUDY), false);
  })
);

results.push(
  runTest('filterNodesForMode respects gating', () => {
    const nodes = [
      { reference: 'Genesis 1:1', tier: 'A' },
      { reference: 'Inference', tier: 'C' },
    ];
    const filtered = filterNodesForMode(nodes, MODE.NORMAL_DOCTRINE);
    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(tierForNode(filtered[0]), 'A');
  })
);

results.push(
  runTest('registry has 17 core topic keys plus dietary_law alias', () => {
    assert.strictEqual(listCoreTopicKeys().length, 17);
    assert.strictEqual(listRegistryTopicKeys().length, 18);
    assert.ok(getRegistryTopic('dietary_law'));
  })
);

results.push(
  runTest('every core topic resolves with a non-empty chain', () => {
    for (const key of CORE_TOPIC_KEYS) {
      const entry = getRegistryTopic(key);
      assert.ok(entry, `missing topic: ${key}`);
      assert.ok(entry.canonicalChain.length > 0, `empty chain: ${key}`);
      for (const chainNode of entry.canonicalChain) {
        assert.ok(chainNode.reference, `missing reference in ${key}`);
        assert.ok(tierForNode(chainNode), `missing tier in ${key}`);
      }
    }
  })
);

results.push(
  runTest('live intercept topics are registered', () => {
    const live = listLiveInterceptTopics();
    const aliases = live.map((item) => item.liveInterceptAlias).sort();
    assert.deepStrictEqual(aliases, [
      'dietaryLaw',
      'feast_days',
      'resurrection_timeline',
      'sabbath',
      'traditions',
    ]);
  })
);

results.push(
  runTest('forbidden sources are declared on sensitive topics', () => {
    const egypt = getRegistryTopic('egypt_bondage');
    assert.ok(egypt.forbiddenSources.includes('historicalEvidenceSeparate'));
    const babylon = getRegistryTopic('babylon');
    assert.ok(babylon.forbiddenSources.includes('edomHistoricalEvidenceBucket'));
  })
);

results.push(
  runTest('inventory loads and matches registry topic count', () => {
    const inventory = loadInventory();
    assert.strictEqual(inventory.sprint, 'S1');
    assert.strictEqual(inventory.topics.length, 18);
    const summary = getGovernanceSummary();
    assert.strictEqual(summary.registryTopicCount, 18);
    assert.strictEqual(summary.duplicateTopicKeys.length, 0);
  })
);

results.push(
  runTest('governance findExistingChain locates registry chains', () => {
    const found = findExistingChain('covenant');
    assert.ok(found);
    assert.strictEqual(found.source, 'genesisToRevelationContinuityRegistry');
    assert.ok(found.chainLength >= 6);
  })
);

results.push(
  runTest('governance blocks duplicate topic registration', () => {
    const check = assertReuseBeforeCreate({ type: 'topic', topicKey: 'sabbath' });
    assert.strictEqual(check.allowed, false);
    assert.strictEqual(check.reason, 'topic_already_registered');
  })
);

results.push(
  runTest('governance blocks duplicate planned engine names', () => {
    const check = assertReuseBeforeCreate({ type: 'engine', name: 'messiahWitnessMatrix' });
    assert.strictEqual(check.allowed, false);
    assert.strictEqual(check.reason, 'engine_already_registered');
  })
);

results.push(
  runTest('governance allows new engine when not registered', () => {
    const check = assertReuseBeforeCreate({ type: 'engine', name: 'futureEngineNotInRegistry' });
    assert.strictEqual(check.allowed, true);
  })
);

results.push(
  runTest('governance findExistingCatalog maps source catalogs', () => {
    const found = findExistingCatalog('covenantReferenceCatalog.js');
    assert.ok(found);
    assert.strictEqual(found.topicKey, 'covenant');
  })
);

results.push(
  runTest('registry summary reports expected counts', () => {
    const summary = getRegistrySummary();
    assert.strictEqual(summary.topicCount, 18);
    assert.strictEqual(summary.coreTopicCount, 17);
    assert.strictEqual(summary.liveInterceptCount, 5);
  })
);

results.push(
  runTest('getRegistryChain returns copy of canonical chain', () => {
    const chain = getRegistryChain('sabbath');
    assert.ok(chain.length >= 7);
    chain.pop();
    assert.ok(getRegistryChain('sabbath').length > chain.length);
  })
);

const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed);

console.log(`Phase 2 Sprint 1 tests: ${passed}/${results.length} passed`);

if (failed.length) {
  for (const item of failed) {
    console.error(`FAIL: ${item.name} — ${item.error}`);
  }
  process.exit(1);
}

console.log('All Sprint 1 tests passed.');
process.exit(0);
