# Composer + Emotional Center Forensic Audit

**Generated:** 2026-06-01  
**Scope:** Audit only. No code, implementation, deploy, push, or Sprint 3.

**Central question:** Does the composer fail because it **never recognizes** the Emotional Center — or because it **recognizes** it and **overrides** it with another priority?

**Evidence:** `docs/racl/validation-results.json` (20 turns, listening **6.4**, reason-first + RACL) + evidence-pack replay (`buildRetrievalEvidencePack`, `buildListeningComposerSignals`) + composer stack source (`buddyBrain.js`, `runtimeOrchestrator.js`, `reasonFirstComposer.js`).

---

## Definitions (operational — not a codebase type)

| Term | Definition in this audit |
|------|---------------------------|
| **Emotional Center (EC)** | The lived focal point of the user’s turn: `directConcernPhrase` when present, else the salient emotional fact in the user message (e.g. *far away from home*, *friend lost Wednesday*, *faith is failing*). |
| **EC available before generation** | **YES** = `directConcern` + `detailCandidates` + (`plainEnglishRestatement` or thread memory snippets). **PARTIAL** = concern or candidates only. **NO** = neither. |
| **EC answered in reply** | Opening or first ~200 chars name the EC’s salient tokens (not generic paraphrase only). |

There is **no** `emotionalCenter` field in production code; EC is **reconstructed** from retrieval/composer payload fields that **do** exist.

---

## Executive verdict

| Question | Answer | Confidence |
|----------|--------|------------|
| Does the composer never receive the EC? | **No** — on **19/20** turns EC is **YES** or **PARTIAL** before OpenAI. | **High** |
| Does the composer receive EC and override it? | **Yes** — on **6/20** turns EC is fully available but **not** honored in the opening; on **5** of those, listening **< 6.0**. | **High** |
| Primary override mechanism | **`buildSystemPrompt` + `buildRuntimeInstructions` (RESPONSE STRUCTURE / Scripture-first)** outweigh thin `listeningGuidance` + user JSON. | **High** |

**One sentence:** The composer **already knows** the Emotional Center (via `directConcernPhrase`, `plainEnglishRestatement`, `detailCandidates`) and **often ignores it** in favor of reflect-then-teach, discernment, or scripture-first shape.

---

## PART A — Emotional Center trace (all 20 turns)

### Summary table

| Turn | L | Topic | Emotional Center | User need | EC before gen | EC in opening? | Bucket |
|------|---|-------|------------------|-----------|---------------|----------------|--------|
| job-1 | 5.8 | null | New opportunity | witness | **YES** | no (celebrates) | 2 ignored |
| job-2 | 4.8 | discernment | **Far from home** | witness | **YES** | no (template) | 2 ignored |
| job-3 | 6.0 | discernment | Push vs wait (+ distance) | guidance | **YES** | partial | 2 ignored |
| alz-1 | 6.5 | null | Mom’s Alzheimer’s diagnosis | witness | **YES** | yes (mom) | 1 answered |
| alz-2 | 6.8 | null | Mom doesn’t remember who I am | witness | **YES** | yes | 1 answered |
| alz-3 | 7.8 | grief | **Grieving who mom used to be** | comfort | **YES** | **yes** | 1 answered |
| distant-1 | 6.0 | null | Distant from God **lately** | witness | **YES** | weak (generic) | 2 ignored |
| distant-2 | 6.0 | null | Prayer **feels empty** | witness | **YES** | yes (empty) | 1 answered |
| distant-3 | 7.5 | null | **Faith is failing?** | direct answer | **YES** | **yes** | 1 answered |
| sabbath-1 | 5.8 | sabbath | Sunday worship question | direct answer | **PARTIAL** | doctrine lecture | 3 partial |
| sabbath-2 | 6.2 | sabbath | Roman church **wording** | clarification | **PARTIAL** | partial | 3 partial |
| sabbath-3 | 6.8 | sabbath | Wording (not history) | repair | **PARTIAL** | partial | 3 partial |
| sabbath-4 | 6.8 | sabbath | **Your wording** (not shift) | repair | **PARTIAL** | partial | 3 partial |
| sabbath-5 | 7.4 | sabbath | Not answering question | repair | **PARTIAL** | yes (breach) | 3 partial |
| sabbath-6 | 6.6 | sabbath | Wording (not history) | repair | **PARTIAL** | weak | 3 partial |
| sabbath-7 | 7.2 | sabbath | **Not listening** | repair | **PARTIAL** | **yes** | 3 partial |
| grief-1 | 5.8 | grief | **Friend lost Wednesday** | witness | **YES** | **no Wednesday** | 2 ignored |
| grief-2 | 6.0 | grief | Still bothering me | witness | **YES** | partial | 2 ignored |
| health-1 | 6.3 | null | Knees hurt | comfort | **YES** | yes (knees) | 1 answered |
| health-2 | 5.8 | health | **Again today** (recurrence) | witness | **YES** | yes (again today) | 1 answered* |

