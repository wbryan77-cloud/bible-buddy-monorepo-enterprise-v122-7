/* Phase 2K / 2N — Bible Authority Command Center UI */
const API = '/admin/api/bible-authority/command-center';

// FOUNDER ALPHA ADMIN SECURITY — BIBLE_AUTHORITY_ADMIN_TOKEN is now enforced
// on every /admin/api/bible-authority/* route. This UI previously had no way
// to send it, so every fetch below would 401 once the token was configured.
// The token is entered once by the admin, kept only in this browser's
// localStorage, and attached as an Authorization header on admin API calls.
// It is never sent to, or requested from, anywhere but this same origin.
const ADMIN_TOKEN_KEY = 'bb_admin_token';

function getAdminToken() {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY) || '';
  } catch (_) {
    return '';
  }
}

function setAdminToken(token) {
  try {
    if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
    else localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch (_) {
    /* private-mode / storage disabled — non-fatal */
  }
}

function setAdminTokenBannerLocked(locked) {
  const bar = document.getElementById('adminTokenBar');
  const status = document.getElementById('adminTokenStatus');
  if (!bar || !status) return;
  bar.classList.toggle('locked', !!locked);
  status.textContent = locked
    ? 'Admin token missing or incorrect — Admin data is locked. Paste the correct token above and click Save.'
    : 'Admin data unlocked for this browser.';
}

async function adminFetch(url, options = {}) {
  const token = getAdminToken();
  const headers = Object.assign({}, options.headers || {});
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, Object.assign({}, options, { headers }));
  if (res.status === 401) {
    setAdminTokenBannerLocked(true);
  } else if (token) {
    setAdminTokenBannerLocked(false);
  }
  return res;
}

/**
 * Parse an admin/API Response as JSON without throwing on HTML error pages.
 * Returns { ok, data, error, status, contentType }.
 */
async function parseAdminJson(res, label = 'request') {
  const status = res.status;
  const contentType = String(res.headers.get('content-type') || '');
  const text = await res.text();
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return { ok: false, data: null, error: `${label}: empty response (HTTP ${status})`, status, contentType };
  }
  if (trimmed.charAt(0) === '<' || contentType.includes('text/html')) {
    return {
      ok: false,
      data: null,
      error: `${label}: expected JSON but received HTML (HTTP ${status}). Check auth, route, and deployment.`,
      status,
      contentType,
    };
  }
  try {
    const data = JSON.parse(trimmed);
    return { ok: true, data, error: null, status, contentType };
  } catch (e) {
    return {
      ok: false,
      data: null,
      error: `${label}: invalid JSON (HTTP ${status}): ${e.message}`,
      status,
      contentType,
    };
  }
}

function showSection(id) {
  document.querySelectorAll('.section').forEach((el) => el.classList.remove('active'));
  document.querySelectorAll('.nav button').forEach((el) => el.classList.remove('active'));
  const section = document.getElementById(id);
  if (section) section.classList.add('active');
  const tab = document.getElementById(`tab-${id === 'scripture-review' ? 'scripture' : id}`);
  if (tab) tab.classList.add('active');
}

function showSubView(id) {
  document.querySelectorAll('.sub-view').forEach((el) => el.classList.remove('active'));
  document.querySelectorAll('.sub-nav button').forEach((el) => el.classList.remove('active'));
  const view = document.getElementById(`view-${id}`);
  if (view) view.classList.add('active');
  const btn = document.getElementById(`sub-${id}`);
  if (btn) btn.classList.add('active');
}

function renderExecutive(ex) {
  const metrics = [
    ['Questions Discovered', ex.questionsDiscovered],
    ['Topics Discovered', ex.topicsDiscovered],
    ['Scripture Chains', ex.scriptureChainsDiscovered],
    ['G2R Chains', ex.genesisToRevelationChains],
    ['Parallel Scriptures', ex.parallelScripturesFound],
    ['Awaiting Review', ex.candidatesAwaitingReview],
    ['Approved Relationships', ex.approvedScriptureRelationships],
    ['First Batch Applied', ex.firstBatchApplied ? 'Yes' : 'No'],
    ['Second Batch Applied', ex.secondBatchApplied ? 'Yes' : 'No'],
    ['Coverage Score', ex.scriptureAuthorityCoverageScore ?? 'n/a'],
    ['Batch 4 Pool', ex.batch4SimpleCandidateCount ?? 'n/a'],
    ['Review Model', ex.reviewModel ?? 'scripture_strength'],
    ['Approved Scriptures', ex.approvedScriptureCount ?? 'n/a'],
    ['Pending Pack Reviews', ex.pendingReviewLoad ?? 'n/a'],
  ];
  document.getElementById('executiveMetrics').innerHTML = metrics
    .map(([label, val]) => `<div><div class="metric">${val}</div><div class="metric-label">${label}</div></div>`)
    .join('');
  document.getElementById('executiveHealth').textContent = `System health: hard cutover ${ex.systemHealthSummary.hardCutoverPass ? 'PASS' : 'FAIL'} · stress pass rate ${ex.systemHealthSummary.stressPassRate ?? 'n/a'}% · ownership ${ex.systemHealthSummary.ownershipIntact ? 'intact' : 'check'}`;
}

function renderScriptureReview(sr) {
  const tiers = sr.strengthTiers || [];
  let html = '<div style="margin-bottom:12px">';
  for (const t of tiers) {
    const count = (sr.byTier[t.label] || []).length;
    html += `<button type="button" class="tier-filter" data-tier="${t.label}" style="margin:4px">${t.label} (${count})</button> `;
  }
  html += '</div>';

  const rows = [];
  for (const tier of tiers) {
    for (const c of sr.byTier[tier.label] || []) {
      rows.push(c);
    }
  }

  html += '<table><thead><tr><th>ID</th><th>Tier</th><th>Support %</th><th>Lesson</th><th>Action</th></tr></thead><tbody>';
  for (const c of rows.slice(0, 40)) {
    html += `<tr>
      <td>${c.candidateId}</td>
      <td><span class="tier-badge">${c.strengthTier}</span></td>
      <td>${c.supportScore}</td>
      <td>${c.lessonTitle}</td>
      <td>${c.recommendedAction} ${c.humanDecision ? `(${c.humanDecision})` : ''}</td>
    </tr>
    <tr><td colspan="5" class="candidate-detail">
      <strong>Q:</strong> ${c.question}<br>
      <strong>Original:</strong> ${(c.originalScriptureChain || []).join('; ')}<br>
      <strong>G2R:</strong> ${(c.genesisToRevelationChain || []).slice(0, 5).join('; ')}<br>
      <strong>Parallel:</strong> ${(c.parallelScriptures || []).slice(0, 5).join('; ')}<br>
      <strong>Supporting:</strong> ${(c.supportingScriptures || []).slice(0, 5).join('; ')}<br>
      <strong>Caution (info):</strong> ${(c.cautionScriptures || []).join('; ') || 'none'}
    </td></tr>`;
  }
  html += '</tbody></table>';
  if (rows.length > 40) html += `<p>Showing 40 of ${rows.length} candidates.</p>`;
  document.getElementById('scriptureList').innerHTML = html;
}

function renderRelationshipGroups(groups = []) {
  let html = '<table><thead><tr><th>Group</th><th>Count</th><th>Avg Score</th><th>Shared G2R</th><th>Duplicate Chains</th></tr></thead><tbody>';
  for (const g of groups) {
    html += `<tr>
      <td><strong>${g.groupLabel}</strong><br><small>${g.topic}</small></td>
      <td>${g.candidateCount}</td>
      <td>${g.supportScoreAverage}</td>
      <td>${(g.sharedGenesisToRevelationChain || []).slice(0, 4).join('; ')}</td>
      <td>${(g.sharedScriptureChains || []).length}</td>
    </tr>`;
  }
  html += '</tbody></table>';
  if (groups.length === 0) html += '<p>No groups loaded.</p>';
  document.getElementById('relationshipGroups').innerHTML = html;
}

function renderTopicCoverage(rows = []) {
  let html = '<table><thead><tr><th>Topic</th><th>Score</th><th>G2R%</th><th>Edges</th><th>Retrieval%</th><th>Pending</th></tr></thead><tbody>';
  for (const r of rows) {
    html += `<tr>
      <td>${r.groupLabel || r.topic}</td>
      <td>${r.supportScoreAverage}</td>
      <td>${r.genesisToRevelationCoverage?.pct ?? '—'}%</td>
      <td>${r.supportGraphCoverage?.edgeCount ?? 0}</td>
      <td>${r.retrievalCoverage}%</td>
      <td>${(r.pendingScriptures || []).length}</td>
    </tr>`;
  }
  html += '</tbody></table>';
  document.getElementById('topicCoverage').innerHTML = html;
}

