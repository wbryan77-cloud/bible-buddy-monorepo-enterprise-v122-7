const { appendTimelineEvent, STATUS, IMPORTANCE } = require('./lifeTimelineMemory');
const { detectOpenLoop, upsertOpenLoop, pickGentleLoopRevisit } = require('./openLoopsEngine');
const { recordMilestone, detectCompanionMilestones, buildMilestoneAcknowledgment } = require('./milestoneTracking');
const { recordEmotionalSnapshot, analyzeEmotionalArc } = require('./emotionalArcEngine');
const { getStudyJourneyContext } = require('./studyJourneyEngine');
const { buildCompanionReflection, prependReflection } = require('./companionReflectionLayer');
const { buildTruthfulnessMeta, retainHighImportanceMemories } = require('./memoryTruthfulness');
const { getRelationshipMemory } = require('./runtimeRelationshipMemoryEngine');
const { getOpenLoops } = require('./openLoopsEngine');
const { getLifeTimeline, getActiveJourneys } = require('./lifeTimelineMemory');
const { getMilestones } = require('./milestoneTracking');
const { savePersonalityContinuity } = require('./runtimePersonalityContinuity');
const { buildLearningContext } = require('./companionLearningLayer');
const { getPersonalityContinuity } = require('./runtimePersonalityContinuity');

let getRelationalProfile = () => null;
try {
  ({ getProfile: getRelationalProfile } = require('./relationalPresence'));
} catch (_) {}

function detectTimelineEvent(message = '', runtimeContext = {}, doctrineTopic = null, structured = {}) {
  const lower = String(message).toLowerCase();

  if (/lost (a |my )?(friend|mother|father|child|spouse)/.test(lower) || /passed away|funeral/.test(lower)) {
    return { eventType: 'grief', summary: message.slice(0, 200), importance: IMPORTANCE.HIGH, linkedCategory: 'grief_events' };
  }
  if (/\b(pray|prayer)\b/.test(lower)) {
    return { eventType: 'prayer', summary: message.slice(0, 200), importance: IMPORTANCE.HIGH, linkedCategory: 'prayer_requests', status: STATUS.WAITING };
  }
  if (/knee|blood pressure|cholesterol|fatigue|medical|health/.test(lower)) {
    return { eventType: 'health', summary: message.slice(0, 200), importance: IMPORTANCE.HIGH, linkedCategory: 'health_concerns' };
  }
  if (/job opportunity|interview|new job/.test(lower)) {
    return { eventType: 'job', summary: message.slice(0, 200), importance: IMPORTANCE.MEDIUM, status: STATUS.WAITING };
  }
  if (doctrineTopic || structured?.mode === 'study') {
    return {
      eventType: 'study',
      summary: `Studying ${doctrineTopic || 'Scripture'}: ${message.slice(0, 120)}`,
      importance: IMPORTANCE.MEDIUM,
      linkedCategory: 'favorite_study_topics',
    };
  }
  if (/follow.?up|update|progress|better|improved|answered/.test(lower)) {
    return { eventType: 'follow_up', summary: message.slice(0, 200), importance: IMPORTANCE.MEDIUM, status: STATUS.FOLLOW_UP };
  }
  return null;
}

