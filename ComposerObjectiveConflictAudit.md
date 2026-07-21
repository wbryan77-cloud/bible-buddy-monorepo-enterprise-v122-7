# Composer Objective Conflict Audit

**Generated:** 2026-06-03  
**Scope:** Audit only — no code, implementation, deploy, push, or Sprint 3.

**Question:** Is the reason-first **composer prompt stack** itself the remaining bottleneck for companion listening (~6.3–6.4)?

**Evidence sources (read-only):**

| Source | What it proves |
|--------|----------------|
| `services/reasonFirstComposer.js` | Current `COMPOSER_INSTRUCTION`, payload, system prompt assembly |
| `services/buddyBrain.js` (`buildSystemPrompt`) | Legacy persona + JSON contract |
| `services/runtimeOrchestrator.js` (`buildRuntimeInstructions`) | Doctrine-first response structure |
| `services/companionTurnIntent.js` | Posture, mustDo/mustAvoid, composerRule |
| `services/listeningSpecificityValidator.js` | `listeningGuidance`, detailCandidates |
| `services/retrievalEvidencePack.js` | RACL evidence slice + understanding fields |
| `services/correctionLedger.js` | Ledger fields sent to composer |
| `services/doctrineBoundaryValidator.js` | What regen optimizes for |
| `docs/racl/validation-results.json` | 20-turn corpus: listening **6.3**, deliver-mode **~72–85%**, 20/20 memory hits |
| `ConversationShapeAudit.md` | **35.4%** explaining vs **14%** ideal; **~2%** exploratory asking |
| `CompanionTurnIntentImplementationReport.md` | Posture layer: listening **6.2** (−0.1 vs RACL) |
| `RelationshipObjectiveAudit.md` | Stack optimizes **~74%** task+answer vs **~12%** relationship+presence |
| `ComposerPromptAudit.md`, `ComplexityDebtAudit.md` | Prompt size ordering (~12K system typical) |

**Note on doc drift:** Older audits quote `COMPOSER_INSTRUCTION` as *“Answer the user's exact question”* first. **Current code** (June 2026) leads with `companionTurnIntent` obedience. This audit reflects **live source**, not stale excerpts.

---

## Executive summary

| Finding | Confidence |
|---------|------------|
| The composer stack is a **major bottleneck** | **High** |
| Retrieval/RACL is **not** the primary ceiling (memory 20/20, listening still ~6.3) | **High** |
| The dominant conflict is **instruction ordering and weight**: legacy **essay/teaching structure** (~5K+ chars) **before** thin companion rebalance (~800 chars) | **High** |
| Validators/posture **regen for compliance**, not companion presence; listening recommendations are **soft-only** | **High** |
| Rewriting the **top 10 conflicting instructions** (without removing RACL) could plausibly raise listening to **~6.8–7.1**, unlikely **≥7.5** without compose architecture change | **Medium** (inferred from experiment deltas) |

**Headline:** BibleBuddy sounds like an answer engine because the **system message trains a complete teaching turn** (Scripture → continuity → history → steps → JSON extras). Companion instructions exist but are **outnumbered, contradicted, and unenforced** on the dimensions that matter for presence.

---

## Prompt stack (what the model actually sees)

```
SYSTEM (~11–13K chars typical; up to 280K+ on long Sabbath threads per ComplexityDebtAudit)
├── buildSystemPrompt()           ~3.7K  — persona, North Star, companion style, JSON shape
├── buildRuntimeInstructions()    ~1.3K + full runtimeContext JSON — 5-step RESPONSE STRUCTURE
├── COMPOSER_INSTRUCTION          ~800   — posture obedience, anti-essay, doctrine, specificity
└── Evidence pack JSON (system)   variable — understanding, ledger, scripture, history, doctrine (duplicate of user payload fields)

USER (JSON)
├── userMessage, conversationHistory
├── companionTurnIntent { posture, mustDo, mustAvoid, composerRule }
├── listeningGuidance, detailCandidates
├── correctionLedger (when active)
├── threadLocal, companionThreadContext
└── evidence { memory, scripture, history, doctrine, understanding, companionContext }
```

