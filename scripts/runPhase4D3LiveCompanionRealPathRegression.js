/**
 * Phase 4D.3 — Live companion real path regression (runBuddy = /buddy/chat).
 */

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearDoctrineConversationState } = require('../services/doctrineConversationState');
const { containsDiagnosticLeak, STRICT_DOCTRINE_FALLBACK_MESSAGE } = require('../services/doctrineErrorFirewall');
const { containsMemoryDenial } = require('../services/doctrineLivePathHandlers');
const { ACTS10_FORBIDDEN } = require('../services/doctrineFinalAuthorityEngine');

const ROOT = path.join(__dirname, '..');
const USER = `phase4d3-live-${Date.now()}`;

function assert(cond, label) {
  return { pass: !!cond, label };
}

function noActs10Leak(text) {
  const lower = String(text).toLowerCase();
  for (const p of ACTS10_FORBIDDEN) {
    if (lower.includes(p) && !/should not|you are right/i.test(lower)) {
      return { pass: false, label: `acts10 leak: ${p}` };
    }
  }
  if (/romans\s*10:12/i.test(lower)) return { pass: false, label: 'romans 10:12 drift' };
  if (/jeremiah\s*29/i.test(lower)) return { pass: false, label: 'jeremiah drift' };
  return { pass: true, label: 'no acts10/drift leak' };
}

function noDeathDrift(text) {
  const bad = ['soul continues', '2 corinthians 5:8', '2 cor 5:8', 'philippians 1:21', 'phil 1:21', 'continued existence after death'];
  for (const b of bad) {
    if (String(text).toLowerCase().includes(b)) return { pass: false, label: `death drift: ${b}` };
  }
  return { pass: true, label: 'no death drift' };
}

function noServiceFailure(text) {
  const bad = ['AI service unavailable', 'trouble reaching the AI service', 'connection_error', 'openai_unavailable'];
  for (const b of bad) {
    if (String(text).includes(b)) return { pass: false, label: `service failure text: ${b}` };
  }
  return { pass: true, label: 'no service failure text' };
}

async function chat(message) {
  const structured = await runBuddy({
    userId: USER,
    message,
    mode: 'COMPANION',
    personaKey: 'ADAPTIVE_COMPANION',
  });
  return {
    reply: String(structured.reply || ''),
    route: structured.runtime?.masterRoute,
    openAiCalled: structured.runtime?.openAiCalled,
    structured,
  };
}

async function runTests() {
  clearDoctrineConversationState(USER);
  const results = [];

  const t1 = await chat('What does Acts 10 mean?');
  results.push({
    id: '1_acts_10_initial',
    checks: [
      assert(/acts\s*10:28/i.test(t1.reply), 'Acts 10:28'),
      assert(/people|gentiles/i.test(t1.reply), 'people/Gentiles'),
      assert(t1.route === 'doctrine_final_authority' || !t1.openAiCalled, 'no OpenAI doctrine reasoning'),
      noActs10Leak(t1.reply),
      noServiceFailure(t1.reply),
    ],
  });

  const t2 = await chat('Why are you saying primarily?');
  results.push({
    id: '2_acts_10_correction',
    checks: [
      assert(/you are right|should not/i.test(t2.reply), 'acknowledges correction'),
      assert(/acts\s*10:28/i.test(t2.reply), 'Acts 10:28'),
      noActs10Leak(t2.reply),
      assert(!t2.openAiCalled, 'no OpenAI on correction'),
    ],
  });

  const t3 = await chat('Show me another verse.');
  results.push({
    id: '3_acts_10_continuation',
    checks: [
      assert(/acts\s*(10|11)/i.test(t3.reply) || /approved scripture witnesses/i.test(t3.reply), 'Acts witness or exhaustion'),
      assert(!/romans\s*10:12/i.test(t3.reply), 'no Romans 10:12'),
      assert(!t3.openAiCalled, 'no OpenAI continuation'),
    ],
  });

  const challengeChecks = [];
  for (let i = 0; i < 10; i += 1) {
    const r = await chat('show me another verse');
    challengeChecks.push(noServiceFailure(r.reply));
    challengeChecks.push(assert(!r.openAiCalled, `challenge ${i + 1} no OpenAI`));
    challengeChecks.push(noActs10Leak(r.reply));
  }
  results.push({ id: '4_acts_10_challenge_10x', checks: challengeChecks });

  clearDoctrineConversationState(USER);
  const t5 = await chat('What happens when a person dies?');
  results.push({
    id: '5_death_state_initial',
    checks: [
      noDeathDrift(t5.reply),
      assert(/\b(sleep|know nothing|asleep|ecclesiastes)/i.test(t5.reply), 'sleep/no memory'),
      assert(t5.route === 'doctrine_final_authority' || !t5.openAiCalled, 'final authority path'),
    ],
  });

  const deathContChecks = [];
  for (let i = 0; i < 10; i += 1) {
    const r = await chat('show me another verse');
    deathContChecks.push(noDeathDrift(r.reply));
    deathContChecks.push(assert(!r.openAiCalled, `death cont ${i + 1} no OpenAI`));
    deathContChecks.push(assert(!/jeremiah\s*29/i.test(r.reply), `death cont ${i + 1} no Jeremiah`));
  }
  results.push({ id: '6_death_state_10x', checks: deathContChecks });

  clearDoctrineConversationState(USER);
  await chat('What does Acts 10 mean?');
  await chat('What happens when a person dies?');
  const t7 = await chat('Can you remember what we were talking about?');
  results.push({
    id: '7_memory',
    checks: [
      assert(!containsMemoryDenial(t7.reply), 'no memory denial'),
      assert(/discussing|talking about|death|acts/i.test(t7.reply), 'recalls topic'),
    ],
  });

  const t8 = await chat('Before that?');
  results.push({
    id: '8_before_that',
    checks: [assert(/discussing|before that|acts/i.test(t8.reply), 'previous topic recall')],
  });

  const exhaustChecks = [];
  for (let i = 0; i < 15; i += 1) {
    const r = await chat('show me another verse');
    exhaustChecks.push(assert(!containsDiagnosticLeak(r.reply).leaked, `exhaust ${i + 1} no leak`));
    exhaustChecks.push(assert(!/approved witness chain currently attached to this topic/i.test(r.reply), `exhaust ${i + 1} no internal exhaustion`));
  }
  results.push({ id: '9_exhaustion', checks: exhaustChecks });

  clearDoctrineConversationState(USER);
  await chat('What does Acts 10 mean?');
  const t10 = await chat('show me another verse');
  results.push({
    id: '10_openai_disabled_continuation',
    checks: [
      assert(t10.reply.length > 10, 'continuation works without OpenAI'),
      assert(!t10.openAiCalled, 'no OpenAI'),
      noServiceFailure(t10.reply),
    ],
  });

  return results;
}

