/**
 * Phase 4F — Robust live-user strict doctrine topic detection.
 */

const CORRECTION_CHALLENGE_PATTERNS = [
  /\bwhy (are you|did you) say\b/i,
  /\bstop saying\b/i,
  /\bthat is confusing\b/i,
  /\bthat is wrong\b/i,
  /\bi disagree\b/i,
  /\bshow me another\b/i,
  /\bgive me another (verse|witness|scripture|passage)\b/i,
  /\bmore scripture\b/i,
  /\bprove it\b/i,
  /\bbefore that\b/i,
  /\bcan you remember\b/i,
  /\bwhat were we (talking about|discussing)\b/i,
  /\bremember what we\b/i,
  /\bcontinue\b/i,
  /\bgive me more\b/i,
  /\banother (verse|witness|scripture|passage)\b/i,
];

const ACTS10_PATTERNS = [
  /\bacts\s*10\b/i,
  /\bpeter'?s?\s+vision\b/i,
  /\bsheet\s+vision\b/i,
  /\bunclean animals\b/i,
  /\bgentiles\b/i,
  /\bcornelius\b/i,
  /\bcommon or unclean\b/i,
  /\bgod showed (me|him)\b/i,
  /\bpeople not food\b/i,
  /\bfood is clean\b/i,
  /\beat pork\b.*\bacts\s*10\b/i,
  /\bacts\s*10\b.*\bpork\b/i,
  /\bdoes acts\s*10 mean food\b/i,
  /\bacts\s*10 mean\b/i,
];

const DIETARY_PATTERNS = [
  /\bpork\b/i,
  /\bswine\b/i,
  /\bshrimp\b/i,
  /\bshellfish\b/i,
  /\bunclean food\b/i,
  /\bclean and unclean\b/i,
  /\bdietary law\b/i,
  /\bleviticus\s*11\b/i,
  /\bdeuteronomy\s*14\b/i,
  /\bisaiah\s*66:?\s*17\b/i,
  /\babomination\b/i,
  /\bmouse\b/i,
  /\bcan (christians|we) eat pork\b/i,
  /\beat pork\b/i,
];

const DEATH_STATE_PATTERNS = [
  /\bwhat happens when (someone|a person) dies\b/i,
  /\bwhen (someone|a person) dies\b/i,
  /\bdead know nothing\b/i,
  /\bmemory after death\b/i,
  /\bconscious after death\b/i,
  /\bsoul continues\b/i,
  /\babsent from (the )?body\b/i,
  /\blazarus\b.*\bsleep\b/i,
  /\bspirit returns to god\b/i,
  /\b\d+\s*corinthians\s*5:?\s*8\b/i,
  /\bphilippians\s*1:?\s*21\b/i,
  /\bluke\s*16\b/i,
  /\bdead\b/i,
  /\bdeath\b/i,
  /\basleep\b/i,
  /\bsleep\b.*\bdeath\b/i,
  /\bresurrection\b/i,
];

function matchesAny(message, patterns) {
  const m = String(message || '');
  return patterns.some((re) => re.test(m));
}

function isCorrectionOrChallengeTurn(message = '') {
  return matchesAny(message, CORRECTION_CHALLENGE_PATTERNS);
}

function isSessionBoundStrictTurn(message = '') {
  return isCorrectionOrChallengeTurn(message);
}

function detectActs10Topic(message = '') {
  return matchesAny(message, ACTS10_PATTERNS);
}

function detectDietaryTopic(message = '') {
  return matchesAny(message, DIETARY_PATTERNS);
}

function detectDeathStateTopic(message = '') {
  if (matchesAny(message, DEATH_STATE_PATTERNS)) {
    if (/\bresurrection\b/i.test(message) && !/\b(death|die|dead|asleep|sleep)\b/i.test(message)) {
      return false;
    }
    return true;
  }
  return false;
}

/**
 * Message-based strict topic detection (no session context).
 * Priority: acts_10 before dietary when both match (Acts 10 vision context).
 */
function detectStrictTopicFromMessage(message = '') {
  const m = String(message || '').trim();
  if (!m) return null;

  if (detectActs10Topic(m)) return 'acts_10';
  if (detectDietaryTopic(m)) return 'dietary_law';
  if (detectDeathStateTopic(m)) return 'death_state';

  if (/\b(sabbath|seventh day)\b/i.test(m)) return 'sabbath';
  if (/\bnew jerusalem\b/i.test(m)) return 'new_jerusalem';
  if (/\b(kingdom of heaven|kingdom of god|thy kingdom)\b/i.test(m)) return 'kingdom';
  if (/\b(holy spirit|spirit of god)\b/i.test(m)) return 'holy_spirit';
  if (/\bresurrection\b/i.test(m)) return 'resurrection';
  if (/\b(davidic covenant|king david)\b/i.test(m)) return 'david';

  return null;
}

module.exports = {
  CORRECTION_CHALLENGE_PATTERNS,
  isCorrectionOrChallengeTurn,
  isSessionBoundStrictTurn,
  detectStrictTopicFromMessage,
  detectActs10Topic,
  detectDietaryTopic,
  detectDeathStateTopic,
};