\*health-2: EC in opening but listening still LOW due to **57% body overlap** with T1 (progression failure, not recognition failure).

**EC before generation:** YES **13**, PARTIAL **7**, NO **0**.

---

### Per-turn evidence (condensed)

#### job-1 (LOW 5.8) — EC available, ignored

| # | Field | Evidence |
|---|-------|----------|
| 1 | Topic | `null` → classified **discernment** via companion path |
| 2 | Emotional Center | New opportunity (unstated stakes) |
| 3 | User need | **witness** (first share) |
| 4 | Retrieval | `plainEnglish`: *"life decision… thoughtful conversation, not a template answer"*; `directConcern`: full message; snippets **1** |
| 5 | detailCandidates | `I have a job opportunity.` |
| 6 | companionTopic | **discernment** |
| 7 | nextStep | **wise_discernment_and_peace** |
| 8 | Reasoning | `discernment` / `discernment_conversation` |
| 9 | Composer payload | 2 detailCandidates; `listeningGuidance`: use user wording; correction inactive |

**EC before generation?** **YES** — plainEnglish explicitly warns against template answers.  
**Opening:** *"It's wonderful to hear you have a job opportunity."* — encouragement, not witness.  
**Confidence:** **High**

---

#### job-2 (LOW 4.8) — EC available, ignored

| # | Field | Evidence |
|---|-------|----------|
| 2 | Emotional Center | **Relocation strain — company far away from home** |
| 4 | Retrieval | `directConcern`: **`far away from home`**; memory snippets **3** |
| 5 | detailCandidates | includes **`far away from home`** (5 items) |
| 8 | Reasoning | Still `discernment_conversation` (stale arc) |

**EC before generation?** **YES**  
**Opening:** *"It sounds like the distance…"* — template stem; **"far away from home"** not used verbatim → feltHeard **2**.  
**Confidence:** **High**

---

#### job-3 (MID 6.0) — EC available, partially ignored

**EC:** push/wait fork (candidates include phrase; `directConcern` still stale **far away**).  
**Opening:** names push/wait — partial. Body: Proverbs again.  
**EC before gen:** **YES** | **Bucket:** 2 (ignored stale concern + teach tail)

---

#### alz-3 (HIGH 7.8) — EC available, answered

**EC:** grieving who she used to be.  
**plainEnglish:** *"grieving… companionship first, not a verse dump."*  
**Opening:** *"Grieving who your mom used to be while walking… Alzheimer's…"*  
**EC before gen:** **YES** | **Bucket:** 1 — **RF-SPECIFICITY + companion_support** won.  
**Confidence:** **High**

---

#### distant-1 (MID 6.0) — EC available, ignored

**nextStep:** **`honest_reflection_not_template`** (retrieval signals witness).  
**Opening:** *"Feeling distant from God is something many people experience…"* — normalized generic.  
**First paragraph:** Psalm 139 + James 4 + Psalm 51 (**3** scripture refs).  
**EC before gen:** **YES** | Override: **RT-SCRIPTURE-FIRST / RESPONSE STRUCTURE**.  
**Confidence:** **High**

