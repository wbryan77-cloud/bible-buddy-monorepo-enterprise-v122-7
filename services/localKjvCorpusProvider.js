/**
 * Phase 6 — Local KJV Corpus Provider.
 *
 * Deterministic, offline, zero-network lookup over the vendored public-domain
 * KJV corpus at data/kjv-corpus/raw (see data/kjv-corpus/CORPUS-METADATA.json
 * for source, license, and validation provenance). This is Tier 1 of
 * services/bibleTextProvider.js's documented preferred provider order.
 *
 * This module NEVER generates, infers, or fabricates verse text. Every
 * response either comes verbatim from the vendored corpus files or is an
 * honest "not found" result.
 */

const fs = require('fs');
const path = require('path');
const { parseScriptureRef } = require('./scriptureReferenceNormalizer');

const CORPUS_ROOT = path.join(__dirname, '..', 'data', 'kjv-corpus', 'raw');
const BOOKS_INDEX_PATH = path.join(CORPUS_ROOT, 'books.json');
const SOURCE_NAME = 'Local KJV Corpus (public domain King James Version, vendored offline)';
const PROVIDER_NAME = 'local_kjv_corpus';

let booksIndex = null;
let bookNameToNumber = null;
let loadError = null;

// Common singular/plural and alternate-title variants that
// scriptureReferenceNormalizer.normalizeBook() passes through unchanged
// (it only rewrites abbreviations, e.g. "gen" -> "genesis"). These are
// name aliases only — never a different book, never a guess.
const BOOK_NAME_ALIASES = {
  psalm: 'psalms',
  'song of songs': 'song of solomon',
  canticles: 'song of solomon',
  revelations: 'revelation',
  'the revelation': 'revelation',
};

function loadBooksIndex() {
  if (booksIndex || loadError) return;
  try {
    const raw = fs.readFileSync(BOOKS_INDEX_PATH, 'utf8');
    booksIndex = JSON.parse(raw);
    bookNameToNumber = new Map();
    booksIndex.forEach((entry, idx) => {
      bookNameToNumber.set(entry.name.toLowerCase(), idx + 1);
    });
  } catch (e) {
    loadError = String(e?.message || e);
  }
}

/**
 * True only when the corpus index loaded successfully and has the expected
 * 66-book shape. Never reports true from a partially-loaded or corrupt
 * corpus — callers must be able to trust this before routing to Tier 1.
 */
function isCorpusReady() {
  // Test-only escape hatch to deterministically simulate a local-corpus
  // outage (Phase 6 failure-mode test matrix: "local KJV unavailable").
  // Never set in production; checked at call time so tests can toggle it
  // without re-requiring this module.
  if (process.env.LOCAL_KJV_CORPUS_FORCE_UNAVAILABLE === '1') return false;
  loadBooksIndex();
  return !loadError && Array.isArray(booksIndex) && booksIndex.length === 66;
}

function getCorpusLoadError() {
  loadBooksIndex();
  return loadError;
}

function getBookNumber(normalizedBookName) {
  loadBooksIndex();
  if (!bookNameToNumber) return null;
  if (bookNameToNumber.has(normalizedBookName)) return bookNameToNumber.get(normalizedBookName);
  const aliased = BOOK_NAME_ALIASES[normalizedBookName];
  if (aliased && bookNameToNumber.has(aliased)) return bookNameToNumber.get(aliased);
  // Tolerate minor punctuation/whitespace drift already normalized upstream,
  // and partial-name matches only when unambiguous (e.g. "corinthians" alone
  // is intentionally NOT resolved — a book number must be explicit: "1
  // corinthians" or "2 corinthians" — this never guesses a book).
  return null;
}

