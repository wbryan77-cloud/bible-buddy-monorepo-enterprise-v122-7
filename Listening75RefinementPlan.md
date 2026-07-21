# Listening 7.5 Refinement Plan

Generated: 2026-06-02  
Updated: 2026-06-02 — **soft recommendations vs hard failures** (implemented in `listeningSpecificityValidator.js`).  
Reason-first path only. No production deploy. No push. No Sprint 3.

---

## Purpose

Raise human listening from **6.3 → ≥7.5** by increasing **specificity**, not by adding empathy templates, forced openings, or emotional phrase requirements.

**Binding constraint from audits:** RACL fixed retrieval (20/20 thread hits) but `threadSpecific` avg **5.4** — facts reach the evidence pack; prose does not use them. Listening 7.5 must close the **compose gap**, not add another scoring layer that rewards “I hear.”

---

## Design Principles (Non-Negotiable)

| Do | Do not |
|----|--------|
| Require **concrete user text** in early reply | Require “I hear,” “It sounds like,” or fixed openers |
| Prefer **details over summaries** in composer guidance | Add canned acknowledgment blocks |
| If emotion appears, require **grounding in user facts** | Require emotional sentences |
| On correction, require **fresh answer** to corrected concern | Re-run Sabbath history or shorthand rationale |
| **Guide** composer when detail is thin (soft signal) | Fail validation on missing empathy markers |
| **Hard-fail** only on doctrine, overlap >40%, rationale repeat | Regen on every missing detail |
| Keep regen hints **specific** (“name mom’s Alzheimer’s”) | Regen hints that prescribe tone templates |

**Anti-pattern to avoid:** Converting listening into a second template system (like legacy `metaAnswerResponder` or regex +2 for reflection phrases).

---

## Current Baseline

| Source | Listening | Notes |
|--------|-----------|-------|
| RACL validation (`docs/racl/validation-results.json`) | **6.3/10** | Human 5-dimension rubric |
| Weakest dimension | `threadSpecific` **5.4** | 9/20 turns ≤4 |
| Correction cluster | Sabbath T3–T7 overlap **47–55%** | Loop gate at **55%** |
| `answerMatchGate` on meta turns | Active | Can push acknowledgment boilerplate |

**Scope:** `BUDDY_RUNTIME=reason_first` only. Legacy default unchanged.

---

## Architecture Overview

```
buildRetrievalEvidencePack (unchanged RACL)
        ↓
buildListeningComposerSignals → detailCandidates + listeningGuidance (SOFT — in user payload)
        ↓
composeReasonFirstReply
        ↓
validateReasonFirstReply
   ├── validateDoctrineBoundaries           (HARD)
   ├── validateCorrectionHardFailures     (HARD — overlap >40%, rationale repeat >35%)
   ├── validateHistoryTemplateOnMeta        (HARD — Sabbath template on meta turns only)
   └── evaluateListeningRecommendations     (SOFT — trace only, never blocks pass)
        ↓
regen ONLY on hard failures (max 3)
        ↓
lightPolish (unchanged)
```

### Hard vs soft

| Layer | Regenerates? | Examples |
|-------|----------------|----------|
| **Hard** | Yes | Doctrine violation; correction overlap >40%; repeated `priorAssistantQuote` rationale >35%; pasted Sabbath history block on wording turn |
| **Soft** | No | Missing user detail in opening; generic summary; ungrounded emotion; reused opener suggestion |

Soft recommendations are attached to `runtime.listeningRecommendations` for trace. They are also sent **before** first generation via `listeningGuidance` + `detailCandidates`.

**Not in scope for 7.5:** `buildRuntimeInstructions` removal (Lite experiment — separate decision). Optional follow-up after 7.5 validates.

---

## 1. User Detail Presence

### Goal

At least one **concrete detail from the thread** appears in the **first two sentences** of the reply.

### What counts as concrete

Derived from `evidencePack.threadLocal` and current message — **user’s words**, not category labels.

