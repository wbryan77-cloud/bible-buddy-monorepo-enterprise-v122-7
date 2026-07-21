# Top 10 Remaining Listening Failures

Generated: 2026-06-02  
Source: `docs/racl/validation-results.json` — human listening rubric, 20 turns, avg **6.3/10**

Ranked by **failure instance count** across all turns, with evidence from dimension scores, overlap metrics, and reply text.

---

## 1. Missing Emotional Specificity

**Instances:** 10 / 20 turns (`feltHeard ≤ 5`)

**Evidence**
- Job T1–T3: all `feltHeard: 5` despite competent content.
- Grief T1–T2: `feltHeard: 5` — warm tone but no named grief details.
- Health T1–T2: `feltHeard: 5` — clinical care advice without emotional weight.
- Distant T2: **`feltHeard: 3`** — worst in run.

**Example (Distant T2)**
> "It sounds like your prayers feel dry and lacking connection right now…"

User said they feel **distant** (T1) then **empty prayer** (T2). Reply treats T2 in isolation — no thread-level emotional arc.

**Impact:** Average `feltHeard` dimension = **5.7/10** (lowest after threadSpecific).

---

## 2. Failure to Reference User Details

**Instances:** 9 / 20 turns (`threadSpecific ≤ 4`)

**Evidence**
- Job T1–T3: **`threadSpecific: 4` on all three turns** — never integrates opportunity + distance + push/wait into one answer.
- Grief T1–T2: `threadSpecific: 4` — never says "Wednesday" or names the friend.
- Distant T1–T2: `threadSpecific: 4` and `2` — no callback to user's "lately" or prior distant feeling.
- Sabbath T2: `threadSpecific: 2` on wording turn.

**Example (Job T3)**
User accumulated: job opportunity → far from home → push or wait.  
Reply addresses push/wait but **`threadSpecific: 4`** — does not weave in distance factor from T2.

**Impact:** Average `threadSpecific` = **5.4/10** — weakest dimension in entire validation.

---

## 3. Repeated Reasoning / Answer Paragraph Reuse

**Instances:** 5 / 20 turns (`noRepeat ≤ 5`)

**Evidence**
| Turn | Thread | Overlap with prior | noRepeat |
|------|--------|-------------------|----------|
| T2 | Job | 50% | 5 |
| T3 | Job | 37% | 7 |
| T3 | Sabbath | 52% | 5 |
| T4 | Sabbath | 55% | 5 |
| T5 | Sabbath | 53% | 5 |
| T6 | Sabbath | 55% | 5 |

**Example (Sabbath T4–T6)**
Same paragraph skeleton repeated:
> "I use 'Roman church' as a concise/neutral/shorthand way… focused on biblical teaching… happy to use 'Roman Catholic Church'…"

Loop-control gate passed (no Constantine history), but **human rubric penalizes 47–55% rationale overlap**.

**Impact:** Average `noRepeat` = 6.9 — acceptable globally, but concentrated failure in Sabbath correction cluster (5 of 7 turns).

---

## 4. Weak Memory Retrieval (Thread Present, Not Used in Prose)

**Instances:** 5 / 20 turns

**Evidence**
- All turns show `threadLocalHitCount ≥ 1` and 20/20 memory hits — retrieval works.
- But 5 follow-up turns still score `threadSpecific ≤ 4` despite `threadLocalHitCount: 3–9`.
- Job T2 (`hitCount: 3`), Grief T2 (`hitCount: 3`), Distant T2 (`hitCount: 3`): evidence pack populated, composer under-used it.

**Example (Grief T2)**
Evidence: `lastUserMessages` includes "I lost a friend Wednesday."  
Reply: "your friend's loss is still weighing" — no "Wednesday," no "still bothering me" echo.

**Impact:** Retrieval infrastructure fixed; **composition gap** remains — facts in evidence, not in user-facing prose.

---

## 5. Generic Scripture Usage

**Instances:** 4 / 20 turns

**Evidence**
- Job T1–T3: identical Proverbs 3:5-6 + James 1:5 + Psalm 37:23 stack each turn.
- Distant T1: Psalm 139 + James 4:8 + Psalm 51 dump before personal engagement.
- Scripture stubs help grounding but composer treats them as **default paragraph filler**.

**Example (Job T2)**
> "Proverbs 3:5-6 reminds us… James encourages… You might also pray…"

Same trio as T1 — user added new info (distance), scripture block unchanged.

**Impact:** Contributes to overlap failures; `threadSpecific` stays at 4.

---

## 6. Weak Follow-Up Questions

**Instances:** 3 / 20 turns

**Evidence**
- Job T1: ends "Would you like… prayer" — no diagnostic question (legacy asked "What feels heaviest — distance, timing, money?").
- Health T1: no "how long?" question (legacy health responder asked duration).
- Alzheimer's T1: offers scripture before asking about user's mom.

