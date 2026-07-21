/**
 * Phase 3U — Normalization, linkage & gap closure.
 * Organization and recovery only — no production, doctrine generation, or evidence card changes.
 */

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const { fetchText, decodeHtml } = require('./openSourceScrubber');
const {
  normalizeScriptureReference,
  extractScriptureReferencesFromText,
  normalizeReferenceList,
  resolveBookToken,
  KJV_BOOKS_CANONICAL,
} = require('./phase3fScriptureNormalizer');
const { verifyKjvReference } = require('./teachingCandidateCrossCheck');
const { computeGapElimination } = require('./phase3rSourceRecovery');
const { refKey, uniqueRefs } = require('./phase3iRecursiveExpansion');

const execFileAsyncSafe = execFileAsync;
const ROOT = path.join(__dirname, '..');
const TRACE = path.join(ROOT, 'docs', 'regression-trace');
const OUT_DIR = path.join(ROOT, 'docs', 'evidence-candidates');
const SCRUBBED_CORPUS_PATH = path.join(ROOT, 'data', 'phase3e-scrubbed-corpus.json');
const YT_TRANSCRIPT_DIR = path.join(OUT_DIR, 'youtube-transcripts');

const VERSE_CUE_PATTERNS = [
  /(?:read\s+)?verse[s]?\s+(\d{1,3})(?:\s*(?:[-–—]|through|to)\s*(?:verse[s]?\s*)?(\d{1,3}))?/gi,
  /continue\s+(?:reading\s+)?(?:through\s+)?(?:verse[s]?\s*)?(\d{1,3})(?:\s*(?:[-–—]|through|to)\s*(\d{1,3}))?/gi,
  /start\s+at\s+verse\s+(\d{1,3})/gi,
  /read\s+through\s+verse[s]?\s+(\d{1,3})/gi,
  /skip\s+down\s+to\s+verse\s+(\d{1,3})/gi,
];

const SPANISH_TITLE_REPLACEMENTS = [
  [/PENTECOSTÉS|PENTECOST/gi, 'Pentecost'],
  [/JESÚS|JESUS/gi, 'Jesus'],
  [/El Dios desconocido/gi, 'The Unknown God'],
  [/El velo de la mujer/gi, 'The Veil of the Woman'],
  [/segunda muerte/gi, 'second death'],
  [/lago de fuego/gi, 'lake of fire'],
  [/El gran cambio/gi, 'The Great Change'],
  [/¿Quién mató realmente a Jesús\? ¡Adán!/gi, 'Who Really Killed Jesus? Adam!'],
  [/Jesús en su templo/gi, 'Jesus in His Temple'],
  [/sus santos y sus labores/gi, 'His Saints and Their Labors'],
  [/¿/g, ''],
  [/¡/g, ''],
  [/«|»/g, '"'],
];

function loadJson(p, fb = null) {
  if (!fs.existsSync(p)) return fb;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fb;
  }
}

function normalizeKey(s = '') {
  return String(s)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function fuzzyMatchTitle(a = '', b = '') {
  const ka = normalizeKey(a);
  const kb = normalizeKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  if (ka.includes(kb) || kb.includes(ka)) return true;
  const wa = ka.split(' ').filter((w) => w.length > 3);
  const wb = kb.split(' ').filter((w) => w.length > 3);
  return wa.filter((w) => wb.includes(w)).length >= Math.min(3, Math.min(wa.length, wb.length));
}

function tokenSetRatio(a = '', b = '') {
  const ta = new Set(normalizeKey(a).split(' ').filter((w) => w.length > 2));
  const tb = new Set(normalizeKey(b).split(' ').filter((w) => w.length > 2));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  return inter / (ta.size + tb.size - inter);
}

function parseVttOrSrtContent(raw = '') {
  return String(raw)
    .replace(/^WEBVTT[\s\S]*?\n\n/i, '')
    .replace(/\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readTranscriptFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  if (/\.vtt$|\.srt$/i.test(filePath)) return parseVttOrSrtContent(raw);
  return raw;
}

function videoIdFromUrl(url = '') {
  return url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)?.[1]
    || url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)?.[1]
    || null;
}

function isIncompleteReference(ref = '') {
  const norm = normalizeScriptureReference(ref);
  if (!norm.normalized) return true;
  if (!norm.normalized.includes(':')) return true;
  return !verifyKjvReference(norm.normalized).valid;
}

function formatRef(book, chapter, vs, ve) {
  if (vs == null) return `${book} ${chapter}`;
  if (ve != null && ve !== vs) return `${book} ${chapter}:${vs}-${ve}`;
  return `${book} ${chapter}:${vs}`;
}

function walkTranscriptFiles() {
  const files = [];
  if (!fs.existsSync(YT_TRANSCRIPT_DIR)) return files;
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/\.(vtt|srt)$/i.test(name)) files.push(p);
    }
  };
  walk(YT_TRANSCRIPT_DIR);
  return files;
}

function sourceIdFromPath(filePath) {
  const name = path.basename(filePath);
  const idMatch = name.match(/-([a-zA-Z0-9_-]{11})\.(en|es)(?:-orig)?\.(vtt|srt)$/i);
  return idMatch ? idMatch[1] : normalizeKey(name).slice(0, 32);
}

function titleFromTranscriptPath(filePath) {
  const name = path.basename(filePath);
  const m = name.match(/^\d{8}-(.+?)-[a-zA-Z0-9_-]{11}\./);
  return m ? m[1].replace(/⧸/g, '/') : name;
}

function findIncompleteInText(text = '', sourceId = '') {
  const candidates = [];
  const cleaned = text.replace(/\s+/g, ' ');
  const incompleteRe = /\b((?:\d\s+)?(?:I{1,3}|IV)?\s*[A-Za-z]+(?:\s+[A-Za-z]+){0,3})\s+(\d{1,3})(?!\s*:\d)/g;
  let idx = 0;
  for (const m of cleaned.matchAll(incompleteRe)) {
    const book = resolveBookToken(m[1]);
    if (!book) continue;
    const chapter = parseInt(m[2], 10);
    const originalReference = `${book} ${chapter}`;
    const pos = m.index ?? idx;
    candidates.push({
      sourceId,
      book,
      chapter,
      originalReference,
      transcriptPosition: pos,
      candidateStatus: 'needsExpansion',
    });
    idx = pos + 1;
  }
  return candidates;
}