| Source field | Example phrases to match |
|--------------|---------------------------|
| `lastUserMessages[]` | “mom was recently diagnosed with Alzheimer's” |
| `latestClarifiedIntent` | “Roman Catholic Church, which is the direct name” |
| `companionThreadContext.directConcernPhrase` | “grieving who she used to be” |
| `companionThreadContext.lastRelevantUserMessage` | “company is far away from home” |
| Current `userMessage` | “knees are hurting again today” |

### What does NOT count

| Invalid match | Why |
|---------------|-----|
| Entity key `caregiver` | Category, not user wording |
| `discernment`, `grief`, `health` flags | Classifier label |
| Generic “your situation”, “this season”, “parent” | No thread anchor |
| Scripture reference alone | Not user detail |
| Assistant’s prior rationale | Not user detail |

### Validator spec: `validateUserDetailPresence`

**New module:** `services/listeningSpecificityValidator.js` (or section in `doctrineBoundaryValidator.js` if kept small).

**Algorithm:**

1. `buildConcreteDetailCandidates(evidencePack, message)`  
   - Collect phrases from `threadLocal.lastUserMessages`, `latestClarifiedIntent`, `directConcernPhrase`, current message.  
   - Extract **noun phrases** and **distinctive tokens** (length ≥4, not stopwords).  
   - Prefer **multi-word spans** (2–8 words) copied from user text, e.g. `mom`, `Alzheimer`, `far away from home`, `Roman Catholic Church`, `again today`, `Wednesday`.

2. `firstTwoSentences(reply)` — split on `.!?` with min length guard.

3. **Soft signal** if no candidate has ≥2 token overlap with first two sentences — recommendation type `user_detail_in_opening`.  
   **Does not fail validation or trigger regen.**

4. **Skip** when `reply.length < 40` (crisis/edge) or no candidates exist (first turn with only “hello”).

**Composer guidance (not regen):**

> Prefer naming a specific detail from the user early (e.g. from `detailCandidates`) instead of a general summary.

**Explicitly NOT checked:**

- Presence of empathy phrases  
- Presence of questions  
- Opening sentence pattern  

---

## 2. Specificity Preference (Composer)

### Goal

Model prefers **details over summaries** without mandating a sentence template.

### Change location

`services/reasonFirstComposer.js` — extend `COMPOSER_INSTRUCTION` / replace verbose `RACL_ADDENDUM` tail with **short** specificity block (~120 words max).

### Proposed instruction text (draft)

```
Prefer specific details from the thread over general summaries.
When threadLocal or the user’s messages include names, events, or phrases, use their wording in your reply.
Bad: "Caring for a parent can be difficult."
Good: "You mentioned that your mom has Alzheimer's and that you're trying to figure out how best to help her."
Do not invent details not in the evidence. Do not paste evidence verbatim.
On correction: answer the corrected question first; do not repeat your prior explanation.
```

### User payload addition

Pass `threadLocal.requiredDetailCandidates` (computed once in retrieval or validator helper) in **user JSON** so the model sees explicit anchors without bloating system prompt:

```json
{
  "detailCandidates": [
    "mom was recently diagnosed with Alzheimer's",
    "far away from home",
    "push or wait on this offer"
  ]
}
```

**Not:** A mandatory opening template. **Not:** “Start with You mentioned…”

---

## 3. Grounded Emotion

### Goal

Emotional language is **allowed** but must be **grounded** when present. Emotion is **never required**.

### Validator spec: `validateGroundedEmotion`

**Only runs if** reply contains emotional surface forms:

```javascript
EMOTION_SURFACE = /\b(i'?m sorry|so sorry|that sounds|that must|heavy|painful|difficult|with you|not alone|grieving|heartbreaking|overwhelming)\b/i
```

**If no match:** `passed: true, skipped: true`.

**If match:** require at least one `detailCandidates` token (same pool as §1) within **the same sentence** as the emotional phrase, or the **immediately following sentence**.

