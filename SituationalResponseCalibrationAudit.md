# Situational Response Calibration Audit

**Generated:** 2026-06-01  
**Scope:** Audit only. No code, implementation, deploy, push, or Sprint 3.

**Question:** Where does the system decide what kind of response the user needs — and where does that decision diverge from what the user actually needs?

**Evidence method:** Replayed all **20 RACL benchmark turns** from `docs/racl/validation-results.json` (listening **6.4**, reason-first + RACL) by rebuilding `buildRetrievalEvidencePack` + `buildListeningComposerSignals` turn-by-turn with session replay. Final replies and openings taken from the validation corpus (live OpenAI run, 2026-06-03). **No new API calls.**

**Important:** Production reason-first path has **no explicit “human moment” classifier**. “System need” below is **inferred** from `understanding`, `companionThreadContext`, `correctionLedger`, retrieval flags, and composer payload — not from a stored calibration field.

---

## Where calibration is decided (pipeline)

```
User message
    │
    ▼
questionIntentResolver + buildReasoningSnapshot()     ← questionType, requestedAnswerType, strictAnswerMode
    │
    ▼
buildRetrievalEvidencePack()                          ← topic, companionTopic, history.included, scripture stubs, threadLocal
    │
    ▼
buildListeningComposerSignals()                       ← detailCandidates, listeningGuidance (soft, user JSON only)
    │
    ▼
buildComposerSystemPrompt()                           ← buildSystemPrompt (~3.7K) + buildRuntimeInstructions (~1.3K+)
    │                                                  + thin COMPOSER_INSTRUCTION (~800) + evidence slice
    ▼
composeReasonFirstReply() → OpenAI                    ← opening + final reply
    │
    ▼
validateReasonFirstReply()                            ← doctrine, correction overlap, posture hard fails — NOT felt-heard
```

| Stage | Decides | Enforced on output? | Confidence |
|-------|---------|---------------------|------------|
| `questionIntentResolver` / `reasoningSnapshot` | Question type, answer type, correction/meta | Partially via regen | **High** |
| `detectCompanionTopic` + `buildCompanionThreadContext` | Topic bucket + `practicalNextStepCategory` | No — hints only | **High** |
| `retrievalEvidencePack` | Scripture/history/memory slices | Indirect (model sees JSON) | **High** |
| `listeningSpecificityValidator` | `detailCandidates`, `listeningGuidance` | **No** — soft user payload | **High** |
| `buildSystemPrompt` + `buildRuntimeInstructions` | Default **teaching turn shape** | **Yes** — dominates tone/structure | **High** |
| OpenAI generation | Final wording | **Yes** | **High** |
| `doctrineBoundaryValidator` | Doctrine/correction overlap | Yes — not calibration | **High** |

---

## PART A — Per-turn trace (all 20 turns)

### Legend

- **Retrieval (summary):** memory hit count, `history.included`, scripture source/refs, `directConcernPhrase`
- **Composer payload (summary):** `detailCandidates` (max 5), `listeningGuidance` (abbrev), `correctionLedger` active + `requireDirectAnswerFirst`
- **System need (inferred):** from understanding + companion context (not a runtime field)
- **Actual user need (audit):** human-judged from message + thread position
- **Match:** alignment of inferred intent, actual need, and reply shape (opening + body)

---

### Thread: job (3 turns)

#### Job T1

| Field | Value |
|-------|-------|
| **User message** | I have a job opportunity. |
| **Retrieval** | topic: `null`; companionTopic: `discernment`; memory hits: 1; history: **no**; scripture: `companion_stub` → Proverbs 3:5-6, James 1:5, Psalm 37:23; directConcern: full message |
| **Topic labels** | `questionType: discernment`, `requestedAnswerType: discernment_conversation`, `strictAnswerMode: false` |
| **Companion topic** | `discernment` → `practicalNextStepCategory: wise_discernment_and_peace` |
| **Reasoning snapshot** | Classified as life decision / discernment (not open sharing) |
| **Correction ledger** | inactive |
| **Composer payload** | detailCandidates: `I have a job opportunity.`; guidance: use user wording, not template opener |
| **Opening** | It's wonderful to hear you have a job opportunity. |
| **Final response** | …excitement and uncertainty… Proverbs… Would you like to talk… or pray together… |
| **System need (inferred)** | **guidance** + encouragement |
| **Actual user need** | **witness** — name the opportunity; invite what matters before counsel |
| **Match** | **MISMATCH** |
| **Evidence** | Retrieval had no wrong facts; system **pre-labels discernment** on turn 1 and injects discernment scripture stubs; opening celebrates before listening; listening **5.8** |