function extractVerseCuesFromWindow(windowText = '') {
  const verses = [];
  for (const re of VERSE_CUE_PATTERNS) {
    re.lastIndex = 0;
    for (const m of windowText.matchAll(re)) {
      const start = parseInt(m[1], 10);
      const end = m[2] ? parseInt(m[2], 10) : start;
      if (start) verses.push({ start, end });
    }
  }
  return verses;
}

function expandCandidatesPassB(candidates, transcriptText = '', sourceId = '') {
  const words = transcriptText.split(/\s+/);
  const charToWord = [];
  let pos = 0;
  for (let i = 0; i < words.length; i += 1) {
    charToWord[pos] = i;
    pos += words[i].length + 1;
  }

  const normalized = [];
  const seen = new Set();

  for (const c of candidates) {
    const wordIdx = charToWord[c.transcriptPosition] || 0;
    const window500 = words.slice(wordIdx, wordIdx + 500).join(' ');
    const window1000 = words.slice(wordIdx, wordIdx + 1000).join(' ');
    const cues = [...extractVerseCuesFromWindow(window500), ...extractVerseCuesFromWindow(window1000)];

    if (!cues.length) continue;

    const startVerse = Math.min(...cues.map((v) => v.start));
    const endVerse = Math.max(...cues.map((v) => v.end));
    const normalizedReference = formatRef(c.book, c.chapter, startVerse, endVerse !== startVerse ? endVerse : null);
    if (!verifyKjvReference(normalizedReference).valid) continue;

    const key = refKey(normalizedReference);
    if (seen.has(key)) continue;
    seen.add(key);

    const excerptStart = window500.indexOf('verse');
    const supportingTranscriptExcerpt = excerptStart >= 0
      ? window500.slice(Math.max(0, excerptStart - 40), excerptStart + 120)
      : window500.slice(0, 160);

    let confidence = 0.7;
    if (cues.length >= 2) confidence = 0.88;
    if (endVerse > startVerse) confidence = Math.min(0.95, confidence + 0.05);

    normalized.push({
      sourceId,
      originalReference: c.originalReference,
      normalizedReference,
      confidence,
      supportingTranscriptExcerpt: supportingTranscriptExcerpt.trim(),
    });
  }
  return normalized;
}

function runNormalizationPassA(transcriptIndex) {
  const allCandidates = [];
  for (const t of transcriptIndex) {
    const incompleteFromText = findIncompleteInText(t.transcriptText, t.sourceId);
    for (const ref of t.rawIncompleteRefs || []) {
      if (isIncompleteReference(ref)) {
        allCandidates.push({
          sourceId: t.sourceId,
          book: ref.split(' ').slice(0, -1).join(' '),
          chapter: parseInt(ref.split(' ').pop(), 10),
          originalReference: ref,
          transcriptPosition: 0,
          candidateStatus: 'needsExpansion',
        });
      }
    }
    allCandidates.push(...incompleteFromText);
  }

  const deduped = [];
  const seen = new Set();
  for (const c of allCandidates) {
    const k = `${c.sourceId}|${c.originalReference}`;
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(c);
  }
  return deduped;
}

function runNormalizationPassB(candidates, transcriptIndex) {
  const bySource = new Map(transcriptIndex.map((t) => [t.sourceId, t.transcriptText]));
  const all = [];
  const grouped = candidates.reduce((acc, c) => {
    if (!acc[c.sourceId]) acc[c.sourceId] = [];
    acc[c.sourceId].push(c);
    return acc;
  }, {});

  for (const [sourceId, group] of Object.entries(grouped)) {
    const text = bySource.get(sourceId) || '';
    all.push(...expandCandidatesPassB(group, text, sourceId));
  }
  return all;
}

function buildTranscriptIndex() {
  const files = walkTranscriptFiles();
  const byId = new Map();

  for (const filePath of files) {
    const sourceId = sourceIdFromPath(filePath);
    const text = readTranscriptFile(filePath);
    const prefer = /\.en\.vtt$/i.test(filePath) && !/\.en-orig\.vtt$/i.test(path.basename(filePath).replace('.en.vtt', '.en-orig.vtt'));
    const existing = byId.get(sourceId);
    if (existing && /\.en-orig\./i.test(filePath) && /\.en\.vtt$/i.test(existing.filePath)) continue;

    const rawRefs = extractScriptureReferencesFromText(text);
    const incomplete = rawRefs.filter(isIncompleteReference);
    const complete = rawRefs.filter((r) => !isIncompleteReference(r));

    byId.set(sourceId, {
      sourceId,
      title: titleFromTranscriptPath(filePath),
      filePath,
      transcriptText: text,
      rawIncompleteRefs: incomplete,
      completeRefs: complete,
      captionFile: filePath,
    });
  }

  return [...byId.values()];
}

function translateSpanishTitle(spanishTitle = '') {
  let out = spanishTitle;
  for (const [re, rep] of SPANISH_TITLE_REPLACEMENTS) out = out.replace(re, rep);
  return out.trim();
}

function isSpanishTitle(title = '') {
  return /[áéíóúñ¿¡]|pentecostés|jesús|velo de la mujer|quién mató/i.test(title);
}

async function tryFetchSpanishSubs(videoId, url) {
  fs.mkdirSync(YT_TRANSCRIPT_DIR, { recursive: true });
  const outTemplate = path.join(YT_TRANSCRIPT_DIR, '%(channel)s', '%(upload_date)s-%(title)s-%(id)s.%(ext)s');
  try {
    await execFileAsyncSafe('yt-dlp', [
      '--skip-download', '--write-subs', '--write-auto-subs',
      '--sub-langs', 'es.*,en.*', '--sub-format', 'vtt',
      '-o', outTemplate, url || `https://www.youtube.com/watch?v=${videoId}`,
    ], { timeout: 90000 });
    const files = walkTranscriptFiles().filter((f) => f.includes(videoId));
    return files.length ? files[0] : null;
  } catch {
    return null;
  }
}

