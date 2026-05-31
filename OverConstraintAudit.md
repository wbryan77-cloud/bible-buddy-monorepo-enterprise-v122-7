# Over-Constraint Audit — Sprint 2.14C

**Date:** 2026-05-31  
**Goal:** Identify where Buddy was forced into canned doctrine instead of reasoning.

---

## Summary

| Severity | Modules | Issue |
|----------|---------|-------|
| **High** | `sourceGroundedResponder`, `doctrineRuntimePipeline`, `doctrineGuard` | Full canned replies on keyword match; bypass LLM and nuance |
| **Medium** | `companionDoctrinePresenter`, `sabbathHistoryDeepResponder`, `buddyBrain` | Stacked prompts, static blocks, routing order |
| **Low** | `doctrineSafetyLayer`, `studyModeGating`, `runtimeQualityValidator` | Guard/score only — metadata, not reply substitution |
| **Mitigates** | `companionReplyPolish` | Dedupes repetition |

---

## Module-by-Module Audit

### 1. `services/doctrineRuntimePipeline.js`

| Question | Answer |
|----------|--------|
| Blocks false doctrine only? | **No** — always intercepts when router returns a reply |
| Forces canned answer? | **Yes** — deterministic path, no message-specific reasoning |
| Prevents historical reasoning? | **Indirectly** — delegates to canned `sourceGroundedResponder` |
| Prevents follow-up understanding? | **Yes** — keyword `detectTopic` only |
| Causes repetition? | **Yes** — same body on every keyword hit |

**Fix applied:** Pipeline now receives `questionIntent`; router skips intercept for history/evidence/correction.

---

### 2. `services/doctrineGuard.js`

| Question | Answer |
|----------|--------|
| Blocks false doctrine only? | **No** — broad keyword gate, not content validation |
| Forces canned answer? | **Forces routing** to canned stack |
| Prevents historical reasoning? | **Indirectly** — any match triggers intercept |
| Prevents follow-up understanding? | **Yes** — `'leviticus'`, `'commandments'` trigger on tangential messages |
| Causes repetition? | **Indirectly** |

**Fix applied:** Added `shouldInterceptDoctrine()` — skips intercept for historical, evidence, correction, prayer, grief, study continuation intents.

---

### 3. `services/sourceGroundedResponder.js`

| Question | Answer |
|----------|--------|
| Blocks false doctrine only? | **No** — forces full canned `*Reply()` bodies |
| Forces canned answer? | **Yes** — hardcoded templates with `deterministic: true` |
| Prevents historical reasoning? | **Yes for Sabbath** — old `sabbathReply` said "ask that directly" |
| Prevents follow-up understanding? | **Yes** — same template per topic |
| Causes repetition? | **Yes** — identical multi-paragraph bodies |

**Fix applied:** Adaptive replies — direct answer first, Scripture foundation, question-type aware (`definition`, `comparison`). Removed "ask that directly" redirect. Sabbath history delegated to deep responder.

---

### 4. `services/companionDoctrinePresenter.js`

| Question | Answer |
|----------|--------|
| Blocks false doctrine only? | **Neither** — wraps existing reply |
| Forces canned answer? | **No** — but stacks openings, bridges, study invitations |
| Prevents historical reasoning? | **Partially** — `routeHistoricalContext` may add vague buckets |
| Prevents follow-up understanding? | **Partially** — generic "compare related passages" default |
| Causes repetition? | **Yes** — `OPENINGS`, `TRANSITION`, stacked study blocks |

**Fix applied:** `answerFirstMode`, `suppressStudyPrompts`, `suppressMemory` flags. Study session still saved for continue-study; prompts withheld until answer complete.

---

### 5. `services/sabbathHistoryDeepResponder.js`

| Question | Answer |
|----------|--------|
| Blocks false doctrine only? | **No** — full static response (orthodox conclusion) |
| Forces canned answer? | **Yes** — static SCRIPTURE_BLOCK + HISTORICAL_CHAIN |
| Prevents historical reasoning? | **No for history** — provides A–E chain |
| Prevents follow-up understanding? | **Partially** — intro tailored; body was static |
| Causes repetition? | **Yes** — full scripture block on every follow-up |

**Fix applied:** Compact mode on correction/evidence/prior Sabbath turns. Companion tone lead-in. Direct conclusion earlier on follow-ups.

---

### 6. `services/doctrineSafetyLayer.js`

| Question | Answer |
|----------|--------|
| Blocks false doctrine only? | **Yes** — mode downgrade when chain lacks Tier A |
| Forces canned answer? | **No** |
| Prevents historical reasoning? | **Partially** — historical-only → RESEARCH_QUESTION mode |
| Causes repetition? | **No** |

**No change required** — guard/score layer only.

---

### 7. `services/studyModeGating.js`

| Question | Answer |
|----------|--------|
| Blocks false doctrine only? | **Yes** — tier/mode guard |
| Forces canned answer? | **No** |
| Prevents follow-up understanding? | **Minimal** — `NO_AUTO_PROMOTION` |

**No change required.**

---

### 8. `services/companionReplyPolish.js`

| Question | Answer |
|----------|--------|
| Blocks false doctrine only? | **Neither** |
| Forces canned answer? | **No** |
| Causes repetition? | **Reduces** — dedupe patterns |

**No change required** — keep and extend if needed.

---

### 9. `services/runtimeQualityValidator.js`

| Question | Answer |
|----------|--------|
| Blocks false doctrine only? | **Scores** forbidden phrases; does not block return |
| Forces canned answer? | **No** |
| Causes repetition? | **No** |

**No change required.**

---

### 10. `services/buddyBrain.js` (routing order)

**Order (after fix):**
1. Empty → fallback  
2. Crisis  
3. Continue study  
4. Study connection  
5. Memory recall  
6. Health  
7. Prayer  
8. Emotional support  
9. **`resolveQuestionIntent`** (new — attached to runtimeContext)  
10. **Sabbath history** (questionIntent + sabbathIntent)  
11. **Doctrine intercept** (with questionIntent gate)  
12. Registry study  
13. OpenAI / personalized fallback  

| Question | Answer |
|----------|--------|
| Forces early exits? | **Yes** — but now intent-aware |
| Prevents historical reasoning? | **Was yes** — generic `"sabbath"` hit doctrine canned path |
| Causes repetition? | **Was yes** — presenter always stacked study journey |

**Fix applied:** Question intent runs before doctrine; history/correction/evidence skip canned path; `answerFirstMode` on definition/comparison.

---

## New Modules (2.14C)

| Module | Role |
|--------|------|
| `questionIntentResolver.js` | Topic, question type, tone, depth, correction re-answer |
| `doctrineBoundaries.js` | Forbidden teachings as boundaries, not canned replies |

---

## Root Pattern

**Before:** Keyword → canned template → presenter stacks study/memory → user question ignored.

**After:** Question intent → answer directly → Scripture ground → history when asked → study only when appropriate.
