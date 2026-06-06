/**
 * Emotional Center Preservation — soft metrics + hard fail for first-paragraph ignore.
 * Does not replace doctrine validation.
 */

const STOPWORDS = new Set([
  'that', 'this', 'with', 'from', 'have', 'been', 'were', 'what', 'when', 'your',
  'about', 'would', 'could', 'should', 'there', 'their', 'they', 'them', 'then',
  'than', 'into', 'just', 'like', 'some', 'very', 'also', 'only', 'even', 'more',
]);

const TEACHING_MARKERS =
  /\b(proverbs|james|psalm|exodus|isaiah|genesis|constantine|laodicea|seventh day|biblical passages|scripture identifies|historical chain)\b/i;

function normalize(text = '') {
  return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function tokenSet(text = '') {
  return new Set(
    normalize(text)
      .split(/\W+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

function overlapScore(replySlice = '', ecText = '', supportingDetail = '') {
  const corpus = `${ecText} ${supportingDetail}`;
  const a = tokenSet(replySlice);
  const b = tokenSet(corpus);
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const w of b) if (a.has(w)) inter += 1;
  return inter / Math.max(b.size, 1);
}

function openingSentence(text = '') {
  const t = String(text || '').trim();
  const m = t.match(/^(.+?[.!?])(?:\s|$)/);
  return (m ? m[1] : t.slice(0, 160)).trim();
}

function firstParagraph(text = '') {
  const t = String(text || '').trim();
  const parts = t.match(/[^.!?]+[.!?]+/g) || [];
  if (parts.length >= 3) return parts.slice(0, 3).join(' ').trim();
  if (parts.length >= 1) return parts.join(' ').trim();
  return t.slice(0, 420);
}

function restAfterOpening(text = '') {
  const t = String(text || '').trim();
  const open = openingSentence(t);
  const idx = t.indexOf(open);
  if (idx < 0) return t.slice(open.length);
  return t.slice(idx + open.length).trim();
}

/**
 * @param {object} params
 * @param {string} params.reply
 * @param {{ emotionalCenter?: string, supportingDetail?: string, confidence?: string }|null} params.emotionalCenter
 */
function evaluateEmotionalCenterPresence({ reply = '', emotionalCenter = null } = {}) {
  const ec = emotionalCenter || {};
  const center = ec.emotionalCenter;
  const detail = ec.supportingDetail;
  const hasCenter = !!(center && String(center).trim());

  if (!hasCenter) {
    return {
      skipped: true,
      ecInOpening: null,
      ecInFirstParagraph: null,
      ecAbandonedAfterOpening: null,
      openingScore: null,
      paragraphScore: null,
    };
  }

  const open = openingSentence(reply);
  const para = firstParagraph(reply);
  const afterOpen = restAfterOpening(reply);

  const openingScore = overlapScore(open, center, detail);
  const paragraphScore = overlapScore(para, center, detail);

  const ecInOpening = openingScore >= 0.2 || tokenAnchorHit(open, center, detail);
  const ecInFirstParagraph = paragraphScore >= 0.25 || tokenAnchorHit(para, center, detail);

  const teachingHeavy = TEACHING_MARKERS.test(afterOpen.slice(0, 280));
  const afterOpenScore = overlapScore(afterOpen.slice(0, 280), center, detail);
  const ecAbandonedAfterOpening =
    ecInOpening && teachingHeavy && afterOpenScore < 0.15 && !ecInFirstParagraph;

  return {
    skipped: false,
    ecInOpening,
    ecInFirstParagraph,
    ecAbandonedAfterOpening,
    openingScore: Math.round(openingScore * 100) / 100,
    paragraphScore: Math.round(paragraphScore * 100) / 100,
    opening: open,
    firstParagraph: para,
  };
}

function tokenAnchorHit(slice = '', center = '', detail = '') {
  const anchors = [];
  const corpus = normalize(`${center} ${detail}`);
  const patterns = [
    /\bwednesday\b/,
    /\bfar away\b/,
    /\bfrom home\b/,
    /\bgrieving who\b/,
    /\bfaith is failing\b/,
    /\bfeels empty\b/,
    /\bempty prayer\b/,
    /\bagain today\b/,
    /\bremember who\b/,
    /\balzheimer\b/,
    /\broman catholic\b/,
    /\bwording\b/,
    /\bpush or wait\b/,
    /\bdistant from god\b/,
    /\blost a friend\b/,
  ];
  for (const p of patterns) {
    if (p.test(corpus)) anchors.push(p);
  }
  const s = normalize(slice);
  return anchors.some((p) => p.test(s));
}

/**
 * Hard fail only when EC exists and first paragraph completely ignores it.
 */
function validateEmotionalCenter({ reply = '', emotionalCenter = null } = {}) {
  const metrics = evaluateEmotionalCenterPresence({ reply, emotionalCenter });

  if (metrics.skipped) {
    return {
      passed: true,
      skipped: true,
      hardFail: false,
      issues: [],
      metrics,
      regenHint: null,
    };
  }

  const issues = [];
  if (!metrics.ecInFirstParagraph) {
    issues.push('first_paragraph_ignores_emotional_center');
  }

  const hardFail = issues.length > 0;
  let regenHint = null;
  if (hardFail) {
    const ecLabel = emotionalCenter.emotionalCenter || emotionalCenter.supportingDetail;
    regenHint = `The first paragraph must stay with the user's emotional center (${ecLabel}) before teaching, scripture blocks, or generic comfort. Do not use "It sounds like" as a substitute. Name the center in natural language in the opening and carry it through the first paragraph.`;
  }

  return {
    passed: !hardFail,
    skipped: false,
    hardFail,
    issues,
    metrics,
    regenHint,
  };
}

module.exports = {
  evaluateEmotionalCenterPresence,
  validateEmotionalCenter,
  openingSentence,
  firstParagraph,
};
