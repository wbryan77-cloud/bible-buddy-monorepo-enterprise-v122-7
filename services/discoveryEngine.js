/**
 * BIE v1.1A — Pattern / discovery engine (extends learning-record owner).
 * Requires minimum evidence threshold before recommendation eligibility.
 * Shadow/nonmutating: does not change Companion answers.
 */

const crypto = require('crypto');
const { readExperienceEvents } = require('./experienceEventLedger');
const { listLearningRecords } = require('./learningRecordStore');
const { upsertById, DOC, MAX } = require('./founderExperienceDurableStore');

const MIN_EVENTS_FOR_PATTERN = 2;
const MIN_EVENTS_FOR_RECOMMENDATION = 3;

const DISCOVERY_TYPES = Object.freeze([
  'RECURRING_FAILURE',
  'RECURRING_SUCCESS',
  'TRUST_GAIN_PATTERN',
  'TRUST_BREAK_PATTERN',
  'RETRIEVAL_GAP_PATTERN',
  'MEMORY_PATTERN',
  'FOLLOW_UP_PATTERN',
  'CORRECTION_PATTERN',
  'EVIDENCE_UTILIZATION_PATTERN',
  'LATENCY_PATTERN',
  'COST_PATTERN',
  'DRIFT_PATTERN',
  'RELATIONSHIP_DISCOVERY',
  'RESEARCH_OPPORTUNITY',
  'POSSIBLE_REGRESSION',
]);

const FAIL_EVENTS = new Set([
  'ANSWER_REJECTED',
  'CURRENT_MESSAGE_MISS',
  'TOPIC_DRIFT',
  'INCOMPLETE_ANSWER',
  'SCRIPTURE_FIDELITY_FAILURE',
  'HISTORICAL_ACCURACY_FAILURE',
  'GROUNDING_FAILURE',
  'MEMORY_MISS',
  'MEMORY_OVERREACH',
  'COMPANION_TRUST_BREAK',
  'PRAYER_GENERIC_FAILURE',
  'RETRIEVAL_GAP',
]);

const SUCCESS_EVENTS = new Set([
  'ANSWER_ACCEPTED',
  'COMPANION_TRUST_GAIN',
  'PRAYER_SUCCESS',
  'MEMORY_SUCCESS',
]);

function discoveryKey(type, family) {
  return crypto.createHash('sha256').update(`${type}|${family}`).digest('hex').slice(0, 20);
}

