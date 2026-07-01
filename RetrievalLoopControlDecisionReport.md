# Retrieval & Loop-Control Decision Report

**Date:** 2026-06-02  
**Evidence base:** Live Prompt Hierarchy A/B (`docs/prompt-hierarchy-experiment/results.json`, `PromptHierarchyExperiment.md`)  
**Prior decision:** Prompt hierarchy is **NOT** the primary blocker (Listening delta **−0.3**, within ±0.3 gate)

---

## Executive Summary

| Dimension | Current RF | Minimal RF | Delta |
|-----------|------------|------------|-------|
| Listening | **5.8** | **5.5** | **−0.3** |
| Warmth | 5.5 | 5.6 | +0.1 |
| Helpfulness | 5.8 | 5.5 | −0.3 |
| Biblical grounding | 3.9 | **6.0** | **+2.1** |
| Correction recovery | 7.4 | **8.6** | +1.2 |
| Follow-up quality | **6.2** | 5.6 | −0.6 |

Stripping the prompt from ~31K to ~255 avg system tokens **did not improve listening**. Both runtimes share the same failures: **empty memory retrieval**, **weak scripture packs for companion turns**, and **Sabbath wording loops**. Minimal scored higher on biblical grounding and correction recovery heuristics mainly by citing verses and varying overlap — not by resolving the user's underlying frustration.

**Root-cause ranking (evidence-backed):**

1. **Loop-control** — primary human-listening failure mode  
2. **Retrieval quality** — primary structural gap (memory + meta/correction facts)  
3. **Scoring weakness** — masks true listening gap; inflates/deflates dimensions  
4. **Prompt hierarchy** — ruled out as primary blocker  

---

## A. Per-Turn Audit (All 20 Live A/B Turns)

Legend for **failure mode:**
- **R** = missing retrieval  
- **L** = loop-control / repetition  
- **S** = scorer weakness (heuristic mismatch with human listening)  
- **—** = no dominant failure (acceptable turn)

| # | Thread | User asked | Retrieved context | Missing context | Memory | Loop? | Dominant failure |
|---|--------|------------|-----------------|-----------------|--------|-------|------------------|
| 1 | Job T1 | Job opportunity | discernment intent | job open-loop memory, scripture | **0** | — | R |
| 2 | Job T2 | Company far from home | discernment | prior job thread as memory fact | **0** | prayer offer repeat | R |
| 3 | Job T3 | Push or wait on offer | discernment | synthesized push/wait + distance | **0** | — | R, S (Cur lost +2 listen vs Min "You said") |
| 4 | Alz T1 | Mom diagnosed Alzheimer's | direct_question | caregiver topic, comfort scripture refs | **0** | — | R |
| 5 | Alz T2 | Mom doesn't remember me | direct_question | ambiguous grief classification | **0** | — | R |
| 6 | Alz T3 | Stay close to God while grieving who she was | grief topic, **0 refs** | caregiver-specific practices, Psalm refs in pack | **0** | — | R |
| 7 | Distant T1 | Feel distant from God | direct_question | spiritual dryness scripture in pack | **0** | — | R |
| 8 | Distant T2 | Pray but feels empty | direct_question | thread arc label | **0** | — | R |
| 9 | Distant T3 | Faith failing? | direct_question | explicit yes/no bridge from T2 | **0** | — | R |
| 10 | Sabbath T1 | Why keep Sunday worship? | **8 scripture refs + history chain** | — | **0** | — | — (doctrine OK) |
| 11 | Sabbath T2 | Why "Roman church" not RCC? | wording_explanation, history excluded ✓ | **prior assistant quote**, system reason for phrase | **0** | shorthand rationale begins | **L, R** |
| 12 | Sabbath T3 | Same wording question | wording_explanation | prior reply diff, new explanation | **0** | **71% overlap** with T2 (Cur) | **L** |
| 13 | Sabbath T4 | Not shift — your wording | wording_explanation | correction state as new instruction | **0** | **54% overlap** | **L, S** (+2 listen for "I hear") |
| 14 | Sabbath T5 | Why not answering? | correction + **irrelevant 8 Sabbath refs** | user's exact unanswered question text | **0** | **56% overlap** (Cur) | **L, R** |
| 15 | Sabbath T6 | Not history — wording | wording_explanation | loop-break signal | **0** | **60% overlap** (Cur) | **L** |
| 16 | Sabbath T7 | Are you not listening? | correction, strictAnswerMode | substantive new answer | **0** | **54% overlap** (Cur); Min **quoted wrong turn** | **L** |
| 17 | Grief T1 | Lost friend Wednesday | grief topic, **0 refs** | temporal anchor "Wednesday" in retrieval | **0** | — | R |
| 18 | Grief T2 | Still bothering me | direct_question (grief flag dropped) | grief continuity, friend loss memory | **0** | — | R |
| 19 | Health T1 | Knees hurt | health flag | — | **0** | — | R |
| 20 | Health T2 | Knees hurting **again** today | health flag | **prior knee mention** as memory | **0** | same advice shape | **R** |

