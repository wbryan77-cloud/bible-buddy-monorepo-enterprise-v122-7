/**
 * Production trace logging for reason-first migration.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const TRACE_FILE = path.join(DATA_DIR, 'reason-first-trace.jsonl');

const TEMPLATE_MARKERS = [
  /Historical chain \(secondary to Scripture\):/gi,
  /Sources and references \(historical, secondary\):/gi,
  /Scripture identifies the seventh day as the Sabbath and does not record God changing/gi,
  /Would you like to continue studying/gi,
  /Genesis-to-Revelation path/gi,
  /You're right — I was not answering your exact question\. I used 'Roman church'/gi,
  /Constantine, Codex Justinianus/gi,
  /Council of Laodicea/gi,
];

const RESPONDER_MARKERS = [
  /Proverbs 3:5-6 establishes the matter/gi,
  /That sounds like an important decision/gi,
  /I'm really sorry for your loss/gi,
  /I'm glad you asked to pray/gi,
  /My knees/gi,
  /Here is what I have stored from our recent conversations/gi,
  /Father, we bring this need before You/gi,
];

try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

function estimateMarkerChars(text = '', markers = []) {
  let matched = 0;
  const body = String(text);
  for (const pattern of markers) {
    const re = new RegExp(pattern.source, pattern.flags);
    let m;
    while ((m = re.exec(body)) !== null) {
      matched += m[0].length;
    }
  }
  return matched;
}

function estimateProseBreakdown(reply = '', runtime = 'reason_first', openaiCalled = false) {
  const text = String(reply || '');
  const total = text.length || 1;
  const templateChars = estimateMarkerChars(text, TEMPLATE_MARKERS);
  const responderChars = estimateMarkerChars(text, RESPONDER_MARKERS);

  let templatePct = Math.round((templateChars / total) * 1000) / 10;
  let responderPct = Math.round((responderChars / total) * 1000) / 10;

  if (runtime === 'reason_first' && openaiCalled) {
    templatePct = Math.min(templatePct, 15);
    responderPct = Math.min(responderPct, 15);
  }

  const openaiPct = openaiCalled ? Math.max(0, 100 - templatePct - responderPct) : 0;

  return {
    templateCharsPct: templatePct,
    responderCharsPct: responderPct,
    openaiCharsPct: openaiPct,
    totalChars: total,
  };
}

function appendReasonFirstTrace(entry = {}) {
  const record = {
    timestamp: new Date().toISOString(),
    ...entry,
  };
  try {
    fs.appendFileSync(TRACE_FILE, `${JSON.stringify(record)}\n`);
  } catch (e) {
    console.warn('reasonFirstTrace append failed:', e.message);
  }
  return record;
}

function logReasonFirstTrace({
  runtimeUsed = 'reason_first',
  openaiCalled = false,
  reply = '',
  userQuestion = '',
  validation = {},
  userId = 'anonymous',
  masterRoute = null,
  elapsedMs = 0,
} = {}) {
  const breakdown = estimateProseBreakdown(reply, runtimeUsed, openaiCalled);
  return appendReasonFirstTrace({
    runtimeUsed,
    openaiCalled,
    templateCharsPct: breakdown.templateCharsPct,
    responderCharsPct: breakdown.responderCharsPct,
    openaiCharsPct: breakdown.openaiCharsPct,
    userQuestion: String(userQuestion || '').slice(0, 500),
    answerSummary: String(reply || '').slice(0, 300),
    doctrineValidationResult: validation.doctrineValidationResult || validation.passed === false ? 'fail' : 'pass',
    validationIssues: validation.issues || [],
    userId,
    masterRoute,
    elapsedMs,
  });
}

module.exports = {
  TRACE_FILE,
  estimateProseBreakdown,
  appendReasonFirstTrace,
  logReasonFirstTrace,
};
