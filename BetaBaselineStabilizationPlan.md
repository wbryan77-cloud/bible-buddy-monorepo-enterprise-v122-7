# Beta Baseline Stabilization Plan

**Status:** **Approved** — P1 executed (turn-intent removed from production compose). **No deploy, push, or Sprint 3.** See `BetaCommitReadinessReport.md`.  
**Generated:** 2026-06-03  
**Purpose:** Freeze architectural experiments and prepare **Reason-First + RACL + current composer stack** for controlled human beta.

---

## Executive decision (frozen)

After the experiment program, the **best automated baseline** is:

| Layer | Keep for beta | Evidence |
|-------|---------------|----------|
| **Reason-first runtime** (`BUDDY_RUNTIME=reason_first`) | Yes | OpenAI 100%; only path with consistent gains |
| **RACL** (`buildRetrievalEvidencePack`) | Yes | Only consistent win; 20/20 in-thread memory hits; listening ~6.3–6.4 |
| **`buildRuntimeInstructions` + RESPONSE STRUCTURE 1–5** | Yes | Structure removal **regressed** (listening −0.2, deliver-mode **+13.5 pts**, thread-specific −1.5) |
| **Correction ledger + listening signals** | Yes | Sabbath/meta repair; overlap control |
| **Doctrine validation** | Yes | Hard regen on violations |
| **Legacy route-first default** | Production default stays **`legacy`** until beta promotes reason-first |

**Do not pursue** (frozen until human beta review):

- Minimal / hierarchy prompt stripping  
- Lite simplification  
- Forced questions / conversation-behavior rules  
- Companion operating model (human-moment compose shell)  
- Response structure removal  
- New routes, responders, doctrine systems, memory systems, posture systems, validators  

**Experiment freeze rule (Section 10):** No new architectural experiments until **10–20 human beta conversations** are reviewed against the checklist below.

---

## Experiment outcome summary (reference)

| # | Hypothesis | Result | Listening / shape signal |
|---|------------|--------|---------------------------|
| 1 | Legacy route-first | Weak companion feel | ~5.7 automated; wrong-route risk |
| 2 | Reason-first | Small gain vs legacy | OpenAI 100%; modest uplift |
| 3 | RACL | **Only consistent win** | ~6.3–6.4; memory 20/20 |
| 4 | Minimal prompt | Worse | INCONCLUSIVE / confounded |
| 5 | Lite simplification | **Worse** | ~−0.4 listening |
| 6 | More questions / conversation behavior | **Worse or inconclusive** | Forced explore hurt |
| 7 | Turn intent + posture | **Worse** | 6.2 vs 6.3 (−0.1); deliver still ~78% |
| 8 | Operating model | **Worse / inconclusive** | Did not hit +0.5 bar |
| 9 | Response structure removal | **Worse** | 6.3→6.1; deliver 66%→80% (`STRUCTURE_REMOVAL_REGRESSED`) |

---

## 1. Exact files — production beta baseline

These files form the **wired path** when `BUDDY_RUNTIME=reason_first` (via `buddyBrain.runBuddy` → `reasonFirstBuddyRuntime`).

### 1.1 Runtime entry and orchestration

| File | Role |
|------|------|
| `services/buddyBrain.js` | `BUDDY_RUNTIME` switch; `buildSystemPrompt`; session/memory helpers |
| `services/reasonFirstBuddyRuntime.js` | Reason-first entry: context → RACL → compose → validate → trace → persist |
| `services/runtimeOrchestrator.js` | `buildRuntimeContext`, **`buildRuntimeInstructions`** (RESPONSE STRUCTURE) |
| `services/activeConversationManager.js` | Thread locks, strictAnswerMode, correction escalation |

### 1.2 Compose (current reason-first composer)

| File | Role |
|------|------|
| `services/reasonFirstComposer.js` | `COMPOSER_INSTRUCTION`, `buildComposerSystemPrompt`, `composeReasonFirstReply` |
| `services/openaiClient.js` | OpenAI client |
| `services/reasonFirstTrace.js` | Trace / prose breakdown |
| `services/companionReplyPolish.js` | `lightPolish` post-process |
| `services/runtimeResponseSanitizer.js` | Doctrine sanitize |
| `services/runtimeLabelStripper.js` | Label strip |

