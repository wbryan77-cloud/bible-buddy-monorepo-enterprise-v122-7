/**
 * Phase 3R — Full IOG / ICOJ source recovery and corpus completion.
 * Source recovery only — no production, doctrine, card, graph, or prompt mutations.
 */

const fs = require('fs');
const path = require('path');
const {
  fetchText,
  extractScripturesFromText,
  scrubYouTubeChannel,
  scrubYouTubeVideo,
  scrubWordPressPosts,
  scrubWordPressPagePdfs,
  decodeHtml,
} = require('./openSourceScrubber');
const {
  extractPdfHandouts,
  extractWebsiteLessons,
  extractVideoDescriptions,
  processTranscripts,
} = require('./phase3fContentExtraction');
const { extractScriptureReferencesFromText } = require('./phase3fScriptureNormalizer');
const { discoverTopicFromText, TOPIC_PATTERNS } = require('./bibleWideTopicDiscovery');
const { getAllApprovedCards } = require('./evidenceCards');
const { uniqueRefs, refKey } = require('./phase3iRecursiveExpansion');

const ROOT = path.join(__dirname, '..');
const TRACE = path.join(ROOT, 'docs', 'regression-trace');
const OUT_DIR = path.join(ROOT, 'docs', 'evidence-candidates');
const REGISTRY_PATH = path.join(ROOT, 'data', 'full-corpus-source-registry.json');
const SCRUBBED_CORPUS_PATH = path.join(ROOT, 'data', 'phase3e-scrubbed-corpus.json');

const OFFICIAL_IOG_ICOJ_SOURCES = {
  IOG: {
    headquarters: {
      website: 'https://theisraelofgod.com',
      locations: 'https://theisraelofgod.com/locations',
      live: 'https://theisraelofgod.com/live',
      lessons: 'https://theisraelofgod.com/lessons',
      shows: 'https://theisraelofgod.com/shows',
      publications: 'https://theisraelofgod.com/global-publication',
      research: 'https://www.theisraelofgodrc.com',
      youtubeMain: 'https://www.youtube.com/@theisraelofgod/videos',
      youtubeHandle: 'https://www.youtube.com/@theisraelofgod',
      youtubeLegacy: 'https://www.youtube.com/user/IOGNEWS9002',
      youtubeQa: 'https://www.youtube.com/user/IOGIsrael',
      facebook: 'https://www.facebook.com/theisraelofgodbiblestudyclass',
    },
    camps: [
      { name: 'Atlanta', facebook: 'https://www.facebook.com/iogatl', city: 'Stone Mountain, GA' },
      { name: 'Houston', facebook: 'https://www.facebook.com/ioghou', facebookVideos: 'https://www.facebook.com/ioghou/videos' },
      { name: 'Rialto / Los Angeles', facebook: 'https://www.facebook.com/The-Israel-Of-God-Rialto-Los-Angeles-100080309874391' },
      { name: 'Baltimore', website: 'https://www.theisraelofgodbmore.com', facebook: 'https://www.facebook.com/theisraelofgodbaltimore' },
      { name: 'Dallas', website: 'https://israelofgoddallas.com', facebook: 'https://www.facebook.com/IOGDallas1' },
      { name: 'Detroit', facebook: 'https://www.facebook.com/IOGDetroit' },
      { name: 'St. Louis', facebook: 'https://www.facebook.com/theiogstl' },
      { name: 'Bay Area', facebook: 'https://www.facebook.com/IOGBayArea' },
      { name: 'Raleigh', facebook: 'https://www.facebook.com/IOGRALNC' },
      { name: 'Phoenix', directory: 'https://theisraelofgod.com/locations' },
      { name: 'Toronto', directory: 'https://theisraelofgod.com/locations' },
      { name: 'Cleveland', directory: 'https://theisraelofgod.com/locations' },
      { name: 'Indianapolis', directory: 'https://theisraelofgod.com/locations' },
      { name: 'Jacksonville', directory: 'https://theisraelofgod.com/locations' },
    ],
  },
  ICOJ: {
    headquarters: {
      website: 'https://www.israelthechurchofjesus.net',
      locations: 'https://www.israelthechurchofjesus.net/locations',
      lessonHandouts: 'https://www.israelthechurchofjesus.net/lesson-handouts',
      lessons: 'https://www.israelthechurchofjesus.net/lessons',
      youtube: 'https://www.youtube.com/user/IsraelChurchofJesus7/videos',
      youtubeLive: 'https://www.youtube.com/user/IsraelChurchofJesus7/live',
      youtubePlaylists: 'https://www.youtube.com/user/IsraelChurchofJesus7/playlists',
      facebook: 'https://www.facebook.com/thykingdomcome7',
      facebookVideos: 'https://www.facebook.com/thykingdomcome7/videos',
      facebookQa: 'https://www.facebook.com/thykingdomcome7/videos/qa/1653238386010351',
    },
    camps: [
      { name: 'Atlanta', handouts: 'https://www.israelthechurchofjesus.net/atlanta-ga', facebook: 'https://www.facebook.com/100088125694701' },
      { name: 'Los Angeles', handouts: 'https://www.israelthechurchofjesus.net/lessons-los-angeles-ca', facebook: 'https://www.facebook.com/IsraelTheChurchOfJesus' },
      { name: 'Dallas', facebook: 'https://www.facebook.com/Israelthechurchofjesusdallas' },
      { name: 'Houston', directory: 'https://www.israelthechurchofjesus.net/locations' },
      { name: 'Indianapolis', directory: 'https://www.israelthechurchofjesus.net/locations' },
      { name: 'Jacksonville', facebook: 'https://www.facebook.com/israelthechurchofjesusjacksonville' },
      { name: 'Toronto', handouts: 'https://www.israelthechurchofjesus.net/toronto-ontario', facebook: 'https://www.facebook.com/israelthechurchofjesustoronto' },
    ],
  },
};

