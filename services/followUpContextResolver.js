/**
 * Phase 5E — Follow-up context: "that," "more scriptures," actor questions.
 */

const { CONTINUATION_PHRASE_RE, hasExplicitConcept } = require('./bibleConceptGraph');
const { detectSemanticConcept, rankConceptCandidates } = require('./bibleSemanticConceptNormalizer');

const FOLLOW_UP_PATTERNS = [
  /\bmore scriptures?\b.*\b(on that|about that|on this|about this)\b/i,
  /\bgive me more\b.*\b(on that|about that|scriptures?)\b/i,
  /\bmore on that\b/i,
  /\bscriptures? on that\b/i,
  /\bwhat about (it|that)\b/i,
  /\bhow are we supposed to keep (it|the sabbath)\b/i,
  /\bhow (do we|should we) keep (it|the sabbath)\b/i,
];

const ACTOR_QUESTION_PATTERNS = [
  /\bis (this|that|it) a person\b/i,
  /\bis this a person\b/i,
  /\bwho is the abomination\b/i,
  /\bwhat is the abomination\b/i,
];

const ABOMINATION_ACTOR_ANSWER =
  'Scripture shows the abomination of desolation as an event tied to the holy place — a desolating power standing where it ought not. Daniel 9:27 and Matthew 24:15 describe the abomination and the holy place; Mark 13:14 warns when you see it. Scripture names the event and location rather than identifying one modern person as the abomination.';

function isFollowUpContinuation(message = '') {
  const m = String(message || '').trim();
  return CONTINUATION_PHRASE_RE.test(m) || FOLLOW_UP_PATTERNS.some((re) => re.test(m));
}

function mapTopicToConceptId(topic = '') {
  const map = {
    kingdom: 'kingdom_on_earth',
    dietary_law: 'dietary_pork_unclean',
    sabbath: 'sabbath_seventh_day',
    death_state: 'death_state',
    acts_10: 'acts_10',
    new_jerusalem: 'new_jerusalem',
  };
  return map[topic] || null;
}

function resolveFollowUpContext(message = '', context = {}) {
  const m = String(message || '').trim();
  const lastConcept =
    context.lastAnsweredConcept ||
    context.activeBibleConcept ||
    context.lastBibleConcept ||
    mapTopicToConceptId(context.lastAnsweredTopic) ||
    mapTopicToConceptId(context.lastStrictDoctrineTopic) ||
    null;

  if (ACTOR_QUESTION_PATTERNS.some((re) => re.test(m)) && lastConcept === 'abomination_desolation') {
    return {
      conceptId: 'abomination_desolation',
      isActorQuestion: true,
      reply: ABOMINATION_ACTOR_ANSWER,
      scripture: [
        { reference: 'Daniel 9:27', theme: 'abomination_desolation' },
        { reference: 'Matthew 24:15', theme: 'abomination_desolation' },
        { reference: 'Mark 13:14', theme: 'abomination_desolation' },
      ],
      masterRoute: 'bnc_followup_actor',
    };
  }

  const explicit = detectSemanticConcept(m, context);
  if (explicit && hasExplicitConcept(m)) {
    return { conceptId: explicit.id, explicit: true };
  }

  if (isFollowUpContinuation(m) && lastConcept) {
    if (/how are we supposed to keep|how (do we|should we) keep/i.test(m)) {
      if (lastConcept === 'sabbath_seventh_day' || lastConcept === 'sabbath') {
        return { conceptId: 'sabbath_how_to_keep', continuation: true };
      }
    }
    const ranked = rankConceptCandidates(m, context);
    const conflict = ranked.find((c) => c.id !== lastConcept && c.score >= 0.85);
    if (!conflict) {
      return { conceptId: lastConcept, continuation: true };
    }
  }

  return { conceptId: null };
}

module.exports = {
  isFollowUpContinuation,
  resolveFollowUpContext,
  mapTopicToConceptId,
  FOLLOW_UP_PATTERNS,
  ACTOR_QUESTION_PATTERNS,
  ABOMINATION_ACTOR_ANSWER,
};
