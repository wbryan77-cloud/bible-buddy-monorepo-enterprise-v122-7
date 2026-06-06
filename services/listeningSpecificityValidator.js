/**
 * Listening 7.5 — specificity signals for reason-first composer.
 *
 * Soft: recommendations guide the composer (detail presence, grounded emotion).
 * Hard: correction overlap > 40%, repeated prior rationale (doctrine stays separate).
 */

const { overlapRatio, openingSentence } = require('./correctionLedger');

const CORRECTION_OVERLAP_THRESHOLD = 0.4;
const RATIONALE_REPEAT_THRESHOLD = 0.35;

const STOPWORDS = new Set([
  'that', 'this', 'with', 'from', 'have', 'been', 'were', 'what', 'when', 'your',
  'about', 'would', 'could', 'should', 'there', 'their', 'they', 'them', 'then',
  'than', 'into', 'just', 'like', 'some', 'very', 'also', 'only', 'even', 'more',
  'most', 'such', 'does', 'did', 'will', 'been', 'being', 'are', 'was', 'were',
]);

const EMOTION_SURFACE =
  /\b(i'?m sorry|so sorry|that sounds|that must|heavy|painful|difficult|with you|not alone|grieving|heartbreaking|overwhelming)\b/i;

const GENERIC_SUMMARY_MARKERS =
  /\b(caring for a parent|this season|many people|can be difficult|life can be|it is natural to)\b/i;

function normalizeText(text = '') {
  return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function tokenSet(text = '') {
  return new Set(
    normalizeText(text)
      .split(/\W+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
  );
}

function tokenOverlapCount(a = '', b = '') {
  const wa = tokenSet(a);
  const wb = tokenSet(b);
  if (!wa.size || !wb.size) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter += 1;
  return inter;
}

function firstTwoSentences(text = '') {
  const t = String(text || '').trim();
  const parts = t.match(/[^.!?]+[.!?]+/g) || [];
  if (parts.length >= 2) return parts.slice(0, 2).join(' ').trim();
  if (parts.length === 1) return parts[0].trim();
  return t.slice(0, 280);
}

function uniquePush(arr, item, max = 12) {
  const s = String(item || '').trim();
  if (!s || s.length < 4) return;
  if (arr.some((x) => normalizeText(x) === normalizeText(s))) return;
  arr.push(s.slice(0, 160));
  if (arr.length > max) arr.length = max;
}

/**
 * Concrete phrases from thread (user wording), not category labels.
 */
function buildConcreteDetailCandidates(evidencePack = {}, message = '') {
  const candidates = [];
  const threadLocal = evidencePack.threadLocal || {};
  const companion = evidencePack.companionThreadContext || {};

  for (const msg of threadLocal.lastUserMessages || []) {
    uniquePush(candidates, msg);
  }
  uniquePush(candidates, message);
  uniquePush(candidates, threadLocal.latestClarifiedIntent);
  uniquePush(candidates, threadLocal.currentUnresolvedQuestion);
  uniquePush(candidates, companion.directConcernPhrase);
  uniquePush(candidates, companion.lastRelevantUserMessage);

  for (const snippet of threadLocal.snippets || []) {
    const m = String(snippet).replace(/^User:\s*/i, '').trim();
    if (m) uniquePush(candidates, m);
  }

  const refined = [];
  for (const c of candidates) {
    const words = c.split(/\s+/).filter(Boolean);
    if (words.length >= 2 && words.length <= 20) refined.push(c);
    else if (words.length > 20) refined.push(words.slice(0, 12).join(' '));
  }

  return refined.slice(0, 10);
}

function hasConcreteDetailInOpening(reply = '', candidates = []) {
  if (!candidates.length) return { present: true, matched: null, skipped: true };
  const opening = firstTwoSentences(reply);
  for (const c of candidates) {
    if (tokenOverlapCount(opening, c) >= 2) {
      return { present: true, matched: c };
    }
  }
  return { present: false, matched: null };
}

function evaluateGroundedEmotion(reply = '', candidates = []) {
  if (!EMOTION_SURFACE.test(reply)) {
    return { grounded: true, skipped: true };
  }
  const sentences = String(reply).match(/[^.!?]+[.!?]+/g) || [reply];
  for (let i = 0; i < sentences.length; i += 1) {
    if (!EMOTION_SURFACE.test(sentences[i])) continue;
    const window = `${sentences[i]} ${sentences[i + 1] || ''}`;
    for (const c of candidates) {
      if (tokenOverlapCount(window, c) >= 2) {
        return { grounded: true, matched: c };
      }
    }
    return { grounded: false };
  }
  return { grounded: true, skipped: true };
}

/**
 * Signals for composer user payload — always applied before first generation.
 */
function buildListeningComposerSignals(evidencePack = {}, message = '') {
  const detailCandidates = buildConcreteDetailCandidates(evidencePack, message);
  const lines = [
    'Prefer specific details from the thread over general summaries.',
    'When detailCandidates are present, use the user\'s wording where natural — not as a fixed opening template.',
  ];

  if (detailCandidates.length) {
    lines.push(`detailCandidates: ${detailCandidates.slice(0, 6).join(' | ')}`);
  }

  if (evidencePack.correctionLedger?.active || evidencePack.correctionLedger?.correctionCount >= 1) {
    lines.push('On correction: answer the corrected question with fresh wording; do not repeat your prior explanation.');
    if (evidencePack.correctionLedger.correctedIntent) {
      lines.push(`correctedIntent: ${String(evidencePack.correctionLedger.correctedIntent).slice(0, 200)}`);
    }
  }

  return {
    detailCandidates,
    listeningGuidance: lines.join(' '),
  };
}

/**
 * Post-reply soft recommendations — never trigger regen alone.
 */
function evaluateListeningRecommendations(reply = '', evidencePack = {}) {
  const recommendations = [];
  const candidates = buildConcreteDetailCandidates(evidencePack, evidencePack.userMessage || '');

  if (String(reply).length < 40 || !candidates.length) {
    return { recommendations, detailCandidates: candidates };
  }

  const detail = hasConcreteDetailInOpening(reply, candidates);
  if (!detail.skipped && !detail.present) {
    const example = candidates[0];
    recommendations.push({
      type: 'user_detail_in_opening',
      message: `Prefer naming a specific detail from the user early (e.g. "${example.slice(0, 80)}") instead of a general summary.`,
    });
  }

  if (GENERIC_SUMMARY_MARKERS.test(reply) && !detail.present) {
    recommendations.push({
      type: 'avoid_generic_summary',
      message: 'Replace generic caregiving or life summaries with a phrase the user actually said.',
    });
  }

  const emotion = evaluateGroundedEmotion(reply, candidates);
  if (!emotion.skipped && !emotion.grounded) {
    recommendations.push({
      type: 'ground_emotion',
      message: 'If you express sympathy, tie it to a concrete detail the user gave in the same sentence.',
    });
  }

  const ledger = evidencePack.correctionLedger || {};
  if (ledger.active || ledger.correctionCount >= 1) {
    const priors = ledger.priorAssistantReplies || [];
    const openers = priors.map(openingSentence).filter(Boolean);
    const replyOpen = openingSentence(reply);
    if (openers.some((o) => normalizeText(o) === normalizeText(replyOpen) && replyOpen.length > 20)) {
      recommendations.push({
        type: 'fresh_opening',
        message: 'Use a new opening sentence after correction — do not reuse your prior opener.',
      });
    }
  }

  return { recommendations, detailCandidates: candidates, detailCheck: detail, emotionCheck: emotion };
}

/**
 * Hard failures — correction turns only. Doctrine handled elsewhere.
 */
function validateCorrectionHardFailures(reply = '', evidencePack = {}) {
  const ledger = evidencePack.correctionLedger || {};
  if (!ledger.active && !(ledger.correctionCount >= 1)) {
    return { passed: true, issues: [], skipped: true };
  }

  const issues = [];
  const priors = ledger.priorAssistantReplies || [];

  for (const prior of priors) {
    const ratio = overlapRatio(reply, prior);
    if (ratio > CORRECTION_OVERLAP_THRESHOLD) {
      issues.push(`high_overlap_after_correction:${Math.round(ratio * 100)}%`);
    }
  }

  if (ledger.priorAssistantQuote) {
    const rationaleRatio = overlapRatio(reply, ledger.priorAssistantQuote);
    if (rationaleRatio > RATIONALE_REPEAT_THRESHOLD) {
      issues.push(`repeated_prior_rationale:${Math.round(rationaleRatio * 100)}%`);
    }
  }

  return {
    passed: issues.length === 0,
    issues,
    skipped: false,
  };
}

function buildCorrectionRegenHint(issues = [], evidencePack = {}) {
  const intent = evidencePack.correctionLedger?.correctedIntent || evidencePack.userMessage || '';
  const parts = [
    'Do not repeat your prior answer or rationale. Use a new opening and answer only the corrected question.',
  ];
  if (intent) parts.push(`Corrected question: ${String(intent).slice(0, 300)}`);
  if (issues.length) parts.push(`Fix: ${issues.join('; ')}`);
  return parts.join(' ');
}

function formatRecommendationsForTrace(recommendations = []) {
  return recommendations.map((r) => r.message).filter(Boolean);
}

module.exports = {
  CORRECTION_OVERLAP_THRESHOLD,
  RATIONALE_REPEAT_THRESHOLD,
  buildConcreteDetailCandidates,
  buildListeningComposerSignals,
  evaluateListeningRecommendations,
  validateCorrectionHardFailures,
  buildCorrectionRegenHint,
  formatRecommendationsForTrace,
  hasConcreteDetailInOpening,
  evaluateGroundedEmotion,
};