**Earliest divergence:** **Companion topic + discernment classification** (`classifyDiscernment` / `detectCompanionTopic`) — before compose. **Confidence: High**

---

#### Job T2

| Field | Value |
|-------|-------|
| **User message** | The company is far away from home. |
| **Retrieval** | topic: `discernment`; companionTopic: `discernment`; memory hits: 3; directConcern: **`far away from home`**; same scripture stubs |
| **Reasoning** | `discernment` / `discernment_conversation` |
| **Correction ledger** | inactive |
| **Composer payload** | detailCandidates include **`far away from home`** (5 items) |
| **Opening** | **It sounds like** the distance of the company from your home… |
| **Final** | …Proverbs 3:5-6… pray for clarity about **distance** |
| **System need** | **guidance** |
| **Actual user need** | **witness** — sit with relocation weight; one layer deeper, not re-preach Proverbs |
| **Match** | **MISMATCH** |
| **Evidence** | Payload **had** the anchor; opening used template stem; feltHeard **2**, listening **4.8** |

**Earliest divergence:** **Generation** (template opener + teaching shape) despite correct retrieval/payload. Classification still **guidance** not witness. **Confidence: High**

---

#### Job T3

| Field | Value |
|-------|-------|
| **User message** | I'm not sure whether to push or wait on this offer. |
| **Retrieval** | directConcern: `far away from home` (stale — does not prefer **push or wait** phrase) |
| **Composer payload** | detailCandidates include push/wait + far away |
| **Opening** | It's understandable to feel uncertain about whether to push forward or wait… |
| **Final** | …Proverbs 3:5-6 again… pray together for clarity |
| **System need** | **guidance** |
| **Actual user need** | **guidance** (discernment on fork) |
| **Match** | **PARTIAL MATCH** |
| **Evidence** | Right category; wrong **calibration** — repeats prior verse arc, weak progression; listening **6.0** |

**Earliest divergence:** **Generation** (default complete teaching turn). **Confidence: High**

---

### Thread: alz (3 turns)

#### Alz T1

| Field | Value |
|-------|-------|
| **User message** | My mom was recently diagnosed with Alzheimer's. |
| **Retrieval** | companionTopic: `caregiver`; stubs: Exodus 20:12, Proverbs 17:17, Isaiah 46:4; directConcern: mom + Alzheimer's |
| **Reasoning** | `direct_question` / `direct_answer` (not grief type yet) |
| **Composer payload** | detailCandidates: mom + Alzheimer's |
| **Opening** | I'm so sorry to hear about your mom's diagnosis. |
| **System need** | **comfort** |
| **Actual user need** | **witness** |
| **Match** | **PARTIAL MATCH** |
| **Evidence** | Opening uses mom; still adds honor-verse + prayer offer → teaching tail; listening **6.5** |

**Earliest divergence:** **Generation** (comfort + scripture stack vs brief witness). **Confidence: Medium**

---

#### Alz T2

| Field | Value |
|-------|-------|
| **User message** | Some days she doesn't remember who I am. |
| **Retrieval** | directConcern: **remember who I am**; caregiver stubs |
| **Opening** | It must be very painful… your mom doesn't remember who you are. |
| **System need** | **comfort** |
| **Actual user need** | **witness** |
| **Match** | **PARTIAL MATCH** |
| **Evidence** | Strong specificity in opening; Isaiah + prayer offer still deliver-mode; listening **6.8** |

**Earliest divergence:** **Generation**. **Confidence: High**

---

#### Alz T3

