# 00 — Preflight And Verified State

| Check | Value |
|---|---|
| Branch | `main` |
| HEAD (pre-V1.3 commit) | `45f44c4` |
| origin/main | `45f44c4` |
| HEALTH releaseCommit | `45f44c4` |
| Parity HEAD=origin=health | **PASS** |
| V1.2A runtime ancestor | `f8956db` (included in `45f44c4`) |
| Durable user memory | POSTGRES |
| Worktree at start | dirty with in-progress V1.3 Mission Control/aging/docs (nonmutating) |
| Stashes | `phase1d-parity-*` present — **not applied** |
| FEL owners | experienceEventLedger, learningRecordStore, recommendationIntelligence |
| Admin decision owner | adminDecisionQueue |
| Response owner | liveResponseOwner / finalizeBuddyResponse |
| Memory owner | durableUserMemory |
| Benchmark owners | runFounderTruthCorpus.js + Golden Benchmark Phase 1C |
| Rollback of V1.2A | `git revert f8956db` |
| Local admin token env | configured (does **not** authorize production) |

Preflight gate: **PASS** (not `V1_3_BLOCKED_BY_PARITY`).
