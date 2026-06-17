#!/usr/bin/env node
/**
 * Phase 5J.1 — Module load audit (Linux case-sensitive simulation).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const REPORT = path.join(ROOT, 'Phase5J1ModuleLoadAudit.md');

const REQUIRED_SERVICES = [
  'services/bibleCompanionOrchestrator.js',
  'services/companionIntentIntelligence.js',
  'services/relationshipContextModel.js',
  'services/companionMemoryManager.js',
  'services/companionResponseBuilder.js',
  'services/relationshipMemoryEngine.js',
  'services/practicalGuidanceEngine.js',
  'services/companionStyleGuard.js',
  'services/scriptureReasoningPlanner.js',
  'services/noGlitchTurnContract.js',
  'services/bibleNaturalConcordanceBuilder.js',
  'services/bibleSemanticConceptNormalizer.js',
  'services/bibleWordSenseEngine.js',
  'services/bncSafetyValidator.js',
  'services/followUpContextResolver.js',
  'services/twoWitnessStandard.js',
  'services/directAnswerFormatter.js',
  'services/bibleConceptConcordance.js',
  'services/bibleWideReasoningEngine.js',
  'services/userCorrectionMemory.js',
  'services/reflectionMemoryEngine.js',
  'services/runtimeHealthMonitor.js',
  'services/responseGuarantee.js',
  'services/safeJsonlWriter.js',
  'services/alphaConversationCapture.js',
  'services/alphaFeedbackCapture.js',
  'services/alphaIssueAggregator.js',
  'services/alphaNotificationScheduler.js',
  'services/alphaTesterManager.js',
  'routes/alphaAdmin.js',
  'routes/alphaTest.js',
  'routes/buddy.js',
  'services/conversationAnchorEngine.js',
  'services/humanNeedDetector.js',
  'services/companionCuriosityEngine.js',
  'services/practicalWisdomEngine.js',
  'services/prayerCompanionEngine.js',
  'services/companionIdentityEngine.js',
  'services/relationshipSummaryEngine.js',
];

const results = [];

for (const rel of REQUIRED_SERVICES) {
  const abs = path.join(ROOT, rel);
  const entry = { file: rel, exists: fs.existsSync(abs), resolve: null, load: null, error: null };
  if (!entry.exists) {
    entry.error = 'file_missing';
    results.push(entry);
    continue;
  }
  try {
    entry.resolve = require.resolve(abs);
  } catch (e) {
    entry.error = `resolve: ${e.message}`;
    results.push(entry);
    continue;
  }
  try {
    require(abs);
    entry.load = 'ok';
  } catch (e) {
    entry.load = 'fail';
    entry.error = e.message;
  }
  results.push(entry);
}

const failed = results.filter((r) => r.error || r.load === 'fail');
const md = [
  '# Phase 5J.1 Module Load Audit',
  '',
  `**Date:** ${new Date().toISOString()}`,
  `**Result:** ${failed.length === 0 ? 'PASS' : 'FAIL'} (${results.length - failed.length}/${results.length})`,
  '',
  ...results.map((r) => `- [${r.load === 'ok' ? 'OK' : 'FAIL'}] ${r.file}${r.error ? ` — ${r.error}` : ''}`),
  '',
].join('\n');
fs.writeFileSync(REPORT, md, 'utf8');
console.log(`Module load: ${failed.length === 0 ? 'PASS' : 'FAIL'} (${failed.length} failures)`);
if (failed.length) process.exitCode = 1;
