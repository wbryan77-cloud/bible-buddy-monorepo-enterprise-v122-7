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
  const data = await res.json();
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
  try {
    const [consoleRes, coverageRes, validatorRes, healthRes, lessonSubsRes] = await Promise.all([
      adminFetch('/admin/api/bible-authority/founder-console'),
      adminFetch('/admin/api/bible-authority/knowledge-coverage-dashboard'),
      adminFetch('/admin/api/bible-authority/founder-readiness-report'),
      fetch('/api/runtime-health'),
      adminFetch('/admin/api/bible-authority/lesson-alignment/submissions'),
    ]);
    const [consoleData, coverageData, validatorData, healthData, lessonSubsData] = await Promise.all([
      consoleRes.json(),
      coverageRes.json(),
      validatorRes.json(),
      healthRes.json(),
      lessonSubsRes.json(),
    ]);
    renderFounderBuild(consoleData);
    renderFounderFeatureTable(consoleData.featureDisposition || []);
    renderFounderCoverage(coverageData.overview || {});
    renderFounderValidator(validatorData);
    renderFounderSystemHealth(healthData);
    renderFounderObservation(healthData.observation || {});
    renderLessonSubmissions(lessonSubsData.submissions || []);
  } catch (error) {
    document.getElementById('founderValidatorSummary').textContent = 'Could not load Founder Readiness data: ' + error.message;
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
document.getElementById('tab-founder').addEventListener('click', () => showSection('founder'));
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
    const target = el.getAttribute('data-goto');
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
  });
  document.getElementById('adminTokenClearBtn').addEventListener('click', () => {
    setAdminToken('');
    adminTokenInput.value = '';
    setAdminTokenBannerLocked(true);
  });
}

load();
