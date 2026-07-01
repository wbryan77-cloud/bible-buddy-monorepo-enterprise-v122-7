#!/usr/bin/env node
/**
 * Phase 2J-C — Scripture Discovery + Genesis-to-Revelation expansion runner.
 * Discovery only — no promotion, no production wiring.
 */
const fs = require('fs');
const path = require('path');
const { runGenesisRevelationDiscovery } = require('../services/scriptureDiscoveryGenesisRevelation');

const ROOT = path.join(__dirname, '..');
const OUT_PACKAGE = path.join(ROOT, 'docs', 'evidence-candidates', 'genesis-revelation-review-package.json');
const OUT_QUEUE = path.join(ROOT, 'docs', 'evidence-candidates', 'genesis-revelation-discovery-queue.jsonl');
const OUT_QUESTION_INVENTORY = path.join(ROOT, 'ScriptureDiscoveryQuestionInventory.md');
const OUT_G2R_REPORT = path.join(ROOT, 'GenesisToRevelationExpansionReport.md');
const OUT_PARALLEL = path.join(ROOT, 'ParallelScriptureAnalysis.md');
const OUT_RANKING = path.join(ROOT, 'ScriptureSupportRanking.md');
const OUT_ADMIN_PACKAGE = path.join(ROOT, 'AdminReviewPackage.md');
const OUT_WORKFLOW_PLAN = path.join(ROOT, 'ScriptureDiscoveryAdminWorkflowPlan.md');
const OUT_SAFETY = path.join(ROOT, 'GenesisRevelationDiscoverySafetyReport.md');

const PRODUCTION_WIRE_CHECK = [
  path.join(ROOT, 'services', 'buddyBrain.js'),
  path.join(ROOT, 'services', 'retrievalEvidencePack.js'),
  path.join(ROOT, 'services', 'approvedSupportGraph.js'),
  path.join(ROOT, 'services', 'claimToScriptureValidator.js'),
  path.join(ROOT, 'services', 'doctrineRegistry.js'),
];

const FORBIDDEN_IMPORTS = [
  'scriptureDiscoveryGenesisRevelation',
  'genesis-revelation-review-package',
  'genesis-revelation-discovery-queue',
  'runScriptureDiscoveryGenesisRevelation',
];

function verifyProductionIsolation() {
  const violations = [];
  for (const file of PRODUCTION_WIRE_CHECK) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    for (const mod of FORBIDDEN_IMPORTS) {
      if (content.includes(mod)) violations.push({ file: path.basename(file), module: mod });
    }
  }
  return { passed: violations.length === 0, violations, checkedFiles: PRODUCTION_WIRE_CHECK.map((f) => path.basename(f)) };
}

function writeJsonl(candidates, outPath) {
  const lines = candidates.map((c) => JSON.stringify(c)).join('\n');
  fs.writeFileSync(outPath, `${lines}\n`);
}

function writeReviewPackage(result) {
  const pkg = {
    phase: '2J-C',
    generatedAt: result.ranAt,
    description: 'Genesis-to-Revelation discovery admin review package. Advisory only — not applied to production.',
    reviewRequired: true,
    autoApplied: false,
    metrics: {
      questionCount: result.questionCount,
      chainCount: result.chainCount,
      expansionCount: result.expansionCount,
      genesisToRevelationSpans: result.genesisToRevelationSpans,
      scoreBuckets: result.scoreBuckets,
    },
    candidates: result.ranked.map((c) => ({
      candidateId: c.candidateId,
      pilotId: c.pilotId,
      question: c.question,
      topic: c.topic,
      source: c.source,
      scriptureChain: c.scriptureChain,
      candidateConclusion: c.candidateConclusion,
      parallelScriptures: c.parallelScriptures,
      supportingScriptures: c.supportingScriptures,
      cautionScriptures: c.cautionScriptures,
      limitingScriptures: c.limitingScriptures,
      continuityScriptures: c.continuityScriptures,
      genesisToRevelationSpan: c.genesisToRevelationSpan,
      coverageScore: c.coverageScore,
      supportScore: c.supportScore,
      supportBand: c.supportBand,
      recommendedAction: c.recommendedAction,
      reviewRequired: true,
      autoApplied: false,
    })),
  };
  fs.writeFileSync(OUT_PACKAGE, `${JSON.stringify(pkg, null, 2)}\n`);
}

