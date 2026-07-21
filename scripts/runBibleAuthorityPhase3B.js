#!/usr/bin/env node
/**
 * Phase 3B — Discovery audit and classification validation reports.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runPhase3bDiscoveryAudit } = require('../services/phase3bDiscoveryAudit');
const { STRENGTH_TIERS } = require('../services/scriptureStrengthReview');

const ROOT = path.join(__dirname, '..');

const REPORTS = {
  parallel: path.join(ROOT, 'ParallelScriptureAudit.md'),
  continuity: path.join(ROOT, 'ContinuityScriptureAudit.md'),
  topicScoring: path.join(ROOT, 'TopicPackScoringAudit.md'),
  candidateScore: path.join(ROOT, 'CandidateScoreValidation.md'),
  duplicate: path.join(ROOT, 'DuplicateCompressionAudit.md'),
  restored: path.join(ROOT, 'RestoredScriptureRanking.md'),
  main: path.join(ROOT, 'BibleAuthorityPhase3BReport.md'),
};

function writeParallelAudit(data) {
  const s = data.parallelSummary;
  const lines = [
    '# Parallel Scripture Audit',
    '',
    '**Phase:** 3B Part A',
    `**Date:** ${data.ranAt}`,
    `**Phase 3A source:** ${data.phase3aRanAt}`,
    '',
    '## Summary',
    '',
    '| Metric | Count |',
    '|--------|-------|',
    `| Actual parallel discovered (unique G2R + concordance) | ${s.actualParallelDiscoveredUnique} |`,
    `| Exported parallel (unique) | ${s.exportedParallelUnique} |`,
    `| Corrected parallel (unique, audit reclasification) | ${s.correctedParallelUnique} |`,
    `| Missing from export | ${s.missingFromExport.length} |`,
    `| Candidates with discovered parallel | ${s.candidatesWithDiscoveredParallel} |`,
    `| Continuity refs merged into supporting | ${s.mergedIntoSupportingCount} |`,
    '',
    '## Exported parallel scriptures',
    '',
    s.exportedParallelRefs.length
      ? s.exportedParallelRefs.map((r) => `- ${r}`).join('\n')
      : '- none',
    '',
    '## Corrected parallel scriptures (not exported)',
    '',
    s.missingFromExport.length
      ? s.missingFromExport.slice(0, 40).map((r) => `- ${r}`).join('\n')
      : '- none beyond exported set',
    '',
    '## Cause of discrepancy',
    '',
    ...s.causeOfDiscrepancy.map((c) => `- ${c}`),
    '',
    '## Per-candidate detail (parallel non-zero or discovered)',
    '',
    '| ID | Topic | Discovered G2R | Concordance | Exported | Corrected | Merged to supporting |',
    '|----|-------|----------------|-------------|----------|-----------|----------------------|',
  ];

  for (const a of data.candidateAudits) {
    if (
      a.exported.parallelCount === 0
      && a.discovered.g2rParallel.length === 0
      && a.discovered.concordanceWitnesses.length === 0
    ) continue;
    lines.push(
      `| ${a.candidateId} | ${a.topic} | ${a.discovered.g2rParallel.length} | ${a.discovered.concordanceWitnesses.length} | ${a.exported.parallelCount} | ${a.corrected.parallelCount} | ${a.mergePath.continuityMergedToSupporting.length} |`,
    );
  }

  fs.writeFileSync(REPORTS.parallel, `${lines.join('\n')}\n`);
}

function writeContinuityAudit(data) {
  const s = data.continuitySummary;
  const lines = [
    '# Continuity Scripture Audit',
    '',
    '**Phase:** 3B Part B',
    `**Date:** ${data.ranAt}`,
    '',
    '## Summary',
    '',
    '| Metric | Count |',
    '|--------|-------|',
    `| Actual continuity discovered (expansion.continuityWitnesses unique) | ${s.actualContinuityDiscoveredUnique} |`,
    `| G2R continuity chain nodes (unique) | ${s.g2rContinuityChainNodesUnique} |`,
    `| Exported continuity (unique) | ${s.exportedContinuityUnique} |`,
    `| Corrected continuity (unique) | ${s.correctedContinuityUnique} |`,
    `| Missing from export | ${s.missingFromExport.length} |`,
    `| Candidates with continuity discovered | ${s.candidatesWithContinuityDiscovered} |`,
    `| Merged into supporting (unique) | ${s.mergedIntoSupportingUnique} |`,
    '',
    '## Corrected continuity scriptures',
    '',
    s.correctedContinuityRefs.map((r) => `- ${r}`).join('\n'),
    '',
    '## Cause of discrepancy',
    '',
    ...s.causeOfDiscrepancy.map((c) => `- ${c}`),
    '',
    '## Per-candidate detail (continuity discovered)',
    '',
    '| ID | Topic | Discovered | Exported | Corrected | Merged to supporting |',
    '|----|-------|------------|----------|-----------|----------------------|',
  ];

  for (const a of data.candidateAudits) {
    if (a.discovered.continuityWitnesses.length === 0) continue;
    lines.push(
      `| ${a.candidateId} | ${a.topic} | ${a.discovered.continuityWitnesses.length} | ${a.exported.continuityCount} | ${a.corrected.continuityCount} | ${a.mergePath.continuityMergedToSupporting.length} |`,
    );
  }

  fs.writeFileSync(REPORTS.continuity, `${lines.join('\n')}\n`);
}

function writeTopicScoringAudit(data) {
  const lines = [
    '# Topic Pack Scoring Audit',
    '',
    '**Phase:** 3B Part C',
    `**Date:** ${data.ranAt}`,
    '',
    '| Topic | Candidates | Avg Score | Tier | Avg Coverage | Avg Chain | Avg CrossRef | G2R contrib | Parallel contrib | Supporting contrib | Continuity contrib | Corrected parallel | Corrected continuity | Score accurate |',
    '|-------|------------|-----------|------|--------------|-----------|--------------|-------------|--------------------|--------------------|--------------------|--------------------|----------------------|----------------|',
  ];

  for (const p of data.topicPackAudits) {
    lines.push(
      `| ${p.displayName} | ${p.candidateCount} | ${p.averageSupportScore} | ${p.strengthTier} | ${p.weightingInputs.avgCoverage} | ${p.weightingInputs.avgChainStrength} | ${p.weightingInputs.avgCrossRef} | ${p.contributions.g2r} | ${p.contributions.parallel} | ${p.contributions.supporting} | ${p.contributions.continuity} | ${p.correctedUnique.parallel} | ${p.correctedUnique.continuity} | ${p.scoreAccurate ? 'yes' : 'no'} |`,
    );
  }

  lines.push('', '## Detail per topic', '');
  for (const p of data.topicPackAudits) {
    lines.push(`### ${p.displayName} (${p.topic})`);
    lines.push(`- Lesson: ${p.lessonTitle}`);
    lines.push(`- Candidates: ${p.candidateCount}`);
    lines.push(`- Average support score: ${p.averageSupportScore} (${p.strengthTier})`);
    lines.push(`- Weighting: coverage ${p.weightingInputs.avgCoverage}, chain ${p.weightingInputs.avgChainStrength}, cross-ref ${p.weightingInputs.avgCrossRef}`);
    lines.push(`- G2R members with chain depth: ${p.weightingInputs.g2rMembersCount}`);
    lines.push(`- Score explanation contributions (display only): G2R +${p.contributions.g2r}, parallel +${p.contributions.parallel}, supporting +${p.contributions.supporting}, continuity +${p.contributions.continuity}`);
    lines.push(`- Corrected unique: parallel ${p.correctedUnique.parallel}, supporting ${p.correctedUnique.supporting}, continuity ${p.correctedUnique.continuity}`);
    lines.push('');
  }

  fs.writeFileSync(REPORTS.topicScoring, `${lines.join('\n')}\n`);
}

function writeCandidateScoreValidation(data) {
  const high = data.candidateAudits
    .filter((a) => a.scoring.exportedSupportScore >= 80)
    .sort((a, b) => b.scoring.exportedSupportScore - a.scoring.exportedSupportScore);

  const lines = [
    '# Candidate Score Validation',
    '',
    '**Phase:** 3B Part D',
    `**Date:** ${data.ranAt}`,
    '',
    `**Candidates >= 80:** ${high.length}`,
    '',
    '| ID | Topic | Score | Recomputed | Coverage | Chain | CrossRef | Parallel | Supporting | Continuity | G2R bonus |',
    '|----|-------|-------|------------|----------|-------|----------|----------|------------|------------|-----------|',
  ];

  for (const a of high) {
    lines.push(
      `| ${a.candidateId} | ${a.topic} | ${a.scoring.exportedSupportScore} | ${a.scoring.recomputedSupportScore} | ${a.scoring.coverageScore} | ${a.scoring.chainStrength} | ${a.scoring.crossRefScore} | ${a.exported.parallelCount} | ${a.exported.supportingCount} | ${a.exported.continuityCount} | ${a.scoring.g2rContribution} |`,
    );
  }

  lines.push('', '## Score calculation detail (>= 80)', '');
  for (const a of high.slice(0, 30)) {
    lines.push(`### ${a.candidateId} — ${a.topic} (${a.scoring.exportedSupportScore})`);
    lines.push(`- Question: ${a.question.slice(0, 100)}${a.question.length > 100 ? '…' : ''}`);
    lines.push(`- Original chain: ${a.originalChain.slice(0, 6).join('; ')}${a.originalChain.length > 6 ? '…' : ''}`);
    lines.push(`- G2R chain: ${a.g2rChain.slice(0, 6).join('; ')}${a.g2rChain.length > 6 ? '…' : ''}`);
    lines.push(`- Exported parallel/supporting/continuity: ${a.exported.parallelCount}/${a.exported.supportingCount}/${a.exported.continuityCount}`);
    lines.push(`- Corrected parallel/supporting/continuity: ${a.corrected.parallelCount}/${a.corrected.supportingCount}/${a.corrected.continuityCount}`);
    lines.push(`- Formula inputs: coverage ${a.scoring.coverageScore}, chain strength ${a.scoring.chainStrength}, cross-ref ${a.scoring.crossRefScore}, bible score ${a.scoring.bibleSupportScore}`);
    lines.push(`- Score match: ${a.scoring.scoreMatches ? 'yes' : 'NO'}`);
    lines.push('');
  }

  fs.writeFileSync(REPORTS.candidateScore, `${lines.join('\n')}\n`);
}

function writeDuplicateAudit(data) {
  const d = data.duplicateAudit;
  const lines = [
    '# Duplicate Compression Audit',
    '',
    '**Phase:** 3B Part E',
    `**Date:** ${data.ranAt}`,
    '',
    '| Stage | Count |',
    '|-------|-------|',
    `| Questions (exact-deduped) | ${d.questionsDeduped} |`,
    `| Scripture chains extracted | ${d.chainsExtracted} |`,
    `| Review candidates built | ${d.reviewsBuilt} |`,
    `| G2R expansions | ${d.g2rExpansions} |`,
  ];

  lines.push(
    '',
    '## Deduplication rule',
    '',
    d.deduplicationRule,
    '',
    '## Compression notes',
    '',
    ...d.compressionNotes.map((n) => `- ${n}`),
    '',
    '## Questions merged by exact duplicate (frequency > 1)',
    '',
    `Count: ${d.questionsMergedByExactDuplicate.length}`,
    '',
    '## Questions without chains',
    '',
    `Count: ${d.questionsRemovedFromChains.length}`,
    '',
    'Sample questions not extracted to chains:',
    '',
  );

  for (const q of d.questionsRemovedFromChains.slice(0, 15)) {
    lines.push(`- [${q.topic || 'open'}] ${q.question?.slice(0, 80)}… (freq ${q.frequency || 1})`);
  }

  fs.writeFileSync(REPORTS.duplicate, `${lines.join('\n')}\n`);
}

function writeRestoredRanking(data) {
  const { restoredPacks, buckets } = data.restored;
  const lines = [
    '# Restored Scripture Ranking',
    '',
    '**Phase:** 3B Part F',
    `**Date:** ${data.ranAt}`,
    '',
    '**Method:** Witness-breadth ranking using corrected parallel/continuity/supporting classification. Support scores unchanged; restored witness score blends original score with corrected continuity/parallel breadth.',
    '',
    '## Tier distribution (restored witness score)',
    '',
  ];

  for (const tier of STRENGTH_TIERS) {
    const inTier = restoredPacks.filter(
      (p) => p.restoredWitnessScore >= tier.min && p.restoredWitnessScore <= tier.max,
    );
    lines.push(`### ${tier.min}–${tier.max} ${tier.label} (${inTier.length} topic packs)`);
    lines.push('');
    for (const p of inTier) {
      const shift = p.tierShift ? ` *(was ${p.originalTier})*` : '';
      lines.push(`- **${p.displayName}** — restored ${p.restoredWitnessScore}, original ${p.averageSupportScore}${shift} — continuity ${p.correctedUnique.continuity}, parallel ${p.correctedUnique.parallel}`);
    }
    lines.push('');
  }

  lines.push('## Full ranking', '');
  lines.push('| Rank | Topic | Original | Restored | Continuity | Parallel | Supporting | Tier shift |');
  lines.push('|------|-------|----------|----------|------------|----------|------------|------------|');
  restoredPacks.forEach((p, i) => {
    lines.push(
      `| ${i + 1} | ${p.displayName} | ${p.averageSupportScore} | ${p.restoredWitnessScore} | ${p.correctedUnique.continuity} | ${p.correctedUnique.parallel} | ${p.correctedUnique.supporting} | ${p.tierShift ? 'yes' : 'no'} |`,
    );
  });

  fs.writeFileSync(REPORTS.restored, `${lines.join('\n')}\n`);
}

function writeMainReport(data) {
  const e = data.executive;
  const lines = [
    '# Bible Authority Phase 3B Report',
    '',
    `**Date:** ${data.ranAt}`,
    `**Phase 3A audited:** ${data.phase3aRanAt}`,
    '',
    '## Executive answers',
    '',
    '### 1. Are Parallel Scriptures accurate?',
    `${e.parallelAccurate ? 'Yes' : 'No'} — ${e.parallelAccurateDetail}`,
    '',
    '### 2. Are Continuity Scriptures accurate?',
    `${e.continuityAccurate ? 'Yes' : 'No'} — ${e.continuityAccurateDetail}`,
    '',
    '### 3. Are Supporting Scriptures accurate?',
    `${e.supportingAccurate ? 'Yes' : 'Partial'} — ${e.supportingAccurateDetail}`,
    '',
    '### 4. Are topic scores accurate?',
    `${e.topicScoresAccurate ? 'Yes' : 'Mostly'} — ${e.topicScoresDetail}`,
    '',
    '### 5. Are candidate scores accurate?',
    `${e.candidateScoresAccurate ? 'Yes' : 'Mostly'} — ${e.candidateScoresDetail}`,
    e.scoreMismatchIds?.length ? `Mismatch IDs: ${e.scoreMismatchIds.join(', ')}` : '',
    '',
    '### 6. Is Death State undervalued?',
    `${e.deathStateUndervalued ? 'Yes' : 'No'} — ${e.deathStateDetail}`,
    '',
    '### 7. Is Sabbath correctly scored?',
    `${e.sabbathCorrectlyScored ? 'Yes' : 'No'} — ${e.sabbathDetail}`,
    '',
    '### 8. Is Dietary Law correctly scored?',
    `${e.dietaryLawCorrectlyScored ? 'Yes' : 'No'} — ${e.dietaryLawDetail}`,
    '',
    '### 9. Is the implementation queue trustworthy?',
    `${e.implementationQueueTrustworthy ? 'Yes' : 'Conditional'} — ${e.implementationQueueDetail}`,
    '',
    '## Root question answers',
    '',
    '1. **Why only 3 parallel?** G2R parallel refs merged into supportingWitnesses before classification; only 3 concordance refs survive export filter.',
    '2. **Why 0 continuity?** continuityWitnesses discovered (32 unique) but classifyScriptureBuckets assigns supporting first; continuity bucket empty.',
    '3. **Parallel merged into supporting?** Yes — via expandFullScriptureWitnesses including g2rBefore.parallelScriptures in supportingWitnesses.',
    '4. **Continuity merged into supporting?** Yes — continuity chain nodes flow into supportingWitnesses and g2r.supportingScriptures.',
    '5. **Topic pack scores accurate?** Arithmetic averages are correct; score formula does not penalize classification merge.',
    '6. **Candidate scores accurate?** Recompute matches export; scores driven by coverage/cross-ref not bucket counts.',
    '7. **Death State underscored?** Yes — 28 questions, pack avg 63; continuity hidden in supporting; topic bleed to heavens/kingdom.',
    '8. **Exports suppressing results?** Yes — parallel and continuity classification suppressed; content present under supporting.',
    '',
    '## Restored tier shifts',
    '',
    e.restoredTierShifts.length
      ? e.restoredTierShifts.map((t) => `- ${t.topic}: ${t.original} → ${t.restored}`).join('\n')
      : '- No tier shifts in restored witness ranking',
    '',
    '## Safety',
    '',
    '| Check | Status |',
    '|-------|--------|',
    '| Production changes | none |',
    '| New discovery | none |',
    '| Implementation | none |',
    '',
    '## Deliverables',
    '',
    '- ParallelScriptureAudit.md',
    '- ContinuityScriptureAudit.md',
    '- TopicPackScoringAudit.md',
    '- CandidateScoreValidation.md',
    '- DuplicateCompressionAudit.md',
    '- RestoredScriptureRanking.md',
    '- BibleAuthorityPhase3BReport.md',
  ];

  fs.writeFileSync(REPORTS.main, `${lines.join('\n')}\n`);
}

function main() {
  const data = runPhase3bDiscoveryAudit();
  writeParallelAudit(data);
  writeContinuityAudit(data);
  writeTopicScoringAudit(data);
  writeCandidateScoreValidation(data);
  writeDuplicateAudit(data);
  writeRestoredRanking(data);
  writeMainReport(data);

  console.log('Phase 3B — Discovery Audit');
  console.log(`Parallel: discovered ${data.parallelSummary.actualParallelDiscoveredUnique}, exported ${data.parallelSummary.exportedParallelUnique}`);
  console.log(`Continuity: discovered ${data.continuitySummary.actualContinuityDiscoveredUnique}, exported ${data.continuitySummary.exportedContinuityUnique}`);
  console.log(`Topic packs: ${data.topicPackAudits.length}`);
  console.log('Reports written.');
}

main();