const CAMP_KEYWORDS = [
  'phoenix', 'dallas', 'atlanta', 'houston', 'detroit', 'baltimore', 'toronto',
  'los angeles', 'rialto', 'raleigh', 'st louis', 'bay area', 'jacksonville',
  'indianapolis', 'cleveland', 'cincinnati', 'charlotte', 'orlando', 'memphis',
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
  const overlap = wa.filter((w) => wb.includes(w)).length;
  return overlap >= Math.min(3, Math.min(wa.length, wb.length));
}

function isAllowedUrl(url = '') {
  return /theisraelofgod|israelthechurchofjesus|israelofgod|youtube\.com|youtu\.be|facebook\.com/i.test(url);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadAllInputs() {
  const phase3f = loadJson(path.join(TRACE, 'phase3f-content-extraction-results.json'), {});
  const phase3q = loadJson(path.join(TRACE, 'phase3q-weak-pack-deep-recovery-results.json'), {});
  const scrubbed = loadJson(SCRUBBED_CORPUS_PATH, { scrubbedItems: [] });
  const registry = loadJson(REGISTRY_PATH, { sources: [] });
  const deepPacks = loadJson(path.join(OUT_DIR, 'deep-recovered-packs.json'), { packs: [] });

  return {
    questions: phase3f.questions || [],
    pdfExtractions: phase3f.pdfExtractions || [],
    videoExtractions: phase3f.videoExtractions || [],
    transcriptExtractions: phase3f.transcriptExtractions || [],
    websiteExtractions: phase3f.websiteExtractions || [],
    scriptureChains: loadJson(path.join(OUT_DIR, 'expanded-scripture-chains.json'), { chains: [] }).chains || [],
    scrubbedItems: scrubbed.scrubbedItems || [],
    registrySources: registry.sources || [],
    evidenceCards: getAllApprovedCards(),
    deepPacks: deepPacks.packs || [],
    priorCoverage: phase3q.coverageUpdate?.after || { covered: 356, partial: 168, missing: 69 },
    campMappings: phase3q.campMappings || loadJson(path.join(TRACE, 'phase3o-source-gap-completion-results.json'), {}).campMappings || [],
  };
}

function buildMasterInventory(inputs) {
  const entries = [];

  const addEntry = (org, category, label, url, camp = 'HQ', meta = {}) => {
    if (!url) return;
    entries.push({
      organization: org,
      category,
      label,
      url,
      camp,
      ...meta,
    });
  };

  for (const [key, val] of Object.entries(OFFICIAL_IOG_ICOJ_SOURCES.IOG.headquarters)) {
    addEntry('IOG', 'headquarters', key, val);
  }
  for (const camp of OFFICIAL_IOG_ICOJ_SOURCES.IOG.camps) {
    for (const [k, url] of Object.entries(camp)) {
      if (k === 'name') continue;
      addEntry('IOG', 'camp', `${camp.name} — ${k}`, url, camp.name);
    }
  }

  for (const [key, val] of Object.entries(OFFICIAL_IOG_ICOJ_SOURCES.ICOJ.headquarters)) {
    addEntry('ICOJ', 'headquarters', key, val);
  }
  for (const camp of OFFICIAL_IOG_ICOJ_SOURCES.ICOJ.camps) {
    for (const [k, url] of Object.entries(camp)) {
      if (k === 'name') continue;
      addEntry('ICOJ', 'camp', `${camp.name} — ${k}`, url, camp.name);
    }
  }

  for (const src of inputs.registrySources) {
    const urls = [
      src.websiteUrl,
      src.youtubeChannelUrl,
      ...(src.playlistUrls || []),
      ...(src.lessonUrls || []),
      ...(src.qnaUrls || []),
      ...(src.publicationUrls || []),
      src.facebookUrl,
    ].filter(Boolean);
    for (const url of urls) {
      addEntry(src.organization, 'registry', src.sourceName, url, src.camp, { sourceId: src.sourceId });
    }
  }

  const urlSeen = new Set(entries.map((e) => e.url));
  for (const item of inputs.scrubbedItems) {
    if (!item.sourceUrl || urlSeen.has(item.sourceUrl)) continue;
    if (!isAllowedUrl(item.sourceUrl)) continue;
    urlSeen.add(item.sourceUrl);
    addEntry(item.organization || 'IOG', 'corpus_cataloged', item.lessonTitle || item.sourceName, item.sourceUrl, item.camp, {
      scripturesInCorpus: (item.scripturesCited || []).length,
    });
  }

  return {
    totalEntries: entries.length,
    byOrganization: {
      IOG: entries.filter((e) => e.organization === 'IOG').length,
      ICOJ: entries.filter((e) => e.organization === 'ICOJ').length,
    },
    byCategory: entries.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + 1;
      return acc;
    }, {}),
    entries,
  };
}