function generateLeakAudit(passed, total) {
  return [
    '# Phase 4D.3 Live Leak Audit',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## /buddy/chat OpenAI call paths',
    '- `routes/buddy.js` → `runBuddy` → `openAiFirstCompanionRuntime`',
    '- Strict doctrine initial: `doctrine_final_authority` (NO OpenAI)',
    '- Strict continuation/correction/memory: `doctrineLivePathHandlers` (NO OpenAI)',
    '- Non-doctrine companion: OpenAI via `composeReasonFirstReply` only',
    '',
    '## Strict doctrine continuation paths',
    '- `tryDoctrineLivePathHandlers` before compose',
    '- Fallback witness continuation in runtime if live handler missed',
    '- `doctrineWitnessInventory` deterministic local answers',
    '',
    '## Fallback paths',
    '- Strict doctrine: `STRICT_DOCTRINE_FALLBACK_MESSAGE` (not AI service unavailable)',
    '- Non-strict OpenAI failure: generic safe retrieval message',
    '- `applyDoctrineErrorFirewall` on all outbound replies',
    '',
    '## Memory recall',
    '- `doctrineConversationState` activeDoctrineTopic / previousDoctrineTopic',
    '- `buildDoctrineMemoryRecallReply` for remember / before that',
    '',
    '## activeDoctrineTopic retention',
    '- `setActiveDoctrineConversation` on every authority/witness answer',
    '- `resolveActiveStrictTopic` prioritizes conversation state',
    '',
    '## AI service unavailable exposure points (blocked)',
    '- `coreResponseGuards.buildConnectionErrorReply` — non-strict only',
    '- `routes/buddy.js normalizePayload` — generic fallback updated',
    '- `doctrineErrorFirewall` — strips trouble reaching AI service',
    '',
    `## Regression: ${passed}/${total}`,
  ].join('\n');
}

async function main() {
  const results = await runTests();
  let total = 0;
  let passed = 0;
  const lines = ['# Phase 4D.3 Live Companion Real Path Regression Report', '', `Generated: ${new Date().toISOString()}`, `User: ${USER}`, ''];

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
  lines.push(`- Phase 4D.3: ${allPass ? 'PASS' : 'FAIL'}`);
  lines.push(`- Phase 4E can resume: ${allPass ? 'YES' : 'NO'}`);

  fs.writeFileSync(path.join(ROOT, 'Phase4D3LiveCompanionRealPathRegressionReport.md'), lines.join('\n'), 'utf8');
  fs.writeFileSync(path.join(ROOT, 'Phase4D3LiveLeakAudit.md'), generateLeakAudit(passed, total), 'utf8');

  console.log(`Phase 4D.3: ${passed}/${total}`);
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
