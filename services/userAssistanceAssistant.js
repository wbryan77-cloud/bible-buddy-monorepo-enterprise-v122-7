/**
 * ENTERPRISE_OPERATIONS_FOUNDATION Phase 1B — AI-2, User Assistance AI.
 * Architecture Review Deliverable 5 (AI Responsibility Matrix).
 *
 * Responsible for: application navigation help, FAQs, troubleshooting,
 * guided onboarding, feature education. NEVER Bible content — that is
 * Companion AI's domain (routes/buddy.js), not this system's.
 *
 * Hard constraints enforced in this file:
 *   1. Answers ONLY from services/helpCenterContentStore.js — the sole
 *      knowledge source, mirroring how Companion AI answers only from the
 *      canonical Scripture corpus. This module never calls OpenAI to
 *      invent an answer; it only ever selects and returns the text of an
 *      existing, human-authored Help Center article.
 *   2. Never answers Bible/doctrine questions — detects and redirects to
 *      Companion AI instead of attempting an answer.
 *   3. When confidence is low, escalates into the existing Admin Decision
 *      Queue (via services/userAssistanceEscalationStore.js, itself read
 *      by services/adminDecisionQueue.js as one more source) rather than
 *      guessing or fabricating.
 *   4. Read-only with respect to production — this module has no write
 *      path to Help Center content, Scripture, or doctrine.
 */

const { listArticles } = require('./helpCenterContentStore');
const { enqueueEscalation } = require('./userAssistanceEscalationStore');

const BIBLE_DOCTRINE_PATTERN = /\b(bible|scripture|verse|god|jesus|christ|holy spirit|pray(er)?|doctrine|salvation|sin|gospel|heaven|hell|faith|worship|church|apostle|prophet|testament|genesis|revelation|psalm|proverbs)\b/i;
const SCRIPTURE_REFERENCE_PATTERN = /\b[1-3]?\s?[A-Za-z]+\s+\d{1,3}(:\d{1,3}(-\d{1,3})?)?\b/;

const LOW_CONFIDENCE_THRESHOLD = 2; // minimum keyword-overlap score to answer confidently

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function scoreArticle(article, questionTokens) {
  const haystack = tokenize(`${article.title} ${article.body} ${(article.tags || []).join(' ')} ${article.category}`);
  const haystackSet = new Set(haystack);
  let score = 0;
  for (const t of questionTokens) if (haystackSet.has(t)) score += 1;
  return score;
}

/**
 * Detect whether a question is Bible/doctrine content, which is
 * Companion AI's domain, not AI-2's. This is a conservative, deterministic
 * heuristic (keyword + Scripture-reference pattern) — false positives
 * (over-referring to Companion AI) are the safe failure direction; this
 * module must never itself attempt to answer Bible content.
 */
function isBibleOrDoctrineQuestion(question) {
  const q = String(question || '');
  return BIBLE_DOCTRINE_PATTERN.test(q) || SCRIPTURE_REFERENCE_PATTERN.test(q);
}

function envelope({ answered, answer = null, article = null, confidence, escalated = false, escalationId = null, redirectToCompanionAI = false, matchedArticles = [] }) {
  return {
    ok: true,
    answered,
    answer,
    article: article ? { id: article.id, title: article.title, category: article.category, tags: article.tags } : null,
    confidence,
    escalated,
    escalationId,
    redirectToCompanionAI,
    matchedArticles: matchedArticles.map((m) => ({ id: m.article.id, title: m.article.title, score: m.score })),
    sourceSystem: 'userAssistanceAssistant',
    requiredApproval: false, // read-only answer from already-approved content; nothing here changes production
  };
}

/**
 * Ask AI-2 a question. Deterministic, bounded, and always returns an
 * answer OR an explicit escalation/redirect — never a fabricated guess.
 */
function askUserAssistance({ question, testerId = null } = {}) {
  const q = String(question || '').trim();
  if (!q) return envelope({ answered: false, confidence: 'NONE' });

  if (isBibleOrDoctrineQuestion(q)) {
    return envelope({
      answered: true,
      answer: 'That sounds like a Bible or Scripture question — please ask Buddy directly in the chat, which is built specifically to answer from Scripture with proper support. I can only help with app navigation, features, account, and troubleshooting questions.',
      confidence: 'HIGH',
      redirectToCompanionAI: true,
    });
  }

  const questionTokens = tokenize(q);
  const articles = listArticles({ limit: 500 });
  const scored = articles
    .map((article) => ({ article, score: scoreArticle(article, questionTokens) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  const top = scored[0];
  if (top && top.score >= LOW_CONFIDENCE_THRESHOLD) {
    return envelope({
      answered: true,
      answer: top.article.body,
      article: top.article,
      confidence: top.score >= LOW_CONFIDENCE_THRESHOLD * 2 ? 'HIGH' : 'MEDIUM',
      matchedArticles: scored.slice(0, 5),
    });
  }

  // Low confidence — escalate rather than fabricate (hard constraint).
  const escalation = enqueueEscalation({
    question: q,
    testerId,
    bestGuessArticleId: top ? top.article.id : null,
    confidence: 'LOW',
    reason: top ? `Best match score ${top.score} below confidence threshold ${LOW_CONFIDENCE_THRESHOLD}.` : 'No Help Center article matched any keyword in the question.',
  });

  return envelope({
    answered: false,
    answer: "I don't have a confident answer for that in the Help Center yet. I've sent your question to the BibleBuddy team for review — you'll be able to see a reply once it's answered.",
    confidence: 'LOW',
    escalated: true,
    escalationId: escalation.id,
    matchedArticles: scored.slice(0, 3),
  });
}

module.exports = {
  askUserAssistance,
  isBibleOrDoctrineQuestion,
  LOW_CONFIDENCE_THRESHOLD,
};
