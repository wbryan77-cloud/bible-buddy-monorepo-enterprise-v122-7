/**
 * BIE v1.1 — Canonical append-only experience-event ledger.
 * Does not mutate doctrine, evidence, prompts, or production answers.
 * Prefer fingerprints / redacted summaries over raw private text.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data', 'founder-experience');
const LEDGER_PATH = path.join(DATA_DIR, 'experience-events.jsonl');
const SCHEMA_VERSION = 'bie-experience-event-v1';

const EVENT_TYPES = Object.freeze([
  'QUESTION_RECEIVED',
  'ANSWER_GENERATED',
  'ANSWER_ACCEPTED',
  'ANSWER_REJECTED',
  'ANSWER_CORRECTED',
  'FOLLOW_UP_RECEIVED',
  'CURRENT_MESSAGE_MISS',
  'TOPIC_DRIFT',
  'REPEATED_ANSWER',
  'INCOMPLETE_ANSWER',
  'WRONG_SOURCE_CLASS',
  'SCRIPTURE_FIDELITY_FAILURE',
  'HISTORICAL_ACCURACY_FAILURE',
  'GROUNDING_FAILURE',
  'MEMORY_SUCCESS',
  'MEMORY_MISS',
  'MEMORY_OVERREACH',
  'PRAYER_SUCCESS',
  'PRAYER_GENERIC_FAILURE',
  'COMPANION_TRUST_GAIN',
  'COMPANION_TRUST_BREAK',
  'EVIDENCE_SELECTED',
  'EVIDENCE_REJECTED',
  'RETRIEVAL_GAP',
  'ADMIN_RECOMMENDATION_CREATED',
  'ADMIN_RECOMMENDATION_APPROVED',
  'ADMIN_RECOMMENDATION_REJECTED',
  'ADMIN_RECOMMENDATION_DEFERRED',
  'BENCHMARK_RUN',
  'REGRESSION_FOUND',
  'REGRESSION_RESOLVED',
  'DEPLOYMENT_STARTED',
  'DEPLOYMENT_VALIDATED',
  'DEPLOYMENT_ROLLED_BACK',
  'SOURCE_CHANGE_DETECTED',
  'RESEARCH_OPPORTUNITY',
  'DRIFT_ALERT',
  'FOUNDER_FEEDBACK',
  'TRACE_CAPTURED',
  'EVALUATION_RECORDED',
  'LEARNING_RECORD_CREATED',
]);

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function fingerprint(text = '', max = 240) {
  const s = String(text || '').trim();
  if (!s) return null;
  return crypto.createHash('sha256').update(s).digest('hex').slice(0, 24);
}

function redactExcerpt(text = '', max = 180) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  return s.slice(0, max);
}

function anonymizedSessionKey(userId, sessionId) {
  if (!userId && !sessionId) return null;
  return crypto.createHash('sha256').update(`${userId || ''}:${sessionId || ''}`).digest('hex').slice(0, 24);
}

function releaseCommit() {
  return String(process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || '').slice(0, 7) || null;
}

/**
 * Append one experience event. Never throws to caller (fail-soft).
 */
