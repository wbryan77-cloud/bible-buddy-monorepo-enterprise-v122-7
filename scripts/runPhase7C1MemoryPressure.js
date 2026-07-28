#!/usr/bin/env node
/**
 * Phase 7C.1 — Memory pressure validation against durableUserMemory (existing owner).
 * Does not create a new memory system.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  selectRelationshipContext,
  extractPrayerSubjectFromMessage,
} = require('../services/relationshipContextSelector');
const durable = require('../services/durableUserMemory');
const { recordRelationshipSignal, getRelationshipContext } = require('../services/relationshipMemoryEngine');

const OUT = path.join(__dirname, '..', 'docs/recovery/phase7c/fixtures/memory-pressure-results.json');

async function run() {
  durable.resetDurableBackendForTests();
  const userId = `pressure-${Date.now()}`;
  await durable.ensureHydrated(userId);

  const people = ['dad', 'mom', 'son', 'daughter', 'uncle', 'aunt', 'brother', 'sister', 'friend', 'pastor'];
  const topics = ['surgery', 'hospital', 'job', 'anxiety', 'bible study', 'sabbath', 'prayer', 'grief', 'hope', 'travel'];

  // 100 remembered facts
  for (let i = 0; i < 100; i++) {
    const person = people[i % people.length];
    const topic = topics[i % topics.length];
    durable.upsertMemory({
      userId,
      memoryType: i % 5 === 0 ? durable.MEMORY_TYPES.PRAYER_SUBJECT : durable.MEMORY_TYPES.ACTIVE_BURDEN,
      subject: person,
      content: `${person} fact ${i}: ${topic}`,
      confidence: durable.CONFIDENCE.MEDIUM,
      provenance: durable.PROVENANCE.PRIOR_CONVERSATION,
    });
  }
  // Current turn: pray for dad surgery — should rank dad, not dump 100 facts
  recordRelationshipSignal({ userId, message: 'Please pray for my dad. He has surgery tomorrow.' });
  await durable.flushUser(userId);

  durable.resetDurableBackendForTests();
  await durable.ensureHydrated(userId);
  const ctx = selectRelationshipContext({ userId, message: 'Pray with me for my dad.' });
  const rel = getRelationshipContext({ userId });
  const person = extractPrayerSubjectFromMessage('Pray with me for my dad.');

  const active = durable.listActive(userId);
  const burdens = active.filter((r) => r.memoryType === durable.MEMORY_TYPES.ACTIVE_BURDEN);
  const prayers = active.filter((r) => r.memoryType === durable.MEMORY_TYPES.PRAYER_SUBJECT);

  const result = {
    totalActive: active.length,
    burdens: burdens.length,
    prayers: prayers.length,
    extractedPerson: person?.person || null,
    importantPeople: ctx.importantPeople || [],
    activeBurdensSample: (ctx.activeBurdens || []).slice(0, 3),
    prayerLast: rel.lastPrayerRequest || null,
    profileDumpRisk: (ctx.activeBurdens || []).length > 5,
    staleUnrelatedForced: /uncle|aunt|pastor|travel/i.test(JSON.stringify(ctx.activeBurdens || [])) &&
      !/dad/i.test(JSON.stringify(ctx.importantPeople || [])),
    precisionOk: person?.person === 'dad' && /dad/i.test(JSON.stringify(ctx.importantPeople || [])),
    rankingOk: /surgery|dad/i.test(JSON.stringify(ctx.activeBurdens || []) + (rel.lastPrayerRequest || '')),
  };

  result.pass =
    result.precisionOk &&
    result.rankingOk &&
    !result.profileDumpRisk &&
    !result.staleUnrelatedForced &&
    result.totalActive <= 40 && // supersession keeps active set bounded under pressure
    result.extractedPerson === 'dad';
  result.note =
    'Under load, upsert supersession collapses same-subject records — context selection stays dad/surgery focused rather than dumping 100 facts.';


  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  console.log(result.pass ? 'PRESSURE_PASS' : 'PRESSURE_FAIL');
  if (!result.pass) process.exitCode = 1;
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
