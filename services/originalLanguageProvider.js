/**
 * Phase 6B — Original-Language Knowledge System.
 *
 * Source-grounded Hebrew/Aramaic/Greek study provider. Implements the
 * OriginalLanguageProvider.getPassageStudy contract from the Phase 6
 * implementation batch.
 *
 * Every token (surface form, lemma, transliteration, Strong's number,
 * morphology code, literal gloss) is read verbatim from the vendored,
 * human-scholarship datasets documented in
 * data/original-language/CORPUS-METADATA.json:
 *   - Hebrew/Aramaic: Open Scriptures Hebrew Bible (OSHB), Westminster
 *     Leningrad Codex base text, CC BY 4.0.
 *   - Greek: Nestle 1904 GNT with morphology/lemma/Strong's numbers
 *     (biblicalhumanities.org), CC0.
 *   - Glosses: digitized Strong's Hebrew/Greek dictionaries (1894/1890),
 *     CC BY-SA.
 *
 * This module NEVER invents a token, lemma, morphology code, Strong's
 * number, or gloss. Where the source data does not cover something, the
 * response says so honestly in `limitations` rather than fabricating.
 *
 * `literalRendering` is assembled deterministically (token gloss order =
 * source token order). No AI call is used anywhere in this module —
 * `studyExplanation` is also built deterministically from the same
 * source-grounded token data, explicitly to avoid any possibility of an
 * LLM inventing linguistic evidence. See PHASE_6B.2 in the batch
 * instructions: "AI may produce a clearly labeled smooth explanation only
 * after the source-grounded rendering exists" — this batch chose the
 * strictly safer deterministic path instead of invoking the LLM.
 */

const fs = require('fs');
const path = require('path');
const { parseScriptureRef } = require('./scriptureReferenceNormalizer');
const { getPassage: getKjvPassage } = require('./bibleTextProvider');
const { buildTopicWitnessRegistry, findTopicMatchesForReference } = require('./topicWitnessRegistry');

const HEBREW_ROOT = path.join(__dirname, '..', 'data', 'original-language', 'hebrew-aramaic', 'raw');
const GREEK_CSV_PATH = path.join(__dirname, '..', 'data', 'original-language', 'greek', 'raw', 'Nestle1904.csv');
const STRONGS_HEBREW_PATH = path.join(__dirname, '..', 'data', 'original-language', 'strongs', 'strongs-hebrew-dictionary.js');
const STRONGS_GREEK_PATH = path.join(__dirname, '..', 'data', 'original-language', 'strongs', 'strongs-greek-dictionary.js');

// Full lowercase book name (as produced by scriptureReferenceNormalizer) ->
// OSHB OSIS file id. Only the 39 protocanonical OT books — no guessing.
const OT_BOOK_TO_OSIS = {
  genesis: 'Gen', exodus: 'Exod', leviticus: 'Lev', numbers: 'Num', deuteronomy: 'Deut',
  joshua: 'Josh', judges: 'Judg', ruth: 'Ruth',
  '1 samuel': '1Sam', '2 samuel': '2Sam', '1 kings': '1Kgs', '2 kings': '2Kgs',
  '1 chronicles': '1Chr', '2 chronicles': '2Chr', ezra: 'Ezra', nehemiah: 'Neh', esther: 'Esth',
  job: 'Job', psalms: 'Ps', psalm: 'Ps', proverbs: 'Prov', ecclesiastes: 'Eccl',
  'song of solomon': 'Song', 'song of songs': 'Song', canticles: 'Song',
  isaiah: 'Isa', jeremiah: 'Jer', lamentations: 'Lam', ezekiel: 'Ezek', daniel: 'Dan',
  hosea: 'Hos', joel: 'Joel', amos: 'Amos', obadiah: 'Obad', jonah: 'Jonah', micah: 'Mic',
  nahum: 'Nah', habakkuk: 'Hab', zephaniah: 'Zeph', haggai: 'Hag', zechariah: 'Zech', malachi: 'Mal',
};