**Regen optimizes:** doctrine violations, correction overlap >40%, Sabbath history on meta turns, posture **hard** failures (wording answer missing, too much ack). **Does not regen** for: missing mustDo, generic warmth, over-answer on WALK_WITH_ME, user detail not in opening.

---

## Per-block analysis

### A. `buildSystemPrompt` — Permanent North Star

| # | Instruction (paraphrased) | Optimizes for | Role bias | Unintended behavior | Redundant with |
|---|---------------------------|---------------|-----------|---------------------|----------------|
| A1 | Help user feel heard **before** instructed | Relationship | Companion / counselor | Heard = one generic reflection sentence, then full teach | COMPOSER “not default answering first”; posture REFLECT |
| A2 | Meet user where they are; guide toward truth/Scripture over time | Pastor / teacher | Long arc → justify teaching this turn | Every turn feels like a discipleship moment | Runtime “line upon line” |
| A3 | Bible-first; line upon line | Teacher / lecturer | Scripture blocks even on emotional shares | Verse triads on job/grief/health threads | Runtime PRIMARY FOUNDATION; evidence scripture |
| A4 | Do not be pushy, robotic, preachy | Safety / tone | — | Model still repeats structure (robotic **shape**, not tone words) | — |
| A5 | Warm, calm, natural, emotionally intelligent | Companion | “Natural” interpreted as polished prose | Template empathy stems (“It sounds like…”) | mustAvoid “It sounds like” (user payload only) |
| A6 | Respond to **specific** message, not generic template | Listening | — | Contradicted by essay structure + stubs | listeningGuidance, detailCandidates |
| A7 | **Reflect** situation in **one sentence before advising** | Advisor | Fixed micro-structure: reflect → advise | Premature advice label; skips true exploration | DIRECT_ANSWER “lead with answer”; COMPOSER anti-essay |
| A8 | **Give forward movement**: practical next steps, prayer structure, study direction | Advisor / assistant | Checklist closure every turn | Prayer/study offers on 9/20 turns (Shape Audit) | mustDo “practical steps”; JSON `next_steps` |
| A9 | Do not keep asking vague questions when user **needs guidance** | Advisor | Suppresses companion curiosity | 0/20 exploratory opens (Shape Audit) | WALK_WITH_ME “one gentle question”; operating-model “don’t force questions” |
| A10 | If overwhelmed, comfort first; Scripture light unless asked | Counselor | Good intent | “Comfort first” = one sentence + heavy Scripture anyway | REFLECT_THEN_HELP mustDo |
| A11 | If user wants study, deeper Scripture | Teacher | — | studyState + stubs bleed into companion | Runtime RESPONSE STRUCTURE |
| A12 | KJV; don’t invent verses; distinguish Scripture from explanation | Teacher / safety | — | Explaining **about** verses without quoting still counts as teaching | Scripture rules in COMPOSER |
| A13 | Not therapist/doctor/pastor/emergency | Safety | — | — | Crisis path (non-composer) |
| A14 | Return JSON with `reply`, **`scripture` array**, **`next_steps`** | Task completion / teacher | Model fills slots → complete package | Extra teaching surface in parallel to `reply` | Evidence scripture refs |

---

### B. `buildRuntimeInstructions` — PRIMARY FOUNDATION + RESPONSE STRUCTURE

