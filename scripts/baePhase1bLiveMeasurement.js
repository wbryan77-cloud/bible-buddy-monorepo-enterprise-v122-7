#!/usr/bin/env node
/**
 * BAE Phase 1B — Live OpenAI authority measurement.
 * Requires OPENAI_API_KEY. No code changes to doctrine/retrieval/validators.
 *
 * Outputs:
 *   docs/regression-trace/LiveAuthorityFailureDistribution.json
 *   docs/regression-trace/third-heaven-case-study.json
 *   AuthorityScorecard.md
 *   BibleAuthorityPhase1BMeasurementReport.md
 */
const fs = require('fs');
const path = require('path');
const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');
const { buildComposerSystemPrompt } = require('../services/reasonFirstComposer');
const { slimEvidencePackForComposer } = require('../services/evidencePackSlimmer');
const { buildApprovedEvidenceGraph } = require('../services/approvedEvidenceGraph');
const { validateClaimToScripture, matchesForbidden } = require('../services/claimToScriptureValidator');
const { validateBibleOnlyAuthority } = require('../services/bibleOnlyAuthorityValidator');
const { runBuddy } = require('../services/buddyBrain');
const { clearActiveConversation } = require('../services/activeConversationManager');
const { snapshotMemory } = require('../services/requestMemoryLogger');

const TRACE_DIR = path.join(__dirname, '..', 'docs', 'regression-trace');
const LIVE_DIST = path.join(TRACE_DIR, 'LiveAuthorityFailureDistribution.json');
const CASE_STUDY_OUT = path.join(TRACE_DIR, 'third-heaven-case-study.json');
const SCORECARD_MD = path.join(__dirname, '..', 'AuthorityScorecard.md');
const REPORT_MD = path.join(__dirname, '..', 'BibleAuthorityPhase1BMeasurementReport.md');

const TOPICS = [
  { id: 'third_heaven', label: 'Third heaven', message: 'What is the third heaven?' },
  { id: 'kingdom', label: 'Kingdom', message: 'What is the kingdom of God?' },
  { id: 'acts_10', label: 'Acts 10', message: 'Does Acts 10 make pork clean?' },
  { id: 'pork', label: 'Pork', message: 'Can I eat pork?' },
  { id: 'sabbath', label: 'Sabbath', message: 'How do we keep the Sabbath holy?' },
  { id: 'death_state', label: 'Death state', message: 'What happens when we die?' },
  { id: 'resurrection', label: 'Resurrection', message: 'What does Scripture teach about resurrection?' },
  { id: 'logos', label: 'Logos', message: 'What does Logos mean in John 1:1?' },
  { id: 'holy', label: 'Holy', message: 'What does holy mean?' },
];

const CASE_STUDY_TURNS = [
  'What is the third heaven?',
  'What are the first second and third heavens?',
  'Can believers go to the third heaven?',
  'Where I go ye cannot come.',
  'Kingdom come on earth.',
];

function parseEvidenceFromPrompt(prompt = '') {
  const marker = 'Evidence pack (binding facts — doctrine must trace here):';
  const idx = prompt.indexOf(marker);
  if (idx === -1) return { bytes: 0, cardsInPrompt: false };
  const jsonStr = prompt.slice(idx + marker.length).trim();
  let parsed = null;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (_) {}
  return {
    bytes: Buffer.byteLength(jsonStr, 'utf8'),
    cardsInPrompt: !!(parsed?.evidenceCards?.cards?.length),
    catalogKeys: parsed?.approvedCatalogEvidence?.catalogKeys || [],
    cardIds: (parsed?.evidenceCards?.cards || []).map((c) => c.cardId),
  };
}

function extractClaims(reply = {}) {
  if (!reply || typeof reply !== 'object') return [];
  if (Array.isArray(reply.claims) && reply.claims.length) return reply.claims;
  const results = reply.runtime?.claimValidation?.claimResults;
  return Array.isArray(results) ? results : [];
}