**Soft recommendation:** `ground_emotion` — never fails validation.

**Explicitly NOT checked:**

- Whether reply is warm enough  
- Whether reply lacks emotion  
- “I hear” / “It sounds like” as positive signals  

---

## 4. Correction Freshness

### Goal

After correction: answer the **corrected concern**; do not reuse rationale, opening, or prior explanation.

### Replaces / tightens

Current `replyViolatesLoopControl` in `correctionLedger.js` (overlap threshold **55%**).

### Validator spec: `validateCorrectionFreshness`

**Active when:** `correctionLedger.active` OR `correctionCount >= 1`.

| Check | Threshold | Issue code |
|-------|-----------|------------|
| Overlap vs last prior assistant reply | **> 40%** (was 55%) | `high_overlap_after_correction` — **HARD** |
| Overlap vs `priorAssistantQuote` rationale span | **> 35%** | `repeated_prior_rationale` — **HARD** |
| Opening sentence reuse vs any of last 3 assistant replies | exact match | `fresh_opening` — **soft recommendation only** |

**Remove from correction regen hints:**

- “I hear your frustration” prescriptions  
- Mandatory “you’re right” acknowledgment  

**Keep:**

- `forbidden_topic_repeated` for Constantine/Laodicea on wording turns (existing)  
- `premature_would_you_like_offer` only if direct answer before offer < 80 chars **and** overlap already passed  

**Regen hint (correction fail):**

> Answer only: “{correctedIntent}”. Do not repeat your prior explanation about Roman church shorthand. Use a new opening sentence and new reasoning.

---

## 5. Validation Summary

### Hard fail (regenerates)

1. **Doctrine violation** — `validateDoctrineBoundaries`  
2. **Overlap > 40%** with prior assistant reply on correction turns — `validateCorrectionHardFailures`  
3. **Repeated prior rationale** — overlap with `priorAssistantQuote` >35%  
4. **Sabbath history template paste** on meta/wording turns — `validateHistoryTemplateOnMeta`  

### Soft only (composer + trace, no regen)

1. Missing concrete user detail in opening two sentences  
2. Generic summary markers without user anchor  
3. Ungrounded emotional language (when emotion present)  
4. Reused opening sentence after correction (suggestion only)  

### Does NOT validate

- Missing “I hear” / “It sounds like”  
- Missing emotional wording  
- Missing fixed opening  
- `answerMatchGate` contract / “you’re right” acknowledgment  
- `premature_would_you_like` as hard block  

### Integration (`validateReasonFirstReply`)

```javascript
const passed = doctrine.passed && correctionHard.passed && historyTemplate.passed;
// evaluateListeningRecommendations → softRecommendations (never affects passed)
```

---

## Files to Touch (Implementation Phase — After Review)

| File | Change |
|------|--------|
| `services/listeningSpecificityValidator.js` | **Implemented** — soft signals + hard correction checks |
| `services/doctrineBoundaryValidator.js` | Hard doctrine + correction + history template; soft recommendations in trace |
| `services/correctionLedger.js` | Export overlap helpers; optional `CORRECTION_OVERLAP_THRESHOLD = 0.4` |
| `services/reasonFirstComposer.js` | Specificity instruction + `detailCandidates` in userPayload |
| `services/retrievalEvidencePack.js` | Optional: `threadLocal.detailCandidates` at pack build time |
| `scripts/raclValidation.js` | Re-benchmark after implementation |
| `docs/listening-75/validation-results.json` | New results artifact |

**Not touched:** `buddyBrain` default, `masterBuddyRuntime`, `reasonFirstLiteRuntime`, production routes.

---

## Demotion: `answerMatchGate` Listening Pressure

**Problem:** `matchAnswerToSnapshot` + `responseContract` reward meta-answer shape (“you’re right”, plainEnglish restatement) — creates **acknowledgment templates** without improving specificity.

