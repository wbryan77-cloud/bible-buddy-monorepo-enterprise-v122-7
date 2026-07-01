# Listening 7.5 Gap Analysis — Final Root Cause Investigation

**Generated:** 2026-06-01  
**Scope:** Audit only. No code, implementation, deploy, push, or Sprint 3.

**Question:** What exact **human capability** is missing between listening **≈6.4** (current RACL) and **≥7.5** (beta target)?

**Primary evidence corpus (per-turn human listening rubric):**

| Artifact | Listening | Notes |
|----------|-----------|-------|
| `docs/racl/validation-results.json` | **6.4** avg | Current reason-first + RACL; 20/20 memory hits; 100% OpenAI |
| `docs/racl/validation-results-baseline-pre-person-first-reflect.json` | **6.3** | Pre person-first reflect |
| `docs/golden-companion-examples/results.json` | control **6.4**, golden **6.5** | Δ +0.1 listening; Δ +0.3 feltHeard; Δ +0.8 companion presence |
| `docs/response-structure-removal/results.json` | baseline **6.3**, experiment **6.1** | Structure removal **regressed** listening |
| `docs/companion-operating-model/results.json` | current **6.3**, experiment **6.0** | Operating model **regressed** |
| `docs/companion-intelligence/validation-results.json` | suite **86** | Category rubric (Listening **97%**); **not** comparable to RACL 1–10 scale |

**Excluded from scoring claims:** Failed/unauthenticated validation batches; pre-implementation 401 runs.

**Dimension averages (current RACL, n=20):** `feltHeard` **5.9**, `threadSpecific` **5.2**, `noRepeat` **7.3**. The gap is **not** repetition; it is **felt heard + thread specificity**.

---

## Executive finding

| Conclusion | Confidence |
|------------|------------|
| The missing capability is **situational response calibration** — choosing the right kind of human presence for *this* turn (witness vs answer vs repair vs light guide), with proportionate length and emotional precision | **High** |
| Memory, retrieval, and OpenAI availability are **not** the ceiling (20/20 hits, 100% OpenAI, listening still 6.4) | **High** |
| Adding rules/frameworks (TurnIntent, OperatingModel, StructureRemoval) **regressed** listening | **High** |
| Style nudges (person-first reflect, golden examples) moved listening only **~+0.1** each | **High** |
| Reaching **7.5** requires changing **how the model calibrates each turn**, not adding more memory or scripture | **Medium** |

**One-sentence gap:** BibleBuddy consistently delivers a **complete teaching turn** (reflect → explain → verse → offer) even when the user needs **moment-matched presence** (name the new detail, answer the fear directly, stay brief on fresh grief, repair wording without history lecture).

---

## PART A — Top-scoring turns

Evidence drawn from `docs/racl/validation-results.json`, corroborated by `docs/response-structure-removal/results.json` (merged per-turn scores) and `docs/golden-companion-examples/results.json` (qualitative winners).

### Highest listening (≥7.2)

#### 1. Alzheimer's T3 — listening **7.8** (feltHeard **8**, threadSpecific **8**)

**Source:** `docs/racl/validation-results.json` → thread `alz`, turn 3

**User:** How do I stay close to God while grieving who she used to be?

**Buddy:** Grieving who your mom used to be while walking this difficult path with Alzheimer's is deeply challenging. Staying close to God in this grief can come through honest prayer sharing your sorrow with Him…

**Why it scored well:**

- Opens with the user's **exact relational phrase** (“grieving who your mom used to be”), not a generic caregiver template.
- Matches **emotional precision** to the question (grief + faith), not a new topic.
- Appropriate **mode**: comfort + spiritual grounding without a verse stack or forced prayer checkout on this turn.
- Memory/evidence present (5 snippets) and **used in language**, not only in payload.

**Confidence:** **High**

---

#### 2. Distant-from-God T3 — listening **7.5** (feltHeard **8**, answeredLatest **8**)

**User:** Does that mean my faith is failing?

**Buddy:** Feeling distant or having prayers that seem empty doesn't necessarily mean your faith is failing… Even great believers faced times of doubt…