/** Normalize claims from classifyLiveFailures result or reply fallback. */
function normalizeClaimsList(live = {}, reply = {}) {
  if (Array.isArray(live.claims)) return live.claims;
  return extractClaims(reply);
}

function emptyLiveResult(reply = {}, overrides = {}) {
  const dbg = getDbg(reply);
  return {
    codes: { D: false, E: false, F: false, G: false },
    notes: [],
    primary: null,
    claims: [],
    postVal: null,
    runtimeVal: {},
    bibleOnly: null,
    openaiCalled: !!dbg.openaiCalled,
    openaiResponseReceived: !!dbg.openaiCalled && String(reply?.reply || '').length > 10,
    finalAnswerAuthor: dbg.finalAnswerAuthor || null,
    claimDegraded: !!(reply?.runtime?.claimDegraded || dbg.claimDegraded),
    regenerated: !!dbg.regenerated,
    ...overrides,
  };
}

function getDbg(reply) {
  return reply.coreDebug || reply.runtime?.coreDebug || {};
}

function classifyLiveFailures({ pack, reply, message, preFailureA }) {
  const codes = { D: false, E: false, F: false, G: false };
  const notes = [];
  if (preFailureA) {
    return emptyLiveResult(reply, {
      codes,
      notes: [...notes, 'Pre-live failure A — evidence missing for topic'],
      primary: 'A',
      claims: extractClaims(reply),
    });
  }

  const safeReply = reply || {};
  const dbg = getDbg(safeReply);
  const finalAnswer = String(safeReply.reply || '');
  const claims = extractClaims(safeReply);
  const runtimeVal = safeReply.runtime?.claimValidation || {};
  const postVal = validateClaimToScripture({ reply: finalAnswer, claims, evidencePack: pack, message });
  const bibleOnly = validateBibleOnlyAuthority({ reply: finalAnswer, evidencePack: pack, message });
  const orphanForbidden = matchesForbidden(finalAnswer);
  const doctrineClaims = claims.filter((c) => ['doctrine', 'clarification'].includes(c.type || 'doctrine'));

  if (!doctrineClaims.length) {
    codes.E = true;
    notes.push('No doctrine claims[] in compose output');
  }

  const runtimePassed = runtimeVal.passed !== false;
  const postPassed = postVal.passed;
  const degraded = !!(safeReply.runtime?.claimDegraded || dbg.claimDegraded);

  if (doctrineClaims.length && orphanForbidden.length && postPassed) {
    codes.D = true;
    notes.push(`Unsupported doctrine in reply: ${orphanForbidden.map((f) => f.id).join(', ')}`);
  }

  if (!postPassed && runtimePassed && !degraded) {
    codes.G = true;
    notes.push('Validator failed post-hoc but gate shipped without degradation');
  }

  if ((postPassed && runtimePassed && (!bibleOnly.passed || orphanForbidden.length)) || (!postPassed && runtimePassed && !degraded)) {
    if (!codes.G) codes.F = true;
    notes.push('Validator/gate mismatch with post-hoc checks');
  }

  if (!postPassed && !runtimePassed && !degraded && !codes.G) {
    codes.F = true;
    notes.push('Validation failed; gate may have missed regen/degrade');
  }

  const order = ['E', 'D', 'F', 'G'];
  let primary = null;
  for (const k of order) {
    if (codes[k]) {
      primary = k;
      break;
    }
  }
  if (!primary && !postPassed) primary = 'F';
  if (!primary && postPassed && doctrineClaims.length) primary = 'NONE';

  return {
    codes,
    notes,
    primary,
    postVal,
    runtimeVal,
    bibleOnly,
    claims,
    openaiCalled: !!dbg.openaiCalled,
    openaiResponseReceived: !!dbg.openaiCalled && finalAnswer.length > 10,
    finalAnswerAuthor: dbg.finalAnswerAuthor,
    claimDegraded: degraded,
    regenerated: dbg.regenerated,
  };
}