function collectAllKnownUrls(inputs, inventory) {
  const urls = new Map();

  const add = (url, meta) => {
    if (!url || !isAllowedUrl(url)) return;
    if (!urls.has(url)) urls.set(url, meta);
  };

  for (const e of inventory.entries) add(e.url, { source: e.label, camp: e.camp, org: e.organization });
  for (const item of inputs.scrubbedItems) {
    add(item.sourceUrl, { lessonTitle: item.lessonTitle, sourceName: item.sourceName, camp: item.camp });
  }
  for (const q of inputs.questions) add(q.sourceUrl, { lessonTitle: q.lessonTitle, type: 'question' });
  for (const p of inputs.pdfExtractions) add(p.pdfUrl || p.sourceUrl, { lessonTitle: p.lessonTitle, type: 'pdf' });
  for (const v of inputs.videoExtractions) add(v.videoUrl || v.sourceUrl, { lessonTitle: v.lessonTitle, type: 'video' });

  return [...urls.entries()].map(([url, meta]) => ({ url, ...meta }));
}

async function expandUrlFetches(urlCatalog, { maxFetches = 250 } = {}) {
  const results = [];
  let fetched = 0;
  let scripturesRecovered = 0;

  for (const entry of urlCatalog.slice(0, maxFetches)) {
    if (/facebook\.com/i.test(entry.url)) continue; // handled separately
    if (/youtube\.com|youtu\.be/i.test(entry.url)) continue; // handled in YouTube pass

    const res = await fetchText(entry.url);
    fetched += 1;
    if (!res.ok) {
      results.push({ url: entry.url, lessonTitle: entry.lessonTitle, status: 'fetch_failed', error: res.error });
      await sleep(120);
      continue;
    }

    const text = decodeHtml(res.text || '');
    const scriptures = extractScriptureReferencesFromText(text);
    const title = entry.lessonTitle
      || decodeHtml((text.match(/<title>([^<]+)<\/title>/i) || [])[1] || '')
      || entry.source;

    if (scriptures.length) scripturesRecovered += scriptures.length;

    results.push({
      url: entry.url,
      lessonTitle: title,
      camp: entry.camp,
      status: scriptures.length ? 'scriptures_found' : 'no_refs_in_text',
      scripturesCited: scriptures,
      scriptureCount: scriptures.length,
      textSample: text.slice(0, 300),
    });
    await sleep(150);
  }

  return { results, fetched, scripturesRecovered, withScriptures: results.filter((r) => r.scriptureCount > 0).length };
}

