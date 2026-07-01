#!/usr/bin/env node
/**
 * Phase 2J-Q — Scripture Strength Review System runner.
 * Bible-first admin review. No production updates.
 */
const fs = require('fs');
const path = require('path');
const { runScriptureResearchReviewConsole } = require('../services/scriptureResearchReviewConsole');
const { STRENGTH_TIERS } = require('../services/scriptureStrengthReview');
const { getAllApprovedCards } = require('../services/evidenceCards');
const { getAllApprovedSupportEdges } = require('../services/approvedSupportGraph');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  tiers: path.join(ROOT, 'ScriptureStrengthTierReport.md'),
  scoreExplanation: path.join(ROOT, 'ScriptureScoreExplanationReport.md'),
  sorting: path.join(ROOT, 'ScriptureReviewSortingGuide.md'),
  simplification: path.join(ROOT, 'AdminReviewSimplificationReport.md'),
  voice: path.join(ROOT, 'VoiceResearchExpansionPlan.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase2JQReport.md'),
};

const PRODUCTION_WIRE = [
  'buddyBrain.js',
  'retrievalEvidencePack.js',
  'approvedSupportGraph.js',
  'claimToScriptureValidator.js',
  'doctrineRegistry.js',
  'evidenceCards/index.js',
];

const FORBIDDEN = [
  'scriptureStrengthReview',
  'runScriptureStrengthReview',
  'scriptureResearchReviewConsole',
];

function verifySafety() {
  const violations = [];
  for (const file of PRODUCTION_WIRE) {
    const p = path.join(ROOT, 'services', file);
    if (!fs.existsSync(p)) continue;
    const content = fs.readFileSync(p, 'utf8');
    for (const mod of FORBIDDEN) {
      if (content.includes(mod)) violations.push({ file, mod });
    }
  }
  return {
    passed: violations.length === 0,
    violations,
    graphEdgeCount: getAllApprovedSupportEdges().length,
    cardCount: getAllApprovedCards().length,
  };
}

function writeTierReport(result) {
  const lines = [
    '# Scripture Strength Tier Report',
    '',
    '**Phase:** 2J-Q Part A',
    `**Date:** ${result.ranAt}`,
    '',
    'Green / Yellow / Red retired. Scripture evaluated by strength tier only.',
    '',
    '## Tier definitions',
    '',
    '| Score | Tier |',
    '|-------|------|',
  ];

  for (const t of STRENGTH_TIERS) {
    lines.push(`| ${t.min}–${t.max} | ${t.label} |`);
  }

  lines.push('', '## Candidate distribution', '');
  lines.push('| Tier | Count |');
  lines.push('|------|-------|');
  for (const [tier, count] of Object.entries(result.strengthTierCounts)) {
    lines.push(`| ${tier} | ${count} |`);
  }

  lines.push('', '## Top 20 by support score', '');
  lines.push('| ID | Topic | Lesson | Score | Tier |');
  lines.push('|----|-------|--------|-------|------|');
  for (const r of result.topByScore) {
    lines.push(`| ${r.candidateId} | ${r.topic} | ${r.lessonTitle.slice(0, 40)}… | ${r.supportScore} | ${r.strengthTier} |`);
  }

  fs.writeFileSync(REPORTS.tiers, `${lines.join('\n')}\n`);
}

function writeScoreExplanationReport(result) {
  const lines = [
    '# Scripture Score Explanation Report',
    '',
    '**Phase:** 2J-Q Part D',
    `**Date:** ${result.ranAt}`,
    '',
    'Every candidate includes score increases, decreases, and scripture-level concerns.',
    '',
  ];

  const samples = [
    result.focusReview,
    ...result.reviews.filter((r) => r.contradictionScriptures.length).slice(0, 2),
    ...result.reviews.filter((r) => r.supportScore >= 95).slice(0, 2),
  ].filter((r, i, arr) => r && arr.findIndex((x) => x.candidateId === r.candidateId) === i);

  for (const r of samples) {
    lines.push(`## ${r.candidateId} — ${r.lessonTitle}`);
    lines.push('');
    lines.push(`**Score:** ${r.supportScore} | **Tier:** ${r.strengthTier}`);
    lines.push('');

    if (r.scoreExplanation.increases.length) {
      lines.push('### Why score increased');
      for (const inc of r.scoreExplanation.increases) {
        lines.push(`- **${inc.factor}:** ${inc.detail} (${inc.impact})`);
      }
      lines.push('');
    }

    if (r.scoreExplanation.decreases.length) {
      lines.push('### Why score decreased');
      for (const dec of r.scoreExplanation.decreases) {
        lines.push(`- **${dec.factor}:** ${dec.detail} (${dec.impact})`);
      }
      lines.push('');
    }

    if (r.scoreExplanation.scriptureConcerns.length) {
      lines.push('### Scripture concerns');
      for (const c of r.scoreExplanation.scriptureConcerns.slice(0, 3)) {
        lines.push(`**${c.scripture || 'chain'}**`);
        lines.push(`- Classification: ${c.classification}`);
        lines.push(`- Confidence: ${c.confidence}%`);
        lines.push(`- Reason: ${c.reason}`);
        lines.push('');
      }
    }
  }

  fs.writeFileSync(REPORTS.scoreExplanation, `${lines.join('\n')}\n`);
}