function writeQuestionInventory(result) {
  const bySource = {};
  for (const c of result.candidates) {
    const key = c.sourceType || 'unknown';
    if (!bySource[key]) bySource[key] = [];
    bySource[key].push(c);
  }

  const lines = [
    '# Scripture Discovery Question Inventory',
    '',
    `**Phase:** 2J-C Part A`,
    `**Date:** ${result.ranAt}`,
    `**Total questions extracted:** ${result.questionCount}`,
    '',
    '## Source breakdown',
    '',
    '| Source type | Count |',
    '|-------------|-------|',
  ];

  for (const [type, items] of Object.entries(bySource).sort((a, b) => b[1].length - a[1].length)) {
    lines.push(`| ${type} | ${items.length} |`);
  }

  lines.push('', '## Question inventory', '');
  lines.push('| ID | Topic | Question | Scriptures cited | Source |');
  lines.push('|----|-------|----------|------------------|--------|');

  for (const c of result.candidates) {
    const refs = (c.scripturesCited || []).join('; ') || '—';
    const q = c.question.length > 60 ? `${c.question.slice(0, 57)}…` : c.question;
    lines.push(`| ${c.candidateId} | ${c.topic || '—'} | ${q} | ${refs} | ${c.sourceType || '—'} |`);
  }

  fs.writeFileSync(OUT_QUESTION_INVENTORY, `${lines.join('\n')}\n`);
}

function writeG2RReport(result) {
  const withSpan = result.candidates.filter((c) => c.genesisToRevelationSpan);
  const withExpansion = result.candidates.filter((c) => c.expansionCount > 0);

  const lines = [
    '# Genesis-to-Revelation Expansion Report',
    '',
    `**Phase:** 2J-C Part C`,
    `**Date:** ${result.ranAt}`,
    '',
    '## Summary',
    '',
    `| Metric | Count |`,
    `|--------|-------|`,
    `| Questions extracted | ${result.questionCount} |`,
    `| Scripture chains (2+ refs) | ${result.chainCount} |`,
    `| Candidates with G2R expansions | ${result.expansionCount} |`,
    `| Full Genesis→Revelation spans | ${result.genesisToRevelationSpans} |`,
    '',
    '## Strongest Genesis-to-Revelation chains',
    '',
  ];

  const topG2R = [...withSpan].sort((a, b) => b.supportScore - a.supportScore).slice(0, 10);
  for (const c of topG2R) {
    lines.push(`### ${c.candidateId} — ${c.topic} (score ${c.supportScore})`);
    lines.push('');
    lines.push(`**Question:** ${c.question}`);
    lines.push(`**Continuity chain:** ${c.scriptureChain.continuity.join(' → ') || '—'}`);
    lines.push(`**Parallel discovered:** ${c.parallelScriptures.join(', ') || 'none'}`);
    lines.push(`**Coverage:** ${c.coverageScore} | **Chain strength:** ${c.scriptureChain.strength}`);
    lines.push('');
  }

  lines.push('## Expansion candidates (missing continuity nodes)', '');
  const topExp = [...withExpansion].sort((a, b) => b.expansionCount - a.expansionCount).slice(0, 8);
  for (const c of topExp) {
    lines.push(`- **${c.candidateId}** (${c.topic}): +${c.expansionCount} refs — ${c.parallelScriptures.slice(0, 4).join(', ')}${c.parallelScriptures.length > 4 ? '…' : ''}`);
  }

  fs.writeFileSync(OUT_G2R_REPORT, `${lines.join('\n')}\n`);
}

