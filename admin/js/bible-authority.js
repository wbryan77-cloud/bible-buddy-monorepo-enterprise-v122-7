/* Phase 2K / 2N — Bible Authority Command Center UI */
const API = '/admin/api/bible-authority/command-center';

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

async function load() {
  const res = await fetch(API);
  const data = await res.json();
  renderExecutive(data.areas.executiveGrowthDashboard);
  const sr = data.areas.scriptureAuthorityReview;
  renderScriptureReview(sr);
  renderRelationshipGroups(sr.relationshipGroups);
  renderTopicCoverage(sr.topicCoverage);
  renderImplementationReadiness(sr.implementationReadiness);
  renderTopicPacks(sr.topicApprovalPacks, sr.scriptureAuthorityCoverage);
  renderEngineering(data.areas.engineeringIntelligence);
}

document.getElementById('tab-executive').addEventListener('click', () => showSection('executive'));
document.getElementById('tab-scripture').addEventListener('click', () => showSection('scripture-review'));
document.getElementById('tab-engineering').addEventListener('click', () => showSection('engineering'));
document.getElementById('refreshBtn').addEventListener('click', load);

document.getElementById('sub-candidates').addEventListener('click', () => showSubView('candidates'));
document.getElementById('sub-groups').addEventListener('click', () => showSubView('groups'));
document.getElementById('sub-coverage').addEventListener('click', () => showSubView('coverage'));
document.getElementById('sub-readiness').addEventListener('click', () => showSubView('readiness'));
document.getElementById('sub-packs').addEventListener('click', () => showSubView('packs'));

document.querySelectorAll('.link-drill').forEach((el) => {
  el.addEventListener('click', () => {
    const target = el.getAttribute('data-goto');
    showSection(target === 'scripture' ? 'scripture-review' : target);
  });
});

if (location.hash === '#scripture-review') showSection('scripture-review');
if (location.hash === '#engineering') showSection('engineering');
if (location.hash === '#executive') showSection('executive');

load();
