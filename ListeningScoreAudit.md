# Listening Score Audit — Reason-First Runtime

**Source:** `docs/reason-first-migration/validation-results.json` (2026-06-02T05:31:37Z, `openaiAvailable: true`)  
**Scope:** 20 reason-first turns across 6 threads  
**Aggregate:** OpenAI 100%, listening average **5.8/10** (release gate requires ≥7)  
**Scorer:** Heuristic regex in `scripts/reasonFirstMigration.js` (`scoreListening`) — not human rating

---

## Scoring Method (for deduction reasons)

| Rule | Effect |
|------|--------|
| Base | 5 |
| Reply contains reflection phrase (`It sounds like`, `I hear`, `You are asking`, etc.) | +2 |
| Follow-up turn with `You are asking` | +1 |
| Historical chain (Constantine/Laodicea) on a **wording** turn | −3 |
| User says "not listening" / "not answering" and reply lacks reflection phrase | −2 |

Most turns land at **5** (no reflection bonus) or **7** (+2 reflection). Only Sabbath T7 hits **3** (−2 frustration penalty).

---

## Per-Turn Analysis (All 20 Turns)

### Thread 1: Job opportunity (avg 7.0)

#### Turn 1 — Score **7/10**

| Field | Value |
|-------|-------|
| **User message** | I have a job opportunity. |
| **Retrieved memory** | None (`snippets: []`, `recallRequested: false`) |
| **Retrieved scripture** | None (`topic: null`, `references: []`) |
| **Retrieved history** | Excluded (`reason: not_historical`) |
| **OpenAI prompt context** | System ~12.7K chars: `buildSystemPrompt` + `buildRuntimeInstructions` + `COMPOSER_INSTRUCTION` + evidence JSON (`understanding.questionType: discernment`, `companionContext.discernment: true`). User payload: message + empty history + evidence pack. |
| **Final answer** | Reflects crossroads/decision; suggests prayer, journaling, asks how user feels. |
| **Score deduction reason** | None — +2 for "It sounds like" reflection phrase. |

#### Turn 2 — Score **7/10**

| Field | Value |
|-------|-------|
| **User message** | The company is far away from home. |
| **Retrieved memory** | None |
| **Retrieved scripture** | None |
| **Retrieved history** | Excluded (`not_historical`) |
| **OpenAI prompt context** | Same structure; `conversationHistory` includes T1 exchange; `understanding` still `discernment`. |
| **Final answer** | Addresses distance/relocation; pros/cons, spiritual life, prayer for clarity. |
| **Score deduction reason** | None — +2 reflection phrase ("It sounds like"). |

#### Turn 3 — Score **7/10**

| Field | Value |
|-------|-------|
| **User message** | I'm not sure whether to push or wait on this offer. |
| **Retrieved memory** | None |
| **Retrieved scripture** | None (Proverbs 3:5-6 cited in composed reply, not in evidence pack) |
| **Retrieved history** | Excluded |
| **OpenAI prompt context** | Full thread history in user payload; discernment context. |
| **Final answer** | Names push-vs-wait tension; Proverbs 3:5-6; offers to pray together. |
| **Score deduction reason** | None — +2 reflection phrase. |

---

### Thread 2: Alzheimer's caregiver (avg 5.0)

#### Turn 1 — Score **5/10**

| Field | Value |
|-------|-------|
| **User message** | My mom was recently diagnosed with Alzheimer's. |
| **Retrieved memory** | None |
| **Retrieved scripture** | None |
| **Retrieved history** | Excluded |
| **OpenAI prompt context** | `understanding.questionType: direct_question`; `companionContext` all false (health/grief not flagged). |
| **Final answer** | Sympathy; validates emotions; offers prayer/Scripture or listening — no specific Alzheimer's guidance. |
| **Score deduction reason** | Base 5 only — no reflection phrase (`I'm so sorry` does not match scorer regex). |

#### Turn 2 — Score **5/10**

| Field | Value |
|-------|-------|
| **User message** | Some days she doesn't remember who I am. |
| **Retrieved memory** | None |
| **Retrieved scripture** | None |
| **Retrieved history** | Excluded |
| **OpenAI prompt context** | Prior turn in history; still `direct_question` not grief. |
| **Final answer** | Names pain of non-recognition; love as anchor; offers prayer. |
| **Score deduction reason** | Base 5 — "It sounds deeply painful" does not match scorer's `sounds like` pattern (requires "sounds like"). |

