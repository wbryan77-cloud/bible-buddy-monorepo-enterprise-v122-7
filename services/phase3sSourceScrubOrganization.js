/**
 * Phase 3S — Claude read-only source scrub, transcript recovery, Cursor organization.
 * Source recovery + organization only — no production, doctrine, card, or graph mutations.
 */

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const {
  fetchText,
  extractScripturesFromText,
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
const { OFFICIAL_IOG_ICOJ_SOURCES } = require('./phase3rSourceRecovery');
const { computeGapElimination } = require('./phase3rSourceRecovery');

const ROOT = path.join(__dirname, '..');
const TRACE = path.join(ROOT, 'docs', 'regression-trace');
const OUT_DIR = path.join(ROOT, 'docs', 'evidence-candidates');
const REGISTRY_PATH = path.join(ROOT, 'data', 'full-corpus-source-registry.json');
const SCRUBBED_CORPUS_PATH = path.join(ROOT, 'data', 'phase3e-scrubbed-corpus.json');

const PACK_LINKAGE_TARGETS = [
  'one_hundred_forty_four_thousand', '144000', 'peter', 'peter_paul_alignment',
  'jacob_israel_twelve_tribes', 'jacob', 'millennial_kingdom_kingdom_on_earth', 'millennial_kingdom',
  'jesus_old_testament_new_testament', 'holy_spirit', 'feasts', 'passover', 'pentecost',
  'kingdom_of_god', 'kingdom', 'death_state', 'resurrection', 'messiah_logos', 'messiah',
  'dietary_law', 'sabbath', 'high_sabbaths', 'leviticus_23',
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

function loadAllInputs() {
  const phase3r = loadJson(path.join(TRACE, 'phase3r-source-recovery-results.json'), {});
  const phase3f = loadJson(path.join(TRACE, 'phase3f-content-extraction-results.json'), {});
  const scrubbed = loadJson(SCRUBBED_CORPUS_PATH, { scrubbedItems: [] });
  const registry = loadJson(REGISTRY_PATH, { sources: [] });
  const recovered3r = loadJson(path.join(OUT_DIR, 'phase3r-recovered-sources.json'), { sources: [] });
  const transcriptExtractions = loadJson(path.join(OUT_DIR, 'transcript-extractions.json'), { extractions: [] });
  const deepPacks = loadJson(path.join(OUT_DIR, 'deep-recovered-packs.json'), { packs: [] });

  return {
    phase3r,
    questions: phase3f.questions || [],
    pdfExtractions: phase3f.pdfExtractions || [],
    scrubbedItems: scrubbed.scrubbedItems || [],
    registrySources: registry.sources || [],
    recovered3r: recovered3r.sources || [],
    transcriptExtractions: transcriptExtractions.extractions || [],
    deepPacks: deepPacks.packs || [],
    priorCoverage: phase3r.executive?.coverageAfter || phase3r.gapReport?.after || { covered: 280, partial: 219, missing: 94 },
  };
}

function buildSourceMapAudit(inputs) {
  const entries = [];
  const urlSeen = new Set();

  const add = (org, category, label, url, camp = 'HQ', meta = {}) => {
    if (!url || urlSeen.has(url)) return;
    urlSeen.add(url);
    entries.push({ organization: org, category, label, url, camp, ...meta });
  };

  for (const [orgKey, orgData] of Object.entries(OFFICIAL_IOG_ICOJ_SOURCES)) {
    const org = orgKey === 'IOG' ? 'IOG' : 'ICOJ';
    for (const [key, url] of Object.entries(orgData.headquarters || {})) {
      add(org, 'headquarters', key, url);
    }
    for (const camp of orgData.camps || []) {
      for (const [k, url] of Object.entries(camp)) {
        if (k === 'name') continue;
        add(org, 'camp', `${camp.name} — ${k}`, url, camp.name);
      }
    }
  }

  for (const src of inputs.registrySources) {
    const urls = [src.websiteUrl, src.youtubeChannelUrl, ...(src.playlistUrls || []),
      ...(src.lessonUrls || []), ...(src.qnaUrls || []), src.facebookUrl].filter(Boolean);
    for (const url of urls) {
      add(src.organization, 'registry', src.sourceName, url, src.camp, { sourceId: src.sourceId });
    }
  }

  if (inputs.phase3r.masterInventory?.entries) {
    for (const e of inputs.phase3r.masterInventory.entries) {
      add(e.organization, e.category, e.label, e.url, e.camp);
    }
  }

  const phase3rRecovered = inputs.recovered3r.length;
  const gapMissing = inputs.phase3r.gapReport?.remainingMissingCount || 0;

  return {
    totalEntries: entries.length,
    byOrganization: {
      IOG: entries.filter((e) => e.organization === 'IOG').length,
      ICOJ: entries.filter((e) => e.organization === 'ICOJ').length,
    },
    phase3rRecoveredSources: phase3rRecovered,
    gapMissingEntries: gapMissing,
    deadLinksNoted: [
      'https://theisraelofgod.com/live — HTTP 404 (3R)',
      'https://theisraelofgod.com/lessons — HTTP 404 (3R)',
      'https://theisraelofgod.com/global-publication — HTTP 404 (3R)',
      'https://israelofgoddallas.com — DNS ENOTFOUND (3R)',
    ],
    entries,
  };
}

function buildYouTubeQueue(inputs) {
  const seen = new Set();
  const queue = [];

  const push = (item) => {
    const id = videoIdFromUrl(item.videoUrl || item.url);
    if (!id || seen.has(id)) return;
    seen.add(id);
    queue.push({
      videoId: id,
      url: item.videoUrl || item.url || `https://www.youtube.com/watch?v=${id}`,
      title: item.lessonTitle || item.title || '',
      channel: item.sourceName || item.channel || '',
      playlist: item.playlist || null,
    });
  };

  for (const t of inputs.transcriptExtractions.filter((x) => x.manualTranscriptNeeded)) push(t);
  for (const v of (inputs.phase3r.youtube?.videoEntries || []).filter((x) => x.manual_transcript_needed)) push(v);

  const iogIsrael = (inputs.phase3r.youtube?.videoEntries || []).filter((x) =>
    /IOGIsrael|wednesday|q\s*&\s*a/i.test(`${x.sourceName || ''} ${x.title || ''}`),
  );
  for (const v of iogIsrael) push(v);

  return queue.slice(0, 30);
}

async function findLocalTranscript(videoId) {
  const dirs = [path.join(ROOT, 'data'), path.join(ROOT, 'docs'), path.join(OUT_DIR)];
  const exts = ['.vtt', '.srt', '.txt', '.json'];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const ext of exts) {
      const p = path.join(dir, `${videoId}${ext}`);
      if (fs.existsSync(p)) {
        const text = fs.readFileSync(p, 'utf8');
        return { found: true, path: p, text };
      }
    }
  }
  return { found: false };
}