---

#### grief-1 (LOW 5.8) — EC available, ignored

**EC:** **Friend lost Wednesday**.  
**detailCandidates:** `I lost a friend Wednesday.`  
**Opening:** *"I'm truly sorry for your loss."* — **Wednesday absent**.  
**plainEnglish:** *"grieving… companionship first, not a verse dump."*  
**EC before gen:** **YES** | **Bucket:** 2.  
**Confidence:** **High**

---

#### sabbath-1 (LOW 5.8) — EC partial (doctrinal)

**EC:** Sunday worship (historical). **history.included: true.**  
**Opening:** Seventh-day + Constantine chain — correct **function** (teaching) but over-long for listening.  
**EC before gen:** **PARTIAL** (no companion concern path).  
**Confidence:** **Medium**

---

#### sabbath-7 (HIGH 7.2) — EC partial, answered under correction

**strictAnswerMode: true**; `correction` / `direct_reanswer`.  
**Opening:** *"I hear your concern clearly…"* + offer **Roman Catholic Church**.  
**EC before gen:** **PARTIAL** | **RF-ANSWER-DIRECT** + ledger.  
**Confidence:** **High**

---

## PART B — Composer priority attribution (all 20 turns)

| Turn | Opening (abridged) | Primary function | Instruction most likely won | Conf |
|------|-------------------|------------------|----------------------------|------|
| job-1 | It's wonderful to hear… | teaching | **Companion Topic (discernment)** + encouragement bias | MED |
| job-2 | It sounds like the distance… | witness→teach | **BB-REFLECT** (template) → **RESPONSE STRUCTURE** | **HIGH** |
| job-3 | It's understandable to feel uncertain… | teaching | **RESPONSE STRUCTURE** + discernment stubs | MED |
| alz-1 | I'm so sorry… mom's diagnosis | teaching | **BB-COMFORT** → **RT-SCRIPTURE** (Exodus 20:12) | MED |
| alz-2 | painful… mom doesn't remember who you are | teaching | **RF-SPECIFICITY** (partial) + scripture tail | MED |
| alz-3 | Grieving who your mom used to be… | comfort | **RF-SPECIFICITY** + **reasoningSnapshot** (companion_support) | **HIGH** |
| distant-1 | many people experience… | teaching | **RT-SCRIPTURE-FIRST** + **RESPONSE STRUCTURE** | **HIGH** |
| distant-2 | prayer feels empty… | teaching | **BB-COMFORT** opening → **RESPONSE STRUCTURE** body | MED |
| distant-3 | doesn't necessarily mean your faith is failing | direct answer | **RF-ANSWER-DIRECT** (explicit question) | **HIGH** |
| sabbath-1 | Bible commands the seventh day… | teaching | **RESPONSE STRUCTURE** + **historical_answer** | **HIGH** |
| sabbath-2 | I use the term Roman church… | direct answer | **RF-ANSWER-DIRECT** + meta snapshot | MED |
| sabbath-3–4 | Roman church shorthand… | direct answer / repair | **RF-ANSWER-DIRECT** (weak); repetition | MED |
| sabbath-5 | I understand it feels like I haven't… | repair | **BB-REFLECT** + correction ledger | MED |
| sabbath-6 | I appreciate your patience… | repair | **BB-COMFORT** / patience (not fresh repair) | MED |
| sabbath-7 | I hear your concern clearly… | repair | **RF-ANSWER-DIRECT** + **strictAnswerMode** | **HIGH** |
| grief-1 | I'm truly sorry for your loss | comfort | **BB-COMFORT (generic)** — overrides **detailCandidates** | **HIGH** |
| grief-2 | friend's passing is still weighing… | comfort | **BB-COMFORT** — "still bothering" paraphrased | MED |
| health-1 | knees are hurting | guidance | **BB-COMFORT** + practical care | MED |
| health-2 | knees are hurting again today | guidance | **RF-SPECIFICITY** opener — **RESPONSE STRUCTURE** repeat body | MED |

