# Prompt Hierarchy Conflict Resolution Audit

**Generated:** 2026-06-03  
**Scope:** Audit only — no code, deploy, push, Sprint 3, fixes, or implementation.

**Evidence:** Reason-first prompt assembly (`buddyBrain.js`, `runtimeOrchestrator.js`, `reasonFirstComposer.js`, `listeningSpecificityValidator.js`); `docs/racl/validation-results.json` (2026-06-03T21:49:12Z); `OpeningSentenceAttributionAudit.md`; `docs/companion-intelligence/validation-results.json` (Companion Presence **96** on S214 heuristic).

---

## 1. What OpenAI actually receives (assembly order)

Two messages per compose turn:

```text
[SYSTEM]
  §1  Persona header
  §2  Permanent North Star (5 bullets)
  §3  Companion style (8 bullets)          ← BB-REFLECT, BB-COMFORT, BB-NOT-TEMPLATE
  §4  Scripture rules
  §5  Safety rules
  §6  Adaptive user profile
  §7  Mode / persona key
  §8  buildRuntimeInstructions()           ← RT-* (PRIMARY FOUNDATION + RESPONSE STRUCTURE)
  §9  JSON response shape contract
  §10 COMPOSER_INSTRUCTION (reasonFirst)   ← RF-* including RF-SPECIFICITY
  §11 Evidence pack (facts only): {JSON}   ← EV-*, RS-*, threadLocal, companionTopic, history…

[USER — JSON string]
  §12 userMessage
  §13 conversationHistory
  §14 activeConversation, threadLocal
  §15 detailCandidates
  §16 listeningGuidance                    ← LG-* (duplicates RF-SPECIFICITY + lists candidates)
  §17 correctionLedger (if active)
  §18 companionThreadContext
  §19 evidence { memory, scripture, history, doctrine, understanding, companionContext }
  §20 regenInstruction (if retry)
```

**Hierarchy reality:** There is **no explicit priority field**. Effective priority = **(estimated strength)** × **structural salience** × **freedom from contradiction**. Large **§11 evidence JSON** and **§8 runtime block** compete with late specificity lines.

---

## 2. Master instruction table

| Instruction | Source | Priority (1=highest) | Est. strength /10 | Position in final prompt | Conflicts with | Observed effect |
|-------------|--------|----------------------|-------------------|--------------------------|----------------|-----------------|
| Help the user **feel heard before instructed** | `buddyBrain.js` North Star §2 | **1** | **9** | System §2 (first behavioral rule) | RF-SPECIFICITY (specifics after hear) | Topic-level empathy before concrete tokens |
| **Reflect** the user's actual situation in **one sentence before advising** | `buddyBrain.js` Companion §3 | **2** | **8** | System §3 (~line 295) | LG-NO-TEMPLATE, RF-SPECIFICITY | **"It sounds like…"** openers (~40% turns) |
| **Comfort first** if overwhelmed; Scripture light | `buddyBrain.js` Companion §3 | **3** | **7** | System §3 | RF-SPECIFICITY, person detail in opener | **"I'm so sorry for your loss"** (Grief T1); drops **Wednesday** |
| **Listen first** when pain/uncertainty; **answer directly** when question/correction | `reasonFirstComposer.js` COMPOSER §10 | **4** | **8** | System §10 (late, imperative) | BB-REFLECT on pain turns (listen → reflect template) | Comfort or meta openers on grief/Sabbath |
| **Prioritize explicit Scripture first**; Sabbath → Scripture then history | `runtimeOrchestrator.js` §8 | **5** | **7–9** (doctrinal) | System §8 (large mid-block) | RF-SPECIFICITY on Sabbath T1 | Sunday question → historical-topic body |
| **RESPONSE STRUCTURE** (5 numbered steps) | `runtimeOrchestrator.js` §8 | **6** | **7** (doctrinal) | System §8 | LG-NO-TEMPLATE, short person opener | Doctrinal essay shape |
| **Choose the right kind of response** (not mini-essay) | `reasonFirstComposer.js` §10 | **7** | **6** | System §10 | — | Topic mode selection via evidence |
| **Prefer specific details**… **not as a fixed opening template** | `reasonFirstComposer.js` SPECIFICITY_HINT §10 | **8** | **5** | System §10 (one line) | **BB-REFLECT**, BB-COMFORT | Wins on Health, Alz T2–3 only (~15% turns) |
| Respond to **specific** message, **not a generic template** | `buddyBrain.js` Companion §3 | **9** | **4** | System §3 (adjacent to BB-REFLECT) | BB-REFLECT (same section) | **Overridden** by reflect sentence rule |
| **Prefer specific details** / **not fixed opening template** | `listeningSpecificityValidator.js` → user §16 | **10** | **6** | User JSON (second message) | BB-REFLECT in system §3 | Same text as RF-SPECIFICITY; still loses to reflect |
| **detailCandidates:** … (user phrases) | `listeningSpecificityValidator.js` → user §15 | **11** | **6** (data, not rule) | User JSON | — | **0 loss** to payload; ignored at generation |
| **plainEnglishRestatement** (generic discernment, wording meta) | `reasoningSnapshot.js` → evidence §11 | **12** | **5** | System §11 `understanding` | Person phrases in candidates | Job: all turns “life decision” topic frame |
| **companionTopic** + scripture **companion_stub** | `retrievalEvidencePack.js` → evidence §11 | **13** | **6** | System §11 | Person nouns | Proverbs/James on job; Psalm 34 on grief |
| **On correction:** fresh wording; **correctedIntent** | `listeningSpecificityValidator.js` → user §16–17 | **14** | **7** (correction turns) | User JSON | BB-REFLECT | Sabbath **"I hear your frustration"** scripts |
| Return **JSON only** (shape contract) | `buddyBrain.js` §9 | **15** | **8** (format) | System tail §9 | — | Forces structured reply field |
| Bible-first / line upon line (North Star) | `buddyBrain.js` §2 | **16** | **7** | System §2 | — | Scripture stacked after opener |