### Turn-level notes (both runtimes unless stated)

**Sabbath T16 (critical):** Minimal reply opens with *"You said, 'No, I'm not asking about history…'"* when the user actually asked *"Are you not listening?"* — **conversation-history misread**, not prompt size. Current also repeated the shorthand rationale for the 6th time.

**Job T3:** Minimal scored +2 listening because it used *"You said…"* + *"It sounds like"*; Current used *"You're feeling…"* without regex match — **scorer artifact**, not clearly better human listening.

**Grief T1:** Minimal mirrored *"Wednesday"*; Current omitted it — retrieval gap in Current, model compensation in Minimal from raw history text only.

**Health T2:** Neither runtime retrieved prior knee pain as memory; both gave structurally similar advice. Current included practical care; Minimal routed to Psalm 147:3 (grief verse for knee pain) — higher biblical grounding score, questionable relevance.

---

## B. Why Memory Hits Were 0 / Weak

### Observed fact

**20/20 turns: `memory.snippets = []`, `memory.hits = []`** in evidence pack reconstruction (fresh replay matching live thread messages).

### Root causes (ranked)

| # | Cause | Evidence |
|---|-------|----------|
| 1 | **Benchmark uses ephemeral userIds** (`phe-{thread}-current-{timestamp}`) | No prior `buddy-memory.json` / relationship memory for these IDs |
| 2 | **Memory recall gated on explicit recall queries** | `retrieveMemoryEvidence` only calls `collectRelationshipMemoryHits` when `recall.isRecallQuery \|\| understanding.shouldUseMemory` — companion turns rarely trigger |
| 3 | **Open loops not surfaced without persisted sessions** | Snippets come from `runtimeContext.memory.openLoops` populated by `enrichRuntimeContextWithMemory` — empty on turn 1 and weak within fresh test IDs |
| 4 | **Same-thread facts live in conversationHistory text only** | Job distance, knee recurrence, friend loss not structured as retrieval facts |
| 5 | **activeConversation not in minimal payload; underused in current** | `buildRetrievalEvidencePack` reads `getActiveConversation(userId)` but benchmark threads start with `clearActiveConversation`; correction count / lastDirectQuestion not injected as composer facts |
| 6 | **Not a write failure in production path** | `persistBuddyMemory` runs in `finalizeBuddyResponse` for reason-first; test harness simply never accumulates cross-session memory for `phe-*` IDs |

### Answers to specific questions

| Question | Answer |
|----------|--------|
| Is memory not being written? | **Not the issue in this benchmark** — nothing to read for fresh IDs. Production userIds may have memory; experiment isolates composer behavior. |
| Wrong categories? | **Possible in live app** — Alzheimer's T1–2 classified `direct_question`, not caregiver; grief T2 loses `grief` flag. |
| Wrong retrieval keys? | **Yes for companion continuity** — recall engine expects relationship-recall phrasing, not "again today" or thread-local facts. |
| activeConversation state? | **Partially wired, not fed as evidence** — summary exists in pack for current RF but not minimal; correction turns don't get prior-assistant quote. |
| Correction storage wrong? | **State updates exist; retrieval doesn't use them** — `isCorrection` / `strictAnswerMode` in understanding, but no "here is what you said last turn" fact. |

---

## C. Loop-Control Failures

### Sabbath wording thread (primary loop laboratory)

| Pattern | Current RF | Minimal RF |
|---------|------------|------------|
| Repeated "Roman church" shorthand rationale | **6/6 meta turns** | **5/6 meta turns** |
| Turn-to-turn reply overlap T3–T7 | **54–71%** | **19–48%** (lower but still looping semantically) |
| "I hear" opener without new content | T4, T5, T7 | T4, T5, T6 |
| Failed to answer meta question substantively | Both invent "shorthand for clarity" | Same; Min T5 asks user to repeat question |
| Wrong turn attribution | — | **T7 quotes T6 user message, not T7** |
| User says "not listening" | Cur: +2 listen via "I hear" regex | Min: −2 (no "I hear" match) despite similar content |

