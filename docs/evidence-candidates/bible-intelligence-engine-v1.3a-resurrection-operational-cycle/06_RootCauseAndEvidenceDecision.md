# 06 — Root Cause And Evidence Decision

## First incorrect stage
**DOCTRINE_CONTRACT** (`BASE_CONTRACTS.resurrection` in `services/doctrineAuthorityContract.js`)

Secondary effect: **EVIDENCE_ORDERING** — `composeDeterministicDoctrineReply` may present Gospel discovery packet witnesses instead of Rev 20 / 1 Thess chronology witnesses already available in catalog/card.

## Responsible existing owner
`services/doctrineAuthorityContract.js` → `BASE_CONTRACTS.resurrection`  
plus `services/doctrineFinalAuthorityEngine.js` → `buildFinalAuthorityAnswer` / `buildGenericFinalAnswer` / `composeDeterministicDoctrineReply`

## Why sufficient
1. Failure reproduced on production `72bd8df`
2. Needed witnesses already exist in `deathResurrectionKingdomCatalog` + `deathState.card`
3. First incorrect stage identified
4. One existing owner pair can carry the repair
5. Adjacent protected behavior known (Sabbath Direct-answer; death_state sleep for true death-state asks; Jesus personal resurrection timing ownership)
6. Tests + rollback definable
7. **No new component required**

## Internal decision

```
EVIDENCE_SUFFICIENT_FOR_REPAIR
```
