/**
 * Phase 5K — Detect human need before verse selection.
 */

const { classifyCompanionIntent } = require('./companionIntentIntelligence');

const APP_IDENTITY_RE =
  /\b(what is (the )?purpose of this app|what is this app|what does (the )?app do|what does this app do|what can this app do|how does this app work|are you trying to convert|why are you here|what do you do|are you (just )?quoting bible|closed.?minded)\b/i;

function detectHumanNeed(message = '', anchor = {}, state = {}) {
  // sprint1a6_human_need_guard
  const sprint1a6Message = String(message || '').trim();

  if (/\b(listen first|just want to talk|talk for a minute|hear me out)\b/i.test(sprint1a6Message)) {
    return 'emotional_support';
  }

  // Align with services/griefCompanionResponse.js GRIEF_PATTERNS so plain
  // bereavement lines (e.g. "I lost a friend") never fall through to
  // clarification_needed via classifyCompanionIntent.
  if (
    /\b(grief|grieving|heartbreak|rough day|tough day|let go of someone|someone i love|broken heart|discouraged|overwhelmed|lost a friend|lost my (friend|mother|father|child|spouse|parent|brother|sister|son|daughter|husband|wife)|passed away)\b/i.test(
      sprint1a6Message,
    )
  ) {
    return 'emotional_support';
  }

  if (/\b(alzheimer|alzheimer'?s|dementia|caregiv|mom has|mother has|dad has|father has)\b/i.test(sprint1a6Message)) {
    return 'health_support';
  }

  if (/\b(knee|knees|hurt|hurts|pain|aching|ache|flare|flaring|sore|injury|doctor|medicine|blood pressure|cholesterol)\b/i.test(sprint1a6Message)) {
    return 'health_support';
  }

  // PHASE_6G: broadened beyond the literal word "decision" to also catch the
  // very common "should I ___" personal-decision phrasing (job, money,
  // relationships, etc.). This still only fires as a last resort inside the
  // orchestrator (after strict-doctrine and Bible-concept detection have
  // already had first refusal), so a genuine doctrine question phrased as
  // "should I ___" (e.g. Sabbath/dietary/commandments) is still claimed by
  // the doctrine engine first — this only widens the *non-doctrinal*
  // decision-support net, it does not narrow doctrine routing.
  if (
    (/\b(decision|decide|choice|discern|what should i do)\b/i.test(sprint1a6Message) ||
      (/\bshould i\b/i.test(sprint1a6Message) && !/\b(how should i|what should i say)\b/i.test(sprint1a6Message))) &&
    !/\b(bible|scripture|sabbath|pork|acts 10|commandments?|baptis|tithe|tithing)\b/i.test(sprint1a6Message)
  ) {
    return 'open_life';
  }

  const m = String(message || '').trim();
  if (APP_IDENTITY_RE.test(m)) return 'app_identity';
  if (/\bwhat do you remember\b/i.test(m)) return 'memory_recall';
  if (
    /\bforget\b/i.test(m) &&
    /\b(preference|that|remember|memory|told you|what i|what you know)\b/i.test(m)
  ) {
    return 'memory_update';
  }
  if (/\b(that's not what i asked|not what i asked|why won'?t you answer)\b/i.test(m)) {
    return 'correction_repair';
  }
  if (/\b(why are you still saying yes|don'?t ever do|you didn'?t learn|don'?t say yes before)\b/i.test(m)) {
    return 'correction_repair';
  }
  // CORE_COMPANION_RECOVERY — Founder correction patterns observed in live Alpha testing.
  // Bare "answer yes or no" is a style preference, not a correction (v1.3C).
  if (
    /\b(does not say|doesn't say|did not say|didn't say|not say that|contradicting yourself|you are contradicting|you did not answer|you didn't answer|that verse does not|glitching)\b/i.test(
      m,
    )
  ) {
    return 'correction_repair';
  }
  if (/\b(what do i do about it|and then what do i do|decision|not about the bible|life decision)\b/i.test(m)) return 'next_steps';
  if (/\b(what we were talking about|about what we talked)\b/i.test(m) && (state.lastAnsweredConcept || state.sessionMemory?.activeConcept)) {
    return 'practical_words_to_say';
  }
  if (/\b(pray with me|can you pray|let's pray|pray for me|pray for my|pray about|pray with me again|pray again|short prayer|brief prayer|just a (short |quick )?prayer|prayer for|deeper prayer|better prayer|beeter prayer|give me a deeper prayer|prayer as i asked)\b/i.test(m)) return 'prayer';
  if (/\bwhat verse should i remember|give me a verse\b/i.test(m)) return 'one_anchor_verse';
  if (/\bhow (do|should|can) i explain|how do i tell|what should i say|help me talk to|how should i respond\b/i.test(m)) {
    return 'practical_words_to_say';
  }
  if (
    /\b(grief|lost (someone|my)|lost a friend|lost my (friend|mother|father|child|spouse|parent|brother|sister|son|daughter|husband|wife)|funeral|died|passed away)\b/i.test(
      m,
    )
  ) {
    // Prefer emotional_support: orchestrator + OpenAI-first already lane on it.
    // grief_comfort remains a valid alias for older routeOwnershipTable entries.
    return 'emotional_support';
  }
  if (/\b(overwhelmed|anxious|nervous|bad day)\b/i.test(m) && !/\b(can we eat|what is|scripture says)\b/i.test(m)) {
    return anchor.currentRelationshipContext === 'family' && /\bnervous\b/i.test(m)
      ? 'emotional_support'
      : /\boverwhelmed\b/i.test(m)
        ? 'emotional_support'
        : 'anxiety_support';
  }
  if (/\b(fornication|sex with|strings attached|not ready)\b/i.test(m)) return 'temptation_boundary';
  if (/\b(family disagree|family still disagree|still disagree)\b/i.test(m)) return 'conflict_guidance';

  const intent = classifyCompanionIntent({ message: m, state });
  if (intent.category === 'doctrine_answer') return 'doctrine_answer';
  if (intent.category === 'clarification_needed') return 'clarification';
  if (anchor.currentPracticalNeed) return 'practical_words_to_say';
  return 'conversation';
}

module.exports = {
  detectHumanNeed,
  APP_IDENTITY_RE,
};