### 1.3 RACL retrieval (facts only)

| File | Role |
|------|------|
| `services/retrievalEvidencePack.js` | **`buildRetrievalEvidencePack`** — hub |
| `services/reasoningSnapshot.js` | Understanding snapshot |
| `services/questionIntentResolver.js` | Question / follow-up intent |
| `services/correctionLedger.js` | **Correction ledger** |
| `services/listeningSpecificityValidator.js` | Composer signals + correction hard overlap |
| `services/relationshipRecallEngine.js` | Memory hits for pack |
| `services/doctrineBoundaries.js` | Topic boundaries / forbidden teachings |
| `services/sabbathHistoryDeepResponder.js` | History chain facts (when included) |
| `services/sourceGroundedResponder.js` | Topic detection |
| Companion classifiers (retrieval tags only): `healthCompanionResponse.js`, `griefCompanionResponse.js`, `prayerCompanionResponse.js`, `companionDiscernmentResponder.js`, `continueStudyIntent.js` |
| Study continuity: `continueStudyEngine.js`, `continuityStudySessionRuntime.js`, `registryStudyPresenter.js`, `scriptureChainExpansion.js`, `bibleTopicCatalog.js` |

### 1.4 Validation on compose output

| File | Role |
|------|------|
| `services/doctrineBoundaryValidator.js` | **`validateReasonFirstReply`** (doctrine, correction overlap, history template, posture) |
| `services/companionPostureValidator.js` | Posture hard/soft checks (used by validator when turn-intent present) |
| `services/companionTurnIntent.js` | **Currently wired** in `reasonFirstComposer` user payload |
| `services/answerVerifier.js` | History template markers (via validator) |

### 1.5 Legacy runtime (rollback path — unchanged)

| File | Role |
|------|------|
| `services/masterBuddyRuntime.js` | `BUDDY_RUNTIME=legacy` default path |
| `services/routeOwnershipTable.js` | Legacy routing |
| Responder modules used by legacy only (e.g. `metaAnswerResponder.js`, `sabbathHistoryDeepResponder` prose paths) |

### 1.6 Server / API surface (unchanged)

| File | Role |
|------|------|
| `server.js` | HTTP entry |
| Routes calling `runBuddy` | Companion chat API |

**Default production env:** `BUDDY_RUNTIME` **unset or `legacy`**. Beta testers only: `BUDDY_RUNTIME=reason_first`.

---

## 2. Experimental files — remain isolated (must NOT be wired)

Nothing below may be `require()`’d from `buddyBrain`, `reasonFirstBuddyRuntime`, `masterBuddyRuntime`, or `server.js`.

### 2.1 Test-only runtimes (compose isolation)

| Service | Script | Verdict / notes |
|---------|--------|-----------------|
| `services/reasonFirstLiteRuntime.js` | `scripts/reasonFirstLiteExperiment.js` | **Worse** (−0.4 listening) |
| `services/companionConversationExperimentRuntime.js` | `scripts/companionConversationExperiment.js` | Explore-before-advise; not validated win |
| `services/companionOperatingModelExperiment.js` | `scripts/companionOperatingModelExperiment.js` | Did not beat RACL |
| `services/responseStructureRemovalExperiment.js` | `scripts/responseStructureRemovalExperiment.js` | **Regressed** |
| `services/minimalReasonFirstRuntime.js` | `scripts/promptHierarchyExperiment.js` | Minimal prompt experiment |
| `services/shadowReasonFirstRuntime.js` | `scripts/shadowRuntimeComparison.js` | Shadow diff only |
| `services/bibleBuddyLiteRuntime.js` | `scripts/bibleBuddyLiteBaselineExperiment.js` | Lite baseline compare |

### 2.2 Experiment-only helpers (not in production path)

| File | Used by |
|------|---------|
| `services/companionConversationBehavior.js` | Conversation experiment only |
| `services/conversationShapeAnalyzer.js` | Audit / experiment scoring only |

### 2.3 Turn-intent validation (not production wiring)

| File | Notes |
|------|-------|
| `scripts/companionTurnIntentValidation.js` | Benchmark vs RACL; **−0.1 listening** |
| `services/companionTurnIntent.js` | **⚠️ Also imported by production `reasonFirstComposer.js` today** |

