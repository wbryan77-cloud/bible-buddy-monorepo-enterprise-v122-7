# 65 — Existing-System-First Design Decision

## Option evaluation

| Option | Verdict |
|---|---|
| 1 Strengthen active conversation + composer | Helpful but insufficient alone (prayer/revision/learning early exits bypass composer) |
| 2 Strengthen memory retrieval ranking | Needed for recall; not enough for prayer/admin |
| 3 Strengthen orchestration contract so care lanes share context | **Primary** |
| 4 Small shared relationship-context adapter | **Approved** — `relationshipContextSelector.js` |
| 5 New Relationship Engine / DB | **Rejected** — fails new-component gate |

## Decision

**Option 3 + Option 4:** Orchestrator wiring + thin selector over existing stores.

### Why selector is allowed

1. No single owner safely assembled care-relevant fields without coupling prayer↔memory↔active conversation.
2. Narrow responsibility: select + classify confidence; **no persistence**.
3. Evidence: Cases 1–6.
4. Does not parallel memory, conversation, routing, or composition.

### What changes

- `relationshipContextSelector.js` (adapter)
- `prayerCompanionEngine`, `humanNeedDetector`, `responseRevisionOwner`
- Orchestrator: personal remember, prayer `userId`, celebration presence
- `relationshipSummaryEngine`, `relationshipMemoryEngine` recall order
- `companionReplyPolish`, style/contract LEARNING_ACK fallbacks
- `scoreCompanionQuality.opportunityQuality`

### Frozen

Runtime ownership, OpenAI-first authority, Scripture retrieval, claim verifier, auth, streaming, doctrine pipelines — extend only.

### Why smaller/safer than a new engine

Touches existing early exits that already owned the failing turns; no second write path; regressions map 1:1 to cases.