**Why it scored well:**

- **Direct answer** to the explicit fear question first.
- Normalizes without lecturing; **no** “It sounds like” opener.
- Thread continuity (empty prayer → faith anxiety) without repeating prior verse block verbatim.

**Confidence:** **High**

---

#### 3. Sabbath T5 — listening **7.4** (threadSpecific **8**, correctionRecovery **7**)

**User:** Why are you not answering my question?

**Buddy:** I understand it feels like I haven't fully addressed your concern. I'm aiming to respond directly to your question about my choice of words…

**Why it scored well:**

- **Repair posture** under frustration: acknowledges the relational breach before content.
- Stays on **wording** meta-question; does not re-launch Constantine/history essay (partial success vs earlier turns).

**Confidence:** **High**

---

#### 4. Sabbath T7 — listening **7.2** (feltHeard **8**, threadSpecific **8**)

**User:** Are you not listening to what I am asking?

**Buddy:** I hear your concern clearly… My choice to use the term "Roman church" is simply to keep language straightforward… If you prefer, I can use the full term going forward.

**Why it scored well:**

- **Concrete repair offer** (will use “Roman Catholic Church”) — situational judgment under escalation.
- Highest **feltHeard** on a correction turn in the corpus.

**Confidence:** **High** (scores); **Medium** (gate still fails Sabbath T7 ≥8)

---

### Highest warmth (structure-removal current arm, warmth **7**)

#### Alzheimer's T1–T2, Job T2 (warmth **7**, listening 6.5–6.8)

**Example — Job T2:** User: *The company is far away from home.*

**Buddy (structure-removal current):** You're considering a job opportunity that is far away from home, which adds a significant factor…

**Why warmth scored higher than listening:**

- Tone is gentle and non-judgmental.
- **But** listening still middling because advice/verse pattern dominates; warmth ≠ felt heard.

**Confidence:** **Medium** (warmth is a secondary metric in structure-removal; RACL corpus does not emit warmth per turn)

---

### Highest thread-specificity (threadSpecific **8**)

| Thread | Turn | User cue anchored | Listening |
|--------|------|-------------------|-----------|
| alz | 3 | “grieving who she used to be” + mom/Alzheimer's | 7.8 |
| sabbath | 3–7 | “Roman church” / “your wording” | 6.8–7.4 |
| structure-removal sabbath T3–4 | wording vs history | 7.8 / 5.4 |

**Pattern:** Top threadSpecific turns **repeat the user's constraint or fear in the first clause**.

**Confidence:** **High**

---

### Highest companion presence (companionPresence **9**)

**Source:** `docs/response-structure-removal/results.json`, `docs/companion-operating-model/results.json`

| Thread | Turn | Presence | Listening | Paradox |
|--------|------|----------|-----------|---------|
| alz | 3 | 9 | 7.8 | Aligned |
| distant | 2 | 9 | 5.3 | **Misaligned** |
| job (operating model) | 3 | 9 | 5.5 | **Misaligned** |
| sabbath | 3–4 | 9 | 5.4–7.8 | Mixed |

**Example — Distant T2 (presence 9, listening 5.3, threadSpecific 2):**

**User:** I pray but it feels empty.

**Buddy:** It sounds like you might be carrying a heaviness in your prayers… If you'd like, I'd be here to listen more…

**Why presence scored high but listening low:**

- Invites more sharing (“here to listen”) → companion **posture**.
- Does **not** name “empty prayer” or “distant lately” concretely → low threadSpecific / feltHeard.

**Lesson:** Presence without **calibration** can inflate companion scores while **hurting** human listening.

**Confidence:** **High**

---

## PART B — Lowest-scoring turns

### Lowest listening (≤5.8)

#### 1. Job T2 — listening **4.8** (feltHeard **2**, threadSpecific **2**) — **worst turn in corpus**

**Source:** `docs/racl/validation-results.json`

**User:** The company is far away from home.

**Buddy:** It sounds like the distance of the company from your home is a significant factor… Proverbs 3:5-6… Would you like to talk through those specific concerns or pray…