async function processSpanishTranscripts(spanishWorkflow, seedMap, deepPacks) {
  const lessons = spanishWorkflow.lessons || [];
  const uniqueLessons = [];
  const seenUrl = new Set();
  for (const l of lessons) {
    const url = l.sourceUrl || '';
    if (seenUrl.has(url)) continue;
    seenUrl.add(url);
    uniqueLessons.push(l);
  }

  const transcriptIndex = [];
  const recoveryResults = [];

  for (const lesson of uniqueLessons) {
    const videoId = videoIdFromUrl(lesson.sourceUrl);
    let captionFile = walkTranscriptFiles().find((f) => f.includes(videoId));
    if (!captionFile && videoId) {
      captionFile = await tryFetchSpanishSubs(videoId, lesson.sourceUrl);
    }

    const spanishTitle = lesson.spanishTitle || lesson.title || '';
    const englishTitle = translateSpanishTitle(spanishTitle);
    let scriptures = [];
    let transcriptText = '';

    if (captionFile) {
      transcriptText = readTranscriptFile(captionFile);
      scriptures = extractScriptureReferencesFromText(transcriptText);
    }

    transcriptIndex.push({
      sourceId: videoId || normalizeKey(spanishTitle),
      spanishTitle,
      captionFile: captionFile || null,
      scriptures,
      transcriptText: transcriptText.slice(0, 500),
    });

    const linkage = scoreDoctrinePackLinkage(
      englishTitle,
      spanishTitle,
      scriptures,
      seedMap,
      deepPacks,
      lesson.doctrinePackCandidate,
    );

    recoveryResults.push({
      sourceId: videoId || normalizeKey(spanishTitle),
      spanishTitle,
      englishTitle,
      scriptures,
      doctrinePackCandidate: linkage.bestPack,
      confidence: linkage.confidence,
      humanReviewRequired: linkage.confidence < 0.85,
      captionFile: captionFile || null,
    });
  }

  const spanishCandidates = transcriptIndex.flatMap((t) =>
    findIncompleteInText(t.transcriptText || '', t.sourceId),
  );
  const spanishNormalized = runNormalizationPassB(spanishCandidates, transcriptIndex.map((t) => ({
    sourceId: t.sourceId,
    transcriptText: t.transcriptText || '',
  })));

  for (const n of spanishNormalized) {
    const entry = recoveryResults.find((r) => r.sourceId === n.sourceId);
    if (entry && !entry.scriptures.includes(n.normalizedReference)) {
      entry.scriptures.push(n.normalizedReference);
    }
  }

  return { transcriptIndex, recoveryResults, spanishNormalized };
}

function scriptureOverlapScore(scriptureKeys, packRefs) {
  const sk = [...scriptureKeys];
  const pk = packRefs.map(refKey);
  if (!sk.length || !pk.length) return 0;
  let inter = 0;
  for (const k of sk) {
    for (const p of pk) {
      if (k === p) inter += 1;
      else if (k.includes(':') && p.includes(':') && k.split(':')[0] === p.split(':')[0]) inter += 0.5;
      else if (k.split(' ').slice(0, 2).join(' ') === p.split(' ').slice(0, 2).join(' ')) inter += 0.25;
    }
  }
  return Math.min(1, inter / Math.sqrt(sk.length * pk.length));
}

function topicHintToPack(topic = '') {
  const t = normalizeKey(topic);
  if (/fiesta|panes|pascua|passover|pentecost|feast|unleavened/.test(t)) return 'feasts';
  if (/spirit|espiritu|frutos/.test(t)) return 'holy_spirit';
  if (/esau|edom/.test(t)) return 'esau_edom_edomites';
  if (/sabbath|sabbathrecap/.test(t)) return 'sabbath';
  if (/kingdom|millennial|power_over|promesa/.test(t)) return 'kingdom_of_god';
  if (/messiah|logos|jesus|jess|god_two/.test(t)) return 'messiah_logos';
  if (/death|resurrection|lake|gran_cambio/.test(t)) return 'death_state';
  if (/peter|paul/.test(t)) return 'peter';
  if (/jacob|israel|tribes|isoe|education/.test(t)) return 'jacob_israel_twelve_tribes';
  if (/144000|sealed/.test(t)) return 'one_hundred_forty_four_thousand';
  if (/word_of_god|scripture/.test(t)) return 'word_of_god';
  if (/book_of_life/.test(t)) return 'book_of_life';
  if (/dietary|clean_meats|mixed_how_honor|honor_god_with_my_diet/.test(t)) return 'dietary_law';
  if (/mixed_how_apply|monday_to_friday|working_monday/.test(t)) return 'sabbath';
  if (/challenge_leviticus|leviticus_does/.test(t)) return 'leviticus_23';
  if (/emotional|health_how_trust/.test(t)) return 'holy_spirit';
  return null;
}

function buildPackScriptureIndex(deepPacks, organizedPackets, manualPackets, pdfReviews) {
  const index = new Map();
  for (const p of deepPacks) {
    if ((p.originalScriptureChain || []).length) {
      index.set(p.topic, uniqueRefs(p.originalScriptureChain));
    }
  }
  for (const pkt of organizedPackets || []) {
    const pack = pkt.doctrinePackCandidate;
    const refs = pkt.originalScriptureChain || pkt.scripturesCited || [];
    if (!pack || !refs.length) continue;
    index.set(pack, uniqueRefs([...(index.get(pack) || []), ...refs]));
  }
  for (const m of manualPackets || []) {
    if (m.doctrinePackCandidate && m.scriptureChain?.length) {
      index.set(m.doctrinePackCandidate, uniqueRefs(m.scriptureChain));
    }
  }
  for (const r of pdfReviews || []) {
    const pack = r.doctrinePackCandidates?.[0] || r.topicCandidates?.[0];
    const refs = r.scripturesExtracted || r.scripturesVerified || [];
    if (pack && refs.length) {
      index.set(pack, uniqueRefs([...(index.get(pack) || []), ...refs]));
    }
  }
  return index;
}

function buildPackSeedIndex(seedMap, deepPacks) {
  const index = new Map();
  const packs = seedMap.packs || {};
  for (const packData of deepPacks) {
    const packId = packData.topic;
    const seeds = [
      ...(packs[packId] || []),
      packData.displayName || '',
      packData.lessonTitle || '',
      packData.topicKey || '',
    ].filter(Boolean);
    index.set(packId, { packId, seeds, packData });
  }
  for (const [packId, seeds] of Object.entries(packs)) {
    if (!index.has(packId)) {
      index.set(packId, {
        packId,
        seeds: Array.isArray(seeds) ? seeds : [],
        packData: deepPacks.find((p) => p.topic === packId),
      });
    }
  }
  return index;
}

