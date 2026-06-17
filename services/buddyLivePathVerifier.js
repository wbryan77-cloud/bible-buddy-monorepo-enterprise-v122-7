/**
 * Phase 5B — Verify live /buddy/chat module chain loads before serving traffic.
 */

const fs = require('fs');
const path = require('path');

const SERVICES_DIR = path.join(__dirname);

const LIVE_PATH_MODULES = [
  'responseGuarantee.js',
  'buddyBrain.js',
  'openAiFirstCompanionRuntime.js',
  'bibleCompanionOrchestrator.js',
  'bibleReasoningEngine.js',
  'bibleConceptGraph.js',
  'reflectionMemoryEngine.js',
  'companionStateEngine.js',
  'pendingQuestionResolver.js',
  'companionDoctrineRouter.js',
  'strictDoctrineGate.js',
  'doctrineFinalAuthorityEngine.js',
  'doctrineLivePathHandlers.js',
  'directAnswerFormatter.js',
  'bibleConceptConcordance.js',
  'bibleWideReasoningEngine.js',
  'userCorrectionMemory.js',
  'claimToScriptureValidator.js',
  'reasonFirstComposer.js',
];

function tryRequireModule(relPath) {
  const full = path.join(SERVICES_DIR, relPath);
  if (!fs.existsSync(full)) {
    return { module: relPath, ok: false, error: 'file_missing' };
  }
  try {
    require(full);
    return { module: relPath, ok: true };
  } catch (e) {
    return { module: relPath, ok: false, error: String(e.message || e).slice(0, 200) };
  }
}

function verifyBuddyLivePathModules() {
  const checks = LIVE_PATH_MODULES.map(tryRequireModule);
  const missing = checks.filter((c) => !c.ok);
  return {
    ok: missing.length === 0,
    routeOwner: 'POST /buddy/chat → routes/buddy.js → withBuddyChatGuarantee → runBuddy → openAiFirstCompanionRuntime → bibleCompanionOrchestrator',
    runtimeCalled: 'openAiFirstCompanionRuntime',
    orchestratorModule: 'bibleCompanionOrchestrator.js',
    checks,
    missingModules: missing.map((m) => m.module),
    missingCount: missing.length,
    verifiedAt: new Date().toISOString(),
  };
}

function getBuddyRouteTraceSnapshot() {
  let gitCommit = null;
  try {
    const head = path.join(__dirname, '..', '.git', 'HEAD');
    if (fs.existsSync(head)) {
      const ref = fs.readFileSync(head, 'utf8').trim();
      if (ref.startsWith('ref:')) {
        const refPath = path.join(__dirname, '..', '.git', ref.slice(5).trim());
        if (fs.existsSync(refPath)) gitCommit = fs.readFileSync(refPath, 'utf8').trim().slice(0, 12);
      } else {
        gitCommit = ref.slice(0, 12);
      }
    }
  } catch {
    /* optional */
  }

  const manifest = verifyBuddyLivePathModules();
  let openAiFirstImportsOrchestrator = false;
  try {
    const src = fs.readFileSync(path.join(SERVICES_DIR, 'openAiFirstCompanionRuntime.js'), 'utf8');
    openAiFirstImportsOrchestrator = src.includes('bibleCompanionOrchestrator');
  } catch {
    /* optional */
  }

  let buddyBrainUsesOpenAiFirst = false;
  try {
    const src = fs.readFileSync(path.join(SERVICES_DIR, 'buddyBrain.js'), 'utf8');
    buddyBrainUsesOpenAiFirst = src.includes('openAiFirstCompanionRuntime');
  } catch {
    /* optional */
  }

  return {
    gitCommit,
    nodeEnv: process.env.NODE_ENV || 'development',
    routeFile: 'routes/buddy.js',
    exportedHandler: 'POST /chat → handleBuddyChat → withBuddyChatGuarantee → runBuddy',
    buddyBrainRuntime: buddyBrainUsesOpenAiFirst ? 'openAiFirstCompanionRuntime' : 'unknown',
    openAiFirstImportsOrchestrator,
    ...manifest,
  };
}

module.exports = {
  LIVE_PATH_MODULES,
  verifyBuddyLivePathModules,
  getBuddyRouteTraceSnapshot,
};
