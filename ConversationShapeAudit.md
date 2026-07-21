# Companion Conversation Shape Audit

**Scope:** Audit only. No code, validators, or implementation recommendations beyond identification.

**Question:** Why does BibleBuddy still feel like an answer engine instead of a companion?

**Evidence:** Latest RACL validation transcripts — `docs/racl/validation-results.json` (generated 2026-06-02, `reason_first`, RACL 1.0).

| Metric | Value |
|--------|-------|
| Turns analyzed | 20 |
| OpenAI usage | 100% |
| In-thread memory hits (evidence pack) | 20/20 |
| Avg human listening | **6.4/10** |
| Avg `threadSpecific` | **5.5/10** |
| Avg `feltHeard` | **5.7/10** |
| Template prose | 0.1% |
| Release gate | FAIL (listening ≥7, Sabbath T7 ≥8) |

**Method:** Each reply was segmented by communicative function (sentence/clause level). Percentages are approximate and sum to ~100% per turn. “Asking” includes only turns that invite the user to share or choose direction; closing offers (“Would you like a prayer?”) are split between **asking (transactional)** and **engaging** where noted.

**Ideal companion baseline (aggregate target for these thread types):**

| Function | Ideal % | Actual avg % | Δ |
|----------|---------|--------------|---|
| Answering | 22 | 16.7 | −5.3 |
| Advising | 15 | 19.8 | +4.8 |
| Explaining | 14 | **35.4** | **+21.4** |
| Asking (exploratory) | ~18 | **~2** | **−16** |
| Asking (transactional close) | ~4 | ~4 | ~0 |
| Reflecting | 24 | 17.5 | −6.5 |
| Engaging | 3 | 4.9 | +1.9 |

**Headline:** Retrieval and OpenAI are working; **turn shape is not**. The model delivers a complete mini-essay (reflect opener → explain/advise body → optional prayer offer) in one shot. That is answer-engine choreography with a warm first sentence, not companion pacing.

---

## Aggregate Conversation Shape (20 turns)

```
Actual distribution          Ideal companion
──────────────────          ───────────────
Explaining  ████████████ 35%   Explaining  ████ 14%
Advising    ██████ 20%         Reflecting  ██████ 24%
Reflecting  █████ 18%          Asking      ██████ 22%
Answering   ████ 17%           Answering   █████ 22%
Engaging    █ 5%               Advising    ███ 15%
Asking      █ 6%               Engaging    █ 3%
```

**Deliver-mode overload (answering + advising + explaining):** **71.9%** actual vs **51%** ideal (+21 points).

**Companion-mode deficit (asking + reflecting + engaging):** **28.3%** actual vs **49%** ideal (−21 points).

**Structural tells across the corpus:**

- **9/20** turns end with a prayer/scripture/help offer (same conversational “checkout”).
- **8/20** turns embed a scripture block (often Proverbs/James/Psalm triad) in the body.
- **8/20** open with a reflection stem (“It sounds like…”, “I’m sorry…”, “I hear…”).
- **0/20** turns open with a genuine exploratory question before advising or explaining.
- **Transactional “asking”** (~4%) dominates real **curiosity asking** (~2%).

---

## Per-Turn Analysis

### Thread: Job opportunity (`job`) — avg listening **5.4**

| Turn | User | Listening | Shape % (ans / adv / exp / ask / ref / eng) | vs ideal | Missed opportunities |
|------|------|-----------|-----------------------------------------------|----------|----------------------|
| 1 | I have a job opportunity. | 5.8 | 12 / 38 / 28 / 12 / 8 / 2 | Heavy advise+explain on vague share | Should **ask** what makes this feel significant, timeline, fears—before Proverbs/James. Prayer offer before diagnosis. |
| 2 | The company is far away from home. | 4.5 | 5 / 35 / 32 / 10 / 15 / 3 | Re-explains generic distance; **53% overlap** with T1 | Should **name** “job + distance” as one decision; ask about family/commute tradeoff. Repeated scripture stack from T1. |
| 3 | Push or wait on this offer. | 6.0 | 8 / 38 / 30 / 12 / 10 / 2 | Answers timing but as sermon | Should explore what “push” vs “wait” means to user; reflect tension **before** wisdom verses. |

**Thread pattern:** Three complete advice packages; never co-discerns. `threadSpecific` stuck at 4 despite memory hits.

---

### Thread: Alzheimer's caregiver (`alz`) — avg listening **7.0** (best thread)

| Turn | User | Listening | Shape % | vs ideal | Missed opportunities |
|------|------|-----------|---------|----------|----------------------|
| 1 | Mom diagnosed with Alzheimer's. | 6.5 | 12 / 18 / 28 / 8 / 28 / 6 | Better reflect; still quick to scripture | Ask how she’s doing day-to-day, what diagnosis changed—before Exodus/Isaiah. |
| 2 | Some days she doesn't remember who I am. | 6.8 | 15 / 12 / 28 / 8 / 32 / 5 | Strongest reflect in thread | Could ask what those days feel like for *you* before “presence matters” theology. |
| 3 | Stay close to God while grieving who she was. | 7.8 | 8 / 28 / 22 / 10 / 28 / 4 | **Only turn** that weaves arc (grief + faith) | Still advises (“quiet moments”) before exploring spiritual struggle; question could be “What makes God feel far right now?” |

