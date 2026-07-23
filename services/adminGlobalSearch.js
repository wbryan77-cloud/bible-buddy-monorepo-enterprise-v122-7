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

const fs = require('fs');
const path = require('path');
const { readSupportGraphCandidates } = require('./supportGraphCandidateQueue');
const { readLessonAlignmentSubmissions } = require('./lessonScriptureAlignmentAnalyzer');
const { listRecommendations } = require('./founderIntelligenceRecommendationStore');
const { readAdminAuditTrail } = require('./adminAuditTrail');
const { getRuntimeHealthSnapshot } = require('./runtimeHealthMonitor');
// ENTERPRISE_OPERATIONS_FOUNDATION Phase 1B — Enterprise Search
// Deliverable 9: four additional providers over already-structured,
// already-existing data. No new search engine/index technology — same
// in-process filter-and-rank pattern as the five providers above.
const { getApprovedTopics } = require('./approvedDoctrineRegistry');
const { readAllSnapshots } = require('./knowledgeAnalyticsSnapshotStore');
const { listArticles } = require('./helpCenterContentStore');
const { readEscalations } = require('./userAssistanceEscalationStore');

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

// --- Documentation provider (Deliverable 9) ----------------------------
// Filename/heading-level only in Phase 1, per the Enterprise Search Design
// ("Sequencing Note" — full-text indexing is a Phase 2 item). Index is
// built lazily and cached in-memory (not persisted to disk — no new
// persistence mechanism) and refreshed at most every 10 minutes, bounded
// to the first 2000 files visited so a very large docs/ tree can never
// make a single search request scan unboundedly.
const DOCS_ROOT = path.join(__dirname, '..', 'docs');
let docsIndexCache = null;
let docsIndexCacheAt = 0;
const DOCS_INDEX_MAX_AGE_MS = 10 * 60 * 1000;
const DOCS_INDEX_MAX_FILES = 2000;

function buildDocumentationIndex() {
  const index = [];
  let visited = 0;
  function walk(dir) {
    if (visited >= DOCS_INDEX_MAX_FILES) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (_) {
      return;
    }
    for (const entry of entries) {
      if (visited >= DOCS_INDEX_MAX_FILES) return;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        visited += 1;
        let heading = entry.name;
        try {
          const firstLines = fs.readFileSync(full, 'utf8').slice(0, 500).split('\n');
          const headingLine = firstLines.find((l) => l.trim().startsWith('#'));
          if (headingLine) heading = headingLine.replace(/^#+\s*/, '').trim();
        } catch (_) { /* filename-only fallback */ }
        let mtime = null;
        try {
          mtime = fs.statSync(full).mtime.toISOString();
        } catch (_) { /* optional */ }
        index.push({ filePath: full.replace(path.join(__dirname, '..') + path.sep, ''), fileName: entry.name, heading, mtime });
      }
    }
  }
  walk(DOCS_ROOT);
  return index;
}

function getDocumentationIndex() {
  const now = Date.now();
  if (!docsIndexCache || now - docsIndexCacheAt > DOCS_INDEX_MAX_AGE_MS) {
    docsIndexCache = buildDocumentationIndex();
    docsIndexCacheAt = now;
  }
  return docsIndexCache;
}

function searchDocumentation(q) {
  const index = getDocumentationIndex();
  return index
    .filter((d) => matches(d.fileName, q) || matches(d.heading, q) || matches(d.filePath, q))
    .map((d) => ({
      sourceSystem: 'documentation',
      resultType: 'documentation_article',
      id: `documentation:${d.filePath}`,
      title: d.heading,
      snippet: d.filePath,
      at: d.mtime,
      drillDownTarget: '#command-center',
    }));
}

