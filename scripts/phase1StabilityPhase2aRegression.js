#!/usr/bin/env node
/**
 * Phase 1 stability + Phase 2A kingdom/heavens regression.
 * Output: docs/regression-trace/phase1-stability-phase2a-results.json
 */
const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearActiveConversation } = require('../services/activeConversationManager');
const { detectForbiddenProse } = require('../services/forbiddenProseGuard');
const { detectUnsupportedThirdHeavenDestination } = require('../services/scripturePolicyValidator');
const { snapshotMemory } = require('../services/requestMemoryLogger');
const { CONNECTION_ERROR_USER_MESSAGE } = require('../services/coreResponseGuards');
const { retrieveEvidenceCards } = require('../services/evidenceCards');

const OUT = path.join(__dirname, '..', 'docs', 'regression-trace', 'phase1-stability-phase2a-results.json');

const STUDY_RE = /You've been studying|Would you like to continue studying|continue your study journey/i;
const WITNESS_RE = /establishes the matter|confirms it alongside Scripture|carries the theme forward/i;
const MASK_RE = /I'm here with you\. Tell me a little more\./i;

const KINGDOM_HEAVENS_TESTS = [
  { id: 'kh_01', message: 'What is the third heaven?' },
  { id: 'kh_02', message: 'How many heavens are talked about in the Bible?' },
  { id: 'kh_03', message: 'Does the Bible say believers go to the third heaven?' },
  {
    id: 'kh_04',
    message: 'Jesus said where I go ye cannot come. How does that fit John 14?',
  },
  { id: 'kh_05', message: 'What does "thy kingdom come… in earth" mean?' },
  { id: 'kh_06', message: 'Does Revelation teach the kingdom comes down to earth?' },
  { id: 'kh_07', message: 'Explain the heavens line upon line from Scripture.' },
];

function getDbg(reply) {
  return reply.coreDebug || reply.runtime?.coreDebug || {};
}

function scoreKingdomHeavens(test, reply) {
  const violations = [];
  const text = String(reply.reply || '');
  const dbg = getDbg(reply);
  const apiFailure = dbg.buildConnectionErrorReplyUsed || dbg.finalAnswerAuthor === 'connection_error';

  if (!apiFailure) {
    if (!dbg.openaiCalled) violations.push('openai_not_called');
    if (dbg.finalAnswerAuthor !== 'openai') violations.push('wrong_author');
    if (dbg.templateUsed) violations.push('template_used');
    if (dbg.studyFallbackUsed) violations.push('study_fallback');
    if (dbg.sourceGroundedResponderUsed) violations.push('template_speaker');
    if (dbg.sabbathHistoryDeepResponderUsed) violations.push('sabbath_responder');
    if (STUDY_RE.test(text) || WITNESS_RE.test(text)) violations.push('study_or_witness_loop');
    if (MASK_RE.test(text)) violations.push('tell_me_more_mask');
    if (detectForbiddenProse(text).detected) violations.push('forbidden_phrase');
    if (detectUnsupportedThirdHeavenDestination(text).detected) violations.push('unsupported_third_heaven_destination');
    if (dbg.regenerated && (dbg.openaiAttempts || 0) > 3) violations.push('excessive_openai_attempts');
  } else {
    if (!text.includes('trouble reaching') && text !== CONNECTION_ERROR_USER_MESSAGE) {
      violations.push('bad_connection_message');
    }
  }

  const cards = retrieveEvidenceCards({ message: test.message });
  const cardTopics = cards.map((c) => c.topic);
  if (/\b(heaven|third heaven)\b/i.test(test.message) && !cardTopics.includes('heavens')) {
    violations.push('missing_heavens_card');
  }
  if (/\b(kingdom|thy kingdom|revelation 21|where i go)\b/i.test(test.message) && !cardTopics.includes('kingdom')) {
    if (!/\b(heaven|third heaven)\b/i.test(test.message) || test.id === 'kh_04' || test.id === 'kh_05' || test.id === 'kh_06') {
      if (['kh_04', 'kh_05', 'kh_06'].includes(test.id) && !cardTopics.includes('kingdom')) {
        violations.push('missing_kingdom_card');
      }
    }
  }

  return { passed: violations.length === 0, violations, apiFailure, dbg, cardTopics };
}

