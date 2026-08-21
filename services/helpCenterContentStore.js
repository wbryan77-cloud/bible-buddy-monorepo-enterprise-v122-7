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

 * Durability (Sprint A): local JSON is ephemeral on Render. Dual-write the
 * article set into founderExperienceDurableStore (Postgres when DATABASE_URL
 * is set) and hydrate the local file on boot when empty — so Admin edits
 * survive redeploy. Seed content remains the empty-file fallback when durable
 * is also empty. Not a second Help Center.
 */

const fs = require('fs');
const path = require('path');
const { getStorageAdapter } = require('./persistence/storageAdapter');

const DATA_PATH = path.join(__dirname, '..', 'data', 'help-center-articles.json');

function helpFilePresent() {
  try {
    if (!fs.existsSync(DATA_PATH)) return false;
    const raw = fs.readFileSync(DATA_PATH, 'utf8');
    if (!raw.trim()) return false;
    const doc = JSON.parse(raw);
    return Array.isArray(doc?.articles) && doc.articles.length > 0;
  } catch (_) {
    return false;
  }
}

function dualWriteHelpDurable(doc) {
  setImmediate(() => {
    try {
      const { replaceAllItems, DOC, MAX } = require('./founderExperienceDurableStore');
      const articles = Array.isArray(doc?.articles) ? doc.articles : [];
      replaceAllItems(DOC.helpCenterArticles, articles, MAX.helpCenterArticles).catch((err) => {
        console.warn('[helpCenterContentStore] durable replace failed:', err && err.message ? err.message : err);
      });
    } catch (err) {
      console.warn('[helpCenterContentStore] durable wire failed:', err && err.message ? err.message : err);
    }
  });
}

/**
 * After Render redeploy the local Help file is gone. Durable projections may
 * still hold Admin-authored articles. Hydrate before load() would re-seed.
 * Seed remains the fallback only when durable is also empty.
 */
async function hydrateHelpCenterFromDurableIfNeeded() {
  if (helpFilePresent()) {
    return { ok: true, hydrated: false, reason: 'file_present' };
  }
  let items = [];
  let backend = 'UNKNOWN';
  try {
    const { readItems, DOC } = require('./founderExperienceDurableStore');
    const result = await readItems(DOC.helpCenterArticles);
    items = Array.isArray(result.items) ? result.items : [];
    backend = result.backend || 'UNKNOWN';
  } catch (err) {
    return {
      ok: false,
      hydrated: false,
      reason: 'durable_read_failed',
      error: err && err.message ? err.message : String(err),
    };
  }
  if (!items.length) {
    return { ok: true, hydrated: false, reason: 'durable_empty', backend };
  }
  const doc = { articles: items };
  getStorageAdapter().writeJsonDocument(DATA_PATH, doc);
  return { ok: true, hydrated: true, count: items.length, backend };
}

/** Canonical Getting Started body — must not overclaim exclusive Bible-text answering. */
const GETTING_STARTED_BODY =
  'Type a message in the chat box below (or tap the orb to jump there) to start talking with Buddy. You can ask Bible questions, request a verse, ask for a prayer, or just talk about your day. When Buddy quotes Scripture, it retrieves the actual Bible text rather than inventing verse wording. Some answers also include historical context or pastoral encouragement — those parts are labeled separately from Scripture quotation.';

const GETTING_STARTED_OVERCLAIM_RE =
  /Buddy always answers Scripture questions from the Bible text itself/i;

const NOTIFICATION_PREFS_BODY =
  'In this Founder Alpha build, notification category preferences are available to onboarded alpha testers (feature announcements, maintenance notices, Bible/prayer/lesson reminders). Security alerts stay on. There is not yet a general in-app notification preferences screen for every visitor — nothing is sent until an alpha preference is turned on.';

const FEEDBACK_BODY =
  'After Buddy answers in Companion Chat, you can tap Helpful or Not helpful under that response. You may add an optional short note. Feedback is recorded for the team to review — it does not instantly change BibleBuddy’s answers, and it does not mean a person has replied to you yet. You can also ask the Help Assistant if something feels off.';

const HUMAN_SUPPORT_BODY =
  'BibleBuddy Alpha does not offer phone customer service or a live human hotline. There is no phone number to call for product support in this build. To reach the team: (1) use Helpful / Not helpful under a Buddy reply and optionally add a short note, or (2) ask a question here in Help & Support — low-confidence questions are escalated for human review. Feedback and escalations are reviewed by the Founder/Admin team; they are not an instant chat with a person.';

const STRUCTURED_STUDY_BODY =
  'If you ask for an explicit Bible study — for example “Help me study forgiveness” or “Give me a Bible study on the Sabbath” — Buddy may reply with a Scripture-first study outline: theme, key King James passages, how they connect, and short reflection prompts. Ordinary questions like “What is the Sabbath?” stay conversational. Prayer, grief, and medical concerns still use their normal care paths. Structured study quotes retrieved Scripture; it does not invent verses or by itself change doctrine. If there is not enough retrieved Scripture for a study outline, Buddy answers in normal conversation instead.';

function ensureSeedArticlesPresent(doc) {
  let changed = false;
  if (!doc.articles) doc.articles = [];
  const byId = new Set(doc.articles.map((a) => a.id));
  for (const seed of seedArticles()) {
    if (!byId.has(seed.id)) {
      doc.articles.push(seed);
      changed = true;
    }
  }
  return changed;
}

