# Bottom-Line Necessity Audit

**Generated:** 2026-06-01  
**Scope:** Audit only. No deploy, push, Sprint 3, or implementation unless separately approved.

**Goal:** Decide which response-control layers are **necessary for the bottom line** vs **temporary fixes that now suppress natural companion behavior**.

**Bottom-line priority (user order):** (1) biblical truth → (2) companion presence → (3) direct usefulness → (4) safety → (5) beta readiness (stable enough, not synthetic-score chasing).

**Production vs validation path:**

| Path | Default | Notes |
|------|---------|-------|
| **Production** | `BUDDY_RUNTIME=legacy` (`buddyBrain.js`) | Legacy interceptors + presenters still exist |
| **RACL benchmark / reason-first** | `BUDDY_RUNTIME=reason_first` | `reasonFirstBuddyRuntime` → `buildRetrievalEvidencePack` → `composeReasonFirstReply` |
| **Listening plateau evidence** | reason-first + RACL | **6.4** avg listening (`docs/racl/validation-results.json`) |

This audit focuses on the **reason-first production candidate stack** (what beta would likely enable), while marking layers that exist only in legacy or experiment trees.

---

## Executive summary

| Finding | Confidence |
|---------|------------|
| **Doctrine must stay hard** — validator + `FORBIDDEN_TEACHINGS` + crisis path; not replaceable by prompt politeness | **High** |
| **RACL + thread memory + reasoning snapshot + correction ledger** — bottom-line valuable; retrieval works (20/20 hits) | **High** |
| **RESPONSE STRUCTURE + RT-SCRIPTURE-FIRST on every turn** — protect doctrine on **some** turns but **suppress Emotional Center** on companion turns | **High** |
| **BB-REFLECT / BB-COMFORT as written** — cause template/generic openers; person-first tweak was **+0.1** only | **High** |
| **Turn-intent, operating-model, structure-removal, lite runtime** — **not on reason-first path**; experiments **regressed** listening | **High** |
| **Golden examples** — optional flag; **+0.1** listening, helpful shape, not sufficient alone | **High** |
| **Companion topic / discernment mapping** — useful routing signal but **over-applies** (job T1 → discernment sermon) | **High** |

**Headline:** Most **control layers are necessary for truth and safety**; the harm comes from **applying teaching-stack instructions to non-teaching moments**, not from having too few rules.

---

## PART A — Necessity table