| # | Instruction | Optimizes for | Role bias | Unintended behavior | Redundant with |
|---|-------------|---------------|-----------|---------------------|----------------|
| B1 | Bible-first foundation; line upon line; Genesis→Revelation continuity | Lecturer | 5-step essay on **every** doctrinal-adjacent turn | Companion threads with “sabbath” in history get teaching shape | buildSystemPrompt A3 |
| B2 | **Prioritize explicit Scripture references first** | Teacher | Verse-forward opens | Mechanical Proverbs/James/Psalm stacks | scripture in evidence pack |
| B3 | Distinguish: biblical text / history / traditions / interpretation | Lecturer | Long explanatory monologue | 35% explaining actual vs 14% ideal | history.chainSteps in evidence |
| B4 | NEVER present church traditions as explicit commandments | Doctrine safety | — | — | doctrine.boundaries |
| B5 | Sabbath/dietary/feasts: Scripture **first**, then history **separately** | Teacher + historian | Two-part answer minimum | Meta wording turns still get history attractor | understanding.shouldUseHistory |
| B6 | Historical/pagan/Roman origins **after** biblical continuity | Lecturer | Constantine/Laodicea loop on Sabbath thread | 37–55% overlap on corrections (RACL audit) | history in evidence |
| B7 | Avoid denominational consensus framing | Apologist | — | — | — |
| B8 | **Continue analysis when challenged** instead of emotional fallback | Debater / teacher | Doubles down on rationale vs repair | Sabbath T2–7 “answer engine” loop | CORRECTION_RECOVERY mustAvoid history |
| B9 | Use prior conversation memory naturally | Companion | Memory present but **compose** uses it as facts to insert | “Answer engine with memory citations” | threadLocal, detailCandidates |
| B10 | **RESPONSE STRUCTURE** steps 1–5 (explicit text → continuity → history → interpretation → traditions) | **Lecturer** | **Defines turn as mini-lecture** | Delivers 72–85% answer/explain/advise mode | Entire COMPOSER “not mini-essay” |

**Conflict score (block vs companion objective):** **9/10** — single strongest answer-engine driver in the stack.

---

### C. `COMPOSER_INSTRUCTION` + `SPECIFICITY_HINT`

| # | Instruction | Optimizes for | Role bias | Unintended behavior | Redundant with |
|---|-------------|---------------|-----------|---------------------|----------------|
| C1 | Obey `companionTurnIntent` (posture, mustDo, mustAvoid, composerRule) | Task compliance | Mixed | Checklist tone; 5 posture hard fails/20 with turn-intent | User payload mirrors; regen posture hint |
| C2 | Choose right response — **not a complete mini-essay every turn** | Companion | Directly fights B10 | Weak vs 5K legacy structure above | Shape audit still shows essay turns |
| C3 | Do not default to answering first or asking unless posture requires | Companion | — | Contradicted by A7, B2, DIRECT_ANSWER mustDo | — |
| C4 | Scripture natural; no mechanical verse stack | Teacher (bounded) | — | Stubs still supply 2–3 refs | companion stubs; mustAvoid verse dump |
| C5 | Doctrine forbidden list (Sunday Sabbath, heaven at death, law/dietary abolished, tradition) | Safety / pastor | — | — | doctrine JSON + validator |
| C6 | History may explain practice; may not override Scripture | Teacher | — | Invites history paragraphs | B5–B6 |
| C7 | Do not paste evidence verbatim; no unsolicited study prompts | Anti-template | — | Paraphrased templates still pass | validator study markers |
| C8 | SPECIFICITY_HINT: prefer thread details; user wording not template opener | Listening | — | “Use wording” → “you mentioned” risk | listeningGuidance (duplicate) |

**Conflict score (block effectiveness):** **6/10** — correct intent, **insufficient primacy** over B10 and JSON contract.

---

### D. RACL additions (evidence in system + user payload)

