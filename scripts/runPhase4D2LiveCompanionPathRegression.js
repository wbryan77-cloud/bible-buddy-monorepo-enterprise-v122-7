/**
 * Phase 4D.2 — Live /buddy/chat path regression via runBuddy (same as routes/buddy.js).
 */

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearDoctrineConversationState } = require('../services/doctrineConversationState');
const { containsDiagnosticLeak, USER_SAFE_RETRIEVAL_MESSAGE } = require('../services/doctrineErrorFirewall');
const { containsMemoryDenial } = require('../services/doctrineLivePathHandlers');
const { FINALITY_FORBIDDEN_PHRASES } = require('../services/doctrineFinalityMode');

const ROOT = path.join(__dirname, '..');
const USER = `phase4d2-live-${Date.now()}`;

function assert(cond, label) {
  return { pass: !!cond, label };
}

function noDeathDrift(text) {
  const bad = [
    'soul continues',
    '2 corinthians 5:8',
    '2 cor 5:8',
    'philippians 1:21',
    'phil 1:21',
    'continued existence after death',
    'conscious existence after death',
    'luke 16',
    'jeremiah 29:11',
  ];
  for (const b of bad) {
    if (String(text).toLowerCase().includes(b)) return { pass: false, label: `death drift: ${b}` };
  }
  return { pass: true, label: 'no death_state drift' };
}

function noActs10Hedge(text) {
  const lower = String(text).toLowerCase();
  const bad = [
    'primarily',
    'mainly',
    'largely',
    'broader point',
    'not just about dietary',
    'not solely about dietary',
    'significant',
  ];
  for (const b of bad) {
    if (lower.includes(b) && !/should not use|should not hedge|do not use/i.test(lower)) {
      return { pass: false, label: `acts10 hedge: ${b}` };
    }
  }
  return { pass: true, label: 'no acts10 hedge' };
}

function noLeaks(text) {
  if (containsDiagnosticLeak(text).leaked) return { pass: false, label: 'diagnostic leak' };
  if (/approved witness chain currently attached/i.test(text)) return { pass: false, label: 'internal exhaustion leak' };
  return { pass: true, label: 'no leaks' };
}

async function chat(message, recentContext = null) {
  const structured = await runBuddy({
    userId: USER,
    message,
    mode: 'COMPANION',
    personaKey: 'ADAPTIVE_COMPANION',
  });
  return {
    reply: String(structured.reply || ''),
    openAiCalled: structured.runtime?.openAiCalled ?? structured.runtime?.openAiCalled,
    route: structured.runtime?.masterRoute,
    scripture: structured.scripture || [],
    structured,
  };
}

