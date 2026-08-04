# 05 — Regression Report (BIE Phase 1A)

## Production hashes (unchanged)

| File | SHA-256 |
|---|---|
| `data/approved-cross-references.jsonl` | `d7ffcda85f4169bed455b6224028881f502d8c2504b6b1533f852f251bc96fed` |
| `data/support-graph-candidates.jsonl` | `2cc35836e1953bc075780de33939bc15af1355696a01bbe79c0642bbca052a57` |

Recorded in `00-production-hashes-after.txt`.

## Frozen layers

| Layer | Status | Evidence |
|---|---|---|
| Production hashes | UNCHANGED | shasum match |
| Lesson Engine | UNCHANGED | `git diff` empty on `services/lessonEngine.js`; 23/23 tests pass |
| Study Chains | UNCHANGED | `services/studyChainEvaluation.js` untouched; 17/17 tests pass |
| Packet schema | UNCHANGED | Adapter calls `buildVerifiedLessonPacket` only; no schema edit |
| Governance | UNCHANGED | `RULES_DECISION` / AUTO_APPROVE not altered; adapter forces doctrine locks false |
| Historical Layer | UNCHANGED | No historical service edits |
| Original Language | UNCHANGED | No OL service edits |
| Evidence Cards | UNCHANGED | No card schema/service edits |
| Topic Graph | UNCHANGED | Registry called read-only |
| Support Graph | UNCHANGED | Hash + no code edits |
| AUTO_APPROVE | UNCHANGED | Not introduced on adapter path |
| NEEDS_ADMIN_REVIEW | UNCHANGED | Used as study-chain input decision |

## Diff scope (production)

```
services/evidencePackSlimmer.js         | +2
services/openAiFirstCompanionRuntime.js | +67 (attach + call + export)
services/reasonFirstComposer.js         | +2
```

Plus test-only: `tests/runtimeVerifiedLessonPacketAdapter.test.js`.

## Test summary

| Suite | Result |
|---|---|
| runtimeVerifiedLessonPacketAdapter | 5/5 pass |
| lessonEngine | 23/23 pass |
| studyChainEvaluation | 17/17 pass |