| Layer | Why added | Problem it solved | Already solved elsewhere? | Protects biblical truth? | Improves companion? | Suppresses EC? | Topic-response behavior? | Recommendation |
|-------|-----------|-------------------|---------------------------|--------------------------|---------------------|----------------|--------------------------|----------------|
| **RESPONSE STRUCTURE** (`runtimeOrchestrator.js` 5-step) | Sprint 2.FINAL doctrine/history depth | Sabbath/history answers skipped steps or blurred Scripture vs tradition | Partially: `doctrineBoundaryValidator`, evidence `doctrine` slice | **Yes** on doctrinal Qs | **No** on grief/job (lecture shape) | **Yes** — forces essay arc | **Yes** | **DEMOTE** — apply only when `history.included` or doctrinal topic; not companion shares |
| **RT-SCRIPTURE-FIRST** (runtime PRIMARY FOUNDATION) | Bible-first North Star | Weak or absent Scripture on doctrine threads | `retrieveScriptureEvidence`, composer doctrine lines | **Yes** | Mixed | **Yes** — verse triads on distant T1 | **Yes** | **DEMOTE** — bind to Bible/doctrine/history turns only |
| **BB-REFLECT** (`buildSystemPrompt`) | “Feel heard before instructed” | Cold, immediate advice | `listeningGuidance`, `detailCandidates` (weak) | No | **No** — “It sounds like” template | **Yes** — paraphrase before anchor | Mild | **REWRITE** — EC preservation, not reflect-then-advise |
| **BB-COMFORT** (`buildSystemPrompt`) | Overwhelm → light Scripture | Harsh tone on pain | `companion_support` in snapshot | No | Partial | **Yes** — generic sorry (grief T1) | Mild | **REWRITE** — comfort **after** named EC |
| **Discernment topic mapping** (`classifyDiscernment` + `questionType: discernment`) | Job/life decisions | Generic chat on offers | `companionThreadContext` | No | **No** on T1–T2 (witness needed) | **Yes** — Proverbs arc | **Strong** | **DEMOTE** — do not label first share as full discernment sermon |
| **Companion topic mapping** (`detectCompanionTopic`) | Route stubs/memory | Wrong topic bleed | `companionContext` tags | Indirect | Partial | Partial — also supplies **`directConcernPhrase`** (good) | **Yes** | **KEEP** — retain `directConcernPhrase`; demote topic→sermon coupling |
| **Practical next-step category** (`practicalNextStepCategory`) | Hint composer shape | None on RF path (non-binding) | `plainEnglishRestatement` | No | Low | Low | Mild | **KEEP** as hint only; **do not** elevate to system-prompt driver |
| **Reasoning snapshot** (`buildReasoningSnapshot`) | Answer right question first | Sabbath meta, topic bleed | `questionIntentResolver`, active conversation | **Yes** (meta/correction) | **Yes** when plainEnglish accurate | No — often **has** EC | Mild | **KEEP** — fix stale job `plainEnglish` on follow-ups |
| **Correction ledger** (`correctionLedger.js`) | Sabbath wording repair | Repeated Roman church block | `validateCorrectionHardFailures` | On meta | **Yes** on repair turns | No when active | On correction | **KEEP** — production path; meta/frustration only |
| **Listening signals** (`listeningSpecificityValidator`) | Specificity in compose | Generic openers | `detailCandidates` in user JSON | No | Intended yes | **No** — supplies EC tokens | No | **KEEP** — **elevate** enforcement via EC preservation (not new layer) |
| **Doctrine validator** (`doctrineBoundaryValidator.js`) | Forbidden teachings / templates | Sunday Sabbath, template paste | `doctrineBoundaries.js` | **Yes** — **minimum viable** | Neutral | No | On violation regen | **KEEP** — hard gate + regen |
| **RACL** (`retrievalEvidencePack.js`) | Memory-first facts for compose | Template responders, memory miss | Thread sessions | Indirect | **Yes** (20/20 hits) | **No** — enables EC | No | **KEEP** — best-performing architecture |
| **Golden examples** (`goldenCompanionExamples.js`, `BUDDY_EXAMPLES=golden`) | Few-shot companion shape | Template openers | Overlaps COMPOSER_INSTRUCTION | Via examples only | **+0.1** listening, +0.3 feltHeard | Helps when matched | Mild | **FREEZE AS EXPERIMENT** — optional A/B; merge learnings into EC rule |
| **Turn-intent** (`companionTurnIntent.js`) | Posture / mustDo | Deliver-mode | Not wired in `reasonFirstComposer` | No | **Regression** (6.2) | Added rules | **Yes** | **FREEZE AS EXPERIMENT** — **not on RF production path** |
| **Operating-model** (`companionOperatingModelExperiment.js`) | Human moment first | Answer engine | Not in RF runtime | No | **Regression** (6.0) | Parallel framework | **Yes** | **FREEZE AS EXPERIMENT** — remove from beta scope |
| **Lite runtime** (`reasonFirstLiteRuntime.js`, `bibleBuddyLiteRuntime.js`) | Cost/latency | Complexity | N/A | Partial | **Regression** | Unknown | Unknown | **FREEZE AS EXPERIMENT** |
| **Response-structure-removal** (`responseStructureRemovalExperiment.js`) | Natural companion shape | Forced structure | COMPOSER_INSTRUCTION partial | Risk if removed entirely | **Regression** (6.1) | Failed experiment | — | **FREEZE AS EXPERIMENT** — evidence supports **demote**, not delete |
| **Person-first reflect** (`applyPersonFirstCompanionHierarchy`) | BB-REFLECT vs specificity | Template reflect | `detailCandidates` | No | **+0.1** | Partial | No | **KEEP** (already in RF) — insufficient alone |
| **COMPOSER_INSTRUCTION** (~800 chars) | Anti-essay rebalance | Deliver-mode | Buried under system stack | Lists forbidden doctrine | Weak vs STRUCTURE | Weak | Mild | **REWRITE** — EC preservation lead |
| **Legacy runtime** (default) | Pre-migration | Interceptors | reason-first for bench | Via interceptors | Different scores | Unknown | Heavy | **KEEP** until beta cutover decision — out of scope for EC fix |

**Confidence:** **High** on production-path classification; **Medium** on legacy-only harm estimates.

---

## PART B — Biblical doctrine protection audit

### Question

Can doctrine boundaries be protected **without** forcing every reply into scripture-first lecture format?

### Answer

