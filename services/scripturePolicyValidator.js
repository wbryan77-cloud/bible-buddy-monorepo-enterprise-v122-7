/**
 * Scripture policy validators — flag only; may trigger one guard regen.
 * Does not author final prose.
 */

const { HISTORY_MARKERS } = require('./forbiddenProseGuard');

/** Common non-KJV quotation fingerprints (soft — flag for regen, not hard block). */
const NON_KJV_QUOTE_PATTERNS = [
  { id: 'niv_only_begotten_son', re: /\bone and only Son\b/i },
  { id: 'niv_all_foods_clean', re: /\b(making|declared|pronounced)\s+all\s+foods?\s+clean\b/i },
  { id: 'esv_under_law', re: /\bunder the law\b.{0,30}\babolished\b/i },
  { id: 'nlt_heaven_real_place', re: /\bheaven is a real place\b/i },
  { id: 'niv_third_heaven_paradise', re: /\bcaught up to paradise\b/i },
];

const THIRD_HEAVEN_DESTINATION_PATTERNS = [
  /\b(believers?|we|you|souls?|christians?|the\s+saved)\b.{0,40}\b(go|ascend|enter|taken|transported)\b.{0,30}\b(third heaven|3rd heaven)\b/i,
  /\b(go|ascend|enter)\s+(to\s+)?(the\s+)?third\s+heaven\b.{0,40}\b(when we die|at death|after death|when you die)\b/i,
  /\b(our|your)\s+(final\s+)?destination\b.{0,30}\b(third heaven|3rd heaven)\b/i,
  /\bthird heaven\b.{0,50}\b(where (we|believers|you) go)\b/i,
];

const UNSUPPORTED_TRADITION_PATTERNS = [
  {
    id: 'mansions_in_heaven_now',
    re: /\b(mansions?|rooms?)\s+(in|waiting)\s+(heaven|the third heaven)\b.{0,40}\b(now|already|at death)\b/i,
  },
  {
    id: 'soul_goes_to_heaven_settled',
    re: /\b(soul|spirit)\s+goes\s+to\s+heaven\b.{0,20}\b(at death|when you die|immediately)\b/i,
  },
  {
    id: 'tradition_as_scripture_command',
    re: /\b(the\s+)?church\s+teaches\b.{0,40}\b(scripture commands|biblical command|God commands)\b/i,
  },
];

const EXPLANATORY_SAFE_PATTERNS = [
  /\bdo not teach\b/i,
  /\bscripture does not (say|teach|record)\b/i,
  /\bnot (say|teach|recorded)\b.{0,40}\b(believers?|we)\b.{0,30}\b(go|ascend)\b/i,
  /\bwithout scripture\b/i,
  /\bpaul(?:'s)?\s+(vision|experience)\b/i,
  /\bcaught up\b.{0,40}\b(vision|experience|man in christ)\b/i,
];

function detectNonKjvQuotationDrift(reply = '') {
  const text = String(reply || '');
  const hits = NON_KJV_QUOTE_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.id);
  return { detected: hits.length > 0, hits, issue: hits.length ? 'non_kjv_quotation_drift' : null };
}

function detectUnsupportedThirdHeavenDestination(reply = '') {
  const text = String(reply || '');
  if (EXPLANATORY_SAFE_PATTERNS.some((p) => p.test(text))) {
    return { detected: false, hits: [], issue: null };
  }
  const hits = THIRD_HEAVEN_DESTINATION_PATTERNS.filter((p) => p.test(text)).map((p) => p.source || p.toString());
  return {
    detected: hits.length > 0,
    hits,
    issue: hits.length ? 'unsupported_third_heaven_destination' : null,
  };
}

function detectUnsupportedTraditionClaims(reply = '') {
  const text = String(reply || '');
  const hits = UNSUPPORTED_TRADITION_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.id);
  return { detected: hits.length > 0, hits, issue: hits.length ? 'unsupported_tradition_claim' : null };
}

function detectHistoryWhenNotAsked(reply = '', { historyAllowed = false, message = '' } = {}) {
  if (historyAllowed) return { detected: false, hits: [], issue: null };
  const text = String(reply || '');
  const msg = String(message || '');
  if (HISTORY_MARKERS.test(msg)) return { detected: false, hits: [], issue: null };
  const detected = HISTORY_MARKERS.test(text);
  return {
    detected,
    hits: detected ? ['unsolicited_history'] : [],
    issue: detected ? 'history_when_not_asked' : null,
  };
}

function validateScripturePolicy({ reply = '', evidencePack = {}, historyAllowed = false, message = '' } = {}) {
  const kjv = detectNonKjvQuotationDrift(reply);
  const thirdHeaven = detectUnsupportedThirdHeavenDestination(reply);
  const tradition = detectUnsupportedTraditionClaims(reply);
  const history = detectHistoryWhenNotAsked(reply, {
    historyAllowed,
    message: message || evidencePack.userMessage || '',
  });

  const issues = [kjv, thirdHeaven, tradition, history].filter((r) => r.issue).map((r) => r.issue);
  const adminFindings = {
    nonKjvDrift: kjv.detected ? kjv.hits : [],
    thirdHeavenDestination: thirdHeaven.detected ? thirdHeaven.hits : [],
    traditionClaims: tradition.detected ? tradition.hits : [],
    unsolicitedHistory: history.detected ? history.hits : [],
  };

  let regenHint = null;
  if (issues.length) {
    const hints = [];
    if (kjv.detected) hints.push('Use KJV references; avoid NIV/ESV/NLT-style quoted wording.');
    if (thirdHeaven.detected) {
      hints.push(
        'Do not teach believers go to the third heaven. 2 Corinthians 12:2 is Paul’s vision; John 3:13 and John 14:3 frame Christ’s ascension and return.'
      );
    }
    if (tradition.detected) hints.push('State tradition carefully; do not present man-made tradition as Scripture command.');
    if (history.detected) hints.push('Remove unsolicited church history; answer from Scripture only.');
    regenHint = hints.join(' ');
  }

  return {
    passed: issues.length === 0,
    issues,
    adminFindings,
    regenHint,
    checks: { kjv, thirdHeaven, tradition, history },
  };
}

module.exports = {
  detectNonKjvQuotationDrift,
  detectUnsupportedThirdHeavenDestination,
  detectUnsupportedTraditionClaims,
  detectHistoryWhenNotAsked,
  validateScripturePolicy,
};
