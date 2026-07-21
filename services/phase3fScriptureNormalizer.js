/**
 * Phase 3F — KJV scripture reference normalization and extraction.
 * Preparation only — no production doctrine or card mutations.
 */

const { verifyKjvReference } = require('./teachingCandidateCrossCheck');

const KJV_BOOKS_CANONICAL = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
  '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
  'Nehemiah', 'Esther', 'Job', 'Psalm', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon',
  'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah',
  'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians',
  'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter',
  '1 John', '2 John', '3 John', 'Jude', 'Revelation',
];

const ROMAN_TO_NUM = { I: 1, II: 2, III: 3, IV: 4, V: 5 };

const BOOK_ALIASES = {
  gen: 'Genesis', ex: 'Exodus', exod: 'Exodus', lev: 'Leviticus', num: 'Numbers',
  deut: 'Deuteronomy', dt: 'Deuteronomy', josh: 'Joshua', judg: 'Judges',
  '1 sam': '1 Samuel', '2 sam': '2 Samuel', '1 ki': '1 Kings', '2 ki': '2 Kings',
  '1 chr': '1 Chronicles', '2 chr': '2 Chronicles', neh: 'Nehemiah', est: 'Esther',
  ps: 'Psalms', psa: 'Psalms', prov: 'Proverbs', eccl: 'Ecclesiastes', ecc: 'Ecclesiastes',
  song: 'Song of Solomon', sos: 'Song of Solomon', isa: 'Isaiah', jer: 'Jeremiah',
  lam: 'Lamentations', ezek: 'Ezekiel', dan: 'Daniel', matt: 'Matthew', mt: 'Matthew',
  mk: 'Mark', lk: 'Luke', jn: 'John', rom: 'Romans', cor: 'Corinthians',
  gal: 'Galatians', eph: 'Ephesians', phil: 'Philippians', col: 'Colossians',
  thess: 'Thessalonians', tim: 'Timothy', phlm: 'Philemon', heb: 'Hebrews',
  jas: 'James', pet: 'Peter', rev: 'Revelation', apoc: 'Revelation',
};