| # | Signal | Optimizes for | Role bias | Unintended behavior | Redundant with |
|---|--------|---------------|-----------|---------------------|----------------|
| D1 | `understanding.exactUserQuestion` / `plainEnglishRestatement` | Answer precision | Assistant | Narrows to Q&A frame | questionIntent |
| D2 | `understanding.strictAnswerMode` | Direct answer | Assistant | Skips relational pacing | DIRECT_ANSWER posture; activeConversation lock |
| D3 | `understanding.forbiddenDistractions[]` | Answer focus | — | Good for meta; doesn’t add companion mode | correction forbidden topics |
| D4 | `history.included` + `chainSteps` | Lecturer | History paragraphs on factual turns | Bleed on meta if retrieval mis-gates | B10, Runtime structure |
| D5 | `scripture.references[]` (companion stubs or chains) | Teacher | Pre-loaded verse set → triads | Job thread Proverbs/James/Psalm pattern | buildSystemPrompt scripture JSON |
| D6 | `doctrine.boundaries` + `forbiddenTeachings` (×2 in system) | Safety / apologist | — | Duplicate with C5, runtime | — |
| D7 | `threadLocal` snippets / `latestClarifiedIntent` | Listening | Fact insertion | “Find detail → insert → answer” | detailCandidates |
| D8 | `companionThreadContext` (topic, directConcernPhrase, practicalNextStepCategory) | Advisor | `practicalNextStepCategory` biases toward steps/prayer | caregiver → emotional_support_and_prayer | mustDo practical steps |
| D9 | `memory.snippets` | Personalization | Assistant recall | High hit rate, low `threadSpecific` (5.4 avg) | RelationshipObjectiveAudit |
| D10 | `activeConversation` summary | Task state | Lock until resolved → answer mode | — | strictAnswerMode |
| D11 | Evidence pack duplicated in **system** and **user** | Task completion | Token noise; teaching facts twice | Same facts reinforced | — |

**Measured RACL effect:** memory **20/20**, listening **+0.2** (6.1→6.3). Retrieval improves **inputs**; composer instructions still **collapse** to deliver-mode.

---

### E. Listening additions (`listeningGuidance`, `detailCandidates`)

| # | Instruction | Optimizes for | Role bias | Unintended behavior | Redundant with |
|---|-------------|---------------|-----------|---------------------|----------------|
| E1 | Prefer specific details over general summaries | Listening | — | Detail in sentence 3+ still scores weak | SPECIFICITY_HINT, A6 |
| E2 | Use user wording where natural — not fixed opener | Listening | Companion | Model still uses “It sounds like” | mustAvoid; validator soft only |
| E3 | `detailCandidates: …` (pipe list) | Specificity | Assistant | Checklist insertion | threadLocal snippets |
| E4 | On correction: fresh wording; `correctedIntent` | Correction repair | Assistant | Answer-first repair, not relational | correctionLedger; regen hint |
| E5 | Post-reply: user detail in opening (soft) | Listening | — | **Never blocks** regen | — |

**Conflict score:** **4/10** — aligned with companion, **under-powered** vs B10.

---

### F. Correction additions (ledger in user payload)

| # | Field / instruction | Optimizes for | Role bias | Unintended behavior | Redundant with |
|---|---------------------|---------------|-----------|---------------------|----------------|
| F1 | `priorAssistantQuote` | Stop repeat | — | — | overlap validator |
| F2 | `correctedIntent` | Task clarity | Assistant | “Answer this question” frame | understanding |
| F3 | `forbiddenRepeatTopics` | Doctrine/topic guard | — | — | forbiddenDistractions |
| F4 | **`requireDirectAnswerFirst: true`** (correctionCount ≥ 1) | **Direct answer** | **Assistant** | **Skips repair/ack pacing**; terse rationale loops | CORRECTION_RECOVERY “brief ack”; C3 |
| F5 | Regen: “Do not repeat prior answer… new opening… answer only corrected question” | Compliance | Assistant | Same semantic content, new words → 37–55% overlap | F4 |
| F6 | Hard fail overlap >40% / rationale >35% | Anti-loop | — | Optimizes **word novelty**, not **listening** | — |
| F7 | Posture: must state wording vs RCC; Constantine vs RCC separation | Teacher | Mini-lecture on meta turns | T7 listening **5.8** (turn-intent report) | mustDo Roman imperial |

**Conflict score (correction path):** **7/10** — fixes wrong topic, not wrong **relationship move**.

---

### G. Companion additions (`companionTurnIntent`)