**Yes.** Evidence: alz-3 (**7.8** listening, **0** scripture refs in reply), distant-3 (**7.5**, direct answer), sabbath-7 (**7.2**, repair) — high listening without 5-step essay or verse triad.

Doctrine safety on those turns came from **composer doctrine lines** + **no forbidden phrasing**, not from RESPONSE STRUCTURE.

### Minimum protection stack

| Must remain | Role |
|-------------|------|
| **`doctrineBoundaries.js` / `violatesDoctrineBoundary()`** | Hard forbidden teachings list |
| **`doctrineBoundaryValidator.js` regen** | Fail closed on Sunday-Sabbath-as-command, heaven-at-death, etc. |
| **`COMPOSER_INSTRUCTION` forbidden list** | Model-facing guardrail in RF compose |
| **Crisis reply** (`reasonFirstBuddyRuntime` CRISIS_REPLY) | Safety #4 |
| **Meta/correction: history suppress + ledger** | Prevents Constantine loop on wording turns |

| Move to validator **only** (not every-turn prose rules) | Role |
|--------------------------------------------------------|------|
| Repeated Sabbath **template blocks** | `validateHistoryTemplateOnMeta` (already) |
| Unsolicited study prompts | `STUDY_PROMPT_MARKERS` (already) |
| Correction overlap >40% | `validateCorrectionHardFailures` (already) |

| Remove from **normal companion** prose instructions | Role |
|-----------------------------------------------------|------|
| **5-step RESPONSE STRUCTURE** on grief/job/health/distant share | Lecture engine source |
| **“Scripture passages first”** block when `companionTopic` set and `history.included === false` | EC suppression |

| Keep in **doctrine/history** turns only | Role |
|----------------------------------------|------|
| RT-SCRIPTURE-FIRST ordering | sabbath-1-style questions |
| RESPONSE STRUCTURE or condensed variant | historical_answer / evidence_request |

**Confidence:** **High** on minimum validator set; **Medium** on conditional STRUCTURE demotion (needs controlled A/B).

---

## PART C — Emotional Center conflict audit

**Source:** `ComposerEmotionalCenterForensicAudit.md` — composer **receives** EC, **overrides** on 6/20 turns (bucket 2 avg **5.73** listening).

### RESPONSE STRUCTURE

| Step | User EC | Layer effect | Final problem |
|------|---------|--------------|---------------|
| distant-1 | Feels **distant lately** | Model fills steps 1–5 → Scripture + history + practice | Generic normalization + **3** refs; EC “lately” drowned |
| job-1 | New **opportunity** (unstated stakes) | Complete “movement” turn | Proverbs + pray offer before learning stakes |

**Override mechanism:** 5-step arc in **system** message (`buildRuntimeInstructions`).  
**Confidence:** **High**

### RT-SCRIPTURE-FIRST

| Step | User EC | Layer effect | Final problem |
|------|---------|--------------|---------------|
| alz-1 | Mom’s **Alzheimer’s** | Honor father (Exodus) in “foundation” slot | Teaching tail after brief sorry |
| distant-1 | Spiritual **distance** | Psalm 139 + James 4 + Psalm 51 stack | Lecture engine |

**Confidence:** **High**

### BB-REFLECT

| Step | User EC | Layer effect | Final problem |
|------|---------|--------------|---------------|
| job-2 | **Far away from home** | “Reflect one sentence before advising” → **It sounds like the distance…** | feltHeard **2**; paraphrase not anchor |
| sabbath-5 | **Not answering** | Acknowledgment stem before content | Partial repair (works somewhat) |

**Confidence:** **High** on job-2; **Medium** on sabbath-5

### BB-COMFORT

| Step | User EC | Layer effect | Final problem |
|------|---------|--------------|---------------|
| grief-1 | **Friend lost Wednesday** | “Comfort first” without naming detail | *“I'm truly sorry for your loss”* — **Wednesday** missing |
| job-1 | Uncertainty on offer | “Wonderful to hear” tone | Encouragement vs witness |

**Confidence:** **High**

### Discernment topic mapping

| Step | User EC | Layer effect | Final problem |
|------|---------|--------------|---------------|
| job-1 | First mention of offer | `discernment` + `discernment_conversation` + Proverbs stubs | Discernment sermon on turn that needed **witness** |
| job-2 | **Distance** | Stale `plainEnglish` still “life decision template” | Same Proverbs/James arc |

**Confidence:** **High**

### Practical next-step mapping

