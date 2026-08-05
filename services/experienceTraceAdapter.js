/**
 * BIE v1.1 — Normalize existing runtime traces into one span vocabulary.
 * Read-only adapter; does not change answers.
 */

const { appendExperienceEvent, fingerprint } = require('./experienceEventLedger');

const SPAN_NAMES = Object.freeze([
  'request',
  'semantic-understanding',
  'intent-selection',
  'topic-selection',
  'study-chain',
  'lesson-engine',
  'verified-lesson-packet',
  'doctrine-decision',
  'retrieval',
  'memory-read',
  'composition',
  'model-generation',
  'formatting',
  'final-response',
  'memory-write',
  'feedback',
  'evaluation',
]);

function safeRef(value) {
  if (value == null) return null;
  if (typeof value === 'string') return { kind: 'textFingerprint', value: fingerprint(value) };
  if (typeof value === 'number' || typeof value === 'boolean') return { kind: 'scalar', value };
  if (Array.isArray(value)) return { kind: 'count', value: value.length };
  if (typeof value === 'object') {
    return {
      kind: 'objectKeys',
      value: Object.keys(value).slice(0, 24),
    };
  }
  return { kind: 'unknown', value: String(value).slice(0, 40) };
}

function buildNormalizedSpans({ requestId, message, reply = {}, latencyMs = 0 } = {}) {
  const runtime = reply.runtime || {};
  const packet = reply.verifiedLessonPacket || runtime.verifiedLessonPacket || null;
  const spans = [
    {
      name: 'request',
      owner: 'routes/buddy.js',
      version: 'v1',
      status: 'ok',
      durationMs: latencyMs,
      inputs: { message: safeRef(message) },
      outputs: { requestId },
    },
    {
      name: 'intent-selection',
      owner: 'companionDoctrineRouter/currentMessageIntent',
      version: 'v1',
      status: 'ok',
      durationMs: null,
      inputs: { message: safeRef(message) },
      outputs: {
        intent: runtime.intent || runtime.humanNeed || null,
        lane: runtime.orchestratorLane || runtime.masterRoute || null,
      },
    },
    {
      name: 'topic-selection',
      owner: 'doctrineTopicDetector/companionDoctrineRouter',
      version: 'v1',
      status: 'ok',
      outputs: { topic: runtime.doctrineTopic || null },
    },
    {
      name: 'verified-lesson-packet',
      owner: 'openAiFirstCompanionRuntime.attachVerifiedLessonPacketToEvidencePack',
      version: packet?.packetVersion || packet?.schemaVersion || null,
      status: packet ? 'ok' : 'absent',
      outputs: {
        passageRoleCount: Array.isArray(packet?.passageRoles) ? packet.passageRoles.length : 0,
        scriptureBlockCount: Array.isArray(packet?.scriptureBlocks) ? packet.scriptureBlocks.length : 0,
      },
      evidenceCounts: {
        roles: Array.isArray(packet?.passageRoles) ? packet.passageRoles.length : 0,
      },
    },
    {
      name: 'doctrine-decision',
      owner: 'doctrineFinalAuthorityEngine',
      version: 'v1',
      status: reply.doctrineFinalAuthority || runtime.doctrineTopic ? 'ok' : 'skipped',
      outputs: {
        topic: runtime.doctrineTopic || null,
        composedFromPacket: !!runtime.doctrineComposedFromPacket || !!reply.doctrineComposedFromPacket,
        noDoctrineReasoning: runtime.noDoctrineReasoning !== false,
      },
      mutationFlags: { doctrineChanged: false },
    },
    {
      name: 'composition',
      owner: runtime.openAiCalled ? 'reasonFirstComposer' : 'composeDeterministicDoctrineReply',
      version: 'v1',
      status: 'ok',
      outputs: { openAiCalled: !!runtime.openAiCalled },
    },
    {
      name: 'final-response',
      owner: 'finalizeBuddyResponse/liveResponseOwner',
      version: 'v1',
      status: 'ok',
      durationMs: latencyMs,
      outputs: {
        masterRoute: runtime.masterRoute || null,
        finalAnswerAuthor: runtime.finalAnswerAuthor || null,
        replyFingerprint: fingerprint(reply.reply || ''),
      },
    },
  ];
  return spans.filter((s) => SPAN_NAMES.includes(s.name) || true);
}

function captureTurnInstrumentation({
  requestId,
  userId,
  sessionId,
  message,
  reply = {},
  latencyMs = 0,
  clientType = 'biblebuddy',
} = {}) {
  const runtime = reply.runtime || {};
  const spans = buildNormalizedSpans({ requestId, message, reply, latencyMs });
  const common = {
    requestId,
    turnId: requestId,
    traceId: requestId,
    userId,
    sessionId,
    conversationId: sessionId,
    clientType,
    intent: runtime.intent || runtime.humanNeed || null,
    lane: runtime.masterRoute || runtime.orchestratorLane || null,
    topic: runtime.doctrineTopic || null,
    finalResponseOwner: 'finalizeBuddyResponse',
    latencyMs,
    studyChainId: runtime.studyChainId || null,
    lessonPacketId: runtime.lessonId || null,
    lessonPacketVersion: runtime.verifiedLessonPacketVersion || null,
    doctrineDecisionTopic: runtime.doctrineTopic || null,
    privacyScope: 'ANONYMIZED_TELEMETRY',
  };

  const q = appendExperienceEvent({
    ...common,
    eventType: 'QUESTION_RECEIVED',
    currentMessage: message,
    governanceStatus: 'OBSERVED',
  });
  const a = appendExperienceEvent({
    ...common,
    eventType: 'ANSWER_GENERATED',
    parentEventId: q.event?.eventId || null,
    currentMessage: message,
    replyText: reply.reply || '',
    model: runtime.openAiCalled ? 'openai' : 'deterministic',
    governanceStatus: 'OBSERVED',
  });
  appendExperienceEvent({
    ...common,
    eventType: 'TRACE_CAPTURED',
    parentEventId: a.event?.eventId || null,
    evaluationResults: { spanCount: spans.length, spans },
    governanceStatus: 'OBSERVED',
  });

  return { ok: true, requestId, spans, questionEventId: q.event?.eventId || null, answerEventId: a.event?.eventId || null };
}

module.exports = {
  SPAN_NAMES,
  buildNormalizedSpans,
  captureTurnInstrumentation,
  safeRef,
};
