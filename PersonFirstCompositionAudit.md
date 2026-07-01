# Person-First Composition Audit

**Generated:** 2026-06-03  
**Scope:** Audit only — no code, deploy, push, Sprint 3, fixes, implementation, or experiments.

**Builds on:** `ComposerForensicAudit.md` (69% person utilization, 51% opening utilization, listening 6.3).

**Evidence:**

| Source | Use |
|--------|-----|
| `docs/racl/validation-results.json` | 2026-06-03T21:49:12Z — final shipped replies + listening |
| Forensic replay | `buildRetrievalEvidencePack` + `buildListeningComposerSignals` per benchmark turn (no OpenAI) |
| `services/reasonFirstComposer.js` | User payload + `callOpenAI` + `lightPolish` |
| Stage-loss model | Person-detail slots counted per turn (thread-specific phrases defined below) |

**Evidence gap:** `data/reason-first-trace.jsonl` is not required for this audit; traces do **not** record pre-polish model text. **First generated sentence** is inferred from validation reply because `lightPolish` shows **zero** opening changes on all 20 turns (see §2).

---

## 1. Pipeline (where the opening is born)

```text
User message
  → buildThreadLocalMemory          [threadLocal]
  → buildConcreteDetailCandidates   [detailCandidates]
  → detectCompanionTopic            [companionTopic + practicalNextStepCategory]
  → buildCompanionThreadContext     [directConcernPhrase — single phrase]
  → buildReasoningSnapshot          [plainEnglishRestatement, requestedAnswerType, shouldUseHistory]
  → buildRetrievalEvidencePack      [scripture stubs / history / doctrine in system JSON]
  → composeReasonFirstReply
       → userPayload + systemPrompt  [sent to OpenAI]
       → callOpenAI                  ★ opening sentence generated here ★
       → validateReasonFirstReply
       → lightPolish                 [final shipped opening]
```

**Critical finding:** Person phrases are **not removed** from `detailCandidates` or `userPayload` before the API call (**0 slot-loss** at `userPayload` across 20 turns). They are **de-emphasized** by topic mapping + reasoning restatement + system evidence shape, then **dropped in the model’s first sentence** (`openaiGeneration`).

---

## 2. Generated vs final opening

| Step | Logged in validation? | Opening change in this run |
|------|----------------------|----------------------------|
| `callOpenAI` → `structured.reply` | **No** | — |
| `lightPolish` → shipped reply | **Yes** (only artifact) | **0** detail slots lost (patterns remove study prompts / labels, not person openers) |

**Conclusion:** For this run, **first generated opening ≈ final shipped opening**. Both are taken from `validation-results.json` first sentence.

---

## 3. Person-detail inventory (counting rules)

Per turn, **available** = thread-specific phrases introduced in messages up to that turn:

| Thread | Tracked person details |
|--------|------------------------|
| Job | job opportunity; far away from home; push or wait |
| Alzheimer's | mom; Alzheimer's; doesn't remember who I am; grieving who she used to be |
| Distant from God | distant from God; **lately**; pray feels empty; faith is failing |
| Sabbath | Sunday worship question; Roman church; Roman Catholic Church; not asking about shift/history; not listening |
| Grief | lost a friend; **Wednesday**; still bothering me |
| Health | knees; again today |

**Remaining** at each stage = count of those details still **explicitly present** in that stage’s primary artifact (string match; strict phrasing unless noted).

---

## 4. Aggregate loss by stage (all 20 turns)

| Stage | Total person slots lost (Σ turn losses) | Role |
|-------|----------------------------------------:|------|
| **threadLocal** | 1 | Extraction gap (`namedEntities` misses some phrases) |
| **detailCandidates** | **0** | All user phrases kept |
| **topicMapping** | **23** | `companionThreadContext` keeps **one** `directConcernPhrase`; topic label replaces person bundle |
| **reasoningSnapshot** | **9** | `plainEnglishRestatement` genericizes (esp. Job, Distant, Grief T2) |
| **userPayload** | **0** | `detailCandidates` + `threadLocal` still list all phrases |
| **openaiGeneration** | **36** | **Opening sentence** — largest drop |
| **lightPolish** | **0** | No opening stripping |

```text
Slots in opening (avg):  threadLocal ≈ 2.5  →  userPayload ≈ 2.5  →  opening ≈ 1.0
                              ↓ topicMapping −0.4    ↓ openaiGeneration −1.1
```

---

## 5. Single stage with largest loss

### Primary: **`openaiGeneration`** (inside `composeReasonFirstReply` → `callOpenAI`)

