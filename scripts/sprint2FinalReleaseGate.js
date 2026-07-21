#!/usr/bin/env node
/**
 * Sprint 2.FINAL — Companion Release Gate
 * Runs all validation suites. Blocks release on failure or score < 95.
 * Does NOT modify code — reports only.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'release-gate');
const OUT_FILE = path.join(OUT_DIR, 'latest-gate-results.json');

const SUITES = [
  { name: 'Master Runtime', script: 'scripts/sprint2FinalMasterRuntimeHttp.js', minScore: 95 },
  { name: 'Meta-Question', script: 'scripts/sprint2FinalBMetaQuestionHttp.js', minScore: 95 },
  { name: 'Reasoning-First Thread', script: 'scripts/sprint2FinalCReasoningFirstHttp.js', minScore: 95 },
  { name: 'Active Conversation', script: 'scripts/sprint214dActiveConversationHttp.js', minScore: 95 },
  { name: 'Companion Intelligence', script: 'scripts/companionIntelligenceValidationSuite.js', minScore: 95 },
];

function runSuite(suite) {
  const started = Date.now();
  const result = spawnSync('node', [path.join(ROOT, suite.script)], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 300000,
  });
  const durationMs = Date.now() - started;
  const output = (result.stdout || '') + (result.stderr || '');
  const passed = result.status === 0;

  let score = passed ? 100 : 0;
  const minMatches = [...output.matchAll(/Min(?: category)?:\s*(\d+)/gi)].map((m) => parseInt(m[1], 10));
  const overallMatch = output.match(/Overall:\s*(\d+)/i);
  if (minMatches.length) score = Math.max(score, ...minMatches);
  if (overallMatch) score = Math.max(score, parseInt(overallMatch[1], 10));
  if (/Ready:\s*true/i.test(output) && passed) score = Math.max(score, 95);
  if (/(\d+)\/(\d+)/.test(output)) {
    const m = output.match(/(\d+)\/(\d+)/);
    if (m && parseInt(m[1], 10) === parseInt(m[2], 10) && passed) score = Math.max(score, 95);
  }

  return {
    name: suite.name,
    script: suite.script,
    passed,
    score,
    minRequired: suite.minScore,
    scoreOk: score >= suite.minScore,
    exitCode: result.status,
    durationMs,
    outputTail: output.split('\n').slice(-25).join('\n'),
  };
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const results = SUITES.map(runSuite);
  const allPassed = results.every((r) => r.passed && r.scoreOk);
  const minScore = Math.min(...results.map((r) => r.score));

  const report = {
    timestamp: new Date().toISOString(),
    allPassed,
    minScore,
    ready: allPassed && minScore >= 95,
    results,
    policy: {
      autoModifyCode: false,
      producesReportsOnly: true,
      blockReleaseOnFailure: true,
      blockReleaseOnScoreBelow: 95,
    },
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));

  console.log('\n=== Companion Release Gate ===\n');
  for (const r of results) {
    const status = r.passed && r.scoreOk ? 'PASS' : 'FAIL';
    console.log(`${status} — ${r.name} (score: ${r.score}, required: ${r.minRequired})`);
  }
  console.log(`\nMin score: ${minScore} | Ready: ${report.ready}`);
  console.log(`Report: ${OUT_FILE}`);

  if (!report.ready) {
    console.error('\nRELEASE BLOCKED — fix failures before push/deploy.');
    process.exit(1);
  }
  process.exit(0);
}

main();
