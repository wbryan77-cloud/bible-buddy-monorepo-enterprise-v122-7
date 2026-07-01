# Response Structure Removal Experiment

**Generated:** 2026-06-03T05:05:44.083Z
**Verdict:** STRUCTURE_REMOVAL_REGRESSED
**Live OpenAI run:** yes

## Hypothesis

`buildRuntimeInstructions` **RESPONSE STRUCTURE 1–5** (conflict score 10/10 in `ComposerObjectiveConflictAudit.md`) forces mini-essay turns regardless of RACL, memory, or companion layers.

## What changed (test-only)

| Kept | Removed from compose |
| --- | --- |
| Full `buildRetrievalEvidencePack` (RACL) | `buildSystemPrompt` legacy persona |
| Memory, correction ledger, listening guidance | `buildRuntimeInstructions` (RESPONSE STRUCTURE, Scripture-first, continue-analysis) |
| Doctrine boundaries + `validateDoctrineBoundaries` | reflect-before-advise, next-steps, prayer-close ordering |
| — | `companionTurnIntent`, posture validators |

**Sole compose instruction (Part B):**

> Respond in the way a wise, caring companion naturally would. Do not force a structure. Let the response match the moment.

**Confound:** Minimal system shell (~1K chars) vs full reason-first ~12K — same as other compose isolation experiments.

## Part C — Aggregate metrics (20 turns)

| Metric | Current RACL | Structure removed | Δ |
| --- | --- | --- | --- |
| listening | 6.3 | 6.1 | -0.2 |
| warmth | 5.9 | 6 | +0.1 |
| naturalness | 6.9 | 6.4 | -0.5 |
| threadSpecific | 5.9 | 4.4 | -1.5 |
| feltHeard | 6 | 5.5 | -0.5 |
| companionPresence | 7.1 | 6.3 | -0.8 |
| overExplaining | 6.1 | 5.1 | -1 |

| Shape | Current | Removed | Δ |
| --- | --- | --- | --- |
| deliver-mode % | 66.2 | 79.7 | +13.5 |
| answer/explain/advise % | 66.2 | 79.7 | +13.5 |
| avg scripture/prayer flags | 0.5 | 1 | +0.5 |

## Part D — Opening sentence comparison (all turns)

| Signal | Current RACL | Structure removed |
| --- | --- | --- |
| Lecture-like openers (heuristic) | 0/20 | 1/20 |
| Companion-like openers (heuristic) | 5/20 | 4/20 |
| Identical opening prefix (first 40 chars) | 0 turns | — |

### Job opportunity

| Turn | User (trunc) | Current opening | Structure-removed opening | Listen Δ |
| --- | --- | --- | --- | --- |
| 1 | I have a job opportunity. | You have a job opportunity in front of you, which can bring both excitement and uncertaint… | A job opportunity can be an important step in life, and it's natural to seek guidance on s… | +0 |
| 2 | The company is far away from home. | You’re considering a job opportunity that is far away from home, which adds a significant … | It sounds like you’re feeling the weight of being far from home, perhaps in a new company … | -0.5 |
| 3 | I'm not sure whether to push or wait on this off… | You’re weighing whether to push or wait on this job offer that’s far away from home, which… | It’s completely natural to feel unsure about whether to push forward or wait, especially w… | -0.7 |

**Qualitative (openings):**
- Lecture-like openers dropped: **0/3** turns
- Companion-like openers gained: **0/3** turns

### Alzheimer's caregiver

| Turn | User (trunc) | Current opening | Structure-removed opening | Listen Δ |
| --- | --- | --- | --- | --- |
| 1 | My mom was recently diagnosed with Alzheimer's. | Your mom’s recent Alzheimer's diagnosis brings a heavy and personal caregiving challenge. | I'm truly sorry to hear about your mom's diagnosis. | +0 |
| 2 | Some days she doesn't remember who I am. | Some days your mom doesn't remember who you are, which must be deeply painful for you as h… | I'm so sorry you're experiencing this. | -1.3 |
| 3 | How do I stay close to God while grieving who sh… | Grieving who your mom used to be while caring for her Alzheimer's journey is deeply painfu… | Grieving who she used to be is deeply painful, and it’s okay to bring that rawness to God. | -0.8 |

**Qualitative (openings):**
- Lecture-like openers dropped: **0/3** turns
- Companion-like openers gained: **0/3** turns

### Feeling distant from God

