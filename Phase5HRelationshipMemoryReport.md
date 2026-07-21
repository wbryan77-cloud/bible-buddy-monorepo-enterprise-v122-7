# Phase 5H Relationship Memory Report

**Date:** 2026-06-14  
**Store:** `data/relationship-memory.json` (companion context, not doctrine)

## Memory Types

### Session memory (conversation state + relationship file)
- Last struggle / emotional state  
- Last practical concern / family conversation context  
- Current doctrine topic (`lastAnsweredConcept` via doctrine conversation state)  
- Family conversation flag  

### User preference memory (`user-correction-memory.json`)
- Direct answers first  
- Yes/no direct  
- Forbid hedging phrases (`primarily`, `interpretations vary`)  
- Two witnesses when establishing doctrine (default preference)

### Learning candidate memory (`concept-growth-candidates.json`)
- Non-personal wording improvements only  
- Status: `pending_review` — no automatic doctrine mutation  

## User Controls

| Action | Handler | Behavior |
|--------|---------|----------|
| “Remember that I like direct answers” | `buildPreferenceAck` + `recordUserCorrection` | Stores preference; honest about scope |
| “What do you remember?” | `buildMemoryRecallReply` | Lists session + stored prefs honestly |
| “Forget what you remember” | `forgetUserMemory` | Clears relationship-memory user entry |
| Learning for others | `recordConceptLearningCandidate` | Pending review ack, no doctrine change |

## Honesty Rules

- Does not claim long-term memory unless preference actually stored  
- Session-only context described explicitly when no stored items  
- Sensitive personal details not stored by default (`PERSONAL_SENSITIVE_RE` gate)  

## Regression Evidence

| Test | Result |
|------|--------|
| Remember direct answers preference | PASS — ack + stored |
| Pork after preference | PASS — “No.” first |
| Nervous about family | PASS — recalls family context |
| Learning candidate for others | PASS — pending_review ack |
| Overwhelmed | PASS — warm support, no false memory claim |

## Gaps

- `forgetUserMemory` resets relationship file but not `user-correction-memory.json` in same call  
- No UI for user to inspect `pending_review` candidates  

## Verdict

Relationship memory **honest and user-controlled** for Phase 5H acceptance scope.