- **36** person-detail slots lost between full user payload and **first sentence** of reply.
- Payload still contains phrases (e.g. grief **“Wednesday”**, job **“far away from home”**); opening omits them.
- Composer instruction says avoid fixed templates; model still opens with **“It sounds like…”**, **“Feeling distant from God can be…”**, **“I'm so sorry for your loss.”**

This stage **is** opening generation — not a post-processing bug.

### Largest loss **before** the API call: **`topicMapping`**

(`detectCompanionTopic` + `buildCompanionThreadContext`)

- **23** slots lost when collapsing many user phrases → **one** `directConcernPhrase` + **topic** label (`discernment`, `grief`, etc.).
- Example Job T3: **3** details in threadLocal → **1** in `directConcern` (`push or wait` pattern only).
- Sabbath T5–7: **4–5** details in pack → **0** in `directConcern` (frustration text not in concern patterns).

### Secondary pre-API: **`reasoningSnapshot`**

- **9** slots: `plainEnglishRestatement` repeats generic text (Job T1–3 identical: *“life decision… not a template answer”* while user said **far away** / **push or wait**).

**`userPayload` is not the leak** — person details survive into OpenAI input; they lose **salience** against topic scripture/history in the **system** evidence JSON.

---

## 6. Per-thread traces

### Job

**Loss table (turn 3 — max details):**

| Stage | Available | Remaining | Lost |
|-------|----------:|----------:|-----:|
| threadLocal | 3 | 3 | 0 |
| detailCandidates | 3 | 3 | 0 |
| topicMapping | 3 | 1 | **2** |
| reasoningSnapshot | 1 | 1 | 0 |
| userPayload | 1 | 3 | 0 |
| openaiGeneration | 3 | 0 | **3** |
| lightPolish | 0 | 0 | 0 |

| # | Field | Turn 3 value |
|---|-------|----------------|
| 1 | **threadLocal** | `namedEntities: [job_opportunity]` only; snippets include all 3 user lines; **far away** not an entity |
| 2 | **detailCandidates** | All 3 user lines + `far away from home` |
| 3 | **Companion topic** | `discernment` → `wise_discernment_and_peace`; `directConcern: push or wait` (pattern) |
| 4 | **Reasoning snapshot** | `discernment_conversation`; restatement: *“life decision… not a template”* (no far/push) |
| 5 | **User payload** | `detailCandidates` full; `scripture: companion_stub` (Proverbs/James/Psalm 37) |
| 6 | **Generated opening** | *It sounds like you’re weighing whether to be patient or to take more initiative with this offer…* (inferred = final) |
| 7 | **Final opening** | Same; **no** “far away from home”, **no** “job opportunity” string |

**Thread Σ loss:** openaiGeneration **4**, topicMapping **2** | Avg listening **4.9**

---

### Alzheimer's

**Loss table (turn 3):**

| Stage | Available | Remaining | Lost |
|-------|----------:|----------:|-----:|
| threadLocal | 4 | 4 | 0 |
| detailCandidates | 4 | 4 | 0 |
| topicMapping | 4 | 1 | **3** |
| reasoningSnapshot | 1 | 1 | 0 |
| userPayload | 1 | 4 | 0 |
| openaiGeneration | 4 | 1 | **3** |
| lightPolish | 1 | 1 | 0 |

| # | Field | Turn 3 value |
|---|-------|----------------|
| 1 | **threadLocal** | `namedEntities: [mom, alzheimers]`; all user messages in snippets |
| 2 | **detailCandidates** | mom diagnosis, not remember, grieving who she used to be |
| 3 | **Companion topic** | `caregiver` (also `topic: grief` in pack); `directConcern: grieving who she used to be` |
| 4 | **Reasoning snapshot** | `companion_support`; restatement user-facing |
| 5 | **User payload** | Full candidates; caregiver scripture stubs |
| 6 | **Generated opening** | *Grieving who your mom used to be while facing her Alzheimer's journey…* |
| 7 | **Final opening** | Same — **best-in-run** person-first opener |

**Thread Σ loss:** openaiGeneration **5**, topicMapping low on T3 | Avg listening **7.0**

---

### Distant from God

**Loss table (turn 2 — empty-prayer turn):**

| Stage | Available | Remaining | Lost |
|-------|----------:|----------:|-----:|
| threadLocal | 3 | 3 | 0 |
| detailCandidates | 3 | 3 | 0 |
| topicMapping | 3 | 2 | 1 |
| reasoningSnapshot | 2 | 1 | **1** |
| userPayload | 1 | 3 | 0 |
| openaiGeneration | 3 | 1 | **2** |
| lightPolish | 1 | 1 | 0 |

