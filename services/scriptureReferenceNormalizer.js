/**
 * Scripture reference normalization — range/chapter overlap for approved graph lookup.
 * No doctrine content; matching only.
 */

function normalizeRef(ref = '') {
  return String(ref || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/–/g, '-')
    .trim();
}

const BOOK_ALIASES = {
  mt: 'matthew',
  matt: 'matthew',
  mk: 'mark',
  lk: 'luke',
  jn: 'john',
  gen: 'genesis',
  ex: 'exodus',
  exod: 'exodus',
  lev: 'leviticus',
  deut: 'deuteronomy',
  dt: 'deuteronomy',
  cor: 'corinthians',
  rev: 'revelation',
  acts: 'acts',
};

function normalizeBook(book = '') {
  let b = String(book || '')
    .toLowerCase()
    .replace(/\./g, '')
    .trim();
  const parts = b.split(/\s+/);
  if (parts.length === 1 && BOOK_ALIASES[parts[0]]) {
    b = BOOK_ALIASES[parts[0]];
  }
  return b.replace(/\s+/g, ' ');
}

function parseScriptureRef(ref = '') {
  const n = normalizeRef(ref);
  if (!n) return null;

  const match = n.match(/^((?:\d\s+)?[a-z]+(?:\s+[a-z]+)*)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/);
  if (!match) return null;

  const verseStart = match[3] != null ? parseInt(match[3], 10) : null;
  const verseEnd = match[4] != null ? parseInt(match[4], 10) : verseStart;

  return {
    raw: n,
    book: normalizeBook(match[1]),
    chapter: parseInt(match[2], 10),
    verseStart,
    verseEnd,
  };
}

function booksMatch(a, b) {
  const na = normalizeBook(a);
  const nb = normalizeBook(b);
  if (na === nb) return true;
  return na.includes(nb) || nb.includes(na);
}

function verseRangesOverlap(cited, approved) {
  if (!cited || !approved) return false;
  if (!booksMatch(cited.book, approved.book)) return false;
  if (cited.chapter !== approved.chapter) return false;

  const cHasVerses = cited.verseStart != null;
  const aHasVerses = approved.verseStart != null;

  if (!cHasVerses || !aHasVerses) return true;

  const cStart = cited.verseStart;
  const cEnd = cited.verseEnd ?? cited.verseStart;
  const aStart = approved.verseStart;
  const aEnd = approved.verseEnd ?? approved.verseStart;

  return cStart <= aEnd && cEnd >= aStart;
}

/**
 * True when cited ref overlaps an approved ref (handles Matt 6:10 ↔ Matt 6:9-10, Acts 10:28 ↔ Acts 10, etc.).
 */
function refMatchesApproved(citedRef = '', approvedRef = '') {
  const cited = parseScriptureRef(citedRef);
  const approved = parseScriptureRef(approvedRef);

  if (!cited || !approved) {
    const cn = normalizeRef(citedRef);
    const an = normalizeRef(approvedRef);
    if (cn === an) return true;
    return an.includes(cn) || cn.includes(an);
  }

  if (verseRangesOverlap(cited, approved)) return true;

  const cn = normalizeRef(citedRef);
  const an = normalizeRef(approvedRef);
  return an.includes(cn) || cn.includes(an);
}

function refInApprovedList(citedRef = '', approvedRefs = []) {
  return (approvedRefs || []).some((approved) => refMatchesApproved(citedRef, approved));
}

function refMatchesPattern(ref = '', pattern) {
  const n = normalizeRef(ref);
  return pattern.test(n) || pattern.test(ref);
}

module.exports = {
  normalizeRef,
  parseScriptureRef,
  refMatchesApproved,
  refInApprovedList,
  refMatchesPattern,
  verseRangesOverlap,
  normalizeBook,
};
