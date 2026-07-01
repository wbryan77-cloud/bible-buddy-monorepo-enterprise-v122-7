#!/usr/bin/env node
/**
 * Shadow Runtime Proof of Concept — side-by-side comparison.
 *
 * Usage:
 *   node scripts/shadowRuntimeComparison.js
 *   OPENAI_API_KEY=sk-... node scripts/shadowRuntimeComparison.js
 *
 * Does NOT modify production routing or buddyBrain.
 */

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { runShadowReasonFirst, clearShadowState } = require('../services/shadowReasonFirstRuntime');
const { classifyReplySource } = require('../services/replySourceClassifier');
const { clearActiveConversation } = require('../services/activeConversationManager');

const ROOT = path.join(__dirname, '..');
const OUT_REPORT = path.join(ROOT, 'ShadowRuntimeProofReport.md');
const OUT_JSON = path.join(ROOT, 'docs', 'shadow-runtime', 'comparison-results.json');

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
  "My mom was recently diagnosed with Alzheimer's.",
  "Some days she doesn't remember who I am.",
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
  { id: 'P1', name: 'Sabbath conversation (wording failure thread)', messages: SABBATH_WORDING_THREAD },
  { id: 'P2', name: 'Job opportunity', messages: JOB_OPPORTUNITY_THREAD },
  { id: 'P3', name: "Alzheimer's caregiver", messages: ALZHEIMERS_THREAD },
  { id: 'P4', name: 'Feeling distant from God', messages: DISTANT_FROM_GOD_THREAD },
];

const SCORE_DIMS = [
  'listening',
  'warmth',
  'helpfulness',
  'biblicalGrounding',
  'correctionRecovery',
  'followUpQuality',
];

function uid(prefix) {
  return `shadow-poc-${prefix}-${Date.now()}`;
}

async function runThread({ fn, userId, messages, label, runtimeLabel }) {
  if (runtimeLabel === 'current') clearActiveConversation(userId);
  else clearShadowState(userId);

  const turns = [];
  for (let i = 0; i < messages.length; i += 1) {
    const message = messages[i];
    const structured = await fn({ userId, mode: 'COMPANION', personaKey: 'ADAPTIVE_COMPANION', message });
    turns.push({
      turn: i + 1,
      message,
      reply: String(structured?.reply || ''),
      masterRoute: structured?.runtime?.masterRoute || null,
      experimentStatus: structured?.experimentStatus || null,
      source: runtimeLabel === 'current' ? classifyReplySource(structured) : { layer: 'shadow_openai', route: structured.runtime?.masterRoute },
      validation: structured?.runtime?.validation || null,
    });
  }
  return { userId, label, runtime: runtimeLabel, turns };
}

