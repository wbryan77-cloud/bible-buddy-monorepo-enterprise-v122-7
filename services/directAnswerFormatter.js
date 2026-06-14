/**
 * Phase 4N — Yes/no polarity, direct answer clarity, validator leak suppression.
 */

const DENIAL_PHRASE = 'Scripture does not state that directly.';
const DENIAL_RE = /\bscripture does not state that directly\.?\b/gi;

const SCRIPTURE_REF_RE =
  /\b(?:[1-3]?\s*(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Song|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation)\s+\d+)/i;

function isYesNoQuestion(message = '') {
  const m = String(message || '').trim();
  if (!m) return false;
  if (/\b(so are you saying|are you saying we can|are you saying that)\b/i.test(m)) return true;
  if (/^(can|may|should|is it okay|are we allowed)\b/i.test(m)) return true;
  return /\b(can we|can i|may we|should we|is it okay to|are we allowed to)\b/i.test(m);
}

function inferPolarity(message = '', topic = '') {
  const m = String(message || '').toLowerCase();
  const t = String(topic || '').toLowerCase();

  if (
    t === 'dietary_law' ||
    /\b(pork|swine|shellfish|unclean food|eat pork)\b/i.test(m)
  ) {
    return 'no';
  }
  if (
    /\b(fornication|sex without marriage|adultery)\b/i.test(m) ||
    /\bcan we have sex\b/i.test(m) ||
    /\bcan we eat pork\b/i.test(m)
  ) {
    return 'no';
  }
  if (/\b(acts\s*10 mean.*clean|food is clean|eat unclean)\b/i.test(m)) {
    return 'no';
  }
  return null;
}

function replyHasScriptureSupport(reply = '', scripture = []) {
  if (Array.isArray(scripture) && scripture.length > 0) return true;
  return SCRIPTURE_REF_RE.test(String(reply || ''));
}

function suppressValidatorLeak(reply = '', scripture = []) {
  let result = String(reply || '').trim();
  if (!result) return result;
  if (!replyHasScriptureSupport(result, scripture)) return result;

  const sentences = result.split(/(?<=[.!?])\s+/).filter(Boolean);
  const filtered = sentences.filter((sentence) => !DENIAL_RE.test(sentence));
  if (filtered.length === 0) return result.replace(DENIAL_RE, '').replace(/\s+/g, ' ').trim();
  return filtered.join(' ').replace(/\s+/g, ' ').trim();
}

function applyYesNoPolarityGuard(reply = '', message = '', options = {}) {
  const { topic = '', scripture = [] } = options;
  if (!isYesNoQuestion(message)) return String(reply || '').trim();

  const polarity = inferPolarity(message, topic);
  if (!polarity) return String(reply || '').trim();

  let result = String(reply || '').trim();
  if (!result) return result;

  const startsYes = /^yes\b/i.test(result) || /^yes[—,\-–]/i.test(result);
  const startsNo = /^no\b/i.test(result) || /^no[—,\-–]/i.test(result);

  if (polarity === 'no') {
    if (startsYes && !startsNo) {
      result = result.replace(/^yes[—,\-–\s]*/i, '');
      result = `No. ${result}`;
    } else if (!startsNo) {
      result = `No. ${result}`;
    }
  } else if (polarity === 'yes' && !startsYes && !startsNo) {
    result = `Yes. ${result}`;
  }

  return result.replace(/\bNo\.\s+No\./i, 'No.').trim();
}

function formatDirectDoctrineReply(reply = '', message = '', options = {}) {
  let result = suppressValidatorLeak(reply, options.scripture || []);
  result = applyYesNoPolarityGuard(result, message, options);
  if (options.userPreferences || options.userId) {
    const { applyUserAnswerPreferences } = require('./userCorrectionMemory');
    result = applyUserAnswerPreferences(result, {
      userId: options.userId,
      message,
      polarity: options.polarity || inferPolarity(message, options.topic),
      userPreferences: options.userPreferences,
    });
  }
  return suppressValidatorLeak(result, options.scripture || []);
}

function countScriptureWitnesses(reply = '', scripture = []) {
  const refs = new Set();
  const text = String(reply || '');
  const matches = text.match(
    /\b(?:[1-3]?\s*(?:Genesis|Exodus|Leviticus|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs|Ecclesiastes|Song|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation)\s+\d+(?::\d+(?:-\d+)?)?)/gi,
  );
  if (matches) matches.forEach((m) => refs.add(m.toLowerCase().replace(/\s+/g, ' ')));
  if (Array.isArray(scripture)) {
    scripture.forEach((s) => {
      const ref = s?.reference || s?.ref;
      if (ref) refs.add(String(ref).toLowerCase().replace(/\s+/g, ' '));
    });
  }
  return refs.size;
}

module.exports = {
  DENIAL_PHRASE,
  DENIAL_RE,
  isYesNoQuestion,
  inferPolarity,
  replyHasScriptureSupport,
  suppressValidatorLeak,
  applyYesNoPolarityGuard,
  formatDirectDoctrineReply,
  countScriptureWitnesses,
};
