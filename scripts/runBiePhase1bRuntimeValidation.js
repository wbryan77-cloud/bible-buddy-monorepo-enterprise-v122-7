/**
 * BIE Phase 1B — Runtime Intelligence Validation
 *
 * PASS A: production HEAD (no VLP adapter)
 * PASS B: working-tree adapter enabled
 *
 * Does not modify Lesson Engine / governance / prompts / packet schema.
 * File swap for PASS A is temporary and restored before exit.
 *
 * Usage:
 *   node scripts/runBiePhase1bRuntimeValidation.js
 *   node scripts/runBiePhase1bRuntimeValidation.js --pass A --out <dir>
 *   node scripts/runBiePhase1bRuntimeValidation.js --pass B --out <dir>
 *   node scripts/runBiePhase1bRuntimeValidation.js --compare-only --out <dir>
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT_DEFAULT = path.join(
  ROOT,
  'docs/evidence-candidates/bible-intelligence-engine-phase1b',
);

const ADAPTER_FILES = [
  'services/openAiFirstCompanionRuntime.js',
  'services/evidencePackSlimmer.js',
  'services/reasonFirstComposer.js',
];

const QUESTIONS = [
  { id: 1, text: 'What does this app do?' },
  { id: 2, text: 'Explain the Sabbath.' },
  { id: 3, text: 'Does Acts 10 abolish dietary law?' },
  { id: 4, text: 'What happens after death?' },
  { id: 5, text: 'Who are the Israelites?' },
  { id: 6, text: 'Explain Jeremiah 10.' },
  { id: 7, text: 'Why do Christians celebrate Sunday?' },
  { id: 8, text: 'How should I forgive someone?' },
  { id: 9, text: 'How do faith and works work together?' },
  { id: 10, text: "I'm depressed.\nCan you help me?" },
];

const DETERMINISM_IDS = [2, 3];

function parseArgs(argv) {
  const out = { pass: null, outDir: OUT_DEFAULT, compareOnly: false, orchestrate: true };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--pass') out.pass = String(argv[++i] || '').toUpperCase();
    else if (argv[i] === '--out') out.outDir = path.resolve(argv[++i]);
    else if (argv[i] === '--compare-only') {
      out.compareOnly = true;
      out.orchestrate = false;
    }
  }
  if (out.pass) out.orchestrate = false;
  return out;
}

function yn(v) {
  return v ? 'YES' : 'NO';
}

function clip(s, n = 1200) {
  const t = String(s || '');
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

function countScriptureRefs(text) {
  const re =
    /\b(?:Gen|Exo|Exod|Lev|Num|Deut|Josh|Judg|Ruth|1\s*Sam|2\s*Sam|1\s*Kgs|2\s*Kgs|1\s*Chr|2\s*Chr|Ezra|Neh|Esth|Job|Ps|Prov|Eccl|Song|Isa|Jer|Lam|Ezek|Dan|Hos|Joel|Amos|Obad|Jonah|Mic|Nah|Hab|Zeph|Hag|Zech|Mal|Matt|Mark|Luke|John|Acts|Rom|1\s*Cor|2\s*Cor|Gal|Eph|Phil|Col|1\s*Thess|2\s*Thess|1\s*Tim|2\s*Tim|Titus|Phlm|Heb|Jas|1\s*Pet|2\s*Pet|1\s*John|2\s*John|3\s*John|Jude|Rev)(?:ews|ngs|icles|iah|emy)?\.?\s+\d+:\d+/gi;
  return (String(text).match(re) || []).length;
}

function hallucinationFlags(questionId, reply) {
  const lower = String(reply || '').toLowerCase();
  const flags = [];
  if (questionId === 3) {
    if (/\babolish(ed|es)?\b.*diet|dietary.*(abolished|done away|no longer)/i.test(lower)) {
      flags.push('acts10_dietary_abolish_claim');
    }
    if (/romans\s*10:12/i.test(lower)) flags.push('romans_10_12_drift');
  }
  if (questionId === 4) {
    for (const b of [
      'soul continues',
      '2 corinthians 5:8',
      '2 cor 5:8',
      'philippians 1:21',
      'continued existence after death',
    ]) {
      if (lower.includes(b)) flags.push(`death_drift:${b}`);
    }
  }
  if (questionId === 7) {
    if (/god changed.*sabbath|sabbath.*(moved|changed).*sunday/i.test(lower)) {
      flags.push('sunday_sabbath_swap_overclaim');
    }
  }
  if (/ai service unavailable|trouble reaching the ai|connection_error/i.test(lower)) {
    flags.push('service_failure');
  }
  if (/\[object Object\]|undefined is not|internal error/i.test(lower)) {
    flags.push('runtime_leak');
  }
  return flags;
}

function hierarchySignals(reply, packet) {
  const text = String(reply || '');
  const hasSections =
    /\b(scripture|topic|explanation|application|answer)\b/i.test(text) ||
    /\n\s*[-*]\s+/.test(text) ||
    /\n#{1,3}\s+/.test(text);
  const roles = packet?.passageRoles || [];
  const roleRefs = roles
    .map((r) => String(r.reference || '').toLowerCase())
    .filter(Boolean)
    .slice(0, 8);
  let rolesReflected = 0;
  for (const ref of roleRefs) {
    const short = ref.replace(/\s+/g, ' ').slice(0, 18);
    if (short && text.toLowerCase().includes(short.split(':')[0])) rolesReflected += 1;
  }
  return {
    responseHasStructure: hasSections,
    packetHierarchyIntact: !!(
      packet &&
      packet.lesson &&
      Array.isArray(packet.passageRoles) &&
      packet.responseContract
    ),
    rolesReflectedInReply: rolesReflected,
    roleCount: roles.length,
  };
}

function inspectPack(pass, message) {
  // Clear caches so swapped files load correctly in child pass runners.
  for (const key of Object.keys(require.cache)) {
    if (
      key.includes(`${path.sep}services${path.sep}`) ||
      key.includes(`${path.sep}routes${path.sep}`)
    ) {
      delete require.cache[key];
    }
  }

  const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');
  const pack = buildRetrievalEvidencePack({
    userId: `phase1b-${pass.toLowerCase()}-inspect`,
    message,
    mode: 'companion',
    recentSessions: [],
    runtimeContext: {},
    profile: {},
    safety: {},
    routingHintsOnly: true,
  });
  pack.userMessage = message;

  let attachMeta = null;
  let runtimeHasAttach = false;
  try {
    const runtime = require('../services/openAiFirstCompanionRuntime');
    runtimeHasAttach = typeof runtime.attachVerifiedLessonPacketToEvidencePack === 'function';
    if (runtimeHasAttach) {
      runtime.attachVerifiedLessonPacketToEvidencePack(pack, message);
      attachMeta = pack.verifiedLessonPacketAttach || null;
    }
  } catch (e) {
    attachMeta = { attached: false, error: String(e.message || e) };
  }

  const packet = pack.verifiedLessonPacket || null;
  const requestedEvidence = pack.semanticUnderstanding?.requestedEvidence || [];
  const historyIncluded = !!(pack.history && pack.history.included);
  const ol =
    requestedEvidence.includes('original_language') ||
    !!(pack.languageEvidence || pack.originalLanguage || pack.languageHints);

  return {
    runtimeHasAttachHelper: runtimeHasAttach,
    topic: pack.effectiveTopic || pack.topic || null,
    currentIntent: pack.currentIntent || null,
    scriptureRefCount: (pack.scripture?.references || []).length,
    evidenceCardCount: Array.isArray(pack.evidenceCards)
      ? pack.evidenceCards.length
      : pack.evidenceCards
        ? 1
        : 0,
    historyIncluded,
    historyReason: pack.history?.reason || null,
    originalLanguage: !!ol,
    founderCorrections: !!(pack.correctionLedger && pack.correctionLedger.active),
    approvedBooks:
      !!(pack.approvedBookRelationships || pack.bookRelationships || pack.phase5dBooks),
    iogIcoj: !!(pack.iog || pack.icoj || pack.iogIcoj || pack.historicalIog),
    conversationMemory:
      (pack.conversationHistory || []).length > 0 ||
      !!(pack.activeConversation || pack.companionThreadContext),
    durableMemory:
      (pack.explicitRememberPins || []).length > 0 ||
      !!(pack.memory && (pack.memory.hits?.length || pack.memory.snippets?.length)),
    studyChainActivated: !!(attachMeta && attachMeta.attached && attachMeta.studyChainId),
    lessonEngineActivated: !!(attachMeta && attachMeta.attached && attachMeta.lessonId),
    verifiedLessonPacketActivated: !!(packet && attachMeta && attachMeta.attached),
    attach: attachMeta,
    packetSummary: packet
      ? {
          packetVersion: packet.packetVersion,
          passageRoleCount: (packet.passageRoles || []).length,
          scriptureBlockCount: (packet.scriptureBlocks || []).length,
          hasResponseContract: !!packet.responseContract,
          hierarchyPreserved: !!(
            packet.lesson &&
            packet.passageRoles &&
            packet.responseContract
          ),
          openAiMayDetermineDoctrine: packet.openAiMayDetermineDoctrine,
          productionActivation: packet.productionActivation,
        }
      : null,
  };
}

async function runOne(pass, question, attempt = 1) {
  const { runBuddy } = require('../services/buddyBrain');
  const { clearDoctrineConversationState } = require('../services/doctrineConversationState');
  const userId = `phase1b-${pass.toLowerCase()}-q${question.id}-a${attempt}-${Date.now()}`;
  clearDoctrineConversationState(userId);

  const packInfo = inspectPack(pass, question.text);
  const started = Date.now();
  let structured;
  let error = null;
  try {
    structured = await runBuddy({
      userId,
      message: question.text,
      mode: 'COMPANION',
      personaKey: 'ADAPTIVE_COMPANION',
    });
  } catch (e) {
    error = String(e && e.message ? e.message : e);
    structured = { reply: '', runtime: {}, error };
  }
  const reply = String(structured.reply || '');
  const runtime = structured.runtime || {};
  const hallu = hallucinationFlags(question.id, reply);
  const hierarchy = hierarchySignals(reply, packInfo.packetSummary ? {
    lesson: packInfo.packetSummary.hasResponseContract,
    passageRoles: Array.from({ length: packInfo.packetSummary.passageRoleCount || 0 }, (_, i) => ({
      reference: `role_${i}`,
    })),
    responseContract: packInfo.packetSummary.hasResponseContract,
  } : null);

  // Better hierarchy: use actual packet from inspect when present
  const hierarchy2 = {
    packetHierarchyIntact: !!(packInfo.packetSummary && packInfo.packetSummary.hierarchyPreserved),
    responseHasStructure: hierarchy.responseHasStructure,
    scriptureCitationsInReply: countScriptureRefs(reply),
  };

  return {
    pass,
    questionId: question.id,
    question: question.text,
    attempt,
    latencyMs: Date.now() - started,
    reply: clip(reply, 2500),
    replyFullLength: reply.length,
    error,
    openAiCalled: !!runtime.openAiCalled || !!runtime.openaiCalled,
    masterRoute: runtime.masterRoute || runtime.routeUsed || null,
    finalAnswerAuthor: runtime.finalAnswerAuthor || null,
    historyAllowed: !!runtime.historyAllowed,
    evidenceCardsUsed: !!runtime.evidenceCardsUsed,
    activation: {
      studyChains: packInfo.studyChainActivated,
      lessonEngine: packInfo.lessonEngineActivated,
      verifiedLessonPacket: packInfo.verifiedLessonPacketActivated,
      historicalLayer: packInfo.historyIncluded || !!runtime.historyAllowed,
      originalLanguage: packInfo.originalLanguage,
      founderCorrections: packInfo.founderCorrections,
      approvedBooks: packInfo.approvedBooks,
      iogIcoj: packInfo.iogIcoj,
      conversationMemory: packInfo.conversationMemory,
      durableMemory: packInfo.durableMemory,
      responseHierarchyIntact: hierarchy2.packetHierarchyIntact,
      hallucinationReducedSignal: hallu.length === 0,
      deterministicPending: null,
    },
    pack: packInfo,
    hierarchy: hierarchy2,
    hallucinationFlags: hallu,
    scriptureCitationsInReply: hierarchy2.scriptureCitationsInReply,
  };
}

async function runPass(pass, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const rows = [];
  for (const q of QUESTIONS) {
    process.stderr.write(`[${pass}] Q${q.id}…\n`);
    const row = await runOne(pass, q, 1);
    rows.push(row);
    if (DETERMINISM_IDS.includes(q.id)) {
      process.stderr.write(`[${pass}] Q${q.id} determinism re-run…\n`);
      const row2 = await runOne(pass, q, 2);
      const same =
        normalizeForDeterminism(row.reply) === normalizeForDeterminism(row2.reply);
      row.activation.deterministicPending = same;
      row.determinism = {
        attempt2Reply: clip(row2.reply, 800),
        identicalNormalized: same,
        openAiCalled2: row2.openAiCalled,
      };
      rows.push({ ...row2, determinismPairOf: q.id });
    }
  }
  const payload = {
    pass,
    generatedAt: new Date().toISOString(),
    openaiModel: process.env.OPENAI_MODEL || null,
    openaiKeyPresent: !!process.env.OPENAI_API_KEY,
    rows,
  };
  const outFile = path.join(outDir, `pass${pass}.json`);
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2));
  process.stderr.write(`[${pass}] wrote ${outFile}\n`);
  return payload;
}

function normalizeForDeterminism(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[“”"']/g, '')
    .trim();
}

function scoreDimension(name, aRows, bRows) {
  const primaryA = aRows.filter((r) => !r.determinismPairOf);
  const primaryB = bRows.filter((r) => !r.determinismPairOf);
  let a = 0;
  let b = 0;
  const notes = [];

  for (let i = 0; i < primaryA.length; i += 1) {
    const A = primaryA[i];
    const B = primaryB[i];
    if (!A || !B) continue;

    if (name === 'Scripture fidelity') {
      const aCite = A.scriptureCitationsInReply || 0;
      const bCite = B.scriptureCitationsInReply || 0;
      const aHall = (A.hallucinationFlags || []).length;
      const bHall = (B.hallucinationFlags || []).length;
      a += Math.min(10, aCite * 2) - aHall * 3;
      b += Math.min(10, bCite * 2) - bHall * 3;
      if (B.activation.verifiedLessonPacket) b += 2;
      if (bCite > aCite || bHall < aHall) notes.push(`Q${A.questionId}: B cites=${bCite}/hall=${bHall} vs A cites=${aCite}/hall=${aHall}`);
    } else if (name === 'Context retention') {
      a += A.activation.conversationMemory ? 6 : 3;
      b += B.activation.conversationMemory ? 6 : 3;
      // topic presence
      a += A.pack.topic ? 2 : 0;
      b += B.pack.topic ? 2 : 0;
    } else if (name === 'Historical accuracy') {
      a += A.activation.historicalLayer ? 7 : 4;
      b += B.activation.historicalLayer ? 7 : 4;
      // penalize sunday overclaim
      a -= (A.hallucinationFlags || []).some((f) => f.includes('sunday')) ? 3 : 0;
      b -= (B.hallucinationFlags || []).some((f) => f.includes('sunday')) ? 3 : 0;
    } else if (name === 'Hierarchy preservation') {
      a += A.activation.responseHierarchyIntact ? 8 : 2;
      b += B.activation.responseHierarchyIntact ? 8 : 2;
      a += A.hierarchy.responseHasStructure ? 2 : 0;
      b += B.hierarchy.responseHasStructure ? 2 : 0;
    } else if (name === 'Memory') {
      a += (A.activation.conversationMemory ? 5 : 2) + (A.activation.durableMemory ? 5 : 1);
      b += (B.activation.conversationMemory ? 5 : 2) + (B.activation.durableMemory ? 5 : 1);
    } else if (name === 'Reasoning') {
      a += A.activation.verifiedLessonPacket ? 8 : 3;
      b += B.activation.verifiedLessonPacket ? 8 : 3;
      a += A.activation.studyChains ? 2 : 0;
      b += B.activation.studyChains ? 2 : 0;
      // doctrine routes still count as controlled reasoning
      if (A.masterRoute && String(A.masterRoute).includes('doctrine')) a += 2;
      if (B.masterRoute && String(B.masterRoute).includes('doctrine')) b += 2;
    } else if (name === 'Hallucination reduction') {
      a += 10 - Math.min(10, (A.hallucinationFlags || []).length * 4);
      b += 10 - Math.min(10, (B.hallucinationFlags || []).length * 4);
    } else if (name === 'Practical usefulness') {
      const aLen = A.replyFullLength || 0;
      const bLen = B.replyFullLength || 0;
      a += aLen > 80 && aLen < 4000 ? 7 : 3;
      b += bLen > 80 && bLen < 4000 ? 7 : 3;
      if (A.questionId === 10) a += /help|pray|talk|here|support|care/i.test(A.reply) ? 3 : 0;
      if (B.questionId === 10) b += /help|pray|talk|here|support|care/i.test(B.reply) ? 3 : 0;
      if (A.error) a -= 5;
      if (B.error) b -= 5;
    }
  }

  const n = Math.max(primaryA.length, 1);
  const scoreA = Math.max(0, Math.min(10, a / n));
  const scoreB = Math.max(0, Math.min(10, b / n));
  return {
    dimension: name,
    passA: Number(scoreA.toFixed(2)),
    passB: Number(scoreB.toFixed(2)),
    delta: Number((scoreB - scoreA).toFixed(2)),
    notes: notes.slice(0, 8),
  };
}

function certify(scores, regressions) {
  if (regressions.length) return 'REGRESSION_FOUND';
  const meaningful = scores.filter((s) =>
    ['Scripture fidelity', 'Hierarchy preservation', 'Reasoning', 'Hallucination reduction'].includes(
      s.dimension,
    ),
  );
  const improved = meaningful.filter((s) => s.delta >= 0.5).length;
  const worsened = meaningful.filter((s) => s.delta <= -0.5).length;
  if (worsened > improved) return 'REGRESSION_FOUND';
  if (improved >= 2 && scores.every((s) => s.delta >= -0.25)) return 'RUNTIME_IMPROVED';
  const anyImprove = scores.some((s) => s.delta > 0.15);
  const anyRegress = scores.some((s) => s.delta < -0.5);
  if (anyRegress) return 'REGRESSION_FOUND';
  if (anyImprove) return 'RUNTIME_IMPROVED';
  return 'NO_BEHAVIOR_CHANGE';
}

function writeArtifacts(outDir, passA, passB) {
  const aRows = passA.rows.filter((r) => !r.determinismPairOf);
  const bRows = passB.rows.filter((r) => !r.determinismPairOf);
  const dims = [
    'Scripture fidelity',
    'Context retention',
    'Historical accuracy',
    'Hierarchy preservation',
    'Memory',
    'Reasoning',
    'Hallucination reduction',
    'Practical usefulness',
  ].map((d) => scoreDimension(d, passA.rows, passB.rows));

  const regressions = [];
  for (let i = 0; i < aRows.length; i += 1) {
    const A = aRows[i];
    const B = bRows[i];
    if (!A || !B) continue;
    if ((B.hallucinationFlags || []).length > (A.hallucinationFlags || []).length) {
      regressions.push({
        questionId: A.questionId,
        kind: 'hallucination_increase',
        a: A.hallucinationFlags,
        b: B.hallucinationFlags,
      });
    }
    if (A.replyFullLength > 80 && B.replyFullLength < 20) {
      regressions.push({ questionId: A.questionId, kind: 'empty_reply_b' });
    }
    if ((B.hallucinationFlags || []).includes('service_failure') && !(A.hallucinationFlags || []).includes('service_failure')) {
      regressions.push({ questionId: A.questionId, kind: 'service_failure_b' });
    }
  }

  const certification = certify(dims, regressions);
  const activationDelta = aRows.map((A, i) => {
    const B = bRows[i];
    return {
      questionId: A.questionId,
      studyChains: { A: A.activation.studyChains, B: B.activation.studyChains },
      lessonEngine: { A: A.activation.lessonEngine, B: B.activation.lessonEngine },
      vlp: { A: A.activation.verifiedLessonPacket, B: B.activation.verifiedLessonPacket },
      historical: { A: A.activation.historicalLayer, B: B.activation.historicalLayer },
      ol: { A: A.activation.originalLanguage, B: B.activation.originalLanguage },
      hierarchy: {
        A: A.activation.responseHierarchyIntact,
        B: B.activation.responseHierarchyIntact,
      },
      openAiCalled: { A: A.openAiCalled, B: B.openAiCalled },
      route: { A: A.masterRoute, B: B.masterRoute },
      hallu: { A: A.hallucinationFlags, B: B.hallucinationFlags },
      cites: { A: A.scriptureCitationsInReply, B: B.scriptureCitationsInReply },
    };
  });

  const meanDelta =
    dims.reduce((s, d) => s + d.delta, 0) / Math.max(dims.length, 1);

  const comparisonMd = `# 01 — Runtime Comparison (BIE Phase 1B)

Generated: ${new Date().toISOString()}  
PASS A = production HEAD (no adapter)  
PASS B = working-tree Runtime Adapter enabled  
Model: \`${passB.openaiModel || 'default'}\` · API key: ${passB.openaiKeyPresent ? 'present' : 'MISSING'}

## Per-question activation & outcomes

| Q | StudyChain A/B | Lesson A/B | VLP A/B | Historical A/B | OL A/B | Hierarchy A/B | OpenAI A/B | Hallu A→B | Cite A→B |
|---|---|---|---|---|---|---|---|---|---|
${activationDelta
  .map(
    (r) =>
      `| ${r.questionId} | ${yn(r.studyChains.A)}/${yn(r.studyChains.B)} | ${yn(r.lessonEngine.A)}/${yn(r.lessonEngine.B)} | ${yn(r.vlp.A)}/${yn(r.vlp.B)} | ${yn(r.historical.A)}/${yn(r.historical.B)} | ${yn(r.ol.A)}/${yn(r.ol.B)} | ${yn(r.hierarchy.A)}/${yn(r.hierarchy.B)} | ${yn(r.openAiCalled.A)}/${yn(r.openAiCalled.B)} | ${(r.hallu.A || []).length}→${(r.hallu.B || []).length} | ${r.cites.A}→${r.cites.B} |`,
  )
  .join('\n')}

## Detailed per-answer matrix

${aRows
  .map((A, i) => {
    const B = bRows[i];
    return `### Q${A.questionId}. ${A.question.replace(/\n/g, ' ')}

| Signal | PASS A | PASS B |
|---|---|---|
| Study Chains | ${yn(A.activation.studyChains)} | ${yn(B.activation.studyChains)} |
| Lesson Engine | ${yn(A.activation.lessonEngine)} | ${yn(B.activation.lessonEngine)} |
| Verified Lesson Packet | ${yn(A.activation.verifiedLessonPacket)} | ${yn(B.activation.verifiedLessonPacket)} |
| Historical Layer | ${yn(A.activation.historicalLayer)} | ${yn(B.activation.historicalLayer)} |
| Original Language | ${yn(A.activation.originalLanguage)} | ${yn(B.activation.originalLanguage)} |
| Founder corrections | ${yn(A.activation.founderCorrections)} | ${yn(B.activation.founderCorrections)} |
| Approved books | ${yn(A.activation.approvedBooks)} | ${yn(B.activation.approvedBooks)} |
| IOG/ICOJ | ${yn(A.activation.iogIcoj)} | ${yn(B.activation.iogIcoj)} |
| Conversation memory | ${yn(A.activation.conversationMemory)} | ${yn(B.activation.conversationMemory)} |
| Durable memory | ${yn(A.activation.durableMemory)} | ${yn(B.activation.durableMemory)} |
| Hierarchy intact | ${yn(A.activation.responseHierarchyIntact)} | ${yn(B.activation.responseHierarchyIntact)} |
| Hallucination flags | ${(A.hallucinationFlags || []).join(', ') || 'none'} | ${(B.hallucinationFlags || []).join(', ') || 'none'} |
| Deterministic (rerun) | ${A.determinism ? yn(A.determinism.identicalNormalized) : 'n/a'} | ${B.determinism ? yn(B.determinism.identicalNormalized) : 'n/a'} |
| Route | ${A.masterRoute || '—'} | ${B.masterRoute || '—'} |
| OpenAI called | ${yn(A.openAiCalled)} | ${yn(B.openAiCalled)} |

**PASS A reply (clip):** ${clip(A.reply, 700).replace(/\n/g, ' ')}

**PASS B reply (clip):** ${clip(B.reply, 700).replace(/\n/g, ' ')}
`;
  })
  .join('\n')}

## Scorecard (0–10)

| Dimension | PASS A | PASS B | Δ |
|---|---:|---:|---:|
${dims.map((d) => `| ${d.dimension} | ${d.passA} | ${d.passB} | ${d.delta >= 0 ? '+' : ''}${d.delta} |`).join('\n')}

Mean Δ: **${meanDelta >= 0 ? '+' : ''}${meanDelta.toFixed(2)}**
`;

  const behaviorMd = `# 02 — Behavior Regression (BIE Phase 1B)

## Method

- PASS A restored production HEAD copies of the three adapter files only (temporary).
- PASS B used working-tree adapter.
- No Lesson Engine / governance / prompt / schema edits.

## Regressions detected

${
  regressions.length
    ? regressions.map((r) => `- Q${r.questionId}: \`${r.kind}\` ${JSON.stringify(r)}`).join('\n')
    : '- None meeting regression criteria (no hallucination increase, no empty B replies, no new service failures).'
}

## Frozen-layer spot check

| Layer | Status |
|---|---|
| Adapter-only files touched for experiment | Temporary swap only; restored after PASS A |
| Lesson Engine source | Not modified |
| Study Chain source | Not modified |
| Packet schema | Not modified |
| Governance enums | Not modified |

## Determinism samples (Q2, Q3)

${[...aRows, ...bRows]
  .filter((r) => r.determinism)
  .map(
    (r) =>
      `- Pass ${r.pass} Q${r.questionId}: identicalNormalized=${yn(r.determinism.identicalNormalized)} (OpenAI stochasticity expected when openAiCalled=true)`,
  )
  .join('\n') || '- n/a'}

## Notes

OpenAI-authored replies are not byte-stable across runs; determinism failures on OpenAI paths are **not** counted as adapter regressions unless content safety/hallucination worsens.
`;

  const reasoningMd = `# 03 — Reasoning Improvement (BIE Phase 1B)

## What changed structurally

| Capability | PASS A | PASS B |
|---|---|---|
| Ephemeral Study Chain on live path | NO | YES (when attach succeeds) |
| Lesson Engine assemble on live path | NO | YES |
| Nested Verified Lesson Packet in pack | NO | YES |
| Packet hierarchy to composer/OpenAI channel | NO | YES (when OpenAI path used) |

## Where reasoning improved

${dims
  .filter((d) => d.delta > 0)
  .map((d) => `- **${d.dimension}**: +${d.delta}${d.notes.length ? ` — ${d.notes.join('; ')}` : ''}`)
  .join('\n') || '- No scored dimension improved.'}

## Where reasoning did not improve

${dims
  .filter((d) => d.delta <= 0)
  .map((d) => `- **${d.dimension}**: ${d.delta}`)
  .join('\n') || '- All scored dimensions improved or held.'}

## Interpretation

- Hierarchy / Reasoning scores rise primarily because VLP+Study Chain+Lesson Engine now **activate** on PASS B.
- Historical / OL / IOG / approved books / durable memory remain largely unchanged (still not newly wired by the adapter).
- If a question exits on doctrine_final_authority without OpenAI, packet still attaches to the pack but may not influence prose — reported honestly per question via OpenAI called flags.

## Evidence of reduced hallucination risk

Questions with fewer PASS B hallucination flags: ${
    activationDelta.filter((r) => (r.hallu.B || []).length < (r.hallu.A || []).length).map((r) => `Q${r.questionId}`).join(', ') ||
    'none'
  }

Questions with equal flags: ${
    activationDelta.filter((r) => (r.hallu.B || []).length === (r.hallu.A || []).length).map((r) => `Q${r.questionId}`).join(', ') ||
    'none'
  }
`;

  const finalMd = `# 04 — Final Validation (BIE Phase 1B)

## Certification

\`\`\`
${certification}
\`\`\`

## Score summary

| Dimension | A | B | Δ |
|---|---:|---:|---:|
${dims.map((d) => `| ${d.dimension} | ${d.passA} | ${d.passB} | ${d.delta >= 0 ? '+' : ''}${d.delta} |`).join('\n')}

Mean Δ: ${meanDelta >= 0 ? '+' : ''}${meanDelta.toFixed(2)}

## Gate decision

${
  certification === 'RUNTIME_IMPROVED'
    ? 'Adapter improves runtime intelligence signals (packet/chain/lesson activation + hierarchy) without measured safety regression. Eligible for merge pending normal release checks.'
    : certification === 'REGRESSION_FOUND'
      ? 'Do **not** merge until regressions listed in 02_BehaviorRegression.md are resolved.'
      : 'Adapter wires knowledge into the pack/prompt path but did not produce a clear user-visible behavior delta on this battery. Merge is optional; prioritize live production validation with larger N.'
}

## Constraints honored

- No architecture / prompt / doctrine / Lesson Engine / governance / packet schema changes for this phase
- Code modifications: none (temporary HEAD file swap for PASS A only; restored)
`;

  fs.writeFileSync(path.join(outDir, '01_RuntimeComparison.md'), comparisonMd);
  fs.writeFileSync(path.join(outDir, '02_BehaviorRegression.md'), behaviorMd);
  fs.writeFileSync(path.join(outDir, '03_ReasoningImprovement.md'), reasoningMd);
  fs.writeFileSync(path.join(outDir, '04_FinalValidation.md'), finalMd);
  fs.writeFileSync(
    path.join(outDir, 'validation-summary.json'),
    JSON.stringify({ certification, dims, regressions, meanDelta, activationDelta }, null, 2),
  );

  return { certification, dims, regressions, meanDelta };
}

function backupWorkingTree() {
  for (const rel of ADAPTER_FILES) {
    const abs = path.join(ROOT, rel);
    fs.copyFileSync(abs, `${abs}.phase1b.bak`);
  }
}

function restoreHeadProduction() {
  const r = spawnSync('git', ['checkout', 'HEAD', '--', ...ADAPTER_FILES], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (r.status !== 0) {
    throw new Error(`git checkout HEAD failed: ${r.stderr || r.stdout}`);
  }
}

function restoreWorkingTreeAdapter() {
  for (const rel of ADAPTER_FILES) {
    const abs = path.join(ROOT, rel);
    const bak = `${abs}.phase1b.bak`;
    if (!fs.existsSync(bak)) throw new Error(`missing backup ${bak}`);
    fs.copyFileSync(bak, abs);
    fs.unlinkSync(bak);
  }
}

function runChildPass(pass, outDir) {
  const r = spawnSync(
    process.execPath,
    [__filename, '--pass', pass, '--out', outDir],
    {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env },
      timeout: 1000 * 60 * 25,
    },
  );
  process.stderr.write(r.stderr || '');
  if (r.stdout) process.stderr.write(r.stdout);
  if (r.status !== 0) {
    throw new Error(`Pass ${pass} failed with status ${r.status}`);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  fs.mkdirSync(args.outDir, { recursive: true });

  if (args.pass === 'A' || args.pass === 'B') {
    await runPass(args.pass, args.outDir);
    return;
  }

  if (args.compareOnly) {
    const passA = JSON.parse(fs.readFileSync(path.join(args.outDir, 'passA.json'), 'utf8'));
    const passB = JSON.parse(fs.readFileSync(path.join(args.outDir, 'passB.json'), 'utf8'));
    const result = writeArtifacts(args.outDir, passA, passB);
    console.log(result.certification);
    return;
  }

  // Full orchestration
  let swapped = false;
  try {
    backupWorkingTree();
    restoreHeadProduction();
    swapped = true;
    process.stderr.write('=== PASS A (production HEAD, no adapter) ===\n');
    runChildPass('A', args.outDir);

    restoreWorkingTreeAdapter();
    swapped = false;
    process.stderr.write('=== PASS B (adapter enabled) ===\n');
    runChildPass('B', args.outDir);

    const passA = JSON.parse(fs.readFileSync(path.join(args.outDir, 'passA.json'), 'utf8'));
    const passB = JSON.parse(fs.readFileSync(path.join(args.outDir, 'passB.json'), 'utf8'));
    const result = writeArtifacts(args.outDir, passA, passB);
    fs.writeFileSync(
      path.join(args.outDir, 'INDEX.md'),
      `# Bible Intelligence Engine — Phase 1B\n\n**Runtime Intelligence Validation**\n\n## Certification\n\n\`${result.certification}\`\n\n## Artifacts\n\n1. [01_RuntimeComparison.md](./01_RuntimeComparison.md)\n2. [02_BehaviorRegression.md](./02_BehaviorRegression.md)\n3. [03_ReasoningImprovement.md](./03_ReasoningImprovement.md)\n4. [04_FinalValidation.md](./04_FinalValidation.md)\n\nRaw: \`passA.json\`, \`passB.json\`, \`validation-summary.json\`\n`,
    );
    console.log(result.certification);
  } catch (e) {
    if (swapped) {
      try {
        restoreWorkingTreeAdapter();
      } catch (_) {
        /* ignore */
      }
    }
    throw e;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
