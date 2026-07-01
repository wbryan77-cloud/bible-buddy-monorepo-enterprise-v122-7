/**
 * Phase 4D.1 — Witness inventory regression (no live OpenAI).
 */

const fs = require('fs');
const path = require('path');

const {
  buildWitnessInventory,
  isWitnessContinuationRequest,
  handleWitnessContinuation,
  setActiveDoctrineTopic,
  getUserWitnessState,
  USER_FACING_EXHAUSTION_MESSAGE,
} = require('../services/doctrineWitnessInventory');
const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');
const { attachDoctrineStrictContract } = require('../services/doctrineAuthorityContract');
const { validateFinalityReply, stripFinalityViolations, FINALITY_FORBIDDEN_PHRASES } = require('../services/doctrineFinalityMode');
const {
  applyDoctrineErrorFirewall,
  containsDiagnosticLeak,
  USER_SAFE_RETRIEVAL_MESSAGE,
} = require('../services/doctrineErrorFirewall');

const ROOT = path.join(__dirname, '..');
const STATE_PATH = path.join(ROOT, 'data', 'doctrine-witness-state.json');
const USER_ID = 'phase4d1-regression-user';

function buildPack(message) {
  const pack = buildRetrievalEvidencePack({
    userId: USER_ID,
    message,
    mode: 'companion',
    recentSessions: [],
    runtimeContext: { emotion: 'neutral', intent: 'study' },
    profile: { memoryEnabled: false },
    safety: { level: 'standard' },
    routingHintsOnly: true,
  });
  pack.userMessage = message;
  attachDoctrineStrictContract(pack);
  return pack;
}

function resetState() {
  let state = { users: {} };
  if (fs.existsSync(STATE_PATH)) {
    try {
      state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    } catch {
      state = { users: {} };
    }
  }
  delete state.users[USER_ID];
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

function assert(cond, label) {
  return { pass: !!cond, label };
}

function noFinalityViolations(text) {
  for (const phrase of FINALITY_FORBIDDEN_PHRASES) {
    if (String(text).toLowerCase().includes(phrase)) {
      return { pass: false, label: `finality phrase leaked: ${phrase}` };
    }
  }
  return { pass: true, label: 'no finality forbidden phrases' };
}

function run() {
  resetState();
  const results = [];

  // Seed topic with initial death question
  const seedMsg = 'What happens when a person dies according to Scripture?';
  const seedPack = buildPack(seedMsg);
  setActiveDoctrineTopic(USER_ID, 'death_state');

  // 10 consecutive continuation requests
  const continuationChecks = [];
  for (let i = 0; i < 10; i += 1) {
    const msg = 'show me another verse';
    const pack = buildPack(msg);
    const recentSessions = [
      { message: seedMsg, reply: 'Death is sleep until resurrection per Ecclesiastes 9:5.' },
    ];
    const witnessResult = handleWitnessContinuation({
      userId: USER_ID,
      message: msg,
      evidencePack: pack,
      recentSessions,
    });

    continuationChecks.push(
      assert(witnessResult, `iteration ${i + 1} returned result`),
      assert(isWitnessContinuationRequest(msg), `iteration ${i + 1} continuation detected`),
      assert(!containsDiagnosticLeak(witnessResult.reply).leaked, `iteration ${i + 1} no diagnostic leak`),
      noFinalityViolations(witnessResult.reply),
      assert(
        witnessResult.reply !== 'AI service unavailable' && !/connection_error/i.test(witnessResult.reply),
        `iteration ${i + 1} no connection error text`,
      ),
    );
  }

  results.push({ id: '10_consecutive_continuations', checks: continuationChecks });

  // Exhaustion behavior
  resetState();
  setActiveDoctrineTopic(USER_ID, 'death_state');
  const inventory = buildWitnessInventory('death_state', {}, {});
  const userState = getUserWitnessState(USER_ID);
  userState.topics.death_state.usedApproved = [...inventory.approvedWitnesses];
  userState.topics.death_state.usedSupporting = [...inventory.supportingWitnesses];
  const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  state.users[USER_ID] = userState;
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');

  const exhausted = handleWitnessContinuation({
    userId: USER_ID,
    message: 'show me another verse',
    evidencePack: buildPack('show me another verse'),
    recentSessions: [{ message: seedMsg, reply: 'test' }],
  });

  results.push({
    id: 'witness_exhaustion',
    checks: [
      assert(exhausted.exhausted, 'marked exhausted'),
      assert(exhausted.reply === USER_FACING_EXHAUSTION_MESSAGE, 'exhaustion message exact'),
      assert(!containsDiagnosticLeak(exhausted.reply).leaked, 'no leak on exhaustion'),
    ],
  });

  // Finality strip
  const hedged = 'This is primarily about sleep and often understood as complex.';
  const stripped = stripFinalityViolations(hedged);
  results.push({
    id: 'finality_strip',
    checks: [
      assert(!/primarily|often understood/i.test(stripped), 'hedging stripped'),
    ],
  });

  // Error firewall
  const dirty = {
    reply: 'AI service unavailable connection_error safe corpus fallback openai_timeout',
    admin_flags: ['core_connection_error', 'safe_corpus_fallback'],
  };
  const clean = applyDoctrineErrorFirewall(dirty, { userId: USER_ID, topic: 'death_state' });
  results.push({
    id: 'error_firewall',
    checks: [
      assert(clean.reply === USER_SAFE_RETRIEVAL_MESSAGE, 'mapped to safe message'),
      assert(!containsDiagnosticLeak(clean.reply).leaked, 'clean reply'),
      assert(!clean.admin_flags.includes('core_connection_error'), 'internal flags stripped'),
    ],
  });

  // Inventory shape
  const inv = buildWitnessInventory('dietary_law', {}, buildPack('pork and shrimp'));
  results.push({
    id: 'inventory_build',
    checks: [
      assert(inv.approvedWitnesses.length >= 2, 'dietary approved witnesses'),
      assert(Array.isArray(inv.supportingWitnesses), 'supporting witnesses array'),
      assert(Array.isArray(inv.usedWitnesses), 'used witnesses array'),
    ],
  });

  let total = 0;
  let passed = 0;
  const lines = ['# Phase 4D.1 Witness Inventory Regression Report', '', `Generated: ${new Date().toISOString()}`, ''];

  for (const r of results) {
    lines.push(`## ${r.id}`);
    for (const c of r.checks) {
      total += 1;
      if (c.pass) passed += 1;
      lines.push(`- [${c.pass ? 'PASS' : 'FAIL'}] ${c.label}`);
    }
    lines.push('');
  }

  const allPass = passed === total;
  lines.push('## Summary');
  lines.push(`- Checks: ${passed}/${total}`);
  lines.push(`- Phase 4D.1: ${allPass ? 'PASS' : 'FAIL'}`);
  lines.push(`- Acceptance (10 consecutive continuations): ${results[0].checks.every((c) => c.pass) ? 'PASS' : 'FAIL'}`);

  const reportPath = path.join(ROOT, 'Phase4D1WitnessInventoryRegressionReport.md');
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');

  console.log(`Phase 4D.1 regression: ${passed}/${total}`);
  console.log(`Report: ${reportPath}`);
  process.exit(allPass ? 0 : 1);
}

run();
