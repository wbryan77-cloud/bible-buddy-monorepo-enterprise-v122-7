/**
 * Phase 3F — Scripture content extraction and chain building.
 * Extraction and preparation only — no production, doctrine, or approval mutations.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const pdfParse = require('pdf-parse');
const { fetchText, decodeHtml } = require('./openSourceScrubber');
const {
  extractScriptureReferencesFromText,
  normalizeReferenceList,
} = require('./phase3fScriptureNormalizer');
const { mergeExtractions } = require('./phase3eOpenSourceScrub');
const { extractAllCorpusRecords } = require('./phase3dCorpusExpansion');
const { assignRecordTopic, buildTopicMap } = require('./bibleWideTopicDiscovery');
const { extractScriptureChains } = require('./bulkScriptureDiscovery');
const { expandFullScriptureWitnesses } = require('./corpusExpansionDiscovery');
const { buildUnifiedReviewObject } = require('./scriptureResearchReviewConsole');
const { discoverGenesisToRevelation } = require('./scriptureDiscoveryGenesisRevelation');
const { correctedClassifyScriptureBuckets } = require('./phase3bDiscoveryAudit');
const { strengthTierForScore } = require('./scriptureStrengthReview');

const ROOT = path.join(__dirname, '..');
const TRACE = path.join(ROOT, 'docs', 'regression-trace');
const OUT_DIR = path.join(ROOT, 'docs', 'evidence-candidates');
const CORPUS_PATH = path.join(ROOT, 'data', 'phase3e-scrubbed-corpus.json');
const REGISTRY_PATH = path.join(ROOT, 'data', 'full-corpus-source-registry.json');
const USER_AGENT = 'Mozilla/5.0 (compatible; BibleBuddyDiscovery/3F)';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadJson(p, fb = null) {
  if (!fs.existsSync(p)) return fb;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fb;
  }
}

function uniqueRefs(refs = []) {
  const seen = new Set();
  const out = [];
  for (const r of refs) {
    const k = String(r || '').toLowerCase().trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

function normalizeExactKey(q = '') {
  return String(q).toLowerCase().replace(/\s+/g, ' ').trim();
}

function isPdfUrl(url = '') {
  return /\.pdf(\?|$)/i.test(url);
}

function isYouTubeUrl(url = '') {
  return /youtube\.com|youtu\.be/i.test(url);
}

function extractHeadings(text = '') {
  return [...text.matchAll(/^(?:[A-Z][A-Z\s]{4,}|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)$/gm)]
    .map((m) => m[0].trim())
    .filter((h) => h.length > 4 && h.length < 80)
    .slice(0, 20);
}

function extractQuestionsFromText(text = '') {
  return [...text.matchAll(/[^.!?\n]{8,200}\?/g)]
    .map((m) => m[0].trim())
    .filter((q) => q.length > 12)
    .slice(0, 15);
}

async function fetchPdfText(url) {
  try {
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 25000,
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/pdf,*/*' },
      maxRedirects: 5,
      validateStatus: (s) => s < 500,
    });
    if (res.status >= 400) {
      return { ok: false, text: '', error: `HTTP ${res.status}` };
    }
    const parsed = await pdfParse(Buffer.from(res.data));
    return { ok: true, text: parsed.text || '', pages: parsed.numpages || 0 };
  } catch (err) {
    return { ok: false, text: '', error: err.message || 'pdf_parse_failed' };
  }
}