function writeParallelAnalysis(result) {
  const lines = [
    '# Parallel Scripture Analysis',
    '',
    `**Phase:** 2J-C`,
    `**Date:** ${result.ranAt}`,
    '',
    'Line upon line, precept upon precept — parallel and supporting Scripture discovered from approved evidence only.',
    '',
  ];

  const withParallel = result.candidates.filter((c) => c.parallelScriptures.length > 0);
  lines.push(`**Candidates with parallel discoveries:** ${withParallel.length}`, '');

  for (const c of withParallel.slice(0, 20)) {
    lines.push(`## ${c.candidateId} — ${c.topic}`);
    lines.push('');
    lines.push(`**Cited:** ${(c.scripturesCited || []).join(', ') || 'none'}`);
    lines.push(`**Parallel (continuity):** ${c.parallelScriptures.join(', ') || 'none'}`);
    lines.push(`**Supporting (approved):** ${c.supportingScriptures.slice(0, 6).join(', ') || 'none'}${c.supportingScriptures.length > 6 ? '…' : ''}`);
    lines.push(`**Caution:** ${c.cautionScriptures.join(', ') || 'none'}`);
    lines.push(`**Limiting:** ${c.limitingScriptures.join(', ') || 'none'}`);
    lines.push('');
  }

  fs.writeFileSync(OUT_PARALLEL, `${lines.join('\n')}\n`);
}

function writeSupportRanking(result) {
  const lines = [
    '# Scripture Support Ranking',
    '',
    `**Phase:** 2J-C Part E`,
    `**Date:** ${result.ranAt}`,
  '',
    'Ranked 100 (highest confidence) → 0 (lowest). Scores based on Scripture evidence only.',
    '',
    '| Rank | ID | Score | Band | Topic | Coverage | G2R span | Action |',
    '|------|-----|-------|------|-------|----------|----------|--------|',
  ];

  result.ranked.forEach((c, i) => {
    lines.push(
      `| ${i + 1} | ${c.candidateId} | ${c.supportScore} | ${c.supportBand} | ${c.topic || '—'} | ${c.coverageScore} | ${c.genesisToRevelationSpan ? '✅' : '—'} | ${c.recommendedAction} |`,
    );
  });

  lines.push('', '## Score distribution', '');
  lines.push(`- **≥95 (strong):** ${result.scoreBuckets.above95}`);
  lines.push(`- **≥90 (very strong):** ${result.scoreBuckets.above90}`);
  lines.push(`- **≥80 (good):** ${result.scoreBuckets.above80}`);
  lines.push(`- **≥70 (needs review):** ${result.scoreBuckets.above70}`);
  lines.push(`- **<60 (research only):** ${result.scoreBuckets.below60}`);

  fs.writeFileSync(OUT_RANKING, `${lines.join('\n')}\n`);
}