async function measureTopic(topic) {
  const uid = `bae-live-${topic.id}`;
  clearActiveConversation(uid);
  const memBefore = snapshotMemory();

  const pack = buildRetrievalEvidencePack({ userId: uid, message: topic.message, routingHintsOnly: true });
  const graph = buildApprovedEvidenceGraph(pack);
  const prompt = buildComposerSystemPrompt({
    mode: 'COMPANION',
    personaKey: 'ADAPTIVE_COMPANION',
    profile: {},
    runtimeContext: {},
    evidencePack: pack,
    userMessage: topic.message,
    coreRestoration: true,
  });
  const sent = parseEvidenceFromPrompt(prompt);

  const preFailureA = topic.id === 'holy' && !(pack.evidenceCards?.cards || []).length;

  const reply = await runBuddy(uid, 'COMPANION', 'ADAPTIVE_COMPANION', topic.message);
  const memAfter = snapshotMemory();
  let live;
  try {
    live = classifyLiveFailures({ pack, reply: reply || {}, message: topic.message, preFailureA });
  } catch (err) {
    live = emptyLiveResult(reply || {}, {
      notes: [`classifyLiveFailures error: ${err?.message || err}`],
      primary: 'H',
      claims: extractClaims(reply || {}),
    });
  }
  const claimsList = normalizeClaimsList(live, reply || {});

  return {
    topic: topic.id,
    label: topic.label,
    question: topic.message,
    retrievedEvidence: {
      cardIds: (pack.evidenceCards?.cards || []).map((c) => c.cardId),
      catalogKeys: pack.approvedCatalogEvidence?.catalogKeys || [],
      scriptureRefCount: (pack.scripture?.references || []).length,
      approvedRefCount: (graph.refs || []).length,
      bindingRuleCount: (graph.bindingRules || []).length,
    },
    evidenceSent: sent,
    claimsGenerated: claimsList.map((c) => ({
      claimId: c.claimId,
      claim: c.claim,
      supportingScriptures: c.supportingScriptures || [],
      type: c.type,
    })),
    claimSupportFound: (live.postVal?.claimResults || []).map((c) => ({
      claim: c.claim,
      supportClass: c.classification,
      validatorDecision: c.validatorDecision,
      issues: c.issues,
    })),
    validatorDecision: {
      runtimePassed: live.runtimeVal?.passed,
      postPassed: live.postVal?.passed,
      bibleOnlyPassed: live.bibleOnly?.passed,
      claimDegraded: live.claimDegraded,
      regenerated: live.regenerated,
    },
    finalAnswer: String((reply || {}).reply || '').slice(0, 1000),
    openaiCalled: live.openaiCalled,
    openaiResponseReceived: live.openaiResponseReceived,
    finalAnswerAuthor: live.finalAnswerAuthor,
    memoryBefore: memBefore,
    memoryAfter: memAfter,
    liveFailurePrimary: preFailureA ? 'A' : live.primary,
    liveFailureCodes: live?.codes || {},
    failureNotes: live?.notes || [],
    preFailureA,
  };
}

