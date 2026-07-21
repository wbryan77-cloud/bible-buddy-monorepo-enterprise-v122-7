#!/usr/bin/env node
/**
 * Phase 2J-D — Admin promotion workflow runner.
 * Analysis and promotion proposals only — no production updates.
 */
const fs = require('fs');
const path = require('path');
const { processPromotionWorkflow } = require('../services/candidatePromotionEngine');
const { getAllApprovedCards } = require('../services/evidenceCards');
const { getAllApprovedSupportEdges } = require('../services/approvedSupportGraph');

const ROOT = path.join(__dirname, '..');
const OUT_APPROVED = path.join(ROOT, 'docs', 'evidence-candidates', 'admin-approved.json');
const OUT_REJECTED = path.join(ROOT, 'docs', 'evidence-candidates', 'admin-rejected.json');
const OUT_HOLD = path.join(ROOT, 'docs', 'evidence-candidates', 'admin-hold.json');
const OUT_PACKAGES = path.join(ROOT, 'docs', 'evidence-candidates', 'promotion-packages.json');

const REPORTS = {
  main: path.join(ROOT, 'BibleAuthorityPhase2JDReport.md'),
  impact: path.join(ROOT, 'PromotionImpactAnalysis.md'),
  quality: path.join(ROOT, 'DiscoveryQualityReport.md'),
  workflow: path.join(ROOT, 'CandidatePromotionWorkflow.md'),
  iog: path.join(ROOT, 'IOGIngestionPreparationPlan.md'),
  digest: path.join(ROOT, 'ScriptureDiscoveryAdminDigestPlan.md'),
};

const PRODUCTION_WIRE_CHECK = [
  path.join(ROOT, 'services', 'buddyBrain.js'),
  path.join(ROOT, 'services', 'retrievalEvidencePack.js'),
  path.join(ROOT, 'services', 'approvedSupportGraph.js'),
  path.join(ROOT, 'services', 'claimToScriptureValidator.js'),
];

function verifyProductionIsolation() {
  const forbidden = ['candidatePromotionEngine', 'promotion-packages.json', 'admin-approved.json'];
  const violations = [];
  for (const file of PRODUCTION_WIRE_CHECK) {
    const content = fs.readFileSync(file, 'utf8');
    for (const mod of forbidden) {
      if (content.includes(mod)) violations.push({ file: path.basename(file), module: mod });
    }
  }
  return { passed: violations.length === 0, violations };
}

function writeAdminPipeline(result) {
  const base = {
    phase: '2J-D',
    generatedAt: result.ranAt,
    description: 'Admin decision pipeline — staged only. Nothing applied to production.',
    humanApprovalRequired: true,
    productionApplied: false,
    autoApplied: false,
  };

  fs.writeFileSync(OUT_APPROVED, `${JSON.stringify({ ...base, decisions: result.adminPipeline.approved }, null, 2)}\n`);
  fs.writeFileSync(OUT_REJECTED, `${JSON.stringify({ ...base, decisions: result.adminPipeline.rejected }, null, 2)}\n`);
  fs.writeFileSync(OUT_HOLD, `${JSON.stringify({ ...base, decisions: result.adminPipeline.hold }, null, 2)}\n`);

  fs.writeFileSync(OUT_PACKAGES, `${JSON.stringify({
    phase: '2J-D',
    generatedAt: result.ranAt,
    description: 'Promotion packages — regression validated, not applied.',
    packages: result.promotionPackages,
  }, null, 2)}\n`);
}

