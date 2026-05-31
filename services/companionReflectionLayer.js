const { getRelationshipMemory } = require('./runtimeRelationshipMemoryEngine');
const { getOpenLoops } = require('./openLoopsEngine');
const { analyzeEmotionalArc } = require('./emotionalArcEngine');
const { getLifeTimeline } = require('./lifeTimelineMemory');
const { getPrayerContinuity } = require('./runtimePrayerContinuityEngine');
const { buildLearningContext } = require('./companionLearningLayer');
const {
  classifyTruthLevel,
  phrasingForTruthLevel,
  TRUTH_LEVEL,
  filterByImportance,
} = require('./memoryTruthfulness');

function collectReflectionFacts(userId) {
  const relationships = filterByImportance(getRelationshipMemory(userId, 30), 'medium');
  const loops = getOpenLoops(userId);
  const arc = analyzeEmotionalArc(userId);
  const timeline = getLifeTimeline(userId, 10);
  const prayers = getPrayerContinuity(userId, 3);
  const learning = buildLearningContext(userId);

  const facts = [];

  for (const item of relationships) {
    if (item.category === 'health_concerns') {
      facts.push({
        type: 'health',
        text: item.issue || item.detail,
        importance: 'high',
        truth: classifyTruthLevel({ hit: item, frequency: item.frequency || 1 }),
      });
    }
    if (item.category === 'grief_events') {
      facts.push({
        type: 'grief',
        text: 'grief after a loss',
        importance: 'high',
        truth: TRUTH_LEVEL.KNOWN,
      });
    }
    if (item.category === 'recurring_struggles' && /tired|fatigue|weary|work/i.test(String(item.detail))) {
      facts.push({
        type: 'fatigue',
        text: 'weariness or long work weeks',
        importance: 'medium',
        truth: classifyTruthLevel({ hit: item, frequency: item.frequency || 1 }),
      });
    }
  }

  for (const loop of loops.slice(0, 2)) {
    if (loop.status === 'open') {
      facts.push({
        type: 'loop',
        text: loop.label,
        importance: loop.importance === 'high' ? 'high' : 'medium',
        truth: TRUTH_LEVEL.LIKELY,
      });
    }
  }

  if (arc.summary) {
    facts.push({ type: 'arc', text: arc.summary, importance: 'medium', truth: TRUTH_LEVEL.LIKELY });
  }

  if (prayers.length) {
    facts.push({
      type: 'prayer',
      text: 'something you asked to pray about',
      importance: 'high',
      truth: TRUTH_LEVEL.KNOWN,
    });
  }

  if (learning.favoriteTopics?.[0] && learning.favoriteTopics[0] !== 'companion') {
    facts.push({
      type: 'study',
      text: `studying ${String(learning.favoriteTopics[0]).replace(/_/g, ' ')}`,
      importance: 'medium',
      truth: TRUTH_LEVEL.LIKELY,
    });
  }

  for (const event of timeline.slice(-3)) {
    if (event.importance === 'high' && event.status !== 'resolved') {
      facts.push({
        type: 'timeline',
        text: event.summary,
        importance: 'high',
        truth: TRUTH_LEVEL.KNOWN,
      });
    }
  }

  return facts.slice(0, 5);
}

function buildCompanionReflection({ userId, message = '', runtimeContext = {} }) {
  const facts = collectReflectionFacts(userId);
  if (!facts.length) {
    return { reflection: null, facts: [], used: false };
  }

  const fragments = [];
  const health = facts.filter((f) => f.type === 'health').map((f) => f.text);
  const grief = facts.some((f) => f.type === 'grief');
  const fatigue = facts.some((f) => f.type === 'fatigue' || /fatigue|tired|weariness/.test(f.text));
  const work = /six days|long work|work week/i.test(String(message)) ||
    facts.some((f) => /work week|working six/i.test(f.text));

  if (health.length) {
    fragments.push(
      phrasingForTruthLevel(
        facts.find((f) => f.type === 'health')?.truth || TRUTH_LEVEL.LIKELY,
        health.length === 1 ? `${health[0]}` : `${health.join(' and ')}`
      ).replace('I remember you mentioning ', '').replace('From what we discussed recently, ', '').replace(/\.$/, '')
    );
  }

  if (work || fatigue) {
    fragments.push('feeling worn down');
  }

  if (grief) {
    fragments.push('carrying grief after a loss');
  }

  const arc = analyzeEmotionalArc(userId);
  if (arc.summary && !fragments.includes(arc.summary)) {
    fragments.push(arc.summary);
  }

  if (!fragments.length) {
    return { reflection: null, facts, used: false };
  }

  const unique = [...new Set(fragments.filter(Boolean))];
  let reflection;

  if (unique.length === 1) {
    reflection = `You've mentioned ${unique[0]}. It makes sense that this weighs on you.`;
  } else if (unique.length === 2) {
    reflection = `You've mentioned ${unique[0]} and ${unique[1]}. It makes sense that you're feeling worn down.`;
  } else {
    reflection = `You've mentioned ${unique.slice(0, -1).join(', ')}, and ${unique[unique.length - 1]}. It makes sense that you're carrying a lot right now.`;
  }

  return {
    reflection,
    facts,
    used: true,
    truthfulness: facts.map((f) => ({ type: f.type, truthLevel: f.truth })),
  };
}

function prependReflection({ userId, reply = '', message = '', runtimeContext = {} }) {
  const { reflection, used, truthfulness } = buildCompanionReflection({ userId, message, runtimeContext });
  if (!reflection || String(reply).includes(reflection.slice(0, 24))) {
    return { reply, reflectionUsed: false, truthfulness: [] };
  }
  return {
    reply: `${reflection}\n\n${String(reply).trim()}`,
    reflectionUsed: used,
    truthfulness,
  };
}

module.exports = {
  collectReflectionFacts,
  buildCompanionReflection,
  prependReflection,
};
