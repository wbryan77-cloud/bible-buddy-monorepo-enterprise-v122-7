# 66 — Relationship Context Contract

Implemented as return shape of `selectRelationshipContext` (not a parallel full object store).

Schema artifact: `fixtures/relationship-context.schema.json`

## Fields (all optional)

- `personIdentity` — displayName + confidence
- `importantPeople[]` — label, confidence, source
- `activeBurdens[]` — text, confidence, source
- `prayerContext` — lastRequest, subjectFromMessage, confidence
- `emotionalContext`
- `relevantPreferences`
- `ongoingTopics` — lastUserMessage, lastRoute, conversationObjective
- `familyConversationContext`
- `suggestedCareAction` (reserved; usually null)
- `_meta.selector`, `_meta.noNewStore`

## Distinctions

| Scope | Confidence enum |
|---|---|
| Current turn extract | `CURRENT_TURN` |
| Active conversation / struggle | `CURRENT_CONVERSATION` |
| Prior lastPrayer / cont | `CURRENT_CONVERSATION` / `RECENT_CONVERSATION` |
| Prefs | `PERSISTENT_USER_MEMORY` |
| Uncertain | `POSSIBLE_RECALL` |
| None | `UNKNOWN` |

Absence ⇒ no confabulation. Current message always wins over remembered detail.