function scoreTurn(name, reply, message, ctx = {}) {
  const msg = String(message || '').toLowerCase();
  let score = 5;

  const hasReflection = /you('re| are) asking|i hear|sounds like|what you('re| are) asking|you're right/i.test(reply);
  const hasWarmth = /i hear|with you|glad you|sorry|gently|peace|care|heavy|not alone/i.test(reply);
  const hasScripture = /\b(genesis|exodus|leviticus|matthew|mark|luke|john|romans|psalm|proverbs|isaiah|revelation|james|hebrews)\b/i.test(reply);
  const hasStudyPrompt = /would you like to continue studying|continue your study journey|feast days \(leviticus/i.test(reply);
  const deflectsHistory = /constantine|laodicea|edict of milan|historical chain \(secondary/i.test(reply);
  const answersWording = /shorthand|wording|phrase|roman catholic church|technical name|label|precise name/i.test(reply);
  const asksQuestion = /\?/.test(reply);
  const isPlaceholder = /openai unavailable|openai error|shadow runtime:/i.test(reply);
  const repeatsPrior = ctx.prevReply && reply.trim() === ctx.prevReply.trim();

  if (isPlaceholder) return 0;

  switch (name) {
    case 'listening':
      if (hasReflection) score += 2;
      if (ctx.isCorrection && deflectsHistory && !answersWording) score -= 3;
      if (msg.includes('wording') && deflectsHistory && !answersWording) score -= 2;
      if (msg.includes('not listening') && !hasReflection) score -= 2;
      break;
    case 'warmth':
      if (hasWarmth) score += 2;
      if (/verse machine|template/i.test(reply)) score -= 2;
      break;
    case 'helpfulness':
      if (String(reply).length > 80 && !hasStudyPrompt) score += 1;
      if (ctx.isCorrection && deflectsHistory && !answersWording) score -= 3;
      if (answersWording && msg.includes('wording')) score += 2;
      if (msg.includes('alzheimer') && /mom|memory|caregiver|grief|who she used/i.test(reply)) score += 2;
      if (msg.includes('distant') && /dry season|distant|far from|still (love|faith)/i.test(reply)) score += 2;
      break;
    case 'biblicalGrounding':
      if (hasScripture) score += 2;
      if (msg.includes('pray') && hasScripture) score += 1;
      if (deflectsHistory && msg.includes('wording')) score -= 1;
      break;
    case 'correctionRecovery':
      if (ctx.isCorrection && answersWording) score += 3;
      if (ctx.isCorrection && deflectsHistory) score -= 3;
      if (ctx.isFrustration && hasReflection) score += 2;
      if (ctx.isFrustration && !answersWording && !hasReflection) score -= 2;
      break;
    case 'followUpQuality':
      if (ctx.turnIndex > 0 && hasReflection) score += 2;
      if (repeatsPrior) score -= 4;
      if (ctx.turnIndex > 0 && asksQuestion) score += 1;
      break;
    default:
      break;
  }

  return Math.max(0, Math.min(10, score));
}

function scoreThread(turns) {
  const perTurn = [];
  let prevReply = '';

  for (let i = 0; i < turns.length; i += 1) {
    const t = turns[i];
    const isCorrection = /not asking about|not my question|not answering|not listening|wording instead/i.test(t.message);
    const isFrustration = /not listening|not answering/i.test(t.message);
    const scores = {};
    for (const d of SCORE_DIMS) {
      scores[d] = scoreTurn(d, t.reply, t.message, { turnIndex: i, prevReply, isCorrection, isFrustration });
    }
    const overall = Math.round((Object.values(scores).reduce((a, b) => a + b, 0) / SCORE_DIMS.length) * 10) / 10;
    perTurn.push({ turn: t.turn, scores, overall });
    prevReply = t.reply;
  }

  const average = {};
  for (const d of SCORE_DIMS) {
    average[d] = Math.round((perTurn.reduce((s, p) => s + p.scores[d], 0) / perTurn.length) * 10) / 10;
  }
  average.overall = Math.round((Object.values(average).reduce((a, b) => a + b, 0) / SCORE_DIMS.length) * 10) / 10;
  return { perTurn, average };
}

function mdTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${r.join(' | ')} |`),
  ].join('\n');
}

function aggregateScores(threads) {
  const avg = {};
  for (const d of [...SCORE_DIMS, 'overall']) {
    avg[d] = Math.round((threads.reduce((s, t) => s + t.scoring.average[d], 0) / threads.length) * 10) / 10;
  }
  return avg;
}

function buildReport({ primaryCurrent, primaryShadow, additionalCurrent, additionalShadow, openaiAvailable }) {
  const allCurrent = [...primaryCurrent, ...additionalCurrent];
  const allShadow = [...primaryShadow, ...additionalShadow];

  for (const t of allCurrent) t.scoring = scoreThread(t.turns);
  for (const t of allShadow) t.scoring = scoreThread(t.turns);

  const curAgg = aggregateScores(allCurrent);
  const shAgg = aggregateScores(allShadow);
  const delta = {};
  for (const d of [...SCORE_DIMS, 'overall']) {
    delta[d] = Math.round((shAgg[d] - curAgg[d]) * 10) / 10;
  }

  const shadowComposed = allShadow.filter((t) =>
    t.turns.some((x) => x.experimentStatus === 'openai_composed' || x.experimentStatus === 'openai_composed_with_issues')
  ).length;

  const lines = [];
  lines.push('# Shadow Runtime Proof Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Purpose');
  lines.push('');
  lines.push('Proof-of-concept comparing **production current runtime** (`runBuddy`) against **shadow reason-first runtime** (`runShadowReasonFirst`) without modifying production routing, buddyBrain, or existing responders.');
  lines.push('');
  lines.push('## Executive Verdict');
  lines.push('');

  if (!openaiAvailable) {
    lines.push('> **OpenAI was unavailable** during this run. Shadow runtime could not compose responses. Re-run with `OPENAI_API_KEY` set and `openai` package installed for a valid A/B verdict.');
    lines.push('');
  }

  if (openaiAvailable && delta.overall > 0) {
    lines.push(`**Shadow reason-first runtime outperforms current runtime** on rubric average: **${shAgg.overall} vs ${curAgg.overall}** (+${delta.overall} on 0–10 scale).`);
    lines.push('');
    lines.push('Recommendation: **Proceed to migration planning** with feature-flag rollout.');
  } else if (openaiAvailable && delta.overall <= 0) {
    lines.push(`**Current runtime matched or exceeded shadow** on rubric average: ${curAgg.overall} vs ${shAgg.overall}. Review transcripts before committing to 8–10 week migration.`);
  } else {
    lines.push(`Current runtime rubric average: **${curAgg.overall}/10**. Shadow scores **N/A** until OpenAI composition runs.`);
    lines.push('');
    lines.push('Production source trace from baseline still shows **0% OpenAI, 60% template, 40% responder** — architecture risk remains regardless of this run.');
  }

  lines.push('');
  lines.push('## Aggregate Rubric Scores (all 24 threads)');
  lines.push('');
  lines.push(mdTable(
    ['Dimension', 'Current', 'Shadow', 'Delta (Shadow − Current)'],
    [...SCORE_DIMS, 'overall'].map((d) => [d, String(curAgg[d]), openaiAvailable ? String(shAgg[d]) : 'N/A', openaiAvailable ? `${delta[d] >= 0 ? '+' : ''}${delta[d]}` : 'N/A'])
  ));
  lines.push('');
  lines.push(`Shadow threads with model composition: **${shadowComposed} / ${allShadow.length}**`);
  lines.push('');
  lines.push('## Primary Threads — Score Breakdown');
  lines.push('');
  lines.push('### Current Runtime');
  lines.push('');
  lines.push(mdTable(
    ['Thread', ...SCORE_DIMS, 'overall'],
    primaryCurrent.map((t) => [t.label, ...SCORE_DIMS.map((d) => String(t.scoring.average[d])), String(t.scoring.average.overall)])
  ));
  lines.push('');
  lines.push('### Shadow Runtime');
  lines.push('');
  lines.push(mdTable(
    ['Thread', ...SCORE_DIMS, 'overall'],
    primaryShadow.map((t) => [t.label, ...SCORE_DIMS.map((d) => String(t.scoring.average[d])), String(t.scoring.average.overall)])
  ));
  lines.push('');
  lines.push('## Side-by-Side Transcripts (Primary Threads)');
  lines.push('');

  for (let i = 0; i < primaryCurrent.length; i += 1) {
    const cur = primaryCurrent[i];
    const sh = primaryShadow[i];
    lines.push(`### ${cur.label}`);
    lines.push('');
    lines.push(`| Metric | Current | Shadow |`);
    lines.push(`| --- | --- | --- |`);
    lines.push(`| Overall | ${cur.scoring.average.overall} | ${sh.scoring.average.overall} |`);
    lines.push('');

    for (let j = 0; j < cur.turns.length; j += 1) {
      lines.push(`#### Turn ${j + 1}`);
      lines.push('');
      lines.push(`**User:** ${cur.turns[j].message}`);
      lines.push('');
      lines.push(`**Current** (${cur.turns[j].source.layer} / ${cur.turns[j].masterRoute}) — turn score ${cur.scoring.perTurn[j].overall}:`);
      lines.push('');
      lines.push('```');
      lines.push(cur.turns[j].reply);
      lines.push('```');
      lines.push('');
      lines.push(`**Shadow** (${sh.turns[j].experimentStatus || 'n/a'} / ${sh.turns[j].masterRoute}) — turn score ${sh.scoring.perTurn[j].overall}:`);
      lines.push('');
      lines.push('```');
      lines.push(sh.turns[j].reply);
      lines.push('```');
      lines.push('');
    }
  }

  lines.push('## Additional 20 Threads — Summary');
  lines.push('');
  lines.push(mdTable(
    ['ID', 'Name', 'Current overall', 'Shadow overall', 'Delta'],
    additionalCurrent.map((c, idx) => {
      const s = additionalShadow[idx];
      const d = Math.round((s.scoring.average.overall - c.scoring.average.overall) * 10) / 10;
      return [c.id, c.name, String(c.scoring.average.overall), String(s.scoring.average.overall), `${d >= 0 ? '+' : ''}${d}`];
    })
  ));
  lines.push('');
  lines.push('## Shadow Runtime Architecture (POC)');
  lines.push('');
  lines.push('```');
  lines.push('User Message');
  lines.push('  → Conversation Understanding (reasoningSnapshot + intent)');
  lines.push('  → Retrieve Memory (enrichRuntimeContextWithMemory + memory hits)');
  lines.push('  → Retrieve Scripture (scriptureChainExpansion)');
  lines.push('  → Retrieve History (sabbathHistoryDeepResponder facts only)');
  lines.push('  → OpenAI Composer');
  lines.push('  → Validation (doctrine boundaries + answerMatchGate logic, model regen)');
  lines.push('  → Final Reply');
  lines.push('```');
  lines.push('');
  lines.push('## Methodology');
  lines.push('');
  lines.push('- Isolated userIds per thread per runtime (no cross-contamination).');
  lines.push('- Shadow uses in-memory session buffer only — does not append production sessions.');
  lines.push('- Rubric scores 0–10 on six dimensions via explicit heuristics on transcripts.');
  lines.push('- No production files modified; no responders removed.');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('**POC complete.** Not a migration. Not production deployment.');

  return lines.join('\n');
}