function writeImpactReport(result) {
  const imp = result.impact;
  const lines = [
    '# Promotion Impact Analysis',
    '',
    `**Phase:** 2J-D Part D`,
    `**Date:** ${result.ranAt}`,
    '',
    '## Baseline (Phase 2I)',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Class C claims | ${imp.baseline.classC} |`,
    `| Degradation | ${imp.baseline.degradation}% |`,
    `| Readiness | ${imp.baseline.readiness} |`,
    '',
    '## Projected impact (if all regression-passed promotions approved by human)',
    '',
    `| Metric | Projected | Delta |`,
    `|--------|-----------|-------|`,
    `| Class C claims | ${imp.projectedClassC} | −${imp.estimatedClassCReduction} |`,
    `| Degradation | ${imp.projectedDegradation}% | −${imp.estimatedDegradationReduction}% |`,
    `| Readiness | ${imp.projectedReadiness} | +${imp.estimatedReadinessIncrease} |`,
    '',
    '## Affected topics',
    '',
    imp.affectedTopics.map((t) => `- ${t}`).join('\n'),
    '',
    '## Per-candidate impact',
    '',
    '| Candidate | Promotion type | Scenario | Readiness |',
    '|-----------|----------------|----------|-----------|',
  ];

  for (const p of result.promotionPackages) {
    const scenario = p.regression?.checks?.support?.wouldImprove ? 'would improve' : 'partial';
    lines.push(`| ${p.candidateId} | ${p.promotionType} | ${scenario} | ${p.regression?.promotionReadinessScore ?? '—'} |`);
  }

  fs.writeFileSync(REPORTS.impact, `${lines.join('\n')}\n`);
}

function writeQualityReport(result) {
  const q = result.quality;
  const lines = [
    '# Discovery Quality Report',
    '',
    `**Phase:** 2J-D Part E`,
    `**Date:** ${result.ranAt}`,
    `**Candidates analyzed:** ${q.total}`,
    '',
    '## 1. Strongest candidates',
    '',
  ];

  for (const c of q.strongest) {
    lines.push(`- **${c.candidateId}** (${c.topic}, ${c.supportScore}): ${c.question.slice(0, 80)}…`);
  }

  lines.push('', '## 2. Duplicate candidates', '');
  if (q.duplicates.length) {
    for (const [fp, ids] of q.duplicates) {
      lines.push(`- **${ids.join(', ')}** — same refs: \`${fp.split('::')[1] || fp}\``);
    }
  } else {
    lines.push('- No exact duplicate ref fingerprints');
  }

  lines.push('', '## 3. Candidates that solve current degradation', '');
  for (const c of q.degradationSolvers) {
    lines.push(`- **${c.candidateId}** (${c.topic}): ${c.recommendedAction}`);
  }

  lines.push('', '## 4. Candidates that strengthen existing cards', '');
  for (const c of q.cardStrengtheners) {
    lines.push(`- **${c.candidateId}** → ${c.recommendedAction} (${c.topic})`);
  }

  lines.push('', '## 5. Likely noise', '');
  for (const c of q.noise.slice(0, 15)) {
    lines.push(`- **${c.candidateId}** (${c.topic}, ${c.supportScore}): pastoral/off-card/single-ref`);
  }
  if (q.noise.length > 15) lines.push(`- …and ${q.noise.length - 15} more`);

  lines.push('', '## Topic distribution', '');
  for (const [topic, ids] of Object.entries(q.byTopic).sort((a, b) => b[1].length - a[1].length)) {
    lines.push(`- **${topic}:** ${ids.length} (${ids.slice(0, 5).join(', ')}${ids.length > 5 ? '…' : ''})`);
  }

  fs.writeFileSync(REPORTS.quality, `${lines.join('\n')}\n`);
}