// Full lowercase book name -> Nestle1904 CSV book token. Only the 27 NT books.
const NT_BOOK_TO_N1904 = {
  matthew: 'Matt', mark: 'Mark', luke: 'Luke', john: 'John', acts: 'Acts',
  romans: 'Rom', '1 corinthians': '1Cor', '2 corinthians': '2Cor', galatians: 'Gal',
  ephesians: 'Eph', philippians: 'Phil', colossians: 'Col', '1 thessalonians': '1Thess',
  '2 thessalonians': '2Thess', '1 timothy': '1Tim', '2 timothy': '2Tim', titus: 'Titus',
  philemon: 'Phlm', hebrews: 'Heb', james: 'Jas', '1 peter': '1Pet', '2 peter': '2Pet',
  '1 john': '1John', '2 john': '2John', '3 john': '3John', jude: 'Jude', revelation: 'Rev',
  revelations: 'Rev', 'the revelation': 'Rev',
};

let strongsHebrew = null;
let strongsGreek = null;
function loadStrongs() {
  if (!strongsHebrew) {
    try { strongsHebrew = require(STRONGS_HEBREW_PATH); } catch (_) { strongsHebrew = {}; }
  }
  if (!strongsGreek) {
    try { strongsGreek = require(STRONGS_GREEK_PATH); } catch (_) { strongsGreek = {}; }
  }
}

// One parsed-book cache entry per OT book:
//   { hebrewVerses: Map<'Gen.1.1', [{surface,lemma,morph,language}]>,
//     kjvToHebrewVerseIds: Map<'Ps.22.1', ['Ps.22.1','Ps.22.2']> }
//
// Hebrew (Masoretic) versification frequently differs from KJV versification
// — most visibly in the Psalms, where a musical/authorial superscription is
// numbered as Hebrew verse 1 while the KJV folds it into the same verse as
// the following text. OSHB documents every such divergence explicitly with
// an inline <note>KJV:Book.Chapter.Verse</note> naming the correct KJV
// target for that Hebrew verse; where no note is present, OSHB's own
// documented convention is that the Hebrew verse number already equals the
// KJV verse number. This module trusts that documented crosswalk exactly —
// it never guesses a versification offset itself.
const otBookCache = new Map();
const otBookLoadError = new Map();

const WORD_RE = /<w\s+lemma="([^"]*)"(?:\s+n="[^"]*")?\s+morph="([^"]*)"\s+id="[^"]*">([^<]*)<\/w>/g;
const VERSE_RE = /<verse\s+osisID="([^"]+)">([\s\S]*?)<\/verse>/g;
const NOTE_RE = /<note>KJV:([^<]+)<\/note>/;

function parseOtBook(osisId) {
  if (otBookCache.has(osisId)) return otBookCache.get(osisId);
  const filePath = path.join(HEBREW_ROOT, `${osisId}.xml`);
  let xml;
  try {
    xml = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    otBookLoadError.set(osisId, String(e?.message || e));
    return null;
  }
  const hebrewVerses = new Map();
  const kjvToHebrewVerseIds = new Map();
  let vMatch;
  VERSE_RE.lastIndex = 0;
  while ((vMatch = VERSE_RE.exec(xml)) !== null) {
    const osisVerseId = vMatch[1]; // Hebrew (Masoretic) numbering, e.g. "Ps.22.2"
    const body = vMatch[2];
    const tokens = [];
    let wMatch;
    WORD_RE.lastIndex = 0;
    while ((wMatch = WORD_RE.exec(body)) !== null) {
      const [, lemma, morph, surface] = wMatch;
      const language = morph.startsWith('A') ? 'ARAMAIC' : morph.startsWith('H') ? 'HEBREW' : 'UNKNOWN';
      tokens.push({ surface, lemma, morph, language });
    }
    if (tokens.length) hebrewVerses.set(osisVerseId, tokens);

    const noteMatch = NOTE_RE.exec(body);
    const kjvTargetId = noteMatch ? noteMatch[1] : osisVerseId; // OSHB's documented default: no note = same numbering.
    if (!kjvToHebrewVerseIds.has(kjvTargetId)) kjvToHebrewVerseIds.set(kjvTargetId, []);
    kjvToHebrewVerseIds.get(kjvTargetId).push(osisVerseId);
  }
  const parsedBook = { hebrewVerses, kjvToHebrewVerseIds };
  otBookCache.set(osisId, parsedBook);
  return parsedBook;
}