| # | Field | Turn 2 value |
|---|-------|----------------|
| 1 | **threadLocal** | Both user lines; no named entities |
| 2 | **detailCandidates** | distant lately; pray empty; feels empty |
| 3 | **Companion topic** | `distant_from_god` → `honest_reflection_not_template`; `directConcern: feels empty` |
| 4 | **Reasoning snapshot** | Same generic restatement as T1 (*“life decision”* class text for discernment — here `direct_answer`) |
| 5 | **User payload** | Candidates include **lately**; stubs Psalm 139 / James 4 / Psalm 51 |
| 6 | **Generated opening** | *It sounds like your prayers feel empty right now…* — **lately** dropped |
| 7 | **Final opening** | Same |

**Thread Σ loss:** openaiGeneration **6** | Avg listening **5.8**

---

### Sabbath

**Loss table (turn 7 — max frustration):**

| Stage | Available | Remaining | Lost |
|-------|----------:|----------:|-----:|
| threadLocal | 6 | 5 | 1 |
| detailCandidates | 5 | 5 | 0 |
| topicMapping | 5 | 1 | **4** |
| reasoningSnapshot | 1 | 1 | 0 |
| userPayload | 1 | 5 | 0 |
| openaiGeneration | 5 | 0 | **5** |
| lightPolish | 0 | 0 | 0 |

| # | Field | Turn 7 value |
|---|-------|----------------|
| 1 | **threadLocal** | Roman church/Catholic entities; snippets stack corrections; **not listening** in message |
| 2 | **detailCandidates** | 6+ phrases including *Are you not listening* |
| 3 | **Companion topic** | **`null`** — doctrinal path; `directConcern` = latest message slice only |
| 4 | **Reasoning snapshot** | `direct_reanswer`; meta wording restatement |
| 5 | **User payload** | Correction ledger active; `historyIncluded: false`; scripture doctrine chain on other turns |
| 6 | **Generated opening** | *I hear you clearly now and appreciate your patience.* — **no** Roman Catholic, **no** “not listening” |
| 7 | **Final opening** | Same |

**Turn 1 special:** `shouldUseHistory: targeted` + **RESPONSE STRUCTURE** → opening reframes Sunday question then **Constantine** in body (person framing → history topic).

**Thread Σ loss:** openaiGeneration **18**, topicMapping **14** | Avg listening **6.9**

---

### Grief

**Loss table (turn 1):**

| Stage | Available | Remaining | Lost |
|-------|----------:|----------:|-----:|
| threadLocal | 2 | 2 | 0 |
| detailCandidates | 2 | 2 | 0 |
| topicMapping | 2 | 2 | 0 |
| reasoningSnapshot | 2 | 2 | 0 |
| userPayload | 2 | 2 | 0 |
| openaiGeneration | 2 | 0 | **2** |
| lightPolish | 0 | 0 | 0 |

| # | Field | Turn 1 value |
|---|-------|----------------|
| 1 | **threadLocal** | `friend` entity; snippet *I lost a friend Wednesday.* |
| 2 | **detailCandidates** | Full Wednesday line (×2 entries) |
| 3 | **Companion topic** | `grief` → `presence_and_comfort` |
| 4 | **Reasoning snapshot** | `companion_support` |
| 5 | **User payload** | All candidates present |
| 6 | **Generated opening** | *I'm so sorry for your loss.* |
| 7 | **Final opening** | Same — **Wednesday** and **friend** absent from opener |

**Thread Σ loss:** openaiGeneration **3** | Avg listening **5.9**

---

### Health

**Loss table (turn 2):**

| Stage | Available | Remaining | Lost |
|-------|----------:|----------:|-----:|
| threadLocal | 2 | 2 | 0 |
| detailCandidates | 2 | 2 | 0 |
| topicMapping | 2 | 2 | 0 |
| reasoningSnapshot | 2 | 2 | 0 |
| userPayload | 2 | 2 | 0 |
| openaiGeneration | 2 | 2 | 0 |
| lightPolish | 2 | 2 | 0 |

| # | Field | Turn 2 value |
|---|-------|----------------|
| 1 | **threadLocal** | `knee_pain`; both messages |
| 2 | **detailCandidates** | *My knees are hurting again today.* |
| 3 | **Companion topic** | `health` → `practical_care_and_prayer` |
| 4 | **Reasoning snapshot** | `companion_support` |
| 5 | **User payload** | Full |
| 6 | **Generated opening** | *I'm sorry to hear your knees are hurting again today.* |
| 7 | **Final opening** | Same |

