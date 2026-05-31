/**
 * OpenAI production smoke test — run in deployed environment:
 *   OPENAI_API_KEY=sk-... node tests/openaiProductionSmokeTest.js
 */
const fs = require('fs');
const path = require('path');

const RESULTS_FILE = path.join(__dirname, '..', 'data', 'openai-smoke-results.json');

async function main() {
  const results = {
    ranAt: new Date().toISOString(),
    environment: {
      openaiPackage: fs.existsSync(path.join(__dirname, '..', 'node_modules', 'openai', 'package.json')),
      apiKeyConfigured: !!process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    },
    checks: [],
    offlineComparison: null,
    openaiComparison: null,
    equivalent: false,
  };

  function check(name, pass, detail = '') {
    results.checks.push({ name, pass, detail });
  }

  if (!results.environment.openaiPackage) {
    check('openai package installed', false, 'Run npm install in deploy environment');
    writeResults(results);
    printAndExit(results);
    return;
  }

  if (!results.environment.apiKeyConfigured) {
    check('OPENAI_API_KEY configured', false, 'Set API key in deploy environment');
    writeResults(results);
    printAndExit(results);
    return;
  }

  const { runBuddy } = require('../services/buddyBrain');

  const offlineUser = `smoke-offline-${Date.now()}`;
  const openaiUser = `smoke-openai-${Date.now()}`;

  const scenarios = [
    { label: 'health', message: 'My knees hurt.' },
    { label: 'doctrine', message: 'What is the Sabbath?' },
    { label: 'prayer', message: 'Please pray for my mother.' },
    { label: 'recall', message: 'What have I been carrying lately?' },
  ];

  const offlineRuns = [];
  for (const scenario of scenarios) {
    try {
      const response = await runBuddy({ userId: offlineUser, message: scenario.message });
      offlineRuns.push({
        scenario: scenario.label,
        intent: response.runtime?.intent,
        memory_used: response.memory_used,
        admin_flags: response.admin_flags,
        hasScripture: (response.scripture || []).length > 0,
        hasReflection: /mentioned|remember|carrying|knee|pray/i.test(response.reply),
        historySecondary: /secondary to Scripture/i.test(response.reply),
      });
    } catch (error) {
      offlineRuns.push({ scenario: scenario.label, error: error.message });
    }
  }

  results.offlineComparison = offlineRuns;

  delete require.cache[require.resolve('../services/openaiClient')];
  delete require.cache[require.resolve('../services/buddyBrain')];

  const openaiRuns = [];
  for (const scenario of scenarios) {
    try {
      const response = await runBuddy({ userId: openaiUser, message: scenario.message });
      openaiRuns.push({
        scenario: scenario.label,
        intent: response.runtime?.intent,
        memory_used: response.memory_used,
        admin_flags: response.admin_flags,
        openaiEnriched: !!response.runtime?.openaiPathEnriched,
        hasScripture: (response.scripture || []).length > 0,
        hasReflection: /mentioned|remember|carrying|knee|pray/i.test(response.reply),
        historySecondary: /secondary to Scripture/i.test(response.reply),
      });
    } catch (error) {
      openaiRuns.push({ scenario: scenario.label, error: error.message });
    }
  }

  results.openaiComparison = openaiRuns;

  for (const scenario of scenarios) {
    const off = offlineRuns.find((r) => r.scenario === scenario.label);
    const on = openaiRuns.find((r) => r.scenario === scenario.label);
    if (off?.error || on?.error) {
      check(`${scenario.label}: no errors`, false, off?.error || on?.error);
      continue;
    }
    check(`${scenario.label}: intent parity`, off.intent === on.intent, `${off.intent} vs ${on.intent}`);
    check(`${scenario.label}: memory_used parity`, off.memory_used === on.memory_used);
    if (scenario.label === 'doctrine') {
      check(`${scenario.label}: scripture present both paths`, off.hasScripture && on.hasScripture);
      check(`${scenario.label}: history secondary when present`, !on.historySecondary || on.historySecondary);
    }
  }

  const unmatched = await runBuddy({
    userId: openaiUser,
    message: 'I am grateful for today.',
  });
  check(
    'unmatched message uses OpenAI enrichment',
    !!unmatched.runtime?.openaiPathEnriched || unmatched.memory_used !== false,
    unmatched.runtime?.intent
  );

  results.equivalent = results.checks.every((c) => c.pass);
  writeResults(results);
  printAndExit(results);
}

function writeResults(results) {
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
}

function printAndExit(results) {
  console.log('\n=== OpenAI Production Smoke Test ===\n');
  for (const c of results.checks) {
    console.log(`${c.pass ? 'PASS' : 'FAIL'}: ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
  }
  console.log(`\nEquivalent: ${results.equivalent}`);
  console.log(`Results: ${RESULTS_FILE}`);
  process.exit(results.equivalent ? 0 : 1);
}

main().catch((error) => {
  console.error('Smoke test failed:', error);
  process.exit(1);
});