// Greek NT: parsed once, cached fully (file is a manageable ~9MB / 138k rows).
let ntVerseIndex = null;
let ntLoadError = null;
function loadNtIndex() {
  if (ntVerseIndex || ntLoadError) return;
  try {
    const raw = fs.readFileSync(GREEK_CSV_PATH, 'utf8');
    const lines = raw.split('\n');
    ntVerseIndex = new Map();
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || !line.trim()) continue;
      const cols = line.split('\t');
      if (cols.length < 6) continue;
      const bcv = cols[0].replace(/^\uFEFF/, '').trim();
      const [text, funcMorph, , strongs, lemma, normalized] = [cols[1], cols[2], cols[3], cols[4], cols[5], cols[6]];
      if (!bcv) continue;
      if (!ntVerseIndex.has(bcv)) ntVerseIndex.set(bcv, []);
      ntVerseIndex.get(bcv).push({
        surface: (normalized || text || '').trim(),
        surfaceWithPunctuation: (text || '').trim(),
        lemma: (lemma || '').trim(),
        morph: (funcMorph || '').trim(),
        strongs: (strongs || '').trim(),
        language: 'GREEK',
      });
    }
  } catch (e) {
    ntLoadError = String(e?.message || e);
  }
}

function resolveLanguageAndKey(parsed) {
  const book = parsed.book;
  const verseStart = parsed.verseStart || 1;
  const verseEnd = parsed.verseEnd || verseStart;
  const verseNums = [];
  for (let v = verseStart; v <= verseEnd; v++) verseNums.push(v);

  if (OT_BOOK_TO_OSIS[book]) {
    const osisId = OT_BOOK_TO_OSIS[book];
    return {
      testament: 'OLD',
      osisId,
      verseKeys: verseNums.map((v) => `${osisId}.${parsed.chapter}.${v}`),
    };
  }
  if (NT_BOOK_TO_N1904[book]) {
    const n1904Book = NT_BOOK_TO_N1904[book];
    return {
      testament: 'NEW',
      n1904Book,
      verseKeys: verseNums.map((v) => `${n1904Book} ${parsed.chapter}:${v}`),
    };
  }
  return null;
}

/**
 * Strong's `kjv_def` is the dictionary's own complete list of every English
 * word/phrase the KJV translators used for this lemma somewhere in
 * Scripture (e.g. H430 "Elohim" legitimately includes "angels" because
 * Psalm 8:5 KJV renders it that way) — it is authoritative, not an error,
 * but showing the entire list for every token makes a word-by-word literal
 * rendering unreadable. This deterministically takes only the first listed
 * rendering (Strong's own dictionary ordering) for the compact gloss, while
 * `fullDefinition`/the caller-visible full `kjv_def` list is preserved
 * unabridged for anyone who wants the complete entry. This is a string
 * truncation of vendored data, never an invented or AI-selected word.
 */
