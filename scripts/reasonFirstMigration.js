#!/usr/bin/env node
/**
 * Reason-first migration — A/B comparison + release gate + report.
 *
 * Usage:
 *   node scripts/reasonFirstMigration.js
 *   BUDDY_RUNTIME=legacy node scripts/reasonFirstMigration.js  # legacy only slice
 *
 * OpenAI required for reason_first path:
 *   OPENAI_API_KEY=sk-... node scripts/reasonFirstMigration.js
 */

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { classifyReplySource } = require('../services/replySourceClassifier');
const { estimateProseBreakdown } = require('../services/reasonFirstTrace');
const { clearActiveConversation } = require('../services/activeConversationManager');

const ROOT = path.join(__dirname, '..');
const OUT_REPORT = path.join(ROOT, 'ReasonFirstMigrationReport.md');
const OUT_JSON = path.join(ROOT, 'docs', 'reason-first-migration', 'validation-results.json');

const THREADS = [
  { id: 'job', name: 'Job opportunity', messages: ['I have a job opportunity.', 'The company is far away from home.', "I'm not sure whether to push or wait on this offer."] },
  { id: 'alz', name: "Alzheimer's caregiver", messages: ["My mom was recently diagnosed with Alzheimer's.", "Some days she doesn't remember who I am.", 'How do I stay close to God while grieving who she used to be?'] },
  { id: 'distant', name: 'Feeling distant from God', messages: ['I feel distant from God lately.', 'I pray but it feels empty.', 'Does that mean my faith is failing?'] },
  { id: 'sabbath', name: 'Sabbath wording thread', messages: [
    'Why should we keep Sunday as the day of worship onto the Lord?',
    'Why do you call it the Roman church instead of the Roman Catholic Church, which is the direct name?',
    'Why are you using the term Roman church when the technical name is the Roman Catholic Church?',
    "No, I'm not asking about the shift. I'm asking about your wording.",
    'Why are you not answering my question?',
    "No, I'm not asking about history. I'm asking about your wording.",
    'Are you not listening to what I am asking?',
  ]},
  { id: 'grief', name: 'Grief thread', messages: ['I lost a friend Wednesday.', 'It is still bothering me.'] },
  { id: 'health', name: 'Health thread', messages: ['My knees hurt.', 'My knees are hurting again today.'] },
];

const GATE = {
  minOpenAiPct: 70,
  maxTemplatePct: 20,
  minListening: 7,
};

function uid(prefix, runtime) {
  return `rf-mig-${prefix}-${runtime}-${Date.now()}`;
}

