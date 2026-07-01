/**
 * Phase 3T — Claude read-only source worker + Cursor organization pipeline.
 * Source recovery + organization only — no production, doctrine, card, or graph mutations.
 */

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const {
  fetchText,
  scrubYouTubeVideo,
  decodeHtml,
} = require('./openSourceScrubber');
const { extractScriptureReferencesFromText, normalizeReferenceList } = require('./phase3fScriptureNormalizer');
const { discoverTopicFromText, TOPIC_PATTERNS } = require('./bibleWideTopicDiscovery');
const { getRegistryChain } = require('./genesisToRevelationContinuityRegistry');
const { expandScriptureParallels } = require('./scriptureParallelExpansion');
const {
  uniqueRefs,
  buildStrongestG2RChain,
  refKey,
} = require('./phase3iRecursiveExpansion');
const { computeGapElimination } = require('./phase3rSourceRecovery');

const ROOT = path.join(__dirname, '..');
const TRACE = path.join(ROOT, 'docs', 'regression-trace');
const OUT_DIR = path.join(ROOT, 'docs', 'evidence-candidates');
const SCRUBBED_CORPUS_PATH = path.join(ROOT, 'data', 'phase3e-scrubbed-corpus.json');
const YT_TRANSCRIPT_DIR = path.join(OUT_DIR, 'youtube-transcripts');

const PACK_LINKAGE_V2 = [
  'one_hundred_forty_four_thousand', '144000', 'peter', 'peter_paul_alignment',
  'jacob_israel_twelve_tribes', 'jacob', 'millennial_kingdom_kingdom_on_earth', 'millennial_kingdom',
  'jesus_old_testament_new_testament', 'holy_spirit', 'feasts', 'passover', 'pentecost', 'high_sabbaths',
  'kingdom_of_god', 'kingdom', 'death_state', 'resurrection', 'messiah_logos', 'messiah',
  'dietary_law', 'sabbath', 'leviticus_23', 'book_of_life', 'word_of_god', 'spirit_of_god',
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
  return String(s).toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
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

function videoIdFromUrl(url = '') {
  return url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)?.[1]
    || url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)?.[1]
    || null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeRefsList(refs = []) {
  if (!Array.isArray(refs)) return [];
  return normalizeReferenceList(refs).normalized || [];
}

function assignPackCandidate(title = '', scriptures = [], topicHint = null) {
  const targets = PACK_LINKAGE_V2;
  if (topicHint && targets.includes(topicHint)) return topicHint;
  const refs = Array.isArray(scriptures) ? scriptures : [];
  const text = `${title} ${refs.join(' ')}`;
  if (/book of life/i.test(text)) return 'book_of_life';
  if (/word of god/i.test(text)) return 'word_of_god';
  if (/spirit of god/i.test(text)) return 'spirit_of_god';
  const match = TOPIC_PATTERNS.find((p) => p.pattern.test(text));
  if (match && targets.includes(match.topic)) return match.topic;
  if (match) return match.topic;
  const deep = loadJson(path.join(OUT_DIR, 'deep-recovered-packs.json'), { packs: [] }).packs || [];
  for (const p of deep) {
    if (fuzzyMatchTitle(title, p.displayName) || fuzzyMatchTitle(title, p.topic)) return p.topic;
  }
  return discoverTopicFromText(text)?.topic || null;
}

function classifyScriptures(originalSet, allRefs, registryKey) {
  const continuityPool = new Set(uniqueRefs([
    ...getRegistryChain(registryKey || 'covenant').map((n) => n.reference),
    ...getRegistryChain('kingdom').map((n) => n.reference),
  ]).map(refKey));
  const parallelPool = new Set(uniqueRefs(
    expandScriptureParallels({ scriptureChain: [...originalSet] }),
  ).map(refKey));
  const parallel = [];
  const supporting = [];
  const continuity = [];
  for (const r of allRefs) {
    const k = refKey(r);
    if (originalSet.has(k)) continue;
    if (continuityPool.has(k)) continuity.push(r);
    else if (parallelPool.has(k)) parallel.push(r);
    else supporting.push(r);
  }
  return {
    parallelScriptures: uniqueRefs(parallel),
    supportingScriptures: uniqueRefs(supporting),
    continuityScriptures: uniqueRefs(continuity),
  };
}