**Approval-required cleanup (post-plan, pre-beta commit):** Consider **removing turn-intent from production compose** while keeping the module for historical validation scripts. Experiments showed regression; user directive says do not add new posture systems — **disabling failed wiring is stabilization, not a new system.** If leadership prefers literal freeze, keep as-is but document as **known −0.1 automated regression**.

### 2.4 Reports and JSON artifacts (reference only)

Keep in repo as evidence; do not treat as runtime config:

- `*Experiment*.md`, `*Audit*.md`, `ComposerObjectiveConflictAudit.md`
- `docs/companion-operating-model/`, `docs/companion-conversation-experiment/`, `docs/response-structure-removal/`
- `docs/companion-turn-intent/` (if present)

---

## 3. What should be committed now (after approval)

### 3.1 Recommended commit bundle — **production beta core**

```
services/buddyBrain.js
services/reasonFirstBuddyRuntime.js
services/reasonFirstComposer.js
services/reasonFirstTrace.js
services/retrievalEvidencePack.js
services/runtimeOrchestrator.js
services/activeConversationManager.js
services/correctionLedger.js
services/listeningSpecificityValidator.js
services/doctrineBoundaryValidator.js
services/doctrineBoundaries.js
services/reasoningSnapshot.js
services/questionIntentResolver.js
services/companionTurnIntent.js          # if keeping wired composer
services/companionPostureValidator.js    # if keeping wired composer
services/relationshipRecallEngine.js
(+ companion classifier / study deps listed in §1.3 as already modified)
```

### 3.2 Recommended commit bundle — **validation & docs**

```
scripts/raclValidation.js
scripts/reasonFirstMigration.js
scripts/companionIntelligenceValidationSuite.js
docs/racl/validation-results.json          # refresh on commit day
docs/reason-first-migration/validation-results.json
docs/companion-intelligence/validation-results.json
BetaBaselineStabilizationPlan.md
BibleBuddyReasonFirstArchitecture.md       # if accurate
RACLImplementationReport.md                # optional reference
```

### 3.3 Optional second commit — **frozen experiments (documentation)**

```
services/*Experiment*.js
services/reasonFirstLiteRuntime.js
services/minimalReasonFirstRuntime.js
scripts/*Experiment*.js
scripts/companionTurnIntentValidation.js
ComposerObjectiveConflictAudit.md
ResponseStructureRemovalExperiment.md
CompanionOperatingModelExperimentReport.md
docs/response-structure-removal/results.json
docs/companion-operating-model/results.json
```

Label commit message: `chore: freeze companion experiments — no production wiring`.

---

## 4. What should NOT be committed

| Category | Examples | Reason |
|----------|----------|--------|
| **Runtime local state** | `data/*.json`, `data/*.jsonl` | User/session noise; not reproducible |
| **Secrets** | `.env`, API keys | Security |
| **Sprint 2.14 push/report clutter** | `Sprint214*.md`, `ReleaseCandidate*.txt`, `ProductionParityReport.md`, etc. | Out of beta scope unless team wants archive |
| **Stale generated audits** | Duplicate INCONCLUSIVE reports unless refreshed | Misleading CI/human read |
| **`.github/`** | Unless intentionally adding CI for beta | Plan separately |
| **Experiment results without live run** | INCONCLUSIVE JSON only | Mark or omit |

Add or confirm `.gitignore` entries (approval step):

```
data/active-conversation-state.json
data/buddy-*.json
data/companion-*.jsonl
data/reason-first-trace.jsonl
data/runtime-*.json
```

---

## 5. Cleanup before commit (checklist)

| # | Task | Owner | Blocking? |
|---|------|-------|-----------|
| 1 | **Re-run** `raclValidation` with `OPENAI_API_KEY` + `BUDDY_RUNTIME=reason_first`; commit fresh `docs/racl/validation-results.json` | Eng | Yes |
| 2 | **Re-run** `reasonFirstMigration`; archive JSON | Eng | Yes |
| 3 | **Run** `companionIntelligenceValidationSuite` with reason-first env; archive JSON | Eng | Yes |
| 4 | Decide **turn-intent in production composer** (keep vs remove wiring only) | Product + Eng | Recommended |
| 5 | Verify **no** `require()` from production to `*Experiment*` / `*Lite*` runtimes | Eng | Yes |
| 6 | Confirm **`BUDDY_RUNTIME` default** is `legacy` in docs and deploy samples | Eng | Yes |
| 7 | Prune or gitignore **`data/`** runtime files | Eng | Yes |
| 8 | Add **`EXPERIMENTS_FROZEN.md`** pointer (optional one-liner in README) linking this plan | Eng | No |
| 9 | Tag git **`beta-baseline-YYYY-MM-DD`** after validations archived | Eng | No |