// --- Knowledge provider (Deliverable 9) ---------------------------------
// Reuses existing snapshot readers + the approved-doctrine registry —
// no new analytics computed here.
function searchKnowledge(q) {
  const results = [];
  try {
    for (const topic of getApprovedTopics()) {
      if (matches(topic, q)) {
        results.push({
          sourceSystem: 'knowledge',
          resultType: 'approved_topic',
          id: `knowledge:topic:${topic}`,
          title: topic,
          snippet: 'Approved, frozen doctrine topic.',
          at: null,
          drillDownTarget: '#scripture-review',
        });
      }
    }
  } catch (e) {
    console.warn('[adminGlobalSearch] knowledge provider (topics) failed:', e.message);
  }
  try {
    const snapshots = readAllSnapshots({});
    for (const [name, snap] of Object.entries(snapshots)) {
      if (matches(name, q) && snap && snap.ok) {
        results.push({
          sourceSystem: 'knowledge',
          resultType: 'knowledge_snapshot',
          id: `knowledge:snapshot:${name}`,
          title: `${name} snapshot`,
          snippet: snap.stale ? 'Stale snapshot — may need refresh.' : 'Current snapshot.',
          at: snap.generatedAt || null,
          drillDownTarget: '#founder',
        });
      }
    }
  } catch (e) {
    console.warn('[adminGlobalSearch] knowledge provider (snapshots) failed:', e.message);
  }
  return results;
}

// --- Evidence provider (Deliverable 9) -----------------------------------
// Reuses existing evidence-card modules + the approved cross-reference
// log — read-only, bounded.
const EVIDENCE_CARDS_DIR = path.join(__dirname, 'evidenceCards');
let evidenceCardsCache = null;

function loadEvidenceCards() {
  if (evidenceCardsCache) return evidenceCardsCache;
  const cards = [];
  try {
    const files = fs.readdirSync(EVIDENCE_CARDS_DIR).filter((f) => f.endsWith('.card.js'));
    for (const f of files) {
      try {
        cards.push(require(path.join(EVIDENCE_CARDS_DIR, f)));
      } catch (e) {
        console.warn('[adminGlobalSearch] failed to load evidence card:', f, e.message);
      }
    }
  } catch (e) {
    console.warn('[adminGlobalSearch] evidence card directory scan failed:', e.message);
  }
  evidenceCardsCache = cards;
  return cards;
}

const CROSS_REFERENCES_PATH = path.join(__dirname, '..', 'data', 'approved-cross-references.jsonl');

function searchEvidence(q) {
  const results = [];
  for (const card of loadEvidenceCards()) {
    const haystack = [card.topic, card.cardId, ...(card.primaryScriptures || []), ...(card.supportingScriptures || [])].join(' ');
    if (matches(haystack, q)) {
      results.push({
        sourceSystem: 'evidence',
        resultType: 'evidence_card',
        id: `evidence:card:${card.cardId}`,
        title: `Evidence card: ${card.topic}`,
        snippet: (card.primaryScriptures || []).slice(0, 4).join('; '),
        at: null,
        drillDownTarget: '#scripture-review',
      });
    }
  }
  try {
    if (fs.existsSync(CROSS_REFERENCES_PATH)) {
      const lines = fs.readFileSync(CROSS_REFERENCES_PATH, 'utf8').trim().split('\n').filter(Boolean).slice(-500);
      for (const line of lines) {
        let rec;
        try {
          rec = JSON.parse(line);
        } catch (_) {
          continue;
        }
        if (matches(rec.extractedReference, q) || matches(rec.actualKjvText, q) || matches(rec.sourceDocument, q)) {
          results.push({
            sourceSystem: 'evidence',
            resultType: 'cross_reference',
            id: `evidence:xref:${rec.id}`,
            title: rec.extractedReference || 'Cross-reference',
            snippet: String(rec.actualKjvText || '').slice(0, 200),
            at: null,
            drillDownTarget: '#scripture-review',
          });
        }
      }
    }
  } catch (e) {
    console.warn('[adminGlobalSearch] cross-reference scan failed:', e.message);
  }
  return results;
}

