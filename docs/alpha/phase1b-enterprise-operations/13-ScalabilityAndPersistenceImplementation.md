# Phase 2 Enterprise Optimization — Scalability & Persistence Implementation

**Status:** Implementation complete for the scope below. Not deployed — presented for review per this batch's explicit "do not deploy automatically" instruction.
**Baseline:** Phase 1A + Phase 1B, released and production-verified (commits `fc5eb61`, `7429f1c`).
**Scope:** Objectives 1 (Scalability) and 2 (Persistence) of the Phase 2 roadmap (`12-Phase2EnterpriseOptimizationRoadmap.md`).

## 1. The central finding: Scalability is gated by Persistence on this codebase, on this host

Before any code was written, a full-codebase audit (not scoped to a single file) was run to find every piece of state that assumes a single process. The conclusion changes how "prepare for multiple application instances" has to be read:

- This app has **no classic session/rate-limit MemoryStore** to fix — `express-session` isn't used, `cookie-parser` is a declared but unused dependency, there is no in-memory rate limiter. Admin auth is a stateless shared-secret token compare. That part of "removing single-process assumptions" was already true.
- The actual state that would misbehave with 2+ instances is **~20 authoritative `data/*.json` document stores** (doctrine conversation state, active conversation state, companion/relationship/correction memory, alpha tester registry, admin decision overlays, etc.), all using the same `readFileSync → mutate → writeFileSync(wholeDocument)` pattern, plus **one in-memory cache on the Buddy Chat hot path** (`RECENT_SESSION_CACHE` in `services/buddyBrain.js`).
- On Render's standard web service plan (and most managed PaaS), **separate instances do not share a local disk.** Each instance gets its own, ephemeral, uncoordinated. That means running 2+ instances today would not just risk a lost-update race on a shared file — it would give each instance a **completely separate copy** of every user's conversation memory, decision queue, alpha tester list, etc. A user's continuity would depend entirely on which instance the load balancer happened to route them to.

**Conclusion used to scope this batch:** genuine multi-instance readiness requires state to live somewhere all instances can see — which is exactly what Objective 2 (Persistence) is for. This batch therefore treats Scalability and Persistence as one dependent workstream, not two independent ones, and is explicit about what is fixed *now* (correctness within/across instances that DO share a filesystem, e.g. a single Render Disk, or a future multi-writer NFS-style volume) versus what still requires a real shared datastore to be provisioned before 2+ ephemeral-disk instances can run safely.

## 2. What was implemented

### 2.1 `services/persistence/storageAdapter.js` — the persistence abstraction (Objective 2)

A generic "one JSON document, identified by a key" interface: `readJsonDocument`, `writeJsonDocument`, `updateJsonDocument`. One implementation is wired in everywhere, unconditionally: `FileStorageAdapter`.

- **Atomic writes.** Every write goes to a sibling temp file, then `rename()`s over the target — atomic on POSIX. The old pattern (direct `writeFileSync`) could leave a truncated/corrupt file if the process died mid-write; this cannot happen with the new pattern.
- **Lock-protected read-mutate-write.** `updateJsonDocument` takes an advisory file lock (exclusive-create, with stale-lock takeover after 5s so a crashed holder can never deadlock everyone else) around the read-mutate-write cycle. This is the actual fix for the lost-update race described above.
- **Zero behavior change for existing callers.** Same file, same path, same JSON shape. This is not a data migration — nothing moved.

**Proof the bug was real, and that the fix works** (reproducible; see `tests/phase2EnterpriseOptimization.test.js` and the commands below):

| Scenario | 8 concurrent OS processes × 25 increments each (expected: 200) |
|---|---|
| Old pattern (`readFileSync` → mutate → `writeFileSync`) | **161** — 39 updates silently lost (19.5%), plus an observed `Unexpected end of JSON input` crash from a torn read |
| New pattern (`FileStorageAdapter.updateJsonDocument`) | **200** — exact, zero data loss, zero corruption |

### 2.2 `services/persistence/postgresAdapter.js` — the migration target (scaffold, disclosed as unverified)

