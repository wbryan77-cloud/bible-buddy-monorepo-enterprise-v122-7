# PHASE 6F — PART 17: FULL REGRESSION CLASSIFICATION

Generated: 2026-07-19

## Suites executed

| Suite | Result | Log |
|---|---|---|
| `scripts/alpha/scriptureFidelitySmoke.js` | PASS | `regression/scriptureFidelitySmoke.log` |
| `scripts/alpha/alphaCoreTruthSmoke.js` | PASS | `regression/alphaCoreTruthSmoke.log` |
| `scripts/runPhase5OContinuationRegression.js` | PASS | `regression/runPhase5OContinuationRegression.log` |
| `scripts/alpha/phase6dGovernedIngestionSmoke.js` | PASS | `regression/phase6dGovernedIngestionSmoke.log` |
| `scripts/alpha/phase6eTestMatrix.js` | PASS | `regression/phase6eTestMatrix.log` |
| `scripts/alpha/phase6ProductionAnswerLineageSmoke.js` | PASS | `regression/phase6ProductionAnswerLineageSmoke.log` |
| `scripts/alpha/phase6cHistoricalKnowledgeSmoke.js` | PASS | `regression/phase6cHistoricalKnowledgeSmoke.log` |
| `scripts/alpha/phase6fFounderAlphaE2E.js` (new, Part 17) | PASS 35/35 | `Part17-FounderAlphaE2E.json` |
| `scripts/openAiFirstRegressionTest.js` | 9/10 (1 fail) | `regression/openAiFirstRegressionTest.log` |
| `scripts/liveRuntimeVerification.js` | 1/6 (5 fail) | `regression/liveRuntimeVerification.log` |
| `scripts/alpha/decisionOwnershipSmoke.js` | 1/4 (3 fail) | `regression/decisionOwnershipSmoke.log` |

## Failure classification

### 1. `openAiFirstRegressionTest.js` — case `8_sabbath_definition`

- **Observed:** Message "How do we keep the Sabbath holy?" is routed to
  `doctrine_final_authority` (returns actual Exodus 20:8-11 / strict-doctrine
  Scripture) instead of the test's expected `reason_first_openai` route.
- **Classification: `OUTDATED_TEST_EXPECTATION`.**
- **Reason:** This test was written before the Scripture Authority Engine
  (Phase 5S) and doctrine-topic routing (Phase 5T/6) existed. At that time,
  every non-explicit-reference question fell through to OpenAI. The system
  now correctly recognizes Sabbath as a strict-doctrine topic and answers
  with governed, cited Scripture — which is the intended, safer behavior
  this whole implementation program was built to produce. Changing the
  runtime to satisfy this test would mean deliberately routing a doctrinal
  question away from Scripture and into free-form OpenAI text, which
  Phase 6F explicitly forbids ("Do not weaken Scripture authority").
- **Action taken:** None to runtime. Documented here; test expectation
  should be updated in a future test-maintenance batch, not this one.

### 2. `liveRuntimeVerification.js` — cases `t01, t02, t03, t04, t06`

- **Observed:** All five failing cases are doctrinal/topical questions
  (dietary law, Sabbath, "the Word"/Logos, heavens, etc.) that the test
  expects to be answered by a generic `openai` route, but which the live
  system now correctly answers through `doctrine_final_authority` or
  `bible_wide_reasoning` with real cited Scripture text.
- **Classification: `OUTDATED_TEST_EXPECTATION`.**
- **Reason:** Same root cause as above — this script predates the
  Scripture-first authority architecture. Its assertions encode the old
  ("everything through OpenAI") behavior as correct, which is precisely
  the behavior Phases 5S/5T/6 replaced with governed Scripture retrieval.
  The one case that does still assert doctrine-first routing (`t05` or
  equivalent) passes.
- **Action taken:** None to runtime. Confirmed by inspecting
  `regression/liveRuntimeVerification.log`: in each failing case the actual
  reply contains real KJV verse text and a named doctrine/authority route,
  not a hallucination or crash.

### 3. `decisionOwnershipSmoke.js` — cases `decision_single_word`,
   `decision_not_bible`, `help_me_decide`

- **Observed:** Ambiguous, single-sentence "decision" prompts route to
  `reason_first_openai` under the generic `open_life` / `next_steps`
  human-need classification instead of a dedicated "decision ownership"
  lane the test expects.
- **Classification: `UNCHANGED_PREEXISTING_FAILURE`.**
- **Reason:** This is the same intent-classification gap already
  identified and documented during Part 9 of this batch (OpenAI's
  human-need classifier does not have a distinct category for short,
  ambiguous decision-making prompts). It is not caused by any Phase 6F
  change — the same three cases failed before this batch's edits, on the
  same classifier. It is non-deterministic in the sense that it depends on
  OpenAI's classification of very short, low-context input, not on
  anything BibleBuddy's own routing code changed in Phase 6F.
- **Action taken:** None. Recommended follow-up (post-Alpha): add a
  dedicated `decision_ownership` human-need bucket to the intent
  classifier prompt/schema so short decision prompts route consistently.
  Not a Founder Alpha blocker — the responses returned are safe, warm,
  and biblically consistent; they are simply routed to the general
  life-companion lane rather than a specialized one.

## Conclusion

**Zero `PHASE6F_REGRESSION` findings.** All Phase 6F–authored functionality
(Parts 2–17) tests pass at 100%. All pre-existing suite failures are either
`OUTDATED_TEST_EXPECTATION` (test predates the Scripture Authority Engine
this program built) or `UNCHANGED_PREEXISTING_FAILURE` (pre-existing,
independently verified to be present before this batch's changes, safe,
non-doctrine-affecting).
