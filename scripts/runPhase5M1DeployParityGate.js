#!/usr/bin/env node
/**
 * Phase 5M.1 — Deploy parity gate: known-working path live, forbidden phrases blocked.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const REPORT = path.join(ROOT, 'Phase5M1DeployParityReport.md');

const REQUIRED = [
  'services/liveResponseOwner.js',
  'services/singleCompanionContract.js',
  'services/bibleCompanionOrchestrator.js',
  'services/companionResponseBuilder.js',
  'services/practicalGuidanceEngine.js',
  'services/prayerCompanionEngine.js',
  'services/openAiFirstCompanionRuntime.js',
  'services/buddyBrain.js',
  'routes/buddy.js',
  'server.js',
];

const FORBIDDEN_STAGED = [
  /^\.github\/workflows\//,
  /^\.env$/,
  /^data\//,
  /^docs\/evidence-candidates\//,
  /\.jsonl$/,
];

const KNOWN_PATH_MARKERS = [
  'withBuddyChatGuarantee',
  'runBuddy',
  'openAiFirstCompanionRuntime',
  'runBibleCompanionOrchestrator',
  'finalizeBuddyResponse',
  'finalizeLiveResponse',
  'enforceSingleCompanionContract',
];

function git(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function checkStaged() {
  const staged = git('git diff --cached --name-only').split('\n').filter(Boolean);
  const forbidden = [];
  const workflowStaged = staged.filter((f) => f.startsWith('.github/workflows/'));
  for (const f of staged) {
    for (const re of FORBIDDEN_STAGED) {
      if (re.test(f)) forbidden.push(f);
    }
  }
  return { staged, forbidden, workflowStaged };
}

function checkTracked() {
  const missing = [];
  for (const rel of REQUIRED) {
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

function checkKnownWorkingPath() {
  const buddy = fs.readFileSync(path.join(ROOT, 'routes/buddy.js'), 'utf8');
  const brain = fs.readFileSync(path.join(ROOT, 'services/buddyBrain.js'), 'utf8');
  const runtime = fs.readFileSync(path.join(ROOT, 'services/openAiFirstCompanionRuntime.js'), 'utf8');
  const orchestrator = fs.readFileSync(path.join(ROOT, 'services/bibleCompanionOrchestrator.js'), 'utf8');
  const owner = fs.readFileSync(path.join(ROOT, 'services/liveResponseOwner.js'), 'utf8');

  return {
    buddyGuarantee: /withBuddyChatGuarantee/i.test(buddy),
    runBuddy: /runBuddy/i.test(buddy),
    openAiRuntime: runtime.includes('runBibleCompanionOrchestrator'),
    orchestratorExport: orchestrator.includes('runBibleCompanionOrchestrator'),
    finalizeBuddy: brain.includes('finalizeBuddyResponse'),
    finalizeLive: brain.includes('finalizeLiveResponse'),
    contractEnforce: owner.includes('enforceSingleCompanionContract'),
    companionBuilder: fs.existsSync(path.join(ROOT, 'services/companionResponseBuilder.js')),
    practicalGuidance: fs.existsSync(path.join(ROOT, 'services/practicalGuidanceEngine.js')),
  };
}

async function testForbiddenRepair() {
  const { enforceSingleCompanionContract, detectForbiddenOldPath } = require('../services/singleCompanionContract');
  const samples = [
    { reply: 'Yes — staying with Scripture, pork is unclean.', contract: { message: 'can we eat pork' } },
    { reply: 'No. staying with Scripture', contract: { message: 'can we eat pork' } },
    { reply: 'Absolutely — staying with the Bible text: Acts 10.', contract: { message: 'Acts 10' } },
    {
      reply: 'Could you tell me a little more — which book, topic, or passage you mean?',
      contract: { message: 'how do I explain', hasEstablishedTopic: true },
    },
    {
      reply: "I'm here to pray with you. Scripture invites us to pray.",
      contract: { message: 'pray with me', humanNeed: 'prayer' },
    },
    { reply: 'Pork is unclean. Scripture witnesses: Leviticus 11.', contract: { message: 'pork' } },
  ];
  const fails = [];
  for (const s of samples) {
    const e = enforceSingleCompanionContract({ draftReply: s.reply, contract: s.contract, scripture: [] });
    const still = detectForbiddenOldPath(e.reply, s.contract);
    if (still.length) fails.push({ still, preview: e.reply.slice(0, 80) });
  }
  return fails;
}

async function main() {
  const staged = checkStaged();
  const missing = checkTracked();
  const pathCheck = checkKnownWorkingPath();
  const phraseFails = await testForbiddenRepair();

  const pathOk =
    pathCheck.buddyGuarantee &&
    pathCheck.runBuddy &&
    pathCheck.openAiRuntime &&
    pathCheck.finalizeBuddy &&
    pathCheck.finalizeLive &&
    pathCheck.contractEnforce &&
    pathCheck.companionBuilder &&
    pathCheck.practicalGuidance;

  const pass =
    staged.forbidden.length === 0 &&
    staged.workflowStaged.length === 0 &&
    missing.filter((m) => m.reason === 'missing_on_disk').length === 0 &&
    pathOk &&
    phraseFails.length === 0;

  const md = [
    '# Phase 5M.1 Deploy Parity Report',
    '',
    `**Result:** ${pass ? 'PASS' : 'FAIL'}`,
    `**Known-working path live:** ${pathOk ? 'yes' : 'no'}`,
    `**Workflow files staged:** ${staged.workflowStaged.length}`,
    `**Forbidden staged:** ${staged.forbidden.length}`,
    `**Required missing on disk:** ${missing.filter((m) => m.reason === 'missing_on_disk').length}`,
    `**Untracked required:** ${missing.filter((m) => m.reason === 'not_tracked').length}`,
    `**Phrase repair failures:** ${phraseFails.length}`,
    '',
    '## Path markers',
    ...Object.entries(pathCheck).map(([k, v]) => `- ${k}: ${v}`),
    '',
    '## Expected live chain',
    KNOWN_PATH_MARKERS.join(' → '),
    '',
  ].join('\n');
  fs.writeFileSync(REPORT, md, 'utf8');
  console.log(`Phase5M.1 deploy parity: ${pass ? 'PASS' : 'FAIL'}`);
  if (!pass) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