function renderTopicPacks(packs = [], coverage = null) {
  let html = '<table><thead><tr><th>Topic</th><th>Support %</th><th>Tier</th><th>Pending</th><th>Decision</th></tr></thead><tbody>';
  for (const p of packs) {
    html += `<tr>
      <td><strong>${p.displayName}</strong><br><small>${p.lessonTitle}</small></td>
      <td>${p.supportScoreAverage}</td>
      <td>${p.strengthTier}</td>
      <td>${(p.pendingScriptures || []).length}</td>
      <td>${p.decision || 'pending'}</td>
    </tr>
    <tr><td colspan="5" class="candidate-detail">
      <strong>G2R:</strong> ${(p.genesisToRevelationChain || []).slice(0, 4).join('; ')}<br>
      <strong>Parallel:</strong> ${(p.parallelScriptures || []).slice(0, 4).join('; ')}<br>
      <strong>Caution (info):</strong> ${(p.cautionScriptures || []).slice(0, 3).join('; ') || 'none'}<br>
      <strong>Explanation:</strong> ${p.scoreExplanation || ''}
    </td></tr>`;
  }
  html += '</tbody></table>';
  document.getElementById('topicPacks').innerHTML = html;
  if (coverage) {
    document.getElementById('coverageScoreLine').textContent = `Scripture Authority Coverage Score: ${coverage.currentCoverageScore} → projected ${coverage.projectedCoverageScoreAfterBatch3} (${coverage.coverageGrowthRatePct}% growth)`;
  }
}

function renderImplementationReadiness(rows = []) {
  let html = '<table><thead><tr><th>Topic</th><th>Ready</th><th>Approved</th><th>Pending</th><th>High≥90</th><th>New Refs</th></tr></thead><tbody>';
  for (const r of rows) {
    html += `<tr>
      <td>${r.groupLabel || r.topic}</td>
      <td>${r.readyForImplementation ? '✓' : '—'}</td>
      <td>${r.approvedCount}</td>
      <td>${r.pendingCount}</td>
      <td>${r.highScorePendingCount}</td>
      <td>${r.estimatedImpact?.newScriptureRefs ?? 0}</td>
    </tr>`;
  }
  html += '</tbody></table>';
  document.getElementById('implementationReadiness').innerHTML = html;
}

function renderEngineering(eng) {
  document.getElementById('engineeringBody').textContent = JSON.stringify(eng, null, 2);
}

const CLASSIFICATION_BADGE = {
  AUTO_APPROVE: '#16a34a',
  NEEDS_HUMAN_REVIEW: '#d97706',
  REJECT: '#dc2626',
};

async function loadPendingCandidates() {
  const res = await adminFetch('/admin/api/bible-authority/review-queue');
  const data = await res.json();
  if (data && data.ok === false) return;
  renderPendingCandidates(data.items || []);
}

