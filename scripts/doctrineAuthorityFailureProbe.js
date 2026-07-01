#!/usr/bin/env node
/**
 * Doctrine authority failure probe — measures FIRST pipeline failure per topic.
 * Output: docs/regression-trace/RootCauseDistribution.json
 *         DoctrineAuthorityFailureMatrix.md (generated)
 */
const fs = require('fs');
const path = require('path');
const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');
const { buildComposerSystemPrompt } = require('../services/reasonFirstComposer');
const { slimEvidencePackForComposer } = require('../services/evidencePackSlimmer');
const { buildApprovedEvidenceGraph } = require('../services/approvedEvidenceGraph');
const { validateClaimToScripture, matchesForbidden } = require('../services/claimToScriptureValidator');
const { validateBibleOnlyAuthority } = require('../services/bibleOnlyAuthorityValidator');
const { getAllApprovedCards } = require('../services/evidenceCards');
const { runBuddy } = require('../services/buddyBrain');
const { clearActiveConversation } = require('../services/activeConversationManager');
const { snapshotMemory } = require('../services/requestMemoryLogger');

const OUT_JSON = path.join(__dirname, '..', 'docs', 'regression-trace', 'RootCauseDistribution.json');
const OUT_MD = path.join(__dirname, '..', 'DoctrineAuthorityFailureMatrix.md');

const TOPICS = [
  { id: 'third_heaven', label: 'Third heaven', message: 'What is the third heaven?', assetCardIds: ['heavens'] },
  { id: 'kingdom', label: 'Kingdom of God', message: 'What is the kingdom of God?', assetCardIds: ['kingdom'] },
  { id: 'acts_10', label: 'Acts 10', message: 'Does Acts 10 make pork clean?', assetCardIds: ['dietaryLaw'] },
  { id: 'pork', label: 'Pork', message: 'Can I eat pork?', assetCardIds: ['dietaryLaw'] },
  { id: 'sabbath', label: 'Sabbath', message: 'How do we keep the Sabbath holy?', assetCardIds: ['sabbath'] },
  { id: 'death_state', label: 'Death state', message: 'What happens when we die?', assetCardIds: ['deathState'] },
  { id: 'resurrection', label: 'Resurrection', message: 'What does Scripture teach about resurrection?', assetCardIds: ['deathState'] },
  { id: 'holy', label: 'Holy', message: 'What does holy mean?', assetCardIds: [] },
  { id: 'logos', label: 'Logos', message: 'What does Logos mean in John 1:1?', assetCardIds: ['messiahLogos'] },
];

function evidenceExistsForTopic(assetCardIds = []) {
  if (!assetCardIds.length) return { exists: false, refs: 0 };
  const cards = getAllApprovedCards().filter((c) => assetCardIds.includes(c.cardId));
  const refs = cards.reduce((n, c) => {
    return n + (c.primaryScriptures?.length || 0) + (c.supportingScriptures?.length || 0);
  }, 0);
  return { exists: cards.length > 0, refs, cards: cards.map((c) => c.cardId) };
}

function parseEvidenceFromPrompt(prompt = '') {
  const marker = 'Evidence pack (binding facts — doctrine must trace here):';
  const idx = prompt.indexOf(marker);
  if (idx === -1) return { parsed: null, bytes: 0 };
  const jsonStr = prompt.slice(idx + marker.length).trim();
  try {
    return { parsed: JSON.parse(jsonStr), bytes: Buffer.byteLength(jsonStr, 'utf8') };
  } catch (_) {
    return { parsed: null, bytes: Buffer.byteLength(jsonStr, 'utf8') };
  }
}

function extractClaimsFromReply(reply) {
  if (Array.isArray(reply.claims) && reply.claims.length) return reply.claims;
  const results = reply.runtime?.claimValidation?.claimResults;
  if (Array.isArray(results) && results.length) return results;
  return [];
}

function classifyFirstFailure(row) {
  const order = ['H', 'A', 'B', 'C', 'E', 'D', 'F', 'G'];
  for (const code of order) {
    if (row.failureCodes.includes(code)) return code;
  }
  if (row.liveBlocked) return 'LIVE_UNMEASURED';
  return 'NONE';
}

