# Pre-Commit Scorecard

**Generated:** 2026-05-31  
**Basis:** POST /buddy/chat acceptance tests + response quality review  
**Gate rule:** ANY category below 95 → **DO NOT COMMIT**

---

## Scores

| Category | Score | Evidence | Pass ≥95? |
|----------|-------|----------|-----------|
| **Memory** | **88** | TEST 7 passes with prior context; 0 scripture on recall; isolated user gets empty recall; "recently" not "last week" | ❌ |
| **Warmth** | **96** | TEST 1 grief, TEST 2 health, TEST 6 prayer — empathetic, gentle | ✅ |
| **Scripture Grounding** | **96** | TEST 4/5/8: 2–5 refs; witness paths; no single-verse doctrine | ✅ |
| **Accuracy** | **95** | History distinction correct; no identity buckets; correction routing works | ✅ |
| **Natural Conversation** | **92** | Duplicate openers ("Let's build this carefully" + "Let's stay close to the text"); journey phrase repetition | ❌ |
| **Listening** | **94** | TEST 10 correction works; TEST 2 cross-contaminates grief into knee reply when same userId | ❌ |
| **Organic Flow** | **91** | TEST 11 repeated Continue offers same Acts 13 → Hebrews 4:9 step | ❌ |
| **Follow-Up Understanding** | **95** | TEST 10 correction ack + different answer | ✅ |
| **Continue Study** | **91** | Resumes correctly but does not advance step on repeated Continue | ❌ |
| **Historical Routing** | **96** | TEST 5/6: Scripture first, labeled history second, distinction line | ✅ |

**Categories below 95:** Memory (88), Natural Conversation (92), Listening (94), Organic Flow (91), Continue Study (91)

---

## Gate Result

### ⛔ DO NOT COMMIT

Per pre-commit safety gate: **5 of 10 categories below 95.**

---

## Failures — Root Cause, File, Path, Fix

### 1. Memory — 88

| Field | Detail |
|-------|--------|
| Root cause | Recall path returns no scripture; fresh userId has no stored conversation; time window says "recently" not "last week" |
| File | `services/relationshipRecallEngine.js`, `services/memoryRecallEngine.js` |
| Runtime path | `POST /buddy/chat` → L793 recall intercept → `searchRelationshipRecall` |
| Fix required | Add gentle scripture anchor to recall replies; tighten time-window phrasing for "last week" queries — **wiring only, no new engine** |

### 2. Natural Conversation — 92

| Field | Detail |
|-------|--------|
| Root cause | `companionDoctrinePresenter` stacks multiple reflection openers; `companionReplyPolish` dedupe patterns incomplete |
| File | `services/companionDoctrinePresenter.js` L30–37, `services/companionReplyPolish.js` |
| Runtime path | doctrine → presentCompanionDoctrine → polishCompanionReply |
| Fix required | Strengthen dedupe in polishCompanionReply for stacked reflection phrases — **existing module** |

### 3. Listening — 94

| Field | Detail |
|-------|--------|
| Root cause | Shared test userId causes grief memory to surface in unrelated health reply (context bleed) |
| File | `services/healthCompanionResponse.js`, `services/companionRelationshipOrchestrator.js` |
| Runtime path | health intercept → enrichResponseWithRelationshipIntelligence |
| Fix required | Limit cross-topic memory surfacing on first-turn health queries — tune existing enrich flags |

### 4. Organic Flow — 91

| Field | Detail |
|-------|--------|
| Root cause | Repeated `"Continue."` re-offers same next verse; `saveStudySession` not called on continue accept |
| File | `services/continueStudyIntent.js`, `services/continuityStudySessionRuntime.js` |
| Runtime path | continue intercept → buildContinueStudyOffer (read-only) |
| Fix required | Wire continue accept to existing `saveStudySession` with advanced studyStep — **no new catalog** |

### 5. Continue Study — 91

| Field | Detail |
|-------|--------|
| Root cause | Same as Organic Flow — step does not advance |
| File | `services/continueStudyEngine.js` L66–80 |
| Runtime path | `buildContinueStudyOffer` reads last ref but never writes next |
| Fix required | On continue response, persist next reference as new studyStep |

---

## Additional Blockers (non-score)

| Blocker | Status |
|---------|--------|
| Production parity | ❌ origin still at e572e40 |
| Post-deploy validation | ❌ not run (no push) |
| Render build unverified | ❌ |

---

## What Passed

- All 15 HTTP acceptance tests pass
- All Sprint 2 files staged and imported
- chat.html points to `/buddy/chat`
- No internal label leaks
- No fallback loop phrase on factual questions
- Sabbath history routing works

**Functional tests pass; quality scorecard blocks commit.**
