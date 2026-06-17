#!/usr/bin/env node
/**
 * Phase 5L — No-regression gate: staging safety + live owner + forbidden phrases.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const REPORT = path.join(ROOT, 'Phase5LNoRegressionGateReport.md');

const REQUIRED_LIVE = [
  'services/liveResponseOwner.js',
  'services/singleCompanionContract.js',
  'services/companionPresenceEngine.js',
  'services/bibleCompanionOrchestrator.js',
  'services/buddyBrain.js',
  'services/openAiFirstCompanionRuntime.js',
  'server.js',
  'routes/buddy.js',
];

const FORBIDDEN_STAGED = [
  /^\.github\/workflows\//,
  /^\.env$/,
  /^data\//,
  /^docs\/evidence-candidates\//,
  /\.jsonl$/,
  /transcript/i,
];

function git(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function checkStaged() {
  const staged = git('git diff --cached --name-only').split('\n').filter(Boolean);
  const forbidden = [];
  for (const f of staged) {
    for (const re of FORBIDDEN_STAGED) {
      if (re.test(f)) forbidden.push(f);
    }
  }
  return { staged, forbidden };
}

function checkTracked() {
  const missing = [];
  for (const rel of REQUIRED_LIVE) {
    if (!fs.existsSync(path.join(ROOT, rel))) {
      missing.push({ file: rel, reason: 'missing_on_disk' });
      continue;
    }
    try {
      execSync(`git ls-files --error-unmatch "${rel}"`, { cwd: ROOT, stdio: 'pipe' });
    } catch {
      missing.push({ file: rel, reason: 'not_tracked' });
    }
  }
  return missing;
}

function checkTrackedOrOnDisk() {
  const missing = checkTracked();
  const onDiskOnly = missing.filter((m) => m.reason === 'not_tracked');
  return { missing: missing.filter((m) => m.reason === 'missing_on_disk'), onDiskUntracked: onDiskOnly };
}

async function testForbiddenPhrases() {
  const { detectForbiddenOldPath, enforceSingleCompanionContract } = require('../services/singleCompanionContract');
  const badSamples = [
    { reply: 'Could you tell me a little more — which book, topic, or passage you mean?', contract: { message: 'how do I explain it', hasEstablishedTopic: true, humanNeed: 'practical_words_to_say' } },
    { reply: "Absolutely — staying with the Bible text: Acts 10 is about people.", contract: { message: 'Acts 10' } },
    { reply: "No. staying with scripture, pork is unclean", contract: { message: 'can we eat pork' } },
  ];
  const failures = [];
  for (const s of badSamples) {
    const enforced = enforceSingleCompanionContract({ draftReply: s.reply, contract: s.contract, scripture: [] });
    const still = detectForbiddenOldPath(enforced.reply, s.contract);
    if (still.length) failures.push({ sample: s.reply.slice(0, 60), still });
  }
  return failures;
}

async function testLiveOwnerRequired() {
  const src = fs.readFileSync(path.join(ROOT, 'services/buddyBrain.js'), 'utf8');
  return src.includes('finalizeLiveResponse') && fs.existsSync(path.join(ROOT, 'services/liveResponseOwner.js'));
}

async function runChild(script) {
  const { spawnSync } = require('child_process');
  const r = spawnSync('node', [path.join('scripts', script)], { cwd: ROOT, encoding: 'utf8', timeout: 600000 });
  return { script, ok: r.status === 0, code: r.status };
}

async function main() {
  const staged = checkStaged();
  const tracked = checkTrackedOrOnDisk();
  const missing = tracked.missing;
  const phraseFails = await testForbiddenPhrases();
  const liveOwnerOk = await testLiveOwnerRequired();

  const childTests = [];
  const readyForLive =
    missing.length === 0 &&
    staged.forbidden.length === 0 &&
    phraseFails.length === 0 &&
    liveOwnerOk;
  if (readyForLive) {
    childTests.push(await runChild('runPhase5LLiveThreadRegression.js'));
  }

  const pass =
    staged.forbidden.length === 0 &&
    missing.length === 0 &&
    phraseFails.length === 0 &&
    liveOwnerOk &&
    childTests.every((t) => t.ok);

  const md = [
    '# Phase 5L No-Regression Gate Report',
    '',
    `**Result:** ${pass ? 'PASS' : 'FAIL'}`,
    `**Forbidden staged:** ${staged.forbidden.length}`,
    `**On disk untracked (stage before deploy):** ${tracked.onDiskUntracked.length}`,
    `**Phrase repair failures:** ${phraseFails.length}`,
    `**Live owner wired:** ${liveOwnerOk ? 'yes' : 'no'}`,
    `**Live thread:** ${childTests[0]?.ok ? 'PASS' : childTests.length ? 'FAIL' : 'skipped'}`,
    '',
  ].join('\n');
  fs.writeFileSync(REPORT, md, 'utf8');
  console.log(`Phase5L gate: ${pass ? 'PASS' : 'FAIL'}`);
  if (!pass) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