**Thread pattern:** Companion-adjacent on reflection; still **explain-heavy** and closes with prayer offer every turn.

---

### Thread: Distant from God (`distant`) — avg listening **6.3**

| Turn | User | Listening | Shape % | vs ideal | Missed opportunities |
|------|------|-----------|---------|----------|----------------------|
| 1 | I feel distant from God lately. | 5.3 | 5 / 22 / 42 / 12 / 14 / 5 | Explain-first | Ask *when* “lately” started, what distant feels like—before Psalm 139/James 4:8. |
| 2 | I pray but it feels empty. | 6.0 | 5 / 32 / 38 / 10 / 10 / 5 | **44% overlap**; reuses T1 verses | Should link “distant + empty prayer” explicitly; explore prayer habit before prescribing “pray honestly.” |
| 3 | Does that mean my faith is failing? | 7.5 | 18 / 22 / 42 / 3 / 12 / 3 | Best **answering** turn | User asked yes/no fear—Buddy reassures but **explains 42%**. Should reflect fear first (“That fear makes sense after empty prayers”), then short answer, then one question. |

**Thread pattern:** Answer engine on spiritual dryness: scripture-forward, low curiosity.

---

### Thread: Sabbath wording (`sabbath`) — avg listening **6.8** (T7 gate **6.8**, target ≥8)

| Turn | User | Listening | Shape % | vs ideal | Missed opportunities |
|------|------|-----------|---------|----------|----------------------|
| 1 | Why Sunday as worship day? | 5.8 | 8 / 2 / 82 / 0 / 5 / 3 | Pure lecture (appropriate for question) | OK to explain; could ask tradition/denomination context. |
| 2 | Why “Roman church” not “Roman Catholic Church”? | 6.2 | 35 / 2 / 48 / 0 / 12 / 3 | Meta: should be **short direct answer** | Invented rationale (“concise… clear”)—companion would say: “You’re right; I’ll use Roman Catholic Church. No theological distinction intended.” Stop. |
| 3 | Same wording question (repeat). | 7.8 | 38 / 2 / 45 / 0 / 12 / 3 | **44% overlap** with T2 | Should not re-justify; acknowledge repeat frustration. |
| 4 | Not asking about the shift—your wording. | 7.2 | 32 / 2 / 42 / 0 / 18 / 6 | Correction heard; same rationale | **Explore:** “What feels off about that term to you?” before defending. |
| 5 | Why are you not answering my question? | 6.8 | 35 / 2 / 40 / 0 / 18 / 5 | Meta failure | Direct answer in sentence 1; drop history entirely. |
| 6 | Not history—wording. | 7.2 | 32 / 2 / 42 / 0 / 18 / 6 | Loop continues | Same as T4–5. |
| 7 | Are you not listening? | 6.8 | 30 / 2 / 38 / 0 / 22 / 8 | **47% overlap**; “I’m truly listening” + same rationale | Companion move: own miss (“I kept explaining instead of answering”)—not reassert listening while repeating answer. |

**Thread pattern:** Meta-conversation treated as **another explanation opportunity**. Reflection rises slightly but **asking stays 0%** for 6 turns—no repair question, no check-in.

---

### Thread: Grief (`grief`) — avg listening **5.65**

| Turn | User | Listening | Shape % | vs ideal | Missed opportunities |
|------|------|-----------|---------|----------|----------------------|
| 1 | I lost a friend Wednesday. | 5.8 | 5 / 15 / 22 / 5 / 38 / 15 | Good opener; **`threadSpecific` 4** | **Wednesday never named.** “Be here to listen” then immediately offers scripture—contradicts pacing. Ask: “Tell me about your friend?” |
| 2 | It is still bothering me. | 5.5 | 8 / 28 / 22 / 8 / 28 / 6 | **`threadSpecific` 2** (worst) | Generic grief timeline; no friend, no Wednesday. Should ask what “bothering” looks like today. |

**Thread pattern:** Highest engaging % in corpus, but **facts in memory never surface in prose**.

---

### Thread: Health (`health`) — avg listening **6.3**

| Turn | User | Listening | Shape % | vs ideal | Missed opportunities |
|------|------|-----------|---------|----------|----------------------|
| 1 | My knees hurt. | 6.3 | 10 / 48 / 18 / 12 / 10 / 2 | **Advise-heavy** | Ask severity, duration, what they’ve tried—before ice/heat/doctor checklist. |
| 2 | My knees are hurting again today. | 6.3 | 12 / 45 / 18 / 8 / 12 / 5 | **41% overlap**; weak “again today” echo | Should mirror recurrence (“again today—sounds draining”); ask if same pain or worse. |

**Thread pattern:** Medical-adjacent companion turns become **wellness pamphlet** + temple verse.

---

## Comparison to Ideal Companion Behavior