function loadPhase3Inputs() {
  const phase3s = loadJson(path.join(TRACE, 'phase3s-source-scrub-organization-results.json'), {});
  const phase3f = loadJson(path.join(TRACE, 'phase3f-content-extraction-results.json'), {});
  const scrubbed = loadJson(SCRUBBED_CORPUS_PATH, { scrubbedItems: [] });

  return {
    phase3s,
    phase3r: loadJson(path.join(TRACE, 'phase3r-source-recovery-results.json'), {}),
    youtubeV1: loadJson(path.join(OUT_DIR, 'youtube-transcript-recovery.json'), { results: [] }),
    pdfReview: loadJson(path.join(OUT_DIR, 'icoj-pdf-extraction-review.json'), { reviews: [] }),
    organizedV1: loadJson(path.join(OUT_DIR, 'phase3s-organized-review-packets.json'), { packets: [] }),
    recovered3r: loadJson(path.join(OUT_DIR, 'phase3r-recovered-sources.json'), { sources: [] }).sources || [],
    questions: phase3f.questions || [],
    pdfExtractions: phase3f.pdfExtractions || [],
    scrubbedItems: scrubbed.scrubbedItems || [],
    priorCoverage: phase3s.executive?.coverageAfter || phase3s.gapReport?.after || { covered: 280, partial: 219, missing: 94 },
    triage: phase3s.triage || { entries: [] },
    facebookQueue: phase3s.facebookQueue || { queue: [] },
    spanishRecovery: phase3s.spanishRecovery || { lessons: [] },
  };
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

function readLocalTranscriptText(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  if (/\.vtt$/i.test(filePath) || /\.srt$/i.test(filePath)) return parseVttOrSrtContent(raw);
  return raw;
}

function findLocalTranscriptFile(videoId) {
  if (!fs.existsSync(YT_TRANSCRIPT_DIR)) return null;
  let best = null;
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (name.includes(videoId) && /\.(vtt|srt|txt|json)$/i.test(name)) {
        if (!best || /\.en\.vtt$/i.test(name)) best = p;
      }
    }
  };
  walk(YT_TRANSCRIPT_DIR);
  return best;
}

function discoverLocalTranscriptQueue() {
  const byId = new Map();
  if (!fs.existsSync(YT_TRANSCRIPT_DIR)) return [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) {
        walk(p);
        continue;
      }
      if (!/\.(vtt|srt)$/i.test(name)) continue;
      const idMatch = name.match(/-([a-zA-Z0-9_-]{11})\.(en(?:-orig)?)\.(vtt|srt)$/i);
      if (!idMatch) continue;
      const videoId = idMatch[1];
      const titleMatch = name.match(/^\d{8}-(.+?)-[a-zA-Z0-9_-]{11}\./);
      const title = titleMatch
        ? titleMatch[1].replace(/⧸/g, '/').replace(/_/g, ' ')
        : `YouTube ${videoId}`;
      const existing = byId.get(videoId);
      const preferThis = !existing || /\.en\.vtt$/i.test(name) && !/\.en\.vtt$/i.test(existing.localPath || '');
      if (preferThis) {
        byId.set(videoId, {
          videoId,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          title,
          channel: path.basename(path.dirname(p)),
          playlist: 'PLvdDyoGTWuM0W1wP6GHh80vS_r5Y1bfV2',
          localPath: p,
        });
      }
    }
  };
  walk(YT_TRANSCRIPT_DIR);
  return [...byId.values()];
}

function buildYouTubeQueueV2(inputs) {
  const manualRecovery = loadJson(path.join(OUT_DIR, 'phase3t-manual-recovery-packets.json'), {});
  const anchors = (manualRecovery.youtubeAnchors?.priorityQaVideos || []).map((v) => ({
    videoId: v.videoId,
    url: `https://www.youtube.com/watch?v=${v.videoId}`,
    title: v.title,
    channel: 'IOGIsrael',
    playlist: manualRecovery.youtubeAnchors?.wednesdayQaPlaylist?.match(/list=([^&]+)/)?.[1] || null,
  }));
  const v1Manual = (inputs.youtubeV1.results || [])
    .filter((r) => r.manualTranscriptNeeded)
    .map((r) => ({
      videoId: r.videoId,
      url: r.url,
      title: r.title,
      channel: r.channel,
      playlist: r.playlist,
    }));
  const local = discoverLocalTranscriptQueue();
  const byId = new Map();
  for (const item of [...local, ...anchors, ...v1Manual]) {
    if (!item.videoId) continue;
    const prev = byId.get(item.videoId);
    byId.set(item.videoId, { ...prev, ...item, localPath: item.localPath || prev?.localPath });
  }
  return [...byId.values()];
}

function applyManualRecoveryToPdfReview(pdfReview, manualPackets = []) {
  const reviews = [...(pdfReview.reviews || [])];
  for (const manual of manualPackets) {
    if (!manual.verified || !manual.scriptureChain?.length) continue;
    const idx = reviews.findIndex(
      (r) => r.sourceUrl === manual.sourceUrl || fuzzyMatchTitle(r.pdfTitle, manual.title),
    );
    const merged = {
      pdfTitle: manual.title,
      sourceUrl: manual.sourceUrl,
      camp: manual.camp || 'HQ',
      scripturesExtracted: manual.scriptureChain,
      scriptureOrder: manual.scriptureChain,
      sectionHeadings: [manual.title],
      topicCandidates: [manual.doctrinePackCandidate],
      doctrinePackCandidates: [manual.doctrinePackCandidate],
      extractionQuality: 'good',
      needsHumanReview: true,
      status: 'verified_manual_recovery',
      verifiedSource: 'phase3t_manual_recovery_packet',
    };
    if (idx >= 0) reviews[idx] = { ...reviews[idx], ...merged };
    else reviews.push(merged);
  }
  return { ...pdfReview, reviews };
}

