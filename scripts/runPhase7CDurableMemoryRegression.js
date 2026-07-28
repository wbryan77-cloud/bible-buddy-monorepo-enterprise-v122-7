#!/usr/bin/env node
/**
 * Phase 7C Layer 1/2 — Durable user memory regression (owner + lifecycle).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const durable = require('../services/durableUserMemory');
const { recordRelationshipSignal, getRelationshipContext, forgetUserMemory } = require('../services/relationshipMemoryEngine');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs/recovery/phase7c/fixtures/durable-memory-results.json');
const results = [];

function push(id, pass, detail) {
  results.push({ id, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${id} — ${detail}`);
}

async function run() {
  durable.resetDurableBackendForTests();
  const status = durable.getStatus();
  push('owner_named', status.owner === 'durableUserMemory', JSON.stringify(status));

  const u1 = `p7c-a-${Date.now()}`;
  const u2 = `p7c-b-${Date.now()}`;
  await durable.ensureHydrated(u1);
  await durable.ensureHydrated(u2);

  durable.upsertMemory({
    userId: u1,
    memoryType: durable.MEMORY_TYPES.ACTIVE_BURDEN,
    subject: 'dad',
    content: 'dad is in the hospital',
    consentStatus: 'user_requested',
    retentionScope: 'long_term',
    confidence: durable.CONFIDENCE.CONFIRMED,
  });
  durable.upsertMemory({
    userId: u1,
    memoryType: durable.MEMORY_TYPES.PRAYER_SUBJECT,
    subject: 'dad',
    content: 'Please remember my dad is having surgery. Pray for dad.',
    consentStatus: 'user_requested',
  });
  await durable.flushUser(u1);

  // Simulate restart
  durable.resetDurableBackendForTests();
  await durable.ensureHydrated(u1);
  let f = durable.buildCompanionFields(u1);
  push('survives_restart_sim', /hospital|surgery/i.test(f.currentStruggle || f.lastPrayerRequest || ''), JSON.stringify(f));

  // Isolation
  await durable.ensureHydrated(u2);
  const f2 = durable.buildCompanionFields(u2);
  push('isolation', !f2.currentStruggle && !f2.lastPrayerRequest, JSON.stringify(f2));

  // Resolve
  durable.resolveBurden({ userId: u1, subject: 'dad', content: 'Dad is home now' });
  await durable.flushUser(u1);
  durable.resetDurableBackendForTests();
  await durable.ensureHydrated(u1);
  f = durable.buildCompanionFields(u1);
  push('resolved', f.recentConcern === 'resolved' && !/hospital/i.test(f.currentStruggle || ''), JSON.stringify(f));

  // Correction via supersede person
  durable.upsertMemory({
    userId: u1,
    memoryType: durable.MEMORY_TYPES.IMPORTANT_PERSON,
    subject: 'son',
    content: 'son name Michael',
    normalizedValue: 'Michael',
  });
  durable.upsertMemory({
    userId: u1,
    memoryType: durable.MEMORY_TYPES.IMPORTANT_PERSON,
    subject: 'son',
    content: 'son name William',
    normalizedValue: 'William',
    confidence: durable.CONFIDENCE.CONFIRMED,
  });
  await durable.flushUser(u1);
  durable.resetDurableBackendForTests();
  await durable.ensureHydrated(u1);
  const people = durable.listActive(u1, { types: [durable.MEMORY_TYPES.IMPORTANT_PERSON] });
  const son = people.filter((p) => p.subject === 'son');
  push('correction_supersede', son.length === 1 && /William/i.test(son[0].content), JSON.stringify(son));

  // Deletion
  durable.upsertMemory({
    userId: u1,
    memoryType: durable.MEMORY_TYPES.ACTIVE_BURDEN,
    subject: 'mother',
    content: 'mother is sick',
  });
  durable.softDeleteMatching(u1, { about: 'mother' });
  await durable.flushUser(u1);
  durable.resetDurableBackendForTests();
  await durable.ensureHydrated(u1);
  const motherLeft = durable.listActive(u1).filter((r) => /mother/i.test(`${r.subject} ${r.content}`));
  push('deletion', motherLeft.length === 0, JSON.stringify(motherLeft));

  // Engine integration
  const ue = `p7c-eng-${Date.now()}`;
  await durable.ensureHydrated(ue);
  recordRelationshipSignal({ userId: ue, message: 'Please remember that my dad is in the hospital.' });
  await durable.flushUser(ue);
  durable.resetDurableBackendForTests();
  await durable.ensureHydrated(ue);
  const ctx = getRelationshipContext({ userId: ue });
  push('engine_merge', /hospital|dad/i.test(ctx.currentStruggle || ctx.lastPrayerRequest || ''), JSON.stringify({
    struggle: ctx.currentStruggle,
    prayer: ctx.lastPrayerRequest,
    backend: ctx.durableBackend,
  }));

  forgetUserMemory({ userId: ue });
  await durable.flushUser(ue);
  durable.resetDurableBackendForTests();
  await durable.ensureHydrated(ue);
  const cleared = getRelationshipContext({ userId: ue });
  push('forget_clears_durable', !cleared.currentStruggle, JSON.stringify(cleared.currentStruggle));

  const passed = results.filter((r) => r.pass).length;
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ passed, total: results.length, status, results }, null, 2));
  console.log(`\nPhase 7C durable: ${passed}/${results.length} backend=${status.backend} durable=${status.durable}`);
  if (passed < results.length) process.exitCode = 1;
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
