# 01 — Memory Certification

**Gate:** 2 — Memory Certification ONLY  
**Decision:** **MEMORY_NO_GO**  
**Date:** 2026-07-24  
**CI baseline:** Gate 1 PASS on `864cea0` (unchanged; memory repairs not in that commit)

## 1. Memory status

| Environment | Result |
|---|---|
| Local (worktree with memory repairs) | **18/18 PASS** |
| Production (`onrender.com`) | **11/16 FAIL** (5 explicit-recall failures through 25 turns) |

**Gate decision: MEMORY_NO_GO** — production is the authority for this release gate.

## 2. Evidence

### Local (PASS)

Artifact: `docs/recovery/certification/01-MemoryCertification-local-run.txt`

| Family | Result |
|---|---|
| Prior user question / assistant reply | PASS |
| Go deeper / Continue | PASS |
| Correction continuity (pork) | PASS |
| Topic return / “the one we were discussing” | PASS |
| Explicit favorite-verse horizons 2/5/10/25/50/100 | PASS (`explicit_remember_pin`) |
| Explicit marker @ 25 | PASS |
| Memory honesty (no invented yesterday narrative) | PASS (auto) |
| Implicit name recall | PASS |
| Cross-user isolation | PASS |
| Pin write | PASS |

### Production (FAIL)

Artifact: `docs/recovery/certification/01-MemoryCertification-production-run.txt`  
Health: `200`

| Case | Actual | Expected |
|---|---|---|
| M4_2/5/10/25 explicit favorite verse | `bible_companion_clarification` — “Are you asking about a Bible passage…” | Recall Psalm 23:1 **or** honest “I don’t have a favorite verse saved” |
| M4b_25 marker | Invented: `You asked me to remember: "Turn 19: briefly say hello and stay ready."` | Recall `ALPHA_MARKER_NEHEMIAH_8` **or** honest miss — **never** invent filler turn text |

## 3. Files changed (local repairs; **not deployed**)

| File | Purpose |
|---|---|
| `services/explicitRememberPin.js` | **NEW** — durable explicit “remember that…” / marker pins + honest recall |
| `services/openAiFirstCompanionRuntime.js` | Capture pins; answer pin-recall before OpenAI confabulation |
| `services/retrievalEvidencePack.js` | History window 5→30; inject `explicitRememberPins` |
| `services/reasonFirstComposer.js` | MEMORY HONESTY instruction |
| `services/buddyBrain.js` | `MAX_SESSION_TURNS` default 30→120 (+ unrelated claimAudit attach left in worktree) |
| `scripts/runMemoryCertification.js` | **NEW** — Gate 2 matrix runner |

## 4. Root cause (first bottleneck)

**Production explicit long-horizon / favorite-verse recall**

1. `reason_first_openai` only saw a short conversation window (~5 turns historically; production build lacks pin path).
2. After filler turns, the remembered fact left the prompt window.
3. Model confabulated from recent `Turn N:` text **or** fell through to clarification instead of honest miss.
4. No durable explicit-remember store on production.

**Authoritative modules:** `openAiFirstCompanionRuntime.js`, `retrievalEvidencePack.js`, missing prod `explicitRememberPin.js`.

**Safest repair:** Deploy the local pin + bounded history widen; re-run production matrix through 100. Do not expand architecture.

## 5. Regression results

| Suite | Result |
|---|---|
| Local full memory family (18 cases, horizons→100) | PASS |
| Production memory family (through 25) | FAIL (5) |
| Neighboring horizons after local pin fix | 2/5/10/25/50/100 all PASS locally |

## 6. Remaining risks

- Memory repairs are **worktree-only**; production still on pre-pin code.
- Render ephemeral disk can drop JSON pin/session files across redeploys — durability not certified on multi-instance.
- M5 auto-pass still allows answering Zechariah text when asked “what did we discuss yesterday…” (treats as Bible Q). Residual honesty hardening deferred (not the blocking P0).
- Implicit memory beyond ~session window still depends on history retention, not pins.
- `buddyBrain.js` worktree also contains Gate-5 claimAudit wiring — keep out of a memory-only deploy commit if splitting commits.

## 7. PASS or NO_GO

# MEMORY_NO_GO

- **Failing horizon:** Production explicit recall at 2+ turns (favorite verse); marker invents “Turn 19” at 25.
- **Reproduction:**  
  `BUDDY_URL=https://bible-buddy-monorepo-enterprise-v122-7.onrender.com MEMORY_MAX_TURNS=25 node scripts/runMemoryCertification.js`
- **Root cause:** No durable explicit-remember path + short OpenAI history window → clarification or confabulation.
- **Affected component:** Companion runtime memory/prompt assembly (`openAiFirstCompanionRuntime`, `retrievalEvidencePack`; missing `explicitRememberPin` on prod).
- **Safest repair:** Commit/deploy local pin + window changes; re-certify production 2→100.
- **Estimated effort:** ~0.5 day deploy + production re-run.
- **Residual risk:** Ephemeral persistence; M5 honesty nuance.

---

**STOP.** Gate 2 complete. Do not start Conversation Governance.