function extractRecoveredScriptureRefsFromTranscripts() {
  const refs = new Set();
  if (!fs.existsSync(YT_TRANSCRIPT_DIR)) return [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/\.(vtt|srt)$/i.test(name)) {
        const text = readLocalTranscriptText(p);
        for (const r of extractScriptureReferencesFromText(text)) refs.add(r);
      }
    }
  };
  walk(YT_TRANSCRIPT_DIR);
  return [...refs].sort();
}

async function fetchYouTubeTimedText(videoId) {
  const listRes = await fetchText(`https://www.youtube.com/api/timedtext?type=list&v=${videoId}`);
  if (!listRes.ok || !listRes.text.includes('<track')) return { ok: false, reason: 'no_caption_tracks' };
  for (const lang of ['en', 'en-US', 'en-GB']) {
    const capRes = await fetchText(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}`);
    if (capRes.ok && capRes.text.length > 50) {
      const text = decodeHtml(capRes.text.replace(/<[^>]+>/g, ' '));
      if (text.trim().length > 20) return { ok: true, source: `timedtext_${lang}`, text };
    }
  }
  return { ok: false, reason: 'caption_fetch_empty' };
}

async function tryYoutubeTranscriptApi(videoId) {
  try {
    const { YoutubeTranscript } = require('youtube-transcript');
    const segments = await YoutubeTranscript.fetchTranscript(videoId);
    const text = segments.map((s) => s.text).join(' ');
    if (text.length > 20) return { ok: true, source: 'youtube_transcript_api', text };
    return { ok: false, reason: 'empty_transcript' };
  } catch (err) {
    return { ok: false, reason: err.code === 'MODULE_NOT_FOUND' ? 'youtube_transcript_api_not_installed' : err.message };
  }
}

async function tryYtDlpSubs(url, videoId) {
  fs.mkdirSync(YT_TRANSCRIPT_DIR, { recursive: true });
  const outTemplate = path.join(YT_TRANSCRIPT_DIR, '%(channel)s', '%(upload_date)s-%(title)s-%(id)s.%(ext)s');
  try {
    await execFileAsync('yt-dlp', [
      '--skip-download', '--write-subs', '--write-auto-subs',
      '--sub-langs', 'en.*', '--sub-format', 'vtt/srt/best',
      '-o', outTemplate, url,
    ], { timeout: 60000 });
    const local = findLocalTranscriptFile(videoId);
    if (local) return { ok: true, source: 'yt_dlp', text: fs.readFileSync(local, 'utf8'), path: local };
    return { ok: false, reason: 'yt_dlp_no_output_file' };
  } catch (err) {
    return { ok: false, reason: err.code === 'ENOENT' ? 'yt_dlp_not_installed' : (err.message || 'yt_dlp_failed') };
  }
}

function extractQuestionsFromText(text = '') {
  return [...text.matchAll(/[^.!?\n]{8,200}\?/g)].map((m) => m[0].trim()).slice(0, 12);
}

async function recoverYouTubeTranscriptsV2(queue) {
  fs.mkdirSync(YT_TRANSCRIPT_DIR, { recursive: true });
  const results = [];

  for (const item of queue) {
    const videoId = item.videoId || videoIdFromUrl(item.url);
    const url = item.url || `https://www.youtube.com/watch?v=${videoId}`;
    let transcriptStatus = 'not_found';
    let transcriptSource = null;
    let transcriptText = '';
    let failureReason = null;
    let manualTranscriptNeeded = true;

    const localPath = item.localPath || findLocalTranscriptFile(videoId);
    if (localPath) {
      transcriptText = readLocalTranscriptText(localPath);
      transcriptStatus = 'recovered';
      transcriptSource = 'local_transcript_folder';
      manualTranscriptNeeded = false;
    }

    if (!transcriptText) {
      const api = await tryYoutubeTranscriptApi(videoId);
      if (api.ok) {
        transcriptText = api.text;
        transcriptStatus = 'recovered';
        transcriptSource = api.source;
        manualTranscriptNeeded = false;
      } else if (!failureReason) failureReason = api.reason;
      await sleep(100);
    }

    if (!transcriptText) {
      const timed = await fetchYouTubeTimedText(videoId);
      if (timed.ok) {
        transcriptText = timed.text;
        transcriptStatus = 'recovered';
        transcriptSource = timed.source;
        manualTranscriptNeeded = false;
      } else if (!failureReason) failureReason = timed.reason;
      await sleep(120);
    }

    if (!transcriptText) {
      const ytdlp = await tryYtDlpSubs(url, videoId);
      if (ytdlp.ok) {
        transcriptText = ytdlp.text;
        transcriptStatus = 'recovered';
        transcriptSource = ytdlp.source;
        manualTranscriptNeeded = false;
      } else if (!failureReason) failureReason = ytdlp.reason;
    }

    let description = '';
    let title = item.title || '';
    if (!title || transcriptStatus !== 'recovered') {
      const scrub = await scrubYouTubeVideo(videoId, {
        camp: 'HQ',
        organization: /icoj/i.test(item.channel || '') ? 'ICOJ' : 'IOG',
        sourceName: item.channel || 'YouTube',
      });
      description = scrub.items?.[0]?.answerSummary || '';
      title = title || scrub.items?.[0]?.lessonTitle || '';
      await sleep(120);
    }
    const descriptionScriptures = extractScriptureReferencesFromText(`${title} ${description}`);
    const captionScriptures = extractScriptureReferencesFromText(transcriptText);
    const chapterMarkers = [...`${title} ${description}`.matchAll(/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g)].map((m) => m[1]);

    if (!captionScriptures.length && descriptionScriptures.length && transcriptStatus === 'not_found') {
      transcriptStatus = 'description_only';
    }
    if (transcriptStatus === 'recovered' || captionScriptures.length) manualTranscriptNeeded = false;
    if (transcriptStatus === 'not_found' && !descriptionScriptures.length) manualTranscriptNeeded = true;

    results.push({
      videoId,
      url,
      title,
      channel: item.channel,
      playlist: item.playlist,
      transcriptStatus,
      transcriptSource,
      descriptionScriptures,
      captionScriptures,
      description,
      chapterMarkers,
      manualTranscriptNeeded,
      failureReason,
      transcriptSample: transcriptText.slice(0, 400),
      questionSegments: extractQuestionsFromText(transcriptText || description),
      captionRefCount: captionScriptures.length,
    });
    if (transcriptStatus !== 'recovered') await sleep(180);
  }

  return {
    results,
    recovered: results.filter((r) => r.transcriptStatus === 'recovered').length,
    descriptionOnly: results.filter((r) => r.transcriptStatus === 'description_only').length,
    stillManual: results.filter((r) => r.manualTranscriptNeeded).length,
  };
}