function renderPendingCandidates(items = []) {
  if (!items.length) {
    document.getElementById('pendingCandidates').innerHTML = '<p>No pending candidates in the queue.</p>';
    return;
  }

  let html = '<table><thead><tr><th>Pending Item</th><th>Reason</th><th>Confidence</th><th>Evidence</th><th>Source</th><th>Recommendation</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
  for (const item of items) {
    const color = CLASSIFICATION_BADGE[item.classification] || '#e5e7eb';
    const disabled = item.status && item.status !== 'pending_review' ? 'disabled' : '';
    html += `<tr>
      <td><strong>${item.pendingItem.topic || '(no topic)'}</strong><br><small>${item.pendingItem.proposedClaim}</small></td>
      <td>${item.reason || ''}</td>
      <td><span class="tier-badge" style="background:${color};color:#fff">${item.classification}</span><br>${item.confidence}</td>
      <td>${(item.evidence || []).join('; ')}</td>
      <td>${item.source || ''}</td>
      <td>${item.recommendation || ''}</td>
      <td>${item.status}</td>
      <td>
        <button type="button" class="candidate-action" data-id="${item.pendingItem.id}" data-action="approve" ${disabled}>Approve</button>
        <button type="button" class="candidate-action" data-id="${item.pendingItem.id}" data-action="reject" ${disabled}>Reject</button>
        <button type="button" class="candidate-action" data-id="${item.pendingItem.id}" data-action="merge" ${disabled}>Merge</button>
        <button type="button" class="candidate-action" data-id="${item.pendingItem.id}" data-action="archive" ${disabled}>Archive</button>
      </td>
    </tr>`;
  }
  html += '</tbody></table>';
  document.getElementById('pendingCandidates').innerHTML = html;

  document.querySelectorAll('.candidate-action').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const action = btn.getAttribute('data-action');
      await adminFetch(`/admin/api/bible-authority/review-queue/${encodeURIComponent(id)}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decidedBy: 'admin' }),
      });
      loadPendingCandidates();
    });
  });
}

async function load() {
  const res = await adminFetch(API);
  const parsed = await parseAdminJson(res, 'command-center');
  if (!parsed.ok) {
    const summary = document.getElementById('founderValidatorSummary');
    if (summary) summary.textContent = 'Command Center load failed: ' + parsed.error;
    return;
  }
  const data = parsed.data;
  if (data && data.ok === false) return;
  renderExecutive(data.areas.executiveGrowthDashboard);
  const sr = data.areas.scriptureAuthorityReview;
  renderScriptureReview(sr);
  renderRelationshipGroups(sr.relationshipGroups);
  renderTopicCoverage(sr.topicCoverage);
  renderImplementationReadiness(sr.implementationReadiness);
  renderTopicPacks(sr.topicApprovalPacks, sr.scriptureAuthorityCoverage);
  renderEngineering(data.areas.engineeringIntelligence);
  loadPendingCandidates();
  loadFounderReadiness();
}

// PHASE_6H — Founder Readiness tab: reads three existing, already-verified
// endpoints (founder-console, knowledge-coverage-dashboard, and the new
// founder-readiness-report) and renders them as plain cards/tables,
// matching the rest of this page's style. No new analytics, no new
// pipeline — pure read/render.
async function loadFounderReadiness() {
  const summaryEl = document.getElementById('founderValidatorSummary');
  try {
    const requests = [
      ['founder-console', adminFetch('/admin/api/bible-authority/founder-console')],
      ['knowledge-coverage-dashboard', adminFetch('/admin/api/bible-authority/knowledge-coverage-dashboard')],
      ['founder-readiness-report', adminFetch('/admin/api/bible-authority/founder-readiness-report')],
      ['runtime-health', adminFetch('/api/runtime-health')],
      ['lesson-alignment/submissions', adminFetch('/admin/api/bible-authority/lesson-alignment/submissions')],
    ];
    const responses = await Promise.all(requests.map(([, p]) => p));
    const parsed = await Promise.all(
      responses.map((res, i) => parseAdminJson(res, requests[i][0])),
    );
    const failures = parsed.filter((p) => !p.ok);
    if (failures.length) {
      if (summaryEl) {
        summaryEl.textContent = 'Founder Readiness partial/complete load failure: '
          + failures.map((f) => f.error).join(' | ');
      }
    }

    const [consoleParsed, coverageParsed, validatorParsed, healthParsed, lessonParsed] = parsed;
    if (consoleParsed.ok && consoleParsed.data) {
      renderFounderBuild(consoleParsed.data);
      renderFounderFeatureTable(consoleParsed.data.featureDisposition || []);
    }
    if (coverageParsed.ok && coverageParsed.data) {
      renderFounderCoverage(coverageParsed.data.overview || {});
    }
    if (validatorParsed.ok) {
      renderFounderValidator(validatorParsed.data);
    }
    if (healthParsed.ok && healthParsed.data) {
      renderFounderSystemHealth(healthParsed.data);
      renderFounderObservation(healthParsed.data.observation || {});
    }
    if (lessonParsed.ok && lessonParsed.data) {
      renderLessonSubmissions(lessonParsed.data.submissions || []);
    }
  } catch (error) {
    if (summaryEl) {
      summaryEl.textContent = 'Could not load Founder Readiness data: ' + error.message;
    }
  }
}

function renderLessonSubmissions(submissions) {
  const tbody = document.querySelector('#lessonSubmissionsTable tbody');
  if (!tbody) return;
  if (!submissions.length) {
    tbody.innerHTML = '<tr><td colspan="7">No Lesson Alignment submissions recorded yet.</td></tr>';
    return;
  }
  tbody.innerHTML = submissions
    .map((s) => {
      const sm = s.summary || {};
      const when = s.at ? new Date(s.at).toLocaleString() : 'n/a';
      return `<tr><td>${when}</td><td>${(s.sourceLabel || 'Untitled').slice(0, 60)}</td><td>${sm.totalReferencesFound ?? 0}</td><td>${sm.matchesKjv ?? 0}</td><td>${sm.misquotes ?? 0}</td><td>${sm.referenceOnlyNoQuote ?? 0}</td><td>${sm.unresolvedReferences ?? 0}</td></tr>`;
    })
    .join('');
}

function renderFounderSystemHealth(health) {
  const grid = document.getElementById('founderSystemHealthGrid');
  if (!grid) return;
  const metrics = [
    ['Uptime', health.uptimeMs ? Math.round(health.uptimeMs / 60000) + ' min' : 'n/a'],
    ['Memory (RSS)', health.rssMB != null ? health.rssMB + ' MB' : 'n/a'],
    ['Memory pressure', health.memoryPressureLevel || 'n/a'],
    ['Total requests', health.totalRequests ?? 'n/a'],
    ['Avg. latency', health.averageLatencyMs != null ? health.averageLatencyMs + ' ms' : 'n/a'],
    ['Max latency', health.maxLatencyMs != null ? health.maxLatencyMs + ' ms' : 'n/a'],
    ['Errors', health.errors ?? 'n/a'],
    ['Timeouts', health.timeouts ?? 'n/a'],
    ['Fallbacks', health.fallbackCount ?? 'n/a'],
    ['OpenAI calls', health.openAiCalls ?? 'n/a'],
    ['Strict doctrine calls', health.strictDoctrineCalls ?? 'n/a'],
    ['OpenAI configured', health.openAiConfigured ? 'Yes' : 'No'],
  ];
  grid.innerHTML = metrics
    .map(([label, val]) => `<div><div class="metric">${val}</div><div class="metric-label">${label}</div></div>`)
    .join('');
}

function renderFounderObservation(obs) {
  const grid = document.getElementById('founderObservationGrid');
  const tbody = document.querySelector('#founderObservationCategoryTable tbody');
  if (!grid) return;
  const metrics = [
    ['Witness retrievals', obs.witnessRetrievalCount ?? 0],
    ['Historical context shown', obs.historicalContextUsedCount ?? 0],
    ['Original-language shown', obs.originalLanguageUsedCount ?? 0],
    ['Prayer requests', obs.prayerUsageCount ?? 0],
    ['Lesson alignment runs', obs.lessonAlignmentUsageCount ?? 0],
    ['Conversation continuations', obs.continuationUsageCount ?? 0],
  ];
  grid.innerHTML = metrics
    .map(([label, val]) => `<div><div class="metric">${val}</div><div class="metric-label">${label}</div></div>`)
    .join('');

  const categories = Object.entries(obs.questionCategoryCounts || {}).sort((a, b) => b[1] - a[1]);
  if (!tbody) return;
  tbody.innerHTML = categories.length
    ? categories.map(([cat, count]) => `<tr><td>${cat}</td><td>${count}</td></tr>`).join('')
    : '<tr><td colspan="2">No categorized activity recorded yet this run.</td></tr>';
}

function renderFounderBuild(consoleData) {
  const b = consoleData.build || {};
  const el = document.getElementById('founderBuild');
  if (!el) return;
  el.innerHTML = `
    <strong>Commit:</strong> ${b.commit ? b.commit.slice(0, 12) : 'unknown'}
    &nbsp;·&nbsp; <strong>Branch:</strong> ${b.branch || 'unknown'}
    &nbsp;·&nbsp; <strong>Working tree:</strong> ${b.workingTreeDirty ? 'dirty (uncommitted changes present)' : 'clean'}
    &nbsp;·&nbsp; <strong>App version:</strong> ${b.appVersion || 'unknown'}
  `;
}

const READINESS_COLOR = {
  READY_FOR_FOUNDER_ALPHA: '#16a34a',
  READY_WITH_DOCUMENTED_WARNINGS: '#d97706',
  BLOCKED: '#dc2626',
};

function renderFounderValidator(validatorData) {
  const summaryEl = document.getElementById('founderValidatorSummary');
  const detailEl = document.getElementById('founderValidatorDetail');
  if (!validatorData || validatorData.ok === false) {
    summaryEl.innerHTML = `<em>${(validatorData && validatorData.reason) || 'No report available yet.'}</em> Run <code>npm run founder-alpha:validate</code> to generate one.`;
    detailEl.innerHTML = '';
    return;
  }
  const report = validatorData.report || {};
  const counts = report.testCounts || {};
  const color = READINESS_COLOR[report.status] || '#6b7280';
  summaryEl.innerHTML = `
    <span class="tier-badge" style="background:${color};color:#fff;font-size:13px;padding:4px 10px;">${report.status || 'UNKNOWN'}</span>
    &nbsp; pass=${counts.pass ?? '?'} warn=${counts.warn ?? '?'} fail=${counts.fail ?? '?'} skip=${counts.skip ?? '?'}
    &nbsp; <small>(run ${validatorData.runId || ''}, commit ${(report.exactCommit || '').slice(0, 12)}, ${report.durationMs ? Math.round(report.durationMs / 1000) + 's' : ''})</small>
  `;

  const criticalFailures = report.criticalFailures || [];
  const warnings = report.warnings || [];
  let html = '';
  if (criticalFailures.length) {
    html += '<h3 style="color:#dc2626;">Critical failures</h3><ul>' +
      criticalFailures.map((f) => `<li><strong>${f.category} / ${f.check}</strong>: ${f.detail || ''}</li>`).join('') +
      '</ul>';
  }
  if (warnings.length) {
    html += '<h3 style="color:#d97706;">Documented warnings</h3><ul>' +
      warnings.map((w) => `<li><strong>${w.category} / ${w.check}</strong>: ${w.detail || ''}</li>`).join('') +
      '</ul>';
  }
  if (!criticalFailures.length && !warnings.length) {
    html += '<p>No failures or warnings in the latest run.</p>';
  }
  detailEl.innerHTML = html;
}

function renderFounderCoverage(overview) {
  const grid = document.getElementById('founderCoverageGrid');
  if (!grid) return;
  const books = overview.books || {};
  const doctrine = overview.doctrineTopics || {};
  const historical = overview.historical || {};
  const queue = overview.queue || {};
  const pipeline = overview.pipeline || {};
  const drift = overview.recentDrift || {};
  const originalLanguage = overview.originalLanguage || {};

  const metrics = [
    ['Books tracked', books.total ?? 'n/a'],
    ['Avg. book coverage score', books.averageCoverageScore ?? 'n/a'],
    ['Doctrine topics', doctrine.total ?? 'n/a'],
    ['Avg. doctrine coverage score', doctrine.averageCoverageScore ?? 'n/a'],
    ['Original-language books w/ dataset', originalLanguage.booksWithDataset ?? 'n/a'],
    ['Historical records (approved)', `${historical.approved ?? 0} / ${historical.totalRecords ?? 0}`],
    ['IOG/ICOJ auto-approved', pipeline.finalCounts ? pipeline.finalCounts.autoApproved : 'n/a'],
    ['IOG/ICOJ needing Admin review', pipeline.finalCounts ? pipeline.finalCounts.needsAdminReview : 'n/a'],
    ['IOG/ICOJ unclassified (no topic)', pipeline.finalCounts ? pipeline.finalCounts.unclassifiedNoTopic : 'n/a'],
    ['Admin queue pending', queue.totalPending ?? 'n/a'],
    ['Knowledge drift risk', drift.riskLevel ?? 'n/a'],
  ];
  grid.innerHTML = metrics
    .map(([label, val]) => `<div><div class="metric">${val}</div><div class="metric-label">${label}</div></div>`)
    .join('');

  const noteEl = document.getElementById('founderPipelineNote');
  if (noteEl) noteEl.textContent = (pipeline && pipeline.bottleneck) || '';
}

function renderFounderFeatureTable(features) {
  const tbody = document.querySelector('#founderFeatureTable tbody');
  if (!tbody) return;
  tbody.innerHTML = features
    .map((f) => `<tr><td>${f.feature}</td><td><span class="tier-badge">${f.status}</span></td></tr>`)
    .join('');
}

// FOUNDER_ALPHA_OPERATIONAL_INTELLIGENCE — Founder Intelligence Layer tab.
// Pure read/render + one decision-recording POST. No knowledge-publishing
// call exists anywhere in this section.
let intelRecommendationFilter = 'PENDING';

async function loadFounderIntelligence() {
  try {
    document.getElementById('intelSummaryNarrative').textContent = 'Loading…';
    const reportRes = await adminFetch('/admin/api/bible-authority/founder-intelligence');
    const report = await reportRes.json();
    if (!report.ok) throw new Error(report.error || 'Failed to load report');
    renderIntelSummary(report.dailyOperationalSummary);
    renderIntelTrends(report.founderTrends);
    renderIntelRecurring(report.recurringQuestions);
    await loadIntelRecommendations();
    await loadIntelEffectiveness();
  } catch (error) {
    document.getElementById('intelSummaryNarrative').textContent = 'Could not load Founder Intelligence: ' + error.message;
  }
}

function renderIntelSummary(summary) {
  const narrativeEl = document.getElementById('intelSummaryNarrative');
  const gridEl = document.getElementById('intelSummaryGrid');
  if (!summary) return;
  narrativeEl.innerHTML = '<ul>' + (summary.narrative || []).map((n) => `<li>${n}</li>`).join('') + '</ul>';
  const metrics = [
    ['Total recommendations (this run)', summary.totalRecommendations ?? 0],
    ...Object.entries(summary.recommendationsByType || {}).map(([t, c]) => [t.replace(/_/g, ' '), c]),
  ];
  gridEl.innerHTML = metrics.map(([label, val]) => `<div><div class="metric">${val}</div><div class="metric-label">${label}</div></div>`).join('');
}

function renderIntelTrends(trends) {
  const el = document.getElementById('intelTrends');
  const transEl = document.getElementById('intelTransitions');
  if (!trends) return;
  if (trends.status === 'BASELINE_ESTABLISHING') {
    el.innerHTML = `<p><em>${trends.message}</em></p>`;
  } else {
    el.innerHTML = '<ul>' + (trends.trends || []).map((t) => `<li>${t.narrative} <small>(confidence: ${t.confidence})</small></li>`).join('') + '</ul>';
  }
  if (trends.topTopicTransitions && trends.topTopicTransitions.length) {
    transEl.innerHTML = '<ul>' + trends.topTopicTransitions.map((t) => `<li>${t.narrative}</li>`).join('') + '</ul>';
  } else {
    transEl.innerHTML = `<p><em>${trends.topicTransitionNote || 'No transitions recorded yet.'}</em></p>`;
  }
}

function renderIntelRecurring(recurring) {
  const tbody = document.querySelector('#intelRecurringTable tbody');
  if (!tbody || !recurring) return;
  const cats = recurring.topQuestionCategories || [];
  tbody.innerHTML = cats.length
    ? cats.map((c) => `<tr><td>${c.category}</td><td>${c.count}</td></tr>`).join('')
    : '<tr><td colspan="2">No categorized activity recorded yet.</td></tr>';
}

const INTEL_PRIORITY_COLOR = { HIGH: '#dc2626', MEDIUM: '#d97706', LOW: '#6b7280' };

async function loadIntelRecommendations() {
  const status = intelRecommendationFilter === 'ALL' ? '' : `?status=${intelRecommendationFilter}`;
  const res = await adminFetch(`/admin/api/bible-authority/founder-intelligence/recommendations${status}`);
  const data = await res.json();
  if (data && data.ok === false) return;
  renderIntelRecommendations(data.recommendations || []);
}

function renderIntelRecommendations(recs) {
  const container = document.getElementById('intelRecommendations');
  if (!recs.length) {
    container.innerHTML = '<p>No recommendations in this view.</p>';
    return;
  }
  container.innerHTML = recs
    .map((entry) => {
      const r = entry.latest || {};
      const color = INTEL_PRIORITY_COLOR[r.priority] || '#6b7280';
      const showActions = entry.status === 'PENDING';
      return `
        <div class="card" style="margin-bottom:10px;border-left:4px solid ${color};">
          <strong>${r.title || 'Untitled recommendation'}</strong>
          &nbsp;<span class="tier-badge">${r.type || ''}</span>
          &nbsp;<span class="tier-badge" style="background:${color};color:#fff;">${r.priority || ''}</span>
          &nbsp;<span class="tier-badge">confidence: ${r.confidence || ''}</span>
          &nbsp;<span class="tier-badge">status: ${entry.status}</span>
          <p style="margin:8px 0;">${r.reasoning || ''}</p>
          <div class="candidate-detail">
            <strong>Supporting evidence:</strong>
            <ul>${(r.supportingEvidence || []).map((e) => `<li>${e}</li>`).join('')}</ul>
            <strong>Source sessions:</strong> ${r.sourceSessions ?? 'n/a'} &nbsp;·&nbsp;
            <strong>Existing production coverage:</strong> ${r.existingProductionCoverage || 'n/a'}<br/>
            <strong>Suggested action:</strong> ${r.suggestedAction || 'n/a'}<br/>
            <small>Seen ${entry.timesSeen}x, first ${new Date(entry.firstSeenAt).toLocaleString()}, last ${new Date(entry.lastSeenAt).toLocaleString()}</small>
            ${entry.decidedBy ? `<br/><small>Decided by ${entry.decidedBy} at ${new Date(entry.decidedAt).toLocaleString()}${entry.note ? ' — ' + entry.note : ''}</small>` : ''}
          </div>
          ${showActions ? `
            <div style="margin-top:10px;">
              <button type="button" class="intel-decision" data-id="${entry.id}" data-decision="APPROVED">Approve</button>
              <button type="button" class="intel-decision" data-id="${entry.id}" data-decision="REJECTED">Reject</button>
              <button type="button" class="intel-decision" data-id="${entry.id}" data-decision="REJECTED" data-fp="1">Reject (false positive)</button>
            </div>` : ''}
        </div>`;
    })
    .join('');

  document.querySelectorAll('.intel-decision').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const decision = btn.getAttribute('data-decision');
      const flaggedFalsePositive = btn.getAttribute('data-fp') === '1';
      const note = window.prompt('Optional note for this decision:', '') || '';
      await adminFetch(`/admin/api/bible-authority/founder-intelligence/recommendations/${encodeURIComponent(id)}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, decidedBy: 'admin', note, flaggedFalsePositive }),
      });
      await loadIntelRecommendations();
      await loadIntelEffectiveness();
    });
  });
}