async function recoverYouTubeSources(inputs, inventory, { maxVideosPerChannel = 60, maxTranscripts = 100 } = {}) {
  const channels = [
    { url: 'https://www.youtube.com/@theisraelofgod/videos', org: 'IOG', sourceName: 'IOG YouTube Main', camp: 'HQ' },
    { url: 'https://www.youtube.com/user/IOGNEWS9002/videos', org: 'IOG', sourceName: 'IOG YouTube IOGNEWS9002', camp: 'HQ' },
    { url: 'https://www.youtube.com/user/IOGIsrael/videos', org: 'IOG', sourceName: 'IOG Wednesday Q&A', camp: 'HQ' },
    { url: 'https://www.youtube.com/user/IsraelChurchofJesus7/videos', org: 'ICOJ', sourceName: 'ICOJ YouTube', camp: 'HQ' },
  ];

  const channelResults = [];
  const videoEntries = [];

  for (const ch of channels) {
    const scrub = await scrubYouTubeChannel(ch.url, {
      camp: ch.camp,
      organization: ch.org,
      sourceName: ch.sourceName,
      maxVideos: maxVideosPerChannel,
    });
    channelResults.push({
      channelUrl: ch.url,
      sourceName: ch.sourceName,
      videosFound: scrub.stats?.videosFound || 0,
      scripturesExtracted: scrub.stats?.scripturesExtracted || 0,
      transcriptsFound: scrub.stats?.transcriptsFound || 0,
      error: scrub.error,
    });
    for (const item of scrub.items || []) {
      videoEntries.push({
        title: item.lessonTitle,
        description: item.answerSummary,
        videoUrl: item.sourceUrl,
        scripturesCited: item.scripturesCited || [],
        sourceName: item.sourceName,
        camp: item.camp,
        organization: item.organization,
        sourceType: item.sourceType,
        playlistAssociation: null,
        topicAssociation: discoverTopicFromText(`${item.lessonTitle} ${item.answerSummary || ''}`)?.topic,
        transcript_available: false,
        transcript_unavailable: true,
        manual_transcript_needed: true,
      });
    }
    await sleep(500);
  }

  const fromCorpus = extractVideoDescriptions(inputs.scrubbedItems);
  for (const v of fromCorpus) {
    videoEntries.push({
      title: v.lessonTitle,
      description: v.descriptionText,
      videoUrl: v.videoUrl,
      scripturesCited: v.scripturesCited || [],
      sourceName: v.sourceName,
      camp: v.camp,
      organization: v.organization,
      chapterMarkers: v.timestamps || [],
      topicAssociation: v.topicCandidate,
      transcript_available: false,
      transcript_unavailable: true,
      manual_transcript_needed: true,
      fromCorpus: true,
    });
  }

  const transcriptInputs = videoEntries
    .filter((v) => v.videoUrl)
    .slice(0, maxTranscripts)
    .map((v) => ({
      videoUrl: v.videoUrl,
      lessonTitle: v.title,
      sourceName: v.sourceName,
    }));

  const transcriptResults = await processTranscripts(transcriptInputs);

  for (const tr of transcriptResults) {
    const match = videoEntries.find((v) => v.videoUrl === tr.videoUrl);
    if (!match) continue;
    if (tr.captionUnavailable) {
      match.transcript_unavailable = true;
      match.manual_transcript_needed = tr.manualTranscriptNeeded || true;
    } else {
      match.transcript_available = true;
      match.transcript_unavailable = false;
      match.manual_transcript_needed = false;
      match.transcriptScriptures = tr.scripturesCited || [];
      match.transcriptSample = tr.answerSummary;
      if ((tr.scripturesCited || []).length) {
        match.scripturesCited = uniqueRefs([...(match.scripturesCited || []), ...(tr.scripturesCited || [])]);
      }
    }
  }

  return {
    channelResults,
    videoEntries,
    transcriptRecovered: transcriptResults.filter((t) => !t.captionUnavailable && (t.scripturesCited || []).length).length,
    transcriptUnavailable: transcriptResults.filter((t) => t.captionUnavailable).length,
    manualTranscriptNeeded: transcriptResults.filter((t) => t.manualTranscriptNeeded).length,
    totalVideos: videoEntries.length,
    videosWithScriptures: videoEntries.filter((v) => (v.scripturesCited || []).length > 0).length,
  };
}