**Plan:**

- On reason-first path, **skip** contract validation for `correction_ignored` / `plainEnglish_mismatch` unless reply contains **repeated_sabbath_history_template**.  
- Keep history-template and distraction checks.  
- Let **user detail presence** be the meta/correction listening gate instead.

This is a **subtraction**, not an addition — aligns with Complexity Debt Audit.

---

## Success Criteria (Post-Implementation Validation)

Re-run `scripts/raclValidation.js` (human rubric) on same 6 threads:

| Criterion | Target |
|-----------|--------|
| Avg human listening | **≥7.5/10** |
| `threadSpecific` dimension avg | **≥6.5/10** |
| Sabbath T7 | **≥8.0/10** |
| No increase in template prose % | ≤0.5% |
| OpenAI usage | ≥70% |
| Shallow-ack-only turns (emotion without detail) | **↓** vs 6.3 baseline |

**Regression guards:**

- Doctrine gate still passes  
- No Constantine/Laodicea on wording-only turns  
- Alzheimer's thread still references mom/Alzheimer’s when detail candidates exist  

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Validator too strict on short replies | Skip detail check if `<40` chars or single-word user message |
| Overfitting benchmark phrases | Candidates built dynamically from user text, not hardcoded thread IDs |
| Regen homogenization | Specificity hints cite **which** detail missing, not tone; keep temperature 0.72 on attempt 1 |
| Prompt stack growth | Replace RACL addendum with shorter specificity block; move candidates to user payload |
| False pass via one token | Require ≥2 token overlap on phrase ≥4 chars |

---

## What We Are Explicitly Not Building

- Empathy phrase scorer  
- Required opening sentence templates  
- “Start with You mentioned…” mandate  
- Emotional warmth minimum  
- New responder routes  
- Global memory-first override  
- Listening 7.5 as legacy template blocks  

---

## Implementation Order (After Approval)

1. `buildConcreteDetailCandidates` + unit tests on RACL validation turns (offline, no API)  
2. `listeningSpecificityValidator.js` with three sub-checks  
3. Wire into `validateReasonFirstReply`; lower correction overlap to 40%  
4. Composer instruction + `detailCandidates` in user payload  
5. Narrow `validateAnswerMatch` scope  
6. Live validation run → `docs/listening-75/validation-results.json`  
7. `Listening75ImplementationReport.md` (results only, if requested)

---

## Review Checklist

- [x] No required empathy or opening phrases in validator  
- [x] Hard fail: doctrine, overlap >40%, repeated rationale only  
- [x] Missing detail / emotion = soft recommendation, not regen  
- [x] `answerMatchGate` removed from reason-first validation path  
- [x] Composer receives `detailCandidates` + `listeningGuidance`  
- [ ] Re-run `raclValidation.js` after live API review for ≥7.5 gate  

---

## Stop Conditions

- No deploy, no push, no Sprint 3  
- No changes to `reasonFirstLiteRuntime` or production default `legacy`  

---

## Appendix: Example Pass/Fail

### Alzheimer's T2 — User: “Some days she doesn't remember who I am.”

| Reply opening | Result |
|---------------|--------|
| “When your mom doesn't remember you some days, that is a particular kind of loss.” | **Pass** — “mom”, “remember” from user text |
| “It sounds deeply painful when memory fades.” | **Fail** detail — generic, no mom/remember who I am |
| “Caring for someone with dementia is difficult.” | **Soft** `user_detail_in_opening` — reply still ships |

### Sabbath T4 — User: “I'm asking about your wording.”

| Reply | Result |
|-------|--------|
| Repeats 55% of T3 “Roman church shorthand” paragraph | **Hard fail** overlap >40% → regen |
| “You asked why I said Roman church instead of Roman Catholic Church — I used shorthand; RCC is more precise for later institutional authority.” | **Pass** — fresh, names user wording |

---

*Plan updated to match implementation. Validation benchmark pending.*
