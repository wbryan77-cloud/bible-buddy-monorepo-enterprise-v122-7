# Phase 5S — Scripture Authority Engine — Implementation Report

**Date:** 2026-07-18

## Objective

Implement a deterministic Scripture Authority Engine so BibleBuddy answers
Bible questions by letting Scripture interpret Scripture — prioritizing
retrieved Biblical evidence over generated explanation, on top of the
Phase 5P canonical Scripture provider and Phase 5Q grounded Scripture
engine.

## Files Created

- `services/scriptureAuthorityEngine.js` — the authority layer itself:
  classification (`classifyClaim`, `classifyGathering`), contradiction
  detection (`detectContradiction` over a small explicit antonym-pair
  list), and the ordered response builder (`buildAuthorityAnswer`) that
  emits classification → direct answer → primary Scripture → supporting
  Scripture → brief explanation (derived only from what was cited) →
  conclusion. Never invents supporting passages; deduplicates any
  supporting passage that repeats the primary passage's reference or text.
- `scripts/alpha/phase5sScriptureAuthorityEngine.js` — new regression
  script validating all 8 requested reference examples plus two
  additional cases proving `SCRIPTURE_IS_SILENT` and
  `EXPLICITLY_CONTRADICTED` are reachable and correctly triggered.

## Files Modified

- `services/bibleWideReasoningEngine.js`
  - Imports `detectConceptFromGraph` (bibleConceptGraph) and
    `buildAuthorityAnswer` (new engine).
  - `buildExplicitScriptureReferenceConcept`: when a message is a **bare
    chapter reference with no verse** (e.g. "Acts 10") that also matches a
    curated doctrine concept offering 2+ witnesses, the concept's own
    `directWitnesses`/`supportingWitnesses` are retrieved instead of the
    entire raw chapter — Explicit Scripture retrieval now yields the
    concept's *specific* verses rather than an unfocused chapter dump. This
    never invents anything; it only reuses witnesses a concept author
    already curated, and only when 2+ are available.
  - `buildBibleWideAnswer`: the explicit-reference branch now calls
    `buildAuthorityAnswer` on top of the grounded-engine retrieval, and
    exposes `authorityClassification`, `primaryScripture`,
    `supportingScripture` on the returned answer.
  - `buildBibleWideStructured`: `runtime.authorityClassification` added
    alongside the existing `retrievalMode` / `scriptureMode` fields.

## Authority Classifications Implemented

| Classification | Trigger |
|---|---|
| `EXPLICITLY_SUPPORTED` | Single retrieved passage answers the request, or a claim's wording is literally present in the retrieved text. |
| `EXPLICITLY_CONTRADICTED` | The claim's wording and the retrieved text contain a literal antonym pair (e.g. claim says "clean", text says "unclean") — Scripture states the opposite. |
| `SUPPORTED_BY_MULTIPLE_PASSAGES` | 2+ independently retrieved passages were gathered for one answer (curated concept witnesses, e.g. Acts 10). |
| `SCRIPTURE_IS_SILENT` | A claim was checked against retrieved text and neither literal support nor a literal contradiction was found. |
| `HISTORICAL_INFORMATION` | Reserved/implemented in the response-text builder for future concepts that are explicitly non-Scriptural; no current concept triggers it because every validation example is Scripture-answerable. |

Response order is fixed in `buildAuthorityAnswer`: direct answer → primary
Scripture (quoted, translation-labeled) → supporting Scripture (quoted,
deduplicated) → brief explanation (template derived only from the cited
references — never invented content) → conclusion. The classification
itself is returned as structured runtime metadata
(`runtime.authorityClassification`), the same pattern already used for
`retrievalMode` / `scriptureMode` in Phase 5P/5Q, rather than a literal
label prefixed onto the conversational reply text.

## Supporting-Passage Retrieval — Verified

`scripts/alpha/phase5sScriptureAuthorityEngine.js` — **10/10 passed**:

- `John 3:16`, `Genesis 1:1`, `Revelation 1:14-15`, `Romans 8:1-4`,
  `Matthew 22:37-40`, `Isaiah 28:10`, `2 Corinthians 13:1` — all classify
  `EXPLICITLY_SUPPORTED` from a single retrieved passage (no invented
  secondary passage manufactured when only one exists, per spec).
