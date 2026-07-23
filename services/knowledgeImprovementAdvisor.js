/**
 * ENTERPRISE_OPERATIONS_FOUNDATION Phase 1B — AI-4, Knowledge Improvement AI.
 * Architecture Review Deliverable 5 (AI Responsibility Matrix).
 *
 * A thin orchestration layer over EXISTING analytics/logs — this module
 * introduces no new analytics engine. It composes:
 *   - services/userAssistanceEscalationStore.js  (recurring support Qs,
 *     documentation gaps — questions with no matching Help Center article)
 *   - services/helpCenterContentStore.js          (what documentation
 *     already exists, to detect gaps and avoid recommending duplicates)
 *   - services/adminAuditTrail.js                 (recurring admin
 *     responses — resolved escalations with similar replies)
 *   - services/alphaFeedbackCapture.js             (feature confusion —
 *     too_robotic / didnt_listen / not_helpful tag clustering)
 *
 * HARD CONSTRAINT (batch-mandated, matches Deliverable 5 exactly): this
 * module must never modify production knowledge, Help Center content, or
 * doctrine. It has NO write path to any of those. It only produces
 * recommendation objects with stable ids, which
 * services/adminDecisionQueue.js reads as one more source — the same
 * two-gate approval pipeline (recommend -> human decision -> production)
 * that already governs every other knowledge candidate in this codebase.
 * Administrator approval is always required before anything here reaches
 * production; this module cannot bypass that even in principle, because it
 * has no production-write function to call.
 */

const crypto = require('crypto');
const { readEscalations } = require('./userAssistanceEscalationStore');
const { listArticles } = require('./helpCenterContentStore');
const { readFeedback, VALID_TAGS } = require('./alphaFeedbackCapture');

const RECURRING_QUESTION_THRESHOLD = 2; // same normalized topic seen >= N times
const FEATURE_CONFUSION_TAGS = ['too_robotic', 'didnt_listen', 'not_helpful'];
const FEATURE_CONFUSION_THRESHOLD = 3;

function stableId(prefix, seed) {
  const hash = crypto.createHash('sha256').update(String(seed)).digest('hex').slice(0, 16);
  return `${prefix}:${hash}`;
}

function normalizeTopic(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .sort()
    .slice(0, 6)
    .join('-');
}

/**
 * Recurring support questions + documentation gaps: group escalations
 * (questions AI-2 could not answer confidently) by a coarse normalized
 * topic signature. A topic repeating at/above threshold is a genuine
 * signal that a Help Center article is missing or unclear.
 */
function detectRecurringQuestionsAndDocGaps() {
  const escalations = readEscalations({ limit: 2000 });
  const groups = new Map();
  for (const e of escalations) {
    const topic = normalizeTopic(e.question);
    if (!topic) continue;
    if (!groups.has(topic)) groups.set(topic, []);
    groups.get(topic).push(e);
  }

  const recommendations = [];
  for (const [topic, items] of groups.entries()) {
    if (items.length < RECURRING_QUESTION_THRESHOLD) continue;
    const noArticleMatched = items.every((i) => !i.bestGuessArticleId);
    recommendations.push({
      id: stableId('doc-gap', topic),
      type: noArticleMatched ? 'DOCUMENTATION_GAP' : 'RECURRING_SUPPORT_QUESTION',
      title: noArticleMatched
        ? `Possible missing Help Center article for: "${items[0].question}"`
        : `Recurring support question, existing article may need improvement: "${items[0].question}"`,
      evidence: items.slice(0, 5).map((i) => i.question),
      occurrenceCount: items.length,
      confidence: items.length >= RECURRING_QUESTION_THRESHOLD * 2 ? 'HIGH' : 'MEDIUM',
      suggestedAction: noArticleMatched
        ? 'Author a new Help Center article covering this topic.'
        : 'Review and clarify the closest-matching existing Help Center article.',
      requiredApproval: true,
      generatedAt: new Date().toISOString(),
    });
  }
  return recommendations;
}

/**
 * Recurring admin responses: resolved escalations whose admin replies
 * cluster on the same normalized topic are a signal that the reply should
 * be promoted into a first-class Help Center article rather than answered
 * ad hoc every time.
 */
