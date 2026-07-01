/**
 * Scripture cross-check for external teaching candidates — admin review only.
 * Scripture is authority; candidates are not promoted automatically.
 */

const KJV_BOOKS = [
  'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy', 'joshua', 'judges', 'ruth',
  '1 samuel', '2 samuel', '1 kings', '2 kings', '1 chronicles', '2 chronicles', 'ezra',
  'nehemiah', 'esther', 'job', 'psalm', 'psalms', 'proverbs', 'ecclesiastes', 'song of solomon',
  'isaiah', 'jeremiah', 'lamentations', 'ezekiel', 'daniel', 'hosea', 'joel', 'amos', 'obadiah',
  'jonah', 'micah', 'nahum', 'habakkuk', 'zephaniah', 'haggai', 'zechariah', 'malachi',
  'matthew', 'mark', 'luke', 'john', 'acts', 'romans', '1 corinthians', '2 corinthians',
  'galatians', 'ephesians', 'philippians', 'colossians', '1 thessalonians', '2 thessalonians',
  '1 timothy', '2 timothy', 'titus', 'philemon', 'hebrews', 'james', '1 peter', '2 peter',
  '1 john', '2 john', '3 john', 'jude', 'revelation',
];

const TRADITION_LANGUAGE = [
  /\bmost christians\b/i,
  /\bchristian tradition\b/i,
  /\bcommonly taught\b/i,
  /\bpopular belief\b/i,
  /\bchurch teaches\b/i,
  /\beveryone knows\b/i,
];

function normalizeRef(ref = '') {
  return String(ref || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function parseRefBook(ref = '') {
  const n = normalizeRef(ref);
  for (const book of KJV_BOOKS.sort((a, b) => b.length - a.length)) {
    if (n.startsWith(book)) return book;
  }
  return null;
}

function verifyKjvReference(ref = '') {
  const book = parseRefBook(ref);
  if (!book) return { valid: false, reason: 'unknown_book' };
  if (!/\d/.test(ref)) return { valid: false, reason: 'missing_chapter_verse' };
  return { valid: true, book };
}

function flagUnsupportedLeaps(scriptureOrder = []) {
  const leaps = [];
  for (let i = 1; i < scriptureOrder.length; i += 1) {
    const prev = normalizeRef(scriptureOrder[i - 1]);
    const curr = normalizeRef(scriptureOrder[i]);
    if (prev.split(' ')[0] !== curr.split(' ')[0] && !/\b(acts|corinthians|revelation)\b/.test(curr)) {
      leaps.push({ from: scriptureOrder[i - 1], to: scriptureOrder[i], note: 'large_chain_gap' });
    }
  }
  return leaps;
}

function detectTraditionLanguage(text = '') {
  return TRADITION_LANGUAGE.filter((p) => p.test(text)).map((p) => p.toString());
}

function gradeBibleSupport({ kjvValid = true, leaps = [], traditionHits = [], conclusionFlags = [] }) {
  let score = 100;
  if (!kjvValid) score -= 40;
  score -= leaps.length * 8;
  score -= traditionHits.length * 12;
  score -= conclusionFlags.length * 15;
  score = Math.max(0, Math.min(100, score));

  let label = 'research_only';
  if (score >= 95) label = 'strong';
  else if (score >= 80) label = 'probable';
  else if (score >= 60) label = 'review_carefully';

  return { score, label };
}

function crossCheckTeachingCandidate(candidate = {}) {
  const scripturesCited = candidate.scripturesCited || [];
  const scriptureOrder = candidate.scriptureOrder || scripturesCited;
  const conclusion = String(candidate.doctrineConclusion || '');

  const refResults = scripturesCited.map((ref) => ({ ref, ...verifyKjvReference(ref) }));
  const kjvValid = refResults.every((r) => r.valid);
  const leaps = flagUnsupportedLeaps(scriptureOrder);
  const traditionHits = detectTraditionLanguage(`${conclusion} ${candidate.question || ''}`);
  const conclusionFlags = [];
  if (/\b(proves?|clearly shows|without doubt)\b/i.test(conclusion) && leaps.length) {
    conclusionFlags.push('overconfident_conclusion_with_chain_gaps');
  }

  const grade = gradeBibleSupport({ kjvValid, leaps, traditionHits, conclusionFlags });

  return {
    candidateId: candidate.candidateId || null,
    kjvRefsValid: kjvValid,
    refResults,
    unsupportedLeaps: leaps,
    traditionLanguage: traditionHits,
    conclusionFlags,
    crossCheckGrade: grade.score,
    crossCheckLabel: grade.label,
    reviewRequired: true,
    promotable: grade.score >= 95 && kjvValid && traditionHits.length === 0,
  };
}

module.exports = {
  crossCheckTeachingCandidate,
  verifyKjvReference,
  flagUnsupportedLeaps,
  detectTraditionLanguage,
  gradeBibleSupport,
  KJV_BOOKS,
};
