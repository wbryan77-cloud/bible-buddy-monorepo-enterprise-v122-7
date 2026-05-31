# Sprint 2.13 — Failure Report

**Date:** 2026-05-31  
**Threshold:** Scores below 95  
**Scope:** Repair only — no new doctrine, engines, or catalogs

---

## Critical Failures (block Sprint 3)

### F1 — Production deployment parity

| Field | Detail |
|-------|--------|
| **Score** | 12 / 100 |
| **Root cause** | Sprint 2 modules exist locally but **36+ service files are untracked**; Render deploys git HEAD `e572e40` which lacks presenter, intercepts, and companion paths |
| **File** | Entire `services/` Sprint 2 layer; `render.yaml` autoDeploy |
| **Runtime path** | Production `POST /buddy/chat` → committed `runBuddy()` → raw `sourceGroundedResponder` only |
| **Exact fix** | Commit all Sprint 2 service files + modified `buddyBrain.js`; push to Render; verify deployed `/buddy/chat` responses match local acceptance suite |

---

### F2 — Live production behavior ≠ local acceptance

| Field | Detail |
|-------|--------|
| **Score** | 0 / 100 (production) vs 100 / 100 (local HTTP tests) |
| **Root cause** | Same as F1 — code never deployed |
| **File** | `services/buddyBrain.js` (committed vs working tree) |
| **Runtime path** | HEAD: doctrine → return raw reply; local: doctrine → presentCompanionDoctrine |
| **Exact fix** | Deploy working tree; smoke test production URL with TEST 4 + TEST 5 messages |

---

## Functional Gaps (local — below 95)

### F3 — Continue study step advancement

| Field | Detail |
|-------|--------|
| **Score** | 82 / 100 |
| **Root cause** | `saveStudySession` fires on doctrine/registry presentation, not on continue acceptance; repeated `"Continue."` re-offers same next verse |
| **File** | `services/continueStudyIntent.js`, `services/continuityStudySessionRuntime.js` |
| **Runtime path** | continue intercept → `buildContinueStudyOffer` reads last ref but does not increment until new study saved |
| **Exact fix** | On continue intercept, append session with `studyStep: nextReference` when user continues (wire existing saveStudySession — no new engine) |

---

### F4 — Long-term memory (6 months)

| Field | Detail |
|-------|--------|
| **Score** | 75 / 100 |
| **Root cause** | Rolling caps: 30 summaries, 80 relationship items; no archival tier for 6-month recall |
| **File** | `services/buddyBrain.js` L195; `services/runtimeRelationshipMemoryEngine.js` RETENTION_LIMIT |
| **Runtime path** | Older entries silently dropped from read paths |
| **Exact fix** | Document limits in user-facing honesty; optionally raise HIGH-tier retention cap (config change, not new system). Render ephemeral disk may also wipe memory on redeploy — set persistent disk or external store |

---

### F5 — Job / open-loop dedicated path

| Field | Detail |
|-------|--------|
| **Score** | 85 / 100 |
| **Root cause** | Job opportunity hits generic companion/fallback path; open loop detected but no dedicated wisdom intercept before OpenAI |
| **File** | `services/personalizedFallback.js`, `services/openLoopsEngine.js` |
| **Runtime path** | No intercept before fallback; openLoopsEngine only in fallback builder |
| **Exact fix** | Ensure open-loop ack fires earlier via existing `detectOpenLoop` in personalizedFallback (already partial); route career topics through existing companionNextSteps — wiring only |

---

### F6 — Wrong frontend route (chat.html)

| Field | Detail |
|-------|--------|
| **Score** | 0 / 100 for that UI |
| **Root cause** | `public/chat.html` calls `/api/ai/chat` which does not exist |
| **File** | `public/chat.html` L254 |
| **Runtime path** | 404 — never reaches runBuddy |
| **Exact fix** | Change fetch URL to `/buddy/chat` with same payload as index.html (one-line wiring fix) |

---

### F7 — Helper-only test coverage

| Field | Detail |
|-------|--------|
| **Score** | 70 / 100 (prior state) |
| **Root cause** | 11 test files call `runBuddy()` directly; no CI gate on HTTP route |
| **File** | `tests/phase2Sprint*.test.js`, etc. |
| **Exact fix** | Add `scripts/sprint213AcceptanceHttp.js` to CI required checks (script exists; wire into npm test when express available) |

---

### F8 — Doctrine path skips finalizeBuddyResponse

| Field | Detail |
|-------|--------|
| **Score** | 88 / 100 |
| **Root cause** | Doctrine intercept returns early with custom persist block; may miss unified companionNextSteps from finalize |
| **File** | `services/buddyBrain.js` L934–1044 |
| **Runtime path** | doctrine → presentCompanionDoctrine → custom append (presenter includes continue internally) |
| **Exact fix** | Route doctrine return through `finalizeBuddyResponse` (reuse existing function — wiring only) |

---

### F9 — Memory recall skips finalizeBuddyResponse

| Field | Detail |
|-------|--------|
| **Score** | 90 / 100 |
| **Root cause** | Early return at L793–832 without finalize polish bundle |
| **File** | `services/buddyBrain.js` |
| **Exact fix** | Call `finalizeBuddyResponse` on recall path (wiring only) |

---

## Scores at or above 95 (local working tree)

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Historical routing | 96 | TEST 5 |
| Follow-up understanding | 94 | TEST 10 — borderline |
| Scripture grounding (doctrine) | 96 | TEST 4, 8 — 4–5 refs |
| Warmth (grief/health) | 95 | TEST 1, 2 |
| Natural conversation | 94 | No internal labels on doctrine/history |
| Identity bucket block | 100 | historicalContextRouter guards |

---

## Repair Priority Order

1. **F1/F2** — Commit + deploy (blocks everything)
2. **F6** — Fix chat.html route (if that UI is used)
3. **F3** — Continue step advance wiring
4. **F8/F9** — Unify finalizeBuddyResponse paths
5. **F7** — CI HTTP gate
6. **F4/F5** — Retention documentation / minor wiring

**No new doctrine. No new continuity engines. No new catalogs.**