function primaryGlossFrom(kjvDef) {
  if (!kjvDef) return null;
  const firstSegment = String(kjvDef).split(',')[0];
  return firstSegment
    .replace(/\[idiom\]/gi, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[.;:]+\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim() || null;
}

function strongsLookup(strongsRaw, language) {
  loadStrongs();
  if (!strongsRaw) return null;
  // OSHB lemma field format: "1254 a" (number + optional disambiguation
  // letter) or compound forms like "b/7225" (prefix morpheme + number).
  // Nestle1904 strongs field format: "1510&5707" (main number & TVM number).
  const firstToken = String(strongsRaw).split('&')[0].split('/').pop().trim();
  const numeric = firstToken.match(/\d+/);
  if (!numeric) return null;
  const num = numeric[0];
  const key = language === 'GREEK' ? `G${num}` : `H${num.padStart(4, '0')}`;
  const dict = language === 'GREEK' ? strongsGreek : strongsHebrew;
  const entry = dict[key] || dict[`H${num}`] || dict[`G${num}`];
  if (!entry) return null;
  return {
    strongsNumber: key,
    lemma: entry.lemma || null,
    transliteration: entry.xlit || entry.translit || null,
    literalGloss: primaryGlossFrom(entry.kjv_def) || entry.strongs_def || null,
    allKjvRenderings: entry.kjv_def || null,
    fullDefinition: entry.strongs_def || null,
  };
}

/**
 * Core contract: OriginalLanguageProvider.getPassageStudy({ reference, baselineTranslation }).
 */
async function getPassageStudy({ reference = '', baselineTranslation = 'KJV' } = {}) {
  const ref = String(reference || '').trim();
  const limitations = [];
  const parsed = parseScriptureRef(ref);
  if (!parsed || !parsed.book || !parsed.chapter) {
    return {
      reference: ref,
      ok: false,
      error: 'unparseable_reference',
      kjvText: null,
      sourceLanguage: null,
      originalText: null,
      tokens: [],
      literalRendering: null,
      studyExplanation: null,
      textualNotes: [],
      provenance: null,
      confidence: 'none',
      limitations: ['Reference could not be parsed into book/chapter/verse.'],
    };
  }

  const resolved = resolveLanguageAndKey(parsed);
  const kjvResult = await getKjvPassage(ref, { translation: baselineTranslation });
  const kjvText = kjvResult && kjvResult.ok ? kjvResult.text : null;
  if (!kjvResult || !kjvResult.ok) {
    limitations.push(`Baseline ${baselineTranslation} text unavailable: ${kjvResult ? kjvResult.error : 'no provider result'}.`);
  }

  if (!resolved) {
    return {
      reference: ref,
      ok: false,
      error: 'book_not_in_original_language_corpus',
      kjvText,
      sourceLanguage: null,
      originalText: null,
      tokens: [],
      literalRendering: null,
      studyExplanation: null,
      textualNotes: [],
      provenance: null,
      confidence: 'none',
      limitations: [`"${parsed.book}" is not one of the 66 canonical books covered by the vendored original-language corpus.`],
    };
  }

  let rawTokens = [];
  if (resolved.testament === 'OLD') {
    const parsedBook = parseOtBook(resolved.osisId);
    if (!parsedBook) {
      limitations.push(`Hebrew/Aramaic source file for "${parsed.book}" failed to load: ${otBookLoadError.get(resolved.osisId) || 'unknown error'}.`);
    } else {
      const versificationNotes = [];
      for (const verseKey of resolved.verseKeys) {
        const hebrewVerseIds = parsedBook.kjvToHebrewVerseIds.get(verseKey) || [verseKey];
        if (hebrewVerseIds.length > 1 || hebrewVerseIds[0] !== verseKey) {
          versificationNotes.push(`${verseKey} -> Hebrew ${hebrewVerseIds.join(', ')}`);
        }
        for (const hvId of hebrewVerseIds) {
          const vTokens = parsedBook.hebrewVerses.get(hvId);
          if (vTokens) rawTokens.push(...vTokens);
        }
      }
      if (versificationNotes.length) {
        limitations.push(`Hebrew (Masoretic) versification differs from KJV here per OSHB's documented crosswalk: ${versificationNotes.join('; ')}.`);
      }
      if (!rawTokens.length) limitations.push(`No Hebrew/Aramaic tokens found for ${resolved.verseKeys.join(', ')} in the vendored OSHB file (verse may not exist).`);
    }
  } else {
    loadNtIndex();
    if (ntLoadError) {
      limitations.push(`Greek source file failed to load: ${ntLoadError}.`);
    } else {
      for (const verseKey of resolved.verseKeys) {
        const vTokens = ntVerseIndex.get(verseKey);
        if (vTokens) rawTokens.push(...vTokens);
      }
      if (!rawTokens.length) limitations.push(`No Greek tokens found for ${resolved.verseKeys.join(', ')} in the vendored Nestle 1904 file.`);
    }
  }

  const languagesPresent = new Set(rawTokens.map((t) => t.language));
  const sourceLanguage = languagesPresent.size > 1
    ? 'MIXED_HEBREW_ARAMAIC'
    : (rawTokens[0] && rawTokens[0].language) || null;

  const tokens = rawTokens.map((t) => {
    const strongsInfo = strongsLookup(t.strongs || t.lemma, t.language);
    return {
      surface: t.surfaceWithPunctuation || t.surface,
      lemma: (strongsInfo && strongsInfo.lemma) || t.lemma,
      transliteration: strongsInfo ? strongsInfo.transliteration : null,
      strongs: strongsInfo ? strongsInfo.strongsNumber : (t.strongs || null),
      morphology: t.morph,
      grammaticalRole: t.morph,
      literalGloss: strongsInfo ? strongsInfo.literalGloss : null,
      allKjvRenderings: strongsInfo ? strongsInfo.allKjvRenderings : null,
      sourceDataset: t.language === 'GREEK'
        ? 'Nestle 1904 GNT morphology/lemma/Strong\'s (biblicalhumanities.org, CC0) + Strong\'s Greek Dictionary (Open Scriptures, CC BY-SA)'
        : `Open Scriptures Hebrew Bible morphology (CC BY 4.0) + Strong's Hebrew/Aramaic Dictionary (Open Scriptures, CC BY-SA)`,
      language: t.language,
    };
  });

  const missingGloss = tokens.filter((t) => !t.literalGloss).length;
  if (tokens.length && missingGloss > 0) {
    limitations.push(`${missingGloss} of ${tokens.length} token(s) had no Strong's dictionary match — those tokens show the source lemma/morphology only, with no invented gloss.`);
  }

  const literalRendering = tokens.length
    ? tokens.map((t) => t.literalGloss || `[${t.lemma || t.surface}]`).join(' ')
    : null;

  const studyExplanation = tokens.length
    ? buildDeterministicStudyExplanation(tokens, sourceLanguage)
    : null;

  // Witness/cross-reference enrichment: verse-level lookup against the
  // existing topic/witness registry (additive, never invented).
  let primaryWitness = null;
  let supportingWitnesses = [];
  let crossReferences = [];
  try {
    const registry = buildTopicWitnessRegistry();
    const topicMatches = findTopicMatchesForReference(ref, registry);
    const exactOrChapterMatch = topicMatches.find((m) => m.matchKind !== 'SAME_BOOK_ONLY');
    if (exactOrChapterMatch) {
      const topic = registry.get(exactOrChapterMatch.topicId);
      const primaryArr = Array.from(topic.primaryWitnesses || []);
      const supportingArr = Array.from(topic.supportingWitnesses || []);
      primaryWitness = primaryArr[0] ? { reference: primaryArr[0], topicId: topic.id } : null;
      supportingWitnesses = supportingArr.slice(0, 3).map((r) => ({ reference: r, topicId: topic.id }));
    }
  } catch (_) {
    // Registry lookup is enrichment-only; never blocks the base study result.
  }

  return {
    reference: ref,
    ok: tokens.length > 0,
    kjvText,
    sourceLanguage,
    originalText: tokens.map((t) => t.surface).join(' '),
    tokens,
    literalRendering: literalRendering ? `Literal study rendering from the available source data: ${literalRendering}` : null,
    studyExplanation,
    textualNotes: sourceLanguage === 'MIXED_HEBREW_ARAMAIC'
      ? ['This verse contains both Hebrew and Aramaic tokens (marked per-word above); see the Book of Daniel/Ezra Aramaic sections.']
      : [],
    provenance: resolved.testament === 'OLD'
      ? 'Open Scriptures Hebrew Bible (Westminster Leningrad Codex, CC BY 4.0) + Strong\'s Hebrew/Aramaic Dictionary (CC BY-SA)'
      : 'Nestle 1904 Greek New Testament morphology/lemma/Strong\'s (biblicalhumanities.org, CC0) + Strong\'s Greek Dictionary (CC BY-SA)',
    confidence: tokens.length ? (missingGloss === 0 ? 'high' : 'medium') : 'none',
    limitations,
    primaryWitness,
    supportingWitnesses,
    crossReferences,
  };
}

function buildDeterministicStudyExplanation(tokens, sourceLanguage) {
  const langLabel = sourceLanguage === 'MIXED_HEBREW_ARAMAIC' ? 'Hebrew and Aramaic' : (sourceLanguage || '').toLowerCase();
  const hasSegmentStartingWith = (morph, letters) => String(morph || '')
    .split('/')
    .some((seg) => letters.includes(seg.replace(/^[HA]/, '').charAt(0)));
  const verbCount = tokens.filter((t) => hasSegmentStartingWith(t.morphology, 'V')).length;
  const nounCount = tokens.filter((t) => hasSegmentStartingWith(t.morphology, 'N')).length;
  const parts = [
    `This ${tokens.length}-word ${langLabel} passage is shown above word-by-word.`,
  ];
  if (nounCount) parts.push(`It contains ${nounCount} noun-form token(s)`);
  if (verbCount) parts.push(`${nounCount ? 'and' : 'It contains'} ${verbCount} verb-form token(s)`);
  parts.push('(see the morphology code on each token for the precise grammatical form).');
  return `${parts.join(' ')} This explanation is assembled deterministically from the source morphology data — no AI model generated or altered any linguistic fact above.`;
}

module.exports = {
  getPassageStudy,
  OT_BOOK_TO_OSIS,
  NT_BOOK_TO_N1904,
};
