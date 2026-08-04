# 03 — Response Ownership Contract

| Concern | Owner |
|---|---|
| Current message | currentMessageIntent / companionDoctrineRouter |
| Doctrine decision | doctrineFinalAuthorityEngine |
| Evidence object | Verified Lesson Packet |
| Deterministic contextual composition | composeDeterministicDoctrineReply (subordinate helper in doctrineFinalAuthorityEngine — not a new engine) |
| OpenAI companion composition | reasonFirstComposer (non-strict lanes) |
| Final response | finalizeBuddyResponse / liveResponseOwner |
| Formatter | polishFinalReply / directAnswerFormatter (readability only) |

## Guarantees

- No second final response owner added
- Composer cannot change finalConclusion
- Without packet, seed template remains for backward compatibility
- With packet, fixed `From the approved Scripture witnesses` stamp is not used
- Packet role schema names are not exposed in user prose
