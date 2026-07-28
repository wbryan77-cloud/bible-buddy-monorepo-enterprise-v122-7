# 22 — Historical Validation (Phase 6Y)

## Pre-repair FAIL

WHO-changed Sabbath → doctrine template (no history).

## Post-repair (`c12eee2`)

| Probe | Route | Has history content | Doctrine template | Pass |
|---|---|---|---|---|
| Who changed Sabbath historically? | reason_first_openai | Yes | No | PASS |
| Who changed Sabbath? | reason_first_openai | Yes | No | PASS |
| Historical evidence Sat→Sun | reason_first_openai | Yes | No | PASS |
| Is seventh day Sabbath? (control) | doctrine_final_authority | No | Yes (correct) | PASS |

## Category separation

| Category | Observed |
|---|---|
| Explicit Scripture | Preserved on doctrine/Sabbath WHAT questions |
| Historical Context | Present in content; **heading label intermittent** (P2) |
| Inference / Opinion | Softly present in early-Christian practice narrative |

## Residual

Enforce consistent “Historical Context” / “What Scripture Explicitly Says” headings on history-causation OpenAI replies — next smallest sprint if Founder requires stricter labeling.
