# Phase 4J — Root Cause Ranking

Generated: 2026-06-12  
Purpose: Rank most likely Render crash causes **before** additional doctrine work.  
Constraint: Analysis only — no patch, deploy, or push performed.

---

## #1 — Unbounded session logging + `RECENT_SESSION_CACHE` (production code)

**Likelihood:** **Highest**

### Evidence

1. **Production `appendSession` logs full objects** (`origin/main:services/buddyBrain.js`):
   - Passes entire `structured` (scripture arrays, nested `runtime`, enrichment metadata).
   - Passes full `runtimeContext` object.
   - `appendJsonl` uses raw `JSON.stringify` with **no rotation, no line cap**.

2. **Local forensic disk evidence:**
   - `data/buddy-sessions.jsonl` — 4.1 MB active file.
   - `data/buddy-sessions.jsonl.1781191308688.bak` — **1.0 GB** rotated backup from stress runs.
   - Demonstrates session JSONL alone can consume **gigabyte-scale** disk and force huge heap allocations during stringify/parse.

3. **`RECENT_SESSION_CACHE` on production:**
   - No `MAX_SESSION_CACHE_USERS` — Map grows with every distinct `userId`.
   - 12 turns per user with merged `structured.runtime` — fat retained objects.
   - Local 4H adds cap (200 users) and slim cache entries; **not on Render**.

4. **OOM mechanism:**
   - Per-turn `JSON.stringify` of large trees → V8 heap spike.
   - Retained cache → baseline RSS drift until process kill.
   - `getRecentSessions` cache miss reads 512 KB tail — amplifies when log lines are huge.

5. **Phase 4F/4H audits** identified this as historical Render crash vector (JSON.stringify on huge session objects).

### Why doctrine files are NOT #1 on production

`doctrineConversationState.js`, witness inventory, and correction memory are **absent from `origin/main`**. Production OOM is driven by the **legacy buddy memory/logging stack**, not Phase 4D doctrine state files.

---

## #2 — Per-request `buildRetrievalEvidencePack` + OpenAI `composeReasonFirstReply` (no strict gate)

**Likelihood:** **High**

### Evidence

1. **Production `openAiFirstCompanionRuntime.js`** (`origin/main`):
   - Always calls `buildRetrievalEvidencePack` before reply composition.
   - **No** `runStrictDoctrineGate`, **no** `mustBlockOpenAi`.
   - Doctrine turns route to `composeReasonFirstReply` (OpenAI).

2. **Evidence pack weight** (`retrievalEvidencePack.js`):
   - Imports 20+ engines: evidence cards, scripture discovery, relationship recall, reasoning snapshot, correction ledger, active conversation, etc.
   - Builds thread-local memory from recent sessions (up to 6 user messages × 500 chars).
   - Largest **transient** allocation per request.

3. **Production parity failure (Phase 4G):**
   - Acts 10 on Render: `reason_first_openai` author — confirms OpenAI on strict doctrine path.
   - Remote smoke **0/27** — failures correlate with latency/connection errors, not just wrong text.

4. **OOM/liveness mechanism:**
   - Each in-flight OpenAI request holds evidence pack + prompt + response until timeout (45s default in composer).
   - Burst traffic: N concurrent requests × ~5–15 MB transient → RSS spike.
   - Hung connections → `core_connection_error` loops → **more** requests, **more** retention.
   - No `responseGuarantee` timeout wrapper on production `routes/buddy.js`.

5. **Local 4H stress:** 0 strict OpenAI calls, peak RSS 288 MB. Production equivalent without gate projects **>400 MB**.

---

## #3 — Multi-file JSON read-modify-write on every chat (`continuity-memory` + buddy memory stack)

