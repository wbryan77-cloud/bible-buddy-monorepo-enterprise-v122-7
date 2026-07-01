# Emotional Center Preservation — Controlled Implementation Plan

**Status:** **Recommendation only** — not implemented in this pass.  
**Scope:** Audit-approved **one** change before beta. No deploy, push, Sprint 3, new architecture, routes, responders, memory engines, or doctrine systems.

**Prerequisite audits:**

- `ComposerEmotionalCenterForensicAudit.md` — EC **received**, often **overridden**
- `BottomLineNecessityAudit.md` — teaching-stack layers **demote** on companion; **KEEP** doctrine validator + RACL
- `docs/racl/validation-results.json` — baseline listening **6.4**
- `docs/golden-companion-examples/results.json` — golden **+0.1** listening (insufficient alone)

---

## 1. Objective

Preserve the user’s **Emotional Center** in the **first meaningful thought** of each reply — before topic teaching, scripture-first structure, generic comfort, or template reflection.

**Operational EC (already in pipeline):** `companionThreadContext.directConcernPhrase`, lead `detailCandidates`, and when present `understanding.plainEnglishRestatement` grief/discernment lines.

**Non-goals:**

- No exact wording templates
- No forced “you mentioned”
- No forced questions
- No forced empathy phrases (“It sounds like…”)
- No new validators, frameworks, or routes

---

## 2. Rule (composer-facing)

### Emotional Center Preservation (ECP)

> The **first meaningful sentence** must address the Emotional Center — the lived focal point of **this** message (`directConcernPhrase` or the most specific `detailCandidate` for the current turn) — **before** scripture blocks, five-step teaching structure, discernment triads, or transactional prayer offers.
>
> Match the user’s need: **witness** (share turns), **direct answer** (explicit fear/question), **repair** (correction/meta). Do not replace the center with a category label (“discernment,” “grief”) alone.
>
> Use natural language. Concrete detail may be paraphrased but must be **recognizable** (e.g. *Wednesday*, *far from home*, *grieving who she used to be*, *faith is failing*, *again today*).

### Examples (from audit — not injected verbatim)

| Bad (current) | Better (ECP) |
|---------------|--------------|
| It sounds like this job opportunity is creating a lot of discernment. | The weight here seems to be whether to force a door open or wait if God is asking you to pause. |
| I'm sorry for your loss. | Wednesday may still sit heavy — not just grief in general. |
| Caring for a parent with Alzheimer's can be difficult. | You are not only showing up for your mom; you are grieving who she used to be. |

---

## 3. Implementation scope (when approved)

### Touch (only)

| File | Change |
|------|--------|
| `services/reasonFirstComposer.js` | Add **ECP block** to `COMPOSER_INSTRUCTION` (or equivalent single appendix); optionally add **one line** to user JSON: `emotionalCenterHint: directConcernPhrase` (field already computed in retrieval — **not** a new engine) |
| `scripts/emotionalCenterPreservationValidation.js` | **New** — clone `scripts/raclValidation.js` A/B: control vs `BUDDY_ECP=1` or inline flag |
| `docs/emotional-center-preservation/results.json` | Validation output |
| `EmotionalCenterPreservationReport.md` | Post-run summary |

### Do not touch

| Area | Reason |
|------|--------|
| `buddyBrain.js` legacy default | Beta cutover separate |
| `retrievalEvidencePack.js` | EC already present |
| `doctrineBoundaryValidator.js` | Truth #1 |
| `companionTurnIntent.js`, operating-model, lite, structure-removal | Frozen experiments |
| `buildRuntimeInstructions` / RESPONSE STRUCTURE | **Phase 2** demotion — not bundled in ECP v1 (avoid double variable) |

### Replace in system prompt (reason-first only)

Via existing `applyPersonFirstCompanionHierarchy` pattern:

- Demote or subsume **BB-REFLECT** “one sentence before advising” → **ECP first thought**
- Subordinate **BB-COMFORT** → comfort **after** named EC, not generic opener

**Person-first reflect lines stay** as supporting specificity hint; ECP is the **leading** rule.

---

## 4. Why this implementation vs alternatives

| Alternative | Why deferred |
|-------------|--------------|
| Demote RESPONSE STRUCTURE globally | Structure-removal experiment **regressed** (6.1); do after ECP proves lift |
| Wire operating-model / turn-intent | Regressed listening |
| More golden examples | +0.1 only; ECP is rule-based |
| Topic mapping rewrite | Needed but **second** commit; job fix partly addressable via ECP + existing `plainEnglish` |
| New calibration layer | User forbade new architecture |

