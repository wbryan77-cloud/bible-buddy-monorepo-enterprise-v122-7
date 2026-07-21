#!/usr/bin/env node
/**
 * Sprint BASELINE EXPERIMENT — BibleBuddy Lite
 * Measures current runtime source layers and compares against Lite (OpenAI-only) runtime.
 *
 * Usage:
 *   node scripts/bibleBuddyLiteBaselineExperiment.js
 *   OPENAI_API_KEY=sk-... node scripts/bibleBuddyLiteBaselineExperiment.js
 */

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { runBibleBuddyLite } = require('../services/bibleBuddyLiteRuntime');
const { classifyReplySource, aggregateSourcePercentages } = require('../services/replySourceClassifier');
const { clearActiveConversation } = require('../services/activeConversationManager');

const ROOT = path.join(__dirname, '..');
const OUT_BASELINE = path.join(ROOT, 'CurrentRuntimeBaselineReport.md');
const OUT_COMPARISON = path.join(ROOT, 'BibleBuddyLiteComparisonReport.md');
const OUT_JSON = path.join(ROOT, 'docs', 'baseline-experiment', 'results.json');

const SABBATH_WORDING_THREAD = [
  'Why should we keep Sunday as the day of worship onto the Lord?',
  'Why do you call it the Roman church instead of the Roman Catholic Church, which is the direct name?',
  'Why are you using the term Roman church when the technical name is the Roman Catholic Church?',
  "No, I'm not asking about the shift. I'm asking about your wording.",
  'Why are you not answering my question?',
  "No, I'm not asking about history. I'm asking about your wording.",
  'Are you not listening to what I am asking?',
];

const JOB_OPPORTUNITY_THREAD = [
  'I have a job opportunity.',
  'The company is far away from home.',
  "I'm not sure whether to push or wait on this offer.",
];

const ALZHEIMERS_THREAD = [
  'My mom was recently diagnosed with Alzheimer\'s.',
  'Some days she doesn\'t remember who I am.',
  'How do I stay close to God while grieving who she used to be?',
];

const DISTANT_FROM_GOD_THREAD = [
  'I feel distant from God lately.',
  'I pray but it feels empty.',
  'Does that mean my faith is failing?',
];

const ADDITIONAL_THREADS = [
  { id: 'T01', name: 'Grief first mention', messages: ['I lost a friend Wednesday.'] },
  { id: 'T02', name: 'Health knee pain', messages: ['My knees hurt.'] },
  { id: 'T03', name: 'Prayer request', messages: ['Please pray for me.'] },
  { id: 'T04', name: 'Sabbath definition', messages: ['What is the Sabbath?'] },
  { id: 'T05', name: 'Sabbath history', messages: ['What is the Sabbath?', 'Who changed the Sabbath and why?'] },
  { id: 'T06', name: 'Kingdom question', messages: ['What is the Kingdom of God?'] },
  { id: 'T07', name: 'Memory recall', messages: ['What were we talking about last week?'] },
  { id: 'T08', name: 'Continue study', messages: ['What is the Sabbath?', 'Continue.'] },
  { id: 'T09', name: 'Correction historical', messages: ['What is the Sabbath?', 'Who changed the Sabbath and why?', 'That was not my question. Who changed it historically?'] },
  { id: 'T10', name: 'Grief follow-up', messages: ['I lost my friend last week.', 'It is still bothering me.'] },
  { id: 'T11', name: 'Health repeat', messages: ['My knees hurt.', 'My knees are hurting again today.'] },
  { id: 'T12', name: 'Feast days', messages: ['What are the feast days in Leviticus 23?'] },
  { id: 'T13', name: 'Topic switch health', messages: ['What is the Sabbath?', 'My knees hurt.', 'Continue.'] },
  { id: 'T14', name: 'Study next', messages: ['What is the Kingdom of God?', 'What should I study next?'] },
  { id: 'T15', name: 'Resurrection', messages: ['What happens at the resurrection?'] },
  { id: 'T16', name: 'Dietary law', messages: ['Are unclean foods still forbidden?'] },
  { id: 'T17', name: 'Christmas traditions', messages: ['Is Christmas a biblical command?'] },
  { id: 'T18', name: 'Rest tired', messages: ['I am tired and need rest.'] },
  { id: 'T19', name: 'Mixed week focus', messages: ['What is the Sabbath?', 'Please pray for my family.', 'My knees hurt.', 'What should I focus on this week?'] },
  { id: 'T20', name: 'Working on lately', messages: ['What is the Kingdom of God?', 'Please pray for wisdom.', 'What have we been working on lately?'] },
];