**Estimated strength scale:** 1–10 = likelihood the model **treats this as mandatory** on companion turns, based on placement, imperative tone, and benchmark compliance (`OpeningSentenceAttributionAudit`).

---

## 3. Conflict clusters

### Cluster A — Opener shape (dominant)

| Rule A | Rule B | Winner in run | Evidence |
|--------|--------|---------------|----------|
| **BB-REFLECT** (one sentence reflect **before** advising) | **RF-SPECIFICITY** + **LG-NO-TEMPLATE** (user wording, **no** fixed opener) | **BB-REFLECT** | Job T1–3: 3× *"It sounds like…"*; `feltHeard: 2`; detailCandidates contained *far away from home* |
| **BB-REFLECT** | **BB-NOT-TEMPLATE** (not generic template) | **BB-REFLECT** | Same — template reflect treated as compliance with “one sentence” |
| **BB-COMFORT** (comfort first) | **RF-SPECIFICITY** | **BB-COMFORT** | Grief T1: *"I'm so sorry for your loss"* vs candidate *"I lost a friend **Wednesday**"* |

### Cluster B — Doctrinal vs person (Sabbath)

| Rule A | Rule B | Winner | Evidence |
|--------|--------|--------|----------|
| **RT-SCRIPTURE-FIRST** + **RT-RESPONSE-STRUCTURE** | **LG-PREFER-SPECIFIC** | **RT-*** | T1: person question → opener reframes then Constantine in body |
| **RF-ANSWER-DIRECT** | Person challenge text | **RF-ANSWER-DIRECT** (meta) | T5/T7: *"I hear you clearly"* vs *"not listening"* |

### Cluster C — Non-conflict (data survives)

| Rule | Status |
|------|--------|
| **detailCandidates** / **threadLocal** in user payload | Present all 20 turns; **not contradicted**, but **underweighted** vs §3 + §8 + §11 |

---

## 4. The three-way question: which instruction wins?

**Hypothetical trio (as stated in task):**

1. *"Reflect the user's situation in one sentence"*  
2. *"Use specific user details"*  
3. *"Do not use template openings"*

**Mapped to live prompt text:**

| # | Live instruction ID | Verbatim (abridged) |
|---|---------------------|---------------------|
| 1 | **BB-REFLECT** | *Reflect the user's actual situation in one sentence before advising.* |
| 2 | **RF-SPECIFICITY** + **LG-PREFER-SPECIFIC** + **detailCandidates** | *Prefer specific details… Use the user's wording where natural* |
| 3 | **RF-SPECIFICITY** + **LG-NO-TEMPLATE** | *…not as a fixed opening template* |

