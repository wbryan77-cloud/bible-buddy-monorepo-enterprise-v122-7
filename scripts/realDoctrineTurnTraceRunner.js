#!/usr/bin/env node
/**
 * One-shot doctrine pipeline trace — diagnosis only. No production changes.
 * Usage: node scripts/realDoctrineTurnTraceRunner.js
 */
require('dotenv').config();

const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');
const { buildComposerSystemPrompt, composeReasonFirstReply } = require('../services/reasonFirstComposer');
const { buildRuntimeContext } = require('../services/runtimeOrchestrator');
const {
  runBuddy,
  classifySafety,
  getUserCompanionProfile,
  getRecentSessions,
  enrichRuntimeContextWithMemory,
} = require('../services/buddyBrain');
const { clearActiveConversation } = require('../services/activeConversationManager');
const { snapshotMemory } = require('../services/requestMemoryLogger');
const openai = require('../services/openaiClient');

const CASES = [
  { id: 'logos', message: 'What does Logos mean in John 1:1?' },
  { id: 'third_heaven', message: 'What is the third heaven?' },
];

function getDbg(reply = {}) {
  return reply.coreDebug || reply.runtime?.coreDebug || {};
}

function extractClaims(reply = {}) {
  if (Array.isArray(reply.claims) && reply.claims.length) return reply.claims;
  const cv = reply.runtime?.claimValidation;
  if (cv?.claimResults) return cv.claimResults;
  return [];
}

function buildUserPayloadSkeleton(evidencePack, message) {
  return {
    userMessage: message,
    conversationHistory: 'none',
    evidence: {
      memory: evidencePack.memory,
      scripture: evidencePack.scripture,
      history: evidencePack.history,
      doctrine: evidencePack.doctrine,
      evidenceCards: evidencePack.evidenceCards,
      answerGuidance: evidencePack.answerGuidance,
    },
  };
}

async function partAChatCompletions(message) {
  const uid = `trace-part-a-${message.slice(0, 12).replace(/\W/g, '')}`;
  const safety = classifySafety(message);
  const profile = getUserCompanionProfile(uid);
  const recentSessions = getRecentSessions(uid, 8);
  let runtimeContext = buildRuntimeContext({ message, mode: 'COMPANION', profile, recentSessions, safety });
  runtimeContext = enrichRuntimeContextWithMemory({ runtimeContext, userId: uid, profile });

  const evidencePack = buildRetrievalEvidencePack({
    userId: uid,
    message,
    mode: 'COMPANION',
    recentSessions,
    runtimeContext,
    profile,
    safety,
    routingHintsOnly: true,
  });

  const systemPrompt = buildComposerSystemPrompt({
    mode: 'COMPANION',
    personaKey: 'ADAPTIVE_COMPANION',
    profile,
    runtimeContext,
    evidencePack,
    userMessage: message,
    coreRestoration: true,
  });

  const userPayload = buildUserPayloadSkeleton(evidencePack, message);
  const userContent = JSON.stringify(userPayload, null, 2);
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

  const requestShape = {
    model,
    temperature: 0.72,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  };

  const out = {
    message,
    model,
    response_format: requestShape.response_format,
    temperature: requestShape.temperature,
    systemPromptBytes: Buffer.byteLength(systemPrompt, 'utf8'),
    userPayloadBytes: Buffer.byteLength(userContent, 'utf8'),
    totalPromptBytes: Buffer.byteLength(systemPrompt, 'utf8') + Buffer.byteLength(userContent, 'utf8'),
    openaiClientNull: openai == null,
    keyPresent: !!process.env.OPENAI_API_KEY,
    keyLen: (process.env.OPENAI_API_KEY || '').length,
    success: false,
    errorCode: null,
    errorMessage: null,
    rawReplyPreview: null,
    usage: null,
  };

  if (!openai) {
    out.errorMessage = 'openai_unavailable';
    return out;
  }

  try {
    const completion = await openai.chat.completions.create(requestShape);
    const raw = completion?.choices?.[0]?.message?.content || '';
    out.success = true;
    out.rawReplyPreview = raw.slice(0, 2000);
    out.usage = completion.usage || null;
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (_) {}
    out.parsedReplyPreview = parsed?.reply ? String(parsed.reply).slice(0, 500) : null;
    out.parsedClaimsCount = Array.isArray(parsed?.claims) ? parsed.claims.length : 0;
  } catch (e) {
    out.success = false;
    out.errorCode = e.status || e.code || null;
    out.errorMessage = String(e.message || e).slice(0, 500);
  }

  return out;
}

