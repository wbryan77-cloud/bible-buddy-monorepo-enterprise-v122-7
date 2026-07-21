#!/usr/bin/env node
/**
 * Emotional Center Preservation A/B — current RACL vs BUDDY_ECP=1.
 * TEST ONLY. Production default unchanged.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/emotionalCenterPreservationValidation.js
 */

try {
  require('dotenv').config();
} catch (_) {}

const fs = require('fs');
const path = require('path');
const { runBuddy } = require('../services/buddyBrain');
const { estimateProseBreakdown } = require('../services/reasonFirstTrace');
const { clearActiveConversation } = require('../services/activeConversationManager');
const { overlapRatio } = require('../services/correctionLedger');
const { validateDoctrineBoundaries } = require('../services/doctrineBoundaryValidator');
const {
  openingSentence: ecOpening,
  firstParagraph: ecFirstParagraph,
} = require('../services/emotionalCenterValidator');

const ROOT = path.join(__dirname, '..');
const OUT_JSON = path.join(ROOT, 'docs', 'emotional-center-preservation', 'results.json');
const OUT_REPORT = path.join(ROOT, 'EmotionalCenterPreservationReport.md');
const RACL_JSON = path.join(ROOT, 'docs', 'racl', 'validation-results.json');

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

const SPOTLIGHT = [
  { thread: 'job', turn: 1 },
  { thread: 'job', turn: 2 },
  { thread: 'grief', turn: 1 },
  { thread: 'health', turn: 2 },
];

const PASS = { minListeningDelta: 0.4, targetListening: 6.8 };

function uid(prefix, arm) {
  return `ecp-${prefix}-${arm}-${Date.now()}`;
}

function tokenize(text = '') {
  return String(text).toLowerCase().split(/\W+/).filter((w) => w.length > 3);
}

function threadDetailHits(reply, priorMessages = []) {
  const corpus = priorMessages.join(' ').toLowerCase();
  const keywords = [...new Set(tokenize(corpus).filter((w) => w.length > 4))];
  return keywords.filter((w) => reply.toLowerCase().includes(w)).length;
}

function shallowAckOnly(reply, priorMessages = []) {
  if (!/\bi hear\b|\bit sounds like\b|\bi understand\b/i.test(reply)) return false;
  return threadDetailHits(reply, priorMessages) < 2;
}

function isCorrectionTurn(message = '') {
  return /wording|not asking|not answering|not listening|you call it|what i'?m asking/i.test(message);
}

function openingMatch(a, b) {
  const open = (t) => {
    const m = String(t || '').trim().match(/^(.+?[.!?])/);
    return (m ? m[1] : String(t).slice(0, 100)).toLowerCase().trim();
  };
  return open(a) === open(b) && open(a).length > 20;
}

function clamp(n) {
  return Math.max(0, Math.min(10, n));
}