function writeAdminReviewPackage(result) {
  const strengthen = result.ranked.filter(
    (c) => c.supportScore >= 80 && ['approve_card_ref', 'approve_support_edge'].includes(c.recommendedAction),
  );
  const degradation = result.ranked.filter(
    (c) => c.source?.includes('phase2i_class_c') && c.supportScore >= 70,
  );
  const needsReview = result.ranked.filter(
    (c) => c.recommendedAction === 'hold' || c.recommendedAction === 'future_research',
  );

  const lines = [
    '# Admin Review Package',
    '',
    `**Phase:** 2J-C Part G`,
    `**Date:** ${result.ranAt}`,
    `**Package:** docs/evidence-candidates/genesis-revelation-review-package.json`,
    '',
    '## Review queue summary',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total candidates | ${result.candidates.length} |`,
    `| Review required | ${result.summary.reviewRequired} |`,
    `| Auto-applied | ${result.summary.autoApplied} |`,
    '',
    '## Recommended actions',
    '',
    '| Action | Count |',
    '|--------|-------|',
  ];

  for (const [action, count] of Object.entries(result.summary.byRecommendedAction).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${action} | ${count} |`);
  }

  lines.push('', '## Answers', '');

  lines.push('### 1. Questions extracted');
  lines.push(`${result.questionCount}`);
  lines.push('');
  lines.push('### 2. Scripture chains found');
  lines.push(`${result.chainCount} (candidates with 2+ refs in order)`);
  lines.push('');
  lines.push('### 3. Genesis-to-Revelation expansions');
  lines.push(`${result.expansionCount} candidates with discovered parallel/supporting refs; ${result.genesisToRevelationSpans} full Genesis→Revelation spans`);
  lines.push('');
  lines.push('### 4–6. Score thresholds');
  lines.push(`- ≥95: **${result.scoreBuckets.above95}**`);
  lines.push(`- ≥90: **${result.scoreBuckets.above90}**`);
  lines.push(`- ≥80: **${result.scoreBuckets.above80}**`);
  lines.push('');
  lines.push('### 7. Discoveries that most strengthen existing evidence');
  for (const c of strengthen.slice(0, 8)) {
    lines.push(`- **${c.candidateId}** (${c.topic}, ${c.supportScore}): ${c.recommendedAction}`);
  }
  lines.push('');
  lines.push('### 8. Discoveries that could reduce remaining degradation');
  for (const c of degradation.slice(0, 8)) {
    lines.push(`- **${c.candidateId}** → ${c.source}: ${c.supportScore} — ${c.recommendedAction}`);
  }
  lines.push('');
  lines.push('### 9. Strongest Genesis-to-Revelation chains');
  for (const c of result.ranked.filter((x) => x.genesisToRevelationSpan).slice(0, 6)) {
    lines.push(`- **${c.candidateId}** (${c.supportScore}): ${c.scriptureChain.continuity.slice(0, 4).join(' → ')}…`);
  }
  lines.push('');
  lines.push('### 10. Require further review');
  for (const c of needsReview.slice(0, 10)) {
    lines.push(`- **${c.candidateId}** (${c.supportScore}): ${c.recommendedAction} — ${c.question.slice(0, 70)}…`);
  }

  fs.writeFileSync(OUT_ADMIN_PACKAGE, `${lines.join('\n')}\n`);
}

function writeWorkflowPlan() {
  const lines = [
    '# Scripture Discovery Admin Workflow Plan',
    '',
    '**Phase:** 2J-C Part I — Design only',
    `**Date:** ${new Date().toISOString()}`,
    '',
    '> No production wiring. All features optional and admin-disableable.',
    '',
    '## Authority flow',
    '',
    '```',
    'Question → Scriptures cited → Scripture order → Candidate conclusion',
    '  → Genesis-to-Revelation verification → Parallel Scripture discovery',
    '  → Bible support score → Admin review queue → Human approval',
    '```',
    '',
    '## Planned features',
    '',
    '### Daily review queue',
    '- Surface top N candidates by `supportScore` and `priorityScore`',
    '- Filter: `reviewRequired:true`, `autoApplied:false`, `decision:null`',
    '- Group by topic and recommended action',
    '',
    '### Weekly digest',
    '- Summary of new candidates from discovery runs',
    '- Score band changes since last run',
    '- Class C degradation correlation (read-only)',
    '',
    '### Monthly digest',
    '- Cumulative approved vs pending counts',
    '- Topic coverage heatmap (OT/NT/continuity)',
    '- Stale candidates (>30 days unreviewed)',
    '',
    '### Review reminders',
    '- Optional email/Slack hook (admin-configured)',
    '- Threshold: candidates with score ≥80 unreviewed >7 days',
    '',
    '### Approve / reject workflow',
    '- Admin fills `admin-decisions.template.json` or G2R review package decisions',
    '- Allowed: `approve_card_ref`, `approve_support_edge`, `hold`, `future_research`, `reject`',
    '- Separate apply step (Phase 2K+) — never auto-apply',
    '',
    '### Bulk review tools',
    '- Batch approve support edges for same topic',
    '- Batch reject pastoral/off-card candidates',
    '- Export CSV for external theological review',
    '',
    '## Safety invariants',
    '',
    '- Every candidate: `reviewRequired: true`, `autoApplied: false`',
    '- Discovery modules not imported by `buddyBrain`, `retrievalEvidencePack`, or validators',
    '- Human approval required before any card/graph/registry change',
    '',
    '## Disable controls',
    '',
    '| Feature | Env flag (proposed) | Default |',
    '|---------|---------------------|---------|',
    '| Discovery runner | `SCRIPTURE_DISCOVERY_ENABLED` | false |',
    '| Daily queue | `SCRIPTURE_DISCOVERY_DAILY_QUEUE` | false |',
    '| Digests | `SCRIPTURE_DISCOVERY_DIGESTS` | false |',
    '| Reminders | `SCRIPTURE_DISCOVERY_REMINDERS` | false |',
  ];

  fs.writeFileSync(OUT_WORKFLOW_PLAN, `${lines.join('\n')}\n`);
}

