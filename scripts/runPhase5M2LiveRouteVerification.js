#!/usr/bin/env node
/**
 * Phase 5M.2 — Live route ownership verification.
 * Proves which module produces each response (no fixes).
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { clearDoctrineConversationState } = require('../services/doctrineConversationState');

const ROOT = path.join(__dirname, '..');
const REPORT = path.join(ROOT, 'Phase5M2LiveRouteOwnershipReport.md');

const PROMPTS = [
  { id: 'app', message: 'What is this app?', setup: null },
  { id: 'prayer', message: 'Can you pray with me?', setup: null },
  {
    id: 'explain',
    message: 'How do I explain it to my family?',
    setup: async (u) => {
      await runBuddy({ userId: u, message: 'Can we eat pork?', mode: 'COMPANION' });
    },
  },
  { id: 'nervous', message: "I'm nervous.", setup: null },
  { id: 'remember', message: 'What do you remember?', setup: null },
];

async function runPrompt(userId, { message, setup }) {
  if (setup) await setup(userId);
  const s = await runBuddy({ userId, message, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION' });
  const ro = s.runtime?.routeOwnership || {};
  return {
    input: message,
    intent: ro.detectedIntent || s.runtime?.companionContractMode || null,
    engine: ro.selectedEngine || s.runtime?.orchestratorLane || s.runtime?.masterRoute,
    template: ro.selectedTemplate || null,
    route: ro.selectedRoute || ro.draftRoute || s.runtime?.masterRoute,
    draftRoute: ro.draftRoute,
    draftLane: ro.draftOrchestratorLane,
    repairLane: ro.contractRepairLane || s.runtime?.companionRepairLane,
    owner: ro.finalResponseOwner || (s.runtime?.liveResponseOwner ? 'liveResponseOwner' : 'unknown'),
    finalText: String(s.reply || ''),
    replyPreview: String(s.reply || '').slice(0, 300),
  };
}

function expectedEngine(id) {
  const map = {
    app: 'companionIdentityEngine',
    prayer: 'prayerCompanionEngine',
    explain: 'practicalWisdomEngine',
    nervous: 'companionPresenceEngine',
    remember: 'relationshipSummaryEngine',
  };
  return map[id] || 'companion path';
}

function whyActualWon(r) {
  if (r.repairLane) return `Contract repair lane: ${r.repairLane}`;
  if (r.draftLane) return `Orchestrator lane: ${r.draftLane}`;
  if (r.route) return `Route: ${r.route}`;
  return 'unknown';
}

async function main() {
  const ts = Date.now();
  const results = [];

  for (const p of PROMPTS) {
    const u = `phase5m2-${p.id}-${ts}`;
    clearDoctrineConversationState(u);
    const r = await runPrompt(u, p);
    results.push({ id: p.id, expected: expectedEngine(p.id), ...r });
  }

  const phraseOrigins = [
    {
      phrase: 'I want to answer from Scripture directly',
      file: 'services/bibleCompanionOrchestrator.js',
      function: 'buildClarificationReply',
      returnLine: '71-78',
      returnStatement:
        'return { reply: \'I want to answer from Scripture directly. Could you tell me a little more — which book, topic, or passage you mean?...\', masterRoute: \'bible_companion_clarification\' }',
      caller: 'runBibleCompanionOrchestrator when reasoningPlan.answerLane === \'clarification\' (line ~1127)',
    },
    {
      phrase: 'Scripture invites us to cast our care upon God',
      file: 'services/bibleConceptGraph.js',
      function: 'GRAPH_EXTENSIONS.prayer_comfort.directAnswer (concept graph node)',
      returnLine: '84-85',
      returnStatement:
        '\'I’m here to pray with you. Scripture invites us to cast our care upon God — Philippians 4:6-7 and 1 Peter 5:7.\'',
      caller:
        'Returned when bibleWideReasoningEngine / companionResponseBuilder uses getGraphNode(\'prayer_comfort\').directAnswer instead of prayerCompanionEngine',
    },
    {
      phrase: 'Absolutely — staying with Scripture / Absolutely — staying with the Bible text',
      file: 'services/doctrineFinalAuthorityEngine.js (historical buildActs10FinalAnswer)',
      function: 'buildActs10FinalAnswer',
      returnLine: 'removed in 5M.1; was line 84',
      returnStatement:
        'Historically: `Absolutely — staying with the Bible text: ${exactConclusion}...` — now stripped by singleCompanionContract.polishDoctrineOpener',
      currentProducer:
        'No live producer for "Absolutely — staying" in services/*.js. Current pork path: singleCompanionContract.buildPorkContractReply → "No. Staying with Scripture, pork is unclean..." (services/singleCompanionContract.js ~100)',
      caller: 'strictDoctrineGate / doctrineFinalAuthorityEngine when Acts 10 strict lane wins before contract',
    },
  ];

  const md = [
    '# Phase 5M.2 Live Route Ownership Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    '',
    '## Route tracing',
    '',
    'Every `/buddy/chat` response now logs `[ROUTE_OWNERSHIP]` with:',
    '`detectedIntent`, `detectedConcept`, `selectedEngine`, `selectedTemplate`, `selectedRoute`, `finalResponseOwner`.',
    '',
    'Also stored on `reply.runtime.routeOwnership`.',
    '',
    '---',
    '',
    '## Live prompt traces',
    '',
  ];

  for (const r of results) {
    const match = r.engine?.includes(r.expected.split('.')[0]) || r.engine === r.expected;
    md.push(`### ${r.id}`);
    md.push('');
    md.push('| Field | Value |');
    md.push('|-------|-------|');
    md.push(`| INPUT | ${r.input} |`);
    md.push(`| INTENT | ${r.intent} |`);
    md.push(`| ENGINE CHOSEN | ${r.engine} |`);
    md.push(`| TEMPLATE | ${r.template || '—'} |`);
    md.push(`| DRAFT ROUTE | ${r.draftRoute || '—'} |`);
    md.push(`| DRAFT LANE | ${r.draftLane || '—'} |`);
    md.push(`| REPAIR LANE | ${r.repairLane || '—'} |`);
    md.push(`| RESPONSE OWNER | ${r.owner} |`);
    md.push(`| EXPECTED ENGINE | ${r.expected} |`);
    md.push(`| MATCH | ${match ? 'yes' : 'NO — investigate'} |`);
    md.push('');
    md.push('**FINAL TEXT (preview):**');
    md.push('');
    md.push(`> ${r.replyPreview.replace(/\n/g, ' ')}`);
    md.push('');
    md.push(`**Why actual engine won:** ${whyActualWon(r)}`);
    md.push('');
    if (!match) {
      md.push(`**Where companion path lost ownership:** Draft route \`${r.draftRoute}\` via \`${r.engine}\` before \`${r.owner}\` finalized.`);
      md.push('');
    }
    md.push('---');
    md.push('');
  }

  md.push('## Forbidden phrase origins (exact file / function / return)');
  md.push('');
  for (const p of phraseOrigins) {
    md.push(`### "${p.phrase}"`);
    md.push('');
    md.push(`- **File:** \`${p.file}\``);
    md.push(`- **Function:** ${p.function}`);
    md.push(`- **Return lines:** ${p.returnLine}`);
    md.push(`- **Return statement:** ${p.returnStatement}`);
    md.push(`- **First caller:** ${p.caller}`);
    if (p.currentProducer) md.push(`- **Current live producer:** ${p.currentProducer}`);
    md.push('');
  }

  md.push('## Ownership summary');
  md.push('');
  md.push('| Layer | Role |');
  md.push('|-------|------|');
  md.push('| Orchestrator / engines | Produce **draft** text (`selectedEngine`, `draftRoute`) |');
  md.push('| `liveResponseOwner` | Assigns final `reply` from draft + contract |');
  md.push('| `singleCompanionContract` | Repairs forbidden phrases; may replace draft entirely (`contractRepairLane`) |');
  md.push('| `routes/buddy.js` | Logs `[ROUTE_OWNERSHIP]` on every response |');
  md.push('');

  fs.writeFileSync(REPORT, md.join('\n'), 'utf8');
  console.log(`Phase5M.2 report written: ${REPORT}`);
  for (const r of results) {
    console.log(`[${r.id}] intent=${r.intent} engine=${r.engine} owner=${r.owner}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