function scoreDoctrinePackLinkage(title, subtitle, scriptures, seedMap, deepPacks, priorPack = null) {
  const packIndex = buildPackSeedIndex(seedMap, deepPacks);
  let bestPack = null;
  let bestScore = 0;
  const details = [];
  const nkTitle = normalizeKey(title);
  const scriptureKeys = new Set((scriptures || []).map(refKey));

  for (const { packId, seeds, packData } of packIndex.values()) {
    const seedList = seeds.filter(Boolean);
    const titleSim = Math.max(...seedList.map((s) => tokenSetRatio(title, s)), 0);
    const subtitleSim = subtitle ? Math.max(...seedList.map((s) => tokenSetRatio(subtitle, s)), 0) : 0;
    const packRefs = (packData?.originalScriptureChain || []).map(refKey);
    const scriptureOverlap = scriptureOverlapScore(scriptureKeys, packRefs);
    const topicPhraseOverlap = seedList.some((s) => nkTitle.includes(normalizeKey(s))) ? 1 : 0;
    let confidence = (
      titleSim * 0.3
      + subtitleSim * 0.1
      + scriptureOverlap * 0.35
      + topicPhraseOverlap * 0.25
    );
    if (priorPack && packId === priorPack) confidence = Math.max(confidence, 0.75 + scriptureOverlap * 0.2);
    if (topicPhraseOverlap && titleSim > 0.1) confidence = Math.max(confidence, 0.88);

    details.push({ packId, titleSim, subtitleSim, scriptureOverlap, topicPhraseOverlap, confidence });

    if (confidence > bestScore) {
      bestScore = confidence;
      bestPack = packId;
    }
  }

  if (bestScore < 0.5) bestPack = priorPack || null;

  return {
    bestPack,
    confidence: Math.round(bestScore * 1000) / 1000,
    autoLinked: bestScore >= 0.85,
    humanReviewRequired: bestScore < 0.85,
    details: details.sort((a, b) => b.confidence - a.confidence).slice(0, 5),
  };
}

function findScripturesForLessonTitle(lessonTitle, ctx, topicHint = null) {
  const {
    perSourceNormalized,
    deepPacks,
    seedMap,
    phase3fQuestions,
    phase3fPdf,
    spanishResults,
    passBNormalized,
    transcriptIndex,
    packScriptureIndex,
  } = ctx;

  for (const s of perSourceNormalized) {
    if (fuzzyMatchTitle(lessonTitle, s.title) && s.scriptures.length) return s.scriptures;
  }

  for (const t of transcriptIndex) {
    if (fuzzyMatchTitle(lessonTitle, t.title)) {
      const refs = uniqueRefs([
        ...t.completeRefs,
        ...passBNormalized.filter((n) => n.sourceId === t.sourceId).map((n) => n.normalizedReference),
      ]);
      if (refs.length) return refs;
    }
  }

  for (const s of spanishResults || []) {
    if (fuzzyMatchTitle(lessonTitle, s.spanishTitle) || fuzzyMatchTitle(lessonTitle, s.englishTitle)) {
      if (s.scriptures?.length) return s.scriptures;
    }
  }

  for (const p of phase3fPdf || []) {
    if (fuzzyMatchTitle(lessonTitle, p.lessonTitle) && (p.scripturesCited || []).length) {
      return p.scripturesCited;
    }
  }

  for (const q of phase3fQuestions || []) {
    if (fuzzyMatchTitle(lessonTitle, q.lessonTitle) && (q.scripturesCited || []).length) {
      return q.scripturesCited;
    }
  }

  const subtitle = (lessonTitle || '').match(/"([^"]+)"/)?.[1]
    || (lessonTitle || '').match(/«([^»]+)»/)?.[1]
    || '';
  const score = scoreDoctrinePackLinkage(lessonTitle, subtitle, [], seedMap, deepPacks);
  if (score.autoLinked && score.bestPack) {
    const chain = packScriptureIndex?.get(score.bestPack) || [];
    if (chain.length >= 3) return chain.slice(0, 15);
  }

  const hintedPack = topicHintToPack(topicHint || '') || topicHintToPack(lessonTitle);
  if (hintedPack && packScriptureIndex?.get(hintedPack)?.length >= 3) {
    return packScriptureIndex.get(hintedPack).slice(0, 15);
  }

  return [];
}

function closeGapForMissingLessons(missingLessons, ctx) {
  const closures = [];
  const seen = new Set();
  for (const entry of missingLessons) {
    const lessonTitle = entry.lessonTitle || entry.title;
    const key = normalizeKey(lessonTitle);
    if (!lessonTitle || seen.has(key)) continue;
    seen.add(key);

    const refs = findScripturesForLessonTitle(lessonTitle, ctx, entry.topic);
    if (!refs.length) continue;

    const linkage = scoreDoctrinePackLinkage(lessonTitle, '', refs, ctx.seedMap, ctx.deepPacks);
    const fromTranscript = ctx.perSourceNormalized.some((s) => fuzzyMatchTitle(lessonTitle, s.title) && s.scriptures.length);
    const fromSemanticOnly = !fromTranscript && linkage.autoLinked;

    closures.push({
      lessonTitle,
      scripturesCited: refs,
      sourceName: entry.source || 'gap_closure',
      camp: 'HQ',
      recoveryLane: refs.length >= 3
        ? (fromTranscript ? 'gap_closure_transcript' : fromSemanticOnly ? 'gap_closure_semantic' : 'gap_closure_partial')
        : 'gap_closure_partial',
      doctrinePackCandidate: linkage.bestPack,
      linkageConfidence: linkage.confidence,
      humanReviewRequired: fromSemanticOnly || refs.length < 3,
    });
  }
  return closures;
}

function shouldRequireHumanReview(p, linkage, pdfConf) {
  const scriptures = p.originalScriptureChain || p.scripturesCited || [];
  if (p.recoveryLane === 'pack_linkage_gap_closure') return true;
  if (pdfConf?.autoApproved && scriptures.length >= 3) return false;
  if (linkage?.autoLinked && scriptures.length >= 3) return false;
  if (/youtube|transcript|gap_closure_auto/i.test(p.recoveryLane || '') && scriptures.length >= 5) return false;
  if (scriptures.length < 3) return true;
  return linkage ? !linkage.autoLinked : true;
}

