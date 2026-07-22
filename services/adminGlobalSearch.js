/**
 * UNIFIED_ADMIN_COMMAND_CENTER — Part 7: Global Admin Search.
 *
 * Extensible search adapter. Each "provider" below is a small function
 * that searches ONE existing data source and returns normalized result
 * rows: { sourceSystem, resultType, id, title, snippet, at, drillDownTarget }.
 * Adding a new searchable source means adding one more provider function
 * to `PROVIDERS` — the route/UI layer never needs to change.
 *
 * All providers are read-only and bounded (never scan more than a few
 * hundred records). No secrets, tokens, or unnecessary personal
 * information are ever included in a result snippet.
 */

const { readSupportGraphCandidates } = require('./supportGraphCandidateQueue');
const { readLessonAlignmentSubmissions } = require('./lessonScriptureAlignmentAnalyzer');
const { listRecommendations } = require('./founderIntelligenceRecommendationStore');
const { readAdminAuditTrail } = require('./adminAuditTrail');
const { getRuntimeHealthSnapshot } = require('./runtimeHealthMonitor');

function matches(haystack, needle) {
  return String(haystack || '').toLowerCase().includes(needle);
}

function searchRecommendations(q) {
  const recs = listRecommendations({ limit: 500 });
  return recs
    .filter((r) => {
      const latest = r.latest || {};
      return matches(latest.title, q) || matches(latest.reference, q) || (latest.supportingEvidence || []).some((e) => matches(e, q));
    })
    .map((r) => ({
      sourceSystem: 'founder-intelligence',
      resultType: 'recommendation',
      id: `founder-intelligence:${r.id}`,
      title: r.latest?.title || 'Recommendation',
      snippet: (r.latest?.reasoning || '').slice(0, 200),
      at: r.lastSeenAt,
      drillDownTarget: '#intelligence',
    }));
}

function searchReviewQueue(q) {
  const candidates = readSupportGraphCandidates({ limit: 500 });
  return candidates
    .filter((c) => matches(c.proposedClaim, q) || matches(c.topic, q) || matches(c.extractedReference, q) || matches(c.reason, q))
    .map((c) => ({
      sourceSystem: 'review-queue',
      resultType: 'evidence_candidate',
      id: `review-queue:${c.id}`,
      title: c.proposedTopic || c.topic || c.extractedReference || 'Evidence candidate',
      snippet: String(c.proposedClaim || '').slice(0, 200),
      at: c.createdAt,
      drillDownTarget: '#scripture-review',
    }));
}

function searchLessonAlignment(q) {
  const submissions = readLessonAlignmentSubmissions({ limit: 100 });
  return submissions
    .filter((s) => matches(s.sourceLabel, q) || (s.claims || []).some((c) => matches(c.reference, q) || matches(c.quotedInLesson, q)))
    .map((s, idx) => ({
      sourceSystem: 'lesson-alignment',
      resultType: 'lesson_submission',
      id: `lesson-alignment:${s.at}:${idx}`,
      title: s.sourceLabel || 'Lesson submission',
      snippet: `misquotes=${s.summary?.misquotes || 0}, unresolved=${s.summary?.unresolvedReferences || 0}`,
      at: s.at,
      drillDownTarget: '#founder',
    }));
}

function searchAuditHistory(q) {
  const trail = readAdminAuditTrail({ limit: 500 });
  return trail.entries
    .filter((e) => matches(e.action, q) || matches(e.target, q) || matches(e.approvalReasonOrNote, q))
    .map((e) => ({
      sourceSystem: e.sourceSystem || 'unified-audit-trail',
      resultType: 'audit_action',
      id: e.correlationId,
      title: e.action,
      snippet: `${e.actionType} on ${e.target} (${e.status})`,
      at: e.at,
      drillDownTarget: '#decisions',
    }));
}

function searchRuntimeErrors(q) {
  const snap = getRuntimeHealthSnapshot();
  return (snap.recentErrors || [])
    .filter((e) => matches(e.route, q) || matches(e.error, q) || matches(e.errorCode, q))
    .map((e, idx) => ({
      sourceSystem: 'runtime-health',
      resultType: 'error',
      id: `runtime-error:${e.at}:${idx}`,
      title: e.route || e.errorCode || 'Runtime error',
      snippet: String(e.error || '').slice(0, 200),
      at: e.at,
      drillDownTarget: '#operations',
    }));
}

const PROVIDERS = [
  searchRecommendations,
  searchReviewQueue,
  searchLessonAlignment,
  searchAuditHistory,
  searchRuntimeErrors,
];

function searchAdmin({ q = '', types = null, limit = 25, offset = 0 } = {}) {
  const query = String(q || '').trim().toLowerCase();
  if (!query) return { ok: true, total: 0, offset, limit, results: [], reason: 'Empty query.' };
  if (query.length < 2) return { ok: true, total: 0, offset, limit, results: [], reason: 'Query too short (minimum 2 characters).' };

  let results = [];
  for (const provider of PROVIDERS) {
    try {
      results = results.concat(provider(query));
    } catch (e) {
      console.warn('[adminGlobalSearch] provider failed:', provider.name, e.message);
    }
  }

  if (types && types.length) {
    results = results.filter((r) => types.includes(r.resultType) || types.includes(r.sourceSystem));
  }

  results.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));

  const boundedLimit = Math.min(Number(limit) || 25, 100);
  const total = results.length;
  const page = results.slice(offset, offset + boundedLimit);

  return { ok: true, total, offset, limit: boundedLimit, results: page };
}

module.exports = { searchAdmin };
