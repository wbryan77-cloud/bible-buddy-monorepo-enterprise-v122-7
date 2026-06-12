/**
 * Phase 4F — Combined doctrine drift + Render stability regression (runBuddy path).
 */

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearDoctrineConversationState } = require('../services/doctrineConversationState');
const { containsDiagnosticLeak } = require('../services/doctrineErrorFirewall');
const { containsMemoryDenial } = require('../services/doctrineLivePathHandlers');
const { validateStrictPhraseGuard } = require('../services/doctrineStrictPhraseGuard');
const { withBuddyChatGuarantee } = require('../services/responseGuarantee');
const { getRuntimeHealthSnapshot } = require('../services/runtimeHealthMonitor');

const ROOT = path.join(__dirname, '..');
const TIMEOUT_MS = Number(process.env.BIBLEBUDDY_CHAT_TIMEOUT_MS || 55000);
const ACTS10_EXACT =
  'Peter explains the vision in Acts 10:28. God showed him not to call any man common or unclean. Acts 10 is about people/Gentiles, not permission to eat unclean foods.';
const DIETARY_EXACT =
  'Scripture distinguishes clean and unclean animals. Pork and shellfish are unclean. Acts 10 is about people/Gentiles, not permission to eat unclean foods.';

const BAD_USER = [
  'AI service unavailable',
  'connection_error',
  'manual Render redeploy',
  'safe corpus fallback',
  'openai_unavailable',
  'trouble reaching the AI service',
];

function assert(cond, label) {
  return { pass: !!cond, label };
}

function noBadUserText(text) {
  for (const b of BAD_USER) {
    if (String(text).includes(b)) return { pass: false, label: `bad user text: ${b}` };
  }
  return { pass: true, label: 'no bad user text' };
}

function noLeak(text) {
  const leak = containsDiagnosticLeak(text);
  return leak.leaked ? { pass: false, label: `leak: ${leak.pattern}` } : { pass: true, label: 'no leak' };
}

async function chat(userId, message) {
  const structured = await runBuddy({
    userId,
    message,
    mode: 'COMPANION',
    personaKey: 'ADAPTIVE_COMPANION',
  });
  return {
    reply: String(structured.reply || ''),
    openAiCalled: structured.runtime?.openAiCalled,
    route: structured.runtime?.masterRoute,
    structured,
  };
}

async function repeat(userId, count, message, checksFn) {
  const checks = [];
  for (let i = 0; i < count; i += 1) {
    const r = await chat(userId, message);
    checks.push(...checksFn(r, i));
  }
  return checks;
}