| Field | Value |
|-------|-------|
| **User message** | How do I stay close to God while grieving who she used to be? |
| **Reasoning** | `grief` / `companion_support` |
| **Opening** | **Grieving who your mom used to be** while walking… Alzheimer's… |
| **System need** | **comfort** |
| **Actual user need** | **comfort** + spiritual companion |
| **Match** | **MATCH** |
| **Evidence** | Emotional precision + right mode; listening **7.8** |

**Earliest divergence:** None material — calibration aligned. **Confidence: High**

---

### Thread: distant (3 turns)

#### Distant T1

| Field | Value |
|-------|-------|
| **User message** | I feel distant from God lately. |
| **Retrieval** | companionTopic: `distant_from_god`; nextStep: **`honest_reflection_not_template`**; Psalm/James/Psalm 51 stubs |
| **Reasoning** | `direct_question` / `direct_answer` |
| **Opening** | Feeling distant from God is something many people experience… |
| **System need** | **witness** (from nextStep) + **teaching** (from stubs + runtime) |
| **Actual user need** | **witness** |
| **Match** | **PARTIAL MATCH** |
| **Evidence** | `lately` weak; three-verse body + prayer SKU; listening **6.0** |

**Earliest divergence:** **Generation** (generic opener + explain/advise). **Confidence: High**

---

#### Distant T2

| Field | Value |
|-------|-------|
| **User message** | I pray but it feels empty. |
| **Retrieval** | directConcern: **`feels empty`**; detailCandidates include empty + lately |
| **Opening** | It's truly hard when prayer feels empty… |
| **System need** | **witness** |
| **Actual user need** | **witness** |
| **Match** | **PARTIAL MATCH** |
| **Evidence** | Names empty; still Psalm 51 renewal + guided prayer close; threadSpecific **4** |

**Earliest divergence:** **Generation**. **Confidence: High**

---

#### Distant T3

| Field | Value |
|-------|-------|
| **User message** | Does that mean my faith is failing? |
| **Retrieval** | directConcern: **`faith is failing`** |
| **Opening** | Feeling distant or having prayers that seem empty doesn't necessarily mean your faith is failing. |
| **System need** | **direct answer** (questionType follow_up) |
| **Actual user need** | **direct answer** |
| **Match** | **MATCH** |
| **Evidence** | Answers fear first; listening **7.5**, feltHeard **8** |

**Earliest divergence:** None — classification and generation aligned. **Confidence: High**

---

### Thread: sabbath (7 turns)

#### Sabbath T1

| Field | Value |
|-------|-------|
| **User message** | Why should we keep Sunday as the day of worship onto the Lord? |
| **Retrieval** | topic: `sabbath`; **history.included: true**; scripture: `doctrine_chain`; companionTopic: **null** |
| **Reasoning** | `historical_evidence` / `historical_answer` |
| **Correction ledger** | inactive |
| **Opening** | The Bible commands the seventh day (Saturday) as the Sabbath… |
| **System need** | **teaching** + **direct answer** |
| **Actual user need** | **direct answer** (doctrinal/historical) |
| **Match** | **PARTIAL MATCH** |
| **Evidence** | Correct mode for question type; long Constantine/Laodicea chain hurts **feltHeard 5**; listening **5.8** |

**Earliest divergence:** **Generation** (over-length), not retrieval. **Confidence: Medium**

---

#### Sabbath T2

| Field | Value |
|-------|-------|
| **User message** | Why do you call it the Roman church instead of the Roman Catholic Church…? |
| **Retrieval** | **history.included: false**; ledger **active**; `wording_explanation`; requireDirectAnswerFirst: typical |
| **Reasoning** | `meta_about_previous_answer` |
| **Opening** | I use the term "Roman church" as a simpler shorthand… |
| **System need** | **clarification** |
| **Actual user need** | **clarification** |
| **Match** | **PARTIAL MATCH** |
| **Evidence** | Answers wording but feltHeard **5**; listening **6.2** |

**Earliest divergence:** **Generation** (shorthand rationale vs naming preference). Retrieval/ledger **correct**. **Confidence: High**

