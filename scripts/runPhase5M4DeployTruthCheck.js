#!/usr/bin/env node
/**
 * Phase 5M.4 — Deploy parity / live truth instrumentation check.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const REPORT = path.join(ROOT, 'Phase5M4DeployTruthCheckReport.md');

const FORBIDDEN_FINAL_PHRASES = [
  'I want to answer from Scripture directly',
  'Could you tell me a little more — which book, topic, or passage you mean',
  'Scripture invites us to cast our care upon God',
  'Yes — staying with Scripture, pork and shellfish remain unclean',
  'No. staying with Scripture',
];

const FINAL_PRODUCING_FILES = [
  'services/openAiFirstCompanionRuntime.js',
  'services/buddyBrain.js',
  'services/liveResponseOwner.js',
  'services/directAnswerFormatter.js',
  'services/bibleCompanionOrchestrator.js',
  'services/companionResponseBuilder.js',
  'services/practicalWisdomEngine.js',
  'services/prayerCompanionEngine.js',
  'services/companionPresenceEngine.js',
  'services/companionIdentityEngine.js',
  'routes/buddy.js',
];

const FORBIDDEN_STAGED = [
  /^\.github\/workflows\//,
  /^data\//,
];

function git(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function scanForbiddenInFiles() {
  const hits = [];
  for (const rel of FINAL_PRODUCING_FILES) {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) continue;
    const lines = fs.readFileSync(full, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/FORBIDDEN|blocklist|scanForbidden|test\(|RegExp|\.includes\(/i.test(line)) continue;
      for (const phrase of FORBIDDEN_FINAL_PHRASES) {
        if (line.includes(phrase)) hits.push({ file: rel, phrase, line: i + 1 });
      }
    }
  }
  return hits;
}

function checkStaged() {
  const staged = git('git diff --cached --name-only').split('\n').filter(Boolean);
  const bad = [];
  for (const f of staged) {
    for (const re of FORBIDDEN_STAGED) {
      if (re.test(f)) bad.push(f);
    }
  }
  return { staged, bad };
}

function main() {
  const head = git('git rev-parse HEAD');
  const mainRef = git('git rev-parse origin/main') || git('git rev-parse main') || 'unknown';
  let pkgVersion = 'unknown';
  try {
    pkgVersion = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version || 'unknown';
  } catch {
    /* ignore */
  }

  const runtimePath = path.join(ROOT, 'services/openAiFirstCompanionRuntime.js');
  const runtimeSrc = fs.readFileSync(runtimePath, 'utf8');
  const buddySrc = fs.readFileSync(path.join(ROOT, 'routes/buddy.js'), 'utf8');
  const indexPath = path.join(ROOT, 'public/index.html');
  const indexSrc = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '';

  const checks = {
    liveTruthOrchestratorLog: runtimeSrc.includes('[LIVE_TRUTH_ORCHESTRATOR]'),
    liveTruthReturnLog: runtimeSrc.includes('[LIVE_TRUTH_RETURN]'),
    protectedIntentReroute: runtimeSrc.includes('[LIVE_TRUTH_PROTECTED_INTENT_REROUTE]'),
    buddyCallsRunBuddy: /runBuddy\s*\(/i.test(buddySrc),
    indexPostsBuddyChat: /\/buddy\/chat/i.test(indexSrc),
    forbiddenInFinalProducers: scanForbiddenInFiles(),
    staged: checkStaged(),
  };

  const failures = [];
  if (!checks.liveTruthOrchestratorLog) failures.push('missing LIVE_TRUTH_ORCHESTRATOR');
  if (!checks.liveTruthReturnLog) failures.push('missing LIVE_TRUTH_RETURN');
  if (!checks.buddyCallsRunBuddy) failures.push('routes/buddy.js does not call runBuddy');
  if (!checks.indexPostsBuddyChat) failures.push('public/index.html does not post to /buddy/chat');
  if (checks.forbiddenInFinalProducers.length) failures.push('forbidden phrases in final-producing files');
  if (checks.staged.bad.length) failures.push('forbidden files staged');

  const pass = failures.length === 0;

  const lines = [
    '# Phase 5M.4 Deploy Truth Check',
    '',
    `**Result:** ${pass ? 'PASS' : 'FAIL'}`,
    '',
    `- git HEAD: ${head}`,
    `- origin/main: ${mainRef}`,
    `- package version: ${pkgVersion}`,
    '',
    '## Checks',
    `- LIVE_TRUTH_ORCHESTRATOR: ${checks.liveTruthOrchestratorLog}`,
    `- LIVE_TRUTH_RETURN: ${checks.liveTruthReturnLog}`,
    `- Protected intent reroute: ${checks.protectedIntentReroute}`,
    `- runBuddy wired: ${checks.buddyCallsRunBuddy}`,
    `- /buddy/chat in index.html: ${checks.indexPostsBuddyChat}`,
    `- Forbidden phrases in producers: ${checks.forbiddenInFinalProducers.length}`,
    `- Bad staged files: ${checks.staged.bad.length}`,
    '',
    '## Failures',
    failures.length ? failures.map((f) => `- ${f}`).join('\n') : 'none',
    '',
  ];

  if (checks.forbiddenInFinalProducers.length) {
    lines.push('## Forbidden phrase hits');
    for (const h of checks.forbiddenInFinalProducers) {
      lines.push(`- ${h.file}: ${h.phrase}`);
    }
  }

  fs.writeFileSync(REPORT, lines.join('\n'));
  console.log(`Phase 5M.4 deploy truth: ${pass ? 'PASS' : 'FAIL'}`);
  if (failures.length) console.log('Failures:', failures.join(', '));
  process.exit(pass ? 0 : 1);
}

main();
