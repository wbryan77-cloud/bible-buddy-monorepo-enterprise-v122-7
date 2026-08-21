/**
 * Phase 5K — Detect human need before verse selection.
 */

const { classifyCompanionIntent } = require('./companionIntentIntelligence');

const APP_IDENTITY_RE =
  /\b(what is (the )?purpose of this app|what is this app|what does (the )?app do|what does this app do|what can this app do|how does this app work|are you trying to convert|why are you here|what do you do|are you (just )?quoting bible|closed.?minded)\b/i;

/**
 * Writing / drafting / revision help — texts, copy-paste, "make that warmer".
 * Must beat temptation_boundary / doctrine-only intercepts when the user is
 * asking Buddy to help communicate a conviction, not only teach Scripture.
 */
function isWritingHelpRequest(message = '') {
  const m = String(message || '');
  if (!m.trim()) return false;
  if (
    /\b(give me (a |the )?(text|message|draft|script)|write (me |a |an )?(text|message|draft)|draft (a |me )?(text|message)|text (to|for) (tell|her|him|them)|copy(\s*and\s*|\s*)paste|final text|usable text)\b/i.test(
      m,
    )
  ) {
    return true;
  }
  if (
    /\b(make that (text|message)|use the text|improve (that|the|it)|warmer|more human|more professional|professional|shorten (it|that)|revise (that|the|it)|rewrite (that|the|it)|edit (that|the) (text|message)|final (text|version|draft)|copy.?paste)\b/i.test(
      m,
    )
  ) {
    return true;
  }
  if (/\bwhat should i (say|text|write)\b/i.test(m) && /\b(her|him|them|girl|message|massage|fornicat|sex)\b/i.test(m)) {
    return true;
  }
  return false;
}

/** Explicit ask for Scripture's moral/doctrinal position (not generic life coaching). */
function isExplicitBiblicalPositionAsk(message = '') {
  const m = String(message || '');
  return /\b(biblically|biblical|according to (the )?bible|what does (the )?bible say|what does scripture say|does the bible (say|allow|permit|forbid)|is .{0,40} a sin)\b/i.test(
    m,
  );
}

/** Sexual morality / fornication asks — must not fall into open_life Proverbs coaching. */
function isSexualMoralityAsk(message = '') {
  const m = String(message || '');
  if (isWritingHelpRequest(m)) return false;
  return /\b(have sex|sex with|fornicat|sexual (sin|immorality)|sleep with (her|him)|go to bed with|commit fornication)\b/i.test(
    m,
  );
}

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

  if (/\b(knee|knees|hurt|hurts|hurting|pain|aching|ache|flare|flaring|sore|injury|doctor|medicine|blood pressure|cholesterol|chest pain|chest hurt)\b/i.test(sprint1a6Message)) {
    return 'health_support';
  }

  if (/\b(angry at god|mad at god|upset with god|blame god|blaming god)\b/i.test(sprint1a6Message)) {
    return 'emotional_support';
  }

  // Sexual morality / explicit biblical position before open_life "should I" coaching.
  // Founder evidence: "Should I have sex" / "But biblical should I…" were swallowed
  // by open_life → Proverbs 3:5-6 instead of fornication doctrine.
  if (isSexualMoralityAsk(sprint1a6Message) || isExplicitBiblicalPositionAsk(sprint1a6Message)) {
    // Fall through to doctrine/temptation lanes below — do not return open_life.
  } else if (
    // PHASE_6G: "should I ___" personal-decision phrasing (job, money, etc.).
    // Must not claim biblical/moral "should I" asks (handled above).
    (/\b(decision|decide|choice|discern|what should i do)\b/i.test(sprint1a6Message) ||
      /\b(quitt?ing (my )?job|leave my job|resign(ing)? from (my )?job)\b/i.test(sprint1a6Message) ||
      (/\bshould i\b/i.test(sprint1a6Message) && !/\b(how should i|what should i say)\b/i.test(sprint1a6Message))) &&
    !/\b(bible|biblical|biblically|scripture|sabbath|pork|acts 10|commandments?|baptis|tithe|tithing|fornicat|have sex|sex with|adulter)\b/i.test(
      sprint1a6Message,
    )
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
  if (isSexualMoralityAsk(m) || (/\b(fornication|sex with|strings attached|not ready)\b/i.test(m) && !isWritingHelpRequest(m))) {
    // Prefer doctrine_answer so concept graph / 1 Cor 6:18 can own the reply.
    return 'doctrine_answer';
  }
  if (isExplicitBiblicalPositionAsk(m)) {
    return 'doctrine_answer';
  }
  // Writing/drafting help (texts, revisions) must not be swallowed by doctrine-only lanes.
  if (isWritingHelpRequest(m)) return 'practical_words_to_say';
  if (/\b(family disagree|family still disagree|still disagree)\b/i.test(m)) return 'conflict_guidance';

  const intent = classifyCompanionIntent({ message: m, state });
  if (intent.category === 'doctrine_answer') return 'doctrine_answer';
  if (intent.category === 'clarification_needed') return 'clarification';
  if (anchor.currentPracticalNeed) return 'practical_words_to_say';
  return 'conversation';
}

module.exports = {
  detectHumanNeed,
  isWritingHelpRequest,
  isExplicitBiblicalPositionAsk,
  isSexualMoralityAsk,
  APP_IDENTITY_RE,
};
