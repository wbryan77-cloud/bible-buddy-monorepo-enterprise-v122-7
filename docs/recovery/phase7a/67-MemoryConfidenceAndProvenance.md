# 67 — Memory Confidence and Provenance

## Levels (selector + engines)

`CURRENT_TURN` · `CURRENT_CONVERSATION` · `RECENT_CONVERSATION` · `PERSISTENT_USER_MEMORY` · `POSSIBLE_RECALL` · `UNKNOWN`

## Provenance sources observed

- `message` / `message_kinship`
- `relationshipMemoryEngine.currentStruggle`
- `relationshipMemoryEngine.lastPrayerRequest`
- `activeConversation.emotionalContext`
- `conversationContinuationMemory`

## User-facing rule

Never expose confidence enums, store names, or review queues. Natural language only:

- “you shared…”
- “you asked prayer…”
- “I don’t invent…”
- “Would you like me to remember…” (when appropriate)

## Selection

Prayer prefers CURRENT_TURN person; pray-again may rehydrate from `lastPrayerRequest`. Low confidence ⇒ ask, don’t assert.