| Turn | User (trunc) | Current opening | Structure-removed opening | Listen Δ |
| --- | --- | --- | --- | --- |
| 1 | I feel distant from God lately. | Feeling distant from God can be a heavy and confusing experience, like carrying an invisib… | Feeling distant from God is a deeply human experience, and you're not alone in this. | +0.5 |
| 2 | I pray but it feels empty. | It sounds like you might be carrying a heaviness in your prayers, feeling that the words o… | Feeling that prayer is empty can be a heavy and lonely experience. | +0 |
| 3 | Does that mean my faith is failing? | Feeling distant from God and having prayers that feel empty doesn't mean your faith is fai… | Feeling distant from God or struggling with doubts does not necessarily mean your faith is… | +0 |

**Qualitative (openings):**
- Lecture-like openers dropped: **0/3** turns
- Companion-like openers gained: **0/3** turns

### Sabbath wording thread

| Turn | User (trunc) | Current opening | Structure-removed opening | Listen Δ |
| --- | --- | --- | --- | --- |
| 1 | Why should we keep Sunday as the day of worship … | Sunday became the common day of worship largely due to early Christian practice of gatheri… | The Bible clearly designates the seventh day as the Sabbath, a day of rest and worship (Ge… | +0 |
| 2 | Why do you call it the Roman church instead of t… | I see you're asking about my wording choice. | I use the term "Roman church" as a shorthand to refer to the historical institution often … | +0 |
| 3 | Why are you using the term Roman church when the… | I understand you're asking specifically about why I chose the term "Roman church" rather t… | I use the term "Roman church" as a shorthand to refer to the institution commonly known as… | -0.3 |
| 4 | No, I'm not asking about the shift. I'm asking a… | I understand you're focusing on why I chose the phrase "Roman church" rather than the form… | Thank you for pointing that out. | +0.8 |
| 5 | Why are you not answering my question? | I understand you're asking why I use the term "Roman church" instead of the formal "Roman … | I'm truly sorry if it felt like I was not addressing your question. | +0 |
| 6 | No, I'm not asking about history. I'm asking abo… | I see you're asking specifically about my choice of the term "Roman church" rather than th… | Thank you for clarifying. | +1.2 |
| 7 | Are you not listening to what I am asking? | I hear you clearly want to know why I specifically use the term "Roman church" instead of … | I hear you clearly, and I am listening. | +0 |

**Qualitative (openings):**
- Lecture-like openers dropped: **0/7** turns
- Companion-like openers gained: **0/7** turns

### Grief thread

| Turn | User (trunc) | Current opening | Structure-removed opening | Listen Δ |
| --- | --- | --- | --- | --- |
| 1 | I lost a friend Wednesday. | Losing a friend on Wednesday must feel very heavy and personal to you. | I'm so sorry for your loss. | -0.5 |
| 2 | It is still bothering me. | It sounds like the loss of your friend on Wednesday is still very present in your heart, a… | I'm sorry to hear that it's still bothering you. | -2 |

**Qualitative (openings):**
- Lecture-like openers dropped: **0/2** turns
- Companion-like openers gained: **1/2** turns

### Health thread

| Turn | User (trunc) | Current opening | Structure-removed opening | Listen Δ |
| --- | --- | --- | --- | --- |
| 1 | My knees hurt. | Your knees hurting sounds uncomfortable and concerning. | I'm sorry to hear that your knees hurt. | +0 |
| 2 | My knees are hurting again today. | Your knees hurting again today must be really frustrating. | I'm sorry to hear your knees are hurting again today. | +0 |

**Qualitative (openings):**
- Lecture-like openers dropped: **0/2** turns
- Companion-like openers gained: **2/2** turns

### Part D synthesis

- **Stopped lecturing in opener?** Lecture-like openers increased (+1 turns).
- **More conversational?** Companion-like openers decreased (-1 turns).
- **Less repetitive?** See per-thread overlap in JSON; identical prefix count: **0**.
- **Less answer-engine?** Deliver-mode +13.5 pts; listening -0.2.

## Part E — Decision

### 1. Is RESPONSE STRUCTURE the primary suppression mechanism?
**Not proven as sole primary mechanism** on this run — ceiling may be elsewhere (retrieval stubs, correction directness, rubric).

### 2. If removed, what was the listening delta?
**-0.2** (Current 6.3 → 6.1)

### 3. Did companion presence improve?
**-0.8** (over-explaining higher=better: -1)

### 4. Did biblical grounding suffer?
Scripture/prayer flags per turn: **0.5 → 1** (+0.5). Doctrine hard-fail regen still active — grounding likely preserved unless flags dropped sharply with doctrine fails in JSON.

### 5. Should the structure be rewritten, reduced, or removed?
**Rewrite, not only remove** — structure removal alone did not clear +0.5; combine with slim JSON contract and turn-intent off on companion path.

## Artifacts

- `docs/response-structure-removal/results.json`
- `services/responseStructureRemovalExperiment.js` (test-only)

## Stop conditions

- No production merge, deploy, or push