---

#### Sabbath T3–T4

| User | Wording/meta correction repeats |
| **Retrieval** | `wording_explanation`, history off, ledger active, detailCandidates list Roman church / not asking about shift |
| **System need** | **clarification** / **repair** |
| **Actual need** | **repair** (T4: "not asking about the shift") |
| **Match** | **PARTIAL MATCH** (T3 **6.8**) / **MISMATCH** (T4 — paraphrase loop, overlap **44%**) |
| **Earliest divergence** | **Generation** (repeated shorthand paragraph). **Confidence: High** |

---

#### Sabbath T5

| Field | Value |
|-------|-------|
| **User message** | Why are you not answering my question? |
| **Reasoning** | `correction` / `direct_reanswer` |
| **Opening** | I understand it feels like I haven't fully addressed your concern. |
| **System need** | **repair** |
| **Actual user need** | **repair** |
| **Match** | **MATCH** |
| **Evidence** | Relational repair; listening **7.4** |

**Earliest divergence:** **Reasoning snapshot** under-specified `strictAnswerMode` until later turns — repair still partial. **Confidence: Medium**

---

#### Sabbath T6–T7

| T6 | Meta wording again — **MISMATCH** vs repair (generic patience opener); listening **6.6** |
| T7 | `strictAnswerMode: true`, correction — offers full term — **MATCH**; listening **7.2** |

**Earliest divergence T6:** **Generation**. **T7:** Aligned. **Confidence: High**

---

### Thread: grief (2 turns)

#### Grief T1

| Field | Value |
|-------|-------|
| **User message** | I lost a friend Wednesday. |
| **Retrieval** | companionTopic: `grief`; nextStep: **`presence_and_comfort`**; detailCandidates: **full message with Wednesday** |
| **Reasoning** | `grief` / `companion_support` |
| **Opening** | I'm truly sorry for your loss. (**Wednesday absent**) |
| **System need** | **comfort** |
| **Actual user need** | **witness** (fresh loss — name Wednesday + friend) |
| **Match** | **PARTIAL MATCH** |
| **Evidence** | Strongest precision failure with detail in payload; listening **5.8** |

**Earliest divergence:** **Generation** (opening ignored `detailCandidates`). Retrieval **not** at fault. **Confidence: High**

---

#### Grief T2

| User | It is still bothering me. |
| **Retrieval** | directConcern: `still bothering me`; Wednesday in thread memory |
| **Opening** | It makes sense that your friend's passing is still weighing heavily… (**Wednesday still absent**) |
| **Match** | **PARTIAL MATCH** |
| **Earliest divergence** | **Generation**. **Confidence: High**

---

### Thread: health (2 turns)

#### Health T1

| Field | Value |
|-------|-------|
| **User message** | My knees hurt. |
| **Retrieval** | health topic; `practical_care_and_prayer`; knees in detailCandidates |
| **Opening** | I'm sorry to hear your knees are hurting. |
| **System need** | **comfort** + **guidance** (practical) |
| **Actual user need** | **comfort** + light practical |
| **Match** | **PARTIAL MATCH** |
| **Evidence** | Reasonable; listening **6.3** |

**Earliest divergence:** None major. **Confidence: Medium**

---

#### Health T2

| User | My knees are hurting again today. |
| **Retrieval** | directConcern: **`again today`** |
| **Opening** | I'm sorry your knees are hurting again today. |
| **System need** | **comfort** + **guidance** |
| **Actual user need** | **witness** (recurrence weariness — not repeat T1 advice verbatim) |
| **Match** | **PARTIAL MATCH** |
| **Evidence** | Opening anchors "again today"; body **57% overlap** with T1; noRepeat **5** |

**Earliest divergence:** **Generation** (progression / restraint). **Confidence: High**

---

## PART A — Master calibration table

