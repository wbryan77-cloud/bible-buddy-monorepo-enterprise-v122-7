#!/usr/bin/env node
/**
 * Phase 5J.1 — Verify required Phase 5E–5J runtime files are tracked in Git.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

const REQUIRED_FILES = [
  'services/bibleCompanionOrchestrator.js',
  'services/companionIntentIntelligence.js',
  'services/relationshipContextModel.js',
  'services/companionMemoryManager.js',
  'services/companionResponseBuilder.js',
  'services/relationshipMemoryEngine.js',
  'services/practicalGuidanceEngine.js',
  'services/companionStyleGuard.js',
  'services/scriptureReasoningPlanner.js',
  'services/noGlitchTurnContract.js',
  'services/bibleNaturalConcordanceBuilder.js',
  'services/bibleSemanticConceptNormalizer.js',
  'services/bibleWordSenseEngine.js',
  'services/bncSafetyValidator.js',
  'services/followUpContextResolver.js',
  'services/twoWitnessStandard.js',
  'services/directAnswerFormatter.js',
  'services/bibleConceptConcordance.js',
  'services/bibleWideReasoningEngine.js',
  'services/userCorrectionMemory.js',
  'services/reflectionMemoryEngine.js',
  'services/runtimeHealthMonitor.js',
  'services/responseGuarantee.js',
  'services/safeJsonlWriter.js',
  'routes/alphaAdmin.js',
  'routes/alphaTest.js',
  'services/alphaConversationCapture.js',
  'services/alphaFeedbackCapture.js',
  'services/alphaIssueAggregator.js',
  'services/alphaNotificationScheduler.js',
  'services/alphaTesterManager.js',
  'admin/alpha-dashboard.html',
  'admin/alpha-test.html',
  'routes/buddy.js',
  'server.js',
  'scripts/runPhase5JConversationEvalPack.js',
  'scripts/runPhase5JAlphaLoadSmoke.js',
  'scripts/runPhase5JAlphaIssueAggregation.js',
  'scripts/runPhase5IRelationshipIntelligenceRegression.js',
  'scripts/runPhase5HCompanionIntentIntelligenceRegression.js',
  'scripts/runPhase5FNoGlitchMemoryReasoningRegression.js',
  'scripts/runPhase5EBibleNaturalConcordanceRegression.js',
  'scripts/runPhase5BLiveHttpRegression.js',
  'scripts/runPhase5J1ModuleLoadAudit.js',
  'services/conversationAnchorEngine.js',
  'services/humanNeedDetector.js',
  'services/companionCuriosityEngine.js',
  'services/practicalWisdomEngine.js',
  'services/prayerCompanionEngine.js',
  'services/companionIdentityEngine.js',
  'services/relationshipSummaryEngine.js',
  'public/index.html',
  'scripts/runPhase5KRelationshipDepthRegression.js',
];

const FORBIDDEN_STAGED_PATTERNS = [
  /^\.env$/,
  /^data\//,
  /\.jsonl$/,
  /^docs\/evidence-candidates\//,
  /^services\/evidenceCards\//,
  /^docs\/bible-learning\/approved-doctrine-registry\.json$/,
  /^corpus\//,
  /alpha-conversations\.jsonl$/,
  /alpha-feedback\.jsonl$/,
  /buddy-sessions\.jsonl$/,
  /runtime-health-history\.jsonl$/,
];

function git(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function checkTracked() {
  const missing = [];
  const presentUntracked = [];
  for (const rel of REQUIRED_FILES) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
      missing.push({ file: rel, reason: 'file_not_on_disk' });
      continue;
    }
    try {
      execSync(`git ls-files --error-unmatch "${rel}"`, { cwd: ROOT, stdio: 'pipe' });
    } catch {
      missing.push({ file: rel, reason: 'not_tracked_in_git' });
      presentUntracked.push(rel);
    }
  }
  return { missing, presentUntracked };
}

function checkStaged() {
  const staged = git('git diff --cached --name-only').split('\n').filter(Boolean);
  const forbidden = [];
  for (const f of staged) {
    for (const re of FORBIDDEN_STAGED_PATTERNS) {
      if (re.test(f)) forbidden.push(f);
    }
    if (/OPENAI_API_KEY|sk-[a-zA-Z0-9]/i.test(f)) forbidden.push(f);
  }
  if (staged.includes('package.json') || staged.includes('package-lock.json')) {
    forbidden.push('package.json or package-lock.json (requires explicit approval)');
  }
  return { staged, forbidden };
}

async function runChild(script) {
  const { spawnSync } = require('child_process');
  const r = spawnSync('node', [path.join('scripts', script)], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 600000,
  });
  return { script, ok: r.status === 0, code: r.status, out: (r.stdout || r.stderr || '').slice(-500) };
}

async function main() {
  const tracked = checkTracked();
  const staged = checkStaged();

  const testResults = [];
  if (tracked.missing.length === 0) {
    testResults.push(await runChild('runPhase5J1ModuleLoadAudit.js'));
    testResults.push(await runChild('runPhase5BLiveHttpRegression.js'));
    testResults.push(await runChild('runPhase5JConversationEvalPack.js'));
    testResults.push(await runChild('runPhase5JAlphaLoadSmoke.js'));
    testResults.push(await runChild('runPhase5IRelationshipIntelligenceRegression.js'));
    testResults.push(await runChild('runPhase5HCompanionIntentIntelligenceRegression.js'));
    testResults.push(await runChild('runPhase5FNoGlitchMemoryReasoningRegression.js'));
    testResults.push(await runChild('runPhase5EBibleNaturalConcordanceRegression.js'));
    testResults.push(await runChild('runPhase5ABibleCompanionOrchestrationRegression.js'));
    testResults.push(await runChild('runPhase4HDoctrineParityRegression.js'));
  }

  const testsPassed = testResults.filter((t) => t.ok).length;
  const testsTotal = testResults.length;
  const pass =
    tracked.missing.length === 0 &&
    staged.forbidden.length === 0 &&
    testsTotal > 0 &&
    testsPassed === testsTotal;

  const manifestMd = [
    '# Phase 5J.1 Required File Manifest',
    '',
    `**Date:** ${new Date().toISOString()}`,
    `**Tracked:** ${REQUIRED_FILES.length - tracked.missing.length}/${REQUIRED_FILES.length}`,
    '',
    '## Missing from Git',
    ...tracked.missing.map((m) => `- ${m.file} (${m.reason})`),
    '',
    '## Untracked on disk (need staging)',
    ...tracked.presentUntracked.map((f) => `- ${f}`),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, 'Phase5J1RequiredFileManifest.md'), manifestMd, 'utf8');

  const stagingMd = [
    '# Phase 5J.1 Staging Safety Report',
    '',
    `**Forbidden staged:** ${staged.forbidden.length}`,
    staged.forbidden.length ? staged.forbidden.map((f) => `- ${f}`).join('\n') : 'None',
    '',
    `**Staged files:** ${staged.staged.length}`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, 'Phase5J1StagingSafetyReport.md'), stagingMd, 'utf8');

  const gateMd = [
    '# Phase 5J.1 Deployment Integrity Gate Report',
    '',
    `**Result:** ${pass ? 'PASS' : 'FAIL'}`,
    `**Missing tracked files:** ${tracked.missing.length}`,
    `**Forbidden staged:** ${staged.forbidden.length}`,
    `**Tests:** ${testsPassed}/${testsTotal}`,
    '',
    ...testResults.map((t) => `- [${t.ok ? 'PASS' : 'FAIL'}] ${t.script}`),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, 'Phase5J1DeploymentIntegrityGateReport.md'), gateMd, 'utf8');

  const readinessMd = [
    '# Phase 5J.1 Final Deploy Readiness',
    '',
    `- Required files tracked: ${tracked.missing.length === 0 ? 'yes' : 'no'}`,
    `- Safe to commit: ${tracked.missing.length === 0 && staged.forbidden.length === 0 ? 'yes' : 'no'}`,
    `- Safe to push: ${pass ? 'yes' : 'no'}`,
    `- Safe for controlled deploy: ${pass ? 'yes' : 'no'}`,
    '',
    'Run `bash scripts/phase5j1-git-add-alpha-runtime.sh` then re-run this gate.',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, 'Phase5J1FinalDeployReadiness.md'), readinessMd, 'utf8');

  console.log(`Phase5J1 gate: ${pass ? 'PASS' : 'FAIL'} | missing=${tracked.missing.length} forbidden=${staged.forbidden.length} tests=${testsPassed}/${testsTotal}`);
  if (!pass) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
