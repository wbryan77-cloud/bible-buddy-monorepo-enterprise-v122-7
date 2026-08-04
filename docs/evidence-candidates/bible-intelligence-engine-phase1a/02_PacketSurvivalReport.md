# 02 — Packet Survival Report (BIE Phase 1A)

## Authoritative object

**Verified Lesson Packet** (`packetVersion: verified-lesson-packet-v1`) from existing Lesson Engine — no new packet type.

## Survival checklist

| Question | Pre-adapter | Post-adapter (Phase 1A) |
|---|---|---|
| Was it created? | NO | YES — `buildVerifiedLessonPacket` via adapter |
| Was it attached? | NO | YES — `evidencePack.verifiedLessonPacket` |
| Was it copied? | N/A | Nested reference on pack; slim passes same object tree |
| Was it referenced? | NO | YES — composer system + user evidence slice |
| Was it replaced? | N/A | NO |
| Was it flattened? | N/A | NO — nested keys preserved through slim |
| Was hierarchy preserved? | N/A | YES — `lesson`, `passageRoles`, `responseContract`, `scriptureBlocks` |
| Did it reach the Composer? | NO | YES |
| Did it reach the OpenAI payload? | NO | YES — inside system message JSON |
| Did it influence the final response? | NO | **Capable** (present in model context). Live user influence not re-certified here (OpenAI key optional / disabled in dry-run). |

## Exact pre-adapter stop point

| Field | Value |
|---|---|
| File | `services/openAiFirstCompanionRuntime.js` |
| Function | `runOpenAiFirstCompanionRuntime` |
| Moment | Immediately after `buildRetrievalEvidencePack(...)` — pack proceeded to orchestrator/composer **without** Study Chain / Lesson Engine / VLP |
| Classification | **PACKET_DROPPED_BEFORE_COMPOSER** (never created on live path) |

Secondary risk (mitigated by this patch):

| Field | Value |
|---|---|
| File | `services/evidencePackSlimmer.js` / `services/reasonFirstComposer.js` |
| Risk | Even if attached, slim/non-core slice could omit packet |
| Status | Fixed — both preserve `verifiedLessonPacket` |

## Adapter attach metadata (probe)

```json
{
  "attached": true,
  "studyChainId": "sc_91653a7a2214c919",
  "lessonId": "lesson_0768a4d631929414",
  "passageRoleCount": 16,
  "scriptureBlockCount": 16,
  "hierarchyPreserved": true
}
```

## Governance locks (adapter-enforced, schema unchanged)

- `openAiMayApproveEvidence = false`
- `openAiMayDetermineDoctrine = false`
- `productionActivation = false`
- `persist = false`

Study Chain input uses `RULES_DECISION.NEEDS_ADMIN_REVIEW` — AUTO_APPROVE not introduced.
