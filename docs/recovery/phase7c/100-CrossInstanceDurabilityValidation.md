# 100 — Cross-Instance Durability Validation

**Pending production `DATABASE_URL`.**

Local simulation: `scripts/runPhase7CDurableMemoryRegression.js` restart-sim **PASS** on FILE.

Production gate (Layer 2):

1. Confirm `/health.health.durableMemory.durable === true`
2. Write memory as user A
3. Redeploy / hit alternate instance
4. Read same memory

If `durable: false` on production → **DURABLE_COMPANION_MEMORY_NOT_READY**.
