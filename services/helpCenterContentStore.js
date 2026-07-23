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
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'help-center-articles.json');

function seedArticles() {
  const now = new Date().toISOString();
  return [
    {
      id: 'getting-started',
      title: 'Getting started with BibleBuddy',
      category: 'onboarding',
      tags: ['faq', 'onboarding', 'navigation'],
      body: 'Tap the chat orb to start talking with Buddy. You can ask Bible questions, request a verse, ask for a prayer, or just talk about your day. Buddy always answers Scripture questions from the Bible text itself — never from invented text.',
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

function ensureLoaded() {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify({ articles: seedArticles() }, null, 2), 'utf8');
  }
}

function load() {
  ensureLoaded();
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    return { articles: raw.articles || [] };
  } catch (e) {
    console.warn('[helpCenterContentStore] read failed, treating as empty:', e.message);
    return { articles: [] };
  }
}

function save(data) {
  ensureLoaded();
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
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
  const data = load();
  let id = slugify(title);
  let suffix = 1;
  while (data.articles.some((a) => a.id === id)) {
    id = `${slugify(title)}-${suffix}`;
    suffix += 1;
  }
  const now = new Date().toISOString();
  const article = {
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
  data.articles.push(article);
  save(data);
  return { ok: true, article };
}

function updateArticle(id, updates = {}, { updatedBy = 'admin' } = {}) {
  const data = load();
  const idx = data.articles.findIndex((a) => a.id === id);
  if (idx < 0) return { ok: false, error: 'Article not found.' };
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
  save(data);
  return { ok: true, article: data.articles[idx] };
}

function deleteArticle(id) {
  const data = load();
  const idx = data.articles.findIndex((a) => a.id === id);
  if (idx < 0) return { ok: false, error: 'Article not found.' };
  const [removed] = data.articles.splice(idx, 1);
  save(data);
  return { ok: true, removed };
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
