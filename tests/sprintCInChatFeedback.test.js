/**
 * Sprint C — In-chat per-response feedback vertical slice.
 * Owner: alphaFeedbackCapture (no new durable framework).
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it, after } = require('node:test');

const ROOT = path.join(__dirname, '..');
const EPHEMERAL_FB = path.join(ROOT, 'data', 'alpha-feedback.jsonl');
const DURABLE_FB = path.join(ROOT, 'data', 'alpha', 'alpha-feedback-durable.json');
const INDEX_HTML = path.join(ROOT, 'public', 'index.html');
const BUDDY_ROUTE = path.join(ROOT, 'routes', 'buddy.js');

function wipe(p) {
  try {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch (_) {}
}

function resetModules() {
  Object.keys(require.cache).forEach((k) => {
    if (
      k.includes(`${path.sep}services${path.sep}alphaFeedbackCapture`) ||
      k.includes(`${path.sep}services${path.sep}founderExperienceDurableStore`) ||
      k.includes(`${path.sep}services${path.sep}alphaTesterManager`) ||
      k.includes(`${path.sep}services${path.sep}runtimeHealthMonitor`)
    ) {
      delete require.cache[k];
    }
  });
}

describe('Sprint C in-chat feedback', () => {
  const marker = `sprint-c-fb-${Date.now()}`;
  let guestId = `guest-sc${Date.now().toString(36).slice(-6)}`;

  after(() => {
    // Leave durable test residue for local inspection; ephemeral is fine.
  });

  it('frontend exposes per-response controls and buddy feedback route', () => {
    const html = fs.readFileSync(INDEX_HTML, 'utf8');
    assert.ok(html.includes('buildResponseFeedback'), 'feedback UI builder present');
    assert.ok(html.includes('/buddy/feedback'), 'posts to buddy feedback');
    assert.ok(/Helpful/.test(html) && /Not helpful/.test(html), 'Helpful / Not helpful labels');
    assert.ok(html.includes('Thanks — your feedback was recorded.'), 'truthful success copy');
    assert.ok(!/BibleBuddy learned from this/i.test(html), 'no false learning claim');
    assert.ok(!/We've fixed the answer/i.test(html), 'no false fix claim');

    const route = fs.readFileSync(BUDDY_ROUTE, 'utf8');
    assert.ok(route.includes("router.post('/feedback'"), 'POST /buddy/feedback exists');
    assert.ok(route.includes('messageId: requestId'), 'chat responses expose messageId');
    assert.ok(route.includes("source: 'companion_chat'"), 'companion source set server-side');
  });

  it('validation + guest helpful/not_helpful + privileged fields ignored', () => {
    resetModules();
    const fb = require('../services/alphaFeedbackCapture');

    assert.equal(fb.recordFeedback({ tag: 'helpful' }).ok, false);
    assert.equal(
      fb.recordFeedback({
        testerId: guestId,
        messageId: 'msg-a',
        tag: 'helpful',
        source: 'companion_chat',
      }).ok,
      true
    );
    assert.equal(
      fb.recordFeedback({
        testerId: guestId,
        messageId: 'msg-b',
        tag: 'wrong_doctrine',
        source: 'companion_chat',
      }).ok,
      false
    );
    assert.equal(
      fb.recordFeedback({
        testerId: 'not-a-guest',
        messageId: 'msg-c',
        tag: 'helpful',
        source: 'companion_chat',
      }).ok,
      false
    );
    assert.equal(
      fb.recordFeedback({
        testerId: guestId,
        tag: 'helpful',
        source: 'companion_chat',
      }).ok,
      false
    );

    const wrote = fb.recordFeedback({
      testerId: guestId,
      sessionId: 'sess-c',
      messageId: `msg-${marker}`,
      tag: 'not_helpful',
      optionalComment: marker,
      source: 'companion_chat',
      adminStatus: 'Approved',
      knowledgeActivation: true,
      governanceDisposition: 'ACTIVATE',
    });
    assert.equal(wrote.ok, true);
    assert.equal(wrote.entry.source, 'companion_chat');
    assert.equal(wrote.entry.tag, 'not_helpful');
    assert.equal(wrote.entry.messageId, `msg-${marker}`);
    assert.ok(wrote.entry.feedbackId);
    assert.equal(wrote.entry.adminStatus, undefined);
    assert.equal(wrote.entry.knowledgeActivation, undefined);
    assert.equal(wrote.entry.governanceDisposition, undefined);
  });

  it('duplicate feedback for same guest+message is idempotent', () => {
    resetModules();
    const fb = require('../services/alphaFeedbackCapture');
    const mid = `msg-dup-${marker}`;
    const first = fb.recordFeedback({
      testerId: guestId,
      messageId: mid,
      tag: 'helpful',
      source: 'companion_chat',
    });
    assert.equal(first.ok, true);
    assert.ok(!first.alreadyRecorded);
    const second = fb.recordFeedback({
      testerId: guestId,
      messageId: mid,
      tag: 'not_helpful',
      source: 'companion_chat',
    });
    assert.equal(second.ok, true);
    assert.equal(second.alreadyRecorded, true);
    assert.equal(second.entry.tag, 'helpful');
  });

  it('multiple messages do not cross-wire feedback', () => {
    resetModules();
    const fb = require('../services/alphaFeedbackCapture');
    const g = `guest-mx${Date.now().toString(36).slice(-5)}`;
    const a = fb.recordFeedback({
      testerId: g,
      messageId: 'msg-one',
      tag: 'helpful',
      source: 'companion_chat',
    });
    const b = fb.recordFeedback({
      testerId: g,
      messageId: 'msg-two',
      tag: 'not_helpful',
      optionalComment: 'cross-wire-check',
      source: 'companion_chat',
    });
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
    assert.equal(fb.findFeedbackForMessage(g, 'msg-one').tag, 'helpful');
    assert.equal(fb.findFeedbackForMessage(g, 'msg-two').tag, 'not_helpful');
    assert.notEqual(a.entry.feedbackId, b.entry.feedbackId);
  });

  it('companion feedback: WRITE → wipe → hydrate → correlation preserved', async () => {
    resetModules();
    const { resetFounderExperienceDurableForTests } = require('../services/founderExperienceDurableStore');
    resetFounderExperienceDurableForTests();
    wipe(EPHEMERAL_FB);

    resetModules();
    require('../services/founderExperienceDurableStore').resetFounderExperienceDurableForTests();
    const fb = require('../services/alphaFeedbackCapture');
    const mid = `msg-restart-${marker}`;
    const wrote = fb.recordFeedback({
      testerId: guestId,
      sessionId: 'sess-restart-c',
      messageId: mid,
      tag: 'helpful',
      optionalComment: `restart-${marker}`,
      source: 'companion_chat',
    });
    assert.equal(wrote.ok, true);

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

    const row = fb2.findFeedbackForMessage(guestId, mid);
    assert.ok(row, 'feedback missing after hydrate');
    assert.equal(row.tag, 'helpful');
    assert.equal(row.sessionId, 'sess-restart-c');
    assert.equal(row.messageId, mid);
    assert.equal(row.source, 'companion_chat');
    assert.equal(row.optionalComment, `restart-${marker}`);
  });

  it('Admin readFeedback includes companion feedback rows', () => {
    resetModules();
    const fb = require('../services/alphaFeedbackCapture');
    const rows = fb.readFeedback({ limit: 2000 });
    const hit = rows.find((r) => r.optionalComment === marker || r.optionalComment === `restart-${marker}`);
    assert.ok(hit, 'companion feedback visible to Admin reader');
    assert.ok(hit.messageId, 'message correlation present');
  });
});
