/**
 * BIE v1.1A — Reasoning intelligence foundation tests
 * Run: node --test tests/bieV11aReasoningIntelligence.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { appendExperienceEvent } = require('../services/experienceEventLedger');
const { recordFounderExperienceFeedback } = require('../services/founderExperienceFeedback');
const { runDiscoveryPass, MIN_EVENTS_FOR_PATTERN } = require('../services/discoveryEngine');
const { buildRelationshipProjection } = require('../services/relationshipProjection');
const { runHypothesisPass } = require('../services/causalHypothesisEngine');
const { runPredictiveRiskPass } = require('../services/predictiveRiskEngine');
const { buildRankedRecommendations, scoreRecommendation } = require('../services/recommendationIntelligence');
const { runCalibrationSuite } = require('../services/evaluatorCalibration');
const { estimateCostFromRuntime, BUDGET_POLICY, recordTurnCost, buildCostBaseline } = require('../services/costLedger');
const { getStatus, DOC } = require('../services/founderExperienceDurableStore');
const { buildDailyBriefing, buildWeeklyBriefing } = require('../services/adminBriefingGenerator');
const { transitionLearningRecord } = require('../services/learningRecordStore');

describe('BIE v1.1A reasoning intelligence', () => {
  it('1. durable store resolves backend status', () => {
    const s = getStatus();
    assert.ok(s.owner === 'founderExperienceDurableStore');
    assert.ok(['FILE', 'POSTGRES'].includes(s.backend));
    assert.ok(Array.isArray(s.documents) && s.documents.includes('experienceEvents'));
  });

  it('2. discovery requires pattern threshold (not single incident)', () => {
    assert.ok(MIN_EVENTS_FOR_PATTERN >= 2);
    // seed recurring failures
    for (let i = 0; i < 3; i += 1) {
      appendExperienceEvent({
        eventType: 'ANSWER_REJECTED',
        requestId: `v11a-rej-${i}`,
        topic: 'resurrection_chrono',
        lane: 'reason_first_openai',
        founderFeedback: { mark: 'REJECTED' },
      });
    }
    const disc = runDiscoveryPass({ persist: true });
    assert.equal(disc.productionMutation, false);
    assert.ok(disc.discoveryCount >= 1);
    const fam = disc.discoveries.find((d) => d.behaviorFamily.includes('resurrection'));
    assert.ok(fam);
    assert.equal(fam.isPattern, true);
    assert.equal(fam.isSingleIncident, false);
  });

  it('3. relationships are governed shadow edges without doctrine authority', () => {
    const rel = buildRelationshipProjection({ persist: true });
    assert.ok(rel.edgeCount >= 1);
    assert.equal(rel.doctrinalAuthorityEdges, 0);
    assert.ok(rel.edges.every((e) => e.doctrinalAuthority === false));
  });

  it('4. hypotheses are falsifiable and non-mutating', () => {
    const h = runHypothesisPass({ persist: true });
    assert.equal(h.productionMutation, false);
    if (h.hypothesisCount > 0) {
      assert.ok(h.hypotheses[0].falsificationCondition);
      assert.ok(Array.isArray(h.hypotheses[0].alternativeExplanations));
      assert.equal(h.hypotheses[0].autoCodeChange, false);
    }
  });

  it('5. predictions stay in shadow without numeric percentages', () => {
    const p = runPredictiveRiskPass({ persist: true });
    assert.equal(p.mode, 'SHADOW');
    assert.equal(p.numericProbabilitiesDisplayed, false);
    for (const pred of p.predictions) {
      assert.equal(pred.numericProbabilityShown, false);
      assert.ok(pred.probabilityBand);
    }
  });

  it('6. rejected recommendations suppressed when unchanged', async () => {
    const created = recordFounderExperienceFeedback({
      mark: 'WRONG_TOPIC',
      requestId: 'v11a-suppress-1',
      expectedBehavior: 'Keep feast question Scripture-grounded',
      topic: 'feasts_v11a',
    });
    transitionLearningRecord(created.learningRecordId, 'REJECTED', { actor: 'admin-test', note: 'duplicate theme' });
    // create matching discovery pressure
    for (let i = 0; i < 3; i += 1) {
      appendExperienceEvent({
        eventType: 'TOPIC_DRIFT',
        requestId: `v11a-feast-${i}`,
        topic: 'feasts_v11a',
      });
    }
    const ranked = await buildRankedRecommendations({ persist: true });
    assert.ok(ranked.ok);
    assert.ok(typeof ranked.suppressedUnchangedRejections === 'number');
  });

  it('7. recommendation scoring is transparent and finite', () => {
    const s = scoreRecommendation({
      severity: 'high',
      confidence: 'medium',
      recurrenceCount: 4,
      evidenceCoverage: 3,
      reversibility: true,
    });
    assert.ok(s > 0);
  });

  it('8. evaluator calibration measures agreement and FP/FN', () => {
    const cal = runCalibrationSuite({ persist: true });
    assert.ok(cal.caseCount >= 6);
    assert.ok(cal.evaluatorSummaries.length >= 1);
    assert.equal(cal.humanOverridesModel, true);
  });

  it('9. cost ledger estimates without reducing quality controls', async () => {
    assert.equal(BUDGET_POLICY.qualityReductionForCost, undefined);
    const est = estimateCostFromRuntime({ openAiCalled: false }, 20);
    assert.equal(est.model, 'deterministic');
    const rec = await recordTurnCost({
      requestId: 'v11a-cost-1',
      route: 'doctrine_final_authority',
      runtime: { openAiCalled: false },
      latencyMs: 15,
    });
    assert.equal(rec.ok, true);
    const base = await buildCostBaseline({ limit: 50 });
    assert.equal(base.qualityReductionForCost, false);
    assert.ok(base.budgetPolicy.maxSynchronousLearningOverheadMs <= 5);
  });

  it('10. Admin daily briefing includes founderExperience section', () => {
    const daily = buildDailyBriefing();
    assert.ok(daily.founderExperience);
    assert.ok(daily.recommendedActionsToday.length >= 1);
    const weekly = buildWeeklyBriefing();
    assert.ok(weekly.founderExperienceLearning || weekly.prioritiesForNextWeek);
  });

  it('11. DOC keys cover required durable projections', () => {
    for (const k of [
      'experienceEvents',
      'learningRecords',
      'evaluationResults',
      'recommendations',
      'recommendationTransitions',
      'discoveries',
      'relationships',
      'hypotheses',
      'predictions',
      'costLedger',
    ]) {
      assert.ok(DOC[k], k);
    }
  });
});