async function partBCTurnTrace({ id, message }) {
  const uid = `trace-doctrine-${id}`;
  clearActiveConversation(uid);
  const memBefore = snapshotMemory();

  const pack = buildRetrievalEvidencePack({
    userId: uid,
    message,
    routingHintsOnly: true,
  });

  const prompt = buildComposerSystemPrompt({
    mode: 'COMPANION',
    personaKey: 'ADAPTIVE_COMPANION',
    profile: {},
    runtimeContext: {},
    evidencePack: pack,
    userMessage: message,
    coreRestoration: true,
  });

  const evidenceMarker = 'Evidence pack (binding facts — doctrine must trace here):';
  const evidenceIdx = prompt.indexOf(evidenceMarker);
  const evidenceJsonStr = evidenceIdx >= 0 ? prompt.slice(evidenceIdx + evidenceMarker.length).trim() : '';
  let evidenceInPrompt = null;
  try {
    evidenceInPrompt = JSON.parse(evidenceJsonStr);
  } catch (_) {}

  const composeDirect = await composeReasonFirstReply({
    userId: uid,
    mode: 'COMPANION',
    personaKey: 'ADAPTIVE_COMPANION',
    message,
    safety: { level: 'standard' },
    profile: {},
    runtimeContext: {},
    evidencePack: pack,
    coreRestoration: true,
    maxAttempts: 1,
  });

  const reply = await runBuddy(uid, 'COMPANION', 'ADAPTIVE_COMPANION', message);
  const memAfter = snapshotMemory();
  const dbg = getDbg(reply);
  const rt = reply.runtime || {};

  return {
    id,
    question: message,
    retrieval: {
      topic: pack.topic,
      effectiveTopic: pack.effectiveTopic,
      cardIds: (pack.evidenceCards?.cards || []).map((c) => c.cardId),
      catalogKeys: pack.approvedCatalogEvidence?.catalogKeys || [],
      scriptureRefCount: (pack.scripture?.references || []).length,
      historyAllowed: pack.historyAllowed,
      currentIntent: pack.currentIntent,
    },
    promptConstruction: {
      systemPromptBytes: Buffer.byteLength(prompt, 'utf8'),
      evidenceBytes: Buffer.byteLength(evidenceJsonStr, 'utf8'),
      cardsInPrompt: !!(evidenceInPrompt?.evidenceCards?.cards?.length),
      cardIdsInPrompt: (evidenceInPrompt?.evidenceCards?.cards || []).map((c) => c.cardId),
      catalogKeysInPrompt: evidenceInPrompt?.approvedCatalogEvidence?.catalogKeys || [],
    },
    composeDirect: {
      openaiCalled: composeDirect.openaiCalled,
      apiError: composeDirect.apiError || null,
      attempts: composeDirect.attempts,
      rawReplyPreview: String(composeDirect.structured?.reply || '').slice(0, 1500),
      claims: (composeDirect.structured?.claims || []).map((c) => ({
        claimId: c.claimId,
        claim: c.claim,
        type: c.type,
        supportingScriptures: c.supportingScriptures || [],
      })),
      composeValidation: composeDirect.validation?.passed,
      composeValidationIssues: composeDirect.validation?.issues || [],
    },
    runBuddy: {
      openaiCalled: !!(dbg.openaiCalled ?? rt.openAiCalled),
      openaiCalledDbg: dbg.openaiCalled,
      openAiCalledRt: rt.openAiCalled,
      finalAnswerAuthor: dbg.finalAnswerAuthor || null,
      errorMessage: dbg.errorMessage || rt.connectionError || null,
      masterRoute: rt.masterRoute || dbg.routeUsed,
      buildConnectionErrorReplyUsed: dbg.buildConnectionErrorReplyUsed,
      regenerated: dbg.regenerated || rt.regenerated,
      claimDegraded: rt.claimDegraded,
      rawReply: String(reply.reply || '').slice(0, 2000),
      claims: extractClaims(reply).map((c) => ({
        claimId: c.claimId,
        claim: c.claim,
        type: c.type,
        supportingScriptures: c.supportingScriptures || [],
      })),
      claimValidation: {
        passed: rt.claimValidation?.passed,
        claimResults: (rt.claimValidation?.claimResults || []).map((c) => ({
          claim: c.claim,
          classification: c.classification,
          validatorDecision: c.validatorDecision,
          issues: c.issues,
        })),
      },
      validation: {
        passed: rt.validation?.passed,
        issues: rt.validation?.issues || [],
      },
      approvalDecision:
        rt.claimDegraded
          ? 'degraded'
          : rt.claimValidation?.passed === false
            ? 'rejected'
            : dbg.openaiCalled || rt.openAiCalled
              ? 'approved'
              : 'blocked_connection',
      admin_flags: reply.admin_flags || [],
    },
    memoryBefore: memBefore,
    memoryAfter: memAfter,
  };
}

