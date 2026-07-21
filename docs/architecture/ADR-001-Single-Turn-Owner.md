# ADR-001 — Single Turn Owner

## Status

Accepted and permanent.

## Decision

Each user turn has one routing owner.

A component may own, delegate, or release a turn. It may not partially answer
while another component independently answers the same turn.

## Required order

1. Conversation and turn intent
2. Authority-domain ownership
3. Specialist execution
4. Optional composition
5. Final response ownership

## Prohibited

- Competing live runtimes
- Multiple final-answer authors
- Parallel user-visible fallbacks
- Memory or enrichment before the direct answer
- Adding a new owner to solve an ownership conflict