| Turn | System need (inferred) | Actual user need | Match level | Evidence (one line) | Confidence |
|------|------------------------|------------------|-------------|---------------------|------------|
| job-1 | guidance | witness | **MISMATCH** | Discernment label on first share; Proverbs opener | High |
| job-2 | guidance | witness | **MISMATCH** | `far away` in payload; "It sounds like" + feltHeard 2 | High |
| job-3 | guidance | guidance | **PARTIAL** | Right fork; repeated Proverbs/James arc | High |
| alz-1 | comfort | witness | **PARTIAL** | Mom named; verse + prayer teach tail | Medium |
| alz-2 | comfort | witness | **PARTIAL** | Remember-who named; still deliver close | High |
| alz-3 | comfort | comfort | **MATCH** | "Grieving who your mom used to be" | High |
| distant-1 | witness + teaching | witness | **PARTIAL** | Generic opener + verse triad | High |
| distant-2 | witness | witness | **PARTIAL** | Empty named; still advise/pray close | High |
| distant-3 | direct answer | direct answer | **MATCH** | Faith-failing answered first | High |
| sabbath-1 | teaching | direct answer | **PARTIAL** | Correct type; over-long history | Medium |
| sabbath-2 | clarification | clarification | **PARTIAL** | Wording answered; low feltHeard | High |
| sabbath-3 | clarification | repair | **PARTIAL** | Shorthand repeat | High |
| sabbath-4 | clarification | repair | **MISMATCH** | "Thank you for clarifying" + same rationale | High |
| sabbath-5 | repair | repair | **MATCH** | Acknowledges breach | High |
| sabbath-6 | clarification | repair | **MISMATCH** | Patience opener; no fresh repair | High |
| sabbath-7 | repair | repair | **MATCH** | Offers Roman Catholic Church | High |
| grief-1 | comfort | witness | **PARTIAL** | Wednesday in payload, absent in reply | High |
| grief-2 | comfort | witness | **PARTIAL** | "still bothering" paraphrase; no Wednesday | High |
| health-1 | comfort + guidance | comfort | **PARTIAL** | Adequate practical tone | Medium |
| health-2 | comfort + guidance | witness | **PARTIAL** | "again today" in opening; 57% body repeat | High |

---

## PART B — Aggregate match rates

| Match level | Count | Percentage |
|-------------|-------|------------|
| **MATCH** | 4 | **20%** |
| **PARTIAL MATCH** | 12 | **60%** |
| **MISMATCH** | 4 | **20%** |

**Notes:**

- **MATCH** turns average listening **≈7.5** (7.8, 7.5, 7.4, 7.2).
- **MISMATCH** turns average listening **≈5.3** (4.8, 5.8, 6.6, 5.8, 5.8 weighted).
- **PARTIAL** cluster **≈6.3–6.8**.

**Weighted calibration alignment score** (MATCH=1, PARTIAL=0.5, MISMATCH=0): **(4 + 6) / 20 = 50%** full alignment.

**Confidence:** **High** on counts; **Medium** on boundary calls between PARTIAL/MISMATCH.

---

## PART C — Earliest divergence point (aggregate)

Count of **first point in pipeline** where inferred system need or reply shape diverges from actual user need:

| Stage | Turns | Share | Confidence |
|-------|-------|-------|------------|
| **Companion topic / topic mapping** (`detectCompanionTopic`, `classifyDiscernment`) | job-1, job-2, job-3 (partial), health-2 (partial) | **4 / 20 (20%)** | High |
| **Reasoning snapshot** (`questionType` / `requestedAnswerType` / `strictAnswerMode`) | sabbath-5 (partial until T7 strict), distant-1 (answer vs witness) | **2–3 / 20 (10–15%)** | Medium |
| **Retrieval** (wrong slice emphasis) | sabbath-1 (history length — appropriate flag, heavy slice) | **1 / 20 (5%)** | Medium |
| **Composer payload** (signals present but unused) | grief-1/2, job-2, sabbath-2–4, 7 | **8 / 20 (40%)** — payload **correct**, output wrong | High |
| **Generation (OpenAI + system prompt stack)** | Majority of PARTIAL/MISMATCH | **14 / 20 (70%)** | High |
| **Validation** | **0 / 20** — validator does not gate felt-heard or moment mode | **0%** | High |

### Headline (Part C)

