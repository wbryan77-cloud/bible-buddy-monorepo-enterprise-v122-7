# Phase 5E — False Doctrine Safety Report

**Date:** 2026-06-14  
**Gate:** `services/bncSafetyValidator.js`

## Core Rule

The BNC is a **language bridge**, not doctrine authority. It may suggest concept matches; it may not declare doctrine true without Scripture witnesses.

## Safety Rules — Implementation Status

| Rule | Implementation | Test |
|------|----------------|------|
| 1. No BNC answer without Scripture witnesses | `requireWitnessMinimum` + `validateBncAnswer` | 5E tests 1–10 |
| 2. New synonyms pending_review only | `recordConceptLearningCandidate` status | 5E test 11 |
| 3. No auto-promote evidence/doctrine/witness | Builder writes generated JSON only; no registry writes | Asset audit |
| 4. Low confidence → clarifying question | `buildClarificationReply` in orchestrator | 5E test 16 |
| 5. Strict doctrine wins BNC conflict | `validateConceptMatch` strict_topic_conflict | 4H strict lanes |
| 6. 2+ witnesses when available | `requireWitnessMinimum` min=2 | 5E sexual/boundary tests |
| 7. No parable as primary doctrine proof | `detectParableAsPrimaryProof` | Validator export |
| 8. No "interpretations vary" / "primarily" | `detectForbiddenSpeculation` | 4H noHedge checks |
| 9. Do not answer beyond witnesses | `blockIfUnsupportedDoctrine` | Wide engine + formatter |
| 10. Sensitive doctrine: "Scripture shows…" | Direct answer formatter + graph directAnswer | 5E abomination tests |

## Validator Exports

- `validateConceptMatch({ message, concept, witnesses, strictTopic })`
- `validateBncAnswer({ reply, concept, witnesses, source })`
- `blockIfUnsupportedDoctrine(reply)`
- `requireWitnessMinimum(concept, witnesses)`
- `detectForbiddenSpeculation(reply)`
- `detectParableAsPrimaryProof(reply)`

## Critical Example Verification

| Input | Concept | Witnesses used | Dietary leak? |
|-------|---------|----------------|---------------|
| abomination of desalation | abomination_desolation | Daniel 9:27, Matthew 24:15 | **No** |
| sex / sed / premarital | fornication_sexual_sin | 1 Cor 6:18, 1 Thess 4:3-5, Heb 13:4 | **No** |
| heaven coming to earth | kingdom_on_earth | Matt 6:10, Rev 21:1-3, etc. | **No** (no third_heaven drift) |
| pork / swine | dietary_pork_unclean | Lev 11, Deut 14 | **No** abomination bleed |

## Learning Candidate Safety

When user requests database save:
- Reply: *"Yes. I can save that as a learning candidate for review… I will not automatically change doctrine authority without review."*
- Candidate stored with `status: "pending_review"`
- **No** write to approved-doctrine-registry or evidence cards

## Stale Topic Safety

Strong new concept clears old topic before answer. Strict-doctrine transitions record `previousDoctrineTopic` + `topicHistory` without false dietary recall on abomination questions.

## What BNC Cannot Do

- Promote evidence cards to approved
- Alter doctrine pack conclusions
- Modify witness chain order or labels
- Bypass `strictDoctrineGate` for strict topics
- Auto-approve `concept-growth-candidates.json` entries

## Regression Safety Summary

| Suite | Pass | False-doctrine risk |
|-------|------|-------------------|
| Phase 5E | 18/18 | None detected |
| Phase 4H | 28/28 | Hedge phrases blocked |
| Phase 4O | 12/12 | Witness continuity |
| Phase 4M | 15/15 | Routing isolation |

## Remaining Safety Risks

1. **Deploy skew** — production missing modules could still surface generic fallback (not false doctrine, but poor witness display)
2. **Human review queue** — pending_review candidates need periodic review; no auto-expiry
3. **OpenAI path** — when OpenAI enabled, final polish must stay within witness envelope (existing finality contract applies)

## Safe for Controlled Deploy

**Yes** — false-doctrine safety gate is in place; BNC cannot become doctrine authority without human review and existing strict lanes.