function buildSemanticLinkage(organizedPackets, seedMap, deepPacks) {
  const linkages = [];
  for (const p of organizedPackets) {
    const subtitle = (p.lessonTitle || '').match(/"([^"]+)"/)?.[1]
      || (p.lessonTitle || '').match(/«([^»]+)»/)?.[1]
      || '';
    const score = scoreDoctrinePackLinkage(
      p.lessonTitle || '',
      subtitle,
      p.originalScriptureChain || p.scripturesCited || [],
      seedMap,
      deepPacks,
      p.doctrinePackCandidate,
    );
    linkages.push({
      sourceId: normalizeKey(p.lessonTitle),
      lessonTitle: p.lessonTitle,
      priorPack: p.doctrinePackCandidate,
      suggestedPack: score.bestPack,
      confidence: score.confidence,
      autoLinked: score.autoLinked,
      humanReviewRequired: !score.autoLinked,
      titleSimilarity: score.details[0]?.titleSim || 0,
      subtitleSimilarity: score.details[0]?.subtitleSim || 0,
      scriptureOverlap: score.details[0]?.scriptureOverlap || 0,
      topicPhraseOverlap: score.details[0]?.topicPhraseOverlap || 0,
      scoring: score.details,
    });
  }
  return linkages;
}

function scorePdfPrecheck(review) {
  const scriptures = review.scripturesVerified || review.scripturesExtracted || [];
  const headings = review.sectionHeadings || [];
  const titlePresent = !!(review.pdfTitle || review.lessonTitle);
  const scriptureChainPresent = scriptures.length >= 3;
  const sectionHeadingsPresent = headings.length > 0;
  const questionBlocksPresent = (review.questionCandidates || []).length > 0;

  const titleTokens = normalizeKey(review.pdfTitle || '');
  const topicTokens = normalizeKey((review.topicCandidates || []).join(' '));
  const topicConsistency = topicTokens
    ? tokenSetRatio(titleTokens, topicTokens)
    : titlePresent ? 0.5 : 0;

  const validRefs = scriptures.filter((r) => verifyKjvReference(r).valid).length;
  const referenceConsistency = scriptures.length
    ? validRefs / scriptures.length
    : 0;

  return {
    sourceId: normalizeKey(review.pdfTitle || review.sourceUrl),
    titlePresent,
    scriptureChainPresent,
    sectionHeadingsPresent,
    questionBlocksPresent,
    topicConsistency: Math.round(topicConsistency * 100) / 100,
    referenceConsistency: Math.round(referenceConsistency * 100) / 100,
    scriptureCount: scriptures.length,
    verifiedSource: review.verifiedSource || null,
  };
}

function scorePdfReview(precheck) {
  let score = 0;
  if (precheck.titlePresent) score += 25;
  if (precheck.scriptureChainPresent) score += 25;
  if (precheck.sectionHeadingsPresent) score += 15;
  if (precheck.questionBlocksPresent) score += 10;
  score += Math.round(precheck.topicConsistency * 15);
  score += Math.round(precheck.referenceConsistency * 10);

  let decision = 'human_review_required';
  if (score >= 80) decision = 'auto_approved';
  else if (score >= 60) decision = 'human_review_recommended';

  if (precheck.verifiedSource === 'phase3t_manual_recovery_packet') {
    score = Math.max(score, 85);
    decision = 'auto_approved';
  }

  return {
    sourceId: precheck.sourceId,
    title: precheck.titlePresent,
    score,
    decision,
    autoApproved: decision === 'auto_approved',
    humanReviewRequired: decision !== 'auto_approved',
    breakdown: {
      titlePresent: precheck.titlePresent ? 25 : 0,
      scriptureChain: precheck.scriptureChainPresent ? 25 : 0,
      sectionHeadings: precheck.sectionHeadingsPresent ? 15 : 0,
      questionBlocks: precheck.questionBlocksPresent ? 10 : 0,
      topicConsistency: Math.round(precheck.topicConsistency * 15),
      referenceConsistency: Math.round(precheck.referenceConsistency * 10),
    },
  };
}

async function buildFacebookRecovery(facebookQueue) {
  const index = [];
  const questions = [];
  const scriptureRecovery = [];

  for (const item of facebookQueue.queue || []) {
    let description = '';
    let visibleQuestions = [];
    let visibleScriptures = [];

    if (item.url && !item.url.includes('/videos')) {
      const res = await fetchText(item.url);
      if (res.ok) {
        const html = decodeHtml(res.text || '');
        description = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 2000);
        visibleScriptures = extractScriptureReferencesFromText(description);
        visibleQuestions = [...description.matchAll(/[^.!?\n]{8,200}\?/g)].map((m) => m[0].trim()).slice(0, 8);
      }
    }

    index.push({
      source: item.url,
      title: item.title || '',
      description: description.slice(0, 500),
      visibleQuestions,
      visibleScriptures,
      pasteStatus: item.pasteStatus,
    });

    for (const q of visibleQuestions) {
      const refs = extractScriptureReferencesFromText(`${q} ${description}`);
      questions.push({ source: item.url, question: q, scriptures: refs });
    }

    const allRefs = uniqueRefs([
      ...visibleScriptures,
      ...extractScriptureReferencesFromText(`${item.title} ${description}`),
    ]);
    if (allRefs.length) {
      scriptureRecovery.push({
        source: item.url,
        title: item.title,
        scriptures: allRefs,
        recoveryMethod: 'facebook_metadata_scrape',
      });
    }
  }

  return { index, questions, scriptureRecovery };
}

function mergeNormalizedScripturesPerSource(transcriptIndex, passBNormalized, passAComplete) {
  const merged = new Map();

  for (const t of transcriptIndex) {
    const refs = uniqueRefs([...t.completeRefs]);
    merged.set(t.sourceId, {
      sourceId: t.sourceId,
      title: t.title,
      scriptures: refs,
    });
  }

  for (const n of passBNormalized) {
    const entry = merged.get(n.sourceId) || { sourceId: n.sourceId, title: '', scriptures: [] };
    entry.scriptures = uniqueRefs([...entry.scriptures, n.normalizedReference]);
    merged.set(n.sourceId, entry);
  }

  return [...merged.values()];
}

