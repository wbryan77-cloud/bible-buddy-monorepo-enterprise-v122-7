/**
 * Phase 4E — Live browser path regression (/buddy/chat = runBuddy).
 */

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearDoctrineConversationState } = require('../services/doctrineConversationState');
const {
  containsDiagnosticLeak,
  WITNESS_EXHAUSTION_USER_MESSAGE,
} = require('../services/doctrineErrorFirewall');
const { containsMemoryDenial } = require('../services/doctrineLivePathHandlers');
const { ACTS10_FORBIDDEN } = require('../services/doctrineFinalAuthorityEngine');
const { GLOBAL_STRICT_FORBIDDEN, validateStrictPhraseGuard } = require('../services/doctrineStrictPhraseGuard');
const { applyDoctrineErrorFirewall } = require('../services/doctrineErrorFirewall');

const ROOT = path.join(__dirname, '..');
const USER = `phase4e-live-${Date.now()}`;

const ACTS10_EXACT =
  'Peter explains the vision in Acts 10:28. God showed him not to call any man common or unclean. Acts 10 is about people/Gentiles, not permission to eat unclean foods.';

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
  if (/\bwhile\b/i.test(text) && !/\bwhile i\b/i.test(text)) {
    return { pass: false, label: 'acts10 while leak' };
  }
  return { pass: true, label: 'no acts10 leak' };
}

function noDeathDrift(text) {
  const bad = [
    'soul continues',
    '2 corinthians 5:8',
    '2 cor 5:8',
    'philippians 1:21',
    'phil 1:21',
    'luke 16',
    'continued existence after death',
    'memory after death',
  ];
  for (const b of bad) {
    if (String(text).toLowerCase().includes(b)) return { pass: false, label: `death drift: ${b}` };
  }
  return { pass: true, label: 'no death drift' };
}

function noServiceFailure(text) {
  const bad = [
    'AI service unavailable',
    'trouble reaching the AI service',
    'connection_error',
    'openai_unavailable',
    'manual Render redeploy',
    'safe corpus fallback',
  ];
  for (const b of bad) {
    if (String(text).includes(b)) return { pass: false, label: `service failure text: ${b}` };
  }
  return { pass: true, label: 'no service failure text' };
}

function noSoftening(text, topic = '') {
  const check = validateStrictPhraseGuard(text, topic);
  if (!check.passed) return { pass: false, label: `softening: ${check.phrase}` };
  return { pass: true, label: 'no softening phrases' };
}

