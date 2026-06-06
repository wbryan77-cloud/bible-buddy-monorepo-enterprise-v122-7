#!/usr/bin/env node
/**
 * Deploy parity verification — static wiring + runtime smoke.
 * Output: docs/regression-trace/deploy-parity-verification.json
 * Does NOT deploy or push.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'regression-trace', 'deploy-parity-verification.json');

const REQUIRED_FILES = [
  'services/openAiFirstCompanionRuntime.js',
  'services/currentMessageIntent.js',
  'services/directnessGuard.js',
  'services/forbiddenProseGuard.js',
  'services/reasonFirstComposer.js',
  'services/retrievalEvidencePack.js',
  'services/ownershipAntiOverrideGuard.js',
  'services/coreResponseGuards.js',
  'services/coreRestorationDebug.js',
  'services/buddyRuntimeConfig.js',
  'services/liveRequestTrace.js',
  'services/buddyBrain.js',
  'routes/buddy.js',
  'server.js',
  'render.yaml',
  'scripts/emergencyHardCutoverRegression.js',
];

const GUARD_CHAIN = [
  { file: 'services/openAiFirstCompanionRuntime.js', pattern: /require\('\.\/directnessGuard'\)/ },
  { file: 'services/openAiFirstCompanionRuntime.js', pattern: /require\('\.\/forbiddenProseGuard'\)/ },
  { file: 'services/openAiFirstCompanionRuntime.js', pattern: /evaluateDirectness/ },
  { file: 'services/openAiFirstCompanionRuntime.js', pattern: /detectForbiddenProse/ },
  { file: 'services/openAiFirstCompanionRuntime.js', pattern: /composeReasonFirstReply/ },
  { file: 'services/retrievalEvidencePack.js', pattern: /require\('\.\/currentMessageIntent'\)/ },
  { file: 'services/buddyBrain.js', pattern: /runOpenAiFirstCompanionRuntime/ },
  { file: 'services/buddyBrain.js', pattern: /runMasterBuddyRuntime/ },
  { file: 'server.js', pattern: /logStartupDiagnostics/ },
  { file: 'routes/buddy.js', pattern: /buildLiveRequestTrace/ },
];

function git(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch (e) {
    return null;
  }
}

function fileStatus(relPath) {
  const abs = path.join(ROOT, relPath);
  const exists = fs.existsSync(abs);
  const tracked = exists ? git(`git ls-files --error-unmatch ${relPath} 2>/dev/null`) !== null : false;
  const committed = tracked;
  let pushed = null;
  if (tracked) {
    const ahead = git(`git rev-list origin/main..HEAD -- ${relPath} 2>/dev/null`);
    pushed = ahead !== null && ahead.length === 0;
  } else {
    pushed = false;
  }
  return { exists, tracked, committed, pushed };
}

function readLocal(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function readHead(rel) {
  return git(`git show HEAD:${rel} 2>/dev/null`);
}

function analyzeRunBuddy() {
  const local = readLocal('services/buddyBrain.js');
  const head = readHead('services/buddyBrain.js') || '';

  const localRoutes = {
    openAiFirst: /runOpenAiFirstCompanionRuntime/.test(local),
    master: /return runMasterBuddyRuntime/.test(local),
    hardCutoverWarn: /disabled by hard cutover/.test(local),
  };

  const headRoutes = {
    openAiFirst: /runOpenAiFirstCompanionRuntime/.test(head),
    master: /return runMasterBuddyRuntime/.test(head),
    hardCutoverWarn: /disabled by hard cutover/.test(head),
  };

  return {
    local: {
      routesTo: localRoutes.openAiFirst && !localRoutes.master
        ? 'openAiFirstCompanionRuntime'
        : localRoutes.master
          ? 'masterBuddyRuntime'
          : 'unknown',
      openAiFirstCompanionRuntime: localRoutes.openAiFirst,
      masterBuddyRuntimeCall: localRoutes.master,
      hardCutoverLock: localRoutes.hardCutoverWarn,
    },
    gitHead: {
      routesTo: headRoutes.master ? 'masterBuddyRuntime' : headRoutes.openAiFirst ? 'openAiFirstCompanionRuntime' : 'unknown',
      openAiFirstCompanionRuntime: headRoutes.openAiFirst,
      masterBuddyRuntimeCall: headRoutes.master,
      hardCutoverLock: headRoutes.hardCutoverWarn,
    },
  };
}

function verifyGuardImports() {
  const checks = [];
  for (const { file, pattern } of GUARD_CHAIN) {
    const src = readLocal(file);
    const pass = pattern.test(src);
    checks.push({ file, pattern: String(pattern), pass });
  }
  const buddyBrainMaster = checks.find((c) => c.file === 'services/buddyBrain.js' && String(c.pattern).includes('runMasterBuddyRuntime'));
  const masterDisabled = buddyBrainMaster ? !buddyBrainMaster.pass : true;
  return { checks, masterBuddyRuntimeDisabledInRunBuddy: masterDisabled };
}

async function runtimeSmoke() {
  process.env.BUDDY_RUNTIME = 'legacy';
  process.env.BUDDY_TEMPLATE_PROSE = '0';
  process.env.BUDDY_DISABLE_STUDY_FALLBACK = '1';
  process.env.BUDDY_DEBUG = '1';

  const { runBuddy } = require('../services/buddyBrain');
  const { clearActiveConversation } = require('../services/activeConversationManager');
  const userId = `deploy-parity-${Date.now()}`;
  clearActiveConversation(userId);

  const reply = await runBuddy({
    userId,
    message: 'Can I eat pork? Yes or no?',
    mode: 'COMPANION',
    personaKey: 'ADAPTIVE_COMPANION',
  });

  const dbg = reply.coreDebug || reply.runtime?.coreDebug || {};
  return {
    runtimeUsed: dbg.runtimeUsed || reply.runtime?.buddyRuntime || null,
    openAiFirstActive: dbg.runtimeUsed === 'core_openai_first' || reply.runtime?.buddyRuntime === 'core_openai_first',
    masterRoute: dbg.routeUsed || reply.runtime?.masterRoute || null,
    sourceGroundedResponderUsed: !!dbg.sourceGroundedResponderUsed,
    sabbathHistoryDeepResponderUsed: !!dbg.sabbathHistoryDeepResponderUsed,
    forbiddenPhraseDetected: !!dbg.forbiddenPhraseDetected,
    directnessGuardPresent: !!(reply.runtime?.directnessGuard || dbg.answerMatchesLatestQuestion !== undefined),
    currentIntent: dbg.currentIntent || reply.runtime?.currentIntent || null,
    finalAnswerAuthor: dbg.finalAnswerAuthor || null,
    openaiCalled: !!dbg.openaiCalled,
  };
}

async function main() {
  const headSha = git('git rev-parse HEAD');
  const originSha = git('git rev-parse origin/main');
  const branchStatus = git('git status -sb');

  const fileChecklist = REQUIRED_FILES.map((rel) => {
    const status = fileStatus(rel);
    let imported = null;
    let active = null;

    if (rel === 'services/openAiFirstCompanionRuntime.js') {
      imported = /require\('\.\/openAiFirstCompanionRuntime'\)/.test(readLocal('services/buddyBrain.js'));
      active = status.exists && imported;
    } else if (rel === 'services/currentMessageIntent.js') {
      imported = /currentMessageIntent/.test(readLocal('services/retrievalEvidencePack.js'));
      active = status.exists && imported;
    } else if (rel === 'services/directnessGuard.js') {
      imported = /directnessGuard/.test(readLocal('services/openAiFirstCompanionRuntime.js'));
      active = status.exists && imported;
    } else if (rel === 'services/forbiddenProseGuard.js') {
      imported = /forbiddenProseGuard/.test(readLocal('services/openAiFirstCompanionRuntime.js'));
      active = status.exists && imported;
    } else if (rel === 'scripts/emergencyHardCutoverRegression.js') {
      imported = true;
      active = status.exists;
    } else if (rel.startsWith('services/')) {
      imported = true;
      active = status.exists;
    } else {
      active = status.exists;
    }

    return { file: rel, ...status, imported, active };
  });

  const guardVerification = verifyGuardImports();
  const runBuddyRouting = analyzeRunBuddy();

  let runtimeSmokeResult = null;
  let smokeError = null;
  try {
    runtimeSmokeResult = await runtimeSmoke();
  } catch (e) {
    smokeError = e.message;
  }

  const renderLocal = readLocal('render.yaml');
  const renderHead = readHead('render.yaml') || '';
  const envKeys = [
    'BUDDY_RUNTIME',
    'BUDDY_TEMPLATE_PROSE',
    'BUDDY_DISABLE_STUDY_FALLBACK',
    'BUDDY_DEBUG',
    'BUDDY_LIVE_TRACE',
    'OPENAI_API_KEY',
  ];
  const envParity = {};
  for (const key of envKeys) {
    envParity[key] = {
      localDeclared: new RegExp(`key:\\s*${key}`).test(renderLocal),
      headDeclared: new RegExp(`key:\\s*${key}`).test(renderHead),
    };
  }

  const allFilesExist = fileChecklist.every((f) => f.exists);
  const allCoreActive = fileChecklist
    .filter((f) =>
      [
        'services/openAiFirstCompanionRuntime.js',
        'services/currentMessageIntent.js',
        'services/directnessGuard.js',
        'services/forbiddenProseGuard.js',
      ].includes(f.file)
    )
    .every((f) => f.active);
  const allCommitted = fileChecklist.every((f) => f.committed);
  const allPushed = fileChecklist.every((f) => f.pushed);
  const localParity =
    runBuddyRouting.local.routesTo === 'openAiFirstCompanionRuntime' &&
    guardVerification.masterBuddyRuntimeDisabledInRunBuddy &&
    allCoreActive;
  const deployParity = allCommitted && allPushed && localParity;

  const payload = {
    ranAt: new Date().toISOString(),
    git: { headSha, originSha, branchStatus },
    runBuddyRouting,
    fileChecklist,
    guardVerification,
    envParity: {
      ...envParity,
      localPlanStandard: /plan:\s*standard/.test(renderLocal),
      headPlanFree: /plan:\s*free/.test(renderHead),
    },
    runtimeSmoke: runtimeSmokeResult,
    smokeError,
    summary: {
      allFilesExistLocally: allFilesExist,
      allCoreWiredAndActive: allCoreActive,
      allFilesCommitted: allCommitted,
      allFilesPushed: allPushed,
      localRuntimeParity: localParity,
      renderDeployParity: deployParity,
      openAiFirstCompanionRuntimeActive: runtimeSmokeResult?.openAiFirstActive ?? null,
      masterBuddyRuntimeDisabled: guardVerification.masterBuddyRuntimeDisabledInRunBuddy,
      forbiddenProseGuardActive: guardVerification.checks.some(
        (c) => c.file.includes('forbiddenProseGuard') || String(c.pattern).includes('forbiddenProseGuard')
      )
        ? guardVerification.checks.filter((c) => String(c.pattern).includes('forbiddenProseGuard')).every((c) => c.pass)
        : false,
      directnessGuardActive: guardVerification.checks.some((c) => String(c.pattern).includes('directnessGuard'))
        ? guardVerification.checks.filter((c) => String(c.pattern).includes('directnessGuard')).every((c) => c.pass)
        : false,
      runtimeUsed: runtimeSmokeResult?.runtimeUsed ?? null,
    },
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${OUT}`);
  console.log(`Local parity: ${localParity ? 'PASS' : 'FAIL'}`);
  console.log(`Deploy parity (committed+pushed): ${deployParity ? 'PASS' : 'FAIL'}`);
  console.log(`runBuddy local → ${runBuddyRouting.local.routesTo}`);
  console.log(`runBuddy HEAD → ${runBuddyRouting.gitHead.routesTo}`);
  if (runtimeSmokeResult) {
    console.log(`Smoke runtimeUsed=${runtimeSmokeResult.runtimeUsed} author=${runtimeSmokeResult.finalAnswerAuthor}`);
  }
  process.exit(localParity ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