**Example (Job T1 vs Legacy T1)**

| | Legacy | RACL |
|---|--------|------|
| Question | "What feels heaviest right now — the distance, timing, money, or whether this is from God?" | "Would you like… a simple prayer?" |

Legacy regex listening: 7. RACL human: 5.8. Legacy outperformed on **curiosity before counsel**.

**Impact:** Premature "Would you like" offers correlate with `feltHeard ≤ 5` on 3 turns.

---

## 7. Correction Recovery Gaps

**Instances:** 2 / 20 turns (`correctionRecovery ≤ 5`)

**Evidence**
- Sabbath T5: `correctionRecovery: 5` — user "Why are you not answering my question?" — reply re-explains shorthand again.
- Sabbath T7: **`correctionRecovery: 5`** — gate turn, target ≥8 — acknowledges frustration but repeats rationale (47% overlap with T6).

**Example (Sabbath T7)**
> "I hear your frustration and realize I have not directly answered… My choice of the shorter term is to keep our conversations focused and clear…"

Missing: one-sentence misunderstanding admission + Constantine/RCC distinction user needed from RACL spec.

**Impact:** Sabbath T7 scored **6.8** vs gate **8.0** — correction recovery is the binding constraint.

---

## 8. Shallow Acknowledgment Phrases Without Proof

**Instances:** 7+ turns (pattern, overlaps #1)

**Evidence**
Human rubric explicitly penalizes "I hear" / "It sounds like" unless reply proves understanding with thread details.

| Turn | Phrase | Detail proof? |
|------|--------|---------------|
| Sabbath T2 | "I understand you're curious" | No RCC/Constantine distinction |
| Sabbath T7 | "I hear your frustration" | Rationale repeated |
| Grief T2 | (none shallow) | But also no detail — `feltHeard: 5` |
| Distant T2 | "It sounds like your prayers feel dry" | `threadSpecific: 2` |

**Impact:** Phrases score well on old regex rubric (+2 for "I hear") but **hurt or neutralize** human rubric without specifics.

---

## 9. Failure to Chain Multi-Turn Thread Arc

**Instances:** 4 / 20 turns (subset of #2 and #4)

**Evidence**
- Distant T2: does not connect empty prayer → prior distant feeling.
- Job T3: does not integrate distance (T2) with push/wait (T3).
- Distant T3: answers faith failing but not "why distant" from thread.
- Grief T2: "days after a loss" is closest success but still misses "Wednesday."

**Example (Distant T3)**
User arc: distant → empty prayer → faith failing?  
Reply validates faith but **does not hypothesize reasons** from prior turns (burnout, dryness season, unanswered grief elsewhere).

**Impact:** Follow-up quality heuristic avg = **6.8/10** — mid-range, not bad, but misses user success criterion on distant thread.

---

## 10. Companion Topic Detection Without Emotional Depth

**Instances:** 3 / 20 turns

**Evidence**
- `companionTopic` correctly detected on all companion threads (caregiver, grief, health, discernment, distant_from_god).
- Alzheimer's T3 exception: depth achieved (7.8).
- Job, grief, health: topic detected, stubs injected, but **`feltHeard` stuck at 5–6**.

**Example (Health T2)**
> "It's tough to face that knee pain again today… rest… ice… medical advice… praying for relief…"

Correct topic, correct recurrence reference, but reads as **repeated care checklist** not companion presence.

**Impact:** RACL Part E/F fixed empty retrieval; **emotional composition** still template-adjacent despite OpenAI authorship.

---

## Failure Frequency Summary

| Rank | Failure | Count | Avg dimension hit |
|------|---------|-------|-------------------|
| 1 | Missing emotional specificity | 10 | feltHeard 5.7 |
| 2 | Failure to reference user details | 9 | threadSpecific 5.4 |
| 3 | Repeated reasoning | 5 | noRepeat 6.9 (cluster) |
| 4 | Weak memory retrieval (compose gap) | 5 | evidence OK, prose weak |
| 5 | Generic scripture usage | 4 | overlap driver |
| 6 | Weak follow-up questions | 3 | legacy beat RACL on job T1 |
| 7 | Correction recovery gaps | 2 | Sabbath T7 binding |
| 8 | Shallow ack without proof | 7+ | regex vs human gap |
| 9 | Multi-turn arc not chained | 4 | follow-up 6.8 |
| 10 | Topic detected, depth missing | 3 | companion threads |

## Highest-Leverage Cluster

**Sabbath T2–T7 + Job T1–T3** account for 10 of 20 turns and most repeated-reasoning / correction-recovery failures. Fixing correction-loop rationale reuse alone touches **35% of benchmark turns**.