function writeSafetyReport(result, safety) {
  const lines = [
    '# Genesis-to-Revelation Discovery Safety Report',
    '',
    `**Phase:** 2J-C Part J`,
    `**Date:** ${result.ranAt}`,
    '',
    '## Production isolation',
    '',
    safety.passed ? '✅ **PASSED**' : '❌ **FAILED**',
    '',
    `Checked: ${safety.checkedFiles.join(', ')}`,
    '',
    '## Candidate safety',
    '',
    `| Check | Result |`,
    `|-------|--------|`,
    `| All reviewRequired | ${result.summary.reviewRequired === result.candidates.length ? '✅' : '❌'} (${result.summary.reviewRequired}/${result.candidates.length}) |`,
    `| All autoApplied=false | ${result.summary.autoApplied === 0 ? '✅' : '❌'} |`,
    `| No production imports | ${safety.passed ? '✅' : '❌'} |`,
    '',
    '## Stop conditions',
    '',
    '- ❌ No auto-promotion',
    '- ❌ No doctrine modification',
    '- ❌ No support graph modification',
    '- ❌ No evidence card modification',
    '- ❌ No prompt modification',
    '- ❌ No production answer changes',
    '',
    '## Verdict',
    '',
    safety.passed && result.summary.autoApplied === 0
      ? '**SAFE** — discovery and admin review only.'
      : '**INVESTIGATE** — safety check failed.',
  ];

  fs.writeFileSync(OUT_SAFETY, `${lines.join('\n')}\n`);
}

function main() {
  const result = runGenesisRevelationDiscovery();
  const safety = verifyProductionIsolation();

  fs.mkdirSync(path.dirname(OUT_PACKAGE), { recursive: true });
  writeReviewPackage(result);
  writeJsonl(result.candidates, OUT_QUEUE);
  writeQuestionInventory(result);
  writeG2RReport(result);
  writeParallelAnalysis(result);
  writeSupportRanking(result);
  writeAdminReviewPackage(result);
  writeWorkflowPlan();
  writeSafetyReport(result, safety);

  console.log('Phase 2J-C Genesis-to-Revelation discovery complete.');
  console.log(`  Questions: ${result.questionCount}`);
  console.log(`  Chains: ${result.chainCount}`);
  console.log(`  Expansions: ${result.expansionCount}`);
  console.log(`  Score ≥95: ${result.scoreBuckets.above95}`);
  console.log(`  Score ≥90: ${result.scoreBuckets.above90}`);
  console.log(`  Score ≥80: ${result.scoreBuckets.above80}`);
  console.log(`  Safety: ${safety.passed ? 'PASSED' : 'FAILED'}`);
}

main();