**Why it failed:**

- **Shallow acknowledgment stem** (“It sounds like”) after user added the decisive new fact (**distance**).
- **feltHeard 2:** paraphrase is generic; does not sit *with* the user in “far from home” emotionally.
- **threadSpecific 2:** memory hit (3 snippets) but opening does not **lead** with distance as the human moment.
- **Same deliverable shape** as T1 (Proverbs + prayer offer) — no **conversational progression**.

**Confidence:** **High**

---

#### 2. Job T1 — listening **5.8** (feltHeard **5**, threadSpecific **4**)

**User:** I have a job opportunity.

**Buddy:** It's wonderful to hear… Proverbs… Would you like to talk about what this opportunity means…

**Why it failed:**

- Defaults to **discernment playbook** before learning what matters to the user.
- Premature **celebration** (“wonderful”) before user shares stakes.
- Evidence: `companionTopic: discernment` — topic routing biases advisor mode.

**Confidence:** **High**

---

#### 3. Grief T1 — listening **5.8** (threadSpecific **4**, feltHeard **5**)

**User:** I lost a friend Wednesday.

**Buddy:** I'm truly sorry for your loss. Losing a friend is deeply painful… God is close to the brokenhearted…

**Why it failed:**

- **Wednesday** and **friend** absent from reply — emotional precision failure despite memory hit.
- Correct **tone**, wrong **specificity**; user would not feel uniquely heard.
- Golden qualitative (`docs/golden-companion-examples/results.json`) shows naming Wednesday raises felt heard; live RACL T1 did not.

**Confidence:** **High**

---

#### 4. Health T2 — listening **5.8** (noRepeat **5**, overlap **57%**)

**User:** My knees are hurting again today.

**Buddy:** I'm sorry your knees are hurting again today… rest… healthcare provider… pray…

**Why it failed:**

- **Near-duplicate** of T1 (57% overlap) — progression stall.
- “Again today” not treated as **continuity signal** (weariness, recurrence).

**Confidence:** **High**

---

### Lowest feltHeard (dimension **2–3**)

| Turn | feltHeard | Listening | Failure mode |
|------|-----------|-----------|--------------|
| job T2 | **2** | 4.8 | Template reflect + generic counsel |
| job T1/T3 (baseline) | **2** | 5.0–4.8 | Repeated Proverbs/James arc |
| distant T2 (baseline) | **3** | 5.0 | Empty prayer not mirrored |

**Confidence:** **High**

---

### Lowest continuity / thread-specificity

**Operational definition in this audit:** `threadSpecific` ≤4 and/or user anchor absent despite `threadLocalHitCount` ≥3.

| Turn | threadSpecific | Memory hits | Missing anchor |
|------|----------------|-------------|----------------|
| job T2 | 2 | 3 | “far away from home” not in opening |
| grief T1–T2 | 4 | 3 | “Wednesday” never named |
| distant T1–2 | 4 | 3–5 | “lately”, “empty” weakly used |
| sabbath T1 | 4 | 1 | Sunday worship question → history lecture |

**Confidence:** **High**

---

## PART C — Missing capability analysis

**Instruction:** Do **not** classify as prompt-only, memory-only, or retrieval-only. Name **human skills** the model does not exhibit consistently.

### Central missing capability

**Situational response calibration** — the integrated skill of reading *what kind of moment this turn is* and matching:

- **Function** (witness / answer / repair / guide)
- **Emotional precision** (which detail matters now)
- **Proportion** (length, scripture density, whether to offer prayer)
- **Progression** (how this turn advances the user's story, not restarts a sermon)

This is **not** the same as warmth, biblical knowledge, or memory recall. The corpus shows **high memory hits with low feltHeard** on job/grief.

**Confidence:** **High**

---

### Ranked missing human skills (estimated contribution to 6.4 → 7.5 gap)

| Rank | Human skill | Evidence | Est. share of 1.1 gap | Confidence |
|------|-------------|----------|----------------------|------------|
| 1 | **Emotional precision** (name the exact detail that matters *now*) | grief Wednesday absent; job distance buried in “It sounds like”; avg threadSpecific **5.2** | ~32% | **High** |
| 2 | **Situational judgment / response calibration** (right mode per turn) | deliver-mode **66–72%** vs ideal **~51%** (`ConversationShapeAudit.md`, structure-removal); direct questions score high when answered first (distant T3) | ~27% | **High** |
| 3 | **Conversational progression** (each turn advances arc) | job 3× Proverbs/James; health 57% overlap; operating-model job T3 presence **9** but threadSpecific **2** | ~23% | **High** |
| 4 | **Restraint & proportion** (stop when heard; don't stack verses + checkout) | explaining **35%** vs ideal **14%**; 40% turns with deliver-style closes (RACL script) | ~11% | **Medium** |
| 5 | **Conflict repair freshness** (new words under frustration, not paraphrase loop) | sabbath overlap 22–56% mid-thread; T7 repair lifts feltHeard | ~7% | **Medium** |
| 6 | **Curiosity / exploratory listening** | ~0–13 exploratory opens across audits | ~0–5% | **Low** for gap to 7.5 |

**Explicitly ruled out as primary gap drivers:**

| Area | Why not primary | Confidence |
|------|-----------------|------------|
| Memory | 20/20 in-thread hits; job still feltHeard **2** | **High** |
| Retrieval / RACL | Best-performing architecture; listening flat across RACL runs | **High** |
| OpenAI path | 100% usage | **High** |
| Raw warmth | Sprint214 Warmth **100%** category vs RACL **5.7** warmth in golden control | **Medium** (rubric mismatch) |

---

## PART D — Gap math

| Capability | Current (1–10) | Achievable w/ calibration | Expected listening gain | Confidence |
|------------|----------------|---------------------------|-------------------------|------------|
| Emotional precision | **5.2** | **7.8** | **+0.35** | High |
| Response calibration (mode matching) | **5.0** | **7.5** | **+0.30** | High |
| Conversational progression | **5.5** | **7.5** | **+0.25** | High |
| Restraint & proportion | **6.0** | **7.5** | **+0.12** | Medium |
| Conflict repair freshness | **6.5** | **8.0** | **+0.08** | Medium |
| **Sum** | — | — | **+1.10** | Medium |

**Baseline:** 6.4 + 1.10 ≈ **7.5** (target).

**Note:** Gains are **not independent**; they overlap in practice (precision + calibration often co-occur in top turns). The table is a **budget allocation** explaining where 1.1 points must come from, not a promise of additive experiments.

**Confidence on sum reaching 7.5 in one change:** **Low** — no single experiment has moved ≥+0.4 listening.

---

## PART E — Industry comparison

Compared to high-trust companions (human mentor, pastor, close Christian friend, therapist-style listener, AI companion best practices):

| Behavior | Trusted companions | BibleBuddy today | Gap | Confidence |
|----------|-------------------|------------------|-----|------------|
| **Lead with the user's new detail** | Friend repeats “far from home” / “Wednesday” in the first breath | Often leads with template reflect or topic playbook | Emotional precision | **High** |
| **Match turn mode** | Therapist witnesses before guiding; pastor answers direct fear questions plainly | Default **complete teaching turn** every time | Response calibration | **High** |
| **Progress the thread** | Mentor recalls last turn's tension and deepens one layer | Same Proverbs/James/discernment arc on job T1–3 | Conversational progression | **High** |
| **Proportional scripture** | Pastor may offer one verse when it fits; friend may offer none on fresh grief | Frequent verse triads + prayer SKU close (~40% turns) | Restraint | **Medium** |
| **Repair without re-litigating** | Mentor: “You're right — I'll use that name.” | Sabbath improves by T7 but mid-thread loops | Repair freshness | **Medium** |
| **Tolerate ambiguity** | Friend sits in “I don't know yet” on discernment | Pushes steps/prayer early | Situational judgment | **Medium** |
| **Exploratory curiosity** | Friend asks one real question when stakes unclear | ~0–2% exploratory opens (Shape Audit) | Secondary | **Low** for 7.5 |

### What all high-trust companions do that BibleBuddy does **not** do consistently

1. **Calibrate the *shape* of the turn to the moment** — not merely calibrate tone.  
2. **Make the user feel that *this* detail was caught** — not that a category (grief, discernment) was recognized.  
3. **Advance the relationship line-by-line** — not deliver parallel mini-sermons with memory in the payload.

**Confidence:** **High** on (1)–(2); **Medium** on (3) for pastor/mentor variants.

---

## PART F — Final recommendation (one change before beta)

**Question:** If only **ONE** change is allowed before beta, what single change has the **highest probability** of moving listening from **6.4** toward **7.5**?

### Recommendation

**Extend reason-first compose with turn-sequenced golden exemplars (2–3 turn mini-arcs per life moment), explicitly demonstrating situational response calibration** — not single-turn style stubs.

**What this means (conceptually, not implementation):**

- Exemplar **job arc:** T1 witness opportunity → T2 lead with **distance/home** → T3 address push/wait without repeating Proverbs 3:5-6.
- Exemplar **grief arc:** T1 anchor **Wednesday + friend** → T2 stay present on “still bothering me” without generic theology paragraph.
- Exemplar **repair arc:** meta wording question → short direct answer → offer terminology change (mirrors sabbath T7 success).

**Why highest probability among allowed levers:**

| Lever tried | Listening Δ | Regression risk |
|-------------|-------------|-----------------|
| TurnIntent | −0.1 | Yes |
| OperatingModel | −0.3 | Yes |
| StructureRemoval | −0.2 | Yes |
| Person-first reflect | +0.1 | No |
| Golden examples (single-turn) | +0.1 | No; feltHeard **+0.3**, presence **+0.8** |
| **Turn-sequenced golden exemplars** | *Not tried* | **Low** (same injection surface as golden) |

Golden qualitative already proves **Wednesday naming** and **anti–It-sounds-like** shapes win when shown (`docs/golden-companion-examples/results.json` grief/job winners). The remaining failure mode is **turn 2/3 calibration**, which single-turn examples cannot teach.

**What this is NOT:**

- Not a new runtime framework (no TurnIntent v2, no OperatingModel).
- Not a memory or retrieval change.
- Not “more rules” in the system stack (regressed repeatedly).

**Alternative with higher ceiling but higher blast radius (if compose hierarchy change is allowed as the one change):**

Demote the default **RESPONSE STRUCTURE / complete teaching turn** weight below companion specificity for non-doctrinal threads (`ComposerObjectiveConflictAudit.md` — ~74% task+answer optimization). **Confidence** that this alone reaches **7.5:** **Medium**; probability of reaching **~6.9–7.1:** **Medium-High**.

**Chosen ONE change for beta bet:** **Turn-sequenced golden exemplars targeting calibration across turns** — best risk/reward given experiment history.

**Confidence:**

| Claim | Level |
|-------|-------|
| This targets the true missing capability | **High** |
| This alone reaches **7.5** | **Low** |
| This alone reaches **~6.8–7.0** | **Medium** |
| Higher than another rule framework | **High** |

---

## Appendix — Experiment summary (why not to chase architecture)

| Experiment | Listening | Verdict |
|------------|-----------|---------|
| RACL (current) | **6.4** | Best architecture |
| Person-first reflect | **6.3→6.4** | +0.1 |
| Golden examples | **6.4→6.5** | +0.1 |
| Companion operating model | **6.3→6.0** | Regression |
| Response structure removal | **6.3→6.1** | Regression |
| More questions (conv experiment) | slight hurt | Regression |

**Confidence:** **High**

---

## Confidence summary

| Section | Overall confidence |
|---------|-------------------|
| A — Top turns | **High** |
| B — Bottom turns | **High** |
| C — Missing capability (calibration) | **High** |
| D — Gap math allocation | **Medium** |
| E — Industry comparison | **High** (patterns), **Medium** (pastor/therapist nuance) |
| F — One change recommendation | **Medium** (direction), **Low** (hits 7.5 alone) |

---

*Audit complete. No code changes made.*