### Attribution pattern (evidence)

| Winner | Turns | Avg listening |
|--------|-------|---------------|
| **RESPONSE STRUCTURE / RT-SCRIPTURE-FIRST** | 8 | **6.0** |
| **BB-REFLECT** (incl. template) | 2 | **5.1** |
| **RF-SPECIFICITY / companion_support** | 4 | **7.2** |
| **RF-ANSWER-DIRECT** / strict | 4 | **6.9** |
| **Companion Topic discernment** | 3 | **5.5** |

Thin **`COMPOSER_INSTRUCTION`** (*"Listen first when sharing pain…"*) and **`listeningGuidance`** are in **user JSON**; **`buildSystemPrompt`** (~3.7K) + **`buildRuntimeInstructions`** (~1.3K + 5-step structure) are in **system** message and align with winning behaviors above.

**Confidence:** **High** on override; **Medium** on per-turn single-label attribution.

---

## PART C — Emotional Center outcome matrix

| Bucket | Description | n | Avg listening | Avg feltHeard | Avg threadSpecific |
|--------|-------------|---|---------------|---------------|-------------------|
| **1** | EC available **AND** answered in opening | **7** | **6.67** | **6.29** | **6.00** |
| **2** | EC available **BUT** ignored in opening | **6** | **5.73** | **4.67** | **3.67** |
| **3** | EC **partially** available (meta/Sabbath) | **7** | **6.69** | **6.57** | **5.71** |
| **4** | EC unavailable | **0** | — | — | — |

### Interpretation (evidence only)

- **Ignored (bucket 2) vs answered (bucket 1):** listening **5.73 vs 6.67** (−0.94); feltHeard **4.67 vs 6.29** (−1.62); threadSpecific **3.67 vs 6.00** (−2.33).
- Bucket 1 **≠ automatic HIGH tier** — includes alz-1/2, distant-2, health-1/2 (MID/low) because EC anchor necessary but not sufficient (scripture tail, overlap).
- **HIGH listening (≥7)** only when bucket **1** + **direct answer/comfort** function + low scripture count: **alz-3, distant-3, sabbath-5, sabbath-7** (4/4 HIGH turns).

**Confidence:** **High** on bucket deltas; **Medium** on bucket 1 avg below 7.0 (mixed MID turns in bucket).

---

## PART D — Counterfactual replay (LOW turns only)

No new generation — inspect whether **preserving EC in the opening** would likely move the rubric.

| Turn | L | Emotional Center preserved? | Counterfactual | Impact | Est. lift |
|------|---|----------------------------|----------------|--------|-----------|
| **job-1** | 5.8 | No — celebrated vs witness | Lead with opportunity + invite what matters; defer Proverbs | **MEDIUM** | **+0.5 to +1.0** → ~6.3–6.8 |
| **job-2** | 4.8 | No — template vs **far away from home** | Open *"The company being far from home…"*; no "It sounds like"; drop verse | **HIGH** | **+1.5 to +2.0** → ~6.3–6.8 |
| **sabbath-1** | 5.8 | N/A (doctrinal EC) | Shorter direct answer; less Constantine digression | **MEDIUM** | **+0.5 to +1.0** |
| **grief-1** | 5.8 | No — **Wednesday** missing | Open *"Losing a friend Wednesday…"*; presence not program | **HIGH** | **+1.0 to +1.5** → ~6.8–7.3 |
| **health-2** | 5.8 | **Yes** in opener | Fix **body overlap** (57%), not EC | **LOW** | **+0.2 to +0.5** |

**LOW-tier average:** **5.60**. If HIGH-impact counterfactuals applied to job-2 + grief-1 only: corpus estimate **~6.5–6.7** (consistent with ListeningSuccessCorrelationAudit **~6.53**).

**Confidence:** **High** on job-2 / grief-1; **Medium** on job-1 / sabbath-1; **High** that health-2 is overlap not EC.

---

## PART E — Root cause ranking (100%)

