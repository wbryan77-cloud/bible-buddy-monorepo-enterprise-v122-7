# 62 — Relationship Ownership Map

## Canonical owners (post Phase 7A)

| Concern | Authoritative owner | Must not own |
|---|---|---|
| Current message intent | `humanNeedDetector` / intent on runtime context | Revision, learning ack |
| Active conversation state | `activeConversationManager` | New conversation engine |
| Session continuation | `conversationContinuationMemory` | Parallel session store |
| Durable prefs / struggle / last prayer | `relationshipMemoryEngine` | New memory DB |
| Learning candidates (BNC/admin) | `reflectionMemoryEngine` | Companion personal remember UX |
| Personal remember / forget UX | `bibleCompanionOrchestrator` early exit + `relationshipContextSelector` | Learning ACK |
| Care context assembly | `relationshipContextSelector` (adapter) | Persistence |
| Prayer composition | `prayerCompanionEngine` | Revision menus |
| Recall wording | `relationshipSummaryEngine` | Preference-only dump when person context exists |
| Revision / deepen | `responseRevisionOwner` | Prayer intent |
| Presence / celebration | Orchestrator celebration lane | Immediate bible_wide dump |
| Final polish | `companionReplyPolish` | — |
| Quality / opportunity | `scoreCompanionQuality` | Separate scoring framework |

## Call graph (care)

```
message
  → personal remember? → companionRememberAck + notePersonalRemember
  → revision? (blocked if prayer) → responseRevisionOwner
  → humanNeed prayer? → buildPrayerCompanionResponse(userId)
  → recall? → formatRecallReply / buildMemoryRecallReply
  → celebration/presence? → companion_celebration_presence
  → else existing lanes (bible_wide, OpenAI, …)
```

Machine-readable: `fixtures/ownership-matrix.json`
