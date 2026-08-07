# EngineeringRetrospective.md

## Recurring failure closed: AUDIT_WITHOUT_IMPLEMENTATION

Across V1.3E–V1.4B, verified repairs often stopped at local green / Markdown “READY” without commit+deploy+production proof.

Closed instances:
- Sabbath-history orchestrator wire → `3f60eba` deployed + production owner proof
- Runtime hygiene / orphan deletes → `773bff8` deployed
- Admin parity → V1.3K secure local proof (ops), not another agent-env loop

## Permanent prevention rules

1. Evidence sufficient → implement, defer-with-reason, or block-with-reason.
2. Implemented locally → commit status required.
3. Committed → deploy status required.
4. Deployed → `/health.releaseCommit` parity + behavior proof.
5. Reports never certify uncommitted repairs as complete.
6. Every sprint ends with recommendation→production reconciliation.
7. Local green ≠ production green.
8. Working-tree code ≠ shipped code.
9. Admin lifecycle engineering can be complete while **operator certification** remains — do not invent routes to satisfy mutation probes.

## V1.6 sprint closure

Repository production code has **no** evidence-qualified implementation gaps. HEAD = origin/main = production `a7e02ae`. Remaining Admin lifecycle work is operational certification on real records, not engineering.