function runClaudeYouTubeSourceWorker(youtubeResults) {
  const outputs = [];

  for (const v of youtubeResults.results) {
    const scripturesFound = uniqueRefs([...v.captionScriptures, ...v.descriptionScriptures]);
    const topicCandidates = [];
    const t = discoverTopicFromText(`${v.title} ${v.transcriptSample || ''}`)?.topic;
    if (t) topicCandidates.push(t);
    const pack = assignPackCandidate(v.title, scripturesFound, t);
    const doctrinePackCandidates = pack ? [pack] : [];

    outputs.push({
      sourceType: 'youtube',
      videoId: v.videoId,
      url: v.url,
      title: v.title,
      questionsFound: v.questionSegments || [],
      scripturesFound,
      scriptureOrder: scripturesFound,
      topicCandidates,
      doctrinePackCandidates,
      manualTranscriptNeeded: v.manualTranscriptNeeded,
      notes: v.failureReason || (v.transcriptSource ? `transcript via ${v.transcriptSource}` : 'no transcript'),
    });
  }

  return {
    auditType: 'claude_read_only_youtube_worker',
    modelNote: 'Programmatic read-only extraction worker — does not approve doctrine or modify production',
    outputs,
    manualStillNeeded: outputs.filter((o) => o.manualTranscriptNeeded).length,
  };
}

function buildPdfHumanReviewPipeline(pdfReview) {
  const reviews = (pdfReview.reviews || []).map((r) => {
    const scriptures = normalizeRefsList(r.scripturesExtracted || []);
    const scriptureOrder = normalizeRefsList(r.scriptureOrder || scriptures);
    const topic = r.topicCandidates?.[0] || discoverTopicFromText(`${r.pdfTitle} ${(r.sectionHeadings || []).join(' ')}`)?.topic;
    const pack = r.doctrinePackCandidates?.[0]
      || (r.verifiedSource === 'phase3t_manual_recovery_packet' && r.topicCandidates?.[0])
      || assignPackCandidate(r.pdfTitle, scriptures, topic);
    let extractionQuality = r.extractionQuality || 'good';
    if (scriptures.length < 2) extractionQuality = 'thin';
    if (scriptures.length > 25) extractionQuality = 'dense_review_needed';

    const claudeFlags = [];
    if (!r.sectionHeadings?.length && scriptures.length > 8) claudeFlags.push('flat_list_risk');
    if (scriptures.length === 0) claudeFlags.push('no_scriptures_extracted');

    return {
      pdfTitle: r.pdfTitle,
      sourceUrl: r.sourceUrl,
      camp: r.camp,
      scripturesVerified: scriptures,
      scriptureOrder,
      sectionHeadings: r.sectionHeadings || [],
      lessonTitle: r.pdfTitle,
      topicCandidate: topic,
      doctrinePackCandidate: pack,
      questionCandidates: r.questionCandidates || [],
      extractionQuality,
      needsHumanReview: extractionQuality !== 'good' || r.needsHumanReview,
      claudeReadOnlyFlags: claudeFlags,
    };
  });

  return {
    totalReviewed: reviews.length,
    validated: reviews.filter((r) => r.extractionQuality === 'good' && !r.needsHumanReview).length,
    needsHumanReview: reviews.filter((r) => r.needsHumanReview).length,
    reviews,
  };
}

