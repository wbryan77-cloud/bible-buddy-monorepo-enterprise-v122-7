#!/usr/bin/env node
/**
 * Replay historical Founder failure families into learning candidates (no auto-implement).
 */
const fs = require('fs');
const path = require('path');
const { recordFounderExperienceFeedback } = require('../services/founderExperienceFeedback');
const { runRetrievalShadowCompare } = require('../services/retrievalShadowLab');
const { evaluateClaimGrounding } = require('../services/claimGroundingEvaluator');
const { runRecurringFailureWatcher } = require('../services/experienceWatchers');

const OUT = path.join(
  __dirname,
  '../docs/evidence-candidates/bible-intelligence-engine-v1.1-founder-experience-loop',
);

const FAILURES = [
  {
    id: 'resurrection_followup',
    mark: 'WRONG_TOPIC',
    expectedBehavior: 'Distinguish first/second resurrection outcomes; answer current follow-up',
    family: 'resurrection',
  },
  {
    id: 'satan_release_inference',
    mark: 'WRONG_INFERENCE',
    expectedBehavior: 'Answer yes/no first; distinguish explicit Scripture from inference',
    family: 'revelation20',
  },
  {
    id: 'feasts_sabbath_confusion',
    mark: 'WRONG_TOPIC',
    expectedBehavior: 'Keep feast question Scripture-grounded; route holiday-origin asks to history',
    family: 'feasts',
  },
  {
    id: 'jeremiah_keyword',
    mark: 'WRONG_TOPIC',
    expectedBehavior: 'Answer Jeremiah 10 question without unrelated keyword hijack',
    family: 'jeremiah',
  },
  {
    id: 'jesus_appearance',
    mark: 'WRONG_INFERENCE',
    expectedBehavior: 'Separate Revelation 1:14-15 explicit text from racial inference',
    family: 'revelation1',
  },
  {
    id: 'deut28_history_switch',
    mark: 'WRONG_HISTORY',
    expectedBehavior: 'Leave Deuteronomy dump when user asks history-only',
    family: 'deut28_history',
  },
  {
    id: 'general_history_refusal',
    mark: 'INCOMPLETE',
    expectedBehavior: 'Answer ordinary historical questions without doctrine refusal loop',
    family: 'history',
  },
  {
    id: 'app_identity',
    mark: 'INCOMPLETE',
    expectedBehavior: 'Identify BibleBuddy clearly as Scripture-grounded companion',
    family: 'app_identity',
  },
  {
    id: 'emotional_companion',
    mark: 'NOT_A_COMPANION',
    expectedBehavior: 'Respond warmly to difficult-day statements without doctrine gate',
    family: 'emotional',
  },
  {
    id: 'prayer_specificity',
    mark: 'INCOMPLETE',
    expectedBehavior: 'Pray specifically for stated burden',
    family: 'prayer',
  },
  {
    id: 'memory_miss',
    mark: 'MEMORY_MISS',
    expectedBehavior: 'Recall consented burden from prior turn when asked',
    family: 'memory',
  },
  {
    id: 'correction_fatigue',
    mark: 'REJECTED',
    expectedBehavior: 'Acknowledge correction without repeating the same mistake',
    family: 'correction',
  },
  {
    id: 'clarification_loop',
    mark: 'INCOMPLETE',
    expectedBehavior: 'Stop clarification loops; answer the current ask',
    family: 'clarification',
  },
  {
    id: 'scripture_dump',
    mark: 'TOO_LONG',
    expectedBehavior: 'Avoid run-on full-chapter dumps; honor short/brief asks',
    family: 'length',
  },
];

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const results = [];
  for (const f of FAILURES) {
    const r = recordFounderExperienceFeedback({
      mark: f.mark,
      requestId: `replay-${f.id}`,
      expectedBehavior: f.expectedBehavior,
      topic: f.family,
      route: 'replay',
      notes: `Historical Founder failure replay: ${f.id}`,
    });
    results.push({ ...f, ...r });
  }
  const shadow = runRetrievalShadowCompare({
    message: 'What does Deuteronomy 28:68 explicitly say?',
    productionPack: { scriptureRefs: ['Deuteronomy 28:68'] },
    requestId: 'replay-shadow',
  });
  const grounding = evaluateClaimGrounding({
    replyText: 'Scripture does not state a modern ethnic population in Deuteronomy 28:68 itself.',
    evidenceRefs: ['Deuteronomy 28:68'],
    requestId: 'replay-ground',
  });
  const watchers = runRecurringFailureWatcher({ limit: 500 });
  const uniqueLearningIds = [...new Set(results.map((r) => r.learningRecordId).filter(Boolean))];
  const summary = {
    replayed: results.length,
    uniqueLearningRecords: uniqueLearningIds.length,
    duplicatesSuppressed: results.filter((r) => r.duplicateLearningRecord).length,
    shadowMode: shadow.mode,
    productionReplacement: shadow.productionReplacement,
    groundingCreatesDoctrine: grounding.summary.groundingCreatesDoctrine,
    watchersCanMutate: watchers.canMutateProduction,
    results,
  };
  fs.writeFileSync(path.join(OUT, 'replay-validation.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main();
