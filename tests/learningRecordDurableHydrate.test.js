/**
 * Learning-record durable hydrate — proves dual-write / single-read repair.
 * Run: node --test tests/learningRecordDurableHydrate.test.js
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'bb-lr-hydrate-'));
const DURABLE_PATH = path.join(__dirname, '..', 'data', 'founder-experience', 'learning-records.json');

describe('learningRecordStore durable hydrate', () => {
  let durableBackup = null;
  let hadDurable = false;
  let prevDir = process.env.BIBLEBUDDY_LEARNING_RECORD_DIR;
  let prevDb = process.env.DATABASE_URL;

  before(() => {
    // Force FILE durable backend for this process so we can seed DOC.learningRecords.
    delete process.env.DATABASE_URL;
    process.env.BIBLEBUDDY_LEARNING_RECORD_DIR = TMP;
    hadDurable = fs.existsSync(DURABLE_PATH);
    if (hadDurable) durableBackup = fs.readFileSync(DURABLE_PATH);

    // Reset module caches so DATA_DIR / backend resolve with test env.
    delete require.cache[require.resolve('../services/learningRecordStore')];
    delete require.cache[require.resolve('../services/founderExperienceDurableStore')];
    delete require.cache[require.resolve('../services/persistence/storageAdapter')];

    const { resetFounderExperienceDurableForTests, emptyDoc } = require('../services/founderExperienceDurableStore');
    resetFounderExperienceDurableForTests();

    fs.mkdirSync(path.dirname(DURABLE_PATH), { recursive: true });
    const seed = emptyDoc();
    seed.items = [
      {
        learningRecordId: 'hydrate-test-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        behaviorFamily: 'incomplete_answer',
        adminStatus: 'READY_FOR_ADMIN_REVIEW',
        expectedBehavior: 'hydrate regression fixture',
        packageFingerprint: 'hydrate-test-fp',
        createdAt: '2026-08-12T00:00:00.000Z',
        updatedAt: '2026-08-12T00:00:00.000Z',
      },
    ];
    seed.updatedAt = new Date().toISOString();
    seed.backend = 'FILE';
    seed.durable = false;
    fs.writeFileSync(DURABLE_PATH, JSON.stringify(seed, null, 2), 'utf8');
  });

  after(() => {
    if (durableBackup != null) fs.writeFileSync(DURABLE_PATH, durableBackup);
    else if (!hadDurable && fs.existsSync(DURABLE_PATH)) {
      // Only remove if we created it from empty — if backup null and hadDurable false, delete seed.
      try { fs.unlinkSync(DURABLE_PATH); } catch (_) {}
    }
    if (prevDir === undefined) delete process.env.BIBLEBUDDY_LEARNING_RECORD_DIR;
    else process.env.BIBLEBUDDY_LEARNING_RECORD_DIR = prevDir;
    if (prevDb === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prevDb;
    try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (_) {}
    delete require.cache[require.resolve('../services/learningRecordStore')];
    delete require.cache[require.resolve('../services/founderExperienceDurableStore')];
  });

  it('hydrates JSONL from durable when JSONL is empty', async () => {
    const {
      hydrateLearningRecordsFromDurableIfNeeded,
      listLearningRecords,
      jsonlRecordCount,
    } = require('../services/learningRecordStore');

    assert.equal(jsonlRecordCount(), 0);
    const result = await hydrateLearningRecordsFromDurableIfNeeded();
    assert.equal(result.ok, true);
    assert.equal(result.hydrated, true);
    assert.ok(result.count >= 1);
    assert.ok(jsonlRecordCount() >= 1);

    const rows = listLearningRecords({ limit: 50 });
    assert.ok(rows.some((r) => r.learningRecordId === 'hydrate-test-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'));

    const again = await hydrateLearningRecordsFromDurableIfNeeded();
    assert.equal(again.hydrated, false);
    assert.equal(again.reason, 'jsonl_present');
  });
});
