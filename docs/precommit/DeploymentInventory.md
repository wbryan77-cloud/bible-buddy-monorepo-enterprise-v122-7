# Pre-Commit Deployment Inventory

**Generated:** 2026-05-31  
**Branch:** `main` (up to date with `origin/main`)  
**Last committed:** `e572e40` — feat(doctrine): activate doctrine intercept pipeline  
**Action taken:** NONE — no commit, no push, no deploy

---

## 1. Git Status

```
On branch main
Your branch is up to date with 'origin/main'.

Changes to be committed: 87 files (staged, NOT committed)
Changes not staged: 0 modified files
Untracked: 21 data/* runtime files only
```

---

## 2. All Modified Files (staged — pending commit)

| # | File |
|---|------|
| 1 | public/chat.html |
| 2 | services/autonomousCompanion.js |
| 3 | services/buddyBrain.js |
| 4 | services/contentInsight.js |
| 5 | services/continuityMemoryRuntime.js |
| 6 | services/continuityStudySessionRuntime.js |
| 7 | services/doctrineContinuityRules.js |
| 8 | services/doctrineGuard.js |
| 9 | services/doctrineRuntimePipeline.js |
| 10 | services/fallbackLoopSuppressor.js |
| 11 | services/parallelVerseExpansionEngine.js |
| 12 | services/retrievalFirstBuddyOrchestrator.js |
| 13 | services/runtimeLineUponLineTraversalEngine.js |
| 14 | services/runtimeLoopGuard.js |
| 15 | services/runtimeMemoryBridge.js |
| 16 | services/runtimeOrchestrator.js |
| 17 | services/runtimeQualityValidator.js |
| 18 | services/runtimeRelationshipMemoryEngine.js |
| 19 | services/runtimeResponseSanitizer.js |
| 20 | services/scriptureChainExpansion.js |
| 21 | services/scriptureConfidenceRuntime.js |
| 22 | services/sourceGroundedResponder.js |
| 23 | services/structuredCompanionRuntime.js |
| 24 | services/studyContinuityRuntime.js |

---

## 3. All Untracked Files (NOT staged — correct)

| File | Reason excluded |
|------|-----------------|
| data/buddy-memory.json | Runtime memory state |
| data/buddy-sessions.jsonl | Session log |
| data/buddy-quality-events.jsonl | QA events |
| data/buddy-study-continuity.json | Runtime |
| data/companion-*.json / *.jsonl | Runtime |
| data/continuity-*.json | Runtime |
| data/emotional-arc-memory.json | Runtime |
| data/life-timeline-memory.json | Runtime |
| data/open-loops-memory.json | Runtime |
| data/runtime-*.json | Runtime |
| data/sprint212-audit-results.json | Local audit output |
| data/sprint2final-verification.json | Local audit output |

**Total untracked:** 21 files (all runtime data — correctly excluded)

---

## 4. All Staged Files (pending commit)

**Total: 87 files**

| Category | Count |
|----------|-------|
| services/ (new Sprint 2 modules) | 36 |
| services/ (modified) | 24 |
| tests/ | 11 |
| scripts/ | 3 |
| docs/sprint213/ | 8 |
| docs/sprint2deployment/ | 5 |
| public/chat.html | 1 |

Full list: see `git diff --cached --name-only` (87 entries)

---

## 5. Total File Count Being Committed

| Metric | Value |
|--------|-------|
| **Staged (would commit)** | **87** |
| Modified unstaged | 0 |
| Untracked (excluded) | 21 |
| Currently committed on origin | e572e40 (359 service files, Sprint 2 stub) |

---

## ⚠️ Pre-Commit State

Files are **staged but NOT committed**. Previous deploy attempt was **interrupted before push**. Production remains at `e572e40`.