function buildFacebookPasteWorkflow(facebookQueue) {
  const queue = (facebookQueue.queue || []).map((f) => ({
    sourceName: 'Facebook Recovery',
    camp: 'HQ',
    url: f.url,
    title: f.title,
    neededText: 'video title, description, visible Q&A, visible scripture refs, comments/questions if public',
    pasteStatus: f.manualPasteNeeded ? 'awaiting_manual_paste' : 'metadata_available',
    assignedDoctrinePackCandidate: assignPackCandidate(f.title || '', []),
    existingScriptureCount: f.scriptureCount || 0,
  }));

  return {
    total: queue.length,
    awaitingPaste: queue.filter((q) => q.pasteStatus === 'awaiting_manual_paste').length,
    queue,
  };
}

function buildSpanishWorkflowV2(spanishRecovery) {
  const lessons = (spanishRecovery.lessons || []).map((l) => ({
    spanishTitle: l.spanishTitle || l.title,
    englishTitle: l.englishTitle || l.spanishTitle?.replace(/PENTECOSTÉS/i, 'Pentecost').replace(/JESÚS/i, 'Jesus'),
    sourceUrl: l.sourceUrl,
    camp: l.camp || 'HQ',
    scriptureRefsFound: l.scriptureRefsFound || [],
    topicCandidate: l.topicCandidate || discoverTopicFromText(l.spanishTitle || '')?.topic,
    doctrinePackCandidate: l.doctrinePackCandidate || assignPackCandidate(l.spanishTitle, l.scriptureRefsFound || []),
    transcriptStatus: l.transcriptStatus || (l.manualTranscriptNeeded ? 'needs_transcript' : 'unknown'),
    manualTranscriptNeeded: l.manualTranscriptNeeded || !(l.scriptureRefsFound || []).length,
  }));

  return {
    total: lessons.length,
    withScriptures: lessons.filter((l) => l.scriptureRefsFound.length > 0).length,
    queuedManual: lessons.filter((l) => l.manualTranscriptNeeded).length,
    lessons,
  };
}

async function resolveMissingEntriesV2(inputs, youtubeResults, facebookWorkflow, spanishWorkflow) {
  const entries = inputs.triage.entries || [];
  const resolved = [];
  let urlFetchesAttempted = 0;

  for (const e of entries) {
    let triageCategory = e.triageCategory;
    let resolutionStatus = 'still_missing';
    let scripturesFound = [];
    let linkageCandidate = e.assignedDoctrinePackCandidate;

    const ytMatch = youtubeResults.results.find((r) => fuzzyMatchTitle(r.title, e.lessonTitle));
    const fbMatch = facebookWorkflow.queue.find((f) => fuzzyMatchTitle(f.title || '', e.lessonTitle));
    const esMatch = spanishWorkflow.lessons.find((s) => fuzzyMatchTitle(s.spanishTitle, e.lessonTitle));

    if (ytMatch) {
      scripturesFound = uniqueRefs([...ytMatch.captionScriptures, ...ytMatch.descriptionScriptures]);
      if (scripturesFound.length) resolutionStatus = 'resolved_youtube';
    }

    if (triageCategory === 'url_fetch_needed' && e.sourceUrl && urlFetchesAttempted < 20) {
      urlFetchesAttempted += 1;
      const res = await fetchText(e.sourceUrl);
      if (res.ok) {
        const refs = extractScriptureReferencesFromText(decodeHtml(res.text || ''));
        if (refs.length) {
          scripturesFound = uniqueRefs([...scripturesFound, ...refs]);
          resolutionStatus = 'resolved_url_fetch';
        }
      }
      await sleep(150);
    }

    if (triageCategory === 'doctrine_pack_link_needed' && linkageCandidate) {
      resolutionStatus = scripturesFound.length ? 'linkage_candidate_with_scriptures' : 'linkage_candidate_only';
    }

    if (esMatch?.scriptureRefsFound?.length) {
      scripturesFound = uniqueRefs([...scripturesFound, ...esMatch.scriptureRefsFound]);
      resolutionStatus = 'resolved_spanish';
    }

    resolved.push({
      sourceName: e.sourceName,
      camp: e.camp,
      lessonTitle: e.lessonTitle,
      sourceUrl: e.sourceUrl,
      reasonMissing: e.reasonMissing,
      triageCategory,
      resolutionStatus,
      scripturesFound,
      linkageCandidate,
      nextAction: e.nextAction,
      matchedYouTube: ytMatch?.videoId || null,
      matchedFacebook: fbMatch?.url || null,
    });
  }

  return {
    total: resolved.length,
    resolvedCount: resolved.filter((r) => r.resolutionStatus.startsWith('resolved')).length,
    linkageCandidates: resolved.filter((r) => r.resolutionStatus.includes('linkage')).length,
    stillMissing: resolved.filter((r) => r.resolutionStatus === 'still_missing').length,
    byCategory: resolved.reduce((acc, r) => {
      acc[r.triageCategory] = (acc[r.triageCategory] || 0) + 1;
      return acc;
    }, {}),
    entries: resolved,
    urlFetchesAttempted,
  };
}

