# Opening Sentence Attribution Audit

**Generated:** 2026-06-03  
**Scope:** Audit only — no code, deploy, push, Sprint 3, fixes, implementation, or experiments.

**Evidence:** `docs/racl/validation-results.json` (2026-06-03T21:49:12Z, listening **6.3**); reason-first composer sources (`buddyBrain.js` `buildSystemPrompt`, `runtimeOrchestrator.js` `buildRuntimeInstructions`, `reasonFirstComposer.js` `COMPOSER_INSTRUCTION`, `listeningSpecificityValidator.js` `listeningGuidance`); forensic replay for topic labels.

**Prior audits:** Opening utilization **~51%**; `detailCandidates` / `userPayload` loss **0**; largest drop at **openaiGeneration** — this document attributes **which written instructions** the model appears to follow when choosing **topic-level** vs **person-level** openers.

---

## 1. Instruction stack (what the model sees)

Reason-first composition sends **one system message** (persona + runtime + composer + evidence JSON) and **one user message** (stringified `userPayload`).

### Layer A — `buildSystemPrompt` (`buddyBrain.js`)

| ID | Instruction (verbatim / paraphrase) | Pushes toward |
|----|-------------------------------------|---------------|
| **BB-HEARD** | *Help the user feel heard before instructed.* | Empathy / acknowledgment **before** specifics |
| **BB-REFLECT** | *Reflect the user's actual situation in **one sentence** before advising.* | **“It sounds like…”**-style summary opener |
| **BB-NOT-TEMPLATE** | *Respond to the specific user message, not a generic template.* | Person detail (weak vs BB-REFLECT in practice) |
| **BB-COMFORT** | *If the user seems overwhelmed, **comfort first** and keep Scripture light.* | Generic sympathy (“I'm so sorry…”) |
| **BB-FORWARD** | *Give forward movement: practical next steps, prayer structure…* | Topic playbook after opener |

### Layer B — `buildRuntimeInstructions` (`runtimeOrchestrator.js`) — **always appended**

| ID | Instruction | Pushes toward |
|----|-------------|---------------|
| **RT-SCRIPTURE-FIRST** | *Prioritize explicit Scripture references first*; Sabbath/Sunday → Scripture then history | **Doctrinal / topic** headline |
| **RT-RESPONSE-STRUCTURE** | Five-step structure (explicit text → continuity → **historical developments** → …) | **Topic essay** shape (Sabbath T1) |
| **RT-MEMORY** | *Use prior conversation memory naturally when available* | Neutral (salience war with structure) |

### Layer C — `COMPOSER_INSTRUCTION` (`reasonFirstComposer.js`)

| ID | Instruction | Pushes toward |
|----|-------------|---------------|
| **RF-CHOOSE-KIND** | *Choose the **right kind of response** — not a complete mini-essay every turn.* | Topic mode selection |
| **RF-LISTEN-FIRST** | ***Listen first** when the user is sharing pain or uncertainty; **answer directly** when they ask a clear question or correction.* | Pain → comfort opener; question → restate/answer opener |
| **RF-ANSWER-DIRECT** | *(paired above)* | *You're asking…* / correction meta (Sabbath) |
| **RF-SPECIFICITY** | *Prefer specific details from the thread over general summaries. Use the user's wording where natural — **not as a fixed opening template**.* | Person wording (often **overridden** by BB-REFLECT) |
| **RF-SCRIPTURE-NATURAL** | *Use Scripture naturally when it helps; do not stack verses mechanically.* | Topic stubs after opener |

### Layer D — `listeningGuidance` (user payload, `listeningSpecificityValidator.js`)

| ID | Instruction | Pushes toward |
|----|-------------|---------------|
| **LG-PREFER-SPECIFIC** | *Prefer specific details from the thread over general summaries.* | Same as RF-SPECIFICITY |
| **LG-NO-TEMPLATE** | *When detailCandidates are present, use the user's wording where natural — **not as a fixed opening template**.* | Anti–“It sounds like” (same turn: lists `detailCandidates`) |
| **LG-CORRECTION** | *On correction: answer the corrected question with fresh wording…* | Meta / wording openers (Sabbath T2–7) |

### Layer E — Evidence JSON (system, not prose rules but strong prior)

| ID | Field | Pushes toward |
|----|-------|---------------|
| **EV-TOPIC** | `companionThreadContext.companionTopic` + `practicalNextStepCategory` | `discernment`, `grief`, `health`, `caregiver`, `distant_from_god` |
| **EV-SCRIPTURE-STUB** | `scripture.source: companion_stub` + topic-keyed refs | Topic-appropriate verses (Proverbs/James, Psalm 34, etc.) |
| **EV-HISTORY** | `history.included: true` + chain steps | Constantine / Sunday **topic** narrative |
| **RS-GENERIC** | `understanding.plainEnglishRestatement` (e.g. Job: *“life decision… not a template”*) | **Topic-generalization** in pack |

**Conflict (audit finding):** **BB-REFLECT** + **RF-LISTEN-FIRST** + **BB-COMFORT** train a **recognizable opener family** (“It sounds like…”, “I'm so sorry…”, “Feeling distant from God…”). **RF-SPECIFICITY** + **LG-NO-TEMPLATE** forbid that family but are **shorter, later, and contradicted** by North Star “one sentence reflect before advising.”

---

## 2. Full attribution table (20 benchmark turns)

**Strongest person detail** = highest-signal user phrase for that turn (from message + `detailCandidates` replay).  
**Strongest topic label** = `companionTopic` | `topic` | `requestedAnswerType` | `practicalNextStepCategory`.  
**Person in opener?** Y/N against strongest person detail.

| Thread | Turn | Opening sentence | Person detail available | Topic label available | Prompt rule satisfied | Person in opener |
|--------|-----|------------------|-------------------------|----------------------|------------------------|------------------|
| Job | 1 | It sounds like this job opportunity is an important decision for you. | I have a job opportunity. | `discernment` \| `discernment_conversation` \| `wise_discernment_and_peace` | **BB-REFLECT** + **RF-LISTEN-FIRST** + **EV-TOPIC** (discernment stubs) | Y (partial) |
| Job | 2 | It sounds like the distance of this job opportunity is a significant concern for you… | **The company is far away from home.** | `discernment` \| `discernment_conversation` | **BB-REFLECT** (paraphrase → “distance”) + **RS-GENERIC** restatement in evidence | **N** (far away dropped) |
| Job | 3 | It sounds like you’re weighing whether to be patient or to take more initiative with this offer… | **I'm not sure whether to push or wait on this offer.** | `discernment` \| `discernment_conversation` | **BB-REFLECT** + **BB-FORWARD** (next-step framing) | Y (partial) |
| Alzheimer's | 1 | I'm so sorry to hear about your mom's diagnosis. | **My mom was recently diagnosed with Alzheimer's.** | `caregiver` \| `emotional_support_and_prayer` | **BB-COMFORT** + **RF-LISTEN-FIRST** + **EV-TOPIC** (caregiver stubs) | Y (mom; opener) |
| Alzheimer's | 2 | It must be really heartbreaking that some days your mom doesn’t recognize you. | **Some days she doesn't remember who I am.** | `caregiver` \| `emotional_support_and_prayer` | **BB-REFLECT** + **RF-SPECIFICITY** (strong person opener) | Y |
| Alzheimer's | 3 | Grieving who your mom used to be while facing her Alzheimer's journey… | **How do I stay close to God while grieving who she used to be?** | `caregiver` \| `grief` topic drift \| `companion_support` | **RF-SPECIFICITY** + **LG-PREFER-SPECIFIC** | Y |
| Distant | 1 | Feeling distant from God can be deeply unsettling. | **I feel distant from God lately.** | `distant_from_god` \| `honest_reflection_not_template` | **BB-HEARD** + **TOPIC_HEADLINE** (topic noun phrase, not “lately”) + **EV-TOPIC** | **N** (lately dropped) |
| Distant | 2 | It sounds like your prayers feel empty right now… | **I pray but it feels empty.** | `distant_from_god` | **BB-REFLECT** + **RF-LISTEN-FIRST** | Y (empty) |
| Distant | 3 | Feeling distant from God or experiencing emptiness in prayer does not mean your faith is failing. | **Does that mean my faith is failing?** | `distant_from_god` | **BB-HEARD** + **RF-ANSWER-DIRECT** (answer question headline) | Y (faith failing) |
| Sabbath | 1 | You’re asking why Sunday is kept as the day of worship for the Lord. | **Why should we keep Sunday as the day of worship onto the Lord?** | `sabbath` \| `historical_answer` \| **RT-RESPONSE-STRUCTURE** | **RF-ANSWER-DIRECT** + **RT-SCRIPTURE-FIRST** + **EV-HISTORY** | Y (reframed → history body) |
| Sabbath | 2 | I use the term "Roman church" as a simpler way… | **Roman Catholic Church** (direct name) | `wording_explanation` \| correction active | **RF-ANSWER-DIRECT** + **LG-CORRECTION** | Y (labels) |
| Sabbath | 3 | I chose the term "Roman church" to keep things straightforward… | **Roman Catholic Church** (technical name) | `wording_explanation` | **RF-ANSWER-DIRECT** + **LG-CORRECTION** | Y |
| Sabbath | 4 | Thank you for clarifying that you’re focusing on why I chose the specific wording… | **not asking about the shift — your wording** | `wording_explanation` | **LG-CORRECTION** + **RF-ANSWER-DIRECT** | Y (wording) |
| Sabbath | 5 | I hear your frustration that my previous responses didn’t directly satisfy… | **Why are you not answering my question?** | `direct_reanswer` \| correction | **RF-LISTEN-FIRST** + **LG-CORRECTION** (listening performative) | **N** (not answering) |
| Sabbath | 6 | I understand now that you're asking specifically about why I chose the particular phrasing… | **not asking about history — your wording** | `wording_explanation` | **LG-CORRECTION** + **RF-ANSWER-DIRECT** | Partial |
| Sabbath | 7 | I hear you clearly now and appreciate your patience. | **Are you not listening to what I am asking?** | `direct_reanswer` \| `sabbath` | **RF-LISTEN-FIRST** (listening script) + **LG-CORRECTION** | **N** (not listening) |
| Grief | 1 | I'm so sorry for your loss. | **I lost a friend Wednesday.** | `grief` \| `presence_and_comfort` | **BB-COMFORT** + **RF-LISTEN-FIRST** + **EV-TOPIC** (grief stubs) | **N** (Wednesday; friend weak) |
| Grief | 2 | It’s completely natural that your friend’s loss is still weighing on you. | **It is still bothering me.** (+ Wednesday in thread) | `grief` \| `presence_and_comfort` | **BB-REFLECT** + topic-generalization (“natural”) | **N** (Wednesday; “still bothering” paraphrased) |
| Health | 1 | I'm sorry to hear your knees are hurting. | **My knees hurt.** | `health` \| `practical_care_and_prayer` | **BB-REFLECT** + **RF-SPECIFICITY** + **EV-TOPIC** (aligned) | Y |
| Health | 2 | I'm sorry to hear your knees are hurting again today. | **My knees are hurting again today.** | `health` \| `practical_care_and_prayer` | **RF-SPECIFICITY** + **LG-NO-TEMPLATE** (explicit person opener) | Y |

---

## 3. Opener pattern → instruction mapping (examples)

| Opening pattern | Satisfies (primary) | Person vs topic |
|-----------------|---------------------|-----------------|
| *"It sounds like…"* | **BB-REFLECT** (*one sentence before advising*) | **Topic-shaped** reflect; often drops exact user tokens |
| *"It must be really heartbreaking…"* | **BB-REFLECT** + **RF-LISTEN-FIRST** | Person (Alz T2 — best reflect) |
| *"I'm so sorry for your loss."* | **BB-COMFORT** + **RF-LISTEN-FIRST** | **Topic empathy** (grief category, not Wednesday) |
| *"I'm so sorry to hear about your mom's diagnosis."* | **BB-COMFORT** + **EV-TOPIC: caregiver** | Person + topic |
| *"Feeling distant from God can be…"* | **BB-HEARD** + **EV-TOPIC: distant_from_god** | **Topic headline** (drops “lately”) |
| *"You're asking why Sunday is kept…"* | **RF-ANSWER-DIRECT** + **RT-SCRIPTURE-FIRST** | Question restate → **history topic** in sentence 2+ |
| *"I use / I chose the term Roman church…"* | **RF-ANSWER-DIRECT** + **LG-CORRECTION** | Meta/topic (wording), not new person fact |
| *"I hear your frustration / I hear you clearly…"* | **RF-LISTEN-FIRST** + **LG-CORRECTION** | **Listening performance**, drops user challenge text |
| *"I'm sorry to hear your knees…"* | **RF-SPECIFICITY** + **BB-REFLECT** (aligned) | **Person-first** when topic=body part |

**Topic-generalization without fixed phrase:** Evidence **RS-GENERIC** (*“life decision… not a template”* on all Job turns) + **EV-SCRIPTURE-STUB** — model answers **discernment topic**, not **far away** phrase.

---

## 4. Ranked prompt instructions

### A. Frequency (primary opener driver, 20 turns)

| Rank | Instruction ID | Source | Count | % of turns |
|-----:|----------------|--------|------:|-----------:|
| 1 | **BB-REFLECT** | buddyBrain — *Reflect… one sentence before advising* | **8** | 40% |
| 2 | **RF-ANSWER-DIRECT** | reasonFirstComposer — *answer directly* + Sabbath correction | **7** | 35% |
| 3 | **BB-COMFORT** / **RF-LISTEN-FIRST** | comfort / listen first | **4** | 20% |
| 4 | **RF-SPECIFICITY** / **LG-NO-TEMPLATE** | person wording (complied) | **3** | 15% |
| 5 | **BB-HEARD** + topic headline | feel heard + topic noun phrase | **2** | 10% |
| 6 | **RT-SCRIPTURE-FIRST** + **RT-RESPONSE-STRUCTURE** | doctrinal opener + history | **1** | 5% |

*Note: Turns can satisfy multiple rules; counts are **primary** attribution for ranking.*

### B. Estimated contribution to person-detail loss in opening

Scored by **turns where strongest person detail was missing from opening** (9/20) × rule dominance:

| Rank | Instruction ID | Loss mechanism | Est. person-slot loss share | Turns affected |
|-----:|----------------|----------------|----------------------------:|----------------|
| 1 | **BB-REFLECT** | *“It sounds like”* / *“completely natural”* paraphrase replaces user tokens | **~35%** | Job T2, Grief T2, Distant T2; weak Job T1/T3 |
| 2 | **BB-COMFORT** + **RF-LISTEN-FIRST** | Generic grief/loss sympathy before concrete detail | **~20%** | Grief T1 (**Wednesday** dropped) |
| 3 | **BB-HEARD** + **EV-TOPIC** | Topic headline (*Feeling distant from God…*) before user timing/detail | **~15%** | Distant T1 (**lately** dropped) |
| 4 | **RT-SCRIPTURE-FIRST** + **RT-RESPONSE-STRUCTURE** + **EV-HISTORY** | Sunday question → historical-topic answer shape | **~10%** | Sabbath T1 (person framing → history) |
| 5 | **RS-GENERIC** + **EV-TOPIC** + **EV-SCRIPTURE-STUB** | Evidence pack salience: topic stubs + generic restatement | **~10%** | Job T1–3 (discernment playbook) |
| 6 | **RF-ANSWER-DIRECT** + **LG-CORRECTION** | Meta listening script vs user challenge words | **~10%** | Sabbath T5, T7 |
| 7 | **RF-SPECIFICITY** / **LG-NO-TEMPLATE** | Underweighted — **reduces** loss when complied | **(mitigation)** | Alz T2–3, Health T1–2 |

**Largest single instruction family driving topic openers:** **BB-REFLECT** (paired with **RF-LISTEN-FIRST** comfort variants).

**Why RF-SPECIFICITY fails to win:** It explicitly bans *fixed opening templates* but **BB-REFLECT requires a reflective first sentence**, which the model implements as **“It sounds like…”** — a template the rubric penalizes.

---

## 5. Listening ceiling analysis

**Current run:** avg human listening **6.3**; opening person utilization **~51%** (`ComposerForensicAudit`).

### If instructions remain unchanged

| Factor | Ceiling implication |
|--------|---------------------|
| Best-thread behavior without prompt edit (Alz **7.0** avg, Health person openers, Sabbath correction **7.4** on some turns) | Model **can** person-open when topic aligns with literal nouns |
| Worst-thread behavior (Job **4.9**, Grief **5.9**) | **BB-REFLECT** / **BB-COMFORT** dominate |
| **RF-SPECIFICITY** already in prompt but ignored ~50% of openers | Stochastic compliance, not absence of rule |

**Maximum realistic listening ceiling (instructions unchanged):**

| Metric | Estimate | Basis |
|--------|----------|--------|
| **Average (20 turns)** | **~6.8 – 7.0** | Upper bound if ~75% of turns matched Health/Alz T2–3 opener quality |
| **Sustained gate (≥7.0)** | **Unlikely** | Job/Grief/Distant T1–2 remain structurally biased to BB-REFLECT/COMFORT |
| **Sabbath T7** | **~6.8 – 7.2** | Correction loops capped by RF-LISTEN-FIRST scripts, not person loss |

**Interpretation:** Without rewrite, **~6.8** is a realistic **average ceiling** (variance + occasional SPECIFICITY compliance); **7.0+ sustained** is **not** realistic while **BB-REFLECT** and **RF-LISTEN-FIRST** remain stronger than **LG-NO-TEMPLATE**.

### If instructions rewritten to prioritize person-detail usage

Assumes: opener must name a `detailCandidates` phrase; demote **one-sentence reflect** when candidates exist; defer **RT-RESPONSE-STRUCTURE** until after person acknowledgment; align **RS-GENERIC** with user message.

| Metric | Projected ceiling | Basis |
|--------|-------------------|--------|
| Opening utilization | **~75 – 85%** | `PersonFirstCompositionAudit` (+24–34 pp) |
| **Average listening** | **~6.9 – 7.2** | `ComposerForensicAudit` / `PersonFirstCompositionAudit` (+0.4–0.7 from 6.3) |
| **Gate ≥7.0** | **Achievable** on benchmark | If Grief Wednesday + Job far away + Distant lately fixed in openers |

**Gap between ceilings:** **~0.2 – 0.4** listening points — instruction conflict removal, not retrieval or payload fixes.

---

## 6. Conclusions (evidence only)

1. Topic-level openers are **not** caused by missing `detailCandidates` in the payload (**0** loss there).
2. The model most often satisfies **BB-REFLECT** (*one sentence reflect before advising*) via **“It sounds like…”** — a **topic-level** listening move.
3. **BB-COMFORT** / **RF-LISTEN-FIRST** drive generic empathy openers that drop concrete tokens (**Wednesday**, **friend**).
4. **RT-SCRIPTURE-FIRST** + **RT-RESPONSE-STRUCTURE** + **EV-HISTORY** drive Sabbath T1 **topic-history** shape.
5. **RF-SPECIFICITY** / **LG-NO-TEMPLATE** are present but **subordinate**; they win mainly when **EV-TOPIC** aligns with literal body/relationship nouns (**health**, **mom**).
6. **Unchanged instruction ceiling:** **~6.8 – 7.0** average. **Person-first rewrite ceiling:** **~6.9 – 7.2**.

---

## Stop conditions

No fixes, implementation, experiments, deploy, or push.