async function resolvePdfUrl(url) {
  if (isPdfUrl(url)) return url;
  const page = await fetchText(url);
  if (!page.ok) return { url: null, error: page.error };
  const pdfMatch = page.text.match(/href=["']([^"']+\.pdf[^"']*)["']/i);
  if (pdfMatch) return { url: pdfMatch[1], resolvedFrom: url };
  return { url: null, error: 'no_pdf_link_on_page' };
}

function buildExtractionTargets(scrubbedItems, registry) {
  const weakBySource = {};
  const weakItems = scrubbedItems.filter((i) => !(i.scripturesCited || []).length);

  for (const item of weakItems) {
    const key = item.sourceName || 'unknown';
    if (!weakBySource[key]) {
      weakBySource[key] = {
        sourceName: key,
        camp: item.camp,
        organization: item.organization,
        sourceType: item.sourceType,
        weakQuestionCount: 0,
        sampleUrls: [],
        priority: 'medium',
      };
    }
    weakBySource[key].weakQuestionCount += 1;
    if (weakBySource[key].sampleUrls.length < 3 && item.sourceUrl) {
      weakBySource[key].sampleUrls.push(item.sourceUrl);
    }
  }

  const priorityTypes = {
    lesson_handout_pdf: 1,
    wordpress_lesson: 2,
    rss_item: 3,
    youtube_video: 4,
    youtube_qna: 4,
    website_page: 5,
  };

  const targets = Object.values(weakBySource).map((t) => {
    let priority = 'medium';
    const p = priorityTypes[t.sourceType] || 6;
    if (p <= 2) priority = 'critical';
    else if (p <= 4) priority = 'high';
    return { ...t, priorityScore: p, priority };
  }).sort((a, b) => a.priorityScore - b.priorityScore);

  return {
    targets,
    totalWeakQuestions: weakItems.length,
    totalQuestions: scrubbedItems.length,
    registrySourceCount: registry?.sources?.length || 0,
    prioritizedSources: targets.filter((t) => t.priority === 'critical' || t.priority === 'high'),
  };
}

async function extractPdfHandouts(scrubbedItems, { maxPdfs = 60 } = {}) {
  const urlMeta = new Map();
  for (const item of scrubbedItems) {
    const url = item.sourceUrl || '';
    if (!url) continue;
    if (!/pdf|handout/i.test(url) && item.sourceType !== 'lesson_handout_pdf') continue;
    if (!urlMeta.has(url)) {
      urlMeta.set(url, {
        sourceUrl: url,
        sourceName: item.sourceName,
        camp: item.camp,
        organization: item.organization,
        lessonTitle: item.lessonTitle,
      });
    }
  }

  const extractions = [];
  const urls = [...urlMeta.keys()].slice(0, maxPdfs);

  for (const originalUrl of urls) {
    const meta = urlMeta.get(originalUrl);
    let pdfUrl = originalUrl;
    let resolveNote = null;

    if (!isPdfUrl(originalUrl)) {
      const resolved = await resolvePdfUrl(originalUrl);
      if (resolved.url) {
        pdfUrl = resolved.url;
        resolveNote = resolved.resolvedFrom;
      } else {
        extractions.push({
          ...meta,
          pdfUrl: originalUrl,
          status: 'pdf_parse_failed',
          error: resolved.error || 'no_pdf_found',
          scripturesCited: [],
          scriptureOrder: [],
          headings: [],
          questions: [],
          answerSnippets: [],
        });
        await sleep(150);
        continue;
      }
    }

    const pdf = await fetchPdfText(pdfUrl);
    if (!pdf.ok || !pdf.text?.trim()) {
      extractions.push({
        ...meta,
        pdfUrl,
        resolvedFrom: resolveNote,
        status: 'pdf_parse_failed',
        error: pdf.error || 'empty_text',
        scripturesCited: [],
        scriptureOrder: [],
      });
      await sleep(150);
      continue;
    }

    const scriptures = extractScriptureReferencesFromText(pdf.text);
    const headings = extractHeadings(pdf.text);
    const questions = extractQuestionsFromText(pdf.text);
    const titleMatch = pdf.text.match(/BLESSED SABBATH[^\n]*\n+([A-Z][^\n]{4,60})/i)
      || pdf.text.match(/\n([A-Z][A-Z\s]{5,50})\s*\n+\s*1\./);

    extractions.push({
      ...meta,
      pdfUrl,
      resolvedFrom: resolveNote,
      status: scriptures.length ? 'extracted' : 'no_refs_in_text',
      pages: pdf.pages,
      lessonTitle: titleMatch?.[1]?.trim() || meta.lessonTitle,
      scripturesCited: scriptures,
      scriptureOrder: scriptures,
      headings,
      questions,
      answerSnippets: [],
      textSample: pdf.text.slice(0, 400),
    });
    await sleep(200);
  }

  return extractions;
}

async function extractWebsiteLessons(scrubbedItems, { maxPages = 40 } = {}) {
  const urlMeta = new Map();
  for (const item of scrubbedItems) {
    const url = item.sourceUrl || '';
    if (!url || isYouTubeUrl(url) || isPdfUrl(url)) continue;
    if (!/theisraelofgod|israelthechurchofjesus|israelofgod/i.test(url)) continue;
    if (item.sourceType !== 'wordpress_lesson' && item.sourceType !== 'website_page' && item.sourceType !== 'rss_item') continue;
    if (urlMeta.has(url)) continue;
    urlMeta.set(url, {
      sourceUrl: url,
      sourceName: item.sourceName,
      camp: item.camp,
      organization: item.organization,
      lessonTitle: item.lessonTitle,
      sourceType: item.sourceType,
    });
  }

  const extractions = [];
  for (const [url, meta] of [...urlMeta.entries()].slice(0, maxPages)) {
    let title = meta.lessonTitle;
    let body = '';
    let scriptures = [];

    const slug = url.replace(/\/$/, '').split('/').pop();
    const wpTry = await fetchText(`https://theisraelofgod.com/wp-json/wp/v2/posts?slug=${slug}`);
    if (wpTry.ok) {
      try {
        const posts = JSON.parse(wpTry.text);
        const post = posts[0];
        if (post) {
          title = decodeHtml(post.title?.rendered || title);
          body = decodeHtml(post.content?.rendered || '') + ' ' + decodeHtml(post.excerpt?.rendered || '');
        }
      } catch { /* fall through */ }
    }

    if (!body.trim()) {
      const page = await fetchText(url);
      if (page.ok) {
        body = decodeHtml(page.text);
        const titleMatch = page.text.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) title = decodeHtml(titleMatch[1]);
      } else {
        extractions.push({ ...meta, title, status: 'fetch_failed', error: page.error, scripturesCited: [], bodyText: '' });
        await sleep(150);
        continue;
      }
    }

    scriptures = extractScriptureReferencesFromText(body);
    extractions.push({
      ...meta,
      title,
      status: scriptures.length ? 'extracted' : 'no_refs_in_text',
      bodyText: body.slice(0, 2000),
      scripturesCited: scriptures,
      scriptureOrder: scriptures,
      headings: extractHeadings(body.replace(/<[^>]+>/g, '\n')),
      questions: extractQuestionsFromText(body),
      lessonSummary: body.slice(0, 500),
    });
    await sleep(200);
  }

  return extractions;
}