function classifyFailure(turn) {
  const codes = [];
  const r = turn.retrieval;
  const p = turn.promptConstruction;
  const rb = turn.runBuddy;
  const cd = turn.composeDirect;

  if (!r.cardIds?.length && turn.id !== 'holy') codes.push('A');
  if (r.cardIds?.length && !p.cardsInPrompt) codes.push('C');
  if (!cd.openaiCalled && !rb.openaiCalled) codes.push('C_or_API'); // API failed — evidence may have been sent
  if (cd.openaiCalled && !rb.claims?.length) codes.push('E');
  if (rb.claimValidation?.passed === false) codes.push('F');
  if (rb.claimDegraded) codes.push('G');
  if (rb.buildConnectionErrorReplyUsed) codes.push('API_BLOCK');

  let primary = 'NONE';
  if (rb.buildConnectionErrorReplyUsed || (!cd.openaiCalled && !rb.openaiCalled)) primary = 'API_FAILURE';
  else if (!r.cardIds?.length) primary = 'A';
  else if (!p.cardsInPrompt) primary = 'C';
  else if (!rb.claims?.length) primary = 'E';
  else if (rb.claimValidation?.passed === false) primary = 'F';
  else if (rb.claimDegraded) primary = 'G';
  else primary = 'PIPELINE_OK';

  return { codes, primary };
}

async function main() {
  const result = {
    ranAt: new Date().toISOString(),
    env: {
      nodeEnv: process.env.NODE_ENV || 'development',
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      keyPresent: !!process.env.OPENAI_API_KEY,
      keyLen: (process.env.OPENAI_API_KEY || '').length,
      openaiClientNull: openai == null,
    },
    partA: {},
    turns: [],
  };

  for (const c of CASES) {
    result.partA[c.id] = await partAChatCompletions(c.message);
    const turn = await partBCTurnTrace(c);
    turn.failureClassification = classifyFailure(turn);
    result.turns.push(turn);
  }

  const outPath = require('path').join(__dirname, '..', 'docs', 'regression-trace', 'real-doctrine-turn-trace.json');
  require('fs').mkdirSync(require('path').dirname(outPath), { recursive: true });
  require('fs').writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ok: true, outPath, partA: result.partA, turns: result.turns.map((t) => ({ id: t.id, primary: t.failureClassification.primary, openaiCalled: t.runBuddy.openaiCalled })) }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