| Companion behavior | Ideal | RACL actual |
|--------------------|-------|-------------|
| **Pause before prescribe** | Explore 1–2 turns on emotional threads | Prescribe in turn 1 on job, health, distant |
| **Reflect before explain** | Name user’s words, then theology | Reflect clause → immediate scripture block |
| **Thread as one story** | Integrate T1+T2 facts each turn | Facts retrieved (5 snippets) but prose often generic |
| **Questions that open** | Curiosity about experience | ~0% exploratory questions |
| **Questions that close** | Optional prayer after understanding | 9/20 transactional closes |
| **Meta/correction** | Short answer, own error, stop | Re-explain rationale 6 times (Sabbath) |
| **Leave space** | Shorter turns when user is vulnerable | Uniform paragraph length |

**Why it still feels mechanical despite strong infrastructure:**

- **OpenAI 100%** fixed *word quality*, not *turn role*.
- **Memory 20/20** fixed *evidence availability*, not *prose selection* (`threadSpecific` 5.5).
- **Listening 6.4** rewards “addressed the message” (`answeredLatest` ~7+) while **`feltHeard` ~5.7** stays flat—users feel processed, not accompanied.

---

## Top 10 Reasons the Conversation Still Feels Mechanical

| Rank | Reason | Evidence |
|------|--------|----------|
| 1 | **Monologue turn shape** — every reply is a self-contained essay | 71.9% deliver-mode; no turn leaves an open loop except prayer offer |
| 2 | **Explain-first reflex** | 35.4% explaining vs 14% ideal; 8/20 scripture blocks |
| 3 | **Advise before explore** | Job T1, health T1, distant T1 prescribe before asking |
| 4 | **Transactional closing habit** | 9/20 “Would you like prayer/scripture/help” — same checkout |
| 5 | **Reflection as opener, not relationship** | 8/20 “It sounds like…” openers; `feltHeard` still ~5.7 |
| 6 | **Memory hits don’t become speech** | 20/20 evidence hits; grief T2 `threadSpecific` 2; “Wednesday” absent |
| 7 | **Scripture triplet repetition** | Job T1–T3 Proverbs/James/Psalm pattern; distant T1–T3 Psalm/James/David loop |
| 8 | **Correction loop = same answer, new preamble** | Sabbath T2–T7: 37–47% overlap; rationale repeated after “not listening” |
| 9 | **Meta-questions answered with invented intent** | “Roman church” brevity rationale—confident, wrong, unexamined |
| 10 | **No exploratory questions** | 0/20 opens with curiosity; ~2% true asking vs 22% ideal |

---

## Remaining Gap Attribution

**Question:** How much of the gap to “companion” (listening ~6.4 vs target ~7.5–8) is caused by each bucket?

These percentages describe **relative contribution to the perceived answer-engine gap**, not engineering effort. They sum to **100%**.

| Bucket | % | Rationale |
|--------|---|-----------|
| **A. Conversation shape** | **38%** | Dominant: deliver-mode +21 pts, exploratory asking −16 pts, uniform paragraph arc, prayer checkout. Would still feel mechanical with perfect retrieval on many turns. |
| **B. Retrieval quality** | **22%** | Evidence pack hits 20/20, but compose under-uses snippets (`threadSpecific` 5.5). Grief/health/job lose concrete anchors in prose—not missing RACL, missing *selection into speech*. |
| **C. Reasoning quality** | **18%** | Sabbath meta-loop, distant arc synthesis, job decision integration, invented wording rationale. Wrong *focus* more than wrong facts. |
| **D. Emotional specificity** | **22%** | `feltHeard` 5.7; shallow reflect; Alzheimer’s T3 succeeds when grief+faith named together. Overlaps A but distinct: *which* words mirror the user. |

```
Remaining bottleneck (companion feel gap)
────────────────────────────────────────
A. Conversation shape     ████████████████████ 38%  ← primary
D. Emotional specificity  ███████████ 22%
B. Retrieval → compose    ███████████ 22%
C. Reasoning quality      █████████ 18%
```

**Primary bottleneck: A (conversation shape).**

Retrieval and reasoning matter, but transcripts show the model **already has thread context** and still chooses lecture-advise-close. Emotional specificity is the main lever *inside* shape (not more generic empathy). Retrieval fixes alone won’t flip companion feel without changing **what the turn is for** (discover vs deliver).

---

## Summary Answer

BibleBuddy feels like an answer engine because **each turn optimizes for delivering a complete, correct, gentle response** rather than **sharing conversational time**: explore, reflect, ask, then—only when appropriate—explain or advise.

OpenAI at 100% removed template routing; it did not remove **answer-engine turn economics**. Memory at 20/20 proves the system *knows* the thread; listening at 6.4 proves the user doesn’t *feel* known until shape and specificity catch up.

**No implementation in this document** — identification only.

---

*Source: `docs/racl/validation-results.json`. Shape coding available in audit working notes; aggregates: explaining 35.4%, advising 19.8%, reflecting 17.5%, answering 16.7%, asking 5.9%, engaging 4.9%.*