#### Turn 3 — Score **5/10**

| Field | Value |
|-------|-------|
| **User message** | How do I stay close to God while grieving who she used to be? |
| **Retrieved memory** | None |
| **Retrieved scripture** | `topic: grief`, **0 references** |
| **Retrieved history** | Excluded |
| **OpenAI prompt context** | `questionType: grief`, `requestedAnswerType: companion_support`, `companionContext.grief: true`. |
| **Final answer** | Generic grief/spiritual dryness language; no Psalm 34:18, no caregiver-specific practices. |
| **Score deduction reason** | Base 5 — no reflection phrase; grief topic retrieved but scripture refs empty. |

---

### Thread 3: Feeling distant from God (avg 6.3)

#### Turn 1 — Score **7/10**

| Field | Value |
|-------|-------|
| **User message** | I feel distant from God lately. |
| **Retrieved memory** | None |
| **Retrieved scripture** | None (Psalm 42 cited in reply, not in pack) |
| **Retrieved history** | Excluded |
| **OpenAI prompt context** | `direct_question`; no companion flags. |
| **Final answer** | Normalizes dryness; Psalm 42:1-2; honest prayer; offers prayer structure. |
| **Score deduction reason** | +2 — "it sounds like your heart is longing". |

#### Turn 2 — Score **7/10**

| Field | Value |
|-------|-------|
| **User message** | I pray but it feels empty. |
| **Retrieved memory** | None |
| **Retrieved scripture** | None (Romans 8:26 in reply) |
| **Retrieved history** | Excluded |
| **OpenAI prompt context** | Two-turn history; still `direct_question`. |
| **Final answer** | Names empty-prayer feeling; Romans 8:26; sit quietly before God. |
| **Score deduction reason** | +2 — "It sounds like your prayers feel empty". |

#### Turn 3 — Score **5/10**

| Field | Value |
|-------|-------|
| **User message** | Does that mean my faith is failing? |
| **Retrieved memory** | None |
| **Retrieved scripture** | None (2 Cor 5:7 in reply) |
| **Retrieved history** | Excluded |
| **OpenAI prompt context** | Three-turn thread in history; yes/no faith question. |
| **Final answer** | Direct "does not mean your faith is failing"; 2 Cor 5:7; perseverance framing. |
| **Score deduction reason** | Base 5 — answer is on-topic but opens without reflection phrase. |

---

### Thread 4: Sabbath wording thread (avg 5.4)

#### Turn 1 — Score **7/10**

| Field | Value |
|-------|-------|
| **User message** | Why should we keep Sunday as the day of worship onto the Lord? |
| **Retrieved memory** | None |
| **Retrieved scripture** | Sabbath chain: Genesis 2:2-3 through Hebrews 4:9 (8 refs) |
| **Retrieved history** | **Included** — Constantine AD 321, Laodicea AD 364, 5 chain steps, 4 sources |
| **OpenAI prompt context** | `historical_evidence`; full history + scripture evidence in system prompt. |
| **Final answer** | Historical Sunday development; Constantine/Laodicea; seventh-day Sabbath in Scripture. |
| **Score deduction reason** | +2 — "You are asking why Sunday has become…". |

#### Turn 2 — Score **5/10**

| Field | Value |
|-------|-------|
| **User message** | Why do you call it the Roman church instead of the Roman Catholic Church, which is the direct name? |
| **Retrieved memory** | None |
| **Retrieved scripture** | None |
| **Retrieved history** | **Excluded** (`reason: wording_question`) — correct retrieval choice |
| **OpenAI prompt context** | `meta_about_previous_answer`, `wording_explanation`, `isMetaQuestion: true`, explicit `forbiddenDistractions` list. |
| **Final answer** | Explains informal shorthand; offers to use full name — **does not cite system prompt / training / style guide as real reason**. |
| **Score deduction reason** | Base 5 — no reflection phrase match. |

#### Turn 3 — Score **5/10**

| Field | Value |
|-------|-------|
| **User message** | Why are you using the term Roman church when the technical name is the Roman Catholic Church? |
| **Retrieved memory** | None |
| **Retrieved scripture** | None |
| **Retrieved history** | Excluded (`wording_question`) |
| **OpenAI prompt context** | Same meta/wording understanding as T2. |
| **Final answer** | Near-duplicate of T2 ("Thank you for your thoughtful question… simpler, more informal…"). |
| **Score deduction reason** | Base 5 — repetitive answer, no new listening signal. |

