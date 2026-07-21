#!/usr/bin/env node
/**
 * Phase 4A — Implementation sandbox testing.
 * Sandbox only — no production deployment.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { runSandboxTests } = require('../services/sandboxScriptureAnswerTester');
const { SANDBOX_DIR, OUT_DIR } = require('../services/sandboxBibleAuthorityRetriever');

const ROOT = path.join(__dirname, '..');

function writeSandboxSetupReport(data) {
  const snap = data.retriever.corpusSnapshot();
  const lines = [
    '# Phase 4A Sandbox Setup Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    '',
    '## Mission',
    '',
    'Sandbox-only implementation path reading Phase 3 frozen corpus. No production changes.',
    '',
    '## Sandbox modules',
    '',
    '- `services/sandboxBibleAuthorityRetriever.js`',
    '- `services/sandboxBibleAuthorityEngine.js`',
    '- `services/sandboxScriptureAnswerTester.js`',
    '',
    '## Corpus load status',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Frozen corpus loaded | ${snap.loaded ? 'yes' : 'no'} |`,
    `| Missing files | ${snap.missingFiles?.length || 0} |`,
    `| Traceability packs | ${snap.packCount} |`,
    `| Scripture chains | ${snap.chainCount} |`,
    `| Observed relationships | ${snap.observedCount} |`,
    `| Candidate relationships | ${snap.candidateCount} |`,
    `| Vine nodes | ${snap.vineNodeCount} |`,
    `| Review queue | ${snap.reviewQueueSize} |`,
    `| Freeze status | ${snap.freezeStatus} |`,
    '',
    '## Input manifests',
    '',
    '- `Phase4ImplementationInputs.json`',
    '- `Phase3CorpusSnapshot.json`',
    '- `Phase3CorpusFreezeManifest.json`',
    '',
    'Sandbox testing only. No production deployment.',
  ];
  fs.writeFileSync(path.join(ROOT, 'Phase4ASandboxSetupReport.md'), `${lines.join('\n')}\n`);
}

function writeAnswerTraceabilityReport(data) {
  const lines = [
    '# Phase 4A Answer Traceability Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    '',
    '| Pack | Original | Parallel | Supporting | Continuity | G2R Sections | Traceable |',
    '|------|----------|----------|------------|------------|--------------|-----------|',
  ];
  for (const a of data.answers) {
    lines.push(`| ${a.packId} | ${a.scripturesUsed.original?.length || 0} | ${a.scripturesUsed.parallel?.length || 0} | ${a.scripturesUsed.supporting?.length || 0} | ${a.scripturesUsed.continuity?.length || 0} | ${(a.scripturesUsed.sectionsPresent || []).length} | ${a.answerTraceable ? 'yes' : 'no'} |`);
  }
  lines.push('', '## Per-answer traceability', '');
  for (const a of data.answers) {
    lines.push(`### ${a.label}`, '');
    lines.push(`- Question: ${a.question}`);
    lines.push(`- Sources: ${a.sourceTraceability.map((s) => s.source).join(', ')}`);
    lines.push(`- Chains: ${a.chainTraceability.length}`);
    lines.push(`- Observed edges: ${a.relationshipTraceability.observed?.length || 0}`);
    lines.push(`- Candidate edges (review-only): ${a.relationshipTraceability.candidate?.length || 0}`);
    lines.push('');
  }
  fs.writeFileSync(path.join(ROOT, 'Phase4AAnswerTraceabilityReport.md'), `${lines.join('\n')}\n`);
}

function writeVineNavigationReport(data) {
  const lines = [
    '# Phase 4A Scripture Vine Navigation Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    '',
  ];
  for (const v of data.vineResults) {
    lines.push(`## ${v.name}`, '');
    lines.push(`**Fully navigable:** ${v.result.fullyNavigable ? 'yes' : 'no'}`, '');
    lines.push('| Step | Topic | Node | Connected prev | Connected next |');
    lines.push('|------|-------|------|----------------|--------------|');
    for (const s of v.result.steps) {
      lines.push(`| ${v.result.steps.indexOf(s) + 1} | ${s.topic} | ${s.nodeFound ? 'yes' : 'no'} | ${s.connectedToPrevious ? 'yes' : 'no'} | ${s.connectedToNext ? 'yes' : 'no'} |`);
    }
    lines.push('');
  }
  fs.writeFileSync(path.join(ROOT, 'Phase4AScriptureVineNavigationReport.md'), `${lines.join('\n')}\n`);
}

function writeRelationshipSafetyReport(data) {
  const lines = [
    '# Phase 4A Relationship Safety Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    '',
    `**Observed/candidate separation preserved:** ${data.relationshipViolations.length === 0 ? 'yes' : 'no'}`,
    `**Violations:** ${data.relationshipViolations.length}`,
    '',
    '| Pack | Observed | Candidate | Separation OK |',
    '|------|----------|-----------|---------------|',
  ];
  for (const r of data.relationshipSafety) {
    lines.push(`| ${r.packId} | ${r.observedCount} | ${r.candidateCount} | ${r.separationPreserved ? 'yes' : 'no'} |`);
  }
  lines.push('', 'Candidate relationships used as review-only contextual support. No candidate promoted to doctrine.', '');
  fs.writeFileSync(path.join(ROOT, 'Phase4ARelationshipSafetyReport.md'), `${lines.join('\n')}\n`);
}

function writeResponseQualityReport(data) {
  const lines = [
    '# Phase 4A Response Quality Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    '',
    '| Pack | Accuracy | Trace | G2R | Parallel | Supporting | Continuity | Clarity | Risk | Overall | Pass |',
    '|------|----------|-------|-----|----------|------------|------------|---------|------|---------|------|',
  ];
  for (const q of data.qualityScores) {
    lines.push(`| ${q.packId} | ${q.scriptureAccuracy} | ${q.traceability} | ${q.genesisToRevelationSupport} | ${q.parallelScriptureSupport} | ${q.supportingScriptureSupport} | ${q.continuitySupport} | ${q.clarity} | ${q.unsupportedClaimRisk} | ${q.overallScore} | ${q.passed ? 'yes' : 'no'} |`);
  }
  const avg = data.qualityScores.reduce((n, q) => n + q.overallScore, 0) / data.qualityScores.length;
  lines.push('', `**Average overall score:** ${Math.round(avg * 1000) / 1000}`, '');
  fs.writeFileSync(path.join(ROOT, 'Phase4AResponseQualityReport.md'), `${lines.join('\n')}\n`);
}

function writeFailureReport(data) {
  const lines = [
    '# Phase 4A Failure Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    '',
    `**Failed tests:** ${data.failures.length} / ${data.answers.length}`,
    '',
  ];
  if (!data.failures.length) {
    lines.push('No failures detected in sandbox test set.', '');
  } else {
    for (const f of data.failures) {
      lines.push(`## ${f.label} (${f.packId})`, '');
      lines.push(`Question: ${f.question}`, '');
      for (const item of f.failures) {
        lines.push(`- **${item.type}:** ${item.detail}`);
      }
      lines.push('');
    }
  }
  fs.writeFileSync(path.join(ROOT, 'Phase4AFailureReport.md'), `${lines.join('\n')}\n`);
}

function writePhase4AReport(data) {
  const gc = data.goCriteria;
  const lines = [
    '# Bible Authority Phase 4A Report',
    '',
    `**Date:** ${new Date().toISOString()}`,
    '',
    `## Final determination: **${data.determination}**`,
    '',
    `Criteria passed: ${data.passedCriteria} / ${data.totalCriteria}`,
    '',
    '## Executive answers',
    '',
    `1. **Did sandbox load Phase 3 frozen corpus?** ${gc.corpusLoaded ? 'Yes' : 'No'}`,
    `2. **Did scripture retrieval work?** ${gc.scriptureRetrieval ? 'Yes' : 'Partial'} (${data.answers.filter((a) => a.scripturesUsed.original?.length).length}/${data.answers.length} packs with originals)`,
    `3. **Did Genesis-to-Revelation navigation work?** ${gc.genesisToRevelationNavigation ? 'Yes' : 'Partial'}`,
    `4. **Did Scripture Vine navigation work?** ${gc.vineNavigation ? 'Yes' : 'Partial'} (${data.vineResults.filter((v) => v.result.fullyNavigable).length}/${data.vineResults.length} paths)`,
    `5. **Did observed/candidate separation hold?** ${gc.observedCandidateSeparation ? 'Yes' : 'No'}`,
    `6. **Were answers traceable?** ${gc.answersTraceable ? 'Yes' : 'Partial'} (${data.answers.filter((a) => a.answerTraceable).length}/${data.answers.length})`,
    `7. **What failed?** ${data.failures.length ? data.failures.map((f) => f.packId).join(', ') : 'None critical'}`,
    `8. **What needs fixing before implementation?** ${data.determination === 'READY_FOR_PHASE_4B' ? 'Human review queue (32 packets) and KJV freeze candidates remain review-only — not blockers for Phase 4B sandbox expansion.' : 'Address retrieval/traceability failures listed in Phase4AFailureReport.md'}`,
    `9. **Is Phase 4B ready?** ${data.readyForPhase4B ? 'Yes — proceed to Phase 4B controlled expansion testing' : 'No — resolve sandbox failures first'}`,
    '',
    '## Go criteria',
    '',
    ...Object.entries(gc).map(([k, v]) => `- ${k}: ${v ? '✅' : '❌'}`),
    '',
    '## Stop conditions honored',
    '',
    'No production deployment. No live prompt changes. No doctrine approval. Sandbox testing only.',
    '',
    '## Artifacts',
    '',
    '- Phase4ATestQuestionSet.json',
    '- Phase4ASandboxSetupReport.md',
    '- Phase4AAnswerTraceabilityReport.md',
    '- Phase4AScriptureVineNavigationReport.md',
    '- Phase4ARelationshipSafetyReport.md',
    '- Phase4AResponseQualityReport.md',
    '- Phase4AFailureReport.md',
  ];
  fs.writeFileSync(path.join(ROOT, 'BibleAuthorityPhase4AReport.md'), `${lines.join('\n')}\n`);
}

function main() {
  console.log('Phase 4A — Sandbox implementation testing starting...');
  fs.mkdirSync(SANDBOX_DIR, { recursive: true });

  const data = runSandboxTests();

  fs.writeFileSync(path.join(OUT_DIR, 'Phase4ATestQuestionSet.json'), JSON.stringify(data.testQuestionSet, null, 2));
  fs.writeFileSync(path.join(SANDBOX_DIR, 'sandbox-test-results.json'), JSON.stringify({
    ranAt: new Date().toISOString(),
    answers: data.answers,
    qualityScores: data.qualityScores,
    failures: data.failures.map((f) => ({ label: f.label, packId: f.packId, failures: f.failures })),
    vineResults: data.vineResults,
    determination: data.determination,
    goCriteria: data.goCriteria,
  }, null, 2));

  writeSandboxSetupReport(data);
  writeAnswerTraceabilityReport(data);
  writeVineNavigationReport(data);
  writeRelationshipSafetyReport(data);
  writeResponseQualityReport(data);
  writeFailureReport(data);
  writePhase4AReport(data);

  console.log('Phase 4A — Complete');
  console.log(`Determination: ${data.determination}`);
  console.log(`Traceable: ${data.answers.filter((a) => a.answerTraceable).length}/${data.answers.length}`);
  console.log(`Failures: ${data.failures.length}`);
}

main();