---

## 6. Validation scripts — must run before beta

### 6.1 Required commands

```bash
# 1) RACL benchmark (reason-first live OpenAI)
BUDDY_RUNTIME=reason_first OPENAI_API_KEY=sk-... node scripts/raclValidation.js

# 2) Legacy vs reason-first migration gate
OPENAI_API_KEY=sk-... node scripts/reasonFirstMigration.js

# 3) Companion intelligence regression (uses runBuddy — set runtime for beta path)
BUDDY_RUNTIME=reason_first OPENAI_API_KEY=sk-... node scripts/companionIntelligenceValidationSuite.js
```

Optional (not beta-blocking; frozen experiment record):

```bash
# Archive only — do not use for go/no-go
node scripts/companionTurnIntentValidation.js
```

### 6.2 Pass criteria — realistic for beta

Automated **release gates will likely FAIL** on listening (threshold **7.0**; baseline **~6.3–6.4**). Beta stabilization uses **tiered criteria**:

| Script | Must run | Must pass (beta) | Known acceptable FAIL |
|--------|----------|------------------|------------------------|
| **`raclValidation.js`** | Yes | OpenAI ≥70%; template ≤20%; in-thread memory ≥50% turns; **zero doctrine hard fails** on sample | Avg listening ≥7; Sabbath T7 ≥8 |
| **`reasonFirstMigration.js`** | Yes | Reason-first OpenAI ≥70%; template ≤20%; reason-first listening **≥ legacy** on same rubric | Listening ≥7 gate |
| **`companionIntelligenceValidationSuite.js`** | Yes | All HTTP tests execute; **no catastrophic** category &lt;80; document scores | `MIN_GATE` 95+ overall (may be NEEDS_REVIEW) |

**Beta go-ahead does not require automated listening 7.0.** It requires:

1. Infrastructure green (OpenAI, reason-first path reachable).  
2. RACL memory + doctrine stable on benchmark threads.  
3. No regression vs last archived `docs/racl/validation-results.json` on **OpenAI %, template %, memory hits**.  
4. Human beta checklist (Section 9) scheduled.

---

## 7. Required environment variables

### 7.1 Beta testing (reason-first path)

| Variable | Value | Notes |
|----------|-------|-------|
| `OPENAI_API_KEY` | `sk-...` | Required for reason-first compose |
| `BUDDY_RUNTIME` | `reason_first` | **Beta only** — not production default |
| `OPENAI_MODEL` | optional | Default `gpt-4.1-mini` in composer |
| `dotenv` | `.env` locally | Standard local dev |

### 7.2 Production default (unchanged)

| Variable | Value |
|----------|-------|
| `BUDDY_RUNTIME` | unset or `legacy` |

### 7.3 Companion intelligence suite (optional)

| Variable | Default | Notes |
|----------|---------|-------|
| `COMPANION_INTEL_MIN_SCORE` | `95` | May show NEEDS_REVIEW; document actuals |

---

## 8. Rollback plan

| Scenario | Action | Expected behavior |
|----------|--------|-------------------|
| Beta issue / quality emergency | Set `BUDDY_RUNTIME=legacy` (or remove var) | Route-first `masterBuddyRuntime`; prior responders |
| OpenAI outage | Legacy fallbacks + structured fallbacks in `buddyBrain` | Degraded but available |
| Partial rollback (keep RACL research) | No split flag today — all-or-nothing via `BUDDY_RUNTIME` | — |

**Rollback verification (2 minutes):**

```bash
BUDDY_RUNTIME=legacy node -e "process.env.BUDDY_RUNTIME='legacy'; const {runBuddy}=require('./services/buddyBrain'); runBuddy({userId:'rollback-test',message:'Hello',mode:'COMPANION'}).then(r=>console.log(r.runtime?.masterRoute||r))"
```

