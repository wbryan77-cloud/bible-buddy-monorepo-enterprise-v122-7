#!/usr/bin/env node
/**
 * Phase 5M — Deploy parity gate: no workflow staging, required files, live owner path.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const REPORT = path.join(ROOT, 'Phase5MDeployParityReport.md');

const REQUIRED = [
  'services/liveResponseOwner.js',
  'services/singleCompanionContract.js',
  'services/companionPresenceEngine.js',
  'services/bibleCompanionOrchestrator.js',
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

function checkLivePath() {
  const buddy = fs.readFileSync(path.join(ROOT, 'routes/buddy.js'), 'utf8');
  const brain = fs.readFileSync(path.join(ROOT, 'services/buddyBrain.js'), 'utf8');
  const owner = fs.existsSync(path.join(ROOT, 'services/liveResponseOwner.js'));
  const contract = fs.existsSync(path.join(ROOT, 'services/singleCompanionContract.js'));
  return {
    buddyRoutesChat: /buddy\/chat|runBuddy/i.test(buddy),
    finalizeLiveResponse: brain.includes('finalizeLiveResponse'),
    liveOwnerFile: owner,
    contractFile: contract,
  };
}

async function testForbiddenRepair() {
  const { enforceSingleCompanionContract, detectForbiddenOldPath } = require('../services/singleCompanionContract');
  const samples = [
    { reply: 'Yes — staying with Scripture, pork is unclean.', contract: { message: 'can we eat pork' } },
    { reply: 'Absolutely — staying with the Bible text: Acts 10.', contract: { message: 'Acts 10' } },
    { reply: 'Could you tell me a little more — which book, topic, or passage you mean?', contract: { message: 'how do I explain', hasEstablishedTopic: true } },
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
  const livePath = checkLivePath();
  const phraseFails = await testForbiddenRepair();

  const workflowInLastCommit = (() => {
    try {
      const last = git('git diff-tree --no-commit-id --name-only -r HEAD');
      return last.split('\n').some((f) => f.startsWith('.github/workflows/'));
    } catch {
      return false;
    }
  })();

  const pass =
    staged.forbidden.length === 0 &&
    staged.workflowStaged.length === 0 &&
    missing.filter((m) => m.reason === 'missing_on_disk').length === 0 &&
    livePath.finalizeLiveResponse &&
    livePath.liveOwnerFile &&
    livePath.contractFile &&
    phraseFails.length === 0;

  const md = [
    '# Phase 5M Deploy Parity Report',
    '',
    `**Result:** ${pass ? 'PASS' : 'FAIL'}`,
    `**Workflow files staged:** ${staged.workflowStaged.length}`,
    `**Forbidden staged:** ${staged.forbidden.length}`,
    `**Required missing on disk:** ${missing.filter((m) => m.reason === 'missing_on_disk').length}`,
    `**Untracked required:** ${missing.filter((m) => m.reason === 'not_tracked').length}`,
    `**Workflow in HEAD commit:** ${workflowInLastCommit ? 'yes (push may need workflow scope — exclude before push)' : 'no'}`,
    `**liveResponseOwner wired:** ${livePath.finalizeLiveResponse ? 'yes' : 'no'}`,
    `**Phrase repair failures:** ${phraseFails.length}`,
    '',
    '## GitHub push note',
    workflowInLastCommit
      ? 'HEAD contains workflow file — reset workflow from origin/main before push OR use workflow token scope.'
      : 'No workflow in HEAD — push should not require workflow scope if staging script excludes workflows.',
    '',
  ].join('\n');
  fs.writeFileSync(REPORT, md, 'utf8');
  console.log(`Phase5M deploy parity: ${pass ? 'PASS' : 'FAIL'}`);
  if (!pass) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