async function loadIntelEffectiveness() {
  const res = await adminFetch('/admin/api/bible-authority/founder-intelligence/effectiveness');
  const data = await res.json();
  if (data && data.ok === false) return;
  const eff = data.effectiveness || {};
  const grid = document.getElementById('intelEffectiveness');
  if (!grid) return;
  const metrics = [
    ['Total tracked', eff.totalRecommendationsTracked ?? 0],
    ['Pending', eff.byStatus ? eff.byStatus.PENDING : 0],
    ['Approved', eff.byStatus ? eff.byStatus.APPROVED : 0],
    ['Rejected', eff.byStatus ? eff.byStatus.REJECTED : 0],
    ['Approval rate', eff.approvalRate != null ? eff.approvalRate + '%' : 'n/a'],
    ['False positives flagged', eff.falsePositivesFlagged ?? 0],
    ['Duplicates collapsed', eff.duplicatesCollapsed ?? 0],
    ['Recommendations auto-applied', eff.governanceEffectiveness ? eff.governanceEffectiveness.recommendationsAutoApplied : 0],
  ];
  grid.innerHTML = metrics.map(([label, val]) => `<div><div class="metric">${val}</div><div class="metric-label">${label}</div></div>`).join('');
}

['pending', 'approved', 'rejected', 'all'].forEach((key) => {
  const btn = document.getElementById(`intel-filter-${key}`);
  if (!btn) return;
  btn.addEventListener('click', () => {
    document.querySelectorAll('#intelligence .sub-nav button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    intelRecommendationFilter = key.toUpperCase();
    loadIntelRecommendations();
  });
});

document.getElementById('tab-executive').addEventListener('click', () => showSection('executive'));
document.getElementById('tab-scripture').addEventListener('click', () => showSection('scripture-review'));
document.getElementById('tab-engineering').addEventListener('click', () => showSection('engineering'));
document.getElementById('tab-founder').addEventListener('click', () => {
  showSection('founder');
  loadFounderReadiness();
});
document.getElementById('tab-intelligence').addEventListener('click', () => { showSection('intelligence'); loadFounderIntelligence(); });
document.getElementById('refreshBtn').addEventListener('click', load);

document.getElementById('sub-candidates').addEventListener('click', () => showSubView('candidates'));
document.getElementById('sub-groups').addEventListener('click', () => showSubView('groups'));
document.getElementById('sub-coverage').addEventListener('click', () => showSubView('coverage'));
document.getElementById('sub-readiness').addEventListener('click', () => showSubView('readiness'));
document.getElementById('sub-packs').addEventListener('click', () => showSubView('packs'));
document.getElementById('sub-pending').addEventListener('click', () => showSubView('pending'));

document.querySelectorAll('.link-drill').forEach((el) => {
  el.addEventListener('click', () => {
    const dynamic = el.getAttribute('data-goto-dynamic');
    if (dynamic) {
      ccGoto(dynamic);
      return;
    }
    const target = el.getAttribute('data-goto');
    if (!target) return;
    showSection(target === 'scripture' ? 'scripture-review' : target);
  });
});

if (location.hash === '#scripture-review') showSection('scripture-review');
if (location.hash === '#engineering') showSection('engineering');
if (location.hash === '#executive') showSection('executive');

const adminTokenInput = document.getElementById('adminTokenInput');
if (adminTokenInput) {
  adminTokenInput.value = getAdminToken();
  document.getElementById('adminTokenSaveBtn').addEventListener('click', () => {
    setAdminToken(adminTokenInput.value.trim());
    setAdminTokenBannerLocked(false);
    load();
    loadFounderIntelligence();
    if (typeof loadCommandCenter === 'function') loadCommandCenter();
  });
  document.getElementById('adminTokenClearBtn').addEventListener('click', () => {
    setAdminToken('');
    adminTokenInput.value = '';
    setAdminTokenBannerLocked(true);
  });
}

load();

/* ============================================================
 * UNIFIED_ADMIN_COMMAND_CENTER — additive UI logic only.
 *
 * Every function below calls one of the new read-only (or
 * decision-recording) /admin/api/bible-authority/unified/* endpoints,
 * which themselves only ever call existing, already-tested services
 * (see services/adminCommandCenterAggregator.js and friends). Nothing
 * here recomputes analytics client-side or bypasses adminFetch's auth
 * handling. If ADMIN_UNIFIED_COMMAND_CENTER_ENABLED=0 on the server,
 * every call below receives a 503 and this tab shows an explanatory
 * empty state — every OTHER tab on this page is completely unaffected.
 * ============================================================ */
const CC_BASE = '/admin/api/bible-authority/unified';

function ccStatusBadgeClass(status) {
  if (status === 'OK' || status === 'YES') return 'cc-status-ok';
  if (status === 'DEGRADED' || status === 'NO_DATA') return 'cc-status-degraded';
  return 'cc-status-unavailable';
}

function ccSeverityBadge(sev) {
  return `<span class="cc-badge cc-severity-${sev || 'Low'}">${sev || 'Low'}</span>`;
}

function ccResolveDrillDown(target) {
  const map = {
    '#operations': 'founder',
    '#decisions': 'command-center',
    '#alerts': 'command-center',
    '#notifications': 'command-center',
    '#user-assistance': 'command-center',
    '#command-center': 'command-center',
    '#executive': 'executive',
    '#intelligence': 'intelligence',
    '#scripture-review': 'scripture-review',
    '#founder': 'founder',
    '#users-sessions': 'founder',
    '#lesson-alignment': 'founder',
    '#engineering': 'engineering',
  };
  return map[target] || 'command-center';
}

/** In-page anchors for Executive drill-downs (hash targets that are not top-level section ids). */
function ccResolveScrollTarget(target) {
  const map = {
    '#decisions': 'cc-decision-queue',
    '#alerts': 'cc-alerts',
    '#operations': 'cc-operations',
    '#users-sessions': 'cc-users-sessions',
    '#lesson-alignment': 'cc-lesson-alignment',
    '#notifications': 'cc-notifications',
    '#user-assistance': 'cc-user-assistance',
  };
  return map[target] || null;
}

function ccGoto(target) {
  if (!target) return;
  const normalized = target.charAt(0) === '#' ? target : `#${target}`;
  const sectionId = ccResolveDrillDown(normalized);
  showSection(sectionId);

  if (sectionId === 'founder') {
    loadFounderReadiness();
  }
  if (sectionId === 'intelligence' && typeof loadFounderIntelligence === 'function') {
    try { loadFounderIntelligence(); } catch (_) { /* intelligence refresh best-effort */ }
  }
  if (normalized === '#decisions' || normalized === '#alerts') {
    ccResetQueueFilters();
    if (typeof loadCCQueue === 'function') loadCCQueue();
    if (normalized === '#alerts' && typeof loadCCAlerts === 'function') loadCCAlerts();
  }

  const scrollId = ccResolveScrollTarget(normalized);
  const flash = (el) => {
    if (!el) return;
    el.classList.add('cc-drill-flash');
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => el.classList.remove('cc-drill-flash'), 1600);
  };

  // Two-frame + short delay so section display:block layout completes before scroll.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        if (scrollId) flash(document.getElementById(scrollId));
        else {
          const section = document.getElementById(sectionId);
          if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 40);
    });
  });

  try {
    if (location.hash !== normalized) history.replaceState(null, '', normalized);
  } catch (_) { /* ignore */ }
}