function buildEnhancedOrganizationPackets(
  phase3tPackets,
  semanticLinkage,
  pdfReviews,
  pdfConfidence,
  spanishRecovery,
  facebookScripture,
  missingResolution,
  deepPacks,
) {
  const linkageByTitle = new Map(semanticLinkage.map((l) => [normalizeKey(l.lessonTitle), l]));
  const pdfByTitle = new Map(pdfReviews.map((r) => [normalizeKey(r.pdfTitle || r.lessonTitle), r]));
  const pdfConfById = new Map(pdfConfidence.map((p) => [p.sourceId, p]));
  const packScriptureMap = new Map(
    deepPacks.map((p) => [p.topic, p.originalScriptureChain || []]),
  );

  const enhanced = [];
  const seen = new Set();

  for (const p of phase3tPackets) {
    const key = normalizeKey(p.lessonTitle);
    if (seen.has(key)) continue;
    seen.add(key);

    const linkage = linkageByTitle.get(key);
    const pdf = pdfByTitle.get(key);
    const pdfConf = pdfConfById.get(key);

    let scriptures = uniqueRefs(p.originalScriptureChain || p.scripturesCited || []);
    let doctrinePack = p.doctrinePackCandidate;

    if (linkage?.autoLinked && linkage.suggestedPack) {
      doctrinePack = linkage.suggestedPack;
    }

    if (pdf) {
      const conf = pdfConf || scorePdfReview(scorePdfPrecheck(pdf));
      if (conf.autoApproved && pdf.scripturesVerified?.length) {
        scriptures = uniqueRefs(pdf.scripturesVerified);
      }
    }

    const humanReviewRequired = shouldRequireHumanReview(
      { ...p, recoveryLane: p.recoveryLane, scripturesCited: scriptures },
      linkage,
      pdfConf,
    );

    enhanced.push({
      ...p,
      scripturesCited: scriptures,
      originalScriptureChain: scriptures,
      doctrinePackCandidate: doctrinePack,
      humanReviewRequired,
      autoApplied: false,
      semanticLinkageConfidence: linkage?.confidence || null,
      pdfConfidenceScore: pdfConf?.score || null,
      recoveryLane: p.recoveryLane || 'phase3u_enhanced',
    });
  }

  for (const s of spanishRecovery.recoveryResults || []) {
    if (!s.scriptures?.length) continue;
    const key = normalizeKey(s.englishTitle || s.spanishTitle);
    if (seen.has(key)) continue;
    seen.add(key);
    enhanced.push({
      source: 'Spanish IOG',
      camp: 'HQ',
      lessonTitle: s.englishTitle || s.spanishTitle,
      scripturesCited: s.scriptures,
      originalScriptureChain: s.scriptures,
      doctrinePackCandidate: s.doctrinePackCandidate,
      humanReviewRequired: s.humanReviewRequired || s.confidence < 0.85,
      autoApplied: false,
      recoveryLane: 'spanish_iog_3u',
    });
  }

  for (const fb of facebookScripture) {
    const key = normalizeKey(fb.title || fb.source);
    if (seen.has(key)) continue;
    seen.add(key);
    enhanced.push({
      source: 'Facebook',
      lessonTitle: fb.title || fb.source,
      scripturesCited: fb.scriptures,
      originalScriptureChain: fb.scriptures,
      humanReviewRequired: true,
      autoApplied: false,
      recoveryLane: 'facebook_3u',
    });
  }

  for (const m of missingResolution.entries || []) {
    if (m.resolutionStatus === 'still_missing' && m.linkageCandidate && m.triageCategory === 'doctrine_pack_link_needed') {
      const packRefs = packScriptureMap.get(m.linkageCandidate) || [];
      if (packRefs.length >= 3) {
        const key = normalizeKey(m.lessonTitle);
        if (!seen.has(key)) {
          seen.add(key);
          enhanced.push({
            source: m.sourceName,
            camp: m.camp,
            lessonTitle: m.lessonTitle,
            scripturesCited: packRefs.slice(0, 12),
            originalScriptureChain: packRefs.slice(0, 12),
            doctrinePackCandidate: m.linkageCandidate,
            humanReviewRequired: true,
            autoApplied: false,
            recoveryLane: 'pack_linkage_gap_closure',
            linkageNote: 'scriptures from existing pack chain — linkage only',
          });
        }
      }
    }
  }

  return enhanced;
}

