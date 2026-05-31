const { getPrayerContinuity } = require('./runtimePrayerContinuityEngine');
const { getRelationshipMemory } = require('./runtimeRelationshipMemoryEngine');

function buildPrayerFollowUpLine({ userId }) {
  const prayers = getPrayerContinuity(userId, 5);
  const relationships = getRelationshipMemory(userId, 20);

  const activePrayer = prayers[0];
  const grief = relationships.filter((item) => item.category === 'grief_events').slice(-1)[0];
  const struggle = relationships.filter((item) => item.category === 'recurring_struggles').slice(-1)[0];
  const health = relationships.filter((item) => item.category === 'health_concerns').slice(-1)[0];

  if (activePrayer?.prayerRequest) {
    const topic = activePrayer.topic || 'that concern';
    return {
      line: `How have you been doing since we prayed about ${topic}?`,
      source: 'prayer',
      category: 'prayer_requests',
      confidence: 'high',
      importance: 'high',
    };
  }

  if (grief?.detail) {
    return {
      line: 'How have you been doing since you shared about your loss?',
      source: 'relationship',
      category: 'grief_events',
      confidence: 'high',
      importance: grief.importance || 'high',
    };
  }

  if (struggle?.detail) {
    return {
      line: 'How have you been doing with what you have been carrying lately?',
      source: 'relationship',
      category: 'recurring_struggles',
      confidence: 'medium',
      importance: struggle.importance || 'normal',
    };
  }

  if (health?.issue || health?.detail) {
    const issue = health.issue || 'that health concern';
    return {
      line: `How has ${issue} been since you last mentioned it?`,
      source: 'relationship',
      category: 'health_concerns',
      confidence: 'medium',
      importance: health.importance || 'normal',
    };
  }

  return null;
}

function appendPrayerFollowUp({ userId, reply = '', includeFollowUp = true }) {
  if (!includeFollowUp) return reply;
  const followUp = buildPrayerFollowUpLine({ userId });
  if (!followUp?.line) return reply;
  if (String(reply).includes(followUp.line.slice(0, 24))) return reply;
  return `${String(reply).trim()}\n\n${followUp.line}`;
}

module.exports = {
  buildPrayerFollowUpLine,
  appendPrayerFollowUp,
};
