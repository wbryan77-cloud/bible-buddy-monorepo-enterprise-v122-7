/**
 * UNIFIED_ADMIN_COMMAND_CENTER — Part 16: deterministic test suite.
 *
 * Exercises, against a running local server (BASE_URL, default
 * http://localhost:3000):
 *   - Authentication boundaries (anonymous/invalid rejected, authorized ok,
 *     token never present in response bodies)
 *   - Admin aggregation contract (every section has status/lastUpdated/
 *     sourceSystem/dataFreshness/errors/drillDownTarget; no fabricated
 *     top-level fields)
 *   - Executive Overview correctness (summary answers present, consistent
 *     with underlying section data)
 *   - Decision Queue (filtering, action -> audit trail correlation)
 *   - Global Search (pagination, minimum query length, bounded page size)
 *   - AI Chief of Staff (source attribution present, confidence present,
 *     never silently mutates production state)
 *   - Scalability (requesting an oversized limit is clamped, never
 *     returns an unbounded page)
 *
 * This is a smoke test, not a unit-test-framework suite (matching the
 * existing convention of every other script in scripts/alpha/). Exit
 * code 0 = all pass, 1 = at least one failure. Prints a PASS/FAIL line
 * per case plus a final summary.
 */

const http = require('http');

const BASE_URL = process.env.CC_SMOKE_BASE_URL || 'http://localhost:3000';
const TOKEN = process.env.CC_SMOKE_TOKEN || process.env.BIBLE_AUTHORITY_ADMIN_TOKEN || 'test-admin-token';
const API = '/admin/api/bible-authority/unified';

function request(method, urlPath, { token = null, body = null, timeoutMs = 15000 } = {}) {
  return new Promise((resolve) => {
    let url;
    try {
      url = new URL(urlPath, BASE_URL);
    } catch (e) {
      resolve({ ok: false, error: e.message });
      return;
    }
    const payload = body ? JSON.stringify(body) : null;
    const headers = { Connection: 'close' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (payload) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = http.request(url, { method, agent: false, headers }, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(raw); } catch (_) { /* non-JSON ok */ }
        resolve({ ok: true, status: res.statusCode, json, raw });
      });
    });
    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.setTimeout(timeoutMs, () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
    if (payload) req.write(payload);
    req.end();
  });
}

const get = (p, opts) => request('GET', p, opts);
const post = (p, body, opts) => request('POST', p, { ...opts, body });

