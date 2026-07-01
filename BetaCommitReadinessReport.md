# Beta Commit Readiness Report

**Generated:** 2026-06-03  
**Plan:** `BetaBaselineStabilizationPlan.md` (approved)  
**Scope:** P1 only — no deploy, no push, no Sprint 3

---

## Executive summary

| Item | Status |
|------|--------|
| Remove `companionTurnIntent` from production reason-first | **Done** |
| Keep Reason-First + RACL + RESPONSE STRUCTURE + correction + doctrine | **Done** |
| Experimental runtimes isolated from `buddyBrain` / `reasonFirstBuddyRuntime` | **Verified** |
| `.gitignore` includes `data/` | **Done** |
| Live validation re-run (3 scripts) | **Blocked** — `OPENAI_API_KEY` not available in agent environment |
| Ready to commit | **Conditional** — commit code + docs after local validation re-run |

---

## 1. P1 code changes (production path)

### 1.1 `services/reasonFirstComposer.js`

**Removed:**

- `require('./companionTurnIntent')` and `buildCompanionTurnIntent()`
- `companionTurnIntent` block in OpenAI user payload
- `companionTurnIntent` on validation pack and `structured.runtime`
- `postureWarnings` on runtime trace
- Composer line: *“obey companionTurnIntent…”*

**Updated `COMPOSER_INSTRUCTION` (beta baseline):**

- Answer latest message; avoid mini-essay every turn
- Listen first on pain/uncertainty; answer directly on clear question or correction
- Scripture, doctrine, no verbatim evidence, no unsolicited study prompts
- Specificity hint retained

**Retained:** `buildSystemPrompt`, `buildRuntimeInstructions`, RACL evidence in system prompt, `buildListeningComposerSignals`, full `correctionLedger` in user payload, `validateReasonFirstReply`, `lightPolish`.

### 1.2 `services/doctrineBoundaryValidator.js`

**Removed from production `validateReasonFirstReply`:**

- `validateCompanionPosture` / `buildPostureRegenHint` (turn-intent posture hard/soft regen)

**Retained:** doctrine boundaries, correction overlap hard failures, history template on meta turns, listening soft recommendations.

### 1.3 Smoke check

```
COMPOSER has turn-intent: false
validator has posture key: false
```

---

## 2. Turn-intent remains experiment-only

These files stay in repo for **`scripts/companionTurnIntentValidation.js`** only — not imported by production:

| File | Role |
|------|------|
| `services/companionTurnIntent.js` | Posture classification (experiment) |
| `services/companionPostureValidator.js` | Posture regen (experiment / validation script) |
| `scripts/companionTurnIntentValidation.js` | Benchmark harness |

---

## 3. Experimental isolation verification

**No production `require()` to test runtimes** (grep on `buddyBrain.js`, `reasonFirstBuddyRuntime.js`):

| Runtime | Script | Wired to production? |
|---------|--------|----------------------|
| `reasonFirstLiteRuntime.js` | `reasonFirstLiteExperiment.js` | **No** |
| `companionConversationExperimentRuntime.js` | `companionConversationExperiment.js` | **No** |
| `companionOperatingModelExperiment.js` | `companionOperatingModelExperiment.js` | **No** |
| `responseStructureRemovalExperiment.js` | `responseStructureRemovalExperiment.js` | **No** |
| `minimalReasonFirstRuntime.js` | `promptHierarchyExperiment.js` | **No** |
| `shadowReasonFirstRuntime.js` | `shadowRuntimeComparison.js` | **No** |

Production switch: `buddyBrain.js` → `reasonFirstBuddyRuntime` when `BUDDY_RUNTIME=reason_first`.

---

## 4. `.gitignore`

Created **`.gitignore`** with:

```
data/
.env
.env.local
node_modules/
```

Runtime session JSON/JSONL under `data/` must not be committed.

---

## 5. Validation re-run status

### 5.1 Environment (this run)

| Check | Result |
|-------|--------|
| `OPENAI_API_KEY` | **Not set** in agent/sandbox |
| `openai` client | Not initialized without key |

### 5.2 Required commands (run locally before commit)

```bash
cd /Users/william/Documents/bible-buddy-monorepo-enterprise-v122-7

# Load key (example)
export OPENAI_API_KEY=sk-...
export BUDDY_RUNTIME=reason_first

node scripts/raclValidation.js
node scripts/reasonFirstMigration.js
node scripts/companionIntelligenceValidationSuite.js
```

**Important:** Archive JSON after re-run — current files are **pre–turn-intent removal** or older:

| Artifact | Last timestamp | Notes |
|----------|----------------|-------|
| `docs/racl/validation-results.json` | 2026-06-03T03:36:22Z | May include turn-intent era; **re-run required** |
| `docs/reason-first-migration/validation-results.json` | 2026-06-02T05:31:37Z | Stale vs P1 |
| `docs/companion-intelligence/validation-results.json` | 2026-06-02T00:42:30Z | Stale vs P1; prior run **35/35 PASS** |

### 5.3 Beta-tier pass criteria (from plan §6)

| Script | Must pass for commit readiness |
|--------|--------------------------------|
| **raclValidation** | OpenAI 100%; template ≤20%; memory hits strong; **no doctrine hard fails** on 20 turns |
| **reasonFirstMigration** | Reason-first OpenAI ≥70%; template ≤20%; listening **≥ legacy** on same rubric |
| **companionIntelligenceValidationSuite** | All tests execute; no catastrophic regression |

**Known acceptable FAIL:** automated listening gate ≥7.0 (baseline ~6.3–6.4).

### 5.4 Last archived RACL gate (reference only — re-run to replace)

From `docs/racl/validation-results.json` (pre-P1 refresh):

| Check | Result |
|-------|--------|
| OpenAI 100% | PASS |
| Template 0% | PASS |
| Memory 20/20 | PASS |
| Avg listening ≥7 | FAIL (6.3) |
| Sabbath T7 ≥8 | FAIL (5.8) |
| Roman church repeat after correction | FAIL |

---

## 6. Commit readiness

### 6.1 Recommended commit — **beta baseline core** (after local validation)

**Services (many are currently untracked — first add):**

```
services/buddyBrain.js                    # if BUDDY_RUNTIME switch present
services/reasonFirstBuddyRuntime.js
services/reasonFirstComposer.js           # P1: no turn-intent
services/reasonFirstTrace.js
services/doctrineBoundaryValidator.js     # P1: no posture validator
services/doctrineBoundaries.js
services/retrievalEvidencePack.js
services/correctionLedger.js
services/listeningSpecificityValidator.js
services/reasoningSnapshot.js
services/activeConversationManager.js
services/runtimeOrchestrator.js
services/openaiClient.js
(+ companion classifiers / study deps used by retrievalEvidencePack)
```

**Scripts:**

```
scripts/raclValidation.js
scripts/reasonFirstMigration.js
scripts/companionIntelligenceValidationSuite.js   # tracked
```

**Config / ignore:**

```
.gitignore
```

**Docs (refresh on commit day):**

```
BetaBaselineStabilizationPlan.md
BetaCommitReadinessReport.md
docs/racl/validation-results.json              # after re-run
docs/reason-first-migration/validation-results.json
docs/companion-intelligence/validation-results.json
```

### 6.2 Optional second commit — frozen experiments (no wiring)

```
services/*Experiment*.js
services/reasonFirstLiteRuntime.js
services/minimalReasonFirstRuntime.js
scripts/*Experiment*.js
scripts/companionTurnIntentValidation.js
services/companionTurnIntent.js
services/companionPostureValidator.js
```

### 6.3 Do not commit

- `data/**` (now gitignored)
- `.env` / API keys
- Sprint 214 push/report clutter unless team wants archive
- Unrefreshed validation JSON claiming post-P1 without re-run

### 6.4 Pre-commit checklist

- [x] Turn-intent removed from `reasonFirstComposer` + `validateReasonFirstReply`
- [x] Experiments not wired to production
- [x] `data/` in `.gitignore`
- [ ] **You:** Re-run 3 validation scripts with `OPENAI_API_KEY`
- [ ] **You:** Commit refreshed `docs/*/validation-results.json`
- [ ] **You:** Review diff for `buddyBrain.js` `BUDDY_RUNTIME` default = `legacy`

---

## 7. Beta testing env (unchanged)

| Variable | Beta | Production default |
|----------|------|-------------------|
| `OPENAI_API_KEY` | Required | Required for reason-first |
| `BUDDY_RUNTIME` | `reason_first` | unset or `legacy` |

**Rollback:** `BUDDY_RUNTIME=legacy` or remove variable.

---

## 8. Experiment freeze (reminder)

No new architectural experiments until **10–20 human beta conversations** (plan §9 checklist).

---

## 9. Stop conditions met

- No deploy  
- No push  
- No Sprint 3  
- Stopped after P1 + this readiness report (validation pending API key locally)

---

## 10. Next step for you

1. Run the three validation commands in §5.2.  
2. If beta-tier criteria pass, stage §6.1 files and commit (user-initiated; agent did not commit per rules).  
3. Begin human beta with `BUDDY_RUNTIME=reason_first` only.
