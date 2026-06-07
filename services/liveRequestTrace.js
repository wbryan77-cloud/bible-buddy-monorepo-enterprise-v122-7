/**
 * Live /buddy/chat request trace — ownership proof per browser request.
 */

const fs = require('fs');
const path = require('path');
const { detectDangerousFallbackSpeaker } = require('./coreResponseGuards');
const { detectForbiddenProse } = require('./forbiddenProseGuard');

const TRACE_PATH = path.join(__dirname, '..', 'data', 'live-request-trace.jsonl');

const STUDY_RE = /You've been studying|We can continue that study|continue your study journey/i;
const WITNESS_RE = /establishes the matter|confirms it alongside Scripture|carries the theme forward/i;
const HISTORY_RE = /Constantine|Council of Laodicea|Saturday to Sunday/i;

function parseApiError(errorMessage = '') {
  const msg = String(errorMessage || '');
  if (/429|quota/i.test(msg)) return { errorName: 'OpenAIQuotaExceeded', errorMessage: msg.slice(0, 200) };
  if (/401|403/i.test(msg)) return { errorName: 'OpenAIAuthError', errorMessage: msg.slice(0, 200) };
  if (/timeout|ETIMEDOUT|ECONNRESET/i.test(msg)) return { errorName: 'OpenAITimeout', errorMessage: msg.slice(0, 200) };
  if (msg) return { errorName: 'OpenAIError', errorMessage: msg.slice(0, 200) };
  return { errorName: null, errorMessage: null };
}

function buildLiveRequestTrace({ message = '', reply = {}, httpStatus = 200, latencyMs = 0 } = {}) {
  const dbg = reply.coreDebug || reply.runtime?.coreDebug || {};
  const rt = reply.runtime || {};
  const danger = detectDangerousFallbackSpeaker(reply.reply || '');
  const forbidden = detectForbiddenProse(reply.reply || '');
  const routeUsed = dbg.routeUsed || rt.masterRoute || null;
  const openaiCalled = !!(dbg.openaiCalled ?? rt.openAiCalled);
  const finalAnswerAuthor = dbg.finalAnswerAuthor || (openaiCalled ? 'openai' : 'unknown');
  const apiErr = dbg.errorMessage || rt.connectionError || null;
  const parsed = parseApiError(apiErr);

  const studyFallbackUsed =
    danger.studyLoopUsed || STUDY_RE.test(reply.reply || '') || !!rt.personalizedFallback;

  const trace = {
    ts: new Date().toISOString(),
    messagePreview: String(message).slice(0, 200),
    httpStatus,
    latencyMs,
    runtimeUsed: dbg.runtimeUsed || rt.buddyRuntime || 'unknown',
    currentIntent: dbg.currentIntent || rt.currentIntent || null,
    historyAllowed: !!(dbg.historyAllowed ?? rt.historyAllowed),
    routeUsed,
    openaiCalled,
    openaiResponseReceived: openaiCalled && String(reply.reply || '').length > 10,
    finalAnswerAuthor,
    templateUsed: !!(dbg.templateUsed || danger.detected || forbidden.detected || WITNESS_RE.test(reply.reply || '')),
    fallbackUsed: !!(dbg.fallbackUsed || reply.admin_flags?.includes('personalized_fallback')),
    studyFallbackUsed,
    responderUsed: dbg.responderUsed === true || dbg.responderUsed === 'reasonFirstComposer',
    forbiddenPhraseDetected: !!(dbg.forbiddenPhraseDetected || forbidden.detected),
    answerMatchesLatestQuestion: dbg.answerMatchesLatestQuestion ?? null,
    regenerated: !!(dbg.regenerated || rt.regenerated),
    sourceGroundedResponderUsed: /source_grounded|doctrine_general|sabbath_definition/i.test(
      String(routeUsed || '') + String(dbg.responderUsed || '')
    ),
    sabbathHistoryDeepResponderUsed:
      routeUsed === 'sabbath_history' ||
      !!reply.admin_flags?.includes('sabbath_history_deep') ||
      rt.intent === 'sabbath_history',
    buildConnectionErrorReplyUsed:
      routeUsed === 'core_connection_error' || !!reply.admin_flags?.includes('core_connection_error'),
    relationshipEnrichmentUsed: !!rt.relationshipIntelligence,
    evidenceCardsUsed: !!dbg.evidenceCardsUsed,
    errorName: parsed.errorName,
    errorMessage: parsed.errorMessage,
    memoryUsage: {
      heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
    violations: [],
    replyPreview: String(reply.reply || '').slice(0, 300),
  };

  if (trace.witnessTriplet !== false && WITNESS_RE.test(reply.reply || '')) {
    trace.violations.push('witness_triplet');
  }
  if (STUDY_RE.test(reply.reply || '')) trace.violations.push('study_continuation');
  if (HISTORY_RE.test(reply.reply || '') && !/who changed|constantine|history|rome/i.test(message)) {
    trace.violations.push('unsolicited_sabbath_history');
  }
  if (!openaiCalled && !trace.buildConnectionErrorReplyUsed && String(reply.reply || '').length > 20) {
    trace.violations.push('non_openai_speaker');
  }

  return trace;
}

function isLiveRequestTraceEnabled() {
  return String(process.env.BUDDY_LIVE_TRACE || '').toLowerCase() === '1';
}

function logLiveRequestTrace(trace) {
  if (!isLiveRequestTraceEnabled()) return;
  try {
    fs.mkdirSync(path.dirname(TRACE_PATH), { recursive: true });
    fs.appendFileSync(TRACE_PATH, `${JSON.stringify(trace)}\n`);
  } catch (e) {
    console.error('liveRequestTrace write failed:', e.message);
  }
  const flag = trace.violations?.length ? 'LIVE_TRACE_VIOLATION' : 'LIVE_TRACE_OK';
  console.log(
    `[${flag}] route=${trace.routeUsed} author=${trace.finalAnswerAuthor} openai=${trace.openaiCalled} violations=${(trace.violations || []).join(',') || 'none'} rssMB=${trace.memoryUsage.rssMB}`
  );
}

module.exports = {
  buildLiveRequestTrace,
  isLiveRequestTraceEnabled,
  logLiveRequestTrace,
  TRACE_PATH,
  STUDY_RE,
  WITNESS_RE,
};