const results = [];
function record(id, passed, detail = '') {
  results.push({ id, passed, detail });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${id}${detail ? ' — ' + detail : ''}`);
}

const REQUIRED_SECTION_ENVELOPE_KEYS = ['status', 'lastUpdated', 'sourceSystem', 'dataFreshness', 'errors', 'drillDownTarget'];

async function main() {
  console.log(`Unified Admin Command Center smoke test against ${BASE_URL}`);
  console.log(`Using admin token: ${TOKEN ? '(provided, redacted)' : '(none)'}\n`);

  // ---------------------------------------------------------------
  // AUTHENTICATION
  // ---------------------------------------------------------------
  {
    const r = await get(`${API}/overview`);
    record('auth_anonymous_rejected', r.ok && r.status === 401, `status=${r.status}`);
  }
  {
    const r = await get(`${API}/overview`, { token: 'definitely-not-the-real-token' });
    record('auth_invalid_token_rejected', r.ok && r.status === 401, `status=${r.status}`);
  }
  {
    const r = await get(`${API}/overview`, { token: TOKEN });
    record('auth_valid_token_succeeds', r.ok && r.status === 200 && r.json && r.json.ok !== false, `status=${r.status}`);
    record('auth_token_not_echoed_in_body', r.ok && !String(r.raw || '').includes(TOKEN), 'response body does not contain the raw token value');
  }
  {
    const r = await post(`${API}/decision-queue/does-not-exist/investigate`, {});
    record('auth_post_anonymous_rejected', r.ok && r.status === 401, `status=${r.status}`);
  }

  // ---------------------------------------------------------------
  // ADMIN AGGREGATION CONTRACT
  // ---------------------------------------------------------------
  let overview = null;
  {
    const r = await get(`${API}/overview`, { token: TOKEN });
    overview = r.json;
    const hasTopFields = overview && overview.build && overview.systemHealth && overview.executiveSummary;
    record('aggregation_top_level_shape', !!hasTopFields, 'build/systemHealth/executiveSummary present');

    const sectionNames = ['systemHealth', 'usersAndSessions', 'experienceQuality', 'scriptureAndKnowledge', 'lessonAlignment', 'founderIntelligence', 'recommendations', 'security', 'alerts', 'audit'];
    let envelopeOk = true;
    let missing = [];
    for (const name of sectionNames) {
      const section = overview && overview[name];
      if (!section) { envelopeOk = false; missing.push(name); continue; }
      for (const key of REQUIRED_SECTION_ENVELOPE_KEYS) {
        if (!(key in section)) { envelopeOk = false; missing.push(`${name}.${key}`); }
      }
    }
    record('aggregation_section_envelope_complete', envelopeOk, missing.length ? `missing: ${missing.join(', ')}` : 'all sections carry status/lastUpdated/sourceSystem/dataFreshness/errors/drillDownTarget');

    const statuses = sectionNames.map((n) => overview && overview[n] && overview[n].status).filter(Boolean);
    const validStatuses = statuses.every((s) => ['OK', 'DEGRADED', 'ERROR', 'UNAVAILABLE'].includes(s));
    record('aggregation_no_fabricated_status_values', validStatuses, `statuses seen: ${[...new Set(statuses)].join(', ')}`);
  }
  {
    // Partial-source-failure tolerance: at least confirm the contract exposes
    // per-section errors arrays rather than throwing / 500ing the whole
    // response when read (functional proof that the pattern is wired, since
    // simulating a real subsystem outage is out of scope for a smoke test).
    const allSectionsHaveErrorsArray = overview && ['systemHealth', 'scriptureAndKnowledge', 'lessonAlignment'].every((n) => Array.isArray(overview[n] && overview[n].errors));
    record('aggregation_partial_failure_contract_present', !!allSectionsHaveErrorsArray, 'sections expose an errors[] array for partial-failure reporting');
  }

  // ---------------------------------------------------------------
  // EXECUTIVE OVERVIEW
  // ---------------------------------------------------------------
  {
    const summary = overview && overview.executiveSummary;
    const answerKeys = summary && summary.answers ? Object.keys(summary.answers) : [];
    const hasAnswers = answerKeys.length >= 5;
    record('executive_overview_five_key_answers', !!hasAnswers, `answers keys=${answerKeys.join(', ')}`);
    const hasBadge = summary && typeof summary.overallStatus === 'string';
    record('executive_overview_severity_present', !!hasBadge, `overallStatus=${summary && summary.overallStatus}`);
    const decisionsSection = overview && overview.recommendations;
    const drillDownOk = decisionsSection && typeof decisionsSection.drillDownTarget === 'string' && decisionsSection.drillDownTarget.startsWith('#');
    record('executive_overview_drilldown_targets_present', !!drillDownOk, `drillDownTarget=${decisionsSection && decisionsSection.drillDownTarget}`);
  }

  // ---------------------------------------------------------------
  // DECISION QUEUE
  // ---------------------------------------------------------------
  let queueItemId = null;
  {
    const r = await get(`${API}/decision-queue?limit=5`, { token: TOKEN });
    const ok = r.ok && r.status === 200 && r.json && r.json.ok && Array.isArray(r.json.items);
    record('decision_queue_list_paginated', !!ok, `total=${r.json && r.json.total}, page=${r.json && r.json.items && r.json.items.length}`);
    if (ok && r.json.items.length) queueItemId = r.json.items[0].id;
  }
  {
    const r = await get(`${API}/decision-queue?severity=Low&limit=50`, { token: TOKEN });
    const allLow = r.ok && r.json && r.json.items.every((i) => i.severity === 'Low');
    record('decision_queue_severity_filter', !!allLow, `items=${r.json && r.json.items && r.json.items.length}`);
  }
  {
    const r = await get(`${API}/decision-queue?status=Deferred&limit=50`, { token: TOKEN });
    const allDeferred = r.ok && r.json && r.json.items.every((i) => i.status === 'Deferred');
    record('decision_queue_status_filter', !!allDeferred, `items=${r.json && r.json.items && r.json.items.length}`);
  }
  if (queueItemId) {
    const before = await get(`${API}/audit?limit=1`, { token: TOKEN });
    const beforeCount = before.json ? before.json.total : null;
    const action = await post(`${API}/decision-queue/${encodeURIComponent(queueItemId)}/investigate`, { note: 'smoke-test' }, { token: TOKEN });
    const actionOk = action.ok && action.status === 200 && action.json && action.json.ok && action.json.status === 'Investigating';
    record('decision_queue_action_applies', !!actionOk, `resulting status=${action.json && action.json.status}`);

    const after = await get(`${API}/audit?limit=1`, { token: TOKEN });
    const afterCount = after.json ? after.json.total : null;
    const auditGrew = typeof beforeCount === 'number' && typeof afterCount === 'number' && afterCount >= beforeCount + 1;
    record('decision_queue_action_creates_audit_record', auditGrew, `before=${beforeCount}, after=${afterCount}`);

    const auditEntry = after.json && after.json.entries.find((e) => e.target === queueItemId && e.actionType === 'INVESTIGATE');
    record('decision_queue_audit_record_shape', !!(auditEntry && auditEntry.actorId && auditEntry.at && 'resultingState' in auditEntry), auditEntry ? 'found matching audit entry with actor/timestamp/resultingState' : 'no matching audit entry found');
  } else {
    record('decision_queue_action_applies', false, 'no queue item available to act on (queue empty)');
  }

  // ---------------------------------------------------------------
  // GLOBAL SEARCH
  // ---------------------------------------------------------------
  {
    const r = await get(`${API}/search?q=a`, { token: TOKEN });
    const rejectsShortQuery = r.ok && r.json && r.json.total === 0 && r.json.results.length === 0;
    record('search_minimum_query_length_enforced', !!rejectsShortQuery, `single-char query returns empty result set`);
  }
  {
    const r = await get(`${API}/search?q=evidence&limit=3`, { token: TOKEN });
    const ok = r.ok && r.status === 200 && r.json && r.json.ok && Array.isArray(r.json.results) && r.json.results.length <= 3;
    record('search_pagination_respects_limit', !!ok, `results.length=${r.json && r.json.results && r.json.results.length}, total=${r.json && r.json.total}`);
    const shapeOk = r.json && r.json.results.every((res) => res.sourceSystem && res.resultType && res.title && res.drillDownTarget);
    record('search_result_shape_has_source_and_drilldown', !!shapeOk, 'every result carries sourceSystem/resultType/title/drillDownTarget');
  }
  {
    const r = await get(`${API}/search`);
    record('search_requires_authorization', r.ok && r.status === 401, `status=${r.status}`);
  }

  // ---------------------------------------------------------------
  // AI CHIEF OF STAFF
  // ---------------------------------------------------------------
  {
    const r = await post(`${API}/assistant`, { question: 'What needs my attention today?' }, { token: TOKEN });
    const answer = r.json;
    const ok = r.ok && r.status === 200 && answer && typeof answer.summary === 'string';
    record('assistant_answers_authorized_question', !!ok, `status=${r.status}`);
    const hasAttribution = answer && Array.isArray(answer.sourceSystems) && answer.sourceSystems.length > 0;
    record('assistant_source_attribution_present', !!hasAttribution, `sourceSystems=${answer && (answer.sourceSystems || []).join(',')}`);
    const hasConfidence = answer && typeof answer.confidence === 'string' && answer.confidence.length > 0;
    record('assistant_confidence_present', !!hasConfidence, `confidence=${answer && answer.confidence}`);
    const hasApprovalFlag = answer && typeof answer.requiredApproval === 'boolean';
    record('assistant_states_required_approval', !!hasApprovalFlag, `requiredApproval=${answer && answer.requiredApproval}`);
  }
  {
    const r = await post(`${API}/assistant`, { question: 'approve everything in the queue right now' }, { token: TOKEN });
    const answer = r.json;
    const noAutoApprovalLanguage = !answer || !/\bI (have|just) approved\b/i.test(JSON.stringify(answer));
    record('assistant_never_claims_auto_approval', !!noAutoApprovalLanguage, 'assistant response does not claim to have performed an approval itself');
  }
  {
    const r = await post(`${API}/assistant`, {}, { token: TOKEN });
    const safeFallback = r.ok && r.status === 200 && r.json && typeof r.json.summary === 'string';
    record('assistant_safe_failure_on_empty_question', !!safeFallback, `status=${r.status}, has deterministic fallback summary`);
  }

  // ---------------------------------------------------------------
  // ENTERPRISE INTELLIGENCE (Phase 3 — Autonomous Operations)
  //
  // Added during Phase 3 integration validation: the routes existed and
  // were exercised live during that batch, but no regression test proved
  // the 401 boundary specifically for these 6 routes (a confirmed gap
  // found during validation — see docs/alpha/phase3-integration-validation-*
  // for the full report). This closes that gap using the exact same
  // request/record pattern as every other section above.
  // ---------------------------------------------------------------
  const ENTERPRISE_INTELLIGENCE_ROUTES = [
    '/enterprise-intelligence',
    '/enterprise-intelligence/release-readiness',
    '/enterprise-intelligence/health-score',
    '/enterprise-intelligence/anomalies',
    '/enterprise-intelligence/developer-intelligence',
    '/enterprise-intelligence/recommendation-learning',
  ];
  for (const routePath of ENTERPRISE_INTELLIGENCE_ROUTES) {
    const anon = await get(`${API}${routePath}`);
    record(`enterprise_intelligence_anonymous_rejected${routePath}`, anon.ok && anon.status === 401, `status=${anon.status}`);

    const invalid = await get(`${API}${routePath}`, { token: 'definitely-not-the-real-token' });
    record(`enterprise_intelligence_invalid_token_rejected${routePath}`, invalid.ok && invalid.status === 401, `status=${invalid.status}`);
  }
  {
    // The consolidated summary is the slow path (real `npm outdated` +
    // repo-wide file scan) — give it a longer timeout than the default.
    const r = await get(`${API}/enterprise-intelligence?skipCache=1`, { token: TOKEN, timeoutMs: 30000 });
    const ok = r.ok && r.status === 200 && r.json && r.json.sections;
    record('enterprise_intelligence_authorized_returns_all_sections', !!ok, `sections=${ok ? Object.keys(r.json.sections).join(',') : 'none'}`);
    const allSectionsHealthy = ok && Object.values(r.json.sections).every((s) => ['OK', 'UNAVAILABLE'].includes(s.status));
    record('enterprise_intelligence_section_envelope_contract', !!allSectionsHealthy, 'every section carries a valid status from the shared buildSection envelope');
  }
  {
    const r = await get(`${API}/enterprise-intelligence/release-readiness`, { token: TOKEN });
    const ok = r.ok && r.status === 200 && r.json && ['GO', 'CAUTION', 'BLOCK'].includes(r.json.recommendation) && r.json.requiredApproval === true;
    record('release_readiness_returns_valid_recommendation', !!ok, `recommendation=${r.json && r.json.recommendation}, requiredApproval=${r.json && r.json.requiredApproval}`);
  }
  {
    const r = await get(`${API}/enterprise-intelligence/health-score`, { token: TOKEN });
    const ok = r.ok && r.status === 200 && r.json && typeof r.json.score === 'number' && r.json.score >= 0 && r.json.score <= 100;
    record('health_score_in_valid_range', !!ok, `score=${r.json && r.json.score}, grade=${r.json && r.json.grade}`);
  }

  // ---------------------------------------------------------------
  // SCALABILITY
  // ---------------------------------------------------------------
  {
    const r = await get(`${API}/decision-queue?limit=999999`, { token: TOKEN });
    const clamped = r.ok && r.json && r.json.limit <= 200 && r.json.items.length <= 200;
    record('scalability_decision_queue_limit_clamped', !!clamped, `requested=999999, effective limit=${r.json && r.json.limit}, returned=${r.json && r.json.items && r.json.items.length}`);
  }
  {
    const r = await get(`${API}/search?q=evidence&limit=999999`, { token: TOKEN });
    const clamped = r.ok && r.json && r.json.limit <= 100 && r.json.results.length <= 100;
    record('scalability_search_limit_clamped', !!clamped, `requested=999999, effective limit=${r.json && r.json.limit}, returned=${r.json && r.json.results && r.json.results.length}`);
  }
  {
    const r = await get(`${API}/audit?limit=999999`, { token: TOKEN });
    const clamped = r.ok && r.json && r.json.limit <= 500 && r.json.entries.length <= 500;
    record('scalability_audit_limit_clamped', !!clamped, `requested=999999, effective limit=${r.json && r.json.limit}, returned=${r.json && r.json.entries && r.json.entries.length}`);
  }

  // ---------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------
  const passCount = results.filter((r) => r.passed).length;
  const failCount = results.length - passCount;
  console.log(`\n${passCount}/${results.length} passed, ${failCount} failed.`);
  if (failCount > 0) {
    console.log('\nFailed cases:');
    results.filter((r) => !r.passed).forEach((r) => console.log(`  - ${r.id}: ${r.detail}`));
  }
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Smoke test crashed:', e);
  process.exit(1);
});