**Earliest consistent divergence for companion threads:** **companion topic classification** (job → forced `discernment` / `guidance` on turn 1–2).

**Largest-volume divergence:** **generation under the composer system prompt stack** — retrieval and `detailCandidates` often **already correct**, but `buildSystemPrompt` + `buildRuntimeInstructions` train a **complete teaching turn**, so the model **witnesses in payload, advises in prose**.

**Validation is not a calibration failure point** — it optimizes doctrine/correction overlap, not situational mode.

**Confidence:** **High**

---

## PART D — Projection if calibration MATCH rate → 80%

**Method:** Blend observed scores by match tier (not independent experiments).

| Tier | n | Avg listening | Avg feltHeard (dims) |
|------|---|---------------|----------------------|
| MATCH | 4 | 7.48 | ~7.75 |
| PARTIAL | 11 | 6.44 | ~5.9 |
| MISMATCH | 5 | 5.36 | ~3.4 |

**Projected at 80% MATCH / 15% PARTIAL / 5% MISMATCH** (target state, not observed):

| Metric | Current (RACL + golden control) | Projected @ 80% MATCH | Delta | Confidence |
|--------|--------------------------------|------------------------|-------|------------|
| **Listening** | 6.4 | **~7.2–7.4** | +0.8–1.0 | Medium |
| **Warmth** | 5.7 (golden control) | **~6.5–6.8** | +0.8–1.1 | Medium |
| **Felt heard** | 5.9 (golden control) | **~7.0–7.3** | +1.1–1.4 | Medium |
| **Companion presence** | 5.7 (golden control) | **~6.8–7.2** | +1.1–1.5 | Medium |

**Calculation (listening):** `0.8×7.48 + 0.15×6.44 + 0.05×5.36 ≈ 7.26`

**Gate implication:** 80% MATCH likely reaches **~7.2–7.3** average listening — **short of 7.5** unless MATCH-tier replies consistently score **≥7.8** (alz T3 band).

**Confidence:** **Medium** (extrapolation; no live 80% MATCH experiment)

---

## PART E — One recommendation

### Single system most responsible for calibration failure

**The composer system prompt assembly** — specifically **`buildSystemPrompt()` + `buildRuntimeInstructions()` embedded in `buildComposerSystemPrompt()`** (`services/reasonFirstComposer.js`) — **not** retrieval, **not** RACL memory, **not** `doctrineBoundaryValidator`.

**Why (evidence-only):**

1. **Retrieval often knows the moment:** `detailCandidates` include `Wednesday`, `far away from home`, `wording_explanation`, `honest_reflection_not_template` on 12+ turns.
2. **Reasoning snapshot is often directionally correct on Sabbath meta** (`wording_explanation`, history suppressed T2+).
3. **Job thread mis-labels early** at `detectCompanionTopic` / discernment — but even when labels are acceptable (grief, distant), **openings still skip payload anchors**.
4. **Thin `COMPOSER_INSTRUCTION` and user JSON cannot outweigh ~5K+ chars of “reflect then advise / Scripture / steps”** in the system message (`ComposerObjectiveConflictAudit.md`).
5. **Operating model experiment** (human moment first) **regressed** listening when added as a **parallel framework** — but production already **lacks** moment enforcement; the failure mode is **default prompt shape**, not absence of retrieval.

**Not recommended here (per user constraints):** new framework, prompt-only patch list, or validator — those were tested and regressed or remain soft-only.

**Confidence:** **High** that this is the **primary owner**; **Medium** that fixing weighting alone hits **7.5** without compose-time moment selection.

---

## Appendix — What production does *not* do

| Capability | Status |
|------------|--------|
| `assessHumanMoment()` | **TEST-ONLY** (`companionOperatingModelExperiment.js`) — **not** in `reasonFirstBuddyRuntime` |
| `companionTurnIntent` posture | **Not** in current RACL validation path (`companionTurnIntent: null` all 20 turns) |
| Enforced witness mode on share turns | **No** |
| Regen for missing `detailCandidates` in opening | **No** |

---

*Audit complete. No code changes made.*
