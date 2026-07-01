#!/usr/bin/env node
/**
 * End-to-end doctrine turn proof — diagnosis only.
 * Usage: export OPENAI_API_KEY=sk-... && node scripts/endToEndDoctrineTurnProof.js
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { buildRetrievalEvidencePack } = require('../services/retrievalEvidencePack');
const { buildComposerSystemPrompt } = require('../services/reasonFirstComposer');
const { runBuddy } = require('../services/buddyBrain');
const { clearActiveConversation } = require('../services/activeConversationManager');
const { snapshotMemory } = require('../services/requestMemoryLogger');

const QUESTION = 'What does Logos mean in John 1:1?';
const OUT = path.join(__dirname, '..', 'docs', 'regression-trace', 'end-to-end-doctrine-turn-proof.json');

function maskKey(key = '') {
  const k = String(key);
  if (!k) return { present: false, len: 0, prefix: null, looksSk: false };
  return {
    present: true,
    len: k.length,
    prefix: k.slice(0, 7),
    looksSk: k.startsWith('sk-'),
  };
}

function traceOpenAIClient() {
  const OpenAI = require('openai');
  const key = process.env.OPENAI_API_KEY || '';
  const config = {
    apiKey: key ? '[REDACTED]' : undefined,
  };
  let clientMeta = null;
  try {
    const probe = new OpenAI(config);
    clientMeta = {
      baseURL: probe.baseURL || probe._client?.baseURL || 'https://api.openai.com/v1',
      organization: probe.organization || probe._client?.organization || null,
      project: probe.project || probe._client?.project || null,
      timeout: probe.timeout ?? null,
      maxRetries: probe.maxRetries ?? null,
    };
  } catch (e) {
    clientMeta = { initError: String(e.message || e) };
  }

  const singleton = require('../services/openaiClient');
  return {
    singletonNull: singleton == null,
    env: {
      OPENAI_API_KEY: maskKey(key),
      OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      OPENAI_ORG: process.env.OPENAI_ORG || null,
      OPENAI_ORGANIZATION: process.env.OPENAI_ORGANIZATION || null,
      OPENAI_PROJECT: process.env.OPENAI_PROJECT || null,
      OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || null,
      NODE_ENV: process.env.NODE_ENV || null,
      BUDDY_RUNTIME: process.env.BUDDY_RUNTIME || null,
      BUDDY_OPENAI_FIRST: process.env.BUDDY_OPENAI_FIRST ?? null,
    },
    dotenv: {
      configCalled: true,
      envFileExists: fs.existsSync(path.join(__dirname, '..', '.env')),
      envFilePath: path.join(__dirname, '..', '.env'),
    },
    constructorArgs: {
      apiKeySource: 'process.env.OPENAI_API_KEY',
      explicitBaseURL: !!process.env.OPENAI_BASE_URL,
      explicitOrg: !!(process.env.OPENAI_ORG || process.env.OPENAI_ORGANIZATION),
      explicitProject: !!process.env.OPENAI_PROJECT,
    },
    clientMeta,
    runtimesUsingSingleton: [
      'buddyBrain.js',
      'reasonFirstComposer.js',
      'openAiFirstCompanionRuntime.js (via composeReasonFirstReply)',
      'masterBuddyRuntime.js',
      'bibleBuddyLiteRuntime.js',
      'minimalReasonFirstRuntime.js',
      'reasonFirstLiteRuntime.js',
      'shadowReasonFirstRuntime.js',
      'adminBrain.js',
      'contentInsight.js',
    ],
    productionPath: 'runBuddy → openAiFirstCompanionRuntime → composeReasonFirstReply → callOpenAI → openai.chat.completions.create',
  };
}

function classifyInfrastructureFailure({ openaiCalled, errorMessage, memoryBefore, memoryAfter, promptBytes }) {
  const err = String(errorMessage || '').toLowerCase();
  const categories = [];

  if (!openaiCalled) {
    if (err.includes('401') || err.includes('incorrect api key') || err.includes('authentication')) {
      categories.push('Authentication');
    }
    if (err.includes('429') || err.includes('rate limit')) categories.push('Rate limit');
    if (err.includes('timeout') || err.includes('econnreset') || err.includes('network')) categories.push('Network');
    if (err.includes('openai_unavailable') || err.includes('not ready')) categories.push('Client initialization');
    if (!process.env.OPENAI_API_KEY || !String(process.env.OPENAI_API_KEY).startsWith('sk-')) {
      categories.push('Environment');
    }
    if (promptBytes > 120000) categories.push('Prompt size');
    const rssDelta = (memoryAfter?.rssMB || 0) - (memoryBefore?.rssMB || 0);
    if (rssDelta > 200) categories.push('Memory');
    if (!categories.length) categories.push('Infrastructure');
  }

  return {
    isDoctrineFailure: false,
    categories: [...new Set(categories)],
    primary: categories[0] || (openaiCalled ? 'NONE' : 'Infrastructure'),
    errorMessage: errorMessage || null,
  };
}

function getDbg(reply = {}) {
  return reply.coreDebug || reply.runtime?.coreDebug || {};
}

function extractClaims(reply = {}) {
  if (Array.isArray(reply.claims) && reply.claims.length) return reply.claims;
  const cv = reply.runtime?.claimValidation;
  if (cv?.claimResults?.length) return cv.claimResults;
  return [];
}

async function runDoctrineTurnProof() {
  const clientTrace = traceOpenAIClient();
  const uid = 'e2e-doctrine-logos-proof';
  clearActiveConversation(uid);

  const turn = {
    question: QUESTION,
    retrievalStarted: null,
    retrievalCompleted: null,
    evidencePackSize: null,
    evidenceRefs: [],
    composeStarted: null,
    composeCompleted: null,
    openaiCalled: false,
    openaiSuccess: false,
    claimsGenerated: [],
    doctrineConclusion: null,
    validatorStarted: null,
    validatorCompleted: null,
    approvalGateStarted: null,
    approvalGateCompleted: null,
    finalAnswer: null,
    memoryBefore: null,
    memoryAfter: null,
    promptBytes: null,
    errorMessage: null,
  };

  turn.memoryBefore = snapshotMemory();
  turn.retrievalStarted = new Date().toISOString();

  const evidencePack = buildRetrievalEvidencePack({
    userId: uid,
    message: QUESTION,
    routingHintsOnly: true,
  });
  turn.retrievalCompleted = new Date().toISOString();

  const evidenceJson = JSON.stringify(evidencePack);
  turn.evidencePackSize = Buffer.byteLength(evidenceJson, 'utf8');
  turn.evidenceRefs = [
    ...(evidencePack.scripture?.references || []).map((r) => r.reference || r),
    ...((evidencePack.evidenceCards?.cards || []).flatMap((c) => c.approvedRefs || c.scriptureRefs || [])),
  ].filter(Boolean).slice(0, 50);

  const systemPrompt = buildComposerSystemPrompt({
    mode: 'COMPANION',
    personaKey: 'ADAPTIVE_COMPANION',
    profile: {},
    runtimeContext: {},
    evidencePack,
    userMessage: QUESTION,
    coreRestoration: true,
  });
  turn.promptBytes = Buffer.byteLength(systemPrompt, 'utf8') + turn.evidencePackSize;

  turn.composeStarted = new Date().toISOString();
  const reply = await runBuddy(uid, 'COMPANION', 'ADAPTIVE_COMPANION', QUESTION);
  turn.composeCompleted = new Date().toISOString();
  turn.memoryAfter = snapshotMemory();

  const dbg = getDbg(reply);
  const rt = reply.runtime || {};

  turn.openaiCalled = !!(dbg.openaiCalled ?? rt.openAiCalled);
  turn.openaiSuccess = turn.openaiCalled && String(reply.reply || '').length > 20;
  turn.errorMessage = dbg.errorMessage || rt.connectionError || rt.validation?.issues?.[0] || null;
  turn.finalAnswer = String(reply.reply || '');

  turn.validatorStarted = turn.composeCompleted;
  turn.validatorCompleted = turn.composeCompleted;
  turn.approvalGateStarted = turn.composeCompleted;
  turn.approvalGateCompleted = turn.composeCompleted;

  const claims = extractClaims(reply);
  turn.claimsGenerated = claims.map((c) => ({
    claimId: c.claimId,
    claim: c.claim,
    type: c.type,
    supportingScriptures: c.supportingScriptures || [],
    classification: c.classification,
    validatorDecision: c.validatorDecision,
  }));
  turn.doctrineConclusion = reply.doctrineConclusion || rt.doctrineConclusion || null;

  const claimValidation = rt.claimValidation || {};
  const approval = {
    decision: rt.claimDegraded
      ? 'degraded'
      : claimValidation.passed === false
        ? 'rejected'
        : turn.openaiCalled
          ? 'approved'
          : 'blocked_connection',
    claimValidationPassed: claimValidation.passed,
    claimDegraded: !!rt.claimDegraded,
    regenerated: !!rt.regenerated,
    admin_flags: reply.admin_flags || [],
    masterRoute: rt.masterRoute,
    buildConnectionErrorReplyUsed: !!dbg.buildConnectionErrorReplyUsed,
  };

  const failureClassification = classifyInfrastructureFailure({
    openaiCalled: turn.openaiCalled,
    errorMessage: turn.errorMessage,
    memoryBefore: turn.memoryBefore,
    memoryAfter: turn.memoryAfter,
    promptBytes: turn.promptBytes,
  });

  const rawOpenAIFields = {
    hasReply: !!reply.reply,
    claimsCount: claims.length,
    hasDoctrineConclusion: !!(reply.doctrineConclusion || turn.doctrineConclusion),
    replyKeys: Object.keys(reply).filter((k) => !['reply', 'coreDebug'].includes(k)),
  };

  return {
    ranAt: new Date().toISOString(),
    clientTrace,
    turn,
    retrieval: {
      topic: evidencePack.topic,
      effectiveTopic: evidencePack.effectiveTopic,
      cardIds: (evidencePack.evidenceCards?.cards || []).map((c) => c.cardId),
      catalogKeys: evidencePack.approvedCatalogEvidence?.catalogKeys || [],
      approvedRefCount: (evidencePack.evidenceCards?.cards || []).reduce(
        (n, c) => n + (c.approvedRefs?.length || c.scriptureRefs?.length || 0),
        0
      ),
    },
    claimsPipeline: {
      rawOpenAIFields,
      claimsCount: claims.length,
      validator: {
        passed: claimValidation.passed,
        skipped: claimValidation.skipped,
        unsupportedClaims: claimValidation.unsupportedClaims || [],
        contradictedClaims: claimValidation.contradictedClaims || [],
        claimResults: (claimValidation.claimResults || []).map((c) => ({
          claim: c.claim,
          classification: c.classification,
          validatorDecision: c.validatorDecision,
        })),
      },
      approval,
    },
    failureClassification,
    pipelineProven: turn.openaiCalled && turn.openaiSuccess && claims.length > 0,
  };
}

async function main() {
  const result = await runDoctrineTurnProof();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log(
    JSON.stringify(
      {
        ok: true,
        out: OUT,
        pipelineProven: result.pipelineProven,
        openaiCalled: result.turn.openaiCalled,
        claimsCount: result.claimsPipeline.claimsCount,
        failurePrimary: result.failureClassification.primary,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