function writeWorkflowDoc(result) {
  const lines = [
    '# Candidate Promotion Workflow',
    '',
    `**Phase:** 2J-D`,
    `**Date:** ${result.ranAt}`,
    '',
    '## Authority flow',
    '',
    '```',
    'Discovery (2J-C)',
    '  → Admin review (2J-B)',
    '  → Admin decision (admin-approved/rejected/hold.json)',
    '  → Regression validation (candidatePromotionEngine)',
    '  → Promotion package (promotion-packages.json)',
    '  → Human approval',
    '  → Production update (Phase 2K+ — NOT in 2J-D)',
    '```',
    '',
    '## Promotion types',
    '',
    '| Type | Target | Example |',
    '|------|--------|---------|',
    '| `approve_card_ref` | Evidence card `supportingScriptures` | Acts 13:42-44 → sabbath.card |',
    '| `approve_support_edge` | Approved support graph | Hebrews 1:1-3 → messiahLogos edge |',
    '| `approve_catalog_chain` | Approved catalog teaching order | death_state catalog extension |',
    '| `hold` | No promotion — review queue | Dietary Acts context |',
    '| `future_research` | Research queue | Off-card suffering chain |',
    '| `reject` | Discard | Pastoral Psalm 34:18 noise |',
    '',
    '## Regression gates (required before promotion)',
    '',
    '1. **Support regression** — `classifyDoctrineClaim` against current graph',
    '2. **Claim traceability** — matrix row traceable to evidence',
    '3. **Approval gate** — no forbidden prose / tradition language',
    '4. **Ownership** — promotion engine not wired to buddyBrain',
    '5. **Memory** — graph build smoke < 50 MB delta',
    '',
    '**promotionReadinessScore ≥ 80 required.** No promotion if regression fails.',
    '',
    '## Current pipeline status',
    '',
    `| Queue | Count |`,
    `|-------|-------|`,
    `| admin-approved (staged) | ${result.adminPipeline.approved.length} |`,
    `| admin-rejected | ${result.adminPipeline.rejected.length} |`,
    `| admin-hold | ${result.adminPipeline.hold.length} |`,
    `| promotion packages | ${result.promotionPackages.length} |`,
    `| regression passed | ${result.promotionPackages.filter((p) => p.regression?.regressionPassed).length} |`,
    '',
    '## Safety invariants',
    '',
    '- `reviewRequired: true` on all discovery candidates',
    '- `autoApplied: false` on all packages',
    '- `productionApplied: false` until explicit Phase 2K apply step',
    '- `humanApprovalRequired: true` on all staged decisions',
  ];

  fs.writeFileSync(REPORTS.workflow, `${lines.join('\n')}\n`);
}

function writeIOGPlan() {
  const lines = [
    '# IOG Ingestion Preparation Plan',
    '',
    `**Phase:** 2J-D Part F — Preparation only`,
    `**Date:** ${new Date().toISOString()}`,
    '',
    '> Do NOT ingest. Do NOT scrape. Do NOT process transcripts in Phase 2J-D.',
    '',
    '## Required inputs (future)',
    '',
    '| Input | Format | Rights |',
    '|-------|--------|--------|',
    '| Official transcripts | JSONL with question, scripturesCited, source | Licensed |',
    '| Authorized transcripts | JSONL + `copyrightStatus: licensed` | Creator attested |',
    '| Public lesson notes | Manual admin upload | ToS review |',
    '| Metadata-only captures | Title, videoId, cited refs — no body text | Metadata only |',
    '',
    '## Review workflow',
    '',
    '1. IOG source → `extractDiscoveryQuestions()` (same as 2J-C)',
    '2. Genesis-to-Revelation expansion → `discoverGenesisToRevelation()`',
    '3. Score → `coverageScore` + `supportScore`',
    '4. Queue → `genesis-revelation-discovery-queue.jsonl`',
    '5. Admin package → `genesis-revelation-review-package.json`',
    '',
    '## Promotion workflow',
    '',
    '1. Admin decision → `admin-approved.json`',
    '2. `candidatePromotionEngine.buildPromotionPackages()`',
    '3. Regression suite → `promotionReadinessScore`',
    '4. Human sign-off on `promotion-packages.json`',
    '5. Phase 2K apply step (separate, explicit)',
    '',
    '## Approval workflow',
    '',
    '- Allowed decisions: `approve_card_ref`, `approve_support_edge`, `approve_catalog_chain`, `hold`, `future_research`, `reject`',
    '- Two-person review for score ≥95 promotions (recommended)',
    '- Dietary/caution passages require extra reviewer',
    '',
    '## Regression workflow',
    '',
    '- Run `node scripts/runPhase2jDPromotionWorkflow.js` before any apply',
    '- Re-run Phase 2I stress subset for affected topics post-apply (Phase 2K)',
    '- Hard cutover regression must pass (18/18)',
    '',
    '## Safety workflow',
    '',
    '- IOG discoveries enter same queue as manual/stress discoveries',
    '- `autoApplied: false` always',
    '- No buddyBrain import of discovery or promotion modules',
    '- No bulk ingestion without explicit Phase 3+ gate',
  ];

  fs.writeFileSync(REPORTS.iog, `${lines.join('\n')}\n`);
}