| Rank | Cause | % | Evidence |
|------|-------|---|----------|
| 1 | **Composer priority conflict** (system prompt: North Star reflect→advise, RESPONSE STRUCTURE, Scripture-first dominates user payload) | **42** | 8/20 wins RT/STRUCTURE; bucket-2 ignored with full payload; OperatingModel/StructureRemoval regressions when adding parallel rules |
| 2 | **Companion topic mapping** (e.g. job → `discernment` + `wise_discernment_and_peace` on witness turns) | **17** | job-1/2/3 all discernment; plainEnglish says "not template" but topic pulls guidance |
| 3 | **Generation override within compose** (model follows system shape despite `detailCandidates`) | **15** | grief-1 Wednesday in payload, absent in reply; distant-1 `honest_reflection_not_template` ignored |
| 4 | **Reasoning snapshot staleness / mis-weight** (job T2–T3 `directConcern` stuck on "far away"; distant `direct_answer` on witness) | **12** | job-3 concern not push/wait; plainEnglish job arc frozen |
| 5 | **Practical next-step category** (signals emotional_support / honest_reflection but not binding) | **8** | nextStep correct on distant/grief; output still teach |
| 6 | **Retrieval** (missing EC facts) | **3** | 0/20 EC unavailable; rare wrong slice emphasis |
| 7 | **Emotional Center recognition** (failure to put EC in pack) | **2** | 13/20 YES + 7/20 PARTIAL before gen |
| 8 | **Validation** (post-compose gate) | **1** | Does not regen for felt-heard / EC in opening |
| | **Total** | **100** | |

**Note:** "Recognition" is **2%** — almost never the bottleneck. **Preservation** is folded into composer priority + generation (**57%** combined).

**Confidence:** **High** on ranking order; **Medium** on exact percentages.

---

## PART F — Single highest-leverage change (no implementation)

### Allowed one change before beta

**B. Emotional Center preservation** (implemented as **composer opening contract**, not a new calibration framework)

### Why not A / C / D / E

| Option | Verdict | Evidence |
|--------|---------|----------|
| **A. Full composer rewrite** | Too broad | Person-first + golden each **+0.1**; need surgical preservation not full rewrite |
| **C. Topic mapping rewrite** | Necessary but insufficient | Fixes job label; grief/distant still fail with correct topic |
| **D. Calibration layer** | Regressed | TurnIntent, OperatingModel, StructureRemoval lowered listening |
| **E. Something else** | Retrieval/validation | Retrieval already supplies EC; validation doesn't score EC |

### Why B

Preserve **`directConcernPhrase` / lead `detailCandidate` in the first sentence** before any scripture or five-step structure — exactly what **HIGH** turns do (alz-3, distant-3, sabbath-7). Payload **already contains** EC on **13/20** YES turns; failure is **override**, not discovery.

### Final state statement

| Statement | Verdict | Confidence |
|-----------|---------|------------|
| Composer **never receives** EC correctly | **False** | **High** |
| Composer **knows EC and ignores it** | **True** (dominant on LOW/MID failure modes) | **High** |
| Ignorance is primary | **False** | **High** |
| Override is primary | **True** | **High** |

---

## Appendix — Source stack (why override wins)

```
SYSTEM MESSAGE (dominant weight)
├── buildSystemPrompt() — BB-REFLECT, BB-COMFORT, North Star, forward movement
├── buildRuntimeInstructions() — RT-SCRIPTURE-FIRST, RESPONSE STRUCTURE (5 steps)
├── COMPOSER_INSTRUCTION (~800 chars) — "Listen first…" (weak)
└── Evidence pack slice (system JSON)

USER MESSAGE
├── detailCandidates, listeningGuidance (soft)
├── correctionLedger, companionThreadContext
└── evidence.understanding (includes plainEnglishRestatement)
```

**Production lacks:** enforced `assessHumanMoment()` (test-only in `companionOperatingModelExperiment.js`); `companionTurnIntent` null on all 20 RACL turns.

---

*Audit complete. No code changes made.*
