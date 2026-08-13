/**
 * Sprint B Class C — FI dispositions, SG decisions, alpha tester prefs survive wipe.
 * Run: node --test tests/sprintBGovernanceAndPrefsDurability.test.js
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DURABLE_FI = path.join(ROOT, 'data/founder-intelligence/dispositions-durable.json');
const DURABLE_SG = path.join(ROOT, 'data/support-graph/decisions-durable.json');
const DURABLE_AT = path.join(ROOT, 'data/alpha/alpha-testers-durable.json');
const INDEX = path.join(ROOT, 'data/founder-intelligence/recommendation-index.json');
const FI_DECISIONS = path.join(ROOT, 'data/founder-intelligence/decisions.jsonl');
const SG_DECISIONS = path.join(ROOT, 'data/support-graph-candidate-decisions.jsonl');
const ALPHA = path.join(ROOT, 'data/alpha-testers.json');

function bak(p) {
  return fs.existsSync(p) ? fs.readFileSync(p) : null;
}
function restore(p, b, had) {
  if (b != null) fs.writeFileSync(p, b);
  else if (!had && fs.existsSync(p)) try { fs.unlinkSync(p); } catch (_) {}
}
function wipe(p) {
  if (fs.existsSync(p)) fs.unlinkSync(p);
}
function reset(mods) {
  for (const rel of mods) {
    try { delete require.cache[require.resolve(path.join(ROOT, rel))]; } catch (_) {}
  }
}

describe('Sprint B FI/SG/alpha-pref durability', () => {
  let prevDb;
  const paths = { DURABLE_FI, DURABLE_SG, DURABLE_AT, INDEX, FI_DECISIONS, SG_DECISIONS, ALPHA };
  const had = {};
  const backup = {};

  before(() => {
    prevDb = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    for (const [k, p] of Object.entries(paths)) {
      had[k] = fs.existsSync(p);
      backup[k] = bak(p);
    }
    reset([
      'services/founderExperienceDurableStore',
      'services/founderIntelligenceRecommendationStore',
      'services/supportGraphCandidateQueue',
      'services/alphaTesterManager',
      'services/persistence/storageAdapter',
    ]);
    const { resetFounderExperienceDurableForTests, emptyDoc } = require('../services/founderExperienceDurableStore');
    resetFounderExperienceDurableForTests();
    for (const p of [DURABLE_FI, DURABLE_SG, DURABLE_AT]) {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, JSON.stringify({ ...emptyDoc(), backend: 'FILE', durable: false }, null, 2));
    }
  });

  after(() => {
    for (const [k, p] of Object.entries(paths)) restore(p, backup[k], had[k]);
    if (prevDb === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prevDb;
    reset([
      'services/founderExperienceDurableStore',
      'services/founderIntelligenceRecommendationStore',
      'services/supportGraphCandidateQueue',
      'services/alphaTesterManager',
      'services/persistence/storageAdapter',
    ]);
  });

  it('FI REJECTED survives index wipe + hydrate + sync', async () => {
    reset([
      'services/founderExperienceDurableStore',
      'services/founderIntelligenceRecommendationStore',
      'services/persistence/storageAdapter',
    ]);
    require('../services/founderExperienceDurableStore').resetFounderExperienceDurableForTests();
    wipe(INDEX);
    wipe(FI_DECISIONS);

    const fi = require('../services/founderIntelligenceRecommendationStore');
    const { upsertById, DOC, MAX } = require('../services/founderExperienceDurableStore');
    const rec = { type: 'coverage_gap', title: 'Sprint B FI durability', reference: 'gen-1', topicIds: ['t1'] };
    fi.syncRecommendations([rec]);
    const id = fi.stableRecommendationId(rec);
    const decided = fi.recordAdminDecision({
      id,
      decision: fi.STATUS.REJECTED,
      decidedBy: 'admin-sprint-b',
      note: 'reject-survives',
      flaggedFalsePositive: true,
    });
    assert.equal(decided.ok, true);
    await upsertById(DOC.founderIntelligenceDispositions, 'id', decided.recommendation, MAX.founderIntelligenceDispositions);

    wipe(INDEX);
    wipe(FI_DECISIONS);
    reset([
      'services/founderExperienceDurableStore',
      'services/founderIntelligenceRecommendationStore',
      'services/persistence/storageAdapter',
    ]);
    require('../services/founderExperienceDurableStore').resetFounderExperienceDurableForTests();
    const fi2 = require('../services/founderIntelligenceRecommendationStore');
    assert.equal(Object.keys(fi2.listRecommendations()).length, 0);

    const hydrate = await fi2.hydrateFounderIntelligenceFromDurableIfNeeded();
    assert.equal(hydrate.hydrated, true, JSON.stringify(hydrate));
    const restored = fi2.getRecommendation(id);
    assert.ok(restored);
    assert.equal(restored.status, 'REJECTED');
    assert.equal(restored.flaggedFalsePositive, true);
    assert.equal(restored.note, 'reject-survives');

    // Re-observe must KEEP rejection (contract)
    fi2.syncRecommendations([rec]);
    assert.equal(fi2.getRecommendation(id).status, 'REJECTED');
  });

  it('SG Admin decision survives JSONL wipe + hydrate', async () => {
    reset([
      'services/founderExperienceDurableStore',
      'services/supportGraphCandidateQueue',
      'services/persistence/storageAdapter',
    ]);
    require('../services/founderExperienceDurableStore').resetFounderExperienceDurableForTests();
    wipe(SG_DECISIONS);

    const sg = require('../services/supportGraphCandidateQueue');
    const { appendItem, DOC, MAX } = require('../services/founderExperienceDurableStore');
    const decision = sg.recordCandidateDecision({
      candidateId: 'sg-sprint-b-durability-1',
      action: 'reject',
      decidedBy: 'admin-sprint-b',
      note: 'sg-reject-survives',
    });
    await appendItem(DOC.supportGraphDecisions, decision, MAX.supportGraphDecisions);

    wipe(SG_DECISIONS);
    reset([
      'services/founderExperienceDurableStore',
      'services/supportGraphCandidateQueue',
      'services/persistence/storageAdapter',
    ]);
    require('../services/founderExperienceDurableStore').resetFounderExperienceDurableForTests();
    const sg2 = require('../services/supportGraphCandidateQueue');
    const hydrate = await sg2.hydrateSupportGraphDecisionsFromDurableIfNeeded();
    assert.equal(hydrate.hydrated, true, JSON.stringify(hydrate));
    assert.ok(fs.existsSync(SG_DECISIONS));
    const raw = fs.readFileSync(SG_DECISIONS, 'utf8');
    assert.ok(raw.includes('sg-sprint-b-durability-1'));
    assert.ok(raw.includes('rejected'));
    assert.ok(raw.includes('sg-reject-survives'));
  });

  it('alpha notification prefs survive file wipe + hydrate', async () => {
    reset([
      'services/founderExperienceDurableStore',
      'services/alphaTesterManager',
      'services/persistence/storageAdapter',
    ]);
    require('../services/founderExperienceDurableStore').resetFounderExperienceDurableForTests();
    wipe(ALPHA);

    const atm = require('../services/alphaTesterManager');
    const { replaceAllItems, DOC, MAX } = require('../services/founderExperienceDurableStore');
    // Seed a tester via file write then set preference through owner
    fs.mkdirSync(path.dirname(ALPHA), { recursive: true });
    fs.writeFileSync(
      ALPHA,
      JSON.stringify({
        testers: [{
          testerId: 'sprint-b-pref-tester',
          consentAccepted: true,
          ndaAccepted: true,
          active: true,
          notificationPreference: 'off',
          categoryPreferences: {},
        }],
        invites: [],
      }, null, 2)
    );
    reset(['services/alphaTesterManager']);
    const atm2 = require('../services/alphaTesterManager');
    const set = atm2.setCategoryPreference('sprint-b-pref-tester', 'feature_announcements', true);
    assert.equal(set.ok, true);
    atm2.updateNotificationPreference('sprint-b-pref-tester', 'morning', false);

    const testers = atm2.load().testers;
    await replaceAllItems(DOC.alphaTesters, testers, MAX.alphaTesters);

    wipe(ALPHA);
    reset([
      'services/founderExperienceDurableStore',
      'services/alphaTesterManager',
      'services/persistence/storageAdapter',
    ]);
    require('../services/founderExperienceDurableStore').resetFounderExperienceDurableForTests();
    const atm3 = require('../services/alphaTesterManager');
    const hydrate = await atm3.hydrateAlphaTestersFromDurableIfNeeded();
    assert.equal(hydrate.hydrated, true, JSON.stringify(hydrate));
    const prefs = atm3.getCategoryPreferences('sprint-b-pref-tester');
    assert.equal(prefs.feature_announcements, true);
    const t = atm3.getTester('sprint-b-pref-tester');
    assert.equal(t.notificationPreference, 'morning');
    assert.equal(t.consentAccepted, true);
  });
});