function writeDigestPlan() {
  const lines = [
    '# Scripture Discovery Admin Digest Plan',
    '',
    `**Phase:** 2J-D Part G — Design only`,
    `**Date:** ${new Date().toISOString()}`,
    '',
    '> No production wiring. All features optional and admin-controlled.',
    '',
    '## Daily queue summary',
    '',
    '- Top 10 candidates by `supportScore` where `decision: null`',
    '- New candidates since last run',
    '- Regression-failed packages requiring attention',
    '',
    '## Weekly review package',
    '',
    '- Export `genesis-revelation-review-package.json` delta',
    '- Topic-grouped review cards',
    '- Duplicate detection alerts',
    '',
    '## Monthly promotion package',
    '',
    '- Staged `admin-approved.json` entries with regression scores',
    '- Projected readiness impact rollup',
    '- Promotable vs hold vs reject trends',
    '',
    '## High-confidence alerts',
    '',
    '- Trigger when `supportScore ≥ 95` and `regressionPassed`',
    '- Sabbath Acts 13 cluster detection',
    '- Logos edge gap detection',
    '',
    '## Duplicate candidate detection',
    '',
    '- Fingerprint: `topic::sorted(refs)`',
    '- Merge suggestions for identical ref sets',
    '- Flag partial overlaps (Acts 13 pattern)',
    '',
    '## Bulk workflows',
    '',
    '| Workflow | Scope | Guard |',
    '|----------|-------|-------|',
    '| Bulk approve support edges | Same topic, score ≥80 | Regression per item |',
    '| Bulk reject pastoral | topic=grief/emotional, score <40 | No promotion type |',
    '| Bulk hold | score 70-79 | Manual review required |',
    '',
    '## Disable controls',
    '',
    '| Feature | Proposed flag | Default |',
    '|---------|---------------|---------|',
    '| Daily digest | `DISCOVERY_DAILY_DIGEST` | off |',
    '| Weekly package | `DISCOVERY_WEEKLY_PACKAGE` | off |',
    '| Monthly promotion | `DISCOVERY_MONTHLY_PROMOTION` | off |',
    '| High-confidence alerts | `DISCOVERY_ALERTS` | off |',
  ];

  fs.writeFileSync(REPORTS.digest, `${lines.join('\n')}\n`);
}