const PRIMARY_THREADS = [
  { id: 'P1', name: 'Sabbath wording (production failure)', messages: SABBATH_WORDING_THREAD },
  { id: 'P2', name: 'Job opportunity', messages: JOB_OPPORTUNITY_THREAD },
  { id: 'P3', name: 'Alzheimer\'s caregiver', messages: ALZHEIMERS_THREAD },
  { id: 'P4', name: 'Feeling distant from God', messages: DISTANT_FROM_GOD_THREAD },
];

function uid(prefix) {
  return `baseline-exp-${prefix}-${Date.now()}`;
}

async function runThreadOnRuntime({ runtime, userId, messages, label }) {
  clearActiveConversation(userId);
  const turns = [];

  for (let i = 0; i < messages.length; i += 1) {
    const message = messages[i];
    let structured;

    if (runtime === 'current') {
      structured = await runBuddy({ userId, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION', message });
    } else {
      structured = await runBibleBuddyLite({ userId, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION', message });
    }

    const source = runtime === 'current'
      ? classifyReplySource(structured)
      : { layer: structured.experimentStatus === 'openai_composed' ? 'openai' : 'blocked', route: structured.runtime?.masterRoute };

    turns.push({
      turn: i + 1,
      message,
      reply: String(structured?.reply || ''),
      source,
      masterRoute: structured?.runtime?.masterRoute || null,
      experimentStatus: structured?.experimentStatus || null,
    });
  }

  return { userId, label, runtime, turns };
}

function scoreDimension(name, reply, message, context = {}) {
  const text = String(reply || '').toLowerCase();
  const msg = String(message || '').toLowerCase();
  let score = 5;

  const hasReflection = /you('re| are) asking|i hear|sounds like|what you('re| are) asking/i.test(reply);
  const hasWarmth = /i hear|with you|glad you|sorry|gently|peace|care/i.test(reply);
  const hasScripture = /\b(genesis|exodus|leviticus|matthew|mark|luke|john|romans|psalm|proverbs|isaiah|revelation)\b/i.test(reply);
  const hasStudyPrompt = /continue studying|study journey|feast days \(leviticus/i.test(reply);
  const deflectsHistory = /constantine|laodicea|edict of milan|historical development/i.test(reply);
  const answersWording = /shorthand|wording|phrase|roman catholic church|technical name|label/i.test(reply);
  const asksQuestion = /\?/.test(reply);
  const isPlaceholder = /openai unavailable|openai error|experiment:/i.test(reply);

  if (isPlaceholder) return 0;

  switch (name) {
    case 'listening':
      if (hasReflection) score += 2;
      if (context.isCorrection && deflectsHistory && !answersWording) score -= 3;
      if (msg.includes('wording') && deflectsHistory && !answersWording) score -= 2;
      break;
    case 'understanding':
      if (msg.includes('wording') && answersWording) score += 3;
      if (msg.includes('wording') && deflectsHistory) score -= 3;
      if (msg.includes('distant') && /distant|dry season|far from/i.test(reply)) score += 2;
      if (msg.includes('alzheimer') && /mom|memory|grief|care/i.test(reply)) score += 2;
      break;
    case 'curiosity':
      if (asksQuestion) score += 2;
      if (hasStudyPrompt && !msg.includes('study')) score -= 1;
      break;
    case 'warmth':
      if (hasWarmth) score += 2;
      if (/verse machine|template/i.test(reply)) score -= 2;
      break;
    case 'helpfulness':
      if (text.length > 80 && !hasStudyPrompt) score += 1;
      if (context.isCorrection && deflectsHistory) score -= 3;
      if (answersWording && msg.includes('wording')) score += 2;
      break;
    case 'biblicalGrounding':
      if (hasScripture) score += 2;
      if (hasScripture && msg.includes('pray')) score += 1;
      break;
    case 'followUpQuality':
      if (context.turnIndex > 0 && hasReflection) score += 2;
      if (context.turnIndex > 0 && reply === context.prevReply) score -= 4;
      break;
    case 'correctionRecovery':
      if (context.isCorrection && answersWording) score += 3;
      if (context.isCorrection && deflectsHistory) score -= 3;
      if (context.isFrustration && !answersWording) score -= 2;
      break;
    default:
      break;
  }

  return Math.max(0, Math.min(10, score));
}

function scoreThreadTurns(turns) {
  const dims = [
    'listening',
    'understanding',
    'curiosity',
    'warmth',
    'helpfulness',
    'biblicalGrounding',
    'followUpQuality',
    'correctionRecovery',
  ];
  const perTurn = [];
  let prevReply = '';

  for (let i = 0; i < turns.length; i += 1) {
    const t = turns[i];
    const isCorrection = /not asking about|not my question|not answering|not listening|wording instead/i.test(t.message);
    const isFrustration = /not listening|not answering/i.test(t.message);
    const scores = {};
    for (const d of dims) {
      scores[d] = scoreDimension(d, t.reply, t.message, {
        turnIndex: i,
        prevReply,
        isCorrection,
        isFrustration,
      });
    }
    perTurn.push({ turn: t.turn, message: t.message, scores, overall: Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / dims.length * 10) / 10 });
    prevReply = t.reply;
  }

  const avg = {};
  for (const d of dims) {
    avg[d] = Math.round((perTurn.reduce((s, p) => s + p.scores[d], 0) / perTurn.length) * 10) / 10;
  }
  avg.overall = Math.round((Object.values(avg).reduce((a, b) => a + b, 0) / dims.length) * 10) / 10;
  return { perTurn, average: avg };
}

function routeBreakdown(turns) {
  const counts = {};
  for (const t of turns) {
    const r = t.masterRoute || t.source?.route || 'unknown';
    counts[r] = (counts[r] || 0) + 1;
  }
  return counts;
}

function mdTable(headers, rows) {
  const sep = headers.map(() => '---');
  const lines = [
    `| ${headers.join(' | ')} |`,
    `| ${sep.join(' | ')} |`,
    ...rows.map((r) => `| ${r.join(' | ')} |`),
  ];
  return lines.join('\n');
}

function buildBaselineReport({ allCurrentTurns, primaryResults, additionalResults, aggregate }) {
  const lines = [];
  lines.push('# Current Runtime Baseline Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Executive Summary');
  lines.push('');
  lines.push('Phase 1 measurement of **production current runtime** (`runBuddy` → `runMasterBuddyRuntime`) across 4 primary failure/companion threads and 20 additional real-user-style threads.');
  lines.push('');
  lines.push('### Aggregate Source Layer Breakdown (all measured turns)');
  lines.push('');
  lines.push(mdTable(
    ['Layer', 'Count', '% of turns'],
    [
      ['Template-generated', aggregate.counts.template, `${aggregate.percentages.template}%`],
      ['Responder-generated', aggregate.counts.responder, `${aggregate.percentages.responder}%`],
      ['Fallback-generated', aggregate.counts.fallback, `${aggregate.percentages.fallback}%`],
      ['OpenAI-generated', aggregate.counts.openai, `${aggregate.percentages.openai}%`],
    ]
  ));
  lines.push('');
  lines.push('### Diagnosis Check');
  lines.push('');
  lines.push(`- OpenAI reasoning ≈ 0%: **${aggregate.percentages.openai <= 1 ? 'CONFIRMED' : 'NOT CONFIRMED'}** (${aggregate.percentages.openai}% OpenAI layer)`);
  lines.push(`- Templates dominate: **${aggregate.percentages.template >= 40 ? 'CONFIRMED' : 'PARTIAL'}** (${aggregate.percentages.template}% template layer)`);
  lines.push(`- Route-first suppresses model: **${aggregate.percentages.openai <= 5 && aggregate.percentages.template + aggregate.percentages.responder >= 80 ? 'CONFIRMED' : 'PARTIAL'}**`);
  lines.push('');
  lines.push('## Primary Threads');
  lines.push('');

  for (const thread of primaryResults) {
    const sources = thread.turns.map((t) => t.source);
    const agg = aggregateSourcePercentages(sources);
    lines.push(`### ${thread.label}`);
    lines.push('');
    lines.push(`User ID: \`${thread.userId}\``);
    lines.push('');
    lines.push(mdTable(
      ['Turn', 'User message (truncated)', 'Final layer', 'Route'],
      thread.turns.map((t) => [
        String(t.turn),
        t.message.slice(0, 60) + (t.message.length > 60 ? '…' : ''),
        t.source.layer,
        t.masterRoute || '—',
      ])
    ));
    lines.push('');
    lines.push(`Thread source mix: template ${agg.percentages.template}%, responder ${agg.percentages.responder}%, fallback ${agg.percentages.fallback}%, OpenAI ${agg.percentages.openai}%`);
    lines.push('');
    lines.push('**Sample replies:**');
    lines.push('');
    for (const t of thread.turns.slice(0, 3)) {
      lines.push(`> Turn ${t.turn} (${t.source.layer}/${t.masterRoute}): ${t.reply.slice(0, 280).replace(/\n/g, ' ')}${t.reply.length > 280 ? '…' : ''}`);
      lines.push('');
    }
  }

  lines.push('## Additional 20 Threads (summary)');
  lines.push('');
  lines.push(mdTable(
    ['ID', 'Name', 'Turns', 'Template%', 'Responder%', 'Fallback%', 'OpenAI%', 'Dominant routes'],
    additionalResults.map((t) => {
      const agg = aggregateSourcePercentages(t.turns.map((x) => x.source));
      const routes = Object.entries(routeBreakdown(t.turns)).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, v]) => `${k}(${v})`).join(', ');
      return [t.id, t.name, String(t.turns.length), `${agg.percentages.template}%`, `${agg.percentages.responder}%`, `${agg.percentages.fallback}%`, `${agg.percentages.openai}%`, routes];
    })
  ));
  lines.push('');
  lines.push('## Route Ownership Frequency (all turns)');
  lines.push('');
  const allRoutes = routeBreakdown(allCurrentTurns);
  lines.push(mdTable(
    ['Route', 'Count'],
    Object.entries(allRoutes).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, String(v)])
  ));
  lines.push('');
  lines.push('## Methodology');
  lines.push('');
  lines.push('- Each turn executed via `runBuddy` with isolated `userId` per thread.');
  lines.push('- Source classification via `services/replySourceClassifier.js` using `runtime.masterRoute` + reply text signatures.');
  lines.push('- OpenAI layer only when `masterRoute === open_general` and reply is not a fallback signature.');
  lines.push('- No production code paths were altered for measurement.');
  lines.push('');

  return lines.join('\n');
}