| # | Instruction | Optimizes for | Role bias | Unintended behavior | Redundant with |
|---|-------------|---------------|-----------|---------------------|----------------|
| G1 | Posture **DIRECT_ANSWER**: lead direct answer in 1–2 sentences | Teacher / assistant | Premature answer on `?` emotional turns | Default for unclassified `?` | B2, F4, A7 inverted |
| G2 | **REFLECT_THEN_HELP**: 1 reflect sentence + 2–3 helpful + optional one question | Advisor | Still 3–5 sentence **package** | Shape audit: reflect+advise+explain | A7, A8 |
| G3 | **WALK_WITH_ME**: don’t rush to solve; name carrying; one invitation | Companion | Best-aligned posture | Regressed vs RACL on some turns when mustDo added | — |
| G4 | **CORRECTION_RECOVERY**: ≤1 ack sentence; direct answer; no repeat | Assistant | Competes with F7 mustDo (Constantine/RCC) | History bleed hard fails | F5, F7 |
| G5 | **CLARIFY_FIRST**: one question only | Companion | Rarely selected | — | A9 (anti-question) when “needs guidance” |
| G6 | mustDo: “Mention mom/Alzheimer’s”, “2 practical steps”, “discernment step (pray, pause, counsel)” | Advisor / pastor | **Micro-template** per topic | Alzheimer’s T3 regressed vs RACL (7.8→lower) | D8 nextStepCategory |
| G7 | mustAvoid: verse dump, prayer before answer, mini-essay | Companion | Soft only — no regen | Essays still pass | C2 |
| G8 | composerRule per posture (sentence counts, ordering) | Compliance | Scripted shape | Turn-intent listening **6.2** (−0.1) | C1 |

**Conflict score (net):** **5/10** — helps classification, **mustDo/mustAvoid** reintroduce template pressure; **hard regen** still doctrine/correction-wording, not companion.

---

## Master conflict table (major instructions)

Sorted by **conflict score** (10 = strongest tension with companion presence).

| Instruction | Source | Desired effect | Possible side effect | Conflict score |
|-------------|--------|----------------|----------------------|----------------|
| **RESPONSE STRUCTURE: 1–5 (Scripture → continuity → history → interpretation → traditions)** | `buildRuntimeInstructions` | Complete doctrinal answer | **Mini-lecture every turn** | **10/10** |
| **Prioritize explicit Scripture references first** | `buildRuntimeInstructions` | Biblical grounding | Verse-led opens on grief/health/job | **9/10** |
| **Reflect one sentence before advising** | `buildSystemPrompt` | Feel heard | Reflect+advise+explain package; fake listening | **8/10** |
| **Give forward movement: practical next steps, prayer structure, study direction** | `buildSystemPrompt` | Helpfulness | Transactional close; advisor checklist | **8/10** |
| **Continue analysis when challenged** (vs emotional fallback) | `buildRuntimeInstructions` | Intellectual rigor | Rationale loops on Sabbath meta | **8/10** |
| **Return JSON with `scripture` + `next_steps` arrays** | `buildSystemPrompt` | Structured output | Parallel teaching beyond `reply` | **8/10** |
| **Sabbath: explain Scripture first, then historical developments separately** | `buildRuntimeInstructions` | Doctrinal clarity | History blocks on wording corrections | **8/10** |
| **Do not keep asking vague questions when user needs guidance** | `buildSystemPrompt` | Decisiveness | **Suppresses exploration** (~2% asking) | **7/10** |
| **`requireDirectAnswerFirst` on correction ledger** | `correctionLedger` → composer | Meta compliance | Premature answer; weak repair tone | **7/10** |
| **DIRECT_ANSWER: Lead with direct answer in 1–2 sentences** | `companionTurnIntent` | Clarity | Answer before understanding on discernment `?` | **7/10** |
| **Not a complete mini-essay every turn** | `COMPOSER_INSTRUCTION` | Companion pacing | **Overridden** by B10 + JSON | **7/10** (as ineffective anti-instruction) |
| **Obey mustDo checklist (mom, 2 steps, discernment step, RCC/Constantine)** | `companionTurnIntent` | Specificity | Template compliance; teaching stuffing | **6/10** |
| **Help user feel heard before instructed** | `buildSystemPrompt` | Companion | One sentence then instruct anyway | **6/10** |
| **Prefer specific details / detailCandidates** | listening + COMPOSER | threadSpecific | Insert-detail-without-presence | **5/10** |
| **Do not default to answering first** | `COMPOSER_INSTRUCTION` | Companion | Contradicted by stack above | **5/10** (conflict with self) |
| **Use Scripture naturally; no mechanical stack** | `COMPOSER_INSTRUCTION` | Natural teacher | Weak vs stubs + B2 | **5/10** |
| **WALK_WITH_ME: don’t rush to solve** | `companionTurnIntent` | Companion | Only posture aligned; often overridden | **4/10** (low score = aligned, not dominant) |

