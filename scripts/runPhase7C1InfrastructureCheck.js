#!/usr/bin/env node
/**
 * Phase 7C.1 — Production activation checker.
 * Read-only unless DATABASE_URL is present (then verifies Postgres connectivity).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const BASE = process.env.BUDDY_BASE_URL || 'https://bible-buddy-monorepo-enterprise-v122-7.onrender.com';
const OUT = path.join(__dirname, '..', 'docs/recovery/phase7c/fixtures/production-health.json');

async function main() {
  const healthRes = await fetch(`${BASE}/health`);
  const health = await healthRes.json();
  const durable = health?.health?.durableMemory || null;
  const report = {
    at: new Date().toISOString(),
    base: BASE,
    releaseCommit: health?.health?.releaseCommit || null,
    durableMemory: durable,
    localHasDatabaseUrl: !!process.env.DATABASE_URL,
    activationPossibleFromAgent: false,
    reason:
      'DATABASE_URL is Render dashboard sync:false. Agent has no RENDER_API_KEY. Founder must attach existing Postgres or create one and set DATABASE_URL.',
    reuseExistingInfrastructure: true,
    newDatabaseRequired: false,
    intendedTable: 'bible_buddy_documents',
    intendedOwner: 'durableUserMemory',
    intendedAdapter: 'PostgresStorageAdapter via storageAdapter.getStorageAdapter()',
  };

  if (process.env.DATABASE_URL) {
    try {
      process.env.PERSISTENCE = 'POSTGRES';
      const { resetStorageAdapterForTests, getStorageAdapter } = require('../services/persistence/storageAdapter');
      resetStorageAdapterForTests();
      const adapter = getStorageAdapter();
      await adapter.ensureSchema();
      const probeKey = path.join(__dirname, '..', 'data', '_7c1_probe.json');
      await adapter.writeJsonDocument(probeKey, { ok: true, at: new Date().toISOString() });
      const readBack = await adapter.readJsonDocument(probeKey, null);
      report.localPostgresProbe = { ok: !!readBack?.ok, adapter: adapter.kind };
      report.activationPossibleFromAgent = true;
    } catch (e) {
      report.localPostgresProbe = { ok: false, error: String(e.message || e) };
    }
  }

  report.productionDurableReady = durable?.durable === true && durable?.backend === 'POSTGRES';
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.productionDurableReady) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
