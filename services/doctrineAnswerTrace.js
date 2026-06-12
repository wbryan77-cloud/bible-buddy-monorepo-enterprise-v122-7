/**
 * Doctrine answer trace — claim-level audit record per doctrine turn.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { buildClaimTraceabilityMatrix } = require('./claimTraceabilityMatrix');

const TRACE_DIR = path.join(__dirname, '..', 'data');
const TRACE_FILE = path.join(TRACE_DIR, 'bae-doctrine-traces.jsonl');

function isTraceEnabled() {
  return String(process.env.BAE_TRACE || '').toLowerCase() === '1';
}

function hashReply(reply = '') {
  return crypto.createHash('sha256').update(String(reply || '')).digest('hex').slice(0, 16);
}

function buildDoctrineAnswerTrace({
  userMessage = '',
  evidencePack = {},
  claims = [],
  claimValidation = {},
  reply = '',
  approval = {},
  composeMeta = {},
} = {}) {
  const graph = claimValidation.graph || {};
  const traceabilityMatrix = buildClaimTraceabilityMatrix({
    question: userMessage,
    claims,
    claimResults: claimValidation.claimResults || claims,
    retrievedEvidence: {
      cardIds: graph.cardIds || (evidencePack.evidenceCards?.cards || []).map((c) => c.cardId),
      catalogKeys: graph.catalogKeys || evidencePack.approvedCatalogEvidence?.catalogKeys || [],
      effectiveTopic: evidencePack.effectiveTopic || graph.effectiveTopic,
    },
    validation: claimValidation,
    approval,
  });

  return {
    traceId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    userMessage,
    retrieval: {
      currentIntent: evidencePack.currentIntent || null,
      topic: evidencePack.topic || null,
      effectiveTopic: evidencePack.effectiveTopic || graph.effectiveTopic || null,
      cardIds: graph.cardIds || (evidencePack.evidenceCards?.cards || []).map((c) => c.cardId),
      catalogKeys: graph.catalogKeys || evidencePack.approvedCatalogEvidence?.catalogKeys || [],
      approvedRefCount: (graph.refs || []).length,
      bindingRuleCount: (graph.bindingRules || []).length,
    },
    compose: composeMeta,
    claimTraceabilityMatrix: traceabilityMatrix,
    claims: (claimValidation.claimResults || claims).map((c) => ({
      claimId: c.claimId,
      claim: c.claim,
      type: c.type,
      supportingScriptures: c.supportingScriptures || [],
      supportClass: c.classification || null,
      supportReason: c.supportReason || null,
      supportRelationship: c.supportRelationship || null,
      confidence: c.confidence || null,
      derivedFrom: c.derivedFrom || null,
      validatorDecision: c.validatorDecision || null,
      evidenceCardUsed: c.evidenceCardUsed || null,
      issues: c.issues || [],
    })),
    doctrineConclusion: composeMeta.doctrineConclusion || '',
    validation: {
      passed: claimValidation.passed,
      validatorResult: claimValidation.validatorResult,
      unsupportedClaims: claimValidation.unsupportedClaims || [],
      contradictedClaims: claimValidation.contradictedClaims || [],
    },
    approval: {
      status: approval.status || (claimValidation.passed ? 'approved' : 'rejected'),
      degraded: !!approval.degraded,
      regenerated: !!approval.regenerated,
    },
    finalReplyHash: hashReply(reply),
    replyPreview: String(reply || '').slice(0, 400),
  };
}

function writeDoctrineAnswerTrace(trace) {
  if (!isTraceEnabled() || !trace) return null;
  try {
    fs.mkdirSync(TRACE_DIR, { recursive: true });
    fs.appendFileSync(TRACE_FILE, `${JSON.stringify(trace)}\n`, 'utf8');
  } catch (_) {
    /* non-fatal */
  }
  return trace;
}

module.exports = {
  buildDoctrineAnswerTrace,
  writeDoctrineAnswerTrace,
  isTraceEnabled,
  TRACE_FILE,
};