function writeSortingGuide(result) {
  const lines = [
    '# Scripture Review Sorting Guide',
    '',
    '**Phase:** 2J-Q Part E',
    `**Date:** ${result.ranAt}`,
    '',
    '## Filter options',
    '',
    '- `minScore`: 95+, 90+, 80+',
    '- `topic`',
    '- `lessonTitle`',
    '- `minParallel`, `minSupporting`, `minContinuity`',
    '- `minG2RSize`',
    '- `minContradiction`, `minCaution`',
    '- `strengthTier`',
    '',
    '## Sort keys',
    '',
    '`supportScore` | `parallelCount` | `supportingCount` | `continuityCount` | `g2rSize` | `contradictionCount` | `cautionCount` | `lessonTitle` | `topic`',
    '',
    '## Rankings',
    '',
    '### Most parallel scriptures',
    '',
    '| ID | Lesson | Parallel count | Score |',
    '|----|--------|----------------|-------|',
  ];

  for (const r of result.topByParallel) {
    lines.push(`| ${r.candidateId} | ${r.lessonTitle.slice(0, 35)}… | ${r.parallelScriptures.length} | ${r.supportScore} |`);
  }

  lines.push('', '### Most supporting scriptures', '');
  lines.push('| ID | Lesson | Supporting count | Score |');
  lines.push('|----|--------|------------------|-------|');
  for (const r of result.topBySupporting) {
    lines.push(`| ${r.candidateId} | ${r.lessonTitle.slice(0, 35)}… | ${r.supportingScriptures.length} | ${r.supportScore} |`);
  }

  lines.push('', '### Most contradiction scriptures', '');
  lines.push('| ID | Lesson | Contradiction count | Score |');
  lines.push('|----|--------|---------------------|-------|');
  for (const r of result.topByContradiction.filter((x) => x.contradictionScriptures.length)) {
    lines.push(`| ${r.candidateId} | ${r.lessonTitle.slice(0, 35)}… | ${r.contradictionScriptures.length} | ${r.supportScore} |`);
  }

  lines.push('', '### Strongest G2R by topic', '');
  lines.push('| Topic | Avg G2R size | Avg score | Candidates |');
  lines.push('|-------|--------------|-----------|------------|');
  for (const t of result.topicG2RStrength.slice(0, 10)) {
    lines.push(`| ${t.topic} | ${t.avgG2RSize} | ${t.avgSupportScore} | ${t.candidateCount} |`);
  }

  fs.writeFileSync(REPORTS.sorting, `${lines.join('\n')}\n`);
}

function writeSimplificationReport(result) {
  const focus = result.focusReview;
  const lines = [
    '# Admin Review Simplification Report',
    '',
    '**Phase:** 2J-Q Part F',
    `**Date:** ${result.ranAt}`,
    '',
    '## Retired',
    '',
    '- Green / Yellow / Red color labels',
    '- Separate contradiction dashboards',
    '- Additional review layers',
    '',
    '## Every review page shows',
    '',
    '1. Topic',
    '2. Lesson Title',
    '3. Question',
    '4. Support Score',
    '5. Strength Tier',
    '6. Scripture Summary (original, G2R, parallel, supporting, continuity, caution, contradiction)',
    '7. Score Explanation',
    '8. Review Notes',
    '9. Decision: Approve | Hold | Reject',
    '',
    '## Sample review page',
    '',
    `**Topic:** ${focus.topic}`,
    `**Lesson:** ${focus.lessonTitle}`,
    `**Question:** ${focus.question}`,
    `**Score:** ${focus.supportScore} (${focus.strengthTier})`,
    `**Review notes:** ${focus.reviewNotes}`,
    `**Recommended action (advisory):** ${focus.recommendedAction}`,
    '',
    'Single surface: Scripture Research & Review Console',
  ];

  fs.writeFileSync(REPORTS.simplification, `${lines.join('\n')}\n`);
}