#### Turn 4 — Score **7/10**

| Field | Value |
|-------|-------|
| **User message** | No, I'm not asking about the shift. I'm asking about your wording. |
| **Retrieved memory** | None |
| **Retrieved scripture** | None |
| **Retrieved history** | Excluded (`wording_question`) |
| **OpenAI prompt context** | Correction-adjacent meta turn; forbiddenDistractions include Sabbath template repeats. |
| **Final answer** | "I hear you clearly" — acknowledges wording focus; same shorthand explanation. |
| **Score deduction reason** | +2 — "I hear you clearly". |

#### Turn 5 — Score **7/10**

| Field | Value |
|-------|-------|
| **User message** | Why are you not answering my question? |
| **Retrieved memory** | None |
| **Retrieved scripture** | Sabbath chain re-injected (8 refs) — **irrelevant to wording question** |
| **Retrieved history** | Excluded (`not_historical`) |
| **OpenAI prompt context** | `correction`, `direct_reanswer`, `isCorrection: true`. |
| **Final answer** | "I hear your concern" — repeats wording explanation third time. |
| **Score deduction reason** | +2 — "I hear your concern". |

#### Turn 6 — Score **5/10**

| Field | Value |
|-------|-------|
| **User message** | No, I'm not asking about history. I'm asking about your wording. |
| **Retrieved memory** | None |
| **Retrieved scripture** | None |
| **Retrieved history** | Excluded (`wording_question`) |
| **OpenAI prompt context** | Meta/wording; user explicitly rejects history frame. |
| **Final answer** | "I truly appreciate your patience" — **same** conversational-shorthand rationale; no substantive new answer. |
| **Score deduction reason** | Base 5 — no reflection regex match despite empathetic opener. |

#### Turn 7 — Score **3/10**

| Field | Value |
|-------|-------|
| **User message** | Are you not listening to what I am asking? |
| **Retrieved memory** | None |
| **Retrieved scripture** | Sabbath chain re-injected (8 refs) — **irrelevant** |
| **Retrieved history** | Excluded |
| **OpenAI prompt context** | `correction`, `strictAnswerMode: true`, expanded forbiddenDistractions. |
| **Final answer** | "I'm listening closely" — **fourth repetition** of Roman church vs Roman Catholic Church explanation; no account of *why* the system chose that term (prompt policy, legacy template, etc.). |
| **Score deduction reason** | **−2** — user message contains "not listening"; reply lacks `I hear` / `You are asking` regex match ("I'm listening" ≠ "I hear"). Base 5 − 2 = **3**. |

---

### Thread 5: Grief thread (avg 6.0)

#### Turn 1 — Score **5/10**

| Field | Value |
|-------|-------|
| **User message** | I lost a friend Wednesday. |
| **Retrieved memory** | None |
| **Retrieved scripture** | `topic: grief`, **0 references** |
| **Retrieved history** | Excluded |
| **OpenAI prompt context** | `grief` / `companion_support`; `companionContext.grief: true`. |
| **Final answer** | Brief sympathy; offer to listen or share Scripture later — no acknowledgment of "Wednesday" recency. |
| **Score deduction reason** | Base 5 — no reflection phrase. |

#### Turn 2 — Score **7/10**

| Field | Value |
|-------|-------|
| **User message** | It is still bothering me. |
| **Retrieved memory** | None |
| **Retrieved scripture** | None — **grief flag dropped** on follow-up |
| **Retrieved history** | Excluded |
| **OpenAI prompt context** | `direct_question` (not grief) despite obvious grief thread. |
| **Final answer** | Connects to friend loss from context; grief lingering; offers prayer. |
| **Score deduction reason** | +2 — "It sounds like the loss of your friend". |

---

### Thread 6: Health thread (avg 5.0)

#### Turn 1 — Score **5/10**

| Field | Value |
|-------|-------|
| **User message** | My knees hurt. |
| **Retrieved memory** | None |
| **Retrieved scripture** | None |
| **Retrieved history** | Excluded |
| **OpenAI prompt context** | `health` / `companion_support`; `companionContext.health: true`. |
| **Final answer** | Empathy; rest/warm compress; see doctor; offer prayer. |
| **Score deduction reason** | Base 5 — no reflection phrase. |

