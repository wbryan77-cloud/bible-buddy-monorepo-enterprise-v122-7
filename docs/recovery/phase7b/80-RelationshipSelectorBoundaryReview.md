# 80 — Relationship Selector Boundary Review

## Decision: **Preserved and reduced (pure adapter)**

| Must not | Pre-7B | Post-7B |
|---|---|---|
| Persist memory | FAIL (`notePersonalRemember`) | PASS — removed; orchestrator → `recordRelationshipSignal` |
| Route independently | Soft RISK (detectors) | Acceptable — detectors only; orchestrator owns exits |
| Compose final responses | Soft (`companionRememberAck`) | Allowed as shared copy helper, not a composer path |
| Override current message | PASS | PASS |
| Invent relationship info | Vague “the” FAIL | PASS — stopwords + clarifier |

## Allowed

Normalize/rank fields, confidence enums, provenance, compact burdens — **yes**.

## Tests

`scripts/runPhase7BRelationalIntegrityRegression.js` covers extract, vague clarifier, short/no-advice.
