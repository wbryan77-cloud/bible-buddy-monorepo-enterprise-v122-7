/**
 * ENTERPRISE_OPERATIONS_FOUNDATION Phase 1B — Help Center content store.
 * User Engagement Platform, Deliverable 7 §2/§3.
 *
 * A small, versioned, human-curated, file-based content store — the same
 * persistence pattern already used throughout this codebase (see
 * data/alpha-testers.json, data/support-graph-candidates.jsonl, etc.), not
 * a new persistence paradigm.
 *
 * FAQs are simply articles tagged `faq: true` (Deliverable 7 §3) — there is
 * no second content model.
 *
 * This is the ONLY knowledge source for AI-2 (User Assistance AI, see
 * services/userAssistanceAssistant.js) — that system must never answer
 * from anywhere else, mirroring how Companion AI answers only from the
 * canonical Scripture corpus.
 *
 * Authoring (create/update) is Admin-only at the route layer
 * (routes/bibleAuthorityAdmin.js, gated by the shared checkAdminAuth).
 * This module itself has no auth opinion — it is a plain data store.
 *
 * PHASE_2_ENTERPRISE_OPTIMIZATION — Persistence (objective 2), proof of
 * concept. Migrated onto services/persistence/storageAdapter.js: reads and
 * writes for this store now go through the shared adapter instead of raw
 * `fs` calls. Behavior is identical (same file, same JSON shape, same
 * every function signature below) — the only change is that concurrent
 * create/update/delete calls across processes are now lock-protected
 * instead of racing on a bare `writeFileSync`. Chosen as the first store to
 * migrate because it is low-traffic, admin-authored, and not on the Buddy
 * Chat hot path — see the Phase 2 migration runbook for why the ~20
 * higher-traffic conversation-memory stores are sequenced later.
 */

const path = require('path');
const { getStorageAdapter } = require('./persistence/storageAdapter');

const DATA_PATH = path.join(__dirname, '..', 'data', 'help-center-articles.json');

/** Canonical Getting Started body — must not overclaim exclusive Bible-text answering. */
const GETTING_STARTED_BODY =
  'Tap the chat orb to start talking with Buddy. You can ask Bible questions, request a verse, ask for a prayer, or just talk about your day. When Buddy quotes Scripture, it retrieves the actual Bible text rather than inventing verse wording. Some answers also include historical context or pastoral encouragement — those parts are labeled separately from Scripture quotation.';

const GETTING_STARTED_OVERCLAIM_RE =
  /Buddy always answers Scripture questions from the Bible text itself/i;

function repairKnownDocumentationOverclaims(doc) {
  let changed = false;
  for (const article of doc.articles || []) {
    if (article.id === 'getting-started' && GETTING_STARTED_OVERCLAIM_RE.test(String(article.body || ''))) {
      article.body = GETTING_STARTED_BODY;
      article.updatedAt = new Date().toISOString();
      article.version = Number(article.version || 1) + 1;
      changed = true;
    }
  }
  return changed;
}