function detectRecurringAdminResponses() {
  const escalations = readEscalations({ limit: 2000 }).filter((e) => e.status === 'resolved' && e.adminReply);
  const groups = new Map();
  for (const e of escalations) {
    const topic = normalizeTopic(e.question);
    if (!topic) continue;
    if (!groups.has(topic)) groups.set(topic, []);
    groups.get(topic).push(e);
  }

  const recommendations = [];
  for (const [topic, items] of groups.entries()) {
    if (items.length < RECURRING_QUESTION_THRESHOLD) continue;
    recommendations.push({
      id: stableId('recurring-response', topic),
      type: 'RECURRING_ADMIN_RESPONSE',
      title: `Admin has manually answered a similar question ${items.length} time(s): "${items[0].question}"`,
      evidence: items.slice(0, 5).map((i) => ({ question: i.question, reply: i.adminReply })),
      occurrenceCount: items.length,
      confidence: 'MEDIUM',
      suggestedAction: 'Promote this manual reply into a permanent Help Center / FAQ article.',
      requiredApproval: true,
      generatedAt: new Date().toISOString(),
    });
  }
  return recommendations;
}

/**
 * Feature confusion: clusters of negative-sentiment Alpha feedback tags
 * (too_robotic / didnt_listen / not_helpful) are a signal of feature
 * confusion or a UX gap — not a doctrine issue (wrong_doctrine is
 * deliberately excluded; that is Companion AI / Scripture governance's
 * domain, not this module's).
 */
function detectFeatureConfusion() {
  const feedback = readFeedback({ limit: 2000 });
  const byTag = {};
  for (const tag of FEATURE_CONFUSION_TAGS) {
    byTag[tag] = feedback.filter((f) => f.tag === tag).length;
  }
  const recommendations = [];
  for (const tag of FEATURE_CONFUSION_TAGS) {
    if (byTag[tag] < FEATURE_CONFUSION_THRESHOLD) continue;
    recommendations.push({
      id: stableId('feature-confusion', tag),
      type: 'FEATURE_CONFUSION',
      title: `"${tag.replace(/_/g, ' ')}" feedback tag used ${byTag[tag]} time(s) — possible feature confusion or UX gap.`,
      evidence: [`${byTag[tag]} occurrence(s) of tag "${tag}" recorded via Alpha feedback.`],
      occurrenceCount: byTag[tag],
      confidence: byTag[tag] >= FEATURE_CONFUSION_THRESHOLD * 2 ? 'HIGH' : 'MEDIUM',
      suggestedAction: 'Review recent sessions tagged with this feedback for a common UX/feature-education gap; consider an in-app callout or Help Center article.',
      requiredApproval: true,
      generatedAt: new Date().toISOString(),
    });
  }
  return recommendations;
}

/**
 * Onboarding friction: escalations whose topic overlaps with the
 * 'onboarding' Help Center category, or that occur very early (heuristic:
 * question mentions "start"/"begin"/"how do i" navigation phrasing).
 */
function detectOnboardingFriction() {
  const escalations = readEscalations({ limit: 2000 });
  const onboardingArticles = listArticles({ category: 'onboarding' }).map((a) => a.id);
  const candidates = escalations.filter((e) => /\b(start|begin|new here|first time|how do i|getting started)\b/i.test(e.question));
  if (candidates.length < RECURRING_QUESTION_THRESHOLD) return [];
  return [{
    id: stableId('onboarding-friction', 'onboarding'),
    type: 'ONBOARDING_FRICTION',
    title: `${candidates.length} escalated question(s) suggest onboarding friction.`,
    evidence: candidates.slice(0, 5).map((c) => c.question),
    occurrenceCount: candidates.length,
    confidence: candidates.length >= RECURRING_QUESTION_THRESHOLD * 2 ? 'HIGH' : 'MEDIUM',
    suggestedAction: onboardingArticles.length
      ? 'Review and strengthen the existing onboarding article(s) — they may not be discoverable or complete.'
      : 'Author an onboarding-category Help Center article; none currently exists.',
    requiredApproval: true,
    generatedAt: new Date().toISOString(),
  }];
}

/**
 * Build the full, deterministic, read-only Knowledge Improvement report.
 * Every recommendation has a STABLE id (content hash), so that
 * adminDecisionQueue's overlay-based approve/reject/defer decisions
 * persist correctly across repeated recomputation — recomputing this
 * report never loses a prior human decision.
 */
function buildKnowledgeImprovementReport() {
  const recommendations = [
    ...detectRecurringQuestionsAndDocGaps(),
    ...detectRecurringAdminResponses(),
    ...detectFeatureConfusion(),
    ...detectOnboardingFriction(),
  ];
  return {
    generatedAt: new Date().toISOString(),
    totalRecommendations: recommendations.length,
    byType: recommendations.reduce((acc, r) => { acc[r.type] = (acc[r.type] || 0) + 1; return acc; }, {}),
    recommendations,
    knownTags: VALID_TAGS,
    note: 'Recommendations only. Never modifies production knowledge, Help Center content, or doctrine. Administrator approval required before any change reaches production.',
  };
}

module.exports = {
  buildKnowledgeImprovementReport,
  detectRecurringQuestionsAndDocGaps,
  detectRecurringAdminResponses,
  detectFeatureConfusion,
  detectOnboardingFriction,
};