async function runCaseStudy() {
  const uid = 'bae-live-third-heaven-case';
  clearActiveConversation(uid);
  const turns = [];

  for (let i = 0; i < CASE_STUDY_TURNS.length; i += 1) {
    const message = CASE_STUDY_TURNS[i];
    const memBefore = snapshotMemory();
    const pack = buildRetrievalEvidencePack({ userId: uid, message, routingHintsOnly: true });
    const sent = parseEvidenceFromPrompt(
      buildComposerSystemPrompt({
        mode: 'COMPANION',
        personaKey: 'ADAPTIVE_COMPANION',
        profile: {},
        runtimeContext: {},
        evidencePack: pack,
        userMessage: message,
        coreRestoration: true,
      })
    );
    const reply = await runBuddy(uid, 'COMPANION', 'ADAPTIVE_COMPANION', message);
    const memAfter = snapshotMemory();
    let live;
    try {
      live = classifyLiveFailures({ pack, reply: reply || {}, message, preFailureA: false });
    } catch (err) {
      live = emptyLiveResult(reply || {}, {
        notes: [`classifyLiveFailures error: ${err?.message || err}`],
        primary: 'H',
        claims: extractClaims(reply || {}),
      });
    }
    const claimsList = normalizeClaimsList(live, reply || {});

    turns.push({
      turn: i + 1,
      question: message,
      retrievedEvidence: {
        cardIds: (pack.evidenceCards?.cards || []).map((c) => c.cardId),
        catalogKeys: pack.approvedCatalogEvidence?.catalogKeys || [],
      },
      evidenceSent: sent,
      claimsGenerated: claimsList.map((c) => ({ claimId: c.claimId, claim: c.claim, supportingScriptures: c.supportingScriptures, type: c.type })),
      claimSupportFound: (live.postVal?.claimResults || []).map((c) => ({
        claim: c.claim,
        supportClass: c.classification,
        validatorDecision: c.validatorDecision,
      })),
      validatorDecision: {
        runtimePassed: live.runtimeVal?.passed,
        postPassed: live.postVal?.passed,
        claimDegraded: live.claimDegraded,
        regenerated: live.regenerated,
      },
      approvalDecision: live.claimDegraded ? 'degraded' : live.postVal?.passed ? 'approved' : 'rejected',
      finalAnswer: String(reply.reply || '').slice(0, 800),
      openaiCalled: live.openaiCalled,
      liveFailurePrimary: live.primary,
      unsupportedInAnswer: matchesForbidden(String(reply.reply || '')).map((f) => f.id),
    });
  }

  const firstUnsupportedTurn = turns.find(
    (t) => t.liveFailurePrimary && t.liveFailurePrimary !== 'NONE' && t.unsupportedInAnswer.length
  ) || turns.find((t) => t.liveFailurePrimary === 'D' || t.liveFailurePrimary === 'F' || t.liveFailurePrimary === 'G');

  return {
    conversationId: uid,
    turns,
    firstUnsupportedDoctrineEntry: firstUnsupportedTurn
      ? { turn: firstUnsupportedTurn.turn, question: firstUnsupportedTurn.question, failure: firstUnsupportedTurn.liveFailurePrimary }
      : null,
  };
}

function buildLiveDistribution(rows) {
  const dist = { D: 0, E: 0, F: 0, G: 0, A: 0, NONE: 0, H: 0 };
  for (const row of rows) {
    const k = row.liveFailurePrimary || 'NONE';
    if (dist[k] !== undefined) dist[k] += 1;
    else dist.NONE += 1;
  }
  return dist;
}

function scoreTopic(row) {
  const cards = row.retrievedEvidence?.cardIds || [];
  const retrieval = row.preFailureA ? 0 : cards.length ? 10 : 5;
  const evidenceQuality = row.preFailureA
    ? 0
    : Math.min(10, Math.round((row.retrievedEvidence?.bindingRuleCount || 0) / 2 + (row.retrievedEvidence?.approvedRefCount || 0) / 5));
  const claimExtraction = row.liveBlocked
    ? null
    : row.claimsGenerated.length
      ? 10
      : row.openaiCalled
        ? 0
        : null;
  const claimValidation = row.liveBlocked
    ? null
    : row.validatorDecision?.postPassed
      ? 10
      : row.validatorDecision?.claimDegraded
        ? 7
        : 3;
  const approvalGate = row.liveBlocked
    ? null
    : row.validatorDecision?.claimDegraded
      ? 8
      : row.validatorDecision?.postPassed
        ? 10
        : 2;
  const finalAccuracy = row.liveBlocked
    ? null
    : row.liveFailurePrimary === 'NONE'
      ? 10
      : row.liveFailurePrimary === 'A'
        ? 2
        : 4;

  return { retrieval, evidenceQuality, claimExtraction, claimValidation, approvalGate, finalAccuracy };
}