function repairKnownDocumentationOverclaims(doc) {
  let changed = ensureSeedArticlesPresent(doc);
  for (const article of doc.articles || []) {
    if (article.id === 'getting-started') {
      if (
        GETTING_STARTED_OVERCLAIM_RE.test(String(article.body || '')) ||
        /Tap the chat orb to start talking/i.test(String(article.body || ''))
      ) {
        article.body = GETTING_STARTED_BODY;
        article.updatedAt = new Date().toISOString();
        article.version = Number(article.version || 1) + 1;
        changed = true;
      }
    }
    if (article.id === 'notification-preferences') {
      if (/Use the notification preferences screen/i.test(String(article.body || ''))) {
        article.body = NOTIFICATION_PREFS_BODY;
        article.updatedAt = new Date().toISOString();
        article.version = Number(article.version || 1) + 1;
        changed = true;
      }
    }
    if (article.id === 'how-do-i-give-feedback') {
      const body = String(article.body || '');
      if (
        /There is not yet a per-response/i.test(body) ||
        /feedback control near a response/i.test(body) ||
        /BibleBuddy learned from this/i.test(body) ||
        /We've fixed the answer/i.test(body)
      ) {
        article.body = FEEDBACK_BODY;
        article.updatedAt = new Date().toISOString();
        article.version = Number(article.version || 1) + 1;
        changed = true;
      }
    }
    if (article.id === 'how-do-i-get-a-bible-study') {
      const body = String(article.body || '');
      if (
        !body.trim() ||
        /every answer is a structured lesson/i.test(body) ||
        /Verified Lesson Packet/i.test(body) ||
        !/not enough retrieved Scripture/i.test(body)
      ) {
        article.body = STRUCTURED_STUDY_BODY;
        article.updatedAt = new Date().toISOString();
        article.version = Number(article.version || 1) + 1;
        changed = true;
      }
    }
    if (article.id === 'how-do-i-contact-a-person') {
      const body = String(article.body || '');
      if (!body.trim() || !/does not offer phone/i.test(body)) {
        article.body = HUMAN_SUPPORT_BODY;
        article.updatedAt = new Date().toISOString();
        article.version = Number(article.version || 1) + 1;
        changed = true;
      }
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
      body: NOTIFICATION_PREFS_BODY,
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
      body: FEEDBACK_BODY,
      version: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'how-do-i-contact-a-person',
      title: 'Can I talk to a real person or get phone support?',
      category: 'support',
      tags: ['faq', 'support', 'contact', 'phone', 'human', 'customer-service'],
      body: HUMAN_SUPPORT_BODY,
      version: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'how-do-i-get-a-bible-study',
      title: 'How do I get a structured Bible study?',
      category: 'features',
      tags: ['faq', 'bible', 'study'],
      body: STRUCTURED_STUDY_BODY,
      version: 1,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

const DEFAULT_DOCUMENT = () => ({ articles: seedArticles() });

function needsDocumentationRepair(doc) {
  const articles = doc?.articles || [];
  const ids = new Set(articles.map((a) => a.id));
  if (seedArticles().some((s) => !ids.has(s.id))) return true;
  return articles.some((a) => {
    const body = String(a.body || '');
    if (a.id === 'getting-started' && (GETTING_STARTED_OVERCLAIM_RE.test(body) || /Tap the chat orb to start talking/i.test(body))) {
      return true;
    }
    if (a.id === 'notification-preferences' && /Use the notification preferences screen/i.test(body)) return true;
    if (
      a.id === 'how-do-i-give-feedback' &&
      (/feedback control near a response/i.test(body) ||
        /There is not yet a per-response/i.test(body) ||
        /BibleBuddy learned from this/i.test(body))
    ) {
      return true;
    }
    if (
      a.id === 'how-do-i-get-a-bible-study' &&
      (/every answer is a structured lesson/i.test(body) ||
        /Verified Lesson Packet/i.test(body) ||
        !/not enough retrieved Scripture/i.test(body))
    ) {
      return true;
    }
    if (a.id === 'how-do-i-contact-a-person' && !/does not offer phone/i.test(body)) {
      return true;
    }
    return false;
  });
}

function load() {
  const doc = getStorageAdapter().readJsonDocument(DATA_PATH, null);
  if (doc && Array.isArray(doc.articles)) {
    // Persisted installs keep seed-era wording until Admin edits; repair known
    // documentation overclaims in-place so deploy activates the contract.
    if (needsDocumentationRepair(doc)) {
      return update((current) => {
        repairKnownDocumentationOverclaims(current);
        return current;
      });
    }
    return doc;
  }
  // First run (no file yet) or a corrupt read — seed deterministically and
  // persist so every subsequent reader (this or another process) converges
  // on the same seed rather than each re-seeding independently.
  const seeded = DEFAULT_DOCUMENT();
  getStorageAdapter().writeJsonDocument(DATA_PATH, seeded);
  dualWriteHelpDurable(seeded);
  return seeded;
}

/** Prefer this for any write that first reads the document — it is
 * lock-protected against concurrent writers, unlike a bare load()+save(). */
function update(mutatorFn) {
  const nextDoc = getStorageAdapter().updateJsonDocument(DATA_PATH, (current) => {
    const doc = current && Array.isArray(current.articles) ? current : DEFAULT_DOCUMENT();
    return mutatorFn(doc);
  }, DEFAULT_DOCUMENT());
  dualWriteHelpDurable(nextDoc);
  return nextDoc;
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
  hydrateHelpCenterFromDurableIfNeeded,
  helpFilePresent,
};