Document rollback owner and env revert in beta runbook (not Sprint 3 deploy).

---

## 9. Human beta test checklist

**Target:** 10–20 full conversations (multi-turn encouraged), **one reviewer**, same `BUDDY_RUNTIME=reason_first` + `OPENAI_API_KEY`.

For each thread, score **1–10** informally on: listening, companion presence, biblical grounding, correction recovery (if applicable).

### 9.1 Job discernment

- [ ] Turn 1: Opportunity acknowledged without immediate sermon  
- [ ] Turn 2: “Far from home” remembered  
- [ ] Turn 3: Push vs wait — discernment, not checklist dump  

### 9.2 Alzheimer’s caregiver

- [ ] Mom / Alzheimer’s named naturally  
- [ ] Turn 2: “Doesn’t remember who I am” — felt heard  
- [ ] Turn 3: Faith + grief — comfort before heavy teaching  

### 9.3 Grief

- [ ] “Wednesday” / friend named when provided  
- [ ] Turn 2: “Still bothering me” — presence, not fix-it lecture  

### 9.4 Health / knee pain

- [ ] Knees named; “again today” on follow-up  
- [ ] Practical care + medical caution; no unsafe advice  

### 9.5 Feeling distant from God

- [ ] Empty prayer named without “your faith is failing” dismissal  
- [ ] Turn 3: Direct answer to faith-fear question  

### 9.6 Sabbath history / correction

- [ ] Turn 1: Doctrinal question answered with Scripture grounding  
- [ ] Turns 2–7: Wording/meta — **direct**, brief, fresh; no Constantine loop  
- [ ] “Are you not listening” — repair tone, not repeated essay  

### 9.7 Cross-cutting

- [ ] Does it feel like a **companion** vs lecture?  
- [ ] Repetitive prayer/scripture offers?  
- [ ] Any doctrine red lines crossed? (must be zero)  

**Log template per session:** `threadId`, `turn`, `userMessage`, `reply` (first 400 chars), scores, reviewer notes → spreadsheet or `docs/beta-human-review/`.

---

## 10. Decision rule — experiment freeze

> **Do not start new architectural experiments** (compose shells, posture layers, structure removal, prompt stripping, new validators, new routes) until:
>
> - **≥10** human beta conversations are completed using the checklist in Section 9, **and**  
> - A single **Beta Human Review Summary** doc records: wins, failures, rollback triggers, and whether automated ~6.3 listening matches human feel.

Allowed during freeze (not “architectural experiments”):

- Bug fixes (crashes, doctrine false positives, JSON parse failures)  
- Copy-tuning **within** existing `COMPOSER_INSTRUCTION` / `buildRuntimeInstructions` (no new systems)  
- Human beta instrumentation (logging, review forms)  

---

## 11. Implementation phases (after plan approval)

| Phase | Work | Code? |
|-------|------|-------|
| **P0** | Approve this plan | No |
| **P1** | Cleanup §5 + re-run validations §6 | Scripts only |
| **P2** | Optional: remove turn-intent from `reasonFirstComposer` only | Small diff — needs explicit approval |
| **P3** | Git commits §3–4 + tag `beta-baseline-*` | Yes |
| **P4** | Human beta §9 + freeze rule §10 | No code |
| **P5** | Beta promotion decision (env default change) | **Separate** approval — not in this plan |

---

## 12. Open questions for approval

1. **Turn-intent wiring:** Freeze as-is, or remove from production composer before beta (recommended given −0.1 automated)?  
2. **Commit scope:** One squashed “reason-first beta baseline” vs core + experiments docs split?  
3. **Automated gate:** Accept FAIL on listening ≥7 for beta, or lower gate in scripts (script change = post-approval)?  
4. **Default runtime promotion:** When, if ever, flip production to `reason_first` — out of scope until human beta completes.

---

## Artifacts

| Document | Role |
|----------|------|
| This plan | Stabilization and freeze |
| `docs/racl/validation-results.json` | Automated beta baseline snapshot |
| `ResponseStructureRemovalExperiment.md` | Confirms keep RESPONSE STRUCTURE |
| `ComposerObjectiveConflictAudit.md` | Context only — no further structure experiments |

---

**Stop:** No code until plan approval. No deploy. No push. No Sprint 3.
