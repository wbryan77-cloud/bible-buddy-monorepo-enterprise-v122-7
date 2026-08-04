# 08 — Phase 1D Readiness

## Bottleneck still exists?

**YES.**

> Deterministic doctrine routes consume fixed prose instead of composing from the Verified Lesson Packet.

### Exact locus

| Field | Value |
|---|---|
| Runtime owner | `doctrineFinalAuthorityEngine` (decision + template prose) |
| Delivery owner | `openAiFirstCompanionRuntime.returnStrictDoctrineStructured` / `returnBibleWideStructured` |
| File | `services/doctrineFinalAuthorityEngine.js` |
| Function | `buildFinalAuthorityAnswer` |
| First incorrect stage | Composition — after VLP attach, early return uses template reply before composer |
| Evidence | Production Q2 reply begins `From the approved Scripture witnesses...` identical class to local deterministic path |

## Smallest evidence-backed plan (DO NOT IMPLEMENT YET)

1. Keep `requiredConclusion`, witnesses, forbidden phrases as immutable decision object.
2. Add subordinate `composeDeterministicDoctrineReply({ decision, packet, message, history })` — not a new engine.
3. Call from `returnStrictDoctrineStructured` / bible_wide return only.
4. Tests: follow-up wording changes; conclusion stable; forbidden phrases held; no AUTO_APPROVE change.

## Books

Remain evidence-blocked (INDEXED_ONLY / EDITION_UNRESOLVED) — not a Phase 1D code repair target until Admin/lawful bodies exist.

## Readiness

**PHASE_1D_READY** for Defect D1 implementation after this parity baseline.