function titleCaseBook(book = '') {
  return String(book)
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function cleanJunk(text = '', { preserveLines = false } = {}) {
  let out = String(text)
    .replace(/\(Bookmark\)/gi, ' ')
    .replace(/\b\d+\s+Scriptures?\s*\/\s*\d+\s+Verses?.*$/gim, '')
    .replace(/Chart\/Reference/gi, '');
  if (preserveLines) {
    return out.replace(/[ \t]+/g, ' ').trim();
  }
  return out.replace(/\s+/g, ' ').trim();
}

function resolveBookToken(raw = '') {
  let token = String(raw || '')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  if (!token) return null;

  let explicitNum = null;
  const romanMatch = token.match(/^(i{1,3}|iv|v)\s+(.+)$/i);
  if (romanMatch) {
    explicitNum = String(ROMAN_TO_NUM[romanMatch[1].toUpperCase()] || '');
    token = romanMatch[2];
  } else {
    const numMatch = token.match(/^(\d)\s+(.+)$/);
    if (numMatch) {
      explicitNum = numMatch[1];
      token = numMatch[2];
    }
  }

  for (const book of KJV_BOOKS_CANONICAL.sort((a, b) => b.length - a.length)) {
    const bl = book.toLowerCase();
    const bookNumMatch = bl.match(/^(\d)\s+(.+)$/);
    const bookNum = bookNumMatch ? bookNumMatch[1] : null;
    const bookCore = bookNumMatch ? bookNumMatch[2] : bl;

    if (explicitNum) {
      if (bookNum !== explicitNum) continue;
      if (token === bookCore || token.startsWith(`${bookCore} `)) return book;
      continue;
    }

    if (token === bl) return book;
    if (!bookNum && (token === bookCore || token.startsWith(`${bookCore} `))) return book;
  }

  const aliasKey = token.split(' ').slice(0, 2).join(' ');
  if (BOOK_ALIASES[aliasKey]) {
    const base = BOOK_ALIASES[aliasKey];
    if (explicitNum) return `${explicitNum} ${base.replace(/^\d\s+/, '')}`;
    return base;
  }

  if (BOOK_ALIASES[token.split(' ')[0]]) {
    const base = BOOK_ALIASES[token.split(' ')[0]];
    if (explicitNum) return `${explicitNum} ${base.replace(/^\d\s+/, '')}`;
    return base;
  }

  const titled = titleCaseBook(explicitNum ? `${explicitNum} ${token}` : token);
  for (const book of KJV_BOOKS_CANONICAL) {
    if (titled.toLowerCase() === book.toLowerCase()) return book;
    if (titled.toLowerCase().startsWith(book.toLowerCase())) return book;
  }

  return null;
}

function formatRef(book, chapter, verseStart, verseEnd) {
  if (verseStart == null) return `${book} ${chapter}`;
  if (verseEnd != null && verseEnd !== verseStart) {
    return `${book} ${chapter}:${verseStart}-${verseEnd}`;
  }
  return `${book} ${chapter}:${verseStart}`;
}

function expandVersePart(book, chapter, part = '') {
  const refs = [];
  const segments = String(part).split(',').map((s) => s.trim()).filter(Boolean);
  for (const seg of segments) {
    const rangeMatch = seg.match(/^(\d+)(?:-(\d+))?$/);
    if (rangeMatch) {
      const vs = parseInt(rangeMatch[1], 10);
      const ve = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : vs;
      refs.push(formatRef(book, chapter, vs, ve !== vs ? ve : null));
    }
  }
  return refs;
}

function normalizeScriptureReference(raw = '') {
  const cleaned = cleanJunk(String(raw).replace(/–/g, '-'));
  if (!cleaned) return { raw, normalized: null, valid: false, reason: 'empty' };

  const match = cleaned.match(
    /^((?:\d\s+)?(?:I{1,3}|IV|V|\d)?\s*[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d{1,3})(?::([\d\s,\-]+))?$/,
  );
  if (!match) {
    return { raw, normalized: cleaned, valid: false, reason: 'parse_failed' };
  }

  const book = resolveBookToken(match[1]);
  if (!book) {
    return { raw, normalized: cleaned, valid: false, reason: 'unknown_book' };
  }

  const chapter = parseInt(match[2], 10);
  if (!match[3]) {
    const ref = `${book} ${chapter}`;
    const valid = verifyKjvReference(ref).valid;
    return { raw, normalized: ref, valid, reason: valid ? null : 'missing_verse' };
  }

  const expanded = expandVersePart(book, chapter, match[3]);
  if (!expanded.length) {
    const ref = `${book} ${chapter}`;
    return { raw, normalized: ref, valid: verifyKjvReference(ref).valid, reason: 'partial_chapter' };
  }

  const primary = expanded[0];
  const valid = verifyKjvReference(primary).valid;
  return {
    raw,
    normalized: primary,
    allNormalized: expanded,
    valid,
    reason: valid ? null : 'invalid_kjv',
  };
}

function extractScriptureReferencesFromText(text = '') {
  const linePreserved = cleanJunk(text, { preserveLines: true });
  const cleaned = cleanJunk(text);
  const found = [];
  const seen = new Set();

  const pushRef = (ref) => {
    const norm = normalizeScriptureReference(ref);
    const candidates = norm.allNormalized || (norm.normalized ? [norm.normalized] : []);
    for (const c of candidates) {
      if (!c || !verifyKjvReference(c).valid) continue;
      const key = c.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      found.push(c);
    }
  };

  const lineRe = /^\s*\d+\.\s*((?:\d\s+)?(?:I{1,3}|IV)?\s*[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(.+?)\s*$/;
  for (const line of linePreserved.split(/\n+/)) {
    const m = line.trim().match(lineRe);
    if (!m) continue;
    const book = resolveBookToken(m[1]);
    if (!book) continue;
    const rest = m[2].replace(/[()]/g, ' ').replace(/\(Bookmark\)/gi, ' ').trim();
    const chapMatch = rest.match(/^(\d{1,3})(?::(.+))?/);
    if (!chapMatch) continue;
    const chapter = parseInt(chapMatch[1], 10);
    if (chapMatch[2]) {
      for (const r of expandVersePart(book, chapter, chapMatch[2])) pushRef(r);
    } else {
      pushRef(`${book} ${chapter}`);
    }
  }

  const generalRe = /\b((?:\d\s+)?(?:I{1,3}|IV)?\s*[A-Za-z]+(?:\s+[A-Za-z]+){0,3})\s+(\d{1,3})(?::([\d,\s\-]+))?/g;
  for (const m of cleaned.matchAll(generalRe)) {
    const book = resolveBookToken(m[1]);
    if (!book) continue;
    const chapter = parseInt(m[2], 10);
    if (m[3]) {
      for (const r of expandVersePart(book, chapter, m[3])) pushRef(r);
    } else {
      pushRef(`${book} ${chapter}`);
    }
  }

  return found;
}

function normalizeReferenceList(refs = []) {
  const out = [];
  const seen = new Set();
  const audit = [];

  for (const raw of refs) {
    const norm = normalizeScriptureReference(raw);
    const list = norm.allNormalized || (norm.normalized ? [norm.normalized] : []);
    for (const n of list) {
      audit.push({ raw, normalized: n, valid: verifyKjvReference(n).valid });
      if (!n || !verifyKjvReference(n).valid) continue;
      const key = n.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(n);
    }
  }

  return { normalized: out, audit };
}

module.exports = {
  KJV_BOOKS_CANONICAL,
  normalizeScriptureReference,
  extractScriptureReferencesFromText,
  normalizeReferenceList,
  resolveBookToken,
  cleanJunk,
};