function inferFamily(event) {
  return String(event.topic || event.lane || event.founderFeedback?.mark || event.eventType || 'general')
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function buildDiscoveriesFromEvents(events = []) {
  const buckets = new Map();
  for (const e of events) {
    let type = null;
    if (FAIL_EVENTS.has(e.eventType)) type = 'RECURRING_FAILURE';
    else if (SUCCESS_EVENTS.has(e.eventType)) type = 'RECURRING_SUCCESS';
    else if (e.eventType === 'DRIFT_ALERT') type = 'DRIFT_PATTERN';
    else if (e.eventType === 'RESEARCH_OPPORTUNITY') type = 'RESEARCH_OPPORTUNITY';
    else if (e.eventType === 'MEMORY_MISS' || e.eventType === 'MEMORY_OVERREACH') type = 'MEMORY_PATTERN';
    if (!type) continue;
    if (e.eventType === 'COMPANION_TRUST_GAIN') type = 'TRUST_GAIN_PATTERN';
    if (e.eventType === 'COMPANION_TRUST_BREAK') type = 'TRUST_BREAK_PATTERN';
    const family = inferFamily(e);
    const key = discoveryKey(type, family);
    if (!buckets.has(key)) {
      buckets.set(key, {
        discoveryId: `disc_${key}`,
        discoveryType: type,
        behaviorFamily: family,
        supportingEventIds: [],
        supportingConversationIds: [],
        affectedReleases: new Set(),
        recurrenceCount: 0,
        firstSeen: e.timestamp,
        lastSeen: e.timestamp,
        latencies: [],
      });
    }
    const b = buckets.get(key);
    b.supportingEventIds.push(e.eventId);
    if (e.conversationId) b.supportingConversationIds.push(e.conversationId);
    if (e.releaseCommit) b.affectedReleases.add(e.releaseCommit);
    b.recurrenceCount += 1;
    b.firstSeen = b.firstSeen < e.timestamp ? b.firstSeen : e.timestamp;
    b.lastSeen = b.lastSeen > e.timestamp ? b.lastSeen : e.timestamp;
    if (e.latencyMs) b.latencies.push(Number(e.latencyMs));
  }

  const discoveries = [];
  for (const b of buckets.values()) {
    if (b.recurrenceCount < MIN_EVENTS_FOR_PATTERN) continue; // incident only below threshold
    const isFailure = String(b.discoveryType).includes('FAILURE') || String(b.discoveryType).includes('BREAK');
    discoveries.push({
      discoveryId: b.discoveryId,
      discoveryType: b.discoveryType,
      behaviorFamily: b.behaviorFamily,
      supportingEventIds: b.supportingEventIds.slice(-40),
      supportingConversationIds: [...new Set(b.supportingConversationIds)].slice(-40),
      affectedClients: ['biblebuddy'],
      affectedReleases: [...b.affectedReleases],
      recurrenceCount: b.recurrenceCount,
      firstSeen: b.firstSeen,
      lastSeen: b.lastSeen,
      trend: b.recurrenceCount >= 5 ? 'rising' : 'stable',
      confidence: b.recurrenceCount >= MIN_EVENTS_FOR_RECOMMENDATION ? 'medium' : 'low',
      severity: b.recurrenceCount >= 5 && isFailure ? 'high' : isFailure ? 'medium' : 'low',
      userImpact: isFailure ? 'degraded_answer_quality' : 'positive_pattern',
      founderImpact: isFailure ? 'requires_review' : 'preserve',
      evidenceCoverage: b.supportingEventIds.length,
      counterexamples: [],
      suspectedOwner: 'openAiFirstCompanionRuntime/companionDoctrineRouter',
      suspectedMechanism: `${b.discoveryType} clustered on ${b.behaviorFamily}`,
      alternativeExplanations: [
        'sampling bias',
        'release-specific transient',
        'incomplete instrumentation on alternate routes',
      ],
      privacyClassification: 'INTERNAL_GOVERNANCE',
      recommendationEligibility: b.recurrenceCount >= MIN_EVENTS_FOR_RECOMMENDATION,
      adminStatus: 'OBSERVED',
      supersededBy: null,
      measuredOutcome: null,
      isPattern: true,
      isSingleIncident: false,
      mutationProhibited: true,
      createdAt: new Date().toISOString(),
    });
  }
  return discoveries;
}

function runDiscoveryPass({ limit = 800, persist = true } = {}) {
  const events = readExperienceEvents({ limit });
  const discoveries = buildDiscoveriesFromEvents(events);
  // Enrich with learning-record families
  const learning = listLearningRecords({ limit: 200 });
  for (const lr of learning) {
    if ((lr.recurrenceCount || 1) < MIN_EVENTS_FOR_PATTERN) continue;
    const type = lr.governanceClassification === 'ACCEPTED_OUTCOME' ? 'RECURRING_SUCCESS' : 'RECURRING_FAILURE';
    const key = discoveryKey(type, lr.behaviorFamily);
    if (discoveries.some((d) => d.discoveryId === `disc_${key}`)) continue;
    discoveries.push({
      discoveryId: `disc_${key}`,
      discoveryType: type,
      behaviorFamily: lr.behaviorFamily,
      supportingEventIds: lr.sourceEventIds || [],
      supportingConversationIds: [],
      affectedClients: ['biblebuddy'],
      affectedReleases: lr.releaseCommit ? [lr.releaseCommit] : [],
      recurrenceCount: lr.recurrenceCount || 1,
      firstSeen: lr.createdAt,
      lastSeen: lr.updatedAt || lr.createdAt,
      trend: 'stable',
      confidence: 'medium',
      severity: type === 'RECURRING_FAILURE' ? 'medium' : 'low',
      userImpact: type === 'RECURRING_FAILURE' ? 'degraded_answer_quality' : 'positive_pattern',
      founderImpact: 'learning_record_backed',
      evidenceCoverage: (lr.sourceEventIds || []).length,
      counterexamples: lr.counterexamples || [],
      suspectedOwner: lr.affectedOwner || null,
      suspectedMechanism: lr.failureOrSuccessPattern || null,
      alternativeExplanations: ['unrelated paraphrase cluster'],
      privacyClassification: 'INTERNAL_GOVERNANCE',
      recommendationEligibility: (lr.recurrenceCount || 1) >= MIN_EVENTS_FOR_RECOMMENDATION,
      adminStatus: 'OBSERVED',
      learningRecordId: lr.learningRecordId,
      isPattern: true,
      isSingleIncident: false,
      mutationProhibited: true,
      createdAt: new Date().toISOString(),
    });
  }

  if (persist) {
    for (const d of discoveries) {
      upsertById(DOC.discoveries, 'discoveryId', d, MAX.discoveries).catch(() => {});
    }
  }

  return {
    ok: true,
    mode: 'SHADOW',
    productionMutation: false,
    eventSampleSize: events.length,
    discoveryCount: discoveries.length,
    recommendationEligible: discoveries.filter((d) => d.recommendationEligibility).length,
    discoveries,
  };
}

module.exports = {
  DISCOVERY_TYPES,
  MIN_EVENTS_FOR_PATTERN,
  MIN_EVENTS_FOR_RECOMMENDATION,
  buildDiscoveriesFromEvents,
  runDiscoveryPass,
};