function extractVideoDescriptions(scrubbedItems) {
  const byVideo = new Map();
  for (const item of scrubbedItems) {
    if (!/youtube/i.test(item.sourceType || '') && !isYouTubeUrl(item.sourceUrl)) continue;
    const url = item.sourceUrl || '';
    if (!byVideo.has(url)) {
      byVideo.set(url, {
        videoUrl: url,
        sourceName: item.sourceName,
        camp: item.camp,
        organization: item.organization,
        lessonTitle: item.lessonTitle,
        topicCandidate: item.topicCandidate || item.topic,
        descriptions: [],
        questions: [],
      });
    }
    const entry = byVideo.get(url);
    if (item.answerSummary) entry.descriptions.push(item.answerSummary);
    if (item.question) entry.questions.push(item.question);
  }

  return [...byVideo.values()].map((v) => {
    const combined = `${v.lessonTitle || ''} ${v.descriptions.join(' ')}`;
    const scriptures = extractScriptureReferencesFromText(combined);
    const timestamps = [...combined.matchAll(/\b(\d{1,2}:\d{2}(?::\d{2})?)\b/g)].map((m) => m[1]);
    return {
      ...v,
      topicCandidate: v.topicCandidate,
      scripturesCited: scriptures,
      scriptureOrder: scriptures,
      scriptureStatus: scriptures.length ? 'found_in_description' : 'missing_from_description',
      timestamps: uniqueRefs(timestamps),
      playlistName: null,
      descriptionText: combined.slice(0, 800),
    };
  });
}