async function runThread(runtimeEnv, spec) {
  const prev = process.env.BUDDY_RUNTIME;
  process.env.BUDDY_RUNTIME = runtimeEnv;
  const userId = uid(spec.id, runtimeEnv);
  clearActiveConversation(userId);
  const turns = [];

  try {
    for (let i = 0; i < spec.messages.length; i += 1) {
      const message = spec.messages[i];
      const structured = await runBuddy({ userId, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION', message });
      const reply = String(structured?.reply || '');
      const openaiCalled = !!(structured?.runtime?.openaiCalled || structured?.runtime?.masterRoute === 'reason_first_openai');
      const source = runtimeEnv === 'legacy' ? classifyReplySource(structured) : { layer: openaiCalled ? 'openai' : 'blocked', route: structured?.runtime?.masterRoute };
      const breakdown = estimateProseBreakdown(reply, runtimeEnv, openaiCalled);

      turns.push({
        turn: i + 1,
        message,
        reply,
        masterRoute: structured?.runtime?.masterRoute,
        openaiCalled,
        source,
        templateCharsPct: breakdown.templateCharsPct,
        responderCharsPct: breakdown.responderCharsPct,
        listening: scoreListening(reply, message, i),
      });
    }
  } finally {
    process.env.BUDDY_RUNTIME = prev;
  }

  return { ...spec, runtime: runtimeEnv, userId, turns };
}

function scoreListening(reply, message, turnIndex) {
  let score = 5;
  const msg = String(message).toLowerCase();
  if (/you('re| are) asking|i hear|sounds like|you're right|what you('re| are) asking/i.test(reply)) score += 2;
  if (/constantine|laodicea|historical chain/i.test(reply) && msg.includes('wording')) score -= 3;
  if (/not listening|not answering/i.test(msg) && !/i hear|you('re| are) asking/i.test(reply)) score -= 2;
  if (turnIndex > 0 && /you('re| are) asking/i.test(reply)) score += 1;
  if (/openai unavailable|composer unavailable/i.test(reply)) return 0;
  return Math.max(0, Math.min(10, score));
}

function aggregateMetrics(results) {
  const turns = results.flatMap((r) => r.turns);
  const nonCrisis = turns.filter((t) => t.masterRoute !== 'reason_first_crisis' && t.masterRoute !== 'crisis');
  const total = nonCrisis.length || 1;
  const openaiCount = nonCrisis.filter((t) => t.openaiCalled || t.source?.layer === 'openai').length;
  const avgTemplate = nonCrisis.reduce((s, t) => s + t.templateCharsPct, 0) / total;
  const avgListening = nonCrisis.reduce((s, t) => s + t.listening, 0) / total;
  const openaiPct = Math.round((openaiCount / total) * 1000) / 10;

  return {
    turns: total,
    openaiCount,
    openaiPct,
    avgTemplatePct: Math.round(avgTemplate * 10) / 10,
    avgListening: Math.round(avgListening * 10) / 10,
  };
}

function evaluateGate(reasonFirstMetrics) {
  const checks = [
    {
      name: `OpenAI reasoning >= ${GATE.minOpenAiPct}%`,
      pass: reasonFirstMetrics.openaiPct >= GATE.minOpenAiPct,
      value: `${reasonFirstMetrics.openaiPct}%`,
    },
    {
      name: `Template prose <= ${GATE.maxTemplatePct}%`,
      pass: reasonFirstMetrics.avgTemplatePct <= GATE.maxTemplatePct,
      value: `${reasonFirstMetrics.avgTemplatePct}%`,
    },
    {
      name: `Listening score >= ${GATE.minListening}/10`,
      pass: reasonFirstMetrics.avgListening >= GATE.minListening,
      value: `${reasonFirstMetrics.avgListening}/10`,
    },
  ];
  return { checks, pass: checks.every((c) => c.pass) };
}

function mdTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${r.join(' | ')} |`),
  ].join('\n');
}

function buildReport({ legacyResults, reasonResults, legacyMetrics, reasonMetrics, gate, openaiAvailable }) {
  const lines = [];
  lines.push('# Reason-First Migration Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('Emergency architecture fix: reason-first runtime behind `BUDDY_RUNTIME=reason_first`. Legacy preserved as `BUDDY_RUNTIME=legacy` (default).');
  lines.push('');
  if (!openaiAvailable) {
    lines.push('> **OpenAI unavailable** in this environment. Reason-first gate will fail until `OPENAI_API_KEY` is set and `openai` package is installed.');
    lines.push('');
  }
  lines.push(`**Release gate:** ${gate.pass ? 'PASS' : 'FAIL'}`);
  lines.push('');
  lines.push('## Files Changed');
  lines.push('');
  lines.push('| File | Purpose |');
  lines.push('| --- | --- |');
  lines.push('| `services/reasonFirstBuddyRuntime.js` | Reason-first orchestrator |');
  lines.push('| `services/retrievalEvidencePack.js` | Memory/scripture/history facts only |');
  lines.push('| `services/reasonFirstComposer.js` | OpenAI primary composer |');
  lines.push('| `services/doctrineBoundaryValidator.js` | Post-compose doctrine validation |');
  lines.push('| `services/reasonFirstTrace.js` | Production trace logging |');
  lines.push('| `services/buddyBrain.js` | `BUDDY_RUNTIME` feature flag dispatch |');
  lines.push('| `scripts/reasonFirstMigration.js` | A/B comparison + release gate |');
  lines.push('');
  lines.push('## Feature Flag Instructions');
  lines.push('');
  lines.push('```bash');
  lines.push('# Legacy (default) — route-first runtime');
  lines.push('BUDDY_RUNTIME=legacy node server.js');
  lines.push('');
  lines.push('# Reason-first — OpenAI primary composer');
  lines.push('BUDDY_RUNTIME=reason_first OPENAI_API_KEY=sk-... node server.js');
  lines.push('```');
  lines.push('');
  lines.push('Default when unset: `legacy`.');
  lines.push('');
  lines.push('## Aggregate A/B Metrics');
  lines.push('');
  lines.push(mdTable(
    ['Runtime', 'Turns', 'OpenAI %', 'Avg template %', 'Avg listening'],
    [
      ['legacy', String(legacyMetrics.turns), `${legacyMetrics.openaiPct}%`, `${legacyMetrics.avgTemplatePct}%`, `${legacyMetrics.avgListening}/10`],
      ['reason_first', String(reasonMetrics.turns), `${reasonMetrics.openaiPct}%`, `${reasonMetrics.avgTemplatePct}%`, `${reasonMetrics.avgListening}/10`],
    ]
  ));
  lines.push('');
  lines.push('## Release Gate Checks (reason_first only)');
  lines.push('');
  lines.push(mdTable(
    ['Check', 'Result', 'Value'],
    gate.checks.map((c) => [c.name, c.pass ? 'PASS' : 'FAIL', c.value])
  ));
  lines.push('');
  lines.push('## Thread Comparison');
  lines.push('');

  for (const spec of THREADS) {
    const leg = legacyResults.find((r) => r.id === spec.id);
    const rf = reasonResults.find((r) => r.id === spec.id);
    const legListen = Math.round((leg.turns.reduce((s, t) => s + t.listening, 0) / leg.turns.length) * 10) / 10;
    const rfListen = Math.round((rf.turns.reduce((s, t) => s + t.listening, 0) / rf.turns.length) * 10) / 10;
    lines.push(`### ${spec.name}`);
    lines.push('');
    lines.push(`| | Legacy | Reason-first |`);
    lines.push(`| --- | --- | --- |`);
    lines.push(`| Listening avg | ${legListen} | ${rfListen} |`);
    lines.push(`| OpenAI turns | ${leg.turns.filter((t) => t.openaiCalled).length}/${leg.turns.length} | ${rf.turns.filter((t) => t.openaiCalled).length}/${rf.turns.length} |`);
    lines.push('');
    lines.push('<details><summary>Sample turn (last message)</summary>');
    lines.push('');
    const lt = leg.turns[leg.turns.length - 1];
    const rt = rf.turns[rf.turns.length - 1];
    lines.push(`**User:** ${lt.message}`);
    lines.push('');
    lines.push('**Legacy:**');
    lines.push('```');
    lines.push(lt.reply.slice(0, 600));
    lines.push('```');
    lines.push('');
    lines.push('**Reason-first:**');
    lines.push('```');
    lines.push(rt.reply.slice(0, 600));
    lines.push('```');
    lines.push('');
    lines.push('</details>');
    lines.push('');
  }

  lines.push('## Rollback Plan');
  lines.push('');
  lines.push('1. Unset `BUDDY_RUNTIME` or set `BUDDY_RUNTIME=legacy` — immediate return to route-first runtime.');
  lines.push('2. No database migration required; session format unchanged.');
  lines.push('3. Trace log preserved at `data/reason-first-trace.jsonl` for post-mortem.');
  lines.push('4. Legacy modules untouched — zero deletion rollback risk.');
  lines.push('');
  lines.push('## Human Testing Readiness');
  lines.push('');
  if (gate.pass && openaiAvailable) {
    lines.push('**READY for limited human testing** behind `BUDDY_RUNTIME=reason_first` flag with monitoring of `data/reason-first-trace.jsonl`.');
  } else if (!openaiAvailable) {
    lines.push('**NOT READY** — OpenAI composer unavailable in this environment. Infrastructure gate blocked.');
  } else {
    lines.push('**NOT READY for production human testing** — release gate failed. Keep flag off in production; continue tuning composer/validation locally.');
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('Local validation only. **Do not push. Do not deploy.**');

  return lines.join('\n');
}

async function main() {
  console.log('Reason-First Migration Validation');
  console.log('==================================');

  let openaiModule = false;
  try {
    require.resolve('openai');
    openaiModule = true;
  } catch (_) {}
  const openaiAvailable = !!process.env.OPENAI_API_KEY && openaiModule;
  console.log(`OpenAI ready: ${openaiAvailable}`);

  const legacyResults = [];
  const reasonResults = [];

  for (const spec of THREADS) {
    console.log(`Legacy: ${spec.name}`);
    legacyResults.push(await runThread('legacy', spec));
    console.log(`Reason-first: ${spec.name}`);
    reasonResults.push(await runThread('reason_first', spec));
  }

  const legacyMetrics = aggregateMetrics(legacyResults);
  const reasonMetrics = aggregateMetrics(reasonResults);
  const gate = evaluateGate(reasonMetrics);

  const report = buildReport({ legacyResults, reasonResults, legacyMetrics, reasonMetrics, gate, openaiAvailable });

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_REPORT, report);
  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify({ timestamp: new Date().toISOString(), openaiAvailable, legacyMetrics, reasonMetrics, gate, legacyResults, reasonResults }, null, 2)
  );

  console.log('');
  console.log(`Report: ${OUT_REPORT}`);
  console.log(`JSON: ${OUT_JSON}`);
  console.log('');
  console.log('Legacy:', legacyMetrics);
  console.log('Reason-first:', reasonMetrics);
  console.log('Gate:', gate.pass ? 'PASS' : 'FAIL');

  process.exit(gate.pass && openaiAvailable ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