function organizeItemV2(item) {
  const scripturesCited = normalizeRefsList(item.scripturesCited || item.scripturesFound || item.scripturesVerified || []);
  const scriptureOrder = normalizeRefsList(item.scriptureOrder || scripturesCited);
  const originalScriptureChain = scriptureOrder.length ? scriptureOrder : scripturesCited;
  const originalSet = new Set(originalScriptureChain.map(refKey));
  const topicCandidate = item.topicCandidate || discoverTopicFromText(`${item.lessonTitle} ${item.question || ''}`)?.topic;
  const doctrinePackCandidate = item.doctrinePackCandidate || assignPackCandidate(item.lessonTitle, originalScriptureChain, topicCandidate);
  const genesisToRevelationChain = buildStrongestG2RChain(originalScriptureChain, originalScriptureChain);
  const classified = classifyScriptures(originalSet, originalScriptureChain, doctrinePackCandidate);

  return {
    source: item.source || item.sourceName || item.recoveryMethod || 'phase3t',
    camp: item.camp || 'HQ',
    lessonTitle: item.lessonTitle || item.title || item.pdfTitle || item.spanishTitle,
    question: item.question || `What does "${item.lessonTitle || item.title}" teach according to Scripture?`,
    answerSummary: item.answerSummary || item.description || item.transcriptSample || '',
    scripturesCited,
    scriptureOrder,
    originalScriptureChain,
    genesisToRevelationChain,
    parallelScriptures: classified.parallelScriptures,
    supportingScriptures: classified.supportingScriptures,
    continuityScriptures: classified.continuityScriptures,
    topicCandidate,
    doctrinePackCandidate,
    humanReviewRequired: true,
    autoApplied: false,
    recoveryLane: item.recoveryLane || item.recoveryMethod || 'cursor_organization',
  };
}

function buildOrganizationV2(inputs, youtubeResults, pdfPipeline, facebookWorkflow, spanishWorkflow, missingResolution, claudeYoutube) {
  const raw = [];

  for (const o of claudeYoutube.outputs) {
    if (!o.scripturesFound?.length && !o.questionsFound?.length) continue;
    raw.push({
      sourceName: 'YouTube',
      camp: 'HQ',
      lessonTitle: o.title,
      scripturesCited: o.scripturesFound,
      scriptureOrder: o.scriptureOrder,
      topicCandidate: o.topicCandidates?.[0],
      doctrinePackCandidate: o.doctrinePackCandidates?.[0],
      recoveryLane: 'claude_youtube_worker',
      recoveryMethod: 'youtube',
    });
  }

  for (const r of youtubeResults.results) {
    const scriptures = uniqueRefs([...r.captionScriptures, ...r.descriptionScriptures]);
    if (!scriptures.length) continue;
    raw.push({
      sourceName: r.channel,
      lessonTitle: r.title,
      scripturesCited: scriptures,
      answerSummary: r.transcriptSample || r.description,
      recoveryLane: 'youtube_transcript_v2',
    });
  }

  for (const p of pdfPipeline.reviews) {
    raw.push({
      sourceName: 'ICOJ PDF',
      camp: p.camp,
      lessonTitle: p.lessonTitle || p.pdfTitle,
      scripturesCited: p.scripturesVerified,
      scriptureOrder: p.scriptureOrder,
      topicCandidate: p.topicCandidate,
      doctrinePackCandidate: p.doctrinePackCandidate,
      recoveryLane: 'pdf_human_review',
    });
  }

  for (const f of facebookWorkflow.queue.filter((q) => q.existingScriptureCount > 0)) {
    raw.push({
      sourceName: 'Facebook',
      lessonTitle: f.title,
      scripturesCited: [],
      doctrinePackCandidate: f.assignedDoctrinePackCandidate,
      recoveryLane: 'facebook_manual_paste',
    });
  }

  for (const s of spanishWorkflow.lessons.filter((l) => l.scriptureRefsFound.length)) {
    raw.push({
      sourceName: 'Spanish IOG',
      camp: s.camp,
      lessonTitle: s.spanishTitle,
      scripturesCited: s.scriptureRefsFound,
      topicCandidate: s.topicCandidate,
      doctrinePackCandidate: s.doctrinePackCandidate,
      recoveryLane: 'spanish_iog',
    });
  }

  for (const m of missingResolution.entries.filter((e) => e.scripturesFound.length)) {
    raw.push({
      sourceName: m.sourceName,
      camp: m.camp,
      lessonTitle: m.lessonTitle,
      scripturesCited: m.scripturesFound,
      doctrinePackCandidate: m.linkageCandidate,
      recoveryLane: 'missing_entry_resolution',
    });
  }

  for (const s of inputs.recovered3r) {
    if ((s.scripturesCited || []).length) {
      raw.push({ ...s, recoveryLane: 'phase3r_recovered' });
    }
  }

  const seen = new Set();
  const uniqueRaw = [];
  for (const item of raw) {
    const k = `${normalizeKey(item.lessonTitle)}|${(item.scripturesCited || []).length}`;
    if (seen.has(k)) continue;
    seen.add(k);
    uniqueRaw.push(item);
  }

  return uniqueRaw.map((item) => organizeItemV2(item));
}

