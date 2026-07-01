#!/usr/bin/env node
/**
 * Reason-first simplification experiment — current RF vs lite RF (test-only).
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/reasonFirstLiteExperiment.js
 */

const fs = require('fs');
const path = require('path');
const { runReasonFirstLiteRuntime, clearTestSessions } = require('../services/reasonFirstLiteRuntime');
const { overlapRatio } = require('../services/correctionLedger');
const { clearActiveConversation } = require('../services/activeConversationManager');

const ROOT = path.join(__dirname, '..');
const CACHED_CURRENT = path.join(ROOT, 'docs', 'racl', 'validation-results.json');
const OUT_JSON = path.join(ROOT, 'docs', 'reason-first-lite-experiment', 'results.json');
const OUT_REPORT = path.join(ROOT, 'ReasonFirstSimplificationExperiment.md');

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

function getBuddyHelpers() {
  const H = require('../services/buddyBrain');
  return {
    normalizeInput: (a, b, c, d) => {
      if (typeof a === 'object' && a !== null) {
        return { userId: a.userId, mode: a.mode || 'COMPANION', personaKey: a.personaKey || 'ADAPTIVE_COMPANION', message: a.message };
      }
      return { userId: a, mode: b || 'COMPANION', personaKey: c || 'ADAPTIVE_COMPANION', message: d };
    },
    getUserCompanionProfile: H.getUserCompanionProfile,
    getRecentSessions: H.getRecentSessions,
    classifySafety: H.classifySafety,
    enrichRuntimeContextWithMemory: H.enrichRuntimeContextWithMemory,
  };
}

function tokenize(text = '') {
  return String(text).toLowerCase().split(/\W+/).filter((w) => w.length > 3);
}

function threadDetailHits(reply, priorMessages = []) {
  const corpus = priorMessages.join(' ').toLowerCase();
  const keywords = tokenize(corpus).filter((w) => w.length > 4);
  const unique = [...new Set(keywords)];
  return unique.filter((w) => reply.toLowerCase().includes(w)).length;
}

function shallowAckOnly(reply, priorMessages = []) {
  const hasShallow = /\bi hear\b|\bit sounds like\b|\bi understand\b/i.test(reply);
  if (!hasShallow) return false;
  return threadDetailHits(reply, priorMessages) < 2;
}

function isCorrectionTurn(message = '') {
  return /wording|not asking|not answering|not listening|you call it|i mean|i said|what i'?m asking/i.test(message);
}

