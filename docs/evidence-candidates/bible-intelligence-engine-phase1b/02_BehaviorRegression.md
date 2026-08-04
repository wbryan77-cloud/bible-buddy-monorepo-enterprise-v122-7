# 02 — Behavior Regression (BIE Phase 1B)

## Method

- PASS A restored production HEAD copies of the three adapter files only (temporary).
- PASS B used working-tree adapter.
- No Lesson Engine / governance / prompt / schema edits.

## Regressions detected

- None meeting regression criteria (no hallucination increase, no empty B replies, no new service failures).

## Frozen-layer spot check

| Layer | Status |
|---|---|
| Adapter-only files touched for experiment | Temporary swap only; restored after PASS A |
| Lesson Engine source | Not modified |
| Study Chain source | Not modified |
| Packet schema | Not modified |
| Governance enums | Not modified |

## Determinism samples (Q2, Q3)

- Pass A Q2: identicalNormalized=YES (OpenAI stochasticity expected when openAiCalled=true)
- Pass A Q3: identicalNormalized=YES (OpenAI stochasticity expected when openAiCalled=true)
- Pass B Q2: identicalNormalized=YES (OpenAI stochasticity expected when openAiCalled=true)
- Pass B Q3: identicalNormalized=YES (OpenAI stochasticity expected when openAiCalled=true)

## Notes

OpenAI-authored replies are not byte-stable across runs; determinism failures on OpenAI paths are **not** counted as adapter regressions unless content safety/hallucination worsens.