### Winner: **#1 (BB-REFLECT)** — implemented as **topic-level template reflect**, not as person-specific reflect

**Not winner #2 or #3** on contested turns.

### Evidence from benchmark outputs

| Thread | Turn | Strongest person detail (in payload) | Opening (validation) | #1 reflect? | #2 specific? | #3 no template? |
|--------|-----|--------------------------------------|----------------------|-------------|--------------|-----------------|
| Job | 2 | *The company is **far away from home**.* | *It sounds like the **distance** of this job opportunity…* | ✓ reflect sentence | ✗ (paraphrase) | ✗ *It sounds like* |
| Grief | 1 | *I lost a friend **Wednesday**.* | *I'm so sorry for your **loss**.* | ✓ (comfort+reflect family) | ✗ | ✗ generic loss |
| Distant | 1 | *distant from God **lately**.* | *Feeling distant from God can be…* | ✓ topic reflect | ✗ (*lately* missing) | ✗ topic headline |
| Health | 2 | *knees… **again today**.* | *I'm sorry… knees… **again today**.* | ✓ (sorry+reflect) | ✓ | ✓ (no *It sounds like*) |
| Alzheimer's | 2 | *doesn't remember who I am* | *your mom doesn't **recognize** you* | ✓ | ✓ | ✓ |

**Scorecard (20 turns):**

| Instruction | “Wins” opener behavior | Count |
|-------------|------------------------|------:|
| **#1 BB-REFLECT** (including comfort-listen variants) | Reflect/comfort sentence structure satisfied | **~14** |
| **#2 Specific user detail** in opening | Concrete user token in sentence 1 | **~9** |
| **#3 No template opening** | No *It sounds like* / generic loss-only | **~11** |

**~9 turns** satisfy both #1 and #2 (Alz T2–3, Health, parts of Sabbath). **~6 turns** satisfy #1 while **violating** #2 and #3 (Job T2, Grief T1–2, Distant T1).

**Interpretation:** The model treats **#1** as *“produce a reflective first sentence”* and uses **high-frequency patterns** (*It sounds like*, *I'm so sorry*, *Feeling distant from God*) that **satisfy #1’s slot** without satisfying **#2/#3**. **#2 and #3** only win when they **align** with comfort/reflect (Health, Alz T2) or direct answer (Sabbath wording).

---

## 5. Why RF-SPECIFICITY is weaker (hierarchy diagnosis)

| Factor | BB-REFLECT | RF-SPECIFICITY + LG-NO-TEMPLATE |
|--------|------------|----------------------------------|
| **Position** | System §3 (early, persona) | System §10 (one line) + user §16 (duplicate) |
| **Structural duty** | **Mandatory opener slot** (“before advising”) | General preference, no slot |
| **Reinforcement** | BB-HEARD, RF-LISTEN-FIRST, BB-COMFORT | Same turn lists `detailCandidates` but **after** system priors |
| **Contradiction** | None internally | **Explicit conflict**: must open with reflect **and** avoid template **and** use exact wording |
| **Evidence pack** | — | `companionTopic` + stubs + `plainEnglishRestatement` pull **topic** |

**Conclusion:** Specificity rules are **logically present** but **hierarchically subordinate** to North Star + reflect + comfort + doctrinal blocks.

---

## 6. Simulated hierarchy (audit-only — not implemented)

**Proposed rewrites (simulation input only):**

| ID | Current | Simulated |
|----|---------|-----------|
| **BB-REFLECT** | *Reflect the user's actual situation in one sentence before advising.* | ***Reflect using one concrete user detail whenever available.*** |
| **BB-COMFORT** | *If the user seems overwhelmed, comfort first…* | ***Comfort using a concrete user detail whenever available.*** |

**Assumed knock-on (still audit estimate):**

- **RF-SPECIFICITY** / **LG-NO-TEMPLATE** unchanged but **no longer contradicted** by §3.
- **detailCandidates** still 0 payload loss.
- **RT-RESPONSE-STRUCTURE** unchanged (Sabbath T1 still partly doctrinal).
- Model compliance rate for person opener **~70–85%** (not 100%) based on Alz T2 / Health precedent.

### Projected metrics (evidence-based ranges)