async function chat(message, userId = USER) {
  const structured = await runBuddy({
    userId,
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

function buddyChatPayload(structured, userId = USER) {
  let payload = {
    reply: structured.reply,
    scripture: structured.scripture || [],
    mode: structured.mode || 'companion',
    confidence: structured.confidence,
    memory_used: structured.memory_used,
    safety_level: structured.safety_level,
    orb_state: structured.orb_state || 'speaking',
  };
  payload = applyDoctrineErrorFirewall(payload, {
    userId,
    topic: structured.runtime?.doctrineTopic,
    strictDoctrine: !!structured.runtime?.doctrineTopic || structured.doctrineFinalAuthority,
  });
  return payload;
}

async function runTests() {
  clearDoctrineConversationState(USER);
  const results = [];

  const t1 = await chat('What happens when a person dies?');
  results.push({
    id: '1_death_state_initial',
    checks: [
      noDeathDrift(t1.reply),
      noSoftening(t1.reply, 'death_state'),
      assert(/\b(sleep|know nothing|asleep|ecclesiastes)/i.test(t1.reply), 'sleep/no memory wording'),
      assert(!t1.openAiCalled, 'no OpenAI on death initial'),
      noServiceFailure(t1.reply),
    ],
  });

  const contChecks = [];
  for (let i = 0; i < 15; i += 1) {
    const r = await chat('Show me another verse');
    contChecks.push(assert(!r.openAiCalled, `death cont ${i + 1} no OpenAI`));
    contChecks.push(noDeathDrift(r.reply));
    contChecks.push(noServiceFailure(r.reply));
    contChecks.push(noSoftening(r.reply, 'death_state'));
    if (i === 14) {
      contChecks.push(
        assert(
          r.reply.includes(WITNESS_EXHAUSTION_USER_MESSAGE) ||
            /acts|ecclesiastes|psalm|john|daniel|corinthians|thessalonians/i.test(r.reply),
          'witness or exhaustion at end',
        ),
      );
    }
  }
  results.push({ id: '2_death_15x_another_verse', checks: contChecks });

  clearDoctrineConversationState(USER);
  const t3 = await chat('What does Acts 10 mean?');
  results.push({
    id: '3_acts_10_initial',
    checks: [
      assert(t3.reply.includes(ACTS10_EXACT), 'Acts 10:28 exact wording'),
      noActs10Leak(t3.reply),
      noSoftening(t3.reply, 'acts_10'),
      assert(!t3.openAiCalled, 'no OpenAI acts initial'),
      noServiceFailure(t3.reply),
    ],
  });

  const t4 = await chat('Why are you saying primarily?');
  results.push({
    id: '4_acts_10_correction',
    checks: [
      assert(/you are right/i.test(t4.reply), 'acknowledges correction'),
      assert(/should not use .primarily/i.test(t4.reply), 'rejects primarily'),
      assert(/acts\s*10:28/i.test(t4.reply), 'Acts 10:28'),
      assert(
        !/\bprimarily\b/i.test(t4.reply.replace(/should not use .primarily\.?/i, '')),
        'no primarily hedge outside correction',
      ),
      assert(!t4.openAiCalled, 'no OpenAI correction'),
    ],
  });

  const t5 = await chat('Acts 10 means food is clean.');
  results.push({
    id: '5_acts_10_challenge_reject',
    checks: [
      assert(/not permission to eat unclean|people|gentiles/i.test(t5.reply), 'rejects food-clean claim'),
      assert(/acts\s*10:28/i.test(t5.reply), 'Acts 10:28'),
      assert(!t5.openAiCalled, 'no OpenAI challenge'),
      noActs10Leak(t5.reply),
    ],
  });

  clearDoctrineConversationState(USER);
  await chat('What does Acts 10 mean?');
  await chat('What happens when a person dies?');
  const t6 = await chat('Can you remember what we were talking about?');
  results.push({
    id: '6_memory_recall',
    checks: [
      assert(!containsMemoryDenial(t6.reply), 'no memory denial'),
      assert(/discussing|talking about|death|acts/i.test(t6.reply), 'recalls topic'),
      assert(!t6.openAiCalled, 'no OpenAI memory'),
    ],
  });

  const t7 = await chat('Before that?');
  results.push({
    id: '7_before_that',
    checks: [
      assert(/before that|acts/i.test(t7.reply), 'previous topic recall'),
      assert(!containsMemoryDenial(t7.reply), 'no memory denial'),
      assert(!t7.openAiCalled, 'no OpenAI before that'),
    ],
  });

  clearDoctrineConversationState(USER);
  const savedKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = '';
  try {
    const t8 = await chat('What does Acts 10 mean?', `phase4e-noai-${Date.now()}`);
    results.push({
      id: '8_openai_disabled_strict',
      checks: [
        assert(t8.reply.length > 20, 'answer without OpenAI'),
        assert(/acts\s*10:28/i.test(t8.reply), 'Acts 10:28 without OpenAI'),
        assert(!t8.openAiCalled, 'openAiCalled false'),
        noServiceFailure(t8.reply),
      ],
    });
  } finally {
    process.env.OPENAI_API_KEY = savedKey;
  }

  clearDoctrineConversationState(USER);
  await chat('What does Acts 10 mean?');
  const pressureChecks = [];
  const pressureMessages = [
    'Why are you saying primarily?',
    'Show me another verse',
    'I disagree',
    'continue',
    'Acts 10 means food is clean',
    'show me another verse',
    'can you remember?',
    'before that?',
    'What does Acts 10 mean?',
    'show me another verse',
    'primarily though',
    'another verse',
    'I disagree with that',
    'continue',
    'show me another verse',
    'why primarily',
    'another witness',
    'continue',
    'show me another verse',
    'Acts 10 food',
    'one more verse',
  ];
  for (let i = 0; i < pressureMessages.length; i += 1) {
    const r = await chat(pressureMessages[i]);
    pressureChecks.push(noServiceFailure(r.reply));
    pressureChecks.push(assert(!containsDiagnosticLeak(r.reply).leaked, `pressure ${i + 1} no diagnostic leak`));
    pressureChecks.push(noSoftening(r.reply, 'acts_10'));
  }
  results.push({ id: '9_correction_pressure_20', checks: pressureChecks });

  clearDoctrineConversationState(USER);
  const t10 = await chat('What happens when a person dies?');
  const payload = buddyChatPayload(t10.structured);
  results.push({
    id: '10_browser_payload',
    checks: [
      assert(!containsDiagnosticLeak(payload.reply).leaked, 'payload no diagnostic leak'),
      assert(!payload.admin_flags, 'no admin_flags in outbound payload'),
      noServiceFailure(payload.reply),
      assert(payload.reply.length > 10, 'payload has reply'),
    ],
  });

  return results;
}

async function main() {
  const results = await runTests();
  let total = 0;
  let passed = 0;
  const lines = [
    '# Phase 4E Live Browser Path Regression Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    `User: ${USER}`,
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
  lines.push(`- Phase 4E: ${allPass ? 'PASS' : 'FAIL'}`);
  lines.push(`- Safe to deploy: ${allPass ? 'YES (after manual smoke)' : 'NO'}`);

  fs.writeFileSync(path.join(ROOT, 'Phase4ELiveBrowserPathRegressionReport.md'), lines.join('\n'), 'utf8');

  console.log(`Phase 4E: ${passed}/${total}`);
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