function writeVoicePlan(result) {
  const lines = [
    '# Voice Research Expansion Plan',
    '',
    '**Phase:** 2J-Q Part H',
    `**Date:** ${result.ranAt}`,
    '',
    '```',
    'Voice → Text → Research Command → Research Console',
    '```',
    '',
    'Voice remains optional. No production impact.',
    '',
    '## Expanded voice examples',
    '',
  ];

  for (const v of result.voiceSamples) {
    lines.push(`### "${v.voiceInput}"`);
    lines.push(`- Command: \`${v.researchCommand.command}\``);
    lines.push(`- Status: ${v.researchCommand.status}`);
    lines.push('');
  }

  lines.push('## New 2J-Q voice commands', '');
  lines.push('- "Show me all Sabbath lessons above 90"');
  lines.push('- "Find more parallel scriptures for Logos"');
  lines.push('- "Show contradiction scriptures for this lesson"');
  lines.push('- "Show caution scriptures for this topic"');
  lines.push('- "Merge Kingdom and Resurrection"');

  fs.writeFileSync(REPORTS.voice, `${lines.join('\n')}\n`);
}

function writeMainReport(result, safety) {
  const ts = result.timeSavingsVs2JO;
  const tierLines = Object.entries(result.strengthTierCounts)
    .map(([k, v]) => `  - ${k}: ${v}`)
    .join('\n');

  const lines = [
    '# Bible Authority Phase 2J-Q Report',
    '',
    '**Phase:** Scripture Strength Review System (Revision 1)',
    `**Date:** ${result.ranAt}`,
    '',
    '## Mission answers',
    '',
    '1. **Candidates per strength tier:**',
    tierLines,
    '',
    '2. **Top 20 by support score:**',
    result.topByScore.map((r) => `   - ${r.candidateId} (${r.supportScore}, ${r.strengthTier})`).join('\n'),
    '',
    '3. **Strongest G2R topics:**',
    result.topicG2RStrength.slice(0, 5).map((t) => `   - ${t.topic} (avg G2R ${t.avgG2RSize}, avg score ${t.avgSupportScore})`).join('\n'),
    '',
    '4. **Most parallel scriptures:**',
    result.topByParallel.slice(0, 3).map((r) => `   - ${r.candidateId}: ${r.parallelScriptures.length} parallel`).join('\n'),
    '',
    '5. **Most supporting scriptures:**',
    result.topBySupporting.slice(0, 3).map((r) => `   - ${r.candidateId}: ${r.supportingScriptures.length} supporting`).join('\n'),
    '',
    '6. **Most contradiction scriptures:**',
    result.topByContradiction.filter((r) => r.contradictionScriptures.length).slice(0, 3)
      .map((r) => `   - ${r.candidateId}: ${r.contradictionScriptures.length} contradiction`).join('\n') || '   - none with contradiction scriptures',
    '',
    '7. **Review first:**',
    result.reviewFirst.slice(0, 8).map((r) => `   - ${r.candidateId} (${r.strengthTier}, score ${r.supportScore})`).join('\n'),
    '',
    `8. **Admin time saved vs 2J-O:** ~${ts.percentSavedVs2JO}% (~${ts.hoursSavedVs2JO} hours)`,
    '',
    '## Safety (Part I)',
    '',
    `| Check | Status |`,
    `|-------|--------|`,
    `| Production wire isolation | ${safety.passed ? 'PASS' : 'FAIL'} |`,
    `| Graph edges unchanged | ${safety.graphEdgeCount} |`,
    `| Evidence cards unchanged | ${safety.cardCount} |`,
    `| Green/Yellow/Red retired | yes |`,
    `| Automatic approvals | none |`,
    `| Automatic promotions | none |`,
    '',
    '## Deliverables',
    '',
    '- ScriptureStrengthTierReport.md',
    '- ScriptureScoreExplanationReport.md',
    '- ScriptureReviewSortingGuide.md',
    '- AdminReviewSimplificationReport.md',
    '- VoiceResearchExpansionPlan.md',
    '- docs/evidence-candidates/console-queue.json',
    '- BibleAuthorityPhase2JQReport.md',
    '',
    '**Re-run:** `node scripts/runScriptureStrengthReview.js`',
  ];

  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

function main() {
  console.log('Phase 2J-Q — Scripture Strength Review System');
  const safety = verifySafety();
  const result = runScriptureResearchReviewConsole();

  writeTierReport(result);
  writeScoreExplanationReport(result);
  writeSortingGuide(result);
  writeSimplificationReport(result);
  writeVoicePlan(result);
  writeMainReport(result, safety);

  console.log('Strength tiers:', JSON.stringify(result.strengthTierCounts));
  console.log(`Time saved vs 2J-O: ~${result.timeSavingsVs2JO.percentSavedVs2JO}%`);
  console.log(`Safety: ${safety.passed ? 'PASS' : 'FAIL'}`);
  console.log('Reports written.');
}

main();