**Confidence:** **High** that ECP is the smallest change aligned with forensic evidence; **Medium** that it alone hits +0.4.

---

## 5. Validation protocol

### Command (when approved)

```bash
BUDDY_RUNTIME=reason_first OPENAI_API_KEY=... node scripts/emotionalCenterPreservationValidation.js
```

### Design

1. Run **same 20 threads** as `scripts/raclValidation.js`.
2. **Control arm:** current `reasonFirstComposer` (no ECP flag).
3. **Experiment arm:** ECP enabled.
4. Write `docs/emotional-center-preservation/results.json` + `EmotionalCenterPreservationReport.md`.

### Success gates

| Gate | Target | Confidence |
|------|--------|------------|
| **Listening delta** | **≥ +0.4** vs control (6.4 → **≥ 6.8**) | Medium |
| **feltHeard** | Improves vs control | High (if EC named) |
| **threadSpecific** | Improves vs control | High |
| **job T2** | **≥ 6.3** (from 4.8) | High impact expected |
| **grief T1** | **≥ 6.8** (from 5.8) | High impact expected |
| **Sabbath T7** | No regression (≥ 7.0) | High — repair unchanged |
| **Biblical grounding** | No regression on forbidden checks / manual Sabbath sample | High — validator untouched |
| **shallowAckCount** | Decrease (It sounds like…) | Medium |

### Fail criteria (do not beta-enable)

- Listening delta **< +0.2**
- Any **doctrine validator** failure rate increase on Sabbath/dietary smoke
- Sabbath T7 listening **< 6.8**

---

## 6. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| ECP ignored like `listeningGuidance` | Place ECP **immediately after** person-first lines in **system** message; repeat `emotionalCenterHint` in **user** JSON |
| Over-literal “you mentioned X” | Rule forbids forced “you mentioned” |
| Doctrine drift | No change to `doctrineBoundaryValidator` or forbidden list |
| Sabbath meta turns get pastoral opener | ECP for meta = **wording/repair** center, not grief template |
| Regression on alz-3 / distant-3 HIGH turns | Compare per-thread; gate on no HIGH turn drop >0.5 |

---

## 7. Rollback

- Single flag off (`BUDDY_ECP` unset) restores current composer text.
- No schema or route changes.

---

## 8. Phase 2 (explicitly out of scope for ECP v1)

After ECP validation passes:

1. **Conditional RESPONSE STRUCTURE** — doctrine/history turns only (`BottomLineNecessityAudit.md` Part D).
2. **Discernment topic demotion** on job T1 — `retrievalEvidencePack` / `questionIntentResolver` (separate small PR).

Not part of this approval unless user expands scope.

---

## 9. Approval checklist

| Item | Status |
|------|--------|
| Bottom-line necessity audit complete | Done — `BottomLineNecessityAudit.md` |
| EC forensic audit complete | Done — `ComposerEmotionalCenterForensicAudit.md` |
| One controlled implementation selected | **ECP** |
| Code changes | **Awaiting explicit approval** |
| `EmotionalCenterPreservationReport.md` | **After validation run** |
| `docs/emotional-center-preservation/results.json` | **After validation run** |

---

## 10. Bottom-line alignment

| Priority | How ECP serves it |
|----------|-------------------|
| 1 Biblical truth | Validator unchanged; no doctrine removal |
| 2 Companion presence | Names EC before lecture shape |
| 3 Direct usefulness | Fear/questions (distant T3) still answered first when EC is the question |
| 4 Safety | Crisis/doctor paths unchanged |
| 5 Beta readiness | One flag, measurable A/B, rollback |

**Final state statement (plan):**

| Question | Planned outcome |
|----------|-----------------|
| Composer knows EC but ignores it? | ECP makes ignoring a **prompt-contract violation** (same channel that failed for soft listeningGuidance — mitigated by placement + user hint) |
| Composer never receives EC? | **Not the problem** — no retrieval change required |

**Confidence:** **High** on problem diagnosis; **Medium** on +0.4 from ECP alone; **High** on combining ECP + future STRUCTURE demotion for 7.0+.

---

*Plan only. No code committed. No deploy. No push.*