async function main() {
  console.log('Shadow Runtime Comparison');
  console.log('=========================');

  const openaiAvailable = !!process.env.OPENAI_API_KEY;
  let openaiModule = false;
  try {
    require.resolve('openai');
    openaiModule = true;
  } catch (_) {}

  console.log(`OPENAI_API_KEY set: ${openaiAvailable}`);
  console.log(`openai package: ${openaiModule ? 'yes' : 'no'}`);

  const primaryCurrent = [];
  const primaryShadow = [];
  const additionalCurrent = [];
  const additionalShadow = [];

  for (const spec of PRIMARY_THREADS) {
    const curId = uid(`${spec.id}-cur`);
    const shId = uid(`${spec.id}-sh`);
    console.log(`Primary current: ${spec.name}`);
    primaryCurrent.push({
      ...(await runThread({
        fn: runBuddy,
        userId: curId,
        messages: spec.messages,
        label: spec.name,
        runtimeLabel: 'current',
      })),
      id: spec.id,
    });
    console.log(`Primary shadow: ${spec.name}`);
    primaryShadow.push({
      ...(await runThread({
        fn: runShadowReasonFirst,
        userId: shId,
        messages: spec.messages,
        label: spec.name,
        runtimeLabel: 'shadow',
      })),
      id: spec.id,
    });
  }

  for (const spec of ADDITIONAL_THREADS) {
    const curId = uid(`${spec.id}-cur`);
    const shId = uid(`${spec.id}-sh`);
    console.log(`Additional current: ${spec.id}`);
    additionalCurrent.push({
      ...(await runThread({
        fn: runBuddy,
        userId: curId,
        messages: spec.messages,
        label: spec.name,
        runtimeLabel: 'current',
      })),
      id: spec.id,
      name: spec.name,
    });
    console.log(`Additional shadow: ${spec.id}`);
    additionalShadow.push({
      ...(await runThread({
        fn: runShadowReasonFirst,
        userId: shId,
        messages: spec.messages,
        label: spec.name,
        runtimeLabel: 'shadow',
      })),
      id: spec.id,
      name: spec.name,
    });
  }

  const report = buildReport({
    primaryCurrent,
    primaryShadow,
    additionalCurrent,
    additionalShadow,
    openaiAvailable: openaiAvailable && openaiModule,
  });

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_REPORT, report);
  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        openaiAvailable: openaiAvailable && openaiModule,
        primaryCurrent,
        primaryShadow,
        additionalCurrent,
        additionalShadow,
      },
      null,
      2
    )
  );

  console.log('');
  console.log(`Report: ${OUT_REPORT}`);
  console.log(`JSON: ${OUT_JSON}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