function ccResetQueueFilters() {
  const severity = document.getElementById('ccQueueSeverity');
  const category = document.getElementById('ccQueueCategory');
  const status = document.getElementById('ccQueueStatus');
  if (severity) severity.value = '';
  if (category) category.value = '';
  if (status) status.value = '';
}

function ccQueueFiltersActive() {
  return !!(
    (document.getElementById('ccQueueSeverity') || {}).value ||
    (document.getElementById('ccQueueCategory') || {}).value ||
    (document.getElementById('ccQueueStatus') || {}).value
  );
}

async function ccGet(path) {
  const res = await adminFetch(`${CC_BASE}${path}`);
  if (res.status === 503) {
    return { ok: false, disabled: true, error: 'Unified Admin Command Center is disabled on this server (ADMIN_UNIFIED_COMMAND_CENTER_ENABLED=0). Every other tab is unaffected.' };
  }
  const parsed = await parseAdminJson(res, `unified${path}`);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  return parsed.data;
}

async function ccPost(path, body) {
  const res = await adminFetch(`${CC_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  if (res.status === 503) {
    return { ok: false, disabled: true, error: 'Unified Admin Command Center is disabled on this server.' };
  }
  const parsed = await parseAdminJson(res, `unified${path}`);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  return parsed.data;
}

function ccEmptyState(msg) {
  return `<p class="cc-empty">${msg}</p>`;
}

function renderCCOverview(data) {
  const badge = document.getElementById('ccOverallStatusBadge');
  const answersEl = document.getElementById('ccExecutiveAnswers');
  const cardsEl = document.getElementById('ccExecutiveCards');
  const freshEl = document.getElementById('ccOverviewFreshness');

  if (!data || data.ok === false) {
    badge.textContent = '';
    answersEl.innerHTML = ccEmptyState(data && data.error ? data.error : 'Executive Overview is unavailable right now.');
    cardsEl.innerHTML = '';
    freshEl.textContent = '';
    return;
  }

  const es = data.executiveSummary || {};
  badge.textContent = data.overallStatus || '';
  badge.className = `cc-status-badge ${ccStatusBadgeClass(data.overallStatus)}`;

  const answers = es.answers || {};
  answersEl.innerHTML = `
    <p><strong>Is BibleBuddy healthy?</strong> ${es.overallStatus || 'UNKNOWN'} (${es.criticalAlertCount || 0} critical / ${es.highAlertCount || 0} high alerts)</p>
    <p><strong>Are users encountering problems?</strong> ${answers.usersEncounteringProblems || 'Unavailable.'}</p>
    <p><strong>Are responses accurate &amp; Scripture-aligned?</strong> ${answers.responsesAccurateAndAligned || 'Unavailable.'}</p>
    <p><strong>What decisions need attention?</strong> ${answers.decisionsRequiringAttention || 'Unavailable.'}</p>
    <p><strong>What should I do today?</strong> ${answers.recommendedActionToday || 'Unavailable.'}</p>
  `;

  const sections = [
    ['SYSTEM HEALTH', data.systemHealth, (d) => `${d.liveStatus} · ${d.totalRequests} req · ${d.failedRequests} failed · ${d.averageLatencyMs}ms avg`],
    ['USER ACTIVITY', data.usersAndSessions, (d) => `${d.activeSessions} active session(s) · ${d.alphaActiveTesters} tester(s)`],
    ['RESPONSE QUALITY', data.experienceQuality, (d) => `${d.alphaFlaggedDoctrineIssues || 0} flagged · fallback rate ${d.fallbackRate != null ? (d.fallbackRate * 100).toFixed(1) + '%' : 'n/a'}`],
    ['SCRIPTURE & KNOWLEDGE', data.scriptureAndKnowledge, (d) => `${d.booksCoveredTotal ?? 'n/a'} book(s) tracked · ${d.pendingCandidatesTotal ?? 'n/a'} pending`],
    ['LESSON ALIGNMENT', data.lessonAlignment, (d) => `${d.pendingReviewCount} needing review of ${d.recentSubmissionCount} recent`],
    ['ADMIN DECISIONS', data.recommendations, (d) => `${d.totalOpenItems} open · ${d.totalQueueItems != null ? d.totalQueueItems : d.totalOpenItems} in queue`],
  ];

  cardsEl.innerHTML = sections.map(([label, section, summarize]) => {
    if (!section) return '';
    const statusClass = ccStatusBadgeClass(section.status);
    const body = section.status === 'OK' && section.data ? summarize(section.data) : (section.errors || []).join('; ') || 'No data yet.';
    return `<div>
      <div class="metric-label">${label} <span class="cc-status-badge ${statusClass}" style="font-size:10px;">${section.status}</span></div>
      <div style="font-size:14px; margin-top:4px;">${body}</div>
      <div class="cc-freshness">source: ${section.sourceSystem} · ${section.dataFreshness} · <span class="link-drill" data-goto-dynamic="${section.drillDownTarget}">drill down →</span></div>
    </div>`;
  }).join('');

  cardsEl.querySelectorAll('[data-goto-dynamic]').forEach((el) => {
    el.addEventListener('click', () => ccGoto(el.getAttribute('data-goto-dynamic')));
  });

  freshEl.textContent = `Generated at ${data.generatedAt}`;
}

async function loadCCOverview() {
  const data = await ccGet('/overview');
  renderCCOverview(data);
  renderCCObservability(data);
  renderCCNotifications(data);
  renderCCUserAssistance(data);
}

// ENTERPRISE_OPERATIONS_FOUNDATION Phase 1B v2 — Operational Observability.
// Renders from the observability slice already present in the /overview
// payload (services/adminCommandCenterAggregator.js :: computeObservabilitySummary).
// No additional network request — same reuse pattern as every other CC card.
function renderCCObservability(overview) {
  const gridEl = document.getElementById('ccObservabilityGrid');
  const obs = overview && overview.observability;
  if (!obs) {
    gridEl.innerHTML = ccEmptyState('Observability data unavailable.');
    return;
  }
  const tiles = [
    {
      label: 'Runtime',
      target: '#operations',
      lines: obs.runtimeMetrics ? [
        `Status: ${obs.runtimeMetrics.liveStatus}`,
        `${obs.runtimeMetrics.totalRequests} request(s) · ${obs.runtimeMetrics.failedRequests} failed`,
        `Avg latency: ${obs.runtimeMetrics.averageLatencyMs}ms`,
      ] : ['Unavailable'],
    },
    {
      label: 'Decision Queue',
      target: '#decisions',
      lines: obs.queueMetrics ? [
        `${obs.queueMetrics.totalOpenItems} open item(s)`,
        `Critical: ${obs.queueMetrics.bySeverity.Critical || 0} · High: ${obs.queueMetrics.bySeverity.High || 0}`,
      ] : ['Unavailable'],
    },
    {
      label: 'Knowledge Improvement',
      target: '#intelligence',
      lines: obs.recommendationMetrics ? [
        `${obs.recommendationMetrics.totalRecommendations} recommendation(s)`,
        `(admin approval required for all)`,
      ] : ['Unavailable'],
    },
    {
      label: 'User Assistance',
      target: '#user-assistance',
      lines: obs.userAssistanceMetrics ? [
        `${obs.userAssistanceMetrics.helpCenterArticles} article(s) published`,
        `${obs.userAssistanceMetrics.escalationsPending} pending escalation(s)`,
      ] : ['Unavailable'],
    },
    {
      label: 'Notifications',
      target: '#notifications',
      lines: obs.notificationMetrics ? [
        obs.notificationMetrics.globalPaused ? 'Globally paused' : 'Active (per-category, disabled by default)',
        `${obs.notificationMetrics.recentHistorySampleSize} recent dispatch record(s)`,
      ] : ['Unavailable'],
    },
    {
      label: 'Executive Summary',
      target: '#decisions',
      lines: obs.executiveSummary ? [
        `Overall: ${obs.executiveSummary.overallStatus}`,
        `${obs.executiveSummary.criticalAlertCount} critical alert(s)`,
      ] : ['Unavailable'],
    },
  ];
  gridEl.innerHTML = tiles.map((t) => `
    <div>
      <div class="metric-label">${t.label.toUpperCase()}</div>
      <div style="font-size:14px; margin-top:4px;">${t.lines.join('<br/>')}</div>
      <div class="cc-freshness"><span class="link-drill" data-goto-dynamic="${t.target}">drill down →</span></div>
    </div>
  `).join('');
  gridEl.querySelectorAll('[data-goto-dynamic]').forEach((el) => {
    el.addEventListener('click', () => ccGoto(el.getAttribute('data-goto-dynamic')));
  });
}

let ccQueueCategoryOptionsPopulated = false;
function ccPopulateQueueCategoryOptions(byCategory) {
  if (ccQueueCategoryOptionsPopulated) return;
  const sel = document.getElementById('ccQueueCategory');
  Object.keys(byCategory || {}).forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    sel.appendChild(opt);
  });
  ccQueueCategoryOptionsPopulated = true;
}

const CC_QUEUE_ACTIONS = ['review', 'approve', 'reject', 'defer', 'investigate', 'resolve'];

function renderCCQueue(data) {
  const countsEl = document.getElementById('ccQueueCounts');
  const tableEl = document.getElementById('ccQueueTable');
  if (!data || data.ok === false) {
    countsEl.textContent = '';
    tableEl.innerHTML = ccEmptyState(data && data.error ? data.error : 'Decision Queue unavailable.');
    return;
  }
  ccPopulateQueueCategoryOptions(data.counts.byCategory);
  const filterNote = ccQueueFiltersActive() ? ' (filters active)' : '';
  countsEl.textContent = `${data.total} matching item(s) · showing ${data.items.length}${filterNote}`;

  if (!data.items.length) {
    if (ccQueueFiltersActive()) {
      tableEl.innerHTML = `${ccEmptyState('No items match the current filters.')}<p class="cc-freshness"><button type="button" id="ccQueueClearInlineBtn">Clear Filters</button> — most items are Medium/Low severity; Critical/High often match none.</p>`;
      const clearBtn = document.getElementById('ccQueueClearInlineBtn');
      if (clearBtn) clearBtn.addEventListener('click', () => { ccResetQueueFilters(); loadCCQueue(); });
    } else {
      tableEl.innerHTML = ccEmptyState('No decision-queue items available.');
    }
    return;
  }

  let html = '<table><thead><tr><th>Id</th><th>Severity</th><th>Title</th><th>Category</th><th>Status</th><th>Confidence</th><th>Updated</th><th>Actions</th></tr></thead><tbody>';
  for (const item of data.items) {
    const actions = CC_QUEUE_ACTIONS.slice();
    if (item.sourceSystem === 'founder-intelligence') actions.push('false_positive');
    html += `<tr>
      <td class="cc-freshness" title="${item.id}">${item.id}</td>
      <td>${ccSeverityBadge(item.severity)}</td>
      <td><strong>${item.title}</strong><div class="candidate-detail">${item.summary || ''}</div></td>
      <td>${item.category}</td>
      <td>${item.status}</td>
      <td>${item.confidence || 'n/a'}</td>
      <td class="cc-freshness">${item.lastUpdatedAt || ''}</td>
      <td class="cc-actions">${actions.map((a) => `<button type="button" data-queue-action="${a}" data-queue-id="${item.id}">${a === 'false_positive' ? 'false positive' : a}</button>`).join('')}
        <span class="link-drill" data-goto-dynamic="${item.drillDownTarget}">view →</span>
      </td>
    </tr>`;
  }
  html += '</tbody></table>';
  tableEl.innerHTML = html;

  tableEl.querySelectorAll('[data-queue-action]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-queue-id');
      let action = btn.getAttribute('data-queue-action');
      let note = '';
      let flaggedFalsePositive = false;
      if (action === 'false_positive') {
        action = 'reject';
        flaggedFalsePositive = true;
        note = window.prompt('Optional note for false positive:', '') || 'Flagged false positive';
      } else if (action === 'reject' || action === 'defer') {
        note = window.prompt(`Optional note for "${action}":`, '') || '';
      }
      btn.disabled = true;
      const result = await ccPost(`/decision-queue/${id}/${action}`, { note, decidedBy: 'admin', flaggedFalsePositive });
      btn.disabled = false;
      if (!result.ok) {
        alert(result.error || 'Action failed.');
        return;
      }
      loadCCQueue();
      loadCCAudit();
      loadCCOverview();
    });
  });
  tableEl.querySelectorAll('[data-goto-dynamic]').forEach((el) => {
    el.addEventListener('click', () => ccGoto(el.getAttribute('data-goto-dynamic')));
  });
}

async function loadCCQueue() {
  const severity = document.getElementById('ccQueueSeverity').value;
  const category = document.getElementById('ccQueueCategory').value;
  const status = document.getElementById('ccQueueStatus').value;
  const params = new URLSearchParams();
  if (severity) params.set('severity', severity);
  if (category) params.set('category', category);
  if (status) params.set('status', status);
  params.set('limit', '25');
  const data = await ccGet(`/decision-queue?${params.toString()}`);
  renderCCQueue(data);
}

function renderCCAlerts(data) {
  const el = document.getElementById('ccAlerts');
  if (!data || data.ok === false) {
    el.innerHTML = ccEmptyState(data && data.error ? data.error : 'Alerts unavailable.');
    return;
  }
  if (!data.alerts.length) {
    el.innerHTML = ccEmptyState('No active alerts.');
    return;
  }
  el.innerHTML = data.alerts.map((a) => `
    <div class="card" style="margin-bottom:8px; background:#fafafa;">
      ${ccSeverityBadge(a.severity)} <strong>${a.category}</strong> — ${a.summary}
      <div class="cc-freshness">occurrences: ${a.occurrenceCount} · first: ${a.firstDetected} · last: ${a.lastDetected}</div>
      <div class="candidate-detail">Suggested action: ${a.suggestedAction}</div>
    </div>
  `).join('');
}

async function loadCCAlerts() {
  const data = await ccGet('/alerts');
  renderCCAlerts(data);
}

function renderCCAudit(data) {
  const el = document.getElementById('ccAudit');
  if (!data || data.ok === false) {
    el.innerHTML = ccEmptyState(data && data.error ? data.error : 'Audit history unavailable.');
    return;
  }
  if (!data.entries.length) {
    el.innerHTML = ccEmptyState('No audit entries recorded yet.');
    return;
  }
  let html = '<table><thead><tr><th>When</th><th>Action</th><th>Target</th><th>Source</th><th>Status</th><th>Note</th></tr></thead><tbody>';
  for (const e of data.entries.slice(0, 25)) {
    html += `<tr><td class="cc-freshness">${e.at}</td><td>${e.action}</td><td>${e.target || ''}</td><td>${e.sourceSystem}</td><td>${e.status}</td><td>${e.approvalReasonOrNote || ''}</td></tr>`;
  }
  html += '</tbody></table>';
  el.innerHTML = html;
}

async function loadCCAudit() {
  const data = await ccGet('/audit?limit=25');
  renderCCAudit(data);
}

function renderCCBriefing(kind, data) {
  const el = document.getElementById('ccBriefing');
  if (!data || data.ok === false) {
    el.innerHTML = ccEmptyState(data && data.error ? data.error : 'Briefing unavailable.');
    return;
  }
  const b = data.briefing;
  if (kind === 'daily') {
    el.innerHTML = `
      <p><strong>Recommended actions today:</strong> ${(b.recommendedActionsToday || []).join(' ')}</p>
      <p><strong>System health:</strong> ${b.systemHealth.liveStatus} · ${b.systemHealth.totalRequests} requests · ${b.systemHealth.errors} errors</p>
      <p><strong>Active sessions:</strong> ${b.activeUsersAndSessions.activeSessions} · <strong>Founder testers:</strong> ${b.activeUsersAndSessions.alphaActiveTesters}</p>
      <p><strong>Pending decisions:</strong> ${b.pendingDecisions}</p>
      <p><strong>Window vs. yesterday:</strong> ${b.windowDeltaSinceYesterday.status === 'COMPUTED' ? `${b.windowDeltaSinceYesterday.requestsDelta} req / ${b.windowDeltaSinceYesterday.errorsDelta} err` : 'BASELINE_ESTABLISHING'}</p>
    `;
  } else {
    el.innerHTML = `
      <p><strong>Week-over-week:</strong> ${b.weekOverWeekActivity.status === 'COMPUTED' ? `${b.weekOverWeekActivity.requestsDelta} req / ${b.weekOverWeekActivity.errorsDelta} err` : 'BASELINE_ESTABLISHING'}</p>
      <p><strong>Recommendation approval rate:</strong> ${b.recommendationAcceptance.approvalRate != null ? b.recommendationAcceptance.approvalRate + '%' : (b.recommendationAcceptance.approvalRateNote || 'n/a')}</p>
      <p><strong>Governance activity:</strong> ${b.governanceActivity.decisionsThisWeek} decision(s) this week (of ${b.governanceActivity.totalDecisionsAllTime} all-time)</p>
      <p><strong>Priorities for next week:</strong> ${(b.prioritiesForNextWeek || []).join(' ')}</p>
    `;
  }
}

async function loadCCBriefing(kind) {
  const data = await ccGet(`/briefing/${kind}`);
  renderCCBriefing(kind, data);
}

function renderCCSearchResults(data) {
  const el = document.getElementById('ccSearchResults');
  if (!data || data.ok === false) {
    el.innerHTML = ccEmptyState(data && data.error ? data.error : 'Search unavailable.');
    return;
  }
  if (data.reason) {
    el.innerHTML = ccEmptyState(data.reason);
    return;
  }
  if (!data.results.length) {
    el.innerHTML = ccEmptyState('No matches found.');
    return;
  }
  el.innerHTML = `<p class="cc-freshness">${data.total} result(s)</p>` + data.results.map((r) => `
    <div class="candidate-detail" style="margin-bottom:6px;">
      <span class="cc-badge" style="background:#e5e7eb;">${r.sourceSystem}</span> <strong>${r.title}</strong> — ${r.snippet}
      <span class="link-drill" data-goto-dynamic="${r.drillDownTarget}">→</span>
    </div>
  `).join('');
  el.querySelectorAll('[data-goto-dynamic]').forEach((link) => {
    link.addEventListener('click', () => ccGoto(link.getAttribute('data-goto-dynamic')));
  });
}

async function runCCSearch() {
  const q = document.getElementById('ccSearchInput').value.trim();
  if (!q) {
    document.getElementById('ccSearchResults').innerHTML = '';
    return;
  }
  const data = await ccGet(`/search?q=${encodeURIComponent(q)}&limit=15`);
  renderCCSearchResults(data);
}

const CC_ASSISTANT_EXAMPLE_QUESTIONS = [
  'What needs my attention today?',
  'Summarize the last 24 hours.',
  'Summarize this week for me.',
  'Show only critical issues.',
  'What knowledge gaps appear genuine?',
  'Which recommendations are safest to approve?',
  'Any documentation gaps to review?',
  'What is the user assistance status?',
];

function renderCCAssistantAnswer(answer) {
  const el = document.getElementById('ccAssistantAnswer');
  if (!answer || answer.ok === false) {
    el.innerHTML = ccEmptyState(answer && answer.error ? answer.error : 'The AI Chief of Staff is unavailable right now — try the Executive Overview or Decision Queue directly.');
    return;
  }
  el.innerHTML = `
    <div class="cc-answer-box">
      <p><strong>Summary:</strong> ${answer.narrative || answer.summary}</p>
      ${(answer.evidence || []).length ? `<p><strong>Evidence:</strong> ${answer.evidence.join(' · ')}</p>` : ''}
      ${answer.impact ? `<p><strong>Impact:</strong> ${answer.impact}</p>` : ''}
      <p><strong>Confidence:</strong> ${answer.confidence} &nbsp; <strong>Approval required:</strong> ${answer.requiredApproval ? 'Yes' : 'No'}</p>
      ${answer.recommendedAction ? `<p><strong>Recommended action:</strong> ${answer.recommendedAction}</p>` : ''}
      <p class="cc-freshness">Source systems: ${(answer.sourceSystems || []).join(', ')}${answer.aiPhrasingUnavailable ? ' · AI phrasing unavailable, showing deterministic facts' : ''}</p>
      ${(answer.drillDownLinks || []).map((t) => `<span class="link-drill" data-goto-dynamic="${t}">${t.replace('#', '→ ')}</span>`).join(' ')}
    </div>
  `;
  el.querySelectorAll('[data-goto-dynamic]').forEach((link) => {
    link.addEventListener('click', () => ccGoto(link.getAttribute('data-goto-dynamic')));
  });
}

async function askCCAssistant(question) {
  const input = document.getElementById('ccAssistantInput');
  const q = question || input.value.trim();
  if (!q) return;
  input.value = q;
  document.getElementById('ccAssistantAnswer').innerHTML = ccEmptyState('Thinking…');
  const answer = await ccPost('/assistant', { question: q });
  renderCCAssistantAnswer(answer);
}

/* ============================================================
 * ENTERPRISE_OPERATIONS_FOUNDATION Phase 1B — additive UI logic only.
 * Notifications + User Assistance Platform. Same ccGet/ccPost helpers,
 * same empty-state pattern, same drill-down convention as every function
 * above. Nothing here recomputes analytics client-side.
 * ============================================================ */

function renderCCNotifications(overview) {
  const summaryEl = document.getElementById('ccNotificationsSummary');
  const section = overview && overview.notifications;
  if (!section || section.status !== 'OK' || !section.data) {
    summaryEl.innerHTML = ccEmptyState((section && section.errors && section.errors.join('; ')) || 'Notifications data unavailable.');
    return;
  }
  const d = section.data;
  const providerLine = `Email provider: ${d.providers.email ? 'configured' : 'not configured (stub — safe no-op)'} · SMS provider: ${d.providers.sms ? 'configured' : 'not configured (stub — safe no-op)'}`;
  const catRows = Object.entries(d.deliveryByCategory || {}).map(([cat, c]) => `<tr><td>${cat}</td><td>${c.attempted}</td><td>${c.delivered}</td><td>${c.queuedOnly}</td></tr>`).join('');
  summaryEl.innerHTML = `
    <p class="cc-freshness">${providerLine} · global paused: ${d.globalPaused ? 'yes' : 'no'}</p>
    <table><thead><tr><th>Category</th><th>Attempted</th><th>Delivered</th><th>Queued only (in-app)</th></tr></thead>
      <tbody>${catRows || '<tr><td colspan="4">No notification history recorded yet.</td></tr>'}</tbody></table>
  `;
  const sel = document.getElementById('ccNotifyCategory');
  if (sel && !sel.dataset.populated) {
    sel.innerHTML = (d.categories || []).map((c) => `<option value="${c}">${c.replace(/_/g, ' ')}</option>`).join('');
    sel.dataset.populated = '1';
  }
}

async function sendCCNotification() {
  const category = document.getElementById('ccNotifyCategory').value;
  const body = document.getElementById('ccNotifyBody').value.trim();
  const resultEl = document.getElementById('ccNotifySendResult');
  resultEl.textContent = 'Sending…';
  const result = await ccPost('/notifications/send', { category, body: body || null });
  if (!result.ok) {
    resultEl.textContent = result.error || 'Send failed.';
    return;
  }
  resultEl.textContent = `Attempted ${result.attempted}, delivered ${result.delivered} (queue_only counts as delivered in-app).`;
  loadCCOverview();
}

function renderCCUserAssistance(overview) {
  const summaryEl = document.getElementById('ccUserAssistanceSummary');
  const section = overview && overview.userAssistance;
  if (!section || section.status !== 'OK' || !section.data) {
    summaryEl.innerHTML = ccEmptyState((section && section.errors && section.errors.join('; ')) || 'User Assistance data unavailable.');
    return;
  }
  const { helpCenter, escalations } = section.data;
  summaryEl.innerHTML = `<p>${helpCenter.total} Help Center article(s) (${helpCenter.faqCount} FAQ) · ${escalations.pending} pending escalation(s) · ${escalations.resolved} resolved · ${escalations.dismissed} dismissed</p>`;
}

async function loadHelpCenterArticles() {
  const el = document.getElementById('ccHelpCenterArticles');
  const res = await adminFetch('/api/support/articles?limit=100');
  const data = await res.json();
  if (!data || data.ok === false || !data.articles.length) {
    el.innerHTML = ccEmptyState('No Help Center articles yet.');
    return;
  }
  el.innerHTML = data.articles.map((a) => `
    <div class="candidate-detail" style="margin-bottom:6px;">
      <strong>${a.title}</strong> <span class="cc-badge">${a.category}</span> ${(a.tags || []).map((t) => `<span class="cc-badge" style="background:#e5e7eb;">${t}</span>`).join(' ')}
      <br/>${a.body}
    </div>
  `).join('');
}

async function createHelpCenterArticle() {
  const title = document.getElementById('ccArticleTitle').value.trim();
  const category = document.getElementById('ccArticleCategory').value.trim() || 'general';
  const tags = document.getElementById('ccArticleTags').value.split(',').map((t) => t.trim()).filter(Boolean);
  const body = document.getElementById('ccArticleBody').value.trim();
  if (!title || !body) {
    alert('Title and body are required.');
    return;
  }
  const res = await adminFetch('/api/support/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, category, tags, body }),
  });
  const data = await res.json();
  if (!data.ok) {
    alert(data.error || 'Failed to publish article.');
    return;
  }
  document.getElementById('ccArticleTitle').value = '';
  document.getElementById('ccArticleCategory').value = '';
  document.getElementById('ccArticleTags').value = '';
  document.getElementById('ccArticleBody').value = '';
  loadHelpCenterArticles();
  loadCCOverview();
}

async function loadCCEscalations() {
  const el = document.getElementById('ccEscalations');
  const res = await adminFetch('/api/support/escalations');
  const data = await res.json();
  if (!data || data.ok === false || !data.escalations.length) {
    el.innerHTML = ccEmptyState('No questions awaiting a reply.');
    return;
  }
  el.innerHTML = data.escalations.map((e) => `
    <div class="candidate-detail" style="margin-bottom:8px;">
      <strong>${e.question}</strong> <span class="cc-freshness">${e.createdAt}</span>
      <br/><small>${e.reason || ''}</small>
      <p>
        <input type="text" class="cc-escalation-reply" data-id="${e.id}" placeholder="Type a reply…" style="width:60%;" />
        <button type="button" class="cc-escalation-resolve" data-id="${e.id}">Reply &amp; Resolve</button>
        <button type="button" class="cc-escalation-dismiss" data-id="${e.id}">Dismiss</button>
      </p>
    </div>
  `).join('');

  el.querySelectorAll('.cc-escalation-resolve').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const reply = el.querySelector(`.cc-escalation-reply[data-id="${id}"]`).value.trim();
      if (!reply) { alert('Enter a reply first.'); return; }
      await adminFetch(`/api/support/escalations/${encodeURIComponent(id)}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply, action: 'resolve', decidedBy: 'admin' }),
      });
      loadCCEscalations();
      loadCCOverview();
    });
  });
  el.querySelectorAll('.cc-escalation-dismiss').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      await adminFetch(`/api/support/escalations/${encodeURIComponent(id)}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss', decidedBy: 'admin' }),
      });
      loadCCEscalations();
      loadCCOverview();
    });
  });
}

const notifySendBtn = document.getElementById('ccNotifySendBtn');
if (notifySendBtn) notifySendBtn.addEventListener('click', sendCCNotification);
const articleCreateBtn = document.getElementById('ccArticleCreateBtn');
if (articleCreateBtn) articleCreateBtn.addEventListener('click', createHelpCenterArticle);

function loadCommandCenter() {
  // Browser form restore can leave Severity=Critical/High selected; those
  // filters commonly match zero while Executive Overview stays unfiltered.
  ccResetQueueFilters();
  loadCCOverview();
  loadCCQueue();
  loadCCAlerts();
  loadCCAudit();
  loadCCBriefing('daily');
  loadHelpCenterArticles();
  loadCCEscalations();
}

document.getElementById('tab-command-center').addEventListener('click', () => { showSection('command-center'); loadCommandCenter(); });
document.getElementById('ccSearchBtn').addEventListener('click', runCCSearch);
document.getElementById('ccSearchInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') runCCSearch(); });
document.getElementById('ccQueueRefreshBtn').addEventListener('click', loadCCQueue);
const ccQueueClearBtn = document.getElementById('ccQueueClearBtn');
if (ccQueueClearBtn) ccQueueClearBtn.addEventListener('click', () => { ccResetQueueFilters(); loadCCQueue(); });
['ccQueueSeverity', 'ccQueueCategory', 'ccQueueStatus'].forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('change', loadCCQueue);
});
document.getElementById('ccAssistantAskBtn').addEventListener('click', () => askCCAssistant());
document.getElementById('ccAssistantChips').innerHTML = CC_ASSISTANT_EXAMPLE_QUESTIONS.map((q) => `<span class="chip">${q}</span>`).join('');
document.querySelectorAll('#ccAssistantChips .chip').forEach((chip) => {
  chip.addEventListener('click', () => askCCAssistant(chip.textContent));
});
document.getElementById('cc-briefing-daily').addEventListener('click', (e) => {
  document.querySelectorAll('#command-center .sub-nav button').forEach((b) => b.classList.remove('active'));
  e.target.classList.add('active');
  loadCCBriefing('daily');
});
document.getElementById('cc-briefing-weekly').addEventListener('click', (e) => {
  document.querySelectorAll('#command-center .sub-nav button').forEach((b) => b.classList.remove('active'));
  e.target.classList.add('active');
  loadCCBriefing('weekly');
});

loadCommandCenter();

// Honor deep-link hashes from Executive drill-downs / bookmarks.
if (location.hash && location.hash !== '#') {
  window.setTimeout(() => ccGoto(location.hash), 120);
}
