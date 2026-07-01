# Phase 5F — Word-Sense Safety Report

**Date:** 2026-06-14

## Purpose

`bibleWordSenseEngine.js` maps user wording to concepts using BNC aliases, concept graph, and context — **not** doctrine authority.

## Safety Rules

| Rule | Implementation |
|------|----------------|
| No internet lookup | Local BNC + graph only |
| No OpenAI for doctrine | Word-sense runs before OpenAI |
| No doctrine without witnesses | `rejectUnsafeWordSenseMatch` checks graph witnesses |
| Min confidence threshold | Score ≥ 0.62 required |
| Bare continuation skip | `"show me another verse"` → no word-sense match |
| Context-required senses | sed/sex, seed/Onan, Daniel/abomination |

## Example Mappings

| Input | Sense | Guard |
|-------|-------|-------|
| `sed` + dating context | `fornication_sexual_sin` | Witnesses required |
| seed spilled + Genesis 38 | `onan_seed_context` | No contraception overclaim |
| Daniel alone | ambiguous → clarifier | No auto abomination |
| heaven + coming to earth | `kingdom_on_earth` | Not `third_heaven` |
| person? after abomination | actor/event follow-up | Context from `lastAnsweredConcept` |

## Forbidden Behaviors

- Word-sense cannot promote evidence cards or doctrine packs
- Low-score matches (e.g. `verse` → sabbath at 0.5) rejected
- Bare continuation phrases never get word-sense promotion to strict topic

## Integration

Word-sense runs in orchestrator preflight **before** contract classification, but bare continuation without context bypasses false positive promotion in `classifyTurnContract`.

## Regression Coverage

Phase 5F tests 7 (sed), 8 (seed), 4 (pork→abomination), 6 (person?) — all pass.

## Safe for Controlled Deploy

**Yes** — word-sense is a language bridge with witness and confidence gates.