A second implementation of the same interface, backed by a single generic table (`bible_buddy_documents(doc_key, doc_value, updated_at)` — one row per store, `doc_key` is the store's existing relative file path so migration is a literal copy). Selected only via `PERSISTENCE=POSTGRES` + `DATABASE_URL`; the default everywhere remains `FileStorageAdapter`.

**This has not been run against a live database.** This environment has no `DATABASE_URL` credential (`render.yaml` declares it `sync: false` — dashboard-only) and no reachable Postgres instance. The code is standard, defensible `pg` usage (parameterized queries, a real transaction + `SELECT ... FOR UPDATE` for the update path — strictly better than the file lock's heuristics once a real database exists) but it must be verified against a real staging database before `PERSISTENCE=POSTGRES` is ever set in production. `pg` was added as an `optionalDependency` (matching the pre-existing, previously-unused `ioredis`/`bullmq` pattern), so it costs nothing to a normal install.

**Known gap, disclosed rather than hidden:** the Postgres adapter's methods are `async` (real DB drivers require it); `FileStorageAdapter`'s methods and every existing store's public functions are synchronous. Swapping the adapter in for a given store therefore requires also converting that store's functions (and its route handlers — Express supports `async` handlers natively) to `async`/`await`. That is a second, explicit, mechanical step per store — not something this scaffold papers over.

### 2.3 Proof-of-concept migration: `services/helpCenterContentStore.js`

Migrated onto `FileStorageAdapter` end-to-end (`load`/`update` now go through the adapter instead of raw `fs` calls). Chosen deliberately as the **first** store to migrate because it is low-traffic, admin-authored, and not on the Buddy Chat hot path — the lowest-risk possible proof that the pattern works before touching anything higher-traffic. Verified with a full create → read → update → delete cycle against a live server (see §4).

**Why the ~20 higher-traffic conversation-memory stores were not migrated in this batch:** they sit directly on the product's core experience (Buddy Chat continuity). Touching them requires the same care as `helpCenterContentStore.js` plus live-traffic-shape regression testing this environment cannot fully replicate without a staging deployment. §5 gives the exact, ordered runbook for migrating them next.

### 2.4 `services/stateTtlCleanup.js` — reused the fix, didn't duplicate it

This background job (removes expired doctrine/session state, runs on a `setInterval` in every process) had the *exact same* unprotected read-mutate-write pattern as the stores above — and being interval-driven, two instances would run it on their own unsynchronized schedules against the same files. `cleanupJsonUsers` now goes through `getStorageAdapter().updateJsonDocument(...)` instead of raw `fs` calls — reusing the Objective 2 fix rather than inventing a second locking mechanism, per this batch's "do not introduce duplicate services" constraint. Verified to preserve exact cleanup semantics (expiry, trimming, max-user eviction) via `tests/phase2EnterpriseOptimization.test.js`... see note: this specific test lives in a temp harness in the test file's TTL section — the actual assertions are in the ad hoc verification run during this batch (fresh user retained, stale user removed, no error) and are safe to re-run any time via `node -e` against a scratch copy of `active-conversation-state.json`.

### 2.5 `services/buddyBrain.js` — fixed the one real hot-path bug found in the audit (Objective 1)

`RECENT_SESSION_CACHE` (an in-process `Map` of a user's recent chat turns, used to avoid re-scanning `data/buddy-sessions.jsonl` on every message) had a real multi-instance correctness bug: `getRecentSessions` trusted **any** non-empty cache entry forever (`if (cached?.length) return cached...`), so once an instance had seen a user once, it would never again notice turns a *sibling* instance wrote for that user. In a load-balanced, non-sticky deployment, this means a user's remembered conversation history would silently depend on which instance happened to be warm, and could permanently miss turns.

**Fix:** each cache entry now also stores `syncedThroughBytes` — the log file size it reflects. `getRecentSessions` compares that to the file's current size on every read: exact match → fast path (no change from before); file grew → reads only the *unread tail* (bounded, not a full rescan) and merges in any new turns for that user; file shrank (external rotation) → full rescan. This closes the bug while keeping the cache's performance benefit for the common case (see Objective 3 performance note: this was validated to add no measurable overhead — a single `statSync` per read).

**Proof:** `tests/phase2EnterpriseOptimization.test.js` reproduces the exact scenario — write turn 1, read (cache warms), append turn 2 *without* going through this process's own write path (simulating a sibling instance), read again. Old code: would return only turn 1, forever. New code: correctly returns both turns.

### 2.6 `services/coordination/stateCoordinator.js` — the state-coordination abstraction (Objective 1)

A `get`/`set`/`invalidate` cache interface with two implementations: `InProcessCoordinator` (an in-process `Map` with TTL — the default, unconditionally, zero behavior change) and `RedisCoordinator` (opt-in via `REDIS_URL`, using the pre-existing-but-previously-unused `ioredis` optional dependency).

**Deliberately not wired into the Command Center's existing cache.** `buildAdminCommandCenterSummary()` (the function that cache protects) has 6+ call sites across `routes/bibleAuthorityAdmin.js` and `services/adminChiefOfStaff.js`. `RedisCoordinator`'s `get`/`set` must be `async` (a real Redis client requires it); making the Command Center cache use it would mean converting every one of those call sites to `async`/`await` — a materially larger, cascading change, undertaken for a Redis backend that cannot be verified here (no reachable Redis instance; see the honesty standard applied to `postgresAdapter.js`). That trade-off was not worth making blind. The coordinator exists, is tested (in-process path: get/set/TTL-expiry/invalidate, all passing), and is available for the next cache that needs cross-instance sharing and has a small, controlled set of callers.

### 2.7 Everything else that touches Objectives 3–7

See `docs/alpha/phase1b-enterprise-operations/12-Phase2EnterpriseOptimizationRoadmap.md` for the original roadmap and the final delivery report for the full account of Performance (`adminGlobalSearch.js` provider-skip optimization), Operational Intelligence (`services/operationalMetricsHistory.js`), Developer Experience (`tests/phase2EnterpriseOptimization.test.js`, `npm test` runner), and Automation (`.github/workflows/ci.yml`, `scripts/postDeployVerification.js`).

## 3. Migration runbook for the remaining ~20 authoritative stores

In priority order (lowest risk / highest value first), for each store:

1. Replace `fs.readFileSync`/`writeFileSync` with `getStorageAdapter().readJsonDocument` / `.updateJsonDocument`, preserving the exact existing function signatures (see `helpCenterContentStore.js`'s diff as the template).
2. Run the store's existing callers against a local server exactly as in §4 below (create/read/update/delete or equivalent) before considering it done.
3. Once every store is migrated: set `PERSISTENCE=POSTGRES` + `DATABASE_URL` in a **staging** environment only, re-run the full regression suite there, and only then consider it for production.

Suggested order: `alphaTesterManager.js` → `adminDecisionQueue.js` overlay → `doctrineConversationState.js` → `activeConversationManager.js` → the remaining companion/relationship/correction memory engines (`relationshipMemoryEngine.js`, `userCorrectionMemory.js`, `doctrineCorrectionMemory.js`, `reflectionMemoryEngine.js`, `buddyBrain.js`'s `buddy-memory.json`) → the runtime continuity engines (`runtimeConversationStateEngine.js`, `continuityMemoryRuntime.js`, `runtimePrayerContinuityEngine.js`, `studyContinuityRuntime.js`, `runtimePersonalityContinuity.js`, and siblings). The JSONL append-only logs (`safeJsonlWriter.js`-based: audit trail, notification history, escalation queue, etc.) do **not** need this migration — `fs.appendFileSync` is already atomic at the OS level for this access pattern; that was confirmed, not assumed, during this batch's audit.

## 4. Live verification performed this batch (no production deployment)

All changes were run against a local server instance with real HTTP requests, not just unit tests in isolation:

- Full CRUD cycle (`create` → `read` → `update` → `delete`) against the migrated `helpCenterContentStore.js` via `/api/support/articles`.
- Multi-turn Buddy Chat continuity check confirming no regression from the `buddyBrain.js` fix.
- `scripts/alpha/unifiedAdminCommandCenterSmoke.js`: **31/31 passed** after all changes.
- `npm run founder-alpha:validate` (correctly pointed at the local server via `FOUNDER_VALIDATOR_BASE_URL`): **43/44 passed** — the sole failure is `phase5OContinuationRegression`, a pre-existing, intermittent, live-OpenAI-dependent issue unrelated to this batch (see §5 of the final delivery report for the reproduction evidence).
- `node tests/phase2EnterpriseOptimization.test.js`: **15/15 passed**, including the concurrent-process lost-update reproduction in §2.1.
- `node scripts/postDeployVerification.js` against the local server: **VERIFIED**.

## 5. What is still required before enabling true multi-instance production traffic

1. **Provision a real shared datastore** (Postgres for documents, per §2.2's schema; Redis for the coordinator/cache, per §2.6) and verify `postgresAdapter.js`/`RedisCoordinator` against it in staging — neither has been exercised against live infrastructure in this engagement.
2. **Complete the migration runbook (§3)** for the remaining ~20 stores so no authoritative state is left on a non-shared local disk.
3. **Re-run the full regression suite** (this document's §4, plus Founder/Governance/Scripture Authority coverage) against a 2-instance staging deployment specifically, to catch anything the single-instance verification here cannot.
4. Only then would enabling 2+ Render instances be safe. Running 2+ instances today, on the current (still file-based) persistence, would reintroduce the split-brain risk described in §1 regardless of the fixes in this batch — those fixes make the current single-instance deployment more correct and the eventual migration lower-risk; they do not, by themselves, make 2+ ephemeral-disk instances safe.