### Cross-thread repetitive patterns (Current / Minimal)

| Pattern | Current count | Minimal count |
|---------|---------------|---------------|
| "It sounds like…" | 4 | 2 |
| "I hear…" | 4 | 3 |
| "You said…" | 0 | **9** |
| "Would you like…" | 6 | **9** |

Minimal replaced one formula with another: **quote-then-verse-then-offer**. Still robotic; biblical grounding scorer rewards the verse insert.

### Loop-control failure modes

1. **No hard stop after correction** — `isCorrection` / `strictAnswerMode` flags exist in evidence but neither composer enforces "do not repeat prior rationale."
2. **No prior-reply diff in evidence** — model cannot explain *why it said Roman church*; invents plausible rationale and sticks to it.
3. **Meta turns still receive irrelevant Sabbath scripture** (Current T5, T7) — retrieval re-injects doctrine chain on frustration turns.
4. **Conversation history alone insufficient** — Minimal mis-ordered history on T7; history text does not replace structured correction contract.

---

## D. Scoring Weakness Analysis

### Listening scorer (`scoreListening`)

| Issue | Example from live run |
|-------|----------------------|
| **+2 for reflection regex only** | "I hear" on Sabbath T4/T5/T7 scores 7 despite semantic loop |
| **"You said" not rewarded** | Minimal Job T1/T3 mirrors user; scores 5 vs Current 7 with "It sounds like" |
| **No semantic match** | No check that answer addresses yes/no ("faith failing?") |
| **No anti-repetition penalty** | Sabbath T3 Current 71% overlap with T2 — listening still 7 if "I hear" present |
| **Frustration turn penalty weak** | "not listening" −2 only without "I hear"; easy to game |

### Biblical grounding scorer

| Issue | Example |
|-------|---------|
| **Rewards any verse cite** | Minimal Health T2 uses Psalm 147:3 (brokenhearted) for knee pain → +3 vs Current |
| **Penalizes practical companion care** | Current health replies score 4 despite useful medical-adjacent guidance |
| **Pack refs not required** | Model cites from weights; Minimal scores higher without retrieval supplying refs |

### Correction recovery scorer

| Issue | Example |
|-------|---------|
| **Overlap ratio only** | Minimal T5 (8% overlap) scores 9 while **asking user to repeat question** — human failure, heuristic success |
| **Acknowledgment phrases +2** | "I hear your concern" scores well while repeating same explanation |

### Follow-up quality scorer

| Issue | Example |
|-------|---------|
| **Keyword overlap from prior messages** | Sabbath thread scores 7–8 even during loops because "Roman"/"wording" appear |
| **Misses wrong-turn attribution** | Minimal T7 scores 8 despite quoting wrong user message |

**Conclusion:** Automated scores **cannot be used as release gate for human listening** without semantic rubric. The +0.1 reason-first migration gain (5.7→5.8) and this A/B delta (−0.3) are both within scorer noise.

---

## E. Root-Cause Ranking (Evidence Summary)

### 1. Loop-control — **PRIMARY**

- Sabbath T2–T7: same meta question, same non-answer across **both** runtimes and **both** prompt sizes  
- Current T3 **71%** lexical overlap turn-to-turn  
- Minimal T7 **misread conversation history**  
- User frustration turns treated as phrasing issues to acknowledge, not instructions to change behavior  
- **Prompt reduction did not fix loops** (correction recovery +1.2 heuristic ≠ human resolution)

### 2. Retrieval quality — **PRIMARY (structural)**

- **0/20 memory hits**  
- Grief/Alzheimer's/health: topic flags without scripture refs in pack  
- Meta/correction turns: no **prior assistant quote**, no **correction ledger**, no **forbidden repeat phrases**  
- Irrelevant Sabbath chain on correction turns (Current T5, T7)  
- Follow-up flags drop (grief T2 → direct_question)

### 3. Scoring — **SECONDARY (measurement)**

- Listening regex correlates with opener style, not comprehension  
- Biblical grounding conflates citation with relevance  
- Correction recovery rewards low-overlap non-answers  
- Explains why OpenAI 100% + reason-first did not move human listening metrics meaningfully

