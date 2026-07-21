/**
 * Phase 3E — Open-source public content scrubber (IOG / ICOJ).
 * Permitted public methods only — no video download, no ToS bypass.
 */

const axios = require('axios');
const { verifyKjvReference } = require('./teachingCandidateCrossCheck');

const USER_AGENT = 'Mozilla/5.0 (compatible; BibleBuddyDiscovery/3E; +https://theisraelofgod.com)';
const REF_EXTRACT_RE = /\b(?:(?:\d\s)?[1-3]?\s?[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+\d{1,3}(?::\d{1,3}(?:-\d{1,3})?)?/g;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeHtml(s = '') {
  return String(s)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?38;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractScripturesFromText(text = '') {
  const matches = String(text).match(REF_EXTRACT_RE) || [];
  const valid = [];
  const seen = new Set();
  for (const m of matches) {
    const ref = m.replace(/\s+/g, ' ').trim();
    if (!verifyKjvReference(ref).valid) continue;
    const key = ref.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    valid.push(ref);
  }
  return valid;
}

async function fetchText(url, { timeout = 20000 } = {}) {
  try {
    const res = await axios.get(url, {
      timeout,
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/json,application/xml,*/*' },
      maxRedirects: 5,
      validateStatus: (s) => s < 500,
    });
    if (res.status >= 400) {
      return { ok: false, status: res.status, text: '', error: `HTTP ${res.status}` };
    }
    return { ok: true, status: res.status, text: typeof res.data === 'string' ? res.data : JSON.stringify(res.data) };
  } catch (err) {
    return { ok: false, status: 0, text: '', error: err.message || 'fetch failed' };
  }
}

function lessonTitleFromPdfUrl(url = '') {
  const name = decodeURIComponent(url.split('/').pop() || '').replace(/\.pdf$/i, '');
  return name
    .replace(/-/g, ' ')
    .replace(/\b(Fri|Friday|Sat|Saturday|Wed|Wednesday)\b/gi, '')
    .replace(/\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleToQuestionCandidates(title = '', context = {}) {
  const t = decodeHtml(title).trim();
  if (!t) return [];
  const out = [];
  if (/\?$/.test(t)) {
    out.push({ question: t, kind: 'title_question' });
  } else {
    out.push({
      question: `What does the lesson "${t}" teach according to Scripture?`,
      kind: 'lesson_title',
    });
    out.push({
      question: `What is the biblical teaching on ${t.replace(/^The /i, '')}?`,
      kind: 'lesson_subquestion',
    });
  }
  if (context.camp) {
    out.push({
      question: `(${context.camp}) ${out[0].question}`,
      kind: 'camp_variant',
    });
  }
  return out;
}

function buildExtraction({
  sourceName,
  camp,
  organization,
  lessonTitle,
  question,
  answerSummary,
  scripturesCited,
  sourceUrl,
  sourceType,
  contentKind,
}) {
  const scriptureOrder = scripturesCited || [];
  return {
    sourceName,
    camp: camp || 'HQ',
    organization: organization || 'IOG',
    lessonTitle: lessonTitle || '',
    question,
    answerSummary: answerSummary || '',
    scripturesCited: scriptureOrder,
    scriptureOrder,
    sourceUrl,
    sourceType,
    contentKind,
    discoveryPhase: '3E-scrub',
  };
}

async function scrubWordPressPosts(baseUrl, { camp, organization, sourceName, categoryId, maxPages = 5 } = {}) {
  const items = [];
  const stats = { posts: 0, lessonsFound: 0, questionsExtracted: 0, scripturesExtracted: 0 };

  for (let page = 1; page <= maxPages; page += 1) {
    const catParam = categoryId ? `&categories=${categoryId}` : '';
    const url = `${baseUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts?per_page=100&page=${page}${catParam}`;
    const res = await fetchText(url);
    if (!res.ok) break;
    let posts;
    try {
      posts = JSON.parse(res.text);
    } catch {
      break;
    }
    if (!Array.isArray(posts) || !posts.length) break;

    for (const post of posts) {
      stats.posts += 1;
      const title = decodeHtml(post.title?.rendered || '');
      const content = decodeHtml(post.content?.rendered || '') + ' ' + decodeHtml(post.excerpt?.rendered || '');
      const scriptures = extractScripturesFromText(content);
      stats.scripturesExtracted += scriptures.length;
      stats.lessonsFound += 1;

      const link = post.link || `${baseUrl}/?p=${post.id}`;
      for (const qc of titleToQuestionCandidates(title, { camp })) {
        items.push(buildExtraction({
          sourceName,
          camp,
          organization,
          lessonTitle: title,
          question: qc.question,
          answerSummary: content.slice(0, 500),
          scripturesCited: scriptures,
          sourceUrl: link,
          sourceType: 'wordpress_lesson',
          contentKind: qc.kind,
        }));
        stats.questionsExtracted += 1;
      }
    }
    await sleep(300);
  }

  return { items, stats };
}

async function scrubWordPressPagePdfs(baseUrl, slug, { camp, organization, sourceName } = {}) {
  const items = [];
  const stats = { lessonsFound: 0, handoutsFound: 0, questionsExtracted: 0, scripturesExtracted: 0 };
  const url = `${baseUrl.replace(/\/$/, '')}/wp-json/wp/v2/pages?slug=${slug}`;
  const res = await fetchText(url);
  if (!res.ok) return { items, stats, error: res.error };

  let pages;
  try {
    pages = JSON.parse(res.text);
  } catch {
    return { items, stats, error: 'invalid JSON' };
  }
  const page = pages[0];
  if (!page?.content?.rendered) return { items, stats, error: 'no page content' };

  const html = page.content.rendered;
  const pdfs = [...html.matchAll(/href=["']([^"']+\.pdf[^"']*)["']/gi)].map((m) => m[1]);
  const uniquePdfs = [...new Set(pdfs)];

  for (const pdfUrl of uniquePdfs) {
    const lessonTitle = lessonTitleFromPdfUrl(pdfUrl);
    if (!lessonTitle) continue;
    stats.handoutsFound += 1;
    stats.lessonsFound += 1;

    const isRef = /-ref\.pdf$/i.test(pdfUrl) || /Ref\.pdf$/i.test(pdfUrl);
    let scriptures = [];
    if (isRef) {
      const pdfRes = await fetchText(pdfUrl, { timeout: 15000 });
      if (pdfRes.ok) {
        scriptures = extractScripturesFromText(pdfRes.text);
        stats.scripturesExtracted += scriptures.length;
      }
      await sleep(200);
    }

    for (const qc of titleToQuestionCandidates(lessonTitle, { camp })) {
      items.push(buildExtraction({
        sourceName,
        camp,
        organization,
        lessonTitle,
        question: qc.question,
        answerSummary: `Lesson handout: ${lessonTitle}`,
        scripturesCited: scriptures,
        sourceUrl: pdfUrl,
        sourceType: 'lesson_handout_pdf',
        contentKind: isRef ? 'reference_pdf' : 'handout_pdf',
      }));
      stats.questionsExtracted += 1;
    }
  }

  return { items, stats };
}

async function scrubYouTubeChannel(channelUrl, { camp, organization, sourceName, maxVideos = 40 } = {}) {
  const items = [];
  const stats = {
    videosFound: 0,
    transcriptsFound: 0,
    questionsExtracted: 0,
    scripturesExtracted: 0,
    playlistsFound: 0,
  };

  let videosUrl = channelUrl;
  if (!/\/videos/.test(videosUrl)) {
    videosUrl = videosUrl.replace(/\/$/, '') + '/videos';
  }

  const res = await fetchText(videosUrl);
  if (!res.ok) return { items, stats, error: res.error || 'channel fetch failed' };

  const videoIds = [...new Set(
    [...res.text.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map((m) => m[1]),
  )].slice(0, maxVideos);

  stats.videosFound = videoIds.length;

  for (const videoId of videoIds) {
    const video = await scrubYouTubeVideo(videoId, { camp, organization, sourceName });
    if (video.items?.length) {
      items.push(...video.items);
      stats.questionsExtracted += video.stats.questionsExtracted;
      stats.scripturesExtracted += video.stats.scripturesExtracted;
      stats.transcriptsFound += video.stats.transcriptsFound;
    }
    await sleep(250);
  }

  return { items, stats };
}

async function scrubYouTubeVideo(videoId, { camp, organization, sourceName } = {}) {
  const items = [];
  const stats = { questionsExtracted: 0, scripturesExtracted: 0, transcriptsFound: 0 };
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const res = await fetchText(watchUrl);
  if (!res.ok) return { items, stats, error: res.error };

  const titleMatch = res.text.match(/<meta name="title" content="([^"]+)"/)
    || res.text.match(/"title":"((?:\\.|[^"\\])*)"/);
  const descMatch = res.text.match(/<meta name="description" content="([^"]+)"/)
    || res.text.match(/"description":"((?:\\.|[^"\\])*)"/);

  const title = decodeHtml(titleMatch?.[1]?.replace(/\\u0026/g, '&').replace(/\\"/g, '"') || `YouTube video ${videoId}`);
  const description = decodeHtml(descMatch?.[1]?.replace(/\\n/g, ' ').replace(/\\u0026/g, '&').replace(/\\"/g, '"') || '');
  const combined = `${title} ${description}`;
  const scriptures = extractScripturesFromText(combined);
  stats.scripturesExtracted = scriptures.length;

  const captionRes = await fetchText(`https://www.youtube.com/api/timedtext?type=list&v=${videoId}`);
  if (captionRes.ok && captionRes.text.includes('<track')) {
    stats.transcriptsFound = 1;
  }

  const isQa = /\b(q\s*&\s*a|question|wednesday night)\b/i.test(combined);
  const questionCandidates = [];

  if (/\?/.test(title)) {
    questionCandidates.push({ question: title, kind: 'video_title_question' });
  }
  questionCandidates.push({
    question: isQa
      ? `What is taught in this Q&A session: "${title}"?`
      : `What does the video "${title}" teach according to Scripture?`,
    kind: isQa ? 'qna_video' : 'lesson_video',
  });

  if (description.length > 40) {
    const descQuestions = description.split(/(?<=[.!?])\s+/).filter((s) => s.includes('?'));
    for (const dq of descQuestions.slice(0, 3)) {
      questionCandidates.push({ question: dq.trim(), kind: 'description_question' });
    }
  }

  for (const qc of questionCandidates) {
    items.push(buildExtraction({
      sourceName,
      camp,
      organization,
      lessonTitle: title,
      question: qc.question,
      answerSummary: description.slice(0, 600),
      scripturesCited: scriptures,
      sourceUrl: watchUrl,
      sourceType: isQa ? 'youtube_qna' : 'youtube_video',
      contentKind: qc.kind,
    }));
    stats.questionsExtracted += 1;
  }

  return { items, stats };
}

async function scrubRssFeed(feedUrl, { camp, organization, sourceName } = {}) {
  const items = [];
  const stats = { contentItemsFound: 0, lessonsFound: 0, questionsExtracted: 0, scripturesExtracted: 0 };
  const res = await fetchText(feedUrl);
  if (!res.ok) return { items, stats, error: res.error };

  const itemBlocks = [...res.text.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
  for (const block of itemBlocks) {
    const xml = block[1];
    const title = decodeHtml((xml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i) || [])[1] || '');
    const link = (xml.match(/<link>([^<]+)<\/link>/i) || [])[1] || '';
    const desc = decodeHtml((xml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i) || [])[1] || '');
    const content = decodeHtml((xml.match(/<content:encoded>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/i) || [])[1] || '');
    const full = `${desc} ${content}`;
    const scriptures = extractScripturesFromText(full);
    stats.contentItemsFound += 1;
    stats.lessonsFound += 1;
    stats.scripturesExtracted += scriptures.length;

    for (const qc of titleToQuestionCandidates(title, { camp })) {
      items.push(buildExtraction({
        sourceName,
        camp,
        organization,
        lessonTitle: title,
        question: qc.question,
        answerSummary: full.slice(0, 500),
        scripturesCited: scriptures,
        sourceUrl: link,
        sourceType: 'rss_item',
        contentKind: qc.kind,
      }));
      stats.questionsExtracted += 1;
    }
  }

  return { items, stats };
}

function pickPrimaryUrl(source) {
  return source.websiteUrl
    || source.youtubeChannelUrl
    || (source.playlistUrls || [])[0]
    || (source.lessonUrls || [])[0]
    || (source.qnaUrls || [])[0]
    || source.facebookUrl
    || null;
}

async function scrubRegistrySource(source) {
  const report = {
    sourceName: source.sourceName,
    sourceId: source.sourceId,
    camp: source.camp,
    organization: source.organization,
    url: pickPrimaryUrl(source),
    processed: false,
    contentItemsFound: 0,
    videosFound: 0,
    playlistsFound: (source.playlistUrls || []).length,
    lessonsFound: 0,
    qnaItemsFound: 0,
    transcriptsFound: 0,
    questionsExtracted: 0,
    scripturesExtracted: 0,
    failureReason: null,
    items: [],
  };

  const org = source.organization;
  const camp = source.camp;
  const name = source.sourceName;

  try {
    if (source.sourceId === 'iog_hq_website' || source.sourceId === 'iog_hq_lessons') {
      const wp = await scrubWordPressPosts('https://theisraelofgod.com', {
        camp, organization: org, sourceName: name, categoryId: 12,
      });
      const rss = await scrubRssFeed('https://theisraelofgod.com/feed/', { camp, organization: org, sourceName: name });
      report.items.push(...wp.items, ...rss.items);
      report.lessonsFound = wp.stats.lessonsFound + rss.stats.lessonsFound;
      report.questionsExtracted = wp.stats.questionsExtracted + rss.stats.questionsExtracted;
      report.scripturesExtracted = wp.stats.scripturesExtracted + rss.stats.scripturesExtracted;
      report.contentItemsFound = wp.stats.posts + rss.stats.contentItemsFound;
      report.processed = report.questionsExtracted > 0;
      if (!report.processed) report.failureReason = 'WordPress returned limited public posts (8 lessons)';
      return report;
    }

    if (source.sourceId === 'icoj_hq_lessons' || source.sourceId === 'icoj_lesson_handouts') {
      const slugs = ['lessons', 'lesson-handouts', 'lessons-los-angeles-ca', 'atlanta-ga', 'toronto-ontario'];
      for (const slug of slugs) {
        const page = await scrubWordPressPagePdfs('https://www.israelthechurchofjesus.net', slug, {
          camp, organization: org, sourceName: name,
        });
        report.items.push(...page.items);
        report.handouts = (report.handouts || 0) + (page.stats?.handoutsFound || 0);
        report.lessonsFound += page.stats?.lessonsFound || 0;
        report.questionsExtracted += page.stats?.questionsExtracted || 0;
        report.scripturesExtracted += page.stats?.scripturesExtracted || 0;
        await sleep(200);
      }
      report.contentItemsFound = report.lessonsFound;
      report.processed = report.questionsExtracted > 0;
      if (!report.processed) report.failureReason = 'No handout PDF links on camp lesson pages';
      return report;
    }

    if (source.youtubeChannelUrl && /youtube\.com|youtu\.be/i.test(source.youtubeChannelUrl)) {
      const yt = await scrubYouTubeChannel(source.youtubeChannelUrl, {
        camp, organization: org, sourceName: name, maxVideos: 35,
      });
      report.items.push(...yt.items);
      report.videosFound = yt.stats.videosFound;
      report.transcriptsFound = yt.stats.transcriptsFound;
      report.questionsExtracted = yt.stats.questionsExtracted;
      report.scripturesExtracted = yt.stats.scripturesExtracted;
      report.qnaItemsFound = yt.items.filter((i) => i.sourceType === 'youtube_qna').length;
      report.contentItemsFound = report.videosFound;
      report.processed = report.videosFound > 0;
      if (!report.processed) report.failureReason = yt.error || 'YouTube channel page returned no video IDs';
      return report;
    }

    if (source.sourceId === 'iog_wednesday_qa') {
      const yt = await scrubYouTubeChannel('https://www.youtube.com/@IOGIsrael', {
        camp, organization: org, sourceName: name, maxVideos: 40,
      });
      report.items.push(...yt.items);
      report.videosFound = yt.stats.videosFound;
      report.qnaItemsFound = yt.items.length;
      report.questionsExtracted = yt.stats.questionsExtracted;
      report.scripturesExtracted = yt.stats.scripturesExtracted;
      report.processed = report.videosFound > 0;
      if (!report.processed) report.failureReason = yt.error || 'IOGIsrael channel scrape failed';
      return report;
    }

    if (source.facebookUrl) {
      report.failureReason = 'Facebook requires authenticated API — public scrape blocked by login wall';
      report.processed = false;
      return report;
    }

    if (source.instagramUrl) {
      report.failureReason = 'Instagram public API/scrape restricted — metadata only';
      report.processed = false;
      return report;
    }

    if (source.sourceType === 'camp' && !source.websiteUrl && !source.youtubeChannelUrl) {
      report.failureReason = 'Camp registered from locations directory — no direct content URL';
      report.processed = false;
      return report;
    }

    if (source.websiteUrl && /theisraelofgod\.com|israelthechurchofjesus\.net|israelofgod/i.test(source.websiteUrl)) {
      if (source.websiteUrl.includes('/locations')) {
        report.failureReason = 'Locations directory page — camp links only, no lesson content';
        return report;
      }
      const res = await fetchText(source.websiteUrl);
      if (!res.ok) {
        report.failureReason = res.error || `HTTP ${res.status}`;
        return report;
      }
      if (/page not found/i.test(res.text)) {
        report.failureReason = 'URL returns 404 Page not found';
        return report;
      }
      const scriptures = extractScripturesFromText(res.text);
      const title = decodeHtml((res.text.match(/<title>([^<]+)<\/title>/i) || [])[1] || source.sourceName);
      for (const qc of titleToQuestionCandidates(title, { camp })) {
        report.items.push(buildExtraction({
          sourceName: name,
          camp,
          organization: org,
          lessonTitle: title,
          question: qc.question,
          answerSummary: decodeHtml(res.text).slice(0, 400),
          scripturesCited: scriptures,
          sourceUrl: source.websiteUrl,
          sourceType: 'website_page',
          contentKind: 'page_metadata',
        }));
        report.questionsExtracted += 1;
      }
      report.scripturesExtracted = scriptures.length;
      report.contentItemsFound = 1;
      report.processed = report.questionsExtracted > 0;
      if (!report.processed) report.failureReason = 'Page fetched but no extractable questions';
      return report;
    }

    if (source.sourceType === 'internal_registry' || source.organization === 'Internal') {
      report.failureReason = 'Internal registry — processed via legacy JSON pipeline in merge step';
      report.processed = true;
      return report;
    }

    report.failureReason = 'No scrubbable public URL or unsupported source type';
    return report;
  } catch (err) {
    report.failureReason = err.message || 'processing error';
    return report;
  }
}

module.exports = {
  fetchText,
  extractScripturesFromText,
  scrubRegistrySource,
  scrubWordPressPosts,
  scrubWordPressPagePdfs,
  scrubYouTubeChannel,
  scrubYouTubeVideo,
  scrubRssFeed,
  lessonTitleFromPdfUrl,
  titleToQuestionCandidates,
  buildExtraction,
  decodeHtml,
};