function persistCompanionRelationshipState({
  userId,
  message = '',
  structured = {},
  runtimeContext = {},
  doctrineTopic = null,
}) {
  if (!userId || !message) return { persisted: false };

  savePersonalityContinuity({ userId, message });

  const timelineEvent = detectTimelineEvent(message, runtimeContext, doctrineTopic, structured);
  if (timelineEvent) {
    appendTimelineEvent({ userId, ...timelineEvent });
  }

  const loop = detectOpenLoop(message);
  if (loop) {
    upsertOpenLoop({
      userId,
      loopKey: loop.key,
      label: loop.label,
      detail: loop.detail,
      importance: loop.key.includes('grief') || loop.key.includes('prayer') || loop.key.includes('health') ? 'high' : 'medium',
    });
  }

  recordEmotionalSnapshot({ userId, message, runtimeContext });

  if (doctrineTopic) {
    const milestones = detectCompanionMilestones({ userId, message, doctrineTopic });
    for (const milestone of milestones) {
      recordMilestone({ userId, ...milestone });
    }
  } else {
    for (const milestone of detectCompanionMilestones({ userId, message })) {
      recordMilestone({ userId, ...milestone });
    }
  }

  if (/answered|thankful|prayer answered|improved|better now|good news/.test(String(message).toLowerCase())) {
    if (loop) {
      const { resolveOpenLoop } = require('./openLoopsEngine');
      resolveOpenLoop({ userId, loopKey: loop.key });
    }
  }

  return { persisted: true };
}

function buildCompanionRelationshipContext(userId) {
  const relationships = retainHighImportanceMemories(getRelationshipMemory(userId, 40), 30);
  const loops = getOpenLoops(userId);
  const timeline = getLifeTimeline(userId, 15);
  const journeys = getActiveJourneys(userId);
  const milestones = getMilestones(userId, 5);
  const emotionalArc = analyzeEmotionalArc(userId);
  const studyJourney = getStudyJourneyContext({ userId });
  const personality = getPersonalityContinuity(userId);
  const presence = typeof getRelationalProfile === 'function' ? getRelationalProfile(userId) : null;
  const learning = buildLearningContext(userId);

  const hits = [
    ...relationships.map((r) => ({ ...r, source: 'relationship', category: r.category })),
    ...loops.map((l) => ({ ...l, source: 'open_loop', category: l.loopKey, message: l.detail })),
  ];

  return {
    relationships,
    openLoops: loops,
    timeline,
    activeJourneys: journeys,
    milestones,
    emotionalArc,
    studyJourney,
    personality,
    presence,
    learning,
    truthfulness: buildTruthfulnessMeta(hits),
    loopRevisit: pickGentleLoopRevisit(userId),
    milestoneAck: buildMilestoneAcknowledgment(userId),
  };
}

function enrichResponseWithRelationshipIntelligence({
  userId,
  reply = '',
  message = '',
  runtimeContext = {},
  includeReflection = true,
  includeLoopRevisit = true,
  includeStudyJourney = false,
  doctrineTopic = null,
}) {
  const ctx = buildCompanionRelationshipContext(userId);
  let enriched = String(reply);

  if (includeReflection) {
    const reflected = prependReflection({ userId, reply: enriched, message, runtimeContext });
    enriched = reflected.reply;
  }

  if (ctx.milestoneAck && !enriched.includes(ctx.milestoneAck.slice(0, 20))) {
    enriched = `${ctx.milestoneAck}\n\n${enriched}`;
  }

  if (includeStudyJourney) {
    const journey = getStudyJourneyContext({ userId, doctrineTopic });
    if (journey.enabled && journey.phrase && !enriched.includes(journey.phrase.slice(0, 24))) {
      enriched = `${enriched}\n\n${journey.phrase}`;
    }
  } else if (
    ctx.studyJourney?.enabled &&
    ctx.studyJourney.phrase &&
    /study|continue|sabbath|kingdom/i.test(message) &&
    !/Last time we were looking at|next step is|walk through that passage/i.test(enriched)
  ) {
    if (!enriched.includes(ctx.studyJourney.phrase.slice(0, 24))) {
      enriched = `${enriched}\n\n${ctx.studyJourney.phrase}`;
    }
  }

  if (includeLoopRevisit && ctx.loopRevisit?.phrase && !enriched.includes('check in on')) {
    enriched = `${enriched}\n\n${ctx.loopRevisit.phrase}`;
  }

  return {
    reply: enriched,
    relationshipContext: ctx,
    reflectionUsed: includeReflection,
  };
}

module.exports = {
  persistCompanionRelationshipState,
  buildCompanionRelationshipContext,
  enrichResponseWithRelationshipIntelligence,
};