---

## Redundancy clusters

| Cluster | Members | Effect |
|---------|---------|--------|
| **Doctrine forbidden** | Runtime, COMPOSER, evidence.doctrine, validator | Same rules 3×; reinforces **teacher caution**, not warmth |
| **Specificity / user wording** | A6, C8, E1–E3, mustDo mentions | Same goal 4×; model satisfies with **name-drop**, not pacing |
| **Anti-template** | A6, C7, mustAvoid, validator | Stops paste; **does not stop** generated essay shape |
| **Correction directness** | F4, F5, G4, E4, understanding.strictAnswerMode | All push **answer the corrected question first** |
| **Scripture supply** | B2, D5, A11, JSON `scripture` field, stubs | Supplies content for **explain/advise** slots |

---

## If the composer had never seen retrieval, memory, routing, validators, or posture…

**What instructions alone would still make it sound like an answer engine?**

These live in **`buildSystemPrompt` + `buildRuntimeInstructions` + JSON response contract** only:

1. **`RESPONSE STRUCTURE` (5 numbered steps)** — trains a full teaching arc per turn.  
2. **“Prioritize explicit Scripture references first.”**  
3. **“Reflect… in one sentence before advising” + “Give forward movement: practical next steps, prayer structure, study direction.”** — choreographs reflect → advise → close.  
4. **“Do not keep asking vague questions when the user needs guidance.”** — discourages exploration.  
5. **“Continue analysis when challenged instead of repetitive emotional fallback.”** — debate/rationale mode on friction.  
6. **Sabbath/dietary block: Scripture first, then history separately.** — minimum two-part explanation.  
7. **JSON shape requiring `scripture[]` and `next_steps[]`** — slot-filling beyond conversational `reply`.  
8. **“Bible-first foundation; line upon line; precept upon precept.”** — global teacher stance.  
9. **“Distinguish biblical text / historical developments / traditions / interpretation”** — lecturer framing.  
10. **“Use prior conversation memory naturally”** (without companion pacing rules) — recall as **facts to weave into answers**, not relationship.

**Conclusion:** Even with **zero** RACL, turn-intent, or validators, the legacy system message **already defines an answer engine**. Reason-first added thin companion tails; it did not remove the essay skeleton.

---

## Is the composer prompt the remaining bottleneck?

| Layer | Verdict |
|-------|---------|
| **Composer prompt stack** | **Yes — primary bottleneck** for companion *feel* and ~half of listening gap |
| **RACL retrieval** | **Not primary** — hits 20/20; +0.2 listening only |
| **Posture / mustDo** | **Secondary** — did not beat RACL (−0.1 listening); adds checklist |
| **Validators** | **Reinforce answer/doctrine** on regen; companion signals soft-only |
| **Operating model experiment (minimal shell)** | **Not yet measured** live in repo — design isolates compose purpose |

Evidence split from `ConversationShapeAudit.md` (~38% shape / ~22% compose): **this audit locates most “compose” pressure inside the system prompt**, not OpenAI availability.

---

## Top 10 instructions most likely suppressing companion behavior

