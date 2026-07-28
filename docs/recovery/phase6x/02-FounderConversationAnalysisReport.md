# Founder Conversation Analysis Report

**Phase:** 6X — Phase 1  
**Date:** 2026-07-27  
**Scope rule:** Treat certification corpora + captured production replies as conversation evidence. Raw exhaustive Founder chat archive is **not in-repo** (documented gap).

## 1. Evidence base

| Type | Paths |
|---|---|
| Founder Truth Corpus (32) | `scripts/runFounderTruthCorpus.js`; `docs/recovery/certification/08-FTC.txt` |
| Gate matrices | Memory, Governance, Scripture, Claim, UI, RT runners under `scripts/` |
| Inventory | `docs/recovery/certification/07-FounderInventory.md` |
| Lineage | `docs/recovery/RECURRING_FAILURE_LINEAGE.md` |
| Captured FAIL replies | `01-MemoryCertification-production-run.txt`, `03-ScriptureReasoning-production-run.txt`, v3/v5 FTC production txts, `08-Gate4.txt` (flake), claim offline FAIL |
| Manual protocols | `docs/alpha/FounderAlphaTestingGuide.md`, FounderScenarioChecklist |

**Gap:** No complete dump of every raw Founder↔Buddy session exists in the repository.

## 2. Extracted failure patterns (historical → current status)

| Pattern | Historical symptom | Current status |
|---|---|---|
| Wrong / polarity-wrong answer | Acts 10 pork clean; Sunday as biblical Sabbath | Closed in Gate 4 / FTC |
| Question ignored / partial | Multi-part drop; Isaiah 66 miss | Closed Gate 3/4 |
| Looping / dead-end | Clarification loop on identity / memory recall | Closed Gate 2/3 |
| Incorrect routing | Death-state → resurrection timing; timing → hope doctrine | Closed `bef9092` / `65c6382` |
| Incorrect memory | Invented Turn 19; clarifier instead of pin | Closed `3e8d45c` |
| Drift / go-deeper dump | John 3:16 → Acts 10 dietary | Closed `65c6382` |
| Correction ignored | Meta-correction → “ask the part I missed” | Closed `fb2cb52` / Gate 3 |
| Retrieval / IOG as canon | Evidence language replaces Scripture | Mitigated; utilization residual |
| History vs Scripture blur | History presented as command | Closed on matrix; residual Sunday-phrasing route P2 |
| Robotic / walls of text | Polish / verbosity complaints | Partially addressed; not fully scored |
| OpenAI empty / ask-again | `[object Object]`; connection clarifier | Empty closed; malformed JSON residual P2 |
| Concurrent go-deeper flake | One unreproduced ask-again under parallel load | P2 residual |

## 3. Behavior families (not individual bugs)

See `02-BehaviorFamilyAnalysis.md`.

## 4. Phase 1 conclusion

Material Founder failure modes represented in regression corpora are **closed or mitigated** under Gates 1–10. Remaining work is residual P2/gap closure and corpus expansion — not rediscovery of already-certified P0 defects — unless new production transcripts appear.