// --- Support provider (Deliverable 9 — sequenced behind Deliverable 7,
// which has now shipped in this same batch) -------------------------------
function searchSupport(q) {
  const results = [];
  for (const article of listArticles({ limit: 500 })) {
    if (matches(article.title, q) || matches(article.body, q) || matches((article.tags || []).join(' '), q)) {
      results.push({
        sourceSystem: 'support',
        resultType: 'help_center_article',
        id: `support:article:${article.id}`,
        title: article.title,
        snippet: String(article.body || '').slice(0, 200),
        at: article.updatedAt,
        drillDownTarget: '#command-center',
      });
    }
  }
  for (const esc of readEscalations({ limit: 500 })) {
    if (matches(esc.question, q)) {
      results.push({
        sourceSystem: 'support',
        resultType: 'support_escalation',
        id: `support:escalation:${esc.id}`,
        title: esc.question,
        snippet: `status=${esc.status}`,
        at: esc.createdAt,
        drillDownTarget: '#command-center',
      });
    }
  }
  return results;
}

const PROVIDERS = [
  searchRecommendations,
  searchReviewQueue,
  searchLessonAlignment,
  searchAuditHistory,
  searchRuntimeErrors,
  searchDocumentation,
  searchKnowledge,
  searchEvidence,
  searchSupport,
];

/**
 * PHASE_2_ENTERPRISE_OPTIMIZATION — Performance (objective 3).
 * The post-filter below matches a requested `types` value against EITHER
 * `resultType` or `sourceSystem`, so this map lists every tag (both kinds)
 * each provider can ever emit, fixed and enumerable by reading the literal
 * `sourceSystem:`/`resultType:` values in each provider's own code above.
 * searchAuditHistory is the one exception: its sourceSystem is copied from
 * whatever originally recorded each audit entry (`e.sourceSystem ||
 * 'unified-audit-trail'`), which is not knowable ahead of time — so it is
 * deliberately left out of this map and always runs regardless of `types`,
 * guaranteeing a narrow filter can never silently miss a valid audit
 * result. Every other provider is skipped entirely (not run, not just
 * filtered afterward) only when the requested `types` provably cannot
 * match any tag it could ever produce.
 */
const PROVIDER_TAGS = new Map([
  [searchRecommendations, ['founder-intelligence', 'recommendation']],
  [searchReviewQueue, ['review-queue', 'evidence_candidate']],
  [searchLessonAlignment, ['lesson-alignment', 'lesson_submission']],
  [searchRuntimeErrors, ['runtime-health', 'error']],
  [searchDocumentation, ['documentation', 'documentation_article']],
  [searchKnowledge, ['knowledge', 'approved_topic', 'knowledge_snapshot']],
  [searchEvidence, ['evidence', 'evidence_card', 'cross_reference']],
  [searchSupport, ['support', 'help_center_article', 'support_escalation']],
]);
const ALWAYS_RUN_PROVIDERS = new Set([searchAuditHistory]);

function providersToRun(types) {
  if (!types || !types.length) return PROVIDERS;
  const requested = new Set(types);
  return PROVIDERS.filter((provider) => {
    if (ALWAYS_RUN_PROVIDERS.has(provider)) return true;
    const tags = PROVIDER_TAGS.get(provider);
    if (!tags) return true; // unknown provider (future addition) — safe default is to run it
    return tags.some((t) => requested.has(t));
  });
}

function searchAdmin({ q = '', types = null, limit = 25, offset = 0 } = {}) {
  const query = String(q || '').trim().toLowerCase();
  if (!query) return { ok: true, total: 0, offset, limit, results: [], reason: 'Empty query.' };
  if (query.length < 2) return { ok: true, total: 0, offset, limit, results: [], reason: 'Query too short (minimum 2 characters).' };

  let results = [];
  for (const provider of providersToRun(types)) {
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