| Metric | Current (RACL run) | Projected after simulated §3 rewrite | Basis |
|--------|-------------------|--------------------------------------|--------|
| **Opening-detail utilization** | **~51%** | **~72 – 82%** | Remove ~35% BB-REFLECT loss + ~50% BB-COMFORT loss on 9 contested openers (`OpeningSentenceAttributionAudit`) |
| **Overall person utilization (turn)** | **~69%** | **~78 – 85%** | Opening fix propagates to `threadSpecific` / `feltHeard` |
| **RACL avg human listening** | **6.3** | **6.8 – 7.1** | `ComposerForensicAudit` / `PersonFirstCompositionAudit` (+0.4–0.7 band) |
| **Companion Presence** (S214 heuristic) | **96** | **97 – 98** | `helpfulness` blends Presence + Accuracy; listening uplift on empathy tests (T1 grief, T16–20) — **not re-run**; ceiling bounded by **Accuracy 78** / failed HTTP tests |

### Per-thread listening (simulated, ±0.2)

| Thread | Current avg | Projected |
|--------|------------:|----------:|
| Job | 4.9 | **6.0 – 6.5** (*far away*, *push or wait* in opener) |
| Grief | 5.9 | **6.5 – 7.0** (**Wednesday** in opener) |
| Distant | 5.8 | **6.3 – 6.8** (**lately** in opener) |
| Alzheimer's | 7.0 | **7.0 – 7.4** (already strong) |
| Health | 6.1 | **6.2 – 6.5** (small gain; overlap penalty may remain) |
| Sabbath | 6.9 | **6.9 – 7.1** (little change — RF-ANSWER-DIRECT dominates) |

### What the simulation does **not** fix

| Remaining blocker | Why |
|-------------------|-----|
| Sabbath history / acceptance failures | **RT-RESPONSE-STRUCTURE**, HTTP tests — not BB-REFLECT |
| **stability 70** | S214 pass rate — orthogonal |
| Template *"It sounds like"* on Job if model maps “concrete detail” + old habit | Residual **~10–15%** openings until regen rubric aligns |

### Maximum ceilings (simulated hierarchy only)

| Scenario | Opening util | Listening | Companion Presence |
|----------|-------------|-----------|-------------------|
| **Current hierarchy** | ~51% | **6.3** (measured) | **96** (S214 heuristic) |
| **Simulated BB-REFLECT + BB-COMFORT only** | **~72 – 82%** | **~6.8 – 7.1** | **~97 – 98** |
| **+ align RT-STRUCTURE on meta turns** (out of scope) | — | **~7.0 – 7.2** | **~98** |

---

## 7. Resolution recommendations (audit labels only — no implementation)

| Action | Resolves cluster | Expected lift |
|--------|------------------|---------------|
| **Merge BB-REFLECT + RF-SPECIFICITY** into one opener rule with `detailCandidates` | A | Opening util +15–25 pp |
| **Demote RT-RESPONSE-STRUCTURE** when `wording_explanation` / correction | B (Sabbath) | Historical Routing / stability |
| **Move LG-NO-TEMPLATE** to system §3 adjacent line (same priority as reflect) | A | Reduces *It sounds like* residual |
| **Keep detailCandidates in user JSON** | — | Necessary but **not sufficient** (proven) |

---

## 8. Answers (executive)

| Question | Answer |
|----------|--------|
| Actual hierarchy seen by OpenAI? | **System:** North Star → Companion (REFLECT/COMFORT) → Runtime (doctrine) → JSON contract → Composer (SPECIFICITY) → **large evidence JSON**. **User:** message + **detailCandidates** + listeningGuidance + evidence. |
| Which of the three instructions wins today? | **#1 Reflect one sentence (BB-REFLECT)** — often via **template** that **breaks #2 and #3**. |
| Largest person-loss instructions? | **BB-REFLECT (~35%)**, **BB-COMFORT (~20%)** per `OpeningSentenceAttributionAudit`. |
| If BB-REFLECT/COMFORT rewritten (simulation)? | Opening util **~72–82%**, listening **~6.8–7.1**, Companion Presence **~97–98** (estimate). |
| Still need generation fix if payload unchanged? | **Yes** — but conflict removal is the **primary** lever; payload already complete. |

---

## Stop conditions

No code changes, implementation, experiments, deploy, or push. Projections are **hierarchy simulations** from benchmark evidence, not new runs.
