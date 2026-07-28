# 12 — General Knowledge Recovery (Phase 6X Obj6)

**Disposition:** COMPLETE (local) — responsible subsystem repaired

| Field | Value |
|---|---|
| **Reason** | Ordinary factual “what is …” questions incorrectly entered bible clarifier |
| **Subsystem** | `bibleReasoningEngine` unknown-phrase gate + `currentMessageIntent` |
| **Root cause** | Over-broad `UNKNOWN_BIBLE_RE` + definition → doctrine catch-all |
| **Implementation** | Narrow unknown-bible ask; `general_factual` intent; composer guidance |
| **Regression** | `tests/phase6xObj4to6.test.js` PASS |
| **Expected improvement** | Capital/photosynthesis-class questions reach OpenAI companion instead of clarifier; Scripture controls still pass |

Distinguish in answers when mixed: Historical Context · Biblical Teaching · Inference · Opinion.