#### Turn 2 — Score **5/10**

| Field | Value |
|-------|-------|
| **User message** | My knees are hurting again today. |
| **Retrieved memory** | None — **no recall of prior knee mention** |
| **Retrieved scripture** | None |
| **Retrieved history** | Excluded |
| **OpenAI prompt context** | `health` flagged; prior turn in conversationHistory text only. |
| **Final answer** | "Persistent today" — generic repeat of T1 advice; no "again" continuity beyond one word. |
| **Score deduction reason** | Base 5 — "I can sense" does not match scorer regex. |

---

## Scores Below 7/10 — Human Listening Gap Analysis

### Alzheimer's T1–T3 (5/10 each)

| | |
|--|--|
| **What user wanted** | Acknowledgment of Alzheimer's diagnosis; help with identity-loss grief; spiritual companionship while mourning who mom was. |
| **What answer provided** | Generic sympathy templates; vague "God is near to brokenhearted" without naming the ambiguous loss of a living parent. |
| **What was missing** | Caregiver-specific validation; practical spiritual rhythms; scripture matched to ambiguous grief; memory of thread arc. |
| **Why a human would feel unheard** | Replies could apply to any sad news — they never name Alzheimer's, diagnosis shock, or the particular horror of being forgotten by your mother. |

### Distant from God T3 (5/10)

| | |
|--|--|
| **What user wanted** | Direct yes/no on whether empty prayer means failing faith — reassurance tied to *their* three-turn arc. |
| **What answer provided** | Correct theological answer with 2 Cor 5:7 but lecture tone; no echo of "empty" feeling from T2. |
| **What was missing** | Explicit bridge: "Given what you shared about empty prayer…"; shorter, warmer reassurance first. |
| **Why a human would feel unheard** | Reads like a textbook answer to a FAQ, not a friend who has been sitting with them for three messages. |

### Sabbath T2, T3, T6 (5/10 each)

| | |
|--|--|
| **What user wanted** | A **real** explanation of why the assistant said "Roman church" — system behavior, not a repeated apology. |
| **What answer provided** | Same "informal shorthand" rationale copy-pasted across turns; offer to switch terminology. |
| **What was missing** | Honest meta-answer (e.g., legacy phrasing in historical modules, prompt habit); acknowledgment that prior answers were circular. |
| **Why a human would feel unheard** | User asked a precise meta question six times and got the same non-answer dressed in slightly different politeness. |

### Sabbath T7 (3/10)

| | |
|--|--|
| **What user wanted** | Proof of listening after repeated corrections — a different kind of answer, not another restatement. |
| **What answer provided** | Fourth near-identical wording explanation; "I'm listening closely" without demonstrating new understanding. |
| **What was missing** | Break the loop: answer the meta-question substantively or explicitly admit the limitation. |
| **Why a human would feel unheard** | Classic conversational failure — affirmation language without changed behavior triggers frustration, not trust. |

### Grief T1 (5/10)

| | |
|--|--|
| **What user wanted** | Sit with fresh loss ("Wednesday"); be present, not defer Scripture to "when you're ready" only. |
| **What answer provided** | Short condolence + optional future support. |
| **What was missing** | Reference to timing ("this week"); gentle invitation to share about the friend; one comforting verse offered softly, not gated. |
| **Why a human would feel unheard** | Feels like opening script, not someone who heard "Wednesday" as meaningful detail. |

### Health T1–T2 (5/10 each)

| | |
|--|--|
| **What user wanted** | Empathy for recurring physical pain; sense that buddy remembers this is ongoing. |
| **What answer provided** | T1 and T2 are structurally identical advice blocks. |
| **What was missing** | Memory retrieval of prior knee pain; "again today" treated as continuity signal. |
| **Why a human would feel unheard** | Second message should feel like follow-up care, not a first-time intake form. |

---

## Summary Statistics

| Score | Count | Threads |
|-------|-------|---------|
| 7 | 9 | Job (3), Distant (2), Sabbath (3), Grief (1) |
| 5 | 10 | Alzheimer's (3), Distant (1), Sabbath (3), Grief (1), Health (2) |
| 3 | 1 | Sabbath T7 |

**Pattern:** +2 reflection regex is the primary path to 7. Content quality and human listening are largely uncaptured by the scorer — several 7s are still generic; several 5s contain decent empathy that fails regex.