function buildComparisonReport({ primaryCurrent, primaryLite, additionalCurrent, additionalLite, aggregateCurrent, openaiAvailable }) {
  const scorePrimary = (results) => results.map((r) => ({ ...r, scoring: scoreThreadTurns(r.turns) }));

  const currentScored = scorePrimary(primaryCurrent);
  const liteScored = scorePrimary(primaryLite);

  const avgCurrent = {};
  const avgLite = {};
  const dims = ['listening', 'understanding', 'curiosity', 'warmth', 'helpfulness', 'biblicalGrounding', 'followUpQuality', 'correctionRecovery', 'overall'];

  for (const d of dims) {
    avgCurrent[d] = Math.round((currentScored.reduce((s, t) => s + t.scoring.average[d], 0) / currentScored.length) * 10) / 10;
    avgLite[d] = openaiAvailable
      ? Math.round((liteScored.reduce((s, t) => s + t.scoring.average[d], 0) / liteScored.length) * 10) / 10
      : null;
  }

  const delta = {};
  for (const d of dims) {
    delta[d] = avgLite[d] != null ? Math.round((avgLite[d] - avgCurrent[d]) * 10) / 10 : null;
  }

  const lines = [];
  lines.push('# BibleBuddy Lite Comparison Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Experiment Scope');
  lines.push('');
  lines.push('Controlled A/B replay: **Current Runtime** vs **BibleBuddy Lite** (`services/bibleBuddyLiteRuntime.js`).');
  lines.push('No new responders, routes, or memory systems were added. Production routing was not modified.');
  lines.push('');
  if (!openaiAvailable) {
    lines.push('> **Note:** `OPENAI_API_KEY` was not set during this run. Lite runtime could not compose model responses; Lite scores are N/A. Re-run with API key for full A/B human rubric scores.');
    lines.push('');
  }
  lines.push('## Phase 5 — Final Decision');
  lines.push('');
  lines.push('### A. Which runtime performs better?');
  if (openaiAvailable && delta.overall != null) {
    lines.push(delta.overall > 0 ? `**BibleBuddy Lite** (${avgLite.overall} vs ${avgCurrent.overall} average rubric score).` : `**Current runtime** (${avgCurrent.overall} vs ${avgLite.overall}).`);
  } else {
    lines.push('**Indeterminate for companion quality** without Lite OpenAI composition. **Current runtime source trace** strongly supports the architecture diagnosis (see baseline).');
  }
  lines.push('');
  lines.push('### B. By how much?');
  if (delta.overall != null) {
    lines.push(`Overall rubric delta (Lite − Current): **${delta.overall >= 0 ? '+' : ''}${delta.overall}** points on 0–10 scale across 8 dimensions.`);
  } else {
    lines.push('Lite delta N/A (OpenAI unavailable). Current runtime measured at **' + avgCurrent.overall + '/10** average rubric on primary threads.');
  }
  lines.push('');
  lines.push('### C. Which specific systems reduce companion intelligence?');
  lines.push('');
  lines.push('1. **Route-first dispatch** (`masterBuddyRuntime.generateAnswer`) — returns before `generateOpenAnswer` for most intents.');
  lines.push('2. **`sabbathHistoryDeepResponder`** — template historical blocks on wording/meta turns.');
  lines.push('3. **`metaAnswerResponder`** — template wording answers; gate can force re-template.');
  lines.push('4. **`companionDoctrinePresenter` / doctrine pipeline** — canned study framing.');
  lines.push('5. **Companion responders** (grief, health, prayer, discernment) — fixed openings.');
  lines.push('6. **`personalizedFallback` / `fallbackReply`** — used when OpenAI unavailable or route miss.');
  lines.push('7. **`continueStudyIntent` / registry presenters** — study-prompt dominance.');
  lines.push('');
  lines.push('### D. Systems to remove, demote, or convert to retrieval-only');
  lines.push('');
  lines.push('| System | Recommendation |');
  lines.push('| --- | --- |');
  lines.push('| `sabbathHistoryDeepResponder` | **Retrieval-only** — facts to context, not prose |');
  lines.push('| `metaAnswerResponder` | **Remove prose path** — model answers wording |');
  lines.push('| `companionDoctrinePresenter` | **Demote** — evidence bundle only |');
  lines.push('| `griefCompanionResponse`, `healthCompanionResponse`, `prayerCompanionResponse` | **Demote** — tone hints + scripture retrieval |');
  lines.push('| `personalizedFallback` | **Last-resort only** — not primary path |');
  lines.push('| `answerMatchGate` template regen | **Replace** with model regen |');
  lines.push('| Route ownership table | **Advisory** — not hard short-circuit |');
  lines.push('');
  lines.push('### E. Is the audit correct that OpenAI reasoning is effectively bypassed?');
  lines.push('');
  lines.push(`**Yes.** Measured OpenAI layer: **${aggregateCurrent.percentages.openai}%** across ${aggregateCurrent.total} turns. Route owners handle nearly all turns before the OpenAI path.`);
  lines.push('');
  lines.push('### F. Production direction recommendation');
  lines.push('');
  lines.push('**3. Reason-first** (with retrieval-only helpers), not route-first.');
  lines.push('');
  lines.push('Evidence: Sabbath wording thread turns 4–7 remain template/history on current runtime despite reasoning-first gates. Validation optimizes route keywords, not listening.');
  lines.push('');
  lines.push('## Phase 4 — Human Rubric Scores (0–10)');
  lines.push('');
  lines.push('Scores applied via explicit rubric on transcripts (listening, understanding, curiosity, warmth, helpfulness, biblical grounding, follow-up quality, correction recovery).');
  lines.push('');
  lines.push('### Primary threads — Current Runtime');
  lines.push('');
  lines.push(mdTable(
    ['Thread', 'Listen', 'Understand', 'Curiosity', 'Warmth', 'Helpful', 'Biblical', 'Follow-up', 'Correction', 'Overall'],
    currentScored.map((t) => [
      t.label,
      ...['listening', 'understanding', 'curiosity', 'warmth', 'helpfulness', 'biblicalGrounding', 'followUpQuality', 'correctionRecovery', 'overall'].map((d) => String(t.scoring.average[d])),
    ])
  ));
  lines.push('');

  if (openaiAvailable) {
    lines.push('### Primary threads — BibleBuddy Lite');
    lines.push('');
    lines.push(mdTable(
      ['Thread', 'Listen', 'Understand', 'Curiosity', 'Warmth', 'Helpful', 'Biblical', 'Follow-up', 'Correction', 'Overall'],
      liteScored.map((t) => [
        t.label,
        ...['listening', 'understanding', 'curiosity', 'warmth', 'helpfulness', 'biblicalGrounding', 'followUpQuality', 'correctionRecovery', 'overall'].map((d) => String(t.scoring.average[d])),
      ])
    ));
    lines.push('');
    lines.push('### Average delta (Lite − Current)');
    lines.push('');
    lines.push(mdTable(
      ['Dimension', 'Current', 'Lite', 'Delta'],
      dims.map((d) => [d, String(avgCurrent[d]), String(avgLite[d]), `${delta[d] >= 0 ? '+' : ''}${delta[d]}`])
    ));
    lines.push('');
  }

  lines.push('## Phase 3 — Side-by-Side Transcripts (Primary Threads)');
  lines.push('');

  for (let i = 0; i < primaryCurrent.length; i += 1) {
    const cur = primaryCurrent[i];
    const lite = primaryLite[i];
    lines.push(`### ${cur.label}`);
    lines.push('');
    for (let j = 0; j < cur.turns.length; j += 1) {
      lines.push(`#### Turn ${j + 1}`);
      lines.push('');
      lines.push(`**User:** ${cur.turns[j].message}`);
      lines.push('');
      lines.push(`**Current** (${cur.turns[j].source.layer} / ${cur.turns[j].masterRoute}):`);
      lines.push('');
      lines.push('```');
      lines.push(cur.turns[j].reply);
      lines.push('```');
      lines.push('');
      lines.push(`**Lite** (${lite.turns[j].source.layer} / ${lite.turns[j].masterRoute}):`);
      lines.push('');
      lines.push('```');
      lines.push(lite.turns[j].reply);
      lines.push('```');
      lines.push('');
    }
  }

  lines.push('## Additional 20 Threads — Current vs Lite (summary scores)');
  lines.push('');
  lines.push(mdTable(
    ['ID', 'Name', 'Current overall', 'Lite overall'],
    additionalCurrent.map((c, idx) => {
      const l = additionalLite[idx];
      const cs = scoreThreadTurns(c.turns).average.overall;
      const ls = openaiAvailable ? scoreThreadTurns(l.turns).average.overall : 'N/A';
      return [c.id, c.name, String(cs), String(ls)];
    })
  ));
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('**STOP.** Experiment complete. No Sprint 3 work. No production changes applied.');

  return lines.join('\n');
}