**Likelihood:** **Medium–high** (amplifier; often triggers OOM combined with #1 and #2)

### Evidence

1. **`finalizeBuddyResponse` → `persistBuddyMemory`** triggers **8+ persistence calls** per chat:
   - `saveContinuityMemory`, relationship memory, learning profiles, personality continuity, conversation state, etc.
   - Each typically: `readFileSync` → `JSON.parse` → mutate → `JSON.stringify` → `writeFileSync`.

2. **Local file sizes (proxy for production growth on same code path):**
   - `continuity-memory.json` — **4.7 MB** (largest single JSON state file).
   - `buddy-memory.json` — 820 KB.
   - `companion-learning-profiles.json` — 1.8 MB.
   - `runtime-relationship-memory.json` — 1.0 MB.

3. **`updateUserMemory`** reads/writes **entire** `buddy-memory.json` on every memory-enabled turn.

4. **OOM mechanism:**
   - Each request duplicates full file contents in heap during parse.
   - Under concurrency, multiple 4.7 MB parses overlap → **multiplicative RSS spike**.
   - Files grow monotonically with users/interactions — parse cost increases over instance lifetime.
   - No `stateTtlCleanup` on production to prune stale users.

5. **Not the sole cause:** These files exist on production path today; doctrine-specific JSON state does not. Continuity stack is the sustained **amplifier** that makes #1 and #2 fatal at scale.

---

## Honorable mention — Deploy skew blocks mitigation

| Issue | Impact |
|-------|--------|
| `/api/runtime-health` → 404 on Render | No heap/rss visibility; cannot confirm OOM in prod |
| Phase 4E–4H uncommitted | All mitigations exist only locally |
| `live-request-trace.jsonl` always-on on production | Extra ~1 KB/chat disk + console log pressure |

Deploy skew is the **reason fixes are not active**, not the underlying growth **source**.

---

## Root cause ranking summary

| Rank | Cause | Type | Fix layer (already local) |
|------|-------|------|---------------------------|
| **#1** | Full structured session JSONL + unbounded session cache | Sustained heap + disk | `slimStructured`, `safeJsonlWriter`, cache caps |
| **#2** | Evidence pack + OpenAI on every doctrine turn | Per-request spike | `strictDoctrineGate`, block OpenAI, guarantee timeout |
| **#3** | Full-file JSON RMW (continuity + memory stack) | Sustained amplifier | `stateTtlCleanup`; long-term per-user storage |

---

## Recommended fix (ordered — do not execute without approval)

### Immediate (deploy Phase 4I runtime package)

1. **Push** `safeJsonlWriter`, slim `appendSession`, `RECENT_SESSION_CACHE` caps — addresses **#1**.
2. **Push** `strictDoctrineGate`, `doctrineFinalAuthorityEngine`, OpenAI block — addresses **#2**.
3. **Push** `responseGuarantee`, `runtimeHealthMonitor`, `stateTtlCleanup`, `/api/runtime-health` — visibility + trim.
4. **Gate** `logLiveRequestTrace` behind `BUDDY_LIVE_TRACE=1` on production route (already local).

### Post-deploy verification

1. `GET /api/runtime-health` — confirm `rssMB`, `activeSessions`, `errors`.
2. Re-run Phase 4G production parity — Acts 10 must not be `reason_first_openai`.
3. Monitor RSS at 0 / 5 / 15 / 30 / 60 min after deploy.

### Structural (next sprint — not blocking deploy)

1. Replace full-file `continuity-memory.json` RMW with per-user files or Postgres (addresses **#3** root).
2. Lazy-load evidence pack modules; doctrine-fast path without card retrieval when strict topic detected.
3. Move session history to DB or capped ring buffer instead of scanning JSONL.

---

## Acceptance mapping

| Acceptance item | Finding |
|-----------------|---------|
| Root cause ranking | #1 session log/cache, #2 evidence+OpenAI, #3 continuity RMW |
| Memory growth source | `buddy-sessions.jsonl` + `RECENT_SESSION_CACHE` (production) |
| Render OOM evidence | 1 GB local session backup; 288 MB stress → ~500 MB prod extrapolation; 512 MB plan |
| Production readiness | Health endpoint **404**; mitigations **not deployed** |
| Recommended fix | Deploy Phase 4I runtime package; then structural continuity storage |