### 4. Prompt hierarchy — **RULED OUT**

- 99.2% system token reduction  
- Listening **worse** (−0.3), follow-up **worse** (−0.6)  
- Helpfulness −0.3  
- Biblical grounding +2.1 (verse-insertion pattern in minimal composer)  
- **Decision gate B confirmed:** do not prioritize further prompt compression first

---

## F. Recommended Next Implementation Plan (ONE plan — do not implement yet)

### Name: **Retrieval-Anchored Correction Loop (RACL) — evidence-only phase**

Scope: extend **`retrievalEvidencePack` only** + **human listening rubric script** for validation. No new routes, responders, doctrine modules, or production flag changes.

#### Step 1 — Thread-local retrieval facts (fixes memory 0/20 in threads)

Add to evidence pack (facts only, no prose):

- `threadMemory.snippets`: open loops from same session (job offer, knee pain, friend loss, caregiver context) derived from `recentSessions`, not only global memory file  
- `priorUserDetail`: extracted anchors ("Wednesday", "again today", "doesn't remember who I am")

#### Step 2 — Correction/meta retrieval (fixes Sabbath loop)

When `understanding.isCorrection` or `requestedAnswerType === 'wording_explanation'`:

- `priorAssistantQuote`: exact phrase from last assistant reply containing contested wording  
- `correctionLedger`: `{ correctionCount, lastUserComplaint, forbiddenRepeatPhrases[] }` from activeConversation  
- **Suppress** scripture/history re-injection on these turns (already partially intended; enforce in pack)

#### Step 3 — Companion scripture stubs (fixes grief/health grounding gap)

When `companionContext.grief|health|caregiver` and topic not in doctrine chain map:

- Attach 2–3 curated refs (Psalm 34:18, 147:3, Romans 8:26, etc.) as **retrieval facts**, not composer invention

#### Step 4 — Loop-control contract in composer instruction (minimal diff)

Single addendum to `COMPOSER_INSTRUCTION` only (not full prompt rearchitecture):

- If `correctionLedger.correctionCount > 0`: *must not reuse sentences from priorAssistantQuote; must answer with new information or explicit honest limitation*

#### Step 5 — Human listening validation (fixes scorer weakness)

Replace regex gate for release decisions with **20-turn human rubric sheet** (or LLM-judge with explicit criteria):

- Did the reply answer the exact question?  
- Did it repeat prior turn?  
- Did it use user's distinctive words?  
- Scripture relevant?  

Re-run **current reason-first only** after Steps 1–3; compare to this A/B baseline. **Do not re-run minimal prompt experiment** until RACL retrieval ships.

#### Explicitly deferred

- Prompt compression / legacy stack removal  
- New responders or routes  
- Doctrine boundary changes  
- Sprint 3 / production deploy  

#### Success criteria for next gate

| Metric | Target |
|--------|--------|
| Memory/snippet hits in-thread | **>0 on 8/20** benchmark turns (job, grief, health follow-ups) |
| Sabbath T7 human listening | **≥8/10** (human rubric) |
| Sabbath T7 overlap with T6 | **<30%** |
| Listening avg (human rubric) | **≥7.0** on current RF |

---

## Decision Alignment

| Gate | Result |
|------|--------|
| A: Minimal listening +1.0? | **NO** (−0.3) → prompt compression **not** next fix |
| B: Within ±0.3? | **YES** → retrieval + loop-control **are** next fix |
| C: Warmth up, grounding down? | **NO** — minimal improved grounding (+2.1), warmth flat |
| D: Minimal worse overall? | **Mixed** — listening/helpfulness slightly worse; grounding/correction heuristic better |

**Next investigation target:** Retrieval quality + loop-control + human listening scoring.  
**Stop line:** No production changes until RACL evidence pack validates on current reason-first runtime.

---

## Artifacts

| File | Role |
|------|------|
| `docs/prompt-hierarchy-experiment/results.json` | Live 20-turn A/B raw data |
| `PromptHierarchyExperiment.md` | Prompt hierarchy verdict (gate B) |
| `docs/reason-first-migration/validation-results.json` | Prior current-RF-only baseline (5.8 listen) |
| `services/retrievalEvidencePack.js` | Retrieval layer under audit |
| `scripts/promptHierarchyExperiment.js` | Heuristic scorers documented in §D |
