# 04 — Proposed Minimal Change Set

## Defect D1

| Field | Value |
|---|---|
| Proven defect | Deterministic doctrine routes return fixed template prose; VLP/current-message do not shape composition |
| Reproduction | `Explain the Sabbath.` → `From the approved Scripture witnesses...`; brief/follow-up variants get the same stamp |
| First incorrect stage | `buildFinalAuthorityAnswer` / `buildFinalAuthorityStructured` — final `reply` authored before composer; VLP unused |
| Doctrine decision owner | `doctrineFinalAuthorityEngine` (unchanged) |
| Composition repair owner | subordinate `composeDeterministicDoctrineReply` in same module |
| Delivery | `buildFinalAuthorityStructured` + existing `returnStrictDoctrineStructured` → `finalizeBuddyResponse` |
| Exact files | `services/doctrineFinalAuthorityEngine.js`, `services/strictDoctrineGate.js`, `services/openAiFirstCompanionRuntime.js` (call-site opts only) |
| Current behavior | Template `reply` is final prose |
| Intended behavior | Decision fields (conclusion/witnesses/forbidden) remain authoritative; contextual reply composed from decision + current message + VLP roles/blocks; no OpenAI doctrine reasoning |
| Smallest repair | Add decision contract + `composeDeterministicDoctrineReply`; wire into `buildFinalAuthorityStructured` |
| Tests | focused deterministic VLP composition + existing 51 regressions |
| Risks | Over-shortening; must keep conclusion substring present; forbidden phrases intact |
| Rollback | revert the three files |
| Schema | additive `doctrineDecision` on structured only — packet schema unchanged |
| Governance | no AUTO_APPROVE change; `noDoctrineReasoning` retained |

## Explicitly out of scope

- New composer/engine/runtime
- Book activation
- Stash application
- Prompt redesign
