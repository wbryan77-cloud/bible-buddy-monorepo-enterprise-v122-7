/**
 * Phase 5G — Two-witness Scripture standard (Deuteronomy 19:15, Matthew 18:16, 2 Corinthians 13:1).
 */

const requireTwoWitnessesForNewDoctrine = true;
const requireTwoWitnessesForEstablishedDoctrine = false;

const WITNESS_CHALLENGE_RE =
  /\b(why\??|where does the bible say|prove it|show me scripture|how do you know|give me proof)\b/i;

function selectMinimumWitnesses(
  concept = null,
  options = {},
) {
  const {
    initialMinimum = 2,
    preferred = 3,
    continuationMinimum = 1,
    isNewTopic = true,
    isContinuation = false,
    isEmotionalSupport = false,
    isPrayer = false,
    isPracticalGuidance = false,
  } = options;

  if (isPrayer) return { minimum: 0, preferred: 2, optional: true };
  if (isEmotionalSupport) return { minimum: 1, preferred: 2, optional: false };
  if (isPracticalGuidance) return { minimum: 0, preferred: 2, optional: true };
  if (isContinuation && !isNewTopic) {
    return { minimum: continuationMinimum, preferred: Math.max(continuationMinimum, 2), optional: false };
  }
  return { minimum: initialMinimum, preferred, optional: false };
}

function countRefsInText(text = '', refs = []) {
  const t = String(text).toLowerCase();
  let count = 0;
  for (const ref of refs) {
    const book = String(ref).split(/[:\d]/)[0].trim().toLowerCase();
    if (book && t.includes(book)) count += 1;
  }
  return count;
}

function validateWitnessStandard(
  reply = '',
  refs = [],
  {
    isNewTopic = true,
    isContinuation = false,
    isEmotionalSupport = false,
    isPrayer = false,
    isPracticalGuidance = false,
    isChallenge = false,
  } = {},
) {
  const spec = selectMinimumWitnesses(null, {
    isNewTopic: isNewTopic || isChallenge,
    isContinuation,
    isEmotionalSupport,
    isPrayer,
    isPracticalGuidance,
  });

  const refList = (refs || []).map((r) => (typeof r === 'string' ? r : r.reference || '')).filter(Boolean);
  const textCount = countRefsInText(reply, refList);
  const total = Math.max(refList.length, textCount);
  const required = isChallenge ? 2 : spec.minimum;

  return {
    ok: spec.optional || total >= required || (isContinuation && total >= 1),
    required,
    actual: total,
    preferred: spec.preferred,
    isNewTopic,
    isContinuation,
  };
}

function isWitnessReestablishment(message = '') {
  return WITNESS_CHALLENGE_RE.test(String(message || ''));
}

module.exports = {
  requireTwoWitnessesForNewDoctrine,
  requireTwoWitnessesForEstablishedDoctrine,
  selectMinimumWitnesses,
  validateWitnessStandard,
  isWitnessReestablishment,
  WITNESS_CHALLENGE_RE,
};