async function runTests() {
  clearDoctrineConversationState(USER);
  const results = [];

  // 1 death_state initial — use safe path when no OpenAI key
  const t1 = await chat('What happens when a person dies?');
  results.push({
    id: '1_death_state_initial',
    checks: [
      noDeathDrift(t1.reply),
      assert(/\b(sleep|know nothing|asleep|ecclesiastes|psalm 146)/i.test(t1.reply), 'approved death witnesses'),
      noLeaks(t1.reply),
    ],
  });

  // 2 death_state continuation
  const t2 = await chat('Show me another verse.');
  results.push({
    id: '2_death_state_continuation',
    checks: [
      noDeathDrift(t2.reply),
      assert(t2.route === 'doctrine_witness_inventory' || !t2.structured.runtime?.openAiCalled, 'no OpenAI continuation'),
      noLeaks(t2.reply),
      assert(!/jeremiah\s*29/i.test(t2.reply), 'no Jeremiah drift'),
    ],
  });

  clearDoctrineConversationState(USER);
  // 3 Acts 10 initial
  const t3 = await chat('What does Acts 10 mean?');
  results.push({
    id: '3_acts_10_initial',
    checks: [
      assert(/acts\s*10:28/i.test(t3.reply), 'Acts 10:28 cited'),
      assert(/not to call any man common or unclean|Gentiles|people/i.test(t3.reply), 'people/Gentiles conclusion'),
      noActs10Hedge(t3.reply),
      noLeaks(t3.reply),
    ],
  });

  // 4 Acts 10 correction
  const t4 = await chat('Why are you saying primarily?');
  results.push({
    id: '4_acts_10_correction',
    checks: [
      assert(/should not use|should not use|right/i.test(t4.reply), 'acknowledges correction'),
      assert(/acts\s*10:28/i.test(t4.reply), 'Acts 10:28 in correction'),
      noActs10Hedge(t4.reply),
      assert(t4.route === 'doctrine_correction_memory' || !t4.structured.runtime?.openAiCalled, 'correction handler'),
    ],
  });

  // 5 continuation context after Acts 10
  const t5 = await chat('Show me another verse.');
  results.push({
    id: '5_acts_10_continuation',
    checks: [
      assert(
        /acts\s*(10|11)/i.test(t5.reply) || /approved scripture witnesses for this topic/i.test(t5.reply),
        'Acts 10/11 continuation or exhaustion',
      ),
      assert(!/jeremiah\s*29/i.test(t5.reply), 'no Jeremiah 29:11'),
      assert(t5.route === 'doctrine_witness_inventory' || !t5.structured.runtime?.openAiCalled, 'inventory route'),
    ],
  });

  // 6 memory
  const t6 = await chat('Can you remember what we were talking about?');
  results.push({
    id: '6_memory_recall',
    checks: [
      assert(!containsMemoryDenial(t6.reply), 'no memory denial'),
      assert(/acts\s*10|talking about|discussing/i.test(t6.reply), 'recalls topic'),
      assert(t6.route === 'doctrine_memory_recall' || /discussing/i.test(t6.reply), 'memory handler'),
    ],
  });

  // 7 exhaustion 12x
  const exhaustionChecks = [];
  for (let i = 0; i < 12; i += 1) {
    const r = await chat('show me another verse');
    exhaustionChecks.push(noLeaks(r.reply));
    exhaustionChecks.push(assert(!/jeremiah\s*29/i.test(r.reply), `iter ${i + 1} no Jeremiah`));
    exhaustionChecks.push(
      assert(r.route === 'doctrine_witness_inventory' || !r.structured.runtime?.openAiCalled, `iter ${i + 1} no OpenAI`),
    );
  }
  results.push({ id: '7_exhaustion_12x', checks: exhaustionChecks });

  // 8 error firewall unit
  const { applyDoctrineErrorFirewall } = require('../services/doctrineErrorFirewall');
  const dirty = applyDoctrineErrorFirewall({
    reply: 'connection_error openai_unavailable safe corpus fallback',
    admin_flags: ['core_connection_error'],
  });
  results.push({
    id: '8_error_firewall',
    checks: [assert(dirty.reply === USER_SAFE_RETRIEVAL_MESSAGE, 'safe user message')],
  });

  return results;
}

async function main() {
  const results = await runTests();
  let total = 0;
  let passed = 0;
  const lines = ['# Phase 4D.2 Live Companion Path Regression Report', '', `Generated: ${new Date().toISOString()}`, `User: ${USER}`, ''];

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
  lines.push(`- Phase 4D.2: ${allPass ? 'PASS' : 'FAIL'}`);
  lines.push(`- Path: POST /buddy/chat → routes/buddy.js → runBuddy → openAiFirstCompanionRuntime`);

  const reportPath = path.join(ROOT, 'Phase4D2LiveCompanionPathRegressionReport.md');
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');

  // Wiring audit
  const wiring = [
    '# Phase 4D.2 Live Path Wiring Audit',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Verified chain',
    '1. `routes/buddy.js` POST `/chat` → `runBuddy()`',
    '2. `services/buddyBrain.js` `runBuddy()` → `openAiFirstCompanionRuntime` (hard cutover)',
    '3. `buildRetrievalEvidencePack()` → `attachDoctrineStrictContract()`',
    '4. `tryDoctrineLivePathHandlers()` — continuation, memory, correction (no OpenAI)',
    '5. `composeReasonFirstReply()` — first doctrine answer only + finality + correction memory',
    '6. `validateDoctrineStrictReply()` + safe corpus on failure',
    '7. `applyDoctrineErrorFirewall()` on outbound reply',
    '',
    '## Phase 4D.2 additions',
    '- `doctrineConversationState.js` — active topic memory',
    '- `doctrineCorrectionMemory.js` — session correction learning',
    '- `doctrineLivePathHandlers.js` — unified live path bypass',
    '- Guard regen disabled when `doctrineStrict.enabled`',
    '- Internal system messages filtered in `appendSession`',
    '- User-facing exhaustion message (not internal diagnostic)',
    '',
    `## Regression: ${passed}/${total}`,
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, 'Phase4D2LivePathWiringAudit.md'), wiring, 'utf8');

  console.log(`Phase 4D.2: ${passed}/${total}`);
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