async function probeTopic(topic) {
  const uid = `failure-probe-${topic.id}`;
  clearActiveConversation(uid);

  const assets = evidenceExistsForTopic(topic.assetCardIds);
  const pack = buildRetrievalEvidencePack({ userId: uid, message: topic.message, routingHintsOnly: true });
  const graph = buildApprovedEvidenceGraph(pack);
  const slim = slimEvidencePackForComposer(pack);
  const prompt = buildComposerSystemPrompt({
    mode: 'COMPANION',
    personaKey: 'ADAPTIVE_COMPANION',
    profile: {},
    runtimeContext: {},
    evidencePack: pack,
    userMessage: topic.message,
    coreRestoration: true,
  });
  const { parsed: promptEvidence, bytes: promptEvidenceBytes } = parseEvidenceFromPrompt(prompt);

  const retrievedCardIds = (pack.evidenceCards?.cards || []).map((c) => c.cardId);
  const sentCardIds = (promptEvidence?.evidenceCards?.cards || slim?.evidenceCards?.cards || []).map((c) => c.cardId);
  const sentRefCount = (promptEvidence?.scripture?.references || slim?.scripture?.references || []).length;

  const retrievedEvidence = {
    cardIds: retrievedCardIds,
    catalogKeys: pack.approvedCatalogEvidence?.catalogKeys || [],
    scriptureRefCount: (pack.scripture?.references || []).length,
    effectiveTopic: pack.effectiveTopic,
    approvedRefCount: graph.refs.length,
    bindingRuleCount: graph.bindingRules.length,
  };

  const evidenceSentToOpenAI = {
    promptEvidenceBytes,
    cardIds: sentCardIds.length ? sentCardIds : retrievedCardIds,
    catalogKeys: promptEvidence?.approvedCatalogEvidence?.catalogKeys || slim?.approvedCatalogEvidence?.catalogKeys || [],
    scriptureRefCount: sentRefCount,
    cardsInPrompt: sentCardIds.length > 0 || (prompt.includes('"cardId"') && retrievedCardIds.length > 0),
  };

  const failureCodes = [];
  const notes = [];

  if (!assets.exists) {
    failureCodes.push('A');
    notes.push('No approved frozen card for this topic category');
  }

  if (assets.exists && !retrievedCardIds.length && graph.refs.length === 0) {
    failureCodes.push('B');
    notes.push('Assets exist but retrieval returned no cards/refs');
  }

  if (retrievedCardIds.length && !evidenceSentToOpenAI.cardsInPrompt) {
    failureCodes.push('C');
    notes.push('Retrieved cards not present in composer prompt JSON');
  }

  let claimsGenerated = [];
  let claimSupportFound = null;
  let validatorDecision = null;
  let finalAnswer = null;
  let openaiCalled = false;
  let finalAnswerAuthor = null;
  let memoryBefore = snapshotMemory();
  let memoryAfter = memoryBefore;
  let liveBlocked = !process.env.OPENAI_API_KEY;

  if (process.env.OPENAI_API_KEY) {
    const reply = await runBuddy(uid, 'COMPANION', 'ADAPTIVE_COMPANION', topic.message);
    memoryAfter = snapshotMemory();
    finalAnswer = String(reply.reply || '').slice(0, 600);
    openaiCalled = !!(reply.coreDebug || reply.runtime?.coreDebug || {}).openaiCalled;
    finalAnswerAuthor = (reply.coreDebug || reply.runtime?.coreDebug || {}).finalAnswerAuthor;
    claimsGenerated = extractClaimsFromReply(reply);

    const dbg = reply.coreDebug || reply.runtime?.coreDebug || {};
    if (dbg.buildConnectionErrorReplyUsed || finalAnswerAuthor === 'connection_error' || !openaiCalled) {
      failureCodes.push('H');
      notes.push('OpenAI unavailable or connection error');
    } else if (!failureCodes.includes('A') && !failureCodes.includes('B') && !failureCodes.includes('C')) {
      const runtimeValidation = reply.runtime?.claimValidation || {};
      const postValidation = validateClaimToScripture({
        reply: finalAnswer,
        claims: claimsGenerated,
        evidencePack: pack,
        message: topic.message,
      });
      const bibleOnly = validateBibleOnlyAuthority({ reply: finalAnswer, evidencePack: pack, message: topic.message });

      claimSupportFound = postValidation.claimResults.map((c) => ({
        claim: c.claim,
        supportClass: c.classification,
        validatorDecision: c.validatorDecision,
        issues: c.issues,
      }));
      validatorDecision = {
        runtimePassed: runtimeValidation.passed,
        postPassed: postValidation.passed,
        bibleOnlyPassed: bibleOnly.passed,
        claimDegraded: reply.runtime?.claimDegraded || dbg.claimDegraded,
        regenerated: dbg.regenerated,
      };

      const doctrineClaims = claimsGenerated.filter((c) => (c.type || 'doctrine') === 'doctrine' || c.type === 'clarification');
      if (!doctrineClaims.length) {
        failureCodes.push('E');
        notes.push('No doctrine claims[] extracted from compose output');
      }

      const orphanForbidden = matchesForbidden(finalAnswer);
      const claimsPassed = postValidation.passed;
      const runtimePassed = runtimeValidation.passed !== false;

      if (!failureCodes.includes('E') && orphanForbidden.length && claimsPassed) {
        failureCodes.push('D');
        notes.push(`Evidence sent but reply contains unsupported doctrine: ${orphanForbidden.map((f) => f.id).join(', ')}`);
      }

      if (!claimsPassed && runtimePassed && !validatorDecision.claimDegraded) {
        failureCodes.push('G');
        notes.push('Post validation failed but approval gate allowed answer without degradation');
      } else if (!claimsPassed && runtimePassed && validatorDecision.claimDegraded) {
        notes.push('Gate degraded answer after validation failure');
      }

      if (claimsPassed && runtimePassed && (!bibleOnly.passed || orphanForbidden.length)) {
        failureCodes.push('F');
        notes.push('Validator/gate passed but post-hoc bible-only or forbidden check failed');
      }

      if (!claimsPassed && !runtimePassed && !validatorDecision.claimDegraded) {
        if (!failureCodes.includes('G')) failureCodes.push('F');
        notes.push('Validator detected failure — check if regen/degrade executed');
      }
    }
  } else {
    notes.push('LIVE_UNMEASURED: OPENAI_API_KEY not set — stages D/E/F/G not observable');
  }

  const firstFailure = classifyFirstFailure({ failureCodes, liveBlocked });

  return {
    topic: topic.id,
    label: topic.label,
    question: topic.message,
    assetsExist: assets.exists,
    assetCardIds: assets.cards || [],
    retrievedEvidence,
    evidenceSentToOpenAI,
    claimsGenerated: claimsGenerated.map((c) => ({
      claimId: c.claimId,
      claim: c.claim,
      supportingScriptures: c.supportingScriptures || [],
      type: c.type,
    })),
    claimSupportFound,
    validatorDecision,
    finalAnswer,
    openaiCalled,
    finalAnswerAuthor,
    memoryBefore,
    memoryAfter,
    failureCodes,
    firstFailure,
    failureLocation: describeFailureLocation(firstFailure),
    notes,
    liveBlocked,
  };
}