async function runKingdomHeavensBattery() {
  const results = [];
  for (const test of KINGDOM_HEAVENS_TESTS) {
    const uid = `phase2a-${test.id}`;
    clearActiveConversation(uid);
    const memBefore = snapshotMemory();
    const reply = await runBuddy(uid, 'COMPANION', 'ADAPTIVE_COMPANION', test.message);
    const memAfter = snapshotMemory();
    const scored = scoreKingdomHeavens(test, reply);
    results.push({
      ...test,
      ...scored,
      replyPreview: String(reply.reply || '').slice(0, 280),
      memoryDeltaMB: memAfter.rssMB - memBefore.rssMB,
      rssMB: memAfter.rssMB,
    });
  }
  return results;
}

function runEvidenceSmoke() {
  const checks = [];
  const heavensCards = retrieveEvidenceCards({ message: 'What is the third heaven?' });
  checks.push({
    id: 'evidence_heavens_card',
    passed: heavensCards.some((c) => c.cardId === 'heavens'),
    primaryCount: heavensCards.find((c) => c.cardId === 'heavens')?.primaryScriptures?.length || 0,
  });
  const kingdomCards = retrieveEvidenceCards({ message: 'thy kingdom come on earth Revelation 21' });
  checks.push({
    id: 'evidence_kingdom_card',
    passed: kingdomCards.some((c) => c.cardId === 'kingdom'),
    primaryCount: kingdomCards.find((c) => c.cardId === 'kingdom')?.primaryScriptures?.length || 0,
  });
  const john14Cards = retrieveEvidenceCards({ message: 'where I go ye cannot come John 14' });
  checks.push({
    id: 'evidence_john14_kingdom',
    passed: john14Cards.some((c) => c.cardId === 'kingdom'),
  });
  return checks;
}

function runMemorySmoke() {
  const mem = snapshotMemory();
  return {
    id: 'memory_baseline',
    passed: mem.rssMB < 512,
    rssMB: mem.rssMB,
    heapUsedMB: mem.heapUsedMB,
  };
}

function runUiContractSmoke() {
  const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  const hasResOk = /!res\.ok/.test(indexHtml);
  const hasDataOk = /!data\.ok/.test(indexHtml);
  const hasMask = /Tell me a little more/.test(indexHtml);
  return {
    id: 'ui_contract_index',
    passed: hasResOk && hasDataOk && !hasMask,
    hasResOk,
    hasDataOk,
    hasMask,
  };
}

async function main() {
  const hardCutover = path.join(__dirname, 'emergencyHardCutoverRegression.js');
  let hardCutoverSummary = { ran: false };
  if (fs.existsSync(hardCutover)) {
    const { execSync } = require('child_process');
    try {
      execSync(`node "${hardCutover}"`, { stdio: 'pipe', env: process.env });
      const hcPath = path.join(__dirname, '..', 'docs', 'regression-trace', 'emergency-hard-cutover-root-cause-results.json');
      hardCutoverSummary = JSON.parse(fs.readFileSync(hcPath, 'utf8'));
      hardCutoverSummary.ran = true;
    } catch (e) {
      hardCutoverSummary = { ran: true, error: String(e.message || e).slice(0, 300) };
    }
  }

  const kingdomHeavens = await runKingdomHeavensBattery();
  const evidenceSmoke = runEvidenceSmoke();
  const memorySmoke = runMemorySmoke();
  const uiContract = runUiContractSmoke();

  const report = {
    ranAt: new Date().toISOString(),
    hardCutover: hardCutoverSummary,
    uiContract,
    memorySmoke,
    evidenceSmoke,
    kingdomHeavens,
    summary: {
      hardCutoverPass:
        hardCutoverSummary.passed === true ||
        (typeof hardCutoverSummary.passed === 'number' &&
          hardCutoverSummary.passed === hardCutoverSummary.total &&
          hardCutoverSummary.total > 0),
      hardCutoverPassCount: hardCutoverSummary.passed ?? hardCutoverSummary.passCount ?? null,
      hardCutoverTotal: hardCutoverSummary.total ?? null,
      uiContractPass: uiContract.passed,
      memorySmokePass: memorySmoke.passed,
      evidenceSmokePass: evidenceSmoke.every((c) => c.passed),
      kingdomHeavensPass: kingdomHeavens.filter((r) => r.passed).length,
      kingdomHeavensTotal: kingdomHeavens.length,
      apiFailureMode: kingdomHeavens.every((r) => r.apiFailure),
    },
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary, null, 2));
  process.exit(report.summary.kingdomHeavensPass === report.summary.kingdomHeavensTotal ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