async function processTranscripts(videoExtractions) {
  const results = [];
  for (const video of videoExtractions.slice(0, 30)) {
    const videoId = (video.videoUrl || '').match(/[?&]v=([a-zA-Z0-9_-]{11})/)?.[1]
      || (video.videoUrl || '').match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)?.[1];
    if (!videoId) {
      results.push({
        ...video,
        status: 'restricted_source',
        captionUnavailable: true,
        apiKeyNeeded: false,
        manualTranscriptNeeded: true,
        scripturesCited: [],
      });
      continue;
    }

    const captionRes = await fetchText(`https://www.youtube.com/api/timedtext?type=list&v=${videoId}`);
    const hasCaptions = captionRes.ok && captionRes.text.includes('<track');

    if (!hasCaptions) {
      results.push({
        videoUrl: video.videoUrl,
        videoId,
        lessonTitle: video.lessonTitle,
        sourceName: video.sourceName,
        status: process.env.YOUTUBE_API_KEY ? 'api_key_needed' : 'caption_unavailable',
        captionUnavailable: true,
        apiKeyNeeded: !process.env.YOUTUBE_API_KEY,
        manualTranscriptNeeded: true,
        scripturesCited: [],
        scriptureOrder: [],
        audienceQuestions: [],
        speakerQuestions: [],
        answerSummary: '',
      });
      await sleep(100);
      continue;
    }

    const captionText = await fetchText(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=en`);
    const text = decodeHtml(captionText.text || '');
    const scriptures = extractScriptureReferencesFromText(text);
    results.push({
      videoUrl: video.videoUrl,
      videoId,
      lessonTitle: video.lessonTitle,
      sourceName: video.sourceName,
      status: scriptures.length ? 'extracted' : 'no_refs_in_text',
      captionUnavailable: false,
      scripturesCited: scriptures,
      scriptureOrder: scriptures,
      audienceQuestions: extractQuestionsFromText(text),
      speakerQuestions: [],
      answerSummary: text.slice(0, 500),
    });
    await sleep(150);
  }

  return results;
}

function enrichQuestionsFromExtractions(scrubbedItems, {
  pdfExtractions,
  websiteExtractions,
  videoExtractions,
  transcriptExtractions,
}) {
  const byUrl = new Map();

  const mergeRefs = (url, refs, chainSource) => {
    if (!url || !refs?.length) return;
    const existing = byUrl.get(url) || { scriptures: [], sources: new Set() };
    existing.scriptures.push(...refs);
    existing.sources.add(chainSource);
    byUrl.set(url, existing);
  };

  for (const p of pdfExtractions) {
    if (p.status === 'extracted') mergeRefs(p.sourceUrl || p.pdfUrl, p.scripturesCited, 'pdf_handout');
  }
  for (const w of websiteExtractions) {
    if (w.scripturesCited?.length) mergeRefs(w.sourceUrl, w.scripturesCited, 'website_lesson');
  }
  for (const v of videoExtractions) {
    if (v.scripturesCited?.length) mergeRefs(v.videoUrl, v.scripturesCited, 'video_description');
  }
  for (const t of transcriptExtractions) {
    if (t.scripturesCited?.length) mergeRefs(t.videoUrl, t.scripturesCited, 'transcript');
  }

  return scrubbedItems.map((item) => {
    const url = item.sourceUrl || '';
    const enrichment = byUrl.get(url);
    const existing = item.scripturesCited || [];
    let merged = existing;
    let chainSource = existing.length ? 'existing_registry' : null;

    if (enrichment) {
      merged = uniqueRefs([...existing, ...enrichment.scriptures]);
      if (!chainSource && enrichment.sources.size) {
        chainSource = [...enrichment.sources][0];
      }
    }

    return {
      ...item,
      scripturesCited: merged,
      scriptureOrder: merged,
      chainSource: chainSource || (merged.length ? 'existing_registry' : null),
      enrichmentApplied: Boolean(enrichment),
    };
  });
}

function buildScriptureChains(questions) {
  const chains = [];
  const seen = new Set();

  for (const q of questions) {
    const refs = q.scripturesCited || q.scriptureOrder || [];
    if (!refs.length) continue;
    const key = normalizeExactKey(q.question);
    if (seen.has(key)) continue;
    seen.add(key);

    chains.push({
      topic: q.topic,
      lessonTitle: q.lessonTitle,
      question: q.question,
      sourceName: q.sourceName,
      camp: q.camp,
      sourceUrl: q.sourceUrl,
      originalScriptureChain: refs,
      scriptureOrder: q.scriptureOrder?.length ? q.scriptureOrder : refs,
      chainConfidence: refs.length >= 5 ? 'high' : refs.length >= 2 ? 'medium' : 'low',
      chainSource: q.chainSource || 'existing_registry',
    });
  }

  return chains;
}

function buildExpandedSupport(chains) {
  return chains.map((chain) => {
    const expansion = expandFullScriptureWitnesses({
      question: chain.question,
      topic: chain.topic,
      scripturesCited: chain.originalScriptureChain,
      scriptureOrder: chain.scriptureOrder,
      conclusion: '',
    });
    const g2r = discoverGenesisToRevelation({
      scripturesCited: chain.scriptureOrder,
      scriptureOrder: chain.scriptureOrder,
      topic: chain.topic,
    });
    const buckets = correctedClassifyScriptureBuckets(chain.scriptureOrder, expansion, g2r);

    return {
      ...chain,
      genesisToRevelationChain: g2r.genesisToRevelationChain || expansion.genesisToRevelationChain || chain.scriptureOrder,
      parallelScriptures: buckets.parallelScriptures,
      supportingScriptures: buckets.supportingScriptures,
      continuityScriptures: buckets.continuityScriptures,
    };
  });
}

function scoreAndRank(expandedChains) {
  return expandedChains.map((chain, i) => {
    const review = buildUnifiedReviewObject({
      candidateId: `3f_${String(i + 1).padStart(4, '0')}`,
      question: chain.question,
      topic: chain.topic,
      scripturesCited: chain.originalScriptureChain,
      scriptureOrder: chain.scriptureOrder,
      source: chain.sourceName,
      sourceType: chain.chainSource,
    });

    const supportScore = review.supportScore;
    const chainBonus = Math.min(15, (chain.originalScriptureChain?.length || 0) * 2);
    const sourceBonus = chain.chainSource === 'pdf_handout' ? 5 : chain.chainSource === 'transcript' ? 8 : 0;
    const adjusted = Math.min(100, supportScore + chainBonus + sourceBonus);

    return {
      topic: chain.topic,
      lessonTitle: chain.lessonTitle,
      question: chain.question,
      supportScore: adjusted,
      strengthTier: strengthTierForScore(adjusted),
      originalScriptureChain: chain.originalScriptureChain,
      genesisToRevelationChain: chain.genesisToRevelationChain,
      parallelScriptures: chain.parallelScriptures,
      supportingScriptures: chain.supportingScriptures,
      continuityScriptures: chain.continuityScriptures,
      scoreExplanation: `Base ${supportScore}; chain depth +${chainBonus}; source +${sourceBonus}. ${review.scoreExplanation || ''}`.trim(),
      sourceName: chain.sourceName,
      camp: chain.camp,
      sourceUrl: chain.sourceUrl,
      chainSource: chain.chainSource,
    };
  }).sort((a, b) => b.supportScore - a.supportScore);
}

function buildImplementationQueues(ranked) {
  const bucket = (min, max) => ranked
    .filter((r) => r.supportScore >= min && r.supportScore <= max)
    .map((r) => ({
      question: r.question,
      topic: r.topic,
      supportScore: r.supportScore,
      strengthTier: r.strengthTier,
      sourceName: r.sourceName,
      chainSource: r.chainSource,
    }));

  return {
    queue95: bucket(95, 100),
    queue90: bucket(90, 94),
    queue80: bucket(80, 89),
    queue70: bucket(70, 79),
    queueBelow70: ranked.filter((r) => r.supportScore < 70).map((r) => ({
      question: r.question,
      topic: r.topic,
      supportScore: r.supportScore,
    })),
  };
}

function buildFailureAudit(questions, {
  pdfExtractions,
  websiteExtractions,
  videoExtractions,
  transcriptExtractions,
}) {
  const failures = [];
  const noChain = questions.filter((q) => !(q.scripturesCited || []).length);

  for (const q of noChain) {
    let reasonNoScriptureChain = 'no_refs_in_text';
    let nextActionNeeded = 'Manual scripture attestation or licensed transcript';

    const url = q.sourceUrl || '';
    const pdf = pdfExtractions.find((p) => p.sourceUrl === url || p.pdfUrl === url);
    const web = websiteExtractions.find((w) => w.sourceUrl === url);
    const video = videoExtractions.find((v) => v.videoUrl === url);
    const transcript = transcriptExtractions.find((t) => t.videoUrl === url);

    if (pdf?.status === 'pdf_parse_failed') {
      reasonNoScriptureChain = 'pdf_parse_failed';
      nextActionNeeded = 'Re-download PDF or provide text handout';
    } else if (video?.scriptureStatus === 'missing_from_description') {
      reasonNoScriptureChain = 'description_only';
      nextActionNeeded = 'Obtain transcript or reference PDF for video';
    } else if (transcript?.captionUnavailable) {
      reasonNoScriptureChain = transcript.apiKeyNeeded ? 'api_key_needed' : 'caption_unavailable';
      nextActionNeeded = transcript.apiKeyNeeded
        ? 'Configure YOUTUBE_API_KEY for caption download'
        : 'Manual transcript upload required';
    } else if (transcript?.manualTranscriptNeeded) {
      reasonNoScriptureChain = 'manual_transcript_needed';
      nextActionNeeded = 'User-provided transcript needed';
    } else if (/facebook/i.test(url)) {
      reasonNoScriptureChain = 'facebook_login_wall';
      nextActionNeeded = 'Meta Graph API or manual content export';
    }

    failures.push({
      sourceName: q.sourceName,
      lessonTitle: q.lessonTitle,
      question: q.question,
      sourceUrl: url,
      reasonNoScriptureChain,
      nextActionNeeded,
    });
  }

  return failures;
}

function collectNormalizationAudit(...refLists) {
  const allRaw = refLists.flat();
  const { normalized, audit } = normalizeReferenceList(allRaw);
  return {
    rawCount: allRaw.length,
    normalizedCount: normalized.length,
    audit,
  };
}

async function runPhase3fContentExtraction({
  maxPdfs = 55,
  maxWebPages = 35,
  maxTranscriptProbes = 25,
} = {}) {
  const corpus = loadJson(CORPUS_PATH);
  const registry = loadJson(REGISTRY_PATH);
  if (!corpus?.scrubbedItems) {
    throw new Error('phase3e-scrubbed-corpus.json missing — run Phase 3E first');
  }

  const scrubbedItems = corpus.scrubbedItems;
  const extractionTargets = buildExtractionTargets(scrubbedItems, registry);

  const pdfExtractions = await extractPdfHandouts(scrubbedItems, { maxPdfs });
  const websiteExtractions = await extractWebsiteLessons(scrubbedItems, { maxPages: maxWebPages });
  const videoExtractions = extractVideoDescriptions(scrubbedItems);
  const transcriptExtractions = await processTranscripts(videoExtractions.slice(0, maxTranscriptProbes));

  const enrichedScrubbed = enrichQuestionsFromExtractions(scrubbedItems, {
    pdfExtractions,
    websiteExtractions,
    videoExtractions,
    transcriptExtractions,
  });

  const legacyRecords = extractAllCorpusRecords();
  const questions = mergeExtractions(enrichedScrubbed, legacyRecords);
  for (const q of questions) {
    if (!q.topic) assignRecordTopic(q);
  }

  const normalization = collectNormalizationAudit(
    pdfExtractions.flatMap((p) => p.scripturesCited || []),
    websiteExtractions.flatMap((w) => w.scripturesCited || []),
    videoExtractions.flatMap((v) => v.scripturesCited || []),
    transcriptExtractions.flatMap((t) => t.scripturesCited || []),
    questions.flatMap((q) => q.scripturesCited || []),
  );

  const chains = buildScriptureChains(questions);
  const expandedChains = buildExpandedSupport(chains);
  const ranked = scoreAndRank(expandedChains);
  const queues = buildImplementationQueues(ranked);
  const topicMap = buildTopicMap(questions);
  const failureAudit = buildFailureAudit(questions, {
    pdfExtractions,
    websiteExtractions,
    videoExtractions,
    transcriptExtractions,
  });

  const phase3e = loadJson(path.join(TRACE, 'phase3e-open-source-scrub-results.json'), {});
  const priorChains = phase3e.executive?.totalScriptureChains || 127;

  const scoreBuckets = {
    above95: ranked.filter((r) => r.supportScore >= 95).length,
    above90: ranked.filter((r) => r.supportScore >= 90).length,
    above80: ranked.filter((r) => r.supportScore >= 80).length,
    above70: ranked.filter((r) => r.supportScore >= 70).length,
    below70: ranked.filter((r) => r.supportScore < 70).length,
  };

  const sourceScriptureCounts = {};
  for (const c of chains) {
    const src = c.sourceName || 'unknown';
    sourceScriptureCounts[src] = (sourceScriptureCounts[src] || 0) + (c.originalScriptureChain?.length || 0);
  }
  const topSources = Object.entries(sourceScriptureCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([sourceName, scriptureRefs]) => ({ sourceName, scriptureRefs }));

  const topicStrength = {};
  for (const r of ranked) {
    if (!topicStrength[r.topic]) topicStrength[r.topic] = { count: 0, totalScore: 0 };
    topicStrength[r.topic].count += 1;
    topicStrength[r.topic].totalScore += r.supportScore;
  }
  const strongestTopics = Object.entries(topicStrength)
    .map(([topic, v]) => ({ topic, avgScore: Math.round(v.totalScore / v.count), count: v.count }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 15);

  const executive = {
    pdfsProcessed: pdfExtractions.length,
    pdfsWithScriptures: pdfExtractions.filter((p) => p.status === 'extracted').length,
    websiteLessonsProcessed: websiteExtractions.length,
    websiteWithScriptures: websiteExtractions.filter((w) => w.scripturesCited?.length).length,
    videoDescriptionsProcessed: videoExtractions.length,
    videosWithScriptures: videoExtractions.filter((v) => v.scripturesCited?.length).length,
    transcriptsProcessed: transcriptExtractions.length,
    transcriptsWithScriptures: transcriptExtractions.filter((t) => t.scripturesCited?.length).length,
    scriptureReferencesExtracted: normalization.rawCount,
    referencesNormalized: normalization.normalizedCount,
    newScriptureChainsBuilt: chains.length,
    questionsStillWithoutChains: questions.filter((q) => !(q.scripturesCited || []).length).length,
    totalQuestions: questions.length,
    priorChainCount: priorChains,
    chainCountDelta: chains.length - priorChains,
    chainCountIncreasedSignificantly: chains.length > priorChains + 20,
    candidates95Plus: scoreBuckets.above95,
    candidates90Plus: scoreBuckets.above90,
    candidates80Plus: scoreBuckets.above80,
    topSources,
    strongestTopics,
    readyForHumanReview: queues.queue95.length + queues.queue90.length,
  };

  const payload = {
    phase: '3F',
    ranAt: new Date().toISOString(),
    extractionTargets,
    pdfExtractions,
    websiteExtractions,
    videoExtractions,
    transcriptExtractions,
    normalization,
    enrichedScrubbed,
    questions,
    chains,
    expandedChains,
    ranked,
    queues,
    topicMap,
    failureAudit,
    scoreBuckets,
    executive,
    safety: {
      productionChanges: false,
      implementation: false,
      approvals: false,
      doctrineChanges: false,
      passed: true,
    },
  };

  fs.mkdirSync(TRACE, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  fs.writeFileSync(
    path.join(TRACE, 'phase3f-content-extraction-results.json'),
    `${JSON.stringify(payload, null, 2)}\n`,
  );
  fs.writeFileSync(path.join(OUT_DIR, 'pdf-handout-extractions.json'), `${JSON.stringify({ ranAt: payload.ranAt, extractions: pdfExtractions }, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT_DIR, 'website-lesson-extractions.json'), `${JSON.stringify({ ranAt: payload.ranAt, extractions: websiteExtractions }, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT_DIR, 'video-description-scripture-extractions.json'), `${JSON.stringify({ ranAt: payload.ranAt, extractions: videoExtractions }, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT_DIR, 'transcript-extractions.json'), `${JSON.stringify({ ranAt: payload.ranAt, extractions: transcriptExtractions }, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT_DIR, 'expanded-scripture-chains.json'), `${JSON.stringify({ ranAt: payload.ranAt, chains }, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT_DIR, 'expanded-chain-support.json'), `${JSON.stringify({ ranAt: payload.ranAt, expandedChains }, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT_DIR, 'content-extraction-ranking.json'), `${JSON.stringify({ ranAt: payload.ranAt, ranked, scoreBuckets }, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT_DIR, 'content-extraction-implementation-queues.json'), `${JSON.stringify({ ranAt: payload.ranAt, queues, scoreBuckets, executive }, null, 2)}\n`);

  return payload;
}

module.exports = {
  runPhase3fContentExtraction,
  buildExtractionTargets,
  extractPdfHandouts,
  extractWebsiteLessons,
  extractVideoDescriptions,
  processTranscripts,
  buildScriptureChains,
};
