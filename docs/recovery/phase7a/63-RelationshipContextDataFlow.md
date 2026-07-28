# 63 — Relationship Context Data-Flow

## Field matrix

| Field | Origin | Store | Consent | Confidence | Retrieval | Composer / care use | Drop risk (pre-7A) |
|---|---|---|---|---|---|---|---|
| User name | Message / return OpenAI | Cont./active | Soft | CURRENT_TURN / POSSIBLE | Active + OpenAI | Return greeting | OK on return; uneven elsewhere |
| Important people (dad, Maya) | Message extract | Selector + lastPrayer | Implicit in ask | CURRENT_TURN | `extractPrayerSubjectFromMessage` | Prayer focus | **Dropped in prayer template** |
| Burdens | Share / remember | `currentStruggle` | Remember path | CONV / PERSISTENT | rel engine | Prayer, recall | Stored but unused in prayer |
| Prayer subjects | Pray turns | `lastPrayerRequest` | Implicit | CONV | rel engine | Pray again | Stored; unused on pray-again |
| Preferences | Explicit style | prefs | Explicit | PERSISTENT | rel engine | Recall (was over-prioritized) | Dominated recall |
| Outstanding questions | Continuation | cont memory | n/a | CONV | cont | Continuation | OK |
| Emotional context | Active + message | active / signals | n/a | CONV | selector | Presence | Missed → verse dump |
| Learning candidates | BNC ingest | reflection | Admin | n/a | learningAck | **Must not** enter chat | Surfaced as admin voice |
| Forget | User request | forgetUserMemory | Explicit | — | — | Natural ack | — |

## Drop points confirmed (Cases 1–6)

1. Prayer: `buildPrayerCompanionResponse({ message, anchor })` without userId/context → generic “steady my heart”.
2. Remember: `ingested.learningAck` returned verbatim.
3. Recall: pref-first ordering in `buildMemoryRecallReply` / summary.
4. Pray again: `detectRevisionRequest` short-word `\bagain\b`.
5. Celebration: bible_wide / doctrine before presence.
6. Return: OpenAI path had continuity; care lanes did not share selector → systemic gap.

## Post-7A flow

`selectRelationshipContext({ userId, message })` → prayer / recall / presence consumers. No second store.
