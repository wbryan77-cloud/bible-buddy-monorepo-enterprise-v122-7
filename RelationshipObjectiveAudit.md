# Relationship Objective Audit

Generated: 2026-06-03  
**Audit only** — no code changes, implementations, or runtime changes.

**Question:** What objective is the reason-first runtime actually optimizing for?

**Scope:** `BUDDY_RUNTIME=reason_first` path only (production default remains `legacy`). Evidence: source inspection plus validation artifacts (`docs/racl/validation-results.json`, `RACLImpactAudit.md`, `ConversationShapeAudit.md`, `ComplexityDebtAudit.md`).

---

## Optimization taxonomy

| Code | Objective | Operational meaning |
|------|-------------|---------------------|
| **A** | Task completion | Finish the turn: valid JSON, address the prompt, close the exchange |
| **B** | Answer quality | Correct, doctrinally bounded, on-topic, well-structured content |
| **C** | Safety | Crisis handling, forbidden teachings blocked, sanitization |
| **D** | Relationship quality | Thread continuity, specificity, correction recovery, felt understanding |
| **E** | Companion presence | Pacing, exploration, reflection-before-advice, conversational role |

Percentages below are **inferred optimization weight** (what the stack rewards under failure/regen), not lines of code.

---

## Aggregate weighted breakdown (reason-first today)

| Objective | Weight | Confidence |
|-----------|--------|------------|
| **A. Task completion** | **42%** | High |
| **B. Answer quality** | **32%** | High |
| **C. Safety** | **14%** | High |
| **D. Relationship quality** | **9%** | Medium |
| **E. Companion presence** | **3%** | High |

**Effective headline:** The reason-first stack optimizes for **delivering a complete, compliant answer** (~74% A+B), not for **being with the user** (~12% D+E).

Validation aligns: `answeredLatest` avg **7.3** vs `threadSpecific` **5.4** and `feltHeard` **5.7** (`PathTo7Point5.md`, `docs/racl/validation-results.json`).

---

## Component-by-component analysis

### 1. `buildSystemPrompt` + `buildRuntimeInstructions` (`buddyBrain`, `runtimeOrchestrator`)

| | |
|---|---|
| **Role** | Legacy persona, JSON envelope, **5-step RESPONSE STRUCTURE** (biblical → continuity → history → interpretation → traditions), full `runtimeContext` JSON in system prompt |
| **Typical size** | ~3.7K + ~1.3K+ chars (`ComplexityDebtAudit.md`) |
| **A** Task completion | **35%** — mandates a “complete” teaching-shaped turn |
| **B** Answer quality | **40%** — Scripture-first, line-upon-line, topic rules |
| **C** Safety | **10%** — implicit via doctrine framing |
| **D** Relationship | **10%** — “use memory naturally” buried under structure |
| **E** Companion | **5%** — “continue analysis when challenged” favors debate over presence |

**Answer-engine driver:** The **RESPONSE STRUCTURE** block trains essay-mode turns regardless of `COMPOSER_INSTRUCTION`.

---

### 2. `COMPOSER_INSTRUCTION` (`reasonFirstComposer.js`)

| | |
|---|---|
| **Text priority** | Line 1: *“Answer the user's exact question.”* Then listen, warmth, Scripture, correction rules, specificity hint |
| **A** | **30%** |
| **B** | **35%** |
| **C** | **15%** (forbidden teachings listed) |
| **D** | **15%** (“Listen first”, correction acknowledgment) |
| **E** | **5%** |

**Answer-engine driver:** **Answer-first ordering** in the only reason-first-native instruction block (~450 chars) sitting **after** ~12K legacy text (`HumanConversationGapReport.md`).

---

### 3. `buildRetrievalEvidencePack` (RACL) (`retrievalEvidencePack.js`)

| | |
|---|---|
| **Role** | Thread-local snippets, correction ledger facts, companion topic/stubs, history chain, understanding snapshot, memory snippets |
| **A** | **15%** — assembles inputs to complete the task |
| **B** | **45%** — scripture stubs, doctrine boundaries, historical chain |
| **C** | **5%** |
| **D** | **30%** — thread-local + companion context (retrieval side) |
| **E** | **5%** |

**Measured effect:** **20/20** in-thread memory hits; listening **6.1 → 6.3** (+0.2 same rubric, `RACLImpactAudit.md`). Retrieval optimizes **facts for answers**; compose still under-uses them (`threadSpecific` 5.4).

**Answer-engine driver:** Companion stubs feed **verse stacks** (Job Proverbs/James/Psalm pattern), not exploratory pacing.

---

### 4. `correctionLedger.js` + ledger payload in composer

| | |
|---|---|
| **Role** | Detect correction/meta; `priorAssistantQuote`, `forbiddenRepeatTopics`, `requireDirectAnswerFirst` |
| **A** | **25%** — resolve the corrected “task” |
| **B** | **40%** — stop wrong topic repetition |
| **C** | **5%** |
| **D** | **25%** — meta listening |
| **E** | **5%** |

**Measured effect:** Sabbath gate **PASS** (no Constantine block after correction); T7 listening **6.8** (target 8). Rationale paragraph still loops **37–55%** overlap (`RACLImpactAudit.md`).

**Answer-engine driver:** Optimizes **stopping the wrong answer**, not **new relational repair** (same shorthand rationale regenerated).

---

### 5. `doctrineBoundaryValidator.js` (validation chain)

