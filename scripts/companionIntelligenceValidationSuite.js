#!/usr/bin/env node
/**
 * Companion Intelligence Validation Suite
 *
 * Unified POST /buddy/chat validation across companion quality dimensions:
 * - Sprint 2.14 companion acceptance (memory, warmth, listening, continue study)
 * - Sprint 2.14B Sabbath history depth
 * - Sprint 2.14C natural reasoning restoration
 *
 * Usage:
 *   node scripts/companionIntelligenceValidationSuite.js
 *   node scripts/companionIntelligenceValidationSuite.js --json-only
 */

const fs = require('fs');
const path = require('path');
const { runSuite: run214 } = require('./sprint214AcceptanceHttp');
const { runSuite: run214b } = require('./sprint214bSabbathHistoryHttp');
const { runSuite: run214c } = require('./sprint214cNaturalReasoningHttp');
const { buildCompanionIntelligence } = require('../services/companionIntelligence');

const OUT_DIR = path.join(__dirname, '..', 'docs', 'companion-intelligence');
const MIN_GATE = Number(process.env.COMPANION_INTEL_MIN_SCORE || 95);
const jsonOnly = process.argv.includes('--json-only');

function aggregateIntelligenceScores({ sprint214, sprint214b, sprint214c }) {
  const s214 = sprint214.scores || {};
  const s214b = sprint214b.scoring?.scores || {};
  const s214c = sprint214c.scoring?.scores || {};

  const intelligence = {
    helpfulness: Math.round((s214.Accuracy + s214['Companion Presence'] + (s214c.directness || 0)) / 3),
    feltUnderstood: Math.round(
      (s214.Listening + s214['Follow-Up Understanding'] + (s214c.questionUnderstanding || 0)) / 3
    ),
    feltPeaceful: Math.round((s214.Warmth + s214['Organic Flow'] + (s214c.companionTone || 0)) / 3),
    scriptureBalance: Math.round(
      (s214['Scripture Grounding'] + (s214c.scriptureGrounding || 0) + (s214b.scriptureFirst || 0)) / 3
    ),
    memoryIntelligence: Math.round((s214.Memory + (s214c.memoryRelevance || 0)) / 2),
    historicalReasoning: Math.round(
      ((s214['Historical Routing'] || 0) + (s214b.historicalSpecificity || 0) + (s214c.historicalReasoning || 0)) / 3
    ),
    naturalConversation: Math.round(
      (s214['Natural Conversation'] + (s214c.noCannedRepetition || 0) + (s214c.warmth || 0)) / 3
    ),
    studyContinuity: Math.round((s214['Continue Study'] + (s214c.noPrematureStudyPrompt || 0)) / 2),
    reasoningDepth: Math.round(((s214c.depth || 0) + (s214b.directness || 0)) / 2),
    stability: sprint214.passed === sprint214.total ? 97 : Math.round((sprint214.passed / sprint214.total) * 100),
  };

  const values = Object.values(intelligence);
  const overall = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  const minCategory = Math.min(...values);
  const allCategoriesPass = minCategory >= MIN_GATE;

  return { intelligence, overall, minCategory, allCategoriesPass };
}

function buildSuiteSummary({ sprint214, sprint214b, sprint214c, aggregate }) {
  const totalTests = sprint214.total + sprint214b.total + sprint214c.total;
  const totalPassed = sprint214.passed + sprint214b.passed + sprint214c.passed;

  return {
    timestamp: new Date().toISOString(),
    suite: 'Companion Intelligence Validation',
    route: 'POST /buddy/chat (local runBuddy)',
    minGate: MIN_GATE,
    totals: {
      tests: totalTests,
      passed: totalPassed,
      failed: totalTests - totalPassed,
      suites: 3,
      suitesPassed: [sprint214, sprint214b, sprint214c].filter((s) => {
        const score = s.acceptanceScore || s.scoring?.overall || 0;
        return s.passed === s.total && score >= MIN_GATE;
      }).length,
    },
    suites: {
      sprint214_companion: {
        name: 'Sprint 2.14 Companion Acceptance',
        passed: sprint214.passed,
        total: sprint214.total,
        score: sprint214.acceptanceScore,
        allCategories95Plus: sprint214.allCategories95Plus,
        categories: sprint214.scores,
      },
      sprint214b_sabbath_history: {
        name: 'Sprint 2.14B Sabbath History Depth',
        passed: sprint214b.passed,
        total: sprint214b.total,
        score: sprint214b.scoring?.overall,
        categories: sprint214b.scoring?.scores,
      },
      sprint214c_natural_reasoning: {
        name: 'Sprint 2.14C Natural Reasoning',
        passed: sprint214c.passed,
        total: sprint214c.total,
        score: sprint214c.scoring?.overall,
        minCategory: Math.min(...Object.values(sprint214c.scoring?.scores || { x: 0 })),
        categories: sprint214c.scoring?.scores,
      },
    },
    companionIntelligence: aggregate.intelligence,
    overallScore: aggregate.overall,
    minCategoryScore: aggregate.minCategory,
    allCategoriesPass: aggregate.allCategoriesPass,
    readiness:
      aggregate.allCategoriesPass &&
      totalPassed === totalTests &&
      sprint214c.scoring?.overall >= MIN_GATE
        ? 'READY'
        : 'NEEDS_REVIEW',
    framework: buildCompanionIntelligence({ includeSummary: false }),
  };
}

function printHumanReport(summary) {
  console.error('\n═══════════════════════════════════════════════════');
  console.error('  COMPANION INTELLIGENCE VALIDATION SUITE');
  console.error('═══════════════════════════════════════════════════\n');

  for (const [key, suite] of Object.entries(summary.suites)) {
    const status = suite.passed === suite.total ? 'PASS' : 'FAIL';
    console.error(`  ${suite.name}`);
    console.error(`    ${status}  ${suite.passed}/${suite.total} tests  score ${suite.score}`);
  }

  console.error('\n  Intelligence Categories (gate: ' + MIN_GATE + '+)');
  for (const [cat, score] of Object.entries(summary.companionIntelligence)) {
    const mark = score >= MIN_GATE ? '✓' : '✗';
    console.error(`    ${mark} ${cat}: ${score}`);
  }

  console.error(`\n  Overall: ${summary.overallScore}  |  Min category: ${summary.minCategoryScore}`);
  console.error(`  Readiness: ${summary.readiness}`);
  console.error(`  Tests: ${summary.totals.passed}/${summary.totals.tests} passed\n`);
}

async function runCompanionIntelligenceValidationSuite() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const runId = `${Date.now()}-${process.pid}`;

  const sprint214 = await run214({ userPrefix: `s214-${runId}`, quiet: true });
  const sprint214b = await run214b({ userPrefix: `s214b-${runId}`, quiet: true });
  const sprint214c = await run214c({ userPrefix: `s214c-${runId}`, quiet: true });

  const aggregate = aggregateIntelligenceScores({ sprint214, sprint214b, sprint214c });
  const summary = buildSuiteSummary({ sprint214, sprint214b, sprint214c, aggregate });

  const outPath = path.join(OUT_DIR, 'validation-results.json');
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));

  if (!jsonOnly) {
    printHumanReport(summary);
  }

  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

if (require.main === module) {
  runCompanionIntelligenceValidationSuite()
    .then((summary) => {
      const ok =
        summary.allCategoriesPass &&
        summary.totals.passed === summary.totals.tests &&
        summary.readiness === 'READY';
      if (!ok) process.exit(1);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runCompanionIntelligenceValidationSuite, aggregateIntelligenceScores };
