const { buildLearningContext } = require('./companionLearningLayer');
const { buildMemoryReadContext } = require('./memoryRecallEngine');
const { getPrayerContinuity } = require('./runtimePrayerContinuityEngine');
const { getRelationshipMemory } = require('./runtimeRelationshipMemoryEngine');
const { getOpenLoops } = require('./openLoopsEngine');
const { getStudyJourneyContext } = require('./studyJourneyEngine');
const { analyzeEmotionalArc } = require('./emotionalArcEngine');

function buildCompanionNextSteps({ userId, message = '', runtimeContext = {}, mode = 'companion' }) {
  const learning = buildLearningContext(userId);
  const memory = buildMemoryReadContext(userId);
  const prayers = getPrayerContinuity(userId, 3);
  const relationships = getRelationshipMemory(userId, 8);

  const lastStudy = (memory.studySessions || []).slice(-1)[0];
  const favoriteTopic = learning.favoriteTopics?.[0] || null;
  const griefMemory = relationships.find((item) => item.category === 'grief_events');
  const prayerMemory = prayers[0] || relationships.find((item) => item.category === 'prayer_requests');
  const restStruggle = relationships.find((item) => item.category === 'recurring_struggles');
  const openLoops = getOpenLoops(userId).slice(0, 2);
  const studyJourney = getStudyJourneyContext({ userId });
  const emotionalArc = analyzeEmotionalArc(userId);

  const suggestions = [];
  const nextSteps = [];

  if (studyJourney.enabled && studyJourney.nextLabel) {
    suggestions.push(`continue your study journey into ${studyJourney.nextLabel}`);
    nextSteps.push(`Continue the study journey into ${studyJourney.nextLabel}.`);
  } else if (lastStudy?.topic) {
    suggestions.push(`continue your study of ${String(lastStudy.topic).replace(/_/g, ' ')}`);
    nextSteps.push(`Continue studying ${String(lastStudy.topic).replace(/_/g, ' ')}.`);
  } else if (favoriteTopic) {
    suggestions.push(`return to ${String(favoriteTopic).replace(/_/g, ' ')}`);
    nextSteps.push(`Revisit ${String(favoriteTopic).replace(/_/g, ' ')} in Scripture.`);
  }

  if (prayerMemory) {
    suggestions.push('pray through what you have been carrying');
    nextSteps.push('Pray through an active concern.');
  }

  if (griefMemory && mode !== 'reflection' && !/knee|pain|health|hurt|ache/i.test(String(message))) {
    suggestions.push('follow up gently on grief you shared before');
    nextSteps.push('Sit with a comforting Scripture for grief.');
  }

  if (restStruggle || mode === 'wellness' || emotionalArc.patterns?.includes('fatigue recurring')) {
    suggestions.push('rest with a gentle passage');
    nextSteps.push('Take a moment of rest with Psalm 23 or Matthew 11:28-30.');
  }

  if (openLoops.length && !griefMemory) {
    suggestions.push(`gently check in on ${openLoops[0].label}`);
    nextSteps.push(`When ready, revisit ${openLoops[0].label}.`);
  }

  if (!suggestions.length) {
    return {
      gentleSuggestion: null,
      nextSteps: ['Share what is on your heart.', 'Name a Scripture or topic to explore.'],
      suggestions: [],
    };
  }

  const gentleSuggestion = `If it would help, we could ${suggestions.slice(0, 3).join(', or ')} — only if you want to.`;

  return {
    gentleSuggestion,
    nextSteps: nextSteps.slice(0, 4),
    suggestions,
  };
}

module.exports = {
  buildCompanionNextSteps,
};