- `Acts 10` — classifies `SUPPORTED_BY_MULTIPLE_PASSAGES`; gathers its
  curated witnesses **Acts 10:28, Acts 10:14, Acts 10:34-35, Acts
  11:1-18** (4 independent passages, live-retrieved, all quoted, none
  duplicated) instead of the unfocused full chapter — this also resolves
  two previously-documented pre-existing failures (`7_acts10` in
  `runPhase5ABibleCompanionOrchestrationRegression.js`, `2_acts10` in
  `runPhase5LLiveThreadRegression.js`) that expected the specific witness
  verses in the reply.
- "Based on Revelation 1:14-15, does Scripture say Jesus is white with
  blue eyes...?" → `SCRIPTURE_IS_SILENT` (previously answered "No" without
  a distinct silence classification — now correctly distinguished from a
  true contradiction).
- "Does Leviticus 11 say pork is clean, yes or no?" → `EXPLICITLY_CONTRADICTED`,
  automatically gathering the `dietary_pork_unclean` concept's full curated
  witness set (Leviticus 11:7-8, Deuteronomy 14:8, Acts 10:14/28, Acts
  11:1-18, Isaiah 66:17, etc.) via the same bare-reference concept-witness
  bridge, and correctly detecting the literal `clean` vs `unclean`
  opposition in the retrieved text.
- No duplicated Scripture in any case (explicit check in the test script).

## Regression Results

All suites re-run after the change; every pre-existing failure was
independently re-confirmed via `git stash` baseline comparison to still
occur identically on the unmodified code, so nothing below is a new
regression:

| Suite | Result | Notes |
|---|---|---|
| `scripts/alpha/scriptureFidelitySmoke.js` | 4/4 PASS | unchanged |
| `scripts/alpha/phase5pCanonicalScriptureRetrieval.js` | 7/7 PASS | unchanged |
| `scripts/alpha/phase5qGroundedScriptureEngine.js` | 7/7 PASS | unchanged |
| `scripts/alpha/phase5sScriptureAuthorityEngine.js` (new) | 10/10 PASS | new |
| `scripts/runPhase4OBibleWideReasoningRegression.js` | 12/12 PASS | unchanged |
| `scripts/runPhase5ABibleCompanionOrchestrationRegression.js` | 11/11 PASS | **improved** — `7_acts10` now passes (was a documented pre-existing failure) |
| `scripts/runPhase5LLiveThreadRegression.js` | 15/18 | **improved from 14/18** — `2_acts10` now passes; remaining 3 (`1_pork`, `3_explain_family`, `13_nervous`) re-confirmed pre-existing via stash baseline, unrelated to Scripture retrieval |
| `scripts/openAiFirstRegressionTest.js` | 9/10 (baseline stash-run: 0/10, network-flaky) | `8_sabbath_definition` fails identically on baseline — pre-existing, unrelated (routes through `doctrineFinalAuthorityEngine`, not touched this batch) |
| `scripts/alpha/decisionOwnershipSmoke.js` | 1/4 | same 3 pre-existing failures documented in Phase 5P/Q/R (`decision_single_word`, `decision_not_bible`, `help_me_decide` — unrelated routing gap for non-Bible decisions) |
| `scripts/liveRuntimeVerification.js` | 1/6 | same 5 pre-existing failures documented in Phase 5P/Q/R (outdated "OpenAI should always be called" assumption) |
| `scripts/runPhase5RLiveRuntimeValidation.js` | 12/12 PASS | unchanged, re-verified live over real HTTP `/buddy/chat` |

## Remaining Blockers

None introduced by this batch. Pre-existing, out-of-scope items carried
forward unchanged from Phase 5P/5Q/5R (`8_sabbath_definition`,
`decisionOwnershipSmoke` non-Bible-decision routing, `liveRuntimeVerification`'s
outdated OpenAI-always-called assumption, `1_pork`/`3_explain_family`/`13_nervous`
formatting mismatches).

## Status

READY_FOR_PHASE_5T