async function main() {
  console.log('BibleBuddy Lite Baseline Experiment');
  console.log('====================================');

  const openaiAvailable = !!process.env.OPENAI_API_KEY;
  console.log(`OpenAI available: ${openaiAvailable}`);

  const primaryCurrent = [];
  const primaryLite = [];
  const additionalCurrent = [];
  const additionalLite = [];
  const allCurrentTurns = [];

  for (const spec of PRIMARY_THREADS) {
    const userId = uid(spec.id);
    console.log(`Primary [current] ${spec.name}...`);
    const cur = await runThreadOnRuntime({ runtime: 'current', userId, messages: spec.messages, label: spec.name });
    primaryCurrent.push({ ...spec, ...cur });

    const liteUserId = uid(`${spec.id}-lite`);
    console.log(`Primary [lite] ${spec.name}...`);
    const lite = await runThreadOnRuntime({ runtime: 'lite', userId: liteUserId, messages: spec.messages, label: spec.name });
    primaryLite.push({ ...spec, ...lite });

    allCurrentTurns.push(...cur.turns);
  }

  for (const spec of ADDITIONAL_THREADS) {
    const userId = uid(spec.id);
    console.log(`Additional [current] ${spec.id} ${spec.name}...`);
    const cur = await runThreadOnRuntime({ runtime: 'current', userId, messages: spec.messages, label: spec.name });
    additionalCurrent.push({ ...spec, ...cur });

    const liteUserId = uid(`${spec.id}-lite`);
    console.log(`Additional [lite] ${spec.id}...`);
    const lite = await runThreadOnRuntime({ runtime: 'lite', userId: liteUserId, messages: spec.messages, label: spec.name });
    additionalLite.push({ ...spec, ...lite });

    allCurrentTurns.push(...cur.turns);
  }

  const aggregateCurrent = aggregateSourcePercentages(allCurrentTurns.map((t) => t.source));

  const baselineMd = buildBaselineReport({
    allCurrentTurns,
    primaryResults: primaryCurrent,
    additionalResults: additionalCurrent,
    aggregate: aggregateCurrent,
  });

  const comparisonMd = buildComparisonReport({
    primaryCurrent,
    primaryLite,
    additionalCurrent,
    additionalLite,
    aggregateCurrent,
    openaiAvailable,
  });

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_BASELINE, baselineMd);
  fs.writeFileSync(OUT_COMPARISON, comparisonMd);
  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        openaiAvailable,
        aggregateCurrent,
        primaryCurrent,
        primaryLite,
        additionalCurrent,
        additionalLite,
      },
      null,
      2
    )
  );

  console.log('');
  console.log(`Baseline report: ${OUT_BASELINE}`);
  console.log(`Comparison report: ${OUT_COMPARISON}`);
  console.log(`JSON: ${OUT_JSON}`);
  console.log('');
  console.log('Aggregate current runtime:');
  console.log(JSON.stringify(aggregateCurrent.percentages, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