function buildScorecard(rows, liveRan) {
  const lines = [
    '# Authority Scorecard',
    '',
    `**Date:** ${new Date().toISOString().slice(0, 10)}`,
    `**Live measurement:** ${liveRan ? 'YES' : 'NO — OPENAI_API_KEY missing'}`,
    '',
    'Scores 0–10 per dimension. `—` = not measured (live blocked).',
    '',
    '| Topic | Retrieval | Evidence | Claims | Validation | Gate | Final |',
    '|-------|:---------:|:--------:|:------:|:----------:|:----:|:-----:|',
  ];
  for (const row of rows) {
    const s = scoreTopic({ ...row, liveBlocked: !liveRan });
    const fmt = (v) => (v === null ? '—' : v);
    lines.push(
      `| ${row.label} | ${fmt(s.retrieval)} | ${fmt(s.evidenceQuality)} | ${fmt(s.claimExtraction)} | ${fmt(s.claimValidation)} | ${fmt(s.approvalGate)} | ${fmt(s.finalAccuracy)} |`
    );
  }
  return lines.join('\n');
}

function buildReport(rows, dist, caseStudy, liveRan) {
  const bottleneck = !liveRan
    ? 'UNMEASURED — run with OPENAI_API_KEY'
    : (() => {
        const max = Math.max(dist.D, dist.E, dist.F, dist.G);
        if (max === 0) return 'No D/E/F/G failures detected';
        const ties = [];
        if (dist.D === max) ties.push('1. OpenAI reasoning (D)');
        if (dist.E === max) ties.push('2. Claim extraction (E)');
        if (dist.F === max) ties.push('3. Claim validator (F)');
        if (dist.G === max) ties.push('4. Approval gate (G)');
        return ties.join('; ');
      })();

  return `# Bible Authority Phase 1B Measurement Report

**Date:** ${new Date().toISOString().slice(0, 10)}
**Status:** ${liveRan ? 'LIVE MEASUREMENT COMPLETE' : 'LIVE MEASUREMENT BLOCKED — no OPENAI_API_KEY'}
**Constraints:** No doctrine/evidence/validator/retrieval changes; no push/deploy

## Part A — Live OpenAI trace

${liveRan ? `${rows.length} doctrine topics measured with real OpenAI.` : '**Not executed.** Set OPENAI_API_KEY and run `node scripts/baePhase1bLiveMeasurement.js`.'}

## Part B — Live failure distribution (D/E/F/G)

\`\`\`json
${JSON.stringify({ D: dist.D, E: dist.E, F: dist.F, G: dist.G }, null, 2)}
\`\`\`

| Code | Count |
|------|-------|
| D (OpenAI ignored evidence) | ${dist.D} |
| E (Claim extraction failure) | ${dist.E} |
| F (Validator missed) | ${dist.F} |
| G (Gate allowed unsupported) | ${dist.G} |
| A (pre-live evidence missing) | ${dist.A} |
| NONE (no live failure) | ${dist.NONE} |
| H (runtime) | ${dist.H} |

Artifact: \`docs/regression-trace/LiveAuthorityFailureDistribution.json\`

## Part C — Third heaven case study

${liveRan && caseStudy
    ? `**First unsupported doctrine entry:** Turn ${caseStudy.firstUnsupportedDoctrineEntry?.turn || 'n/a'} — "${caseStudy.firstUnsupportedDoctrineEntry?.question || 'n/a'}" — failure **${caseStudy.firstUnsupportedDoctrineEntry?.failure || 'NONE'}**

See \`docs/regression-trace/third-heaven-case-study.json\`.`
    : '**Not executed** — requires OPENAI_API_KEY.'}