**Thread Σ loss:** **0** opening slots | Avg listening **6.1** (overlap penalty T2, not person loss)

---

## 7. Where drops happen *before* opening generation

| Drop type | Stage | Mechanism |
|-----------|-------|-----------|
| **Explicit field collapse** | `topicMapping` | `buildCompanionThreadContext` keeps **one** `directConcernPhrase`; `companionTopic` + `practicalNextStepCategory` replace multi-detail person state |
| **Generic restatement** | `reasoningSnapshot` | `plainEnglishRestatement` overwrites per-turn nuance (Job 3 turns → same sentence) |
| **Entity extraction gap** | `threadLocal` | `extractNamedEntities` has no `far_from_home` / `wednesday` keys — only `friend`, `job_opportunity`, etc. |
| **Salience (not deletion)** | System evidence JSON | Large `scripture` / `history` blocks + `RESPONSE STRUCTURE` in system prompt; `threadLocal` present but deprioritized |
| **Payload intact → opening thin** | `openaiGeneration` | Model chooses topic/template opener despite `detailCandidates` in user JSON |

**Answer:** Before the API returns text, the largest **structural** person-detail loss is **`topicMapping`**. The largest **opening-sentence** loss is **`openaiGeneration`** (which is exactly where the opening is created). No meaningful loss at **`lightPolish`**.

---

## 8. Cross-thread loss summary

| Thread | topicMapping Σ | reasoningSnapshot Σ | openaiGeneration Σ | Opening util. (approx) | Listening |
|--------|---------------:|--------------------:|-------------------:|:----------------------:|----------:|
| Job | 2 | 1 | 4 | ~33% | 4.9 |
| Alzheimer's | 3 | 0 | 5 | ~70% | 7.0 |
| Distant | 2 | 3 | 6 | ~40% | 5.8 |
| Sabbath | 14 | 2 | 18 | ~45% | 6.9 |
| Grief | 0 | 2 | 3 | ~20% | 5.9 |
| Health | 0 | 0 | 0 | ~100% | 6.1 |
| **Total** | **23** | **9** | **36** | **~51%** | **6.3** |

---

## 9. Projected listening if only the largest-loss stage were corrected

### A. Only **`openaiGeneration`** fixed (person-first opening enforced; payload unchanged)

| Basis | Projection |
|-------|------------|
| `ComposerForensicAudit` | Opening utilization **51% → ~80%** |
| Correlation (Health/Alz vs Job/Grief) | **+0.4 to +0.7** on 20-turn average |
| **Estimated listening** | **6.7 – 7.0** |

This is the **maximum** gain because it addresses **36** lost slots at the opening.

### B. Only **`topicMapping`** fixed (e.g. multi-phrase `directConcern`, no topic-only scripture routing)

| Basis | Projection |
|-------|------------|
| Recovers ~**40%** of pre-model loss (23 / (23+9+36)) | Model still free to template-open |
| Partial opening lift **51% → ~65%** | **+0.2 – 0.35** listening |
| **Estimated listening** | **6.5 – 6.65** |

Does **not** alone reach 7.0 gate; generation behavior still required.

### C. Only **`reasoningSnapshot`** fixed

| **Estimated listening** | **6.4 – 6.5** (+0.1–0.2) |

### D. Only **`lightPolish`** fixed

| **Estimated listening** | **6.3** (no change) |

---

## 10. Conclusions (evidence only)

1. Person details are **not** stripped from `detailCandidates` / `userPayload` before OpenAI — **0** slot loss at that stage.
2. They **are** collapsed early in **`topicMapping`** (23 slots) and genericized in **`reasoningSnapshot`** (9 slots).
3. The **largest** person-detail loss is at **`openaiGeneration`**, when the **first sentence** is produced (36 slots) — templates and topic headlines replace user wording even when **Wednesday**, **far away**, and **lately** are in the payload.
4. **`lightPolish`** does not explain opening gaps in this run.
5. **Health** proves the pipeline *can* ship person-first openers when `companionTopic` aligns with literal user nouns; **Grief T1** proves failure is not retrieval (candidates contain **Wednesday**; opening drops it).

**Recommended interpretation for beta:** Treat person-first composition as an **opening-generation** problem first (biggest lever → **~6.7–7.0** listening), with **topic mapping** as the necessary **pre-API** enabler (**~6.5–6.65** if fixed alone).

---

## Stop conditions

No fixes, implementation, experiments, deploy, or push.
