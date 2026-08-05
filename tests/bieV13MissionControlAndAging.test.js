/**
 * BIE v1.3 — Mission Control + knowledge aging (nonmutating)
 * Run: node --test tests/bieV13MissionControlAndAging.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildFounderMissionControlDaily,
  buildFounderMissionControlWeekly,
} = require('../services/founderMissionControl');
const { runKnowledgeAgingPass, SCRIPTURE_DOES_NOT_DECAY } = require('../services/knowledgeAgingShadow');
const { buildDailyBriefing, buildWeeklyBriefing } = require('../services/adminBriefingGenerator');
const { recordFounderExperienceFeedback } = require('../services/founderExperienceFeedback');
const { buildRankedRecommendations } = require('../services/recommendationIntelligence');
const { appendExperienceEvent } = require('../services/experienceEventLedger');

describe('BIE v1.3 Mission Control and aging', () => {
  it('1. daily Mission Control aggregates without mutation', () => {
    const mc = buildFounderMissionControlDaily();
    assert.equal(mc.productionMutation, false);
    assert.equal(mc.autonomousApproval, false);
    assert.ok(Array.isArray(mc.topThreeEvidenceBackedPriorities));
    assert.equal(mc.topThreeEvidenceBackedPriorities.length, 3);
    assert.equal(mc.privacy.rawPrivateConversationBrowser, false);
  });

  it('2. weekly Mission Control stays shadow', () => {
    const w = buildFounderMissionControlWeekly();
    assert.equal(w.mode, 'SHADOW_AGGREGATION');
    assert.equal(w.productionMutation, false);
  });

  it('3. knowledge aging cannot decay Scripture and stays shadow', () => {
    assert.equal(SCRIPTURE_DOES_NOT_DECAY, true);
    const aging = runKnowledgeAgingPass({ limit: 50 });
    assert.equal(aging.mode, 'SHADOW');
    assert.equal(aging.productionMutation, false);
    assert.equal(aging.scriptureDoesNotDecay, true);
    assert.equal(aging.doctrineContractsNoAutoDecay, true);
  });

  it('4. briefing includes Mission Control sections', () => {
    const d = buildDailyBriefing();
    assert.ok(d.founderMissionControl);
    assert.equal(d.founderMissionControl.productionMutation, false);
    const w = buildWeeklyBriefing();
    assert.ok(w.founderMissionControlWeekly);
  });

  it('5. operational learning can create recommendation candidates without mutating production answers', async () => {
    for (let i = 0; i < 3; i += 1) {
      appendExperienceEvent({
        eventType: 'ANSWER_REJECTED',
        requestId: `v13-res-${Date.now()}-${i}`,
        topic: 'resurrection_chronology',
        founderFeedback: { mark: 'INCOMPLETE' },
      });
    }
    recordFounderExperienceFeedback({
      mark: 'INCOMPLETE',
      requestId: `v13-founder-${Date.now()}`,
      expectedBehavior:
        'Distinguish Jesus’ resurrection from first/second saint resurrection outcomes; answer current follow-up',
      topic: 'resurrection_chronology',
      route: 'reason_first_openai',
    });
    const ranked = await buildRankedRecommendations({ persist: true });
    assert.equal(ranked.ok, true);
    assert.ok(typeof ranked.recommendationCount === 'number');
  });
});
