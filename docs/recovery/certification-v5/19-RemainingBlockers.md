# 19 — Remaining Blockers

| ID | Pri | Blocker | Reproduction | Root cause | Components | Next repair | Effort |
|---|---|---|---|---|---|---|
| V5-R1 | P1 | Universal claim verifier not enforced on all doctrine answers | Module exists; not in finalize path for every biblical reply | Partial implementation | `universalClaimVerifier.js`, finalize | Call once pre-finalize; one revision max | S–M |
| V5-R2 | P1 | IOG per-answer utilization telemetry incomplete | Matrix shows inventory+wiring; no turn-level “used excerpt” log | No production contribution logger | scriptureAuthorityEngine, learning log | Log xref IDs when appended | S |
| V5-R3 | P1 | Dual continuation lanes (owner vs phase5O dead block) | Code inspection | Ordered duplicate | bibleCompanionOrchestrator | Remove/disable phase5O block | S |
| V5-R4 | P1 | OpenAI outage drill incomplete | No staging injection this cycle | Time/safety | responseGuarantee, openAiFirst | Protected harness | S–M |
| V5-R5 | P1 | UI parity not automated | API-only | Scope | `/`, `/alpha`, clients | Browser corpus replay | S–M |
| V5-R6 | P1 | Forget does not clear continuation/doctrine stores | Ask forget; continuation remains | Incomplete forgetMemory | companionMemoryManager | Extend forget scopes carefully | M |
| V5-R7 | P1 | Long-conversation 25/50/100-turn matrix not run | Not executed | Scope | memory layers | Run matrix script | M |
| V5-R8 | P1 | Historical inventory not exhaustive of every artifact | 32+resurrection suite | Incomplete Stage 1 | docs/scripts | Expand inventory from Alpha guides | M |

## Closed locally (deploy for production proof)

| ID | Defect | Repair |
|---|---|---|
| V5-C1 | Resurrection timing wrong topic / tradition | sourceGrounded live intercept |
| V5-C2 | Go deeper → Acts 10 dump | responseRevisionOwner context |
| V5-C3 | Exact-moment silence misrouted | silence branch in resurrectionReply |