| Step | User EC | Layer effect | Final problem |
|------|---------|--------------|---------------|
| distant-1 | Distance | `honest_reflection_not_template` in pack | **Ignored** — RT-STRUCTURE won |
| job-* | Various | `wise_discernment_and_peace` | Prayer/close offers every turn |

**Confidence:** **Medium** (hints not binding; harm via pairing with topic stubs)

---

## PART D — Minimum viable companion stack

### KEEP (non-negotiable for bottom line)

| Component | Why |
|-----------|-----|
| **Reason-first runtime** | 100% OpenAI, best bench architecture |
| **RACL / `buildRetrievalEvidencePack`** | 20/20 memory; facts to composer |
| **Thread-local memory + session replay** | Person continuity |
| **Reasoning snapshot + question intent** | Meta/correction/direct question routing |
| **Correction ledger** | Actual repair (Sabbath T5–T7) |
| **Doctrine validator + regen** | Truth #1 |
| **Crisis / safety classify** | Truth #4 |
| **Listening signals (`detailCandidates`)** | EC tokens to composer |
| **`directConcernPhrase`** | EC surface field (already in pack) |

### DEMOTE / CONDITIONAL (do not delete doctrine)

| Component | Policy |
|-----------|--------|
| **RESPONSE STRUCTURE** | **Not as-is** for companion. **Apply only** when `evidencePack.history.included === true` OR doctrinal registry topic (Sabbath, dietary, etc.) AND no `companionTopic` witness turn. |
| **RT-SCRIPTURE-FIRST** | **Only** when user asks Bible/doctrine/history OR `requestedAnswerType === historical_answer` / `doctrine_definition`. |
| **Companion topic** | Keep detection; **stop** auto-injecting discernment scripture trio on turn 1 job share. |
| **Discernment classifier** | Keep for turn 3+ or explicit decision fork; **demote** on “I have a job opportunity” alone. |

### REWRITE (single controlled change candidate)

| Component | Policy |
|-----------|--------|
| **BB-REFLECT / BB-COMFORT** | Replace with **Emotional Center preservation** (first meaningful thought addresses EC before teach/advise/generic comfort). |
| **COMPOSER_INSTRUCTION** | Lead with EC rule; keep forbidden doctrine list. |

### FREEZE (not beta path)

Turn-intent, operating-model, lite runtime, structure-removal experiment modules, golden flag (optional A/B only).

### Answers to explicit questions

| Question | Recommendation | Confidence |
|----------|----------------|------------|
| Should RESPONSE STRUCTURE stay as-is? | **No** — **conditional** on doctrine/history only | **High** |
| Should RT-SCRIPTURE-FIRST apply to every reply? | **No** — Bible/doctrine/history only | **High** |
| Should BB-REFLECT/BB-COMFORT be rewritten for EC first? | **Yes** — core of preservation plan | **High** |

---

## PART E — Controlled implementation recommendation

**One** implementation approved for proposal (not executed in this audit):

### **Emotional Center Preservation** (composer-only)

See **`EmotionalCenterPreservationPlan.md`** for scope, rule text, validation protocol, and success gates.

**Why this vs other demotions:** Demoting STRUCTURE/RT without EC rule risks blank or wandering replies; EC rule targets **proven** failure mode (payload has EC, opening ignores it) with **smallest blast radius** (`reasonFirstComposer.js` + user payload hint from existing `directConcernPhrase`).

**Why not another framework:** TurnIntent / OperatingModel / StructureRemoval **regressed** on listening.

**Expected lift (evidence-based, not guaranteed):**

| Metric | Basis |
|--------|--------|
| Listening **+0.4** target | Job-2 + grief-1 counterfactuals (**HIGH** impact); golden + person-first each +0.1 |
| FeltHeard / ThreadSpecific | Bucket 2 → bucket 1 shift |
| Sabbath | No STRUCTURE removal — validator unchanged |
| Biblical grounding | Forbidden list + validator unchanged |

**Confidence:** **Medium** on +0.4; **High** on no substitute for doctrine validator.

---

## What not to do before beta

| Action | Why |
|--------|-----|
| Remove doctrine validator | Breaks priority #1 |
| Wire turn-intent / operating-model to production | Regressed |
| Delete RACL / memory | 20/20 hits; not the plateau cause |
| Full composer rewrite | High risk; incremental EC rule + conditional demotion later |
| Chase 7.5 synthetic gate only | Beta readiness = stable **enough** (#5) |

---

*Audit complete. Implementation requires explicit approval.*