function buildPackLinkageV2(packets) {
  const byPack = {};
  const priorityPacks = PACK_LINKAGE_V2;

  for (const p of packets) {
    const key = p.doctrinePackCandidate || 'unassigned';
    if (!byPack[key]) byPack[key] = { pack: key, count: 0, scriptures: 0, lessons: [], priority: priorityPacks.includes(key) };
    byPack[key].count += 1;
    byPack[key].scriptures += p.originalScriptureChain.length;
    if (byPack[key].lessons.length < 5) byPack[key].lessons.push(p.lessonTitle);
  }

  const sorted = Object.values(byPack).sort((a, b) => b.scriptures - a.scriptures);
  return {
    totalPackets: packets.length,
    priorityPacksLinked: sorted.filter((p) => p.priority).length,
    byPack: sorted,
    topPacks: sorted.filter((p) => p.pack !== 'unassigned').slice(0, 15),
  };
}

function buildHumanReviewPacketsV2(packets, pdfPipeline, youtubeResults, facebookWorkflow, spanishWorkflow, missingResolution) {
  const lane = (p) => `${p.recoveryLane || ''} ${p.source || ''}`;
  const groups = {
    youtube: packets.filter((p) => /youtube/i.test(lane(p))),
    pdf: packets.filter((p) => /pdf/i.test(lane(p))),
    facebook: packets.filter((p) => /facebook/i.test(lane(p))),
    spanish: packets.filter((p) => /spanish/i.test(lane(p))),
    missingResolution: packets.filter((p) => /missing_entry/i.test(lane(p))),
  };

  return {
    total: packets.length,
    byGroup: Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length])),
    packets: packets.slice(0, 120),
    youtubeManualQueue: youtubeResults.stillManual,
    pdfNeedsReview: pdfPipeline.needsHumanReview,
    facebookAwaitingPaste: facebookWorkflow.awaitingPaste,
    spanishQueued: spanishWorkflow.queuedManual,
    missingResolved: missingResolution.resolvedCount,
  };
}

function computeCoverageV2(inputs, packets, breakdown) {
  const prior = inputs.priorCoverage;
  const recoveredSources = packets.map((p) => ({
    lessonTitle: p.lessonTitle,
    scripturesCited: p.originalScriptureChain,
    sourceName: p.source,
    camp: p.camp,
  }));

  const gapInputs = {
    questions: inputs.questions,
    pdfExtractions: inputs.pdfExtractions,
    scrubbedItems: inputs.scrubbedItems,
    priorCoverage: prior,
  };

  const gap = computeGapElimination(gapInputs, recoveredSources, prior, {
    videoEntries: packets.filter((p) => /youtube/i.test(p.source)).map((p) => ({
      title: p.lessonTitle,
      scripturesCited: p.originalScriptureChain,
    })),
  });

  return {
    before: prior,
    after: gap.after,
    delta: gap.delta,
    newlyRecoveredFromMissing: gap.newlyRecoveredFromMissing,
    remainingMissing: gap.remainingMissingCount,
    breakdown,
  };
}