async function recoverFacebookSources(inventory, { maxFetches = 40 } = {}) {
  const fbUrls = inventory.entries
    .filter((e) => /facebook\.com/i.test(e.url))
    .map((e) => e.url);

  const unique = [...new Set(fbUrls)].slice(0, maxFetches);
  const results = [];

  for (const url of unique) {
    const res = await fetchText(url);
    if (!res.ok) {
      results.push({ url, status: 'fetch_failed', error: res.error });
      await sleep(200);
      continue;
    }

    const html = res.text || '';
    const title = decodeHtml((html.match(/<meta property="og:title" content="([^"]+)"/i) || [])[1] || '');
    const description = decodeHtml((html.match(/<meta property="og:description" content="([^"]+)"/i) || [])[1] || '');
    const combined = `${title} ${description}`;
    const scriptures = extractScriptureReferencesFromText(combined);

    results.push({
      url,
      title,
      description: description.slice(0, 500),
      scripturesCited: scriptures,
      scriptureCount: scriptures.length,
      status: scriptures.length ? 'scriptures_found' : res.text?.length > 500 ? 'no_refs_in_metadata' : 'blocked_or_empty',
      lessonReference: title,
      qaReference: /\b(q\s*&\s*a|question)/i.test(combined),
    });
    await sleep(250);
  }

  return {
    results,
    totalAttempted: unique.length,
    withScriptures: results.filter((r) => r.scriptureCount > 0).length,
    fetchFailed: results.filter((r) => r.status === 'fetch_failed').length,
  };
}

async function recoverPdfSources(inputs, { maxPdfs = 150 } = {}) {
  const extractions = await extractPdfHandouts(inputs.scrubbedItems, { maxPdfs });

  const wpIog = await scrubWordPressPagePdfs('https://theisraelofgod.com', 'lesson-handouts', {
    camp: 'HQ', organization: 'IOG', sourceName: 'IOG Lesson Handouts WP',
  });
  const wpIcoj = await scrubWordPressPagePdfs('https://www.israelthechurchofjesus.net', 'lesson-handouts', {
    camp: 'HQ', organization: 'ICOJ', sourceName: 'ICOJ Lesson Handouts WP',
  });

  const wpItems = [...(wpIog.items || []), ...(wpIcoj.items || [])];

  return {
    pdfExtractions: extractions,
    wordpressHandoutItems: wpItems.length,
    totalProcessed: extractions.length + wpItems.length,
    withScriptures: extractions.filter((p) => (p.scripturesCited || []).length > 0).length
      + wpItems.filter((i) => (i.scripturesCited || []).length > 0).length,
    failed: extractions.filter((p) => p.status === 'pdf_parse_failed').length,
    wpHandoutScriptures: wpIog.stats?.scripturesExtracted + wpIcoj.stats?.scripturesExtracted || 0,
    wpItems,
  };
}

function recoverCampChurches(inputs, inventory) {
  const camps = {};

  for (const keyword of CAMP_KEYWORDS) {
    camps[keyword] = {
      camp: keyword,
      lessons: [],
      sources: [],
      scriptureCount: 0,
    };
  }

  const allItems = [
    ...inputs.scrubbedItems,
    ...inputs.questions.map((q) => ({ ...q, type: 'question' })),
    ...inventory.entries.map((e) => ({ lessonTitle: e.label, sourceUrl: e.url, camp: e.camp, organization: e.organization })),
  ];

  for (const item of allItems) {
    const text = `${item.lessonTitle || ''} ${item.sourceName || ''} ${item.camp || ''}`.toLowerCase();
    const campKey = CAMP_KEYWORDS.find((k) => text.includes(k));
    if (!campKey) continue;

    const bucket = camps[campKey];
    if (item.lessonTitle && !bucket.lessons.includes(item.lessonTitle)) {
      bucket.lessons.push(item.lessonTitle);
    }
    if (item.sourceUrl && !bucket.sources.includes(item.sourceUrl)) {
      bucket.sources.push(item.sourceUrl);
    }
    bucket.scriptureCount += (item.scripturesCited || []).length;
  }

  for (const m of inputs.campMappings || []) {
    const text = `${m.rawTitle || ''} ${m.canonicalTitle || ''} ${m.camp || ''}`.toLowerCase();
    const campKey = CAMP_KEYWORDS.find((k) => text.includes(k)) || normalizeKey(m.camp);
    if (!camps[campKey]) camps[campKey] = { camp: campKey, lessons: [], sources: [], scriptureCount: 0 };
    if (m.rawTitle) camps[campKey].lessons.push(m.rawTitle);
    if (m.chainCount) camps[campKey].chainLinked = (camps[campKey].chainLinked || 0) + 1;
  }

  return {
    camps: Object.values(camps).filter((c) => c.lessons.length > 0 || c.sources.length > 0),
    totalCampsWithData: Object.values(camps).filter((c) => c.lessons.length > 0).length,
  };
}

function recoverSpanishLessons(inputs) {
  const spanish = [];

  for (const item of inputs.scrubbedItems) {
    const text = `${item.lessonTitle || ''} ${item.answerSummary || ''} ${item.sourceName || ''}`;
    if (!/spanish|español|espanol/i.test(text)) continue;

    spanish.push({
      title: item.lessonTitle,
      translatedTitle: null,
      doctrineTopic: item.topic || item.topicCandidate || discoverTopicFromText(text)?.topic,
      scriptureReferences: item.scripturesCited || [],
      scriptureCount: (item.scripturesCited || []).length,
      transcriptStatus: item.scripturesCited?.length ? 'corpus_text_available' : 'needs_transcript',
      manualWorkRequired: !(item.scripturesCited || []).length,
      sourceUrl: item.sourceUrl,
      camp: item.camp,
    });
  }

  for (const q of inputs.questions) {
    const text = `${q.lessonTitle || ''} ${q.question || ''}`;
    if (!/spanish|español|espanol/i.test(text)) continue;
    if (spanish.some((s) => normalizeKey(s.title) === normalizeKey(q.lessonTitle))) continue;
    spanish.push({
      title: q.lessonTitle,
      translatedTitle: null,
      doctrineTopic: q.topic || discoverTopicFromText(text)?.topic,
      scriptureReferences: q.scripturesCited || [],
      scriptureCount: (q.scripturesCited || []).length,
      transcriptStatus: (q.scripturesCited || []).length ? 'qa_text_available' : 'needs_transcript',
      manualWorkRequired: !(q.scripturesCited || []).length,
      sourceUrl: q.sourceUrl,
      camp: q.camp,
    });
  }

  return {
    totalSpanishLessons: spanish.length,
    withScriptures: spanish.filter((s) => s.scriptureCount > 0).length,
    needsManual: spanish.filter((s) => s.manualWorkRequired).length,
    lessons: spanish,
  };
}

function mergeRecoveredSources(inputs, urlFetch, youtube, facebook, pdfRecovery, wpPosts) {
  const recovered = [];
  const seen = new Set();

  const push = (item) => {
    const key = `${item.sourceUrl || ''}|${normalizeKey(item.lessonTitle || '')}`;
    if (seen.has(key)) return;
    seen.add(key);
    recovered.push(item);
  };

  for (const r of urlFetch.results) {
    if (!r.scriptureCount) continue;
    push({
      sourceName: 'Phase3R URL Fetch',
      camp: r.camp || 'HQ',
      organization: /icoj/i.test(r.url) ? 'ICOJ' : 'IOG',
      lessonTitle: r.lessonTitle,
      scripturesCited: r.scripturesCited,
      sourceUrl: r.url,
      sourceType: 'url_recovery',
      recoveryMethod: 'expanded_url_fetch',
    });
  }

  for (const v of youtube.videoEntries) {
    if (!(v.scripturesCited || []).length) continue;
    push({
      sourceName: v.sourceName,
      camp: v.camp,
      organization: v.organization,
      lessonTitle: v.title,
      scripturesCited: v.scripturesCited,
      sourceUrl: v.videoUrl,
      sourceType: v.sourceType || 'youtube_video',
      recoveryMethod: 'youtube_recovery',
      topic: v.topicAssociation,
    });
  }

  for (const f of facebook.results) {
    if (!f.scriptureCount) continue;
    push({
      sourceName: 'Facebook Recovery',
      camp: 'HQ',
      organization: /icoj|thykingdomcome/i.test(f.url) ? 'ICOJ' : 'IOG',
      lessonTitle: f.title || f.url,
      scripturesCited: f.scripturesCited,
      sourceUrl: f.url,
      sourceType: 'facebook_video',
      recoveryMethod: 'facebook_metadata',
    });
  }

  for (const p of pdfRecovery.pdfExtractions) {
    if (!(p.scripturesCited || []).length) continue;
    push({
      sourceName: p.sourceName,
      camp: p.camp,
      organization: p.organization,
      lessonTitle: p.lessonTitle,
      scripturesCited: p.scripturesCited,
      sourceUrl: p.pdfUrl || p.sourceUrl,
      sourceType: 'lesson_handout_pdf',
      recoveryMethod: 'pdf_extraction',
    });
  }

  for (const item of pdfRecovery.wpItems || []) {
    if (!(item.scripturesCited || []).length) continue;
    push({
      sourceName: item.sourceName,
      camp: item.camp,
      organization: item.organization,
      lessonTitle: item.lessonTitle,
      scripturesCited: item.scripturesCited,
      sourceUrl: item.sourceUrl,
      sourceType: item.sourceType,
      recoveryMethod: 'wordpress_handout_pdf',
    });
  }

  for (const item of wpPosts || []) {
    if (!(item.scripturesCited || []).length) continue;
    push(item);
  }

  return recovered;
}

function linkSourcesToPacks(recoveredSources, inputs) {
  const packIndex = new Map();
  for (const p of inputs.deepPacks) packIndex.set(p.topic, p);
  for (const p of inputs.deepPacks) if (p.topicKey) packIndex.set(p.topicKey, p);

  const linkages = [];

  for (const src of recoveredSources) {
    const text = `${src.lessonTitle || ''} ${src.topic || ''}`;
    const topic = src.topic || discoverTopicFromText(text)?.topic;
    const patternMatch = TOPIC_PATTERNS.find((p) => p.pattern.test(text));
    const pack = packIndex.get(topic) || packIndex.get(patternMatch?.topic);

    const chainMatch = inputs.scriptureChains.find((c) => fuzzyMatchTitle(c.lessonTitle, src.lessonTitle));
    const cardMatch = inputs.evidenceCards.find((c) => c.topic === topic || c.topic === patternMatch?.topic);

    linkages.push({
      lessonTitle: src.lessonTitle,
      sourceUrl: src.sourceUrl,
      recoveryMethod: src.recoveryMethod,
      scriptureCount: (src.scripturesCited || []).length,
      topicCandidate: topic || patternMatch?.topic,
      doctrinePack: pack?.topic || null,
      doctrinePackReadiness: pack?.reviewReadiness || null,
      chainMatch: chainMatch?.lessonTitle || null,
      evidenceCardMatch: cardMatch?.topic || null,
      questionBankMatch: inputs.questions.some((q) => fuzzyMatchTitle(q.lessonTitle, src.lessonTitle)),
    });
  }

  return {
    totalLinkages: linkages.length,
    withPackAssignment: linkages.filter((l) => l.doctrinePack).length,
    withChainMatch: linkages.filter((l) => l.chainMatch).length,
    withCardMatch: linkages.filter((l) => l.evidenceCardMatch).length,
    linkages,
  };
}

function addToLessonMap(map, lessonTitle, scriptures = []) {
  const key = normalizeKey(lessonTitle);
  if (!key || !scriptures.length) return;
  const existing = map.get(key) || [];
  map.set(key, uniqueRefs([...existing, ...scriptures]));
}

function computeGapElimination(inputs, recoveredSources, priorCoverage, extraSources = {}) {
  const reassessed3O = loadJson(path.join(TRACE, 'phase3o-source-gap-completion-results.json'), {})
    .coverageRecalculation?.reassessed || [];
  const sourceAudit = loadJson(path.join(TRACE, 'phase3m-source-doctrine-verification-results.json'), {})
    .sourceCoverageAudit || [];

  const recoveredByLesson = new Map();

  for (const src of [...inputs.scrubbedItems, ...recoveredSources]) {
    addToLessonMap(recoveredByLesson, src.lessonTitle, src.scripturesCited || []);
  }
  for (const q of inputs.questions) {
    addToLessonMap(recoveredByLesson, q.lessonTitle, q.scripturesCited || []);
  }
  for (const p of inputs.pdfExtractions) {
    addToLessonMap(recoveredByLesson, p.lessonTitle, p.scripturesCited || []);
  }
  for (const r of extraSources.urlFetchResults || []) {
    addToLessonMap(recoveredByLesson, r.lessonTitle, r.scripturesCited || []);
  }
  for (const v of extraSources.videoEntries || []) {
    addToLessonMap(recoveredByLesson, v.title, v.scripturesCited || []);
  }
  for (const f of extraSources.facebookResults || []) {
    addToLessonMap(recoveredByLesson, f.title, f.scripturesCited || []);
  }
  for (const w of extraSources.websiteLessons || []) {
    addToLessonMap(recoveredByLesson, w.title || w.lessonTitle, w.scripturesCited || []);
  }
  for (const item of extraSources.wpPostItems || []) {
    addToLessonMap(recoveredByLesson, item.lessonTitle, item.scripturesCited || []);
  }

  let covered = 0;
  let partial = 0;
  let missing = 0;
  const remainingMissing = [];

  function scripturesForLesson(lessonTitle) {
    const key = normalizeKey(lessonTitle);
    if (recoveredByLesson.has(key)) return recoveredByLesson.get(key);
    for (const [k, refs] of recoveredByLesson) {
      if (fuzzyMatchTitle(lessonTitle, k)) return refs;
    }
    return [];
  }

  let newlyRecoveredFromMissing = 0;

  for (const entry of sourceAudit) {
    const status3O = reassessed3O.find((r) => normalizeKey(r.lessonTitle) === normalizeKey(entry.lessonTitle));
    const priorStatus = status3O?.postRecoveryStatus3O || entry.status;
    let status = priorStatus;

    const scriptures = scripturesForLesson(entry.lessonTitle);
    if (scriptures.length >= 3) status = 'covered';
    else if (scriptures.length >= 1) status = 'partial';

    if (priorStatus === 'missing' && scriptures.length > 0) newlyRecoveredFromMissing += 1;

    if (status === 'covered') covered += 1;
    else if (status === 'partial') partial += 1;
    else {
      missing += 1;
      remainingMissing.push({
        lessonTitle: entry.lessonTitle,
        topic: entry.topic,
        reason: 'no_scriptures_in_recovered_corpus',
        source: entry.source,
      });
    }
  }

  return {
    before: priorCoverage,
    after: { covered, partial, missing },
    delta: {
      covered: covered - priorCoverage.covered,
      partial: partial - priorCoverage.partial,
      missing: missing - priorCoverage.missing,
    },
    remainingMissing: remainingMissing.slice(0, 150),
    remainingMissingCount: remainingMissing.length,
    newlyRecoveredFromMissing,
    scriptureBasedNote: 'Counts based on scripture refs in corpus + 3R recovery; prior 3Q used pack-readiness promotion',
  };
}

function runClaudeSourceAudit(recoveredSources, packLinkages, gapReport) {
  const findings = [];

  const noScriptureRecovered = recoveredSources.filter((s) => !(s.scripturesCited || []).length);
  if (noScriptureRecovered.length > recoveredSources.length * 0.5) {
    findings.push({ severity: 'medium', issue: 'low_scripture_yield', detail: `${noScriptureRecovered.length} recovered entries lack scriptures` });
  }

  const unlinked = packLinkages.linkages.filter((l) => !l.doctrinePack && l.scriptureCount > 0);
  if (unlinked.length > 10) {
    findings.push({ severity: 'medium', issue: 'unlinked_sources', detail: `${unlinked.length} scripture-bearing sources lack doctrine pack assignment` });
  }

  if (gapReport.after.missing > 50) {
    findings.push({ severity: 'high', issue: 'missing_remains_high', detail: `${gapReport.after.missing} entries still missing — manual transcripts likely required` });
  }

  return {
    auditType: 'claude_read_only_source_recovery',
    modelNote: 'Programmatic read-only source audit — does not approve doctrine or modify production',
    findings,
    recommendations: [
      'Batch manual transcript upload for YouTube Q&A with caption_unavailable',
      'ICOJ PDF handouts on lesson-handouts page need full pdf-parse pass',
      'Spanish lessons require translated transcript or caption upload',
      'Facebook video pages often return metadata only — manual description paste may be needed',
      'Link recovered sources to doctrine packs after human review — do not auto-implement',
    ],
    missedRelationships: unlinked.slice(0, 20).map((l) => l.lessonTitle),
  };
}

async function runPhase3rSourceRecovery({
  maxUrlFetches = 250,
  maxVideosPerChannel = 60,
  maxTranscripts = 100,
  maxPdfs = 150,
  maxFacebookFetches = 40,
  scrubWordPressLessons = true,
} = {}) {
  const inputs = loadAllInputs();
  const priorCoverage = inputs.priorCoverage;

  const masterInventory = buildMasterInventory(inputs);
  const urlCatalog = collectAllKnownUrls(inputs, masterInventory);

  console.log(`Phase 3R — ${masterInventory.totalEntries} inventory entries, ${urlCatalog.length} known URLs`);

  const urlFetch = await expandUrlFetches(urlCatalog, { maxFetches: maxUrlFetches });

  let wpPostItems = [];
  if (scrubWordPressLessons) {
    const iogPosts = await scrubWordPressPosts('https://theisraelofgod.com', {
      camp: 'HQ', organization: 'IOG', sourceName: 'IOG WordPress Lessons', maxPages: 8,
    });
    const icojPosts = await scrubWordPressPosts('https://www.israelthechurchofjesus.net', {
      camp: 'HQ', organization: 'ICOJ', sourceName: 'ICOJ WordPress Lessons', maxPages: 5,
    });
    wpPostItems = [...(iogPosts.items || []), ...(icojPosts.items || [])];
  }

  const websiteLessons = await extractWebsiteLessons(inputs.scrubbedItems, { maxPages: 80 });

  const youtube = await recoverYouTubeSources(inputs, masterInventory, { maxVideosPerChannel, maxTranscripts });
  const facebook = await recoverFacebookSources(masterInventory, { maxFetches: maxFacebookFetches });
  const pdfRecovery = await recoverPdfSources(inputs, { maxPdfs });
  const campRecovery = recoverCampChurches(inputs, masterInventory);
  const spanishRecovery = recoverSpanishLessons(inputs);

  const recoveredSources = mergeRecoveredSources(
    inputs, urlFetch, youtube, facebook, pdfRecovery, wpPostItems,
  );

  const packLinkages = linkSourcesToPacks(recoveredSources, inputs);
  const gapReport = computeGapElimination(inputs, recoveredSources, priorCoverage, {
    urlFetchResults: urlFetch.results,
    videoEntries: youtube.videoEntries,
    facebookResults: facebook.results,
    websiteLessons,
    wpPostItems,
  });
  const claudeAudit = runClaudeSourceAudit(recoveredSources, packLinkages, gapReport);

  const newScriptureRefs = uniqueRefs(recoveredSources.flatMap((s) => s.scripturesCited || [])).length;
  const newLessonTitles = new Set(recoveredSources.map((s) => s.lessonTitle).filter(Boolean)).size;
  const newQaItems = recoveredSources.filter((s) => /q\s*&\s*a|question/i.test(s.lessonTitle || '')).length;

  const executive = {
    newSourceEntriesRecovered: recoveredSources.length,
    newScriptureReferencesRecovered: newScriptureRefs,
    newLessonTitlesRecovered: newLessonTitles,
    newQaItemsRecovered: newQaItems,
    pdfsRecovered: pdfRecovery.withScriptures,
    youtubeTranscriptsRecovered: youtube.transcriptRecovered,
    youtubeVideosProcessed: youtube.totalVideos,
    facebookSourcesRecovered: facebook.withScriptures,
    spanishLessonsRecovered: spanishRecovery.withScriptures,
    spanishLessonsTotal: spanishRecovery.totalSpanishLessons,
    manualTranscriptNeeded: youtube.manualTranscriptNeeded,
    coverageBefore: gapReport.before,
    coverageAfter: gapReport.after,
    remainingMissing: gapReport.remainingMissingCount,
    claudeFindingCount: claudeAudit.findings.length,
  };

  const payload = {
    phase: '3R',
    ranAt: new Date().toISOString(),
    masterInventory,
    urlCatalogCount: urlCatalog.length,
    urlFetch,
    websiteLessonsCount: websiteLessons.length,
    wordpressPostItems: wpPostItems.length,
    youtube,
    facebook,
    pdfRecovery: {
      totalProcessed: pdfRecovery.totalProcessed,
      withScriptures: pdfRecovery.withScriptures,
      failed: pdfRecovery.failed,
      pdfExtractions: pdfRecovery.pdfExtractions,
      wpHandoutScriptures: pdfRecovery.wpHandoutScriptures,
    },
    campRecovery,
    spanishRecovery,
    recoveredSources,
    packLinkages,
    gapReport,
    claudeAudit,
    executive,
    safety: {
      productionChanges: false,
      implementation: false,
      approvals: false,
      doctrineChanges: false,
      graphUpdates: false,
      cardUpdates: false,
      promptChanges: false,
      passed: true,
    },
  };

  fs.mkdirSync(TRACE, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  fs.writeFileSync(
    path.join(TRACE, 'phase3r-source-recovery-results.json'),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(OUT_DIR, 'phase3r-recovered-sources.json'),
    `${JSON.stringify({ ranAt: payload.ranAt, sources: recoveredSources, executive }, null, 2)}\n`,
  );

  return payload;
}

module.exports = {
  runPhase3rSourceRecovery,
  computeGapElimination,
  OFFICIAL_IOG_ICOJ_SOURCES,
};
