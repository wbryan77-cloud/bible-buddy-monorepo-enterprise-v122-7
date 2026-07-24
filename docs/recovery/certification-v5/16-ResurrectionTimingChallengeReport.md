# 16 — Resurrection Timing Challenge Report

## Defect (production, pre-repair)

Timing questions routed to `doctrine_final_authority` topic `resurrection` (hope/death-sleep) or OpenAI tradition answers that:
- treated Sunday morning rising as explicit Matthew 28 fact;
- answered “No” to “already risen when Mary arrived” contrary to Gospel discovery wording.

## Repair

1. `detectResurrectionTimelineTopic` — exclude timing from hope contract  
2. Live intercept in `openAiFirstCompanionRuntime` → `sourceGroundedResponder.resurrectionReply(message)`  
3. Claim-labeled direct answers (explicit / comparison / inference / silent)  
4. Silence branch for exact moment/clock time  

## Local validation

`scripts/runResurrectionTimingChallenge.js` → **8/8 PASS**  
`scripts/runFounderTruthCorpus.js` → **32/32 PASS** (includes D1/V1 silence)

Artifact: `16-ResurrectionTimingChallenge-local.txt`
