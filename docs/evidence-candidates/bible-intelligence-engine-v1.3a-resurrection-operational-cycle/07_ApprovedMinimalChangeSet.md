# 07 — Approved Minimal Change Set

**Founder decision:** APPROVE (Cursor session)  
**Checkpoint:** `APPROVAL_CHECKPOINT.json`  
**Baseline SHA:** `72bd8df`

## Behavior family
`resurrection_chronology`

## First incorrect stage
`DOCTRINE_CONTRACT` (primary)  
Secondary: topic boundary for “rest of the dead” / “resurrection chronology” misrouted to `death_state` or Jesus-timeline null-route.

## Owners
| File | Function / symbol | Change |
|---|---|---|
| `services/doctrineAuthorityContract.js` | `BASE_CONTRACTS.resurrection` | Add governed Rev 20 / John 5 witnesses; chronology-capable `requiredConclusion` |
| `services/doctrineFinalAuthorityEngine.js` | `buildResurrectionFinalAnswer`, `buildFinalAuthorityAnswer`, `pickWitnessPresentation` | Message-focused chronology conclusions; prefer contract witnesses over Gospel discovery packet refs for chronology asks |
| `services/doctrineTopicDetector.js` | `detectDeathStateTopic`, `detectResurrectionTimelineTopic`, `detectStrictTopicFromMessage` | Smallest boundary: chronology phrases → `resurrection`, not death_state / Jesus-timeline |

## Current → required
| Ask | Current | Required |
|---|---|---|
| First resurrection (God’s people) | Generic hope + Gospel witnesses | Direct chronology: first resurrection / reign witnesses (Rev 20, 1 Thess 4, …) |
| Rest of the dead | death_state sleep | Rev 20:5 rest-of-dead chronology |
| Count / short chronology | Jesus+future or Gospel timing hijack | Distinguish Jesus’ resurrection from first/second saint chronology without hard-coded Founder wording |

## Non-goals
No new runtime, prompt layer, doctrine invention, Scripture mutation, hard-coded Founder answers, death_state sleep regression, Jesus personal-resurrection timing regression, Sabbath regression.

## Rollback
`git revert <impl-sha>`
