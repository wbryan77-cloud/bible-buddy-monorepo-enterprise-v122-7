/**
 * Full FE governance restart survival — learning + audit + queue reconstruction.
 * Simulates Render redeploy: wipe ephemeral JSONL/overlay, hydrate from durable FILE.
 * Run: node --test tests/governanceRestartSurvival.test.js
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'bb-gov-restart-'));
const ROOT = path.join(__dirname, '..');
const DURABLE_LR = path.join(ROOT, 'data/founder-experience/learning-records.json');
const DURABLE_AUDIT = path.join(ROOT, 'data/admin-command-center/unified-audit-durable.json');
const OVERLAY = path.join(ROOT, 'data/admin-command-center/decision-queue-overlay.json');

describe('governance restart survival (FE + audit)', () => {
  let prevDir;
  let prevDb;
  let lrBackup = null;
  let auditBackup = null;
  let overlayBackup = null;
  let hadLr = false;
  let hadAudit = false;
  let hadOverlay = false;
  let learningRecordId = null;

  before(() => {
    prevDir = process.env.BIBLEBUDDY_LEARNING_RECORD_DIR;
    prevDb = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    process.env.BIBLEBUDDY_LEARNING_RECORD_DIR = TMP;

    hadLr = fs.existsSync(DURABLE_LR);
    hadAudit = fs.existsSync(DURABLE_AUDIT);
    hadOverlay = fs.existsSync(OVERLAY);
    if (hadLr) lrBackup = fs.readFileSync(DURABLE_LR);
    if (hadAudit) auditBackup = fs.readFileSync(DURABLE_AUDIT);
    if (hadOverlay) overlayBackup = fs.readFileSync(OVERLAY);

    // Reset module caches for env-sensitive stores
    for (const rel of [
      'services/learningRecordStore',
      'services/founderExperienceDurableStore',
      'services/adminAuditTrail',
      'services/adminDecisionQueue',
      'services/persistence/storageAdapter',
    ]) {
      delete require.cache[require.resolve(path.join(ROOT, rel))];
    }

    const { resetFounderExperienceDurableForTests, emptyDoc } = require('../services/founderExperienceDurableStore');
    resetFounderExperienceDurableForTests();

    // Seed empty durable docs so FILE backend is clean for this test
    fs.mkdirSync(path.dirname(DURABLE_LR), { recursive: true });
    fs.mkdirSync(path.dirname(DURABLE_AUDIT), { recursive: true });
    fs.writeFileSync(DURABLE_LR, JSON.stringify({ ...emptyDoc(), backend: 'FILE', durable: false }, null, 2));
    fs.writeFileSync(DURABLE_AUDIT, JSON.stringify({ ...emptyDoc(), backend: 'FILE', durable: false }, null, 2));
  });

  after(() => {
    if (lrBackup != null) fs.writeFileSync(DURABLE_LR, lrBackup);
    else if (!hadLr && fs.existsSync(DURABLE_LR)) try { fs.unlinkSync(DURABLE_LR); } catch (_) {}
    if (auditBackup != null) fs.writeFileSync(DURABLE_AUDIT, auditBackup);
    else if (!hadAudit && fs.existsSync(DURABLE_AUDIT)) try { fs.unlinkSync(DURABLE_AUDIT); } catch (_) {}
    if (overlayBackup != null) fs.writeFileSync(OVERLAY, overlayBackup);
    // leave overlay alone if we didn't have backup and file existed with other keys

    if (prevDir === undefined) delete process.env.BIBLEBUDDY_LEARNING_RECORD_DIR;
    else process.env.BIBLEBUDDY_LEARNING_RECORD_DIR = prevDir;
    if (prevDb === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prevDb;

    try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (_) {}
    for (const rel of [
      'services/learningRecordStore',
      'services/founderExperienceDurableStore',
      'services/adminAuditTrail',
      'services/adminDecisionQueue',
      'services/persistence/storageAdapter',
    ]) {
      delete require.cache[require.resolve(path.join(ROOT, rel))];
    }
  });

  it('FE DEFER + audit survive JSONL wipe and reconstruct without overlay', async () => {
    const { createLearningRecord, transitionLearningRecord, hydrateLearningRecordsFromDurableIfNeeded, listLearningRecords, STORE_PATH, INDEX_PATH } = require('../services/learningRecordStore');
    const { recordAdminAuditEvent, hydrateAdminAuditFromDurableIfNeeded, AUDIT_LOG_PATH } = require('../services/adminAuditTrail');
    const { applyDecisionQueueAction, listDecisionQueue, STATUS } = require('../services/adminDecisionQueue');
    const { upsertById, DOC, MAX, readItems } = require('../services/founderExperienceDurableStore');

    const created = createLearningRecord({
      behaviorFamily: 'restart_survival_fixture',
      expectedBehavior: 'survive redeploy',
      confidence: 'medium',
      forceNew: true,
    });
    assert.equal(created.ok, true);
    learningRecordId = created.record.learningRecordId;
    const queueId = `founder-experience:${learningRecordId}`;

    // Force durable projection synchronously (bypass setImmediate race)
    await upsertById(DOC.learningRecords, 'learningRecordId', {
      ...created.record,
      adminStatus: 'READY_FOR_ADMIN_REVIEW',
    }, MAX.learningRecords);

    const deferred = transitionLearningRecord(learningRecordId, 'DEFERRED', {
      actor: 'restart-test',
      note: 'restart survival',
    });
    assert.equal(deferred.ok, true);
    assert.equal(deferred.adminStatus, 'DEFERRED');

    await upsertById(DOC.learningRecords, 'learningRecordId', {
      learningRecordId,
      behaviorFamily: 'restart_survival_fixture',
      expectedBehavior: 'survive redeploy',
      adminStatus: 'DEFERRED',
      packageFingerprint: null,
    }, MAX.learningRecords);

    // Also exercise queue action (writes overlay + audit); then we will delete overlay
    const action = applyDecisionQueueAction({
      id: queueId,
      action: 'defer',
      note: 'restart survival overlay',
      decidedBy: 'restart-test',
    });
    assert.equal(action.ok, true);
    assert.equal(action.status, STATUS.DEFERRED);

    // Dual-write audit already async; also append durable sync for determinism
    const { appendItem } = require('../services/founderExperienceDurableStore');
    await appendItem(DOC.adminUnifiedAudit, {
      action: 'DECISION_QUEUE_DEFER',
      actionType: 'DEFER',
      target: queueId,
      sourceSystem: 'founder-experience',
      category: 'DECISION_QUEUE',
      status: 'COMPLETED',
      at: new Date().toISOString(),
    }, MAX.adminUnifiedAudit);

    // --- Simulate redeploy: wipe ephemeral surfaces ---
    if (fs.existsSync(STORE_PATH)) fs.unlinkSync(STORE_PATH);
    if (fs.existsSync(INDEX_PATH)) fs.unlinkSync(INDEX_PATH);
    if (fs.existsSync(AUDIT_LOG_PATH)) fs.unlinkSync(AUDIT_LOG_PATH);
    // Remove only our overlay key if overlay exists
    if (fs.existsSync(OVERLAY)) {
      const ov = JSON.parse(fs.readFileSync(OVERLAY, 'utf8'));
      delete ov[queueId];
      fs.writeFileSync(OVERLAY, JSON.stringify(ov, null, 2));
    }

    assert.equal(listLearningRecords({ limit: 50 }).length, 0, 'jsonl wiped');

    const lrHydrate = await hydrateLearningRecordsFromDurableIfNeeded();
    assert.equal(lrHydrate.hydrated, true, `learning hydrate: ${JSON.stringify(lrHydrate)}`);
    const rows = listLearningRecords({ limit: 50 });
    const hit = rows.find((r) => r.learningRecordId === learningRecordId);
    assert.ok(hit, 'learning record restored');
    assert.equal(hit.adminStatus, 'DEFERRED');

    const auditHydrate = await hydrateAdminAuditFromDurableIfNeeded();
    assert.equal(auditHydrate.hydrated, true, `audit hydrate: ${JSON.stringify(auditHydrate)}`);
    assert.ok(fs.existsSync(AUDIT_LOG_PATH));
    const auditRaw = fs.readFileSync(AUDIT_LOG_PATH, 'utf8');
    assert.ok(auditRaw.includes('DECISION_QUEUE_DEFER'));
    assert.ok(auditRaw.includes(queueId));

    // Queue reconstructs Deferred from durable adminStatus WITHOUT overlay
    const q = listDecisionQueue({ limit: 200 });
    const item = (q.items || []).find((i) => i.id === queueId);
    assert.ok(item, 'queue contains FE item after hydrate');
    assert.equal(item.status, STATUS.DEFERRED, 'Deferred survives overlay loss');

    // Empty durable → empty hydrate is legitimate (not false failure)
    const durableNow = await readItems(DOC.learningRecords);
    assert.ok(Array.isArray(durableNow.items));
  });
});