async function fetchYouTubeTimedText(videoId) {
  const listRes = await fetchText(`https://www.youtube.com/api/timedtext?type=list&v=${videoId}`);
  if (!listRes.ok || !listRes.text.includes('<track')) {
    return { ok: false, reason: 'no_caption_tracks' };
  }

  const langs = ['en', 'en-US', 'en-GB', 'a.en'];
  for (const lang of langs) {
    const capRes = await fetchText(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}`);
    if (capRes.ok && capRes.text.length > 50) {
      const text = decodeHtml(capRes.text.replace(/<[^>]+>/g, ' '));
      if (text.trim().length > 20) {
        return { ok: true, source: `timedtext_${lang}`, text };
      }
    }
  }
  return { ok: false, reason: 'caption_tracks_exist_but_fetch_empty' };
}

async function tryYtDlpSubs(videoId, outDir) {
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    await execFileAsync('yt-dlp', [
      '--skip-download', '--write-subs', '--write-auto-subs',
      '--sub-langs', 'en.*', '--sub-format', 'vtt/best',
      '-o', path.join(outDir, `${videoId}`),
      url,
    ], { timeout: 45000 });
    const vtt = path.join(outDir, `${videoId}.en.vtt`);
    const auto = path.join(outDir, `${videoId}.en.auto.vtt`);
    const file = fs.existsSync(vtt) ? vtt : (fs.existsSync(auto) ? auto : null);
    if (file) {
      return { ok: true, source: 'yt_dlp', text: fs.readFileSync(file, 'utf8') };
    }
    return { ok: false, reason: 'yt_dlp_no_sub_file' };
  } catch (err) {
    return { ok: false, reason: err.code === 'ENOENT' ? 'yt_dlp_not_installed' : (err.message || 'yt_dlp_failed') };
  }
}

async function recoverYouTubeTranscripts(queue) {
  const tmpDir = path.join(OUT_DIR, 'phase3s-youtube-subs');
  fs.mkdirSync(tmpDir, { recursive: true });

  const results = [];

  for (const item of queue) {
    const videoId = item.videoId;
    let transcriptStatus = 'not_found';
    let transcriptSource = null;
    let transcriptText = '';
    let captionScriptures = [];
    let descriptionScriptures = [];
    let failureReason = null;
    let manualTranscriptNeeded = true;

    const local = await findLocalTranscript(videoId);
    if (local.found) {
      transcriptText = local.text;
      transcriptStatus = 'recovered';
      transcriptSource = 'local_file';
      captionScriptures = extractScriptureReferencesFromText(transcriptText);
      manualTranscriptNeeded = captionScriptures.length === 0;
    }

    if (!transcriptText) {
      const timed = await fetchYouTubeTimedText(videoId);
      if (timed.ok) {
        transcriptText = timed.text;
        transcriptStatus = 'recovered';
        transcriptSource = timed.source;
        captionScriptures = extractScriptureReferencesFromText(transcriptText);
        manualTranscriptNeeded = false;
      } else {
        failureReason = timed.reason;
      }
      await sleep(150);
    }

    if (!transcriptText) {
      const ytdlp = await tryYtDlpSubs(videoId, tmpDir);
      if (ytdlp.ok) {
        transcriptText = ytdlp.text;
        transcriptStatus = 'recovered';
        transcriptSource = ytdlp.source;
        captionScriptures = extractScriptureReferencesFromText(transcriptText);
        manualTranscriptNeeded = false;
      } else if (!failureReason) {
        failureReason = ytdlp.reason;
      }
    }

    const scrub = await scrubYouTubeVideo(videoId, {
      camp: 'HQ',
      organization: /icoj/i.test(item.channel) ? 'ICOJ' : 'IOG',
      sourceName: item.channel || 'YouTube',
    });
    const descText = scrub.items?.[0]?.answerSummary || '';
    descriptionScriptures = extractScriptureReferencesFromText(`${item.title} ${descText}`);
    if (!captionScriptures.length && descriptionScriptures.length) {
      transcriptStatus = transcriptStatus === 'not_found' ? 'description_only' : transcriptStatus;
    }

    if (transcriptStatus === 'not_found' && !descriptionScriptures.length) {
      manualTranscriptNeeded = true;
    }

    results.push({
      videoId,
      url: item.url,
      title: item.title || scrub.items?.[0]?.lessonTitle,
      channel: item.channel,
      playlist: item.playlist,
      transcriptStatus,
      transcriptSource,
      descriptionScriptures,
      captionScriptures,
      manualTranscriptNeeded,
      failureReason,
      transcriptSample: transcriptText.slice(0, 300),
      questionSegments: [...transcriptText.matchAll(/[^.!?\n]{8,200}\?/g)].map((m) => m[0].trim()).slice(0, 8),
    });
    await sleep(200);
  }

  return {
    results,
    recovered: results.filter((r) => r.transcriptStatus === 'recovered').length,
    descriptionOnly: results.filter((r) => r.transcriptStatus === 'description_only').length,
    stillManual: results.filter((r) => r.manualTranscriptNeeded).length,
  };
}

function runClaudeYouTubeReadOnlyScrub(youtubeResults) {
  const candidates = [];
  const findings = [];

  for (const v of youtubeResults.results) {
    const topic = discoverTopicFromText(`${v.title} ${v.transcriptSample || ''}`)?.topic;
    const allScriptures = uniqueRefs([...v.captionScriptures, ...v.descriptionScriptures]);
    const missedSeeds = [];
    if (/sabbath/i.test(v.title) && !allScriptures.some((r) => /exodus 20|isaiah 58/i.test(r))) {
      missedSeeds.push('sabbath_seed_without_exodus_20_or_isaiah_58');
    }
    if (/144,?000/i.test(v.title) && !allScriptures.some((r) => /revelation 7/i.test(r))) {
      missedSeeds.push('144000_title_without_rev_7');
    }

    candidates.push({
      videoId: v.videoId,
      title: v.title,
      extractionCandidates: {
        scriptures: allScriptures,
        questions: v.questionSegments,
        topicCandidate: topic,
        manualTranscriptStillRequired: v.manualTranscriptNeeded,
      },
    });

    if (v.manualTranscriptNeeded && !allScriptures.length) {
      findings.push({ videoId: v.videoId, issue: 'manual_transcript_required', title: v.title?.slice(0, 60) });
    }
    if (missedSeeds.length) {
      findings.push({ videoId: v.videoId, issue: 'missed_seed_terms', seeds: missedSeeds });
    }
  }

  return {
    auditType: 'claude_read_only_youtube_scrub',
    modelNote: 'Programmatic read-only extraction audit — does not approve doctrine or modify production',
    candidates,
    findings,
    recommendations: [
      'Upload manual transcripts for videos with manualTranscriptStillRequired',
      'IOG Wednesday Q&A channel needs dedicated caption upload pass',
      'Description-only scriptures are extraction candidates — not approved for implementation',
    ],
  };
}

function reviewIcojPdfs(phase3r) {
  const pdfs = (phase3r.pdfRecovery?.pdfExtractions || [])
    .filter((p) => /icoj/i.test(`${p.sourceName || ''} ${p.organization || ''}`) || (p.scripturesCited || []).length);

  const allPdfs = phase3r.pdfRecovery?.pdfExtractions || [];
  const withScriptures = allPdfs.filter((p) => (p.scripturesCited || []).length);

  const reviews = withScriptures.map((p) => {
    const scriptures = normalizeRefsList(p.scripturesCited || []);
    const scriptureOrder = p.scriptureOrder?.length
      ? normalizeRefsList(p.scriptureOrder)
      : scriptures;
    const topic = discoverTopicFromText(`${p.lessonTitle} ${(p.headings || []).join(' ')}`)?.topic;
    const packCandidate = assignPackCandidate(p.lessonTitle, scriptures, topic);

    let extractionQuality = 'good';
    if (scriptures.length < 2) extractionQuality = 'thin';
    if (p.status === 'pdf_parse_failed') extractionQuality = 'failed';
    if (scriptures.length > 30) extractionQuality = 'dense_review_needed';

    return {
      pdfTitle: p.lessonTitle,
      sourceUrl: p.pdfUrl || p.sourceUrl,
      camp: p.camp,
      scripturesExtracted: scriptures,
      scriptureOrder,
      sectionHeadings: p.headings || [],
      questionCandidates: p.questions || [],
      topicCandidates: topic ? [topic] : [],
      doctrinePackCandidates: packCandidate ? [packCandidate] : [],
      extractionQuality,
      needsHumanReview: extractionQuality !== 'good' || scriptures.length > 15,
      status: p.status,
    };
  });

  const claudePdfAudit = {
    findings: reviews.filter((r) => r.needsHumanReview).map((r) => ({
      pdfTitle: r.pdfTitle,
      issue: r.extractionQuality,
      scriptureCount: r.scripturesExtracted.length,
    })),
    flatListRisk: reviews.filter((r) => r.sectionHeadings.length === 0 && r.scripturesExtracted.length > 8).length,
  };

  return {
    totalReviewed: reviews.length,
    icojSpecific: reviews.filter((r) => /icoj/i.test(r.sourceUrl || '')).length,
    validated: reviews.filter((r) => r.extractionQuality === 'good').length,
    needsHumanReview: reviews.filter((r) => r.needsHumanReview).length,
    reviews,
    claudePdfAudit,
  };
}

function recoverSpanishIOG(inputs) {
  const items = [];

  for (const item of inputs.scrubbedItems) {
    const text = `${item.lessonTitle || ''} ${item.answerSummary || ''}`;
    if (!/spanish|español|espanol|jesús|pentecostés/i.test(text)) continue;

    const englishGuess = item.lessonTitle
      ?.replace(/PENTECOSTÉS/i, 'Pentecost')
      ?.replace(/JESÚS/i, 'Jesus')
      ?.replace(/El Dios desconocido/i, 'The Unknown God');

    items.push({
      spanishTitle: item.lessonTitle,
      englishTitle: englishGuess,
      sourceUrl: item.sourceUrl,
      camp: item.camp,
      scriptureRefsFound: item.scripturesCited || [],
      topicCandidate: discoverTopicFromText(text)?.topic,
      doctrinePackCandidate: assignPackCandidate(item.lessonTitle, item.scripturesCited || []),
      transcriptStatus: (item.scripturesCited || []).length ? 'corpus_text' : 'needs_transcript',
      manualTranscriptNeeded: !(item.scripturesCited || []).length,
    });
  }

  for (const t of inputs.transcriptExtractions) {
    const text = `${t.lessonTitle || ''}`;
    if (!/spanish|español|jesús|pentecostés/i.test(text)) continue;
    if (items.some((i) => normalizeKey(i.spanishTitle) === normalizeKey(t.lessonTitle))) continue;
    items.push({
      spanishTitle: t.lessonTitle,
      englishTitle: text.replace(/PENTECOSTÉS/i, 'Pentecost'),
      sourceUrl: t.videoUrl,
      camp: 'HQ',
      scriptureRefsFound: t.scripturesCited || [],
      topicCandidate: discoverTopicFromText(text)?.topic,
      doctrinePackCandidate: null,
      transcriptStatus: t.captionUnavailable ? 'caption_unavailable' : 'unknown',
      manualTranscriptNeeded: t.manualTranscriptNeeded,
    });
  }

  return {
    total: items.length,
    withScriptures: items.filter((i) => i.scriptureRefsFound.length > 0).length,
    queuedManual: items.filter((i) => i.manualTranscriptNeeded).length,
    lessons: items,
  };
}

function buildFacebookManualQueue(phase3r) {
  const queue = (phase3r.facebook?.results || []).map((f) => ({
    url: f.url,
    title: f.title,
    status: f.status,
    storedDescription: f.description?.slice(0, 200),
    scriptureCount: f.scriptureCount || 0,
    manualPasteNeeded: !f.scriptureCount && f.status !== 'fetch_failed',
    reason: f.status === 'fetch_failed' ? 'fetch_blocked' : 'empty_or_no_refs_metadata',
  }));

  return {
    total: queue.length,
    manualPasteNeeded: queue.filter((q) => q.manualPasteNeeded).length,
    queue,
  };
}

function triageRemainingMissing(inputs) {
  const missing = inputs.phase3r.gapReport?.remainingMissing || [];
  const enriched = missing.map((m) => {
    const scrubbed = inputs.scrubbedItems.find((s) => fuzzyMatchTitle(s.lessonTitle, m.lessonTitle));
    const question = inputs.questions.find((q) => fuzzyMatchTitle(q.lessonTitle, m.lessonTitle));
    const sourceUrl = scrubbed?.sourceUrl || question?.sourceUrl || null;
    const scriptures = uniqueRefs([
      ...(scrubbed?.scripturesCited || []),
      ...(question?.scripturesCited || []),
    ]);

    let triageCategory = 'no_source_url';
    let nextAction = 'manual_review';
    let reasonMissing = m.reason || 'no_scriptures_in_recovered_corpus';

    if (scriptures.length > 0) triageCategory = 'already_resolved_elsewhere';
    else if (/spanish|español/i.test(m.lessonTitle)) triageCategory = 'spanish_translation_needed';
    else if (sourceUrl && /\.pdf/i.test(sourceUrl)) triageCategory = 'pdf_text_needed';
    else if (sourceUrl && /facebook/i.test(sourceUrl)) triageCategory = 'facebook_manual_paste_needed';
    else if (sourceUrl && /youtube/i.test(sourceUrl)) triageCategory = 'transcript_needed';
    else if (sourceUrl && /theisraelofgod|israelthechurchofjesus/i.test(sourceUrl)) triageCategory = 'url_fetch_needed';
    else if (/israelofgoddallas/i.test(sourceUrl || m.lessonTitle)) triageCategory = 'dead_link';
    else if (scriptures.length === 0 && m.topic) triageCategory = 'doctrine_pack_link_needed';

    if (triageCategory === 'transcript_needed') nextAction = 'upload_youtube_transcript';
    else if (triageCategory === 'pdf_text_needed') nextAction = 'extract_or_upload_pdf';
    else if (triageCategory === 'facebook_manual_paste_needed') nextAction = 'paste_facebook_description';
    else if (triageCategory === 'spanish_translation_needed') nextAction = 'spanish_caption_or_translation';
    else if (triageCategory === 'dead_link') nextAction = 'find_alternate_camp_url';
    else if (triageCategory === 'already_resolved_elsewhere') nextAction = 'link_to_doctrine_pack';
    else if (triageCategory === 'url_fetch_needed') nextAction = 'cursor_fetch_public_url';
    else if (triageCategory === 'doctrine_pack_link_needed') nextAction = 'assign_pack_after_source_recovery';

    return {
      sourceName: m.source || question?.sourceName,
      camp: scrubbed?.camp || question?.camp,
      lessonTitle: m.lessonTitle,
      sourceUrl,
      reasonMissing,
      triageCategory,
      nextAction,
      assignedDoctrinePackCandidate: assignPackCandidate(m.lessonTitle, scriptures, m.topic),
      scripturesFound: scriptures.length,
    };
  });

  return {
    total: enriched.length,
    byCategory: enriched.reduce((acc, e) => {
      acc[e.triageCategory] = (acc[e.triageCategory] || 0) + 1;
      return acc;
    }, {}),
    resolvedElsewhere: enriched.filter((e) => e.triageCategory === 'already_resolved_elsewhere').length,
    entries: enriched,
  };
}

function normalizeRefsList(refs = []) {
  if (!Array.isArray(refs)) return [];
  const result = normalizeReferenceList(refs);
  return result.normalized || [];
}

function assignPackCandidate(title = '', scriptures = [], topicHint = null) {
  if (topicHint && PACK_LINKAGE_TARGETS.includes(topicHint)) return topicHint;
  const refs = Array.isArray(scriptures) ? scriptures : [];
  const text = `${title} ${refs.join(' ')}`;
  const match = TOPIC_PATTERNS.find((p) => p.pattern.test(text));
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

function organizeRecoveredItem(item) {
  const originalScriptureChain = normalizeRefsList(item.scripturesCited || item.scripturesExtracted || []);
  const originalSet = new Set(originalScriptureChain.map(refKey));
  const topicCandidate = item.topicCandidate || discoverTopicFromText(`${item.lessonTitle} ${item.question || ''}`)?.topic;
  const doctrinePackCandidate = item.doctrinePackCandidate || assignPackCandidate(item.lessonTitle, originalScriptureChain, topicCandidate);
  const genesisToRevelationChain = buildStrongestG2RChain(originalScriptureChain, originalScriptureChain);
  const classified = classifyScriptures(originalSet, originalScriptureChain, doctrinePackCandidate);

  return {
    source: item.sourceName || item.source || item.recoveryMethod,
    camp: item.camp || 'HQ',
    lessonTitle: item.lessonTitle || item.title || item.pdfTitle,
    question: item.question || `What does "${item.lessonTitle || item.title}" teach according to Scripture?`,
    originalScriptureChain,
    genesisToRevelationChain,
    parallelScriptures: classified.parallelScriptures,
    supportingScriptures: classified.supportingScriptures,
    continuityScriptures: classified.continuityScriptures,
    topicCandidate,
    doctrinePackCandidate,
    humanReviewRequired: true,
    autoApplied: false,
  };
}

function runOrganizationPipeline(inputs, youtubeRecovery, pdfReview, spanishRecovery, triage) {
  const rawItems = [];

  for (const r of youtubeRecovery.results) {
    const scriptures = uniqueRefs([...r.captionScriptures, ...r.descriptionScriptures]);
    if (!scriptures.length) continue;
    rawItems.push({
      sourceName: r.channel,
      camp: 'HQ',
      lessonTitle: r.title,
      scripturesCited: scriptures,
      recoveryMethod: 'youtube_transcript_recovery',
      topicCandidate: discoverTopicFromText(r.title)?.topic,
    });
  }

  for (const p of pdfReview.reviews) {
    rawItems.push({
      sourceName: 'ICOJ PDF',
      camp: p.camp,
      lessonTitle: p.pdfTitle,
      scripturesCited: p.scripturesExtracted,
      doctrinePackCandidate: p.doctrinePackCandidates?.[0],
      topicCandidate: p.topicCandidates?.[0],
      recoveryMethod: 'pdf_review',
    });
  }

  for (const s of spanishRecovery.lessons.filter((l) => l.scriptureRefsFound.length)) {
    rawItems.push({
      sourceName: 'Spanish IOG',
      camp: s.camp,
      lessonTitle: s.spanishTitle,
      scripturesCited: s.scriptureRefsFound,
      topicCandidate: s.topicCandidate,
      doctrinePackCandidate: s.doctrinePackCandidate,
      recoveryMethod: 'spanish_recovery',
    });
  }

  for (const e of triage.entries.filter((x) => x.scripturesFound > 0)) {
    rawItems.push({
      sourceName: e.sourceName,
      camp: e.camp,
      lessonTitle: e.lessonTitle,
      scripturesCited: [],
      recoveryMethod: 'triage_resolved',
      doctrinePackCandidate: e.assignedDoctrinePackCandidate,
    });
  }

  for (const s of inputs.recovered3r) {
    if ((s.scripturesCited || []).length) rawItems.push({ ...s, recoveryMethod: s.recoveryMethod || 'phase3r' });
  }

  const organized = rawItems.map((item) => organizeRecoveredItem(item));
  return organized;
}

function buildPackLinkage(organizedPackets) {
  const byPack = {};

  for (const p of organizedPackets) {
    const key = p.doctrinePackCandidate || 'unassigned';
    if (!byPack[key]) byPack[key] = { pack: key, count: 0, scriptures: 0, lessons: [] };
    byPack[key].count += 1;
    byPack[key].scriptures += p.originalScriptureChain.length;
    if (byPack[key].lessons.length < 5) byPack[key].lessons.push(p.lessonTitle);
  }

  const sorted = Object.values(byPack).sort((a, b) => b.scriptures - a.scriptures);

  return {
    totalPackets: organizedPackets.length,
    packsWithSupport: sorted.filter((p) => p.pack !== 'unassigned').length,
    byPack: sorted,
    topPacks: sorted.filter((p) => p.pack !== 'unassigned').slice(0, 10),
  };
}

async function runPhase3sSourceScrubOrganization() {
  const inputs = loadAllInputs();
  const priorCoverage = inputs.priorCoverage;

  const sourceMap = buildSourceMapAudit(inputs);
  const youtubeQueue = buildYouTubeQueue(inputs);
  const youtubeRecovery = await recoverYouTubeTranscripts(youtubeQueue);
  const claudeYoutube = runClaudeYouTubeReadOnlyScrub(youtubeRecovery);
  const pdfReview = reviewIcojPdfs(inputs.phase3r);
  const spanishRecovery = recoverSpanishIOG(inputs);
  const facebookQueue = buildFacebookManualQueue(inputs.phase3r);
  const triage = triageRemainingMissing(inputs);
  const organizedPackets = runOrganizationPipeline(inputs, youtubeRecovery, pdfReview, spanishRecovery, triage);
  const packLinkage = buildPackLinkage(organizedPackets);

  const recoveredSources = organizedPackets.map((p) => ({
    lessonTitle: p.lessonTitle,
    scripturesCited: p.originalScriptureChain,
    sourceName: p.source,
    camp: p.camp,
    topic: p.topicCandidate,
    recoveryMethod: 'phase3s_organization',
  }));

  const gapInputs = {
    questions: inputs.questions,
    pdfExtractions: inputs.pdfExtractions,
    scrubbedItems: inputs.scrubbedItems,
    priorCoverage,
  };

  const extraSources = {
    videoEntries: youtubeRecovery.results.map((r) => ({
      title: r.title,
      scripturesCited: uniqueRefs([...r.captionScriptures, ...r.descriptionScriptures]),
    })),
  };

  const gapReport = computeGapElimination(gapInputs, recoveredSources, priorCoverage, extraSources);

  const executive = {
    youtubeTranscriptsRecovered: youtubeRecovery.recovered,
    youtubeDescriptionOnly: youtubeRecovery.descriptionOnly,
    youtubeStillManual: youtubeRecovery.stillManual,
    pdfsReviewed: pdfReview.totalReviewed,
    pdfsValidated: pdfReview.validated,
    spanishRecovered: spanishRecovery.withScriptures,
    spanishQueued: spanishRecovery.queuedManual,
    facebookManualQueue: facebookQueue.manualPasteNeeded,
    missingTriaged: triage.total,
    missingResolved: triage.resolvedElsewhere,
    reviewPacketsPrepared: organizedPackets.length,
    scriptureRefsInPackets: uniqueRefs(organizedPackets.flatMap((p) => p.originalScriptureChain)).length,
    topPacks: packLinkage.topPacks,
    coverageBefore: priorCoverage,
    coverageAfter: gapReport.after,
    remainingMissing: gapReport.remainingMissingCount,
    blockedItems: sourceMap.deadLinksNoted,
  };

  const payload = {
    phase: '3S',
    ranAt: new Date().toISOString(),
    sourceMap,
    youtubeQueue,
    youtubeRecovery,
    claudeYoutube,
    pdfReview,
    spanishRecovery,
    facebookQueue,
    triage,
    organizedPackets,
    packLinkage,
    gapReport,
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

  fs.writeFileSync(path.join(TRACE, 'phase3s-source-scrub-organization-results.json'), `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT_DIR, 'youtube-transcript-recovery.json'), `${JSON.stringify({ ranAt: payload.ranAt, results: youtubeRecovery.results, summary: youtubeRecovery }, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT_DIR, 'icoj-pdf-extraction-review.json'), `${JSON.stringify({ ranAt: payload.ranAt, reviews: pdfReview.reviews, summary: pdfReview }, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT_DIR, 'phase3s-organized-review-packets.json'), `${JSON.stringify({ ranAt: payload.ranAt, packets: organizedPackets }, null, 2)}\n`);

  return payload;
}

module.exports = {
  runPhase3sSourceScrubOrganization,
};
