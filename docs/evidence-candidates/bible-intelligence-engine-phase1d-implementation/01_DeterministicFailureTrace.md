# 01 — Deterministic Failure Trace

## Probe

`Explain the Sabbath.` (strict doctrine route)

## Stage map

| Stage | File | Function | Message survives | VLP survives | Fixed prose |
|---|---|---|---|---|---|
| Current message | routes/buddy.js → buddyBrain | runBuddy | yes | n/a | no |
| Intent | currentMessageIntent / companionDoctrineRouter | planCompanionDoctrineRouting | yes | n/a | no |
| Doctrine route | strictDoctrineGate.js | runStrictDoctrineGate | yes | pack attached | no |
| Study Chain + Lesson + VLP | openAiFirstCompanionRuntime.js | attachVerifiedLessonPacketToEvidencePack | yes | **yes (nested)** | no |
| Doctrine decision | doctrineFinalAuthorityEngine.js | buildFinalAuthorityAnswer | partial | **ignored** | **YES — first incorrect** |
| Structured return | doctrineFinalAuthorityEngine.js | buildFinalAuthorityStructured | no (pre-1D) | no | template = reply |
| Delivery | openAiFirstCompanionRuntime.js | returnStrictDoctrineStructured | polish only | appendix only | no meaning rewrite |
| Final owner | liveResponseOwner / finalizeBuddyResponse | finalizeBuddyResponse | yes | n/a | readability |
| Formatter | polishFinalReply / directAnswerFormatter | polish | format | n/a | no doctrine rewrite |

## First incorrect stage (proven)

**`doctrineFinalAuthorityEngine.buildFinalAuthorityAnswer` → `buildGenericFinalAnswer`**

Evidence: reply begins `From the approved Scripture witnesses (...)` while VLP already exists on the pack and is unused for prose.

## Post-repair stage change

`buildFinalAuthorityStructured` calls subordinate `composeDeterministicDoctrineReply` with `{ evidencePack, message, userId }`. Decision fields remain authoritative; prose shaped from conclusion + current-message requirements + VLP witness ordering.
