# 61 — Existing Relationship Capability Inventory

**Date:** 2026-07-28  
**Mode:** Evidence-driven, production-safe audit before modification.

## Live production path (authoritative)

`POST /buddy/chat` → `buddyBrain` → `openAiFirstCompanionRuntime` → `bibleCompanionOrchestrator` → finalize (`companionReplyPolish`, `scoreCompanionQuality`).

Case repro baseline (prod `6a0da9e`): `logs/00-case-repro.jsonl`.

## Component inventory

| Component | Responsibility | Owner | Active prod? | Disposition |
|---|---|---|---|---|
| `activeConversationManager` | Session conversation objective / emotional context | Conversation | Yes | Preserve; feed selector |
| `semanticUnderstandingSnapshot` | Multi-part / semantic fields on evidence pack | Runtime | Yes | Unchanged (6X) |
| `currentMessageIntent` / `humanNeedDetector` | Current-turn need (prayer, grief, …) | Intent | Yes | **Extended** prayer regex |
| `buddyBrain` | Entry + quality attach | Runtime | Yes | Frozen authority |
| `openAiFirstCompanionRuntime` | OpenAI-first dispatch | Runtime | Yes | Frozen |
| `bibleCompanionOrchestrator` | Care-lane ownership | Orchestration | Yes | **Strengthened** (remember, prayer, presence) |
| `runtimeOrchestrator` | Context + `scoreCompanionQuality` | Runtime | Yes | **Extended** opportunityQuality |
| `reasonFirstComposer` | Composition when OpenAI lane | Composer | Yes | Frozen |
| `retrievalEvidencePack` | Scripture/evidence pack | Retrieval | Yes | Frozen |
| `companionReplyPolish` | Final voice cleanup | Polish | Yes | **Extended** admin strip |
| `responseGuarantee` | Timeouts / guarantee | Runtime | Yes | Unchanged |
| `relationshipMemoryEngine` | Preferences, struggle, lastPrayer | Memory | Yes | **Extended** family-burden capture + person-first recall |
| `reflectionMemoryEngine` | Learning candidates / `LEARNING_ACK` | Learning/gov | Yes | Keep for BNC only; **must not** surface on personal remember |
| `conversationContinuationMemory` | Last reply/route | Continuation | Yes | Preserve |
| `responseRevisionOwner` | Better/deeper revision | Revision | Yes | **Extended** — prayer never revision |
| `prayerCompanionEngine` | Prayer drafts | Prayer | Yes | **Extended** person/burden focus |
| `relationshipSummaryEngine` | Recall formatting | Recall | Yes | **Extended** person-first |
| `companionPresenceEngine` | Presence templates | Presence | Partial | Prefer orchestrator presence lane |
| `explicitRememberPin` | Durable pins | Memory | Yes | Called from personal remember |
| `relationshipContextSelector` | **New adapter only** | Shared select | Yes | Option 4 — no new store |
| Claim verifier / Scripture / Auth / Streaming | Certified owners | Various | Yes | Frozen |

## Overlaps / dead ends

- `LEARNING_ACK` admin copy overlapped personal “remember that…” → hijacked companion voice (Case 2). Fixed by early personal-remember owner.
- Prayer templates ignored relationship stores (Case 1). Fixed by selector + `resolvePrayerFocus`.
- Short “again” revision collided with “pray again” (Case 4). Fixed in `detectRevisionRequest`.

## Conclusion

Relational capability **already existed** as fragmented owners. Gap was **context application**, not missing storage.
