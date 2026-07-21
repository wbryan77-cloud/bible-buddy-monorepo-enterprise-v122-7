# Phase 4J — Deployment Parity Audit

Generated: 2026-06-12

## Git refs

| Ref | Commit | Description |
|-----|--------|-------------|
| Local `HEAD` | `417289c` | Bible-only authority heavens/kingdom |
| `origin/main` (Render deploy source) | `1095f92` | Fix missing OpenAI-first runtime dependencies |
| Divergence | **2 commits ahead**, 0 behind | Most Phase 4E–4H files **uncommitted** |

Render `render.yaml`: `autoDeploy: true` → deploys **`origin/main`**, not local working tree.

---

## Critical files — production vs local

| File | `origin/main` | Local working tree |
|------|---------------|-------------------|
| `services/runtimeHealthMonitor.js` | **Missing** | ✅ Modified/new |
| `routes/runtimeHealth.js` | **Missing** | ✅ Untracked |
| `services/safeJsonlWriter.js` | **Missing** | ✅ Untracked |
| `services/stateTtlCleanup.js` | **Missing** | ✅ Untracked |
| `services/responseGuarantee.js` | **Missing** | ✅ Untracked |
| `services/strictDoctrineGate.js` | **Missing** | ✅ Untracked |
| `services/doctrineConversationState.js` | **Missing** | ✅ Untracked |
| `services/doctrineWitnessInventory.js` | **Missing** | ✅ Untracked |
| `services/doctrineCorrectionMemory.js` | **Missing** | ✅ Untracked |
| `services/doctrineFinalAuthorityEngine.js` | **Missing** | ✅ Untracked |
| `services/buddyBrain.js` | Old session logging | ✅ Slim session + cache caps |
| `routes/buddy.js` | No guarantee; always `logLiveRequestTrace` | ✅ Guarantee + gated trace |
| `server.js` | No health/TTL | ✅ Health route + TTL schedule |
| `services/openAiFirstCompanionRuntime.js` | OpenAI-first only | ✅ Strict gate + block OpenAI |
| `services/liveResponseCapture.js` | May exist on HEAD commit | ✅ Safe capture (no full body) |
| `services/liveRequestTrace.js` | Always appends trace | ✅ Gated by `BUDDY_LIVE_TRACE=1` |

---

## Files missing from production (memory/stability impact)

### Tier 1 — Direct OOM mitigation

- `safeJsonlWriter.js` — no JSONL rotation or line slimming
- `stateTtlCleanup.js` — no TTL on state maps
- `runtimeHealthMonitor.js` — no heap visibility or pressure trim
- `routes/runtimeHealth.js` — no `/api/runtime-health`

### Tier 2 — Doctrine authority + OpenAI cost

- `strictDoctrineGate.js`
- `doctrineFinalAuthorityEngine.js`
- `doctrineLivePathHandlers.js` (if untracked)
- `doctrineErrorFirewall.js` (if untracked)
- `doctrineStrictPhraseGuard.js` (if untracked)

### Tier 3 — Route hardening

- `responseGuarantee.js` — timeout + always-return JSON

### Tier 4 — Doctrine state (not on production at all)

- `doctrineConversationState.js`
- `doctrineWitnessInventory.js`
- `doctrineCorrectionMemory.js`

**Implication:** Production memory pressure is **not** from doctrine JSON state files (they do not exist in deployed code). Production pressure is from **legacy buddy memory stack** + **OpenAI-first path** + **unbounded session JSONL**.

---

## Files added locally (not on `origin/main`)

Sample from `git diff --name-status origin/main...HEAD` (committed ahead) + untracked stability layer:

- `services/evidencePackSlimmer.js`
- `services/liveResponseCapture.js`
- `services/requestMemoryLogger.js`
- `scripts/bibleOnlyAuthorityRegression.js`
- Various bible-only authority edits to evidence cards (excluded from deploy package per Phase 4I)

Untracked Phase 4E–4H (representative):

- All Tier 1–3 files above
- `services/doctrineTopicDetector.js`, `doctrineFinalityContract.js`, `phase4eRuntimeDiagnostics.js`, etc.

---

## Behavioral parity matrix

| Behavior | Production now | After Phase 4I deploy |
|----------|----------------|----------------------|
| `GET /api/runtime-health` | 404 | 200 with heap/rss/sessions/errors/timeouts |
| Acts 10 doctrine path | OpenAI `reason_first_openai` | Strict local authority, OpenAI blocked |
| Session log line size | Full `structured` + `runtimeContext` | Slim structured; stripped bulk fields |
| `buddy-sessions.jsonl` rotation | None | 5 MB rotate via `safeJsonlWriter` |
| `RECENT_SESSION_CACHE` | Unbounded users, 12 turns | Max 200 users, 30 turns |
| `live-request-trace.jsonl` | Every request | Only if `BUDDY_LIVE_TRACE=1` |
| Chat timeout guarantee | try/catch only | `withBuddyChatGuarantee` + timeout |
| State TTL cleanup | None | Hourly + startup + on memory pressure |
| Doctrine witness state files | N/A | Created; TTL-trimmed at 24h |

---

## Expected production behavior after deploy

1. **Immediate:** `/api/runtime-health` returns metrics; `/health` unchanged.
2. **Per chat:** Strict doctrine gate runs before OpenAI; fewer/lighter OpenAI calls on doctrine turns.
3. **Per chat:** Smaller JSONL lines; rotation prevents multi-GB session files.
4. **Over 24h:** TTL cleanup prunes stale doctrine/conversation state users.
5. **Under pressure:** RSS ≥ 350 MB triggers trim (cache, TTL, health history).
6. **Regression risk:** New doctrine state files will grow until TTL runs — monitor `activeDoctrineStates` via health endpoint.

---

## Deploy parity verdict

| Check | Status |
|-------|--------|
| Local fixes address identified OOM sources | ✅ Present locally |
| Fixes committed to `origin/main` | ❌ Not committed/pushed |
| Render running local HEAD | ❌ Running `1095f92` |
| Production parity tests (Phase 4G) | ❌ Failed — deploy skew |

**Action required for parity:** Execute Phase 4I commit/push package (runtime-only, no forbidden corpus/doctrine pack edits) then re-run production smoke.