async function runPhase3tSourceWorkerOrganization() {
  const inputs = loadPhase3Inputs();
  const manualRecovery = loadJson(path.join(OUT_DIR, 'phase3t-manual-recovery-packets.json'), { packets: [] });
  const manualPackets = manualRecovery.packets || [];

  const youtubeQueue = buildYouTubeQueueV2(inputs);
  const recoveredScriptureRefs = extractRecoveredScriptureRefsFromTranscripts();

  const youtubeResults = await recoverYouTubeTranscriptsV2(youtubeQueue);
  const claudeYoutube = runClaudeYouTubeSourceWorker(youtubeResults);
  const pdfReviewMerged = applyManualRecoveryToPdfReview(inputs.pdfReview, manualPackets);
  const pdfPipeline = buildPdfHumanReviewPipeline(pdfReviewMerged);
  const facebookWorkflow = buildFacebookPasteWorkflow(inputs.facebookQueue);
  const spanishWorkflow = buildSpanishWorkflowV2(inputs.spanishRecovery);
  const missingResolution = await resolveMissingEntriesV2(inputs, youtubeResults, facebookWorkflow, spanishWorkflow);
  const organizedPackets = buildOrganizationV2(
    inputs, youtubeResults, pdfPipeline, facebookWorkflow, spanishWorkflow, missingResolution, claudeYoutube,
  );
  const packLinkage = buildPackLinkageV2(organizedPackets);
  const humanReview = buildHumanReviewPacketsV2(
    organizedPackets, pdfPipeline, youtubeResults, facebookWorkflow, spanishWorkflow, missingResolution,
  );

  const scriptureInPackets = uniqueRefs(organizedPackets.flatMap((p) => p.originalScriptureChain)).length;
  const breakdown = {
    youtube: organizedPackets.filter((p) => /youtube/i.test(p.recoveryLane || '')).length,
    pdf: organizedPackets.filter((p) => /pdf/i.test(p.recoveryLane || '')).length,
    facebook: organizedPackets.filter((p) => /facebook/i.test(p.recoveryLane || '')).length,
    spanish: organizedPackets.filter((p) => /spanish/i.test(p.recoveryLane || '')).length,
    urlFetch: missingResolution.entries.filter((e) => e.resolutionStatus === 'resolved_url_fetch').length,
    doctrineLinkage: missingResolution.linkageCandidates,
  };

  const coverage = computeCoverageV2(inputs, organizedPackets, breakdown);

  const executive = {
    youtubeTranscriptsRecovered: youtubeResults.recovered,
    youtubeDescriptionOnly: youtubeResults.descriptionOnly,
    youtubeStillManual: youtubeResults.stillManual,
    pdfsReviewed: pdfPipeline.totalReviewed,
    pdfsValidated: pdfPipeline.validated,
    facebookPastePackets: facebookWorkflow.total,
    facebookAwaitingPaste: facebookWorkflow.awaitingPaste,
    spanishPackets: spanishWorkflow.total,
    spanishQueued: spanishWorkflow.queuedManual,
    missingTriaged: missingResolution.total,
    missingResolved: missingResolution.resolvedCount,
    scripturesInReviewPackets: scriptureInPackets,
    reviewPacketCount: organizedPackets.length,
    topPacks: packLinkage.topPacks,
    coverageBefore: coverage.before,
    coverageAfter: coverage.after,
    remainingMissing: coverage.remainingMissing,
    blockedReasons: [
      youtubeResults.stillManual > 0
        ? `${youtubeResults.stillManual} YouTube items still lack captions (non-Q&A lessons / Spanish / no public subs)`
        : 'YouTube Wednesday Q&A playlist captions recovered via yt-dlp',
      'Facebook metadata blocked — manual paste queue (thykingdomcome7)',
      'Spanish lessons need caption/translation upload',
      'IOG legacy URLs 404: /lessons, /live, /global-publication',
      'israelofgoddallas.com DNS failure',
    ],
    manualRecoveryPacketsApplied: manualPackets.length,
    recoveredScriptureRefCount: recoveredScriptureRefs.length,
    wednesdayQaPlaylistRecovered: youtubeQueue.filter((q) => q.playlist).length,
  };

  const payload = {
    phase: '3T',
    ranAt: new Date().toISOString(),
    youtubeQueue,
    recoveredScriptureRefs,
    youtubeResults,
    claudeYoutube,
    pdfPipeline,
    facebookWorkflow,
    spanishWorkflow,
    missingResolution,
    organizedPackets,
    packLinkage,
    humanReview,
    coverage,
    executive,
    safety: {
      productionChanges: false,
      implementation: false,
      approvals: false,
      doctrineChanges: false,
      evidenceCardChanges: false,
      graphUpdates: false,
      promptChanges: false,
      passed: true,
    },
  };

  fs.mkdirSync(TRACE, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(YT_TRANSCRIPT_DIR, { recursive: true });

  fs.writeFileSync(path.join(TRACE, 'phase3t-source-worker-organization-results.json'), `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT_DIR, 'youtube-transcript-recovery-v2.json'), `${JSON.stringify({ ranAt: payload.ranAt, results: youtubeResults.results, summary: youtubeResults }, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT_DIR, 'icoj-pdf-human-review-pipeline.json'), `${JSON.stringify({ ranAt: payload.ranAt, reviews: pdfPipeline.reviews, summary: pdfPipeline }, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT_DIR, 'facebook-manual-paste-queue.json'), `${JSON.stringify(facebookWorkflow, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT_DIR, 'spanish-iog-workflow-v2.json'), `${JSON.stringify(spanishWorkflow, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT_DIR, 'missing-entry-resolution-v2.json'), `${JSON.stringify(missingResolution, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT_DIR, 'cursor-recovered-source-organization-v2.json'), `${JSON.stringify({ ranAt: payload.ranAt, packets: organizedPackets }, null, 2)}\n`);
  fs.writeFileSync(
    path.join(OUT_DIR, 'recovered-scripture-refs.txt'),
    `${recoveredScriptureRefs.join('\n')}\n`,
  );

  return payload;
}

module.exports = {
  runPhase3tSourceWorkerOrganization,
};