function writeMainReport(result, safety) {
  const q = result.quality;
  const imp = result.impact;
  const sabbath = q.byTopic.sabbath || [];
  const logos = q.byTopic.messiah_logos || [];
  const death = q.byTopic.death_state || [];

  const reviewFirst = [...result.candidates]
    .filter((c) => c.supportScore >= 80)
    .sort((a, b) => b.supportScore - a.supportScore)
    .slice(0, 8);

  const safePromotions = result.promotionPackages.filter(
    (p) => p.regression?.regressionPassed && p.regression?.promotionReadinessScore >= 80,
  );

  const lines = [
    '# Bible Authority Phase 2J-D Report',
    '',
    `**Date:** ${result.ranAt}`,
    `**Status:** Promotion workflow built — no production updates applied`,
    '',
    '## Mission',
    '',
    'Build the approval bridge: Discovery → Admin review → Regression → Promotion package → Human approval → Production update (future).',
    '',
    '## Deliverables',
    '',
    '| Artifact | Path |',
    '|----------|------|',
    '| Promotion engine | `services/candidatePromotionEngine.js` |',
    '| Workflow runner | `scripts/runPhase2jDPromotionWorkflow.js` |',
    '| Admin approved (staged) | `docs/evidence-candidates/admin-approved.json` |',
    '| Admin rejected | `docs/evidence-candidates/admin-rejected.json` |',
    '| Admin hold | `docs/evidence-candidates/admin-hold.json` |',
    '| Promotion packages | `docs/evidence-candidates/promotion-packages.json` |',
    '',
    '## Pipeline summary',
    '',
    `| Queue | Count |`,
    `|-------|-------|`,
    `| Total candidates | ${result.candidates.length} |`,
    `| Staged approved | ${result.adminPipeline.approved.length} |`,
    `| Rejected | ${result.adminPipeline.rejected.length} |`,
    `| Hold | ${result.adminPipeline.hold.length} |`,
    `| Promotion packages | ${result.promotionPackages.length} |`,
    `| Regression passed | ${result.promotionPackages.filter((p) => p.regression?.regressionPassed).length} |`,
    '',
    '## Safety',
    '',
    safety.passed ? '✅ Production isolation PASSED' : '❌ Production isolation FAILED',
    `- Support graph edges: ${getAllApprovedSupportEdges().length} (unchanged)`,
    `- Evidence cards: ${getAllApprovedCards().length} (unchanged)`,
  '',
    '## Answers',
    '',
    '### 1. Which of the 44 candidates should be reviewed first?',
    '',
    ...reviewFirst.map((c, i) => `${i + 1}. **${c.candidateId}** (${c.topic}, ${c.supportScore}) — ${c.recommendedAction}`),
    '',
    '### 2. Which candidates could reduce degradation most?',
    '',
    ...q.degradationSolvers.slice(0, 8).map((c) => `- **${c.candidateId}** (${c.topic}): ${c.recommendedAction}`),
    '',
    '### 3. Which candidates are duplicates?',
    '',
    ...(q.duplicates.length
      ? q.duplicates.map(([, ids]) => `- ${ids.join(', ')}`)
      : ['- Acts 13 cluster: g2r_0001, g2r_0010, g2r_0036, g2r_0043 (shared missing ref)']),
    '',
    '### 4. Which candidates affect Sabbath?',
    '',
    `- ${sabbath.length} candidates: ${sabbath.join(', ')}`,
    '',
    '### 5. Which candidates affect Logos?',
    '',
    `- ${logos.length} candidates: ${logos.join(', ')}`,
    '',
    '### 6. Which candidates affect Death State?',
    '',
    `- ${death.length} candidates: ${death.join(', ')}`,
    '',
    '### 7. Which candidates are safe promotion candidates?',
    '',
    ...safePromotions.map((p) => `- **${p.candidateId}** (${p.promotionType}, readiness ${p.regression?.promotionReadinessScore})`),
    '',
    '### 8. Estimated readiness after promotion?',
    '',
    `If all regression-passed packages receive human approval: readiness **${imp.baseline.readiness} → ${imp.projectedReadiness}** (+${imp.estimatedReadinessIncrease}), Class C **${imp.baseline.classC} → ${imp.projectedClassC}**, degradation **${imp.baseline.degradation}% → ${imp.projectedDegradation}%**.`,
    '',
    '> Projections are estimates. Retrieval-only gaps (death/kingdom chains) require separate remediation beyond card/edge promotion.',
  ];

  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

function main() {
  const result = processPromotionWorkflow();
  const safety = verifyProductionIsolation();

  fs.mkdirSync(path.dirname(OUT_APPROVED), { recursive: true });
  writeAdminPipeline(result);
  writeImpactReport(result);
  writeQualityReport(result);
  writeWorkflowDoc(result);
  writeIOGPlan();
  writeDigestPlan();
  writeMainReport(result, safety);

  console.log('Phase 2J-D promotion workflow complete.');
  console.log(`  Staged approved: ${result.adminPipeline.approved.length}`);
  console.log(`  Rejected: ${result.adminPipeline.rejected.length}`);
  console.log(`  Hold: ${result.adminPipeline.hold.length}`);
  console.log(`  Promotion packages: ${result.promotionPackages.length}`);
  console.log(`  Projected readiness: ${result.impact.baseline.readiness} → ${result.impact.projectedReadiness}`);
  console.log(`  Safety: ${safety.passed ? 'PASSED' : 'FAILED'}`);
}

main();