function seedArticles() {
  const now = new Date().toISOString();
  return [
    {
      id: 'getting-started',
      title: 'Getting started with BibleBuddy',
      category: 'onboarding',
      tags: ['faq', 'onboarding', 'navigation'],
      body: GETTING_STARTED_BODY,
      version: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'how-do-i-ask-a-bible-question',
      title: 'How do I ask a Bible question?',
      category: 'features',
      tags: ['faq', 'bible', 'navigation'],
      body: 'Type your question in the chat box the same way you would ask a friend, for example "What does the Bible say about forgiveness?" Buddy will retrieve and quote the actual Scripture text rather than generating it, and will show supporting cross-references when available.',
      version: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'how-do-i-ask-for-prayer',
      title: 'How do I ask Buddy to pray with me?',
      category: 'features',
      tags: ['faq', 'prayer'],
      body: 'Just tell Buddy what is on your heart and ask for prayer, for example "Can we pray about my job search?" Buddy will offer a short prayer and can follow up with relevant Scripture if you would like.',
      version: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'notification-preferences',
      title: 'How do I control my notifications?',
      category: 'account',
      tags: ['faq', 'notifications', 'account'],
      body: 'You control every notification category except security alerts, which are always delivered. Use the notification preferences screen (or ask Buddy) to turn on/off feature announcements, maintenance notices, Bible/prayer/lesson reminders. Nothing is sent until you turn a category on.',
      version: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'is-my-conversation-private',
      title: 'Is my conversation with Buddy private?',
      category: 'account',
      tags: ['faq', 'privacy', 'account'],
      body: 'Your conversation content is not shared publicly. Aggregate, non-identifying usage counters (for example, how many people asked about prayer this week) may be used to improve BibleBuddy, but individual message text and identity are not exposed in those counters.',
      version: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'why-did-buddy-give-a-generic-answer',
      title: 'Why did Buddy give a short/generic answer?',
      category: 'troubleshooting',
      tags: ['faq', 'troubleshooting'],
      body: 'Occasionally Buddy falls back to a safe, general response if it cannot confidently retrieve a well-supported Scripture answer, rather than guessing. If this happens often for a specific question, please use feedback or ask a Help Assistant question so it can be reviewed.',
      version: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'how-do-i-give-feedback',
      title: 'How do I give feedback on a response?',
      category: 'support',
      tags: ['faq', 'feedback'],
      body: 'Use the feedback control near a response to rate it and optionally add a tag/comment describing what was off (for example, "too generic" or "didn\'t answer my question"). This feeds directly into the team\'s review process.',
      version: 1,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

const DEFAULT_DOCUMENT = () => ({ articles: seedArticles() });

function load() {
  const doc = getStorageAdapter().readJsonDocument(DATA_PATH, null);
  if (doc && Array.isArray(doc.articles)) {
    // Persisted installs keep seed-era wording until Admin edits; repair the
    // known documentation overclaim in-place so deploy activates the contract.
    if (
      doc.articles.some(
        (a) => a.id === 'getting-started' && GETTING_STARTED_OVERCLAIM_RE.test(String(a.body || ''))
      )
    ) {
      return getStorageAdapter().updateJsonDocument(
        DATA_PATH,
        (current) => {
          const next = current && Array.isArray(current.articles) ? current : DEFAULT_DOCUMENT();
          repairKnownDocumentationOverclaims(next);
          return next;
        },
        DEFAULT_DOCUMENT()
      );
    }
    return doc;
  }
  // First run (no file yet) or a corrupt read — seed deterministically and
  // persist so every subsequent reader (this or another process) converges
  // on the same seed rather than each re-seeding independently.
  const seeded = DEFAULT_DOCUMENT();
  getStorageAdapter().writeJsonDocument(DATA_PATH, seeded);
  return seeded;
}

/** Prefer this for any write that first reads the document — it is
 * lock-protected against concurrent writers, unlike a bare load()+save(). */
function update(mutatorFn) {
  return getStorageAdapter().updateJsonDocument(DATA_PATH, (current) => {
    const doc = current && Array.isArray(current.articles) ? current : DEFAULT_DOCUMENT();
    return mutatorFn(doc);
  }, DEFAULT_DOCUMENT());
}

function listArticles({ tag = null, category = null, query = null, limit = 100 } = {}) {
  const data = load();
  let articles = data.articles;
  if (tag) articles = articles.filter((a) => (a.tags || []).includes(tag));
  if (category) articles = articles.filter((a) => a.category === category);
  if (query) {
    const q = String(query).toLowerCase();
    articles = articles.filter((a) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q));
  }
  return articles.slice(0, Math.min(Number(limit) || 100, 500));
}

function getArticle(id) {
  return load().articles.find((a) => a.id === id) || null;
}

function slugify(title) {
  return String(title || 'article')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || `article-${Date.now()}`;
}

function createArticle({ title, body, category = 'general', tags = [], authoredBy = 'admin' } = {}) {
  if (!title || !body) return { ok: false, error: 'title and body are required.' };
  let created = null;
  update((data) => {
    let id = slugify(title);
    let suffix = 1;
    while (data.articles.some((a) => a.id === id)) {
      id = `${slugify(title)}-${suffix}`;
      suffix += 1;
    }
    const now = new Date().toISOString();
    created = {
      id,
      title: String(title).slice(0, 160),
      category: String(category).slice(0, 60),
      tags: Array.isArray(tags) ? tags.slice(0, 10) : [],
      body: String(body).slice(0, 8000),
      version: 1,
      authoredBy,
      createdAt: now,
      updatedAt: now,
    };
    data.articles.push(created);
    return data;
  });
  return { ok: true, article: created };
}

function updateArticle(id, updates = {}, { updatedBy = 'admin' } = {}) {
  let result = { ok: false, error: 'Article not found.' };
  update((data) => {
    const idx = data.articles.findIndex((a) => a.id === id);
    if (idx < 0) return data;
    const prev = data.articles[idx];
    data.articles[idx] = {
      ...prev,
      title: updates.title !== undefined ? String(updates.title).slice(0, 160) : prev.title,
      body: updates.body !== undefined ? String(updates.body).slice(0, 8000) : prev.body,
      category: updates.category !== undefined ? String(updates.category).slice(0, 60) : prev.category,
      tags: Array.isArray(updates.tags) ? updates.tags.slice(0, 10) : prev.tags,
      version: (prev.version || 1) + 1,
      updatedBy,
      updatedAt: new Date().toISOString(),
    };
    result = { ok: true, article: data.articles[idx] };
    return data;
  });
  return result;
}

function deleteArticle(id) {
  let result = { ok: false, error: 'Article not found.' };
  update((data) => {
    const idx = data.articles.findIndex((a) => a.id === id);
    if (idx < 0) return data;
    const [removed] = data.articles.splice(idx, 1);
    result = { ok: true, removed };
    return data;
  });
  return result;
}

function getStats() {
  const articles = load().articles;
  return {
    total: articles.length,
    faqCount: articles.filter((a) => (a.tags || []).includes('faq')).length,
    byCategory: articles.reduce((acc, a) => { acc[a.category] = (acc[a.category] || 0) + 1; return acc; }, {}),
  };
}

module.exports = {
  DATA_PATH,
  listArticles,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
  getStats,
};