| Rank | Instruction | Why it suppresses companion | Est. listening lift if rewritten* |
|------|-------------|----------------------------|-----------------------------------|
| 1 | `RESPONSE STRUCTURE` 1–5 (`buildRuntimeInstructions`) | Forces lecture arc | **+0.25–0.4** |
| 2 | “Prioritize explicit Scripture references **first**” | Verse-led deliver mode | **+0.15–0.25** |
| 3 | “Reflect… **before advising**” + “**forward movement** / next steps / prayer structure” | Reflect→advise→close template | **+0.15–0.3** |
| 4 | JSON **`scripture` + `next_steps`** required fields | Parallel teaching payload | **+0.1–0.2** |
| 5 | “**Do not keep asking** vague questions when user needs guidance” | Kills exploration (2% asking) | **+0.1–0.2** |
| 6 | “**Continue analysis when challenged**” | Rationale loop vs repair | **+0.1–0.2** (Sabbath-heavy) |
| 7 | Sabbath “Scripture first, **then history separately**” | History on meta turns | **+0.1–0.15** (thread-specific) |
| 8 | **`requireDirectAnswerFirst`** + correction regen “answer only corrected question” | Assistant repair, not companion | **+0.05–0.15** |
| 9 | **DIRECT_ANSWER** default for unclassified `?` + “lead with direct answer 1–2 sentences” | Premature answer | **+0.05–0.15** |
| 10 | **mustDo** bundles (2 practical steps, discernment step, RCC/Constantine on correction) | Micro-templates | **+0.05–0.1** (may trade specificity) |

\* *Rewritten in place at top of system message, with runtime structure removed from reason-first path — not measured; inferred from RACL (+0.2), turn-intent (−0.1), lite (−0.4), and shape audit gaps.*

### Likely listening ceiling if top 10 were rewritten (evidence-based estimate)

| Scenario | Est. avg listening | Notes |
|----------|-------------------|--------|
| **Current reason-first** | **6.3–6.4** | Validated |
| **Top 3 conflicts fixed only** (remove RESPONSE STRUCTURE, soften Scripture-first, relax advise-before-explore) | **~6.6–6.9** | Aligns with deliver-mode −5–10 pts |
| **Top 10 rewritten + RACL kept** | **~6.8–7.1** | Unlikely +0.5→7.8 without also changing user payload checklist pressure |
| **Target 7.5+ gate** | **>7.5** | Probably needs **split compose** (moment assess → shape-specific short prompt) or **lite shell** + selective evidence — prompt edits alone hit ceiling ~7.1 per experiment history |

**Ceiling statement:** Rewriting instructions is **necessary but likely insufficient** for **7.5** listening. The stack also needs **(a)** reason-first to stop appending full `buildRuntimeInstructions`, **(b)** JSON contract slimmed to `{ reply }` on companion turns, **(c)** hard validator on deliver-mode length for WALK_WITH_ME / grief — otherwise model regresses to essay attractor.

---

## Instruction → role vector (aggregate)

| Role | Dominant instruction sources |
|------|------------------------------|
| **Lecturer** | B10 RESPONSE STRUCTURE, B2, B5–B6, D4 |
| **Teacher** | A3, A11, C4–C6, D5, doctrine boundaries |
| **Advisor** | A7–A8, G2, G6, D8, practicalNextStepCategory |
| **Assistant** | D1–D2, F4–F5, G1, JSON contract, requireDirectAnswerFirst |
| **Pastor** | A2, A5, prayer/next_steps, caregiver mustDo |
| **Counselor** | A10, G3 (when selected) |
| **Companion** | A1, A5, C2–C3, G3, E1–E2 (low weight in token order) |

**Companion is a minority objective in the system message by weight and by regen incentives.**

---

## Stop conditions (audit)

- No code changes, implementations, experiments, deploy, or push  
- Evidence trail: source files listed above + validation JSON/audits  
- For live confirmation of composer-only ceiling: compare `docs/racl/validation-results.json` to any future **reason-first composer slim-prompt** run (not in scope here)

---

*End of audit.*