async function runTests() {
  const results = [];
  const heapStart = process.memoryUsage().heapUsed;

  const u = `phase4f-${Date.now()}`;

  results.push({
    id: '1_acts10_initial_x25',
    checks: await repeat(u, 25, 'What does Acts 10 mean?', (r, i) => [
      assert(r.reply.includes(ACTS10_EXACT), `acts10 exact ${i + 1}`),
      assert(!r.openAiCalled, `no openai ${i + 1}`),
      noBadUserText(r.reply),
      noLeak(r.reply),
      assert(validateStrictPhraseGuard(r.reply, 'acts_10').passed, `no hedge ${i + 1}`),
    ]),
  });

  clearDoctrineConversationState(u);
  await chat(u, 'What does Acts 10 mean?');
  results.push({
    id: '2_acts10_corrections_x25',
    checks: await repeat(u, 25, 'Why are you saying primarily?', (r, i) => [
      assert(/you are right/i.test(r.reply), `corr ack ${i + 1}`),
      assert(!r.openAiCalled, `no openai corr ${i + 1}`),
      noBadUserText(r.reply),
    ]),
  });

  clearDoctrineConversationState(u);
  await chat(u, 'What does Acts 10 mean?');
  results.push({
    id: '3_acts10_continuation_x25',
    checks: await repeat(u, 25, 'show me another verse', (r, i) => [
      assert(!r.openAiCalled, `cont no openai ${i + 1}`),
      noBadUserText(r.reply),
      noLeak(r.reply),
    ]),
  });

  const uDeath = `${u}-death`;
  clearDoctrineConversationState(uDeath);
  results.push({
    id: '4_death_initial_x25',
    checks: await repeat(uDeath, 25, 'What happens when a person dies?', (r, i) => [
      assert(!r.openAiCalled, `death no openai ${i + 1}`),
      assert(!/soul continues|2 cor|philippians 1|luke 16/i.test(r.reply), `no drift ${i + 1}`),
      noBadUserText(r.reply),
    ]),
  });

  clearDoctrineConversationState(uDeath);
  await chat(uDeath, 'What happens when a person dies?');
  results.push({
    id: '5_death_continuation_x25',
    checks: await repeat(uDeath, 25, 'show me another verse', (r, i) => [
      assert(!r.openAiCalled, `death cont ${i + 1}`),
      noBadUserText(r.reply),
    ]),
  });

  const uDiet = `${u}-diet`;
  clearDoctrineConversationState(uDiet);
  results.push({
    id: '6_dietary_x25',
    checks: await repeat(uDiet, 25, 'Can Christians eat pork?', (r, i) => [
      assert(r.reply.includes(DIETARY_EXACT) || /pork.*unclean|unclean.*pork/i.test(r.reply), `dietary ${i + 1}`),
      assert(!r.openAiCalled, `diet no openai ${i + 1}`),
      noBadUserText(r.reply),
    ]),
  });

  const uMix = `${u}-mix`;
  const mixMsgs = [
    'What does Acts 10 mean?',
    'What happens when someone dies?',
    'Can we eat pork?',
    'What is the Sabbath?',
    'show me another verse',
    'Before that?',
    'Acts 10 means food is clean',
    'Why are you saying primarily?',
  ];
  const mixChecks = [];
  clearDoctrineConversationState(uMix);
  for (let i = 0; i < 50; i += 1) {
    const r = await chat(uMix, mixMsgs[i % mixMsgs.length]);
    mixChecks.push(assert(!r.openAiCalled, `mix no openai ${i + 1}`));
    mixChecks.push(noBadUserText(r.reply));
    mixChecks.push(assert(r.reply.length > 5, `nonblank ${i + 1}`));
  }
  results.push({ id: '7_mixed_x50', checks: mixChecks });

  const uMem = `${u}-mem`;
  clearDoctrineConversationState(uMem);
  await chat(uMem, 'What does Acts 10 mean?');
  await chat(uMem, 'What happens when a person dies?');
  const memChecks = [];
  for (let i = 0; i < 50; i += 1) {
    const r = await chat(uMem, 'Can you remember what we were talking about?');
    memChecks.push(assert(!containsMemoryDenial(r.reply), `mem ${i + 1}`));
    memChecks.push(assert(!r.openAiCalled, `mem no openai ${i + 1}`));
  }
  results.push({ id: '8_memory_x50', checks: memChecks });

  const uBefore = `${u}-before`;
  clearDoctrineConversationState(uBefore);
  await chat(uBefore, 'What does Acts 10 mean?');
  await chat(uBefore, 'What happens when a person dies?');
  results.push({
    id: '9_before_that_x25',
    checks: await repeat(uBefore, 25, 'Before that?', (r, i) => [
      assert(/before that|acts/i.test(r.reply), `before ${i + 1}`),
      assert(!r.openAiCalled, `before no openai ${i + 1}`),
    ]),
  });

  process.env.BIBLEBUDDY_DISABLE_OPENAI = '1';
  const uNoAi = `${u}-noai`;
  clearDoctrineConversationState(uNoAi);
  const noAiChecks = [];
  for (let i = 0; i < 50; i += 1) {
    const msg = i % 2 === 0 ? 'What does Acts 10 mean?' : 'show me another verse';
    const r = await chat(uNoAi, msg);
    noAiChecks.push(assert(r.reply.length > 10, `noai reply ${i + 1}`));
    noAiChecks.push(assert(!r.openAiCalled, `noai blocked ${i + 1}`));
    noAiChecks.push(noBadUserText(r.reply));
  }
  results.push({ id: '10_openai_disabled_strict_x50', checks: noAiChecks });

  const uComp = `${u}-comp`;
  const compChecks = [];
  for (let i = 0; i < 25; i += 1) {
    const r = await chat(uComp, 'How was your day?');
    compChecks.push(assert(r.reply.length > 3, `comp reply ${i + 1}`));
    compChecks.push(noBadUserText(r.reply));
  }
  results.push({ id: '11_companion_disabled_openai_x25', checks: compChecks });
  delete process.env.BIBLEBUDDY_DISABLE_OPENAI;

  const errChecks = [];
  for (let i = 0; i < 25; i += 1) {
    const g = await withBuddyChatGuarantee(() => Promise.reject(new Error('forced_test_error')), {
      userId: `${u}-err`,
      message: 'test',
    });
    errChecks.push(assert(g.ok, `guarantee ok ${i + 1}`));
    errChecks.push(assert(g.reply?.reply?.length > 3, `guarantee reply ${i + 1}`));
    errChecks.push(noBadUserText(g.reply?.reply || ''));
  }
  results.push({ id: '12_forced_error_x25', checks: errChecks });

  const uPressure = `${u}-pressure`;
  clearDoctrineConversationState(uPressure);
  await chat(uPressure, 'What does Acts 10 mean?');
  const pressureChecks = [];
  for (let i = 0; i < 100; i += 1) {
    const msgs = ['show me another verse', 'I disagree', 'Why primarily?', 'continue'];
    const r = await chat(uPressure, msgs[i % msgs.length]);
    pressureChecks.push(assert(r.reply.length > 3, `pressure nonblank ${i + 1}`));
    pressureChecks.push(noBadUserText(r.reply));
    pressureChecks.push(assert(!r.openAiCalled, `pressure no openai ${i + 1}`));
  }
  results.push({ id: '13_pressure_x100', checks: pressureChecks });

  const heapEnd = process.memoryUsage().heapUsed;
  const heapGrowthMB = (heapEnd - heapStart) / 1024 / 1024;
  results.push({
    id: '14_heap_growth',
    checks: [
      assert(heapGrowthMB < 80, `heap growth ${heapGrowthMB.toFixed(1)}MB < 80MB`),
      assert(getRuntimeHealthSnapshot().totalRequests >= 0, 'health snapshot'),
    ],
  });

  return results;
}

async function main() {
  const start = Date.now();
  const results = await runTests();
  let total = 0;
  let passed = 0;
  const lines = [
    '# Phase 4F Combined Stability Regression Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Duration: ${((Date.now() - start) / 1000).toFixed(1)}s`,
    `Timeout budget per request: ${TIMEOUT_MS}ms`,
    '',
  ];

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
  lines.push(`- Phase 4F: ${allPass ? 'PASS' : 'FAIL'}`);
  lines.push(`- Safe to deploy: ${allPass ? 'YES (after manual smoke)' : 'NO'}`);

  fs.writeFileSync(path.join(ROOT, 'Phase4FCombinedStabilityRegressionReport.md'), lines.join('\n'), 'utf8');
  console.log(`Phase 4F: ${passed}/${total} in ${((Date.now() - start) / 1000).toFixed(1)}s`);
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