function describeFailureLocation(code) {
  const map = {
    A: 'Approved asset layer — no frozen evidence for topic',
    B: 'Retrieval layer — evidence not loaded into pack',
    C: 'Composer prompt layer — evidence not sent to OpenAI',
    D: 'OpenAI compose layer — evidence sent but conclusion unsupported',
    E: 'Claim extraction layer — claims[] missing or incomplete',
    F: 'Validator layer — unsupported claim not caught',
    G: 'Approval gate layer — failed validation shipped',
    H: 'Runtime stability layer — API/connection interrupted',
    LIVE_UNMEASURED: 'Live compose layer — API key required',
    NONE: 'No failure detected in measured stages',
  };
  return map[code] || code;
}

function buildDistribution(rows) {
  const dist = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, LIVE_UNMEASURED: 0, NONE: 0 };
  for (const row of rows) {
    const k = row.firstFailure || 'NONE';
    if (dist[k] !== undefined) dist[k] += 1;
    else dist.NONE += 1;
  }
  return dist;
}

function buildMarkdown(rows, dist, meta) {
  const lines = [
    '# Doctrine Authority Failure Matrix',
    '',
    `**Date:** ${new Date().toISOString().slice(0, 10)}`,
    `**Method:** Pipeline probe — retrieval + prompt parse + ${meta.liveRan ? 'live OpenAI' : 'offline (no API key)'}`,
    `**Purpose:** Measure FIRST failure point — do not assume retrieval or evidence gaps are the root cause`,
    '',
    '## Root cause distribution',
    '',
    '```json',
    JSON.stringify(dist, null, 2),
    '```',
    '',
    '## Failure code legend',
    '',
    '| Code | First failure location |',
    '|------|------------------------|',
    '| A | Evidence missing in approved assets |',
    '| B | Evidence exists but not retrieved |',
    '| C | Retrieved but not sent to OpenAI |',
    '| D | Sent but OpenAI ignored / unsupported conclusion |',
    '| E | Claim extracted incorrectly |',
    '| F | Validator missed unsupported claim |',
    '| G | Approval gate allowed unsupported claim |',
    '| H | Runtime instability interrupted answer |',
    '| LIVE_UNMEASURED | D–G not observable without API key |',
    '',
    '## Per-topic matrix',
    '',
  ];

  for (const row of rows) {
    lines.push(`### ${row.label}`);
    lines.push('');
    lines.push(`| Field | Value |`);
    lines.push(`|-------|-------|`);
    lines.push(`| **Question** | ${row.question} |`);
    lines.push(`| **First failure** | **${row.firstFailure}** — ${row.failureLocation} |`);
    lines.push(`| **RetrievedEvidence** | cards: ${row.retrievedEvidence.cardIds.join(', ') || 'none'}; catalog: ${row.retrievedEvidence.catalogKeys.join(', ') || 'none'}; refs: ${row.retrievedEvidence.scriptureRefCount} |`);
    lines.push(`| **EvidenceSentToOpenAI** | ${row.evidenceSentToOpenAI.promptEvidenceBytes} bytes; cards in prompt: ${row.evidenceSentToOpenAI.cardsInPrompt}; refs: ${row.evidenceSentToOpenAI.scriptureRefCount} |`);
    lines.push(`| **ClaimsGenerated** | ${row.claimsGenerated.length ? row.claimsGenerated.map((c) => c.claim).join('; ').slice(0, 200) : row.liveBlocked ? 'LIVE_UNMEASURED' : 'none'} |`);
    lines.push(`| **ClaimSupportFound** | ${row.claimSupportFound ? JSON.stringify(row.claimSupportFound).slice(0, 200) : row.liveBlocked ? 'LIVE_UNMEASURED' : 'n/a'} |`);
    lines.push(`| **ValidatorDecision** | ${row.validatorDecision ? JSON.stringify(row.validatorDecision) : row.liveBlocked ? 'LIVE_UNMEASURED' : 'n/a'} |`);
    lines.push(`| **FinalAnswer** | ${row.finalAnswer ? row.finalAnswer.slice(0, 200) + '...' : row.liveBlocked ? 'LIVE_UNMEASURED' : 'n/a'} |`);
    lines.push(`| **openaiCalled** | ${row.openaiCalled} |`);
    lines.push(`| **finalAnswerAuthor** | ${row.finalAnswerAuthor || 'n/a'} |`);
    lines.push(`| **memoryBefore/After RSS** | ${row.memoryBefore.rssMB} → ${row.memoryAfter.rssMB} MB |`);
    if (row.notes.length) lines.push(`| **Notes** | ${row.notes.join('; ')} |`);
    lines.push('');
  }

  lines.push('## Conclusion');
  lines.push('');
  if (!meta.liveRan) {
    lines.push('**Live failure distribution for D–G is UNMEASURED.** Offline probe shows retrieval/prompt stages only.');
    lines.push(`Measurable first failures: ${Object.entries(dist).filter(([k, v]) => v > 0 && k !== 'LIVE_UNMEASURED').map(([k, v]) => `${k}=${v}`).join(', ')}`);
    lines.push(`Topics reaching OpenAI gate (no A/B/C failure): ${rows.filter((r) => !['A', 'B', 'C', 'H'].some((c) => r.failureCodes.includes(c)) && r.assetsExist).length} / ${rows.length}`);
    lines.push('');
    lines.push('Run with `OPENAI_API_KEY` to measure D/E/F/G distribution before further implementation.');
  } else {
    lines.push(`Primary failure modes: ${Object.entries(dist).filter(([, v]) => v > 0).map(([k, v]) => `${k}(${v})`).join(', ')}`);
  }
  lines.push('');
  lines.push('**Do not implement additional validators/cards until live distribution confirms root cause.**');
  return lines.join('\n');
}

async function main() {
  const rows = [];
  for (const topic of TOPICS) {
    rows.push(await probeTopic(topic));
  }

  const dist = buildDistribution(rows);
  const meta = {
    ranAt: new Date().toISOString(),
    liveRan: !!process.env.OPENAI_API_KEY,
    topics: rows.length,
  };

  const payload = { ...meta, distribution: dist, topics: rows };
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2));
  fs.writeFileSync(OUT_MD, buildMarkdown(rows, dist, meta));
  console.log(JSON.stringify({ distribution: dist, liveRan: meta.liveRan }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
