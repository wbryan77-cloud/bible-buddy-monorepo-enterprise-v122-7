# 02 — Doctrine Decision Contract

## Owner

`doctrineFinalAuthorityEngine` — doctrinal conclusion authority unchanged.

## Contract fields (additive on structured result)

| Field | Source |
|---|---|
| doctrinalConclusion | authority.finalConclusion |
| requiredWitnesses | scriptureWitnesses / allowedWitnesses |
| prohibitedClaims / forbiddenPhrases | contract |
| governanceLocks.noDoctrineReasoning | true |
| governanceLocks.openAiMayDetermineDoctrine | false |
| responseRequirements | derived from current message (yes/no, short, scripture only, go deeper, follow-up) |
| evidenceLimitations | packet.prohibitedOverstatements |
| composedFromVerifiedLessonPacket | true when packet-aware composition used |

## Explicitly not owned by decision layer

Generic fixed final wording · conversational tone · paragraph structure · follow-up acknowledgement wording · response length.

## Packet remains primary evidence object

No parallel VLP schema. Packet schema `verified-lesson-packet-v1` unchanged.
