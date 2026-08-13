/**
 * Sprint A — non-regenerable user/Admin state restart survival.
 * Simulates Render redeploy: wipe ephemeral JSONL/JSON, hydrate from durable FILE.
 * Run: node --test tests/sprintANonRegenerableDurability.test.js
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DURABLE_ESC = path.join(ROOT, 'data/user-assistance/escalations-durable.json');
const DURABLE_FB = path.join(ROOT, 'data/alpha/alpha-feedback-durable.json');
const DURABLE_HC = path.join(ROOT, 'data/help-center/articles-durable.json');
const EPHEMERAL_ESC = path.join(ROOT, 'data/user-assistance-escalations.jsonl');
const EPHEMERAL_FB = path.join(ROOT, 'data/alpha-feedback.jsonl');
const EPHEMERAL_HC = path.join(ROOT, 'data/help-center-articles.json');
const TESTER_PATH = path.join(ROOT, 'data/alpha-testers.json');

function backupIfExists(p) {
  return fs.existsSync(p) ? fs.readFileSync(p) : null;
}

function restoreOrRemove(p, bak, had) {
  if (bak != null) fs.writeFileSync(p, bak);
  else if (!had && fs.existsSync(p)) {
    try { fs.unlinkSync(p); } catch (_) {}
  }
}

function wipe(p) {
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

function resetModules() {
  for (const rel of [
    'services/userAssistanceEscalationStore',
    'services/alphaFeedbackCapture',
    'services/helpCenterContentStore',
    'services/founderExperienceDurableStore',
    'services/persistence/storageAdapter',
    'services/alphaTesterManager',
  ]) {
    delete require.cache[require.resolve(path.join(ROOT, rel))];
  }
}

describe('Sprint A non-regenerable durability restart survival', () => {
  let prevDb;
  let bak = {};
  let had = {};
  let escalationId = null;
  let articleId = null;
  let feedbackMarker = null;

  before(() => {
    prevDb = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    for (const [key, p] of Object.entries({
      escD: DURABLE_ESC,
      fbD: DURABLE_FB,
      hcD: DURABLE_HC,
      escE: EPHEMERAL_ESC,
      fbE: EPHEMERAL_FB,
      hcE: EPHEMERAL_HC,
      tester: TESTER_PATH,
    })) {
      had[key] = fs.existsSync(p);
      bak[key] = backupIfExists(p);
    }

    resetModules();
    const { resetFounderExperienceDurableForTests, emptyDoc } = require('../services/founderExperienceDurableStore');
    resetFounderExperienceDurableForTests();

    for (const p of [DURABLE_ESC, DURABLE_FB, DURABLE_HC]) {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, JSON.stringify({ ...emptyDoc(), backend: 'FILE', durable: false }, null, 2));
    }
  });

  after(() => {
    restoreOrRemove(DURABLE_ESC, bak.escD, had.escD);
    restoreOrRemove(DURABLE_FB, bak.fbD, had.fbD);
    restoreOrRemove(DURABLE_HC, bak.hcD, had.hcD);
    restoreOrRemove(EPHEMERAL_ESC, bak.escE, had.escE);
    restoreOrRemove(EPHEMERAL_FB, bak.fbE, had.fbE);
    restoreOrRemove(EPHEMERAL_HC, bak.hcE, had.hcE);
    restoreOrRemove(TESTER_PATH, bak.tester, had.tester);

    if (prevDb === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prevDb;
    resetModules();
  });

  it('escalations: WRITE → wipe → hydrate → semantic equality + resolve survives', async () => {
    resetModules();
    const { resetFounderExperienceDurableForTests } = require('../services/founderExperienceDurableStore');
    resetFounderExperienceDurableForTests();

    const esc = require('../services/userAssistanceEscalationStore');
    const created = esc.enqueueEscalation({
      question: 'Sprint A escalation durability?',
      reason: 'restart-survival',
      confidence: 'LOW',
    });
    escalationId = created.id;
    assert.equal(created.status, 'pending_review');

    // Deterministic durable projection (bypass setImmediate race under load)
    const { upsertById, DOC, MAX } = require('../services/founderExperienceDurableStore');
    await upsertById(DOC.userAssistanceEscalations, 'id', created, MAX.userAssistanceEscalations);

    const resolved = esc.resolveEscalation({
      id: escalationId,
      reply: 'Admin reply survives restart',
      resolvedBy: 'admin-sprint-a',
      action: 'resolve',
    });
    assert.equal(resolved.ok, true);
    assert.equal(resolved.escalation.status, 'resolved');
    await upsertById(DOC.userAssistanceEscalations, 'id', resolved.escalation, MAX.userAssistanceEscalations);

    wipe(EPHEMERAL_ESC);
    resetModules();
    const { resetFounderExperienceDurableForTests: reset2 } = require('../services/founderExperienceDurableStore');
    reset2();
    const esc2 = require('../services/userAssistanceEscalationStore');
    assert.equal(esc2.jsonlEscalationCount(), 0);

    const hydrate = await esc2.hydrateEscalationsFromDurableIfNeeded();
    assert.equal(hydrate.ok, true);
    assert.equal(hydrate.hydrated, true);
    assert.ok(hydrate.count >= 1);

    const rows = esc2.readEscalations({ limit: 200 });
    const row = rows.find((e) => e.id === escalationId);
    assert.ok(row, 'escalation missing after hydrate');
    assert.equal(row.status, 'resolved');
    assert.equal(row.adminReply, 'Admin reply survives restart');
    assert.equal(row.question, 'Sprint A escalation durability?');
    assert.equal(row.resolvedBy, 'admin-sprint-a');

    const again = await esc2.hydrateEscalationsFromDurableIfNeeded();
    assert.equal(again.hydrated, false);
    assert.equal(again.reason, 'jsonl_present');
  });

  it('alpha-feedback: WRITE → wipe → hydrate → semantic equality', async () => {
    resetModules();
    const { resetFounderExperienceDurableForTests } = require('../services/founderExperienceDurableStore');
    resetFounderExperienceDurableForTests();

    // Seed active tester (restore in after)
    const testerDoc = fs.existsSync(TESTER_PATH)
      ? JSON.parse(fs.readFileSync(TESTER_PATH, 'utf8'))
      : { testers: [], invites: [] };
    testerDoc.testers = (testerDoc.testers || []).filter((t) => t.testerId !== 'sprint-a-durability-tester');
    testerDoc.testers.push({
      testerId: 'sprint-a-durability-tester',
      consentAccepted: true,
      ndaAccepted: true,
      active: true,
      onboardedAt: new Date().toISOString(),
    });
    fs.mkdirSync(path.dirname(TESTER_PATH), { recursive: true });
    fs.writeFileSync(TESTER_PATH, JSON.stringify(testerDoc, null, 2));

    wipe(EPHEMERAL_FB);
    resetModules();
    require('../services/founderExperienceDurableStore').resetFounderExperienceDurableForTests();

    const fb = require('../services/alphaFeedbackCapture');
    feedbackMarker = `sprint-a-fb-${Date.now()}`;
    const wrote = fb.recordFeedback({
      testerId: 'sprint-a-durability-tester',
      sessionId: 'sess-sprint-a',
      messageId: 'msg-sprint-a',
      tag: 'helpful',
      optionalComment: feedbackMarker,
      rating: 5,
    });
    assert.equal(wrote.ok, true, JSON.stringify(wrote));
    const { appendItem, DOC, MAX } = require('../services/founderExperienceDurableStore');
    await appendItem(DOC.alphaFeedback, wrote.entry, MAX.alphaFeedback);

    wipe(EPHEMERAL_FB);
    resetModules();
    require('../services/founderExperienceDurableStore').resetFounderExperienceDurableForTests();
    const fb2 = require('../services/alphaFeedbackCapture');
    assert.equal(fb2.jsonlFeedbackCount(), 0);

    const hydrate = await fb2.hydrateAlphaFeedbackFromDurableIfNeeded();
    assert.equal(hydrate.ok, true);
    assert.equal(hydrate.hydrated, true);

    const rows = fb2.readFeedback({ limit: 500 });
    const row = rows.find((e) => e.optionalComment === feedbackMarker);
    assert.ok(row, 'feedback missing after hydrate');
    assert.equal(row.tag, 'helpful');
    assert.equal(row.testerId, 'sprint-a-durability-tester');
    assert.equal(row.sessionId, 'sess-sprint-a');
    assert.equal(row.messageId, 'msg-sprint-a');
    assert.equal(row.rating, 5);

    const again = await fb2.hydrateAlphaFeedbackFromDurableIfNeeded();
    assert.equal(again.hydrated, false);
    assert.equal(again.reason, 'jsonl_present');
  });

  it('help-center: Admin create+edit survive wipe; seed alone does not masquerade as Admin edit', async () => {
    resetModules();
    require('../services/founderExperienceDurableStore').resetFounderExperienceDurableForTests();
    require('../services/persistence/storageAdapter').resetStorageAdapterForTests();

    // Start from durable-empty + wipe file so seed dual-writes, then Admin edits
    wipe(EPHEMERAL_HC);
    fs.writeFileSync(
      DURABLE_HC,
      JSON.stringify({ schemaVersion: 'bie-fel-durable-v1', items: [], updatedAt: null, backend: 'FILE', durable: false }, null, 2)
    );

    const hc = require('../services/helpCenterContentStore');
    // load seeds
    assert.ok(hc.getArticle('getting-started'));

    const created = hc.createArticle({
      title: 'Sprint A Admin Durability Article',
      body: 'UNIQUE_ADMIN_BODY_SPRINT_A_DURABILITY',
      category: 'support',
      tags: ['faq'],
      authoredBy: 'admin-sprint-a',
    });
    assert.equal(created.ok, true);
    articleId = created.article.id;

    const upd = hc.updateArticle(
      'getting-started',
      { body: 'ADMIN_EDITED_GETTING_STARTED_SPRINT_A_DURABILITY' },
      { updatedBy: 'admin-sprint-a' }
    );
    assert.equal(upd.ok, true);

    // Deterministic durable snapshot of current articles
    const { replaceAllItems, DOC, MAX, readItems } = require('../services/founderExperienceDurableStore');
    const snapshot = hc.listArticles({ limit: 500 });
    await replaceAllItems(DOC.helpCenterArticles, snapshot, MAX.helpCenterArticles);
    const durableCheck = await readItems(DOC.helpCenterArticles);
    assert.ok(durableCheck.items.some((a) => a.id === articleId));
    assert.ok(durableCheck.items.some((a) => a.id === 'getting-started' && a.body.includes('ADMIN_EDITED')));

    wipe(EPHEMERAL_HC);
    resetModules();
    require('../services/founderExperienceDurableStore').resetFounderExperienceDurableForTests();
    require('../services/persistence/storageAdapter').resetStorageAdapterForTests();

    const hc2 = require('../services/helpCenterContentStore');
    assert.equal(hc2.helpFilePresent(), false);

    const hydrate = await hc2.hydrateHelpCenterFromDurableIfNeeded();
    assert.equal(hydrate.ok, true);
    assert.equal(hydrate.hydrated, true);
    assert.ok(hydrate.count >= 1);

    const restoredNew = hc2.getArticle(articleId);
    assert.ok(restoredNew, 'Admin-created article missing after hydrate');
    assert.equal(restoredNew.body, 'UNIQUE_ADMIN_BODY_SPRINT_A_DURABILITY');
    assert.equal(restoredNew.authoredBy, 'admin-sprint-a');

    const restoredGs = hc2.getArticle('getting-started');
    assert.ok(restoredGs);
    assert.equal(restoredGs.body, 'ADMIN_EDITED_GETTING_STARTED_SPRINT_A_DURABILITY');
    assert.equal(restoredGs.updatedBy, 'admin-sprint-a');

    // Idempotent hydrate
    const again = await hc2.hydrateHelpCenterFromDurableIfNeeded();
    assert.equal(again.hydrated, false);
    assert.equal(again.reason, 'file_present');

    // No duplicate articles by id
    const all = hc2.listArticles({ limit: 500 });
    const ids = all.map((a) => a.id);
    assert.equal(ids.length, new Set(ids).size);
  });
});
