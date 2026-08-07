# EngineeringRetrospective.md

## Recurring failure addressed: AUDIT_WITHOUT_IMPLEMENTATION

Pattern observed across V1.3E–V1.4B:

evidence → proposed repair → local green → working tree / Markdown “READY” → production unchanged.

Concrete instance closed in V1.4C: Sabbath-history wire in `bibleCompanionOrchestrator.js` was local-only until commit `3f60eba` + deploy parity `/health.releaseCommit=3f60eba` + production behavior proof.

## Permanent prevention rules

1. Evidence sufficient → implementation decision required (implement, defer with reason, or block with reason).
2. Implemented locally → commit status required before calling complete.
3. Committed → deploy status required.
4. Deployed → production behavior proof required (`/health.releaseCommit` + same behavior family).
5. Reports may never certify an uncommitted repair as complete.
6. Every sprint ends with recommendation-to-production reconciliation.
7. Local green ≠ production green.
8. Working-tree code ≠ shipped code.

## What worked this closure

- Minimal staged file (`git add -- path` only).
- Optional hygiene deferred to keep blast radius small.
- SHA parity gate before claiming deploy success.
- Retrying flaky HTTP/2 timeouts without weakening tests.