## Part D — Authority scorecard

See [AuthorityScorecard.md](AuthorityScorecard.md).

## Part E — Decision gate (diagnosis only)

**Recommended bottleneck:** ${bottleneck}

${!liveRan ? `Part 0 established A=1, B=0, C=0 offline. **D/E/F/G remain unmeasured** until live run completes.

Do not implement fixes until LiveAuthorityFailureDistribution.json is populated with real counts.` : `Based on measured distribution, prioritize the component with highest D/E/F/G count. Do not add evidence or validators until bottleneck is confirmed across two live runs.`}

**No fixes implemented. No push. No deploy.**
`;
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    const offlineRows = TOPICS.map((t) => {
      const pack = buildRetrievalEvidencePack({ message: t.message, routingHintsOnly: true });
      const graph = buildApprovedEvidenceGraph(pack);
      return {
        label: t.label,
        topic: t.id,
        preFailureA: t.id === 'holy',
        liveBlocked: true,
        retrievedEvidence: {
          cardIds: (pack.evidenceCards?.cards || []).map((c) => c.cardId),
          catalogKeys: pack.approvedCatalogEvidence?.catalogKeys || [],
          approvedRefCount: graph.refs.length,
          bindingRuleCount: graph.bindingRules.length,
        },
        liveFailurePrimary: t.id === 'holy' ? 'A' : 'LIVE_UNMEASURED',
      };
    });
    const blocked = {
      ranAt: new Date().toISOString(),
      liveRan: false,
      error: 'OPENAI_API_KEY not set',
      distribution: { D: 0, E: 0, F: 0, G: 0 },
      offlinePipelineClearance: {
        retrievalPass: offlineRows.filter((r) => !r.preFailureA).length,
        evidenceMissing: offlineRows.filter((r) => r.preFailureA).length,
      },
      note: 'Run: export OPENAI_API_KEY=sk-... && node scripts/baePhase1bLiveMeasurement.js',
    };
    fs.mkdirSync(TRACE_DIR, { recursive: true });
    fs.writeFileSync(LIVE_DIST, JSON.stringify(blocked, null, 2));
    fs.writeFileSync(CASE_STUDY_OUT, JSON.stringify({ liveRan: false, error: 'OPENAI_API_KEY not set' }, null, 2));
    fs.writeFileSync(SCORECARD_MD, buildScorecard(offlineRows, false));
    fs.writeFileSync(REPORT_MD, buildReport(offlineRows, { D: 0, E: 0, F: 0, G: 0, A: 1, NONE: 0, H: 0 }, null, false));
    console.error('OPENAI_API_KEY required for live measurement');
    console.log(JSON.stringify(blocked, null, 2));
    process.exit(2);
  }

  const rows = [];
  for (const topic of TOPICS) {
    rows.push(await measureTopic(topic));
  }
  const caseStudy = await runCaseStudy();
  const dist = buildLiveDistribution(rows);

  const payload = {
    ranAt: new Date().toISOString(),
    liveRan: true,
    distribution: { D: dist.D, E: dist.E, F: dist.F, G: dist.G },
    fullDistribution: dist,
    topics: rows,
  };

  fs.mkdirSync(TRACE_DIR, { recursive: true });
  fs.writeFileSync(LIVE_DIST, JSON.stringify(payload, null, 2));
  fs.writeFileSync(CASE_STUDY_OUT, JSON.stringify(caseStudy, null, 2));
  fs.writeFileSync(SCORECARD_MD, buildScorecard(rows, true));
  fs.writeFileSync(REPORT_MD, buildReport(rows, dist, caseStudy, true));

  console.log(JSON.stringify({ distribution: payload.distribution, topics: rows.length }, null, 2));
  process.exit(dist.D + dist.E + dist.F + dist.G > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
