# Phase 5I Scripture-Anchored Response Plan Report

**Date:** 2026-06-14

## Function

`buildScriptureAnchoredResponsePlan({ message, concept, relationshipContext, memorySnapshot, companionIntent })`

Produces a plan before any companion wording is assembled.

## Plan Shape

| Field | Purpose |
|-------|---------|
| `answerType` | prayer, boundary, practical_guidance, emotional_support, doctrine_companion, memory, multi_prayer_verse |
| `witnessesRequired` | From `twoWitnessStandard.selectMinimumWitnesses` |
| `witnesses` | 0–3 refs from graph / contract |
| `companionOpening` | Human acknowledgment before Scripture |
| `practicalScriptNeeded` | Family/boundary script flag |
| `prayerNeeded` | Actual prayer required |
| `oneFollowUpQuestion` | Max one gentle follow-up |
| `nextLikelyNeeds` | 2–3 steps ahead from concept map |
| `forbiddenOutputs` | Padding, parable proof, false memory, hedging |

## Two-Witness Rules Applied

| Lane | Minimum witnesses |
|------|-------------------|
| New doctrine/moral | 2 when available |
| Continuation / why follow-up | 1 acceptable |
| Emotional support | 1 comfort verse |
| Prayer | 0 required; refs optional |
| Practical guidance | 0 required; refs when establishing principle |

## Builder Integration

`companionResponseBuilder.buildCompanionResponse(plan)` maps `answerType` to specialized builders without bypassing witness list.

## Regression Evidence

| Scenario | Plan type | Witness check |
|----------|-----------|---------------|
| Can we eat pork? | strict/bible_wide (doctrine authority) | 2+ PASS |
| Why after pork | doctrine_companion continuation | PASS |
| Sex strings | bible_wide new doctrine | 2+ PASS |
| Overwhelmed | emotional_support | 1 comfort PASS |
| Prayer | prayer | pray first PASS |
| Multi prayer + verse | multi_prayer_verse | PASS |

## Verdict

Scripture-anchored planning is **operational** with companion lane exceptions preserved.
