# 23 — Memory Validation (Phase 6Y)

## Suite (`MEMORY_MAX_TURNS=25` on production)

| Case | Result |
|---|---|
| M1 prior user / assistant / go deeper / continue | PASS |
| M2 correction continuity | PASS |
| M3 topic return / conversation reference | PASS |
| M4 2 / 5 / 25 turn explicit pin | PASS |
| M4 10 turn explicit pin | FAIL once (honest miss) |
| M4b marker | PASS |
| M5 honesty | PASS |
| M6 implicit name | PASS |
| M7 session isolation | PASS |
| M8 pin write | PASS |

**15/16** in suite.

## Isolated M4_10 reprobe

**PASS** — Psalm 23 recalled after 9 filler turns.

## Continuity checks (natural probes)

| Check | Result |
|---|---|
| Favorite verse remember | PASS |
| Correction ack | PASS |
| Pivot / no stale Sabbath on John 1:1 | PASS |
| Outstanding questions | Pack/thread fields present (Obj2); not separately scored live |

## Conclusion

Memory continuity is production-viable. Treat suite M4_10 flake as P2 concurrency residual unless it reproduces in isolation.