function stripKjvMarkup(rawVerseText = '') {
  return String(rawVerseText || '')
    // Translators' supplied-word italics: keep the words, drop the tags.
    .replace(/<FI>/g, '').replace(/<Fi>/g, '')
    // Marginal/alternate-reading footnotes: not the primary verse text.
    .replace(/<RF>[\s\S]*?<Rf>/g, '')
    // Paragraph marker: no semantic text content.
    .replace(/<CM>/g, '')
    // Any other stray markup tag from the source format, defensively.
    .replace(/<\/?[A-Za-z]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadChapterVerses(bookNumber, chapter) {
  const chapterPath = path.join(CORPUS_ROOT, 'resources', String(bookNumber), `${chapter}.json`);
  const raw = fs.readFileSync(chapterPath, 'utf8');
  const verses = JSON.parse(raw);
  if (!Array.isArray(verses)) throw new Error('malformed_chapter_file');
  return verses;
}

/**
 * Retrieve a single passage (verse or verse range within one chapter) from
 * the local corpus. Matches the same result shape as
 * services/canonicalScriptureProvider.fetchCanonicalScripture so
 * bibleTextProvider can slot this in as Tier 1 without any caller changes.
 */
function getLocalPassage(reference = '') {
  const startedAt = Date.now();
  const ref = String(reference || '').trim();
  if (!ref) {
    return { ok: false, reference: ref, error: 'empty_reference', providerName: PROVIDER_NAME, cacheHit: false, latencyMs: 0 };
  }

  if (!isCorpusReady()) {
    return {
      ok: false,
      reference: ref,
      error: `local_corpus_unavailable: ${getCorpusLoadError() || 'unknown'}`,
      providerName: PROVIDER_NAME,
      cacheHit: false,
      latencyMs: Date.now() - startedAt,
    };
  }

  const parsed = parseScriptureRef(ref);
  if (!parsed || !parsed.book || !parsed.chapter) {
    return {
      ok: false,
      reference: ref,
      error: 'unparseable_reference',
      providerName: PROVIDER_NAME,
      cacheHit: false,
      latencyMs: Date.now() - startedAt,
    };
  }

  const bookNumber = getBookNumber(parsed.book);
  if (!bookNumber) {
    return {
      ok: false,
      reference: ref,
      error: `unknown_book: ${parsed.book}`,
      providerName: PROVIDER_NAME,
      cacheHit: false,
      latencyMs: Date.now() - startedAt,
    };
  }

  const bookMeta = booksIndex[bookNumber - 1];
  if (parsed.chapter < 1 || parsed.chapter > bookMeta.chapters) {
    return {
      ok: false,
      reference: ref,
      error: `chapter_out_of_range: ${bookMeta.name} has ${bookMeta.chapters} chapters`,
      providerName: PROVIDER_NAME,
      cacheHit: false,
      latencyMs: Date.now() - startedAt,
    };
  }

  let verses;
  try {
    verses = loadChapterVerses(bookNumber, parsed.chapter);
  } catch (e) {
    return {
      ok: false,
      reference: ref,
      error: `chapter_load_failed: ${String(e?.message || e)}`,
      providerName: PROVIDER_NAME,
      cacheHit: false,
      latencyMs: Date.now() - startedAt,
    };
  }

  const verseStart = parsed.verseStart || 1;
  const verseEnd = parsed.verseEnd || (parsed.verseStart ? parsed.verseStart : verses.length);

  if (verseStart < 1 || verseStart > verses.length) {
    return {
      ok: false,
      reference: ref,
      error: `verse_out_of_range: ${bookMeta.name} ${parsed.chapter} has ${verses.length} verses`,
      providerName: PROVIDER_NAME,
      cacheHit: false,
      latencyMs: Date.now() - startedAt,
    };
  }

  const clampedEnd = Math.min(verseEnd, verses.length);
  const slice = verses.slice(verseStart - 1, clampedEnd);
  const text = slice.map(stripKjvMarkup).join(' ').replace(/\s+/g, ' ').trim();

  return {
    ok: true,
    reference: ref,
    text,
    translation: 'King James Version',
    source: SOURCE_NAME,
    providerName: PROVIDER_NAME,
    cacheHit: false,
    latencyMs: Date.now() - startedAt,
  };
}

/**
 * Deterministic full-canon coverage snapshot used by the Phase 6A coverage
 * analyzer. Never touched on the hot chat-request path — this walks all 66
 * books once per call and is intended for reporting/admin/test use only.
 */
function getCorpusCoverageSummary() {
  loadBooksIndex();
  if (!isCorpusReady()) {
    return { ready: false, error: getCorpusLoadError(), books: [] };
  }
  const books = booksIndex.map((meta, idx) => {
    const bookNumber = idx + 1;
    let chaptersWithText = 0;
    let totalVerses = 0;
    for (let c = 1; c <= meta.chapters; c++) {
      try {
        const verses = loadChapterVerses(bookNumber, c);
        if (Array.isArray(verses) && verses.length > 0) {
          chaptersWithText += 1;
          totalVerses += verses.length;
        }
      } catch (_) {
        // Leave uncounted — an honest gap, not a fabricated count.
      }
    }
    return {
      bookNumber,
      name: meta.name,
      testament: bookNumber <= 39 ? 'OLD' : 'NEW',
      totalChapters: meta.chapters,
      chaptersWithLocalText: chaptersWithText,
      totalVerses,
      fullTextAvailable: chaptersWithText === meta.chapters,
    };
  });
  return { ready: true, error: null, books };
}

module.exports = {
  PROVIDER_NAME,
  SOURCE_NAME,
  isCorpusReady,
  getCorpusLoadError,
  getLocalPassage,
  getCorpusCoverageSummary,
  stripKjvMarkup,
};