| | |
|---|---|
| **Hard fail** | Doctrine violations, template blocks, unsolicited study prompts; correction overlap **>40%**, rationale repeat **>35%**; Sabbath history template on meta turns |
| **Soft only** | `evaluateListeningRecommendations` — never blocks pass |
| **Regen** | Up to 3 attempts on **hard** failures only (`reasonFirstComposer.js`) |
| **A** | **20%** |
| **B** | **35%** |
| **C** | **35%** |
| **D** | **10%** |
| **E** | **0%** |

**Removed from this chain (Listening 7.5, per `Listening75RefinementPlan.md`):** `answerMatchGate`, `loopControl` hard regen — **no post-removal validation run in repo**.

**Answer-engine driver:** Validator **only punishes** non-companion failures (doctrine, repeat); does **not** require questions or shorter turns.

---

### 6. `listeningSpecificityValidator.js` (Listening 7.5)

| | |
|---|---|
| **Soft** | `detailCandidates`, `listeningGuidance` pre-compose; post-compose recommendations in trace |
| **Hard** | Overlap/rationale repeat (folded into doctrine validator) |
| **A** | **10%** |
| **B** | **15%** |
| **C** | **0%** |
| **D** | **70%** |
| **E** | **5%** |

**Measured effect:** **None published** — implementation complete; `docs/racl/validation-results.json` predates or does not reflect a dedicated re-run.

**Answer-engine driver:** Soft signals **lose** to hard doctrine/completion pressure in the same prompt.

---

### 7. `normalizeStructured` + `lightPolish` (polish / sanitize / strip)

| | |
|---|---|
| **Role** | JSON normalization; `polishCompanionReply`, `sanitizeDoctrineResponse`, `stripInternalRuntimeLabels` |
| **A** | **30%** |
| **B** | **40%** |
| **C** | **20%** |
| **D** | **5%** |
| **E** | **5%** |

**Answer-engine driver:** Post-compose cleanup favors **safe, polished paragraphs**, not raw companion brevity.

---

### 8. `reasonFirstBuddyRuntime` — `skipRelationshipEnrichment: true`

| | |
|---|---|
| **Role** | Disables relationship enrichment in `finalizeBuddyResponse` |
| **D** | **−15%** effective (removes a legacy companion layer) |
| **E** | **−10%** effective |

**Measured effect:** No A/B in repo. `HumanConversationGapReport.md` flags as possible anti-robotic loss.

---

### 9. OpenAI call shape (`response_format: json_object`, single `reply` field)

| | |
|---|---|
| **A** | **50%** |
| **B** | **25%** |
| **C** | **5%** |
| **D** | **10%** |
| **E** | **10%** |

**Answer-engine driver:** One JSON string → **monologue turn** (`ConversationShapeAudit.md`: **84.7%** deliver-mode, **0** exploratory questions).

---

## Systems causing answer-engine weighting

Ranked by contribution to **felt** answer-engine behavior (evidence-linked):

| Rank | System | Mechanism | Evidence |
|------|--------|-----------|----------|
| 1 | `buildRuntimeInstructions` **RESPONSE STRUCTURE** | 5-step teaching essay every turn | `ComplexityDebtAudit.md`; shape audit deliver-mode **84.7%** |
| 2 | `COMPOSER_INSTRUCTION` order + size | “Answer exact question” drowned in ~13K system prompt | `HumanConversationGapReport.md` |
| 3 | Hard validation + regen loop | Regenerate for doctrine/repeat, not for missing curiosity | Validator code; Sabbath overlap **47%** despite regen |
| 4 | JSON single-reply contract | Complete turn per message | Gap report §7 |
| 5 | RACL scripture stubs + evidence JSON | Correctness inputs → explain/advise prose | Job triplet repeat; `threadSpecific` 5.4 with 20/20 hits |
| 6 | `skipRelationshipEnrichment` | Removes legacy personalization | `reasonFirstBuddyRuntime.js` |
| 7 | Soft listening 7.5 only | Cannot override hard completion path | No measured lift yet |

**Not primary drivers (measured):** Raw OpenAI availability (100% still feels robotic); template % (0.1%); routing (reason-first vs legacy ±0.1–0.7 on mixed rubrics).

---

## Target weighting: “Trusted companion that also answers questions”

| Objective | Current (est.) | Target (est.) | Delta |
|-----------|----------------|---------------|-------|
| A. Task completion | 42% | **22%** | −20 |
| B. Answer quality | 32% | **23%** | −9 |
| C. Safety | 14% | **15%** | +1 |
| D. Relationship quality | 9% | **25%** | +16 |
| E. Companion presence | 3% | **15%** | +12 |

**Interpretation:** Keep safety and doctrinal answer quality, but **halve “complete the lecture” pressure** and **triple** explicit companion objectives in **hard** constraints (not soft hints only).

**Validation targets implied by audits (not prescriptions):** listening **≥7.5**, `threadSpecific` **≥7**, `feltHeard` **≥7**, exploratory questions on **≥30%** of emotional/discernment turns, deliver-mode **≤55%**.

---

## Summary

Reason-first optimizes **~74%** for **task completion + answer quality**, **~14%** for **safety**, and **~12%** for **relationship + presence**. RACL improved **retrieval-side** relationship inputs (+0.2 listening) without changing the **dominant objective function** in the prompt and validator. Listening 7.5 shifted **validator** weight toward relationship on corrections only; **compose-time** objectives unchanged in measured runs.

The answer-engine feel is primarily **objective misalignment in prompt structure and turn shape**, secondarily **compose gap** (facts present, prose generic), not absence of OpenAI or memory hits.

---

*No fixes. No implementation. Production default remains `legacy`.*