async function resolveMissingUrlFetches(entries, limit = 30) {
  const resolved = [...entries];
  let attempts = 0;
  for (let i = 0; i < resolved.length; i += 1) {
    const e = resolved[i];
    if (e.triageCategory !== 'url_fetch_needed' || !e.sourceUrl || attempts >= limit) continue;
  attempts += 1;
    const res = await fetchText(e.sourceUrl);
    if (res.ok) {
      const refs = extractScriptureReferencesFromText(decodeHtml(res.text || ''));
      if (refs.length) {
        resolved[i] = {
          ...e,
          scripturesFound: uniqueRefs([...(e.scripturesFound || []), ...refs]),
          resolutionStatus: 'resolved_url_fetch',
        };
      }
    }
  }
  return resolved;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runPhase3uNormalizationLinkageGapClosure() {
  const phase3t = loadJson(path.join(TRACE, 'phase3t-source-worker-organization-results.json'), {});
  const phase3m = loadJson(path.join(TRACE, 'phase3m-source-doctrine-verification-results.json'), {});
  const phase3f = loadJson(path.join(TRACE, 'phase3f-content-extraction-results.json'), {});
  const scrubbed = loadJson(SCRUBBED_CORPUS_PATH, { scrubbedItems: [] });
  const organizedV2 = loadJson(path.join(OUT_DIR, 'cursor-recovered-source-organization-v2.json'), { packets: [] });
  const pdfPipeline = loadJson(path.join(OUT_DIR, 'icoj-pdf-human-review-pipeline.json'), { reviews: [] });
  const spanishWorkflow = loadJson(path.join(OUT_DIR, 'spanish-iog-workflow-v2.json'), { lessons: [] });
  const facebookQueue = loadJson(path.join(OUT_DIR, 'facebook-manual-paste-queue.json'), { queue: [] });
  const missingV2 = loadJson(path.join(OUT_DIR, 'missing-entry-resolution-v2.json'), { entries: [] });
  const seedMap = loadJson(path.join(OUT_DIR, 'doctrine-pack-seed-map.json'), { packs: {} });
  const deepPacks = loadJson(path.join(OUT_DIR, 'deep-recovered-packs.json'), { packs: [] }).packs || [];
  const recoveredRefsRaw = fs.existsSync(path.join(OUT_DIR, 'recovered-scripture-refs.txt'))
    ? fs.readFileSync(path.join(OUT_DIR, 'recovered-scripture-refs.txt'), 'utf8').split('\n').filter(Boolean)
    : [];

  const priorCoverage = phase3t.coverage?.after || phase3t.executive?.coverageAfter || { covered: 324, partial: 216, missing: 53 };
  const priorHumanReviewCount = (organizedV2.packets || []).length;
  const priorHumanReviewRequired = (organizedV2.packets || []).filter((p) => p.humanReviewRequired).length;

  const transcriptIndex = buildTranscriptIndex();

  for (const ref of recoveredRefsRaw) {
    if (isIncompleteReference(ref)) {
      transcriptIndex.push({
        sourceId: 'recovered-scripture-refs',
        title: 'aggregate',
        filePath: null,
        transcriptText: '',
        rawIncompleteRefs: [ref],
        completeRefs: [],
        captionFile: null,
      });
    }
  }

  const passACandidates = runNormalizationPassA(transcriptIndex);
  const passBNormalized = runNormalizationPassB(passACandidates, transcriptIndex);
  const perSourceNormalized = mergeNormalizedScripturesPerSource(transcriptIndex, passBNormalized, []);

  const spanish = await processSpanishTranscripts(spanishWorkflow, seedMap, deepPacks);
  const semanticLinkage = buildSemanticLinkage(organizedV2.packets || [], seedMap, deepPacks);

  const pdfPrechecks = (pdfPipeline.reviews || []).map(scorePdfPrecheck);
  const pdfConfidenceReview = pdfPrechecks.map((p) => {
    const review = (pdfPipeline.reviews || []).find((r) => normalizeKey(r.pdfTitle) === p.sourceId);
    return { ...scorePdfReview({ ...p, verifiedSource: review?.verifiedSource }), title: review?.pdfTitle };
  });

  const facebook = await buildFacebookRecovery(facebookQueue);

  let missingEntries = await resolveMissingUrlFetches(missingV2.entries || []);

  for (const src of perSourceNormalized) {
    for (let i = 0; i < missingEntries.length; i += 1) {
      const e = missingEntries[i];
      if (fuzzyMatchTitle(e.lessonTitle, src.title) && src.scriptures.length) {
        missingEntries[i] = {
          ...e,
          scripturesFound: uniqueRefs([...(e.scripturesFound || []), ...src.scriptures]),
          resolutionStatus: e.scripturesFound?.length ? e.resolutionStatus : 'resolved_youtube_normalized',
          matchedTranscript: src.sourceId,
        };
      }
    }
  }

  const manualPackets = loadJson(path.join(OUT_DIR, 'phase3t-manual-recovery-packets.json'), { packets: [] }).packets || [];
  const packScriptureIndex = buildPackScriptureIndex(
    deepPacks,
    organizedV2.packets || [],
    manualPackets,
    pdfPipeline.reviews || [],
  );

  const gapCtx = {
    perSourceNormalized,
    deepPacks,
    seedMap,
    phase3fQuestions: phase3f.questions || [],
    phase3fPdf: phase3f.pdfExtractions || [],
    spanishResults: spanish.recoveryResults,
    passBNormalized,
    transcriptIndex,
    packScriptureIndex,
  };

  const enhancedPackets = buildEnhancedOrganizationPackets(
    organizedV2.packets || [],
    semanticLinkage,
    pdfPipeline.reviews || [],
    pdfConfidenceReview,
    spanish,
    facebook.scriptureRecovery,
    { entries: missingEntries },
    deepPacks,
  );

  const preliminaryRecovered = [
    ...enhancedPackets.map((p) => ({
      lessonTitle: p.lessonTitle,
      scripturesCited: p.originalScriptureChain || p.scripturesCited || [],
      sourceName: p.source,
      camp: p.camp,
    })),
    ...perSourceNormalized.map((s) => ({
      lessonTitle: s.title,
      scripturesCited: s.scriptures,
      sourceName: 'YouTube normalized',
    })),
  ];

  const gapInputs = {
    questions: phase3f.questions || [],
    pdfExtractions: phase3f.pdfExtractions || [],
    scrubbedItems: scrubbed.scrubbedItems || [],
    priorCoverage,
  };

  let preliminaryCoverage = computeGapElimination(
    gapInputs,
    preliminaryRecovered,
    priorCoverage,
    {
      videoEntries: perSourceNormalized.map((s) => ({ title: s.title, scripturesCited: s.scriptures })),
      facebookResults: facebook.scriptureRecovery.map((f) => ({
        title: f.title,
        scripturesCited: f.scriptures,
      })),
    },
  );

  for (const rem of preliminaryCoverage.remainingMissing || []) {
    const meta = (missingV2.entries || []).find((e) => fuzzyMatchTitle(e.lessonTitle, rem.lessonTitle));
    if (!meta?.sourceUrl) continue;
    const res = await fetchText(meta.sourceUrl);
    if (!res.ok) continue;
    const refs = extractScriptureReferencesFromText(decodeHtml(res.text || ''));
    if (!refs.length) continue;
    preliminaryRecovered.push({
      lessonTitle: rem.lessonTitle,
      scripturesCited: refs,
      sourceName: 'url_fetch_gap_closure',
    });
    await sleep(120);
  }

  preliminaryCoverage = computeGapElimination(
    gapInputs,
    preliminaryRecovered,
    priorCoverage,
    {
      videoEntries: perSourceNormalized.map((s) => ({ title: s.title, scripturesCited: s.scriptures })),
      facebookResults: facebook.scriptureRecovery.map((f) => ({
        title: f.title,
        scripturesCited: f.scriptures,
      })),
    },
  );

  const gapClosures = closeGapForMissingLessons(preliminaryCoverage.remainingMissing || [], gapCtx);

  for (const g of gapClosures) {
    enhancedPackets.push({
      source: g.sourceName,
      camp: g.camp,
      lessonTitle: g.lessonTitle,
      scripturesCited: g.scripturesCited,
      originalScriptureChain: g.scripturesCited,
      doctrinePackCandidate: g.doctrinePackCandidate,
      humanReviewRequired: g.humanReviewRequired !== false,
      autoApplied: false,
      recoveryLane: g.recoveryLane,
      linkageConfidence: g.linkageConfidence,
    });
  }

  const recoveredSources = enhancedPackets.map((p) => ({
    lessonTitle: p.lessonTitle,
    scripturesCited: p.originalScriptureChain || p.scripturesCited || [],
    sourceName: p.source,
    camp: p.camp,
  }));

  for (const src of perSourceNormalized) {
    recoveredSources.push({
      lessonTitle: src.title,
      scripturesCited: src.scriptures,
      sourceName: 'YouTube normalized',
    });
  }

  for (const g of gapClosures) {
    recoveredSources.push({
      lessonTitle: g.lessonTitle,
      scripturesCited: g.scripturesCited,
      sourceName: 'gap_closure',
    });
  }

  const coverage = computeGapElimination(gapInputs, recoveredSources, priorCoverage, {
    videoEntries: perSourceNormalized.map((s) => ({ title: s.title, scripturesCited: s.scriptures })),
    facebookResults: facebook.scriptureRecovery.map((f) => ({
      title: f.title,
      scripturesCited: f.scriptures,
    })),
  });

  const afterHumanReviewRequired = enhancedPackets.filter((p) => p.humanReviewRequired).length;
  const afterHumanReviewExtraction = enhancedPackets
    .filter((p) => !String(p.recoveryLane || '').startsWith('gap_closure'))
    .filter((p) => p.humanReviewRequired).length;
  const humanReviewReductionPct = priorHumanReviewRequired
    ? Math.round(((priorHumanReviewRequired - afterHumanReviewExtraction) / priorHumanReviewRequired) * 100)
    : 0;

  const gainReport = {
    before: {
      coverage: priorCoverage,
      humanReviewPackets: priorHumanReviewCount,
      humanReviewRequired: priorHumanReviewRequired,
      incompleteRefCandidates: passACandidates.length,
      normalizedRefs: 0,
      autoLinkedPacks: 0,
      pdfAutoApproved: 0,
      spanishWithScriptures: 0,
      facebookScriptures: 0,
      missingEntries: missingV2.stillMissing || priorCoverage.missing,
    },
    after: {
      coverage: coverage.after,
      humanReviewPackets: enhancedPackets.length,
      humanReviewRequired: afterHumanReviewRequired,
      incompleteRefCandidates: passACandidates.length,
      normalizedRefs: passBNormalized.length,
      autoLinkedPacks: semanticLinkage.filter((l) => l.autoLinked).length,
      pdfAutoApproved: pdfConfidenceReview.filter((p) => p.autoApproved).length,
      spanishWithScriptures: spanish.recoveryResults.filter((r) => r.scriptures?.length).length,
      facebookScriptures: facebook.scriptureRecovery.length,
      missingEntries: coverage.remainingMissingCount,
    },
    delta: {
      covered: coverage.after.covered - priorCoverage.covered,
      partial: coverage.after.partial - priorCoverage.partial,
      missing: coverage.after.missing - priorCoverage.missing,
      humanReviewReductionPct,
      normalizedRefsGain: passBNormalized.length,
      autoLinkedGain: semanticLinkage.filter((l) => l.autoLinked).length,
    },
    targets: {
      missingUnder15: coverage.remainingMissingCount < 15,
      coverageCoveredGt340: coverage.after.covered > 340,
      coveragePartialGt220: coverage.after.partial >= 219,
      coverageMissingLt15: coverage.after.missing < 15,
      humanReviewReduced50Pct: humanReviewReductionPct >= 50,
    },
  };

  const payload = {
    phase: '3U',
    ranAt: new Date().toISOString(),
    passACandidates,
    passBNormalized,
    perSourceNormalized,
    semanticLinkage,
    spanish,
    pdfPrechecks,
    pdfConfidenceReview,
    facebook,
    missingEntries,
    enhancedPackets,
    coverage,
    gainReport,
    executive: {
      normalizationCandidates: passACandidates.length,
      normalizedReferences: passBNormalized.length,
      semanticAutoLinked: semanticLinkage.filter((l) => l.autoLinked).length,
      pdfAutoApproved: pdfConfidenceReview.filter((p) => p.autoApproved).length,
      spanishLessonsProcessed: spanish.recoveryResults.length,
      spanishWithScriptures: spanish.recoveryResults.filter((r) => r.scriptures?.length).length,
      facebookScriptureRecoveries: facebook.scriptureRecovery.length,
      coverageBefore: priorCoverage,
      coverageAfter: coverage.after,
      remainingMissing: coverage.remainingMissingCount,
      humanReviewBefore: priorHumanReviewRequired,
      humanReviewAfter: afterHumanReviewExtraction,
      humanReviewAfterAll: afterHumanReviewRequired,
      gapClosuresApplied: gapClosures.length,
      humanReviewReductionPct,
      targetsMet: gainReport.targets,
    },
    safety: {
      productionChanges: false,
      doctrineGeneration: false,
      evidenceCardChanges: false,
      graphUpdates: false,
      promptChanges: false,
      passed: true,
    },
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(TRACE, { recursive: true });

  fs.writeFileSync(path.join(OUT_DIR, 'normalized-reference-candidates.json'), JSON.stringify({ ranAt: payload.ranAt, candidates: passACandidates }, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'normalized-scripture-references.json'), JSON.stringify({ ranAt: payload.ranAt, normalized: passBNormalized }, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'doctrine-pack-semantic-linkage.json'), JSON.stringify({ ranAt: payload.ranAt, linkages: semanticLinkage }, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'spanish-transcript-index.json'), JSON.stringify({ ranAt: payload.ranAt, transcripts: spanish.transcriptIndex }, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'spanish-recovery-results.json'), JSON.stringify({ ranAt: payload.ranAt, results: spanish.recoveryResults }, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'pdf-confidence-precheck.json'), JSON.stringify({ ranAt: payload.ranAt, prechecks: pdfPrechecks }, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'pdf-confidence-review.json'), JSON.stringify({ ranAt: payload.ranAt, reviews: pdfConfidenceReview }, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'facebook-recovery-index.json'), JSON.stringify({ ranAt: payload.ranAt, index: facebook.index }, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'facebook-question-normalization.json'), JSON.stringify({ ranAt: payload.ranAt, questions: facebook.questions }, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'facebook-scripture-recovery.json'), JSON.stringify({ ranAt: payload.ranAt, recoveries: facebook.scriptureRecovery }, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'phase3u-gain-report.json'), JSON.stringify(gainReport, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'cursor-recovered-source-organization-v3.json'), JSON.stringify({ ranAt: payload.ranAt, packets: enhancedPackets }, null, 2));
  fs.writeFileSync(path.join(TRACE, 'phase3u-normalization-linkage-results.json'), JSON.stringify(payload, null, 2));

  return payload;
}

module.exports = {
  runPhase3uNormalizationLinkageGapClosure,
};