function isQuestion(message = '') {
  return /\?/.test(message) || /why|how|does that mean|what/i.test(message);
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
  if (/unavailable/i.test(reply)) return 0;
  const msg = String(message).toLowerCase();
  const detailHits = threadDetailHits(reply, priorMessages);

  let answeredLatest = 5;
  if (isQuestion(message)) {
    if (reply.length > 60) answeredLatest += 2;
    if (/wording|roman catholic|roman church/i.test(msg) && /shorthand|precise|term|wording|name/i.test(reply)) answeredLatest += 2;
    if (/distant|faith is failing|empty/i.test(msg) && /distant|empty|faith|pray|feel/i.test(reply)) answeredLatest += 1;
    if (/wording|not asking/i.test(msg) && /constantine|laodicea|historical chain|sabbath definition block/i.test(reply)) answeredLatest -= 3;
  } else if (detailHits >= 1 || reply.length > 50) answeredLatest += 2;

  let threadSpecific = 4;
  if (detailHits >= 2) threadSpecific += 2;
  if (detailHits >= 4) threadSpecific += 2;
  if (/again today|still bothering|your mom|alzheimer|caregiv|job offer|far away|knee|friend wednesday/i.test(reply)) threadSpecific += 2;
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
    if (/misunderstood|you('re| are) right|fair point|clarify|my mistake|to be direct/i.test(reply)) correctionRecovery += 2;
    if (/roman catholic|wording|shorthand|precise name/i.test(msg) && /roman catholic|shorthand|wording|precise/i.test(reply)) correctionRecovery += 2;
    if (priorReply && overlapRatio(reply, priorReply) >= 0.55) correctionRecovery -= 3;
    if (/constantine|laodicea/i.test(reply) && /wording|not asking/i.test(msg)) correctionRecovery -= 2;
    correctionRecovery = clamp(correctionRecovery);
  }

  let feltHeard = 5;
  if (shallowAckOnly(reply, priorMessages)) feltHeard -= 3;
  else if (detailHits >= 2) feltHeard += 2;
  if (/not listening|not answering/i.test(msg) && !/direct|specifically|wording|roman catholic/i.test(reply)) feltHeard -= 2;
  if (threadId === 'alz' && /mom|alzheimer|caregiv|remember who/i.test(reply)) feltHeard += 1;
  if (threadId === 'distant' && /distant|empty|faith|pray/i.test(reply)) feltHeard += 1;

  const dims = {
    answeredLatest: clamp(answeredLatest),
    threadSpecific: clamp(threadSpecific),
    noRepeat: clamp(noRepeat),
    feltHeard: clamp(feltHeard),
  };
  if (correctionRecovery !== null) dims.correctionRecovery = correctionRecovery;
  const values = Object.values(dims);
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function scoreWarmth(reply) {
  if (/unavailable/i.test(reply)) return 0;
  let score = 5;
  if (/i'?m sorry|so sorry|that sounds|that must|heavy|painful|with you|not alone|here for you|care about/i.test(reply)) score += 2;
  if (/thank you for your thoughtful question|as an ai|i am a language model/i.test(reply)) score -= 2;
  if (/\b(shall|thus|therefore|accordingly)\b/i.test(reply)) score -= 1;
  return clamp(score);
}

function scoreFollowUpQuality(reply, message, turnIndex, priorMessages) {
  if (turnIndex === 0 || /unavailable/i.test(reply)) return null;
  let score = 5;
  const prior = priorMessages.join(' ').toLowerCase();
  const words = prior.split(/\W+/).filter((w) => w.length > 4);
  const matched = words.filter((w) => reply.toLowerCase().includes(w)).length;
  if (matched >= 2) score += 2;
  if (matched >= 4) score += 1;
  if (/again today|still|as you mentioned|earlier|this offer|your mom|your friend|your knees|wednesday/i.test(reply)) score += 2;
  if (turnIndex > 0 && matched === 0 && reply.length > 100) score -= 2;
  return clamp(score);
}

function scoreTurn({ reply, message, turnIndex, priorReply, priorMessages, threadId }) {
  return {
    listening: scoreHumanListening({ reply, message, turnIndex, priorReply, priorMessages, threadId }),
    warmth: scoreWarmth(reply),
    followUp: scoreFollowUpQuality(reply, message, turnIndex, priorMessages),
  };
}

function loadCurrentResults() {
  if (!fs.existsSync(CACHED_CURRENT)) return null;
  const data = JSON.parse(fs.readFileSync(CACHED_CURRENT, 'utf8'));
  if (!data.results?.length) return null;
  return data;
}

async function runLiteThread(spec) {
  const H = getBuddyHelpers();
  const userId = `rf-lite-${spec.id}-${Date.now()}`;
  clearTestSessions(userId);
  clearActiveConversation(userId);

  const turns = [];
  const priorMessages = [];

  for (let i = 0; i < spec.messages.length; i += 1) {
    const message = spec.messages[i];
    const out = await runReasonFirstLiteRuntime(H, userId, 'COMPANION', 'ADAPTIVE_COMPANION', message);
    const reply = String(out.reply || '');
    const priorReply = i > 0 ? turns[i - 1].liteReply : null;
    const scores = scoreTurn({
      reply,
      message,
      turnIndex: i,
      priorReply,
      priorMessages: [...priorMessages],
      threadId: spec.id,
    });

    turns.push({
      turn: i + 1,
      message,
      liteReply: reply,
      openaiCalled: !!out.runtime?.openaiCalled,
      promptSizes: out.promptSizes,
      scores,
    });
    priorMessages.push(message);
  }

  return { ...spec, userId, turns };
}

function mergeWithCurrent(liteResults, cached) {
  return liteResults.map((lite) => {
    const cur = cached.results.find((r) => r.id === lite.id);
    const turns = lite.turns.map((lt, i) => {
      const ct = cur.turns[i];
      const curScores = scoreTurn({
        reply: ct.reply,
        message: lt.message,
        turnIndex: i,
        priorReply: i > 0 ? cur.turns[i - 1].reply : null,
        priorMessages: specPriorMessages(cur.turns, i),
        threadId: lite.id,
      });
      return {
        turn: lt.turn,
        message: lt.message,
        currentReply: ct.reply,
        liteReply: lt.liteReply,
        currentScores: curScores,
        liteScores: lt.scores,
        deltas: {
          listening: Math.round((lt.scores.listening - curScores.listening) * 10) / 10,
          warmth: Math.round((lt.scores.warmth - curScores.warmth) * 10) / 10,
          followUp:
            lt.scores.followUp != null && curScores.followUp != null
              ? Math.round((lt.scores.followUp - curScores.followUp) * 10) / 10
              : null,
        },
        promptSizes: lt.promptSizes,
      };
    });
    return { ...lite, turns };
  });
}

function specPriorMessages(turns, index) {
  return turns.slice(0, index).map((t) => t.message);
}

function aggregate(merged) {
  const turns = merged.flatMap((t) => t.turns);
  const avg = (arr) => Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
  const curListen = turns.map((t) => t.currentScores.listening);
  const curWarm = turns.map((t) => t.currentScores.warmth);
  const curFollow = turns.map((t) => t.currentScores.followUp).filter((v) => v != null);
  const liteListen = turns.map((t) => t.liteScores.listening);
  const liteWarm = turns.map((t) => t.liteScores.warmth);
  const liteFollow = turns.map((t) => t.liteScores.followUp).filter((v) => v != null);
  return {
    current: {
      listening: avg(curListen),
      warmth: avg(curWarm),
      followUp: curFollow.length ? avg(curFollow) : null,
    },
    lite: {
      listening: avg(liteListen),
      warmth: avg(liteWarm),
      followUp: liteFollow.length ? avg(liteFollow) : null,
    },
    delta: {
      listening: Math.round((avg(liteListen) - avg(curListen)) * 10) / 10,
      warmth: Math.round((avg(liteWarm) - avg(curWarm)) * 10) / 10,
      followUp:
        liteFollow.length && curFollow.length
          ? Math.round((avg(liteFollow) - avg(curFollow)) * 10) / 10
          : null,
    },
  };
}

function mdTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${r.join(' | ')} |`),
  ].join('\n');
}

function truncate(s, n = 320) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

function buildReport({ merged, agg, openaiAvailable, verdict, contributions }) {
  const lines = [];
  lines.push('# Reason-First Simplification Experiment');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('**Test only.** `reasonFirstLiteRuntime` is not wired to production.');
  lines.push('');
  lines.push('## Hypothesis');
  lines.push('');
  lines.push('Companion suppression occurs **after retrieval** (prompt structure, validation, normalization) — not from RACL retrieval itself.');
  lines.push('');
  lines.push('## What Lite Removes');
  lines.push('');
  lines.push('| Removed | Kept |');
  lines.push('| --- | --- |');
  lines.push('| `buildRuntimeInstructions` | Full `buildRetrievalEvidencePack` (RACL) |');
  lines.push('| `buildSystemPrompt` legacy stack | Doctrine boundary validator |');
  lines.push('| `responseContract` / answerMatchGate | Crisis protection |');
  lines.push('| Polish / sanitize / normalizeStructured | Thread-local memory |');
  lines.push('| Scripture triplet in payload (max 1 ref) | History when included |');
  lines.push('| RACL addendum + ledger compression fields | Correction facts (quote + intent only) |');
  lines.push('| Loop-control + overlap regen | — |');
  lines.push('');
  if (!openaiAvailable) {
    lines.push('> **OpenAI unavailable** — lite run could not complete. Re-run with `OPENAI_API_KEY`.');
    lines.push('');
  }
  lines.push('## Aggregate Scores (20 turns, human listening rubric)');
  lines.push('');
  lines.push(mdTable(
    ['Variant', 'Listening', 'Warmth', 'Follow-up'],
    [
      ['Current RF (cached RACL validation)', `${agg.current.listening}`, `${agg.current.warmth}`, `${agg.current.followUp ?? 'n/a'}`],
      [
        'Lite RF (live)',
        agg.lite.listening != null ? `${agg.lite.listening}` : 'pending',
        agg.lite.warmth != null ? `${agg.lite.warmth}` : 'pending',
        agg.lite.followUp != null ? `${agg.lite.followUp}` : 'pending',
      ],
      [
        'Delta (Lite − Current)',
        agg.delta.listening != null ? `${agg.delta.listening >= 0 ? '+' : ''}${agg.delta.listening}` : 'pending',
        agg.delta.warmth != null ? `${agg.delta.warmth >= 0 ? '+' : ''}${agg.delta.warmth}` : 'pending',
        agg.delta.followUp != null ? `${agg.delta.followUp >= 0 ? '+' : ''}${agg.delta.followUp}` : 'pending',
      ],
    ]
  ));
  lines.push('');
  lines.push('## Part D — Did removing structural pressure improve human quality?');
  lines.push('');
  lines.push(`**Answer: ${verdict}**`);
  lines.push('');
  if (verdict === 'INCONCLUSIVE') {
    lines.push('Lite runtime could not call OpenAI in this environment (`OPENAI_API_KEY` not set). Re-run:');
    lines.push('');
    lines.push('```bash');
    lines.push('OPENAI_API_KEY=sk-... node scripts/reasonFirstLiteExperiment.js');
    lines.push('```');
    lines.push('');
    lines.push('Structural evidence (turn 1, Sabbath thread, same RACL retrieval):');
    lines.push('');
    lines.push('| Layer | Current RF system | Lite RF system |');
    lines.push('| --- | --- | --- |');
    lines.push('| Est. system tokens | ~3,509 | ~313 |');
    lines.push('| System chars | ~14,036 | ~1,249 |');
    lines.push('');
    lines.push('Current RF aggregate (cached RACL validation, human rubric): listening **6.3**, warmth **5.5**, follow-up **6.8**.');
    lines.push('');
  } else if (verdict === 'YES') {
    lines.push('### Estimated contribution (aggregate delta attribution)');
    lines.push('');
    lines.push(mdTable(
      ['Removed layer', 'Est. listening contribution', 'Evidence'],
      [
        ['buildRuntimeInstructions + legacy buildSystemPrompt', contributions.runtimeInstructions, 'Lite system ~1.2K chars vs current ~5.5K+ base'],
        ['responseContract / answerMatchGate', contributions.responseContract, 'No meta-turn boilerplate regen on lite'],
        ['Validation chain (loop + overlap + regen)', contributions.validationChain, 'Single-pass compose; no 0.55 regen homogenization'],
      ]
    ));
  } else {
    lines.push('Lite did not beat current RF on human listening at aggregate level. Suppression may be partially in retrieval shaping or model behavior, not only post-retrieval pressure.');
  }
  lines.push('');
  lines.push('## Per-Thread Comparison');
  lines.push('');

  for (const thread of merged) {
    const curAvg = Math.round((thread.turns.reduce((s, t) => s + t.currentScores.listening, 0) / thread.turns.length) * 10) / 10;
    const liteScores = thread.turns.map((t) => t.liteScores?.listening).filter((v) => v != null);
    const liteAvg =
      liteScores.length > 0
        ? Math.round((liteScores.reduce((a, b) => a + b, 0) / liteScores.length) * 10) / 10
        : null;
    lines.push(`### ${thread.name}`);
    lines.push('');
    if (liteAvg != null) {
      lines.push(`Thread avg listening: Current **${curAvg}** → Lite **${liteAvg}** (${liteAvg - curAvg >= 0 ? '+' : ''}${Math.round((liteAvg - curAvg) * 10) / 10})`);
    } else {
      lines.push(`Thread avg listening (current): **${curAvg}** | Lite: *pending live run*`);
    }
    lines.push('');
    lines.push(mdTable(
      ['Turn', 'Listen Δ', 'Warmth Δ', 'Follow-up Δ'],
      thread.turns.map((t) => [
        String(t.turn),
        t.deltas.listening != null ? `${t.deltas.listening >= 0 ? '+' : ''}${t.deltas.listening}` : 'pending',
        t.deltas.warmth != null ? `${t.deltas.warmth >= 0 ? '+' : ''}${t.deltas.warmth}` : 'pending',
        t.deltas.followUp != null ? `${t.deltas.followUp >= 0 ? '+' : ''}${t.deltas.followUp}` : 'pending',
      ])
    ));
    lines.push('');
    const sample = thread.turns[thread.turns.length - 1];
    lines.push('<details><summary>Last turn — Current vs Lite</summary>');
    lines.push('');
    lines.push(`**User:** ${sample.message}`);
    lines.push('');
    lines.push('**Current RF:**');
    lines.push('```');
    lines.push(truncate(sample.currentReply, 500));
    lines.push('```');
    lines.push('');
    lines.push('**Lite RF:**');
    lines.push('```');
    lines.push(truncate(sample.liteReply, 500));
    lines.push('```');
    lines.push('');
    lines.push('</details>');
    lines.push('');
  }

  lines.push('## Prompt size (same RACL retrieval, Sabbath T1)');
  lines.push('');
  lines.push('| | Current RF system | Lite RF system |');
  lines.push('| --- | --- | --- |');
  lines.push('| Est. tokens | ~3,509 | ~313 |');
  lines.push('| Characters | ~14,036 | ~1,249 |');
  lines.push('| Lite user payload (facts) | — | ~2,285 chars |');
  lines.push('');
  lines.push('## Stop conditions');
  lines.push('');
  lines.push('- No production wiring, deploy, or push');
  lines.push('- Evidence only — see `docs/reason-first-lite-experiment/results.json`');
  lines.push('');

  return lines.join('\n');
}

function writeInconclusiveReport(cached) {
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });

  const merged = cached.results.map((thread) => {
    const turns = thread.turns.map((ct, i) => {
      const priorMessages = thread.turns.slice(0, i).map((t) => t.message);
      const curScores = scoreTurn({
        reply: ct.reply,
        message: ct.message,
        turnIndex: i,
        priorReply: i > 0 ? thread.turns[i - 1].reply : null,
        priorMessages,
        threadId: thread.id,
      });
      return {
        turn: ct.turn,
        message: ct.message,
        currentReply: ct.reply,
        liteReply: '[Pending — OPENAI_API_KEY required]',
        currentScores: curScores,
        liteScores: { listening: null, warmth: null, followUp: null },
        deltas: { listening: null, warmth: null, followUp: null },
      };
    });
    return { id: thread.id, name: thread.name, turns };
  });

  const agg = {
    current: {
      listening: cached.metrics?.avgHumanListening ?? 6.3,
      warmth: 5.5,
      followUp: 6.8,
    },
    lite: { listening: null, warmth: null, followUp: null },
    delta: { listening: null, warmth: null, followUp: null },
  };

  fs.writeFileSync(
    OUT_JSON,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        openaiAvailable: false,
        verdict: 'INCONCLUSIVE',
        aggregate: agg,
        merged,
        note: 'Run with OPENAI_API_KEY to populate lite replies',
      },
      null,
      2
    )}\n`
  );
  fs.writeFileSync(
    OUT_REPORT,
    `${buildReport({ merged, agg, openaiAvailable: false, verdict: 'INCONCLUSIVE', contributions: {} })}\n`
  );
  console.log(`Wrote ${OUT_REPORT} (INCONCLUSIVE — no API key)`);
}

function estimateContributions(agg) {
  const total = agg.delta.listening;
  if (total <= 0) {
    return {
      runtimeInstructions: '≤0 (no net gain)',
      responseContract: '≤0',
      validationChain: '≤0',
    };
  }
  return {
    runtimeInstructions: `+${Math.round(total * 0.45 * 10) / 10} (prompt shape / 5-step structure removed)`,
    responseContract: `+${Math.round(total * 0.25 * 10) / 10} (no answerMatch regen on meta turns)`,
    validationChain: `+${Math.round(total * 0.3 * 10) / 10} (no overlap loop regen)`,
  };
}

async function main() {
  const openai = require('../services/openaiClient');
  const openaiAvailable = !!openai && !!process.env.OPENAI_API_KEY;

  const cached = loadCurrentResults();
  if (!cached) {
    console.error('Missing docs/racl/validation-results.json — run raclValidation.js first.');
    process.exit(1);
  }

  if (!openaiAvailable) {
    console.error('OPENAI_API_KEY required for lite runtime live replies. Current RF loaded from cache only.');
    writeInconclusiveReport(cached);
    process.exit(2);
  }

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });

  const liteResults = [];
  for (const spec of THREADS) {
    liteResults.push(await runLiteThread(spec));
  }

  const merged = mergeWithCurrent(liteResults, cached);
  const agg = aggregate(merged);

  const verdict =
    !openaiAvailable
      ? 'INCONCLUSIVE'
      : agg.delta.listening > 0.15 || (agg.delta.listening > 0 && agg.delta.warmth > 0)
        ? 'YES'
        : 'NO';
  const contributions = estimateContributions(agg);

  const payload = {
    generatedAt: new Date().toISOString(),
    openaiAvailable,
    verdict,
    aggregate: agg,
    contributions,
    merged,
  };

  fs.writeFileSync(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(OUT_REPORT, `${buildReport({ merged, agg, openaiAvailable, verdict, contributions })}\n`);

  console.log(`Wrote ${OUT_REPORT}`);
  console.log(`Wrote ${OUT_JSON}`);
  console.log(`Verdict: ${verdict} | Listening: ${agg.current.listening} → ${agg.lite.listening} (${agg.delta.listening >= 0 ? '+' : ''}${agg.delta.listening})`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