function scoreHumanListening({ reply, message, turnIndex, priorReply, priorMessages, threadId }) {
  if (/unavailable|composer unavailable/i.test(reply)) return { total: 0, dimensions: {} };

  const msg = String(message).toLowerCase();
  const detailHits = threadDetailHits(reply, priorMessages);

  let answeredLatest = 5;
  if (/\?/.test(message) || /why|how|does that mean/i.test(message)) {
    if (reply.length > 60) answeredLatest += 2;
    if (/wording|roman catholic|roman church/i.test(msg) && /shorthand|precise|term|wording|name/i.test(reply)) answeredLatest += 2;
    if (/distant|faith is failing|empty/i.test(msg) && /distant|empty|faith|pray|feel/i.test(reply)) answeredLatest += 1;
    if (/wording|not asking/i.test(msg) && /constantine|laodicea|historical chain/i.test(reply)) answeredLatest -= 3;
  } else if (detailHits >= 1 || reply.length > 50) answeredLatest += 2;

  let threadSpecific = 4;
  if (detailHits >= 2) threadSpecific += 2;
  if (detailHits >= 4) threadSpecific += 2;
  if (/again today|still bothering|your mom|alzheimer|caregiv|job offer|far away|knee|friend wednesday|wednesday/i.test(reply)) {
    threadSpecific += 2;
  }
  if (turnIndex > 0 && detailHits === 0 && reply.length > 120) threadSpecific -= 2;

  let noRepeat = 7;
  if (priorReply) {
    const ratio = overlapRatio(reply, priorReply);
    if (ratio >= 0.65) noRepeat -= 4;
    else if (ratio >= 0.5) noRepeat -= 2;
    else if (ratio < 0.35) noRepeat += 1;
    if (openingMatch(reply, priorReply)) noRepeat -= 3;
  }

  let correctionRecovery = null;
  if (isCorrectionTurn(message)) {
    correctionRecovery = 5;
    if (/misunderstood|you('re| are) right|fair point|clarify|roman catholic|full term|hear your concern/i.test(reply)) {
      correctionRecovery += 2;
    }
    if (priorReply && overlapRatio(reply, priorReply) >= 0.55) correctionRecovery -= 3;
    if (/constantine|laodicea/i.test(reply) && /wording|not asking/i.test(msg)) correctionRecovery -= 2;
    correctionRecovery = clamp(correctionRecovery);
  }

  let feltHeard = 5;
  if (shallowAckOnly(reply, priorMessages)) feltHeard -= 3;
  else if (detailHits >= 2) feltHeard += 2;
  if (/not listening|not answering/i.test(msg) && !/direct|wording|roman catholic|listening/i.test(reply)) feltHeard -= 2;
  if (threadId === 'alz' && /mom|alzheimer|caregiv|remember who/i.test(reply)) feltHeard += 1;

  const dims = {
    answeredLatest: clamp(answeredLatest),
    threadSpecific: clamp(threadSpecific),
    noRepeat: clamp(noRepeat),
    feltHeard: clamp(feltHeard),
  };
  if (correctionRecovery !== null) dims.correctionRecovery = correctionRecovery;
  const values = Object.values(dims);
  return { total: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10, dimensions: dims };
}

function scoreWarmth(reply) {
  let s = 5;
  if (/i'?m sorry|so sorry|with you|not alone|gentle|heavy|painful/i.test(reply)) s += 2;
  if (/^it sounds like\b/i.test(reply.trim())) s -= 1;
  return clamp(s);
}

function scoreCompanionPresence(reply) {
  let s = 5;
  if (/here with you|with you in|not alone|plainly|honest/i.test(reply)) s += 2;
  if (/^it sounds like\b/i.test(reply.trim())) s -= 1;
  if (reply.length >= 80 && reply.length <= 480) s += 1;
  return clamp(s);
}

function scoreOverExplaining(reply) {
  let s = 7;
  if (reply.length > 520) s -= 2;
  if (reply.length > 680) s -= 2;
  return clamp(s);
}

function scoreTurn(ctx) {
  const listening = scoreHumanListening(ctx);
  return {
    listening: listening.total,
    listeningDimensions: listening.dimensions,
    warmth: scoreWarmth(ctx.reply),
    feltHeard: listening.dimensions.feltHeard,
    threadSpecific: listening.dimensions.threadSpecific,
    companionPresence: scoreCompanionPresence(ctx.reply),
    overExplaining: scoreOverExplaining(ctx.reply),
    correctionRecovery: listening.dimensions.correctionRecovery ?? null,
    shallowAck: shallowAckOnly(ctx.reply, ctx.priorMessages),
  };
}

function aggregateArm(turns) {
  const n = turns.length || 1;
  const avg = (key) => Math.round((turns.reduce((s, t) => s + (t.scores[key] ?? 0), 0) / n) * 10) / 10;
  const correctionTurns = turns.filter((t) => t.scores.correctionRecovery != null);
  return {
    turns: n,
    listening: avg('listening'),
    warmth: avg('warmth'),
    feltHeard: avg('feltHeard'),
    threadSpecific: avg('threadSpecific'),
    companionPresence: avg('companionPresence'),
    overExplaining: avg('overExplaining'),
    correctionRecovery:
      correctionTurns.length > 0
        ? Math.round(
            (correctionTurns.reduce((s, t) => s + t.scores.correctionRecovery, 0) / correctionTurns.length) * 10
          ) / 10
        : null,
    shallowAckCount: turns.filter((t) => t.shallowAck).length,
    doctrineFailCount: turns.filter((t) => !t.doctrinePassed).length,
    ecHardFailCount: turns.filter((t) => t.ecHardFail).length,
    openaiPct: Math.round((turns.filter((t) => t.openaiCalled).length / n) * 1000) / 10,
  };
}

async function runThread(spec, arm) {
  const prevRuntime = process.env.BUDDY_RUNTIME;
  const prevEcp = process.env.BUDDY_ECP;
  const prevExamples = process.env.BUDDY_EXAMPLES;
  process.env.BUDDY_RUNTIME = 'reason_first';
  process.env.BUDDY_ECP = arm === 'ecp' ? '1' : '';
  process.env.BUDDY_EXAMPLES = '';

  const userId = uid(spec.id, arm);
  clearActiveConversation(userId);
  const turns = [];
  const priorMessages = [];

  try {
    for (let i = 0; i < spec.messages.length; i += 1) {
      const message = spec.messages[i];
      const structured = await runBuddy({
        userId,
        mode: 'COMPANION',
        personaKey: 'ADAPTIVE_COMPANION',
        message,
      });
      const reply = String(structured?.reply || '');
      const priorReply = i > 0 ? turns[i - 1].reply : null;
      const scores = scoreTurn({
        reply,
        message,
        turnIndex: i,
        priorReply,
        priorMessages: [...priorMessages],
        threadId: spec.id,
      });
      const doctrine = validateDoctrineBoundaries(reply);
      const breakdown = estimateProseBreakdown(reply, 'reason_first', !!structured?.runtime?.openaiCalled);

      turns.push({
        turn: i + 1,
        message,
        reply,
        opening: ecOpening(reply),
        firstParagraph: ecFirstParagraph(reply),
        openaiCalled: !!structured?.runtime?.openaiCalled,
        masterRoute: structured?.runtime?.masterRoute,
        emotionalCenter: structured?.runtime?.emotionalCenter || null,
        ecPreservationMetrics: structured?.runtime?.ecPreservationMetrics || null,
        ecValidation: structured?.runtime?.ecValidation || null,
        templateCharsPct: breakdown.templateCharsPct,
        overlapWithPrior: priorReply ? Math.round(overlapRatio(reply, priorReply) * 100) : 0,
        doctrinePassed: doctrine.passed,
        doctrineIssues: doctrine.issues,
        ecHardFail: !!(structured?.runtime?.ecValidation && structured.runtime.ecValidation.hardFail),
        scores,
        shallowAck: scores.shallowAck,
      });
      priorMessages.push(message);
    }
  } finally {
    process.env.BUDDY_RUNTIME = prevRuntime;
    process.env.BUDDY_ECP = prevEcp;
    process.env.BUDDY_EXAMPLES = prevExamples;
  }

  return { ...spec, userId, arm, turns };
}

function loadCachedControl() {
  if (!fs.existsSync(RACL_JSON)) return null;
  const data = JSON.parse(fs.readFileSync(RACL_JSON, 'utf8'));
  const threads = [];
  const turns = [];
  for (const thread of data.results) {
    const priorMessages = [];
    const scoredTurns = [];
    for (let i = 0; i < thread.turns.length; i += 1) {
      const t = thread.turns[i];
      const priorReply = i > 0 ? thread.turns[i - 1].reply : null;
      const scores = scoreTurn({
        reply: t.reply,
        message: t.message,
        turnIndex: i,
        priorReply,
        priorMessages: [...priorMessages],
        threadId: thread.id,
      });
      const doctrine = validateDoctrineBoundaries(t.reply);
      const row = {
        threadId: thread.id,
        threadName: thread.name,
        turn: t.turn,
        message: t.message,
        reply: t.reply,
        opening: ecOpening(t.reply),
        firstParagraph: ecFirstParagraph(t.reply),
        openaiCalled: t.openaiCalled,
        masterRoute: t.masterRoute,
        scores,
        doctrinePassed: doctrine.passed,
        shallowAck: scores.shallowAck,
      };
      scoredTurns.push(row);
      turns.push(row);
      priorMessages.push(t.message);
    }
    threads.push({ id: thread.id, name: thread.name, turns: scoredTurns });
  }
  return {
    arm: 'control_cached',
    source: RACL_JSON,
    metrics: aggregateArm(turns),
    threads,
    turns,
  };
}

function buildSpotlight(controlThreads, ecpThreads) {
  return SPOTLIGHT.map(({ thread, turn }) => {
    const c = controlThreads.find((t) => t.id === thread)?.turns?.find((x) => x.turn === turn);
    const e = ecpThreads.find((t) => t.id === thread)?.turns?.find((x) => x.turn === turn);
    return {
      thread,
      turn,
      message: c?.message || e?.message,
      control: c
        ? {
            listening: c.scores?.listening,
            opening: c.opening,
            firstParagraph: c.firstParagraph,
            emotionalCenter: null,
          }
        : null,
      ecp: e
        ? {
            listening: e.scores?.listening,
            opening: e.opening,
            firstParagraph: e.firstParagraph,
            emotionalCenter: e.emotionalCenter,
            ecMetrics: e.ecPreservationMetrics,
          }
        : null,
    };
  });
}

function evaluatePass(delta, ecpMetrics, controlMetrics) {
  const sabbathT7 = ecpMetrics.sabbathT7Listening ?? 0;
  const controlT7 = controlMetrics.sabbathT7Listening ?? 0;
  return {
    listeningDelta: delta.listening,
    listeningPass: (delta.listening ?? 0) >= PASS.minListeningDelta,
    targetListening: (ecpMetrics.listening ?? 0) >= PASS.targetListening,
    feltHeardImproved: (delta.feltHeard ?? 0) > 0,
    threadSpecificImproved: (delta.threadSpecific ?? 0) > 0,
    jobT2Improved: delta.jobT2Listening != null && delta.jobT2Listening > 0,
    griefT1Improved: delta.griefT1Listening != null && delta.griefT1Listening > 0,
    sabbathT7NoRegression: sabbathT7 >= controlT7 - 0.3,
    doctrineUnchanged: (ecpMetrics.doctrineFailCount ?? 0) <= (controlMetrics.doctrineFailCount ?? 0),
    pass:
      (delta.listening ?? 0) >= PASS.minListeningDelta &&
      (ecpMetrics.listening ?? 0) >= PASS.targetListening &&
      (delta.jobT2Listening ?? 0) > 0 &&
      (delta.griefT1Listening ?? 0) > 0 &&
      sabbathT7 >= controlT7 - 0.3 &&
      (ecpMetrics.doctrineFailCount ?? 0) <= (controlMetrics.doctrineFailCount ?? 0),
  };
}

function buildReport(payload) {
  const { control, ecp, delta, passGate, openaiAvailable, spotlight } = payload;
  const lines = [];
  lines.push('# Emotional Center Preservation Report');
  lines.push('');
  lines.push(`Generated: ${payload.generatedAt}`);
  lines.push('');
  lines.push('A/B: **Current RACL** (`BUDDY_ECP` off) vs **ECP** (`BUDDY_ECP=1`).');
  lines.push('');
  lines.push(`OpenAI available: **${openaiAvailable}**`);
  lines.push('');
  lines.push('## Success criteria');
  lines.push('');
  lines.push('| Criterion | Result |');
  lines.push('| --- | --- |');
  lines.push(`| Listening ≥ ${PASS.targetListening} | ${passGate.targetListening ? 'PASS' : 'FAIL'} (ECP ${ecp?.metrics?.listening ?? 'n/a'}) |`);
  lines.push(`| Listening Δ ≥ +${PASS.minListeningDelta} | ${passGate.listeningPass ? 'PASS' : 'FAIL'} (${delta.listening ?? 'n/a'}) |`);
  lines.push(`| Job T2 improved | ${passGate.jobT2Improved ? 'PASS' : 'FAIL'} |`);
  lines.push(`| Grief T1 improved | ${passGate.griefT1Improved ? 'PASS' : 'FAIL'} |`);
  lines.push(`| Sabbath T7 stable | ${passGate.sabbathT7NoRegression ? 'PASS' : 'FAIL'} |`);
  lines.push(`| Doctrine validation unchanged | ${passGate.doctrineUnchanged ? 'PASS' : 'FAIL'} |`);
  lines.push(`| **Overall** | **${passGate.pass ? 'PASS' : 'FAIL'}** |`);
  lines.push('');
  lines.push('## Aggregate metrics');
  lines.push('');
  lines.push('| Metric | Control | ECP | Δ |');
  lines.push('| --- | ---: | ---: | ---: |');
  for (const key of [
    'listening',
    'warmth',
    'feltHeard',
    'threadSpecific',
    'companionPresence',
    'overExplaining',
    'correctionRecovery',
  ]) {
    const c = control?.metrics?.[key];
    const e = ecp?.metrics?.[key];
    const d = delta[key];
    if (c == null && e == null) continue;
    lines.push(`| ${key} | ${c ?? '—'} | ${e ?? '—'} | ${d == null ? '—' : `${d >= 0 ? '+' : ''}${d}`} |`);
  }
  lines.push('');
  lines.push('## Spotlight — opening & first paragraph');
  lines.push('');
  for (const s of spotlight) {
    lines.push(`### ${s.thread} T${s.turn}`);
    lines.push('');
    lines.push(`**User:** ${s.message}`);
    lines.push('');
    lines.push('**Control opening**');
    lines.push('```');
    lines.push(s.control?.opening || '(n/a)');
    lines.push('```');
    lines.push('');
    lines.push('**ECP opening**');
    lines.push('```');
    lines.push(s.ecp?.opening || '(n/a)');
    lines.push('```');
    lines.push('');
    lines.push('**Control first paragraph**');
    lines.push('```');
    lines.push(s.control?.firstParagraph || '(n/a)');
    lines.push('```');
    lines.push('');
    lines.push('**ECP first paragraph**');
    lines.push('```');
    lines.push(s.ecp?.firstParagraph || '(n/a)');
    lines.push('```');
    if (s.ecp?.emotionalCenter) {
      lines.push('');
      lines.push(`**ECP extracted center:** ${s.ecp.emotionalCenter.emotionalCenter || 'n/a'}`);
      lines.push('');
      lines.push(`**EC metrics:** ecInOpening=${s.ecp.ecMetrics?.ecInOpening} ecInFirstParagraph=${s.ecp.ecMetrics?.ecInFirstParagraph} abandoned=${s.ecp.ecMetrics?.ecAbandonedAfterOpening}`);
    }
    lines.push('');
  }
  lines.push('## Implementation');
  lines.push('');
  lines.push('- `services/emotionalCenter.js` — extract from RACL pack');
  lines.push('- `services/emotionalCenterValidator.js` — soft metrics + hard fail first-paragraph ignore');
  lines.push('- `services/reasonFirstComposer.js` — `BUDDY_ECP=1` only');
  lines.push('- Production default `BUDDY_RUNTIME=legacy` unchanged');
  lines.push('');
  if (!openaiAvailable) {
    lines.push('> Live ECP arm not run — set `OPENAI_API_KEY` and re-run validation.');
  }
  return lines.join('\n');
}

async function main() {
  const openai = require('../services/openaiClient');
  const openaiAvailable = !!openai && !!process.env.OPENAI_API_KEY;

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });

  let control = loadCachedControl();
  let ecp = null;

  if (openaiAvailable) {
    const controlResults = [];
    for (const spec of THREADS) {
      // eslint-disable-next-line no-await-in-loop
      controlResults.push(await runThread(spec, 'control'));
    }
    const controlTurns = controlResults.flatMap((r) =>
      r.turns.map((t) => ({ ...t, threadId: r.id, threadName: r.name }))
    );
    control = {
      arm: 'control_live',
      metrics: aggregateArm(controlTurns),
      threads: controlResults,
    };

    const ecpResults = [];
    for (const spec of THREADS) {
      // eslint-disable-next-line no-await-in-loop
      ecpResults.push(await runThread(spec, 'ecp'));
    }
    const ecpTurns = ecpResults.flatMap((r) =>
      r.turns.map((t) => ({ ...t, threadId: r.id, threadName: r.name }))
    );
    ecp = {
      arm: 'ecp',
      metrics: aggregateArm(ecpTurns),
      threads: ecpResults,
    };
  }

  const delta = {};
  if (control?.metrics && ecp?.metrics) {
    for (const key of Object.keys(control.metrics)) {
      if (typeof control.metrics[key] === 'number' && typeof ecp.metrics[key] === 'number') {
        delta[key] = Math.round((ecp.metrics[key] - control.metrics[key]) * 10) / 10;
      }
    }
  }

  const turnListening = (arm, threadId, turnNum) => {
    const t = arm?.threads?.find((x) => x.id === threadId)?.turns?.find((x) => x.turn === turnNum);
    return t?.scores?.listening ?? null;
  };

  if (control?.metrics) {
    control.metrics.sabbathT7Listening = turnListening(control, 'sabbath', 7);
  }
  if (ecp?.metrics) {
    ecp.metrics.sabbathT7Listening = turnListening(ecp, 'sabbath', 7);
    delta.jobT2Listening =
      turnListening(ecp, 'job', 2) != null && turnListening(control, 'job', 2) != null
        ? Math.round((turnListening(ecp, 'job', 2) - turnListening(control, 'job', 2)) * 10) / 10
        : null;
    delta.griefT1Listening =
      turnListening(ecp, 'grief', 1) != null && turnListening(control, 'grief', 1) != null
        ? Math.round((turnListening(ecp, 'grief', 1) - turnListening(control, 'grief', 1)) * 10) / 10
        : null;
  }

  const passGate =
    ecp?.metrics && control?.metrics
      ? evaluatePass(delta, ecp.metrics, control.metrics)
      : { pass: false, note: 'blocked' };

  const payload = {
    generatedAt: new Date().toISOString(),
    openaiAvailable,
    control: { arm: control?.arm, metrics: control?.metrics, source: control?.source },
    ecp: { arm: ecp?.arm, metrics: ecp?.metrics, blocked: !ecp },
    delta,
    passGate,
    spotlight: buildSpotlight(control?.threads || [], ecp?.threads || []),
    threadDeltas: THREADS.map((spec) => {
      const c = control?.threads?.find((t) => t.id === spec.id)?.turns || [];
      const e = ecp?.threads?.find((t) => t.id === spec.id)?.turns || [];
      const cAvg = c.length ? c.reduce((s, t) => s + t.scores.listening, 0) / c.length : 0;
      const eAvg = e.length ? e.reduce((s, t) => s + t.scores.listening, 0) / e.length : null;
      return {
        id: spec.id,
        name: spec.name,
        control: Math.round(cAvg * 10) / 10,
        ecp: eAvg == null ? null : Math.round(eAvg * 10) / 10,
        delta: eAvg == null ? null : Math.round((eAvg - cAvg) * 10) / 10,
      };
    }),
  };

  if (ecp?.threads) payload.ecpThreads = ecp.threads;
  if (control?.threads) payload.controlThreads = control.threads;

  fs.writeFileSync(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(OUT_REPORT, `${buildReport(payload)}\n`);

  console.log(`Wrote ${OUT_REPORT}`);
  console.log(`Wrote ${OUT_JSON}`);
  if (!openaiAvailable) {
    console.log('OpenAI unavailable — ECP arm not run. Control from cached RACL JSON.');
    process.exit(1);
  }
  if (ecp?.metrics) {
    console.log(
      `Listening: ${control.metrics.listening} → ${ecp.metrics.listening} (Δ ${delta.listening}) | Pass: ${passGate.pass}`
    );
    process.exit(passGate.pass ? 0 : 1);
  }
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