function appendExperienceEvent(input = {}) {
  try {
    ensureDir();
    const eventType = String(input.eventType || '').toUpperCase();
    if (!EVENT_TYPES.includes(eventType)) {
      return { ok: false, reason: 'unknown_event_type', eventType };
    }
    const message = input.currentMessage || input.message || '';
    const reply = input.replyText || input.outputText || '';
    const event = {
      schemaVersion: SCHEMA_VERSION,
      eventId: input.eventId || crypto.randomUUID(),
      eventType,
      timestamp: input.timestamp || new Date().toISOString(),
      environment: input.environment || process.env.NODE_ENV || 'development',
      applicationVersion: input.applicationVersion || process.env.APP_VERSION || null,
      releaseCommit: input.releaseCommit || releaseCommit(),
      clientType: input.clientType || 'biblebuddy',
      authenticatedActorClass: input.authenticatedActorClass || 'user',
      privacyScope: input.privacyScope || 'ANONYMIZED_TELEMETRY',
      userConsentState: input.userConsentState || 'unknown',
      anonymizedSessionKey: input.anonymizedSessionKey || anonymizedSessionKey(input.userId, input.sessionId),
      conversationId: input.conversationId || input.sessionId || null,
      turnId: input.turnId || input.requestId || null,
      parentEventId: input.parentEventId || null,
      traceId: input.traceId || input.requestId || null,
      spanId: input.spanId || null,
      questionFingerprint: input.questionFingerprint || fingerprint(message),
      currentMessageSummary: input.currentMessageSummary || redactExcerpt(message, 160),
      intent: input.intent || null,
      lane: input.lane || null,
      topic: input.topic || null,
      requestedAnswerMode: input.requestedAnswerMode || null,
      requestedDepth: input.requestedDepth || null,
      emotionalContext: input.emotionalContext || null,
      studyChainId: input.studyChainId || null,
      lessonPacketId: input.lessonPacketId || null,
      lessonPacketVersion: input.lessonPacketVersion || null,
      doctrineDecisionTopic: input.doctrineDecisionTopic || null,
      selectedEvidenceIds: input.selectedEvidenceIds || [],
      rejectedEvidenceIds: input.rejectedEvidenceIds || [],
      historicalRecordsUsed: input.historicalRecordsUsed || 0,
      originalLanguageRecordsUsed: input.originalLanguageRecordsUsed || 0,
      memoryReads: input.memoryReads || [],
      memoryWrites: input.memoryWrites || [],
      model: input.model || null,
      compositionContractVersion: input.compositionContractVersion || null,
      retrievalVersion: input.retrievalVersion || null,
      finalResponseOwner: input.finalResponseOwner || null,
      outputFingerprint: input.outputFingerprint || fingerprint(reply),
      outputExcerpt: input.storeOutputExcerpt === true ? redactExcerpt(reply, 220) : null,
      latencyMs: Number(input.latencyMs || 0) || 0,
      tokenCounts: input.tokenCounts || null,
      estimatedCost: input.estimatedCost || null,
      userFeedback: input.userFeedback || null,
      founderFeedback: input.founderFeedback || null,
      adminOutcome: input.adminOutcome || null,
      evaluationResults: input.evaluationResults || null,
      correctionLinkage: input.correctionLinkage || null,
      recommendationLinkage: input.recommendationLinkage || null,
      learningRecordId: input.learningRecordId || null,
      governanceStatus: input.governanceStatus || 'OBSERVED',
      mutationFlags: {
        doctrineChanged: false,
        scriptureChanged: false,
        evidenceActivated: false,
        productionBehaviorChanged: false,
        ...(input.mutationFlags || {}),
      },
    };
    fs.appendFileSync(LEDGER_PATH, `${JSON.stringify(event)}\n`, 'utf8');
    // v1.1A — durable projection (Postgres bible_buddy_documents when available)
    setImmediate(() => {
      try {
        const { appendItem, DOC, MAX } = require('./founderExperienceDurableStore');
        appendItem(DOC.experienceEvents, event, MAX.experienceEvents).catch((err) => {
          console.warn('[experienceEventLedger] durable append failed:', err.message);
        });
      } catch (err) {
        console.warn('[experienceEventLedger] durable wire failed:', err.message);
      }
    });
    return { ok: true, event };
  } catch (e) {
    console.warn('[experienceEventLedger] append failed:', e.message);
    return { ok: false, reason: e.message };
  }
}

function readExperienceEvents({ limit = 200, eventType = null, traceId = null } = {}) {
  try {
    if (!fs.existsSync(LEDGER_PATH)) return [];
    const lines = fs.readFileSync(LEDGER_PATH, 'utf8').trim().split('\n').filter(Boolean);
    let rows = lines.slice(-Math.max(1, limit)).map((l) => JSON.parse(l));
    if (eventType) rows = rows.filter((r) => r.eventType === String(eventType).toUpperCase());
    if (traceId) rows = rows.filter((r) => r.traceId === traceId || r.turnId === traceId);
    return rows;
  } catch (_) {
    return [];
  }
}

async function readExperienceEventsDurable({ limit = 200, eventType = null, traceId = null } = {}) {
  const { readItems, DOC } = require('./founderExperienceDurableStore');
  const durable = await readItems(DOC.experienceEvents);
  let rows = durable.items || [];
  if (eventType) rows = rows.filter((r) => r.eventType === String(eventType).toUpperCase());
  if (traceId) rows = rows.filter((r) => r.traceId === traceId || r.turnId === traceId);
  return {
    backend: durable.backend,
    durable: durable.durable,
    events: rows.slice(-Math.max(1, limit)),
  };
}

function reconstructTraceLineage(traceId) {
  const events = readExperienceEvents({ limit: 2000, traceId });
  return {
    traceId,
    eventCount: events.length,
    eventTypes: events.map((e) => e.eventType),
    releaseCommits: [...new Set(events.map((e) => e.releaseCommit).filter(Boolean))],
    finalResponseOwners: [...new Set(events.map((e) => e.finalResponseOwner).filter(Boolean))],
    events,
  };
}

async function reconstructTraceLineageDurable(traceId) {
  const { events, backend, durable } = await readExperienceEventsDurable({ limit: 5000, traceId });
  return {
    traceId,
    backend,
    durable,
    eventCount: events.length,
    eventTypes: events.map((e) => e.eventType),
    releaseCommits: [...new Set(events.map((e) => e.releaseCommit).filter(Boolean))],
    finalResponseOwners: [...new Set(events.map((e) => e.finalResponseOwner).filter(Boolean))],
    events,
  };
}

module.exports = {
  SCHEMA_VERSION,
  EVENT_TYPES,
  LEDGER_PATH,
  appendExperienceEvent,
  readExperienceEvents,
  readExperienceEventsDurable,
  reconstructTraceLineage,
  reconstructTraceLineageDurable,
  fingerprint,
  redactExcerpt,
  anonymizedSessionKey,
};
